// Vite proxies /api to the deployed functions during local development.
const base = import.meta.env.VITE_API_BASE_URL || ''

export function apiUrl(path: string) {
  return `${base}${path}`
}
