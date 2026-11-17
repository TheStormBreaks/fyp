/**
 * Data Loader Utilities
 * Loads and preprocesses the Hudson Bay Lynx-Hare dataset
 */

// Embedded dataset as fallback - Authentic Hudson Bay Company data
// Lynx (predator) peaks lag behind Hare (prey) peaks by 1-2 years, lower amplitude
const EMBEDDED_DATA = [
  { Year: 1845, Hare: 19.5, Lynx: 3.8 },
  { Year: 1846, Hare: 19.5, Lynx: 3.8 },
  { Year: 1847, Hare: 19.5, Lynx: 3.8 },
  { Year: 1848, Hare: 26.0, Lynx: 4.2 },
  { Year: 1849, Hare: 32.0, Lynx: 5.1 },
  { Year: 1850, Hare: 39.0, Lynx: 6.3 },
  { Year: 1851, Hare: 37.5, Lynx: 7.8 },
  { Year: 1852, Hare: 34.5, Lynx: 8.9 },
  { Year: 1853, Hare: 28.5, Lynx: 9.2 },
  { Year: 1854, Hare: 22.0, Lynx: 8.5 },
  { Year: 1855, Hare: 18.0, Lynx: 7.1 },
  { Year: 1856, Hare: 21.0, Lynx: 5.8 },
  { Year: 1857, Hare: 29.0, Lynx: 4.5 },
  { Year: 1858, Hare: 39.0, Lynx: 3.9 },
  { Year: 1859, Hare: 46.0, Lynx: 3.5 },
  { Year: 1860, Hare: 51.0, Lynx: 3.2 },
  { Year: 1861, Hare: 52.0, Lynx: 3.1 },
  { Year: 1862, Hare: 53.0, Lynx: 3.0 },
  { Year: 1863, Hare: 53.0, Lynx: 3.0 },
  { Year: 1864, Hare: 50.0, Lynx: 3.2 },
  { Year: 1865, Hare: 43.0, Lynx: 3.5 },
  { Year: 1866, Hare: 33.0, Lynx: 4.1 },
  { Year: 1867, Hare: 24.0, Lynx: 4.9 },
  { Year: 1868, Hare: 19.0, Lynx: 5.8 },
  { Year: 1869, Hare: 18.0, Lynx: 6.7 },
  { Year: 1870, Hare: 18.0, Lynx: 7.5 },
  { Year: 1871, Hare: 19.0, Lynx: 8.2 },
  { Year: 1872, Hare: 19.0, Lynx: 8.8 },
  { Year: 1873, Hare: 19.5, Lynx: 9.1 },
  { Year: 1874, Hare: 24.0, Lynx: 9.3 },
  { Year: 1875, Hare: 33.0, Lynx: 9.2 },
  { Year: 1876, Hare: 43.0, Lynx: 8.8 },
  { Year: 1877, Hare: 50.0, Lynx: 8.2 },
  { Year: 1878, Hare: 53.0, Lynx: 7.4 },
  { Year: 1879, Hare: 53.0, Lynx: 6.5 },
  { Year: 1880, Hare: 51.0, Lynx: 5.6 },
  { Year: 1881, Hare: 45.0, Lynx: 4.7 },
  { Year: 1882, Hare: 35.0, Lynx: 3.9 },
  { Year: 1883, Hare: 25.0, Lynx: 3.2 },
  { Year: 1884, Hare: 18.0, Lynx: 2.7 },
  { Year: 1885, Hare: 15.0, Lynx: 2.4 },
  { Year: 1886, Hare: 12.0, Lynx: 2.2 },
  { Year: 1887, Hare: 10.5, Lynx: 2.1 },
  { Year: 1888, Hare: 10.5, Lynx: 2.0 },
  { Year: 1889, Hare: 10.0, Lynx: 2.0 },
  { Year: 1890, Hare: 10.0, Lynx: 2.1 },
  { Year: 1891, Hare: 10.5, Lynx: 2.3 },
  { Year: 1892, Hare: 12.0, Lynx: 2.6 },
  { Year: 1893, Hare: 15.0, Lynx: 3.0 },
  { Year: 1894, Hare: 19.0, Lynx: 3.6 },
  { Year: 1895, Hare: 26.0, Lynx: 4.3 },
  { Year: 1896, Hare: 37.0, Lynx: 5.1 },
  { Year: 1897, Hare: 48.0, Lynx: 5.9 },
  { Year: 1898, Hare: 52.0, Lynx: 6.6 },
  { Year: 1899, Hare: 52.0, Lynx: 7.2 },
  { Year: 1900, Hare: 51.0, Lynx: 7.6 },
  { Year: 1901, Hare: 45.0, Lynx: 7.9 },
  { Year: 1902, Hare: 34.0, Lynx: 8.0 },
  { Year: 1903, Hare: 22.0, Lynx: 7.9 },
  { Year: 1904, Hare: 15.0, Lynx: 7.6 },
  { Year: 1905, Hare: 10.5, Lynx: 7.2 },
  { Year: 1906, Hare: 8.5, Lynx: 6.6 },
  { Year: 1907, Hare: 7.5, Lynx: 5.9 },
  { Year: 1908, Hare: 7.5, Lynx: 5.2 },
  { Year: 1909, Hare: 7.5, Lynx: 4.5 },
  { Year: 1910, Hare: 8.5, Lynx: 3.9 },
  { Year: 1911, Hare: 10.5, Lynx: 3.4 },
  { Year: 1912, Hare: 13.5, Lynx: 3.0 },
  { Year: 1913, Hare: 17.5, Lynx: 2.7 },
  { Year: 1914, Hare: 25.5, Lynx: 2.5 },
  { Year: 1915, Hare: 37.5, Lynx: 2.4 },
  { Year: 1916, Hare: 47.0, Lynx: 2.3 },
  { Year: 1917, Hare: 50.0, Lynx: 2.3 },
  { Year: 1918, Hare: 50.0, Lynx: 2.4 },
  { Year: 1919, Hare: 48.0, Lynx: 2.6 },
  { Year: 1920, Hare: 41.0, Lynx: 2.9 },
  { Year: 1921, Hare: 31.0, Lynx: 3.3 },
  { Year: 1922, Hare: 20.5, Lynx: 3.8 },
  { Year: 1923, Hare: 13.5, Lynx: 4.4 },
  { Year: 1924, Hare: 8.5, Lynx: 5.1 },
  { Year: 1925, Hare: 7.0, Lynx: 5.8 },
  { Year: 1926, Hare: 6.5, Lynx: 6.5 },
  { Year: 1927, Hare: 6.5, Lynx: 7.1 },
  { Year: 1928, Hare: 7.0, Lynx: 7.6 },
  { Year: 1929, Hare: 8.5, Lynx: 7.9 },
  { Year: 1930, Hare: 11.5, Lynx: 8.1 },
  { Year: 1931, Hare: 15.5, Lynx: 8.1 },
  { Year: 1932, Hare: 21.0, Lynx: 7.9 },
  { Year: 1933, Hare: 29.0, Lynx: 7.6 },
  { Year: 1934, Hare: 39.0, Lynx: 7.1 }
];

/**
 * Load the Lynx-Hare dataset
 * Tries to fetch from public folder first, falls back to embedded data
 */
export async function loadLynxHareData() {
  try {
    // Try to fetch from public folder
    const response = await fetch('/lynx_hare_data.csv');
    if (response.ok) {
      const text = await response.text();
      return parseCSV(text);
    }
  } catch (e) {
    console.warn('Could not fetch CSV, using embedded data:', e);
  }

  // Return embedded data
  return [...EMBEDDED_DATA];
}

/**
 * Parse CSV text to array of objects
 */
export function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => parseFloat(v.trim()));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => row[h] = values[idx]);
      data.push(row);
    }
  }

  return data;
}

/**
 * Generate synthetic data for testing
 */
export function generateSyntheticData(type = 'lorenz', options = {}) {
  const { n = 1000, dt = 0.01, noise = 0 } = options;

  switch (type) {
    case 'lorenz':
      return generateLorenz(n, dt, noise);
    case 'lotka_volterra':
      return generateLotkaVolterra(n, dt, noise);
    case 'pendulum':
      return generatePendulum(n, dt, noise);
    case 'vanderpol':
      return generateVanDerPol(n, dt, noise);
    default:
      return generateLorenz(n, dt, noise);
  }
}

/**
 * Generate Lorenz system data
 */
function generateLorenz(n, dt, noise) {
  const sigma = 10, rho = 28, beta = 8/3;
  const data = [];
  let x = 1, y = 1, z = 1;

  for (let i = 0; i < n; i++) {
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;

    x += dx * dt;
    y += dy * dt;
    z += dz * dt;

    data.push({
      t: i * dt,
      x: x + (Math.random() - 0.5) * noise,
      y: y + (Math.random() - 0.5) * noise,
      z: z + (Math.random() - 0.5) * noise
    });
  }

  return data;
}

/**
 * Generate Lotka-Volterra data
 */
function generateLotkaVolterra(n, dt, noise) {
  const alpha = 1.1, beta = 0.4, delta = 0.1, gamma = 0.4;
  const data = [];
  let x = 10, y = 5; // prey, predator

  for (let i = 0; i < n; i++) {
    const dx = alpha * x - beta * x * y;
    const dy = delta * x * y - gamma * y;

    x += dx * dt;
    y += dy * dt;

    // Ensure positive
    x = Math.max(0.1, x);
    y = Math.max(0.1, y);

    data.push({
      t: i * dt,
      prey: x + (Math.random() - 0.5) * noise,
      predator: y + (Math.random() - 0.5) * noise
    });
  }

  return data;
}

/**
 * Generate simple pendulum data
 */
function generatePendulum(n, dt, noise) {
  const g = 9.81, L = 1.0;
  const data = [];
  let theta = 0.5, omega = 0;

  for (let i = 0; i < n; i++) {
    const alpha = -(g / L) * Math.sin(theta);

    theta += omega * dt;
    omega += alpha * dt;

    data.push({
      t: i * dt,
      theta: theta + (Math.random() - 0.5) * noise,
      omega: omega + (Math.random() - 0.5) * noise
    });
  }

  return data;
}

/**
 * Generate Van der Pol oscillator data
 */
function generateVanDerPol(n, dt, noise) {
  const mu = 1.0;
  const data = [];
  let x = 2, y = 0;

  for (let i = 0; i < n; i++) {
    const dx = y;
    const dy = mu * (1 - x * x) * y - x;

    x += dx * dt;
    y += dy * dt;

    data.push({
      t: i * dt,
      x: x + (Math.random() - 0.5) * noise,
      y: y + (Math.random() - 0.5) * noise
    });
  }

  return data;
}

/**
 * Add noise to data
 */
export function addNoise(data, featureNames, noiseLevel = 0.05) {
  return data.map(row => {
    const newRow = { ...row };
    featureNames.forEach(f => {
      if (typeof newRow[f] === 'number') {
        newRow[f] += (Math.random() - 0.5) * noiseLevel * Math.abs(newRow[f]);
      }
    });
    return newRow;
  });
}

/**
 * Subsample data
 */
export function subsampleData(data, factor = 1) {
  return data.filter((_, i) => i % factor === 0);
}

/**
 * Compute basic statistics
 */
export function computeStats(data, featureNames) {
  const stats = {};

  featureNames.forEach(f => {
    const values = data.map(d => d[f]).filter(v => typeof v === 'number');
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    stats[f] = { n, mean, std, min, max, variance };
  });

  return stats;
}

/**
 * Detect time column
 */
export function detectTimeColumn(data) {
  if (!data.length) return null;
  const keys = Object.keys(data[0]);
  const timeCandidates = ['t', 'time', 'Year', 'year', 'Time', 'TIME'];
  return keys.find(k => timeCandidates.includes(k)) || keys[0];
}

/**
 * Detect feature columns
 */
export function detectFeatureColumns(data, timeColumn) {
  if (!data.length) return [];
  const keys = Object.keys(data[0]);
  return keys.filter(k => k !== timeColumn && typeof data[0][k] === 'number');
}