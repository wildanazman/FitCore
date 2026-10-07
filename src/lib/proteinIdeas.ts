import { LOCAL_FOODS } from './localFoods'

/** Portion suggestions from the same local reference used by food logging. */
export function proteinIdeas(gap: number, withDairy = true) {
  const needed = Number.isFinite(gap) ? Math.max(0, gap) : 0
  const items: { name: string; portion: string; protein: number; kcal: number; carbs: number; fat: number }[] = []
  function add(name: string, servings: number, portion: string) {
    const food = LOCAL_FOODS.find(item => item.name === name)
    if (!food) return
    items.push({ name, portion, protein: food.protein * servings, kcal: food.kcal * servings, carbs: food.carbs * servings, fat: food.fat * servings })
  }
  if (needed <= 0) return { items, protein: 0, kcal: 0, carbs: 0, fat: 0 }
  if (needed <= 12) {
    const eggs = Math.ceil(needed / 6)
    add('Boiled Egg', eggs, `${eggs} boiled egg${eggs === 1 ? '' : 's'}`)
  } else {
    if (needed > 46) add('Boiled Egg', 2, '2 boiled eggs')
    if (needed > 80 && withDairy) add('Greek Yogurt & Berries', 1, '1 cup Greek yogurt & berries')
    const remaining = Math.max(0, needed - items.reduce((sum, item) => sum + item.protein, 0))
    const grams = Math.max(50, Math.ceil(remaining / 46 * 150 / 10) * 10)
    add('Chicken Breast (grilled)', grams / 150, `${grams} g cooked grilled chicken breast`)
    items.sort((a, b) => b.protein - a.protein)
  }
  const sum = (key: 'protein' | 'kcal' | 'carbs' | 'fat') => items.reduce((total, item) => total + item[key], 0)
  return { items, protein: Math.round(sum('protein') * 10) / 10, kcal: Math.round(sum('kcal')), carbs: Math.round(sum('carbs')), fat: Math.round(sum('fat')) }
}
