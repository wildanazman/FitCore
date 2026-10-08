import assert from 'node:assert/strict'
import handler from '../api/detect-food.js'
import { GEMINI_MODELS, geminiModelOrDefault } from '../shared/geminiModels.js'
const originalFetch = globalThis.fetch
const originalKey = process.env.GEMINI_API_KEY
const originalModel = process.env.GEMINI_MODEL
let calls = []
let payloads = []
process.env.GEMINI_API_KEY = 'test-only-not-a-real-key'
globalThis.fetch = async (url, options) => {
  calls.push(url)
  payloads.push(JSON.parse(options.body))
  return { ok: true, status: 200, json: async () => ({ modelVersion: 'resolved-version', usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 300, thoughtsTokenCount: 700 }, candidates: [{ content: { parts: [{ text: '{"name":"Test meal","kcal":200,"protein":10,"carbs":30,"fat":4,"confidence":0.6,"items":[]}' }] } }] }) }
}
async function request(body) {
  const res = { statusCode: 0, setHeader() {}, end(value) { this.body = JSON.parse(value) } }
  await handler({ method: 'POST', body }, res)
  return res
}
try {
  const image = 'data:image/png;base64,dGVzdA=='
  for (const option of GEMINI_MODELS) {
    const res = await request({ image, model: option.id })
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.requestedModel, option.id)
    assert.equal(res.body.model, 'resolved-version')
    assert.deepEqual(res.body.usage, { inputTokens: 2000, outputTokens: 300, thinkingTokens: 700 })
    assert.ok(calls.at(-1).includes(`/models/${option.id}:generateContent`))
    const config = payloads.at(-1).generationConfig
    assert.equal(config.maxOutputTokens, option.id === 'gemini-2.5-flash' ? 8192 : 4096)
    assert.deepEqual(config.thinkingConfig, option.id === 'gemini-2.5-flash' ? { thinkingBudget: 1024 } : undefined)
  }
  const before = calls.length
  assert.equal((await request({ image, model: 'unknown' })).statusCode, 400)
  assert.equal((await request({ image, provider: 'anthropic' })).statusCode, 400)
  assert.equal((await request('null')).statusCode, 400)
  assert.equal(calls.length, before)
  process.env.GEMINI_MODEL = 'gemini-3.8-flash'
  assert.equal((await request({ image })).body.requestedModel, 'gemini-3.8-flash')
  assert.equal((await request({ image, model: 'gemini-2.5-flash' })).body.requestedModel, 'gemini-2.5-flash')
  assert.equal(geminiModelOrDefault(undefined), 'gemini-2.5-flash')
  assert.equal(geminiModelOrDefault('unknown'), 'gemini-2.5-flash')
  let truncatedCalls = 0
  globalThis.fetch = async () => {
    truncatedCalls++
    return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"name":' }] } }] }) }
  }
  const truncated = await request({ image, model: 'gemini-2.5-flash' })
  assert.equal(truncated.statusCode, 502)
  assert.match(truncated.body.error, /cut short/)
  assert.equal(truncatedCalls, 1, 'Do not charge an identical retry for truncated output')
  console.log('Passed model selection, allowlist, defaults, token metadata and Claude rejection. Mock responses only; no paid calls.')
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey
  if (originalModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = originalModel
}
