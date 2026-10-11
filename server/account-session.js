import { randomBytes, createHash } from 'node:crypto'
import { verifyGoogleIdentity } from './google-auth.js'

const COOKIE = '__Host-fitcore_session'
const LIFETIME = 30 * 24 * 60 * 60
export async function sessionCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) throw Object.assign(new Error('Account connection is temporarily unavailable.'), { status: 503 })
  try {
    const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000) })
    const value = await response.json()
    if (!response.ok || value.error) throw new Error('Storage unavailable')
    return value.result
  } catch { throw Object.assign(new Error('Account connection is temporarily unavailable. Try again.'), { status: 503 }) }
}
function sessionId(req) {
  const value = (req.headers?.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null
}
function key(id) { return `fitcore:session:${createHash('sha256').update(id).digest('hex')}` }
function cookie(res, id, age) { res.setHeader('set-cookie', `${COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`) }
export async function readSession(req) {
  const id = sessionId(req)
  if (!id) return null
  const value = await sessionCommand(['GET', key(id)])
  if (!value) return null
  let user
  try { user = JSON.parse(value) } catch { return null }
  if (!user.id || !user.email || !Number.isFinite(user.expiresAt) || user.expiresAt <= Date.now()) return null
  // Resolve permissions on every request, so removing an admin takes effect immediately.
  const admins = (process.env.GOOGLE_ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase())
  return { ...user, isAdmin: Boolean(user.googleHosted && admins.includes(user.email.toLowerCase())) }
}
export async function createSession(req, res, user) {
  const id = randomBytes(32).toString('hex')
  const account = { ...user, expiresAt: Date.now() + LIFETIME * 1000 }
  await sessionCommand(['SET', key(id), JSON.stringify(account), 'EX', String(LIFETIME)])
  const previous = sessionId(req)
  if (previous) await sessionCommand(['DEL', key(previous)])
  cookie(res, id, LIFETIME)
  return account
}
export async function deleteSession(req, res) {
  const id = sessionId(req)
  if (id) await sessionCommand(['DEL', key(id)])
  cookie(res, '', 0)
}
export async function accountIdentity(req) {
  const session = await readSession(req)
  if (session) return session
  const authorization = req.headers?.authorization || ''
  if (!authorization.startsWith('Bearer ')) throw Object.assign(new Error('Sign in with Google in Settings to use AI camera.'), { status: 401 })
  try { return await verifyGoogleIdentity(authorization.slice(7)) }
  catch { throw Object.assign(new Error('Please sign in again in Settings.'), { status: 401 }) }
}
