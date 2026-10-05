import { useState } from 'react'
import { Icon } from './Icon'
import { autoCaloriePlan, baseCalorieTarget, tdee, toDisplayWeight, weightUnit } from '../lib/nutrition'
import type { UserProfile } from '../types'
import './weight-outlook.css'

export function WeightOutlook({ profile, weightKg }: { profile: UserProfile; weightKg: number }) {
  const target = baseCalorieTarget(profile, weightKg)
  const maintenance = tdee(profile, weightKg)
  const floor = autoCaloriePlan(profile, weightKg).minimumKcal
  const [intakeText, setIntakeText] = useState(() => String(target))
  const intake = Number(intakeText)
  const valid = Number.isFinite(intake) && intake >= 500 && intake <= 10000
  const difference = valid ? maintenance - intake : 0
  const weeklyKg = Math.abs(difference) * 7 / 7700
  const weeklyDisplay = toDisplayWeight(weeklyKg, profile.units)
  const unit = weightUnit(profile.units)
  const lowIntake = valid && intake < floor
  const highDeficit = valid && difference > 1000
  const direction = difference > 0 ? 'loss' : difference < 0 ? 'gain' : 'maintenance'

  return <section className="weight-outlook" aria-labelledby="weight-outlook-title">
    <div className="weight-outlook-heading"><Icon name="trending_down" size={22} /><h2 id="weight-outlook-title">What if you stay consistent?</h2></div>
    <p className="weight-outlook-intro">Test a daily intake against your estimated maintenance. This is a short-term energy estimate, not a promise on the scale.</p>
    <div className="weight-outlook-input-row"><label htmlFor="weight-intake-scenario">Daily intake scenario</label><div><input id="weight-intake-scenario" type="number" min="500" max="10000" inputMode="numeric" value={intakeText} onChange={(event) => setIntakeText(event.target.value)} aria-describedby="weight-outlook-method" /><span>kcal / day</span></div></div>
    <div className="weight-outlook-reference"><span>Estimated maintenance <strong>{maintenance.toLocaleString()} kcal</strong></span><button type="button" onClick={() => setIntakeText(String(target))}>Use my {target.toLocaleString()} kcal target</button></div>
    {!valid ? <p className="weight-outlook-error" role="alert">Enter a daily intake between 500 and 10,000 kcal to see the calculation.</p> : <>
      <div className="weight-outlook-result"><span>{direction === 'maintenance' ? 'AT MAINTENANCE' : direction === 'loss' ? 'DAILY DEFICIT' : 'DAILY SURPLUS'}</span><strong>{Math.abs(difference).toLocaleString()}<small> kcal</small></strong><p>{direction === 'maintenance' ? 'About the same energy in as out.' : `≈ ${weeklyDisplay.toFixed(1)} ${unit} ${direction} per week, by simple calorie arithmetic.`}</p></div>
      {(lowIntake || highDeficit) && <p className="weight-outlook-warning" id="weight-outlook-caution" role="status"><Icon name="warning" size={18} />{lowIntake ? `${intake.toLocaleString()} kcal/day is below this app's ${floor.toLocaleString()} kcal safety floor. The number above is arithmetic only—not a recommended target.` : 'This is a large estimated deficit. Faster loss is not necessarily safer or more sustainable.'}</p>}
    </>}
    <p className="weight-outlook-method" id="weight-outlook-method">Math: (estimated maintenance − intake) × 7 ÷ 7,700 kcal/kg. Real weight fluctuates with water, activity, logging accuracy and metabolic adaptation; the estimate should not be extended week after week.</p>
  </section>
}
