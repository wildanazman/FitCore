import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { ProgressBar, SectionLabel } from '../components/ui'
import { WorkoutPill } from '../components/WorkoutPill'
import { Icon } from '../components/Icon'
import { todayISO } from '../lib/date'
import { planMeta, sessionsForWeek } from '../lib/plan'
import type { PlanSession } from '../types'

type Filter = 'all' | 'half-marathon' | 'strength' | 'sport'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'half-marathon', label: 'Half Marathon' },
  { id: 'strength', label: 'Strength' },
  { id: 'sport', label: 'Sport' },
]

export function Train() {
  const { state, profile, toggleSession } = useApp()
  const today = todayISO()
  const [filter, setFilter] = useState<Filter>('all')

  const meta = planMeta(profile, state.sessions, today)
  const week = sessionsForWeek(state.sessions, today)
  const filtered = filter === 'all' ? week : week.filter((s) => s.plan === filter)

  // Compliance: this week's completed vs planned.
  const planned = week.length
  const done = week.filter((s) => s.completed).length
  const compliance = planned ? Math.round((done / planned) * 100) : 0

  const sportSessions = state.sessions.filter((s) => s.type === 'sport' && s.completed)
  const sportAvg = avgSport(sportSessions)

  return (
    <div>
      <TopBar />
      <div className="px-margin-mobile pt-sm space-y-xl">
        {/* Filters */}
        <section className="flex overflow-x-auto pb-sm gap-sm no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`whitespace-nowrap px-md py-sm rounded-full font-metric-md text-metric-md border transition ${
                filter === f.id ? 'bg-primary-container text-on-primary-container border-primary' : 'bg-surface-container-high text-on-surface border-outline-variant'
              }`}
            >
              {f.label}
            </button>
          ))}
        </section>

        {/* Plan progress */}
        {meta ? (
          <section className="bg-surface-container-high rounded-xl border border-outline-variant p-md flex flex-col gap-md">
            <div className="flex justify-between items-start">
              <div>
                <SectionLabel>Plan Progress</SectionLabel>
                <p className="font-display-hero text-headline-lg-mobile text-on-surface mt-xs">Week {meta.week} of {meta.totalWeeks}</p>
              </div>
              <span className="font-data-mono text-data-mono text-primary bg-primary/10 px-sm py-xs rounded">{meta.daysLeft} days left</span>
            </div>
            <ProgressBar pct={meta.pct} />
            <div className="bg-primary/10 border-l-2 border-primary p-sm flex gap-sm items-start rounded-r-lg">
              <Icon name="insights" className="text-primary mt-xs" size={20} />
              <p className="font-body-md text-body-md text-on-surface-variant">{taperMessage(meta.taperIn)}</p>
            </div>
          </section>
        ) : (
          <section className="bg-surface-container-high rounded-xl border border-outline-variant p-md flex items-center gap-md">
            <Icon name="event" className="text-primary" />
            <p className="font-body-md text-body-md text-on-surface-variant">No race scheduled. Add a race date in Settings to generate a 14-week plan.</p>
          </section>
        )}

        {/* Weekly compliance */}
        <section className="grid grid-cols-2 gap-md">
          <div className="bg-tile border border-tile-border rounded-xl p-md">
            <SectionLabel>Compliance</SectionLabel>
            <p className="font-display-hero text-headline-lg text-on-surface mt-xs">{compliance}%</p>
            <p className="font-data-mono text-[12px] text-on-surface-variant">{done}/{planned} sessions</p>
          </div>
          <div className="bg-tile border border-tile-border rounded-xl p-md">
            <SectionLabel>Week Volume</SectionLabel>
            <p className="font-display-hero text-headline-lg text-on-surface mt-xs">
              {week.filter((s) => s.type === 'run').reduce((a, s) => a + (s.distanceKm ?? 0), 0).toFixed(0)}
              <span className="text-metric-md text-on-surface-variant"> km</span>
            </p>
            <p className="font-data-mono text-[12px] text-on-surface-variant">planned running</p>
          </div>
        </section>

        {/* This week's sessions */}
        <section className="space-y-md">
          <SectionLabel>This Week's Sessions</SectionLabel>
          <div className="space-y-sm">
            {filtered.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant text-center py-md">No {filter !== 'all' ? FILTERS.find((f) => f.id === filter)?.label : ''} sessions this week.</p>
            ) : (
              filtered.map((s) => <WorkoutPill key={s.id} session={s} today={today} onToggle={() => toggleSession(s.id)} />)
            )}
          </div>
        </section>

        {/* Cross-training stats */}
        {sportAvg && (
          <section className="bg-surface-container rounded-xl border border-outline-variant p-md flex flex-col gap-md">
            <SectionLabel>Cross-Training Stats</SectionLabel>
            <div className="flex items-center justify-between">
              <h4 className="font-metric-md text-headline-lg-mobile text-on-surface">{sportAvg.name}</h4>
              <span className="font-data-mono text-data-mono text-tertiary bg-tertiary/10 px-sm py-xs rounded">Avg/Session</span>
            </div>
            <div className="grid grid-cols-3 gap-sm">
              <Stat icon="timer" color="text-secondary" value={`${sportAvg.min}m`} label="Duration" />
              <Stat icon="favorite" color="text-error" value="142" label="BPM" />
              <Stat icon="local_fire_department" color="text-tertiary" value={`${sportAvg.kcal}`} label="Kcal" />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function taperMessage(taperIn: number): string {
  if (taperIn <= 0 && taperIn > -21) return 'Taper is underway — cut volume, keep intensity sharp, prioritize recovery.'
  if (taperIn <= 3 && taperIn > 0) return `Taper begins in ${taperIn} days. Focus on recovery and maintaining intensity over volume.`
  if (taperIn > 0) return `Build phase. Taper begins in ${taperIn} days — keep stacking consistent weeks.`
  return 'Race complete — log recovery and plan your next block.'
}

function Stat({ icon, color, value, label }: { icon: string; color: string; value: string; label: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-sm border border-outline-variant/50 flex flex-col items-center justify-center text-center gap-xs">
      <Icon name={icon} className={color} size={20} />
      <span className="font-display-hero text-metric-md text-on-surface">{value}</span>
      <span className="font-label-caps text-label-caps text-on-surface-variant">{label}</span>
    </div>
  )
}

function avgSport(sessions: PlanSession[]): { name: string; min: number; kcal: number } | null {
  if (!sessions.length) return null
  const min = Math.round(sessions.reduce((a, s) => a + s.durationMin, 0) / sessions.length)
  const kcal = Math.round(sessions.reduce((a, s) => a + s.kcal, 0) / sessions.length)
  return { name: sessions[sessions.length - 1].title, min, kcal }
}
