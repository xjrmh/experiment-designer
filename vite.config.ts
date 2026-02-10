import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'

const DEFAULT_CHAT_API_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_CHAT_MODEL = 'gpt-4o-mini'

function getTrimmedEnv(env: Record<string, string>, name: string): string | undefined {
  const value = env[name]?.trim()
  return value ? value : undefined
}

function normalizeApiBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/g, '')
}

function getChatApiBaseUrl(env: Record<string, string>): string {
  return normalizeApiBaseUrl(getTrimmedEnv(env, 'CHAT_API_BASE_URL') || DEFAULT_CHAT_API_BASE_URL)
}

function getChatModel(env: Record<string, string>): string {
  return getTrimmedEnv(env, 'CHAT_MODEL') || DEFAULT_CHAT_MODEL
}

function getChatApiKey(env: Record<string, string>): string | undefined {
  return getTrimmedEnv(env, 'CHAT_API_KEY') || getTrimmedEnv(env, 'OPENAI_API_KEY')
}

function isOpenAIHostedBaseUrl(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl)
    return parsed.hostname === 'api.openai.com'
  } catch {
    return false
  }
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

function isToolsUnsupportedMessage(message: string | null): boolean {
  if (!message) return false
  return (
    /does not support tools/i.test(message) ||
    /tool.*not supported/i.test(message) ||
    /function.*not supported/i.test(message) ||
    /unsupported.*tool/i.test(message)
  )
}

async function sendUpstreamChatCompletion(
  apiBaseUrl: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>
): Promise<{ response: Response; data: unknown; parseError: boolean }> {
  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const raw = await response.text()
  if (!raw) {
    return { response, data: {}, parseError: false }
  }

  try {
    return { response, data: JSON.parse(raw) as unknown, parseError: false }
  } catch {
    return { response, data: {}, parseError: true }
  }
}

function apiProxyPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'api-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        const apiBaseUrl = getChatApiBaseUrl(env)
        const chatModel = getChatModel(env)
        const apiKey = getChatApiKey(env)

        if (isOpenAIHostedBaseUrl(apiBaseUrl) && !apiKey) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'Demo mode is not available. Set CHAT_API_KEY (or OPENAI_API_KEY) in .env.local.' }))
          return
        }

        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        let parsedBody: { messages?: unknown; tools?: unknown } = {}
        try {
          parsedBody = body ? JSON.parse(body) : {}
        } catch {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Invalid JSON request body.' }))
          return
        }
        const { messages, tools } = parsedBody

        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }
          if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`
          }

          const hasTools = Array.isArray(tools) && tools.length > 0
          const basePayload: Record<string, unknown> = {
            model: chatModel,
            messages,
            temperature: 0.7,
            max_tokens: 1024,
          }

          let result = await sendUpstreamChatCompletion(
            apiBaseUrl,
            headers,
            hasTools ? { ...basePayload, tools, tool_choice: 'auto' } : basePayload
          )
          if (result.parseError) {
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'Malformed response from upstream chat API.' }))
            return
          }

          const firstErrorMessage = getSafeErrorMessage(result.data)
          if (
            hasTools &&
            !result.response.ok &&
            result.response.status === 400 &&
            isToolsUnsupportedMessage(firstErrorMessage)
          ) {
            result = await sendUpstreamChatCompletion(apiBaseUrl, headers, basePayload)
            if (result.parseError) {
              res.statusCode = 502
              res.end(JSON.stringify({ error: 'Malformed response from upstream chat API.' }))
              return
            }
          }

          res.setHeader('Content-Type', 'application/json')
          res.statusCode = result.response.ok ? 200 : result.response.status
          res.end(JSON.stringify(result.data))
        } catch {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Failed to contact upstream chat API.' }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), apiProxyPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
