import { useEffect, useRef, useState } from 'react'
import { LayoutGroup, motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { DEFAULT_PROFILE } from '../lib/storage'
import { autoCaloriePlan } from '../lib/nutrition'
import type { Goal, UserProfile } from '../types'
import { FitCoreLogo } from '../components/FitCoreLogo'
import '../components/fitcore-logo.css'
import './onboarding.css'
import { BackupTransfer } from '../components/BackupTransfer'
import './settings.css'

// Inline pictograms remain usable when an external icon font is unavailable.
function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    trending_down: 'M3 6l6 6 4-4 8 10M15 18h6v-6',
    trending_up: 'M3 18l6-6 4 4 8-10M15 6h6v6',
    horizontal_rule: 'M4 12h16', fitness_center: 'M5 5l14 14M3 7l4-4M2 10l8-8M14 22l8-8M17 21l4-4',
    arrow_forward: 'M4 12h16M14 6l6 6-6 6', arrow_back: 'M20 12H4M10 6l-6 6 6 6',
    check_circle: 'M9 12l2 2 4-4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    circle: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', radio_button_unchecked: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    remove: 'M5 12h14', add: 'M5 12h14M12 5v14',
    chair: 'M6 12V4h12v8M4 12h16v5H4zM6 17v4M18 17v4',
    directions_walk: 'M14 3h.01M12 7l-3 5-4 1M12 7l4 5 4 1M12 7l-1 8 5 6M11 15l-5 6',
    steps: 'M5 17h4v-4h5V9h5V5h3M3 21h18', sports: 'M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3z',
    restaurant: 'M5 3v7M9 3v7M3 3v5a4 4 0 0 0 8 0V3M7 12v9M20 3c-4 3-5 7-5 10h5M20 3v18',
    monitor_weight: 'M4 3h16v18H4zM8 7h8M12 7l2 3', edit: 'M14 5l5 5M3 21l5-1L21 7l-5-5L3 15z',
  }
  return <svg className="first-day-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

const GOALS: { id: Goal; label: string; detail: string; icon: string }[] = [
  { id: 'lose', label: 'Lose fat', detail: 'Find a deficit that fits your day.', icon: 'trending_down' },
  { id: 'maintain', label: 'Maintain', detail: 'Eat well. Stay consistent.', icon: 'horizontal_rule' },
  { id: 'gain', label: 'Gain weight', detail: 'Start with a calorie surplus.', icon: 'trending_up' },
]
const ACTIVITIES: { id: UserProfile['activity']; label: string; detail: string; icon: string }[] = [
  { id: 'sedentary', label: 'Mostly at a desk', detail: 'Seated work, little walking.', icon: 'chair' },
  { id: 'light', label: 'A little of both', detail: 'Seated work with some daily walking.', icon: 'directions_walk' },
  { id: 'moderate', label: 'On my feet', detail: 'Moving around for much of the day.', icon: 'steps' },
  { id: 'high', label: 'A physical day', detail: 'Physical work or frequent training.', icon: 'fitness_center' },
  { id: 'athlete', label: 'Training is my routine', detail: 'Demanding sessions most days.', icon: 'sports' },
]
const METRICS = {
  1: { key: 'age', title: 'How old are you?', description: 'Personal calorie estimates here are for adults.', unit: 'years', min: 18, max: 120, seed: 30, step: 1 },
  3: { key: 'heightCm', title: 'How tall are you?', description: 'Move the ruler, or tap the number and type.', unit: 'cm', min: 60, max: 260, seed: 170, step: 1 },
  4: { key: 'startWeightKg', title: 'Your starting weight?', description: 'A starting point, not a judgement. You can update it later.', unit: 'kg', min: 20, max: 500, seed: 70, step: .1 },
} as const
const CHAPTERS = ['Direction', 'You', 'Your day', 'Strategy', 'Ready']
const chapterFor = (step: number) => step === 0 ? 0 : step <= 4 ? 1 : step === 5 ? 2 : step === 6 ? 3 : 4

export function Onboarding() {
  const { onboard } = useApp()
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [goalChosen, setGoalChosen] = useState(false)
  const [sexChosen, setSexChosen] = useState(false)
  const [activityChosen, setActivityChosen] = useState(false)
  const [buildMuscle, setBuildMuscle] = useState(false)
  const [measurementTouched, setMeasurementTouched] = useState<Partial<Record<'age' | 'heightCm' | 'startWeightKg', boolean>>>({})
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE, age: 0, heightCm: 0, startWeightKg: 0, sports: [], activity: 'light', dietMode: 'standard', calorieTargetOverride: null })
  const main = useRef<HTMLElement>(null)
  const transitionUntil = useRef(0)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const update = (patch: Partial<UserProfile>) => setProfile(current => ({ ...current, ...patch }))
  const metric = METRICS[step as keyof typeof METRICS]
  const untouched = !!metric && !measurementTouched[metric.key]
  const candidate = metric ? (untouched ? metric.seed : profile[metric.key]) : null
  const validMetric = metric && candidate !== null && Number.isFinite(candidate) && candidate >= metric.min && candidate <= metric.max && (metric.key !== 'age' || Number.isInteger(candidate))
  const validBody = Number.isInteger(profile.age) && profile.age >= 18 && profile.age <= 120 && Number.isFinite(profile.heightCm) && profile.heightCm >= 60 && profile.heightCm <= 260 && Number.isFinite(profile.startWeightKg) && profile.startWeightKg >= 20 && profile.startWeightKg <= 500 && sexChosen
  const plan = validBody ? autoCaloriePlan(profile, profile.startWeightKg) : null
  const goal = GOALS.find(g => g.id === profile.goal)!
  const activity = ACTIVITIES.find(a => a.id === profile.activity)!
  const ready = step === 0 ? goalChosen : metric ? validMetric : step === 2 ? sexChosen : step === 5 ? activityChosen : validBody
  const chapter = chapterFor(step)
  useEffect(() => { main.current?.scrollTo({ top: 0 }) }, [step])
  function go(next: number) { if (Date.now() < transitionUntil.current) return; transitionUntil.current = Date.now() + (reduced ? 180 : 520); setDirection(next > step ? 1 : -1); setStep(next) }
  function next() {
    if (!ready || Date.now() < transitionUntil.current) return
    if (metric) { update({ [metric.key]: candidate }); setMeasurementTouched(current => ({ ...current, [metric.key]: true })) }
    if (step === 7 && plan) {
      onboard({ ...profile, name: profile.name.trim() || 'You', weightLossPace: plan.pace, sports: buildMuscle ? ['strength'] : [], dietMode: 'standard' })
    } else go(step + 1)
  }
  const title = step === 0 ? 'What brings you here?' : metric?.title ?? (step === 2 ? 'A detail for your estimate.' : step === 5 ? 'What does your day look like?' : step === 6 ? (profile.goal === 'lose' ? 'Find your own pace.' : 'Fuel your direction.') : 'This is your first day.')
  const description = step === 0 ? 'Let’s build a day around you. Start with your direction.' : metric?.description ?? (step === 2 ? 'The current calorie equation uses sex. This is only for the estimate.' : step === 5 ? 'Include your everyday movement and usual training—not your busiest day.' : step === 6 ? 'Try a strategy. See how your daily fuel changes.' : 'A starting plan, not a perfect-day checklist. Make it yours as you go.')
  return <LayoutGroup id="first-day"><div className="onboarding first-day-onboarding">
    {step===0&&<details className="onboarding-restore"><summary>Already use FitCore? Restore your backup</summary><BackupTransfer importOnly/></details>}
    <header className="first-day-header"><div className="first-day-brand"><FitCoreLogo size={32} />{step > 0 && <motion.span layoutId="chosen-direction" className="first-day-goal-chip" transition={{ duration: reduced ? 0 : .3 }}><Icon name={goal.icon} size={16} />{goal.label}</motion.span>}</div>
      <div className="first-day-progress" role="progressbar" aria-label="Setup progress" aria-valuenow={step + 1} aria-valuemin={0} aria-valuemax={8}>{CHAPTERS.map((label, i) => <div key={label} className={i <= chapter ? 'is-reached' : ''}><span>{label}</span><i><motion.b animate={{ scaleX: i < chapter ? 1 : i > chapter ? 0 : step === 7 ? 1 : (step === 0 ? 1 : step <= 4 ? step / 4 : 1) }} transition={{ duration: reduced ? 0 : .3 }} /></i></div>)}</div>
    </header>
    <main className="first-day-content" ref={main}>
        {/* Mount the new step immediately. Navigation must never wait for an exit callback. */}
        <motion.section key={step} initial={reduced ? false : { opacity: 1, x: direction * 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduced ? 0 : .24, ease: [.16, 1, .3, 1] }} onAnimationComplete={() => titleRef.current?.focus({ preventScroll: true })} className="first-day-step">
          <div className="first-day-intro"><h1 ref={titleRef} tabIndex={-1}>{title}</h1><p>{description}</p></div>
          {step === 0 && <div className="first-day-goals" role="group" aria-label="Your direction">{GOALS.map((g, i) => <motion.button key={g.id} type="button" layout aria-pressed={goalChosen && profile.goal === g.id} className={goalChosen && profile.goal === g.id ? 'selected' : ''} onClick={() => { update({ goal: g.id, weightLossPace: 'steady' }); setGoalChosen(true) }} whileTap={reduced ? undefined : { scale: .985 }}>
            <span className="first-day-goal-icon"><Icon name={g.icon} size={i === 0 ? 32 : 27} /></span><span className="first-day-goal-copy">{goalChosen && profile.goal === g.id ? <motion.strong layoutId="chosen-direction">{g.label}</motion.strong> : <strong>{g.label}</strong>}<small>{g.detail}</small></span><Icon name={goalChosen && profile.goal === g.id ? 'check_circle' : 'arrow_forward'} size={24} />
          </motion.button>)}<button type="button" className="first-day-muscle" aria-pressed={buildMuscle} onClick={() => setBuildMuscle(current => !current)}><Icon name={buildMuscle ? 'check_circle' : 'radio_button_unchecked'} size={23} /><span><strong>Build muscle too</strong><small>Combine it with any weight goal. No surplus required just to select it.</small></span></button><p className="first-day-note">Food and weight are enough. No running plan required.</p></div>}
          {metric && <Measurement key={metric.key} config={metric} value={profile[metric.key]} untouched={untouched} onChange={value => { update({ [metric.key]: value }); setMeasurementTouched(current => ({ ...current, [metric.key]: true })) }} onNext={next} valid={!!validMetric} />}
          {step === 2 && <><div className="first-day-sex" role="group" aria-label="Sex for calorie estimate">{(['male', 'female'] as const).map(sex => <motion.button type="button" key={sex} aria-pressed={sexChosen && profile.sex === sex} onClick={() => { update({ sex }); setSexChosen(true) }} whileTap={reduced ? undefined : { scale: .98 }}><Icon name={sexChosen && profile.sex === sex ? 'check_circle' : 'circle'} size={24} />{sex === 'male' ? 'Male' : 'Female'}</motion.button>)}</div><p className="first-day-note">This equation offers these two inputs. Your needs can differ; targets remain editable.</p></>}
          {step === 5 && plan && <><div className="first-day-energy"><span>Your estimated maintenance</span><strong><AnimatedNumber value={plan.maintenance} /> <small>kcal / day</small></strong><p>Changes as you choose your everyday rhythm.</p></div><div className="first-day-routines" role="group" aria-label="Daily activity level">{ACTIVITIES.map(a => <motion.button type="button" key={a.id} aria-pressed={activityChosen && profile.activity === a.id} onClick={() => { update({ activity: a.id }); setActivityChosen(true) }} whileTap={reduced ? undefined : { scale: .99 }}><Icon name={a.icon} size={23} /><span><strong>{a.label}</strong><small>{a.detail}</small></span><Icon name={activityChosen && profile.activity === a.id ? 'check_circle' : 'radio_button_unchecked'} size={21} /></motion.button>)}</div><p className="first-day-note">This includes your usual activity. We won’t add the same exercise twice to this estimate.</p></>}
          {step === 6 && plan && <><div className="first-day-energy strategy-energy"><span>Your starting daily target</span><strong><AnimatedNumber value={plan.target} /> <small>kcal</small></strong><p>{profile.goal === 'lose' ? plan.deficitKcal ? `${plan.deficitKcal} kcal below estimated maintenance` : 'Maintenance—no weight-loss deficit applied' : profile.goal === 'gain' ? 'A starting surplus above estimated maintenance' : 'Around your estimated maintenance'}</p></div>
            {profile.goal === 'lose' ? <div className="first-day-strategies" role="group" aria-label="Weight-loss strategy">{(['steady', 'faster'] as const).map(pace => { const p = autoCaloriePlan({ ...profile, weightLossPace: pace }, profile.startWeightKg); const disabled = pace === 'faster' && (!plan.aggressiveAllowed || plan.deficitKcal === 0); return <motion.button key={pace} type="button" disabled={disabled} aria-pressed={plan.pace === pace} onClick={() => update({ weightLossPace: pace })} whileTap={reduced ? undefined : { scale: .985 }}><div><strong>{pace === 'steady' ? 'Steady' : 'Faster'}</strong><Icon name={plan.pace === pace ? 'check_circle' : 'radio_button_unchecked'} size={22} /></div><span>{p.target.toLocaleString()} <small>kcal / day</small></span><p>{pace === 'steady' ? 'A smaller deficit, built for consistency.' : disabled ? 'Not offered for your current BMI / target.' : 'A larger deficit. Review how you feel and progress.'}</p></motion.button> })}</div> : <div className="first-day-strategy-note"><Icon name={goal.icon} size={28} /><div><strong>{goal.label}</strong><p>No weight-loss pace to choose. Your target follows this goal.</p></div></div>}
            <p className="first-day-note">{plan.bmi < 18.5 && profile.goal === 'lose' ? 'Your BMI is below the usual healthy range. The estimate stays at maintenance; discuss a suitable goal with qualified support.' : 'These are estimates, not a promise of weight change. You can adjust them as you log progress.'}</p>
          </>}
          {step === 7 && plan && <><label className="first-day-name">What should we call you? <span>Optional</span><input autoComplete="given-name" maxLength={50} value={profile.name} onChange={e => update({ name: e.target.value })} placeholder="Your name" /></label>
            <motion.div className="first-day-preview" initial={reduced ? false : { clipPath: 'inset(0 0 100% 0 round 16px)' }} animate={{ clipPath: 'inset(0 0 0% 0 round 16px)' }} transition={{ duration: .45, ease: [.16, 1, .3, 1] }}>
              <h2>{profile.name.trim() ? `Your day, ${profile.name.trim()}.` : 'Your day starts here.'}</h2><div className="first-day-preview-energy"><div><span>Daily calorie target</span><strong><AnimatedNumber value={plan.target} /><small> kcal</small></strong></div><div><span>Protein target</span><strong>{Math.round(profile.proteinPerKg * profile.startWeightKg)}<small> g</small></strong></div></div>
              <div className="first-day-fuel-track"><span>{buildMuscle ? `${goal.label} + build muscle` : 'Personalised starting fuel'}</span><Icon name={goal.icon} size={20} /></div>
              <div className="first-day-preview-rows">{[{ icon: 'restaurant', title: 'Find your first meal', detail: 'Search Malaysian foods or paste an estimate.' }, { icon: 'monitor_weight', title: 'Your weight baseline', detail: `${profile.startWeightKg.toFixed(1)} kg · follow the trend, not one day.` }, { icon: 'fitness_center', title: buildMuscle ? 'Make room for strength' : 'Move your own way', detail: buildMuscle ? 'Explore home or gym exercises in Activity. No workout is logged yet.' : 'Activity is optional. Log it when you do it.' }].map((row, i) => <motion.div key={row.title} initial={reduced ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduced ? 0 : .15 + i * .07, duration: .22 }}><Icon name={row.icon} size={23} /><div><strong>{row.title}</strong><p>{row.detail}</p></div></motion.div>)}</div>
            </motion.div><div className="first-day-review"><button type="button" onClick={() => go(1)}>Review measurements <Icon name="arrow_back" size={17} /></button><button type="button" onClick={() => go(5)}>{activity.label} <Icon name="edit" size={17} /></button></div><p className="first-day-note">Preview only—no meals or completed workouts have been logged. Start balanced; customise diet protocols and sports later in Settings, Diet or Activity. Your details stay on this device.</p>
          </>}
        </motion.section>
    </main>
    <footer className="first-day-footer">{step > 0 && <button type="button" aria-label="Go back" className="first-day-back" onClick={() => go(step - 1)}><Icon name="arrow_back" size={22} /></button>}<button type="button" className="first-day-next" disabled={!ready} onClick={next}><span>{step === 7 ? 'Open FitCore' : step === 0 ? 'Build my day' : step === 6 ? 'See my day' : metric && candidate !== null && Number.isFinite(candidate) ? `Use ${candidate} ${metric.unit}` : 'Continue'}</span><Icon name="arrow_forward" size={22} /></button></footer>
  </div></LayoutGroup>
}

function AnimatedNumber({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const spring = useSpring(value, { stiffness: 180, damping: 28 })
  const text = useTransform(spring, n => Math.round(n).toLocaleString())
  useEffect(() => { if (reduced) spring.jump(value); else spring.set(value) }, [value, reduced, spring])
  return <><span className="sr-only">{value.toLocaleString()}</span><motion.span aria-hidden="true">{text}</motion.span></>
}

function Measurement({ config, value, untouched, onChange, onNext, valid }: { config: typeof METRICS[keyof typeof METRICS]; value: number; untouched: boolean; onChange: (n: number) => void; onNext: () => void; valid: boolean }) {
  const current = untouched ? config.seed : value
  const center = Number.isFinite(current) ? Math.round(current) : config.seed
  const rangeValue = Number.isFinite(current) ? Math.max(config.min, Math.min(config.max, current)) : config.seed
  return <div className="first-day-measure">
    <label className="first-day-measure-number"><span className="sr-only">{config.key === 'age' ? 'Age' : config.key === 'heightCm' ? 'Height' : 'Weight'}</span><input type="number" inputMode={config.step === 1 ? 'numeric' : 'decimal'} min={config.min} max={config.max} step={config.step} value={untouched || !Number.isFinite(value) ? '' : value} placeholder={String(config.seed)} onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))} onKeyDown={e => { if (e.key === 'Enter' && valid) onNext() }} /><small>{config.unit}</small></label>
    <div className="first-day-ruler" aria-hidden="true">{Array.from({ length: 21 }, (_, i) => { const n = center + i - 10; return <div key={i} className={i === 10 ? 'center' : i % 5 === 0 ? 'major' : ''}><i />{i % 5 === 0 && <span>{n >= config.min && n <= config.max ? n : ''}</span>}</div> })}<b /></div>
    <label className="first-day-range"><span>Drag to adjust {config.unit}</span><input type="range" min={config.min} max={config.max} step={config.step} value={rangeValue} aria-label={`Adjust ${config.key === 'age' ? 'age' : config.key === 'heightCm' ? 'height' : 'weight'} ruler`} onChange={e => onChange(Number(e.target.value))} /></label>
    <div className="first-day-adjust"><button type="button" aria-label={`Decrease ${config.unit}`} disabled={!Number.isFinite(current) || current <= config.min} onClick={() => onChange(Math.round((current - config.step) * 10) / 10)}><Icon name="remove" size={22} /></button><span>{config.step === .1 ? '0.1 kg at a time' : `1 ${config.unit === 'years' ? 'year' : config.unit} at a time`}</span><button type="button" aria-label={`Increase ${config.unit}`} disabled={!Number.isFinite(current) || current >= config.max} onClick={() => onChange(Math.round((current + config.step) * 10) / 10)}><Icon name="add" size={22} /></button></div>
    {!valid && <p className="first-day-error" role="alert">Enter {config.min}–{config.max} {config.unit}{config.key === 'age' ? ' as a whole number' : ''} to continue.</p>}
    {untouched && <p className="first-day-note">The ruler starts at {config.seed} {config.unit}. Adjust it or confirm this value below; it isn’t saved yet.</p>}
  </div>
}
