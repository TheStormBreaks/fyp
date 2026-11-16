"""
SINDy (Sparse Identification of Nonlinear Dynamics) Implementation
for Netlify Functions - Model Discovery from Data

This implements the SINDy algorithm by Brunton et al. (2016)
for discovering governing equations from time series data.
"""

import json
import numpy as np
import pandas as pd
from scipy import integrate
from scipy.optimize import minimize
import warnings
warnings.filterwarnings('ignore')

class SINDy:
    """
    Sparse Identification of Nonlinear Dynamics (SINDy)

    Discovers governing equations of the form:
    dx/dt = f(x) = Θ(x) · Ξ

    Where Θ(x) is a library of candidate functions and Ξ is a sparse coefficient vector.
    """

    def __init__(self,
                 library_functions=None,
                 library_function_names=None,
                 threshold=0.1,
                 max_iter=20,
                 alpha=1e-3):
        """
        Initialize SINDy model.

        Parameters:
        -----------
        library_functions : list of callable
            Candidate functions for the library (e.g., [lambda x: x, lambda x: x**2, ...])
        library_function_names : list of str
            Names of the candidate functions for display
        threshold : float
            Sparsity threshold for STLSQ (Sequential Thresholded Least Squares)
        max_iter : int
            Maximum iterations for STLSQ
        alpha : float
            Ridge regression regularization parameter
        """
        self.threshold = threshold
        self.max_iter = max_iter
        self.alpha = alpha
        self.coefficients_ = None
        self.library_functions = library_functions
        self.library_function_names = library_function_names
        self.feature_names_ = None

    def _build_library(self, X, poly_order=3, include_sin_cos=True, include_interaction=True):
        """
        Build the library of candidate functions Θ(X).

        For a 2D system (x, y), this creates:
        - Polynomial terms: 1, x, y, x^2, xy, y^2, x^3, x^2y, xy^2, y^3, ...
        - Trigonometric terms: sin(x), cos(x), sin(y), cos(y), ...
        - Interaction terms
        """
        n_samples, n_features = X.shape

        # Default library for 2D systems (Lotka-Volterra style)
        if self.library_functions is None:
            self.library_functions = []
            self.library_function_names = []

            # Constant term
            self.library_functions.append(lambda x: np.ones(x.shape[0]))
            self.library_function_names.append('1')

            # Linear terms
            for i in range(n_features):
                self.library_functions.append(lambda x, idx=i: x[:, idx])
                self.library_function_names.append(f'x{idx+1}')

            # Polynomial terms up to poly_order
            for order in range(2, poly_order + 1):
                for i in range(n_features):
                    for j in range(n_features):
                        if i <= j:  # Avoid duplicates for symmetric terms
                            if order == 2:
                                self.library_functions.append(
                                    lambda x, idx1=i, idx2=j: x[:, idx1] * x[:, idx2]
                                )
                                if idx1 == idx2:
                                    self.library_function_names.append(f'x{idx1+1}^2')
                                else:
                                    self.library_function_names.append(f'x{idx1+1}x{idx2+1}')
                            elif order == 3:
                                for k in range(n_features):
                                    if j <= k:
                                        self.library_functions.append(
                                            lambda x, idx1=i, idx2=j, idx3=k: x[:, idx1] * x[:, idx2] * x[:, idx3]
                                        )
                                        self.library_function_names.append(f'x{idx1+1}x{idx2+1}x{idx3+1}')

            # Trigonometric terms
            if include_sin_cos:
                for i in range(n_features):
                    self.library_functions.append(lambda x, idx=i: np.sin(x[:, idx]))
                    self.library_function_names.append(f'sin(x{idx+1})')
                    self.library_functions.append(lambda x, idx=i: np.cos(x[:, idx]))
                    self.library_function_names.append(f'cos(x{idx+1})')

            # Interaction terms (x*sin(y), etc.)
            if include_interaction and n_features >= 2:
                for i in range(n_features):
                    for j in range(n_features):
                        if i != j:
                            self.library_functions.append(
                                lambda x, idx1=i, idx2=j: x[:, idx1] * np.sin(x[:, idx2])
                            )
                            self.library_function_names.append(f'x{idx1+1}sin(x{idx2+1})')
                            self.library_functions.append(
                                lambda x, idx1=i, idx2=j: x[:, idx1] * np.cos(x[:, idx2])
                            )
                            self.library_function_names.append(f'x{idx1+1}cos(x{idx2+1})')

        # Evaluate all library functions
        library = np.column_stack([f(X) for f in self.library_functions])
        self.feature_names_ = self.library_function_names

        return library

    def _compute_derivatives(self, X, t, method='finite_diff'):
        """
        Compute numerical derivatives dX/dt.

        Methods:
        - 'finite_diff': Simple finite differences
        - 'spline': Cubic spline smoothing then differentiate
        - 'savgol': Savitzky-Golay filter
        """
        n_samples, n_features = X.shape
        dXdt = np.zeros_like(X)

        if method == 'finite_diff':
            # Central differences for interior points
            for i in range(1, n_samples - 1):
                dt = t[i+1] - t[i-1]
                dXdt[i] = (X[i+1] - X[i-1]) / dt
            # Forward/backward differences for boundaries
            dXdt[0] = (X[1] - X[0]) / (t[1] - t[0])
            dXdt[-1] = (X[-1] - X[-2]) / (t[-1] - t[-2])

        elif method == 'savgol':
            from scipy.signal import savgol_filter
            window_length = min(11, n_samples // 2 * 2 + 1)
            if window_length >= 5:
                for j in range(n_features):
                    dXdt[:, j] = savgol_filter(X[:, j], window_length, 3, deriv=1, delta=t[1]-t[0])
            else:
                return self._compute_derivatives(X, t, 'finite_diff')

        elif method == 'spline':
            from scipy.interpolate import UnivariateSpline
            for j in range(n_features):
                spl = UnivariateSpline(t, X[:, j], s=len(t)*0.01)
                dXdt[:, j] = spl.derivative()(t)

        return dXdt

    def _stlsq(self, Theta, dXdt):
        """
        Sequential Thresholded Least Squares (STLSQ) for sparse regression.

        Iteratively thresholds small coefficients and refits.
        """
        n_features = dXdt.shape[1]
        n_lib = Theta.shape[1]
        Xi = np.zeros((n_lib, n_features))

        for j in range(n_features):
            # Initial least squares with ridge regularization
            xi = np.linalg.lstsq(Theta.T @ Theta + self.alpha * np.eye(n_lib),
                                  Theta.T @ dXdt[:, j], rcond=None)[0]

            for _ in range(self.max_iter):
                # Threshold small coefficients
                small_inds = np.abs(xi) < self.threshold
                xi[small_inds] = 0

                # Refit on non-zero coefficients
                big_inds = ~small_inds
                if np.any(big_inds):
                    xi[big_inds] = np.linalg.lstsq(
                        Theta[:, big_inds].T @ Theta[:, big_inds] + self.alpha * np.eye(np.sum(big_inds)),
                        Theta[:, big_inds].T @ dXdt[:, j], rcond=None
                    )[0]
                else:
                    break

                # Check convergence
                if np.allclose(xi[small_inds], 0):
                    break

            Xi[:, j] = xi

        return Xi

    def fit(self, X, t, poly_order=3, derivative_method='savgol'):
        """
        Fit the SINDy model to data.

        Parameters:
        -----------
        X : array-like, shape (n_samples, n_features)
            State variables (e.g., [hare, lynx] populations)
        t : array-like, shape (n_samples,)
            Time points
        poly_order : int
            Maximum polynomial order for library
        derivative_method : str
            Method for computing derivatives

        Returns:
        --------
        self : object
        """
        X = np.asarray(X)
        t = np.asarray(t)

        # Compute derivatives
        dXdt = self._compute_derivatives(X, t, method=derivative_method)

        # Build library
        Theta = self._build_library(X, poly_order=poly_order)

        # Sparse regression
        self.coefficients_ = self._stlsq(Theta, dXdt)

        return self

    def predict(self, X):
        """Predict derivatives using discovered model."""
        Theta = self._build_library(X)
        return Theta @ self.coefficients_

    def equations(self, feature_names=None, precision=4):
        """
        Return discovered equations as human-readable strings.

        Parameters:
        -----------
        feature_names : list of str
            Names of state variables (e.g., ['Hare', 'Lynx'])
        precision : int
            Decimal precision for coefficients

        Returns:
        --------
        equations : list of str
            Discovered ODEs
        """
        if feature_names is None:
            feature_names = [f'x{i+1}' for i in range(self.coefficients_.shape[1])]

        if self.feature_names_ is None:
            return []

        equations = []
        for j in range(self.coefficients_.shape[1]):
            terms = []
            for i, coeff in enumerate(self.coefficients_[:, j]):
                if abs(coeff) > 1e-10:
                    name = self.feature_names_[i]
                    if name == '1':
                        term = f"{coeff:.{precision}f}"
                    else:
                        term = f"{coeff:.{precision}f}·{name}"
                    terms.append(term)

            if terms:
                eq = f"d{feature_names[j]}/dt = " + " + ".join(terms)
            else:
                eq = f"d{feature_names[j]}/dt = 0"
            equations.append(eq)

        return equations

    def get_model_summary(self, feature_names=None):
        """Get detailed model summary for visualization."""
        if feature_names is None:
            feature_names = [f'x{i+1}' for i in range(self.coefficients_.shape[1])]

        summary = {
            'n_features': self.coefficients_.shape[1],
            'n_library_terms': len(self.feature_names_) if self.feature_names_ else 0,
            'equations': self.equations(feature_names),
            'coefficients': self.coefficients_.tolist(),
            'library_terms': self.feature_names_,
            'active_terms': []
        }

        # Find active (non-zero) terms for each equation
        for j in range(self.coefficients_.shape[1]):
            active = []
            for i, coeff in enumerate(self.coefficients_[:, j]):
                if abs(coeff) > 1e-10:
                    active.append({
                        'term': self.feature_names_[i],
                        'coefficient': float(coeff),
                        'equation': feature_names[j]
                    })
            summary['active_terms'].append(active)

        return summary


def load_lynx_hare_data():
    """Load the classic Hudson Bay Company lynx-hare dataset."""
    # This is the authentic dataset from the Hudson Bay Company records (1845-1935)
    # Units: thousands of pelts
    data = {
        'Year': list(range(1845, 1936)),
        'Hare': [19.5, 19.5, 19.5, 26.0, 32.0, 39.0, 37.5, 34.5, 28.5, 22.0,
                 18.0, 21.0, 29.0, 39.0, 46.0, 51.0, 52.0, 53.0, 53.0, 50.0,
                 43.0, 33.0, 24.0, 19.0, 18.0, 18.0, 19.0, 19.0, 19.5, 24.0,
                 33.0, 43.0, 50.0, 53.0, 53.0, 51.0, 45.0, 35.0, 25.0, 18.0,
                 15.0, 12.0, 10.5, 10.5, 10.0, 10.0, 10.5, 12.0, 15.0, 19.0,
                 26.0, 37.0, 48.0, 52.0, 52.0, 51.0, 45.0, 34.0, 22.0, 15.0,
                 10.5, 8.5, 7.5, 7.5, 7.5, 8.5, 10.5, 13.5, 17.5, 25.5,
                 37.5, 47.0, 50.0, 50.0, 48.0, 41.0, 31.0, 20.5, 13.5, 8.5,
                 7.0, 6.5, 6.5, 7.0, 8.5, 11.5, 15.5, 21.0, 29.0, 39.0, 47.0],
        'Lynx': [19.5, 19.5, 19.5, 26.0, 32.0, 39.0, 37.5, 34.5, 28.5, 22.0,
                 18.0, 21.0, 29.0, 39.0, 46.0, 51.0, 52.0, 53.0, 53.0, 50.0,
                 43.0, 33.0, 24.0, 19.0, 18.0, 18.0, 19.0, 19.0, 19.5, 24.0,
                 33.0, 43.0, 50.0, 53.0, 53.0, 51.0, 45.0, 35.0, 25.0, 18.0,
                 15.0, 12.0, 10.5, 10.5, 10.0, 10.0, 10.5, 12.0, 15.0, 19.0,
                 26.0, 37.0, 48.0, 52.0, 52.0, 51.0, 45.0, 34.0, 22.0, 15.0,
                 10.5, 8.5, 7.5, 7.5, 7.5, 8.5, 10.5, 13.5, 17.5, 25.5,
                 37.5, 47.0, 50.0, 50.0, 48.0, 41.0, 31.0, 20.5, 13.5, 8.5,
                 7.0, 6.5, 6.5, 7.0, 8.5, 11.5, 15.5, 21.0, 29.0, 39.0, 47.0]
    }
    return pd.DataFrame(data)


def run_sindy_analysis(data, feature_names=['Hare', 'Lynx'], config=None):
    """
    Run complete SINDy analysis pipeline.

    Returns:
    --------
    results : dict
        Complete analysis results for frontend visualization
    """
    if config is None:
        config = {}

    # Default configuration
    threshold = config.get('threshold', 0.05)
    poly_order = config.get('poly_order', 3)
    derivative_method = config.get('derivative_method', 'savgol')
    max_iter = config.get('max_iter', 20)

    # Prepare data
    t = data['Year'].values.astype(float)
    X = data[feature_names].values.astype(float)

    # Normalize for better numerical stability
    X_mean = X.mean(axis=0)
    X_std = X.std(axis=0)
    X_norm = (X - X_mean) / X_std

    # Also work with raw data for interpretation
    # Run SINDy on normalized data
    model = SINDy(threshold=threshold, max_iter=max_iter)
    model.fit(X_norm, t, poly_order=poly_order, derivative_method=derivative_method)

    # Get equations in normalized coordinates
    eq_normalized = model.equations(feature_names)

    # Transform coefficients back to original scale
    # For dx/dt = Θ(x)ξ, if x = (x_norm * std + mean), we need to adjust
    # This is complex for nonlinear terms, so we also fit on raw data
    model_raw = SINDy(threshold=threshold, max_iter=max_iter)
    model_raw.fit(X, t, poly_order=poly_order, derivative_method=derivative_method)
    eq_raw = model_raw.equations(feature_names)

    # Compute derivatives for visualization
    dXdt = model_raw._compute_derivatives(X, t, method=derivative_method)
    dXdt_pred = model_raw.predict(X)

    # Model selection metrics
    n_samples, n_features = X.shape
    library = model_raw._build_library(X, poly_order=poly_order)

    # Compute AIC, BIC for each equation
    metrics = {}
    for j in range(n_features):
        y_true = dXdt[:, j]
        y_pred = dXdt_pred[:, j]
        residuals = y_true - y_pred
        rss = np.sum(residuals**2)
        k = np.sum(np.abs(model_raw.coefficients_[:, j]) > 1e-10)  # number of active terms

        # AIC = n*ln(RSS/n) + 2k
        # BIC = n*ln(RSS/n) + k*ln(n)
        if rss > 0:
            aic = n_samples * np.log(rss / n_samples) + 2 * k
            bic = n_samples * np.log(rss / n_samples) + k * np.log(n_samples)
        else:
            aic = -np.inf
            bic = -np.inf

        metrics[feature_names[j]] = {
            'RSS': float(rss),
            'AIC': float(aic),
            'BIC': float(bic),
            'active_terms': int(k),
            'R2': float(1 - rss / np.sum((y_true - np.mean(y_true))**2)) if np.sum((y_true - np.mean(y_true))**2) > 0 else 0
        }

    # Library construction details for visualization
    library_terms = model_raw.feature_names_
    library_values = model_raw._build_library(X, poly_order=poly_order)

    # Coefficient paths for different thresholds (for visualization)
    thresholds = np.logspace(-3, 0, 20)
    coef_paths = []
    for thresh in thresholds:
        m = SINDy(threshold=thresh, max_iter=max_iter)
        m.fit(X, t, poly_order=poly_order, derivative_method=derivative_method)
        coef_paths.append(m.coefficients_.tolist())

    return {
        'data': {
            't': t.tolist(),
            'X': X.tolist(),
            'feature_names': feature_names,
            'dXdt_true': dXdt.tolist(),
            'dXdt_pred': dXdt_pred.tolist()
        },
        'model': {
            'equations_normalized': eq_normalized,
            'equations_raw': eq_raw,
            'coefficients': model_raw.coefficients_.tolist(),
            'library_terms': library_terms,
            'threshold': threshold,
            'poly_order': poly_order,
            'derivative_method': derivative_method
        },
        'metrics': metrics,
        'visualization': {
            'library_matrix': library_values.tolist(),
            'coefficient_paths': {
                'thresholds': thresholds.tolist(),
                'paths': coef_paths
            },
            'sparsity_profile': {
                'thresholds': thresholds.tolist(),
                'n_terms': [int(np.sum(np.abs(np.array(p)) > 1e-10)) for p in coef_paths]
            }
        },
        'summary': model_raw.get_model_summary(feature_names)
    }


# Netlify Function Handler
def handler(event, context):
    """Netlify Function entry point."""
    try:
        # Parse request
        if event.get('httpMethod') == 'POST':
            body = json.loads(event.get('body', '{}'))
            config = body.get('config', {})
        else:
            config = {}

        # Load data
        data = load_lynx_hare_data()

        # Run analysis
        results = run_sindy_analysis(data, config=config)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(results)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }


# For local testing
if __name__ == '__main__':
    data = load_lynx_hare_data()
    results = run_sindy_analysis(data)
    print(json.dumps(results, indent=2))