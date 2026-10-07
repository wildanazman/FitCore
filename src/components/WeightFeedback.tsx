import { useApp } from '../store/AppContext'
import { todayISO } from '../lib/date'
import { toDisplayWeight,weightUnit } from '../lib/nutrition'
import { weightFeedback } from '../lib/weightFeedback'
import { Icon } from './Icon'
import './weight-feedback.css'

export function WeightFeedback({date=todayISO()}:{date?:string}) {
  const {profile,state}=useApp()
  const feedback=weightFeedback(profile,state.weights,state.foods,date)
  if(!feedback)return null
  const f=feedback,unit=weightUnit(profile.units)
  return <section className={`weight-feedback ${f.inDirection?'is-progress':''}`} aria-label="Weight progress feedback">
    <div className="weight-feedback-heading"><Icon name={f.inDirection?'check_circle':'monitor_weight'} size={22}/><h3>{f.heading}</h3></div>
    <p className="weight-feedback-change"><strong>{f.change<0?'−':'+'}{toDisplayWeight(Math.abs(f.change),profile.units).toFixed(1)} {unit}</strong><span>between weigh-ins · {f.days} {f.days===1?'day':'days'}</span></p>
    <dl><div><dt>Estimated maintenance</dt><dd>{f.maintenance.toLocaleString()} kcal/day</dd></div><div><dt>{profile.goal==='gain'?'Daily gain target':profile.goal==='lose'?'Daily loss target':'Daily target'}</dt><dd>{f.target.toLocaleString()} kcal/day</dd></div></dl>
    <p>{profile.goal==='lose'?f.plannedBalance>0?`Aim around ${f.target.toLocaleString()} kcal/day, not as low as possible. This is about a ${f.plannedBalance.toLocaleString()} kcal daily deficit from estimated maintenance.`:'Your current target does not create an estimated deficit. Review your goal or calorie override; do not cut intake just because of one weigh-in.':profile.goal==='gain'?f.plannedBalance<0?`Aim around ${f.target.toLocaleString()} kcal/day: approximately ${Math.abs(f.plannedBalance).toLocaleString()} kcal above estimated maintenance. Scale gain does not prove muscle gain.`:'Your current target does not create an estimated surplus. Review your goal or calorie override.':'Watch the multi-week trend rather than individual weigh-ins.'}</p>
    {f.loggedDays>0?<p className="weight-feedback-energy">Food logged on {f.loggedDays}/{f.days} days: <strong>{Math.abs(Math.round(f.energy)).toLocaleString()} kcal estimated {f.energy>=0?'deficit':'surplus'}</strong> across those logged days. Only if those days are fully logged, that is roughly {toDisplayWeight(f.equivalentKg,profile.units).toFixed(2)} {unit} of energy-equivalent {f.energy>=0?'loss':'gain'}—not measured fat change.</p>:<p className="weight-feedback-energy">No food logs between these weigh-ins. We cannot estimate your actual calorie balance.</p>}
    <p className="weight-feedback-caution">{f.days<=3&&Math.abs(f.change)>=.5?'A rapid change can include water, glycogen and food weight. ':''}Two weigh-ins cannot tell us why your weight changed. No need to compensate with extreme restriction.</p>
    <details><summary>How to read this</summary><p>Maintenance includes your usual activity; workouts are not added twice. Food records may be incomplete. The 7,700 kcal/kg conversion is a rough short-term energy equivalent, not a weight-loss prediction. Weigh under similar conditions and compare several weeks.</p><a href="https://health.clevelandclinic.org/weight-fluctuations" target="_blank" rel="noreferrer">Why scale weight fluctuates</a></details>
  </section>
}
