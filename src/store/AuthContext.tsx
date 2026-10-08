import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiUrl } from '../lib/apiBase'

export interface AccountUser { id: string; name: string; email: string; isAdmin: boolean; expiresAt: number }
const TOKEN_KEY = 'fitcore.google-login.session.v1'
export function googleAuthHeaders(): Record<string, string> {
  try { const token = sessionStorage.getItem(TOKEN_KEY); return token ? { authorization: `Bearer ${token}` } : {} }
  catch { return {} }
}
interface AuthState {
  user: AccountUser | null; clientId: string | null; loading: boolean; error: string | null
  signIn: (credential: string) => Promise<void>; signOut: () => void; reload: () => void
}
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  async function verify(credential: string, signal?: AbortSignal) {
    const response = await fetch(apiUrl('/api/account'), { method: 'POST', headers: { authorization: `Bearer ${credential}` }, signal })
    const result = await response.json()
    if (!response.ok || !result.user) throw new Error(result.error || 'Please sign in again.')
    return result.user as AccountUser
  }
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null)
    async function initialise() {
      try {
        const response = await fetch(apiUrl('/api/account'), { signal: controller.signal })
        if (!response.ok) throw new Error('Account connection is unavailable. Try again.')
        const config = await response.json()
        setClientId(config.clientId || null)
        let token: string | null = null
        try { token = sessionStorage.getItem(TOKEN_KEY) } catch { /* Login still works in memory. */ }
        if (token && config.clientId) {
          try { const account = await verify(token, controller.signal); if (!controller.signal.aborted) setUser(account) }
          catch (failure) {
            if (controller.signal.aborted) return
            try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* No health data touched. */ }
            setUser(null)
            if (failure instanceof Error) setError(failure.message)
          }
        }
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to connect your account.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    initialise()
    return () => controller.abort()
  }, [revision])
  function signOut() {
    try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* Local fitness records are kept. */ }
    setUser(null); setError(null)
    window.google?.accounts.id.disableAutoSelect()
  }
  useEffect(() => {
    if (!user) return
    const timer = setTimeout(() => { signOut(); setError('Your sign-in expired. Sign in again; your local logs are still here.') }, Math.max(0, user.expiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [user])
  async function signIn(credential: string) {
    setLoading(true); setError(null)
    try {
      const account = await verify(credential)
      try { sessionStorage.setItem(TOKEN_KEY, credential) } catch { /* Non-persistent login. */ }
      setUser(account)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Google sign-in failed. Try again.') }
    finally { setLoading(false) }
  }
  return <AuthContext.Provider value={{ user, clientId, loading, error, signIn, signOut, reload: () => setRevision(value => value + 1) }}>{children}</AuthContext.Provider>
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('AuthProvider is required'); return context }
