import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Icon } from '../components/Icon'
import { baseCalorieTarget, tdee } from '../lib/nutrition'
import { downloadCSV } from '../lib/csv'
import { DIET_LIST } from '../lib/diet'
import type { DietMode, UserProfile } from '../types'
import './settings.css'

export function Settings() {
  const { state, profile, weightKg, updateProfile, reset } = useApp()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const confirmationRef = useRef<HTMLInputElement>(null)
  const maintenance = tdee(profile, weightKg)
  const automaticTarget = baseCalorieTarget({ ...profile, calorieTargetOverride: null }, weightKg)
  const logs = state.foods.length + state.weights.length + state.photos.length + state.sessions.filter((session) => session.manual).length + state.dietTasks.length

  useEffect(() => { if (confirmReset) confirmationRef.current?.focus() }, [confirmReset])

  function clearEverything() {
    if (confirmation !== 'CLEAR') return
    reset()
    navigate('/', { replace: true })
  }

  return <div className="settings-page">
    <header className="settings-header"><button type="button" className="settings-back" onClick={() => navigate('/')} aria-label="Back to home"><Icon name="arrow_back" size={22} /></button><div><h1>Settings</h1><p>Your profile, your pace.</p></div></header>
    <div className="settings-content">
      <div className="settings-identity" aria-label="Your FitCore profile"><div className="settings-avatar" aria-hidden="true">{(profile.name.trim()[0] || 'F').toUpperCase()}</div><div><strong>{profile.name.trim() || 'Your profile'}</strong><span>{profile.goal === 'lose' ? 'Fat loss' : profile.goal === 'gain' ? 'Build strength' : 'Maintain'} · {logs} saved {logs === 1 ? 'item' : 'items'}</span></div><Icon name="person" size={22} /></div>

      <section className="settings-section" aria-labelledby="settings-profile-title"><div className="settings-section-head"><h2 id="settings-profile-title">About you</h2><p>These details shape your daily estimates.</p></div><div className="settings-fields">
        <Field id="settings-name" label="Name"><input id="settings-name" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} autoComplete="name" /></Field>
        <div className="settings-pair"><Field id="settings-age" label="Age"><input id="settings-age" type="number" min="13" max="120" inputMode="numeric" value={profile.age} onChange={(e) => updateProfile({ age: +e.target.value })} /></Field><Field id="settings-height" label="Height · cm"><input id="settings-height" type="number" min="80" max="250" inputMode="decimal" value={profile.heightCm} onChange={(e) => updateProfile({ heightCm: +e.target.value })} /></Field></div>
        <div className="settings-pair"><Field id="settings-sex" label="Sex for estimate"><select id="settings-sex" value={profile.sex} onChange={(e) => updateProfile({ sex: e.target.value as UserProfile['sex'] })}><option value="male">Male</option><option value="female">Female</option></select></Field><Field id="settings-units" label="Weight units"><select id="settings-units" value={profile.units} onChange={(e) => updateProfile({ units: e.target.value as UserProfile['units'] })}><option value="metric">Kilograms</option><option value="imperial">Pounds</option></select></Field></div>
        <Field id="settings-activity" label="Daily movement"><select id="settings-activity" value={profile.activity} onChange={(e) => updateProfile({ activity: e.target.value as UserProfile['activity'] }, true)}><option value="sedentary">Mostly sitting</option><option value="light">Lightly active</option><option value="moderate">Moderately active</option><option value="high">Highly active</option><option value="athlete">Athlete / physical work</option></select></Field>
      </div></section>

      <section className="settings-section" aria-labelledby="settings-target-title"><div className="settings-section-head"><h2 id="settings-target-title">Your targets</h2><p>Auto-calculated from your profile. Override only if you need to.</p></div><div className="settings-estimate"><div><span>ESTIMATED MAINTENANCE</span><strong>{maintenance.toLocaleString()} <small>kcal/day</small></strong></div><div><span>YOUR DAILY TARGET</span><strong>{(profile.calorieTargetOverride ?? automaticTarget).toLocaleString()} <small>kcal</small></strong></div></div><div className="settings-fields">
        <div className="settings-pair"><Field id="settings-goal" label="Goal"><select id="settings-goal" value={profile.goal} onChange={(e) => updateProfile({ goal: e.target.value as UserProfile['goal'] })}><option value="lose">Lose fat</option><option value="maintain">Maintain</option><option value="gain">Build</option></select></Field>{profile.goal === 'lose' && <Field id="settings-pace" label="Pace"><select id="settings-pace" value={profile.weightLossPace} onChange={(e) => updateProfile({ weightLossPace: e.target.value as UserProfile['weightLossPace'] })}><option value="steady">Steady</option><option value="faster">Faster</option></select></Field>}</div>
        <div className="settings-pair"><Field id="settings-calories" label="Kcal override"><input id="settings-calories" type="number" min="1" inputMode="numeric" placeholder={`Auto · ${automaticTarget}`} value={profile.calorieTargetOverride ?? ''} onChange={(e) => updateProfile({ calorieTargetOverride: e.target.value ? +e.target.value : null })} /></Field><Field id="settings-protein" label="Protein · g/day"><input id="settings-protein" type="number" min="1" inputMode="numeric" value={Math.round(profile.proteinPerKg * weightKg)} onChange={(e) => updateProfile({ proteinPerKg: +e.target.value / Math.max(1, weightKg) })} /></Field></div>
        <p className="settings-help">Leave kcal empty to use the automatic target. Update weight on the Body page.</p>
      </div></section>

      <section className="settings-section" aria-labelledby="settings-diet-title"><div className="settings-section-head"><h2 id="settings-diet-title">Eating plan</h2><p>Choose a protocol only if it fits your routine.</p></div><div className="settings-fields">
        <Field id="settings-protocol" label="Protocol"><select id="settings-protocol" value={profile.dietMode} onChange={(e) => updateProfile({ dietMode: e.target.value as DietMode })}>{DIET_LIST.map((diet) => <option key={diet.id} value={diet.id}>{diet.label}</option>)}</select></Field>
        {profile.dietMode === 'keto' && <Field id="settings-carb" label="Carb cap · g/day"><input id="settings-carb" type="number" min="1" inputMode="numeric" value={profile.netCarbCapG} onChange={(e) => updateProfile({ netCarbCapG: +e.target.value })} /></Field>}
        {(profile.dietMode === 'omad' || profile.dietMode === '16:8') && <Field id="settings-window" label="Eating window starts"><select id="settings-window" value={profile.eatingWindowStartHour} onChange={(e) => updateProfile({ eatingWindowStartHour: +e.target.value })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></Field>}
      </div></section>

      <details className="settings-more"><summary>Connections & preferences <Icon name="expand_more" size={22} /></summary><div className="settings-more-body">
        <h3>Wearables</h3><p>Saved as preferences; live device syncing is not available yet.</p>
        {([['appleHealth', 'Apple Health'], ['garmin', 'Garmin Connect'], ['strava', 'Strava']] as const).map(([key, label]) => <Toggle key={key} label={label} on={profile.wearables[key]} onClick={() => updateProfile({ wearables: { ...profile.wearables, [key]: !profile.wearables[key] } })} />)}
        <h3>Reminders</h3><p>Saved as preferences; push notifications are not enabled yet.</p>
        <Toggle label="Morning brief" on={profile.notif.morningBrief} onClick={() => updateProfile({ notif: { ...profile.notif, morningBrief: !profile.notif.morningBrief } })} />
        <Toggle label="Under-fuelling alert" on={profile.notif.underFuelAlert} onClick={() => updateProfile({ notif: { ...profile.notif, underFuelAlert: !profile.notif.underFuelAlert } })} />
        <Toggle label="Pre-race guidance" on={profile.notif.preRace} onClick={() => updateProfile({ notif: { ...profile.notif, preRace: !profile.notif.preRace } })} />
        <h3>Photo analysis</h3><p>Server AI needs GEMINI_API_KEY configured on the server. This optional fallback key stays on this device.</p>
        <Field id="settings-api-key" label="Claude fallback key"><input id="settings-api-key" type="password" placeholder="sk-ant-…" autoComplete="off" value={profile.anthropicApiKey} onChange={(e) => updateProfile({ anthropicApiKey: e.target.value })} /></Field>
      </div></details>

      <section className="settings-section settings-data" aria-labelledby="settings-data-title"><div className="settings-section-head"><h2 id="settings-data-title">Your data</h2><p>Stored in this browser on this device.</p></div>
        <button type="button" className="settings-export" onClick={() => downloadCSV(state)}><Icon name="download" size={22} /><span><strong>Export logs as CSV</strong><small>Food, weight and training logs. Photos and profile are not included.</small></span><Icon name="arrow_forward" size={20} /></button>
        <div className="settings-danger"><div className="settings-danger-title"><Icon name="delete_forever" size={22} /><div><h3>Clear all data</h3><p>Remove your profile, food and activity logs, weight entries, photos, plans, preferences and local AI usage from this browser.</p></div></div>
          {!confirmReset ? <button type="button" className="settings-clear-start" onClick={() => setConfirmReset(true)}>Clear all data</button> : <div className="settings-confirm"><p>This cannot be undone. Export your logs first if you want a copy. Type <strong>CLEAR</strong> to confirm.</p><label htmlFor="settings-confirm-input">Confirmation</label><input ref={confirmationRef} id="settings-confirm-input" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" spellCheck={false} placeholder="Type CLEAR" /><div className="settings-confirm-actions"><button type="button" onClick={() => { setConfirmReset(false); setConfirmation('') }}>Cancel</button><button type="button" className="settings-confirm-delete" disabled={confirmation !== 'CLEAR'} onClick={clearEverything}>Erase my data</button></div></div>}
        </div>
      </section>
      <p className="settings-footer">FitCore · Your data stays on this device</p>
    </div>
  </div>
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) { return <div className="settings-field"><label htmlFor={id}>{label}</label>{children}</div> }

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) { return <button type="button" role="switch" aria-checked={on} onClick={onClick} className="settings-toggle"><span>{label}</span><span className={`settings-switch ${on ? 'is-on' : ''}`} aria-hidden="true"><span /></span></button> }
