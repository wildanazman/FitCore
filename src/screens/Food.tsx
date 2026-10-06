import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { ProteinIdeas } from '../components/ProteinIdeas'
import { ChatFoodImport } from '../components/ChatFoodImport'
import { CountUp, Press, Reveal, listContainer, spring } from '../components/motion'
import { todayISO, timeLabel, uid } from '../lib/date'
import { dayFuel } from '../lib/nutrition'
import { dietDef, dietWarnings, nowMinutes, windowState } from '../lib/diet'
import { slotForNow } from '../lib/foodAI'
import { QUICK_FOODS } from '../lib/quickFoods'
import { searchLocalFoods, type LocalFood } from '../lib/localFoods'
import { lookupFood, resultToLocalFood, sourceLabel, type LookupResult } from '../lib/foodLookup'
import { RESTAURANT_BRANDS, hasCompleteMacros, searchRestaurantFoods, type RestaurantBrand, type RestaurantFood } from '../lib/restaurantFoods'
import type { DietWarning } from '../lib/diet'
import type { FoodEntry } from '../types'
import type { MealSlot } from '../types'
import type { ChatFoodEstimate } from '../lib/chatFoodImport'
import './food.css'

export function Food() {
  const { state, profile, weightKg, addFood, updateFood, removeFood } = useApp()
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todayISO()
  const [editing, setEditing] = useState<FoodEntry | null>(null)
  const [searchOpen, setSearchOpen] = useState(searchParams.get('add') === '1')
  const [chatImportOpen, setChatImportOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>(slotForNow())

  const fuel = dayFuel(profile, weightKg, today, state.foods, state.sessions)
  const todayFoods = state.foods.filter((f) => f.date === today).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
  const calPct = fuel.budget ? Math.min(100, (fuel.consumed / fuel.budget) * 100) : 0

  const def = dietDef(profile.dietMode)
  const win = def.kind === 'window' ? windowState(profile.eatingWindowStartHour, profile.dietMode, nowMinutes()) : undefined
  const warnings = dietWarnings(profile.dietMode, { foods: state.foods, date: today, netCarbCapG: profile.netCarbCapG, window: win })
  const quickFoods = QUICK_FOODS[profile.dietMode] ?? []

  const quickAdd = (q: { name: string; emoji: string; kcal: number; protein: number; carbs: number; fat: number }) => {
    addFood({
      id: uid(), name: q.name, emoji: q.emoji, date: today, loggedAt: new Date().toISOString(),
      slot: selectedSlot, kcal: q.kcal, protein: q.protein, carbs: q.carbs, fat: q.fat, servings: 1, confidence: 1,
    })
  }

  const closeSearch = () => {
    setSearchOpen(false)
    if (searchParams.has('add')) setSearchParams((current) => { const next = new URLSearchParams(current); next.delete('add'); return next }, { replace: true })
  }

  const addLocal = (f: LocalFood, slot: MealSlot) => {
    addFood({ id: uid(), name: f.name, emoji: f.emoji, date: today, loggedAt: new Date().toISOString(), slot, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, servings: 1, confidence: 1 })
    closeSearch()
  }

  const addChatEstimate = (estimate: ChatFoodEstimate, slot: MealSlot) => {
    addFood({ id: uid(), name: estimate.name.trim(), emoji: '', date: today, loggedAt: new Date().toISOString(), slot, kcal: estimate.kcal, protein: estimate.protein, carbs: estimate.carbs, fat: estimate.fat, servings: 1, confidence: 0.5 })
    setChatImportOpen(false)
  }

  return (
    <motion.div variants={listContainer} className="food-page px-margin-mobile pt-sm space-y-lg">
      <TopBar />
      <header className="food-hero">
        <div className="food-hero-top"><span>NUTRITION / TODAY</span><span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</span></div>
        <h1>Eat with<br /><em>intention.</em></h1>
        <p>Every meal moves the number. Capture it, check the estimate, keep going.</p>
        <button type="button" className="food-capture" onClick={() => nav('/camera')}><span className="food-capture-icon"><Icon name="photo_camera" size={24} /></span><span>CAPTURE A MEAL</span><Icon name="arrow_outward" size={22} /></button>
      </header>

      <Reveal>
        <section className="food-score" aria-label="Daily calorie summary">
          <div className="food-score-top"><span>01 / DAILY ENERGY</span><span>{Math.round(calPct)}% USED</span></div>
          <div className="food-score-main"><div><span>{fuel.remaining < 0 ? 'OVER TARGET' : 'LEFT TO EAT'}</span><strong>{Math.abs(fuel.remaining).toLocaleString()}</strong><small>KCAL</small></div><div className="food-score-ring" style={{ background: `conic-gradient(#c9f24e ${calPct}%, #373e35 ${calPct}%)` }}><div><Icon name="restaurant" size={26} /></div></div></div>
          <div className="food-score-rule" />
          <div className="food-score-bottom"><div><span>EATEN</span><strong>{fuel.consumed.toLocaleString()}</strong></div><div><span>DAILY TARGET</span><strong>{fuel.budget.toLocaleString()}</strong></div></div>
          <div className="food-score-track" role="progressbar" aria-label={`${fuel.consumed} of ${fuel.budget} calories eaten`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(calPct)}><span style={{ width: `${calPct}%` }} /></div>
          {fuel.trainingBonus > 0 && <p className="food-score-note">+{fuel.trainingBonus} kcal activity allowance included</p>}
        </section>
      </Reveal>

      {/* Diet warnings */}
      {warnings.length > 0 && (
        <Reveal>
          <div className="space-y-sm">{warnings.map((w, i) => <WarnRow key={i} w={w} />)}</div>
        </Reveal>
      )}

      {/* Macro cards */}
      <Reveal><section className="food-macro-section"><div className="food-editorial-heading"><span>02 / THE BREAKDOWN</span><h2>Macros, at a glance.</h2></div><div className="food-macros"><MacroCard label="Protein" v={fuel.protein} t={fuel.proteinTarget} /><MacroCard label="Carbs" v={fuel.carbs} t={fuel.carbTarget} /><MacroCard label="Fat" v={fuel.fat} t={fuel.fatTarget} /></div></section></Reveal>

      {/* Quick add */}
      <Reveal><ProteinIdeas target={fuel.proteinTarget} eaten={fuel.protein} /></Reveal>

      {/* Quick add */}
      <Reveal>
        <div>
          <div className="food-editorial-heading"><span>03 / FAST TRACK · {def.short.toUpperCase()}</span><h2>Quick add.</h2></div>
          <div className="food-slots" role="group" aria-label="Meal to log">{(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((slot) => <button key={slot} type="button" aria-pressed={selectedSlot === slot} onClick={() => setSelectedSlot(slot)}>{slot}</button>)}</div>
          <div className="flex gap-sm overflow-x-auto no-scrollbar mt-sm pb-1">
            {quickFoods.map((q) => (
              <Press key={q.name} onClick={() => quickAdd(q)} className="shrink-0 flex items-center gap-sm bg-ink-card border border-white/5 rounded-full pl-sm pr-md py-sm">
                <Icon name="restaurant" size={20} className="text-lime" />
                <span className="text-left">
                  <span className="block font-body-md text-[13px] text-on-surface whitespace-nowrap">{q.name}</span>
                  <span className="block font-data-mono text-[11px] text-on-surface-variant">{q.kcal} kcal · {q.carbs}c</span>
                </span>
                <Icon name="add_circle" className="text-lime" size={20} />
              </Press>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Log */}
      <Reveal>
        <div>
          <div className="food-editorial-heading"><span>04 / YOUR TIMELINE</span><h2>What you've eaten.</h2></div>
          <button type="button" className="food-find" onClick={() => setSearchOpen(true)}><Icon name="search" size={21} /><span>Search food or add your own</span><Icon name="arrow_forward" size={20} /></button>
          <button type="button" className="food-chat-import" onClick={() => setChatImportOpen(true)}><Icon name="content_paste" size={20} /><span>Paste a ChatGPT food estimate</span><Icon name="arrow_forward" size={20} /></button>
          <div className="space-y-sm mt-sm">
            {todayFoods.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant text-center py-md">No meals logged yet. Capture one or find a food above.</p>}
            {todayFoods.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, ...spring }}>
                <Press as="div" onClick={() => setEditing(f)} className="rounded-[20px] bg-ink-card border border-white/5 p-sm flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-md">
                    {f.photo ? <img src={f.photo} alt="" className="w-11 h-11 rounded-xl object-cover" /> : <div className="w-11 h-11 rounded-xl bg-lime/10 flex items-center justify-center text-lime"><Icon name="restaurant" size={22} /></div>}
                    <div>
                      <div className="font-metric-md text-[15px] text-on-surface">{f.name}{f.servings !== 1 && <span className="text-on-surface-variant"> ×{f.servings}</span>}</div>
                      <div className="font-data-mono text-[11px] text-on-surface-variant capitalize">{f.slot} · {timeLabel(f.loggedAt)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-data-mono text-[13px] text-on-surface">{Math.round(f.kcal * f.servings)} kcal</div>
                    <div className="font-data-mono text-[11px] text-lime">{Math.round(f.protein * f.servings)}g Pro</div>
                  </div>
                </Press>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>

      {searchOpen && <SearchSheet initialSlot={selectedSlot} onClose={closeSearch} onPick={addLocal} />}
      {chatImportOpen && <ChatFoodImport initialSlot={selectedSlot} onClose={() => setChatImportOpen(false)} onSave={addChatEstimate} />}

      {editing && (
        <FoodEditSheet
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => { updateFood(editing.id, patch); setEditing(null) }}
          onDelete={() => { removeFood(editing.id); setEditing(null) }}
        />
      )}
    </motion.div>
  )
}

function SearchSheet({ initialSlot, onClose, onPick }: { initialSlot: MealSlot; onClose: () => void; onPick: (f: LocalFood, slot: MealSlot) => void }) {
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState(false)
  const [slot, setSlot] = useState<MealSlot>(initialSlot)
  const [brand, setBrand] = useState<RestaurantBrand | null>(null)
  const [customDefaults, setCustomDefaults] = useState<{ name: string; kcal: number | null } | null>(null)
  const [online, setOnline] = useState<LookupResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [onlineErr, setOnlineErr] = useState<string | null>(null)
  const results = brand ? [] : searchLocalFoods(q, 30)
  const restaurantResults = q.trim() || brand ? searchRestaurantFoods(q, brand, 45) : []

  const chooseRestaurant = (item: RestaurantFood) => {
    if (hasCompleteMacros(item)) {
      onPick({ name: `${item.brand} · ${item.name}`, emoji: '', category: 'Basics', serving: item.serving, kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat }, slot)
      return
    }
    setCustomDefaults({ name: `${item.brand} · ${item.name}`, kcal: item.kcal })
    setCustom(true)
  }

  const searchOnline = async () => {
    const name = q.trim()
    if (!name || searching) return
    setSearching(true)
    setOnline(null)
    setOnlineErr(null)
    try {
      setOnline(await lookupFood(name))
    } catch (err) {
      setOnlineErr(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setSearching(false)
    }
  }
  return createPortal(
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-[480px] bg-ink-card rounded-t-[28px] border-t border-white/10 p-margin-mobile pb-xl max-h-[85%] flex flex-col"
        role="dialog" aria-modal="true" aria-labelledby="food-search-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 320 }} animate={{ y: 0 }} transition={spring}
      >
        <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-md" />
        <div className="flex items-center justify-between gap-sm mb-sm">
          <h2 id="food-search-title" className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{custom ? 'Custom food' : 'Add food'}</h2>
          <div className="flex items-center gap-sm">
            {custom && <button type="button" onClick={() => { setCustomDefaults(null); setCustom(false) }} className="font-data-mono text-[12px] text-lime flex items-center gap-1"><Icon name="search" size={16} /> Search</button>}
            <button type="button" onClick={onClose} aria-label="Close food search" className="text-on-surface-variant"><Icon name="close" size={22} /></button>
          </div>
        </div>

        <div className="food-search-slots" role="group" aria-label="Meal to log">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((option) => <button type="button" key={option} aria-pressed={slot === option} onClick={() => setSlot(option)}>{option}</button>)}
        </div>

        {custom ? (
          <CustomFoodForm key={customDefaults?.name ?? 'manual'} onSubmit={(food) => onPick(food, slot)} defaultName={customDefaults?.name ?? q} defaultKcal={customDefaults?.kcal ?? null} requireMacros={customDefaults !== null} />
        ) : (
          <>
            <div className="flex items-center gap-2 bg-ink rounded-full px-md py-2 mb-md">
              <Icon name="search" className="text-on-surface-variant" size={18} />
              <input
                autoFocus aria-label="Search food or restaurant" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="mi sedaap, buttermilk chicken, teh tarik…"
                className="flex-1 bg-transparent text-on-surface font-body-md focus:outline-none placeholder:text-on-surface-variant"
              />
            </div>
            <div className="food-brand-filters" role="group" aria-label="Filter restaurant">
              <button type="button" aria-pressed={brand === null} onClick={() => setBrand(null)}>All</button>
              {RESTAURANT_BRANDS.map((name) => <button type="button" key={name} aria-pressed={brand === name} onClick={() => setBrand(name)}>{name}</button>)}
            </div>
            <div className="overflow-y-auto no-scrollbar space-y-sm">
              {!q.trim() && !brand && <p className="font-body-md text-[12px] text-on-surface-variant">Search a meal or choose a restaurant to browse its offline menu.</p>}
              {results.length === 0 && restaurantResults.length === 0 && (
                <div className="text-center py-md">
                  <p className="font-body-md text-body-md text-on-surface-variant mb-md">No match for “{q}”.</p>
                  <p className="font-body-md text-[12px] text-on-surface-variant">Try another name or search online. If it is still missing, enter it manually below.</p>
                  {q.trim() && <button type="button" className="food-manual-fallback" onClick={() => { setCustomDefaults(null); setCustom(true) }}><Icon name="edit" size={17} /> Enter this food manually</button>}
                </div>
              )}
              {restaurantResults.length > 0 && <p className="font-data-mono text-[10px] tracking-widest text-lime uppercase pt-sm">Malaysia restaurant menu · offline</p>}
              {restaurantResults.map((item) => (
                <div key={`${item.brand}:${item.name}`} className="food-restaurant-result">
                  <button type="button" onClick={() => chooseRestaurant(item)} className="food-restaurant-main">
                    <span className="food-restaurant-identity"><strong>{item.name}</strong><small>{item.brand} · {item.serving}</small></span>
                    <span className="food-restaurant-numbers"><strong>{item.kcal === null ? 'No verified kcal' : `${item.kcal} kcal`}</strong><small>{hasCompleteMacros(item) ? `${item.protein}P · ${item.carbs}C · ${item.fat}F` : item.kcal === null ? 'Add your own values' : 'Calories only · add macros to log'}</small></span>
                  </button>
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="food-restaurant-source">{item.sourceLabel} <Icon name="open_in_new" size={12} /></a>
                  {item.note && <p className="food-restaurant-note">{item.note}</p>}
                </div>
              ))}
              {results.length > 0 && <p className="font-data-mono text-[10px] tracking-widest text-on-surface-variant uppercase pt-sm">General food references</p>}
              {results.map((f) => (
                <Press key={f.name} onClick={() => onPick(f, slot)} className="w-full rounded-[18px] bg-ink border border-white/5 p-sm flex items-center justify-between text-left cursor-pointer">
                  <div className="flex items-center gap-md">
                    <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-lime"><Icon name="restaurant" size={21} /></div>
                    <div>
                      <div className="font-metric-md text-[14px] text-on-surface leading-tight">{f.name}</div>
                      <div className="font-data-mono text-[11px] text-on-surface-variant">{f.serving} · {f.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-data-mono text-[13px] text-on-surface">{f.kcal} kcal</div>
                    <div className="font-data-mono text-[10px] text-on-surface-variant">{f.protein}P {f.carbs}C {f.fat}F</div>
                  </div>
                </Press>
              ))}

              {/* Online lookup */}
              {q.trim().length > 1 && (
                <div className="pt-sm">
                  {!online && !searching && (
                    <Press onClick={searchOnline} className="w-full rounded-[18px] border border-dashed border-lime/40 bg-lime/5 p-sm flex items-center justify-center gap-2 text-lime">
                      <Icon name="travel_explore" size={18} /> Search online for “{q.trim()}”
                    </Press>
                  )}
                  {searching && (
                    <div className="rounded-[18px] bg-ink border border-white/5 p-md flex items-center gap-md">
                      <span className="w-5 h-5 rounded-full border-2 border-lime/30 border-t-lime animate-spin shrink-0" />
                      <p className="font-body-md text-[13px] text-on-surface-variant">Searching nutrition databases online — this can take a moment…</p>
                    </div>
                  )}
                  {onlineErr && !searching && (
                    <p className="font-data-mono text-[11px] text-pink-deep text-center py-sm">Couldn’t find it online ({onlineErr}). Try “Enter my own”.</p>
                  )}
                  {online && !searching && (
                    <Press onClick={() => onPick(resultToLocalFood(online), slot)} className="w-full rounded-[18px] bg-ink border border-lime/30 p-sm flex items-center justify-between text-left cursor-pointer">
                      <div className="flex items-center gap-md min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-lime"><Icon name="restaurant" size={21} /></div>
                        <div className="min-w-0">
                          <div className="font-metric-md text-[14px] text-on-surface leading-tight truncate">{online.name}</div>
                          <div className="font-data-mono text-[11px] text-lime">{online.serving} · {sourceLabel(online.source)}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-data-mono text-[13px] text-on-surface">{online.kcal} kcal</div>
                        <div className="font-data-mono text-[10px] text-on-surface-variant">{online.protein}P {online.carbs}C {online.fat}F</div>
                      </div>
                    </Press>
                  )}
                </div>
              )}
              {q.trim().length > 0 && (results.length > 0 || restaurantResults.length > 0) && <button type="button" className="food-manual-fallback" onClick={() => { setCustomDefaults(null); setCustom(true) }}><Icon name="edit" size={17} /> Still not there? Enter manually</button>}
            </div>
            <p className="font-data-mono text-[10px] text-on-surface-variant text-center mt-md">Restaurant values are stored offline. Menu and portions can change; check the linked source.</p>
          </>
        )}
      </motion.div>
    </motion.div>, document.body
  )
}

function CustomFoodForm({ onSubmit, defaultName, defaultKcal, requireMacros }: { onSubmit: (f: LocalFood) => void; defaultName: string; defaultKcal: number | null; requireMacros: boolean }) {
  const [name, setName] = useState(defaultName)
  const [kcal, setKcal] = useState(defaultKcal === null ? '' : String(defaultKcal))
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  const p = Number(protein) || 0
  const c = Number(carbs) || 0
  const f = Number(fat) || 0
  // Auto-fill kcal from macros if the user leaves it blank.
  const fromMacros = Math.round(p * 4 + c * 4 + f * 9)
  const kcalNum = Number(kcal) || fromMacros
  const valid = name.trim().length > 0 && kcalNum > 0 && (!requireMacros || (protein !== '' && carbs !== '' && fat !== ''))

  const save = () => {
    if (!valid) return
    onSubmit({
      name: name.trim(),
      emoji: '',
      category: 'Basics',
      serving: '1 serving',
      kcal: kcalNum,
      protein: p,
      carbs: c,
      fat: f,
    })
  }

  return (
    <div className="space-y-md overflow-y-auto no-scrollbar">
      <label className="block">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Food name</span>
        <input
          autoFocus value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mi Sedaap Goreng"
          className="mt-1 w-full bg-ink border border-white/10 rounded-xl px-md py-2 text-on-surface font-body-md focus:border-lime focus:outline-none"
        />
      </label>
      <div className="grid grid-cols-2 gap-sm">
        <NumInput label="Calories (kcal)" value={kcal} onChange={setKcal} placeholder={fromMacros ? String(fromMacros) : '0'} />
        <NumInput label="Protein (g)" value={protein} onChange={setProtein} />
        <NumInput label="Carbs (g)" value={carbs} onChange={setCarbs} />
        <NumInput label="Fat (g)" value={fat} onChange={setFat} />
      </div>
      {requireMacros && <p className="font-body-md text-[12px] text-on-surface-variant">This restaurant reference has {defaultKcal === null ? 'no verified calories or macros' : 'verified calories but no macros'}. Enter the missing values from a label or your own estimate before logging; zero is only for a true zero.</p>}
      {fromMacros > 0 && !kcal && (
        <p className="font-data-mono text-[11px] text-lime">Calories auto-filled from macros: {fromMacros} kcal (edit above to override).</p>
      )}
      <Press onClick={save} disabled={!valid} className="w-full py-3 rounded-full bg-lime text-on-lime font-metric-md flex items-center justify-center gap-2 disabled:opacity-40">
        <Icon name="check" size={18} /> Log this food
      </Press>
      <p className="font-data-mono text-[10px] text-on-surface-variant text-center">Tip: read the value off the packet, or leave calories blank to compute from macros.</p>
    </div>
  )
}

function NumInput({ label, value, onChange, placeholder = '0' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block bg-ink border border-white/10 rounded-xl px-md py-2">
      <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">{label}</span>
      <input
        type="number" inputMode="decimal" min={0} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-transparent text-on-surface font-metric-md text-[16px] focus:outline-none placeholder:text-on-surface-variant/50"
      />
    </label>
  )
}

function WarnRow({ w }: { w: DietWarning }) {
  const tone = { good: 'border-lime text-lime', warn: 'border-pink text-pink-deep', error: 'border-error text-error' }[w.tone]
  return (
    <div className={`bg-ink-card border-l-2 rounded-r-[16px] p-sm flex items-start gap-2 ${tone}`}>
      <Icon name={w.icon} size={16} className="mt-0.5" />
      <p className="font-body-md text-[13px] text-on-surface">{w.text}</p>
    </div>
  )
}

function MacroCard({ label, v, t }: { label: string; v: number; t: number }) {
  const pct = t ? Math.min(100, (v / t) * 100) : 0
  return (
    <div className="food-macro">
      <span>{label}</span>
      <strong><CountUp value={v} /><small> / {t} g</small></strong>
      <div role="progressbar" aria-label={`${v} of ${t} grams ${label.toLowerCase()}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><span style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function FoodEditSheet({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: FoodEntry
  onClose: () => void
  onSave: (patch: Partial<FoodEntry>) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState(entry)
  const [servings, setServings] = useState(entry.servings)
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)

  async function updateFromOnline() {
    const name = draft.name.trim()
    if (!name || lookupState === 'loading') return
    setLookupState('loading')
    setLookupMessage(null)
    try {
      const result = await lookupFood(name)
      setDraft((current) => ({
        ...current,
        name: result.name,
        emoji: result.emoji || current.emoji,
        kcal: result.kcal,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        confidence: result.confidence,
      }))
      setServings(1)
      setLookupState('idle')
      setLookupMessage(`Updated from ${sourceLabel(result.source)} (${result.serving}).`)
    } catch (err) {
      setLookupState('error')
      setLookupMessage(err instanceof Error ? err.message : 'Online lookup failed')
    }
  }

  return createPortal(
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-[480px] bg-ink-card rounded-t-[28px] border-t border-white/10 p-margin-mobile pb-xl"
        role="dialog" aria-modal="true" aria-label={`Edit ${entry.name}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 260 }} animate={{ y: 0 }} exit={{ y: 260 }} transition={spring}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2}
        onDragEnd={(_, info) => { if (info.offset.y > 120) onClose() }}
      >
        <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-md" />
        <div className="flex items-center gap-md mb-lg">
          <div className="w-12 h-12 rounded-xl bg-lime/10 flex items-center justify-center text-lime"><Icon name="restaurant" size={23} /></div>
          <div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{draft.name}</h2>
            <p className="font-data-mono text-[12px] text-on-surface-variant">{Math.round(draft.kcal * servings)} kcal - {Math.round(draft.protein * servings)}g protein</p>
          </div>
        </div>
        <label className="flex flex-col gap-1 mb-md">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Food name</span>
          <input
            className="w-full bg-ink border border-outline-variant rounded-[18px] px-md py-3 text-on-surface font-data-mono focus:border-lime focus:outline-none"
            value={draft.name}
            onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value, confidence: 1 }))}
          />
        </label>
        <button
          onClick={updateFromOnline}
          disabled={lookupState === 'loading' || !draft.name.trim()}
          className="w-full mb-md py-3 rounded-[18px] bg-lime text-on-lime font-metric-md flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition"
        >
          {lookupState === 'loading' ? (
            <>
              <Icon name="progress_activity" size={18} className="animate-spin" /> Updating...
            </>
          ) : (
            <>
              Update calories online <Icon name="travel_explore" size={18} />
            </>
          )}
        </button>
        {lookupMessage && (
          <p className={`font-data-mono text-[11px] mb-md ${lookupState === 'error' ? 'text-error' : 'text-lime'}`}>
            {lookupMessage}
          </p>
        )}
        <div className="flex items-center justify-between bg-ink p-sm rounded-[18px] mb-lg">
          <span className="font-metric-md text-metric-md text-on-surface ml-sm">Servings</span>
          <div className="flex items-center gap-md">
            <Press onClick={() => setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))} className="w-10 h-10 rounded-full bg-ink-card flex items-center justify-center text-on-surface"><Icon name="remove" /></Press>
            <span className="font-display-hero text-metric-md text-on-surface w-10 text-center">{servings.toFixed(1)}</span>
            <Press onClick={() => setServings((s) => Math.round((s + 0.5) * 10) / 10)} className="w-10 h-10 rounded-full bg-lime text-on-lime flex items-center justify-center"><Icon name="add" /></Press>
          </div>
        </div>
        <div className="flex gap-md">
          <Press onClick={onDelete} className="flex-1 py-3 rounded-full border border-error/40 text-error font-metric-md flex items-center justify-center gap-2"><Icon name="delete" size={18} /> Delete</Press>
          <Press onClick={() => onSave({ name: draft.name.trim() || entry.name, emoji: draft.emoji, kcal: draft.kcal, protein: draft.protein, carbs: draft.carbs, fat: draft.fat, confidence: draft.confidence, servings })} className="flex-[2] py-3 rounded-full bg-lime text-on-lime font-metric-md flex items-center justify-center gap-2">Save <Icon name="check" size={18} /></Press>
        </div>
      </motion.div>
    </motion.div>, document.body
  )
}
