export const CLOUD_LIMIT = 3 * 1024 * 1024
const fail = (message, status = 400) => Object.assign(new Error(message), { status })
export function cloudOwner(user) {
  if (!user || !/^[0-9]+$/.test(user.id)) throw fail('Sign in with Google to use cloud backup.', 401)
  return `google:${user.id}`
}
export function validateCloudBackup(input) {
  const raw = typeof input === 'string' ? input : JSON.stringify(input)
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > CLOUD_LIMIT) throw fail('Cloud backup limit is 3 MB. Leave photos out, or export a file instead.', 413)
  let body
  try { body = JSON.parse(raw) } catch { throw fail('Cannot read this backup.') }
  const b = body?.backup
  if (!Number.isSafeInteger(body?.expectedVersion) || body.expectedVersion < 0 || b?.format !== 'fitcore-backup' || b.version !== 1 || !b.state?.profile?.onboarded || !['foods','weights','sessions','photos','dietTasks'].every(key => Array.isArray(b.state[key]))) throw fail('This is not a valid FitCore backup.')
  function check(value, depth = 0) {
    if (depth > 28) throw fail('Backup is too complex.')
    if (typeof value === 'number' && !Number.isFinite(value)) throw fail('Invalid number in backup.')
    if (Array.isArray(value)) { if (value.length > 100000) throw fail('Too many backup records.'); value.forEach(v => check(v, depth + 1)) }
    else if (value && typeof value === 'object') for (const [key,v] of Object.entries(value)) {
      if (['__proto__','prototype','constructor'].includes(key)) throw fail('Invalid backup field.')
      if (/(api.?key|secret|password|authorization|access.?token|refresh.?token)/i.test(key) && v) throw fail('Remove credentials before uploading a backup.')
      check(v, depth + 1)
    }
  }
  check(b)
  return { backup:b, expectedVersion:body.expectedVersion, bytes:Buffer.byteLength(JSON.stringify(b)) }
}
export function cloudConfig() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) throw fail('Cloud backup configuration is unavailable.', 503)
  return { url:url.replace(/\/$/,''), key }
}
export async function cloudRequest(path, {method='GET', body} = {}) {
  const config=cloudConfig()
  if (!config) throw fail('Cloud backup is not connected yet. File export still works.', 503)
  const response=await fetch(`${config.url}/rest/v1/${path}`, {method, headers:{apikey:config.key,'content-type':'application/json'}, body:body ? JSON.stringify(body) : undefined, signal:AbortSignal.timeout(10000)})
  const data=await response.json()
  if (!response.ok) {
    if (data?.code === 'P0001') throw fail('Cloud backup changed on another device. Refresh and review before replacing it.', 409)
    throw fail('Cloud backup could not be reached. Your local data has not changed.', 503)
  }
  return data
}
