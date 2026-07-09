import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { Press, Reveal, listContainer, spring } from '../components/motion'
import { Rings } from '../components/Decor'
import { todayISO, uid, weekday } from '../lib/date'
import { formatPace, kcalActivity, planCapability, planMeta, sessionsForWeek } from '../lib/plan'
import { ACTIVITIES, ACTIVITY_CATEGORIES, activityById, metForRun, type ActivityCategory } from '../lib/activities'
import type { PlanSession, SessionType } from '../types'

type Filter = 'all' | 'half-marathon' | 'strength' | 'sport' | 'manual'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'half-marathon', label: 'Half Marathon' },
  { id: 'strength', label: 'Strength' },
  { id: 'sport', label: 'Sport' },
  { id: 'manual', label: 'Logged' },
]

const PASTELS: Record<SessionType, { bg: string; fg: string }> = {
  run: { bg: 'bg-gradient-to-br from-lilac to-lilac-deep glow-soft', fg: 'text-on-lilac' },
  strength: { bg: 'bg-gradient-to-br from-pink to-pink-deep glow-soft', fg: 'text-on-pink' },
  sport: { bg: 'bg-gradient-to-br from-lime to-lime-dim glow-soft', fg: 'text-on-lime' },
  rest: { bg: 'bg-ink-card border border-white/5', fg: 'text-on-surface' },
}

export function Train() {
  const { state, profile, weightKg, updateProfile, addSession, removeSession, toggleSession } = useApp()
  const today = todayISO()
  const [filter, setFilter] = useState<Filter>('all')
  const [showLog, setShowLog] = useState(false)

  const meta = planMeta(profile, state.sessions, today)
  const cap = planCapability(profile)
  const week = sessionsForWeek(state.sessions, today)
  const filtered = filter === 'all' ? week : week.filter((s) => s.plan === filter)

  const planned = week.length
  const done = week.filter((s) => s.completed).length
  const compliance = planned ? Math.round((done / planned) * 100) : 0
  const volume = week.filter((s) => s.type === 'run').reduce((a, s) => a + (s.distanceKm ?? 0), 0)
  const burned = week.filter((s) => s.completed).reduce((a, s) => a + s.kcal, 0)

  return (
    <motion.div variants={listContainer} className="px-margin-mobile pt-sm space-y-lg">
      <TopBar />

      <Reveal>
        <div className="flex gap-sm overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="relative shrink-0 px-md py-sm rounded-full">
              {filter === f.id && <motion.span layoutId="train-filter" transition={spring} className="absolute inset-0 rounded-full bg-lime" />}
              <span className={`relative z-10 font-body-md text-[13px] whitespace-nowrap ${filter === f.id ? 'text-on-lime' : 'text-on-surface-variant'}`}>{f.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {meta ? (
        <Reveal>
          <div className="rounded-[28px] bg-gradient-to-br from-lime to-lime-dim text-on-lime p-lg relative overflow-hidden glow-lime">
            <Rings size={200} className="absolute -right-12 -top-12 text-on-lime opacity-[0.12]" />
            <div className="relative flex justify-between items-start">
              <div>
                <p className="font-label-caps text-label-caps uppercase opacity-60 tracking-widest">Plan progress</p>
                <h2 className="font-display-hero text-headline-lg mt-1">Week {meta.week} / {meta.totalWeeks}</h2>
              </div>
              <span className="bg-on-lime text-lime rounded-full px-md py-1.5 font-data-mono text-[12px]">{meta.daysLeft}d left</span>
            </div>
            <div className="relative w-full h-2.5 bg-on-lime/15 rounded-full mt-md">
              <motion.div
                className="relative h-full bg-on-lime rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, meta.pct)}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="absolute -right-1 -top-[3px] w-4 h-4 rounded-full bg-on-lime border-2 border-lime" />
              </motion.div>
            </div>
            <p className="relative font-body-md text-[13px] opacity-80 mt-md">{taperMessage(meta.taperIn)}</p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <div className="rounded-[24px] bg-ink-card border border-white/5 p-md flex items-center gap-md">
            <Icon name="event" className="text-lime" />
            <p className="font-body-md text-body-md text-on-surface-variant">No race set. Add one in Settings for a 14-week plan.</p>
          </div>
        </Reveal>
      )}

      <Reveal>
        <CapabilityCard
          bestKm={profile.bestRunDistanceKm}
          bestPace={profile.bestRunPaceSecPerKm}
          goalLabel={cap.selectedGoalLabel}
          goalMinutes={cap.selectedGoalMin}
          targetPace={cap.targetPace}
          onSave={(bestRunDistanceKm, bestRunPaceSecPerKm) => updateProfile({ bestRunDistanceKm, bestRunPaceSecPerKm }, true)}
        />
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-3 gap-sm">
          <StatTile icon="task_alt" label="Compliance" value={`${compliance}%`} sub={`${done}/${planned} sessions`} tone="border border-lime/25 bg-lime/10 text-lime glow-soft" />
          <StatTile icon="conversion_path" label="Volume" value={`${volume.toFixed(0)} km`} sub="running this week" tone="border border-white/10 bg-ink-card text-on-surface glow-soft" />
          <StatTile icon="local_fire_department" label="Burned" value={`${burned}`} sub="kcal logged" tone="bg-gradient-to-br from-lime to-lime-dim text-on-lime glow-lime" />
        </div>
      </Reveal>

      <Reveal>
        <div className="rounded-[28px] bg-ink-card border border-white/5 p-md">
          <div className="flex items-center justify-between gap-md">
            <div>
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Log activity</h3>
              <p className="font-data-mono text-[12px] text-on-surface-variant">Choose an activity. Calories use MET values plus your weight, time and run pace.</p>
            </div>
            <button
              onClick={() => setShowLog((v) => !v)}
              aria-label={showLog ? 'Close activity form' : 'Add activity'}
              className="w-12 h-12 rounded-full bg-lime text-on-lime flex items-center justify-center shrink-0"
            >
              <Icon name={showLog ? 'close' : 'add'} />
            </button>
          </div>
          {showLog && (
            <ManualActivityForm
              weightKg={weightKg}
              onAdd={(session) => {
                addSession(session)
                setShowLog(false)
              }}
            />
          )}
        </div>
      </Reveal>

      <Reveal>
        <div className="space-y-md">
          <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">This week</h3>
          <div className="space-y-sm">
            {filtered.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant text-center py-md">No sessions in this filter.</p>
            ) : (
              filtered.map((s, i) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  index={i}
                  today={today}
                  onToggle={() => toggleSession(s.id)}
                  onDelete={s.manual || s.plan === 'manual' ? () => removeSession(s.id) : undefined}
                />
              ))
            )}
          </div>
        </div>
      </Reveal>
    </motion.div>
  )
}

function StatTile({ icon, label, value, sub, tone }: { icon: string; label: string; value: string; sub: string; tone: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[22px] p-md ${tone}`}>
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-[10px] uppercase opacity-70">{label}</span>
        <Icon name={icon} size={15} className="opacity-60" />
      </div>
      <div className="font-display-hero text-headline-lg-mobile leading-none mt-xs">{value}</div>
      <span className="font-data-mono text-[11px] opacity-70">{sub}</span>
    </div>
  )
}

function CapabilityCard({
  bestKm,
  bestPace,
  goalLabel,
  goalMinutes,
  targetPace,
  onSave,
}: {
  bestKm: number
  bestPace: number
  goalLabel: string
  goalMinutes: number | null
  targetPace: number
  onSave: (bestKm: number, bestPace: number) => void
}) {
  const [km, setKm] = useState(String(bestKm))
  const [pace, setPace] = useState(formatPace(bestPace).replace('/km', ''))

  const parsedPace = parsePace(pace)
  const dirty = Number(km) !== bestKm || parsedPace !== bestPace

  return (
    <div className="rounded-[28px] bg-ink-card border border-white/5 p-md">
      <div className="flex items-start justify-between gap-md">
        <div>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Current capability</span>
          <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mt-1">{bestKm} km at {formatPace(bestPace)}</h3>
          <p className="font-data-mono text-[12px] text-lime mt-1">
            {goalLabel}{goalMinutes ? ` (${goalMinutes} min)` : ''}: {formatPace(targetPace)} race pace
          </p>
        </div>
        <Icon name="speed" className="text-lime" />
      </div>
      <div className="grid grid-cols-2 gap-sm mt-md">
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Best run km</span>
          <input type="number" min={1} step="0.1" value={km} onChange={(e) => setKm(e.target.value)} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Pace min/km</span>
          <input value={pace} onChange={(e) => setPace(e.target.value)} placeholder="6:00" className={fieldCls} />
        </label>
      </div>
      <button
        disabled={!dirty || !Number(km) || !parsedPace}
        onClick={() => onSave(Math.max(1, Number(km)), parsedPace)}
        className="mt-md w-full py-3 rounded-full bg-lime text-on-lime font-metric-md disabled:opacity-40"
      >
        Update training plan
      </button>
    </div>
  )
}

function ManualActivityForm({ weightKg, onAdd }: { weightKg: number; onAdd: (session: PlanSession) => void }) {
  const [category, setCategory] = useState<ActivityCategory | 'all'>('run')
  const [activityId, setActivityId] = useState('easy_run')
  const [date, setDate] = useState(todayISO())
  const [duration, setDuration] = useState('30')
  const [distance, setDistance] = useState('3')

  const activities = ACTIVITIES.filter((a) => category === 'all' || a.category === category)
  const activity = activityById(activityId)
  const min = Math.max(1, Number(duration) || 0)
  const km = activity.type === 'run' ? Math.max(0, Number(distance) || 0) : 0
  const met = activity.type === 'run' ? metForRun(km, min, activity.met) : activity.met
  const kcal = kcalActivity(weightKg, activity.id, min, km)
  const pace = km > 0 ? `${Math.floor(min / km)}:${String(Math.round(((min / km) % 1) * 60)).padStart(2, '0')}/km` : null

  const save = () => {
    const detail = activity.type === 'run' && km > 0 ? `${km} KM - ${min} MIN - ${pace}` : `${min} MIN - ${met.toFixed(1)} MET`
    onAdd({
      id: uid(),
      date,
      type: activity.type,
      title: activity.label,
      detail,
      durationMin: min,
      distanceKm: activity.type === 'run' && km > 0 ? km : undefined,
      kcal,
      completed: true,
      plan: 'manual',
      icon: activity.icon,
      manual: true,
    })
  }

  return (
    <div className="mt-md space-y-md animate-fade-in">
      <div className="flex gap-sm overflow-x-auto no-scrollbar pb-1">
        {ACTIVITY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.id)
              const first = ACTIVITIES.find((a) => c.id === 'all' || a.category === c.id)
              if (first) {
                setActivityId(first.id)
                setDistance(first.type === 'run' ? '3' : '')
              }
            }}
            className={`shrink-0 px-md py-2 rounded-full font-data-mono text-[12px] border ${
              category === c.id ? 'bg-lime text-on-lime border-lime' : 'bg-ink text-on-surface-variant border-white/10'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-sm">
        {activities.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setActivityId(a.id)
              setDistance(a.type === 'run' ? distance || '3' : '')
            }}
            className={`min-h-[74px] rounded-2xl border p-sm text-left transition ${
              activityId === a.id ? 'bg-lime text-on-lime border-lime' : 'bg-ink border-white/10 text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={a.icon} size={18} />
              <span className="font-metric-md text-[14px] leading-tight">{a.label}</span>
            </div>
            <span className={`font-data-mono text-[11px] ${activityId === a.id ? 'opacity-70' : 'text-on-surface-variant'}`}>{a.met} MET</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-sm">
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Minutes</span>
          <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Km</span>
          <input type="number" min={0} step="0.1" disabled={activity.type !== 'run'} value={distance} onChange={(e) => setDistance(e.target.value)} className={`${fieldCls} disabled:opacity-40`} />
        </label>
      </div>
      <div className="rounded-2xl bg-[#101112] border border-lime/20 p-md">
        <div className="flex items-center justify-between">
          <span className="font-data-mono text-[12px] text-on-surface-variant">Estimated burn</span>
          <span className="font-display-hero text-headline-lg-mobile text-lime">{kcal} kcal</span>
        </div>
        <p className="font-data-mono text-[11px] text-on-surface-variant mt-1">
          {activity.label} - {met.toFixed(1)} MET{pace ? ` - ${pace}` : ''}. Estimate based on Compendium MET method.
        </p>
      </div>
      <button onClick={save} className="w-full py-3 rounded-full bg-lime text-on-lime font-metric-md">Save activity</button>
    </div>
  )
}

function SessionCard({ session: s, index, today, onToggle, onDelete }: { session: PlanSession; index: number; today: string; onToggle: () => void; onDelete?: () => void }) {
  const done = s.completed
  const pastel = PASTELS[s.type]
  const isToday = s.date === today
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, ...spring }}>
      <div className={`rounded-[24px] p-md flex items-center justify-between cursor-pointer ${done ? 'bg-ink-card border border-white/5' : `${pastel.bg} ${pastel.fg}`} ${isToday && !done ? 'ring-2 ring-lime ring-offset-2 ring-offset-ink' : ''}`}>
        <Press as="div" onClick={onToggle} className="flex items-center gap-md flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-secondary/20 text-secondary' : 'bg-black/10'}`}>
            <Icon name={done ? 'check' : s.icon} fill />
          </div>
          <div className="min-w-0">
            <p className={`font-metric-md text-metric-md truncate ${done ? 'text-on-surface line-through' : ''}`}>{s.title}</p>
            <p className={`font-data-mono text-[12px] ${done ? 'text-on-surface-variant' : 'opacity-70'}`}>{weekday(s.date)} - {s.detail}</p>
            <p className={`font-data-mono text-[11px] ${done ? 'text-lime' : 'opacity-80'}`}>{s.kcal} kcal burned{s.manual ? ' - logged' : ''}</p>
          </div>
        </Press>
        <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 ${done ? '' : 'bg-black/85 text-lime'}`}>
          {done ? <Icon name="check_circle" fill className="text-secondary" /> : s.durationMin > 0 ? (
            <>
              <span className="font-display-hero text-[15px] leading-none">{s.durationMin}</span>
              <span className="font-label-caps text-[8px] uppercase">min</span>
            </>
          ) : <Icon name="bedtime" />}
        </div>
        {onDelete && (
          <button onClick={onDelete} className="ml-sm w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center">
            <Icon name="delete" size={18} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function taperMessage(taperIn: number): string {
  if (taperIn <= 0 && taperIn > -21) return 'Taper underway - cut volume, hold intensity, recover hard.'
  if (taperIn <= 3 && taperIn > 0) return `Taper in ${taperIn} days. Recovery over volume now.`
  if (taperIn > 0) return `Build phase. Taper in ${taperIn} days - stack consistent weeks.`
  return 'Race done - log recovery and plan the next block.'
}

function parsePace(value: string): number {
  const clean = value.trim()
  if (!clean) return 0
  if (clean.includes(':')) {
    const [m, s = '0'] = clean.split(':')
    return Math.round((Number(m) || 0) * 60 + (Number(s) || 0))
  }
  return Math.round((Number(clean) || 0) * 60)
}

const fieldCls = 'w-full bg-[#101112] border border-white/10 rounded-xl px-sm py-2 text-on-surface font-data-mono text-[13px] focus:border-lime focus:outline-none'
