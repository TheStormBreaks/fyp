import React, { useRef, useEffect, useState } from 'react'
import { Download, Eye, Code, Table, Database, Info } from 'lucide-react'
import * as d3 from 'd3'
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

function DataPanel({ data, results, active, loading }) {
  const chartRef = useRef(null)
  const [viewMode, setViewMode] = useState('chart') // 'chart' | 'table'
  const [selectedFeatures, setSelectedFeatures] = useState(['Hare', 'Lynx'])

  // Render chart when active
  useEffect(() => {
    if (!active || !data || !chartRef.current) return
    renderChart()
  }, [active, data, viewMode, selectedFeatures])

  const renderChart = () => {
    const container = chartRef.current
    if (!container) return

    // Clear previous
    d3.select(container).selectAll('*').remove()

    const margin = { top: 30, right: 80, bottom: 60, left: 70 }
    const width = container.clientWidth - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Time scale
    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.Year))
      .range([0, width])

    // Y scale
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.Hare, d.Lynx)) * 1.1])
      .nice()
      .range([height, 0])

    // Color scale
    const colors = {
      Hare: '#22d3ee',
      Lynx: '#a855f7'
    }

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-dasharray', '2,2')

    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(-height).tickFormat(''))
      .selectAll('line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-dasharray', '2,2')

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(10))
      .selectAll('text')
      .attr('fill', 'var(--fg-secondary)')
      .style('font-size', '11px')

    svg.append('g')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .attr('fill', 'var(--fg-secondary)')
      .style('font-size', '11px')

    // Axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + 45)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--fg-secondary)')
      .style('font-size', '12px')
      .text('Year')

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--fg-secondary)')
      .style('font-size', '12px')
      .text('Population (thousands of pelts)')

    // Lines
    const line = d3.line()
      .x(d => x(d.Year))
      .y(d => y(d[selectedFeatures[0]]))
      .curve(d3.curveMonotoneX)

    selectedFeatures.forEach(feature => {
      const featureLine = d3.line()
        .x(d => x(d.Year))
        .y(d => y(d[feature]))
        .curve(d3.curveMonotoneX)

      // Area
      svg.append('path')
        .datum(data)
        .attr('fill', colors[feature])
        .attr('fill-opacity', 0.1)
        .attr('stroke', 'none')
        .attr('d', d3.area()
          .x(d => x(d.Year))
          .y0(height)
          .y1(d => y(d[feature]))
          .curve(d3.curveMonotoneX)
        )

      // Line
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', colors[feature])
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', featureLine)

      // Points
      svg.selectAll(`.point-${feature}`)
        .data(data)
        .enter()
        .append('circle')
        .attr('class', `point-${feature}`)
        .attr('cx', d => x(d.Year))
        .attr('cy', d => y(d[feature]))
        .attr('r', 3)
        .attr('fill', colors[feature])
        .attr('stroke', 'var(--bg-primary)')
        .attr('stroke-width', 1.5)
        .style('opacity', 0)
        .on('mouseover', function(event, d) {
          d3.select(this).style('opacity', 1).attr('r', 5)
          showTooltip(event, d, feature)
        })
        .on('mousemove', (event) => moveTooltip(event))
        .on('mouseout', function() {
          d3.select(this).style('opacity', 0).attr('r', 3)
          hideTooltip()
        })
    })

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 20}, 0)`)

    selectedFeatures.forEach((feature, i) => {
      const g = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`)
        .style('cursor', 'pointer')
        .on('click', () => toggleFeature(feature))

      g.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 6)
        .attr('fill', colors[feature])
        .attr('opacity', selectedFeatures.includes(feature) ? 1 : 0.3)

      g.append('text')
        .attr('x', 15)
        .attr('y', 4)
        .attr('fill', selectedFeatures.includes(feature) ? 'var(--fg-primary)' : 'var(--fg-muted)')
        .style('font-size', '12px')
        .style('font-weight', selectedFeatures.includes(feature) ? '600' : '400')
        .text(feature)
    })

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--fg-primary)')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .text('Hudson Bay Company Lynx-Hare Data (1845-1935)')

    // Tooltip functions
    const tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'var(--bg-secondary)')
      .style('border', '1px solid var(--border)')
      .style('border-radius', '8px')
      .style('padding', '0.75rem 1rem')
      .style('font-size', '0.85rem')
      .style('pointer-events', 'none')
      .style('z-index', 1000)
      .style('box-shadow', '0 8px 30px var(--shadow)')

    function showTooltip(event, d, feature) {
      tooltip.style('opacity', 1)
        .html(`
          <div style="color: ${colors[feature]}; font-weight: 600; margin-bottom: 0.5rem;">${feature}</div>
          <div>Year: <span style="font-family: monospace; color: var(--fg-primary);">${d.Year}</span></div>
          <div>Population: <span style="font-family: monospace; color: var(--fg-primary);">${d[feature].toFixed(1)}k pelts</span></div>
        `)
      moveTooltip(event)
    }

    function moveTooltip(event) {
      tooltip.style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
    }

    function hideTooltip() {
      tooltip.style('opacity', 0)
    }

    function toggleFeature(feature) {
      setSelectedFeatures(prev =>
        prev.includes(feature)
          ? prev.filter(f => f !== feature)
          : [...prev, feature]
      )
    }
  }

  // Export data as CSV
  const exportCSV = () => {
    if (!data) return
    const headers = Object.keys(data[0])
    const csv = [headers.join(',')]
    data.forEach(row => {
      csv.push(headers.map(h => row[h]).join(','))
    })
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lynx_hare_data.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!active) return null

  return (
    <div className="panel active" role="tabpanel" aria-label="Data Exploration">
      <div className="card" style={{marginBottom: '1.5rem'}}>
        <div className="card-header">
          <div className="card-title">
            <Database className="w-5 h-5" />
            Data Source: Hudson Bay Company Records
          </div>
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV} title="Download CSV">
              <Download className="w-4 h-4" />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewMode('chart')}
              style={{borderRadius: '6px 0 0 6px', borderRight: 'none'}}
              aria-pressed={viewMode === 'chart'}>
              <Eye className="w-4 h-4" />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewMode('table')}
              style={{borderRadius: '0 6px 6px 0'}}
              aria-pressed={viewMode === 'table'}>
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div style={{marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'}}>
          <h4 style={{marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <span style={{color: '#22d3ee'}}><Info className="w-4 h-4" /></span>
            About This Dataset
          </h4>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', fontSize: '0.85rem', color: 'var(--fg-secondary)'}}>
            <p><strong>Source:</strong> Hudson Bay Company fur trading records (1845-1935)</p>
            <p><strong>Variables:</strong> Annual hare and lynx pelts (thousands)</p>
            <p><strong>Classic System:</strong> Lotka-Volterra predator-prey dynamics</p>
            <p><strong>Reference:</strong> Elton & Nicholson (1942), Brunton et al. (2016)</p>
          </div>
        </div>

        {viewMode === 'chart' ? (
          <div className="chart-container" style={{height: '400px', position: 'relative'}}>
            <div ref={chartRef} style={{width: '100%', height: '100%'}} />
          </div>
        ) : (
          <div className="table-container" style={{maxHeight: '400px', overflow: 'auto'}}>
            <table className="table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Hare (k pelts)</th>
                  <th>Lynx (k pelts)</th>
                </tr>
              </thead>
              <tbody>
                {data?.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    <td><code>{row.Year}</code></td>
                    <td>{row.Hare.toFixed(1)}</td>
                    <td>{row.Lynx.toFixed(1)}</td>
                  </tr>
                ))}
                {data && data.length > 50 && (
                  <tr>
                    <td colSpan={3} style={{textAlign: 'center', color: 'var(--fg-muted)', fontStyle: 'italic'}}>
                      ... and {data.length - 50} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={{marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'}}>
          <h4 style={{marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <span style={{color: '#f59e0b'}}><Code className="w-4 h-4" /></span>
            Mathematical Context
          </h4>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem'}}>
            <div>
              <p style={{fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '0.5rem'}}>
                The Lotka-Volterra predator-prey model:
              </p>
              <div className="equation-block" style={{fontSize: '1rem'}}>
                <KatexEquation latex="\\frac{dH}{dt} = \\alpha H - \\beta H L" />
                <br />
                <KatexEquation latex="\\frac{dL}{dt} = \\delta H L - \\gamma L" />
              </div>
              <p style={{fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.5rem'}}>
                H = Hare (prey), L = Lynx (predator)<br/>
                α (alpha) = prey growth, β (beta) = predation rate<br/>
                δ (delta) = predator growth from prey, γ (gamma) = predator death
              </p>
            </div>
            <div>
              <p style={{fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '0.5rem'}}>
                Expected discovered structure:
              </p>
              <ul style={{fontSize: '0.85rem', color: 'var(--fg-secondary)', paddingLeft: '1.5rem', lineHeight: '2'}}>
                <li>Linear term in H (prey growth)</li>
                <li>Interaction term H·L (predation)</li>
                <li>Interaction term H·L (predator growth)</li>
                <li>Linear term in L (predator death)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataPanel