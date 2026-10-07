import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { useApp } from '../store/AppContext'
import { dayFuel } from '../lib/nutrition'
import { isLogDate, todayISO } from '../lib/date'
import { findRestaurants, randomIndex, type Restaurant, type RestaurantFilters } from '../lib/eatOut'
import './eat-out.css'

const colors = ['#2453ee', '#145e54', '#854ac0', '#a44515', '#17253a']
const safeLink = (url: string) => { try { const u = new URL(url); return u.protocol === 'https:' ? u.href : undefined } catch { return undefined } }
export function EatOut() {
  const nav = useNavigate(), reduced = useReducedMotion()
  const [params] = useSearchParams()
  const date = isLogDate(params.get('date') ?? '') ? params.get('date')! : todayISO()
  const { state, profile, weightKg } = useApp()
  const fuel = dayFuel(profile, weightKg, date, state.foods, state.sessions)
  const [area, setArea] = useState('')
  const [filters, setFilters] = useState<RestaurantFilters>({ radiusKm: 5, minRating: 4, minReviews: 20, openNow: true, price: 'any' })
  const [places, setPlaces] = useState<Restaurant[]>([]), [included, setIncluded] = useState<string[]>([])
  const [locationLabel, setLocationLabel] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [rotation, setRotation] = useState(0), [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<Restaurant | null>(null), [pending, setPending] = useState<Restaurant | null>(null)
  const controller = useRef<AbortController | null>(null), resultRef = useRef<HTMLHeadingElement>(null)
  const selected = places.filter(p => included.includes(p.id)), blocked = busy || spinning
  const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`restaurants ${area.trim() || 'near me'}`)}`
  useEffect(() => () => { controller.current?.abort(); controller.current = null }, [])
  useEffect(() => {
    if (!spinning || !pending) return
    const timer = window.setTimeout(() => { setWinner(pending); setSpinning(false); setPending(null); resultRef.current?.focus() }, reduced ? 0 : 3250)
    return () => window.clearTimeout(timer)
  }, [spinning, pending, reduced])
  const reset = () => { setPlaces([]); setIncluded([]); setWinner(null); setLocationLabel(''); setError(''); setRotation(0) }
  function changeFilter<K extends keyof RestaurantFilters>(key: K, value: RestaurantFilters[K]) { reset(); setFilters(f => ({ ...f, [key]: value })) }
  async function search(useLocation: boolean) {
    if (blocked) return
    controller.current?.abort()
    const c = new AbortController(); controller.current = c
    reset(); setBusy(true)
    try {
      let location: { latitude: number; longitude: number } | { area: string }
      if (useLocation) {
        if (!navigator.geolocation) throw new Error('Location is unavailable. Type your area instead.')
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Could not get your location. Allow location access or type your area.')), { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }))
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
      } else {
        if (!area.trim()) throw new Error('Enter a town, postcode or landmark first.')
        location = { area: area.trim() }
      }
      if (c.signal.aborted) return
      const timer = window.setTimeout(() => c.abort(), 22000)
      try { const found = await findRestaurants(location, filters, c.signal); if (!c.signal.aborted) { setPlaces(found.places); setIncluded(found.places.map(p=>p.id)); setLocationLabel(found.locationLabel) } } finally { window.clearTimeout(timer) }
    } catch (e) { if (controller.current === c) setError(c.signal.aborted ? 'Search timed out. Please try again.' : e instanceof Error ? e.message : 'Could not search. Please retry.') }
    finally { if (controller.current === c) setBusy(false) }
  }
  function spin() {
    if (spinning || !selected.length) return
    const index = randomIndex(selected.length), mid = (index + .5) * 360 / selected.length
    const target = (360 - mid) % 360, current = ((rotation % 360) + 360) % 360
    setWinner(null); setPending(selected[index]); setSpinning(true)
    setRotation(rotation + 1800 + ((target - current + 360) % 360))
  }
  return <div className="eat-out-page"><TopBar inset />
    <header className="eat-out-heading"><button onClick={() => nav(`/food?date=${date}`)}><Icon name="arrow_back" size={18} />Food</button><h1>Makan mana?</h1><p>Good food nearby. A little less indecision.</p></header>
    <div className="eat-out-fuel"><span><strong>{Math.max(0, fuel.proteinTarget - fuel.protein)} g</strong> protein left</span><span><strong>{Math.max(0, fuel.remaining).toLocaleString()} kcal</strong> left</span></div>
    <section className="eat-out-search" aria-labelledby="eat-out-location"><h2 id="eat-out-location">Start somewhere.</h2><button className="eat-out-primary" disabled={blocked} onClick={() => void search(true)}><Icon name="my_location" size={20} />{busy ? 'Finding places…' : 'Use my location'}</button><p className="eat-out-note">Only shared for this search. Not saved or tracked in the background.</p>
      <form onSubmit={e => { e.preventDefault(); void search(false) }}><label htmlFor="eat-out-area">Or search a Malaysian area</label><div className="eat-out-area"><input id="eat-out-area" maxLength={120} placeholder="Town, postcode or landmark" value={area} disabled={blocked} onChange={e => { reset(); setArea(e.target.value) }} /><button disabled={blocked || !area.trim()} type="submit">Search</button></div></form>
      <fieldset disabled={blocked}><legend>How far?</legend><div className="eat-out-radius">{[1, 3, 5, 10].map(km => <button type="button" key={km} aria-pressed={filters.radiusKm === km} onClick={() => changeFilter('radiusKm', km)}>{km} km</button>)}<label>Custom km<input aria-label="Custom radius in kilometres" type="number" min={1} max={50} value={filters.radiusKm} onChange={e => changeFilter('radiusKm', Number(e.target.value))} /></label></div>
      <div className="eat-out-filters"><label>Google rating<select value={filters.minRating} onChange={e => changeFilter('minRating', Number(e.target.value))}><option value={4}>4.0+</option><option value={4.3}>4.3+</option><option value={4.5}>4.5+</option><option value={0}>Any rating</option></select></label><label>Minimum reviews<select value={filters.minReviews} onChange={e => changeFilter('minReviews', Number(e.target.value))}><option value={20}>20 reviews</option><option value={100}>100 reviews</option><option value={0}>Any count</option></select></label><label>Price<select value={filters.price} onChange={e => changeFilter('price', e.target.value as 'any' | 'budget')}><option value="any">Any / unknown</option><option value="budget">Budget / moderate</option></select></label></div><label className="eat-out-check"><input type="checkbox" checked={filters.openNow} onChange={e => changeFilter('openNow', e.target.checked)} />Open now only</label></fieldset>
      <small>Radius is straight-line distance, not driving distance. Budget filter excludes unknown prices.</small>
    </section>
    <div role="status" aria-live="polite">{busy && <p>Checking nearby restaurants and reviews…</p>}{error && <div className="eat-out-error"><strong>Search couldn’t finish.</strong><p>{error}</p><a href={mapsSearch} target="_blank" rel="noopener noreferrer">Search Google Maps instead<Icon name="open_in_new" size={16} /></a></div>}</div>
    {!busy && !error && !locationLabel && <p className="eat-out-note">Choose a location to build your shortlist. Nothing is picked or logged automatically.</p>}
    {locationLabel && <section className="eat-out-shortlist"><h2>{places.length ? `${places.length} places. Your call.` : 'No matches this time.'}</h2><p>{locationLabel} · within {filters.radiusKm} km</p>{!places.length ? <p>Try a wider radius, lower rating threshold or turn off “Open now”. We won’t fill the list with unrelated places.</p> : <>
      <p>Ranked using rating and review count among the nearby results returned—not every restaurant in the area.</p>
      <div className="eat-out-wheel-section"><div className="eat-out-wheel-wrap" aria-hidden="true"><span className="eat-out-pointer" /><div className="eat-out-wheel" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: reduced ? '0s' : '3.1s', background: selected.length ? `conic-gradient(${selected.map((_, i) => `${colors[i % colors.length]} ${i * 100 / selected.length}% ${(i + 1) * 100 / selected.length}%`).join(',')})` : '#e8edf5' }}>{selected.map((p, i) => <span key={p.id} style={{ transform: `rotate(${(i + .5) * 360 / selected.length}deg) translateY(-92px) rotate(-${(i + .5) * 360 / selected.length}deg)` }}>{places.findIndex(x => x.id === p.id) + 1}</span>)}</div><div className="eat-out-wheel-center"><strong>{selected.length}</strong><span>in the spin</span></div></div><button className="eat-out-primary" disabled={!selected.length || blocked} onClick={spin}>{spinning ? 'Choosing your next stop…' : winner ? 'Spin again' : 'Pick for me'}</button><p>{selected.length ? 'Equal chance for every included place. Numbers match the list below.' : 'Include at least one place below to spin.'}</p></div>
      <section className={`eat-out-result ${winner ? 'has-winner' : ''}`} aria-live="polite"><h3 ref={resultRef} tabIndex={-1}>{winner ? `Let’s eat at ${winner.name}.` : spinning ? 'Your shortlist is spinning…' : 'Your pick will appear here.'}</h3>{winner && <><p>{winner.distanceKm} km · Google {winner.rating.toFixed(1)} / 5 · {winner.reviews.toLocaleString()} reviews</p><div className="eat-out-result-actions"><a href={safeLink(winner.mapsUrl)} target="_blank" rel="noopener noreferrer">Open in Maps<Icon name="open_in_new" size={16} /></a><button onClick={() => nav(`/food?add=1&date=${date}`)}>Find a food to log<Icon name="arrow_forward" size={18} /></button></div><p>Check the actual menu and portions before logging. No verified branch nutrition is available here.</p><details><summary>What could fit my day?</summary><p>General Malaysian food ideas—not this restaurant’s menu. Search to review portions and nutrition.</p>{['Nasi Ayam', 'Grilled Chicken Breast', 'Telur Rebus', 'Tempe'].map(q => <button className="eat-out-food-link" key={q} onClick={() => nav(`/food?add=1&date=${date}&q=${encodeURIComponent(q)}`)}>{q}<Icon name="search" size={16} /></button>)}</details></>}</section>
      <p className="eat-out-suitability">Places explicitly marked as serving alcohol, bars, and names mentioning pork/alcohol are excluded. Other places may have unknown halal status—check the business before eating. Cuisine alone is not a halal decision.</p>
      <ol className="eat-out-list">{places.map((p, i) => <li key={p.id}><div className="eat-out-place-title"><span>{i + 1}</span><h3>{p.name}</h3></div><p>{p.address}</p><div className="eat-out-place-data"><strong>Google {p.rating.toFixed(1)} / 5</strong><span>{p.reviews.toLocaleString()} reviews</span><span>{p.distanceKm} km</span><span>{p.openNow === true ? 'Open now' : p.openNow === false ? 'Closed now' : 'Hours unknown'}</span><span>{p.priceLevel === null ? 'Price unknown' : p.priceLevel.replace('PRICE_LEVEL_', '').replace(/_/g, ' ').toLowerCase()}</span></div><div className="eat-out-place-links"><a href={safeLink(p.mapsUrl)} target="_blank" rel="noopener noreferrer">Google Maps<Icon name="open_in_new" size={15} /></a><a href={`https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${p.name} ${p.address}`)}`} target="_blank" rel="noopener noreferrer">Search Tripadvisor<Icon name="open_in_new" size={15} /></a></div><label className="eat-out-check"><input disabled={blocked} type="checkbox" checked={included.includes(p.id)} onChange={e => { setWinner(null); setRotation(0); setIncluded(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id)) }} />Include in spin<span className="sr-only"> {p.name}</span></label>{p.attributions.map((a, j) => <small key={j}>Source: {safeLink(a.providerUri ?? '') ? <a href={safeLink(a.providerUri ?? '')} target="_blank" rel="noopener noreferrer">{a.provider}</a> : a.provider}</small>)}</li>)}</ol>
    </>}<p className="eat-out-attribution">Restaurant data: <a className="eat-out-google-attribution" translate="no" href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>. Tripadvisor links open an external search; Tripadvisor ratings are not integrated. Ratings and hours can change.</p></section>}
  </div>
}
