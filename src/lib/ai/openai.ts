import { buildSystemPrompt, AI_TOOL_FUNCTIONS, type ExperimentState } from './systemPrompt'
import type { ChatMessage } from '@/store/aiChatStore'
import type { ExperimentType, MetricCategory, MetricType, MetricDirection } from '@/types'

const CHAT_MODEL = 'gpt-4o-mini'
const CHAT_TEMPERATURE = 0.85

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

// --- Per-function argument types ---

export interface SetExperimentTypeArgs {
  experimentType: ExperimentType
}

export interface SetExperimentDetailsArgs {
  name?: string
  hypothesis?: string
  description?: string
}

export interface SetMetricsArgs {
  metrics: Array<{
    name: string
    category: MetricCategory
    type: MetricType
    direction: MetricDirection
    baseline: number
  }>
}

export interface SetStatisticalParamsArgs {
  mde?: number
  dailyTraffic?: number
}

export interface FunctionCall {
  name: string
  args: SetExperimentTypeArgs | SetExperimentDetailsArgs | SetMetricsArgs | SetStatisticalParamsArgs
}

export interface AIResponse {
  message: string
  functionCalls: FunctionCall[]
}

export async function sendChatMessage(
  apiKey: string,
  isDemo: boolean,
  messages: ChatMessage[],
  currentState: ExperimentState
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(currentState)

  const openaiMessages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
  ]

  let data: any

  if (isDemo) {
    // Route through Vercel serverless proxy — API key stays server-side
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: openaiMessages,
        tools: AI_TOOL_FUNCTIONS,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || error.error || `API error: ${response.status}`)
    }

    data = await response.json()
  } else {
    // Direct call with user's own API key
    if (!apiKey) {
      throw new Error('No API key available.')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: openaiMessages,
        tools: AI_TOOL_FUNCTIONS,
        tool_choice: 'auto',
        temperature: CHAT_TEMPERATURE,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({})
      )
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key and try again.')
      }
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
    }

    data = await response.json()
  }

  const choice = data.choices?.[0]

  if (!choice) {
    throw new Error('No response from OpenAI')
  }

  const toolCalls = choice.message?.tool_calls
  const functionCalls: FunctionCall[] = []

  if (toolCalls && toolCalls.length > 0) {
    for (const tc of toolCalls) {
      functionCalls.push({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      })
    }
  }

  return {
    message: choice.message?.content || '',
    functionCalls,
  }
}
