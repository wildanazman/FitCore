import { apiUrl } from './apiBase'
export type Restaurant = { id: string; name: string; address: string; distanceKm: number; cuisine: string; openingHours: string; halalStatus: string; mapsUrl: string; osmUrl: string; rating?: number | null; reviews?: number | null; openNow?: boolean | null; priceLevel?: string | null }
export type RestaurantFilters = { radiusKm: number }
export async function findRestaurants(location: { latitude: number; longitude: number } | { area: string }, filters: RestaurantFilters, signal: AbortSignal): Promise<{ places: Restaurant[]; locationLabel: string; source?: string }> {
  const response = await fetch(apiUrl('/api/nearby-restaurants'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...location, ...filters }), signal })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'Restaurant search is unavailable. Please retry.')
  if (!Array.isArray(data?.places)) throw new Error('Restaurant search returned an invalid response.')
  return data
}
export function randomIndex(length: number) {
  if (!Number.isInteger(length) || length < 1) throw new Error('An eligible shortlist is required.')
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor(0x100000000 / length) * length
  const value = new Uint32Array(1)
  do { crypto.getRandomValues(value) } while (value[0] >= limit)
  return value[0] % length
}
