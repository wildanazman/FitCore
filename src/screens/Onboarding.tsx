import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../store/AppContext'
import { DEFAULT_PROFILE } from '../lib/storage'
import type { Goal, Sport, UserProfile } from '../types'
import { Icon } from '../components/Icon'
import { FitCoreLogo } from '../components/FitCoreLogo'
import '../components/fitcore-logo.css'
import { ProteinIdeas } from '../components/ProteinIdeas'
import { autoCaloriePlan } from '../lib/nutrition'
import { DIET_LIST } from '../lib/diet'
import './onboarding.css'

const STEPS = ['Name', 'Baseline', 'Daily rhythm', 'Goal', 'Sports', 'Targets', 'Diet'] as const

const ACTIVITIES: { id: UserProfile['activity']; label: string; detail: string; icon: string }[] = [
  { id: 'sedentary', label: 'Mostly seated', detail: 'Desk work and little walking', icon: 'horizontal_rule' },
  { id: 'light', label: 'Some movement', detail: 'Walking through the day', icon: 'directions_run' },
  { id: 'moderate', label: 'On my feet', detail: 'A job that keeps me moving', icon: 'trending_up' },
  { id: 'high', label: 'Very active', detail: 'Physical work or frequent training', icon: 'directions_run' },
  { id: 'athlete', label: 'Training hard', detail: 'Demanding sessions most days', icon: 'fitness_center' },
]

const GOALS: { id: Goal; label: string; detail: string; icon: string }[] = [
  { id: 'lose', label: 'Lose fat', detail: 'A measured calorie deficit', icon: 'trending_down' },
  { id: 'maintain', label: 'Maintain', detail: 'Hold weight, build consistency', icon: 'horizontal_rule' },
  { id: 'gain', label: 'Build muscle', detail: 'A steady calorie surplus', icon: 'trending_up' },
]

const SPORTS: { id: Sport; label: string; icon: string }[] = [
  { id: 'running', label: 'Running', icon: 'directions_run' },
  { id: 'strength', label: 'Strength', icon: 'fitness_center' },
  { id: 'badminton', label: 'Badminton', icon: 'sports_tennis' },
  { id: 'pickleball', label: 'Pickleball', icon: 'sports_tennis' },
]

export function Onboarding() {
  const { onboard } = useApp()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<UserProfile>({
    ...DEFAULT_PROFILE,
    age: 0,
    heightCm: 0,
    startWeightKg: 0,
    activity: 'light',
    sports: [],
  })
  const contentRef = useRef<HTMLElement>(null)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [step])

  const update = (patch: Partial<UserProfile>) => setProfile((current) => ({ ...current, ...patch }))
  const toggleSport = (sport: Sport) => {
    setProfile((current) => ({
      ...current,
      sports: current.sports.includes(sport)
        ? current.sports.filter((item) => item !== sport)
        : [...current.sports, sport],
    }))
  }

  const plan = autoCaloriePlan(profile, profile.startWeightKg)
  const validBody = profile.age >= 18 && profile.heightCm > 0 && profile.startWeightKg > 0
  const canContinue = step === 0 ? profile.name.trim().length > 0 : step === 1 ? validBody : true
  const next = () => {
    if (!canContinue) return
    if (step === STEPS.length - 1) onboard(profile)
    else setStep((current) => current + 1)
  }

  return (
    <div className="onboarding">
      <header className="onboarding-header">
        <div className="onboarding-header-top">
          <FitCoreLogo size={36} />
          <span className="onboarding-progress-text" aria-live="polite">{String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span>
        </div>
        <div className="onboarding-progress-track" role="progressbar" aria-label="Setup progress" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          <div style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }} />
        </div>
      </header>

      <main ref={contentRef} className="onboarding-content">
        <div key={step} className="onboarding-step">
          {step === 0 && (
            <StepIntro title={<>First things first.<br /><em>What’s your name?</em></>} description="We’ll put your name on the plan we build together.">
              <Field label="Your name" htmlFor="onboarding-name">
                <input id="onboarding-name" className="onboarding-input onboarding-name-input" autoComplete="given-name" autoFocus value={profile.name} onChange={(event) => update({ name: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter' && profile.name.trim()) next() }} placeholder="Your name" />
              </Field>
              <div className="onboarding-intro-ticket" aria-live="polite">
                <span>FITCORE STARTING LINE</span>
                <strong>{profile.name.trim() || 'Your name here'}</strong>
                <span className="onboarding-ticket-arrow" aria-hidden="true">↗</span>
              </div>
              <p className="onboarding-note">About two minutes. Your details stay on this device.</p>
            </StepIntro>
          )}

          {step === 1 && (
            <StepIntro title={<>Build your<br /><em>baseline.</em></>} description={`A few numbers shape your daily target, ${profile.name.trim() || 'athlete'}.`}>
              <fieldset className="onboarding-fieldset">
                <legend>Sex for calorie estimate</legend>
                <div className="onboarding-segmented">
                  {([{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] as const).map(({ value, label }) => (
                    <button key={value} type="button" aria-pressed={profile.sex === value} onClick={() => update({ sex: value })}>{label}</button>
                  ))}
                </div>
              </fieldset>
              <div className="onboarding-measurements">
                <Field label="Age" htmlFor="onboarding-age">
                  <div className="onboarding-input-unit"><input id="onboarding-age" type="number" inputMode="numeric" min={18} className="onboarding-input" value={profile.age || ''} onChange={(event) => update({ age: +event.target.value })} placeholder="32" /><span>years</span></div>
                </Field>
                <Field label="Height" htmlFor="onboarding-height">
                  <div className="onboarding-input-unit"><input id="onboarding-height" type="number" inputMode="decimal" min={1} className="onboarding-input" value={profile.heightCm || ''} onChange={(event) => update({ heightCm: +event.target.value })} placeholder="170" /><span>cm</span></div>
                </Field>
                <Field label="Weight" htmlFor="onboarding-weight">
                  <div className="onboarding-input-unit"><input id="onboarding-weight" type="number" inputMode="decimal" min={1} step="0.1" className="onboarding-input" value={profile.startWeightKg || ''} onChange={(event) => update({ startWeightKg: +event.target.value })} placeholder="70" /><span>kg</span></div>
                </Field>
              </div>
              <div className="onboarding-live-readout" aria-live="polite">
                <span className="onboarding-readout-mark" aria-hidden="true">01</span>
                <div><span>Baseline check</span><strong>{validBody ? `BMI ${plan.bmi.toFixed(1)} · ${plan.category}` : 'Add your measurements to see a preview'}</strong></div>
              </div>
            </StepIntro>
          )}

          {step === 2 && (
            <StepIntro title={<>What does your<br /><em>day feel like?</em></>} description="Think about work and everyday movement. We'll use this to estimate your energy needs.">
              <div className="onboarding-live-readout onboarding-live-readout-lime" aria-live="polite">
                <span className="onboarding-readout-mark" aria-hidden="true">02</span>
                <div><span>Estimated maintenance</span><strong>{plan.maintenance.toLocaleString()} kcal / day</strong></div>
              </div>
              <div className="onboarding-choices" role="group" aria-label="Daily activity level">
                {ACTIVITIES.map((activity) => (
                  <Choice key={activity.id} active={profile.activity === activity.id} icon={activity.icon} title={activity.label} detail={activity.detail} onClick={() => update({ activity: activity.id })} />
                ))}
              </div>
            </StepIntro>
          )}

          {step === 3 && (
            <StepIntro title={<>What are you<br /><em>working toward?</em></>} description="Choose your direction. Your daily calorie target will follow it.">
              <div className="onboarding-live-readout onboarding-live-readout-lime" aria-live="polite">
                <span className="onboarding-readout-mark" aria-hidden="true">03</span>
                <div><span>Daily target with this goal</span><strong>{plan.target.toLocaleString()} kcal</strong></div>
              </div>
              <div className="onboarding-choices" role="group" aria-label="Fitness goal">
                {GOALS.map((goal) => (
                  <Choice key={goal.id} active={profile.goal === goal.id} icon={goal.icon} title={goal.label} detail={goal.detail} onClick={() => update({ goal: goal.id })} />
                ))}
              </div>
              {profile.goal === 'lose' && (
                <section className="onboarding-pace" aria-labelledby="onboarding-pace-title">
                  <div className="onboarding-section-heading">
                    <h2 id="onboarding-pace-title">Choose your pace</h2>
                    <span>BMI {plan.bmi.toFixed(1)}</span>
                  </div>
                  <div className="onboarding-pace-options">
                    <button type="button" aria-pressed={profile.weightLossPace === 'steady'} onClick={() => update({ weightLossPace: 'steady' })}>
                      <strong>Steady</strong><span>Made for consistency</span>
                    </button>
                    <button type="button" aria-pressed={profile.weightLossPace === 'faster' && plan.aggressiveAllowed} disabled={!plan.aggressiveAllowed} onClick={() => update({ weightLossPace: 'faster' })}>
                      <strong>Faster</strong><span>{plan.aggressiveAllowed ? 'A larger measured deficit' : 'Available from BMI 25'}</span>
                    </button>
                  </div>
                  {plan.bmi < 18.5 && <p className="onboarding-note">Your BMI is below the usual healthy range. FitCore will use maintenance calories.</p>}
                </section>
              )}
            </StepIntro>
          )}

          {step === 4 && (
            <StepIntro title={<>Move your<br /><em>own way.</em></>} description="Optional. Pick activities you enjoy, or skip if you're here to focus on food and weight.">
              <div className="onboarding-sport-grid" role="group" aria-label="Sports you train">
                {SPORTS.map((sport) => {
                  const active = profile.sports.includes(sport.id)
                  return (
                    <button key={sport.id} type="button" className="onboarding-sport" aria-pressed={active} onClick={() => toggleSport(sport.id)}>
                      <Icon name={sport.icon} size={27} />
                      <span>{sport.label}</span>
                      <Icon name={active ? 'check_circle' : 'add_circle'} size={22} className="onboarding-sport-state" />
                    </button>
                  )
                })}
              </div>
              <p className="onboarding-note" aria-live="polite">{profile.sports.length ? `${profile.sports.length} ${profile.sports.length === 1 ? 'activity' : 'activities'} in your mix` : 'No training plan needed. You can log activity any time.'}</p>
            </StepIntro>
          )}

          {step === 5 && (
            <StepIntro title={<>Your starting<br /><em>number.</em></>} description="An estimate based on your body stats, daily activity and goal.">
              <div className="onboarding-target">
                <div className="onboarding-target-main">
                  <span>Daily calorie target</span>
                  <p>{plan.target.toLocaleString()}<small>kcal</small></p>
                  <strong>{profile.goal === 'lose' ? `${plan.pace === 'faster' ? 'Faster' : 'Steady'} fat loss` : profile.goal === 'gain' ? 'Build muscle' : 'Maintain weight'}</strong>
                </div>
                <div className="onboarding-target-details">
                  <div><span>Maintenance estimate</span><strong>{plan.maintenance.toLocaleString()} kcal</strong></div>
                  <div><span>BMI <small>(screening only)</small></span><strong>{plan.bmi.toFixed(1)} · {plan.category}</strong></div>
                </div>
              </div>
              {profile.goal === 'lose' && <p className="onboarding-note">Estimated change: about {plan.estimatedWeeklyKg} kg per week. Your needs can differ; adjust your plan as you log progress.</p>}
              <ProteinIdeas target={Math.round(profile.proteinPerKg * profile.startWeightKg)} />
              {profile.goal === 'lose' && plan.bmi < 18.5 && <p className="onboarding-note onboarding-note-warning">BMI is below the usual healthy range, so the target stays at maintenance.</p>}
            </StepIntro>
          )}

          {step === 6 && (
            <StepIntro title={<>How do you<br /><em>prefer to eat?</em></>} description="A balanced plan works for most people. Choose a specific protocol only if it suits you.">
              <div className="onboarding-choices" role="group" aria-label="Eating protocol">
                {DIET_LIST.map((diet) => (
                  <Choice key={diet.id} active={profile.dietMode === diet.id} icon={diet.icon} title={diet.label} detail={diet.tagline} onClick={() => update({ dietMode: diet.id })} />
                ))}
              </div>
              {profile.dietMode === 'keto' && (
                <Field label="Daily net carb cap" htmlFor="onboarding-carb">
                  <div className="onboarding-input-unit"><input id="onboarding-carb" type="number" inputMode="numeric" min={1} className="onboarding-input" value={profile.netCarbCapG} onChange={(event) => update({ netCarbCapG: +event.target.value })} /><span>g/day</span></div>
                </Field>
              )}
              {(profile.dietMode === 'omad' || profile.dietMode === '16:8') && (
                <Field label="Eating window starts" htmlFor="onboarding-window">
                  <div className="onboarding-input-unit"><input id="onboarding-window" type="number" inputMode="numeric" min={0} max={23} className="onboarding-input" value={profile.eatingWindowStartHour} onChange={(event) => update({ eatingWindowStartHour: Math.max(0, Math.min(23, +event.target.value)) })} /><span>hour</span></div>
                </Field>
              )}
            </StepIntro>
          )}
        </div>
      </main>

      <footer className="onboarding-footer">
        {step > 0 && <button className="onboarding-back" type="button" onClick={() => setStep((current) => current - 1)} aria-label="Go back"><Icon name="arrow_back" size={22} /></button>}
        <button className="onboarding-next" type="button" disabled={!canContinue} onClick={next}>
          <span>{step === STEPS.length - 1 ? 'Open FitCore' : 'Continue'}</span>
          <Icon name="arrow_forward" size={23} />
        </button>
      </footer>
    </div>
  )
}

function StepIntro({ title, description, children }: { title: ReactNode; description: string; children: ReactNode }) {
  return <>
    <div className="onboarding-intro"><h1>{title}</h1><p>{description}</p></div>
    <div className="onboarding-step-body">{children}</div>
  </>
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return <div className="onboarding-field"><label htmlFor={htmlFor}>{label}</label>{children}{hint && <p>{hint}</p>}</div>
}

function Choice({ active, icon, title, detail, onClick }: { active: boolean; icon: string; title: string; detail: string; onClick: () => void }) {
  return <button type="button" className="onboarding-choice" aria-pressed={active} onClick={onClick}>
    <span className="onboarding-choice-icon"><Icon name={icon} size={22} /></span>
    <span className="onboarding-choice-copy"><strong>{title}</strong><small>{detail}</small></span>
    <Icon name={active ? 'check_circle' : 'arrow_forward'} size={22} className="onboarding-choice-state" />
  </button>
}
