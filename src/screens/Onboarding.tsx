import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { DEFAULT_PROFILE } from '../lib/storage'
import type { Goal, HalfMarathonGoal, Sport, UserProfile } from '../types'
import { Icon } from '../components/Icon'
import { GhostButton, PrimaryButton } from '../components/ui'
import { baseCalorieTarget, tdee } from '../lib/nutrition'
import { DIET_LIST } from '../lib/diet'
import { formatPace, HALF_MARATHON_GOALS, halfMarathonGoalLabel, halfMarathonGoalPace } from '../lib/plan'

const STEPS = ['Profile', 'Goal', 'Sports', 'Race', 'Targets', 'Diet']

const GOALS: { id: Goal; label: string; sub: string; icon: string }[] = [
  { id: 'lose', label: 'Lose fat', sub: 'Calorie deficit, preserve muscle', icon: 'trending_down' },
  { id: 'maintain', label: 'Maintain', sub: 'Hold weight, build performance', icon: 'horizontal_rule' },
  { id: 'gain', label: 'Build', sub: 'Lean mass surplus', icon: 'trending_up' },
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
  const [p, setP] = useState<UserProfile>({ ...DEFAULT_PROFILE })

  const set = (patch: Partial<UserProfile>) => setP((prev) => ({ ...prev, ...patch }))
  const toggleSport = (s: Sport) =>
    set({ sports: p.sports.includes(s) ? p.sports.filter((x) => x !== s) : [...p.sports, s] })

  const isRunner = p.sports.includes('running')
  const computedTarget = baseCalorieTarget({ ...p, calorieTargetOverride: null }, p.startWeightKg)
  const maint = tdee(p, p.startWeightKg)

  const canNext =
    step === 0
      ? p.name.trim().length > 0 && p.age > 0 && p.heightCm > 0 && p.startWeightKg > 0
      : step === 2
        ? p.sports.length > 0
        : true

  const finish = () => onboard(p)
  const next = () => {
    if (step === 2 && !isRunner) setStep(4)
    else if (step < STEPS.length - 1) setStep(step + 1)
    else finish()
  }
  const back = () => {
    if (step === 4 && !isRunner) setStep(2)
    else setStep(Math.max(0, step - 1))
  }

  return (
    <div className="min-h-full flex flex-col px-margin-mobile pt-xl pb-lg">
      <div className="flex items-center gap-sm mb-lg">
        <span className="font-display-hero text-headline-lg text-primary tracking-tighter">FitCore</span>
      </div>

      <div className="flex gap-2 mb-xl">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full flex-1 transition-all ${i <= step ? 'bg-primary' : 'bg-surface-container-high'}`} />
        ))}
      </div>

      <div className="flex-1 animate-fade-in">
        {step === 0 && (
          <Stepper title="Tell us about you" sub="We use this to calculate your energy needs.">
            <Field label="Name">
              <input className={inputCls} value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Ahmad" />
            </Field>
            <Field label="Sex">
              <Segmented options={[{ v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }]} value={p.sex} onChange={(v) => set({ sex: v as UserProfile['sex'] })} />
            </Field>
            <div className="grid grid-cols-3 gap-md">
              <Field label="Age">
                <input type="number" className={inputCls} value={p.age || ''} onChange={(e) => set({ age: +e.target.value })} />
              </Field>
              <Field label="Height cm">
                <input type="number" className={inputCls} value={p.heightCm || ''} onChange={(e) => set({ heightCm: +e.target.value })} />
              </Field>
              <Field label="Weight kg">
                <input type="number" step="0.1" className={inputCls} value={p.startWeightKg || ''} onChange={(e) => set({ startWeightKg: +e.target.value })} />
              </Field>
            </div>
            <Field label="Activity level">
              <select className={inputCls} value={p.activity} onChange={(e) => set({ activity: e.target.value as UserProfile['activity'] })}>
                <option value="sedentary">Sedentary</option>
                <option value="light">Lightly active</option>
                <option value="moderate">Moderately active</option>
                <option value="high">Highly active (4–6 days/wk)</option>
                <option value="athlete">Athlete</option>
              </select>
            </Field>
          </Stepper>
        )}

        {step === 1 && (
          <Stepper title="What's your goal?" sub="Sets your daily calorie strategy.">
            <div className="flex flex-col gap-md">
              {GOALS.map((g) => (
                <SelectCard key={g.id} active={p.goal === g.id} icon={g.icon} title={g.label} sub={g.sub} onClick={() => set({ goal: g.id })} />
              ))}
            </div>
          </Stepper>
        )}

        {step === 2 && (
          <Stepper title="Which sports?" sub="Pick all you train. We schedule around them.">
            <div className="grid grid-cols-2 gap-md">
              {SPORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSport(s.id)}
                  className={`p-md rounded-xl border flex flex-col items-center gap-sm transition ${
                    p.sports.includes(s.id) ? 'bg-primary-container/30 border-primary text-on-surface' : 'bg-tile border-tile-border text-on-surface-variant'
                  }`}
                >
                  <Icon name={s.icon} fill={p.sports.includes(s.id)} size={28} />
                  <span className="font-metric-md text-metric-md">{s.label}</span>
                </button>
              ))}
            </div>
          </Stepper>
        )}

        {step === 3 && (
          <Stepper title="Running plan" sub="Pick your race and how often you can train. We build a periodized plan that auto-tapers.">
            <Field label="Race distance">
              <div className="grid grid-cols-2 gap-sm">
                {([['half-marathon', 'Half Marathon', '21.1 km'], ['marathon', 'Full Marathon', '42.2 km']] as const).map(([id, label, dist]) => (
                  <button
                    key={id}
                    onClick={() => set({ raceType: id })}
                    className={`p-sm rounded-xl border text-left transition ${p.raceType === id ? 'bg-primary-container/30 border-primary text-on-surface' : 'bg-tile border-tile-border text-on-surface-variant'}`}
                  >
                    <span className="block font-metric-md text-[14px]">{label}</span>
                    <span className="block font-data-mono text-[11px]">{dist}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Training days per week">
              <div className="grid grid-cols-5 gap-1">
                {[3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => set({ trainingDaysPerWeek: d })}
                    className={`py-2 rounded-lg border font-metric-md text-[15px] transition ${p.trainingDaysPerWeek === d ? 'bg-primary text-on-primary border-primary' : 'bg-tile border-tile-border text-on-surface-variant'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Race date (optional)">
              <input type="date" className={inputCls} value={p.raceDate ?? ''} onChange={(e) => set({ raceDate: e.target.value || null })} />
            </Field>
            {p.raceType === 'half-marathon' && (
            <Field label="Half marathon goal">
              <div className="grid grid-cols-2 gap-sm">
                {HALF_MARATHON_GOALS.map((goal) => {
                  const pace = halfMarathonGoalPace(goal)
                  return (
                    <button
                      key={goal}
                      onClick={() => set({ halfMarathonGoal: goal as HalfMarathonGoal })}
                      className={`p-sm rounded-xl border text-left transition ${
                        p.halfMarathonGoal === goal ? 'bg-primary-container/30 border-primary text-on-surface' : 'bg-tile border-tile-border text-on-surface-variant'
                      }`}
                    >
                      <span className="block font-metric-md text-[14px]">{halfMarathonGoalLabel(goal)}</span>
                      <span className="block font-data-mono text-[11px]">{pace ? formatPace(pace) : 'Build finish confidence'}</span>
                    </button>
                  )
                })}
              </div>
            </Field>
            )}
            <p className="font-data-mono text-data-mono text-on-surface-variant">Leave the date blank to start with a rolling base block instead.</p>
          </Stepper>
        )}

        {step === 4 && (
          <Stepper title="Daily targets" sub="Auto-calculated from your profile. Adjust if you like.">
            <div className="bg-tile border border-tile-border rounded-xl p-md mb-md">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Maintenance (TDEE)</p>
              <p className="font-data-mono text-data-mono text-on-surface">{maint} kcal/day</p>
            </div>
            <Field label="Daily calorie target">
              <input type="number" className={inputCls} value={p.calorieTargetOverride ?? computedTarget} onChange={(e) => set({ calorieTargetOverride: +e.target.value })} />
            </Field>
            <Field label="Protein (g per kg bodyweight)">
              <input type="number" step="0.1" className={inputCls} value={p.proteinPerKg} onChange={(e) => set({ proteinPerKg: +e.target.value })} />
            </Field>
            <Field label="Connect wearables">
              <div className="flex flex-col gap-sm">
                {([['appleHealth', 'Apple Health'], ['garmin', 'Garmin Connect'], ['strava', 'Strava']] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => set({ wearables: { ...p.wearables, [k]: !p.wearables[k] } })}
                    className={`flex items-center justify-between p-md rounded-xl border transition ${
                      p.wearables[k] ? 'bg-secondary/10 border-secondary text-on-surface' : 'bg-tile border-tile-border text-on-surface-variant'
                    }`}
                  >
                    <span className="font-body-md text-body-md">{label}</span>
                    <Icon name={p.wearables[k] ? 'check_circle' : 'add_circle'} fill={p.wearables[k]} />
                  </button>
                ))}
              </div>
            </Field>
          </Stepper>
        )}

        {step === 5 && (
          <Stepper title="Eating protocol" sub="Pick a diet mode. Shapes your macros, fasting window, and daily nudges.">
            <div className="flex flex-col gap-sm">
              {DIET_LIST.map((d) => (
                <SelectCard key={d.id} active={p.dietMode === d.id} icon={d.icon} title={d.label} sub={d.tagline} onClick={() => set({ dietMode: d.id })} />
              ))}
            </div>
            {p.dietMode === 'keto' && (
              <Field label="Net carb cap (g/day)">
                <input type="number" className={inputCls} value={p.netCarbCapG} onChange={(e) => set({ netCarbCapG: +e.target.value })} />
              </Field>
            )}
            {(p.dietMode === 'omad' || p.dietMode === '16:8') && (
              <Field label="Eating window opens (hour, 0–23)">
                <input type="number" min={0} max={23} className={inputCls} value={p.eatingWindowStartHour} onChange={(e) => set({ eatingWindowStartHour: Math.max(0, Math.min(23, +e.target.value)) })} />
              </Field>
            )}
          </Stepper>
        )}
      </div>

      <div className="flex gap-md mt-lg">
        {step > 0 && <GhostButton onClick={back} className="flex-1">Back</GhostButton>}
        <PrimaryButton onClick={next} disabled={!canNext} className="flex-[2]">
          {step === STEPS.length - 1 ? 'Start training' : 'Next'}
          <Icon name="arrow_forward" size={20} />
        </PrimaryButton>
      </div>
    </div>
  )
}

const inputCls =
  'w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-3 text-on-surface font-body-md focus:border-primary focus:outline-none transition-colors'

function Stepper({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">{sub}</p>
      </div>
      <div className="flex flex-col gap-md">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-sm">
      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">{label}</span>
      {children}
    </label>
  )
}

function Segmented({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-sm">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 py-3 rounded-lg border font-metric-md text-metric-md transition ${
            value === o.v ? 'bg-primary-container/30 border-primary text-on-surface' : 'bg-tile border-tile-border text-on-surface-variant'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function SelectCard({ active, icon, title, sub, onClick }: { active: boolean; icon: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-md rounded-xl border flex items-center gap-md text-left transition ${active ? 'bg-primary-container/30 border-primary' : 'bg-tile border-tile-border'}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${active ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
        <Icon name={icon} fill={active} />
      </div>
      <div>
        <p className="font-metric-md text-metric-md text-on-surface">{title}</p>
        <p className="font-data-mono text-[12px] text-on-surface-variant">{sub}</p>
      </div>
    </button>
  )
}
