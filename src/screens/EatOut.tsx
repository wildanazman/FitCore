import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { useApp } from '../store/AppContext'
import { dayFuel } from '../lib/nutrition'
import { isLogDate, todayISO } from '../lib/date'
import { findRestaurants, randomIndex, type Restaurant, type RestaurantFilters } from '../lib/eatOut'
import { MALL_DIRECTORIES, mallRestaurants, type MallDirectoryKey, type MallPlaceCategory, type MallPlaceCategoryOverride } from '../lib/mallDirectories'
import './eat-out.css'
import { RouletteSound } from '../lib/rouletteSound'

const colors = ['#2453ee', '#145e54', '#854ac0', '#a44515', '#17253a']
const safeLink = (url: string) => { try { const u = new URL(url); return u.protocol === 'https:' ? u.href : undefined } catch { return undefined } }
export function EatOut() {
  const nav = useNavigate(), reduced = useReducedMotion()
  const [params] = useSearchParams()
  const date = isLogDate(params.get('date') ?? '') ? params.get('date')! : todayISO()
  const { state, profile, weightKg } = useApp()
  const fuel = dayFuel(profile, weightKg, date, state.foods, state.sessions)
  const [area, setArea] = useState('')
  const [filters, setFilters] = useState<RestaurantFilters>({ radiusKm: 5 })
  const [mode, setMode] = useState<'nearby' | 'mall'>('nearby'), [mallKey, setMallKey] = useState<MallDirectoryKey | ''>(''), [mallCategory, setMallCategory] = useState<MallPlaceCategory>('meals'), [mallOverrides, setMallOverrides] = useState<Record<string, MallPlaceCategoryOverride>>({})
  const [places, setPlaces] = useState<Restaurant[]>([]), [included, setIncluded] = useState<string[]>([])
  const [shopQuery, setShopQuery] = useState(''), [sort, setSort] = useState<'directory' | 'name' | 'rating'>('directory')
  const [locationLabel, setLocationLabel] = useState(''), [source, setSource] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [rotation, setRotation] = useState(0), [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<Restaurant | null>(null), [pending, setPending] = useState<Restaurant | null>(null)
  const controller = useRef<AbortController | null>(null), areaInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null), sound = useRef(new RouletteSound())
  const [resultOpen, setResultOpen] = useState(false), [muted, setMuted] = useState(false), [ticker, setTicker] = useState('')
  const mutedRef = useRef(muted); mutedRef.current = muted
  const selected = places.filter(p => included.includes(p.id)), blocked = busy || spinning
  const hasRatings = places.some(p => p.rating != null)
  const visiblePlaces = places.filter(p => p.name.toLowerCase().includes(shopQuery.trim().toLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'rating' ? (b.rating ?? -1) - (a.rating ?? -1) || (b.reviews ?? 0) - (a.reviews ?? 0) || a.name.localeCompare(b.name) : 0)
  const googleResults = source === 'Google Maps' || places.some(p => p.rating !== undefined)
  const mallResults = source === 'Mall directory'
  const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`restaurants ${area.trim() || 'near me'}`)}`
  useEffect(() => () => { controller.current?.abort(); controller.current = null; sound.current.dispose() }, [])
  useEffect(() => { if (resultOpen && winner) dialogRef.current?.showModal(); else dialogRef.current?.close() }, [resultOpen, winner])
  useEffect(() => {
    if (!spinning || !pending) return
    const timer = window.setTimeout(() => { setWinner(pending); setSpinning(false); setPending(null); setResultOpen(true); if (!mutedRef.current) sound.current.celebrate() }, reduced ? 100 : 3250)
    return () => window.clearTimeout(timer)
  }, [spinning, pending, reduced])
  useEffect(() => {
    if (!spinning || reduced) return
    const timer = window.setInterval(() => setTicker(selected[randomIndex(selected.length)]?.name ?? ''), 120)
    return () => window.clearInterval(timer)
  }, [spinning, reduced, places, included])
  const reset = () => { controller.current?.abort(); controller.current = null; setBusy(false); sound.current.stop(); setSpinning(false); setPending(null); setResultOpen(false); setShopQuery(''); setSort('directory'); setPlaces([]); setIncluded([]); setWinner(null); setLocationLabel(''); setSource(''); setError(''); setRotation(0) }
  const chooseMode = (next: 'nearby' | 'mall') => { setMode(next); setMallKey(''); setMallCategory('meals'); reset() }
  const mallDirectory = (key: MallDirectoryKey | '') => MALL_DIRECTORIES.find(item => item.key === key)
  const mallPlaces = (key: MallDirectoryKey, category = mallCategory, overrides = mallOverrides) => {
    const directory = mallDirectory(key)
    return directory ? mallRestaurants(directory, category, overrides) : []
  }
  const chooseMall = (key: MallDirectoryKey, category: MallPlaceCategory = mallCategory) => {
    const directory = mallDirectory(key)
    if (!directory) return
    const next = mallPlaces(key, category)
    reset(); setMallKey(key); setPlaces(next); setIncluded(next.map(place => place.id)); setLocationLabel(`${directory.name} · ${directory.address}`); setSource('Mall directory')
  }
  const changeMallCategory = (category: MallPlaceCategory) => { setMallCategory(category); if (mallKey) chooseMall(mallKey, category) }
  const reclassifyMallPlace = (place: Restaurant) => {
    if (!mallKey) return
    const nextCategory: MallPlaceCategoryOverride = place.cuisine === 'Café / snack' ? 'meals' : 'cafe-snacks'
    const nextOverrides = { ...mallOverrides, [place.id]: nextCategory }
    setMallOverrides(nextOverrides)
    const next = mallPlaces(mallKey, mallCategory, nextOverrides)
    setPlaces(next)
    setIncluded(ids => ids.filter(id => next.some(item => item.id === id)))
    setWinner(null); setRotation(0)
  }
  function changeFilter<K extends keyof RestaurantFilters>(key: K, value: RestaurantFilters[K]) { reset(); setFilters(f => ({ ...f, [key]: value })) }
  async function search(useLocation: boolean) {
    if (blocked) return
    reset()
    const c = new AbortController(); controller.current = c
    setBusy(true)
    try {
      let location: { latitude: number; longitude: number } | { area: string }
      if (useLocation) {
        if (!navigator.geolocation) throw new Error('Location is unavailable. Type your area instead.')
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }))
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
      } else {
        if (!area.trim()) throw new Error('Enter a town, postcode or landmark first.')
        location = { area: area.trim() }
      }
      if (c.signal.aborted) return
      const timer = window.setTimeout(() => c.abort(), 26000)
      try { const found = await findRestaurants(location, filters, c.signal); if (!c.signal.aborted) { setPlaces(found.places); setIncluded(found.places.map(p=>p.id)); setLocationLabel(found.locationLabel); setSource(found.source || '') } } finally { window.clearTimeout(timer) }
    } catch (e) {
      if (controller.current === c) {
        if (useLocation && !c.signal.aborted) {
          setError('Could not get your location. Location access was blocked or unavailable. Allow it in your browser, or type a Malaysian area below.')
          window.setTimeout(() => areaInputRef.current?.focus(), 50)
        } else setError(c.signal.aborted ? 'Search timed out. Please try again.' : e instanceof Error ? e.message : 'Could not search. Please retry.')
      }
    }
    finally { if (controller.current === c) setBusy(false) }
  }
  function spin() {
    if (blocked || !selected.length) return
    const index = randomIndex(selected.length), mid = (index + .5) * 360 / selected.length
    const target = (360 - mid) % 360, current = ((rotation % 360) + 360) % 360
    setResultOpen(false); setWinner(null); setPending(selected[index]); setTicker(selected[index].name); setSpinning(true)
    if (!muted) sound.current.start(!!reduced)
    setRotation(rotation + 1800 + ((target - current + 360) % 360))
  }
  return <div className="eat-out-page"><TopBar inset />
    <header className="eat-out-heading"><button onClick={() => nav(`/food?date=${date}`)}><Icon name="arrow_back" size={18} />Food</button><h1>Makan mana?</h1><p>Find somewhere nearby. Spin when you can’t decide.</p></header>
    <div className="eat-out-fuel"><span><strong>{Math.max(0, fuel.proteinTarget - fuel.protein)} g</strong> protein left</span><span><strong>{Math.max(0, fuel.remaining).toLocaleString()} kcal</strong> left</span></div>
    <div className="eat-out-mode" role="tablist" aria-label="Restaurant source"><button type="button" role="tab" aria-selected={mode === 'nearby'} onClick={() => chooseMode('nearby')}>Nearby search</button><button type="button" role="tab" aria-selected={mode === 'mall'} onClick={() => chooseMode('mall')}>Mall directory</button></div>
    {mode === 'nearby' ? <section className="eat-out-search" aria-labelledby="eat-out-location"><h2 id="eat-out-location">Start somewhere.</h2><button className="eat-out-primary" disabled={blocked} onClick={() => void search(true)}><Icon name="my_location" size={20} />{busy ? 'Finding places…' : 'Use my location'}</button><p className="eat-out-note">Location is shared with free map services for this search. No background tracking or profile storage.</p>
      <form onSubmit={e => { e.preventDefault(); void search(false) }}><label htmlFor="eat-out-area">Or search a Malaysian area</label><div className="eat-out-area"><input ref={areaInputRef} id="eat-out-area" maxLength={120} placeholder="Town, postcode or landmark" value={area} disabled={blocked} onChange={e => { reset(); setArea(e.target.value) }} /><button disabled={blocked || !area.trim()} type="submit">Search</button></div></form>
      <fieldset disabled={blocked}><legend>How far?</legend><div className="eat-out-radius">{[1, 3, 5, 10].map(km => <button type="button" key={km} aria-pressed={filters.radiusKm === km} onClick={() => changeFilter('radiusKm', km)}>{km} km</button>)}<label>Custom km<input aria-label="Custom radius in kilometres" type="number" min={1} max={50} value={filters.radiusKm} onChange={e => changeFilter('radiusKm', Number(e.target.value))} /></label></div>
      </fieldset>
      <p className="eat-out-note">{googleResults ? 'Google ratings and review counts are shown for this search. Menu nutrition isn’t supplied.' : source === 'OpenStreetMap' ? 'Free OpenStreetMap search—no Google billing needed. Ratings, prices and live opening status aren’t supplied.' : 'Search is user-triggered. Google ratings appear when the server key is configured; otherwise the app uses free map data.'}</p><small>Radius is straight-line distance, not driving distance. Shared services may be busy; coverage varies by area.</small>
    </section> : <section className="eat-out-search eat-out-mall-search" aria-labelledby="eat-out-mall"><h2 id="eat-out-mall">Pick a mall.</h2><p className="eat-out-note">Browse the mall’s published Food &amp; Beverage directory. Known pork, alcohol and bar listings are removed.</p><div className="eat-out-mall-filter" role="group" aria-label="Mall food category"><button type="button" aria-pressed={mallCategory === 'meals'} onClick={() => changeMallCategory('meals')}>Meals</button><button type="button" aria-pressed={mallCategory === 'cafe-snacks'} onClick={() => changeMallCategory('cafe-snacks')}>Cafés &amp; snacks</button><button type="button" aria-pressed={mallCategory === 'all'} onClick={() => changeMallCategory('all')}>All F&amp;B</button></div><div className="eat-out-mall-grid">{MALL_DIRECTORIES.map(directory => <button type="button" key={directory.key} className={mallKey === directory.key ? 'is-selected' : ''} aria-pressed={mallKey === directory.key} onClick={() => chooseMall(directory.key)}><strong>{directory.name}</strong><span>{directory.address}</span><small>{mallRestaurants(directory, 'meals', mallOverrides).length} meal spots · {mallRestaurants(directory, 'cafe-snacks', mallOverrides).length} cafés &amp; snacks</small></button>)}</div><small>Directory snapshots can change when tenants move. Every place in the selected category starts included. Untick any you don’t want—there’s no 10-place limit.</small></section>}
    <div role="status" aria-live="polite">{busy && <p>Finding places mapped nearby…</p>}{error && <div className="eat-out-error"><strong>Search couldn’t finish.</strong><p>{error}</p><button type="button" className="eat-out-error-action" onClick={() => { setError(''); window.setTimeout(() => areaInputRef.current?.focus(), 0) }}>Search by area instead</button><a href={mapsSearch} target="_blank" rel="noopener noreferrer">Search Google Maps instead<Icon name="open_in_new" size={16} /></a></div>}</div>
    {!busy && !error && !locationLabel && <p className="eat-out-note">Choose a location to build your shortlist. Nothing is picked or logged automatically.</p>}
    {locationLabel && <section className="eat-out-shortlist"><h2>{places.length ? `${places.length} places. Your call.` : 'No matches this time.'}</h2><p>{mallResults ? locationLabel : `${locationLabel} · within ${filters.radiusKm} km`}</p>{!places.length ? <p>{mallResults ? 'This mall has no eligible names in the current snapshot.' : `Try a wider radius or another area. ${googleResults ? 'Google may not have matching places with the current coverage.' : 'OpenStreetMap may not have nearby places mapped yet.'}`}</p> : <>
      <p>{googleResults ? 'Ranked using Google rating, review count and distance among results returned—not a complete restaurant directory.' : mallResults ? 'Published mall directory, with reviewed pork/alcohol exclusions.' : 'Nearest among the mapped results returned—not a best-rated ranking or a complete restaurant directory.'}</p>
      <div className="eat-out-wheel-section">
        <div className="eat-out-spin-heading"><h3>Leave it to the spin.</h3><button type="button" className="eat-out-sound" aria-pressed={!muted} aria-label={muted ? 'Turn sound on' : 'Mute sound'} onClick={() => { setMuted(!muted); if (!muted) sound.current.stop() }}><Icon name={muted ? 'volume_off' : 'volume_up'} size={20} />{muted ? 'Sound off' : 'Sound on'}</button></div>
        <div className="eat-out-wheel-wrap" aria-hidden="true"><span className="eat-out-pointer" /><div className="eat-out-wheel" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: reduced ? '0s' : '3.1s', background: selected.length ? `conic-gradient(${Array.from({ length: Math.min(selected.length, 20) }, (_, i) => `${colors[i % colors.length]} ${i * 100 / Math.min(selected.length, 20)}% ${(i + 1) * 100 / Math.min(selected.length, 20)}%`).join(',')})` : '#e8edf5' }} /><div className="eat-out-wheel-center"><Icon name="restaurant" size={32} /><span>{spinning ? 'Picking…' : 'Let’s eat'}</span></div></div>
        <div className="eat-out-ticker" aria-hidden="true">{spinning ? ticker : winner?.name ?? 'Your next favourite awaits.'}</div>
        <button className="eat-out-primary" disabled={!selected.length || blocked} onClick={spin}><Icon name="casino" size={22} />{spinning ? 'Finding your next stop…' : winner ? 'Spin again' : `Spin all ${selected.length} places`}</button>
        <p aria-live="polite">{spinning ? 'Spinning your choices…' : selected.length ? `${selected.length} places included. Every place has an equal chance.` : 'Include at least one place below to spin.'}</p>
        {winner && <button type="button" className="eat-out-reopen" onClick={() => setResultOpen(true)}>View your pick<Icon name="arrow_forward" size={18} /></button>}
      </div>
      <dialog ref={dialogRef} className="eat-out-winner-dialog" aria-labelledby="eat-out-winner-title" onCancel={() => setResultOpen(false)} onClose={() => setResultOpen(false)}>
        {winner && <div className="eat-out-winner-content">
          <button type="button" autoFocus className="eat-out-winner-close" aria-label="Close your pick" onClick={() => setResultOpen(false)}><Icon name="close" size={24} /></button>
          <div className="eat-out-winner-stamp" aria-hidden="true"><Icon name="restaurant" size={38} /></div>
          <p className="eat-out-winner-intro">Decision made. Jom makan!</p>
          <h2 id="eat-out-winner-title">{winner.name}</h2><p className="eat-out-winner-address">{winner.address}</p>
          {winner.rating != null && <p className="eat-out-winner-rating">Google {winner.rating.toFixed(1)} / 5 · {(winner.reviews ?? 0).toLocaleString()} reviews</p>}
          <a className="eat-out-primary" href={safeLink(winner.mapsUrl)} target="_blank" rel="noopener noreferrer">Let’s go · open Maps<Icon name="open_in_new" size={18} /></a>
          <div className="eat-out-winner-actions"><button type="button" onClick={spin}><Icon name="casino" size={20} />Spin again</button><button type="button" onClick={() => { setResultOpen(false); nav(`/food?add=1&date=${date}`) }}>Find food to log<Icon name="arrow_forward" size={18} /></button></div>
          <small>Nothing logged automatically. Check opening hours before heading out.</small>
        </div>}
      </dialog>

      <div className="eat-out-list-tools">
        <label htmlFor="eat-out-shop-search">Find a place in this list<div className="eat-out-shop-search"><Icon name="search" size={20} /><input id="eat-out-shop-search" type="search" placeholder="Search shop name…" value={shopQuery} onChange={e => setShopQuery(e.target.value)} /></div></label>
        <div><label htmlFor="eat-out-sort">Sort by</label><select id="eat-out-sort" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="directory">Original order</option><option value="name">Name · A–Z</option><option value="rating" disabled={!hasRatings}>Google rating · highest first{!hasRatings ? ' (unavailable)' : ''}</option></select></div>
        <p aria-live="polite">{visiblePlaces.length} of {places.length} places shown · {selected.length} in your spin</p>
        {!hasRatings && <small>Mall directories don’t provide Google ratings. Rating sort becomes available for search results with real ratings.</small>}
        <small>Searching and sorting only change this list, not your spin pool.</small>
      </div>
      {!visiblePlaces.length && <p className="eat-out-empty-search">No places match “{shopQuery}”. <button type="button" onClick={() => setShopQuery('')}>Clear search</button></p>}
      <ol className="eat-out-list">{visiblePlaces.map(p => <li key={p.id}><div className="eat-out-place-title"><span>{places.findIndex(item => item.id === p.id) + 1}</span><h3>{p.name}</h3></div><p>{p.address}</p><div className="eat-out-place-data">{p.rating !== undefined && p.rating !== null ? <><strong>Google {p.rating.toFixed(1)} / 5</strong><span>{(p.reviews ?? 0).toLocaleString()} reviews</span><span>{p.openNow === true ? 'Open now' : p.openNow === false ? 'Closed now' : 'Hours unknown'}</span></> : <span>{p.cuisine || 'Cuisine not recorded'}</span>}<span>{mallResults ? 'Inside mall' : `${p.distanceKm} km`}</span></div>{p.halalStatus && !/unknown/i.test(p.halalStatus) && <p>{p.halalStatus}</p>}<details><summary>{googleResults ? 'Opening hours' : mallResults ? 'Mall hours note' : 'Mapped opening hours'}</summary><p>{p.openingHours || 'Opening hours not recorded.'} {googleResults ? 'Google data can change; verify before going.' : mallResults ? 'Directory listings and hours can change; verify the outlet before going.' : 'These are community map notes, not live opening status.'}</p></details><div className="eat-out-place-links"><a href={safeLink(p.mapsUrl)} target="_blank" rel="noopener noreferrer">Maps &amp; reviews<Icon name="open_in_new" size={15} /></a><a href={`https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${p.name} ${p.address}`)}`} target="_blank" rel="noopener noreferrer">Search Tripadvisor<Icon name="open_in_new" size={15} /></a>{p.osmUrl && <a href={safeLink(p.osmUrl)} target="_blank" rel="noopener noreferrer">Map source<Icon name="open_in_new" size={15} /></a>}</div>{mallResults && <button type="button" className="eat-out-reclassify" disabled={blocked} onClick={() => reclassifyMallPlace(p)}>{p.cuisine === 'Café / snack' ? 'Move back to meals' : 'Not a restaurant? Move to cafés & snacks'}</button>}<label className="eat-out-check"><input disabled={blocked} type="checkbox" checked={included.includes(p.id)} onChange={e => { setWinner(null); setRotation(0); setIncluded(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id)) }} />Include in spin<span className="sr-only"> {p.name}</span></label></li>)}</ol>
    </>}<p className="eat-out-attribution">{mallResults ? <>Directory snapshot: <a href={MALL_DIRECTORIES.find(item => item.key === mallKey)?.sourceUrl ?? 'https://www.ioicitymall.com.my/?cat=36&tenantlist=full'} target="_blank" rel="noopener noreferrer">official mall source</a>. Listings and tenants may change.</> : googleResults ? <>Restaurant data: <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>. Tripadvisor links open an external search; ratings and hours can change.</> : <>Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · ODbL. Area search: Photon. Google Maps and Tripadvisor links are external searches; their ratings aren’t integrated.</>}</p></section>}
  </div>
}
