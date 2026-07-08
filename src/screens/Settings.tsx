import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { SectionLabel } from '../components/ui'
import { Icon } from '../components/Icon'
import { baseCalorieTarget, tdee } from '../lib/nutrition'
import { downloadCSV } from '../lib/csv'
import { DIET_LIST } from '../lib/diet'
import { formatPace, HALF_MARATHON_GOALS, halfMarathonGoalLabel, halfMarathonGoalPace } from '../lib/plan'
import type { DietMode, HalfMarathonGoal, UserProfile } from '../types'

export function Settings() {
  const { state, profile, weightKg, updateProfile, reset } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)

  const maint = tdee(profile, weightKg)
  const computed = baseCalorieTarget({ ...profile, calorieTargetOverride: null }, weightKg)

  return (
    <div>
      <TopBar />
      <div className="px-margin-mobile pt-sm space-y-xl pb-md">
        {/* Profile */}
        <Group label="Profile">
          <Row label="Name">
            <input className={inp} value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
          </Row>
          <Row label="Age">
            <input type="number" className={inp} value={profile.age} onChange={(e) => updateProfile({ age: +e.target.value })} />
          </Row>
          <Row label="Height (cm)">
            <input type="number" className={inp} value={profile.heightCm} onChange={(e) => updateProfile({ heightCm: +e.target.value })} />
          </Row>
          <Row label="Units">
            <select className={inp} value={profile.units} onChange={(e) => updateProfile({ units: e.target.value as UserProfile['units'] })}>
              <option value="metric">Metric (kg)</option>
              <option value="imperial">Imperial (lbs)</option>
            </select>
          </Row>
          <Row label="Activity">
            <select className={inp} value={profile.activity} onChange={(e) => updateProfile({ activity: e.target.value as UserProfile['activity'] }, true)}>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="athlete">Athlete</option>
            </select>
          </Row>
        </Group>

        {/* Targets */}
        <Group label="Calorie & macro targets">
          <div className="flex justify-between px-md py-2 font-data-mono text-data-mono">
            <span className="text-on-surface-variant">Maintenance (TDEE)</span>
            <span className="text-on-surface">{maint} kcal</span>
          </div>
          <Row label="Goal">
            <select className={inp} value={profile.goal} onChange={(e) => updateProfile({ goal: e.target.value as UserProfile['goal'] })}>
              <option value="lose">Lose fat</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Build</option>
            </select>
          </Row>
          <Row label="Daily kcal">
            <input
              type="number"
              className={inp}
              placeholder={`${computed}`}
              value={profile.calorieTargetOverride ?? ''}
              onChange={(e) => updateProfile({ calorieTargetOverride: e.target.value ? +e.target.value : null })}
            />
          </Row>
          <Row label="Protein g/kg">
            <input type="number" step="0.1" className={inp} value={profile.proteinPerKg} onChange={(e) => updateProfile({ proteinPerKg: +e.target.value })} />
          </Row>
        </Group>

        {/* Diet mode */}
        <Group label="Diet mode">
          <Row label="Protocol">
            <select className={inp} value={profile.dietMode} onChange={(e) => updateProfile({ dietMode: e.target.value as DietMode })}>
              {DIET_LIST.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </Row>
          {profile.dietMode === 'keto' && (
            <Row label="Net carb cap (g)">
              <input type="number" className={inp} value={profile.netCarbCapG} onChange={(e) => updateProfile({ netCarbCapG: +e.target.value })} />
            </Row>
          )}
          {(profile.dietMode === 'omad' || profile.dietMode === '16:8') && (
            <Row label="Window opens (hour)">
              <input type="number" min={0} max={23} className={inp} value={profile.eatingWindowStartHour} onChange={(e) => updateProfile({ eatingWindowStartHour: Math.max(0, Math.min(23, +e.target.value)) })} />
            </Row>
          )}
        </Group>

        {/* Race */}
        <Group label="Race & plan">
          <Row label="Race date">
            <input type="date" className={inp} value={profile.raceDate ?? ''} onChange={(e) => updateProfile({ raceDate: e.target.value || null }, true)} />
          </Row>
          <Row label="HM goal">
            <select className={inp} value={profile.halfMarathonGoal} onChange={(e) => updateProfile({ halfMarathonGoal: e.target.value as HalfMarathonGoal }, true)}>
              {HALF_MARATHON_GOALS.map((goal) => {
                const pace = halfMarathonGoalPace(goal)
                return (
                  <option key={goal} value={goal}>
                    {halfMarathonGoalLabel(goal)}{pace ? ` - ${formatPace(pace)}` : ''}
                  </option>
                )
              })}
            </select>
          </Row>
          <p className="px-md font-data-mono text-[12px] text-on-surface-variant">Goal pace is shown per km. Changing race goal, date or activity regenerates your plan.</p>
        </Group>

        {/* Wearables */}
        <Group label="Wearable connections">
          {([['appleHealth', 'Apple Health'], ['garmin', 'Garmin Connect'], ['strava', 'Strava']] as const).map(([k, label]) => (
            <Toggle key={k} label={label} on={profile.wearables[k]} onClick={() => updateProfile({ wearables: { ...profile.wearables, [k]: !profile.wearables[k] } })} />
          ))}
        </Group>

        {/* Notifications */}
        <Group label="Notifications">
          <Toggle label="Morning brief" on={profile.notif.morningBrief} onClick={() => updateProfile({ notif: { ...profile.notif, morningBrief: !profile.notif.morningBrief } })} />
          <Toggle label="Under-fuelling alert" on={profile.notif.underFuelAlert} onClick={() => updateProfile({ notif: { ...profile.notif, underFuelAlert: !profile.notif.underFuelAlert } })} />
          <Toggle label="Pre-race guidance" on={profile.notif.preRace} onClick={() => updateProfile({ notif: { ...profile.notif, preRace: !profile.notif.preRace } })} />
        </Group>

        {/* AI */}
        <Group label="AI vision">
          <div className="px-md py-3 font-data-mono text-[12px] text-on-surface-variant">
            Accurate photo calorie detection uses server-side GEMINI_API_KEY. Set it in Vercel env vars for this personal app.
          </div>
          <Row label="Claude fallback key">
            <input type="password" className={inp} placeholder="sk-ant-…" value={profile.anthropicApiKey} onChange={(e) => updateProfile({ anthropicApiKey: e.target.value })} />
          </Row>
          <p className="px-md font-data-mono text-[12px] text-on-surface-variant">
            Optional and stored on-device only. If server AI is unavailable, FitCore can try this key before showing a rough offline estimate.
          </p>
        </Group>

        {/* Data */}
        <Group label="Data">
          <button onClick={() => downloadCSV(state)} className="w-full flex items-center justify-between px-md py-3 text-on-surface hover:bg-surface-container-high rounded-lg transition">
            <span className="font-body-md text-body-md flex items-center gap-md"><Icon name="download" className="text-primary" /> Export all data (CSV)</span>
            <Icon name="chevron_right" className="text-on-surface-variant" />
          </button>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="w-full flex items-center justify-between px-md py-3 text-error hover:bg-error/10 rounded-lg transition">
              <span className="font-body-md text-body-md flex items-center gap-md"><Icon name="delete_forever" /> Reset all data</span>
              <Icon name="chevron_right" />
            </button>
          ) : (
            <div className="px-md py-3 flex flex-col gap-sm">
              <p className="font-body-md text-body-md text-on-surface">This erases your profile, logs, plan and photos on this device. This cannot be undone.</p>
              <div className="flex gap-md">
                <button onClick={() => setConfirmReset(false)} className="flex-1 py-2 rounded-full border border-outline text-on-surface font-metric-md">Cancel</button>
                <button onClick={reset} className="flex-1 py-2 rounded-full bg-error text-on-error font-metric-md">Erase</button>
              </div>
            </div>
          )}
        </Group>

        <p className="text-center font-data-mono text-[11px] text-on-surface-variant">FitCore MVP 1.0 • data stays on this device</p>
      </div>
    </div>
  )
}

const inp = 'bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 text-on-surface font-body-md text-right focus:border-primary focus:outline-none w-44 max-w-[55%]'

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-xs">
      <SectionLabel>{label}</SectionLabel>
      <div className="bg-tile border border-tile-border rounded-xl divide-y divide-tile-border overflow-hidden mt-sm">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-md py-2 gap-md">
      <span className="font-body-md text-body-md text-on-surface-variant shrink-0">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-md py-3 hover:bg-surface-container-high transition">
      <span className="font-body-md text-body-md text-on-surface">{label}</span>
      <span className={`w-12 h-7 rounded-full p-1 transition-colors ${on ? 'bg-lime' : 'bg-surface-container-highest'}`}>
        <span className={`block w-5 h-5 rounded-full bg-on-surface transition-transform ${on ? 'translate-x-5 bg-on-lime' : ''}`} />
      </span>
    </button>
  )
}
