import type { ExperimentType } from '@/types'

export interface ExperimentState {
  experimentType: ExperimentType | null
  name: string
  hypothesis: string
  metrics: Array<{ name: string; category: string; type: string; baseline: number }>
  dailyTraffic: number
  mde: number
  hasSampleSizeResult: boolean
  currentStep: number
  randomization: {
    unit: string
    bucketingStrategy: string
    consistentAssignment: boolean
    sampleRatio: number[]
    stratificationVariables: Array<{ name: string; values: string[] }>
  }
  varianceReduction: {
    useCUPED: boolean
    cupedCovariate?: string
    cupedExpectedReduction?: number
    useStratification: boolean
    useMatchedPairs: boolean
    useBlocking: boolean
  }
  riskAssessment: {
    riskLevel: string
    blastRadius: number
    preLaunchChecklistCompleted: number
    preLaunchChecklistTotal: number
  }
  monitoring: {
    refreshFrequency: number
    srmThreshold: number
    multipleTestingCorrection: string
  }
}

export function buildSystemPrompt(currentState: ExperimentState): string {
  // --- Build a detailed progress snapshot ---
  const progress: string[] = []
  const missing: string[] = []

  if (currentState.experimentType) {
    progress.push(`Step 1 type: ${currentState.experimentType.replace(/_/g, ' ')}`)
  } else {
    missing.push('Step 1: experiment type')
  }

  if (currentState.metrics.length > 0) {
    const metricSummary = currentState.metrics
      .map((m) => `${m.name} (${m.category}, ${m.type}, baseline=${m.baseline})`)
      .join(', ')
    progress.push(`Step 2 metrics (${currentState.metrics.length}): ${metricSummary}`)
    const hasPrimary = currentState.metrics.some((m) => m.category === 'PRIMARY')
    const hasGuardrail = currentState.metrics.some((m) => m.category === 'GUARDRAIL')
    if (!hasPrimary) missing.push('Step 2: add a PRIMARY metric')
    if (!hasGuardrail) missing.push('Step 2: add at least one GUARDRAIL metric')
  } else {
    missing.push('Step 2: metrics — at least one PRIMARY metric is required')
  }

  if (currentState.dailyTraffic > 0) {
    progress.push(`Step 3 daily traffic: ${currentState.dailyTraffic.toLocaleString()}`)
  } else {
    missing.push('Step 3: daily traffic estimate')
  }

  if (currentState.mde > 0) {
    progress.push(`Step 3 MDE: ${currentState.mde}%`)
  } else {
    missing.push('Step 3: minimum detectable effect')
  }

  if (currentState.hasSampleSizeResult) {
    progress.push('Step 3 sample size: calculated')
  }

  const ratio = currentState.randomization.sampleRatio.join('/')
  progress.push(
    `Step 4 randomization: unit=${currentState.randomization.unit}, bucketing=${currentState.randomization.bucketingStrategy}, consistent=${currentState.randomization.consistentAssignment}, split=${ratio}`
  )

  const varianceFlags: string[] = []
  if (currentState.varianceReduction.useCUPED) {
    varianceFlags.push(`CUPED(${currentState.varianceReduction.cupedExpectedReduction ?? 0}%)`)
  }
  if (currentState.varianceReduction.useStratification) {
    varianceFlags.push('post-stratification')
  }
  if (currentState.varianceReduction.useMatchedPairs) {
    varianceFlags.push('matched-pairs')
  }
  if (currentState.varianceReduction.useBlocking) {
    varianceFlags.push('blocking')
  }
  progress.push(
    `Step 5 variance reduction: ${varianceFlags.length > 0 ? varianceFlags.join(', ') : 'none enabled'}`
  )

  progress.push(
    `Step 6 risk: level=${currentState.riskAssessment.riskLevel}, blast radius=${currentState.riskAssessment.blastRadius}%, checklist=${currentState.riskAssessment.preLaunchChecklistCompleted}/${currentState.riskAssessment.preLaunchChecklistTotal}`
  )

  progress.push(
    `Step 7 monitoring: refresh=${currentState.monitoring.refreshFrequency}m, SRM=${currentState.monitoring.srmThreshold}, correction=${currentState.monitoring.multipleTestingCorrection}`
  )

  if (currentState.name) {
    progress.push(`Step 8 name: "${currentState.name}"`)
  } else {
    missing.push('Step 8: experiment name')
  }

  if (currentState.hypothesis) {
    progress.push(`Step 8 hypothesis: "${currentState.hypothesis}"`)
  } else {
    missing.push('Step 8: hypothesis')
  }

  const progressSection =
    progress.length > 0
      ? `Already configured:\n${progress.map((p) => `  - ${p}`).join('\n')}`
      : 'Nothing configured yet.'

  const missingSection =
    missing.length > 0
      ? `Still needed:\n${missing.map((m) => `  - ${m}`).join('\n')}`
      : 'All fields are configured.'

  const hasCoreConfigured =
    !!currentState.experimentType &&
    currentState.metrics.length > 0 &&
    currentState.metrics.some((m) => m.category === 'PRIMARY') &&
    currentState.metrics.some((m) => m.category === 'GUARDRAIL') &&
    currentState.dailyTraffic > 0 &&
    currentState.mde > 0

  const isLikelyComplete = hasCoreConfigured && !!currentState.name && !!currentState.hypothesis && currentState.currentStep >= 8

  return `You are an AI experiment design assistant embedded in an Experiment Designer tool. Your ONLY purpose is to help users design statistically rigorous experiments.

## STRICT RULES
- You MUST ONLY discuss topics related to experiment design, A/B testing, statistical testing, metrics, and related experimentation topics.
- If the user asks about ANYTHING unrelated (coding help, general knowledge, creative writing, etc.), politely decline: "I'm specifically designed to help with experiment design. Let me help you set up your experiment instead! What are you trying to test?"
- Keep responses concise (3-5 sentences max per message, unless explaining a recommendation).
- Be conversational and helpful, not overly formal.

## CURRENT EXPERIMENT STATE
${progressSection}

${missingSection}

The user is on step ${currentState.currentStep} of 8.${isLikelyComplete ? '\n\nThe experiment looks complete — help the user finalize export or refine details.' : ''}

## PROACTIVE GUIDANCE — CRITICAL
You MUST actively drive the conversation toward completing the experiment setup. After EVERY response:
1. Briefly acknowledge what the user said or what you just configured.
2. Immediately suggest the next wizard step with one concrete action or question.
3. Infer and pre-fill values from context whenever possible, then ask for confirmation.

## RESPONSE FORMAT — REQUIRED
- You MUST end every assistant message with one line that starts with: **"Next step:"**
- The "Next step:" line must mention the wizard step number when possible.
- Do not end with a generic statement. Always include one concrete user action.

## STEP ORDER — DO NOT SKIP
Move through steps in order from 1 to 8. Do NOT skip Steps 4-7.
- Even when defaults are sensible, still walk through each step, summarize the recommended setting, and confirm.
- Only skip a step if the user explicitly asks to skip it.
- Do not jump to Step 8 details before discussing Steps 4, 5, 6, and 7.

### Priority order for what to configure next:
1. Step 1: Experiment type
2. Step 2: Primary metric + at least one guardrail
3. Step 3: Daily traffic and MDE
4. Step 4: Randomization strategy
5. Step 5: Variance reduction plan
6. Step 6: Risk assessment and checklist stance
7. Step 7: Monitoring and stopping rules
8. Step 8: Name/hypothesis/description + export guidance

## INCREMENTAL CONFIGURATION
You have separate tool functions for each section. Configure each as soon as enough information is available.

1. **Step 1** — Call \`set_experiment_type\`.
2. **Step 2** — Call \`set_metrics\`.
3. **Step 3** — Call \`set_statistical_params\`.
4. **Step 4** — Call \`set_randomization\` with explicit values (unit, bucketing, consistency).
5. **Step 5** — Call \`set_variance_reduction\` with the selected techniques (or explicitly keep them off).
6. **Step 6** — Call \`set_risk_assessment\` (risk level, blast radius, mitigation/rollback defaults as applicable).
7. **Step 7** — Call \`set_monitoring\` (refresh, SRM threshold, correction, stopping rules, decision criteria).
8. **Step 8** — Call \`set_experiment_details\` for name/hypothesis/description.

Use multiple function calls in one response only when they are adjacent steps and clearly resolved.

## INFERENCE RULES
- If user intent is clear (e.g., "test checkout flow"), infer AB_TEST and propose likely metrics immediately.
- For conversion rates, use BINARY and decimal baseline (e.g., 0.03 for 3%).
- For revenue/time/latency, use CONTINUOUS.
- For counts (orders/messages/sessions), use COUNT.
- Always add at least one guardrail metric.

## WHEN CORE FIELDS ARE READY
When Steps 1-3 are set, continue with Step 4 instead of jumping to summary.
After Step 7 is configured, generate Step 8 details and guide the user to export/review.`
}

// --- Per-step tool function definitions ---

export const AI_TOOL_FUNCTIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'set_experiment_type',
      description: 'Set the experiment type. Call this as soon as you can recommend a type based on the user context.',
      parameters: {
        type: 'object' as const,
        properties: {
          experimentType: {
            type: 'string',
            enum: ['AB_TEST', 'CLUSTER', 'SWITCHBACK', 'CAUSAL_INFERENCE', 'FACTORIAL', 'MAB'],
            description: 'The recommended experiment type',
          },
        },
        required: ['experimentType'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_metrics',
      description: 'Add metrics to track. Include at least one PRIMARY metric and at least one GUARDRAIL metric.',
      parameters: {
        type: 'object' as const,
        properties: {
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: { type: 'string', enum: ['PRIMARY', 'SECONDARY', 'GUARDRAIL', 'MONITOR'] },
                type: { type: 'string', enum: ['BINARY', 'CONTINUOUS', 'COUNT'] },
                direction: { type: 'string', enum: ['INCREASE', 'DECREASE', 'EITHER'] },
                baseline: {
                  type: 'number',
                  description: 'Estimated baseline value (rate as decimal for binary, e.g. 0.03 for 3%)',
                },
              },
              required: ['name', 'category', 'type', 'direction', 'baseline'],
            },
            description: 'Metrics to add or update',
          },
        },
        required: ['metrics'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_statistical_params',
      description: 'Set sample size parameters (MDE and daily traffic).',
      parameters: {
        type: 'object' as const,
        properties: {
          mde: { type: 'number', description: 'Minimum detectable effect as percentage (e.g., 5 for 5%)' },
          dailyTraffic: { type: 'number', description: 'Estimated daily traffic / daily active users' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_randomization',
      description: 'Configure Step 4 randomization settings.',
      parameters: {
        type: 'object' as const,
        properties: {
          unit: {
            type: 'string',
            enum: ['USER_ID', 'SESSION', 'DEVICE', 'REQUEST', 'CLUSTER'],
          },
          bucketingStrategy: {
            type: 'string',
            enum: ['HASH_BASED', 'RANDOM'],
          },
          consistentAssignment: { type: 'boolean' },
          sampleRatio: {
            type: 'array',
            items: { type: 'number' },
            description: 'Traffic split percentages, e.g. [50, 50]',
          },
          stratificationVariables: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                values: { type: 'array', items: { type: 'string' } },
              },
              required: ['name'],
            },
          },
          rationale: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_variance_reduction',
      description: 'Configure Step 5 variance reduction settings.',
      parameters: {
        type: 'object' as const,
        properties: {
          useCUPED: { type: 'boolean' },
          cupedCovariate: { type: 'string' },
          cupedExpectedReduction: { type: 'number' },
          useStratification: { type: 'boolean' },
          stratificationVariables: {
            type: 'array',
            items: { type: 'string' },
          },
          useMatchedPairs: { type: 'boolean' },
          useBlocking: { type: 'boolean' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_risk_assessment',
      description: 'Configure Step 6 risk assessment settings.',
      parameters: {
        type: 'object' as const,
        properties: {
          riskLevel: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          blastRadius: { type: 'number' },
          potentialNegativeImpacts: { type: 'array', items: { type: 'string' } },
          mitigationStrategies: { type: 'array', items: { type: 'string' } },
          rollbackTriggers: { type: 'array', items: { type: 'string' } },
          circuitBreakers: { type: 'array', items: { type: 'string' } },
          preLaunchChecklistCompletedIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Checklist ids that should be marked completed',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_monitoring',
      description: 'Configure Step 7 monitoring and stopping settings.',
      parameters: {
        type: 'object' as const,
        properties: {
          refreshFrequency: { type: 'number' },
          srmThreshold: { type: 'number' },
          multipleTestingCorrection: {
            type: 'string',
            enum: ['NONE', 'BONFERRONI', 'BENJAMINI_HOCHBERG', 'HOLM'],
          },
          stoppingRules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['SUCCESS', 'FUTILITY', 'HARM'] },
                description: { type: 'string' },
                threshold: { type: 'number' },
                metricId: { type: 'string' },
              },
              required: ['type', 'description'],
            },
          },
          decisionCriteria: {
            type: 'object',
            properties: {
              ship: { type: 'array', items: { type: 'string' } },
              iterate: { type: 'array', items: { type: 'string' } },
              kill: { type: 'array', items: { type: 'string' } },
            },
            required: [],
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_experiment_details',
      description: 'Set Step 8 experiment name, hypothesis, and/or description.',
      parameters: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'A short descriptive name for the experiment' },
          hypothesis: {
            type: 'string',
            description:
              'The hypothesis in this format: If we [change], then [metric] will [direction] because [reason]',
          },
          description: { type: 'string', description: 'Brief description of the experiment' },
        },
        required: ['name'],
      },
    },
  },
]
