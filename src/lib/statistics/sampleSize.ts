import jStat from 'jstat'
import type { SampleSizeInput, SampleSizeResult } from '@/types'

/**
 * Calculate sample size for a two-sample test
 * Routes to type-specific adjustments based on experimentType
 */
export function calculateSampleSize(input: SampleSizeInput): SampleSizeResult {
  const { alpha, power, baseline, mde, mdeType, metricType, variants, trafficAllocation } = input

  // Calculate effect size
  const effectSize = mdeType === 'relative' ? baseline * (mde / 100) : mde

  let sampleSizePerVariant: number
  const assumptions: string[] = []
  const warnings: string[] = []

  if (metricType === 'binary') {
    sampleSizePerVariant = calculateSampleSizeForProportions({
      alpha,
      power,
      p1: baseline,
      p2: baseline + effectSize,
      variants,
    })
    assumptions.push(`Baseline conversion rate: ${(baseline * 100).toFixed(2)}%`)
    assumptions.push(`Minimum detectable effect: ${mdeType === 'relative' ? `${mde}%` : effectSize.toFixed(4)}`)
  } else if (metricType === 'continuous') {
    const variance = input.variance || (input.stdDev ? input.stdDev ** 2 : (baseline * 0.1) ** 2) // Default: 10% CV → σ = 0.1×μ, σ² = 0.01×μ²
    sampleSizePerVariant = calculateSampleSizeForContinuous({
      alpha,
      power,
      mean: baseline,
      effectSize,
      variance,
      variants,
    })
    assumptions.push(`Baseline mean: ${baseline.toFixed(2)}`)
    assumptions.push(`Variance: ${variance.toFixed(2)}`)
    assumptions.push(`Minimum detectable effect: ${mdeType === 'relative' ? `${mde}%` : effectSize.toFixed(2)}`)
  } else {
    // Count metrics - use Poisson approximation
    sampleSizePerVariant = calculateSampleSizeForCount({
      alpha,
      power,
      lambda: baseline,
      effectSize,
      variants,
    })
    assumptions.push(`Baseline rate (λ): ${baseline.toFixed(2)}`)
    assumptions.push(`Minimum detectable effect: ${effectSize.toFixed(2)}`)
  }

  // Adjust for traffic allocation
  const controlAllocation = trafficAllocation[0] / 100
  const treatmentAllocation = trafficAllocation[1] / 100

  // For unequal allocation, adjust sample size
  if (controlAllocation !== treatmentAllocation) {
    const allocationRatio = treatmentAllocation / controlAllocation
    sampleSizePerVariant = sampleSizePerVariant * ((1 + allocationRatio) ** 2) / (4 * allocationRatio)
    assumptions.push(`Adjusted for unequal traffic allocation (${trafficAllocation[0]}/${trafficAllocation[1]})`)
  }

  // Adjust for multiple variants
  if (variants > 2) {
    sampleSizePerVariant = sampleSizePerVariant * (variants - 1)
    assumptions.push(`Adjusted for ${variants} variants (including control)`)
    warnings.push(`Multiple variants increase required sample size. Consider multiple testing correction.`)
  }

  // === Type-specific adjustments ===
  const expType = input.experimentType
  let clustersNeeded: number | undefined
  let designEffect: number | undefined
  let effectivePeriods: number | undefined
  let totalCells: number | undefined
  let cellSampleSize: number | undefined
  let interactionSampleSize: number | undefined
  let estimatedRegret: number | undefined
  let isAdaptive: boolean | undefined
  let methodNotes: string[] | undefined

  // Cluster: apply design effect
  if (expType === 'CLUSTER' && input.icc != null && input.clusterSize != null) {
    const cluster = applyClusterDesignEffect(sampleSizePerVariant, input.icc, input.clusterSize)
    sampleSizePerVariant = cluster.adjustedN
    designEffect = cluster.deff
    clustersNeeded = cluster.clustersPerArm * variants
    assumptions.push(`Design effect (DEFF): ${cluster.deff.toFixed(2)}`)
    assumptions.push(`ICC: ${input.icc}, Avg cluster size: ${input.clusterSize}`)
    assumptions.push(`Clusters needed per arm: ${cluster.clustersPerArm}`)
    if (cluster.clustersPerArm < 10) {
      warnings.push('Fewer than 10 clusters per arm. Consider increasing cluster count for reliable inference.')
    }
  }

  // Switchback: adjust for autocorrelation
  if (expType === 'SWITCHBACK' && input.numPeriods != null && input.autocorrelation != null) {
    const sb = applySwitchbackAdjustment(sampleSizePerVariant, input.numPeriods, input.autocorrelation)
    sampleSizePerVariant = sb.adjustedN
    effectivePeriods = sb.effectivePeriods
    assumptions.push(`Autocorrelation (ρ): ${input.autocorrelation}`)
    assumptions.push(`Switchback periods: ${input.numPeriods}, Effective periods: ${sb.effectivePeriods}`)
    warnings.push('Switchback analysis assumes no carryover effects between periods.')
  }

  // Factorial: cell-based calculation
  if (expType === 'FACTORIAL' && input.factors && input.factors.length > 0) {
    const factorial = calculateFactorialSampleSize(sampleSizePerVariant, input.factors, input.detectInteraction ?? false)
    totalCells = factorial.totalCells
    cellSampleSize = factorial.cellSampleSize
    interactionSampleSize = factorial.interactionN
    const factorialTotal = input.detectInteraction && factorial.interactionN
      ? factorial.interactionN
      : factorial.totalN
    assumptions.push(`Factorial design: ${input.factors.map(f => `${f.name}(${f.levels})`).join(' × ')}`)
    assumptions.push(`Total cells: ${factorial.totalCells}`)
    if (input.detectInteraction) {
      assumptions.push('Sample size inflated ~4x for interaction detection')
    }
    // Warnings
    if (sampleSizePerVariant < 100) {
      warnings.push('Sample size per cell is very small. Results may be unreliable.')
    }

    return {
      sampleSizePerVariant: factorial.cellSampleSize,
      totalSampleSize: factorialTotal,
      calculatedPower: power,
      calculatedMDE: mdeType === 'relative' ? mde : (effectSize / baseline) * 100,
      assumptions,
      warnings: warnings.length > 0 ? warnings : undefined,
      totalCells,
      cellSampleSize,
      interactionSampleSize,
    }
  }

  // MAB: adaptive, show exploration budget
  if (expType === 'MAB') {
    isAdaptive = true
    const arms = input.numArms || variants
    const horizon = input.horizon || 100000
    const epsilon = input.explorationRate || 0.1
    const mab = calculateMABBudget(arms, horizon, epsilon)
    estimatedRegret = mab.estimatedRegret
    sampleSizePerVariant = mab.perArmExplore
    assumptions.push('MAB uses adaptive allocation; traditional sample size is informational only')
    assumptions.push(`Horizon: ${horizon.toLocaleString()} observations`)
    assumptions.push(`Exploration rate (ε): ${epsilon}`)
    assumptions.push(`Per-arm exploration budget: ${mab.perArmExplore.toLocaleString()}`)
    warnings.push('MAB does not follow fixed-sample statistical testing. Sample size shown is the exploration budget per arm.')

    return {
      sampleSizePerVariant: mab.perArmExplore,
      totalSampleSize: horizon,
      calculatedPower: power,
      calculatedMDE: mdeType === 'relative' ? mde : (effectSize / baseline) * 100,
      assumptions,
      warnings: warnings.length > 0 ? warnings : undefined,
      estimatedRegret,
      isAdaptive,
    }
  }

  // Causal Inference: method-specific adjustments
  if (expType === 'CAUSAL_INFERENCE') {
    methodNotes = []
    if (input.causalMethod === 'did') {
      if (input.serialCorrelation != null && input.serialCorrelation > 0) {
        const inflation = (1 + input.serialCorrelation) / (1 - input.serialCorrelation)
        sampleSizePerVariant = Math.ceil(sampleSizePerVariant * inflation)
        assumptions.push(`DiD serial correlation adjustment (AR(1) VIF): ${inflation.toFixed(2)}x`)
      }
      methodNotes.push('Difference-in-Differences assumes parallel trends in the absence of treatment.')
    } else if (input.causalMethod === 'rdd') {
      methodNotes.push('RDD: Sample size reflects units near the threshold. Effective n depends on bandwidth choice.')
      if (input.bandwidth) {
        assumptions.push(`RDD bandwidth: ${input.bandwidth}`)
      }
      warnings.push('RDD sample size is an approximation. Consult a statistician for bandwidth selection.')
    } else if (input.causalMethod === 'psm') {
      methodNotes.push('Propensity Score Matching: Effective sample size depends on match quality and overlap.')
      warnings.push('PSM requires sufficient overlap in covariates between treatment and control groups.')
    } else if (input.causalMethod === 'iv') {
      methodNotes.push('Instrumental Variables: Sample size depends on instrument strength (first-stage F-statistic).')
      warnings.push('IV estimates require a strong, valid instrument. Weak instruments lead to biased estimates.')
    }
  }

  // Round up to ensure adequate power
  sampleSizePerVariant = Math.ceil(sampleSizePerVariant)
  const totalSampleSize = sampleSizePerVariant * variants

  // General warnings
  if (sampleSizePerVariant < 100) {
    warnings.push('Sample size is very small. Results may be unreliable.')
  }
  if (mde < 1 && mdeType === 'relative') {
    warnings.push('Very small MDE requires large sample sizes and long experiment duration.')
  }
  if (alpha > 0.05) {
    warnings.push('Significance level is higher than standard 0.05. Risk of false positives increases.')
  }
  if (power < 0.8) {
    warnings.push('Statistical power is below recommended 0.8. Risk of false negatives increases.')
  }

  return {
    sampleSizePerVariant,
    totalSampleSize,
    calculatedPower: power,
    calculatedMDE: mdeType === 'relative' ? mde : (effectSize / baseline) * 100,
    assumptions,
    warnings: warnings.length > 0 ? warnings : undefined,
    clustersNeeded,
    designEffect,
    effectivePeriods,
    methodNotes,
  }
}

// === Type-specific helper functions ===

/**
 * Cluster: Apply design effect for intra-cluster correlation
 * DEFF = 1 + (m - 1) * ICC
 */
function applyClusterDesignEffect(
  nStandard: number,
  icc: number,
  clusterSize: number
): { adjustedN: number; deff: number; clustersPerArm: number } {
  const deff = 1 + (clusterSize - 1) * icc
  const adjustedN = Math.ceil(nStandard * deff)
  const clustersPerArm = Math.ceil(adjustedN / clusterSize)
  return { adjustedN, deff, clustersPerArm }
}

/**
 * Switchback: Adjust for temporal autocorrelation
 * Effective multiplier = (1 - ρ) / (1 + ρ)
 */
function applySwitchbackAdjustment(
  nStandard: number,
  numPeriods: number,
  autocorrelation: number
): { adjustedN: number; effectivePeriods: number } {
  const effectiveMultiplier = (1 - autocorrelation) / (1 + autocorrelation)
  const adjustedN = Math.ceil(nStandard / effectiveMultiplier)
  const effectivePeriods = Math.max(1, Math.floor(numPeriods * effectiveMultiplier))
  return { adjustedN, effectivePeriods }
}

/**
 * Factorial: Cell-based sample size
 * Total cells = product of all factor levels
 * Interaction detection requires ~4x per cell
 */
function calculateFactorialSampleSize(
  nPerCell: number,
  factors: Array<{ name: string; levels: number }>,
  detectInteraction: boolean
): { totalCells: number; cellSampleSize: number; totalN: number; interactionN?: number } {
  const totalCells = factors.reduce((product, f) => product * f.levels, 1)
  const cellSampleSize = Math.ceil(nPerCell)
  const totalN = cellSampleSize * totalCells
  const interactionN = detectInteraction ? cellSampleSize * 4 * totalCells : undefined
  return { totalCells, cellSampleSize, totalN, interactionN }
}

/**
 * MAB: Exploration budget calculation for epsilon-greedy
 */
function calculateMABBudget(
  numArms: number,
  horizon: number,
  explorationRate: number
): { exploreBudget: number; exploitBudget: number; perArmExplore: number; estimatedRegret: number } {
  const exploreBudget = Math.ceil(horizon * explorationRate)
  const exploitBudget = horizon - exploreBudget
  const perArmExplore = Math.ceil(exploreBudget / numArms)
  // During exploration, 1/K pulls randomly hit the best arm (zero regret)
  const estimatedRegret = explorationRate * horizon * (numArms - 1) / numArms
  return { exploreBudget, exploitBudget, perArmExplore, estimatedRegret }
}

// === Existing metric-type calculation functions ===

/**
 * Calculate sample size for proportions (binary metrics)
 */
function calculateSampleSizeForProportions(params: {
  alpha: number
  power: number
  p1: number
  p2: number
  variants: number
}): number {
  const { alpha, power, p1, p2 } = params
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const zBeta = jStat.normal.inv(power, 0, 1)
  const pPooled = (p1 + p2) / 2
  const n = (2 * (zAlpha + zBeta) ** 2 * pPooled * (1 - pPooled)) / (p2 - p1) ** 2
  return n
}

/**
 * Calculate sample size for continuous metrics
 */
function calculateSampleSizeForContinuous(params: {
  alpha: number
  power: number
  mean: number
  effectSize: number
  variance: number
  variants: number
}): number {
  const { alpha, power, variance, effectSize } = params
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const zBeta = jStat.normal.inv(power, 0, 1)
  const n = (2 * (zAlpha + zBeta) ** 2 * variance) / (effectSize ** 2)
  return n
}

/**
 * Calculate sample size for count metrics (Poisson)
 */
function calculateSampleSizeForCount(params: {
  alpha: number
  power: number
  lambda: number
  effectSize: number
  variants: number
}): number {
  const { alpha, power, lambda, effectSize } = params
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const zBeta = jStat.normal.inv(power, 0, 1)
  const n = (2 * (zAlpha + zBeta) ** 2 * lambda) / (effectSize ** 2)
  return n
}

/**
 * Estimate experiment duration based on traffic
 */
export function estimateDuration(params: {
  totalSampleSize: number
  dailyTraffic: number
  trafficAllocation: number[]
  bufferDays?: number
}): {
  days: number
  weeks: number
  trafficPerDay: number
  assumptions: string[]
} {
  const { totalSampleSize, dailyTraffic, trafficAllocation, bufferDays = 0 } = params

  const allocationPct = trafficAllocation.reduce((sum, val) => sum + val, 0) / 100
  const effectiveDailyTraffic = dailyTraffic * allocationPct

  const days = Math.ceil(totalSampleSize / effectiveDailyTraffic) + bufferDays
  const weeks = Math.ceil(days / 7)

  const assumptions = [
    `Daily traffic: ${dailyTraffic.toLocaleString()} users`,
    `Traffic allocation: ${trafficAllocation.join('/')}`,
    `Effective daily traffic: ${effectiveDailyTraffic.toLocaleString()} users`,
  ]

  if (bufferDays > 0) {
    assumptions.push(`Includes ${bufferDays} buffer days`)
  }

  return {
    days,
    weeks,
    trafficPerDay: effectiveDailyTraffic,
    assumptions,
  }
}
