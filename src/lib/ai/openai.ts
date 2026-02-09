import { buildSystemPrompt, AI_TOOL_FUNCTIONS } from './systemPrompt'
import type { ChatMessage } from '@/store/aiChatStore'
import { DEMO_API_KEY } from '@/store/aiChatStore'
import type { ExperimentType, MetricCategory, MetricType, MetricDirection } from '@/types'

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

export function getEffectiveApiKey(userKey: string, isDemo: boolean): string {
  if (isDemo && DEMO_API_KEY) return DEMO_API_KEY
  return userKey
}

export async function sendChatMessage(
  apiKey: string,
  isDemo: boolean,
  messages: ChatMessage[],
  currentState: {
    experimentType: ExperimentType | null
    metricsCount: number
    currentStep: number
  }
): Promise<AIResponse> {
  const effectiveKey = getEffectiveApiKey(apiKey, isDemo)
  if (!effectiveKey) {
    throw new Error('No API key available.')
  }

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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${effectiveKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      tools: AI_TOOL_FUNCTIONS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your OpenAI API key and try again.')
    }
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
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
