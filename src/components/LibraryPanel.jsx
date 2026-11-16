import React, { useRef, useEffect, useState } from 'react'
import { Search, ChevronDown, ChevronUp, Filter, X, Check, Minus, Plus } from 'lucide-react'
import * as d3 from 'd3'

function LibraryPanel({ data, results, config, active, loading }) {
  const chartRef = useRef(null)
  const [expandedTerms, setExpandedTerms] = useState(new Set())
  const [filterTerm, setFilterTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState('all')

  // Build library on client side for visualization
  const buildLibrary = (X, polyOrder, includeTrig = true, includeInteraction = true) => {
    const n = X.length
    const d = X[0].length
    const terms = []
    const termNames = []
    const termValues = []

    // Constant
    terms.push('constant')
    termNames.push('1')
    termValues.push(new Array(n).fill(1))

    // Linear
    for (let i = 0; i < d; i++) {
      terms.push(`x${i}`)
      termNames.push(`x${i+1}`)
      termValues.push(X.map(row => row[i]))
    }

    // Polynomial
    for (let order = 2; order <= polyOrder; order++) {
      const generateCombos = (start, remaining, current) => {
        if (remaining === 0) {
          const name = current.map(idx => `x${idx+1}`).join('')
          const vals = X.map(row => current.reduce((prod, idx) => prod * row[idx], 1))
          terms.push(current.join(','))
          termNames.push(name)
          termValues.push(vals)
          return
        }
        for (let i = start; i < d; i++) {
          generateCombos(i, remaining - 1, [...current, i])
        }
      }
      generateCombos(0, order, [])
    }

    // Trigonometric
    if (includeTrig) {
      for (let i = 0; i < d; i++) {
        terms.push(`sin(x${i})`)
        termNames.push(`sin(x${i+1})`)
        termValues.push(X.map(row => Math.sin(row[i])))
        terms.push(`cos(x${i})`)
        termNames.push(`cos(x${i+1})`)
        termValues.push(X.map(row => Math.cos(row[i])))
      }
    }

    // Interactions
    if (includeInteraction && d >= 2) {
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          if (i !== j) {
            terms.push(`x${i}*sin(x${j})`)
            termNames.push(`x${i+1}·sin(x${j+1})`)
            termValues.push(X.map(row => row[i] * Math.sin(row[j])))
            terms.push(`x${i}*cos(x${j})`)
            termNames.push(`x${i+1}·cos(x${j+1})`)
            termValues.push(X.map(row => row[i] * Math.cos(row[j])))
          }
        }
      }
    }

    return { terms, termNames, termValues }
  }

  // Get polynomial order from term
  const getTermOrder = (term) => {
    if (term === 'constant') return 0
    if (term.startsWith('sin') || term.startsWith('cos')) return 1
    if (term.includes('*')) return 2
    return term.split('').filter(c => c === 'x').length
  }

  useEffect(() => {
    if (!active || !data || !chartRef.current) return
    renderLibraryMatrix()
  }, [active, data, config.polyOrder, filterTerm, selectedOrder])

  const renderLibraryMatrix = () => {
    const container = chartRef.current
    if (!container) return

    d3.select(container).selectAll('*').remove()

    const X = data.map(d => [d.Hare, d.Lynx])
    const { terms, termNames, termValues } = buildLibrary(X, config.polyOrder)

    // Get coefficients from results
    const coefficients = results?.model?.coefficients || []
    const coefHare = coefficients[0] || []
    const coefLynx = coefficients[1] || []

    const margin = { top: 40, right: 150, bottom: 60, left: 200 }
    const cellSize = 18
    const width = Math.max(600, termNames.length * cellSize + margin.left + margin.right)
    const height = Math.max(400, terms.length * cellSize + margin.top + margin.bottom)

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Color scale for coefficient magnitude
    const maxCoef = d3.max([...coefHare, ...coefLynx].map(Math.abs)) || 1
    const colorScale = d3.scaleSequential()
      .domain([0, maxCoef])
      .interpolator(d3.interpolateViridis)

    // Filter terms
    const filteredIndices = terms
      .map((_, i) => i)
      .filter(i => {
        const name = termNames[i].toLowerCase()
        const order = getTermOrder(terms[i])
        const matchesFilter = name.includes(filterTerm.toLowerCase())
        const matchesOrder = selectedOrder === 'all' || order === parseInt(selectedOrder)
        return matchesFilter && matchesOrder
      })

    // Y scale
    const y = d3.scaleBand()
      .domain(filteredIndices)
      .range([0, filteredIndices.length * cellSize])
      .padding(0.1)

    // X scale for equations (2 equations)
    const x = d3.scaleBand()
      .domain(['dHare/dt', 'dLynx/dt'])
      .range([0, 2 * cellSize * 3])
      .padding(0.2)

    // Draw cells
    const cell = svg.selectAll('.library-cell')
      .data(filteredIndices.flatMap(i => [
        { termIdx: i, eq: 'dHare/dt', coef: coefHare[i] || 0 },
        { termIdx: i, eq: 'dLynx/dt', coef: coefLynx[i] || 0 }
      ]))
      .enter()
      .append('g')
      .attr('class', 'library-cell')
      .attr('transform', d => `translate(${x(d.eq)}, ${y(d.termIdx)})`)

    cell.append('rect')
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', d => d.coef === 0 ? 'var(--border)' : colorScale(Math.abs(d.coef)))
      .attr('stroke', d => Math.abs(d.coef) > 1e-10 ? 'var(--accent-primary)' : 'transparent')
      .attr('stroke-width', d => Math.abs(d.coef) > 1e-10 ? 2 : 0)
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke', 'var(--fg-primary)').attr('stroke-width', 2)
        showTooltip(event, d)
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke', Math.abs(d.coef) > 1e-10 ? 'var(--accent-primary)' : 'transparent')
          .attr('stroke-width', Math.abs(d.coef) > 1e-10 ? 2 : 0)
        hideTooltip()
      })

    cell.append('text')
      .attr('x', x.bandwidth() / 2)
      .attr('y', y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', d => Math.abs(d.coef) > maxCoef * 0.5 ? 'var(--bg-primary)' : 'var(--fg-primary)')
      .style('font-size', '10px')
      .style('font-family', 'monospace')
      .text(d => d.coef === 0 ? '0' : d.coef.toFixed(3))

    // Y axis - term names
    svg.append('g')
      .call(d3.axisLeft(y).tickFormat(i => termNames[i]).tickSize(0))
      .selectAll('text')
      .attr('fill', 'var(--fg-secondary)')
      .style('font-size', '11px')
      .style('font-family', 'monospace')

    // X axis - equations
    svg.append('g')
      .attr('transform', `translate(0, ${filteredIndices.length * cellSize})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll('text')
      .attr('fill', 'var(--accent-primary)')
      .style('font-size', '11px')
      .style('font-weight', '600')

    // Title
    svg.append('text')
      .attr('x', width / 2 - margin.left)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--fg-primary)')
      .style('font-size', '13px')
      .style('font-weight', '600')
      .text(`Feature Library Θ(x) - ${terms.length} Candidate Terms`)

    // Colorbar
    const colorbarWidth = 120
    const colorbarHeight = 10
    const colorbarX = width - margin.left - margin.right - colorbarWidth
    const colorbarY = -30

    const defs = svg.append('defs')
    const gradient = defs.append('linearGradient').attr('id', 'colorbar-gradient')
    gradient.selectAll('stop')
      .data(d3.range(0, 1.01, 0.1))
      .enter()
      .append('stop')
      .attr('offset', d => `${d * 100}%`)
      .attr('stop-color', d => colorScale(d * maxCoef))

    svg.append('rect')
      .attr('x', colorbarX)
      .attr('y', colorbarY)
      .attr('width', colorbarWidth)
      .attr('height', colorbarHeight)
      .style('fill', 'url(#colorbar-gradient)')

    svg.append('text')
      .attr('x', colorbarX)
      .attr('y', colorbarY - 5)
      .attr('fill', 'var(--fg-secondary)')
      .style('font-size', '10px')
      .text('|Coefficient|')

    svg.append('text')
      .attr('x', colorbarX)
      .attr('y', colorbarY + colorbarHeight + 15)
      .attr('fill', 'var(--fg-muted)')
      .style('font-size', '9px')
      .text('0')

    svg.append('text')
      .attr('x', colorbarX + colorbarWidth - 20)
      .attr('y', colorbarY + colorbarHeight + 15)
      .attr('fill', 'var(--fg-muted)')
      .style('font-size', '9px')
      .attr('text-anchor', 'end')
      .text(maxCoef.toFixed(2))

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

    function showTooltip(event, d) {
      const termIdx = d.termIdx
      tooltip.style('opacity', 1)
        .html(`
          <div class="tooltip-title">Term: ${termNames[termIdx]}</div>
          <div class="tooltip-row"><span class="tooltip-label">Library Index:</span><span class="tooltip-value">${terms[termIdx]}</span></div>
          <div class="tooltip-row"><span class="tooltip-label">Equation:</span><span class="tooltip-value">${d.eq}</span></div>
          <div class="tooltip-row"><span class="tooltip-label">Coefficient:</span><span class="tooltip-value" style="color: ${d.coef === 0 ? 'var(--fg-muted)' : 'var(--accent-primary)'}">${d.coef === 0 ? '0 (inactive)' : d.coef.toFixed(6)}</span></div>
          <div class="tooltip-row"><span class="tooltip-label">Status:</span><span class="tooltip-value" style="color: ${Math.abs(d.coef) > 1e-10 ? 'var(--success)' : 'var(--fg-muted)'}">${Math.abs(d.coef) > 1e-10 ? 'ACTIVE' : 'THRESHOLDED'}</span></div>
        `)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
    }

    function hideTooltip() {
      tooltip.style('opacity', 0)
    }
  }

  if (!active) return null

  const X = data?.map(d => [d.Hare, d.Lynx]) || []
  const { terms, termNames } = buildLibrary(X, config.polyOrder)
  const coefficients = results?.model?.coefficients || []
  const activeCount = coefficients.flat().filter(c => Math.abs(c) > 1e-10).length

  return (
    <div className="panel active" role="tabpanel" aria-label="Feature Library">
      <div className="card" style={{marginBottom: '1.5rem'}}>
        <div className="card-header">
          <div className="card-title">
            <Search className="w-5 h-5" />
            Feature Library Construction Θ(x)
          </div>
          <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
            <span className="badge badge-primary">{terms.length} Terms</span>
            <span className="badge badge-success">{activeCount} Active</span>
          </div>
        </div>

        <div style={{marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center'}}>
          <div style={{flex: 1, minWidth: '200px'}}>
            <label className="label" style={{marginBottom: '0.25rem', display: 'block'}}>Filter Terms</label>
            <input
              type="text"
              className="input"
              placeholder="Search terms (e.g., sin, x1, x1x2)..."
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
            />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <label className="label" style={{marginBottom: 0}}>Polynomial Order:</label>
            <select
              className="input"
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value)}
              style={{width: 'auto', minWidth: '120px'}}
            >
              <option value="all">All Orders</option>
              <option value="0">Order 0 (Constant)</option>
              <option value="1">Order 1 (Linear)</option>
              <option value="2">Order 2 (Quadratic)</option>
              <option value="3">Order 3 (Cubic)</option>
              <option value="4">Order 4 (Quartic)</option>
              <option value="5">Order 5 (Quintic)</option>
              <option value="trig">Trigonometric</option>
              <option value="interaction">Interactions</option>
            </select>
          </div>
        </div>

        <div className="chart-container" style={{height: '500px', position: 'relative', minHeight: '400px'}}>
          <div ref={chartRef} style={{width: '100%', height: '100%'}} />
        </div>
      </div>

      {/* Library Terms Table */}
      <div className="card" style={{marginBottom: '1.5rem'}}>
        <div className="card-header">
          <div className="card-title">
            <Filter className="w-5 h-5" />
            Candidate Function Library Details
          </div>
        </div>
        <div className="table-container" style={{maxHeight: '300px'}}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Term</th>
                <th>Mathematical Form</th>
                <th>Order</th>
                <th>Type</th>
                <th>dHare/dt Coef</th>
                <th>dLynx/dt Coef</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term, i) => {
                const coefH = coefficients[0]?.[i] || 0
                const coefL = coefficients[1]?.[i] || 0
                const isActive = Math.abs(coefH) > 1e-10 || Math.abs(coefL) > 1e-10
                const order = getTermOrder(term)
                let type = 'Polynomial'
                if (term === 'constant') type = 'Constant'
                else if (term.startsWith('sin') || term.startsWith('cos')) type = 'Trigonometric'
                else if (term.includes('*')) type = 'Interaction'
                else if (order === 1) type = 'Linear'

                const matchesFilter = termNames[i].toLowerCase().includes(filterTerm.toLowerCase())
                const matchesOrder = selectedOrder === 'all' ||
                  (selectedOrder === 'trig' && type === 'Trigonometric') ||
                  (selectedOrder === 'interaction' && type === 'Interaction') ||
                  order === parseInt(selectedOrder)

                if (!matchesFilter || !matchesOrder) return null

                return (
                  <tr key={i} style={{opacity: isActive ? 1 : 0.6}}>
                    <td><code>{i}</code></td>
                    <td><code>{term}</code></td>
                    <td><code>{termNames[i]}</code></td>
                    <td><span className="badge badge-neutral">{order}</span></td>
                    <td><span className="badge badge-primary">{type}</span></td>
                    <td style={{fontFamily: 'monospace', color: Math.abs(coefH) > 1e-10 ? 'var(--accent-primary)' : 'var(--fg-muted)'}}>
                      {coefH === 0 ? '0' : coefH.toFixed(4)}
                    </td>
                    <td style={{fontFamily: 'monospace', color: Math.abs(coefL) > 1e-10 ? 'var(--accent-secondary)' : 'var(--fg-muted)'}}>
                      {coefL === 0 ? '0' : coefL.toFixed(4)}
                    </td>
                    <td>
                      <span className={isActive ? 'badge badge-success' : 'badge badge-neutral'}>
                        {isActive ? 'Active' : 'Thresholded'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mathematical Explanation */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Info className="w-5 h-5" />
            Library Construction Mathematics
          </div>
        </div>
        <div style={{fontSize: '0.85rem', color: 'var(--fg-secondary)', lineHeight: '1.8'}}>
          <p>The SINDy library Θ(x) constructs candidate functions from the state variables:</p>

          <div className="equation-block" style={{margin: '1rem 0'}}>
            Θ(x) = [ 1, x₁, x₂, ..., x₁², x₁x₂, x₂², ..., x₁³, x₁²x₂, x₁x₂², x₂³, ..., sin(x₁), cos(x₁), sin(x₂), cos(x₂), ..., x₁sin(x₂), x₁cos(x₂), ... ]
          </div>

          <h4 style={{color: 'var(--fg-primary)', marginTop: '1rem', marginBottom: '0.5rem'}}>For Lotka-Volterra (2D system):</h4>
          <ul style={{paddingLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '2'}}>
            <li><strong>Constant:</strong> 1 (1 term)</li>
            <li><strong>Linear:</strong> x₁, x₂ (2 terms)</li>
            <li><strong>Quadratic:</strong> x₁², x₁x₂, x₂² (3 terms)</li>
            <li><strong>Cubic:</strong> x₁³, x₁²x₂, x₁x₂², x₂³ (4 terms)</li>
            <li><strong>Trigonometric:</strong> sin(x₁), cos(x₁), sin(x₂), cos(x₂) (4 terms)</li>
            <li><strong>Interactions:</strong> x₁sin(x₂), x₁cos(x₂), x₂sin(x₁), x₂cos(x₁) (4 terms)</li>
          </ul>
          <p style={{marginTop: '0.5rem'}}>Total for poly_order=3: <strong>{terms.length} candidate terms</strong></p>

          <h4 style={{color: 'var(--fg-primary)', marginTop: '1rem', marginBottom: '0.5rem'}}>The SINDy Ansatz:</h4>
          <div className="equation-block" style={{margin: '1rem 0'}}>
            dx/dt = f(x) = Θ(x) · Ξ
          </div>
          <p>Where Ξ is a <strong>sparse</strong> coefficient matrix. The sparsity-promoting regression (STLSQ) discovers which terms are truly active in the dynamics.</p>
        </div>
      </div>
    </div>
  )
}

export default LibraryPanel