// Photo calorie detection (PRD 3.2).
// Real path: same-origin /api/detect-food, backed by Gemini vision on the server.
// Fallbacks: optional Claude browser key, then a clearly-marked rough offline estimate.
// Detected names are grounded against the local Malaysian food reference (MyFCD /
// Kal) so calories for local dishes come from vetted values.

import { LOCAL_FOODS, matchLocalFood } from './localFoods'
import { apiUrl } from './apiBase'

export interface DetectionItem {
  name: string
  grams?: number
  kcal: number
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
  requestedProvider?: FoodAIProvider
}

export type FoodAIProvider = 'auto' | 'gemini' | 'anthropic' | 'local'

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

/** Hash a string to a stable index (deterministic mock selection). */
function hashIndex(seed: string, mod: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % mod
}

export async function detectFromMock(seed: string, reason?: string): Promise<Detection> {
  await new Promise((r) => setTimeout(r, 700))
  const f = LOCAL_FOODS[hashIndex(seed, LOCAL_FOODS.length)]
  const why = reason ? ` (${reason})` : ''
  return {
    name: f.name,
    emoji: f.emoji,
    kcal: f.kcal,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    confidence: 0.5,
    source: 'local',
    note: `Live AI was unavailable${why}. Rough estimate from the local food reference \u2014 review before saving.`,
  }
}

/**
 * Ground an AI detection against the local Malaysian food reference (MyFCD / Kal).
 * Strong local match + low AI confidence \u2192 snap macros to the vetted local values;
 * otherwise keep the AI's (image-informed) estimate but attach the local reference.
 */
export function groundDetection(det: Detection): Detection {
  const match = matchLocalFood(det.name)
  if (!match) return det
  // The Gemini path now searches the web for real nutrition data, so trust its
  // (image-informed) totals. Only snap to the local table for the offline
  // fallback or a genuinely unsure read; otherwise just show the local ref.
  if (det.source === 'local' || det.confidence < 0.45) {
    return {
      ...det,
      kcal: match.kcal,
      protein: match.protein,
      carbs: match.carbs,
      fat: match.fat,
      emoji: det.emoji || match.emoji,
      note: `Calories from local reference: ${match.name} (${match.serving}).`,
    }
  }
  return { ...det, note: `Local ref \u2014 ${match.name}: ${match.kcal} kcal / ${match.serving}.` }
}

const SYSTEM_PROMPT =
  'You are a nutrition vision model. Identify the single main meal in the image and estimate ' +
  'its macros for the portion shown. Favor South-East Asian and Malaysian dishes when plausible. ' +
  'Respond ONLY with compact JSON: ' +
  '{"name":string,"emoji":string,"kcal":number,"protein":number,"carbs":number,"fat":number,"confidence":number} ' +
  'where confidence is 0..1. No prose.'

interface AnthropicContentBlock {
  type: string
  text?: string
}
interface AnthropicResponse {
  content?: AnthropicContentBlock[]
}

function normalizeDetection(value: Partial<Detection>, source: Detection['source']): Detection {
  const items = Array.isArray(value.items)
    ? value.items.slice(0, 12).map((it) => ({
        name: String(it?.name ?? 'item'),
        grams: it?.grams != null ? Math.max(0, Math.round(Number(it.grams))) : undefined,
        kcal: Math.max(0, Math.round(Number(it?.kcal) || 0)),
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

function parseJsonObject(text: string): Partial<Detection> {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('No JSON object in AI response')
  return JSON.parse(text.slice(start, end + 1)) as Partial<Detection>
}

async function detectWithServer(dataUrl: string, provider: FoodAIProvider): Promise<Detection> {
  const res = await fetch(apiUrl('/api/detect-food'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: dataUrl, provider }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error || `Food AI ${res.status}`)
  return normalizeDetection(json ?? {}, json?.source ?? 'gemini')
}

/** Live Claude vision call. dataUrl must be a base64 data URL (image/jpeg|png). */
export async function detectWithClaude(apiKey: string, dataUrl: string): Promise<Detection> {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('Unsupported image format')
  const [, mediaType, b64] = match

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
            { type: 'text', text: 'Identify this meal and estimate calories and macros for the portion shown.' },
          ],
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}`)
  const json = (await res.json()) as AnthropicResponse
  const text = json.content?.find((c) => c.type === 'text')?.text ?? ''
  return normalizeDetection(parseJsonObject(text), 'claude')
}

/** Top-level detect: tries server Gemini vision, optional Claude, then rough local fallback. */
export async function detectFood(dataUrl: string, apiKey: string, provider: FoodAIProvider = 'auto'): Promise<Detection> {
  let reason: string | undefined
  if (provider === 'anthropic') {
    try {
      return groundDetection(await detectWithServer(dataUrl, provider))
    } catch (err) {
      reason = err instanceof Error ? err.message : 'Anthropic server error'
    }
  } else {
    try {
      return groundDetection(await detectWithServer(dataUrl, provider))
    } catch (err) {
      reason = err instanceof Error ? err.message : 'server error'
    }
  }

  if (apiKey.trim() && provider === 'anthropic') {
    try {
      return groundDetection(await detectWithClaude(apiKey.trim(), dataUrl))
    } catch (err) {
      reason = err instanceof Error ? err.message : reason
    }
  }

  if (provider === 'local') {
    return detectFromMock(dataUrl.slice(-64), `Online nutrition search unavailable${reason ? `: ${reason}` : ''}`)
  }

  throw new Error(reason || 'Food AI endpoint is unavailable. Check the deployment API route.')
}

export function slotForNow(d = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = d.getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}
