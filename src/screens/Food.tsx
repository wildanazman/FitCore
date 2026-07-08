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
import type { DietWarning } from '../lib/diet'
import type { FoodEntry } from '../types'

export function Food() {
  const { state, profile, weightKg, addFood, updateFood, removeFood } = useApp()
  const nav = useNavigate()
  const today = todayISO()
  const [editing, setEditing] = useState<FoodEntry | null>(null)

  const fuel = dayFuel(profile, weightKg, today, state.foods, state.sessions)
  const todayFoods = state.foods.filter((f) => f.date === today).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
  const calPct = fuel.budget ? Math.min(100, (fuel.consumed / fuel.budget) * 100) : 0

  const def = dietDef(profile.dietMode)
  const win = def.kind === 'window' ? windowState(profile.eatingWindowStartHour, profile.dietMode, nowMinutes()) : undefined
  const warnings = dietWarnings(profile.dietMode, { foods: state.foods, date: today, netCarbCapG: profile.netCarbCapG, window: win })
  const quickFoods = QUICK_FOODS[profile.dietMode] ?? []

  const quickAdd = (q: (typeof quickFoods)[number]) => {
    addFood({
      id: uid(), name: q.name, emoji: q.emoji, date: today, loggedAt: new Date().toISOString(),
      slot: slotForNow(), kcal: q.kcal, protein: q.protein, carbs: q.carbs, fat: q.fat, servings: 1, confidence: 1,
    })
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
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Today's log</span>
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
