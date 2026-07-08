import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { CountUp, Press, Reveal, listContainer, spring } from '../components/motion'
import { todayISO, weekday } from '../lib/date'
import { planMeta, sessionsForWeek } from '../lib/plan'
import type { PlanSession, SessionType } from '../types'

type Filter = 'all' | 'half-marathon' | 'strength' | 'sport'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'half-marathon', label: 'Half Marathon' },
  { id: 'strength', label: 'Strength' },
  { id: 'sport', label: 'Sport' },
]

const PASTELS: Record<SessionType, { bg: string; fg: string }> = {
  run: { bg: 'bg-lilac', fg: 'text-on-lilac' },
  strength: { bg: 'bg-pink', fg: 'text-on-pink' },
  sport: { bg: 'bg-lime', fg: 'text-on-lime' },
  rest: { bg: 'bg-ink-card', fg: 'text-on-surface' },
}

export function Train() {
  const { state, profile, toggleSession } = useApp()
  const today = todayISO()
  const [filter, setFilter] = useState<Filter>('all')

  const meta = planMeta(profile, state.sessions, today)
  const week = sessionsForWeek(state.sessions, today)
  const filtered = filter === 'all' ? week : week.filter((s) => s.plan === filter)

  const planned = week.length
  const done = week.filter((s) => s.completed).length
  const compliance = planned ? Math.round((done / planned) * 100) : 0
  const volume = week.filter((s) => s.type === 'run').reduce((a, s) => a + (s.distanceKm ?? 0), 0)

  return (
    <motion.div variants={listContainer} className="px-margin-mobile pt-sm space-y-lg">
      <TopBar />

      {/* Filter pills */}
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

      {/* Plan progress hero (lime) */}
      {meta ? (
        <Reveal>
          <div className="rounded-[28px] bg-lime text-on-lime p-lg relative overflow-hidden">
            <div className="absolute -right-6 -bottom-8 opacity-10">
              <Icon name="directions_run" size={150} fill />
            </div>
            <div className="relative flex justify-between items-start">
              <div>
                <p className="font-label-caps text-label-caps uppercase opacity-70">Plan progress</p>
                <h2 className="font-display-hero text-headline-lg mt-1">Week {meta.week} / {meta.totalWeeks}</h2>
              </div>
              <span className="bg-on-lime text-lime rounded-full px-md py-1 font-data-mono text-[12px]">{meta.daysLeft}d left</span>
            </div>
            <div className="relative w-full h-2 bg-on-lime/20 rounded-full mt-md overflow-hidden">
              <motion.div className="h-full bg-on-lime rounded-full" initial={{ width: 0 }} animate={{ width: `${meta.pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
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

      {/* Stat cards */}
      <Reveal>
        <div className="grid grid-cols-2 gap-md">
          <div className="rounded-[24px] bg-lilac text-on-lilac p-md">
            <span className="font-metric-md text-metric-md">Compliance</span>
            <div className="font-display-hero text-display-hero leading-none mt-sm"><CountUp value={compliance} format={(n) => `${Math.round(n)}%`} /></div>
            <span className="font-data-mono text-[12px] opacity-70">{done}/{planned} sessions</span>
          </div>
          <div className="rounded-[24px] bg-pink text-on-pink p-md">
            <span className="font-metric-md text-metric-md">Volume</span>
            <div className="font-display-hero text-display-hero leading-none mt-sm"><CountUp value={volume} format={(n) => n.toFixed(0)} /><span className="text-metric-md"> km</span></div>
            <span className="font-data-mono text-[12px] opacity-70">planned running</span>
          </div>
        </div>
      </Reveal>

      {/* Sessions */}
      <Reveal>
        <div className="space-y-md">
          <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">This week</h3>
          <div className="space-y-sm">
            {filtered.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant text-center py-md">No sessions in this filter.</p>
            ) : (
              filtered.map((s, i) => <SessionCard key={s.id} session={s} index={i} today={today} onToggle={() => toggleSession(s.id)} />)
            )}
          </div>
        </div>
      </Reveal>

      {/* Cross-training */}
      {filter === 'sport' && (
        <Reveal>
          <div className="rounded-[28px] bg-ink-card border border-white/5 p-lg">
            <div className="flex items-center justify-between mb-md">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Cross-training</span>
              <span className="bg-lime/15 text-lime px-sm py-0.5 rounded-full font-label-caps text-label-caps">Avg / session</span>
            </div>
            <h4 className="font-display-hero text-headline-lg-mobile text-on-surface mb-md">Badminton</h4>
            <div className="grid grid-cols-3 gap-sm">
              <MiniStat icon="timer" value="90m" label="Duration" color="text-lilac" />
              <MiniStat icon="favorite" value="142" label="BPM" color="text-pink" />
              <MiniStat icon="local_fire_department" value="650" label="Kcal" color="text-lime" />
            </div>
          </div>
        </Reveal>
      )}
    </motion.div>
  )
}

function SessionCard({ session: s, index, today, onToggle }: { session: PlanSession; index: number; today: string; onToggle: () => void }) {
  const done = s.completed
  const pastel = PASTELS[s.type]
  const isToday = s.date === today
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, ...spring }}>
      <Press
        as="div"
        onClick={onToggle}
        className={`rounded-[24px] p-md flex items-center justify-between cursor-pointer ${done ? 'bg-ink-card border border-white/5' : `${pastel.bg} ${pastel.fg}`} ${isToday && !done ? 'ring-2 ring-lime ring-offset-2 ring-offset-ink' : ''}`}
      >
        <div className="flex items-center gap-md">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${done ? 'bg-secondary/20 text-secondary' : 'bg-on-lime/15'}`}>
            <Icon name={done ? 'check' : s.icon} fill />
          </div>
          <div>
            <p className={`font-metric-md text-metric-md ${done ? 'text-on-surface line-through' : ''}`}>{s.title}</p>
            <p className={`font-data-mono text-[12px] ${done ? 'text-on-surface-variant' : 'opacity-70'}`}>{weekday(s.date)} · {s.detail}</p>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 ${done ? '' : 'bg-on-lime text-lime'}`}>
          {done ? <Icon name="check_circle" fill className="text-secondary" /> : s.durationMin > 0 ? (
            <>
              <span className="font-display-hero text-[15px] leading-none">{s.durationMin}</span>
              <span className="font-label-caps text-[8px] uppercase">min</span>
            </>
          ) : <Icon name="bedtime" />}
        </div>
      </Press>
    </motion.div>
  )
}

function MiniStat({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div className="bg-ink rounded-[18px] p-sm flex flex-col items-center gap-1">
      <Icon name={icon} size={18} className={color} />
      <span className="font-display-hero text-metric-md text-on-surface">{value}</span>
      <span className="font-label-caps text-[9px] uppercase text-on-surface-variant">{label}</span>
    </div>
  )
}

function taperMessage(taperIn: number): string {
  if (taperIn <= 0 && taperIn > -21) return 'Taper underway — cut volume, hold intensity, recover hard.'
  if (taperIn <= 3 && taperIn > 0) return `Taper in ${taperIn} days. Recovery over volume now.`
  if (taperIn > 0) return `Build phase. Taper in ${taperIn} days — stack consistent weeks.`
  return 'Race done — log recovery and plan the next block.'
}
