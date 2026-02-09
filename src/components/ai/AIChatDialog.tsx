import { useState, useRef, useEffect, useCallback, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useAIChatStore, DEMO_API_KEY } from '@/store/aiChatStore'
import { useExperimentStore } from '@/store/experimentStore'
import {
  sendChatMessage,
  type FunctionCall,
  type SetExperimentTypeArgs,
  type SetExperimentDetailsArgs,
  type SetMetricsArgs,
  type SetStatisticalParamsArgs,
} from '@/lib/ai/openai'
import { AIChatMessage } from './AIChatMessage'
import { ExperimentType, MetricCategory, MetricType, MetricDirection } from '@/types'

const GREETING_MESSAGE =
  "Hi! I'm your experiment design assistant. Tell me — what change or feature are you trying to test? I'll help you pick the right experiment type and configure everything."

const MIN_WIDTH = 340
const MIN_HEIGHT = 380
const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 560

export function AIChatDialog() {
  const { messages, isOpen, apiKey, isDemo, isLoading, addMessage, setLoading, setApiKey, setDemo, clearMessages, setOpen } =
    useAIChatStore()
  const experimentStore = useExperimentStore()

  const [input, setInput] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyError, setApiKeyError] = useState('')
  const [showOwnKey, setShowOwnKey] = useState(false)

  const hasDemoKey = !!DEMO_API_KEY
  const isReady = isDemo ? hasDemoKey : !!apiKey
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // --- Position & Size state ---
  const [pos, setPos] = useState({ x: 0, y: 0, initialized: false })
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT })
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number; origX: number; origY: number } | null>(null)

  // Initialise position to bottom-right on first open
  useEffect(() => {
    if (isOpen && !pos.initialized) {
      const pad = 16
      setPos({
        x: window.innerWidth - DEFAULT_WIDTH - pad,
        y: window.innerHeight - DEFAULT_HEIGHT - pad,
        initialized: true,
      })
    }
  }, [isOpen, pos.initialized])

  // --- Drag handlers (on header) ---
  const onDragStart = useCallback((e: ReactPointerEvent) => {
    // Only drag from header area, ignore buttons
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [pos.x, pos.y])

  const onDragMove = useCallback((e: ReactPointerEvent) => {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    const newX = Math.max(0, Math.min(window.innerWidth - size.w, dragState.current.origX + dx))
    const newY = Math.max(0, Math.min(window.innerHeight - size.h, dragState.current.origY + dy))
    setPos({ x: newX, y: newY, initialized: true })
  }, [size.w, size.h])

  const onDragEnd = useCallback(() => {
    dragState.current = null
  }, [])

  // --- Resize handlers (from top-left corner) ---
  const onResizeStart = useCallback((e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeState.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h, origX: pos.x, origY: pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [size.w, size.h, pos.x, pos.y])

  const onResizeMove = useCallback((e: ReactPointerEvent) => {
    if (!resizeState.current) return
    const { startX, startY, origW, origH, origX, origY } = resizeState.current
    // Dragging top-left: moving left increases width, moving up increases height
    const dx = startX - e.clientX
    const dy = startY - e.clientY
    const newW = Math.max(MIN_WIDTH, Math.min(window.innerWidth, origW + dx))
    const newH = Math.max(MIN_HEIGHT, Math.min(window.innerHeight, origH + dy))
    // Shift position so bottom-right corner stays fixed
    const newX = Math.max(0, origX - (newW - origW))
    const newY = Math.max(0, origY - (newH - origH))
    setSize({ w: newW, h: newH })
    setPos({ x: newX, y: newY, initialized: true })
  }, [])

  const onResizeEnd = useCallback(() => {
    resizeState.current = null
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && isReady) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isReady])

  // Add greeting when first opened with no messages
  useEffect(() => {
    if (isOpen && messages.length === 0 && isReady) {
      addMessage({ role: 'assistant', content: GREETING_MESSAGE })
    }
  }, [isOpen, messages.length, isReady, addMessage])

  // Map function names to the wizard step they configure
  const STEP_MAP: Record<string, number> = {
    set_experiment_type: 1,
    set_metrics: 2,
    set_statistical_params: 3,
    set_experiment_details: 8,
  }

  const applyFunctionCalls = useCallback(
    (calls: FunctionCall[]): string => {
      const actions: string[] = []
      let navigateToStep = 0

      for (const call of calls) {
        const step = STEP_MAP[call.name] ?? 0

        switch (call.name) {
          case 'set_experiment_type': {
            const args = call.args as SetExperimentTypeArgs
            experimentStore.setExperimentType(args.experimentType as ExperimentType)
            actions.push(`Step ${step}: experiment type → ${args.experimentType.replace('_', ' ')}`)
            break
          }
          case 'set_experiment_details': {
            const args = call.args as SetExperimentDetailsArgs
            if (args.name) experimentStore.setName(args.name)
            if (args.hypothesis) experimentStore.setHypothesis(args.hypothesis)
            if (args.description) experimentStore.setDescription(args.description)
            actions.push(`Step ${step}: experiment details set`)
            break
          }
          case 'set_metrics': {
            const args = call.args as SetMetricsArgs
            if (args.metrics?.length) {
              for (const metric of args.metrics) {
                experimentStore.addMetric({
                  id: crypto.randomUUID(),
                  name: metric.name,
                  category: metric.category as MetricCategory,
                  type: metric.type as MetricType,
                  direction: metric.direction as MetricDirection,
                  baseline: metric.baseline ?? 0,
                })
              }
              actions.push(`Step ${step}: ${args.metrics.length} metric(s) added`)
            }
            break
          }
          case 'set_statistical_params': {
            const args = call.args as SetStatisticalParamsArgs
            if (args.mde) {
              experimentStore.updateStatisticalParams({ mde: args.mde })
              actions.push(`Step ${step}: MDE → ${args.mde}%`)
            }
            if (args.dailyTraffic) {
              experimentStore.setDailyTraffic(args.dailyTraffic)
              actions.push(`Step ${step}: daily traffic → ${args.dailyTraffic.toLocaleString()}`)
            }
            break
          }
        }

        // Navigate to the highest step that was configured
        if (step > navigateToStep) navigateToStep = step
      }

      // Navigate wizard to the last configured step
      if (navigateToStep > 0) {
        experimentStore.setCurrentStep(navigateToStep)
      }

      return actions.length > 0 ? `Configured: ${actions.join(' · ')}` : ''
    },
    [experimentStore]
  )

  const handleSend = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      const trimmed = input.trim()
      if (!trimmed || isLoading) return

      addMessage({ role: 'user', content: trimmed })
      setInput('')
      setLoading(true)

      try {
        const allMessages = [
          ...messages,
          { id: '', role: 'user' as const, content: trimmed, timestamp: Date.now() },
        ]

        const response = await sendChatMessage(apiKey, isDemo, allMessages, {
          experimentType: experimentStore.experimentType,
          metricsCount: experimentStore.metrics.length,
          currentStep: experimentStore.currentStep,
        })

        let configAction: string | undefined
        if (response.functionCalls.length > 0) {
          configAction = applyFunctionCalls(response.functionCalls)
        }

        const aiText =
          response.message ||
          (response.functionCalls.length > 0
            ? "I've updated your experiment configuration. Check the wizard to review what's been set up!"
            : '')

        if (aiText) {
          addMessage({
            role: 'assistant',
            content: aiText,
            configuredAction: configAction,
          })
        }
      } catch (err) {
        addMessage({
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        })
      } finally {
        setLoading(false)
      }
    },
    [input, isLoading, messages, apiKey, isDemo, experimentStore, addMessage, setLoading, applyFunctionCalls]
  )

  const handleSaveApiKey = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = apiKeyInput.trim()
    if (!trimmed) {
      setApiKeyError('Please enter your API key')
      return
    }
    if (!trimmed.startsWith('sk-')) {
      setApiKeyError('API key should start with "sk-"')
      return
    }
    setApiKey(trimmed)
    setApiKeyInput('')
    setApiKeyError('')
  }

  if (!isOpen) return null

  return (
    <div
      ref={dialogRef}
      className="fixed z-[100] flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-gray-300/60 border border-gray-200 overflow-hidden animate-in"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
      }}
    >
      <style>{`
        @keyframes animate-in {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-in { animation: animate-in 0.25s ease-out; }
      `}</style>

      {/* Resize handle — top-left corner */}
      <div
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        className="absolute top-0 left-0 w-4 h-4 z-10 cursor-nw-resize"
        style={{ touchAction: 'none' }}
      >
        <svg className="w-3 h-3 m-0.5 text-gray-400 rotate-180" viewBox="0 0 10 10" fill="currentColor">
          <path d="M0 10L10 0v3L3 10z" />
          <path d="M0 10L10 0v0.5L0.5 10z" opacity="0.5" />
          <path d="M4 10L10 4v3L7 10z" />
        </svg>
      </div>

      {/* Header — draggable */}
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white shrink-0 cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
      >
        <div className="flex items-center gap-2.5 pointer-events-none">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/20">
            <svg className="w-3.5 h-3.5 text-primary-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
              />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight">AI Experiment Assistant</span>
        </div>
        <div className="flex items-center gap-0.5">
          {isReady && messages.length > 0 && (
            <button
              onClick={() => {
                clearMessages()
                addMessage({ role: 'assistant', content: GREETING_MESSAGE })
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="New conversation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      {!isReady ? (
        /* Setup Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
              />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900">AI Experiment Assistant</h3>
            <p className="text-xs text-gray-500 mt-1">Get help designing your experiment with AI-powered recommendations.</p>
          </div>

          <div className="w-full space-y-3">
            {hasDemoKey && (
              <button
                onClick={() => {
                  setDemo(true)
                  setApiKey('')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary bg-primary-50 hover:bg-primary-100 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Try Demo</div>
                  <div className="text-xs text-gray-500">Start immediately, no setup needed</div>
                </div>
              </button>
            )}

            {!hasDemoKey || showOwnKey ? (
              <form onSubmit={handleSaveApiKey} className="w-full space-y-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value)
                    setApiKeyError('')
                  }}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
                {apiKeyError && <p className="text-xs text-red-500">{apiKeyError}</p>}
                <button
                  type="submit"
                  className="w-full px-3 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors shadow-sm hover:shadow-md"
                >
                  Connect
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowOwnKey(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Use Your Own Key</div>
                  <div className="text-xs text-gray-500">Connect your OpenAI API key</div>
                </div>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Chat Area */
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <AIChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="shrink-0 border-t border-gray-200 p-3 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your experiment..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        </>
      )}
    </div>
  )
}
