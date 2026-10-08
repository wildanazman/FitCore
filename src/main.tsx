import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App'
import './theme.css'
import { AppProvider } from './store/AppContext'
import { ThemeProvider } from './store/ThemeContext'
import { AuthProvider } from './store/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user"><HashRouter>
      <ThemeProvider><AppProvider><AuthProvider>
        <App />
      </AuthProvider></AppProvider></ThemeProvider>
    </HashRouter></MotionConfig>
  </StrictMode>,
)
