import type { FoodEntry } from '../types'

/** Reuse exactly the last logged portion; keep different recipes/references separate. */
export function foodHistory(foods: FoodEntry[], mode: 'recent' | 'frequent', date: string) {
  const groups = new Map<string, { food: FoodEntry; count: number }>()
  for (const food of [...foods].filter(f => f.date <= date).sort((a,b)=>b.loggedAt.localeCompare(a.loggedAt))) {
    const key = JSON.stringify([food.name.trim().toLowerCase(),food.portion,food.kcal,food.protein,food.carbs,food.fat,food.missingMacros,food.servings])
    const old = groups.get(key)
    if (old) old.count++
    else groups.set(key,{food,count:1})
  }
  const items = [...groups.values()]
  if (mode === 'frequent') items.sort((a,b)=>b.count-a.count||b.food.loggedAt.localeCompare(a.food.loggedAt))
  return items.slice(0,50)
}
