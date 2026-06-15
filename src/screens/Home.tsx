import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { CoachCard, MetricTile, SectionLabel } from '../components/ui'
import { WorkoutPill } from '../components/WorkoutPill'
import { Icon } from '../components/Icon'
import { todayISO } from '../lib/date'
import { dayFuel, toDisplayWeight, weightUnit } from '../lib/nutrition'
import { morningBrief, underFuelAlert } from '../lib/coach'
import { latestMeasured } from '../lib/body'

export function Home() {
  const { state, profile, weightKg, toggleSession } = useApp()
  const nav = useNavigate()
  const today = todayISO()

  const fuel = dayFuel(profile, weightKg, today, state.foods, state.sessions)
  const todaySessions = state.sessions.filter((s) => s.date === today)
  const daysToRace = profile.raceDate ? Math.round((Date.parse(profile.raceDate) - Date.parse(today)) / 86_400_000) : null

  const brief = morningBrief(fuel, todaySessions, state.sessions, today, daysToRace)
  const alert = underFuelAlert(fuel, todaySessions)

  const kmToday = todaySessions
    .filter((s) => s.type === 'run' && s.completed)
    .reduce((a, s) => a + (s.distanceKm ?? 0), 0)
  const kmPlanned = todaySessions.filter((s) => s.type === 'run').reduce((a, s) => a + (s.distanceKm ?? 0), 0)

  const latest = latestMeasured(state.weights)
  const dispW = toDisplayWeight(latest?.weightKg ?? weightKg, profile.units)
  const unit = weightUnit(profile.units)

  const proteinPct = fuel.proteinTarget ? (fuel.protein / fuel.proteinTarget) * 100 : 0
  const calPct = fuel.budget ? (fuel.consumed / fuel.budget) * 100 : 0

  return (
    <div>
      <TopBar greeting />
      <div className="px-margin-mobile pt-sm space-y-xl">
        <CoachCard brief={alert ?? brief} />

        <section className="grid grid-cols-2 gap-md">
          <MetricTile label="Calories Rem" value={Math.max(0, fuel.remaining)} pct={100 - calPct} barColor="bg-tertiary" onClick={() => nav('/food')} />
          <MetricTile label="Protein Rem" value={Math.max(0, fuel.proteinTarget - fuel.protein)} unit="g" pct={proteinPct} barColor="bg-secondary" onClick={() => nav('/food')} />
          <MetricTile label="KM Logged" value={kmToday.toFixed(1)} pct={kmPlanned ? (kmToday / kmPlanned) * 100 : 0} barColor="bg-primary" onClick={() => nav('/train')} />
          <MetricTile label={`Weight ${unit}`} value={dispW.toFixed(1)} pct={50} barColor="bg-primary" onClick={() => nav('/body')} />
        </section>

        <section className="space-y-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Today's plan</h2>
            <button onClick={() => nav('/train')} className="text-primary font-data-mono text-data-mono flex items-center gap-1">
              All <Icon name="chevron_right" size={18} />
            </button>
          </div>
          <div className="space-y-sm">
            {todaySessions.length === 0 ? (
              <div className="bg-tile border border-tile-border rounded-xl p-md flex items-center gap-md">
                <Icon name="self_improvement" className="text-secondary" />
                <p className="font-body-md text-body-md text-on-surface-variant">Rest day — no sessions scheduled. Recover well.</p>
              </div>
            ) : (
              todaySessions.map((s) => <WorkoutPill key={s.id} session={s} today={today} onToggle={() => toggleSession(s.id)} />)
            )}
          </div>
        </section>

        {/* Daily macro summary */}
        <section className="space-y-md">
          <SectionLabel>Macros today</SectionLabel>
          <div className="grid grid-cols-3 gap-md">
            <MacroMini label="Protein" v={fuel.protein} t={fuel.proteinTarget} color="text-secondary" bar="bg-secondary" />
            <MacroMini label="Carbs" v={fuel.carbs} t={fuel.carbTarget} color="text-tertiary" bar="bg-tertiary" />
            <MacroMini label="Fat" v={fuel.fat} t={fuel.fatTarget} color="text-error" bar="bg-error" />
          </div>
        </section>
      </div>
    </div>
  )
}

function MacroMini({ label, v, t, color, bar }: { label: string; v: number; t: number; color: string; bar: string }) {
  const pct = t ? (v / t) * 100 : 0
  return (
    <div className="bg-tile border border-tile-border rounded-xl p-md flex flex-col items-center">
      <span className={`font-display-hero text-headline-lg-mobile ${color}`}>
        {v}
        <span className="text-metric-md">g</span>
      </span>
      <span className="font-label-caps text-label-caps text-on-surface-variant">{label}</span>
      <div className="w-full bg-surface-container-high h-1 mt-sm rounded-full overflow-hidden">
        <div className={`${bar} h-full`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}
