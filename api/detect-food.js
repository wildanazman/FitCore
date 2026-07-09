const MAX_IMAGE_CHARS = 7_000_000
// gemini-2.0-flash: fast, vision-capable, and — unlike 2.5 "thinking" models —
// spends no output budget on internal reasoning, so JSON responses never get
// starved/truncated. Overridable via GEMINI_MODEL.
const DEFAULT_MODEL = 'gemini-2.0-flash'
const REQUEST_TIMEOUT_MS = 25_000
const MAX_ATTEMPTS = 3
const RETRY_STATUS = new Set([429, 500, 502, 503, 504])

const responseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    emoji: { type: 'string' },
    kcal: { type: 'number' },
    protein: { type: 'number' },
    carbs: { type: 'number' },
    fat: { type: 'number' },
    confidence: { type: 'number' },
  },
  required: ['name', 'emoji', 'kcal', 'protein', 'carbs', 'fat', 'confidence'],
}

const prompt = [
  'You are a careful nutrition vision model for a personal calorie tracker.',
  'Identify the visible meal and estimate calories and macros (grams) for the exact portion shown.',
  'Judge portion size from plate/bowl/utensil scale; use realistic restaurant/home servings.',
  'Prefer common South-East Asian and Malaysian foods when plausible.',
  'If several items are on the plate, name a concise combined dish and estimate the whole plate.',
  'kcal must be roughly consistent with protein*4 + carbs*4 + fat*9.',
  'Set confidence 0..1 to reflect how clearly the food and portion are visible.',
  'Do not invent hidden ingredients. Return JSON only, matching the schema exactly.',
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

function parseGeminiText(json) {
  const cand = json.candidates?.[0]
  const text = cand?.content?.parts?.find((part) => typeof part.text === 'string')?.text ?? ''
  return { text, finishReason: cand?.finishReason, promptFeedback: json.promptFeedback }
}

function normalizeDetection(value) {
  return {
    name: String(value.name || 'Detected meal').slice(0, 80),
    emoji: String(value.emoji || '🍽️').slice(0, 8),
    kcal: Math.max(0, Math.round(Number(value.kcal) || 0)),
    protein: Math.max(0, Math.round(Number(value.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(value.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(value.fat) || 0)),
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0.65)),
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
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.2,
      maxOutputTokens: 1200,
      // Disable "thinking" so 2.5-family models can't starve the JSON output.
      // Ignored by models that don't support it.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  let lastError = 'Food AI failed'
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let result
    try {
      result = await callGemini(endpoint, payload)
    } catch (err) {
      lastError = err?.name === 'AbortError' ? 'Gemini request timed out' : 'Could not reach Gemini'
      if (attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt)
        continue
      }
      return sendJson(res, 504, { error: lastError })
    }

    if (!result.ok) {
      lastError = result.json?.error?.message || `Gemini API ${result.status}`
      if (RETRY_STATUS.has(result.status) && attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt)
        continue
      }
      return sendJson(res, result.status, { error: lastError })
    }

    const { text, finishReason, promptFeedback } = parseGeminiText(result.json)
    if (promptFeedback?.blockReason) {
      return sendJson(res, 422, { error: `Image blocked by safety filter (${promptFeedback.blockReason})` })
    }
    if (!text) {
      // Empty output (e.g. MAX_TOKENS from thinking, or a hiccup) — worth a retry.
      lastError = `Gemini returned no text${finishReason ? ` (${finishReason})` : ''}`
      if (attempt < MAX_ATTEMPTS) {
        await sleep(300 * attempt)
        continue
      }
      return sendJson(res, 502, { error: lastError })
    }

    try {
      return sendJson(res, 200, normalizeDetection(JSON.parse(text)))
    } catch {
      lastError = 'Gemini returned an unreadable nutrition estimate'
      if (attempt < MAX_ATTEMPTS) {
        await sleep(300 * attempt)
        continue
      }
      return sendJson(res, 502, { error: lastError })
    }
  }

  return sendJson(res, 502, { error: lastError })
}
