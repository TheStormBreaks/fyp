import React, { useRef, useEffect, useState } from 'react'
import { Filter, ArrowRight, ArrowLeft, Minimize2, Maximize2, Info } from 'lucide-react'
import * as d3 from 'd3'

function PreprocessingPanel({ data, results, active, loading }) {
  const chartRef = useRef(null)
  const [derivativeMethod, setDerivativeMethod] = useState('savgol')
  const [showNormalized, setShowNormalized] = useState(false)
  const [animating, setAnimating] = useState(false)

  // Compute derivatives on the client side for visualization
  const computeDerivatives = (data, method) => {
    const t = data.map(d => d.Year)
    const hare = data.map(d => d.Hare)
    const lynx = data.map(d => d.Lynx)

    const n = data.length
    const dhare = new Array(n).fill(0)
    const dlynx = new Array(n).fill(0)

    if (method === 'finite_diff') {
      // Central differences
      for (let i = 1; i < n - 1; i++) {
        const dt = t[i+1] - t[i-1]
        dhare[i] = (hare[i+1] - hare[i-1]) / dt
        dlynx[i] = (lynx[i+1] - lynx[i-1]) / dt
      }
      // Boundaries
      dhare[0] = (hare[1] - hare[0]) / (t[1] - t[0])
      dlynx[0] = (lynx[1] - lynx[0]) / (t[1] - t[0])
      dhare[n-1] = (hare[n-1] - hare[n-2]) / (t[n-1] - t[n-2])
      dlynx[n-1] = (lynx[n-1] - lynx[n-2]) / (t[n-1] - t[n-2])
    } else if (method === 'savgol') {
      // Simplified Savitzky-Golay (window=5, poly=2)
      const window = 5
      const half = Math.floor(window / 2)
      // Coefficients for derivative (1st derivative, 2nd order poly, 5 points)
      const coeffs = [-2, -1, 0, 1, 2].map(x => x / 10) // Simplified

      for (let i = 0; i < n; i++) {
        let sumH = 0, sumL = 0, count = 0
        for (let j = -half; j <= half; j++) {
          const idx = i + j
          if (idx >= 0 && idx < n) {
            const dt = t[idx] - t[i]
            if (dt !== 0 || j === 0) {
              // Use finite diff for non-center points
              const coeff = j / 10
              sumH += coeff * hare[idx]
              sumL += coeff * lynx[idx]
              count++
            }
          }
        }
        if (count > 0) {
          dhare[i] = sumH
          dlynx[i] = sumL
        }
      }
      // Smooth boundaries
      dhare[0] = (hare[1] - hare[0]) / (t[1] - t[0])
      dlynx[0] = (lynx[1] - lynx[0]) / (t[1] - t[0])
    }

    return { dhare, dlynx, t }
  }

  useEffect(() => {
    if (!active || !data || !chartRef.current) return
    renderChart()
  }, [active, data, derivativeMethod, showNormalized])

  const renderChart = () => {
    const container = chartRef.current
    if (!container) return

    d3.select(container).selectAll('*').remove()

    const margin = { top: 30, right: 50, bottom: 60, left: 70 }
    const width = container.clientWidth - margin.left - margin.right
    const height = 350 - margin.top - margin.bottom

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const { dhare, dlynx, t } = computeDerivatives(data, derivativeMethod)

    // Normalize if requested
    let plotHare = data.map(d => d.Hare)
    let plotLynx = data.map(d => d.Lynx)
    let plotDHare = dhare
    let plotDLynx = dlynx
    let yLabel = 'Population (k pelts)'
    let y2Label = 'Derivative (k pelts/year)'

    if (showNormalized) {
      const norm = (arr) => {
        const mean = d3.mean(arr)
        const std = d3.deviation(arr)
        return arr.map(v => (v - mean) / std)
      }
      plotHare = norm(plotHare)
      plotLynx = norm(plotLynx)
      plotDHare = norm(plotDHare)
      plotDLynx = norm(plotDLynx)
      yLabel = 'Normalized Population'
      y2Label = 'Normalized Derivative'
    }

    // Scales
    const x = d3.scaleLinear().domain(d3.extent(t)).range([0, width])
    const y1 = d3.scaleLinear()
      .domain(d3.extent([...plotHare, ...plotLynx]))
      .nice().range([height, 0])
    const y2 = d3.scaleLinear()
      .domain(d3.extent([...plotDHare, ...plotDLynx]))
      .nice().range([height, 0])

    // Colors
    const colors = {
      Hare: '#22d3ee', Lynx: '#a855f7',
      dHare: '#06b6d4', dLynx: '#9333ea'
    }

    // Grid
    svg.append('g')
      .call(d3.axisLeft(y1).tickSize(-width).tickFormat(''))
      .selectAll('line').attr('stroke', 'var(--border)').attr('stroke-dasharray', '2,2')

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(8))
      .selectAll('text').attr('fill', 'var(--fg-secondary)').style('font-size', '11px')

    svg.append('g')
      .call(d3.axisLeft(y1).ticks(5))
      .selectAll('text').attr('fill', colors.Hare).style('font-size', '11px')

    // Secondary axis
    const y2Axis = svg.append('g')
      .attr('transform', `translate(${width},0)`)
      .call(d3.axisRight(y2).ticks(5))
      .selectAll('text').attr('fill', colors.dHare).style('font-size', '11px')

    // Axis labels
    svg.append('text')
      .attr('x', width/2).attr('y', height + 45)
      .attr('text-anchor', 'middle').attr('fill', 'var(--fg-secondary)')
      .style('font-size', '12px').text('Year')

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height/2).attr('y', -50)
      .attr('text-anchor', 'middle').attr('fill', colors.Hare)
      .style('font-size', '12px').text(yLabel)

    svg.append('text')
      .attr('transform', 'rotate(90)')
      .attr('x', height/2).attr('y', width + 50)
      .attr('text-anchor', 'middle').attr('fill', colors.dHare)
      .style('font-size', '12px').text(y2Label)

    // Plot lines for populations
    const linePop = d3.line()
      .x(d => x(d.t))
      .y(d => y1(d.y))
      .curve(d3.curveMonotoneX)

    const lineDeriv = d3.line()
      .x(d => x(d.t))
      .y(d => y2(d.y))
      .curve(d3.curveMonotoneX)

    // Population lines
    svg.append('path')
      .datum(data.map((d, i) => ({ t: d.Year, y: plotHare[i] })))
      .attr('fill', 'none').attr('stroke', colors.Hare).attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2').attr('d', linePop)

    svg.append('path')
      .datum(data.map((d, i) => ({ t: d.Year, y: plotLynx[i] })))
      .attr('fill', 'none').attr('stroke', colors.Lynx).attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2').attr('d', linePop)

    // Derivative lines (solid)
    svg.append('path')
      .datum(data.map((d, i) => ({ t: d.Year, y: plotDHare[i] })))
      .attr('fill', 'none').attr('stroke', colors.dHare).attr('stroke-width', 2.5)
      .attr('d', lineDeriv)

    svg.append('path')
      .datum(data.map((d, i) => ({ t: d.Year, y: plotDLynx[i] })))
      .attr('fill', 'none').attr('stroke', colors.dLynx).attr('stroke-width', 2.5)
      .attr('d', lineDeriv)

    // Legend
    const legendData = [
      { label: 'Hare', color: colors.Hare, dash: '4,2' },
      { label: 'Lynx', color: colors.Lynx, dash: '4,2' },
      { label: 'dHare/dt', color: colors.dHare, dash: 'none' },
      { label: 'dLynx/dt', color: colors.dLynx, dash: 'none' }
    ]

    const legend = svg.append('g').attr('transform', `translate(${width - 120}, -20)`)
    legendData.forEach((l, i) => {
      const g = legend.append('g').attr('transform', `translate(0, ${i * 20})`)
      g.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 0).attr('y2', 0)
        .attr('stroke', l.color).attr('stroke-width', 2).attr('stroke-dasharray', l.dash)
      g.append('text').attr('x', 25).attr('y', 4).attr('fill', 'var(--fg-secondary)')
        .style('font-size', '11px').text(l.label)
    })

    // Title
    svg.append('text')
      .attr('x', width/2).attr('y', -10)
      .attr('text-anchor', 'middle').attr('fill', 'var(--fg-primary)')
      .style('font-size', '13px').style('font-weight', '600')
      .text(`Numerical Derivatives (${derivativeMethod.toUpperCase()})`)
  }

  if (!active) return null

  // Use results from server if available
  const serverDerivatives = results?.data?.dXdt_true

  return (
    <div className="panel active" role="tabpanel" aria-label="Preprocessing">
      <div className="card" style={{marginBottom: '1.5rem'}}>
        <div className="card-header">
          <div className="card-title">
            <Filter className="w-5 h-5" />
            Data Preprocessing & Derivative Computation
          </div>
        </div>

        <div style={{marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <label className="label" style={{marginBottom: 0}}>Method:</label>
            <select
              className="input"
              value={derivativeMethod}
              onChange={(e) => setDerivativeMethod(e.target.value)}
              style={{width: 'auto', minWidth: '200px'}}
            >
              <option value="savgol">Savitzky-Golay (Smooth)</option>
              <option value="finite_diff">Finite Differences</option>
              <option value="spline">Cubic Spline</option>
            </select>
          </div>
          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
            <input
              type="checkbox"
              checked={showNormalized}
              onChange={(e) => setShowNormalized(e.target.checked)}
              style={{width: '18px', height: '18px', accentColor: 'var(--accent-primary)'}}
            />
            Show Normalized
          </label>
        </div>

        <div className="chart-container" style={{height: '350px', position: 'relative'}}>
          <div ref={chartRef} style={{width: '100%', height: '100%'}} />
        </div>
      </div>

      <div className="grid grid-2" style={{marginBottom: '1.5rem'}}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Info className="w-5 h-5" />
              Derivative Computation Methods
            </div>
          </div>
          <div style={{fontSize: '0.85rem', color: 'var(--fg-secondary)', lineHeight: '1.8'}}>
            <h4 style={{color: 'var(--fg-primary)', marginBottom: '0.5rem'}}>Finite Differences</h4>
            <p>Simple central difference: f'(t) ≈ (f(t+h) - f(t-h)) / 2h</p>
            <p style={{marginTop: '0.5rem'}}><strong>Pros:</strong> Fast, simple</p>
            <p><strong>Cons:</strong> Amplifies noise, poor at boundaries</p>

            <h4 style={{color: 'var(--fg-primary)', marginTop: '1rem', marginBottom: '0.5rem'}}>Savitzky-Golay Filter</h4>
            <p>Fits local polynomial, computes analytic derivative</p>
            <p style={{marginTop: '0.5rem'}}><strong>Pros:</strong> Smooths noise, preserves peaks</p>
            <p><strong>Cons:</strong> Window size tradeoff, edge effects</p>

            <h4 style={{color: 'var(--fg-primary)', marginTop: '1rem', marginBottom: '0.5rem'}}>Cubic Splines</h4>
            <p>Piecewise cubic interpolation with continuous derivatives</p>
            <p style={{marginTop: '0.5rem'}}><strong>Pros:</strong> Smooth, accurate derivatives</p>
            <p><strong>Cons:</strong> Can overshoot, sensitive to outliers</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Info className="w-5 h-5" />
              Why Normalize?
            </div>
          </div>
          <div style={{fontSize: '0.85rem', color: 'var(--fg-secondary)', lineHeight: '1.8'}}>
            <p>SINDy builds a library of candidate functions Θ(x). The scale of different terms affects the sparse regression:</p>
            <ul style={{paddingLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '2'}}>
              <li>Polynomial terms grow rapidly (x, x², x³...)</li>
              <li>Large terms dominate the regression</li>
              <li>Thresholding becomes scale-dependent</li>
            </ul>
            <p style={{marginTop: '0.5rem'}}>Normalization (z-score): x' = (x - μ) / σ</p>
            <p>Makes all library terms comparable, improves numerical stability of STLSQ.</p>
          </div>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Filter className="w-5 h-5" />
            Preprocessing Pipeline
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1rem 0'}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px'}}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--bg-tertiary)', border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem'
            }}>📊</div>
            <span style={{fontWeight: '600', textAlign: 'center'}}>Raw Data</span>
            <span style={{fontSize: '0.75rem', color: 'var(--fg-muted)', textAlign: 'center'}}>
              H(t), L(t)
            </span>
          </div>
          <span style={{color: '#22d3ee', flexShrink: 0}}><ArrowRight className="w-6 h-6" /></span>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px'}}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(34, 211, 238, 0.1)', border: '2px solid var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem'
            }}>🔧</div>
            <span style={{fontWeight: '600', textAlign: 'center', color: 'var(--accent-primary)'}}>
              Derivative
            </span>
            <span style={{fontSize: '0.75rem', color: 'var(--fg-muted)', textAlign: 'center'}}>
              dH/dt, dL/dt
            </span>
          </div>
            <span style={{color: '#22d3ee', flexShrink: 0}}><ArrowRight className="w-6 h-6" /></span>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px'}}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--bg-tertiary)', border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem'
            }}>📐</div>
            <span style={{fontWeight: '600', textAlign: 'center'}}>Normalize</span>
            <span style={{fontSize: '0.75rem', color: 'var(--fg-muted)', textAlign: 'center'}}>
              (opt.) z-score
            </span>
          </div>
            <span style={{color: '#22d3ee', flexShrink: 0}}><ArrowRight className="w-6 h-6" /></span>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px'}}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(168, 85, 247, 0.1)', border: '2px solid var(--accent-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem'
            }}>📚</div>
            <span style={{fontWeight: '600', textAlign: 'center', color: 'var(--accent-secondary)'}}>
              Library
            </span>
            <span style={{fontSize: '0.75rem', color: 'var(--fg-muted)', textAlign: 'center'}}>
              Θ(x) = [1, x, x²...]
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreprocessingPanel