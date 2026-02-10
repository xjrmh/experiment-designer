import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac, randomBytes } from 'node:crypto'

const DEFAULT_CHAT_SESSION_TTL_SEC = 3_600
const DEFAULT_CHAT_SESSION_COOKIE_NAME = 'chat_session'

function getPositiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function getHeaderValue(header: string | string[] | undefined): string | undefined {
  if (typeof header === 'string') return header
  if (Array.isArray(header) && header.length > 0) return header[0]
  return undefined
}

function safeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return result === 0
}

function getOriginAllowed(req: VercelRequest): boolean {
  const allowedOriginsRaw = process.env.CHAT_ALLOWED_ORIGINS?.trim()
  if (!allowedOriginsRaw) return true

  const requestOrigin = getHeaderValue(req.headers.origin)
  if (!requestOrigin) return false

  const allowedOrigins = allowedOriginsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  return allowedOrigins.includes(requestOrigin)
}

function getChatSessionCookieName(): string {
  return process.env.CHAT_SESSION_COOKIE_NAME?.trim() || DEFAULT_CHAT_SESSION_COOKIE_NAME
}

function getChatSessionSecret(): string | null {
  const configuredSecret = process.env.CHAT_SESSION_SECRET?.trim()
  if (configuredSecret) return configuredSecret

  const apiKeySecret = process.env.OPENAI_API_KEY?.trim()
  if (apiKeySecret) return apiKeySecret

  return null
}

function signSessionPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function buildSessionToken(username: string, ttlSec: number, secret: string): string {
  const payload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
    nonce: randomBytes(8).toString('hex'),
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = signSessionPayload(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

function buildSessionCookie(token: string, ttlSec: number): string {
  const cookieName = getChatSessionCookieName()
  const secureFlag = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const parts = [
    `${cookieName}=${encodeURIComponent(token)}`,
    `Max-Age=${ttlSec}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Priority=High',
  ]
  if (secureFlag) {
    parts.push('Secure')
  }
  return parts.join('; ')
}

function buildClearSessionCookie(): string {
  const cookieName = getChatSessionCookieName()
  const secureFlag = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const parts = [
    `${cookieName}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Priority=High',
  ]
  if (secureFlag) {
    parts.push('Secure')
  }
  return parts.join('; ')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!getOriginAllowed(req)) {
    return res.status(403).json({ error: 'Origin is not allowed.' })
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', buildClearSessionCookie())
    return res.status(200).json({ ok: true })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const expectedUser = process.env.CHAT_BASIC_AUTH_USER?.trim()
  const expectedPass = process.env.CHAT_BASIC_AUTH_PASS?.trim()
  if (!expectedUser && !expectedPass) {
    // If chat auth is not configured, treat as no-op success.
    return res.status(200).json({ ok: true, disabled: true })
  }
  if (!expectedUser || !expectedPass) {
    return res.status(500).json({ error: 'Server auth is misconfigured.' })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required.' })
  }

  if (!safeEqualString(username, expectedUser) || !safeEqualString(password, expectedPass)) {
    return res.status(401).json({ error: 'Invalid chat credentials.' })
  }

  const sessionSecret = getChatSessionSecret()
  if (!sessionSecret) {
    return res.status(500).json({ error: 'Session secret is missing.' })
  }

  const ttlSec = getPositiveIntFromEnv('CHAT_SESSION_TTL_SEC', DEFAULT_CHAT_SESSION_TTL_SEC)
  const token = buildSessionToken(username, ttlSec, sessionSecret)
  res.setHeader('Set-Cookie', buildSessionCookie(token, ttlSec))
  res.setHeader('Cache-Control', 'no-store')

  return res.status(200).json({
    ok: true,
    expiresInSec: ttlSec,
  })
}
