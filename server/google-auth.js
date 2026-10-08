import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client()

export async function verifyGoogleIdentity(credential) {
  const audience = process.env.GOOGLE_LOGIN_CLIENT_ID
  if (!audience) throw new Error('Google login is not configured yet.')
  if (typeof credential !== 'string' || credential.length > 10000) throw new Error('Please sign in with Google again.')
  const ticket = await client.verifyIdToken({ idToken: credential, audience })
  const payload = ticket.getPayload()
  if (!payload?.sub || !payload.email || !payload.email_verified || !payload.exp) throw new Error('A verified Google account is required.')
  const admins = (process.env.GOOGLE_ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean)
  // Admins must use a Google-hosted account; verified third-party email ownership can change.
  const googleOwnsEmail = payload.email.toLowerCase().endsWith('@gmail.com') || Boolean(payload.hd)
  return { id: payload.sub, email: payload.email, name: payload.name || payload.email,
    isAdmin: googleOwnsEmail && admins.includes(payload.email.toLowerCase()), expiresAt: payload.exp * 1000 }
}
