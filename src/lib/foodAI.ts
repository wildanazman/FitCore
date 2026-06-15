// Photo calorie detection (PRD 3.2).
// Real path: Anthropic Claude vision (claude-sonnet-4-6) when an API key is configured.
// Fallback: deterministic on-device estimator over a South-East-Asian food set so the
// confirm/edit flow is fully functional offline.

export interface Detection {
  name: string
  emoji: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  confidence: number
}

// Local SEA / Malaysian food reference (per standard serving).
const FOOD_DB: Detection[] = [
  { name: 'Nasi Lemak', emoji: '🍚', kcal: 644, protein: 17, carbs: 80, fat: 28, confidence: 0.82 },
  { name: 'Mee Goreng', emoji: '🍜', kcal: 577, protein: 18, carbs: 76, fat: 21, confidence: 0.8 },
  { name: 'Roti Canai', emoji: '🫓', kcal: 301, protein: 7, carbs: 41, fat: 12, confidence: 0.86 },
  { name: 'Char Kway Teow', emoji: '🍳', kcal: 742, protein: 23, carbs: 76, fat: 38, confidence: 0.78 },
  { name: 'Chicken Rice', emoji: '🍗', kcal: 607, protein: 30, carbs: 75, fat: 20, confidence: 0.84 },
  { name: 'Grilled Salmon Bowl', emoji: '🐟', kcal: 640, protein: 42, carbs: 58, fat: 24, confidence: 0.91 },
  { name: 'Protein Oats & Eggs', emoji: '🥣', kcal: 540, protein: 38, carbs: 52, fat: 18, confidence: 0.88 },
  { name: 'Laksa', emoji: '🍲', kcal: 520, protein: 21, carbs: 55, fat: 24, confidence: 0.79 },
  { name: 'Satay (6 sticks)', emoji: '🍢', kcal: 360, protein: 34, carbs: 12, fat: 20, confidence: 0.83 },
  { name: 'Caesar Salad w/ Chicken', emoji: '🥗', kcal: 420, protein: 32, carbs: 12, fat: 26, confidence: 0.87 },
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
  // Simulate model latency (PRD target < 3s).
  await new Promise((r) => setTimeout(r, 1100))
  return FOOD_DB[hashIndex(seed, FOOD_DB.length)]
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
      model: 'claude-sonnet-4-6',
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
  const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  return {
    name: String(parsed.name ?? 'Detected meal'),
    emoji: String(parsed.emoji ?? '🍽️'),
    kcal: Math.round(Number(parsed.kcal) || 0),
    protein: Math.round(Number(parsed.protein) || 0),
    carbs: Math.round(Number(parsed.carbs) || 0),
    fat: Math.round(Number(parsed.fat) || 0),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7)),
  }
}

/** Top-level detect: tries Claude when a key exists, falls back to local estimator. */
export async function detectFood(dataUrl: string, apiKey: string): Promise<Detection> {
  if (apiKey.trim()) {
    try {
      return await detectWithClaude(apiKey.trim(), dataUrl)
    } catch {
      // Network/key failure → graceful local fallback.
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
