import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Play, Pause, RefreshCw, Download, Upload,
  Brain, Database, Zap, Search, Filter,
  ChevronDown, ChevronUp, Settings, Info,
  Link2, Github, ExternalLink, BookOpen
} from 'lucide-react'
import Header from './components/Header'
import DataPanel from './components/DataPanel'
import PreprocessingPanel from './components/PreprocessingPanel'
import LibraryPanel from './components/LibraryPanel'
import RegressionPanel from './components/RegressionPanel'
import ModelSelectionPanel from './components/ModelSelectionPanel'
import ResultsPanel from './components/ResultsPanel'
import MethodologyPanel from './components/MethodologyPanel'
import EquationDisplay from './components/EquationDisplay'
import Footer from './components/Footer'
import { runSINDyAnalysis } from './algorithms/sindy'
import { loadLynxHareData } from './utils/dataLoader'

function App() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [config, setConfig] = useState({
    threshold: 0.05,
    polyOrder: 3,
    derivativeMethod: 'savgol',
    maxIter: 20,
    normalizeData: true
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showConfig, setShowConfig] = useState(false)

  const steps = [
    { id: 'methodology', label: 'Framework Overview', icon: BookOpen, desc: 'System design, objectives, SDG alignment, methodology' },
    { id: 'data', label: 'Data Ingestion', icon: Database, desc: 'Time-series & spatiotemporal datasets' },
    { id: 'preprocessing', label: 'Preprocessing & Derivative Consensus', icon: Filter, desc: 'Multi-method differentiation (FD, SG, Splines) + normalization' },
    { id: 'library', label: 'Feature Library & Coherence', icon: Search, desc: 'Polynomials, trigonometric, interactions + Gram-Schmidt (μ>0.7)' },
    { id: 'regression', label: 'Sparse & Symbolic Discovery', icon: Zap, desc: 'STLSQ + PySR fallback across log-spaced λ grid' },
    { id: 'selection', label: 'Multi-Criteria Model Selection', icon: Brain, desc: 'AIC, BIC, CV, Pareto knee, Bootstrap stability (π>0.9)' },
    { id: 'results', label: 'Dynamical Validation & Equations', icon: Link2, desc: 'RK4 integration, parameter estimation, uncertainty quantification' }
  ]

  // Load initial data
  useEffect(() => {
    const initData = async () => {
      setLoading(true)
      try {
        const loadedData = await loadLynxHareData()
        setData(loadedData)
        // Run initial analysis
        const results = await runSINDyAnalysis(loadedData, ['Hare', 'Lynx'], config)
        setAnalysisResults(results)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [])

  // Re-run analysis when config changes
  const runAnalysis = useCallback(async () => {
    if (!data) return
    setLoading(true)
    setError(null)
    try {
      const results = await runSINDyAnalysis(data, ['Hare', 'Lynx'], config)
      setAnalysisResults(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [data, config])

  useEffect(() => {
    if (data && !loading) {
      const timer = setTimeout(runAnalysis, 100)
      return () => clearTimeout(timer)
    }
  }, [config, data, loading, runAnalysis])

  // Auto-play through steps
  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          setIsAutoPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleStepClick = (index) => {
    setCurrentStep(index)
    setIsAutoPlaying(false)
  }

  const handleAutoPlay = () => {
    setCurrentStep(0)
    setIsAutoPlaying(true)
  }

  const handleReset = () => {
    setConfig({
      threshold: 0.05,
      polyOrder: 3,
      derivativeMethod: 'savgol',
      maxIter: 20,
      normalizeData: true
    })
    setCurrentStep(0)
    setIsAutoPlaying(false)
  }

  return (
    <div className="app">
      <Header
        config={config}
        onConfigChange={handleConfigChange}
        showConfig={showConfig}
        setShowConfig={setShowConfig}
        loading={loading}
        onRun={runAnalysis}
        onReset={handleReset}
      />

      <main className="main-content">
        <div className="container">
          {/* Progress Steps */}
          <div className="steps-container card no-print" role="navigation" aria-label="Analysis pipeline steps">
            <div className="steps">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  className={`step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
                  onClick={() => handleStepClick(index)}
                  aria-current={index === currentStep ? 'step' : undefined}
                  disabled={loading}
                  title={step.desc}
                >
                  <div className="step-circle">
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <span className="step-label">{step.label}</span>
                  {step.desc && <span className="step-desc">{step.desc}</span>}
                </button>
              ))}
            </div>
            <div className="steps-controls" style={{display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem'}}>
              <button
                className="btn btn-secondary"
                onClick={handleAutoPlay}
                disabled={loading || isAutoPlaying}
              >
                <Play className="w-4 h-4" /> Auto Play
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setCurrentStep(0)}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="card animate-slide-up" style={{borderColor: 'var(--error)', marginBottom: '1.5rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--error)'}}>
                <span style={{fontSize: '1.25rem'}}>⚠</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Panels - only render active panel for performance */}
          <div className="panels" style={{minHeight: '500px'}}>
            <MethodologyPanel
              active={currentStep === 0}
              loading={loading}
            />
            <DataPanel
              data={data}
              results={analysisResults}
              active={currentStep === 1}
              loading={loading}
            />
            <PreprocessingPanel
              data={data}
              results={analysisResults}
              active={currentStep === 2}
              loading={loading}
            />
            <LibraryPanel
              data={data}
              results={analysisResults}
              config={config}
              active={currentStep === 3}
              loading={loading}
            />
            <RegressionPanel
              data={data}
              results={analysisResults}
              config={config}
              active={currentStep === 4}
              loading={loading}
            />
            <ModelSelectionPanel
              data={data}
              results={analysisResults}
              config={config}
              active={currentStep === 5}
              loading={loading}
            />
            <ResultsPanel
              data={data}
              results={analysisResults}
              config={config}
              active={currentStep === 6}
              loading={loading}
              onThresholdChange={(threshold) => handleConfigChange('threshold', threshold)}
            />
          </div>

          {/* Equation Display - Always visible at bottom when results exist */}
          {analysisResults && (
            <EquationDisplay
              results={analysisResults}
              config={config}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default App