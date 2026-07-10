const isLocalDev = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)

// Local Vite has no Vercel Functions, so use the deployed API for real web/AI lookups.
const base = import.meta.env.VITE_API_BASE_URL || (isLocalDev ? 'https://fit-core.vercel.app' : '')

export function apiUrl(path: string) {
  return `${base}${path}`
}
