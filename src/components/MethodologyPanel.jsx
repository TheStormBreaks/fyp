import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, BookOpen, Code, GitBranch, Target, Layers, Zap, Brain, Filter, Search, Link2, CheckCircle, HelpCircle } from 'lucide-react'
import katex from 'katex'

// KaTeX Equation Component
function KatexEquation({ latex, inline = false }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && latex) {
      try {
        katex.render(latex, ref.current, {
          throwOnError: false,
          displayMode: !inline,
          strict: false
        })
      } catch (e) {
        console.warn('KaTeX render error:', e)
        ref.current.textContent = latex
      }
    }
  }, [latex, inline])
  return <div ref={ref} style={{ overflow: 'auto', display: inline ? 'inline-block' : 'block' }} />
}

const methodologySections = [
  {
    id: 'overview',
    title: 'System Overview',
    icon: BookOpen,
    content: (
      <div>
        <p style={{ marginBottom: '1rem', color: 'var(--fg-secondary)', fontSize: '0.95rem' }}>
          An AI-based framework for automatic mathematical model discovery from experimental/simulation data
          using SINDy (Sparse Identification of Nonlinear Dynamics) with STLSq (Sequential Thresholded Least Squares).
        </p>
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border)' }}>
          <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--accent-primary)' }}><Code className="w-4 h-4" /></span>
            Core Pipeline: 6-Stage Agentic Orchestration
          </h4>
          <ol style={{ paddingLeft: '1.5rem', color: 'var(--fg-secondary)', fontSize: '0.9rem', lineHeight: '2' }}>
            <li><strong>Data Ingestion</strong> — Time-series & spatiotemporal datasets with provenance tracking</li>
            <li><strong>Preprocessing & Derivative Consensus</strong> — Multi-method differentiation (FD, Savitzky-Golay, Cubic Splines) + normalization</li>
            <li><strong>Feature Library & Coherence</strong> — Polynomials (order 5), trigonometric, interactions + Gram-Schmidt coherence filter (μ > 0.7)</li>
            <li><strong>Sparse & Symbolic Discovery</strong> — STLSQ + PySR symbolic regression fallback across log-spaced λ grid</li>
            <li><strong>Multi-Criteria Model Selection</strong> — AIC, BIC, Cross-Validation, Pareto knee detection, Bootstrap stability (π > 0.9)</li>
            <li><strong>Dynamical Validation & Equations</strong> — RK4 integration, parameter estimation, uncertainty quantification</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: 'objectives',
    title: 'Objectives & SDG Alignment',
    icon: Target,
    content: (
      <div>
        <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Four Primary Objectives</h4>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { num: 1, title: 'Automated Model Discovery', desc: 'Minimize human-in-the-loop from data to interpretable governing equations using agentic SINDy pipeline' },
            { num: 2, title: 'Robustness via Consensus', desc: 'Multi-method derivative estimation and cross-validated sparse regression eliminate single-method artifacts' },
            { num: 3, title: 'Interpretability with Uncertainty', desc: 'Every discovered term carries bootstrap inclusion probability, parameter confidence intervals, and symbolic form' },
            { num: 4, title: 'Reproducibility at Scale', desc: 'Containerized pipeline with config versioning, random seeds, and public benchmark registry' }
          ].map(obj => (
            <div key={obj.num} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span style={{ background: 'var(--accent-primary)', color: 'var(--bg-primary)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>{obj.num}</span>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{obj.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>{obj.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>SDG Alignment</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { sdg: 'SDG 9', title: 'Industry, Innovation & Infrastructure', desc: 'Automated scientific discovery infrastructure for physics-informed ML' },
            { sdg: 'SDG 13', title: 'Climate Action', desc: 'Data-driven climate system identification from observational records' },
            { sdg: 'SDG 14', title: 'Life Below Water', desc: 'Marine ecosystem dynamics from population time-series' },
            { sdg: 'SDG 15', title: 'Life on Land', desc: 'Terrestrial predator-prey and population dynamics modeling' }
          ].map(item => (
            <div key={item.sdg} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>{item.sdg}: {item.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'methodology',
    title: 'Detailed Methodology',
    icon: Layers,
    content: (
      <div>
        <table className="table" style={{ fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Component</th>
              <th style={{ width: '25%' }}>Method</th>
              <th style={{ width: '30%' }}>Key Parameters</th>
              <th style={{ width: '30%' }}>Output</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Data Ingestion</strong></td>
              <td>Time-series loader with provenance metadata (source, units, sampling, missing-data flags)</td>
              <td>CSV/NetCDF/HDF5; schema validation; temporal alignment</td>
              <td>Clean DataFrame + metadata JSON</td>
            </tr>
            <tr>
              <td><strong>2. Derivative Consensus</strong></td>
              <td>Finite Differences (2nd/4th order), Savitzky-Golay (window 5-11, poly 2-3), Cubic Splines (smoothing factor)</td>
              <td>Method ensemble + median consensus; SNR-weighted averaging</td>
              <td>Consensus Ẋ matrix + uncertainty bands</td>
            </tr>
            <tr>
              <td><strong>3. Feature Library & Coherence</strong></td>
              <td>Polynomials up to order 5, sin/cos up to 3ω, pairwise interactions; Gram-Schmidt orthogonalization</td>
              <td>μ_threshold = 0.7; max 100 terms; feature names tracked</td>
              <td>Coherent Θ(X) ∈ ℝ^(n×p) + term labels</td>
            </tr>
            <tr>
              <td><strong>4. Sparse & Symbolic Discovery</strong></td>
              <td>STLSQ (λ ∈ 10^[-4,1] log-spaced 20 pts) + PySR fallback (operators +,-,*,/,^,sin,cos)</td>
              <td>max_iter=20; tol=1e-4; population=50; generations=100</td>
              <td>Coefficient paths Ξ(λ); Pareto front; symbolic forms</td>
            </tr>
            <tr>
              <td><strong>5. Multi-Criteria Selection</strong></td>
              <td>AIC/BIC on held-out; k-fold CV (k=5 temporal); Pareto knee (max curvature); Bootstrap stability (B=200, π>0.9)</td>
              <td>λ_grid; temporal split 70/30; stability threshold</td>
              <td>Selected λ*; final Ξ*; inclusion probabilities</td>
            </tr>
            <tr>
              <td><strong>6. Dynamical Validation</strong></td>
              <td>RK4 integration (dt=0.01); trajectory comparison; parameter CIs via bootstrap; uncertainty propagation</td>
              <td>Integration horizon; noise floor; confidence level 95%</td>
              <td>Validated equations + RMSE/MAE; parameter estimates ±CI</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  },
  {
    id: 'mathematical',
    title: 'Mathematical Foundation',
    icon: Zap,
    content: (
      <div>
        <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>SINDy: Sparse Identification of Nonlinear Dynamics</h4>
        <p style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Given state measurements X(t) ∈ ℝ^n, we seek a sparse dynamical system:
        </p>

        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--border)', marginBottom: '1.5rem', overflow: 'auto' }}>
          <KatexEquation latex="\\dot{X} = \\Theta(X) \\Xi" />
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
            Ẋ = dX/dt (consensus derivatives), Θ(X) = feature library, Ξ = sparse coefficient matrix
          </p>
        </div>

        <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>STLSQ: Sequential Thresholded Least Squares</h4>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            'Initialize: Ξ = Θ^† Ẋ (least squares)',
            'Threshold: Ξ_ij = 0 if |Ξ_ij| < λ',
            'Refit: Ξ = argmin ||Θ_X Ξ - Ẋ||² subject to Ξ_ij = 0 for thresholded terms',
            'Repeat until convergence (max_iter) or sparsity stabilizes'
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span style={{ background: 'var(--accent-secondary)', color: 'var(--bg-primary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ fontSize: '0.9rem', color: 'var(--fg-secondary)' }}>{step}</div>
            </div>
          ))}
        </div>

        <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Model Selection Criteria</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
          {[
            { name: 'AIC', formula: 'AIC = 2k - 2\\ln(\\hat{L})', desc: 'Akaike Information Criterion — penalizes complexity' },
            { name: 'BIC', formula: 'BIC = k\\ln(n) - 2\\ln(\\hat{L})', desc: 'Bayesian Information Criterion — stronger penalty' },
            { name: 'CV Error', formula: 'CV = \\frac{1}{k}\\sum_{i=1}^k \\text{MSE}_i', desc: 'k-fold temporal cross-validation error' },
            { name: 'Pareto Knee', formula: `\\kappa = \\frac{|x''y' - y''x'|}{(x'^2 + y'^2)^{3/2}}`, desc: 'Max curvature on Error vs Sparsity front' },
            { name: 'Stability', formula: '\\pi_j = \\frac{1}{B}\\sum_{b=1}^B \\mathbb{1}(\\Xi^{(b)}_j \\neq 0)', desc: 'Bootstrap inclusion probability (π > 0.9)' }
          ].map(item => (
            <div key={item.name} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{item.name}</span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <KatexEquation inline latex={item.formula} />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'validation',
    title: 'Validation & Uncertainty',
    icon: CheckCircle,
    content: (
      <div>
        <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Dynamical Validation Protocol</h4>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { title: 'Trajectory Integration', desc: 'RK4 integration from t₀ to T with discovered equations; compare to held-out data' },
            { title: 'Parameter Estimation', desc: 'Bootstrap (B=200) resampling of residuals → coefficient confidence intervals (95%)' },
            { title: 'Uncertainty Quantification', desc: 'Propagate parameter CIs through integration → prediction bands on trajectories' },
            { title: 'Generalization Test', desc: 'Integrate beyond training horizon; assess structural stability vs. overfitting' }
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span style={{ background: 'var(--success)', color: 'var(--bg-primary)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>{i + 1}</span>
              <div>
                <div style={{ fontWeight: '600' }}>{item.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Expected Outcomes (from Framework Document)</h4>
        <ul style={{ paddingLeft: '1.5rem', color: 'var(--fg-secondary)', fontSize: '0.9rem', lineHeight: '2' }}>
          <li><strong>Discovered Governing Equations</strong> — Sparse, interpretable ODEs/PDEs matching known physics (e.g., Lotka-Volterra structure)</li>
          <li><strong>Quantified Uncertainty</strong> — Every term has inclusion probability π_j and coefficient CI</li>
          <li><strong>Reproducible Pipeline</strong> — Config-driven, seeded, containerized; identical results across runs</li>
          <li><strong>Benchmark Registry</strong> — Standard datasets (Lorenz, LV, Fluid, Neural) with ground-truth equations</li>
          <li><strong>Open-Source Framework</strong> — MIT-licensed Python/JS library with Netlify-deployable demo</li>
          <li><strong>Educational Artifacts</strong> — Interactive visualizations showing sparsity-accuracy tradeoffs in real-time</li>
        </ul>
      </div>
    )
  },
  {
    id: 'demo',
    title: 'Lynx-Hare Case Study',
    icon: Brain,
    content: (
      <div>
        <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Hudson Bay Company Data (1845-1935)</h4>
        <p style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Classic predator-prey system with 91 years of annual pelt records. Ground truth: Lotka-Volterra dynamics.
        </p>

        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <h5 style={{ marginBottom: '0.75rem', color: 'var(--accent-tertiary)' }}>Ground Truth Equations</h5>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <KatexEquation latex="\\frac{dH}{dt} = \\alpha H - \\beta H L" />
            <KatexEquation latex="\\frac{dL}{dt} = \\delta H L - \\gamma L" />
          </div>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            H = Hare (prey), L = Lynx (predator)<br/>
            α = prey growth rate, β = predation rate, δ = predator growth from prey, γ = predator death rate
          </p>
        </div>

        <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>What This Demo Shows</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
          {[
            { title: 'Derivative Consensus', desc: 'FD vs Savitzky-Golay vs Splines — median consensus reduces noise artifacts' },
            { title: 'Feature Library', desc: '35+ candidate terms (polynomials, trig, interactions) filtered by coherence μ > 0.7' },
            { title: 'STLSQ Paths', desc: 'Coefficient trajectories across λ ∈ [10⁻⁴, 1]; sparsity increases with λ' },
            { title: 'Pareto Front', desc: 'Error vs Sparsity tradeoff; knee detection selects optimal λ*' },
            { title: 'Validation Tab', desc: 'Linear Regression vs ODE predictions — ODE gives lower error, threshold control' },
            { title: 'Equations Display', desc: 'Discovered terms with coefficients, LaTeX rendering, parameter CIs' }
          ].map(item => (
            <div key={item.title} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }
]

function MethodologyPanel({ className = '' }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [expandedSections, setExpandedSections] = useState(new Set(['overview']))

  const toggleSection = (id) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={`panel active ${className}`} role="tabpanel" aria-label="Methodology">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">
            <BookOpen className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            Framework Methodology & System Design
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {/* Sidebar Navigation */}
          <div style={{ width: '280px', flexShrink: 0 }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {methodologySections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: activeSection === section.id
                      ? 'var(--accent-primary)'
                      : expandedSections.has(section.id)
                        ? 'var(--bg-tertiary)'
                        : 'transparent',
                    color: activeSection === section.id
                      ? 'var(--bg-primary)'
                      : 'var(--fg-secondary)',
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: activeSection === section.id ? '600' : '500',
                    transition: 'all var(--transition)',
                    border: '1px solid var(--border)'
                  }}
                  onMouseEnter={e => {
                    if (activeSection !== section.id) {
                      e.target.style.background = 'var(--bg-tertiary)'
                      e.target.style.color = 'var(--fg-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeSection !== section.id && !expandedSections.has(section.id)) {
                      e.target.style.background = 'transparent'
                      e.target.style.color = 'var(--fg-secondary)'
                    }
                  }}
                >
                  <section.icon className="w-4 h-4" style={{ flexShrink: 0 }} />
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {methodologySections
                .filter(s => s.id === activeSection)
                .map(section => (
                  <div key={section.id}>
                    <h3 style={{
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      color: 'var(--fg-primary)',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: '0.75rem'
                    }}>
                      <section.icon className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
                      {section.title}
                    </h3>
                    {section.content}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MethodologyPanel