// Client wrapper for the online text-based nutrition lookup (/api/lookup-food).

import type { LocalFood } from './localFoods'

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
  source: 'openfoodfacts' | 'claude' | 'gemini'
}

export function sourceLabel(source: LookupResult['source']): string {
  switch (source) {
    case 'openfoodfacts':
      return 'Open Food Facts'
    case 'claude':
      return 'AI web search'
    case 'gemini':
      return 'AI web search'
  }
}

/** Look a food up online by name. Throws with a readable message on failure. */
export async function lookupFood(name: string): Promise<LookupResult> {
  const res = await fetch('/api/lookup-food', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error || `Lookup failed (${res.status})`)
  return json as LookupResult
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
