import type { VercelRequest, VercelResponse } from '@vercel/node'

const CHAT_MODEL = 'gpt-4o-mini'
const CHAT_TEMPERATURE = 0.85

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Demo mode is not available. Please use your own API key.' })
  }

  const { messages, tools } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

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
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch {
    return res.status(500).json({ error: 'Failed to contact OpenAI' })
  }
}
