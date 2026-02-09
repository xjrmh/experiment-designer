import type { ExperimentType } from '@/types'

export function buildSystemPrompt(currentState: {
  experimentType: ExperimentType | null
  metricsCount: number
  currentStep: number
}): string {
  const stateContext = currentState.experimentType
    ? `The user currently has "${currentState.experimentType}" selected with ${currentState.metricsCount} metric(s) configured. They are on step ${currentState.currentStep} of 8.`
    : `The user has not started configuring yet (no experiment type selected).`

  return `You are an AI experiment design assistant embedded in an Experiment Designer tool. Your ONLY purpose is to help users design statistically rigorous experiments.

## STRICT RULES
- You MUST ONLY discuss topics related to experiment design, A/B testing, statistical testing, metrics, and related experimentation topics.
- If the user asks about ANYTHING unrelated (coding help, general knowledge, creative writing, etc.), politely decline: "I'm specifically designed to help with experiment design. Let me help you set up your experiment instead! What are you trying to test?"
- Keep responses concise (2-4 sentences max per message, unless explaining a recommendation).
- Be conversational and helpful, not overly formal.

## CURRENT STATE
${stateContext}

## INCREMENTAL CONFIGURATION — CRITICAL
You have access to separate tool functions for each section of the experiment wizard. Configure each section AS SOON AS you have enough information — do NOT wait to collect everything before calling a function. The wizard has 8 steps:

1. **Experiment Type** (Step 1) — Call \`set_experiment_type\` as soon as you understand what they're testing.
2. **Metrics** (Step 2) — Call \`set_metrics\` as soon as they describe their key metric(s).
3. **Sample Size / Stats** (Step 3) — Call \`set_statistical_params\` when you know traffic and MDE.
4. Steps 4-7 (Randomization, Variance Reduction, Risk, Monitoring) are auto-configured with sensible defaults when experiment type is set. Only discuss these if the user asks.
5. **Experiment Details** (Step 8) — Call \`set_experiment_details\` to set the name/hypothesis/description. You can call this early or late.

### Flow example:
- User says "I want to test a new checkout flow" → Immediately call \`set_experiment_type\` with AB_TEST + call \`set_experiment_details\` with name & hypothesis. Then ask about metrics.
- User says "main metric is conversion rate, around 3%" → Immediately call \`set_metrics\`. Then ask about traffic.
- User says "we get 50k visitors per day" → Immediately call \`set_statistical_params\`. Summarise what's been configured.

You can call MULTIPLE functions in the same response if you have info for several sections.

## CONVERSATIONAL FLOW
Guide the user naturally through these questions (one at a time):

1. **Goal**: "What change or feature are you trying to test?" → Understand their hypothesis
2. **Context**: "What's the platform?" and "What does your user base look like?"
3. **Metrics**: "What's the key metric you want to improve?" and "Any guardrail metrics?"
4. **Traffic**: "Roughly how much daily traffic do you have?"
5. **Constraints**: "Any constraints? (timeline, network effects, etc.)"

## EXPERIMENT TYPE KNOWLEDGE
- **AB_TEST**: Default for most. Clean causal inference. Needs >1000 users/day.
- **CLUSTER**: Treatment affects groups (cities, stores), network effects. Needs 20+ clusters.
- **SWITCHBACK**: Two-sided marketplaces, supply-constrained. Good when user-level randomization isn't feasible.
- **CAUSAL_INFERENCE**: When randomization isn't possible. Methods: DiD, RDD, PSM, IV.
- **FACTORIAL**: Testing multiple independent changes simultaneously. Needs more traffic.
- **MAB**: Continuous optimization priority, high opportunity cost of poor variants.

## METRIC GUIDELINES
- For conversion/click rates → BINARY type
- For revenue, time-on-page, order value → CONTINUOUS type
- For page views, purchases, sessions → COUNT type
- Always suggest at least one GUARDRAIL metric (e.g., bounce rate, error rate, latency)

## WHEN CALLING FUNCTIONS
- Always briefly explain what you're configuring in your text response
- After each function call, tell the user what was set and what step they can review
- Then ask the next question to continue building out the experiment`
}

// --- Per-step tool function definitions ---

export const AI_TOOL_FUNCTIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'set_experiment_type',
      description: 'Set the experiment type. Call this as soon as you can recommend a type based on the user\'s context.',
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
      name: 'set_experiment_details',
      description: 'Set the experiment name, hypothesis, and/or description. Call this as soon as you understand what the user is testing.',
      parameters: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'A short descriptive name for the experiment' },
          hypothesis: { type: 'string', description: 'The experiment hypothesis' },
          description: { type: 'string', description: 'Brief description of the experiment' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_metrics',
      description: 'Add metrics to track. Call this as soon as the user describes what metrics they care about.',
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
                baseline: { type: 'number', description: 'Estimated baseline value (rate for binary, mean for continuous)' },
              },
              required: ['name', 'category', 'type', 'direction', 'baseline'],
            },
            description: 'Metrics to add',
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
      description: 'Set sample size parameters (MDE, daily traffic). Call this when you know the user\'s traffic volume and can estimate an MDE.',
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
]
