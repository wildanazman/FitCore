import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './index.css'
import './fonts.css'
import App from './App'
import './theme.css'
import { AppProvider } from './store/AppContext'
import { ThemeProvider } from './store/ThemeContext'
import { AuthProvider } from './store/AuthContext'
import { StartupBoundary } from './components/Startup'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user"><HashRouter>
      <StartupBoundary><ThemeProvider><AppProvider><AuthProvider>
        <App />
      </AuthProvider></AppProvider></ThemeProvider></StartupBoundary>
    </HashRouter></MotionConfig>
  </StrictMode>,
)
