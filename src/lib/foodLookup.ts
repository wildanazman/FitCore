// Client wrapper for the online text-based nutrition lookup (/api/lookup-food).

import { matchLocalFood, type LocalFood } from './localFoods'
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

/** Look a food up online by name. Throws with a readable message on failure. */
export async function lookupFood(name: string): Promise<LookupResult> {
  const local = matchLocalFood(name)
  try {
    const res = await fetch(apiUrl('/api/lookup-food'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(json?.error || `Lookup failed (${res.status})`)
    const online = json as LookupResult
    if (!local) return online
    return {
      ...online,
      note: `${online.note ? `${online.note} · ` : ''}Local ref: ${local.name} (${local.kcal} kcal / ${local.serving}).`,
    }
  } catch (error) {
    if (!local) throw error
    return {
      name: local.name,
      emoji: local.emoji,
      serving: local.serving,
      kcal: local.kcal,
      protein: local.protein,
      carbs: local.carbs,
      fat: local.fat,
      confidence: 0.72,
      note: 'Internet lookup unavailable; using the stored Malaysian local reference.',
      source: 'local',
    }
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
