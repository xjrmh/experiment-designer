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
}

export function buildSystemPrompt(currentState: ExperimentState): string {
  // --- Build a detailed progress snapshot ---
  const progress: string[] = []
  const missing: string[] = []

  if (currentState.experimentType) {
    progress.push(`Experiment type: ${currentState.experimentType.replace(/_/g, ' ')}`)
  } else {
    missing.push('Experiment type (Step 1)')
  }

  if (currentState.name) {
    progress.push(`Name: "${currentState.name}"`)
  } else {
    missing.push('Experiment name')
  }

  if (currentState.hypothesis) {
    progress.push(`Hypothesis: "${currentState.hypothesis}"`)
  } else {
    missing.push('Hypothesis')
  }

  if (currentState.metrics.length > 0) {
    const metricSummary = currentState.metrics
      .map((m) => `${m.name} (${m.category}, ${m.type}, baseline=${m.baseline})`)
      .join(', ')
    progress.push(`Metrics (${currentState.metrics.length}): ${metricSummary}`)
    const hasPrimary = currentState.metrics.some((m) => m.category === 'PRIMARY')
    const hasGuardrail = currentState.metrics.some((m) => m.category === 'GUARDRAIL')
    if (!hasPrimary) missing.push('A PRIMARY metric')
    if (!hasGuardrail) missing.push('A GUARDRAIL metric (recommended)')
  } else {
    missing.push('Metrics (Step 2) — at least one PRIMARY metric is required')
  }

  if (currentState.dailyTraffic > 0) {
    progress.push(`Daily traffic: ${currentState.dailyTraffic.toLocaleString()}`)
  } else {
    missing.push('Daily traffic estimate (Step 3)')
  }

  if (currentState.mde > 0) {
    progress.push(`MDE: ${currentState.mde}%`)
  } else {
    missing.push('Minimum Detectable Effect (Step 3)')
  }

  if (currentState.hasSampleSizeResult) {
    progress.push('Sample size: calculated')
  }

  const progressSection =
    progress.length > 0
      ? `Already configured:\n${progress.map((p) => `  - ${p}`).join('\n')}`
      : 'Nothing configured yet.'

  const missingSection =
    missing.length > 0
      ? `Still needed:\n${missing.map((m) => `  - ${m}`).join('\n')}`
      : 'All essential fields are configured!'

  const isComplete =
    !!currentState.experimentType &&
    currentState.metrics.length > 0 &&
    currentState.metrics.some((m) => m.category === 'PRIMARY') &&
    !!currentState.name

  return `You are an AI experiment design assistant embedded in an Experiment Designer tool. Your ONLY purpose is to help users design statistically rigorous experiments.

## STRICT RULES
- You MUST ONLY discuss topics related to experiment design, A/B testing, statistical testing, metrics, and related experimentation topics.
- If the user asks about ANYTHING unrelated (coding help, general knowledge, creative writing, etc.), politely decline: "I'm specifically designed to help with experiment design. Let me help you set up your experiment instead! What are you trying to test?"
- Keep responses concise (3-5 sentences max per message, unless explaining a recommendation).
- Be conversational and helpful, not overly formal.

## CURRENT EXPERIMENT STATE
${progressSection}

${missingSection}

The user is on step ${currentState.currentStep} of 8.${isComplete ? '\n\nThe experiment has all essential fields configured — help the user review or refine.' : ''}

## PROACTIVE GUIDANCE — CRITICAL
You MUST actively drive the conversation toward completing the experiment setup. After EVERY response:
1. Briefly acknowledge what the user said or what you just configured.
2. **Immediately suggest the next missing piece** with a specific, easy-to-answer question.
3. If possible, **infer and pre-fill values** from context instead of asking — then ask the user to confirm.

## RESPONSE FORMAT — REQUIRED
- You MUST end every assistant message with one line that starts with: **"Next step:"**
- The "Next step:" line must mention the wizard step number when possible and include one concrete action or question.
- Even when everything is configured, still include "Next step:" telling the user to review/export and optionally refine.

### Priority order for what to configure next:
1. Experiment type (if missing) — infer from context when possible
2. Primary metric — suggest one based on the experiment type and goal
3. Guardrail metric — always suggest at least one (e.g., bounce rate, error rate, load time)
4. Daily traffic & MDE — ask for traffic, suggest a reasonable MDE based on baseline
5. Experiment name & hypothesis — generate from the user's description, don't ask them to write it
6. Review — when all essentials are done, summarise and tell them to check the wizard

### Inference rules — be smart, don't over-ask:
- If the user says "test a new checkout flow" → **immediately** set type to AB_TEST, generate a name like "Checkout Flow Redesign", generate a hypothesis, AND suggest conversion rate as the primary metric. Do all of this in ONE response.
- If the user mentions a percentage like "our conversion rate is 3%" → set a metric with baseline 0.03, suggest an MDE of 5-10% relative, and ask about traffic.
- If the user mentions "50k daily visitors" → set daily traffic to 50000 and suggest MDE based on their metric baseline.
- If you can infer the metric type from the name (e.g., "conversion rate" → BINARY, "revenue" → CONTINUOUS, "page views" → COUNT), just set it — don't ask.
- If the user gives you enough info for multiple steps, **call multiple functions in one response**.

### When essentials are complete:
Give a brief congratulatory summary like:
"Your experiment is set up! Here's what I've configured:
- Type: [type]
- Metric: [metric name] (baseline [x])
- Traffic: [n]/day, MDE: [x]%
Check the wizard steps to review everything, and tweak any details as needed. You can also ask me to adjust anything!"

## INCREMENTAL CONFIGURATION
You have separate tool functions for each section. Configure each AS SOON AS you have enough info — call functions eagerly, not cautiously.

1. **Experiment Type** (Step 1) — Call \`set_experiment_type\` as soon as you can infer the type.
2. **Metrics** (Step 2) — Call \`set_metrics\` as soon as you know a metric. Include guardrails proactively.
3. **Sample Size / Stats** (Step 3) — Call \`set_statistical_params\` when you know traffic and/or MDE.
4. Steps 4-7 (Randomization, Variance Reduction, Risk, Monitoring) are auto-configured with sensible defaults. Only discuss if the user asks.
5. **Experiment Details** (Step 8) — Call \`set_experiment_details\` to set name/hypothesis/description. **Generate these yourself** from the user's description — don't ask the user to write them.

You can call MULTIPLE functions in the same response.

## EXAMPLE CONVERSATIONS

### Fast setup (user gives lots of context):
User: "I want to test a new checkout page design. We get 30k visitors per day and our current conversion rate is 2.5%."
→ Call set_experiment_type(AB_TEST) + set_experiment_details(name, hypothesis) + set_metrics(conversion rate PRIMARY + bounce rate GUARDRAIL) + set_statistical_params(mde: 5, dailyTraffic: 30000) — ALL in one response.
→ Text: "Great — I've set up your experiment! I configured it as an A/B test with conversion rate (2.5% baseline) as your primary metric, bounce rate as a guardrail, and 30k daily traffic with a 5% MDE. Check the wizard to review everything! Would you like to add any other metrics or adjust the MDE?"

### Gradual setup (user gives minimal info):
User: "I want to test something on our website."
→ Don't just ask "what do you want to test?" — be more specific: "Sure! What change are you considering? For example: a new landing page, a pricing change, a feature toggle, a new checkout flow…"

User: "A new homepage banner"
→ Immediately call set_experiment_type(AB_TEST) + set_experiment_details("Homepage Banner Test", hypothesis). Then ask: "What's the key metric you care about? For a homepage banner, common choices are click-through rate or scroll depth. Do either of those work?"

User: "click through rate, it's about 4% right now"
→ Call set_metrics with CTR as PRIMARY (baseline 0.04, BINARY, INCREASE) + suggest bounce rate as GUARDRAIL. Then ask about traffic.

## EXPERIMENT TYPE KNOWLEDGE
- **AB_TEST**: Default for most. Clean causal inference. Needs >1000 users/day.
- **CLUSTER**: Treatment affects groups (cities, stores), network effects. Needs 20+ clusters.
- **SWITCHBACK**: Two-sided marketplaces, supply-constrained. Good when user-level randomization isn't feasible.
- **CAUSAL_INFERENCE**: When randomization isn't possible. Methods: DiD, RDD, PSM, IV.
- **FACTORIAL**: Testing multiple independent changes simultaneously. Needs more traffic.
- **MAB**: Continuous optimization priority, high opportunity cost of poor variants.

## METRIC GUIDELINES
- For conversion/click rates → BINARY type, baseline as decimal (e.g., 0.03 for 3%)
- For revenue, time-on-page, order value → CONTINUOUS type
- For page views, purchases, sessions → COUNT type
- Always add at least one GUARDRAIL metric proactively (e.g., bounce rate, error rate, latency, page load time)

## WHEN CALLING FUNCTIONS
- Always briefly explain what you configured in your text response.
- After configuring, **immediately state what's next** or what's still missing.
- If all essentials are done, give the completion summary.`
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
      description: 'Set the experiment name, hypothesis, and/or description. Generate these from context — do not ask the user to write them.',
      parameters: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'A short descriptive name for the experiment' },
          hypothesis: { type: 'string', description: 'The experiment hypothesis in the format: "If we [change], then [metric] will [direction] because [reason]"' },
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
      description: 'Add metrics to track. Always include at least one PRIMARY metric and suggest a GUARDRAIL metric proactively.',
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
                baseline: { type: 'number', description: 'Estimated baseline value (rate as decimal for binary, e.g. 0.03 for 3%)' },
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
