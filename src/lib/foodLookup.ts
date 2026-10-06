// Client wrapper for the online text-based nutrition lookup (/api/lookup-food).

import { matchLocalFoodDetails, type LocalFood } from './localFoods'
import { hasCompleteMacros, matchRestaurantFood } from './restaurantFoods'
import { apiUrl } from './apiBase'

export interface LookupResult {
  name: string
  emoji?: string
  serving: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  confidence: number
  note?: string
  source: 'openfoodfacts' | 'usda' | 'claude' | 'gemini' | 'local'
}

export function sourceLabel(source: LookupResult['source']): string {
  switch (source) {
    case 'openfoodfacts':
      return 'Open Food Facts'
    case 'usda':
      return 'USDA FoodData Central'
    case 'claude':
      return 'AI web search'
    case 'gemini':
      return 'AI web search'
    case 'local':
      return 'Local Malaysian reference'
  }
}

/** Use a named local entry only when its serving can be represented honestly. */
export function lookupLocalFood(name: string): LookupResult | null {
  const restaurant = matchRestaurantFood(name)
  if (restaurant && hasCompleteMacros(restaurant)) return {
    name: `${restaurant.brand} · ${restaurant.name}`,
    serving: restaurant.serving,
    kcal: restaurant.kcal,
    protein: restaurant.protein,
    carbs: restaurant.carbs,
    fat: restaurant.fat,
    confidence: 0.9,
    note: `${restaurant.sourceLabel}: ${restaurant.sourceUrl}. ${restaurant.note ?? 'Standard recipe; check current portion.'}`,
    source: 'local',
  }
  const match = matchLocalFoodDetails(name)
  if (!match) return null
  const { food, grams } = match
  const referenceGrams = /^\s*(\d+(?:\.\d+)?)\s*g\s*$/i.exec(food.serving)
  if (grams !== null && (!referenceGrams || grams <= 0 || grams > 2000)) return null
  const multiplier = grams === null ? 1 : grams / Number(referenceGrams?.[1])
  return {
    name: food.name,
    emoji: food.emoji,
    serving: grams === null ? food.serving : `${grams} g`,
    kcal: Math.round(food.kcal * multiplier),
    protein: Math.round(food.protein * multiplier),
    carbs: Math.round(food.carbs * multiplier),
    fat: Math.round(food.fat * multiplier),
    confidence: 0.8,
    note: grams === null ? `Stored reference for ${food.serving}; adjust if your portion differs.` : `Scaled from the stored ${food.serving} reference; preparation can differ.`,
    source: 'local',
  }
}

/** Search locally first; ask the online lookup only for foods absent from the table. */
export async function lookupFood(name: string, signal?: AbortSignal): Promise<LookupResult> {
  const local = lookupLocalFood(name)
  if (local) return local
  try {
    const res = await fetch(apiUrl('/api/lookup-food'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
      signal,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(json?.error || `Lookup failed (${res.status})`)
    return json as LookupResult
  } catch (error) {
    throw error
  }
}

export function resultToLocalFood(r: LookupResult): LocalFood {
  return {
    name: r.name,
    emoji: r.emoji || '🍽️',
    category: 'Basics',
    serving: r.serving,
    kcal: r.kcal,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
  }
}
