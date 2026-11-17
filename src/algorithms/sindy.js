/**
 * SINDy (Sparse Identification of Nonlinear Dynamics) - Client-side Implementation
 *
 * This is a JavaScript port of the SINDy algorithm for browser-based execution.
 * Based on: Brunton et al. (2016) "Discovering governing equations from data by
 * sparse identification of nonlinear dynamical systems" - PNAS
 *
 * Features:
 * - Feature library construction (polynomial, trigonometric, interaction terms)
 * - Numerical derivative estimation (finite differences, Savitzky-Golay)
 * - STLSQ (Sequential Thresholded Least Squares) sparse regression
 * - Model selection metrics (AIC, BIC, R²)
 */

export class SINDy {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.05;
    this.maxIter = options.maxIter || 20;
    this.alpha = options.alpha || 1e-3;
    this.polyOrder = options.polyOrder || 3;
    this.includeTrig = options.includeTrig !== false;
    this.includeInteraction = options.includeInteraction !== false;
    this.derivativeMethod = options.derivativeMethod || 'savgol';

    // Internal state
    this.coefficients = null;
    this.libraryTerms = null;
    this.libraryNames = null;
    this.featureNames = null;
  }

  /**
   * Build the library of candidate functions Θ(X)
   * @param {number[][]} X - State data (n_samples x n_features)
   * @returns {Object} Library matrix and metadata
   */
  buildLibrary(X) {
    const nSamples = X.length;
    const nFeatures = X[0].length;
    const terms = [];
    const termNames = [];
    const termValues = [];

    // Constant term
    terms.push('constant');
    termNames.push('1');
    termValues.push(new Array(nSamples).fill(1));

    // Linear terms
    for (let i = 0; i < nFeatures; i++) {
      terms.push(`x${i}`);
      termNames.push(`x${i + 1}`);
      termValues.push(X.map(row => row[i]));
    }

    // Polynomial terms up to polyOrder
    for (let order = 2; order <= this.polyOrder; order++) {
      const generateCombos = (start, remaining, current) => {
        if (remaining === 0) {
          const name = current.map(idx => `x${idx + 1}`).join('');
          const vals = X.map(row => current.reduce((prod, idx) => prod * row[idx], 1));
          terms.push(current.join(','));
          termNames.push(name);
          termValues.push(vals);
          return;
        }
        for (let i = start; i < nFeatures; i++) {
          generateCombos(i, remaining - 1, [...current, i]);
        }
      };
      generateCombos(0, order, []);
    }

    // Trigonometric terms
    if (this.includeTrig) {
      for (let i = 0; i < nFeatures; i++) {
        terms.push(`sin(x${i})`);
        termNames.push(`sin(x${i + 1})`);
        termValues.push(X.map(row => Math.sin(row[i])));

        terms.push(`cos(x${i})`);
        termNames.push(`cos(x${i + 1})`);
        termValues.push(X.map(row => Math.cos(row[i])));
      }
    }

    // Interaction terms
    if (this.includeInteraction && nFeatures >= 2) {
      for (let i = 0; i < nFeatures; i++) {
        for (let j = 0; j < nFeatures; j++) {
          if (i !== j) {
            terms.push(`x${i}*sin(x${j})`);
            termNames.push(`x${i + 1}·sin(x${j + 1})`);
            termValues.push(X.map(row => row[i] * Math.sin(row[j])));

            terms.push(`x${i}*cos(x${j})`);
            termNames.push(`x${i + 1}·cos(x${j + 1})`);
            termValues.push(X.map(row => row[i] * Math.cos(row[j])));
          }
        }
      }
    }

    // Transpose to get n_samples x n_terms matrix
    const Theta = termValues[0].map((_, i) => termValues.map(col => col[i]));

    this.libraryTerms = terms;
    this.libraryNames = termNames;

    return { Theta, terms, termNames, termValues };
  }

  /**
   * Compute numerical derivatives dX/dt
   * @param {number[][]} X - State data
   * @param {number[]} t - Time points
   * @param {string} method - Derivative method
   * @returns {number[][]} Derivatives
   */
  computeDerivatives(X, t, method = 'savgol') {
    const nSamples = X.length;
    const nFeatures = X[0].length;
    const dXdt = Array(nSamples).fill().map(() => Array(nFeatures).fill(0));

    if (method === 'finite_diff') {
      // Central differences for interior points
      for (let i = 1; i < nSamples - 1; i++) {
        const dt = t[i + 1] - t[i - 1];
        for (let j = 0; j < nFeatures; j++) {
          dXdt[i][j] = (X[i + 1][j] - X[i - 1][j]) / dt;
        }
      }
      // Forward/backward differences for boundaries
      for (let j = 0; j < nFeatures; j++) {
        dXdt[0][j] = (X[1][j] - X[0][j]) / (t[1] - t[0]);
        dXdt[nSamples - 1][j] = (X[nSamples - 1][j] - X[nSamples - 2][j]) / (t[nSamples - 1] - t[nSamples - 2]);
      }
    } else if (method === 'savgol') {
      // Simplified Savitzky-Golay (5-point, 2nd order polynomial)
      // Coefficients for 1st derivative: [-2, -1, 0, 1, 2] / 10
      const coeffs = [-0.2, -0.1, 0, 0.1, 0.2];
      const halfWindow = 2;

      for (let i = 0; i < nSamples; i++) {
        for (let j = 0; j < nFeatures; j++) {
          let sum = 0;
          let count = 0;
          for (let k = -halfWindow; k <= halfWindow; k++) {
            const idx = i + k;
            if (idx >= 0 && idx < nSamples) {
              sum += coeffs[k + halfWindow] * X[idx][j];
              count++;
            }
          }
          if (count > 0) {
            dXdt[i][j] = sum;
          }
        }
      }
      // Fix boundaries with finite differences
      for (let j = 0; j < nFeatures; j++) {
        dXdt[0][j] = (X[1][j] - X[0][j]) / (t[1] - t[0]);
        dXdt[nSamples - 1][j] = (X[nSamples - 1][j] - X[nSamples - 2][j]) / (t[nSamples - 1] - t[nSamples - 2]);
      }
    } else if (method === 'spline') {
      // Cubic spline interpolation (simplified - use finite diff as fallback)
      return this.computeDerivatives(X, t, 'finite_diff');
    }

    return dXdt;
  }

  /**
   * Matrix multiplication
   */
  static multiply(A, B) {
    const m = A.length;
    const n = A[0].length;
    const p = B[0].length;
    const C = Array(m).fill().map(() => Array(p).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < n; k++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return C;
  }

  /**
   * Matrix transpose
   */
  static transpose(A) {
    return A[0].map((_, i) => A.map(row => row[i]));
  }

  /**
   * Solve linear system Ax = b using Gaussian elimination
   */
  static solve(A, b) {
    const n = A.length;
    // Augment matrix
    const M = A.map((row, i) => [...row, b[i][0]]);

    for (let i = 0; i < n; i++) {
      // Partial pivoting
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]];

      // Normalize pivot row
      const pivot = M[i][i];
      if (Math.abs(pivot) < 1e-12) continue;
      for (let j = i; j <= n; j++) M[i][j] /= pivot;

      // Eliminate other rows
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = M[k][i];
          for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
        }
      }
    }

    return M.map(row => [row[n]]);
  }

  /**
   * STLSQ (Sequential Thresholded Least Squares)
   * @param {number[][]} Theta - Library matrix
   * @param {number[]} y - Target derivatives
   * @returns {number[]} Sparse coefficients
   */
  stlsq(Theta, y) {
    const nLib = Theta[0].length;
    let xi = Array(nLib).fill(0);

    // Initial ridge regression
    const ThetaT = SINDy.transpose(Theta);
    const TT = SINDy.multiply(ThetaT, Theta);
    for (let i = 0; i < nLib; i++) TT[i][i] += this.alpha;
    const Ty = SINDy.multiply(ThetaT, y.map(v => [v]));

    xi = SINDy.solve(TT, Ty).map(v => v[0]);

    // Thresholding iterations
    for (let iter = 0; iter < this.maxIter; iter++) {
      const small = xi.map(v => Math.abs(v) < this.threshold);
      const newXi = xi.map((v, i) => small[i] ? 0 : v);

      const big = newXi.map((v, i) => v !== 0);
      if (!big.some(v => v)) break;

      // Refit on active terms
      const activeIdx = big.map((v, i) => v ? i : -1).filter(i => i >= 0);
      const ThetaActive = Theta.map(row => activeIdx.map(i => row[i]));
      const TTActive = SINDy.multiply(SINDy.transpose(ThetaActive), ThetaActive);
      for (let i = 0; i < activeIdx.length; i++) TTActive[i][i] += this.alpha;
      const TyActive = SINDy.multiply(SINDy.transpose(ThetaActive), y.map(v => [v]));

      const xiActive = SINDy.solve(TTActive, TyActive).map(v => v[0]);
      activeIdx.forEach((idx, i) => { newXi[idx] = xiActive[i]; });

      // Check convergence
      if (xi.every((v, i) => Math.abs(v - newXi[i]) < 1e-6)) break;
      xi = newXi;
    }

    return xi;
  }

  /**
   * Compute STLSQ regularization path for visualization
   * @param {number[][]} Theta - Library matrix
   * @param {number[]} y - Target derivatives
   * @param {number[]} thresholds - Array of threshold values
   * @returns {number[][]} Coefficient paths
   */
  stlsqPath(Theta, y, thresholds) {
    return thresholds.map(thresh => {
      const oldThreshold = this.threshold;
      this.threshold = thresh;
      const result = this.stlsq(Theta, y);
      this.threshold = oldThreshold;
      return result;
    });
  }

  /**
   * Fit the SINDy model to data
   * @param {number[][]} X - State data
   * @param {number[]} t - Time points
   * @returns {SINDy} this
   */
  fit(X, t) {
    // Build library
    const { Theta, terms, termNames } = this.buildLibrary(X);
    this.libraryTerms = terms;
    this.libraryNames = termNames;

    // Compute derivatives
    const dXdt = this.computeDerivatives(X, t, this.derivativeMethod);

    // Fit each equation
    const nFeatures = X[0].length;
    this.coefficients = Array(nFeatures).fill().map(() => Array(Theta[0].length).fill(0));

    for (let j = 0; j < nFeatures; j++) {
      const y = dXdt.map(row => row[j]);
      this.coefficients[j] = this.stlsq(Theta, y);
    }

    return this;
  }

  /**
   * Predict derivatives using discovered model
   * @param {number[][]} X - State data
   * @returns {number[][]} Predicted derivatives
   */
  predict(X) {
    const { Theta } = this.buildLibrary(X);
    const nSamples = X.length;
    const nFeatures = this.coefficients.length;
    const predictions = Array(nSamples).fill().map(() => Array(nFeatures).fill(0));

    for (let i = 0; i < nSamples; i++) {
      for (let j = 0; j < nFeatures; j++) {
        let sum = 0;
        for (let k = 0; k < Theta[0].length; k++) {
          sum += Theta[i][k] * this.coefficients[j][k];
        }
        predictions[i][j] = sum;
      }
    }

    return predictions;
  }

  /**
   * Integrate ODE using RK4 from initial conditions
   * @param {number[]} x0 - Initial state
   * @param {number[]} t - Time points
   * @returns {number[][]} Integrated trajectory
   */
  integrate(x0, t) {
    const nSteps = t.length;
    const nFeatures = x0.length;
    const trajectory = Array(nSteps).fill().map(() => Array(nFeatures).fill(0));
    trajectory[0] = [...x0];

    // Helper to compute dx/dt at a given state
    const computeDerivatives = (x) => {
      const { Theta } = this.buildLibrary([x]);
      const derivs = Array(nFeatures).fill(0);
      for (let j = 0; j < nFeatures; j++) {
        let sum = 0;
        for (let k = 0; k < Theta[0].length; k++) {
          sum += Theta[0][k] * this.coefficients[j][k];
        }
        derivs[j] = sum;
      }
      return derivs;
    };

    // RK4 integration
    for (let i = 0; i < nSteps - 1; i++) {
      const dt = t[i + 1] - t[i];
      const x = trajectory[i];

      const k1 = computeDerivatives(x);
      const x2 = x.map((v, j) => v + 0.5 * dt * k1[j]);
      const k2 = computeDerivatives(x2);
      const x3 = x.map((v, j) => v + 0.5 * dt * k2[j]);
      const k3 = computeDerivatives(x3);
      const x4 = x.map((v, j) => v + dt * k3[j]);
      const k4 = computeDerivatives(x4);

      trajectory[i + 1] = x.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    }

    return trajectory;
  }

  /**
   * Get equations as human-readable strings
   * @param {string[]} featureNames - Names of state variables
   * @param {number} precision - Decimal precision
   * @returns {string[]} Equations
   */
  equations(featureNames = null, precision = 4) {
    if (!this.coefficients || !this.libraryNames) return [];

    if (!featureNames) {
      featureNames = this.coefficients.map((_, i) => `x${i + 1}`);
    }

    const eqs = [];
    for (let j = 0; j < this.coefficients.length; j++) {
      const terms = [];
      for (let i = 0; i < this.coefficients[j].length; i++) {
        const coeff = this.coefficients[j][i];
        if (Math.abs(coeff) > 1e-10) {
          const name = this.libraryNames[i];
          if (name === '1') {
            terms.push(coeff.toFixed(precision));
          } else {
            terms.push(`${coeff.toFixed(precision)}·${name}`);
          }
        }
      }

      if (terms.length > 0) {
        eqs.push(`d${featureNames[j]}/dt = ${terms.join(' + ')}`);
      } else {
        eqs.push(`d${featureNames[j]}/dt = 0`);
      }
    }

    return eqs;
  }

  /**
   * Get model summary for visualization
   */
  getModelSummary(featureNames = null) {
    if (!featureNames) {
      featureNames = this.coefficients.map((_, i) => `x${i + 1}`);
    }

    const summary = {
      nFeatures: this.coefficients.length,
      nLibraryTerms: this.libraryNames?.length || 0,
      equations: this.equations(featureNames),
      coefficients: this.coefficients,
      libraryTerms: this.libraryNames,
      activeTerms: []
    };

    for (let j = 0; j < this.coefficients.length; j++) {
      const active = [];
      for (let i = 0; i < this.coefficients[j].length; i++) {
        const coeff = this.coefficients[j][i];
        if (Math.abs(coeff) > 1e-10) {
          active.push({
            term: this.libraryNames[i],
            coefficient: coeff,
            equation: featureNames[j]
          });
        }
      }
      summary.activeTerms.push(active);
    }

    return summary;
  }

  /**
   * Compute model selection metrics
   */
  computeMetrics(X, t, dXdtTrue, dXdtPred) {
    const nSamples = X.length;
    const nFeatures = X[0].length;
    const metrics = {};

    for (let j = 0; j < nFeatures; j++) {
      const yTrue = dXdtTrue.map(row => row[j]);
      const yPred = dXdtPred.map(row => row[j]);
      const residuals = yTrue.map((v, i) => v - yPred[i]);
      const rss = residuals.reduce((sum, v) => sum + v * v, 0);
      const k = this.coefficients[j].filter(v => Math.abs(v) > 1e-10).length;
      const tss = yTrue.reduce((sum, v) => sum + Math.pow(v - (yTrue.reduce((a, b) => a + b, 0) / nSamples)), 2);

      metrics[`feature_${j}`] = {
        RSS: rss,
        AIC: rss > 0 ? nSamples * Math.log(rss / nSamples) + 2 * k : -Infinity,
        BIC: rss > 0 ? nSamples * Math.log(rss / nSamples) + k * Math.log(nSamples) : -Infinity,
        activeTerms: k,
        R2: tss > 0 ? 1 - rss / tss : 0,
        RMSE: Math.sqrt(rss / nSamples)
      };
    }

    return metrics;
  }
}

/**
 * Normalize data (z-score)
 */
export function normalizeData(X) {
  const nFeatures = X[0].length;
  const means = Array(nFeatures).fill(0);
  const stds = Array(nFeatures).fill(1);

  for (let j = 0; j < nFeatures; j++) {
    const col = X.map(row => row[j]);
    means[j] = col.reduce((a, b) => a + b, 0) / col.length;
    const variance = col.reduce((sum, v) => sum + Math.pow(v - means[j], 2), 0) / col.length;
    stds[j] = Math.sqrt(variance) || 1;
  }

  const XNorm = X.map(row => row.map((v, j) => (v - means[j]) / stds[j]));

  return { XNorm, means, stds };
}

/**
 * Denormalize coefficients (approximate)
 */
export function denormalizeCoefficients(coefficients, libraryNames, means, stds) {
  // This is a simplified version - full denormalization is complex for nonlinear terms
  // For linear terms, we can adjust
  return coefficients;
}

/**
 * Load and parse CSV data
 */
export async function loadCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(v => parseFloat(v.trim()));
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
  return { headers, data };
}

/**
 * Default configuration for Lotka-Volterra
 */
export const DEFAULT_CONFIG = {
  threshold: 0.05,
  polyOrder: 3,
  maxIter: 20,
  alpha: 1e-3,
  includeTrig: true,
  includeInteraction: true,
  derivativeMethod: 'savgol',
  normalizeData: true
};

/**
 * Run complete SINDy analysis pipeline
 */
export async function runSINDyAnalysis(data, featureNames, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Extract time and state data
  const t = data.map(d => d.Year);
  const X = data.map(d => featureNames.map(f => d[f]));

  // Train/Test temporal split (70/30)
  const trainRatio = cfg.trainTestRatio || 0.7;
  const nTotal = t.length;
  const nTrain = Math.floor(nTotal * trainRatio);

  // Split indices
  const trainIndices = Array.from({ length: nTrain }, (_, i) => i);
  const testIndices = Array.from({ length: nTotal - nTrain }, (_, i) => nTrain + i);

  // Split data
  const tTrain = trainIndices.map(i => t[i]);
  const XTrain = trainIndices.map(i => X[i]);
  const tTest = testIndices.map(i => t[i]);
  const XTest = testIndices.map(i => X[i]);

  // Normalize if requested (using training data statistics)
  let XWork = XTrain;
  let XTestNorm = XTest;
  let normInfo = null;
  if (cfg.normalizeData) {
    const result = normalizeData(XTrain);
    XWork = result.XNorm;
    normInfo = { means: result.means, stds: result.stds };
    // Normalize test data with training statistics
    XTestNorm = XTest.map(row => row.map((val, j) => (val - result.means[j]) / result.stds[j]));
  }

  // Run SINDy on TRAINING data only
  const model = new SINDy(cfg);
  model.fit(XWork, tTrain);

  // Predict on training data
  const dXdtPredTrain = model.predict(XWork);
  const dXdtTrueTrain = model.computeDerivatives(XWork, tTrain, cfg.derivativeMethod);

  // Predict on test data (for validation)
  const dXdtPredTest = model.predict(XTestNorm);
  const dXdtTrueTest = model.computeDerivatives(XTestNorm, tTest, cfg.derivativeMethod);

  // Compute metrics on training data
  const metrics = model.computeMetrics(XWork, tTrain, dXdtTrueTrain, dXdtPredTrain);

  // Get equations
  const equations = model.equations(featureNames);

  // Coefficient paths for visualization (on training data)
  const thresholds = Array.from({ length: 20 }, (_, i) => Math.pow(10, -3 + i * 0.15));
  const { Theta } = model.buildLibrary(XWork);
  const coefPaths = [];
  for (let j = 0; j < XWork[0].length; j++) {
    const y = dXdtTrueTrain.map(row => row[j]);
    coefPaths.push(model.stlsqPath(Theta, y, thresholds));
  }

  // Also get predictions for full trajectory (for time series plotting)
  // We need to run the model on the full dataset for visualization
  let XFull = X;
  let XFullNorm = X;
  if (cfg.normalizeData) {
    const result = normalizeData(X);
    XFullNorm = result.XNorm;
  }
  const modelFull = new SINDy(cfg);
  modelFull.fit(XFullNorm, t);
  const dXdtPredFull = modelFull.predict(XFullNorm);
  const dXdtTrueFull = modelFull.computeDerivatives(XFullNorm, t, cfg.derivativeMethod);

  // Test set predictions for ODE integration (using the model trained on train data)
  // For the validation tab, we need to integrate the ODE from initial conditions
  const X0Test = XTestNorm[0];
  const XPredTest = model.integrate(X0Test, tTest);
  const predData = {
    t_pred: tTest,
    X_pred: XPredTest
  };

  return {
    data: {
      t,
      X,
      featureNames,
      dXdtTrue: dXdtTrueFull,
      dXdtPred: dXdtPredFull,
      // Train/test splits for validation
      t_train: tTrain,
      X_train: XTrain,
      t_test: tTest,
      X_test: XTest
    },
    model: {
      equationsRaw: equations,
      equationsNormalized: equations,
      coefficients: model.coefficients,
      libraryTerms: model.libraryTerms,
      libraryNames: model.libraryNames,
      threshold: cfg.threshold,
      polyOrder: cfg.polyOrder,
      derivativeMethod: cfg.derivativeMethod
    },
    metrics,
    prediction: predData, // For ODE validation
    visualization: {
      libraryMatrix: Theta,
      coefficientPaths: {
        thresholds,
        paths: coefPaths
      },
      sparsityProfile: {
        thresholds,
        nTerms: thresholds.map((_, i) =>
          coefPaths.flatMap(p => p[i]).filter(v => Math.abs(v) > 1e-10).length
        )
      }
    },
    summary: model.getModelSummary(featureNames)
  };
}