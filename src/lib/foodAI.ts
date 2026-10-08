// Photo calorie detection (PRD 3.2).
// Real path: same-origin /api/detect-food, backed by Gemini vision on the server.
// Gemini-only photo scans. Local food references are name-based,
// never a substitute for image recognition or a measured photo portion.

import { matchLocalFood } from './localFoods'
import { apiUrl } from './apiBase'
import { googleAuthHeaders } from '../store/AuthContext'

export interface DetectionItem {
  name: string
  grams?: number
  kcal: number
  protein?: number
  carbs?: number
  fat?: number
  portion?: string
}

export interface Detection {
  name: string
  emoji: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  confidence: number
  source?: 'gemini' | 'openai' | 'claude' | 'openfoodfacts' | 'usda' | 'local'
  /** Per-component breakdown from the web-grounded analysis. */
  items?: DetectionItem[]
  /** What the model assumed about portions/ingredients. */
  assumptions?: string
  note?: string
  /** Provider mode selected by the user before the request was made. */
  model?: string
  requestedModel?: string
  usage?: { inputTokens: number; outputTokens: number; thinkingTokens: number }
}


const USAGE_KEY = 'fitcore-food-ai-usage-v1'

function usageDay() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Local request count for transparency; provider quota is not exposed by the APIs. */
export function recordFoodAIUsage(source: Detection['source']): number {
  if (source === 'local') return 0
  const day = usageDay()
  try {
    const current = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}')
    const counts = current.day === day ? current.counts || {} : {}
    counts[source || 'unknown'] = Number(counts[source || 'unknown'] || 0) + 1
    localStorage.setItem(USAGE_KEY, JSON.stringify({ day, counts }))
    return counts[source || 'unknown']
  } catch {
    return 0
  }
}

export function foodAIUsage(source: Detection['source']): number {
  if (source === 'local') return 0
  try {
    const current = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}')
    return current.day === usageDay() ? Number(current.counts?.[source || 'unknown'] || 0) : 0
  } catch {
    return 0
  }
}

/**
 * Add an exact-dish reference without replacing photo-specific portions.
 * A standard serving is not interchangeable with food seen in an image.
 */
export function groundDetection(det: Detection): Detection {
  const match = matchLocalFood(det.name)
  if (!match) return det
  return { ...det, note: `Reference for a standard serving only: ${match.name} · ${match.kcal} kcal / ${match.serving}. Photo estimate above is separate.` }
}


function normalizeDetection(value: Partial<Detection>, source: Detection['source']): Detection {
  const items = Array.isArray(value.items)
    ? value.items.slice(0, 12).map((it) => ({
        name: String(it?.name ?? 'item'),
        grams: it?.grams != null ? Math.max(0, Math.round(Number(it.grams))) : undefined,
        kcal: Math.max(0, Math.round(Number(it?.kcal) || 0)),
        protein: typeof it?.protein === 'number' && Number.isFinite(it.protein) ? Math.max(0, it.protein) : undefined,
        carbs: typeof it?.carbs === 'number' && Number.isFinite(it.carbs) ? Math.max(0, it.carbs) : undefined,
        fat: typeof it?.fat === 'number' && Number.isFinite(it.fat) ? Math.max(0, it.fat) : undefined,
        portion: typeof it?.portion === 'string' ? it.portion : undefined,
      }))
    : undefined
  return {
    name: String(value.name ?? 'Detected meal'),
    emoji: String(value.emoji ?? '\uD83C\uDF7D\uFE0F'),
    kcal: Math.max(0, Math.round(Number(value.kcal) || 0)),
    protein: Math.max(0, Math.round(Number(value.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(value.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(value.fat) || 0)),
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0.7)),
    items: items && items.length ? items : undefined,
    assumptions: value.assumptions ? String(value.assumptions) : undefined,
    source,
  }
}


async function detectWithServer(dataUrl: string, model: string): Promise<Detection> {
  const res = await fetch(apiUrl('/api/detect-food'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...googleAuthHeaders() },
    body: JSON.stringify({ image: dataUrl, provider: 'gemini', model }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error || `Food AI ${res.status}`)
  return { ...normalizeDetection(json ?? {}, json?.source ?? 'gemini'), model: json?.model, requestedModel: json?.requestedModel, usage: json?.usage }
}


/** Gemini-only analysis; never silently switch models or paid providers. */
export async function detectFood(dataUrl: string, model: string): Promise<Detection> {
  return groundDetection(await detectWithServer(dataUrl, model))
}

export function slotForNow(d = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = d.getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}
