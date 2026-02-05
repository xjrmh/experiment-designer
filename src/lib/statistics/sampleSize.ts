import jStat from 'jstat'
import type { SampleSizeInput, SampleSizeResult } from '@/types'

/**
 * Calculate sample size for a two-sample test
 * Uses the formula: n = 2 * (Z_α/2 + Z_β)² * σ² / δ²
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
    const variance = input.variance || (input.stdDev ? input.stdDev ** 2 : baseline * 0.1) // Default: 10% CV
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

  // Round up to ensure adequate power
  sampleSizePerVariant = Math.ceil(sampleSizePerVariant)
  const totalSampleSize = sampleSizePerVariant * variants

  // Warnings
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
  }
}

/**
 * Calculate sample size for proportions (binary metrics)
 * Uses normal approximation for proportions test
 */
function calculateSampleSizeForProportions(params: {
  alpha: number
  power: number
  p1: number // Control proportion
  p2: number // Treatment proportion
  variants: number
}): number {
  const { alpha, power, p1, p2 } = params

  // Z-scores
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1) // Two-tailed
  const zBeta = jStat.normal.inv(power, 0, 1)

  // Pooled proportion
  const pPooled = (p1 + p2) / 2

  // Sample size per variant
  const n =
    (2 * (zAlpha + zBeta) ** 2 * pPooled * (1 - pPooled)) /
    (p2 - p1) ** 2

  return n
}

/**
 * Calculate sample size for continuous metrics
 * Uses t-test formula
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

  // Z-scores (using normal approximation)
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const zBeta = jStat.normal.inv(power, 0, 1)

  // Sample size per variant
  const n = (2 * (zAlpha + zBeta) ** 2 * variance) / (effectSize ** 2)

  return n
}

/**
 * Calculate sample size for count metrics
 * Uses Poisson approximation
 */
function calculateSampleSizeForCount(params: {
  alpha: number
  power: number
  lambda: number // Mean count
  effectSize: number
  variants: number
}): number {
  const { alpha, power, lambda, effectSize } = params

  // Z-scores
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const zBeta = jStat.normal.inv(power, 0, 1)

  // For Poisson, variance = mean
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

  // Calculate effective daily traffic based on allocation
  const allocationPct = trafficAllocation.reduce((sum, val) => sum + val, 0) / 100
  const effectiveDailyTraffic = dailyTraffic * allocationPct

  // Calculate duration
  let days = Math.ceil(totalSampleSize / effectiveDailyTraffic) + bufferDays
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
