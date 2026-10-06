import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Icon } from './Icon'
import { addDays, shortDate, todayISO } from '../lib/date'
import { autoCaloriePlan, baseCalorieTarget, bmiCategory, fromDisplayWeight, tdee, toDisplayWeight, weightUnit } from '../lib/nutrition'
import { clinicalScenario, healthyWeightRange, intakeForDeadline, projectionEligible, projectWeight } from '../lib/weightJourney'
import './weight-journey.css'

export function WeightJourney() {
  const { profile, weightKg, updateProfile } = useApp()
  const range = healthyWeightRange(profile.heightCm)
  const unit = weightUnit(profile.units)
  const display = (kg: number) => toDisplayWeight(kg, profile.units).toFixed(1)
  const bmi = weightKg / (profile.heightCm / 100) ** 2
  const adult = projectionEligible(profile, weightKg)
  const defaultGoal = profile.targetWeightKg ?? Math.min(weightKg, range.max)
  const [goalText, setGoalText] = useState(display(defaultGoal))
  const [intakeText, setIntakeText] = useState(String(baseCalorieTarget(profile, weightKg)))
  const [months, setMonths] = useState('6')
  const [feedback, setFeedback] = useState('')
  const goalKg = fromDisplayWeight(Number(goalText), profile.units)
  const intake = Number(intakeText)
  const validGoal = goalText !== '' && Number.isFinite(goalKg) && goalKg >= range.min && goalKg <= 500
  const loss = validGoal ? Math.max(0, weightKg - goalKg) : 0
  const validIntake = intakeText !== '' && Number.isFinite(intake) && intake >= 500 && intake <= 10000
  const maintenance = tdee(profile, weightKg)
  const belowRange = bmi < 18.5
  const clinical = validIntake && clinicalScenario(profile, weightKg, intake)
  const eligible = adult && validGoal && !belowRange
  const projection = eligible && validIntake ? projectWeight(profile, weightKg, intake, goalKg) : null
  const forecastDays = !clinical ? projection?.reachedDay : null
  const monthCount = Number(months)
  const required = eligible && monthCount >= 1 && monthCount <= 24 ? intakeForDeadline(profile, weightKg, goalKg, Math.round(monthCount * 30.44)) : null
  const requiredClinical = required !== null && clinicalScenario(profile, weightKg, required)
  const steady = autoCaloriePlan({ ...profile, goal: 'lose', weightLossPace: 'steady' }, weightKg)
  const faster = autoCaloriePlan({ ...profile, goal: 'lose', weightLossPace: 'faster' }, weightKg)
  const gap = Math.max(0, weightKg - range.max)
  function changeIntake(value: string) { setIntakeText(value); setFeedback('') }
  function saveGoal() { if (!adult || !validGoal) return; updateProfile({ targetWeightKg: Math.round(goalKg * 100) / 100 }); setFeedback('Weight goal saved. Your daily calories have not changed.') }
  function applyCalories() {
    if (!eligible || !validIntake || clinical || loss <= 0 || intake >= maintenance) return
    updateProfile({ goal: 'lose', targetWeightKg: Math.round(goalKg * 100) / 100, calorieTargetOverride: Math.round(intake), calorieOverrideIncludesTraining: true })
    setFeedback('Weight goal and daily calorie target saved. Food and Home now use this target.')
  }
  return <section className="weight-journey" aria-label="Weight goal and calorie scenarios">
    <div className="journey-position"><div><span>Current BMI</span><strong>{Number.isFinite(bmi) ? bmi.toFixed(1) : '—'}</strong><small>{adult ? bmiCategory(bmi) : 'Adult screening not available'}</small></div><div><span>Standard healthy range</span><strong>{display(range.min)}–{display(range.max)} <small>{unit}</small></strong><p>For your {profile.heightCm} cm height · BMI 18.5–24.9</p></div><label className="journey-field">Target weight · {unit}<input type="number" step="0.1" inputMode="decimal" value={goalText} onChange={e => { setGoalText(e.target.value); setFeedback('') }} /></label></div>
    <p className="journey-range-note">{!adult ? 'This adult BMI and calorie planner is for ages 20+. Younger users need age-specific assessment.' : gap > 0 ? `${display(gap)} ${unit} from the upper end of the standard healthy BMI range. That is a screening milestone, not your only measure of health.` : belowRange ? 'You are below the standard BMI range. This page will not generate a weight-loss diet; discuss an appropriate goal with a clinician.' : 'You are already within the standard healthy BMI range. You do not need to lose weight just to “normalise” BMI.'}</p>

    <div className="journey-goal"><h2>Where would you like to be?</h2><p>Pick your own weight goal. The app will not choose an “ideal body” for you.</p>
      <div className="journey-shortcuts">{gap > 0 && <button type="button" onClick={() => setGoalText(display(range.max))}>Reach healthy BMI range</button>}{bmi >= 25 && <button type="button" onClick={() => setGoalText(display(Math.max(range.min, weightKg * .95)))}>First 5% milestone</button>}<button type="button" onClick={() => setGoalText(display(weightKg))}>Maintain current weight</button></div>
      {!validGoal && <p className="journey-error" role="alert">Choose a finite target at or above {display(range.min)} {unit}; the app will not plan a below-range weight.</p>}
      <div className="journey-goal-summary"><div><span>To your target</span><strong>{validGoal ? display(loss) : '—'} <small>{unit}</small></strong></div><div><span>Target BMI</span><strong>{validGoal ? (goalKg / (profile.heightCm / 100) ** 2).toFixed(1) : '—'}</strong></div><button type="button" disabled={!adult || !validGoal} onClick={saveGoal}>Save goal <Icon name="check" size={18} /></button></div>
      {validGoal && goalKg > weightKg && <p className="journey-range-note">This is a weight-gain goal. It can be saved, but the loss forecast below is not applicable.</p>}
    </div>

    <div className="journey-scenario"><h2>Choose a calorie scenario</h2><p>Estimated maintenance now: <strong>{maintenance.toLocaleString()} kcal/day</strong>. Daily activity is already included; exercise logs are not added again here.</p>
      <div className="journey-pace-options"><button type="button" aria-pressed={intake === steady.target} onClick={() => changeIntake(String(steady.target))}><strong>Steady</strong><span>{steady.target.toLocaleString()} kcal/day</span></button><button type="button" disabled={!faster.aggressiveAllowed} aria-pressed={intake === faster.target && faster.target !== steady.target} onClick={() => changeIntake(String(faster.target))}><strong>Faster cut</strong><span>{faster.aggressiveAllowed ? `${faster.target.toLocaleString()} kcal/day` : 'Not offered at this BMI'}</span></button><button type="button" aria-pressed={intake === 1000} onClick={() => changeIntake('1000')}><strong>Clinical low-energy</strong><span>1,000 kcal · explain only</span></button></div>
      <label className="journey-field">Daily intake scenario · kcal<input type="number" min="500" max="10000" inputMode="numeric" value={intakeText} onChange={e => changeIntake(e.target.value)} /></label>
      {!validIntake && <p className="journey-error" role="alert">Enter 500–10,000 kcal for the arithmetic. This input range is not a recommendation.</p>}
      {!eligible ? <p className="journey-caution">{!adult ? 'Adult forecasts are unavailable for your age or profile.' : belowRange ? 'Weight-loss forecasts are not provided below the healthy BMI range.' : 'Enter a valid weight goal to explore a scenario.'}</p> : validIntake && <>
        <div className="journey-scenario-results"><div><span>{maintenance >= intake ? 'Initial daily deficit' : 'Daily surplus'}</span><strong>{Math.abs(maintenance - intake).toLocaleString()} <small>kcal</small></strong></div><div><span>Initial energy arithmetic</span><strong>{display(Math.abs(projection?.initialWeeklyKg ?? 0))} <small>{unit}/week</small></strong><p>{maintenance > intake ? 'Equivalent loss, not guaranteed scale change' : maintenance < intake ? 'Equivalent gain, not weight loss' : 'At estimated maintenance'}</p></div></div>
        {clinical ? <div className="journey-caution" role="status"><h3>Clinical supervision, not a shortcut</h3><p>{intake.toLocaleString()} kcal/day is a restrictive scenario or a large deficit. The initial number is arithmetic only; FitCore will not apply it or promise a date at this intake.</p><p>Low-energy diets (800–1,200 kcal/day) and very-low-energy diets (under 800) are for selected people in specialist-supported care, nutritionally complete and normally limited to at most 12 weeks. BMI alone does not establish suitability.</p><a href="https://www.nice.org.uk/guidance/ng246/chapter/Physical-activity-and-diet" target="_blank" rel="noreferrer">Read NICE guidance <Icon name="open_in_new" size={15} /></a></div> : loss <= 0 ? <p className="journey-range-note">No loss is needed to reach this target. Explore maintenance instead of a deadline.</p> : <div className="journey-arrival"><span>Illustrative time to your target</span><strong>{forecastDays != null ? `${(forecastDays / 30.44).toFixed(1)} months` : 'Not reached in 24 months'}</strong><p>{forecastDays != null ? `Around ${shortDate(addDays(todayISO(), forecastDays))}, ${new Date(addDays(todayISO(), forecastDays)).getFullYear()} in this simplified model—not an achievable-by guarantee.` : intake >= maintenance ? 'This intake is at or above estimated maintenance. It does not produce a loss forecast.' : 'The model approaches a plateau before the target, or needs longer. Reassess the goal, activity and intake with qualified support.'}</p></div>}
        {!clinical && loss > 0 && intake < maintenance && <button type="button" className="journey-apply" onClick={applyCalories}>Use this daily target <Icon name="arrow_forward" size={19} /></button>}
      </>}
    </div>

    <div className="journey-deadline"><h2>What would a deadline require?</h2><p>Work backwards from your target, not from an extreme intake.</p><label className="journey-field">Time window · months<select value={months} onChange={e => setMonths(e.target.value)}>{[1,2,3,4,6,9,12,18,24].map(n => <option key={n} value={n}>{n} {n === 1 ? 'month' : 'months'}</option>)}</select></label>
      {eligible && loss > 0 ? required === null ? <p className="journey-caution">The selected target cannot be modelled within this window at an intake of at least 500 kcal/day. Choose more time; do not keep reducing intake.</p> : <div className={requiredClinical ? 'journey-caution' : 'journey-deadline-answer'}><strong>≈ {required.toLocaleString()} kcal/day</strong><p>{requiredClinical ? 'The arithmetic asks for a restrictive intake or excessive deficit. This is not a self-guided target. A longer timeline or clinical support is needed.' : 'Illustrative average intake at unchanged daily activity, with maintenance recalculated as weight changes. Review regularly; real physiology may require more time.'}</p>{!requiredClinical && <button type="button" onClick={() => changeIntake(String(required))}>Explore this scenario</button>}</div> : <p className="journey-range-note">Choose a valid adult weight-loss goal below your current weight to calculate a time-window scenario.</p>}
    </div>
    {feedback && <p className="journey-feedback" role="status">{feedback}</p>}
    <details className="journey-method"><summary>Assumptions, safety and references</summary><p>BMI is a screening tool, not body-fat measurement, diagnosis or a requirement to reach a particular weight. This page uses standard adult BMI 18.5–24.9; some Asian clinical risk thresholds differ. Discuss your personal range with a qualified clinician.</p><p>Energy model: each day’s weight changes by (Mifflin–St Jeor estimated maintenance at that weight − intake) ÷ 7,700. It recalculates maintenance, but does not model water changes, adaptive thermogenesis, medication, illness or changing activity. It is not the validated NIDDK Body Weight Planner.</p><p>Adults only. Not for pregnancy, breastfeeding, eating disorders or unsupervised treatment of medical conditions. App guardrails of 1,200/1,500 kcal (female/male), a deficit above 1,000 kcal/day or initial loss above 1% of body weight/week are caution flags, not proof that an intake above them is safe. Restrictive scenarios cannot be applied.</p><a href="https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html" target="_blank" rel="noreferrer">CDC: adult BMI</a><a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner" target="_blank" rel="noreferrer">NIDDK: personalised weight modelling</a></details>
  </section>
}
