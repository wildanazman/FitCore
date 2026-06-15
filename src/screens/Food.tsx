import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { ProgressBar, SectionLabel } from '../components/ui'
import { Icon } from '../components/Icon'
import { todayISO, timeLabel } from '../lib/date'
import { dayFuel } from '../lib/nutrition'
import type { FoodEntry } from '../types'

export function Food() {
  const { state, profile, weightKg, updateFood, removeFood } = useApp()
  const nav = useNavigate()
  const today = todayISO()
  const [editing, setEditing] = useState<FoodEntry | null>(null)

  const fuel = dayFuel(profile, weightKg, today, state.foods, state.sessions)
  const todayFoods = state.foods.filter((f) => f.date === today).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
  const calPct = fuel.budget ? (fuel.consumed / fuel.budget) * 100 : 0

  return (
    <div>
      <TopBar />
      <div className="px-margin-mobile pt-sm space-y-xl">
        {/* Hero snap */}
        <button
          onClick={() => nav('/camera')}
          className="w-full flex flex-col items-center justify-center py-xl bg-surface-container-low rounded-xl border border-surface-variant relative overflow-hidden group hover:border-primary transition-colors"
        >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-surface-container-low to-transparent group-hover:opacity-20 transition-opacity" />
          <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mb-md z-10 shadow-[0_0_24px_rgba(83,74,183,0.4)] group-hover:scale-105 transition-transform">
            <Icon name="photo_camera" size={40} className="text-on-primary-container" />
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface z-10 mb-xs">Snap food photo</h1>
          <p className="font-body-md text-body-md text-on-surface-variant z-10">AI detects macros &amp; calories instantly</p>
        </button>

        {/* Daily progress */}
        <section>
          <div className="flex justify-between items-baseline mb-sm">
            <SectionLabel>Daily Progress</SectionLabel>
            <span className="font-data-mono text-data-mono text-on-surface">
              {fuel.consumed.toLocaleString()} / <span className="text-on-surface-variant">{fuel.budget.toLocaleString()} kcal</span>
            </span>
          </div>
          <ProgressBar pct={calPct} />
          {fuel.trainingBonus > 0 && (
            <p className="font-data-mono text-[12px] text-tertiary mt-xs flex items-center gap-1">
              <Icon name="bolt" size={14} /> +{fuel.trainingBonus} kcal training bonus today
            </p>
          )}
        </section>

        {/* Macro grid */}
        <section className="grid grid-cols-3 gap-md">
          <MacroCard label="Protein" v={fuel.protein} t={fuel.proteinTarget} color="text-secondary" bar="bg-secondary" />
          <MacroCard label="Carbs" v={fuel.carbs} t={fuel.carbTarget} color="text-tertiary" bar="bg-tertiary" />
          <MacroCard label="Fat" v={fuel.fat} t={fuel.fatTarget} color="text-error" bar="bg-error" />
        </section>

        {/* Log */}
        <section>
          <SectionLabel>Today's Log</SectionLabel>
          <div className="space-y-sm mt-md">
            {todayFoods.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant text-center py-md">No meals logged yet. Snap one above.</p>
            )}
            {todayFoods.map((f) => (
              <button
                key={f.id}
                onClick={() => setEditing(f)}
                className="w-full flex items-center justify-between p-md bg-surface-container-low border border-surface-variant rounded-xl hover:bg-surface-container-highest transition-colors text-left"
              >
                <div className="flex items-center gap-md">
                  {f.photo ? (
                    <img src={f.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-[20px]">{f.emoji}</div>
                  )}
                  <div>
                    <div className="font-metric-md text-[16px] text-on-surface">{f.name}{f.servings !== 1 && <span className="text-on-surface-variant"> ×{f.servings}</span>}</div>
                    <div className="font-data-mono text-[12px] text-on-surface-variant">{timeLabel(f.loggedAt)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-data-mono text-data-mono text-on-surface">{Math.round(f.kcal * f.servings)} kcal</div>
                  <div className="font-data-mono text-[12px] text-secondary">{Math.round(f.protein * f.servings)}g Pro</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {editing && (
        <EditSheet
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(servings) => {
            updateFood(editing.id, { servings })
            setEditing(null)
          }}
          onDelete={() => {
            removeFood(editing.id)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function MacroCard({ label, v, t, color, bar }: { label: string; v: number; t: number; color: string; bar: string }) {
  const pct = t ? (v / t) * 100 : 0
  return (
    <div className="bg-surface-container-low border border-surface-variant rounded-xl p-md flex flex-col items-center">
      <span className={`font-display-hero text-headline-lg-mobile ${color} mb-xs`}>
        {v}
        <span className="text-metric-md">g</span>
      </span>
      <span className="font-label-caps text-label-caps text-on-surface-variant">{label}</span>
      <div className="w-full bg-surface-container-high h-1 mt-sm rounded-full overflow-hidden">
        <div className={`${bar} h-full`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="font-data-mono text-[10px] text-on-surface-variant mt-xs">/ {t}g</span>
    </div>
  )
}

function EditSheet({ entry, onClose, onSave, onDelete }: { entry: FoodEntry; onClose: () => void; onSave: (servings: number) => void; onDelete: () => void }) {
  const [servings, setServings] = useState(entry.servings)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-[480px] bg-[#26262A] rounded-t-[24px] p-margin-mobile pb-xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-md" />
        <div className="flex items-center gap-md mb-lg">
          <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-[24px]">{entry.emoji}</div>
          <div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{entry.name}</h2>
            <p className="font-data-mono text-data-mono text-on-surface-variant">{Math.round(entry.kcal * servings)} kcal • {Math.round(entry.protein * servings)}g protein</p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-surface p-sm rounded-xl border border-outline-variant mb-lg">
          <span className="font-metric-md text-metric-md text-on-surface ml-sm">Servings</span>
          <div className="flex items-center gap-md">
            <button onClick={() => setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface hover:bg-outline-variant transition">
              <Icon name="remove" />
            </button>
            <span className="font-metric-md text-metric-md text-on-surface w-12 text-center">{servings.toFixed(1)}</span>
            <button onClick={() => setServings((s) => Math.round((s + 0.5) * 10) / 10)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface hover:bg-outline-variant transition">
              <Icon name="add" />
            </button>
          </div>
        </div>

        <div className="flex gap-md">
          <button onClick={onDelete} className="flex-1 py-3 rounded-full border border-error text-error font-metric-md text-metric-md hover:bg-error/10 transition flex items-center justify-center gap-2">
            <Icon name="delete" size={20} /> Delete
          </button>
          <button onClick={() => onSave(servings)} className="flex-[2] py-3 rounded-full bg-primary text-on-primary font-metric-md text-metric-md hover:opacity-90 transition flex items-center justify-center gap-2">
            <Icon name="check" size={20} /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
