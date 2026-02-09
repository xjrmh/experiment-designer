import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'

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

        const apiKey = env.OPENAI_API_KEY
        if (!apiKey) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'Demo mode is not available. Set OPENAI_API_KEY in .env.local' }))
          return
        }

        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        const { messages, tools } = JSON.parse(body)

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages,
              tools,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 1024,
            }),
          })

          const data = await response.json()
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = response.ok ? 200 : response.status
          res.end(JSON.stringify(data))
        } catch {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Failed to contact OpenAI' }))
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
