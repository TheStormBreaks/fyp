"""
Netlify Function: SINDy Analysis Endpoint
Handles POST requests for model discovery from data
"""

import json
import numpy as np
import pandas as pd
from scipy import signal
from scipy.interpolate import UnivariateSpline
import warnings
warnings.filterwarnings('ignore')

class SINDyNetlify:
    """SINDy implementation optimized for Netlify Functions"""

    def __init__(self, threshold=0.05, max_iter=20, alpha=1e-3, poly_order=3):
        self.threshold = threshold
        self.max_iter = max_iter
        self.alpha = alpha
        self.poly_order = poly_order
        self.coefficients_ = None
        self.library_names_ = None

    def _build_library(self, X):
        """Build feature library Θ(X)"""
        n_samples, n_features = X.shape
        terms = []
        names = []

        # Constant
        terms.append(np.ones(n_samples))
        names.append('1')

        # Linear
        for i in range(n_features):
            terms.append(X[:, i])
            names.append(f'x{i+1}')

        # Polynomial
        for order in range(2, self.poly_order + 1):
            for i in range(n_features):
                for j in range(i, n_features):
                    if order == 2:
                        terms.append(X[:, i] * X[:, j])
                        if i == j:
                            names.append(f'x{i+1}^2')
                        else:
                            names.append(f'x{i+1}x{j+1}')
                    elif order == 3:
                        for k in range(j, n_features):
                            terms.append(X[:, i] * X[:, j] * X[:, k])
                            names.append(f'x{i+1}x{j+1}x{k+1}')

        # Trigonometric
        for i in range(n_features):
            terms.append(np.sin(X[:, i]))
            names.append(f'sin(x{i+1})')
            terms.append(np.cos(X[:, i]))
            names.append(f'cos(x{i+1})')

        # Interactions
        if n_features >= 2:
            for i in range(n_features):
                for j in range(n_features):
                    if i != j:
                        terms.append(X[:, i] * np.sin(X[:, j]))
                        names.append(f'x{i+1}sin(x{j+1})')
                        terms.append(X[:, i] * np.cos(X[:, j]))
                        names.append(f'x{i+1}cos(x{j+1})')

        Theta = np.column_stack(terms)
        self.library_names_ = names
        return Theta

    def _compute_derivatives(self, X, t, method='savgol'):
        """Compute numerical derivatives"""
        n_samples, n_features = X.shape
        dXdt = np.zeros_like(X)

        if method == 'finite_diff':
            for i in range(1, n_samples - 1):
                dt = t[i+1] - t[i-1]
                dXdt[i] = (X[i+1] - X[i-1]) / dt
            dXdt[0] = (X[1] - X[0]) / (t[1] - t[0])
            dXdt[-1] = (X[-1] - X[-2]) / (t[-1] - t[-2])

        elif method == 'savgol':
            window = min(11, n_samples // 2 * 2 + 1)
            if window >= 5:
                for j in range(n_features):
                    dXdt[:, j] = signal.savgol_filter(X[:, j], window, 3, deriv=1, delta=t[1]-t[0])
            else:
                return self._compute_derivatives(X, t, 'finite_diff')

        elif method == 'spline':
            for j in range(n_features):
                spl = UnivariateSpline(t, X[:, j], s=len(t)*0.01)
                dXdt[:, j] = spl.derivative()(t)

        return dXdt

    def _stlsq(self, Theta, y):
        """Sequential Thresholded Least Squares"""
        n_lib = Theta.shape[1]
        xi = np.zeros(n_lib)

        # Initial ridge regression
        TT = Theta.T @ Theta + self.alpha * np.eye(n_lib)
        Ty = Theta.T @ y
        xi = np.linalg.solve(TT, Ty)

        for _ in range(self.max_iter):
            small = np.abs(xi) < self.threshold
            new_xi = xi.copy()
            new_xi[small] = 0

            big = ~small
            if not np.any(big):
                break

            Theta_big = Theta[:, big]
            TT_big = Theta_big.T @ Theta_big + self.alpha * np.eye(np.sum(big))
            Ty_big = Theta_big.T @ y
            xi_big = np.linalg.solve(TT_big, Ty_big)
            new_xi[big] = xi_big

            if np.allclose(xi, new_xi):
                break
            xi = new_xi

        return xi

    def fit(self, X, t, derivative_method='savgol'):
        """Fit SINDy model"""
        dXdt = self._compute_derivatives(X, t, method=derivative_method)
        Theta = self._build_library(X)

        n_features = X.shape[1]
        self.coefficients_ = np.zeros((n_features, Theta.shape[1]))

        for j in range(n_features):
            self.coefficients_[j] = self._stlsq(Theta, dXdt[:, j])

        return self

    def predict(self, X):
        """Predict derivatives"""
        Theta = self._build_library(X)
        return Theta @ self.coefficients_.T

    def equations(self, feature_names=None, precision=4):
        """Get equations as strings"""
        if feature_names is None:
            feature_names = [f'x{i+1}' for i in range(self.coefficients_.shape[0])]

        eqs = []
        for j in range(self.coefficients_.shape[0]):
            terms = []
            for i, coeff in enumerate(self.coefficients_[j]):
                if abs(coeff) > 1e-10:
                    name = self.library_names_[i]
                    if name == '1':
                        terms.append(f"{coeff:.{precision}f}")
                    else:
                        terms.append(f"{coeff:.{precision}f}·{name}")
            if terms:
                eqs.append(f"d{feature_names[j]}/dt = " + " + ".join(terms))
            else:
                eqs.append(f"d{feature_names[j]}/dt = 0")
        return eqs

    def get_metrics(self, X, t, derivative_method='savgol'):
        """Compute model metrics"""
        dXdt_true = self._compute_derivatives(X, t, method=derivative_method)
        dXdt_pred = self.predict(X)

        n_samples = X.shape[0]
        metrics = {}

        for j in range(X.shape[1]):
            y_true = dXdt_true[:, j]
            y_pred = dXdt_pred[:, j]
            residuals = y_true - y_pred
            rss = np.sum(residuals**2)
            k = np.sum(np.abs(self.coefficients_[j]) > 1e-10)
            tss = np.sum((y_true - np.mean(y_true))**2)

            metrics[f'feature_{j}'] = {
                'RSS': float(rss),
                'AIC': float(n_samples * np.log(rss/n_samples) + 2*k) if rss > 0 else -np.inf,
                'BIC': float(n_samples * np.log(rss/n_samples) + k*np.log(n_samples)) if rss > 0 else -np.inf,
                'active_terms': int(k),
                'R2': float(1 - rss/tss) if tss > 0 else 0,
                'RMSE': float(np.sqrt(rss/n_samples))
            }

        return metrics


def load_lynx_hare_data():
    """Load the classic Hudson Bay Company lynx-hare dataset"""
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


def handler(event, context):
    """Netlify Function handler"""
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }

    # Handle preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }

    try:
        # Parse request
        if event.get('httpMethod') == 'POST':
            body = json.loads(event.get('body', '{}'))
            config = body.get('config', {})
            custom_data = body.get('data', None)
        else:
            config = {}
            custom_data = None

        # Configuration with defaults
        threshold = config.get('threshold', 0.05)
        poly_order = config.get('poly_order', 3)
        max_iter = config.get('max_iter', 20)
        derivative_method = config.get('derivative_method', 'savgol')
        feature_names = config.get('feature_names', ['Hare', 'Lynx'])

        # Load data
        if custom_data:
            df = pd.DataFrame(custom_data)
        else:
            df = load_lynx_hare_data()

        # Prepare data
        t = df['Year'].values.astype(float)
        X = df[feature_names].values.astype(float)

        # Normalize
        X_mean = X.mean(axis=0)
        X_std = X.std(axis=0)
        X_norm = (X - X_mean) / X_std

        # Run SINDy on normalized data
        model = SINDyNetlify(
            threshold=threshold,
            max_iter=max_iter,
            poly_order=poly_order
        )
        model.fit(X_norm, t, derivative_method=derivative_method)

        # Get equations
        eq_normalized = model.equations(feature_names)

        # Also fit on raw data for interpretability
        model_raw = SINDyNetlify(
            threshold=threshold,
            max_iter=max_iter,
            poly_order=poly_order
        )
        model_raw.fit(X, t, derivative_method=derivative_method)
        eq_raw = model_raw.equations(feature_names)

        # Compute derivatives for visualization
        dXdt_true = model_raw._compute_derivatives(X, t, method=derivative_method)
        dXdt_pred = model_raw.predict(X)

        # Metrics
        metrics = model_raw.get_metrics(X, t, derivative_method)

        # Library info
        Theta = model_raw._build_library(X)

        # Coefficient paths for different thresholds
        thresholds = np.logspace(-3, 0, 20)
        coef_paths = []
        for thresh in thresholds:
            m = SINDyNetlify(threshold=thresh, max_iter=max_iter, poly_order=poly_order)
            m.fit(X, t, derivative_method=derivative_method)
            coef_paths.append(m.coefficients_.tolist())

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'data': {
                    't': t.tolist(),
                    'X': X.tolist(),
                    'feature_names': feature_names,
                    'dXdt_true': dXdt_true.tolist(),
                    'dXdt_pred': dXdt_pred.tolist()
                },
                'model': {
                    'equations_normalized': eq_normalized,
                    'equations_raw': eq_raw,
                    'coefficients': model_raw.coefficients_.tolist(),
                    'library_terms': model_raw.library_names_,
                    'threshold': threshold,
                    'poly_order': poly_order,
                    'derivative_method': derivative_method
                },
                'metrics': metrics,
                'visualization': {
                    'library_matrix': Theta.tolist(),
                    'coefficient_paths': {
                        'thresholds': thresholds.tolist(),
                        'paths': coef_paths
                    },
                    'sparsity_profile': {
                        'thresholds': thresholds.tolist(),
                        'n_terms': [int(np.sum(np.abs(np.array(p)) > 1e-10)) for p in coef_paths]
                    }
                },
                'summary': {
                    'n_features': model_raw.coefficients_.shape[0],
                    'n_library_terms': len(model_raw.library_names_),
                    'equations': eq_raw,
                    'coefficients': model_raw.coefficients_.tolist(),
                    'library_terms': model_raw.library_names_,
                    'active_terms': [
                        [{'term': model_raw.library_names_[i], 'coefficient': float(model_raw.coefficients_[j, i]), 'equation': feature_names[j]}
                         for i in range(model_raw.coefficients_.shape[1]) if abs(model_raw.coefficients_[j, i]) > 1e-10]
                        for j in range(model_raw.coefficients_.shape[0])
                    ]
                }
            })
        }

    except Exception as e:
        import traceback
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e), 'trace': traceback.format_exc()})
        }