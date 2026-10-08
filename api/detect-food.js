// Accurate food-photo analysis. Priority: correctness over speed.
//
// Photo scans use Gemini only, with a validated user-selected model.
//
// Gemini identifies each component on the plate and requests nutrition
// data on the web (MyFCD preferred for Malaysian food), and return an
// itemised JSON estimate.

import { isGeminiModel, DEFAULT_GEMINI_MODEL } from '../shared/geminiModels.js'

export const config = { maxDuration: 60 }

const MAX_IMAGE_CHARS = 7_000_000
const GEMINI_TIMEOUT_MS = 55_000
const GEMINI_ATTEMPTS = 2
const RETRY_STATUS = new Set([429, 500, 502, 503, 504])

const prompt = [
  'You are a meticulous nutritionist analysing a food photo for a personal calorie tracker.',
  'Accuracy matters more than speed. Work step by step:',
  '1. Identify every distinct food and drink component visible in the image.',
  '2. Estimate each component’s portion using plate, bowl, utensil and hand scale (grams or common units).',
  '3. Use web search to find reliable calories and macros for each component. Prefer the Malaysian Food Composition Database (MyFCD, myfcd.moh.gov.my) and reputable nutrition databases, especially for Malaysian / South-East Asian dishes.',
  '4. Sum the components into a total for the whole serving shown.',
  'Return ONLY a raw JSON object, no markdown fences and no prose, with exactly these keys:',
  '{"name": string, "emoji": string, "items": [{"name": string, "portion": string, "grams": number, "kcal": number, "protein": number, "carbs": number, "fat": number}], "kcal": number, "protein": number, "carbs": number, "fat": number, "confidence": number, "assumptions": string}',
  'Separate each visible food, sauce and estimated cooking oil. Include per-component macros and common portion descriptions. Meal totals must equal the sum of components. Unknown ingredients and oil amounts are assumptions, not measurements.',
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

function parseJsonObject(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('no json object')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function normalizeDetection(value, source) {
  const items = Array.isArray(value.items)
    ? value.items.slice(0, 12).map((it) => ({
        name: String(it?.name || 'item').slice(0, 60),
        grams: Math.max(0, Math.round(Number(it?.grams) || 0)),
        portion: typeof it?.portion === 'string' ? it.portion : undefined,
        protein: typeof it?.protein === 'number' && Number.isFinite(it.protein) ? Math.max(0, it.protein) : undefined,
        carbs: typeof it?.carbs === 'number' && Number.isFinite(it.carbs) ? Math.max(0, it.carbs) : undefined,
        fat: typeof it?.fat === 'number' && Number.isFinite(it.fat) ? Math.max(0, it.fat) : undefined,
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
    source,
  }
}


// ---------- Gemini ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function callGemini(endpoint, payload) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
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

async function detectWithGemini(apiKey, inlineData, model) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt.replace('web search', 'Google Search') }, { inlineData }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.15, maxOutputTokens: 4096 },
  }

  let lastError = 'Gemini failed'
  for (let attempt = 1; attempt <= GEMINI_ATTEMPTS; attempt++) {
    let result
    try {
      result = await callGemini(endpoint, payload)
    } catch (err) {
      lastError = err?.name === 'AbortError' ? 'Gemini timed out' : 'Could not reach Gemini'
      if (attempt < GEMINI_ATTEMPTS) {
        await sleep(500 * attempt)
        continue
      }
      throw new Error(lastError)
    }

    if (!result.ok) {
      lastError = result.json?.error?.message || `Gemini API ${result.status}`
      if (RETRY_STATUS.has(result.status) && attempt < GEMINI_ATTEMPTS) {
        await sleep(500 * attempt)
        continue
      }
      throw new Error(lastError)
    }

    const cand = result.json.candidates?.[0]
    if (result.json.promptFeedback?.blockReason) {
      throw new Error(`Image blocked by safety filter (${result.json.promptFeedback.blockReason})`)
    }
    const text = (cand?.content?.parts ?? [])
      .filter((p) => typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
    if (!text) {
      lastError = `Gemini returned no text${cand?.finishReason ? ` (${cand.finishReason})` : ''}`
      if (attempt < GEMINI_ATTEMPTS) {
        await sleep(400 * attempt)
        continue
      }
      throw new Error(lastError)
    }
    try {
      const usage = result.json.usageMetadata || {}
      return { ...normalizeDetection(parseJsonObject(text), 'gemini'), model: result.json.modelVersion || model, requestedModel: model,
        usage: { inputTokens: Number(usage.promptTokenCount) || 0, outputTokens: Number(usage.candidatesTokenCount) || 0, thinkingTokens: Number(usage.thoughtsTokenCount) || 0 } }
    } catch {
      lastError = 'Gemini returned an unreadable nutrition estimate'
      if (attempt < GEMINI_ATTEMPTS) {
        await sleep(400 * attempt)
        continue
      }
      throw new Error(lastError)
    }
  }
  throw new Error(lastError)
}

// ---------- Handler ----------

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) return sendJson(res, 400, { error: 'Expected a JSON object' })
  const { image } = body
  if (body.provider === 'anthropic') return sendJson(res, 400, { error: 'Photo scans now use Gemini. Refresh FitCore and choose a Gemini model.' })
  if (body.model !== undefined && !isGeminiModel(body.model)) return sendJson(res, 400, { error: 'Unsupported Gemini model. Choose a model in Settings.' })
  const model = body.model || (isGeminiModel(process.env.GEMINI_MODEL) ? process.env.GEMINI_MODEL : DEFAULT_GEMINI_MODEL)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!geminiKey) return sendJson(res, 503, { error: 'Photo analysis needs GEMINI_API_KEY configured on the server.' })
  if (typeof image !== 'string') return sendJson(res, 400, { error: 'Expected an image data URL' })
  if (image.length > MAX_IMAGE_CHARS) return sendJson(res, 413, { error: 'Image is too large' })

  const inlineData = dataUrlToInlineData(image)
  if (!inlineData) return sendJson(res, 400, { error: 'Expected a jpeg, png, or webp data URL' })

  try {
    return sendJson(res, 200, await detectWithGemini(geminiKey, inlineData, model))
  } catch (err) {
    return sendJson(res, 502, { error: `Gemini: ${err?.message || 'Photo analysis failed'}. Try another model in Settings or search the food list.` })
  }
}
