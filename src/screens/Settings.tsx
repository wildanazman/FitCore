import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { baseCalorieTarget, tdee } from '../lib/nutrition'
import { downloadCSV } from '../lib/csv'
import { DIET_LIST } from '../lib/diet'
import type { DietMode, UserProfile } from '../types'
import './settings.css'
import { THEMES, useTheme } from '../store/ThemeContext'
import { BackupTransfer } from '../components/BackupTransfer'
import { GeminiModelPicker } from '../components/GeminiModelPicker'

export function Settings() {
  const { theme, setTheme } = useTheme()
  const { state, profile, weightKg, updateProfile, reset } = useApp()
  const navigate = useNavigate()
  const [category, setCategory] = useState<'overview' | 'profile' | 'targets' | 'preferences' | 'connections' | 'data'>('overview')
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
    setTheme('classic')
    navigate('/', { replace: true })
  }

  return <div className="settings-page">
    <TopBar />
    <header className="page-heading"><h1>{category === 'overview' ? 'Your FitCore.' : category === 'profile' ? 'Your profile.' : category === 'targets' ? 'Your targets.' : category === 'preferences' ? 'Your look.' : category === 'connections' ? 'Connections.' : 'Your data.'}</h1><p>{category === 'overview' ? 'Fine-tune the app around you.' : 'One change here. Updated across your app.'}</p></header>
    <div className="settings-content">
      {category !== 'overview' && <button type="button" className="settings-overview-back" onClick={() => { setCategory('overview'); setConfirmReset(false); setConfirmation('') }}><Icon name="arrow_back" size={20}/>All settings</button>}
      {category === 'overview' && <>
        <button type="button" className="settings-profile-entry" onClick={() => setCategory('profile')}><span className="settings-avatar" aria-hidden="true">{(profile.name.trim()[0] || 'F').toUpperCase()}</span><span><strong>{profile.name.trim() || 'Your profile'}</strong><small>{profile.age} years · {profile.heightCm} cm · {profile.units === 'metric' ? 'Metric' : 'Imperial'}</small></span><span className="settings-edit-label">Edit<Icon name="arrow_forward" size={18}/></span></button>
        <section className="settings-hub" aria-label="Personalise FitCore"><h2>Make it work for you.</h2><div className="settings-menu">
          <SettingsRow icon="tune" title="Goals & daily targets" detail={`${profile.goal === 'lose' ? 'Lose fat' : profile.goal === 'gain' ? 'Build' : 'Maintain'} · ${(profile.calorieTargetOverride ?? automaticTarget).toLocaleString()} kcal/day`} onClick={() => setCategory('targets')}/>
          <SettingsRow icon="palette" title="Appearance" detail={THEMES.find(item => item.id === theme)?.name ?? 'FitCore Blue'} onClick={() => setCategory('preferences')}><span className="settings-theme-dots" aria-hidden="true">{THEMES.find(item => item.id === theme)?.colors.map(color => <i key={color} style={{ background: color }}/>)}</span></SettingsRow>
          <SettingsRow icon="watch" title="Connections & reminders" detail="Device preferences, reminders & photo AI" onClick={() => setCategory('connections')}/>
        </div></section>
        <section className="settings-hub" aria-label="Data control"><h2>You're in control.</h2><div className="settings-menu"><SettingsRow icon="database" title="Data & storage" detail={`${logs} saved items · export or clear your data`} onClick={() => setCategory('data')}/></div><p className="settings-local-note"><Icon name="lock" size={17}/>Your logs are stored in this browser, on this device.</p></section>
      </>}

      <section className="settings-section" hidden={category !== 'profile'} aria-labelledby="settings-profile-title"><div className="settings-section-head"><h2 id="settings-profile-title">About you</h2><p>These details shape your daily estimates.</p></div><div className="settings-fields">
        <Field id="settings-name" label="Name"><input id="settings-name" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} autoComplete="name" /></Field>
        <div className="settings-pair"><Field id="settings-age" label="Age"><input id="settings-age" type="number" min="13" max="120" inputMode="numeric" value={profile.age} onChange={(e) => updateProfile({ age: +e.target.value })} /></Field><Field id="settings-height" label="Height · cm"><input id="settings-height" type="number" min="80" max="250" inputMode="decimal" value={profile.heightCm} onChange={(e) => updateProfile({ heightCm: +e.target.value })} /></Field></div>
        <div className="settings-pair"><Field id="settings-sex" label="Sex for estimate"><select id="settings-sex" value={profile.sex} onChange={(e) => updateProfile({ sex: e.target.value as UserProfile['sex'] })}><option value="male">Male</option><option value="female">Female</option></select></Field><Field id="settings-units" label="Weight units"><select id="settings-units" value={profile.units} onChange={(e) => updateProfile({ units: e.target.value as UserProfile['units'] })}><option value="metric">Kilograms</option><option value="imperial">Pounds</option></select></Field></div>
        <Field id="settings-activity" label="Daily movement"><select id="settings-activity" value={profile.activity} onChange={(e) => updateProfile({ activity: e.target.value as UserProfile['activity'] }, true)}><option value="sedentary">Mostly sitting</option><option value="light">Lightly active</option><option value="moderate">Moderately active</option><option value="high">Highly active</option><option value="athlete">Athlete / physical work</option></select></Field>
      </div></section>

      <section className="settings-section" hidden={category !== 'targets'} aria-labelledby="settings-target-title"><div className="settings-section-head"><h2 id="settings-target-title">Your targets</h2><p>Auto-calculated from your profile. Override only if you need to.</p></div><div className="settings-estimate"><div><span>ESTIMATED MAINTENANCE</span><strong>{maintenance.toLocaleString()} <small>kcal/day</small></strong></div><div><span>YOUR DAILY TARGET</span><strong>{(profile.calorieTargetOverride ?? automaticTarget).toLocaleString()} <small>kcal</small></strong></div></div><div className="settings-fields">
        <div className="settings-pair"><Field id="settings-goal" label="Goal"><select id="settings-goal" value={profile.goal} onChange={(e) => updateProfile({ goal: e.target.value as UserProfile['goal'] })}><option value="lose">Lose fat</option><option value="maintain">Maintain</option><option value="gain">Build</option></select></Field>{profile.goal === 'lose' && <Field id="settings-pace" label="Pace"><select id="settings-pace" value={profile.weightLossPace} onChange={(e) => updateProfile({ weightLossPace: e.target.value as UserProfile['weightLossPace'] })}><option value="steady">Steady</option><option value="faster">Faster</option></select></Field>}</div>
        <div className="settings-pair"><Field id="settings-calories" label="Kcal override"><input id="settings-calories" type="number" min="1" inputMode="numeric" placeholder={`Auto · ${automaticTarget}`} value={profile.calorieTargetOverride ?? ''} onChange={(e) => updateProfile({ calorieTargetOverride: e.target.value ? +e.target.value : null })} /></Field><Field id="settings-protein" label="Protein · g/day"><input id="settings-protein" type="number" min="1" inputMode="numeric" value={Math.round(profile.proteinPerKg * weightKg)} onChange={(e) => updateProfile({ proteinPerKg: +e.target.value / Math.max(1, weightKg) })} /></Field></div>
        <p className="settings-help">Leave kcal empty to use the automatic target. Update weight on the Body page.</p>
      </div></section>

      <section className="settings-section" hidden={category !== 'targets'} aria-labelledby="settings-diet-title"><div className="settings-section-head"><h2 id="settings-diet-title">Eating plan</h2><p>Choose a protocol only if it fits your routine.</p></div><div className="settings-fields">
        <Field id="settings-protocol" label="Protocol"><select id="settings-protocol" value={profile.dietMode} onChange={(e) => updateProfile({ dietMode: e.target.value as DietMode })}>{DIET_LIST.map((diet) => <option key={diet.id} value={diet.id}>{diet.label}</option>)}</select></Field>
        {profile.dietMode === 'keto' && <Field id="settings-carb" label="Carb cap · g/day"><input id="settings-carb" type="number" min="1" inputMode="numeric" value={profile.netCarbCapG} onChange={(e) => updateProfile({ netCarbCapG: +e.target.value })} /></Field>}
        {(profile.dietMode === 'omad' || profile.dietMode === '16:8') && <Field id="settings-window" label="Eating window starts"><select id="settings-window" value={profile.eatingWindowStartHour} onChange={(e) => updateProfile({ eatingWindowStartHour: +e.target.value })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></Field>}
      </div></section>

      <section className="settings-section" hidden={category !== 'preferences'} aria-labelledby="settings-theme-title"><div className="settings-section-head"><h2 id="settings-theme-title">Make it yours.</h2><p>One app. Your colours. Changes apply across every page.</p></div><div className="theme-options">{THEMES.map(option => <button type="button" className="theme-option" key={option.id} aria-pressed={theme === option.id} onClick={() => setTheme(option.id)}><span className="theme-preview" aria-hidden="true">{option.colors.map(color => <span key={color} style={{ background: color }}/>)}</span><strong>{option.name}{theme === option.id && <Icon name="check_circle" size={18}/>}</strong><small>{option.description}</small></button>)}</div></section>
      <details className="settings-more" open hidden={category !== 'connections'}><summary>Connections & preferences <Icon name="expand_more" size={22} /></summary><div className="settings-more-body">
        <h3>Wearables</h3><p>Saved as preferences; live device syncing is not available yet.</p>
        {([['appleHealth', 'Apple Health'], ['garmin', 'Garmin Connect'], ['strava', 'Strava']] as const).map(([key, label]) => <Toggle key={key} label={label} on={profile.wearables[key]} onClick={() => updateProfile({ wearables: { ...profile.wearables, [key]: !profile.wearables[key] } })} />)}
        <h3>Reminders</h3><p>Saved as preferences; push notifications are not enabled yet.</p>
        <Toggle label="Morning brief" on={profile.notif.morningBrief} onClick={() => updateProfile({ notif: { ...profile.notif, morningBrief: !profile.notif.morningBrief } })} />
        <Toggle label="Under-fuelling alert" on={profile.notif.underFuelAlert} onClick={() => updateProfile({ notif: { ...profile.notif, underFuelAlert: !profile.notif.underFuelAlert } })} />
        <Toggle label="Pre-race guidance" on={profile.notif.preRace} onClick={() => updateProfile({ notif: { ...profile.notif, preRace: !profile.notif.preRace } })} />
        <h3>Photo analysis</h3><p>Powered by Gemini. Your API key stays on the server, not on this device.</p>
        <GeminiModelPicker id="settings-gemini-model" value={profile.geminiModel} onChange={geminiModel => updateProfile({ geminiModel })}/>
        <p className="settings-help">Scans currently use Google Search for nutrition references. Search can have separate charges, and free-tier access differs between models. Changing models does not make a photo estimate a measured nutrition value.</p>
      </div></details>

      <section className="settings-section settings-data" hidden={category !== 'data'} aria-labelledby="settings-data-title"><div className="settings-section-head"><h2 id="settings-data-title">Your data</h2><p>Stored in this browser on this device.</p></div>
        <BackupTransfer/>
        <button type="button" className="settings-export" onClick={() => downloadCSV(state)}><Icon name="download" size={22} /><span><strong>Export logs as CSV</strong><small>Food, weight and training logs. Photos and profile are not included.</small></span><Icon name="arrow_forward" size={20} /></button>
        <div className="settings-danger"><div className="settings-danger-title"><Icon name="delete_forever" size={22} /><div><h3>Clear all data</h3><p>Remove your profile, food and activity logs, weight entries, photos, plans, preferences and local AI usage from this browser.</p></div></div>
          {!confirmReset ? <button type="button" className="settings-clear-start" onClick={() => setConfirmReset(true)}>Clear all data</button> : <div className="settings-confirm"><p>This cannot be undone. Export your logs first if you want a copy. Type <strong>CLEAR</strong> to confirm.</p><label htmlFor="settings-confirm-input">Confirmation</label><input ref={confirmationRef} id="settings-confirm-input" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" spellCheck={false} placeholder="Type CLEAR" /><div className="settings-confirm-actions"><button type="button" onClick={() => { setConfirmReset(false); setConfirmation('') }}>Cancel</button><button type="button" className="settings-confirm-delete" disabled={confirmation !== 'CLEAR'} onClick={clearEverything}>Erase my data</button></div></div>}
        </div>
      </section>
      <p className="settings-footer">FitCore · Your data stays on this device</p>
    </div>
  </div>
}

function SettingsRow({ icon, title, detail, onClick, children }: { icon: string; title: string; detail: string; onClick: () => void; children?: React.ReactNode }) {
  return <button type="button" className="settings-menu-row" onClick={onClick}><span className="settings-menu-icon"><Icon name={icon} size={22}/></span><span className="settings-menu-copy"><strong>{title}</strong><small>{detail}</small></span>{children}<Icon name="chevron_right" size={20}/></button>
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) { return <div className="settings-field"><label htmlFor={id}>{label}</label>{children}</div> }

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) { return <button type="button" role="switch" aria-checked={on} onClick={onClick} className="settings-toggle"><span>{label}</span><span className={`settings-switch ${on ? 'is-on' : ''}`} aria-hidden="true"><span /></span></button> }
