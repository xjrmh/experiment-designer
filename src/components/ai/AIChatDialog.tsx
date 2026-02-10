import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useAIChatStore } from '@/store/aiChatStore'
import { useExperimentStore } from '@/store/experimentStore'
import {
  authenticateChatAccess,
  sendChatMessage,
  type FunctionCall,
  type SetExperimentTypeArgs,
  type SetExperimentDetailsArgs,
  type SetMetricsArgs,
  type SetStatisticalParamsArgs,
  type SetRandomizationArgs,
  type SetVarianceReductionArgs,
  type SetRiskAssessmentArgs,
  type SetMonitoringArgs,
} from '@/lib/ai/openai'
import { AIChatMessage } from './AIChatMessage'
import {
  ExperimentType,
  MetricCategory,
  MetricType,
  MetricDirection,
  RandomizationUnit,
  BucketingStrategy,
  RiskLevel,
  MultipleTestingCorrection,
  StoppingRuleType,
  type TypeSpecificParams,
  type RandomizationConfig,
  type VarianceReductionConfig,
  type RiskAssessment,
  type MonitoringConfig,
} from '@/types'

const GREETING_MESSAGE =
  "Hi! I'm your experiment design assistant. Tell me — what change or feature are you trying to test? I'll help you pick the right experiment type and configure everything."

const MIN_WIDTH = 340
const MIN_HEIGHT = 380
const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 560
const COMPACT_VIEWPORT_BREAKPOINT = 1024
const DEMO_STAGE_DELAY_MS = 550

const STEP_MAP: Record<string, number> = {
  set_experiment_type: 1,
  set_metrics: 2,
  set_statistical_params: 3,
  set_randomization: 4,
  set_variance_reduction: 5,
  set_risk_assessment: 6,
  set_monitoring: 7,
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
  randomization?: Partial<RandomizationConfig>
  varianceReduction?: Partial<VarianceReductionConfig>
  riskAssessment?: Partial<RiskAssessment>
  riskChecklistCompletedIds?: string[]
  monitoring?: Partial<MonitoringConfig>
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
  randomization: {
    unit: RandomizationUnit.USER_ID,
    bucketingStrategy: BucketingStrategy.HASH_BASED,
    consistentAssignment: true,
    sampleRatio: [50, 50],
    stratificationVariables: [
      { name: 'platform', values: [] },
      { name: 'geo_tier', values: [] },
    ],
  },
  varianceReduction: {
    useCUPED: true,
    cupedCovariate: 'pre_signup_intent_score',
    cupedExpectedReduction: 35,
    useStratification: true,
    stratificationVariables: ['platform'],
    useMatchedPairs: false,
    useBlocking: false,
  },
  riskAssessment: {
    riskLevel: RiskLevel.MEDIUM,
    blastRadius: 35,
    potentialNegativeImpacts: ['Temporary conversion dip for a subset of traffic'],
    mitigationStrategies: ['Start at 10% rollout and expand gradually if guardrails hold'],
    rollbackTriggers: ['Signup conversion drops > 8% for 2 consecutive checks'],
    circuitBreakers: ['Auto-disable treatment when error rate exceeds 2%'],
  },
  riskChecklistCompletedIds: ['1', '2', '3'],
  monitoring: {
    refreshFrequency: 30,
    srmThreshold: 0.001,
    multipleTestingCorrection: MultipleTestingCorrection.BONFERRONI,
    stoppingRules: [
      {
        type: StoppingRuleType.SUCCESS,
        description: 'p-value < 0.001 and effect size > 2x MDE',
      },
      {
        type: StoppingRuleType.FUTILITY,
        description: 'Conditional power < 20% at 75% of planned duration',
      },
      {
        type: StoppingRuleType.HARM,
        description: 'Any guardrail metric degrades by > 5%',
      },
    ],
    decisionCriteria: {
      ship: ['Primary metric improves by >= 5% with no guardrail regressions'],
      iterate: ['Positive trend but below significance threshold at planned horizon'],
      kill: ['Primary metric declines or any critical guardrail degrades significantly'],
    },
  },
  completionMessage:
    'Demo loaded: simple A/B test (Red vs Blue CTA) and I walked through all steps 1-8, including randomization, variance reduction, risk, and monitoring.\n\nNext step: Review Step 8 and export, or ask me to adjust any step.',
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
  randomization: {
    unit: RandomizationUnit.CLUSTER,
    bucketingStrategy: BucketingStrategy.HASH_BASED,
    consistentAssignment: true,
    sampleRatio: [50, 50],
    stratificationVariables: [
      { name: 'region', values: [] },
      { name: 'cluster_size_band', values: [] },
    ],
  },
  varianceReduction: {
    useCUPED: true,
    cupedCovariate: 'pre_experiment_messages_per_user',
    cupedExpectedReduction: 28,
    useStratification: true,
    stratificationVariables: ['region', 'cluster_size_band'],
    useMatchedPairs: true,
    useBlocking: true,
  },
  riskAssessment: {
    riskLevel: RiskLevel.HIGH,
    blastRadius: 60,
    potentialNegativeImpacts: ['Spam and abuse volume can increase with messaging'],
    mitigationStrategies: ['Gate rollout by cluster quality tiers with manual approvals'],
    rollbackTriggers: ['Spam report rate > 20% above baseline for any treated cohort'],
    circuitBreakers: ['Auto-revert treatment for clusters with severe trust-safety alerts'],
  },
  riskChecklistCompletedIds: ['1', '2', '3', '4'],
  monitoring: {
    refreshFrequency: 15,
    srmThreshold: 0.001,
    multipleTestingCorrection: MultipleTestingCorrection.HOLM,
    stoppingRules: [
      {
        type: StoppingRuleType.SUCCESS,
        description: 'Primary metric increases >= 8% with stable crash and spam guardrails',
      },
      {
        type: StoppingRuleType.FUTILITY,
        description: 'No meaningful uplift and conditional power < 25% at 70% of planned duration',
      },
      {
        type: StoppingRuleType.HARM,
        description: 'Crash rate or spam report rate exceeds rollback trigger thresholds',
      },
    ],
    decisionCriteria: {
      ship: ['Primary metric increases >= 8% and crash/spam guardrails remain stable'],
      iterate: ['Primary metric improves but one guardrail nears alert threshold'],
      kill: ['Crash rate or spam reports exceed rollback trigger thresholds'],
    },
  },
  completionMessage:
    'Demo loaded: complex cluster experiment for messaging chat, including visible walkthrough of Steps 4-7 before Step 8 export.\n\nNext step: Review Step 8 and export, or ask me to tune ICC, traffic, or monitoring thresholds.',
}

type ExperimentSnapshot = ReturnType<typeof useExperimentStore.getState>

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

  if (state.currentStep <= 3) {
    return 'Next step: In Step 4, review randomization unit, bucketing, and assignment consistency.'
  }

  if (state.currentStep === 4) {
    return 'Next step: In Step 5, confirm whether to enable CUPED, stratification, matched pairs, or blocking.'
  }

  if (state.currentStep === 5) {
    return 'Next step: In Step 6, set risk level and blast radius, then confirm rollback and circuit breaker plans.'
  }

  if (state.currentStep === 6) {
    return 'Next step: In Step 7, define monitoring cadence, SRM threshold, and multiple testing correction.'
  }

  if (!state.name || !state.hypothesis) {
    return 'Next step: In Step 8, review the AI-generated name and hypothesis and tweak wording if needed.'
  }

  if (state.currentStep === 7) {
    return 'Next step: In Step 8, finalize experiment details and export documentation.'
  }

  return 'Next step: In Step 8, review final details and export your experiment plan.'
}

function ensureNextActionLine(message: string, nextAction: string): string {
  const trimmed = message.trim()
  if (!trimmed) return nextAction
  if (/next step:/i.test(trimmed)) return trimmed
  return `${trimmed}\n\n${nextAction}`
}

function formatChatErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown error.'
  }

  const normalized = error.message.trim().replace(/\s+/g, ' ')
  if (!normalized) return 'Unknown error.'

  if (/demo mode is not available/i.test(normalized)) {
    return 'Demo mode is unavailable on this server. Add OPENAI_API_KEY to .env.local.'
  }
  if (/chat authentication required|invalid chat credentials|unauthorized/i.test(normalized)) {
    return 'Chat access is protected. Use "Unlock protected chat" in starter options, then try again.'
  }

  const sanitized = normalized.replace(/[.?!]+$/g, '')
  return `${sanitized}.`
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

type AIChatDialogMode = 'popup' | 'docked'

interface AIChatDialogProps {
  mode?: AIChatDialogMode
}

export function AIChatDialog({ mode = 'popup' }: AIChatDialogProps) {
  const {
    messages,
    isOpen,
    apiKey,
    isDemo,
    isLoading,
    resetVersion,
    addMessage,
    setLoading,
    setDemo,
    resetConversation,
    setOpen,
  } =
    useAIChatStore()
  const experimentStore = useExperimentStore()

  const [input, setInput] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [showAuthUnlockOption, setShowAuthUnlockOption] = useState(false)
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [showStarterOptions, setShowStarterOptions] = useState(() => !(isDemo || !!apiKey))
  const demoRunIdRef = useRef(0)
  const isPopupMode = mode === 'popup'
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < COMPACT_VIEWPORT_BREAKPOINT : false
  )
  const isDialogVisible = isPopupMode ? isOpen : true

  const isReady = isDemo || !!apiKey
  const hasConversationStarted = messages.some(
    (m) => m.role === 'user' || (m.role === 'assistant' && m.content !== GREETING_MESSAGE)
  )
  const shouldShowStarterOptions = showStarterOptions && messages.length > 0 && !hasConversationStarted
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // --- Position & Size state ---
  const [pos, setPos] = useState({ x: 0, y: 0, initialized: false })
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT })
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number; origX: number; origY: number } | null>(null)

  useEffect(() => {
    if (!isPopupMode) return

    const handleResize = () => {
      setIsCompactViewport(window.innerWidth < COMPACT_VIEWPORT_BREAKPOINT)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isPopupMode])

  // Initialise position to bottom-right on first open
  useEffect(() => {
    if (isPopupMode && !isCompactViewport && isDialogVisible && !pos.initialized) {
      const pad = 16
      const width = Math.min(DEFAULT_WIDTH, window.innerWidth - pad * 2)
      const height = Math.min(DEFAULT_HEIGHT, window.innerHeight - pad * 2)
      setSize({ w: width, h: height })
      setPos({
        x: window.innerWidth - width - pad,
        y: window.innerHeight - height - pad,
        initialized: true,
      })
    }
  }, [isPopupMode, isCompactViewport, isDialogVisible, pos.initialized])

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
    if (isDialogVisible && isReady) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isDialogVisible, isReady])

  // Add greeting when first opened with no messages
  useEffect(() => {
    if (!isDialogVisible) return

    // Read current store state to avoid duplicate inserts under Strict Mode effect re-runs.
    const currentMessages = useAIChatStore.getState().messages
    if (currentMessages.length > 0) return

    addMessage({ role: 'assistant', content: GREETING_MESSAGE })
  }, [isDialogVisible, messages.length, addMessage])

  // Reset local UI state to the initial welcome screen when the conversation is externally reset.
  useEffect(() => {
    if (resetVersion === 0) return
    demoRunIdRef.current = Date.now()
    setInput('')
    setAuthUsername('')
    setAuthPassword('')
    setShowAuthUnlockOption(false)
    setShowAuthForm(false)
    setIsAuthenticating(false)
    setShowStarterOptions(true)
  }, [resetVersion])

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
          case 'set_randomization': {
            const args = call.args as SetRandomizationArgs
            const updates: Partial<RandomizationConfig> = {}

            if (args.unit) {
              updates.unit = args.unit as RandomizationUnit
              changedFields.add('randomization.unit')
            }
            if (args.bucketingStrategy) {
              updates.bucketingStrategy = args.bucketingStrategy as BucketingStrategy
              changedFields.add('randomization.bucketingStrategy')
            }
            if (typeof args.consistentAssignment === 'boolean') {
              updates.consistentAssignment = args.consistentAssignment
              changedFields.add('randomization.consistentAssignment')
            }
            if (Array.isArray(args.sampleRatio) && args.sampleRatio.length >= 2) {
              updates.sampleRatio = args.sampleRatio
              changedFields.add('randomization.sampleRatio')
            }
            if (Array.isArray(args.stratificationVariables)) {
              updates.stratificationVariables = args.stratificationVariables.map((v) => ({
                name: v.name,
                values: Array.isArray(v.values) ? v.values : [],
              }))
              changedFields.add('randomization.stratificationVariables')
            }
            if (typeof args.rationale === 'string') {
              updates.rationale = args.rationale
              changedFields.add('randomization.rationale')
            }

            if (Object.keys(updates).length > 0) {
              experimentStore.updateRandomization(updates)
              actions.push(`Step ${step}: randomization updated`)
            }
            break
          }
          case 'set_variance_reduction': {
            const args = call.args as SetVarianceReductionArgs
            const updates: Partial<VarianceReductionConfig> = {}

            if (typeof args.useCUPED === 'boolean') {
              updates.useCUPED = args.useCUPED
              changedFields.add('varianceReduction.useCUPED')
            }
            if (typeof args.cupedCovariate === 'string') {
              updates.cupedCovariate = args.cupedCovariate
              changedFields.add('varianceReduction.cupedCovariate')
            }
            if (typeof args.cupedExpectedReduction === 'number') {
              updates.cupedExpectedReduction = args.cupedExpectedReduction
              changedFields.add('varianceReduction.cupedExpectedReduction')
            }
            if (typeof args.useStratification === 'boolean') {
              updates.useStratification = args.useStratification
              changedFields.add('varianceReduction.useStratification')
            }
            if (Array.isArray(args.stratificationVariables)) {
              updates.stratificationVariables = args.stratificationVariables
              changedFields.add('varianceReduction.stratificationVariables')
            }
            if (typeof args.useMatchedPairs === 'boolean') {
              updates.useMatchedPairs = args.useMatchedPairs
              changedFields.add('varianceReduction.useMatchedPairs')
            }
            if (typeof args.useBlocking === 'boolean') {
              updates.useBlocking = args.useBlocking
              changedFields.add('varianceReduction.useBlocking')
            }

            if (Object.keys(updates).length > 0) {
              experimentStore.updateVarianceReduction(updates)
              actions.push(`Step ${step}: variance reduction updated`)
            }
            break
          }
          case 'set_risk_assessment': {
            const args = call.args as SetRiskAssessmentArgs
            const updates: Partial<RiskAssessment> = {}

            if (args.riskLevel) {
              updates.riskLevel = args.riskLevel as RiskLevel
              changedFields.add('riskAssessment.riskLevel')
            }
            if (typeof args.blastRadius === 'number') {
              updates.blastRadius = args.blastRadius
              changedFields.add('riskAssessment.blastRadius')
            }
            if (Array.isArray(args.potentialNegativeImpacts)) {
              updates.potentialNegativeImpacts = args.potentialNegativeImpacts
              changedFields.add('riskAssessment.potentialNegativeImpacts')
            }
            if (Array.isArray(args.mitigationStrategies)) {
              updates.mitigationStrategies = args.mitigationStrategies
              changedFields.add('riskAssessment.mitigationStrategies')
            }
            if (Array.isArray(args.rollbackTriggers)) {
              updates.rollbackTriggers = args.rollbackTriggers
              changedFields.add('riskAssessment.rollbackTriggers')
            }
            if (Array.isArray(args.circuitBreakers)) {
              updates.circuitBreakers = args.circuitBreakers
              changedFields.add('riskAssessment.circuitBreakers')
            }
            if (Array.isArray(args.preLaunchChecklistCompletedIds)) {
              const completedIds = new Set(args.preLaunchChecklistCompletedIds)
              updates.preLaunchChecklist = useExperimentStore
                .getState()
                .riskAssessment.preLaunchChecklist.map((item) => ({
                  ...item,
                  completed: completedIds.has(item.id),
                }))
              changedFields.add('riskAssessment.preLaunchChecklist')
            }

            if (Object.keys(updates).length > 0) {
              experimentStore.updateRiskAssessment(updates)
              actions.push(`Step ${step}: risk assessment updated`)
            }
            break
          }
          case 'set_monitoring': {
            const args = call.args as SetMonitoringArgs
            const updates: Partial<MonitoringConfig> = {}

            if (typeof args.refreshFrequency === 'number') {
              updates.refreshFrequency = args.refreshFrequency
              changedFields.add('monitoring.refreshFrequency')
            }
            if (typeof args.srmThreshold === 'number') {
              updates.srmThreshold = args.srmThreshold
              changedFields.add('monitoring.srmThreshold')
            }
            if (args.multipleTestingCorrection) {
              updates.multipleTestingCorrection =
                args.multipleTestingCorrection as MultipleTestingCorrection
              changedFields.add('monitoring.multipleTestingCorrection')
            }
            if (Array.isArray(args.stoppingRules)) {
              updates.stoppingRules = args.stoppingRules.map((rule) => ({
                type: rule.type as StoppingRuleType,
                description: rule.description,
                threshold: rule.threshold,
                metricId: rule.metricId,
              }))
              changedFields.add('monitoring.stoppingRules')
            }
            if (args.decisionCriteria) {
              const currentDecisionCriteria = useExperimentStore.getState().monitoring.decisionCriteria
              updates.decisionCriteria = {
                ship: args.decisionCriteria.ship ?? currentDecisionCriteria.ship,
                iterate: args.decisionCriteria.iterate ?? currentDecisionCriteria.iterate,
                kill: args.decisionCriteria.kill ?? currentDecisionCriteria.kill,
              }
              changedFields.add('monitoring.decisionCriteria')
            }

            if (Object.keys(updates).length > 0) {
              experimentStore.updateMonitoring(updates)
              actions.push(`Step ${step}: monitoring updated`)
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

      if (orderedSteps.length > 0) {
        const latestState = useExperimentStore.getState()
        const hasCorePrereqs =
          !!latestState.experimentType &&
          latestState.metrics.some((m) => m.category === MetricCategory.PRIMARY) &&
          latestState.metrics.some((m) => m.category === MetricCategory.GUARDRAIL) &&
          latestState.dailyTraffic > 0 &&
          latestState.statisticalParams.mde > 0
        const reviewStep = hasCorePrereqs ? orderedSteps.find((s) => s >= 4 && s <= 7) : undefined
        const targetStep = reviewStep ?? orderedSteps[0]

        // Prefer Step 4-7 when core setup is done, otherwise show the first updated step.
        experimentStore.setCurrentStep(targetStep)
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
      setShowStarterOptions(false)
      try {
        experimentStore.reset()
        experimentStore.clearAIHighlights()

        if (!isDemo && !apiKey) {
          setDemo(true)
        }

        addMessage({
          role: 'assistant',
          content:
            'Great choice. I’ll run this demo through all eight steps so you can review each stage, including Steps 4-7.\n\nNext step: I’m starting with Step 1 (experiment type).',
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
          content: `Step 3 complete: set daily traffic to ${preset.dailyTraffic.toLocaleString()} and MDE to ${preset.mde}%.\n\nNext step: I’ll configure Step 4 randomization settings.`,
          configuredAction: `Configured: Step 3: MDE → ${preset.mde}% · daily traffic → ${preset.dailyTraffic.toLocaleString()}`,
        })

        await wait(DEMO_STAGE_DELAY_MS)
        if (isStaleRun()) return

        if (preset.randomization) {
          experimentStore.updateRandomization(preset.randomization)
        }
        experimentStore.markAIUpdates({
          fields: [
            'randomization.unit',
            'randomization.bucketingStrategy',
            'randomization.consistentAssignment',
          ],
          steps: [4],
        })
        experimentStore.setCurrentStep(4)
        addMessage({
          role: 'assistant',
          content:
            'Step 4 complete: configured randomization unit, bucketing strategy, and assignment behavior.\n\nNext step: I’ll apply Step 5 variance reduction settings.',
          configuredAction: 'Configured: Step 4: randomization updated',
        })

        await wait(DEMO_STAGE_DELAY_MS)
        if (isStaleRun()) return

        if (preset.varianceReduction) {
          experimentStore.updateVarianceReduction(preset.varianceReduction)
        }
        experimentStore.markAIUpdates({
          fields: ['varianceReduction'],
          steps: [5],
        })
        experimentStore.setCurrentStep(5)
        addMessage({
          role: 'assistant',
          content:
            'Step 5 complete: applied variance reduction choices (CUPED/stratification/other techniques as defined).\n\nNext step: I’ll configure Step 6 risk assessment.',
          configuredAction: 'Configured: Step 5: variance reduction updated',
        })

        await wait(DEMO_STAGE_DELAY_MS)
        if (isStaleRun()) return

        if (preset.riskAssessment) {
          experimentStore.updateRiskAssessment(preset.riskAssessment)
        }
        if (preset.riskChecklistCompletedIds?.length) {
          const completedIds = new Set(preset.riskChecklistCompletedIds)
          const checklist = useExperimentStore
            .getState()
            .riskAssessment.preLaunchChecklist.map((item) => ({
              ...item,
              completed: completedIds.has(item.id),
            }))
          experimentStore.updateRiskAssessment({ preLaunchChecklist: checklist })
        }
        experimentStore.markAIUpdates({
          fields: ['riskAssessment'],
          steps: [6],
        })
        experimentStore.setCurrentStep(6)
        addMessage({
          role: 'assistant',
          content:
            'Step 6 complete: set risk level, blast radius, and mitigation/rollback controls.\n\nNext step: I’ll configure Step 7 monitoring and stopping defaults.',
          configuredAction: 'Configured: Step 6: risk assessment updated',
        })

        await wait(DEMO_STAGE_DELAY_MS)
        if (isStaleRun()) return

        if (preset.monitoring) {
          experimentStore.updateMonitoring(preset.monitoring)
        }
        experimentStore.markAIUpdates({
          fields: ['monitoring'],
          steps: [7],
        })
        experimentStore.setCurrentStep(7)
        addMessage({
          role: 'assistant',
          content:
            'Step 7 complete: monitoring cadence, SRM threshold, testing correction, and decision criteria are set.\n\nNext step: I’ll finalize Step 8 details for export.',
          configuredAction: 'Configured: Step 7: monitoring updated',
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

        addMessage({
          role: 'assistant',
          content: preset.completionMessage,
          configuredAction: `Configured demo: ${preset.name}`,
        })
      } finally {
        if (!isStaleRun()) {
          setLoading(false)
        }
      }
    },
    [experimentStore, setDemo, addMessage, isDemo, apiKey, setLoading]
  )

  const startSelfGuidedDemo = useCallback(() => {
    setShowStarterOptions(false)
    if (!isDemo && !apiKey) {
      setDemo(true)
    }
  }, [isDemo, apiKey, setDemo])

  const handleUnlockProtectedChat = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      if (isAuthenticating) return

      const username = authUsername.trim()
      if (!username || !authPassword) return

      setIsAuthenticating(true)
      try {
        await authenticateChatAccess(username, authPassword)
        setShowAuthUnlockOption(true)
        setShowAuthForm(false)
        setAuthPassword('')
        addMessage({
          role: 'assistant',
          content: 'Protected chat access unlocked.\n\nNext step: Ask me what experiment you want to design.',
        })
      } catch (error) {
        addMessage({
          role: 'assistant',
          content: `Unable to unlock protected chat: ${formatChatErrorMessage(error)}\n\nPlease try again.`,
        })
      } finally {
        setIsAuthenticating(false)
      }
    },
    [authUsername, authPassword, isAuthenticating, addMessage]
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
          randomization: {
            unit: experimentStore.randomization.unit,
            bucketingStrategy: experimentStore.randomization.bucketingStrategy,
            consistentAssignment: experimentStore.randomization.consistentAssignment,
            sampleRatio: experimentStore.randomization.sampleRatio,
            stratificationVariables: experimentStore.randomization.stratificationVariables.map((v) => ({
              name: v.name,
              values: v.values,
            })),
          },
          varianceReduction: {
            useCUPED: experimentStore.varianceReduction.useCUPED,
            cupedCovariate: experimentStore.varianceReduction.cupedCovariate,
            cupedExpectedReduction: experimentStore.varianceReduction.cupedExpectedReduction,
            useStratification: experimentStore.varianceReduction.useStratification,
            useMatchedPairs: experimentStore.varianceReduction.useMatchedPairs,
            useBlocking: experimentStore.varianceReduction.useBlocking,
          },
          riskAssessment: {
            riskLevel: experimentStore.riskAssessment.riskLevel,
            blastRadius: experimentStore.riskAssessment.blastRadius,
            preLaunchChecklistCompleted: experimentStore.riskAssessment.preLaunchChecklist.filter((i) => i.completed)
              .length,
            preLaunchChecklistTotal: experimentStore.riskAssessment.preLaunchChecklist.length,
          },
          monitoring: {
            refreshFrequency: experimentStore.monitoring.refreshFrequency,
            srmThreshold: experimentStore.monitoring.srmThreshold,
            multipleTestingCorrection: experimentStore.monitoring.multipleTestingCorrection,
          },
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
        if (err instanceof Error && /chat authentication required|invalid chat credentials|unauthorized/i.test(err.message)) {
          setShowAuthUnlockOption(true)
          setShowStarterOptions(true)
          setShowAuthForm(true)
        }
        addMessage({
          role: 'assistant',
          content: `Sorry, I encountered an error: ${formatChatErrorMessage(err)}\n\nPlease try again.`,
        })
      } finally {
        setLoading(false)
      }
    },
    [input, isLoading, messages, apiKey, isDemo, experimentStore, addMessage, setLoading, applyFunctionCalls]
  )

  const handleInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  if (!isDialogVisible) return null

  return (
    <div
      ref={dialogRef}
      className={`flex min-h-0 flex-col overflow-hidden ${
        isPopupMode
          ? isCompactViewport
            ? 'fixed inset-x-0 bottom-0 z-[100] h-[50dvh] rounded-t-2xl border-x border-t border-slate-200 bg-white shadow-xl shadow-slate-200/60 animate-in'
            : 'fixed z-[100] rounded-[1.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60 animate-in'
          : 'relative h-full w-full bg-gradient-to-b from-primary-50/30 via-white to-white'
      }`}
      style={
        isPopupMode && !isCompactViewport
          ? {
              left: pos.x,
              top: pos.y,
              width: size.w,
              height: size.h,
            }
          : undefined
      }
    >
      {isPopupMode && (
        <style>{`
          @keyframes animate-in {
            from { opacity: 0; transform: translateY(16px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-in { animation: animate-in 0.25s ease-out; }
        `}</style>
      )}

      {isPopupMode && !isCompactViewport && (
        <div
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          className="absolute top-0 left-0 w-4 h-4 z-10 cursor-nw-resize"
          style={{ touchAction: 'none' }}
        >
          <svg className="w-3 h-3 m-0.5 text-slate-400/80 rotate-180" viewBox="0 0 10 10" fill="currentColor">
            <path d="M0 10L10 0v3L3 10z" />
            <path d="M0 10L10 0v0.5L0.5 10z" opacity="0.5" />
            <path d="M4 10L10 4v3L7 10z" />
          </svg>
        </div>
      )}

      <div
        className={`shrink-0 ${
          isPopupMode ? '' : 'border-b border-slate-200 bg-gradient-to-r from-primary-50/40 via-white to-primary-50/20 px-4 py-3 sm:px-6 lg:px-8'
        }`}
      >
        <div
          onPointerDown={isPopupMode && !isCompactViewport ? onDragStart : undefined}
          onPointerMove={isPopupMode && !isCompactViewport ? onDragMove : undefined}
          onPointerUp={isPopupMode && !isCompactViewport ? onDragEnd : undefined}
          className={`flex items-center justify-between select-none ${
            isPopupMode
              ? `h-12 px-4 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 text-white ${
                  isCompactViewport ? '' : 'cursor-grab active:cursor-grabbing'
                }`
              : 'h-[51px] text-slate-900'
          }`}
          style={isPopupMode && !isCompactViewport ? { touchAction: 'none' } : undefined}
        >
          <div className={`flex items-center gap-2.5 ${isPopupMode ? 'pointer-events-none' : ''}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isPopupMode ? 'bg-white/20' : 'bg-primary-100'}`}>
              <svg className={`h-4 w-4 ${isPopupMode ? 'text-primary-100' : 'text-primary-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">Experiment Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {isReady && messages.length > 0 && (
              <button
                onClick={() => {
                  resetConversation()
                }}
                className={`rounded-lg p-1.5 transition-colors ${
                  isPopupMode ? 'text-primary-100/80 hover:bg-white/20 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }`}
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
            {isPopupMode && (
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-primary-100/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <>
        <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-primary-50/30 via-white to-white p-4">
          {messages.map((msg) => (
            <AIChatMessage key={msg.id} message={msg} />
          ))}

          {shouldShowStarterOptions && (
            <div className="w-full max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white p-3 shadow-sm">
              <div className="space-y-2">
                {showAuthUnlockOption && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAuthForm((prev) => !prev)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors transition-transform hover:border-primary-200 hover:bg-primary-50 active:translate-y-px"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Unlock protected chat</div>
                        <div className="text-xs text-slate-500">Authenticate once to use server-protected chat access</div>
                      </div>
                    </button>

                    {showAuthForm && (
                      <form onSubmit={handleUnlockProtectedChat} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Username
                          <input
                            type="text"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            autoComplete="username"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                          />
                        </label>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Password
                          <input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            autoComplete="current-password"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                          />
                        </label>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">Session stored as HttpOnly cookie.</span>
                          <button
                            type="submit"
                            disabled={!authUsername.trim() || !authPassword || isAuthenticating}
                            className="rounded-lg border border-primary-600 bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-primary-500 hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isAuthenticating ? 'Unlocking...' : 'Unlock'}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}

                <button
                  onClick={() => startSelfGuidedDemo()}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors transition-transform hover:border-primary-200 hover:bg-primary-50 active:translate-y-px"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Start a new experiment</div>
                    <div className="text-xs text-slate-500">Begin a fresh experiment setup from scratch</div>
                  </div>
                </button>
                <button
                  onClick={() => applyDemoSetupPreset(SIMPLE_AB_DEMO_PRESET)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors transition-transform hover:border-primary-200 hover:bg-primary-50 active:translate-y-px"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Simple Demo: Red vs Blue Button</div>
                    <div className="text-xs text-slate-500">A/B test preset with full metrics and export-ready setup</div>
                  </div>
                </button>
                <button
                  onClick={() => applyDemoSetupPreset(COMPLEX_CLUSTER_DEMO_PRESET)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors transition-transform hover:border-primary-200 hover:bg-primary-50 active:translate-y-px"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Complex Demo: Cluster Messaging Test</div>
                    <div className="text-xs text-slate-500">Network-effect cluster preset with advanced guardrails</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-primary-50 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex shrink-0 flex-col gap-1 border-t border-slate-200 bg-white p-3">
          <div className="flex items-stretch gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={isReady ? 'Describe your experiment...' : 'Choose an option above to start...'}
              disabled={isLoading || !isReady}
              rows={2}
              className="min-h-[44px] max-h-36 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !isReady || !input.trim()}
              aria-label="Send message (Cmd+Enter)"
              className="rounded-xl border border-primary-600 bg-primary-600 px-3 py-2 text-white transition-colors transition-transform hover:border-primary-500 hover:bg-primary-500 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
          {isReady && (
            <p className="px-1 text-[11px] text-slate-500">Press Cmd+Enter to send.</p>
          )}
        </form>
      </>
    </div>
  )
}
