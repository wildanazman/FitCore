export const config = { maxDuration: 60 }
import { hasExcludedIngredients } from '../shared/foodSuitability.js'
import { isExcludedRestaurant, isNonFoodBusiness } from '../shared/restaurantCuration.js'
const cache = new Map()
let nextRequest = 0, inFlight = false
const googleUsage = new Map()
const headers = { 'User-Agent': 'FitCore/1.0 (https://fit-core-five.vercel.app; user-triggered restaurant finder)' }
const areaCenters = { Putrajaya: { latitude: 2.9264, longitude: 101.6964 }, Bangi: { latitude: 2.961, longitude: 101.757 }, Kajang: { latitude: 2.9935, longitude: 101.7874 }, Cyberjaya: { latitude: 2.9225, longitude: 101.655 } }
export const matchesAreas = (place, areas) => !areas.length || areas.some(area => new RegExp(`\\b${area}\\b`, 'i').test(place.address || ''))
const clean = (v, max = 200) => typeof v === 'string' ? v.trim().slice(0, max) : ''
const coord = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
const send = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)) }
// Keep the mask to identity, location and rating data. Asking for contact/atmosphere
// fields can move a request into a more expensive Places SKU.
const googleFields = 'nextPageToken,places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.businessStatus,places.types,places.primaryType'
const googleLimit = () => Math.max(1, Math.min(1000, Number(process.env.GOOGLE_PLACES_MONTHLY_REQUEST_LIMIT || 250)))
const googleDailyLimit = () => Math.max(1, Math.min(100, Number(process.env.GOOGLE_PLACES_DAILY_REQUEST_LIMIT || 10)))
function reserveGoogleRequests(amount) {
  const now = new Date(), month = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`, day = now.toISOString().slice(0, 10)
  const state = googleUsage.get(month) || { month: 0, day, dayCount: 0 }
  if (state.day !== day) { state.day = day; state.dayCount = 0 }
  if (state.month + amount > googleLimit() || state.dayCount + amount > googleDailyLimit()) return false
  state.month += amount; state.dayCount += amount; googleUsage.set(month, state)
  for (const key of googleUsage.keys()) if (key !== month) googleUsage.delete(key)
  return true
}
async function googlePlaces(key, method, body, fieldMask) {
  const response = await fetch(`https://places.googleapis.com/v1/places:${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fieldMask },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) throw new Error('Google Places request failed')
  return response.json()
}
export function distanceKm(a, b) {
  const rad = n => n * Math.PI / 180
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)))
}
export function rankOSM(elements, center, radiusKm) {
  const seen = new Set()
  return elements.flatMap(p => {
    const t = p.tags || {}, name = clean(t.name || t['name:en']), latitude = p.lat ?? p.center?.lat, longitude = p.lon ?? p.center?.lon
    if (!['node', 'way', 'relation'].includes(p.type) || !Number.isSafeInteger(p.id) || !name || !coord(latitude, longitude) || !['restaurant','fast_food','cafe','food_court'].includes(t.amenity)) return []
    if (hasExcludedIngredients(`${name} ${t.cuisine || ''} ${t.description || ''}`) || ['yes','only'].includes(t['diet:pork']) || ['yes','only','served','draught','bottled'].includes(t.alcohol) || ['drink:alcohol','drink:beer','drink:wine','drink:spirits'].some(k=>['yes','only'].includes(t[k])) || t['diet:halal'] === 'no' || t.disused === 'yes' || t.abandoned === 'yes') return []
    if (isNonFoodBusiness(name) || (t.shop && !['bakery', 'pastry', 'deli'].includes(t.shop))) return []
    const distance = distanceKm(center, { latitude, longitude })
    const duplicate = `${name.toLowerCase()}:${latitude.toFixed(4)}:${longitude.toFixed(4)}`
    if (distance > radiusKm || seen.has(duplicate)) return []
    seen.add(duplicate)
    const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'], t['addr:city'], t['addr:postcode']].map(v => clean(v,100)).filter(Boolean).join(', ')
    return [{ id: `osm:${p.type}:${p.id}`, name, address: address || 'Address not recorded', distanceKm: Math.round(distance * 10) / 10, _distance: distance,
      cuisine: clean(t.cuisine).replace(/;/g, ', '), openingHours: clean(t.opening_hours), halalStatus: t['diet:halal'] === 'yes' ? 'Tagged halal in OpenStreetMap—not verified certification' : 'Halal status unknown',
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${latitude},${longitude}`)}`,
      osmUrl: `https://www.openstreetmap.org/${p.type}/${p.id}` }]
  }).filter(p => !isExcludedRestaurant(p.name)).sort((a,b) => a._distance - b._distance || a.name.localeCompare(b.name)).map(({_distance, ...p}) => p)
}
export function rankGoogle(places, center, radiusKm) {
  const seen = new Set()
  const foodTypes = new Set(['restaurant', 'fast_food', 'cafe', 'food_court', 'meal_takeaway', 'bakery', 'dessert_shop', 'ice_cream_shop'])
  return places.filter(p => {
    if (!p?.id || seen.has(p.id) || !p.displayName?.text || !coord(p.location?.latitude, p.location?.longitude) || p.businessStatus !== 'OPERATIONAL') return false
    seen.add(p.id)
    const types = Array.isArray(p.types) ? p.types : []
    const isFoodType = type => foodTypes.has(type) || /_restaurant$/.test(type || '')
    if (isNonFoodBusiness(p.displayName.text) || (p.primaryType && !isFoodType(p.primaryType)) || types.some(t => ['sporting_goods_store', 'sports_club', 'gym', 'hardware_store', 'pharmacy', 'car_dealer', 'clothing_store'].includes(t))) return false
    return types.some(type => foodTypes.has(type)) && !hasExcludedIngredients(p.displayName.text) && !p.servesBeer && !p.servesWine && !p.servesCocktails && !types.some(t => ['bar', 'pub', 'wine_bar'].includes(t)) && distanceKm(center, p.location) <= radiusKm
  }).sort((a, b) => {
    const score = p => Number.isFinite(p.rating) ? (p.rating * (p.userRatingCount || 0) + 4 * 100) / ((p.userRatingCount || 0) + 100) : 0
    return score(b) - score(a) || distanceKm(center, a.location) - distanceKm(center, b.location)
  }).filter(p => !isExcludedRestaurant(p.displayName.text)).map(p => ({
    id: `google:${p.id}`, name: p.displayName.text, address: clean(p.formattedAddress), distanceKm: Math.round(distanceKm(center, p.location) * 10) / 10,
    cuisine: '', openingHours: clean(p.currentOpeningHours?.weekdayDescriptions?.join(' · ')), halalStatus: 'Halal status unknown—check the business before eating',
    rating: Number.isFinite(p.rating) ? p.rating : null, reviews: Number.isSafeInteger(p.userRatingCount) ? p.userRatingCount : null,
    openNow: typeof p.currentOpeningHours?.openNow === 'boolean' ? p.currentOpeningHours.openNow : null, priceLevel: clean(p.priceLevel) || null,
    mapsUrl: typeof p.googleMapsUri === 'string' ? p.googleMapsUri : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.displayName.text} ${p.location.latitude},${p.location.longitude}`)}`,
    osmUrl: ''
  }))
}
async function read(url, options, timeout) {
  const r = await fetch(url, { ...options, headers: { ...headers, ...options?.headers }, signal: AbortSignal.timeout(timeout) })
  if (!r.ok) throw new Error(r.status === 429 ? 'Free map service is busy. Wait a moment before retrying.' : 'Free map service is unavailable. Try again later or open Google Maps.')
  return r.json()
}
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return send(res,405,{error:'Use POST.'}) }
  let b; try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {} } catch { return send(res,400,{error:'Invalid request.'}) }
  if (!b || typeof b !== 'object') return send(res,400,{error:'Invalid request.'})
  if (b.areas !== undefined && (!Array.isArray(b.areas) || b.areas.length > 4 || b.areas.some(area => !Object.hasOwn(areaCenters, area)))) return send(res,400,{error:'Choose supported areas.'})
  const areas = [...new Set(b.areas || [])]
  const area = clean(b.area,121), validCoord = typeof b.latitude === 'number' && typeof b.longitude === 'number' && coord(b.latitude,b.longitude)
  if ((!validCoord && (area.length < 2 || area.length > 120)) || typeof b.radiusKm !== 'number' || !Number.isFinite(b.radiusKm) || b.radiusKm < 1 || b.radiusKm > 50) return send(res,400,{error:'Enter a location and radius from 1–50 km.'})
  const key = JSON.stringify([validCoord ? [b.latitude,b.longitude] : area.toLowerCase(), b.radiusKm, areas.slice().sort()]), now = Date.now(), cached = cache.get(key)
  if (cached && cached.until > now) return send(res,200,cached.data)
  // One uncached request at a time per process; public providers are not unlimited.
  if (inFlight || now < nextRequest) return send(res,429,{error:'Please wait a few seconds before another map search.'})
  inFlight = true; nextRequest = now + 3000
  try {
    let center = areas.length ? areaCenters[areas[0]] : {latitude:b.latitude,longitude:b.longitude}, locationLabel = areas.length ? areas.join(' · ') : 'Your location'
    const googleKey = clean(process.env.GOOGLE_PLACES_API_KEY, 300)
    if (googleKey) {
      const requestCount = validCoord || areas.length ? 0 : 1
      if (!reserveGoogleRequests(requestCount)) return send(res,429,{error:'Google Places monthly or daily limit reached. Try again later or use the free map search.'})
      if (!validCoord && !areas.length) {
        const found = await googlePlaces(googleKey, 'searchText', { textQuery: `${area}, Malaysia`, regionCode: 'MY', languageCode: 'en', pageSize: 1 }, 'places.location,places.displayName,places.formattedAddress')
        const place = found.places?.[0]
        if (!place?.location) return send(res,404,{error:'Malaysian area not found. Try a town, postcode or landmark.'})
        center = place.location
        locationLabel = clean(place.formattedAddress || place.displayName?.text || area)
      }
      const candidates = []
      const queues = (areas.length ? areas : ['']).map(area => ({ area, token: undefined, done: false, pages: 0 }))
      for (let page = 0; page < (areas.length ? 8 : 3); page++) {
        const queue = queues.filter(q => !q.done && q.pages < 3).sort((a,b) => a.pages - b.pages)[0]
        if (!queue) break
        if (!reserveGoogleRequests(1)) {
          if (!candidates.length) return send(res,429,{error:'Google Places usage limit reached. Try again later.'})
          break
        }
        const found = await googlePlaces(googleKey, 'searchText', { textQuery: queue.area ? `restaurants in ${queue.area}, Malaysia` : 'restaurants', includedType: 'restaurant', strictTypeFiltering: true, pageSize: 20, languageCode: 'en', regionCode: 'MY', locationBias: { circle: { center: queue.area ? areaCenters[queue.area] : center, radius: areas.length ? 15000 : b.radiusKm * 1000 } }, ...(queue.token ? {pageToken: queue.token} : {}) }, googleFields)
        candidates.push(...(found.places || []))
        queue.token = found.nextPageToken; queue.pages++; queue.done = !queue.token
        if (queues.every(q => q.pages > 0) && rankGoogle(candidates, center, areas.length ? 50 : b.radiusKm).filter(p => matchesAreas(p, areas)).length >= 50) break
      }
      const result = { places: rankGoogle(candidates, center, areas.length ? 50 : b.radiusKm).filter(p => matchesAreas(p, areas)).slice(0, 50), locationLabel, source: 'Google Maps', searchedAt: new Date().toISOString() }
      if (cache.size >= 50) cache.clear()
      cache.set(key,{until:Date.now()+900000,data:result})
      return send(res,200,result)
    }
    if (!validCoord && !areas.length) {
      const query = new URLSearchParams({q:area,countrycode:'MY',limit:'1',lang:'en'})
      const data = await read(`${process.env.PHOTON_API_URL || 'https://photon.komoot.io/api/'}?${query}`, {}, 7500)
      const feature = data.features?.[0], point = feature?.geometry?.coordinates
      if (!Array.isArray(point) || !coord(point[1],point[0]) || feature.properties?.countrycode?.toUpperCase() !== 'MY') return send(res,404,{error:'Malaysian area not found. Try a town or landmark, or use your location.'})
      center = {latitude:point[1],longitude:point[0]}
      locationLabel = [...new Set([feature.properties.name,feature.properties.city,feature.properties.state].map(v=>clean(v)).filter(Boolean))].join(', ') || area
    }
    const queryCenters = areas.length ? areas.map(area => areaCenters[area]) : [center]
    const query = `[out:json][timeout:12][maxsize:16777216];(${queryCenters.map(c => `nwr(around:${areas.length ? 15000 : b.radiusKm*1000},${c.latitude},${c.longitude})[amenity~"^(restaurant|fast_food|cafe|food_court)$"][name];`).join('')});out center tags 500;`
    const data = await read(process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query})}, 16000)
    if (!Array.isArray(data.elements) || data.remark) throw new Error('Free map search could not finish. Try a smaller radius or retry later.')
    const result = {places:rankOSM(data.elements,center,areas.length ? 50 : b.radiusKm).filter(p => matchesAreas(p, areas)).slice(0, 50),locationLabel,source:'OpenStreetMap',searchedAt:new Date().toISOString()}
    if (cache.size >= 50) cache.clear()
    cache.set(key,{until:Date.now()+900000,data:result})
    return send(res,200,result)
  } catch(e) { return send(res,502,{error:e instanceof Error && e.message.startsWith('Free map') ? e.message : 'Free map search could not finish. Try a smaller radius, retry later or open Google Maps.'}) }
  finally { inFlight = false }
}
