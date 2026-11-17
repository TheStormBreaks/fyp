import React, { useState, useEffect, useRef } from 'react'
import { Copy, Check, Code, Eye, Minus, Plus, Download } from 'lucide-react'
import katex from 'katex'

// KatexEquation component for rendering LaTeX with KaTeX
function KatexEquation({ latex }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && latex) {
      try {
        katex.render(latex, ref.current, {
          throwOnError: false,
          displayMode: true,
          strict: false
        })
      } catch (e) {
        console.warn('KaTeX render error:', e)
        ref.current.textContent = latex
      }
    }
  }, [latex])
  return <div ref={ref} style={{overflow: 'auto'}} />
}

// Parse SINDy equation string into LaTeX
function parseEquationToLatex(eq) {
  // eq format: "dHare/dt = 0.2214·x1 + 0.2214·x2 + -0.0584·x1x1x1 + ..."
  const parts = eq.split('=');
  if (parts.length !== 2) return eq;
  const lhs = parts[0].trim();
  const rhs = parts[1].trim();

  // Convert RHS to LaTeX
  // Replace · with \cdot
  let latex = rhs
    .replace(/·/g, '\\cdot ')
    .replace(/\*/g, '\\cdot ')
    // Replace variable names like x1, x2 with x_1, x_2
    .replace(/x(\d+)/g, 'x_{$1}')
    // Replace variable combinations like x1x2 with x_1 x_2
    .replace(/x_\{(\d)\}x_\{(\d)\}/g, 'x_{$1} x_{$2}')
    // Handle coefficients
    .replace(/([+-]?)\s*(\d*\.?\d+)\s*\\cdot/g, '$1 $2 \\cdot')
    // Clean up signs
    .replace(/\+\s*-/g, '- ')
    .replace(/\+\s+/g, ' + ')
    .replace(/-\s+/g, ' - ');

  // Handle special case: no explicit coefficient (should be 1)
  // This is handled by the regex above

  return `\\frac{d${lhs.replace('d', '').replace('/dt', '')}}{dt} = ${latex}`;
}

// Parse SINDy equation string into HTML (fallback for non-LaTeX view)
function formatEquationHTML(eq, index) {
  const color = index === 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)';
  const parts = eq.split('=');
  if (parts.length !== 2) return eq;
  const lhs = parts[0].trim() + ' =';
  const rhs = parts[1].trim();
  const termRegex = /([+-]?)\s*(\d*\.?\d+)?\s*([·*])?\s*([a-zA-Z][a-zA-Z0-9]*(?:[·*][a-zA-Z][a-zA-Z0-9]*)*)/g;
  let html = `<span style="color: ${color}; font-weight: 600">${lhs}</span> `;
  let lastIndex = 0;
  let match;
  while ((match = termRegex.exec(rhs)) !== null) {
    const [full, sign, coeff, multOp, vars] = match;
    const before = rhs.slice(lastIndex, match.index);
    if (before.trim()) {
      html += before.replace(/([+-])/g, '<span style="color: var(--fg-muted)"> $1 </span>');
    }
    const signStr = sign || '+';
    const coeffStr = coeff || '1';
    const varsStr = vars || '';
    html += `<span style="color: var(--fg-muted)"> ${signStr} </span>`;
    html += `<span style="color: var(--accent-tertiary); font-weight: 600">${coeffStr}</span>`;
    if (multOp || varsStr) {
      html += `<span style="color: var(--fg-muted)">·</span>`;
      if (varsStr) {
        const varParts = varsStr.split(/[·*]/);
        html += varParts.map(v => `<span style="color: var(--fg-primary); font-style: italic">${v}</span>`).join('<span style="color: var(--fg-muted)">·</span>');
      }
    }
    lastIndex = match.index + full.length;
  }
  const remaining = rhs.slice(lastIndex);
  if (remaining.trim()) {
    html += remaining.replace(/([+-])/g, '<span style="color: var(--fg-muted)"> $1 </span>');
  }
  return html;
}

function EquationDisplay({ results, config }) {
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showLaTeX, setShowLaTeX] = useState(false)

  if (!results) return null

  const equations = results.model?.equationsRaw || results.model?.equations_raw || []
  const rawMetrics = results.metrics || {}
  const summary = results.summary || {}
  const featureNames = results.data?.featureNames || ['Hare', 'Lynx']

  // Map feature_0, feature_1 to named metrics
  const metrics = {}
  featureNames.forEach((name, i) => {
    metrics[name] = rawMetrics[`feature_${i}`] || {}
  })

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getLaTeX = () => {
    return equations.map(eq => parseEquationToLatex(eq)).join(' \\\\ ')
  }

  const getPlainText = () => {
    return equations.join('\n')
  }

  return (
    <div className="equation-display" style={{
      paddingTop: '2rem',
      paddingBottom: '2rem'
    }}>
      <div className="container">
        <div className="card" style={{
          border: '2px solid var(--accent-primary)',
          boxShadow: '0 -4px 30px rgba(34, 211, 238, 0.2)',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(34, 211, 238, 0.05)'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{color: '#0a0e17'}}><Code className="w-5 h-5" /></span>
              </div>
              <div>
                <h3 style={{fontSize: '1.1rem', fontWeight: '700'}}>Discovered Governing Equations</h3>
                <p style={{fontSize: '0.75rem', color: 'var(--fg-muted)'}}>
                  SINDy • λ={config.threshold} • {summary.active_terms?.[0] || 4}+{summary.active_terms?.[1] || 4} active terms • R²≈{(metrics.Hare?.R2 || 0).toFixed(3)}
                </p>
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
              <button
                className={`btn btn-sm ${showLaTeX ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowLaTeX(!showLaTeX)}
              >
                {showLaTeX ? <Eye className="w-4 h-4" /> : <span style={{color: '#f59e0b'}}><Code className="w-4 h-4" /></span>}
                {showLaTeX ? 'Rendered' : 'LaTeX'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => copyToClipboard(showLaTeX ? getLaTeX() : getPlainText())}
              >
                <Copy className="w-4 h-4" /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Equations */}
          <div style={{
            maxHeight: expanded ? '300px' : '0',
            overflow: expanded ? 'auto' : 'hidden',
            transition: 'max-height 0.3s ease',
            padding: expanded ? '1.5rem' : '0 1.5rem'
          }}>
            {showLaTeX ? (
              <div style={{fontSize: '1.3rem', lineHeight: '2.5', fontFamily: 'Georgia, serif'}}>
                {equations.map((eq, i) => (
                  <div key={i} style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${i === 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)'}`,
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      fontSize: '0.7rem',
                      color: 'var(--fg-muted)',
                      background: 'var(--bg-primary)',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      d{['Hare', 'Lynx'][i]}/dt
                    </div>
                    <KatexEquation latex={parseEquationToLatex(eq)} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{fontFamily: 'monospace', fontSize: '1rem', lineHeight: '2'}}>
                {equations.map((eq, i) => (
                  <div key={i} style={{
                    marginBottom: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid ${i === 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)'}`
                  }}>
                    {eq
                      .split(' ')
                      .map((token, idx) => {
                        if (/^\d+\.?\d*$/.test(token)) return <span key={`num-${idx}`} style={{color: 'var(--accent-tertiary)', fontWeight: '600'}}>{token}</span>
                        if (/^[+-]$/.test(token)) return <span key={`sign-${idx}`} style={{color: 'var(--fg-muted)'}}>{token}</span>
                        if (/^[a-zA-Z]+\d*$/.test(token)) return <span key={`var-${idx}`} style={{color: 'var(--fg-primary)', fontStyle: 'italic'}}>{token}</span>
                        if (token === '=') return <span key={`eq-${idx}`} style={{color: 'var(--fg-secondary)'}}>{token}</span>
                        if (token === '*') return <span key={`mul-${idx}`} style={{color: 'var(--fg-muted)'}}>·</span>
                        return <span key={`other-${idx}`}>{token}</span>
                      })
                    }
                  </div>
                ))}
              </div>
            )}

            {/* Metrics Summary */}
            <div style={{marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)'}}>
              <h4 style={{marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span style={{color: '#f59e0b'}}><Code className="w-4 h-4" /></span>
                Model Quality Metrics
              </h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.85rem'}}>
                <div style={{padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)'}}>
                  <div style={{color: 'var(--fg-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                    R2 (Hare)
                  </div>
                  <div style={{fontWeight: '600', color: 'var(--success)', fontFamily: 'monospace'}}>
                    {metrics.Hare?.R2?.toFixed(4) || 'N/A'}
                  </div>
                </div>
                <div style={{padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)'}}>
                  <div style={{color: 'var(--fg-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                    R2 (Lynx)
                  </div>
                  <div style={{fontWeight: '600', color: 'var(--success)', fontFamily: 'monospace'}}>
                    {metrics.Lynx?.R2?.toFixed(4) || 'N/A'}
                  </div>
                </div>
                <div style={{padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)'}}>
                  <div style={{color: 'var(--fg-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                    AIC
                  </div>
                  <div style={{fontWeight: '600', color: 'var(--accent-primary)', fontFamily: 'monospace'}}>
                    {metrics.Hare?.AIC?.toFixed(1) || 'N/A'}
                  </div>
                </div>
                <div style={{padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)'}}>
                  <div style={{color: 'var(--fg-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                    BIC
                  </div>
                  <div style={{fontWeight: '600', color: 'var(--accent-secondary)', fontFamily: 'monospace'}}>
                    {metrics.Hare?.BIC?.toFixed(1) || 'N/A'}
                  </div>
                </div>
                <div style={{padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)'}}>
                  <div style={{color: 'var(--fg-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                    Active Terms
                  </div>
                  <div style={{fontWeight: '600', color: 'var(--fg-primary)', fontFamily: 'monospace'}}>
                    {summary.active_terms?.[0] || 4} + {summary.active_terms?.[1] || 4}
                  </div>
                </div>
                <div style={{padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)'}}>
                  <div style={{color: 'var(--fg-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                    Threshold λ
                  </div>
                  <div style={{fontWeight: '600', color: 'var(--accent-tertiary)', fontFamily: 'monospace'}}>
                    {config.threshold}
                  </div>
                </div>
              </div>
            </div>

            {/* LaTeX Source */}
            <div style={{marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)'}}>
              <h4 style={{marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span style={{color: '#f59e0b'}}><Code className="w-4 h-4" /></span>
                LaTeX Source
              </h4>
              <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                overflow: 'auto',
                whiteSpace: 'pre'
              }}>
{getLaTeX()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EquationDisplay

