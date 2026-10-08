import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../store/AuthContext'

declare global {
  interface Window { google?: { accounts: { id: {
    initialize: (options: { client_id: string; callback: (response: { credential: string }) => void; auto_select: boolean }) => void
    renderButton: (element: HTMLElement, options: { type: string; theme: string; size: string; text: string; width: number }) => void
    disableAutoSelect: () => void
  } } } }
}
let googleScript: Promise<void> | null = null
function loadGoogle() {
  if (window.google?.accounts.id) return Promise.resolve()
  if (googleScript) return googleScript
  googleScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true
    script.onload = () => resolve()
    script.onerror = () => { script.remove(); googleScript = null; reject(new Error('Google sign-in could not load. Check your connection and try again.')) }
    document.head.appendChild(script)
  })
  return googleScript
}

export function GoogleAccount() {
  const { user, clientId, loading, error, signIn, signOut, reload } = useAuth()
  const button = useRef<HTMLDivElement>(null)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const callback = useRef(signIn); callback.current = signIn
  useEffect(() => {
    if (!clientId || user || loading) return
    let cancelled = false
    setScriptError(null)
    loadGoogle().then(() => {
      if (cancelled || !button.current) return
      button.current.replaceChildren()
      window.google!.accounts.id.initialize({ client_id: clientId, callback: response => { void callback.current(response.credential) }, auto_select: false })
      window.google!.accounts.id.renderButton(button.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: Math.min(320, button.current.clientWidth || 280) })
    }).catch(failure => { if (!cancelled) setScriptError(failure.message) })
    return () => { cancelled = true }
  }, [clientId, user, loading, attempt])
  return <section className="settings-google-account" aria-labelledby="google-account-title">
    <h2 id="google-account-title">Your account</h2>
    {user ? <><div className="settings-google-identity"><span className="settings-avatar" aria-hidden="true">{user.name[0]?.toUpperCase()}</span><div><strong>{user.name}</strong><span>{user.email}</span><small>{user.isAdmin ? 'Administrator' : 'Google account connected'}</small></div></div><button type="button" className="settings-account-action" onClick={signOut}>Sign out</button><p>Signing out keeps your logs on this device. Anyone using this browser can still see those local logs.</p></> : <><p>Connect Google without resetting your food, weight or activity logs.</p><div ref={button} className="settings-google-button" aria-busy={loading}/>{loading && <p role="status">Connecting your account…</p>}{!loading && !clientId && !error && <p>Google login is being configured. Your local logs are unaffected.</p>}</>}
    {(error || scriptError) && <div role="alert"><p>{error || scriptError}</p><button type="button" className="settings-account-action" onClick={() => { setAttempt(value => value + 1); reload() }}>Try again</button></div>}
    <p className="settings-account-local">Account connection only. Logs are not uploaded or synced; export a backup before changing phones.</p>
  </section>
}
