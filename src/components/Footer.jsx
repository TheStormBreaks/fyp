import React from 'react'
import { Github, ExternalLink, BookOpen, Heart, Coffee } from 'lucide-react'

function Footer() {
  return (
    <footer style={{
      padding: '3rem 0 1.5rem',
      borderTop: '1px solid var(--border)',
      marginTop: 'auto'
    }}>
      <div className="container">
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '2rem'}}>
          <div>
            <h4 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span style={{color: '#ef4444'}}><Heart className="w-5 h-5" /></span>
              SINDy Framework
            </h4>
            <p style={{color: 'var(--fg-secondary)', fontSize: '0.9rem', lineHeight: '1.7'}}>
              An academic presentation framework for <strong>Sparse Identification of Nonlinear Dynamics</strong>
              (SINDy). Discover governing equations from data using interpretable machine learning.
            </p>
          </div>

          <div>
            <h4 style={{marginBottom: '1rem'}}>References</h4>
            <ul style={{color: 'var(--fg-secondary)', fontSize: '0.85rem', lineHeight: '2', paddingLeft: '1.5rem'}}>
              <li>Brunton et al. (2016) - <em>Discovering governing equations from data by sparse identification of nonlinear dynamical systems</em> - PNAS</li>
              <li>Champion et al. (2019) - <em>Data-driven discovery of coordinates and governing equations</em> - PNAS</li>
              <li>Kaptanoglu et al. (2022) - <em>PySINDy: A comprehensive Python package for robust sparse system identification</em> - JOSS</li>
            </ul>
          </div>

          <div>
            <h4 style={{marginBottom: '1rem'}}>Dataset</h4>
            <ul style={{color: 'var(--fg-secondary)', fontSize: '0.85rem', lineHeight: '2', paddingLeft: '1.5rem'}}>
              <li>Hudson Bay Company fur trading records (1845-1935)</li>
              <li>Annual hare and lynx pelts (thousands)</li>
              <li>Classic Lotka-Volterra predator-prey system</li>
              <li>Source: Elton & Nicholson (1942), J. Anim. Ecol.</li>
            </ul>
          </div>

          <div>
            <h4 style={{marginBottom: '1rem'}}>Links</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
              <a href="https://github.com/dynamicslab/pysindy" target="_blank" rel="noopener noreferrer"
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-secondary)', fontSize: '0.85rem', textDecoration: 'none'}}>
                <Github className="w-4 h-4" /> PySINDy Official Repository
              </a>
              <a href="https://www.pnas.org/doi/10.1073/pnas.1517384113" target="_blank" rel="noopener noreferrer"
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-secondary)', fontSize: '0.85rem', textDecoration: 'none'}}>
                <ExternalLink className="w-4 h-4" /> Original SINDy Paper (PNAS)
              </a>
              <a href="https://github.com/luizvassallo/sindy" target="_blank" rel="noopener noreferrer"
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-secondary)', fontSize: '0.85rem', textDecoration: 'none'}}>
                <Github className="w-4 h-4" /> Julia SINDy Implementation
              </a>
            </div>
          </div>
        </div>

        <div style={{
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <p style={{color: 'var(--fg-muted)', fontSize: '0.8rem'}}>
            Built for academic presentation •
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent-primary)'}}>
              View Source
            </a>
            •
            <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent-primary)'}}>
              Deployed on Netlify
            </a>
          </p>

          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <span style={{color: 'var(--fg-muted)', fontSize: '0.8rem'}}>
              Made with
              <span style={{color: '#ef4444', display: 'inline-block'}}><Heart className="w-4 h-4" /></span>
              for scientific discovery
            </span>
            <span style={{color: 'var(--fg-muted)', fontSize: '0.8rem'}}>
              <span style={{color: '#f59e0b', display: 'inline-block'}}><Coffee className="w-4 h-4" /></span>
              Powered by curiosity
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer