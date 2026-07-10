import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { DietCard } from '../components/DietCard'
import { Icon } from '../components/Icon'
import { addDays, mondayIndex, startOfWeek, todayISO } from '../lib/date'
import { morningBrief, recoveryScore, underFuelAlert } from '../lib/coach'
import { dayFuel, tdee } from '../lib/nutrition'
import type { PlanSession } from '../types'

export function Home() {
  const { state, profile, weightKg, toggleSession } = useApp()
  const nav = useNavigate()
  const today = todayISO()
  const fuel = dayFuel(profile, weightKg, today, state.foods, state.sessions)
  const todaySessions = state.sessions.filter((session) => session.date === today)
  const activeSessions = todaySessions.filter((session) => session.type !== 'rest')
  const completedSessions = activeSessions.filter((session) => session.completed)
  const nextSession = activeSessions.find((session) => !session.completed) ?? null
  const readiness = recoveryScore(state.sessions, today)
  const daysToRace = profile.raceDate ? Math.ceil((Date.parse(profile.raceDate) - Date.parse(today)) / 86_400_000) : null
  const lateFuelAlert = new Date().getHours() >= 16 ? underFuelAlert(fuel, todaySessions) : null
  const brief = lateFuelAlert ?? morningBrief(fuel, todaySessions, state.sessions, today, daysToRace)
  const raceWindow = daysToRace !== null && daysToRace >= 0 && daysToRace <= 3
  const briefTitle = lateFuelAlert || raceWindow ? brief.headline : nextSession ? nextSession.title : 'Recovery day'
  const caloriePct = percent(fuel.consumed, fuel.budget)
  const proteinPct = percent(fuel.protein, fuel.proteinTarget)
  const carbPct = percent(fuel.carbs, fuel.carbTarget)
  const fatPct = percent(fuel.fat, fuel.fatTarget)
  const foodLogs = state.foods.filter((food) => food.date === today).length
  const burned = completedSessions.reduce((total, session) => total + session.kcal, 0)
  const distance = completedSessions
    .filter((session) => session.type === 'run')
    .reduce((total, session) => total + (session.distanceKm ?? 0), 0)
  const firstName = (profile.name || 'Athlete').split(' ')[0]
  const maintenance = tdee(profile, weightKg)

  return (
    <div className="space-y-xl px-margin-mobile pb-lg pt-lg">
      <header className="flex items-center justify-between gap-md">
        <div className="min-w-0">
          <p className="font-body-md text-[14px] leading-5 text-on-surface-variant">{greeting()}</p>
          <h1 className="truncate font-headline-lg text-headline-lg text-on-surface">{firstName}</h1>
        </div>
        <button
          type="button"
          onClick={() => nav('/settings')}
          aria-label="Open settings"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface-container text-on-surface transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime active:scale-[0.97] motion-reduce:transition-none"
        >
          <Icon name="settings" size={20} />
        </button>
      </header>

      <section className={`home-brief rounded-2xl p-lg ${brief.tone === 'error' ? 'home-brief-alert' : ''}`}>
        <div className="flex items-start justify-between gap-md">
          <div className="flex min-w-0 items-center gap-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${brief.tone === 'error' ? 'bg-error text-on-error' : 'bg-lime text-on-lime'}`}>
              <Icon name={brief.icon} fill size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-body-md text-[14px] text-on-surface-variant">Today's brief</p>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{briefTitle}</h2>
            </div>
          </div>
          <span aria-label={`Estimated training readiness ${readiness} percent`} className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 font-data-mono text-[12px] text-on-surface">
            {readiness}% est.
          </span>
        </div>

        <p className="mt-md max-w-[65ch] font-body-md text-[14px] leading-6 text-on-surface-variant">{brief.body}</p>

        <div className="mt-lg flex flex-wrap items-center justify-between gap-md border-t border-white/10 pt-md">
          <div>
            <p className="font-body-md text-[13px] text-on-surface-variant">Next action</p>
            <p className="font-metric-md text-metric-md text-on-surface">
              {nextSession ? nextSession.title : fuel.remaining > 0 ? 'Complete today\'s nutrition' : 'Review today\'s progress'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => nav(nextSession ? '/train' : '/food')}
            className={`flex min-h-11 items-center gap-2 rounded-full px-md py-2 font-body-md text-[14px] font-semibold transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] motion-reduce:transition-none ${brief.tone === 'error' ? 'bg-error text-on-error focus-visible:outline-error' : 'bg-lime text-on-lime focus-visible:outline-lime'}`}
          >
            {nextSession ? 'View workout' : 'Open food log'}
            <Icon name="arrow_forward" size={17} />
          </button>
        </div>
      </section>

      <WeekStrip today={today} sessions={state.sessions} />

      <section>
        <SectionHeading
          title="Nutrition today"
          action="Food log"
          onAction={() => nav('/food')}
        />
        <div className="mt-md overflow-hidden rounded-2xl bg-tile ring-1 ring-tile-border">
          <button
            type="button"
            onClick={() => nav('/food')}
            className="block w-full p-md text-left transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-lime active:bg-surface-container motion-reduce:transition-none"
          >
            <div className="flex items-end justify-between gap-md">
              <div>
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  {fuel.remaining >= 0 ? 'Calories remaining' : 'Over today\'s target'}
                </p>
                <p className={`mt-1 font-data-mono text-[32px] font-semibold leading-none tabular-nums ${fuel.remaining < 0 ? 'text-error' : 'text-on-surface'}`}>
                  {Math.abs(fuel.remaining).toLocaleString()}
                  <span className="ml-1 text-[14px] font-normal text-on-surface-variant">kcal</span>
                </p>
              </div>
              <p className="text-right font-data-mono text-[12px] leading-5 text-on-surface-variant">
                {fuel.consumed.toLocaleString()} eaten<br />{fuel.budget.toLocaleString()} target
              </p>
            </div>
            <Progress value={caloriePct} tone={fuel.remaining < 0 ? 'error' : 'lime'} label={`${fuel.consumed} of ${fuel.budget} calories`} className="mt-md" />
          </button>

          <div className="grid grid-cols-3 gap-px bg-tile-border border-t border-tile-border">
            <Macro label="Protein" value={fuel.protein} target={fuel.proteinTarget} pct={proteinPct} tone="secondary" />
            <Macro label="Carbs" value={fuel.carbs} target={fuel.carbTarget} pct={carbPct} tone="lime" />
            <Macro label="Fat" value={fuel.fat} target={fuel.fatTarget} pct={fatPct} tone="tertiary" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-low px-md py-3 font-body-md text-[13px] text-on-surface-variant">
            <span>{foodLogs} food log{foodLogs === 1 ? '' : 's'} today</span>
            <span>Maintenance {maintenance.toLocaleString()} kcal</span>
          </div>
        </div>
      </section>

      <DietCard />

      <section>
        <SectionHeading title="Training today" action="Full plan" onAction={() => nav('/train')} />
        <div className="mt-md overflow-hidden rounded-2xl bg-tile ring-1 ring-tile-border">
          <div className="flex items-center justify-between gap-md border-b border-tile-border bg-surface-container-low px-md py-3">
            <div>
              <p className="font-body-md text-[14px] text-on-surface-variant">Completion</p>
              <p className="font-metric-md text-metric-md text-on-surface">
                {activeSessions.length > 0 ? `${completedSessions.length} of ${activeSessions.length} sessions` : 'Rest day'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-data-mono text-[13px] text-lime">{burned} kcal burned</p>
              {distance > 0 && <p className="font-data-mono text-[12px] text-on-surface-variant">{distance.toFixed(1)} km completed</p>}
            </div>
          </div>

          {activeSessions.length === 0 ? (
            <div className="flex items-center gap-md p-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Icon name="self_improvement" size={22} />
              </div>
              <div>
                <p className="font-metric-md text-metric-md text-on-surface">Recovery day</p>
                <p className="font-body-md text-[14px] text-on-surface-variant">Keep moving lightly and prioritise sleep.</p>
              </div>
            </div>
          ) : (
            activeSessions.map((session) => (
              <SessionRow key={session.id} session={session} onToggle={() => toggleSession(session.id)} />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function SectionHeading({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between gap-md">
      <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{title}</h2>
      <button
        type="button"
        onClick={onAction}
        className="flex min-h-11 items-center gap-1 rounded-full px-sm font-body-md text-[14px] font-semibold text-lime transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-lime-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime active:scale-[0.97] motion-reduce:transition-none"
      >
        {action} <Icon name="chevron_right" size={17} />
      </button>
    </div>
  )
}

function Progress({ value, label, tone, className = '' }: { value: number; label: string; tone: 'lime' | 'secondary' | 'tertiary' | 'error'; className?: string }) {
  const color = tone === 'secondary' ? 'bg-secondary' : tone === 'tertiary' ? 'bg-tertiary' : tone === 'error' ? 'bg-error' : 'bg-lime'
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-surface-container-highest ${className}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <div className={`h-full rounded-full ${color} transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none`} style={{ width: `${Math.min(100, Math.max(3, value))}%` }} />
    </div>
  )
}

function Macro({ label, value, target, pct, tone }: { label: string; value: number; target: number; pct: number; tone: 'lime' | 'secondary' | 'tertiary' }) {
  return (
    <div className="bg-tile px-sm py-md text-center">
      <p className="font-body-md text-[13px] text-on-surface-variant">{label}</p>
      <p className="mt-1 font-data-mono text-[16px] font-semibold text-on-surface tabular-nums">{value}<span className="text-[11px] font-normal text-on-surface-variant">/{target}g</span></p>
      <Progress value={pct} tone={tone} label={`${value} of ${target} grams ${label.toLowerCase()}`} className="mt-sm" />
    </div>
  )
}

function SessionRow({ session, onToggle }: { session: PlanSession; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-md border-b border-tile-border p-md last:border-b-0">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${session.completed ? 'bg-secondary/10 text-secondary' : 'bg-lime/10 text-lime'}`}>
        <Icon name={session.completed ? 'check' : session.icon} fill={session.completed} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-metric-md text-metric-md ${session.completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{session.title}</p>
        <p className="truncate font-body-md text-[13px] text-on-surface-variant">{session.detail}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${session.completed ? 'Mark incomplete' : 'Mark complete'}: ${session.title}`}
        aria-pressed={session.completed}
        className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime active:scale-[0.97] motion-reduce:transition-none ${session.completed ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface-variant hover:bg-lime hover:text-on-lime'}`}
      >
        <Icon name={session.completed ? 'check' : 'done'} size={19} />
      </button>
    </div>
  )
}

function WeekStrip({ today, sessions }: { today: string; sessions: PlanSession[] }) {
  const start = startOfWeek(today)
  const todayIndex = mondayIndex(today)
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <section aria-label="Weekly training consistency" className="rounded-2xl bg-tile px-sm py-sm ring-1 ring-tile-border">
      <div className="grid grid-cols-7">
        {letters.map((letter, index) => {
          const date = addDays(start, index)
          const isToday = index === todayIndex
          const hasCompleted = sessions.some((session) => session.date === date && session.type !== 'rest' && session.completed)
          const hasPlan = sessions.some((session) => session.date === date && session.type !== 'rest')
          return (
            <div key={date} className="flex flex-col items-center gap-1 py-1">
              <span className="font-body-md text-[12px] text-on-surface-variant">{letter}</span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full font-data-mono text-[13px] ${isToday ? 'bg-lime text-on-lime' : 'text-on-surface'}`}>
                {Number(date.slice(-2))}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${hasCompleted ? 'bg-secondary' : hasPlan ? 'bg-on-surface-variant/30' : 'bg-transparent'}`} aria-hidden="true" />
            </div>
          )
        })}
      </div>
    </section>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function percent(value: number, target: number): number {
  return target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0
}
