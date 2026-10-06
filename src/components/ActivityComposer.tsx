import { useState, type FormEvent } from 'react'
import { useApp } from '../store/AppContext'
import { ACTIVITIES, ACTIVITY_CATEGORIES, caloriesFromMet, type ActivityCategory, type HomeEquipment } from '../lib/activities'
import { todayISO, uid } from '../lib/date'
import { Icon } from './Icon'

type Equipment = 'none' | 'mat' | 'dumbbell' | 'both'
const GEAR = [{ id: 'none', label: 'No gear' }, { id: 'mat', label: 'Mat' }, { id: 'dumbbell', label: 'Dumbbells' }, { id: 'both', label: 'Both' }] as const

function available(required: HomeEquipment | undefined, gear: Equipment) {
  return !required || required === 'none' || gear === 'both' || required === gear
}

/** Inline activity logger using the same catalog and calorie engine as Activity. */
export function ActivityComposer({ onSaved }: { onSaved: () => void }) {
  const { weightKg, addSession } = useApp()
  const [category, setCategory] = useState<ActivityCategory | 'all'>('home')
  const [gear, setGear] = useState<Equipment>('both')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState('30')
  const [kcal, setKcal] = useState('')
  const selected = ACTIVITIES.find((item) => item.id === selectedId)
  const options = ACTIVITIES.filter((item) => (category === 'all' || item.category === category) && (item.category !== 'home' || available(item.equipment, gear)) && `${item.label} ${item.detail ?? ''}`.toLowerCase().includes(query.toLowerCase().trim()))
  const valid = name.trim().length > 0 && Number.isFinite(+minutes) && +minutes > 0 && +minutes <= 1440 && Number.isFinite(+kcal) && +kcal > 0

  function choose(id: string) {
    const item = ACTIVITIES.find((activity) => activity.id === id)
    if (!item) return
    setSelectedId(id); setName(item.label)
    setKcal(String(caloriesFromMet(weightKg, item.met, +minutes || 30)))
  }
  function changeMinutes(value: string) {
    setMinutes(value)
    if (selected) setKcal(+value > 0 ? String(caloriesFromMet(weightKg, selected.met, +value)) : '')
  }
  function resetChoice() { setSelectedId(null); setName(''); setKcal('') }
  function save(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    addSession({ id: uid(), date: todayISO(), loggedAt: new Date().toISOString(), type: selected?.type ?? 'sport', title: name.trim(), detail: `${minutes} min · manually logged`, durationMin: +minutes, kcal: +kcal, completed: true, plan: 'manual', icon: selected?.icon ?? 'exercise', manual: true })
    onSaved()
  }

  return <form className="home-activity-form" onSubmit={save}>
    <div className="home-activity-categories" role="group" aria-label="Activity category">{ACTIVITY_CATEGORIES.map((item) => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => { setCategory(item.id); resetChoice() }}>{item.label}</button>)}</div>
    {category === 'home' && <fieldset className="home-equipment"><legend>What have you got?</legend><div>{GEAR.map((item) => <button type="button" key={item.id} aria-pressed={gear === item.id} onClick={() => { setGear(item.id); resetChoice() }}>{item.label}</button>)}</div></fieldset>}
    <label className="home-activity-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find your activity" aria-label="Find an activity" /></label>
    <div className="home-activity-options" role="group" aria-label="Choose an activity">{options.map((item) => <button type="button" key={item.id} aria-pressed={selectedId === item.id} onClick={() => choose(item.id)}><Icon name={item.icon} size={19} /><span><strong>{item.label}</strong>{item.detail && <small>{item.detail}</small>}</span>{selectedId === item.id && <Icon name="check" size={17} />}</button>)}{options.length === 0 && <p>No match. Enter your own activity below.</p>}</div>
    <label className="home-form-label">Activity name<input value={name} onChange={(event) => { setName(event.target.value); setSelectedId(null) }} placeholder="Choose above or type your own" required maxLength={90} /></label>
    <div className="home-duration-presets" role="group" aria-label="Duration presets">{[15, 30, 45, 60].map((value) => <button key={value} type="button" aria-pressed={+minutes === value} onClick={() => changeMinutes(String(value))}>{value} min</button>)}</div>
    <div className="home-activity-values"><label className="home-form-label">Duration (minutes)<input required type="number" inputMode="decimal" min="1" max="1440" value={minutes} onChange={(event) => changeMinutes(event.target.value)} /></label><label className="home-form-label">Calories burned<input required type="number" inputMode="decimal" min="1" value={kcal} onChange={(event) => setKcal(event.target.value)} placeholder="kcal" /></label></div>
    <p className="home-form-note">Estimated from your weight and duration. You can use your device’s reading instead.</p>
    <button type="submit" className="home-save-activity" disabled={!valid}><Icon name="check" size={19} />Save activity{valid && <span>{Math.round(+kcal)} kcal</span>}</button>
  </form>
}
