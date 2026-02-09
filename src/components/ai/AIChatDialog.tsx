import { useState, useRef, useEffect, useCallback, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useAIChatStore } from '@/store/aiChatStore'
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
import { ExperimentType, MetricCategory, MetricType, MetricDirection, type TypeSpecificParams } from '@/types'

const GREETING_MESSAGE =
  "Hi! I'm your experiment design assistant. Tell me — what change or feature are you trying to test? I'll help you pick the right experiment type and configure everything."

const MIN_WIDTH = 340
const MIN_HEIGHT = 380
const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 560
const DEMO_STAGE_DELAY_MS = 550

const STEP_MAP: Record<string, number> = {
  set_experiment_type: 1,
  set_metrics: 2,
  set_statistical_params: 3,
  set_experiment_details: 8,
}

interface DemoMetricPreset {
  name: string
  category: MetricCategory
  type: MetricType
  direction: MetricDirection
  baseline: number
  variance?: number
}

interface DemoSetupPreset {
  experimentType: ExperimentType
  name: string
  description: string
  hypothesis: string
  metrics: DemoMetricPreset[]
  dailyTraffic: number
  mde: number
  typeSpecificParams?: Partial<TypeSpecificParams>
  completionMessage: string
}

const SIMPLE_AB_DEMO_PRESET: DemoSetupPreset = {
  experimentType: ExperimentType.AB_TEST,
  name: 'Red vs Blue CTA Button Test',
  description: 'Compare red versus blue primary CTA button designs on the signup page.',
  hypothesis:
    'If we change the primary CTA button from blue to red, then signup conversion rate will increase because stronger visual contrast attracts more clicks.',
  metrics: [
    {
      name: 'Signup Conversion Rate',
      category: MetricCategory.PRIMARY,
      type: MetricType.BINARY,
      direction: MetricDirection.INCREASE,
      baseline: 0.042,
    },
    {
      name: 'CTA Click-Through Rate',
      category: MetricCategory.MONITOR,
      type: MetricType.BINARY,
      direction: MetricDirection.INCREASE,
      baseline: 0.118,
    },
    {
      name: 'Bounce Rate',
      category: MetricCategory.GUARDRAIL,
      type: MetricType.BINARY,
      direction: MetricDirection.DECREASE,
      baseline: 0.38,
    },
    {
      name: 'Page Load Time',
      category: MetricCategory.GUARDRAIL,
      type: MetricType.CONTINUOUS,
      direction: MetricDirection.DECREASE,
      baseline: 1450,
      variance: 240000,
    },
  ],
  dailyTraffic: 25000,
  mde: 5,
  completionMessage:
    'Demo loaded: simple A/B test (Red vs Blue CTA) with full metrics and defaults. I moved you to Step 8 and scrolled to Export Documentation so you can export immediately.\n\nNext step: Export the preset, or ask me to adjust any metric, traffic, or MDE.',
}

const COMPLEX_CLUSTER_DEMO_PRESET: DemoSetupPreset = {
  experimentType: ExperimentType.CLUSTER,
  name: 'Messaging Chat Feature Rollout (Cluster Network Effects)',
  description:
    'Cluster-randomized rollout of a new messaging chat feature where users within a cluster influence each other strongly.',
  hypothesis:
    'If we enable the messaging chat feature at cluster level, then messages sent per active user will increase because network effects amplify engagement within treated clusters.',
  metrics: [
    {
      name: 'Messages Sent per Active User',
      category: MetricCategory.PRIMARY,
      type: MetricType.COUNT,
      direction: MetricDirection.INCREASE,
      baseline: 6.5,
    },
    {
      name: '7-day Retention Rate',
      category: MetricCategory.MONITOR,
      type: MetricType.BINARY,
      direction: MetricDirection.INCREASE,
      baseline: 0.24,
    },
    {
      name: 'Crash Rate',
      category: MetricCategory.GUARDRAIL,
      type: MetricType.BINARY,
      direction: MetricDirection.DECREASE,
      baseline: 0.012,
    },
    {
      name: 'Spam Report Rate',
      category: MetricCategory.GUARDRAIL,
      type: MetricType.BINARY,
      direction: MetricDirection.DECREASE,
      baseline: 0.006,
    },
    {
      name: 'P95 Message Delivery Latency (ms)',
      category: MetricCategory.GUARDRAIL,
      type: MetricType.CONTINUOUS,
      direction: MetricDirection.DECREASE,
      baseline: 320,
      variance: 18000,
    },
  ],
  dailyTraffic: 180000,
  mde: 8,
  typeSpecificParams: {
    icc: 0.18,
    clusterSize: 220,
  },
  completionMessage:
    'Demo loaded: complex cluster experiment for messaging chat with strong network effects and full guardrails. I moved you to Step 8 and scrolled to Export Documentation for immediate export.\n\nNext step: Export this preset, or ask me to tune ICC, traffic, or success metrics.',
}

type ExperimentSnapshot = ReturnType<typeof useExperimentStore.getState>

function isExperimentSetupComplete(state: ExperimentSnapshot): boolean {
  const hasPrimaryMetric = state.metrics.some((m) => m.category === MetricCategory.PRIMARY)
  const hasGuardrailMetric = state.metrics.some((m) => m.category === MetricCategory.GUARDRAIL)

  return (
    !!state.experimentType &&
    hasPrimaryMetric &&
    hasGuardrailMetric &&
    state.dailyTraffic > 0 &&
    state.statisticalParams.mde > 0 &&
    !!state.name &&
    !!state.hypothesis
  )
}

function buildNextActionGuidance(state: ExperimentSnapshot): string {
  if (!state.experimentType) {
    return 'Next step: In Step 1, confirm the experiment type so defaults are set correctly. What change are you testing first?'
  }

  const hasPrimaryMetric = state.metrics.some((m) => m.category === MetricCategory.PRIMARY)
  if (!hasPrimaryMetric) {
    return 'Next step: In Step 2, add one PRIMARY success metric (for example conversion rate or revenue per user).'
  }

  const hasGuardrailMetric = state.metrics.some((m) => m.category === MetricCategory.GUARDRAIL)
  if (!hasGuardrailMetric) {
    return 'Next step: In Step 2, add at least one GUARDRAIL metric to catch regressions (for example bounce rate, error rate, or latency).'
  }

  if (state.dailyTraffic <= 0) {
    return 'Next step: In Step 3, enter daily traffic so duration and sample size can be estimated.'
  }

  if (state.statisticalParams.mde <= 0) {
    return 'Next step: In Step 3, set your MDE target. A practical starting point is usually 5-10% relative.'
  }

  if (!state.name || !state.hypothesis) {
    return 'Next step: In Step 8, review the AI-generated name and hypothesis and tweak wording if needed.'
  }

  return 'Next step: Review Steps 4-7 defaults, then finalize details and export in Step 8.'
}

function ensureNextActionLine(message: string, nextAction: string): string {
  const trimmed = message.trim()
  if (!trimmed) return nextAction
  if (/next step:/i.test(trimmed)) return trimmed
  return `${trimmed}\n\n${nextAction}`
}

function scrollToExportDocumentationSection(maxAttempts = 12) {
  let attempts = 0

  const attemptScroll = () => {
    const exportSection = document.getElementById('export-documentation-section')
    if (exportSection) {
      exportSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    attempts += 1
    if (attempts < maxAttempts) {
      window.setTimeout(attemptScroll, 120)
    }
  }

  attemptScroll()
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function AIChatDialog() {
  const { messages, isOpen, apiKey, isDemo, isLoading, addMessage, setLoading, setApiKey, setDemo, clearMessages, setOpen } =
    useAIChatStore()
  const experimentStore = useExperimentStore()

  const [input, setInput] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyError, setApiKeyError] = useState('')
  const [showOwnKey, setShowOwnKey] = useState(false)
  const [showSetupScreen, setShowSetupScreen] = useState(false)
  const [hasCompletedPresetDemo, setHasCompletedPresetDemo] = useState(false)
  const demoRunIdRef = useRef(0)

  const isReady = isDemo || !!apiKey
  const isSetupScreenVisible = showSetupScreen || !isReady
  const shouldHighlightTryYourself = hasCompletedPresetDemo
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
    if (isOpen && isReady && !isSetupScreenVisible) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isReady, isSetupScreenVisible])

  // Add greeting when first opened with no messages
  useEffect(() => {
    if (isOpen && messages.length === 0 && isReady && !isSetupScreenVisible) {
      addMessage({ role: 'assistant', content: GREETING_MESSAGE })
    }
  }, [isOpen, messages.length, isReady, isSetupScreenVisible, addMessage])

  const applyFunctionCalls = useCallback(
    (calls: FunctionCall[]): string => {
      const actions: string[] = []
      const changedFields = new Set<string>()
      const changedMetricIds: string[] = []
      const changedSteps = new Set<number>()

      for (const call of calls) {
        const step = STEP_MAP[call.name] ?? 0
        if (step > 0) changedSteps.add(step)

        switch (call.name) {
          case 'set_experiment_type': {
            const args = call.args as SetExperimentTypeArgs
            experimentStore.setExperimentType(args.experimentType as ExperimentType)
            changedFields.add('experimentType')
            actions.push(`Step ${step}: experiment type → ${args.experimentType.replace('_', ' ')}`)
            break
          }
          case 'set_experiment_details': {
            const args = call.args as SetExperimentDetailsArgs
            if (args.name) {
              experimentStore.setName(args.name)
              changedFields.add('name')
              actions.push(`Step ${step}: name set`)
            }
            if (args.hypothesis) {
              experimentStore.setHypothesis(args.hypothesis)
              changedFields.add('hypothesis')
              actions.push(`Step ${step}: hypothesis set`)
            }
            if (args.description) {
              experimentStore.setDescription(args.description)
              changedFields.add('description')
              actions.push(`Step ${step}: description set`)
            }
            break
          }
          case 'set_metrics': {
            const args = call.args as SetMetricsArgs
            if (args.metrics?.length) {
              for (const metric of args.metrics) {
                const existingMetric = useExperimentStore
                  .getState()
                  .metrics.find((m) => m.name.trim().toLowerCase() === metric.name.trim().toLowerCase())

                if (existingMetric) {
                  experimentStore.updateMetric(existingMetric.id, {
                    category: metric.category as MetricCategory,
                    type: metric.type as MetricType,
                    direction: metric.direction as MetricDirection,
                    baseline: metric.baseline ?? 0,
                  })
                  changedMetricIds.push(existingMetric.id)
                  actions.push(`Step ${step}: metric updated → ${metric.name}`)
                } else {
                  const newMetricId = crypto.randomUUID()
                  experimentStore.addMetric({
                    id: newMetricId,
                    name: metric.name,
                    category: metric.category as MetricCategory,
                    type: metric.type as MetricType,
                    direction: metric.direction as MetricDirection,
                    baseline: metric.baseline ?? 0,
                  })
                  changedMetricIds.push(newMetricId)
                  actions.push(`Step ${step}: metric added → ${metric.name}`)
                }
              }
              changedFields.add('metrics')
            }
            break
          }
          case 'set_statistical_params': {
            const args = call.args as SetStatisticalParamsArgs
            if (typeof args.mde === 'number') {
              experimentStore.updateStatisticalParams({ mde: args.mde })
              changedFields.add('statisticalParams.mde')
              actions.push(`Step ${step}: MDE → ${args.mde}%`)
            }
            if (typeof args.dailyTraffic === 'number') {
              experimentStore.setDailyTraffic(args.dailyTraffic)
              changedFields.add('dailyTraffic')
              actions.push(`Step ${step}: daily traffic → ${args.dailyTraffic.toLocaleString()}`)
            }
            break
          }
        }
      }

      const orderedSteps = Array.from(changedSteps).sort((a, b) => a - b)
      if (changedFields.size > 0 || changedMetricIds.length > 0 || orderedSteps.length > 0) {
        experimentStore.markAIUpdates({
          fields: Array.from(changedFields),
          metricIds: changedMetricIds,
          steps: orderedSteps,
        })
      }

      const latestState = useExperimentStore.getState()
      const shouldJumpToSummary = isExperimentSetupComplete(latestState)

      if (shouldJumpToSummary) {
        experimentStore.setCurrentStep(8)
        requestAnimationFrame(() => {
          scrollToExportDocumentationSection()
        })
      } else if (orderedSteps.length > 0) {
        // Jump to the earliest updated step so users see the changed inputs in sequence.
        experimentStore.setCurrentStep(orderedSteps[0])
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        })
      }

      return actions.length > 0 ? `Configured: ${actions.join(' · ')}` : ''
    },
    [experimentStore]
  )

  const applyDemoSetupPreset = useCallback(
    async (preset: DemoSetupPreset) => {
      const runId = Date.now()
      demoRunIdRef.current = runId

      const isStaleRun = () => demoRunIdRef.current !== runId

      setLoading(true)
      setShowSetupScreen(false)
      try {
        experimentStore.reset()
        experimentStore.clearAIHighlights()

        clearMessages()
        if (!isDemo && !apiKey) {
          setDemo(true)
        }

        addMessage({
          role: 'assistant',
          content: `Great choice. I’ll run this demo setup step by step so you can review each stage.\n\nNext step: I’m starting with Step 1 (experiment type).`,
        })

        await wait(DEMO_STAGE_DELAY_MS)
        if (isStaleRun()) return

        experimentStore.setExperimentType(preset.experimentType)
        experimentStore.markAIUpdates({
          fields: ['experimentType'],
          steps: [1],
        })
        experimentStore.setCurrentStep(1)
        addMessage({
          role: 'assistant',
          content: `Step 1 complete: set experiment type to ${preset.experimentType.replace('_', ' ')}.\n\nNext step: I’ll configure Step 2 metrics.`,
          configuredAction: `Configured: Step 1: experiment type → ${preset.experimentType.replace('_', ' ')}`,
        })

        await wait(DEMO_STAGE_DELAY_MS)
        if (isStaleRun()) return

        const demoMetricIds: string[] = []
        for (const metric of preset.metrics) {
          const metricId = crypto.randomUUID()
          demoMetricIds.push(metricId)
          experimentStore.addMetric({
            id: metricId,
            name: metric.name,
            category: metric.category,
            type: metric.type,
            direction: metric.direction,
            baseline: metric.baseline,
            variance: metric.variance,
          })
        }

        experimentStore.markAIUpdates({
          fields: ['metrics'],
          metricIds: demoMetricIds,
          steps: [2],
        })
        experimentStore.setCurrentStep(2)
        addMessage({
          role: 'assistant',
          content: `Step 2 complete: added ${preset.metrics.length} metrics including primary and guardrails.\n\nNext step: I’ll set traffic and MDE in Step 3.`,
          configuredAction: `Configured: Step 2: ${preset.metrics.length} metric(s) added`,
        })

        await wait(DEMO_STAGE_DELAY_MS)
        if (isStaleRun()) return

        experimentStore.updateStatisticalParams({ mde: preset.mde })
        experimentStore.setDailyTraffic(preset.dailyTraffic)
        if (preset.typeSpecificParams) {
          experimentStore.updateTypeSpecificParams(preset.typeSpecificParams)
        }
        experimentStore.markAIUpdates({
          fields: ['statisticalParams.mde', 'dailyTraffic'],
          steps: [3],
        })
        experimentStore.setCurrentStep(3)
        addMessage({
          role: 'assistant',
          content: `Step 3 complete: set daily traffic to ${preset.dailyTraffic.toLocaleString()} and MDE to ${preset.mde}%.\n\nNext step: I’ll finish details in Step 8.`,
          configuredAction: `Configured: Step 3: MDE → ${preset.mde}% · daily traffic → ${preset.dailyTraffic.toLocaleString()}`,
        })

        await wait(DEMO_STAGE_DELAY_MS)
        if (isStaleRun()) return

        experimentStore.setName(preset.name)
        experimentStore.setDescription(preset.description)
        experimentStore.setHypothesis(preset.hypothesis)
        experimentStore.markAIUpdates({
          fields: ['name', 'description', 'hypothesis'],
          steps: [8],
        })
        experimentStore.setCurrentStep(8)
        requestAnimationFrame(() => {
          scrollToExportDocumentationSection()
        })

        addMessage({
          role: 'assistant',
          content: preset.completionMessage,
          configuredAction: `Configured demo: ${preset.name}`,
        })
        setHasCompletedPresetDemo(true)
      } finally {
        if (!isStaleRun()) {
          setLoading(false)
        }
      }
    },
    [experimentStore, clearMessages, setDemo, addMessage, isDemo, apiKey, setLoading]
  )

  const startSelfGuidedDemo = useCallback(() => {
    setShowSetupScreen(false)
    if (!isDemo && !apiKey) {
      setDemo(true)
      setApiKey('')
    }
  }, [isDemo, apiKey, setDemo, setApiKey])

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
          name: experimentStore.name || '',
          hypothesis: experimentStore.hypothesis || '',
          metrics: experimentStore.metrics.map((m) => ({
            name: m.name,
            category: m.category,
            type: m.type,
            baseline: m.baseline,
          })),
          dailyTraffic: experimentStore.dailyTraffic,
          mde: experimentStore.statisticalParams.mde,
          hasSampleSizeResult: !!experimentStore.sampleSizeResult,
          currentStep: experimentStore.currentStep,
        })

        let configAction: string | undefined
        if (response.functionCalls.length > 0) {
          configAction = applyFunctionCalls(response.functionCalls)
        }

        const rawAiText =
          response.message ||
          (response.functionCalls.length > 0
            ? "I've updated your experiment configuration. Check the wizard to review what's been set up!"
            : '')
        const nextAction = buildNextActionGuidance(useExperimentStore.getState())
        const aiText = ensureNextActionLine(rawAiText, nextAction)

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
    setShowSetupScreen(false)
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
                demoRunIdRef.current = Date.now()
                setLoading(false)
                setShowSetupScreen(true)
                setShowOwnKey(false)
                setApiKeyInput('')
                setApiKeyError('')
                clearMessages()
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
      {isSetupScreenVisible ? (
        /* Setup Screen */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="min-h-full flex flex-col items-center justify-start gap-5">
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
              <p className="text-xs text-gray-500 mt-1">Get real-time guided help designing your experiment with AI.</p>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={() => applyDemoSetupPreset(SIMPLE_AB_DEMO_PRESET)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                  shouldHighlightTryYourself
                    ? 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    : 'border-2 border-primary bg-primary-50 hover:bg-primary-100'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                    shouldHighlightTryYourself ? 'bg-gray-100 text-gray-700' : 'bg-primary text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m-7.5-7.5v15" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Simple Demo: Red vs Blue Button</div>
                  <div className="text-xs text-gray-500">A/B test preset with full metrics and export-ready setup</div>
                </div>
              </button>
              <button
                onClick={() => applyDemoSetupPreset(COMPLEX_CLUSTER_DEMO_PRESET)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-700 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 7v10m6-10v10m6-10v10M4 17h16" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Complex Demo: Cluster Messaging Test</div>
                  <div className="text-xs text-gray-500">Network-effect cluster preset with advanced guardrails</div>
                </div>
              </button>
              <button
                onClick={() => startSelfGuidedDemo()}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                  shouldHighlightTryYourself
                    ? 'border-2 border-primary bg-primary-50 hover:bg-primary-100'
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                    shouldHighlightTryYourself ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a3.375 3.375 0 1 1 6.75 0c0 1.295-.706 2.42-1.754 3.009-.644.363-1.057 1.023-1.057 1.762v.104m0 3h.008M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Try it yourself</div>
                  <div className="text-xs text-gray-500">Start demo mode without a template</div>
                </div>
              </button>

              {showOwnKey ? (
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
