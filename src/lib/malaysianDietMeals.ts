import type { DietMode } from '../types'
import { LOCAL_FOODS, type LocalFood } from './localFoods'
export { hasExcludedIngredients } from '../../shared/foodSuitability.js'

// Curated Malaysian choices, NOT halal certification. Source/preparation still matter.
const NAMES = new Set([
  'Steamed White Rice', 'Nasi Ayam (Chicken Rice)', 'Nasi Campur (1 meat, 2 veg)',
  'Nasi Kerabu', 'Nasi Dagang', 'Nasi Lemak (with sambal, egg, anchovies)',
  'Nasi Goreng Kampung', 'Nasi Ayam Penyet', 'Bihun Soup', 'Mee Rebus',
  'Roti Canai (plain)', 'Roti Telur', 'Capati (Chapati)', 'Thosai / Tosai (plain)',
  'Boiled Egg', 'Half-Boiled Eggs (2)', 'Telur Dadar (Omelette)', 'Telur Goreng (Fried Egg)',
  'Chicken Breast (grilled)', 'Ayam Masak Kicap', 'Ayam Masak Merah',
  'Ayam Goreng (Fried Chicken)', 'Tandoori Chicken', 'Satay Chicken (6 sticks)',
  'Ikan Bakar (Grilled Fish)', 'Ikan Asam Pedas', 'Sup Ayam (Chicken Soup)', 'Sup Kambing',
  'Sotong Masak Kicap', 'Tom Yam Seafood', 'Sayur Campur (Mixed Veg)', 'Ulam with Sambal',
  'Kangkung Belacan', 'Acar (Pickled Veg)', 'Banana (Pisang)', 'Papaya', 'Watermelon (Tembikai)',
  'Karipap (Curry Puff)', 'Keropok Lekor', 'Pisang Goreng (Banana Fritter)',
  'Teh Tarik', 'Kopi O', 'Teh O Ais', 'Kelapa (Coconut Water)', 'Ramly Burger Special',
])
export const MALAYSIAN_PLAN_FOODS = LOCAL_FOODS.filter(f => NAMES.has(f.name))
export function searchMalaysianPlanFoods(query: string): LocalFood[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return MALAYSIAN_PLAN_FOODS.filter(f => terms.every(term => [f.name, ...(f.aka ?? [])].join(' ').toLowerCase().includes(term))).slice(0, 10)
}

export function malaysianSampleDay(mode: DietMode, target: number, variant = 0) {
  const rice = target < 1600 ? 0.5 : target > 2200 ? 1.5 : 1
  const protein = target > 2200 ? 1.5 : 1
  const chicken = variant % 3 === 1 ? 'Tandoori Chicken' : 'Chicken Breast (grilled)'
  const fish = variant % 3 === 2 ? 'Ikan Asam Pedas' : 'Ikan Bakar (Grilled Fish)'
  const recipes: [string, [string, number][]][] = mode === 'egg' ? [
    ['Breakfast', [['Telur Dadar (Omelette)', 1], ['Ulam with Sambal', 1]]],
    ['Lunch', [[chicken, protein], ['Ulam with Sambal', 1], ['Boiled Egg', 2]]],
    ['Dinner', [[fish, protein], ['Sayur Campur (Mixed Veg)', 1], ['Boiled Egg', 1]]],
  ] : mode === 'keto' ? [
    ['Breakfast', [['Telur Dadar (Omelette)', 1], ['Ulam with Sambal', 1]]],
    ['Lunch', [[chicken, 1.5], ['Kangkung Belacan', 1]]],
    ['Dinner', [[fish, 1.5], ['Sayur Campur (Mixed Veg)', 1]]],
  ] : [
    ['Breakfast', [['Half-Boiled Eggs (2)', 1], [variant % 3 === 2 ? 'Thosai / Tosai (plain)' : 'Capati (Chapati)', 1], ['Papaya', 1]]],
    ['Lunch', [['Steamed White Rice', rice], [chicken, protein], ['Ulam with Sambal', 1]]],
    ['Dinner', [['Steamed White Rice', rice], [fish, protein], ['Sayur Campur (Mixed Veg)', 1]]],
    ['Snack', [['Banana (Pisang)', 1], ['Boiled Egg', 1]]],
  ]
  const meals = recipes.map(([name, ingredients]) => {
    const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    const items = ingredients.map(([foodName, amount]) => {
      const f = MALAYSIAN_PLAN_FOODS.find(item => item.name === foodName)!
      for (const key of ['kcal', 'protein', 'carbs', 'fat'] as const) totals[key] += f[key] * amount
      const label: Record<string, string> = { 'Steamed White Rice': 'Nasi putih', 'Chicken Breast (grilled)': 'Dada ayam panggang', 'Ikan Bakar (Grilled Fish)': 'Ikan bakar', 'Boiled Egg': 'Telur rebus', 'Half-Boiled Eggs (2)': 'Telur separuh masak', 'Papaya': 'Betik', 'Banana (Pisang)': 'Pisang', 'Ulam with Sambal': 'Ulam + sambal', 'Sayur Campur (Mixed Veg)': 'Sayur campur', 'Capati (Chapati)': 'Capati', 'Thosai / Tosai (plain)': 'Tosai kosong' }
      return `${label[foodName] ?? foodName} (${amount} × ${f.serving})`
    }).join(', ')
    return { name, items, ...totals }
  })
  if (mode === 'omad') return [{ name: 'The Meal', items: meals.map(m => m.items).join('; '), ...meals.reduce((sum, m) => ({ kcal: sum.kcal + m.kcal, protein: sum.protein + m.protein, carbs: sum.carbs + m.carbs, fat: sum.fat + m.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }) }]
  if (mode === '16:8') {
    const [breakfast, lunch, dinner, snack] = meals
    return [{ name: 'Meal 1', items: `${breakfast.items}; ${lunch.items}`, kcal: breakfast.kcal + lunch.kcal, protein: breakfast.protein + lunch.protein, carbs: breakfast.carbs + lunch.carbs, fat: breakfast.fat + lunch.fat }, { ...snack, name: 'Snack' }, { ...dinner, name: 'Meal 2' }]
  }
  return meals
}
