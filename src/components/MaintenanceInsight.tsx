import { intakeBalance, toDisplayWeight, weightUnit } from '../lib/nutrition'
import type { UserProfile } from '../types'

export function MaintenanceInsight({ profile, weightKg, consumed, target, hasLogs }: { profile: UserProfile; weightKg: number; consumed: number; target: number; hasLogs: boolean }) {
  const balance = intakeBalance(profile, weightKg, consumed)
  if (!balance) return <p className="food-score-note">Maintenance estimates are available for adults aged 20+ with valid profile measurements.</p>
  const { maintenance, surplus, weeklyEnergyKg } = balance
  const close = Math.abs(surplus) < 50
  const weekly = toDisplayWeight(Math.abs(weeklyEnergyKg), profile.units).toFixed(2)
  return <div className="food-maintenance" aria-label="Maintenance and weekly energy estimate">
    <div className="food-maintenance-heading"><span>Estimated maintenance</span><strong>{maintenance.toLocaleString()} <small>kcal/day</small></strong></div>
    <p>Your estimated intake to maintain weight—not your diet target or a guaranteed maximum.</p>
    {hasLogs ? <>
      <div className={`food-maintenance-status ${surplus > 0 ? 'is-surplus' : ''}`}>
        <strong>{close ? 'Close to maintenance' : surplus > 0 ? `${surplus.toLocaleString()} kcal above maintenance` : `${Math.abs(surplus).toLocaleString()} kcal below maintenance`}</strong>
        {consumed > target && surplus < -50 && <p>You’re over your diet target, but still below estimated maintenance. That doesn’t mean a calorie surplus.</p>}
        <p>If <strong>{consumed.toLocaleString()} kcal</strong> is your complete daily intake and you repeat it for 7 days with the same activity: {close ? 'roughly weight-maintaining by this estimate.' : <>a rough energy equivalent of <strong>{weekly} {weightUnit(profile.units)} {surplus > 0 ? 'gain' : 'loss'} per week</strong>.</>}</p>
      </div>
      <details><summary>How is this calculated?</summary><p>Maintenance uses Mifflin–St Jeor with your sex, age, height, weight and activity level. Weekly energy equivalent = (intake − maintenance) × 7 ÷ 7,700 kcal/kg.</p><p>Activity is already included in maintenance; logged workouts aren’t added again. Incomplete food logs, portion estimates, water retention and metabolic changes can make actual scale weight different. This is a short-term scenario, not a long-term forecast.</p><a href="https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/nih-body-weight-planner" target="_blank" rel="noopener noreferrer">Why weight change isn’t a fixed calorie rule</a></details>
    </> : <p className="food-maintenance-empty">Log your meals to compare intake with maintenance. No food logged doesn’t mean zero calories eaten.</p>}
  </div>
}
