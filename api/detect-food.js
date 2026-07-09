// Accurate food-photo analysis. Prioritises correctness over speed:
//  - gemini-2.5-flash with reasoning ("thinking") enabled
//  - Google Search grounding so it looks up real nutrition data (MyFCD etc.)
//  - component-by-component breakdown, then summed
// Note: Gemini can't combine tool use (google_search) with responseSchema/JSON
// mode, so we require strict JSON in the prompt and parse it leniently.

export const config = { maxDuration: 60 }

const MAX_IMAGE_CHARS = 7_000_000
const DEFAULT_MODEL = 'gemini-2.5-flash'
const REQUEST_TIMEOUT_MS = 55_000
const MAX_ATTEMPTS = 3
const RETRY_STATUS = new Set([429, 500, 502, 503, 504])

const prompt = [
  'You are a meticulous nutritionist analysing a food photo for a personal calorie tracker.',
  'Accuracy matters more than speed. Work step by step:',
  '1. Identify every distinct food and drink component visible in the image.',
  '2. Estimate each component’s portion using plate, bowl, utensil and hand scale (grams or common units).',
  '3. Use Google Search to find reliable calories and macros for each component. Prefer the Malaysian Food Composition Database (MyFCD, myfcd.moh.gov.my) and reputable nutrition databases, especially for local Malaysian / South-East Asian dishes.',
  '4. Sum the components into a total for the whole serving shown.',
  'Return ONLY a raw JSON object, no markdown fences and no prose, with exactly these keys:',
  '{"name": string, "emoji": string, "items": [{"name": string, "grams": number, "kcal": number}], "kcal": number, "protein": number, "carbs": number, "fat": number, "confidence": number, "assumptions": string}',
  'kcal must be roughly equal to protein*4 + carbs*4 + fat*9. confidence is 0..1 reflecting how sure you are of the food and portion.',
  'If the portion is uncertain, say so in assumptions and lower confidence. Do not invent hidden ingredients.',
].join(' ')

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

function dataUrlToInlineData(image) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/.exec(image)
  if (!match) return null
  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1]
  return { mimeType, data: match[2] }
}

// Join all text parts (search-grounded answers can be split across parts).
function extractText(json) {
  const cand = json.candidates?.[0]
  const parts = cand?.content?.parts ?? []
  const text = parts
    .filter((p) => typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
  return { text, finishReason: cand?.finishReason, promptFeedback: json.promptFeedback }
}

function parseJsonObject(text) {
  // Strip code fences, then take the outermost {...}.
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('no json object')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function normalizeDetection(value) {
  const items = Array.isArray(value.items)
    ? value.items
        .slice(0, 12)
        .map((it) => ({
          name: String(it?.name || 'item').slice(0, 60),
          grams: Math.max(0, Math.round(Number(it?.grams) || 0)),
          kcal: Math.max(0, Math.round(Number(it?.kcal) || 0)),
        }))
    : []
  return {
    name: String(value.name || 'Detected meal').slice(0, 90),
    emoji: String(value.emoji || '🍽️').slice(0, 8),
    items,
    kcal: Math.max(0, Math.round(Number(value.kcal) || 0)),
    protein: Math.max(0, Math.round(Number(value.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(value.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(value.fat) || 0)),
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0.6)),
    assumptions: value.assumptions ? String(value.assumptions).slice(0, 300) : undefined,
    source: 'gemini',
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function callGemini(endpoint, payload) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const json = await response.json().catch(() => ({}))
    return { ok: response.ok, status: response.status, json }
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) return sendJson(res, 503, { error: 'GEMINI_API_KEY is not configured' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' })
  }

  const { image } = body
  if (typeof image !== 'string') return sendJson(res, 400, { error: 'Expected an image data URL' })
  if (image.length > MAX_IMAGE_CHARS) return sendJson(res, 413, { error: 'Image is too large' })

  const inlineData = dataUrlToInlineData(image)
  if (!inlineData) return sendJson(res, 400, { error: 'Expected a jpeg, png, or webp data URL' })

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData }] }],
    // Google Search grounding: the model looks up real nutrition data.
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.15,
      // Generous budget: reasoning + search + JSON output all share this.
      maxOutputTokens: 4096,
    },
  }

  let lastError = 'Food AI failed'
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let result
    try {
      result = await callGemini(endpoint, payload)
    } catch (err) {
      lastError = err?.name === 'AbortError' ? 'Analysis timed out' : 'Could not reach Gemini'
      if (attempt < MAX_ATTEMPTS) {
        await sleep(500 * attempt)
        continue
      }
      return sendJson(res, 504, { error: lastError })
    }

    if (!result.ok) {
      lastError = result.json?.error?.message || `Gemini API ${result.status}`
      if (RETRY_STATUS.has(result.status) && attempt < MAX_ATTEMPTS) {
        await sleep(500 * attempt)
        continue
      }
      return sendJson(res, result.status, { error: lastError })
    }

    const { text, finishReason, promptFeedback } = extractText(result.json)
    if (promptFeedback?.blockReason) {
      return sendJson(res, 422, { error: `Image blocked by safety filter (${promptFeedback.blockReason})` })
    }
    if (!text) {
      lastError = `Gemini returned no text${finishReason ? ` (${finishReason})` : ''}`
      if (attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt)
        continue
      }
      return sendJson(res, 502, { error: lastError })
    }

    try {
      return sendJson(res, 200, normalizeDetection(parseJsonObject(text)))
    } catch {
      lastError = 'Gemini returned an unreadable nutrition estimate'
      if (attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt)
        continue
      }
      return sendJson(res, 502, { error: lastError })
    }
  }

  return sendJson(res, 502, { error: lastError })
}
