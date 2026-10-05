import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { todayISO, uid } from '../lib/date'
import { tdee } from '../lib/nutrition'
import { ACTIVITIES, ACTIVITY_CATEGORIES, caloriesFromMet, type ActivityCategory, type HomeEquipment } from '../lib/activities'
import type { MealSlot, PlanSession } from '../types'
import './daily-timeline.css'

type LogMode = 'meal' | 'activity' | null
type AvailableEquipment = 'none' | 'mat' | 'dumbbell' | 'both'

function canUseAtHome(required: HomeEquipment | undefined, available: AvailableEquipment): boolean {
  if (!required || required === 'none') return true
  if (available === 'both') return true
  return required === available
}

function equipmentPriority(required: HomeEquipment | undefined, available: AvailableEquipment): number {
  if (required === 'mat+dumbbell') return available === 'both' ? 0 : 4
  if (required === available) return 0
  if (available === 'both' && required === 'dumbbell') return 1
  if (available === 'both' && required === 'mat') return 2
  return 3
}

export function DailyTimeline() {
  const { state, profile, weightKg, addFood, addSession, removeFood, removeSession } = useApp()
  const [mode, setMode] = useState<LogMode>(null)
  const [meal, setMeal] = useState({ slot: 'lunch' as MealSlot, name: '', kcal: '', protein: '' })
  const [activity, setActivity] = useState({ name: '', minutes: '', kcal: '' })
  const [activityCategory, setActivityCategory] = useState<ActivityCategory | 'all'>('home')
  const [homeEquipment, setHomeEquipment] = useState<AvailableEquipment>('both')
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const today = todayISO()
  const foods = state.foods.filter((item) => item.date === today)
  const activities = state.sessions.filter((item) => item.date === today && item.manual && item.completed)
  const eaten = Math.round(foods.reduce((sum, item) => sum + item.kcal * item.servings, 0))
  const burned = Math.round(activities.reduce((sum, item) => sum + item.kcal, 0))
  const maintenance = tdee(profile, weightKg)
  const deficit = maintenance + burned - eaten
  const weeklyKg = Math.abs(deficit * 7 / 7700)
  const entries = [
    ...foods.map((item) => ({ id: item.id, kind: 'meal' as const, at: item.loggedAt, title: item.name, detail: item.slot, kcal: Math.round(item.kcal * item.servings) })),
    ...activities.map((item) => ({ id: item.id, kind: 'activity' as const, at: item.loggedAt ?? `${item.date}T12:00:00`, title: item.title, detail: `${item.durationMin} min`, kcal: item.kcal })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  const activityOptions = ACTIVITIES
    .filter((item) => (activityCategory === 'all' || item.category === activityCategory) && (item.category !== 'home' || canUseAtHome(item.equipment, homeEquipment)))
    .sort((a, b) => a.category === 'home' && b.category === 'home' ? equipmentPriority(a.equipment, homeEquipment) - equipmentPriority(b.equipment, homeEquipment) : 0)

  const saveMeal = (event: React.FormEvent) => {
    event.preventDefault()
    if (!meal.name.trim() || +meal.kcal <= 0) return
    addFood({ id: uid(), name: meal.name.trim(), emoji: '', date: today, loggedAt: new Date().toISOString(), slot: meal.slot, kcal: +meal.kcal, protein: Math.max(0, +meal.protein || 0), carbs: 0, fat: 0, servings: 1, confidence: 1 })
    setMeal({ slot: 'lunch', name: '', kcal: '', protein: '' })
    setMode(null)
  }
  const saveActivity = (event: React.FormEvent) => {
    event.preventDefault()
    if (!activity.name.trim() || +activity.minutes <= 0 || +activity.kcal <= 0) return
    const selected = ACTIVITIES.find((item) => item.id === selectedActivityId)
    const session: PlanSession = { id: uid(), date: today, loggedAt: new Date().toISOString(), type: selected?.type ?? 'sport', title: activity.name.trim(), detail: `${activity.minutes} min · manually logged`, durationMin: +activity.minutes, kcal: +activity.kcal, completed: true, plan: 'manual', icon: selected?.icon ?? 'fitness_center', manual: true }
    addSession(session)
    setActivity({ name: '', minutes: '', kcal: '' })
    setMode(null)
  }
  const chooseActivity = (id: string) => {
    const selected = ACTIVITIES.find((item) => item.id === id)
    if (!selected) return
    setSelectedActivityId(id)
    const minutes = +activity.minutes || 30
    setActivity({ name: selected.label, minutes: String(minutes), kcal: String(caloriesFromMet(weightKg, selected.met, minutes)) })
  }

  return <section className="daily-timeline" aria-labelledby="daily-timeline-title">
    <div className="daily-timeline-heading"><div><h2 id="daily-timeline-title">Today's timeline</h2><p>Food in. Movement out. All in one place.</p></div></div>
    <div className="daily-log-actions"><button type="button" onClick={() => setMode(mode === 'meal' ? null : 'meal')} aria-expanded={mode === 'meal'}>+ Log meal</button><button type="button" onClick={() => setMode(mode === 'activity' ? null : 'activity')} aria-expanded={mode === 'activity'}>+ Log activity</button></div>
    {mode === 'meal' && <form className="daily-log-form" onSubmit={saveMeal}><label>Meal<select value={meal.slot} onChange={(e) => setMeal({ ...meal, slot: e.target.value as MealSlot })}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></select></label><label>What did you eat?<input required value={meal.name} onChange={(e) => setMeal({ ...meal, name: e.target.value })} placeholder="e.g. Chicken rice" /></label><div className="daily-log-form-grid"><label>Calories<input required type="number" min="1" inputMode="numeric" value={meal.kcal} onChange={(e) => setMeal({ ...meal, kcal: e.target.value })} placeholder="kcal" /></label><label>Protein (optional)<input type="number" min="0" inputMode="numeric" value={meal.protein} onChange={(e) => setMeal({ ...meal, protein: e.target.value })} placeholder="g" /></label></div><button type="submit">Save meal</button></form>}
    {mode === 'activity' && <form className="daily-log-form" onSubmit={saveActivity}>
      <div className="daily-activity-categories" role="group" aria-label="Activity category">{ACTIVITY_CATEGORIES.map((item) => <button key={item.id} type="button" aria-pressed={activityCategory === item.id} onClick={() => { setActivityCategory(item.id); setSelectedActivityId(null); setActivity({ name: '', minutes: '', kcal: '' }) }}>{item.label}</button>)}</div>
      {activityCategory === 'home' && <fieldset className="daily-equipment"><legend>What do you have at home?</legend><div role="group" aria-label="Available home equipment">{([{ id: 'none', label: 'No gear' }, { id: 'mat', label: 'Mat' }, { id: 'dumbbell', label: 'Dumbbells' }, { id: 'both', label: 'Mat + dumbbells' }] as const).map((item) => <button key={item.id} type="button" aria-pressed={homeEquipment === item.id} onClick={() => { setHomeEquipment(item.id); setSelectedActivityId(null); setActivity({ name: '', minutes: '', kcal: '' }) }}>{item.label}</button>)}</div><p className="daily-equipment-tip">{homeEquipment === 'both' ? 'Try a full-body circuit: goblet squat, dumbbell row, floor press and mat core.' : homeEquipment === 'dumbbell' ? 'Try squats, rows, presses and Romanian deadlifts with your dumbbells.' : homeEquipment === 'mat' ? 'Try core work, glute bridges or a Pilates session on your mat.' : 'Start with squats, lunges and a bodyweight circuit.'}</p></fieldset>}
      <div className="daily-activity-options" role="group" aria-label="Choose activity">{activityOptions.map((item) => <button key={item.id} type="button" aria-pressed={selectedActivityId === item.id} onClick={() => chooseActivity(item.id)}><strong>{item.label}</strong>{item.detail && <span>{item.detail}</span>}</button>)}</div>
      <label>Activity<input required value={activity.name} onChange={(e) => { setSelectedActivityId(null); setActivity({ ...activity, name: e.target.value }) }} placeholder="Or type your own activity" /></label>
      <div className="daily-log-form-grid"><label>Duration<input required type="number" min="1" inputMode="numeric" value={activity.minutes} onChange={(e) => { const minutes = e.target.value; const selected = ACTIVITIES.find((item) => item.id === selectedActivityId); setActivity({ ...activity, minutes, kcal: selected && +minutes > 0 ? String(caloriesFromMet(weightKg, selected.met, +minutes)) : activity.kcal }) }} placeholder="minutes" /></label><label>Calories burned<input required type="number" min="1" inputMode="numeric" value={activity.kcal} onChange={(e) => setActivity({ ...activity, kcal: e.target.value })} placeholder="kcal" /></label></div>
      <p>Calories are estimated from your weight and duration. Edit the number if your device measured something different.</p><button type="submit">Save activity</button>
    </form>}
    <div className="daily-balance"><div><span>Maintenance</span><strong>{maintenance.toLocaleString()}</strong></div><div><span>Food</span><strong>−{eaten.toLocaleString()}</strong></div><div><span>Logged activity</span><strong>+{burned.toLocaleString()}</strong></div><div className="daily-balance-result"><span>{deficit >= 0 ? 'Estimated deficit' : 'Estimated surplus'}</span><strong>{Math.abs(deficit).toLocaleString()} kcal</strong></div></div>
    {foods.length > 0 ? <p className="daily-projection">If this full-day intake repeats: <strong>about {weeklyKg.toFixed(1)} kg {deficit >= 0 ? 'loss' : 'gain'} in a week</strong>. Rough estimate only; incomplete food logs or activity already counted in maintenance can overstate it.</p> : <p className="daily-projection">Log your meals to unlock a weekly trend estimate. A partial-day balance is not a completed deficit.</p>}
    <div className="daily-entry-list">{entries.length ? entries.map((entry) => <div className="daily-entry" key={`${entry.kind}-${entry.id}`}><span className="daily-entry-time">{new Date(entry.at).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })}</span><div><strong>{entry.title}</strong><span>{entry.detail}</span></div><b>{entry.kind === 'meal' ? '+' : '−'}{entry.kcal} kcal</b><button type="button" aria-label={`Remove ${entry.title}`} onClick={() => entry.kind === 'meal' ? removeFood(entry.id) : removeSession(entry.id)}>×</button></div>) : <p className="daily-empty">Nothing logged yet. Start with your next meal or activity.</p>}</div>
  </section>
}
