import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App'
import './theme.css'
import { AppProvider } from './store/AppContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user"><HashRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </HashRouter></MotionConfig>
  </StrictMode>,
)
