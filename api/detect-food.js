const MAX_IMAGE_CHARS = 7_000_000
const DEFAULT_MODEL = 'gemini-2.5-flash'

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
  'Identify the visible meal and estimate calories/macros for the portion shown.',
  'Prefer common South-East Asian and Malaysian foods when plausible.',
  'If there are multiple items, name the meal as a concise combination and estimate the full plate.',
  'Do not invent hidden ingredients. Use realistic restaurant/home serving sizes.',
  'Return JSON only, matching the schema exactly.',
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
  return json.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text ?? ''
}

function normalizeDetection(value) {
  return {
    name: String(value.name || 'Detected meal').slice(0, 80),
    emoji: String(value.emoji || '\uD83C\uDF7D\uFE0F').slice(0, 8),
    kcal: Math.max(0, Math.round(Number(value.kcal) || 0)),
    protein: Math.max(0, Math.round(Number(value.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(value.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(value.fat) || 0)),
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0.65)),
    source: 'gemini',
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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.2,
        maxOutputTokens: 500,
      },
    }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = json.error?.message || `Gemini API ${response.status}`
    return sendJson(res, response.status, { error: message })
  }

  try {
    const text = parseGeminiText(json)
    return sendJson(res, 200, normalizeDetection(JSON.parse(text)))
  } catch {
    return sendJson(res, 502, { error: 'Gemini returned an unreadable nutrition estimate' })
  }
}
