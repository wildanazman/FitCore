import assert from 'node:assert/strict'
import { generateKeyPairSync, createSign } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'

const originalCerts = OAuth2Client.prototype.getFederatedSignonCertsAsync
const originalClient = process.env.GOOGLE_LOGIN_CLIENT_ID
const originalAdmins = process.env.GOOGLE_ADMIN_EMAILS
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const clientId = 'test-fitcore.apps.googleusercontent.com'
process.env.GOOGLE_LOGIN_CLIENT_ID = clientId
process.env.GOOGLE_ADMIN_EMAILS = 'owner@gmail.com'
OAuth2Client.prototype.getFederatedSignonCertsAsync = async () => ({ certs: { fixture: publicKey.export({ type: 'spki', format: 'pem' }) } })
const { default: handler } = await import('../api/account.js')
const { reserveCameraScan, cameraDay } = await import('../server/camera-quota.js')
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const now = Math.floor(Date.now() / 1000)
function token(patch = {}) {
  const header = encode({ alg: 'RS256', kid: 'fixture' })
  const payload = encode({ sub: 'fixture-user', email: 'owner@gmail.com', email_verified: true, name: 'Fixture Owner', iss: 'https://accounts.google.com', aud: clientId, iat: now, exp: now + 3600, ...patch })
  const signed = `${header}.${payload}`
  return `${signed}.${createSign('RSA-SHA256').update(signed).sign(privateKey).toString('base64url')}`
}
async function request(method, credential, origin = 'https://fit-core-five.vercel.app') {
  const res = { setHeader() {}, end(value) { this.body = JSON.parse(value) } }
  await handler({ method, headers: { origin, ...(credential ? { authorization: `Bearer ${credential}` } : {}) } }, res)
  return res
}
try {
  assert.equal((await request('GET')).body.clientId, clientId)
  const account = await request('POST', token())
  assert.equal(account.statusCode, 200)
  assert.equal(account.body.user.isAdmin, true)
  assert.equal((await request('POST', token({ email: 'someone@gmail.com' }))).body.user.isAdmin, false)
  assert.equal((await request('POST', token({ email_verified: false }))).statusCode, 401)
  assert.equal((await request('POST', token({ aud: 'wrong-audience' }))).statusCode, 401)
  assert.equal((await request('POST', token({ iss: 'https://evil.example' }))).statusCode, 401)
  assert.equal((await request('POST', token({ exp: now - 3600 }))).statusCode, 401)
  assert.equal((await request('POST', token() + 'tampered')).statusCode, 401)
  assert.equal((await request('POST')).statusCode, 401)
  assert.equal(cameraDay(new Date('2026-10-08T16:00:00Z')), '2026-10-09')
  const scanRequest = credential => ({ headers: { authorization: `Bearer ${credential}` } })
  assert.equal((await reserveCameraScan(scanRequest(token()))).unlimited, true)
  await assert.rejects(reserveCameraScan({ headers: {} }), error => error.status === 401)
  await assert.rejects(reserveCameraScan(scanRequest(token({ email: 'someone@gmail.com' }))), error => error.status === 503)
  const originalFetch = globalThis.fetch
  const oldUrl = process.env.KV_REST_API_URL
  const oldToken = process.env.KV_REST_API_TOKEN
  process.env.KV_REST_API_URL = 'https://quota.fixture'
  process.env.KV_REST_API_TOKEN = 'fixture'
  let count = 0
  globalThis.fetch = async (_url, options) => {
    const command = JSON.parse(options.body)
    assert.equal(command[0], 'EVAL')
    assert.match(command[3], /fitcore:camera:/)
    return { ok: true, json: async () => ({ result: count >= 4 ? -1 : ++count }) }
  }
  try {
    const scans = await Promise.all(Array.from({ length: 8 }, () => reserveCameraScan(scanRequest(token({ email: 'someone@gmail.com' }))).then(value => value, error => ({ status: error.status }))))
    assert.equal(scans.filter(result => result.status === 429).length, 4)
    assert.equal(count, 4)
    globalThis.fetch = async () => { throw new Error('offline') }
    await assert.rejects(reserveCameraScan(scanRequest(token({ email: 'someone@gmail.com' }))), error => error.status === 503)
  } finally {
    globalThis.fetch = originalFetch
    if (oldUrl === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = oldUrl
    if (oldToken === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = oldToken
  }
  assert.equal((await request('POST', token(), 'https://evil.example')).statusCode, 403)
  delete process.env.GOOGLE_LOGIN_CLIENT_ID
  assert.equal((await request('POST', token())).statusCode, 503)
  console.log('Passed signed identity, admin allowlist, signature, audience, issuer, expiry, origin and missing-config checks. Local fixtures only; no Google calls.')
} finally {
  OAuth2Client.prototype.getFederatedSignonCertsAsync = originalCerts
  if (originalClient === undefined) delete process.env.GOOGLE_LOGIN_CLIENT_ID; else process.env.GOOGLE_LOGIN_CLIENT_ID = originalClient
  if (originalAdmins === undefined) delete process.env.GOOGLE_ADMIN_EMAILS; else process.env.GOOGLE_ADMIN_EMAILS = originalAdmins
}
