// Photo calorie detection (PRD 3.2).
// Real path: same-origin /api/detect-food, backed by Gemini vision on the server.
// Fallbacks: optional Claude browser key, then a clearly-marked rough offline estimate.

export interface Detection {
  name: string
  emoji: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  confidence: number
  source?: 'gemini' | 'openai' | 'claude' | 'local'
  note?: string
}

// Local SEA / Malaysian food reference (per standard serving). Confidence is
// deliberately low because this path does not inspect the image.
const FOOD_DB: Detection[] = [
  { name: 'Nasi Lemak', emoji: '\uD83C\uDF5A', kcal: 644, protein: 17, carbs: 80, fat: 28, confidence: 0.52, source: 'local' },
  { name: 'Mee Goreng', emoji: '\uD83C\uDF5C', kcal: 577, protein: 18, carbs: 76, fat: 21, confidence: 0.5, source: 'local' },
  { name: 'Roti Canai', emoji: '\uD83E\uDED3', kcal: 301, protein: 7, carbs: 41, fat: 12, confidence: 0.55, source: 'local' },
  { name: 'Char Kway Teow', emoji: '\uD83C\uDF73', kcal: 742, protein: 23, carbs: 76, fat: 38, confidence: 0.49, source: 'local' },
  { name: 'Chicken Rice', emoji: '\uD83C\uDF57', kcal: 607, protein: 30, carbs: 75, fat: 20, confidence: 0.54, source: 'local' },
  { name: 'Grilled Salmon Bowl', emoji: '\uD83D\uDC1F', kcal: 640, protein: 42, carbs: 58, fat: 24, confidence: 0.56, source: 'local' },
  { name: 'Protein Oats & Eggs', emoji: '\uD83E\uDD63', kcal: 540, protein: 38, carbs: 52, fat: 18, confidence: 0.53, source: 'local' },
  { name: 'Laksa', emoji: '\uD83C\uDF72', kcal: 520, protein: 21, carbs: 55, fat: 24, confidence: 0.5, source: 'local' },
  { name: 'Satay (6 sticks)', emoji: '\uD83C\uDF62', kcal: 360, protein: 34, carbs: 12, fat: 20, confidence: 0.52, source: 'local' },
  { name: 'Caesar Salad w/ Chicken', emoji: '\uD83E\uDD57', kcal: 420, protein: 32, carbs: 12, fat: 26, confidence: 0.54, source: 'local' },
]

/** Hash a string to a stable index (deterministic mock selection). */
function hashIndex(seed: string, mod: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % mod
}

export async function detectFromMock(seed: string): Promise<Detection> {
  await new Promise((r) => setTimeout(r, 700))
  return {
    ...FOOD_DB[hashIndex(seed, FOOD_DB.length)],
    note: 'Live AI was unavailable, so this is a rough offline estimate. Review before saving.',
  }
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
  return {
    name: String(value.name ?? 'Detected meal'),
    emoji: String(value.emoji ?? '\uD83C\uDF7D\uFE0F'),
    kcal: Math.max(0, Math.round(Number(value.kcal) || 0)),
    protein: Math.max(0, Math.round(Number(value.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(value.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(value.fat) || 0)),
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0.7)),
    source,
  }
}

function parseJsonObject(text: string): Partial<Detection> {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('No JSON object in AI response')
  return JSON.parse(text.slice(start, end + 1)) as Partial<Detection>
}

async function detectWithServer(dataUrl: string): Promise<Detection> {
  const res = await fetch('/api/detect-food', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: dataUrl }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error || `Food AI ${res.status}`)
  return normalizeDetection(json ?? {}, 'gemini')
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
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
            { type: 'text', text: 'Identify this meal and estimate macros.' },
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
export async function detectFood(dataUrl: string, apiKey: string): Promise<Detection> {
  try {
    return await detectWithServer(dataUrl)
  } catch {
    // Continue to optional user-provided fallback below.
  }

  if (apiKey.trim()) {
    try {
      return await detectWithClaude(apiKey.trim(), dataUrl)
    } catch {
      // Continue to rough local fallback.
    }
  }

  return detectFromMock(dataUrl.slice(-64))
}

export function slotForNow(d = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = d.getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}
