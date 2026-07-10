// Text-based nutrition lookup for a food the user typed by name.
// Free-first chain:
//   1. Open Food Facts (free, no key, unlimited) — best for packaged brands.
//   2. AI text search with web grounding (Claude primary, Gemini fallback) —
//      best for cooked dishes; prefers MyFCD for Malaysian food.
// Accuracy over speed: this can take a few seconds.

import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 60 }

const AI_TIMEOUT_MS = 50_000

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function normalize(value, source, fallbackName) {
  return {
    name: String(value.name || fallbackName || 'Food').slice(0, 90),
    emoji: String(value.emoji || '🍽️').slice(0, 8),
    serving: String(value.serving || '1 serving').slice(0, 40),
    kcal: Math.round(num(value.kcal)),
    protein: Math.round(num(value.protein)),
    carbs: Math.round(num(value.carbs)),
    fat: Math.round(num(value.fat)),
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0.6)),
    note: value.note ? String(value.note).slice(0, 200) : undefined,
    source,
  }
}

function parseJsonObject(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('no json object')
  return JSON.parse(cleaned.slice(start, end + 1))
}

const withTimeout = (ms) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  return { signal: c.signal, done: () => clearTimeout(t) }
}

// ---------- 1. Open Food Facts ----------

async function lookupOpenFoodFacts(name) {
  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?' +
    `search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5` +
    '&fields=product_name,brands,nutriments,serving_size,serving_quantity'
  const t = withTimeout(9000)
  let json
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'FitCore/1.0 (personal calorie tracker)' }, signal: t.signal })
    if (!res.ok) return null
    json = await res.json()
  } catch {
    return null
  } finally {
    t.done()
  }

  const products = Array.isArray(json?.products) ? json.products : []
  for (const p of products) {
    const n = p.nutriments || {}
    // Prefer per-serving values; fall back to per-100g.
    const perServing = n['energy-kcal_serving'] != null
    const kcal = perServing ? n['energy-kcal_serving'] : n['energy-kcal_100g']
    if (kcal == null) continue
    const protein = perServing ? n.proteins_serving : n.proteins_100g
    const carbs = perServing ? n.carbohydrates_serving : n.carbohydrates_100g
    const fat = perServing ? n.fat_serving : n.fat_100g
    const label = [p.brands?.split(',')[0]?.trim(), p.product_name].filter(Boolean).join(' ').trim()
    const serving = perServing ? (p.serving_size || `${p.serving_quantity || ''} serving`).trim() : '100 g'
    return normalize(
      { name: label || name, serving: serving || '1 serving', kcal, protein, carbs, fat, confidence: 0.8 },
      'openfoodfacts',
      name,
    )
  }
  return null
}

// ---------- 2. AI text lookup ----------

function aiPrompt(name) {
  return [
    `Estimate the calories and macros for one typical single serving of the food named "${name}".`,
    'It is likely a Malaysian or South-East Asian dish, drink, or packaged product.',
    'Search the web for reliable nutrition data — prefer the Malaysian Food Composition Database (MyFCD, myfcd.moh.gov.my), the product\'s own label, and reputable nutrition databases.',
    'Return ONLY a raw JSON object, no markdown and no prose:',
    '{"name": string, "emoji": string, "serving": string, "kcal": number, "protein": number, "carbs": number, "fat": number, "confidence": number, "note": string}',
    'kcal should be roughly protein*4 + carbs*4 + fat*9. serving describes the portion (e.g. "1 plate", "1 pack", "1 glass"). If unsure, lower confidence and say so in note.',
  ].join(' ')
}

async function lookupWithClaude(apiKey, name) {
  const client = new Anthropic({ apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 1 })
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }]
  let messages = [{ role: 'user', content: aiPrompt(name) }]
  let response = await client.messages.create({ model: 'claude-opus-4-8', max_tokens: 8000, thinking: { type: 'adaptive' }, tools, messages })
  let guard = 0
  while (response.stop_reason === 'pause_turn' && guard < 4) {
    messages = [...messages, { role: 'assistant', content: response.content }]
    response = await client.messages.create({ model: 'claude-opus-4-8', max_tokens: 8000, thinking: { type: 'adaptive' }, tools, messages })
    guard++
  }
  if (response.stop_reason === 'refusal') throw new Error('Claude declined')
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  if (!text) throw new Error(`Claude returned no text (${response.stop_reason})`)
  return normalize(parseJsonObject(text), 'claude', name)
}

async function lookupWithGemini(apiKey, name) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const t = withTimeout(AI_TIMEOUT_MS)
  let json
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: t.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: aiPrompt(name).replace('Search the web', 'Use Google Search') }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 2048 },
      }),
    })
    json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error?.message || `Gemini API ${res.status}`)
  } finally {
    t.done()
  }
  const text = (json.candidates?.[0]?.content?.parts ?? []).filter((p) => typeof p.text === 'string').map((p) => p.text).join('')
  if (!text) throw new Error('Gemini returned no text')
  return normalize(parseJsonObject(text), 'gemini', name)
}

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

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 80) return sendJson(res, 400, { error: 'Expected a food name' })

  const errors = []

  // 1. Free packaged-product database.
  try {
    const off = await lookupOpenFoodFacts(name)
    if (off && off.kcal > 0) return sendJson(res, 200, off)
  } catch (err) {
    errors.push(`OpenFoodFacts: ${err?.message || 'failed'}`)
  }

  // 2. AI web-grounded estimate.
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (anthropicKey) {
    try {
      return sendJson(res, 200, await lookupWithClaude(anthropicKey, name))
    } catch (err) {
      errors.push(`Claude: ${err?.message || 'failed'}`)
    }
  }
  if (geminiKey) {
    try {
      return sendJson(res, 200, await lookupWithGemini(geminiKey, name))
    } catch (err) {
      errors.push(`Gemini: ${err?.message || 'failed'}`)
    }
  }

  return sendJson(res, 404, { error: errors.join(' | ') || 'No nutrition data found for that name' })
}
