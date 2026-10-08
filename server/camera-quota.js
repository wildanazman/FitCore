import { verifyGoogleIdentity } from './google-auth.js'

export const CAMERA_DAILY_LIMIT = 4
export function cameraDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
const reserveScript = `local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if n>=tonumber(ARGV[1]) then return -1 end; n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],172800) end; return n`
export async function reserveCameraScan(req) {
  const credential = req.headers?.authorization || ''
  if (!credential.startsWith('Bearer ')) throw Object.assign(new Error('Sign in with Google in Settings to use AI camera.'), { status: 401 })
  let user
  try { user = await verifyGoogleIdentity(credential.slice(7)) }
  catch { throw Object.assign(new Error('Your Google sign-in expired. Sign in again in Settings.'), { status: 401 }) }
  if (user.isAdmin) return { unlimited: true, remaining: null }
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) throw Object.assign(new Error('Camera quota is temporarily unavailable. Please try later.'), { status: 503 })
  let used
  try {
    const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(['EVAL', reserveScript, '1', `fitcore:camera:${cameraDay()}:${user.id}`, String(CAMERA_DAILY_LIMIT)]), signal: AbortSignal.timeout(5000) })
    const result = await response.json()
    if (!response.ok || result.error || !Number.isInteger(result.result)) throw new Error('Quota storage failed')
    used = result.result
  } catch { throw Object.assign(new Error('Camera quota is temporarily unavailable. No AI request was sent.'), { status: 503 }) }
  if (used < 0) throw Object.assign(new Error('You have used all 4 AI camera scans today. Resets at midnight Malaysia time. Food search and manual logging are still available.'), { status: 429 })
  return { unlimited: false, remaining: CAMERA_DAILY_LIMIT - used }
}
