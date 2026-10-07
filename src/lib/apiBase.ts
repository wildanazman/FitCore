// New food catalog / restaurant functions run locally in Vite; legacy APIs use its proxy.
const base = import.meta.env.VITE_API_BASE_URL || ''

export function apiUrl(path: string) {
  return `${base}${path}`
}
