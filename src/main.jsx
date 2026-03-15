import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Plus d'intercepteur fetch nécessaire.
// Les appels Anthropic sont gérés directement dans src/claude.js
// avec les bons headers (x-api-key, anthropic-dangerous-direct-browser-access).

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
