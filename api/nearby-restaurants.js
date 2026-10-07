export const config = { maxDuration: 30 }
import { hasExcludedIngredients } from '../shared/foodSuitability.js'
const send = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}
const fields = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.currentOpeningHours,places.priceLevel,places.businessStatus,places.attributions,places.types,places.servesBeer,places.servesWine,places.servesCocktails'
async function google(key, method, body, mask) {
  const response = await fetch(`https://places.googleapis.com/v1/places:${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask },
    body: JSON.stringify(body), signal: AbortSignal.timeout(9000),
  })
  if (!response.ok) throw new Error('provider')
  return response.json()
}
export function distanceKm(a, b) {
  const rad = n => n * Math.PI / 180
  const dLat = rad(b.latitude - a.latitude), dLng = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)))
}
export function rankPlaces(places, center, options) {
  const seen = new Set()
  return places.filter(p => {
    if (!p.id || seen.has(p.id) || !p.displayName?.text || !p.location) return false
    seen.add(p.id)
    return !hasExcludedIngredients(p.displayName.text) && !p.servesBeer && !p.servesWine && !p.servesCocktails && !p.types?.some(t=>['bar','pub','wine_bar'].includes(t)) && p.businessStatus === 'OPERATIONAL' && Number.isFinite(p.rating) && p.rating >= options.minRating && p.userRatingCount >= options.minReviews &&
      distanceKm(center, p.location) <= options.radiusKm && (!options.openNow || p.currentOpeningHours?.openNow === true) &&
      (options.price === 'any' || ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE'].includes(p.priceLevel))
  }).sort((a, b) => {
    // Weighted rating tempers tiny review samples; no cross-provider blended score.
    const score = p => (p.rating * p.userRatingCount + 4 * 100) / (p.userRatingCount + 100)
    return score(b) - score(a) || distanceKm(center, a.location) - distanceKm(center, b.location)
  }).slice(0, 10).map(p => ({
    id: p.id, name: p.displayName.text, address: p.formattedAddress ?? '', rating: p.rating, reviews: p.userRatingCount,
    distanceKm: Math.round(distanceKm(center, p.location) * 10) / 10, openNow: p.currentOpeningHours?.openNow ?? null,
    priceLevel: p.priceLevel ?? null, mapsUrl: p.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName.text)}&query_place_id=${encodeURIComponent(p.id)}`,
    attributions: p.attributions ?? [],
  }))
}
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Use POST.' }) }
  let b
  try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {} } catch { return send(res, 400, { error: 'Invalid request.' }) }
  const area = typeof b.area === 'string' ? b.area.trim() : ''
  const validCoord = typeof b.latitude === 'number' && typeof b.longitude === 'number' && Number.isFinite(b.latitude) && Number.isFinite(b.longitude) && Math.abs(b.latitude) <= 90 && Math.abs(b.longitude) <= 180
  if ((!validCoord && (!area || area.length > 120)) || typeof b.radiusKm !== 'number' || !Number.isFinite(b.radiusKm) || b.radiusKm < 1 || b.radiusKm > 50 || ![0, 4, 4.3, 4.5].includes(b.minRating) || ![0, 20, 100].includes(b.minReviews) || !['any', 'budget'].includes(b.price) || typeof b.openNow !== 'boolean') return send(res, 400, { error: 'Check your location and filters. Radius must be 1–50 km.' })
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return send(res, 503, { code: 'NOT_CONFIGURED', error: 'Live restaurant search is not connected yet. The app owner needs to configure Google Places.' })
  try {
    let center = { latitude: b.latitude, longitude: b.longitude }, locationLabel = 'Your location'
    if (!validCoord) {
      const found = await google(key, 'searchText', { textQuery: `${area}, Malaysia`, regionCode: 'MY', languageCode: 'en', pageSize: 1 }, 'places.location,places.displayName,places.formattedAddress')
      const place = found.places?.[0]
      if (!place?.location) return send(res, 404, { error: 'Area not found. Try a town, postcode or landmark.' })
      center = place.location
      locationLabel = place.formattedAddress || place.displayName?.text || area
    }
    const data = await google(key, 'searchNearby', { includedTypes: ['restaurant'], maxResultCount: 20, rankPreference: 'POPULARITY', languageCode: 'en', locationRestriction: { circle: { center, radius: b.radiusKm * 1000 } } }, fields)
    return send(res, 200, { places: rankPlaces(data.places ?? [], center, b), locationLabel, source: 'Google Maps', searchedAt: new Date().toISOString() })
  } catch { return send(res, 502, { error: 'Restaurant search is unavailable. Try again later or open Google Maps.' }) }
}
