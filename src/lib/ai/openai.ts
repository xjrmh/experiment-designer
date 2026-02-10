import { buildSystemPrompt, AI_TOOL_FUNCTIONS, type ExperimentState } from './systemPrompt'
import type { ChatMessage } from '@/store/aiChatStore'
import type {
  ExperimentType,
  MetricCategory,
  MetricType,
  MetricDirection,
  RandomizationUnit,
  BucketingStrategy,
  RiskLevel,
  MultipleTestingCorrection,
} from '@/types'

const DEFAULT_CHAT_MODEL = 'gpt-4o-mini'
const DEFAULT_CHAT_API_BASE_URL = 'https://api.openai.com/v1'
const CHAT_MODEL = import.meta.env.VITE_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL
const CHAT_API_BASE_URL = (import.meta.env.VITE_CHAT_API_BASE_URL?.trim() || DEFAULT_CHAT_API_BASE_URL).replace(
  /\/+$/g,
  ''
)
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

function getApiErrorMessage(data: unknown): string | null {
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

async function postChatCompletion(
  url: string,
  apiKey: string,
  payload: Record<string, unknown>
): Promise<{ response: Response; data: unknown; parseError: boolean }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  const raw = await response.text()
  if (!raw) {
    return { response, data: {}, parseError: false }
  }

  try {
    return {
      response,
      data: JSON.parse(raw) as unknown,
      parseError: false,
    }
  } catch {
    return {
      response,
      data: {},
      parseError: true,
    }
  }
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

export interface SetRandomizationArgs {
  unit?: RandomizationUnit
  bucketingStrategy?: BucketingStrategy
  consistentAssignment?: boolean
  stratificationVariables?: Array<{ name: string; values?: string[] }>
  sampleRatio?: number[]
  rationale?: string
}

export interface SetVarianceReductionArgs {
  useCUPED?: boolean
  cupedCovariate?: string
  cupedExpectedReduction?: number
  useStratification?: boolean
  stratificationVariables?: string[]
  useMatchedPairs?: boolean
  useBlocking?: boolean
}

export interface SetRiskAssessmentArgs {
  riskLevel?: RiskLevel
  blastRadius?: number
  potentialNegativeImpacts?: string[]
  mitigationStrategies?: string[]
  rollbackTriggers?: string[]
  circuitBreakers?: string[]
  preLaunchChecklistCompletedIds?: string[]
}

export interface SetMonitoringArgs {
  refreshFrequency?: number
  srmThreshold?: number
  multipleTestingCorrection?: MultipleTestingCorrection
  stoppingRules?: Array<{
    type: 'SUCCESS' | 'FUTILITY' | 'HARM'
    description: string
    threshold?: number
    metricId?: string
  }>
  decisionCriteria?: {
    ship?: string[]
    iterate?: string[]
    kill?: string[]
  }
}

export interface FunctionCall {
  name: string
  args:
    | SetExperimentTypeArgs
    | SetExperimentDetailsArgs
    | SetMetricsArgs
    | SetStatisticalParamsArgs
    | SetRandomizationArgs
    | SetVarianceReductionArgs
    | SetRiskAssessmentArgs
    | SetMonitoringArgs
}

export interface AIResponse {
  message: string
  functionCalls: FunctionCall[]
}

export async function authenticateChatAccess(username: string, password: string): Promise<void> {
  const trimmedUsername = username.trim()
  if (!trimmedUsername || !password) {
    throw new Error('Username and password are required.')
  }

  const response = await fetch('/api/chat-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      username: trimmedUsername,
      password,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    if (response.status === 401) {
      throw new Error('Invalid chat credentials.')
    }
    throw new Error(error.error?.message || error.error || `Authentication error: ${response.status}`)
  }
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
  const trimmedApiKey = apiKey.trim()
  const shouldUseDemoProxy = isDemo && !trimmedApiKey

  if (shouldUseDemoProxy) {
    // Route through Vercel serverless proxy — API key stays server-side
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        messages: openaiMessages,
        tools: AI_TOOL_FUNCTIONS,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      if (
        response.status === 503 &&
        typeof error.error === 'string' &&
        /demo mode is not available/i.test(error.error)
      ) {
        throw new Error(
          'Demo mode is not available. Configure CHAT_API_BASE_URL / CHAT_MODEL (and CHAT_API_KEY if required).'
        )
      }
      if (response.status === 401) {
        throw new Error('Chat authentication required. Unlock protected chat and try again.')
      }
      throw new Error(error.error?.message || error.error || `API error: ${response.status}`)
    }

    data = await response.json()
  } else {
    // Direct call with user's own API key
    if (!trimmedApiKey) {
      throw new Error('No API key available.')
    }

    const basePayload: Record<string, unknown> = {
      model: CHAT_MODEL,
      messages: openaiMessages,
      temperature: CHAT_TEMPERATURE,
      max_tokens: 1024,
    }

    let result = await postChatCompletion(`${CHAT_API_BASE_URL}/chat/completions`, trimmedApiKey, {
      ...basePayload,
      tools: AI_TOOL_FUNCTIONS,
      tool_choice: 'auto',
    })

    if (result.parseError) {
      throw new Error('Malformed response from chat provider.')
    }

    const firstAttemptMessage = getApiErrorMessage(result.data)
    if (
      !result.response.ok &&
      result.response.status === 400 &&
      isToolsUnsupportedMessage(firstAttemptMessage)
    ) {
      result = await postChatCompletion(`${CHAT_API_BASE_URL}/chat/completions`, trimmedApiKey, basePayload)
      if (result.parseError) {
        throw new Error('Malformed response from chat provider.')
      }
    }

    if (!result.response.ok) {
      const errorMessage = getApiErrorMessage(result.data)
      if (result.response.status === 401) {
        throw new Error('Invalid API key. Please check your chat API key and try again.')
      }
      throw new Error(errorMessage || `Chat API error: ${result.response.status}`)
    }

    data = result.data
  }

  const choice = data.choices?.[0]

  if (!choice) {
    throw new Error('No response from chat provider')
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
