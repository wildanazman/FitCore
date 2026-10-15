import { Component, useEffect, useState, type ReactNode } from 'react'
import './startup.css'

export function StartupReady() {
  useEffect(() => { window.dispatchEvent(new Event('fitcore:ready')) }, [])
  return null
}

export function RouteLoading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const timer = window.setTimeout(() => setSlow(true), 12000); return () => window.clearTimeout(timer) }, [])
  return <div className="startup-panel" role="status" aria-live="polite"><p>{slow ? 'This page is taking longer than usual. Check your connection and retry.' : 'Opening your page…'}</p>{slow && <button type="button" onClick={() => window.location.reload()}>Retry</button>}</div>
}

export class StartupBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <><StartupReady /><div className="startup-panel" role="alert"><h1>Let’s reopen FitCore.</h1><p>This page couldn’t load. Retry without clearing your saved logs.</p><button type="button" onClick={() => window.location.reload()}>Retry opening FitCore</button></div></>
    return this.props.children
  }
}
