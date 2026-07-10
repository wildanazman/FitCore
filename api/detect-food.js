// Accurate food-photo analysis. Priority: correctness over speed.
//
// Primary: Claude Opus 4.8 (vision + adaptive thinking + web search grounding)
//          via the official Anthropic SDK — uses ANTHROPIC_API_KEY.
// Fallback: Gemini (GEMINI_API_KEY) with Google Search grounding.
//
// Both engines identify each component on the plate, look up real nutrition
// data on the web (MyFCD preferred for Malaysian food), and return an
// itemised JSON estimate.

import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 60 }

const MAX_IMAGE_CHARS = 7_000_000
const GEMINI_MODEL = 'gemini-2.5-flash'
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

// ---------- Claude (primary) ----------

async function detectWithClaude(apiKey, inlineData) {
  const client = new Anthropic({ apiKey, timeout: 55_000, maxRetries: 2 })

  let messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: inlineData.mimeType, data: inlineData.data },
        },
        { type: 'text', text: prompt },
      ],
    },
  ]

  let response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
    messages,
  })

  // Server-side web search can pause the turn; resume until done (bounded).
  let continuations = 0
  while (response.stop_reason === 'pause_turn' && continuations < 4) {
    messages = [...messages, { role: 'assistant', content: response.content }]
    response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
      messages,
    })
    continuations++
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to analyse this image')
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
  if (!text) throw new Error(`Claude returned no text (${response.stop_reason})`)
  return normalizeDetection(parseJsonObject(text), 'claude')
}

// ---------- Gemini (fallback) ----------

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

async function detectWithGemini(apiKey, inlineData) {
  const model = process.env.GEMINI_MODEL || GEMINI_MODEL
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
      return normalizeDetection(parseJsonObject(text), 'gemini')
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

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!anthropicKey && !geminiKey) {
    return sendJson(res, 503, { error: 'No AI key configured (set ANTHROPIC_API_KEY or GEMINI_API_KEY)' })
  }
  if (provider === 'anthropic' && !anthropicKey) {
    return sendJson(res, 400, { error: 'Anthropic mode needs ANTHROPIC_API_KEY or an Anthropic API key in Settings.' })
  }
  if (provider === 'gemini' && !geminiKey) {
    return sendJson(res, 400, { error: 'Gemini mode needs GEMINI_API_KEY.' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' })
  }

  const { image, provider = 'auto' } = body
  if (typeof image !== 'string') return sendJson(res, 400, { error: 'Expected an image data URL' })
  if (image.length > MAX_IMAGE_CHARS) return sendJson(res, 413, { error: 'Image is too large' })

  const inlineData = dataUrlToInlineData(image)
  if (!inlineData) return sendJson(res, 400, { error: 'Expected a jpeg, png, or webp data URL' })

  const errors = []

  if (provider !== 'gemini' && anthropicKey) {
    try {
      return sendJson(res, 200, await detectWithClaude(anthropicKey, inlineData))
    } catch (err) {
      errors.push(`Claude: ${err?.message || 'failed'}`)
    }
  }

  if (provider !== 'anthropic' && geminiKey) {
    try {
      return sendJson(res, 200, await detectWithGemini(geminiKey, inlineData))
    } catch (err) {
      errors.push(`Gemini: ${err?.message || 'failed'}`)
    }
  }

  return sendJson(res, 502, { error: errors.join(' | ') || 'Food AI failed' })
}
