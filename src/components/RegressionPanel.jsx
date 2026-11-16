import React, { useRef, useEffect, useState } from 'react'
import { Zap, TrendingUp, Filter, SlidersHorizontal, Target, RefreshCw } from 'lucide-react'
import * as d3 from 'd3'

function RegressionPanel({ data, results, config, active, loading }) {
  const chartRef = useRef(null)
  const sparsityRef = useRef(null)
  const [selectedEq, setSelectedEq] = useState(0) // 0 = Hare, 1 = Lynx
  const [showPath, setShowPath] = useState(true)
  const [animating, setAnimating] = useState(false)

  // STLSQ implementation for client-side visualization
  const runSTLSQ = (Theta, y, thresholds, maxIter = 20, alpha = 1e-3) => {
    const nLib = Theta[0].length
    const paths = []

    for (const thresh of thresholds) {
      let xi = new Array(nLib).fill(0)

      // Initial ridge regression
      // Theta^T Theta + alpha I
      const TT = mathMultiply(transpose(Theta), Theta)
      for (let i = 0; i < nLib; i++) TT[i][i] += alpha
      const Ty = mathMultiply(transpose(Theta), y.map(v => [v]))

      xi = solveLinear(TT, Ty).map(v => v[0])

      // Thresholding iterations
      for (let iter = 0; iter < maxIter; iter++) {
        const small = xi.map(v => Math.abs(v) < thresh)
        const newXi = xi.map((v, i) => small[i] ? 0 : v)

        const big = newXi.map((v, i) => v !== 0)
        if (!big.some(v => v)) break

        // Refit on active terms
        const activeIdx = big.map((v, i) => v ? i : -1).filter(i => i >= 0)
        const ThetaActive = Theta.map(row => activeIdx.map(i => row[i]))
        const TTActive = mathMultiply(transpose(ThetaActive), ThetaActive)
        for (let i = 0; i < activeIdx.length; i++) TTActive[i][i] += alpha
        const TyActive = mathMultiply(transpose(ThetaActive), y.map(v => [v]))

        const xiActive = solveLinear(TTActive, TyActive).map(v => v[0])

        activeIdx.forEach((idx, i) => { newXi[idx] = xiActive[i] })

        if (xi.every((v, i) => Math.abs(v - newXi[i]) < 1e-6)) break
        xi = newXi
      }

      paths.push(xi)
    }

    return paths
  }

  const mathMultiply = (A, B) => {
    const m = A.length, n = A[0].length, p = B[0].length
    const C = Array(m).fill().map(() => Array(p).fill(0))
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < n; k++) C[i][j] += A[i][k] * B[k][j]
      }
    }
    return C
  }

  const transpose = (A) => A[0].map((_, i) => A.map(row => row[i]))

  const solveLinear = (A, b) => {
    // Simple Gaussian elimination with singular matrix handling
    const n = A.length
    const M = A.map((row, i) => [...row, b[i][0]])

    for (let i = 0; i < n; i++) {
      // Pivot
      let maxRow = i
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]]

      // Normalize - handle near-zero pivots (singular matrix)
      const pivot = M[i][i]
      if (Math.abs(pivot) < 1e-12) {
        // Singular or ill-conditioned - set this variable to 0 and continue
        for (let j = i; j <= n; j++) M[i][j] = 0
        continue
      }
      for (let j = i; j <= n; j++) M[i][j] /= pivot

      // Eliminate
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = M[k][i]
          for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j]
        }
      }
    }

    return M.map(row => [row[n]])
  }

  useEffect(() => {
    if (!active || !data || !chartRef.current) return
    renderCoefficientPath()
    renderSparsityProfile()
  }, [active, data, config])

  const renderCoefficientPath = () => {
    const container = chartRef.current
    if (!container) return

    d3.select(container).selectAll('*').remove()

    // Build library
    const X = data.map(d => [d.Hare, d.Lynx])
    const { terms, termNames, termValues } = buildLibrary(X, config.polyOrder)
    const Theta = transpose(termValues) // n_samples x n_terms

    // Compute derivatives
    const { dhare, dlynx } = computeDerivatives(data, config.derivativeMethod)
    const y = selectedEq === 0 ? dhare : dlynx

    // Thresholds
    const thresholds = d3.range(-3, 0.05, 0.05).map(d => Math.pow(10, d))

    // Run STLSQ path
    const paths = runSTLSQ(Theta, y, thresholds, config.maxIter)

    // Filter to terms that are ever active
    const activeTermIndices = new Set()
    paths.forEach(path => {
      path.forEach((coef, i) => { if (Math.abs(coef) > 1e-10) activeTermIndices.add(i) })
    })
    const activeIndices = Array.from(activeTermIndices).sort((a, b) => a - b)

    const margin = { top: 30, right: 200, bottom: 60, left: 70 }
    const width = container.clientWidth - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const x = d3.scaleLog()
      .domain(d3.extent(thresholds))
      .range([0, width])

    const maxCoef = d3.max(paths.flat().map(Math.abs)) || 1
    const yScale = d3.scaleLinear()
      .domain([-maxCoef * 1.1, maxCoef * 1.1])
      .nice()
      .range([height, 0])

    // Color scale
    const colors = d3.scaleOrdinal(d3.schemeTableau10).domain(activeIndices)

    // Grid
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
      .selectAll('line').attr('stroke', 'var(--border)').attr('stroke-dasharray', '2,2')

    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisBottom(x).tickSize(-height).tickFormat(''))
      .selectAll('line').attr('stroke', 'var(--border)').attr('stroke-dasharray', '2,2')

    // Axes
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .selectAll('text').attr('fill', 'var(--fg-secondary)').style('font-size', '11px')

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6, '.0e'))
      .selectAll('text').attr('fill', 'var(--fg-secondary)').style('font-size', '11px')

    // Axis labels
    svg.append('text')
      .attr('x', width/2).attr('y', height + 45)
      .attr('text-anchor', 'middle').attr('fill', 'var(--fg-secondary)')
      .style('font-size', '12px').text('Threshold (λ)')

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height/2).attr('y', -50)
      .attr('text-anchor', 'middle').attr('fill', 'var(--fg-secondary)')
      .style('font-size', '12px').text('Coefficient Value')

    // Zero line
    svg.append('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', 'var(--fg-muted)').attr('stroke-dasharray', '4,4')

    // Current threshold line
    svg.append('line')
      .attr('x1', x(config.threshold)).attr('x2', x(config.threshold))
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', 'var(--accent-tertiary)').attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4')

    svg.append('text')
      .attr('x', x(config.threshold) + 5)
      .attr('y', 15)
      .attr('fill', 'var(--accent-tertiary)')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text(`λ = ${config.threshold.toFixed(3)}`)

    // Lines for each active term
    const line = d3.line()
      .x((d, i) => x(thresholds[i]))
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX)
      .defined(d => !isNaN(d))

    activeIndices.forEach(idx => {
      const pathData = paths.map(p => p[idx])
      const color = colors(idx)

      svg.append('path')
        .datum(pathData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', line)
        .style('opacity', 0.8)

      // Label at end
      const lastVal = pathData[pathData.length - 1]
      if (Math.abs(lastVal) > 1e-10) {
        svg.append('text')
          .attr('x', width + 10)
          .attr('y', yScale(lastVal) + 4)
          .attr('fill', color)
          .style('font-size', '10px')
          .style('font-family', 'monospace')
          .text(termNames[idx])
      }
    })

    // Title
    svg.append('text')
      .attr('x', width/2).attr('y', -10)
      .attr('text-anchor', 'middle').attr('fill', 'var(--fg-primary)')
      .style('font-size', '13px').style('font-weight', '600')
      .text(`STLSQ Coefficient Paths - d${selectedEq === 0 ? 'Hare' : 'Lynx'}/dt`)

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'var(--bg-secondary)')
      .style('border', '1px solid var(--border)')
      .style('border-radius', '8px')
      .style('padding', '0.75rem 1rem')
      .style('font-size', '0.8rem')
      .style('pointer-events', 'none')
      .style('z-index', 1000)

    // Add interactivity on paths
    svg.selectAll('path').on('mouseover', function(event, d) {
      // Find closest point
      const mouse = d3.pointer(event, this)
      const threshVal = x.invert(mouse[0])
      const idx = thresholds.findIndex(t => t >= threshVal)
      const clampedIdx = Math.max(0, Math.min(idx, paths.length - 1))

      // Find which term this path belongs to
      // This is simplified - in practice you'd track which path is which
      tooltip.style('opacity', 1)
        .html(`<div class="tooltip-title">Threshold: ${threshVal.toFixed(4)}</div>`)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
    }).on('mouseout', () => tooltip.style('opacity', 0))
  }

  const renderSparsityProfile = () => {
    const container = sparsityRef.current
    if (!container) return

    d3.select(container).selectAll('*').remove()

    const vis = results?.visualization
    if (!vis?.sparsity_profile) return

    const { thresholds, n_terms } = vis.sparsity_profile

    const margin = { top: 20, right: 30, bottom: 40, left: 50 }
    const width = container.clientWidth - margin.left - margin.right
    const height = 150 - margin.top - margin.bottom

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleLog()
      .domain(d3.extent(thresholds))
      .range([0, width])

    const y = d3.scaleLinear()
      .domain([0, d3.max(n_terms) * 1.1])
      .nice()
      .range([height, 0])

    svg.append('g')
      .call(d3.axisLeft(y).ticks(4))
      .selectAll('text').attr('fill', 'var(--fg-secondary)').style('font-size', '10px')

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(4, '.0e'))
      .selectAll('text').attr('fill', 'var(--fg-secondary)').style('font-size', '10px')

    const line = d3.line()
      .x((d, i) => x(thresholds[i]))
      .y(d => y(d))
      .curve(d3.curveMonotoneX)

    svg.append('path')
      .datum(n_terms)
      .attr('fill', 'none')
      .attr('stroke', 'var(--accent-primary)')
      .attr('stroke-width', 2.5)
      .attr('d', line)

    // Current threshold
    svg.append('line')
      .attr('x1', x(config.threshold)).attr('x2', x(config.threshold))
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', 'var(--accent-tertiary)').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')

    // Points
    svg.selectAll('circle')
      .data(thresholds.map((t, i) => ({ t, n: n_terms[i] })))
      .enter()
      .append('circle')
      .attr('cx', d => x(d.t))
      .attr('cy', d => y(d.n))
      .attr('r', d => d.t === config.threshold ? 5 : 3)
      .attr('fill', d => d.t === config.threshold ? 'var(--accent-tertiary)' : 'var(--accent-primary)')
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        // Could trigger threshold change
      })
  }

  const buildLibrary = (X, polyOrder) => {
    const n = X.length, d = X[0].length
    const terms = [], termNames = [], termValues = []

    // Constant
    terms.push('constant'); termNames.push('1'); termValues.push(new Array(n).fill(1))
    // Linear
    for (let i = 0; i < d; i++) {
      terms.push(`x${i}`); termNames.push(`x${i+1}`); termValues.push(X.map(row => row[i]))
    }
    // Polynomial
    for (let order = 2; order <= polyOrder; order++) {
      const gen = (start, rem, cur) => {
        if (rem === 0) {
          const name = cur.map(idx => `x${idx+1}`).join('')
          const vals = X.map(row => cur.reduce((p, idx) => p * row[idx], 1))
          terms.push(cur.join(',')); termNames.push(name); termValues.push(vals)
          return
        }
        for (let i = start; i < d; i++) gen(i, rem - 1, [...cur, i])
      }
      gen(0, order, [])
    }
    // Trig
    for (let i = 0; i < d; i++) {
      terms.push(`sin(x${i})`); termNames.push(`sin(x${i+1})`); termValues.push(X.map(r => Math.sin(r[i])))
      terms.push(`cos(x${i})`); termNames.push(`cos(x${i+1})`); termValues.push(X.map(r => Math.cos(r[i])))
    }
    // Interactions
    if (d >= 2) {
      for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) if (i !== j) {
        terms.push(`x${i}*sin(x${j})`); termNames.push(`x${i+1}·sin(x${j+1})`); termValues.push(X.map(r => r[i] * Math.sin(r[j])))
        terms.push(`x${i}*cos(x${j})`); termNames.push(`x${i+1}·cos(x${j+1})`); termValues.push(X.map(r => r[i] * Math.cos(r[j])))
      }
    }
    return { terms, termNames, termValues }
  }

  const computeDerivatives = (data, method) => {
    const t = data.map(d => d.Year)
    const hare = data.map(d => d.Hare)
    const lynx = data.map(d => d.Lynx)
    const n = data.length
    const dhare = new Array(n).fill(0)
    const dlynx = new Array(n).fill(0)

    if (method === 'finite_diff') {
      for (let i = 1; i < n - 1; i++) {
        const dt = t[i+1] - t[i-1]
        dhare[i] = (hare[i+1] - hare[i-1]) / dt
        dlynx[i] = (lynx[i+1] - lynx[i-1]) / dt
      }
      dhare[0] = (hare[1] - hare[0]) / (t[1] - t[0])
      dlynx[0] = (lynx[1] - lynx[0]) / (t[1] - t[0])
      dhare[n-1] = (hare[n-1] - hare[n-2]) / (t[n-1] - t[n-2])
      dlynx[n-1] = (lynx[n-1] - lynx[n-2]) / (t[n-1] - t[n-2])
    } else {
      // Simplified Savitzky-Golay
      for (let i = 0; i < n; i++) {
        let sumH = 0, sumL = 0, count = 0
        for (let j = -2; j <= 2; j++) {
          const idx = i + j
          if (idx >= 0 && idx < n) {
            sumH += j * hare[idx] / 10
            sumL += j * lynx[idx] / 10
            count++
          }
        }
        if (count > 0) { dhare[i] = sumH; dlynx[i] = sumL }
      }
      dhare[0] = (hare[1] - hare[0]) / (t[1] - t[0])
      dlynx[0] = (lynx[1] - lynx[0]) / (t[1] - t[0])
    }
    return { dhare, dlynx }
  }

  if (!active) return null

  const equations = results?.model?.equationsRaw || results?.model?.equations_raw || []
  const metrics = results?.metrics || {}

  return (
    <div className="panel active" role="tabpanel" aria-label="Sparse Regression">
      <div className="card" style={{marginBottom: '1.5rem'}}>
        <div className="card-header">
          <div className="card-title">
            <Zap className="w-5 h-5" />
            Sparse Regression (STLSQ)
          </div>
          <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
            <select
              className="input"
              value={selectedEq}
              onChange={(e) => setSelectedEq(parseInt(e.target.value))}
              style={{width: 'auto', minWidth: '150px'}}
            >
              <option value={0}>dHare/dt</option>
              <option value={1}>dLynx/dt</option>
            </select>
            <label style={{display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem'}}>
              <input type="checkbox" checked={showPath} onChange={(e) => setShowPath(e.target.checked)} />
              Animate
            </label>
          </div>
        </div>

        <div style={{marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <label className="label" style={{marginBottom: 0}}>Threshold λ:</label>
            <input
              type="range"
              min="0.001"
              max="0.5"
              step="0.001"
              value={config.threshold}
              readOnly
              style={{width: '200px'}}
            />
            <span style={{fontFamily: 'monospace', color: 'var(--accent-primary)', minWidth: '60px'}}>
              {config.threshold.toFixed(3)}
            </span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <label className="label" style={{marginBottom: 0}}>Max Iterations:</label>
            <input type="number" className="input" value={config.maxIter} min={5} max={100} style={{width: '80px'}} readOnly />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <label className="label" style={{marginBottom: 0}}>Ridge α:</label>
            <input type="number" className="input" value={1e-3} step={1e-3} min={1e-6} max={1} style={{width: '100px'}} readOnly />
          </div>
        </div>

        <div className="chart-container" style={{height: '400px', position: 'relative'}}>
          <div ref={chartRef} style={{width: '100%', height: '100%'}} />
        </div>
      </div>

      {/* Sparsity Profile */}
      <div className="card" style={{marginBottom: '1.5rem'}}>
        <div className="card-header">
          <div className="card-title">
            <TrendingUp className="w-5 h-5" />
            Sparsity Profile - Active Terms vs Threshold
          </div>
        </div>
        <div className="chart-container" style={{height: '180px', position: 'relative'}}>
          <div ref={sparsityRef} style={{width: '100%', height: '100%'}} />
        </div>
      </div>

      {/* Current Model Coefficients */}
      <div className="card" style={{marginBottom: '1.5rem'}}>
        <div className="card-header">
          <div className="card-title">
            <Target className="w-5 h-5" />
            Discovered Model at λ = {config.threshold}
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
          {equations.map((eq, i) => (
            <div key={i} style={{padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'}}>
              <h4 style={{color: i === 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span style={{fontFamily: 'monospace'}}>d{['Hare', 'Lynx'][i]}/dt</span>
                <span className="badge badge-primary">{metrics[['Hare', 'Lynx'][i]]?.active_terms || 0} terms</span>
              </h4>
              <div className="equation-block" style={{fontSize: '1rem', whiteSpace: 'pre-wrap'}}>
                {eq}
              </div>
              <div style={{marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--fg-muted)'}}>
                R² = {metrics[['Hare', 'Lynx'][i]]?.R2?.toFixed(4) || 'N/A'} |
                AIC = {metrics[['Hare', 'Lynx'][i]]?.AIC?.toFixed(1) || 'N/A'} |
                BIC = {metrics[['Hare', 'Lynx'][i]]?.BIC?.toFixed(1) || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STLSQ Algorithm Explanation */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <SlidersHorizontal className="w-5 h-5" />
            STLSQ Algorithm: Sequential Thresholded Least Squares
          </div>
        </div>
        <div style={{fontSize: '0.85rem', color: 'var(--fg-secondary)', lineHeight: '1.8'}}>
          <h4 style={{color: 'var(--fg-primary)', marginBottom: '0.5rem'}}>Algorithm Steps:</h4>
          <ol style={{paddingLeft: '1.5rem', marginBottom: '1rem', lineHeight: '2'}}>
            <li><strong>Build Library Θ(x):</strong> Construct candidate functions from state variables</li>
            <li><strong>Compute Derivatives:</strong> Estimate dx/dt from data (Savitzky-Golay, spline, or finite diff)</li>
            <li><strong>Initial Ridge Regression:</strong> Solve (ΘᵀΘ + αI)ξ = Θᵀẋ for each equation</li>
            <li><strong>Threshold:</strong> Set coefficients with |ξᵢ| {'<'} λ to zero</li>
            <li><strong>Refit:</strong> Least squares on remaining active terms only</li>
            <li><strong>Iterate:</strong> Repeat threshold + refit until convergence (max {config.maxIter} iterations)</li>
          </ol>

          <h4 style={{color: 'var(--fg-primary)', marginBottom: '0.5rem'}}>Key Parameters:</h4>
          <ul style={{paddingLeft: '1.5rem', lineHeight: '2'}}>
            <li><strong>λ (threshold):</strong> Controls sparsity. Higher λ → fewer terms. Current: <code>{config.threshold}</code></li>
            <li><strong>α (ridge):</strong> Regularization for numerical stability. Default: 1e-3</li>
            <li><strong>Max Iterations:</strong> {config.maxIter}. Usually converges in 5-10 iterations.</li>
            <li><strong>Derivative Method:</strong> {config.derivativeMethod}. Savitzky-Golay recommended for noisy data.</li>
          </ul>

          <h4 style={{color: 'var(--fg-primary)', marginTop: '1rem', marginBottom: '0.5rem'}}>Coefficient Path Interpretation:</h4>
          <p>The plot shows how each coefficient evolves as λ increases from 10⁻³ to 1.</p>
          <ul style={{paddingLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '2'}}>
            <li><strong>Terms that go to zero early:</strong> Spurious correlations, noise</li>
            <li><strong>Terms that persist:</strong> True dynamical terms (e.g., x, xy for Lotka-Volterra)</li>
            <li><strong>Vertical line:</strong> Current threshold λ = {config.threshold}</li>
            <li><strong>Plateau regions:</strong> Stable coefficient estimates (good λ range)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default RegressionPanel