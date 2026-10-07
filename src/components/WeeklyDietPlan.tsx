import { MealFoodList } from './MealFoodList'
import { useState, type FormEvent } from 'react'
import { useApp } from '../store/AppContext'
import { Icon } from './Icon'
import { addDays, parseISO, shortDate, startOfWeek, todayISO, uid, weekday } from '../lib/date'
import { personalPlan } from '../lib/dietGuide'
import { type LocalFood } from '../lib/localFoods'
import { hasExcludedIngredients, malaysianSampleDay, searchMalaysianPlanFoods } from '../lib/malaysianDietMeals'
import { hasCompleteMacros, searchRestaurantFoods } from '../lib/restaurantFoods'
import { plannedTotals, validPlannedMeal } from '../lib/dietPlanner'
import { windowState } from '../lib/diet'
import type { DietMode, DietTask, MealSlot } from '../types'
import './weekly-diet.css'

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']
const clock = (hour: number) => `${String(((hour % 24) + 24) % 24).padStart(2, '0')}:00`

export function WeeklyDietPlan({ mode, startHour }: { mode: DietMode; startHour: number }) {
  const { state, profile, weightKg, addDietTask, updateDietTask, toggleDietTask, removeDietTask } = useApp()
  const today = todayISO(), plan = personalPlan(profile, weightKg)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [date, setDate] = useState(today)
  const [editor, setEditor] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [food, setFood] = useState<LocalFood | null>(null)
  const [portion, setPortion] = useState('1')
  const [slot, setSlot] = useState<MealSlot>('lunch')
  const [time, setTime] = useState('13:00')
  const [habit, setHabit] = useState('')
  const [message, setMessage] = useState('')
  const [copyTo, setCopyTo] = useState(addDays(today, 1))
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekTasks = state.dietTasks.filter(t => weekDates.includes(t.date))
  const tasks = state.dietTasks.filter(t => t.date === date)
  const meals = tasks.filter(t => t.meal).sort((a, b) => a.meal!.time.localeCompare(b.meal!.time))
  const habits = tasks.filter(t => !t.meal)
  const total = plannedTotals(meals)
  const eaten = state.foods.filter(f => f.date === date).reduce((sum, f) => ({ kcal: sum.kcal + f.kcal, protein: sum.protein + f.protein }), { kcal: 0, protein: 0 })
  const weeks = Array.from({ length: 13 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(startOfWeek(today), (w - 12) * 7 + d)))
  const recent = [...state.foods].reverse().filter(f => !!query.trim() && !hasExcludedIngredients(f.name) && f.name.toLowerCase().includes(query.trim().toLowerCase()) && f.servings > 0).slice(0, 4).map(f => ({ name: f.name, emoji: '', serving: '1 saved serving', category: 'Basics' as const, kcal: f.kcal / f.servings, protein: f.protein / f.servings, carbs: f.carbs / f.servings, fat: f.fat / f.servings }))
  const restaurants = query.trim() ? searchRestaurantFoods(query, null, 8).filter(hasCompleteMacros).filter(f => !hasExcludedIngredients(f.name)).map(f => ({ name: `${f.brand} · ${f.name}`, emoji: '', serving: f.serving, category: 'Basics' as const, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat })) : []
  const results = [...searchMalaysianPlanFoods(query), ...recent, ...restaurants].filter((f, i, all) => all.findIndex(other => other.name === f.name) === i)
  const draft: DietTask | null = food ? { id: editingId ?? '', date, title: food.name, completed: false, meal: { slot, time, serving: food.serving, servings: +portion, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat } } : null
  const insideWindow = (t: string) => { const [h, m] = t.split(':').map(Number); return windowState(startHour, mode, h * 60 + m).eating }

  function moveWeek(direction: number) {
    const next = addDays(weekStart, direction * 7)
    selectDate(next <= today && today <= addDays(next, 6) ? today : next)
    setWeekStart(next)
  }
  function selectDate(day: string) { setDate(day); setEditor(false); setEditingId(null); setMessage(''); setCopyTo(addDays(day, 1)) }
  function openEditor(task?: DietTask) {
    setEditingId(task?.id ?? null); setEditor(true); setQuery(''); setMessage('')
    setFood(task?.meal ? { name: task.title, emoji: '', category: 'Basics', ...task.meal } : null)
    setPortion(String(task?.meal?.servings ?? 1)); setSlot(task?.meal?.slot ?? 'lunch'); setTime(task?.meal?.time ?? ((mode === '16:8' || mode === 'omad') ? clock(startHour) : '13:00'))
  }
  function saveMeal(e: FormEvent) {
    e.preventDefault()
    if (!draft || !validPlannedMeal(draft)) return
    if (editingId) updateDietTask(editingId, { title: draft.title, meal: draft.meal })
    else addDietTask({ ...draft, id: uid() })
    setEditor(false); setEditingId(null); setMessage('Meal saved to your plan. No calories logged yet.')
  }
  function template(days: string[]) {
    let count = 0
    for (const day of days) {
      if (state.dietTasks.some(t => t.date === day && t.meal)) continue
      malaysianSampleDay(mode, plan.target, weekDates.indexOf(day) >= 0 ? weekDates.indexOf(day) : 0).forEach((meal, i) => {
        const mealSlot: MealSlot = mode === 'omad' ? 'dinner' : meal.name.toLowerCase().includes('snack') ? 'snack' : (mode === '16:8' ? (i === 0 ? 'lunch' : 'dinner') : SLOTS[i] ?? 'snack')
        const hour = mode === 'omad' ? startHour : mode === '16:8' ? startHour + [0, 4, 7][i] : [8, 13, 19, 16][i]
        addDietTask({ id: uid(), date: day, title: meal.items, completed: false, meal: { slot: mealSlot, time: clock(hour), serving: '1 example meal', servings: 1, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, note: `${mode} example. Approximate portions; edit to match what you prepare.` } }); count++
      })
    }
    setMessage(count ? `Added ${count} example meals. Existing meal days were kept.` : 'Those days already have meals. Nothing was replaced.')
  }
  function copyMeals() {
    if (!copyTo || todayISO(parseISO(copyTo)) !== copyTo || copyTo === date) return
    let count = 0
    for (const task of meals) {
      if (state.dietTasks.some(t => t.date === copyTo && t.title === task.title && t.meal?.slot === task.meal?.slot && t.meal?.time === task.meal?.time)) continue
      addDietTask({ ...task, id: uid(), date: copyTo, completed: false, completedAt: undefined, foodEntryId: undefined }); count++
    }
    setMessage(`Copied ${count} meals to ${shortDate(copyTo)}. Existing items and food logs were kept.`)
  }

  return <section className="weekly-plan meal-planner" id="weekly-plan">
    <div className="diet-section-title"><h2>Your week, on a plate.</h2><p>Malaysian meals, made practical. Plan first. Log only what you eat. {mode === '16:8' || mode === 'omad' ? `Meal times follow your ${mode} window.` : 'Nasi, lauk, sayur — portions that fit your day.'}</p></div>
    <p className="planner-halal-note">Suggestions use familiar Malaysian foods and exclude explicitly non-halal ingredients. Choose halal-certified meat, ingredients and vendors; a food name isn’t halal verification. Existing logs are kept.</p>
    <div className="weekly-nav"><button type="button" onClick={() => moveWeek(-1)} aria-label="Previous week"><Icon name="chevron_left" /></button><strong>{shortDate(weekStart)} – {shortDate(weekDates[6])}</strong><button type="button" onClick={() => moveWeek(1)} aria-label="Next week"><Icon name="chevron_right" /></button></div>
    <div className="planner-days" role="group" aria-label="Choose plan day">{weekDates.map(day => { const dayTasks = weekTasks.filter(t => t.date === day); return <button type="button" key={day} aria-label={`Plan ${day}`} aria-pressed={date === day} onClick={() => selectDate(day)}><span>{weekday(day).slice(0, 3)}</span><strong>{parseISO(day).getDate()}</strong><small>{dayTasks.filter(t => t.completed).length}/{dayTasks.length}</small>{day === today && <i aria-label="Today" />}</button> })}</div>
    <div className="planner-budget" aria-label="Planned versus eaten nutrition"><div><span>Planned</span><strong>{Math.round(total.kcal).toLocaleString()} <small>kcal</small></strong><p>{Math.round(total.protein)}g protein</p></div><div><span>Eaten · all food logs</span><strong>{Math.round(eaten.kcal).toLocaleString()} <small>kcal</small></strong><p>{Math.round(eaten.protein)}g protein</p></div><div><span>Daily target</span><strong>{plan.target.toLocaleString()} <small>kcal</small></strong><p>{plan.macros.protein}g protein</p></div></div>
    <p className="planner-gap">{total.kcal > plan.target ? `${Math.round(total.kcal - plan.target)} kcal above your planned budget.` : `${Math.round(plan.target - total.kcal)} kcal of your plan still available.`} {total.protein < plan.macros.protein ? `${Math.round(plan.macros.protein - total.protein)}g protein still to plan.` : 'Your planned protein target is covered.'}</p>
    {mode === 'keto' && <p className="planner-gap">{Math.round(total.carbs)}g total carbs planned. Net carbs need fibre data; these references do not provide it, so don’t treat this as verified keto compliance.</p>}
    <div className="planner-day-heading"><h3>{date === today ? 'Today' : `${weekday(date)}, ${shortDate(date)}`}</h3><button type="button" className="planner-primary" onClick={() => openEditor()}><Icon name="add" size={18} />Add meal</button></div>
    <div className="planner-meals">{meals.length ? meals.map(task => { const m = task.meal!; return <article className={`planner-meal ${task.completed ? 'is-eaten' : ''}`} key={task.id}><div className="planner-meal-meta"><span>{m.time} · {m.slot}</span><strong>{task.completed ? 'Eaten & logged' : 'Planned'}</strong></div>{task.title.includes(' × ') ? <MealFoodList items={task.title} /> : <h4>{task.title}</h4>}<p>{m.servings} × {m.serving} · {Math.round(m.kcal * m.servings)} kcal · {Math.round(m.protein * m.servings)}g protein</p>{m.note && <small>{m.note}</small>}{(mode === '16:8' || mode === 'omad') && !insideWindow(m.time) && <small className="planner-warning">Outside your eating window. Edit the time or adjust your approach.</small>}<div className="planner-meal-actions"><button type="button" disabled={date > today} onClick={() => { toggleDietTask(task.id); setMessage(task.completed ? 'Meal log undone. Your plan is kept.' : 'Meal added to your food log once.') }}><Icon name={task.completed ? 'undo' : 'check'} size={17} />{task.completed ? 'Undo log' : date > today ? 'Log on this date' : 'Log eaten'}</button>{!task.completed && <button type="button" onClick={() => openEditor(task)}>Edit meal</button>}<button type="button" onClick={() => { removeDietTask(task.id); setMessage(task.completed ? 'Removed from the plan. Your eaten food log is kept.' : 'Meal removed from the plan.') }} aria-label={`Remove plan for ${task.title}`}><Icon name="close" size={17} /></button></div></article> }) : <div className="planner-empty"><h4>No meals planned yet.</h4><p>Search food and choose your portion, or start from a {mode === 'standard' ? 'balanced' : mode} example. Planning doesn’t add to your food log.</p><button type="button" onClick={() => template([date])}>Use example day</button></div>}</div>
    {editor && <form className="planner-editor" onSubmit={saveMeal}>
      <div className="planner-day-heading"><h3>{editingId ? 'Edit planned meal' : 'Build a meal'}</h3><button type="button" onClick={() => setEditor(false)} aria-label="Close meal editor"><Icon name="close" /></button></div>
      <label>Search food<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Chicken rice, eggs, yogurt…" /></label>
      <div className="planner-search-results" role="group" aria-label="Food search results">{results.map((f, i) => <button type="button" key={`${f.name}-${i}`} aria-pressed={food?.name === f.name} onClick={() => { setFood(f); setPortion('1') }}><span><strong>{f.name}</strong><small>{f.serving} · {Math.round(f.kcal)} kcal · {Math.round(f.protein)}g protein</small></span><Icon name="add" size={17} /></button>)}{!results.length && <p>No complete reference found. Enter a custom meal below using a label or estimate you trust. We don’t invent missing macros.</p>}</div>
      <button type="button" className="planner-custom" onClick={() => { setFood({ name: '', emoji: '', category: 'Basics', serving: '1 portion', kcal: 0, protein: 0, carbs: 0, fat: 0 }); setPortion('1') }}>Enter custom meal</button>
      {food && <>
        <p className="planner-selected"><strong>{food.name || 'Your custom meal'}</strong><span>Nutrition per {food.serving}. {Math.round(food.kcal * (+portion || 0))} kcal for your portion.</span></p>
        <label>Food name<input value={food.name} maxLength={160} onChange={e => setFood({ ...food, name: e.target.value })} required /></label>
        {hasExcludedIngredients(food.name) && <p className="planner-warning" role="alert">This planner excludes pork, alcohol and uncertain ingredient references. Choose another food; we can’t verify halal status from a name.</p>}
        <div className="planner-fields"><label>Meal slot<select value={slot} onChange={e => setSlot(e.target.value as MealSlot)}>{SLOTS.map(s => <option key={s}>{s}</option>)}</select></label><label>Meal time<input type="time" value={time} onChange={e => setTime(e.target.value)} required /></label><label>Servings<input type="number" step="0.25" min="0.25" max="20" value={portion} onChange={e => setPortion(e.target.value)} required /></label></div>
        <details className="planner-nutrition"><summary>Review nutrition per serving</summary><label>Reference serving<input value={food.serving} onChange={e => setFood({ ...food, serving: e.target.value })} required /></label><div className="planner-fields">{([{ key: 'kcal', label: 'Calories (kcal)' }, { key: 'protein', label: 'Protein (g)' }, { key: 'carbs', label: 'Carbs (g)' }, { key: 'fat', label: 'Fat (g)' }] as const).map(field => <label key={field.key}>{field.label}<input type="number" min={field.key === 'kcal' ? 1 : 0} step="any" value={Number.isFinite(food[field.key]) ? food[field.key] : ''} onChange={e => setFood({ ...food, [field.key]: e.target.value === '' ? NaN : +e.target.value })} /></label>)}</div><p>Stored nutrition is an estimate. Calories and macros come from your selected reference or values you enter; actual preparation can differ.</p></details>
        <button className="planner-primary" type="submit" disabled={!draft || !validPlannedMeal(draft)}>Save planned meal</button>
      </>}
    </form>}
    <p role="status" className="planner-status">{message}</p>
    <details className="planner-tools"><summary>Repeat & prepare</summary><button type="button" onClick={() => template(weekDates)}>Fill empty meal days with examples</button><p>Uses your active approach and calorie target. Days with existing meals are untouched. Review example portions before logging.</p><label>Copy this day’s meals to<input type="date" value={copyTo} onChange={e => setCopyTo(e.target.value)} /></label><button type="button" disabled={!meals.length || !copyTo || copyTo === date} onClick={copyMeals}>Copy meals</button><h4>This week’s prep list</h4><p>Planned food and portions, not a raw-ingredient shopping list. Includes meals already eaten this week.</p><ul>{Array.from(weekTasks.filter(t => t.meal).reduce((map, t) => { const key = `${t.title} (${t.meal!.serving})`; map.set(key, (map.get(key) ?? 0) + t.meal!.servings); return map }, new Map<string, number>())).map(([name, amount]) => <li key={name}><strong>{amount.toFixed(2).replace(/\.00$/, '')} ×</strong> {name}</li>)}</ul></details>
    <details className="planner-habits"><summary>Food habits · {habits.filter(t => t.completed).length}/{habits.length} done</summary>{habits.map(task => <div className="weekly-task" key={task.id}><label><input type="checkbox" checked={task.completed} disabled={date > today} onChange={() => toggleDietTask(task.id)} /><span>{task.title}</span></label><button type="button" onClick={() => removeDietTask(task.id)} aria-label={`Remove ${task.title}`}><Icon name="close" size={16} /></button></div>)}<form onSubmit={e => { e.preventDefault(); if (!habit.trim()) return; addDietTask({ id: uid(), date, title: habit.trim(), completed: false }); setHabit('') }}><label>Add a food habit<input value={habit} maxLength={80} onChange={e => setHabit(e.target.value)} placeholder="Prepare lunch at home" required /></label><button type="submit" disabled={!habit.trim()}>Add habit</button></form><p>Habits track consistency; they never add calories.</p></details>
    <div className="diet-activity"><div className="diet-activity-head"><h3>Consistency map</h3><span>{weekTasks.filter(t => t.completed).length}/{weekTasks.length} this week</span></div><p>Logged meals and completed habits, on the day they happened.</p><div className="diet-activity-grid" role="img" aria-label="Diet consistency over thirteen weeks">{weeks.map((week, wi) => <div className="diet-activity-week" key={wi}>{week.map(day => { const count = state.dietTasks.filter(t => t.completed && (t.completedAt ?? t.date) === day).length; return <span key={day} className={`diet-dot level-${Math.min(count, 4)} ${day > today ? 'future' : ''}`} title={`${shortDate(day)}: ${count} completed`} /> })}</div>)}</div><div className="diet-activity-legend"><span>Less</span><i className="level-0" /><i className="level-1" /><i className="level-2" /><i className="level-3" /><i className="level-4" /><span>More</span></div></div>
  </section>
}
