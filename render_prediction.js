const renderPrediction = () => {
    const container = predictionTrajectoryRef.current
    if (!container) return

    d3.select(container).selectAll('*').remove()

    const margin = { top: 30, right: 50, bottom: 60, left: 70 }
    const width = container.clientWidth - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Get prediction data from results
    const predData = results?.prediction || {}
    const t_pred = predData.t_pred || []
    const X_pred = predData.X_pred || []
    const t_test = results?.data?.t_test || []
    const X_test = results?.data?.X_test || []
    const t_train = results?.data?.t_train || []
    const X_train = results?.data?.X_train || []

    // All observed data
    const t_all = data.map(d => d.Year)
    const hare_all = data.map(d => d.Hare)
    const lynx_all = data.map(d => d.Lynx)

    // Scales
    const xScale = d3.scaleLinear().domain(d3.extent(t_all)).range([0, width])
    const yMax = d3.max([
      ...hare_all,
      ...lynx_all,
      ...(X_pred.flat() || []),
      ...(X_test.flat() || [])
    ])
    const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).nice().range([height, 0])

    // Grid
    svg.append('g')
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
      .selectAll('line').attr('stroke', 'var(--border)').attr('stroke-dasharray', '2,2')
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(d3.format('d')).ticks(10))
      .selectAll('line').attr('stroke', 'var(--border)').attr('stroke-dasharray', '2,2')

    // Axes
    svg.append('g').call(d3.axisLeft(yScale).ticks(6))
      .selectAll('text').attr('fill', 'var(--fg-secondary)').style('font-size', '11px')
    svg.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')).ticks(10))
      .selectAll('text').attr('fill', 'var(--fg-secondary)').style('font-size', '11px')

    // Train/test split line
    if (t_train.length > 0 && t_test.length > 0) {
      const splitX = xScale(t_train[t_train.length - 1])
      svg.append('line')
        .attr('x1', splitX).attr('x2', splitX)
        .attr('y1', 0).attr('y2', height)
        .attr('stroke', 'var(--fg-muted)').attr('stroke-dasharray', '6,4').attr('stroke-width', 1.5)

      svg.append('text')
        .attr('x', splitX - 40).attr('y', 15)
        .attr('fill', 'var(--fg-muted)').style('font-size', '10px').style('font-weight', '600')
        .text('Train')
      svg.append('text')
        .attr('x', splitX + 10).attr('y', 15)
        .attr('fill', 'var(--fg-muted)').style('font-size', '10px').style('font-weight', '600')
        .text('Test')
    }

    // Line generators
    const line = d3.line()
      .x((d, i) => xScale(d.t[i]))
      .y(d => yScale(d.y))
      .curve(d3.curveMonotoneX)

    // Observed full data (dashed)
    const observedHare = { t: t_all, y: hare_all }
    const observedLynx = { t: t_all, y: lynx_all }
    svg.append('path')
      .datum(observedHare)
      .attr('fill', 'none').attr('stroke', 'var(--accent-primary)').attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2').attr('d', line).attr('opacity', 0.6)
    svg.append('path')
      .datum(observedLynx)
      .attr('fill', 'none').attr('stroke', 'var(--accent-secondary)').attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2').attr('d', line).attr('opacity', 0.6)

    // Observed points (train)
    if (X_train.length > 0) {
      svg.selectAll('.train-hare').data(X_train).enter().append('circle')
        .attr('cx', (d, i) => xScale(t_train[i]))
        .attr('cy', d => yScale(d[0]))
        .attr('r', 3.5).attr('fill', 'var(--accent-primary)').attr('stroke', 'var(--bg-primary)').attr('stroke-width', 1.5)
      svg.selectAll('.train-lynx').data(X_train).enter().append('circle')
        .attr('cx', (d, i) => xScale(t_train[i]))
        .attr('cy', d => yScale(d[1]))
        .attr('r', 3.5).attr('fill', 'var(--accent-secondary)').attr('stroke', 'var(--bg-primary)').attr('stroke-width', 1.5)
    }

    // Observed points (test) - highlighted
    if (X_test.length > 0) {
      svg.selectAll('.test-hare').data(X_test).enter().append('circle')
        .attr('cx', (d, i) => xScale(t_test[i]))
        .attr('cy', d => yScale(d[0]))
        .attr('r', 5).attr('fill', 'none').attr('stroke', 'var(--accent-primary)').attr('stroke-width', 2.5)
      svg.selectAll('.test-lynx').data(X_test).enter().append('circle')
        .attr('cx', (d, i) => xScale(t_test[i]))
        .attr('cy', d => yScale(d[1]))
        .attr('r', 5).attr('fill', 'none').attr('stroke', 'var(--accent-secondary)').attr('stroke-width', 2.5)
    }

    // Integrated prediction trajectory (solid lines)
    if (X_pred.length > 0 && t_pred.length > 0) {
      const predHare = { t: t_pred, y: X_pred.map(d => d[0]) }
      const predLynx = { t: t_pred, y: X_pred.map(d => d[1]) }

      svg.append('path')
        .datum(predHare)
        .attr('fill', 'none').attr('stroke', 'var(--accent-primary)').attr('stroke-width', 3)
        .attr('d', line)
      svg.append('path')
        .datum(predLynx)
        .attr('fill', 'none').attr('stroke', 'var(--accent-secondary)').attr('stroke-width', 3)
        .attr('d', line)

      // Prediction points (sampled)
      const step = Math.max(1, Math.floor(t_pred.length / 20))
      svg.selectAll('.pred-hare').data(t_pred.filter((_, i) => i % step === 0)).enter().append('circle')
        .attr('cx', (d, i) => xScale(d))
        .attr('cy', (d, i) => yScale(X_pred[i * step][0]))
        .attr('r', 3).attr('fill', 'var(--accent-primary)').attr('opacity', 0.8)
      svg.selectAll('.pred-lynx').data(t_pred.filter((_, i) => i % step === 0)).enter().append('circle')
        .attr('cx', (d, i) => xScale(d))
        .attr('cy', (d, i) => yScale(X_pred[i * step][1]))
        .attr('r', 3).attr('fill', 'var(--accent-secondary)').attr('opacity', 0.8)
    }

    // Labels
    svg.append('text').attr('x', width/2).attr('y', height + 45)
      .attr('text-anchor', 'middle').attr('fill', 'var(--fg-secondary)').style('font-size', '12px').text('Year')
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height/2).attr('y', -50)
      .attr('text-anchor', 'middle').attr('fill', 'var(--fg-secondary)').style('font-size', '12px').text('Population (k pelts)')

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${width - 180}, 20)`)
    const items = [
      { label: 'Hare (observed)', color: 'var(--accent-primary)', dash: '4,2', r: 3.5, fill: 'var(--accent-primary)' },
      { label: 'Lynx (observed)', color: 'var(--accent-secondary)', dash: '4,2', r: 3.5, fill: 'var(--accent-secondary)' },
      { label: 'Hare (test)', color: 'var(--accent-primary)', dash: null, r: 5, fill: 'none', strokeWidth: 2.5 },
      { label: 'Lynx (test)', color: 'var(--accent-secondary)', dash: null, r: 5, fill: 'none', strokeWidth: 2.5 },
      { label: 'Hare (predicted)', color: 'var(--accent-primary)', dash: null, r: 3, fill: 'var(--accent-primary)' },
      { label: 'Lynx (predicted)', color: 'var(--accent-secondary)', dash: null, r: 3, fill: 'var(--accent-secondary)' }
    ]
    items.forEach((item, i) => {
      const g = legend.append('g').attr('transform', `translate(0, ${i * 22})`)
      g.append('line')
        .attr('x1', 0).attr('x2', 25)
        .attr('y1', 0).attr('y2', 0)
        .attr('stroke', item.color)
        .attr('stroke-width', item.strokeWidth || 2)
        .attr('stroke-dasharray', item.dash || 'none')
      g.append('circle')
        .attr('cx', 12.5).attr('cy', 0)
        .attr('r', item.r)
        .attr('fill', item.fill)
        .attr('stroke', item.fill === 'none' ? item.color : 'var(--bg-primary)')
        .attr('stroke-width', item.strokeWidth || 1.5)
      g.append('text').attr('x', 32).attr('y', 4).attr('fill', 'var(--fg-secondary)').style('font-size', '10px').text(item.label)
    })

    // Metrics display
    const trajMetrics = predData.trajectory_metrics || {}
    if (Object.keys(trajMetrics).length > 0) {
      const hareMetrics = trajMetrics.feature_0 || {}
      const lynxMetrics = trajMetrics.feature_1 || {}
      const overall = trajMetrics.overall || {}

      let metricY = height - 100
      svg.append('text')
        .attr('x', width - 10).attr('y', metricY)
        .attr('text-anchor', 'end').attr('fill', 'var(--fg-primary)')
        .style('font-size', '11px').style('font-weight', '600')
        .text('Trajectory Metrics (Test Set):')

      metricY += 18
      svg.append('text')
        .attr('x', width - 10).attr('y', metricY)
        .attr('text-anchor', 'end').attr('fill', 'var(--fg-secondary)')
        .style('font-size', '10px')
        .text(`Overall R²: ${overall.trajectory_R2?.toFixed(3) || 'N/A'} | RMSE: ${overall.trajectory_RMSE?.toFixed(2) || 'N/A'}`)

      metricY += 16
      svg.append('text')
        .attr('x', width - 10).attr('y', metricY)
        .attr('text-anchor', 'end').attr('fill', 'var(--accent-primary)')
        .style('font-size', '10px')
        .text(`Hare R²: ${hareMetrics.trajectory_R2?.toFixed(3) || 'N/A'} | RMSE: ${hareMetrics.trajectory_RMSE?.toFixed(2) || 'N/A'}`)

      metricY += 16
      svg.append('text')
        .attr('x', width - 10).attr('y', metricY)
        .attr('text-anchor', 'end').attr('fill', 'var(--accent-secondary)')
        .style('font-size', '10px')
        .text(`Lynx R²: ${lynxMetrics.trajectory_R2?.toFixed(3) || 'N/A'} | RMSE: ${lynxMetrics.trajectory_RMSE?.toFixed(2) || 'N/A'}`)
    }

    svg.append('text').attr('x', width/2).attr('y', -10)
      .attr('text-anchor', 'middle').attr('fill', 'var(--fg-primary)').style('font-size', '13px').style('font-weight', '600')
      .text('ODE Trajectory Prediction vs Test Data')
  }