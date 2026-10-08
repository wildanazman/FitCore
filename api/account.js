import { verifyGoogleIdentity } from '../server/google-auth.js'

function send(res, status, data) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(data))
}

export default async function handler(req, res) {
  if (req.method === 'GET') return send(res, 200, { clientId: process.env.GOOGLE_LOGIN_CLIENT_ID || null })
  if (req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); return send(res, 405, { error: 'Method not allowed' }) }
  if (!process.env.GOOGLE_LOGIN_CLIENT_ID) return send(res, 503, { error: 'Google login is not configured yet.' })
  const origin = req.headers?.origin
  const allowed = new Set(['https://fit-core-five.vercel.app', 'http://localhost:5182', 'http://127.0.0.1:5182'])
  if (origin && !allowed.has(origin)) return send(res, 403, { error: 'Sign in from the FitCore app.' })
  const authorization = req.headers?.authorization || ''
  if (!authorization.startsWith('Bearer ')) return send(res, 401, { error: 'Please sign in with Google.' })
  try { return send(res, 200, { user: await verifyGoogleIdentity(authorization.slice(7)) }) }
  catch { return send(res, 401, { error: 'Google sign-in could not be verified. Please sign in again.' }) }
}
