import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { CountUp, Press, Reveal, listContainer, spring } from '../components/motion'
import { todayISO, timeLabel, uid } from '../lib/date'
import { dayFuel } from '../lib/nutrition'
import { dietDef, dietWarnings, nowMinutes, windowState } from '../lib/diet'
import { slotForNow } from '../lib/foodAI'
import { QUICK_FOODS } from '../lib/quickFoods'
import { searchLocalFoods, type LocalFood } from '../lib/localFoods'
import { lookupFood, resultToLocalFood, sourceLabel, type LookupResult } from '../lib/foodLookup'
import type { DietWarning } from '../lib/diet'
import type { FoodEntry } from '../types'

export function Food() {
  const { state, profile, weightKg, addFood, updateFood, removeFood } = useApp()
  const nav = useNavigate()
  const today = todayISO()
  const [editing, setEditing] = useState<FoodEntry | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

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
      slot: slotForNow(), kcal: q.kcal, protein: q.protein, carbs: q.carbs, fat: q.fat, servings: 1, confidence: 1,
    })
  }

  const addLocal = (f: LocalFood) => {
    quickAdd(f)
    setSearchOpen(false)
  }

  return (
    <motion.div variants={listContainer} className="px-margin-mobile pt-sm space-y-lg">
      <TopBar />

      {/* Snap hero (lime) */}
      <Reveal>
        <Press as="div" onClick={() => nav('/camera')} className="rounded-[28px] bg-lime text-on-lime p-lg flex flex-col items-center gap-md cursor-pointer relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-on-lime text-lime flex items-center justify-center">
            <Icon name="photo_camera" fill size={32} />
          </div>
          <div className="text-center">
            <p className="font-headline-lg-mobile text-headline-lg-mobile">Snap food photo</p>
            <p className="font-data-mono text-[12px] opacity-70">AI detects macros & calories instantly</p>
          </div>
        </Press>
      </Reveal>

      {/* Daily progress */}
      <Reveal>
        <div className="rounded-[24px] bg-ink-card border border-white/5 p-md">
          <div className="flex justify-between items-baseline mb-sm">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Daily progress</span>
            <span className="font-data-mono text-[13px] text-on-surface">
              <CountUp value={fuel.consumed} /> <span className="text-on-surface-variant">/ {fuel.budget.toLocaleString()} kcal</span>
            </span>
          </div>
          <div className="w-full h-3 bg-ink rounded-full overflow-hidden">
            <motion.div className="h-full bg-lime rounded-full" initial={{ width: 0 }} animate={{ width: `${calPct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          {fuel.trainingBonus > 0 && (
            <p className="font-data-mono text-[12px] text-lime mt-sm flex items-center gap-1">
              <Icon name="bolt" size={14} fill /> +{fuel.trainingBonus} kcal training bonus
            </p>
          )}
        </div>
      </Reveal>

      {/* Diet warnings */}
      {warnings.length > 0 && (
        <Reveal>
          <div className="space-y-sm">{warnings.map((w, i) => <WarnRow key={i} w={w} />)}</div>
        </Reveal>
      )}

      {/* Macro cards */}
      <Reveal>
        <div className="grid grid-cols-3 gap-sm">
          <MacroCard label="Protein" v={fuel.protein} t={fuel.proteinTarget} bg="bg-lilac" fg="text-on-lilac" />
          <MacroCard label="Carbs" v={fuel.carbs} t={fuel.carbTarget} bg="bg-pink" fg="text-on-pink" />
          <MacroCard label="Fat" v={fuel.fat} t={fuel.fatTarget} bg="bg-lime" fg="text-on-lime" />
        </div>
      </Reveal>

      {/* Quick add */}
      <Reveal>
        <div>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Quick add · {def.short}</span>
          <div className="flex gap-sm overflow-x-auto no-scrollbar mt-sm pb-1">
            {quickFoods.map((q) => (
              <Press key={q.name} onClick={() => quickAdd(q)} className="shrink-0 flex items-center gap-sm bg-ink-card border border-white/5 rounded-full pl-sm pr-md py-sm">
                <span className="text-[20px]">{q.emoji}</span>
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
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Today's log</span>
            <Press onClick={() => setSearchOpen(true)} className="flex items-center gap-1 text-lime font-data-mono text-[12px]">
              <Icon name="search" size={16} /> Search food
            </Press>
          </div>
          <div className="space-y-sm mt-sm">
            {todayFoods.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant text-center py-md">No meals yet. Snap one above.</p>}
            {todayFoods.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, ...spring }}>
                <Press as="div" onClick={() => setEditing(f)} className="rounded-[20px] bg-ink-card border border-white/5 p-sm flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-md">
                    {f.photo ? <img src={f.photo} alt="" className="w-11 h-11 rounded-full object-cover" /> : <div className="w-11 h-11 rounded-full bg-lilac/20 flex items-center justify-center text-[20px]">{f.emoji}</div>}
                    <div>
                      <div className="font-metric-md text-[15px] text-on-surface">{f.name}{f.servings !== 1 && <span className="text-on-surface-variant"> ×{f.servings}</span>}</div>
                      <div className="font-data-mono text-[11px] text-on-surface-variant">{timeLabel(f.loggedAt)}</div>
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

      {searchOpen && <SearchSheet onClose={() => setSearchOpen(false)} onPick={addLocal} />}

      {editing && (
        <EditSheet
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(servings) => { updateFood(editing.id, { servings }); setEditing(null) }}
          onDelete={() => { removeFood(editing.id); setEditing(null) }}
        />
      )}
    </motion.div>
  )
}

function SearchSheet({ onClose, onPick }: { onClose: () => void; onPick: (f: LocalFood) => void }) {
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState(false)
  const [online, setOnline] = useState<LookupResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [onlineErr, setOnlineErr] = useState<string | null>(null)
  const results = searchLocalFoods(q, 40)

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
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-[480px] bg-ink-card rounded-t-[28px] border-t border-white/10 p-margin-mobile pb-xl max-h-[85%] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 320 }} animate={{ y: 0 }} transition={spring}
      >
        <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-md" />
        <div className="flex items-center justify-between mb-sm">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{custom ? 'Custom food' : 'Add food'}</h2>
          <button onClick={() => setCustom((v) => !v)} className="font-data-mono text-[12px] text-lime flex items-center gap-1">
            <Icon name={custom ? 'search' : 'edit'} size={16} /> {custom ? 'Search' : 'Enter my own'}
          </button>
        </div>

        {custom ? (
          <CustomFoodForm onSubmit={onPick} defaultName={q} />
        ) : (
          <>
            <div className="flex items-center gap-2 bg-ink rounded-full px-md py-2 mb-md">
              <Icon name="search" className="text-on-surface-variant" size={18} />
              <input
                autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="mi sedaap, buttermilk chicken, teh tarik…"
                className="flex-1 bg-transparent text-on-surface font-body-md focus:outline-none placeholder:text-on-surface-variant"
              />
            </div>
            <div className="overflow-y-auto no-scrollbar space-y-sm">
              {results.length === 0 && (
                <div className="text-center py-md">
                  <p className="font-body-md text-body-md text-on-surface-variant mb-md">No match for “{q}”.</p>
                  <Press onClick={() => setCustom(true)} className="inline-flex items-center gap-2 bg-lime text-on-lime rounded-full px-lg py-2 font-metric-md text-[14px]">
                    <Icon name="add" size={18} /> Add it myself
                  </Press>
                </div>
              )}
              {results.map((f) => (
                <Press key={f.name} as="div" onClick={() => onPick(f)} className="rounded-[18px] bg-ink border border-white/5 p-sm flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-md">
                    <div className="w-10 h-10 rounded-full bg-lilac/15 flex items-center justify-center text-[20px]">{f.emoji}</div>
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
                    <Press as="div" onClick={() => onPick(resultToLocalFood(online))} className="rounded-[18px] bg-ink border border-lime/30 p-sm flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-md min-w-0">
                        <div className="w-10 h-10 rounded-full bg-lime/15 flex items-center justify-center text-[20px]">{online.emoji || '🍽️'}</div>
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
            </div>
            <p className="font-data-mono text-[10px] text-on-surface-variant text-center mt-md">Local list first · online search checks Open Food Facts + web.</p>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

function CustomFoodForm({ onSubmit, defaultName }: { onSubmit: (f: LocalFood) => void; defaultName: string }) {
  const [name, setName] = useState(defaultName)
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  const p = Number(protein) || 0
  const c = Number(carbs) || 0
  const f = Number(fat) || 0
  // Auto-fill kcal from macros if the user leaves it blank.
  const fromMacros = Math.round(p * 4 + c * 4 + f * 9)
  const kcalNum = Number(kcal) || fromMacros
  const valid = name.trim().length > 0 && kcalNum > 0

  const save = () => {
    if (!valid) return
    onSubmit({
      name: name.trim(),
      emoji: '🍽️',
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

function MacroCard({ label, v, t, bg, fg }: { label: string; v: number; t: number; bg: string; fg: string }) {
  const pct = t ? Math.min(100, (v / t) * 100) : 0
  return (
    <div className={`rounded-[20px] ${bg} ${fg} p-md flex flex-col items-center`}>
      <span className="font-display-hero text-headline-lg-mobile"><CountUp value={v} /><span className="text-metric-md">g</span></span>
      <span className="font-label-caps text-label-caps uppercase opacity-70">{label}</span>
      <div className="w-full bg-on-lime/15 h-1 mt-sm rounded-full overflow-hidden">
        <motion.div className="h-full bg-on-lime/60 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} />
      </div>
      <span className="font-data-mono text-[10px] opacity-60 mt-1">/ {t}g</span>
    </div>
  )
}

function EditSheet({ entry, onClose, onSave, onDelete }: { entry: FoodEntry; onClose: () => void; onSave: (s: number) => void; onDelete: () => void }) {
  const [servings, setServings] = useState(entry.servings)
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-[480px] bg-ink-card rounded-t-[28px] border-t border-white/10 p-margin-mobile pb-xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 260 }} animate={{ y: 0 }} exit={{ y: 260 }} transition={spring}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2}
        onDragEnd={(_, info) => { if (info.offset.y > 120) onClose() }}
      >
        <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-md" />
        <div className="flex items-center gap-md mb-lg">
          <div className="w-12 h-12 rounded-full bg-lilac/20 flex items-center justify-center text-[24px]">{entry.emoji}</div>
          <div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{entry.name}</h2>
            <p className="font-data-mono text-[12px] text-on-surface-variant">{Math.round(entry.kcal * servings)} kcal · {Math.round(entry.protein * servings)}g protein</p>
          </div>
        </div>
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
          <Press onClick={() => onSave(servings)} className="flex-[2] py-3 rounded-full bg-lime text-on-lime font-metric-md flex items-center justify-center gap-2">Save <Icon name="check" size={18} /></Press>
        </div>
      </motion.div>
    </motion.div>
  )
}
