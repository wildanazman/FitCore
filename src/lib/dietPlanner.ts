import type { AppState, DietTask } from '../types'
import { parseISO, todayISO } from './date'
import { hasExcludedIngredients } from './malaysianDietMeals'

export function validPlannedMeal(task: DietTask): boolean {
  const m = task.meal
  return !!m && !!task.title.trim() && !hasExcludedIngredients(task.title) && !!m.serving.trim() && /^\d{4}-\d{2}-\d{2}$/.test(task.date) && todayISO(parseISO(task.date)) === task.date && /^([01]\d|2[0-3]):[0-5]\d$/.test(m.time) && ['breakfast', 'lunch', 'dinner', 'snack'].includes(m.slot) && Number.isFinite(m.servings) && m.servings > 0 && m.servings <= 20 && [m.kcal, m.protein, m.carbs, m.fat].every(v => Number.isFinite(v) && v >= 0 && v <= 10000) && m.kcal > 0
}

export function plannedTotals(tasks: DietTask[]) {
  return tasks.reduce((sum, task) => {
    const m = task.meal
    if (!m) return sum
    return { kcal: sum.kcal + m.kcal * m.servings, protein: sum.protein + m.protein * m.servings, carbs: sum.carbs + m.carbs * m.servings, fat: sum.fat + m.fat * m.servings }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
}

/** One atomic transition: a tick logs a meal once; undo removes only its linked log. */
export function togglePlannedTask(state: AppState, id: string): AppState {
  const task = state.dietTasks.find(t => t.id === id)
  if (!task || task.date > todayISO()) return state
  if (!task.meal) return { ...state, dietTasks: state.dietTasks.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: t.completed ? undefined : t.date } : t) }
  if (task.completed) return { ...state, foods: state.foods.filter(f => f.id !== task.foodEntryId), dietTasks: state.dietTasks.map(t => t.id === id ? { ...t, completed: false, completedAt: undefined, foodEntryId: undefined } : t) }
  if (!validPlannedMeal(task)) return state
  const m = task.meal, foodId = `diet-meal-${task.id}`
  const at = parseISO(task.date), [hour, minute] = m.time.split(':').map(Number)
  at.setHours(hour, minute, 0, 0)
  const loggedAt = at.toISOString()
  const food = { id: foodId, name: task.title, emoji: '', date: task.date, loggedAt, slot: m.slot, kcal: Math.round(m.kcal * m.servings), protein: Math.round(m.protein * m.servings), carbs: Math.round(m.carbs * m.servings), fat: Math.round(m.fat * m.servings), servings: m.servings, confidence: 0.8 }
  return { ...state, foods: state.foods.some(f => f.id === foodId) ? state.foods : [...state.foods, food], dietTasks: state.dietTasks.map(t => t.id === id ? { ...t, completed: true, completedAt: task.date, foodEntryId: foodId } : t) }
}
