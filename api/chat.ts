import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac } from 'node:crypto'

const CHAT_MODEL = 'gpt-4o-mini'
const CHAT_TEMPERATURE = 0.85
const DEFAULT_OPENAI_TIMEOUT_MS = 20_000
const DEFAULT_RATE_LIMIT_MAX = 30
const DEFAULT_RATE_LIMIT_WINDOW_SEC = 60
const DEFAULT_MAX_BODY_BYTES = 100_000
const DEFAULT_MAX_MESSAGES = 48
const DEFAULT_MAX_MESSAGE_CHARS = 5_000
const DEFAULT_MAX_SYSTEM_MESSAGE_CHARS = 20_000
const DEFAULT_MAX_TOTAL_CHARS = 30_000
const DEFAULT_MAX_TOOLS = 16
const DEFAULT_CHAT_SESSION_COOKIE_NAME = 'chat_session'

type ChatRole = 'system' | 'user' | 'assistant'

type OpenAIChatMessage = {
  role: ChatRole
  content: string | null
}

interface ValidatedRequestBody {
  messages: OpenAIChatMessage[]
  tools?: unknown[]
}

interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetSec: number
  retryAfterSec: number
  windowSec: number
  source: 'upstash' | 'memory'
}

interface MemoryRateLimitEntry {
  count: number
  resetAtMs: number
}

declare global {
  // eslint-disable-next-line no-var
  var __chatRateLimitStore: Map<string, MemoryRateLimitEntry> | undefined
}

const memoryRateLimitStore = globalThis.__chatRateLimitStore ?? new Map<string, MemoryRateLimitEntry>()
if (!globalThis.__chatRateLimitStore) {
  globalThis.__chatRateLimitStore = memoryRateLimitStore
}

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

function getChatSessionCookieName(): string {
  return process.env.CHAT_SESSION_COOKIE_NAME?.trim() || DEFAULT_CHAT_SESSION_COOKIE_NAME
}

function getChatSessionSecret(): string | null {
  const configuredSecret = process.env.CHAT_SESSION_SECRET?.trim()
  if (configuredSecret) return configuredSecret

  // Fallback for easier setup in small deployments.
  const apiKeySecret = process.env.OPENAI_API_KEY?.trim()
  if (apiKeySecret) return apiKeySecret

  return null
}

function signSessionPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {}

  const result: Record<string, string> = {}
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0) continue

    const key = part.slice(0, separatorIndex).trim()
    const value = part.slice(separatorIndex + 1).trim()
    if (!key) continue

    try {
      result[key] = decodeURIComponent(value)
    } catch {
      result[key] = value
    }
  }

  return result
}

function isChatSessionCookieValid(req: VercelRequest, expectedUsername: string): boolean {
  const cookieHeader = getHeaderValue(req.headers.cookie)
  const cookieName = getChatSessionCookieName()
  const token = parseCookieHeader(cookieHeader)[cookieName]
  if (!token) return false

  const tokenParts = token.split('.')
  if (tokenParts.length !== 2) return false

  const [encodedPayload, signature] = tokenParts
  if (!encodedPayload || !signature) return false

  const secret = getChatSessionSecret()
  if (!secret) return false

  const expectedSignature = signSessionPayload(encodedPayload, secret)
  if (!safeEqualString(signature, expectedSignature)) return false

  let payload: { sub?: unknown; exp?: unknown }
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      sub?: unknown
      exp?: unknown
    }
  } catch {
    return false
  }

  if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return false
  if (!safeEqualString(payload.sub, expectedUsername)) return false

  const nowSec = Math.floor(Date.now() / 1000)
  return Number.isFinite(payload.exp) && payload.exp > nowSec
}

function safeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return result === 0
}

function parseBasicAuthHeader(headerValue: string | undefined): { username: string; password: string } | null {
  if (!headerValue || !headerValue.startsWith('Basic ')) return null

  const base64Value = headerValue.slice('Basic '.length).trim()
  let decoded: string
  try {
    decoded = Buffer.from(base64Value, 'base64').toString('utf8')
  } catch {
    return null
  }

  const separatorIndex = decoded.indexOf(':')
  if (separatorIndex < 0) return null

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  }
}

function isBasicAuthValid(req: VercelRequest): { ok: true } | { ok: false; misconfigured: boolean } {
  const expectedUser = process.env.CHAT_BASIC_AUTH_USER?.trim()
  const expectedPass = process.env.CHAT_BASIC_AUTH_PASS?.trim()

  if (!expectedUser && !expectedPass) {
    return { ok: true }
  }

  if (!expectedUser || !expectedPass) {
    return { ok: false, misconfigured: true }
  }

  if (isChatSessionCookieValid(req, expectedUser)) {
    return { ok: true }
  }

  const parsed = parseBasicAuthHeader(getHeaderValue(req.headers.authorization))
  if (!parsed) return { ok: false, misconfigured: false }

  const userMatch = safeEqualString(parsed.username, expectedUser)
  const passMatch = safeEqualString(parsed.password, expectedPass)
  if (userMatch && passMatch) return { ok: true }

  return { ok: false, misconfigured: false }
}

function getClientIp(req: VercelRequest): string {
  const forwardedFor = getHeaderValue(req.headers['x-forwarded-for'])
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  const realIp = getHeaderValue(req.headers['x-real-ip'])
  if (realIp) return realIp.trim()

  return 'unknown'
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

function validateRequestBody(body: unknown): { ok: true; value: ValidatedRequestBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body.' }
  }

  const maxMessages = getPositiveIntFromEnv('CHAT_MAX_MESSAGES', DEFAULT_MAX_MESSAGES)
  const maxMessageChars = getPositiveIntFromEnv('CHAT_MAX_MESSAGE_CHARS', DEFAULT_MAX_MESSAGE_CHARS)
  const maxSystemMessageChars = getPositiveIntFromEnv(
    'CHAT_MAX_SYSTEM_MESSAGE_CHARS',
    DEFAULT_MAX_SYSTEM_MESSAGE_CHARS
  )
  const maxTotalChars = getPositiveIntFromEnv('CHAT_MAX_TOTAL_CHARS', DEFAULT_MAX_TOTAL_CHARS)
  const maxTools = getPositiveIntFromEnv('CHAT_MAX_TOOLS', DEFAULT_MAX_TOOLS)

  const payload = body as Record<string, unknown>
  const rawMessages = payload.messages

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { ok: false, error: 'Request must include a non-empty messages array.' }
  }
  if (rawMessages.length > maxMessages) {
    return { ok: false, error: `Too many messages. Max allowed is ${maxMessages}.` }
  }

  let totalChars = 0
  const messages: OpenAIChatMessage[] = []

  for (const rawMessage of rawMessages) {
    if (!rawMessage || typeof rawMessage !== 'object') {
      return { ok: false, error: 'Each message must be an object.' }
    }

    const message = rawMessage as Record<string, unknown>
    const role = message.role
    if (role !== 'system' && role !== 'user' && role !== 'assistant') {
      return { ok: false, error: 'Each message role must be one of: system, user, assistant.' }
    }

    const content = message.content
    if (content !== null && typeof content !== 'string') {
      return { ok: false, error: 'Each message content must be a string or null.' }
    }
    if (typeof content === 'string') {
      const maxCharsForRole = role === 'system' ? maxSystemMessageChars : maxMessageChars
      if (content.length > maxCharsForRole) {
        return {
          ok: false,
          error: `${role} message content exceeds ${maxCharsForRole} characters.`,
        }
      }
      totalChars += content.length
      if (totalChars > maxTotalChars) {
        return { ok: false, error: `Total message content exceeds ${maxTotalChars} characters.` }
      }
    }

    messages.push({ role, content: content ?? null })
  }

  let tools: unknown[] | undefined
  if (typeof payload.tools !== 'undefined') {
    if (!Array.isArray(payload.tools)) {
      return { ok: false, error: 'tools must be an array when provided.' }
    }
    if (payload.tools.length > maxTools) {
      return { ok: false, error: `Too many tools. Max allowed is ${maxTools}.` }
    }
    tools = payload.tools
  }

  return { ok: true, value: { messages, tools } }
}

function setRateLimitHeaders(res: VercelResponse, result: RateLimitResult): void {
  res.setHeader('X-RateLimit-Limit', String(result.limit))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, result.remaining)))
  res.setHeader('X-RateLimit-Reset', String(result.resetSec))
  res.setHeader('X-RateLimit-Policy', `${result.limit};w=${result.windowSec}`)
  res.setHeader('X-RateLimit-Source', result.source)
  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSec))
  }
}

function checkRateLimitInMemory(identifier: string, limit: number, windowSec: number): RateLimitResult {
  const nowMs = Date.now()
  const windowMs = windowSec * 1000
  const currentWindowIndex = Math.floor(nowMs / windowMs)
  const resetAtMs = (currentWindowIndex + 1) * windowMs
  const key = `${identifier}:${currentWindowIndex}`

  if (memoryRateLimitStore.size > 5_000) {
    for (const [entryKey, entryValue] of memoryRateLimitStore.entries()) {
      if (entryValue.resetAtMs <= nowMs) {
        memoryRateLimitStore.delete(entryKey)
      }
    }
  }

  const current = memoryRateLimitStore.get(key)
  const nextCount = (current?.count ?? 0) + 1

  memoryRateLimitStore.set(key, {
    count: nextCount,
    resetAtMs,
  })

  const resetSec = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000))
  const remaining = limit - nextCount

  return {
    allowed: nextCount <= limit,
    limit,
    remaining,
    resetSec,
    retryAfterSec: resetSec,
    windowSec,
    source: 'memory',
  }
}

async function checkRateLimitWithUpstash(
  identifier: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult | null> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!upstashUrl || !upstashToken) return null

  const nowMs = Date.now()
  const windowMs = windowSec * 1000
  const currentWindowIndex = Math.floor(nowMs / windowMs)
  const resetAtMs = (currentWindowIndex + 1) * windowMs
  const key = `chat_rate:${identifier}:${currentWindowIndex}`

  const response = await fetch(`${upstashUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSec * 2],
    ]),
  })

  if (!response.ok) return null

  const payload = (await response.json()) as Array<{ result?: unknown }>
  const count = Number(payload?.[0]?.result)
  if (!Number.isFinite(count)) return null

  const resetSec = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000))
  const remaining = limit - count

  return {
    allowed: count <= limit,
    limit,
    remaining,
    resetSec,
    retryAfterSec: resetSec,
    windowSec,
    source: 'upstash',
  }
}

async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const limit = getPositiveIntFromEnv('CHAT_RATE_LIMIT_MAX', DEFAULT_RATE_LIMIT_MAX)
  const windowSec = getPositiveIntFromEnv('CHAT_RATE_LIMIT_WINDOW_SEC', DEFAULT_RATE_LIMIT_WINDOW_SEC)

  try {
    const upstashResult = await checkRateLimitWithUpstash(identifier, limit, windowSec)
    if (upstashResult) return upstashResult
  } catch {
    // Fall back to in-memory limiter if Upstash is unavailable.
  }

  return checkRateLimitInMemory(identifier, limit, windowSec)
}

function getSafeErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const payload = data as Record<string, unknown>

  if (
    payload.error &&
    typeof payload.error === 'object' &&
    typeof (payload.error as Record<string, unknown>).message === 'string'
  ) {
    return (payload.error as Record<string, unknown>).message as string
  }

  if (typeof payload.error === 'string') {
    return payload.error
  }

  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!getOriginAllowed(req)) {
    return res.status(403).json({ error: 'Origin is not allowed.' })
  }

  const basicAuthCheck = isBasicAuthValid(req)
  if (!basicAuthCheck.ok) {
    if (basicAuthCheck.misconfigured) {
      return res.status(500).json({ error: 'Server auth is misconfigured.' })
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Protected Chat API", charset="UTF-8"')
    return res.status(401).json({ error: 'Chat authentication required.', code: 'AUTH_REQUIRED' })
  }

  const clientIp = getClientIp(req)
  const rateLimitResult = await checkRateLimit(clientIp)
  setRateLimitHeaders(res, rateLimitResult)
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' })
  }

  const maxBodyBytes = getPositiveIntFromEnv('CHAT_MAX_BODY_BYTES', DEFAULT_MAX_BODY_BYTES)
  const contentLengthRaw = getHeaderValue(req.headers['content-length'])
  if (contentLengthRaw) {
    const contentLength = Number.parseInt(contentLengthRaw, 10)
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      return res.status(413).json({ error: 'Request body is too large.' })
    }
  }
  const bodySizeBytes = Buffer.byteLength(JSON.stringify(req.body ?? {}), 'utf8')
  if (bodySizeBytes > maxBodyBytes) {
    return res.status(413).json({ error: 'Request body is too large.' })
  }

  const validatedBody = validateRequestBody(req.body)
  if (!validatedBody.ok) {
    return res.status(400).json({ error: validatedBody.error })
  }

  const { messages, tools } = validatedBody.value
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Demo mode is not available. Set OPENAI_API_KEY.' })
  }

  const timeoutMs = getPositiveIntFromEnv('CHAT_OPENAI_TIMEOUT_MS', DEFAULT_OPENAI_TIMEOUT_MS)
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: CHAT_TEMPERATURE,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    })

    const raw = await response.text()
    let data: unknown = {}
    try {
      data = raw ? JSON.parse(raw) : {}
    } catch {
      return res.status(502).json({ error: 'Malformed response from OpenAI.' })
    }

    if (!response.ok) {
      const upstreamMessage = getSafeErrorMessage(data)

      if (response.status === 429) {
        return res.status(429).json({ error: 'OpenAI rate limit reached. Please retry shortly.' })
      }
      if (response.status === 400) {
        return res.status(400).json({ error: upstreamMessage || 'Invalid OpenAI request payload.' })
      }
      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({ error: 'OpenAI authentication failed on the server.' })
      }

      return res.status(502).json({ error: 'OpenAI request failed.' })
    }

    return res.status(200).json(data)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({ error: 'OpenAI request timed out.' })
    }
    return res.status(502).json({ error: 'Failed to contact OpenAI.' })
  } finally {
    clearTimeout(timeoutHandle)
  }
}
