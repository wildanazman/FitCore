/** Published household portions; these sources do not provide macros. */
import hq from '../data/kkm-hq-foods.json'
import selangor from '../data/kkm-selangor-foods.json'
import { hasExcludedIngredients } from '../../shared/foodSuitability.js'
import type { RestaurantFood } from './restaurantFoods'

export interface CalorieReference extends RestaurantFood {
  id: string
  aliases: string[]
}

const seen = new Set<string>()
export const KKM_FOODS: CalorieReference[] = [...hq, ...selangor].flatMap(row => {
  if (hasExcludedIngredients(row.name) || !Number.isFinite(row.kcal) || row.kcal < 0) return []
  const key = [row.name.toLowerCase().trim(), row.serving.toLowerCase().trim(), row.amount, row.unit, row.kcal].join('|')
  if (seen.has(key)) return []
  seen.add(key)
  const weight = row.amount != null && row.unit ? `${row.amount} ${row.unit}` : ''
  return [{
    id: row.id, brand: 'KKM' as const, name: row.name, aliases: row.aliases,
    serving: `${row.serving.split(/\s*[ǀ|│]\s*/)[0]}${weight ? ` · ${weight}` : ''}`,
    kcal: row.kcal, protein: null, carbs: null, fat: null,
    sourceUrl: row.sourceUrl,
    sourceLabel: `${row.id.startsWith('kkm-hq') ? 'KKM HQ' : 'KKM Selangor 2016'} · page ${row.page}`,
    note: [`Published portion, not a measurement of your meal. Macros not provided. Reference: ${row.sourceReference || 'unspecified'}.`, ...row.warnings].join(' '),
  }]
})

export function searchKKMFoods(query: string, limit = 45): CalorieReference[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  const exact = query.toLowerCase().trim()
  return KKM_FOODS.filter(item => {
    const haystack = `${item.name} ${item.aliases.join(' ')}`.toLowerCase()
    return terms.every(term => haystack.includes(term))
  }).sort((a, b) => Number(b.name.toLowerCase() === exact) - Number(a.name.toLowerCase() === exact) || a.name.localeCompare(b.name)).slice(0, limit)
}
