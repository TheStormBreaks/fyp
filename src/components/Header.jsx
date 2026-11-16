import React from 'react'
import { Brain, Github, ExternalLink, Settings, Info, Sun, Moon } from 'lucide-react'

function Header({
  config,
  onConfigChange,
  showConfig,
  setShowConfig,
  loading,
  onRun,
  onReset
}) {
  const [darkMode, setDarkMode] = React.useState(
    () => document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <header className="header" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(var(--bg-primary), 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border)',
      padding: '1rem 0'
    }}>
      <div className="container" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{
            width: '40px', height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{color: '#ffffff'}}><Brain className="w-6 h-6" /></span>
          </div>
          <div>
            <h1 style={{fontSize: '1.5rem', fontWeight: '700', background: 'linear-gradient(135deg, var(--fg-primary), var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>SINDy Framework</h1>
            <p style={{fontSize: '0.75rem', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em'}}>
              Sparse Identification of Nonlinear Dynamics
            </p>
          </div>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          {/* Config Toggle */}
          <button
            className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowConfig(!showConfig)}
            disabled={loading}
          >
            <Settings className="w-4 h-4" /> Config
          </button>

          {/* Theme Toggle */}
          <button
            className="btn btn-ghost"
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Links */}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" aria-label="GitHub">
            <Github className="w-5 h-5" />
          </a>
          <a href="https://www.pnas.org/doi/10.1073/pnas.1517384113" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" aria-label="Original Paper">
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="config-panel" style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          padding: '1.5rem 0',
          animation: 'slideDown 0.3s ease'
        }}>
          <div className="container">
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
              <div>
                <label className="label">Sparsity Threshold (λ)</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  <input
                    type="range"
                    min="0.001"
                    max="0.5"
                    step="0.001"
                    value={config.threshold}
                    onChange={(e) => onConfigChange('threshold', parseFloat(e.target.value))}
                    style={{flex: 1}}
                  />
                  <span style={{fontFamily: 'monospace', minWidth: '60px', color: 'var(--accent-primary)'}}>
                    {config.threshold.toFixed(3)}
                  </span>
                </div>
                <p style={{fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.25rem'}}>
                  Higher = sparser model (fewer terms)
                </p>
              </div>

              <div>
                <label className="label">Polynomial Order</label>
                <select
                  className="input"
                  value={config.polyOrder}
                  onChange={(e) => onConfigChange('polyOrder', parseInt(e.target.value))}
                >
                  <option value={2}>2 (Quadratic)</option>
                  <option value={3}>3 (Cubic)</option>
                  <option value={4}>4 (Quartic)</option>
                  <option value={5}>5 (Quintic)</option>
                </select>
              </div>

              <div>
                <label className="label">Derivative Method</label>
                <select
                  className="input"
                  value={config.derivativeMethod}
                  onChange={(e) => onConfigChange('derivativeMethod', e.target.value)}
                >
                  <option value="savgol">Savitzky-Golay (Recommended)</option>
                  <option value="spline">Cubic Spline</option>
                  <option value="finite_diff">Finite Differences</option>
                </select>
              </div>

              <div>
                <label className="label">Max Iterations</label>
                <input
                  type="number"
                  className="input"
                  min="5"
                  max="100"
                  value={config.maxIter}
                  onChange={(e) => onConfigChange('maxIter', parseInt(e.target.value))}
                />
              </div>

              <div>
                <label className="label" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={config.normalizeData}
                    onChange={(e) => onConfigChange('normalizeData', e.target.checked)}
                    style={{width: '18px', height: '18px', accentColor: 'var(--accent-primary)'}}
                  />
                  Normalize Data
                </label>
              </div>
            </div>

            <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)'}}>
              <button className="btn btn-primary" onClick={onRun} disabled={loading}>
                {loading ? 'Running...' : 'Run Analysis'}
              </button>
              <button className="btn btn-secondary" onClick={onReset}>
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  )
}

export default Header