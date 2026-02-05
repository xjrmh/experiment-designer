import jStat from 'jstat'
import type { PowerAnalysisResult, PowerCurvePoint } from '@/types'

/**
 * Calculate statistical power given sample size
 * Returns the probability of detecting an effect if it exists
 */
export function calculatePower(params: {
  sampleSize: number
  alpha: number
  effectSize: number
  baseline: number
  variance?: number
  metricType: 'binary' | 'continuous' | 'count'
}): PowerAnalysisResult {
  const { sampleSize, alpha, effectSize, baseline, metricType } = params

  let power: number

  if (metricType === 'binary') {
    power = calculatePowerForProportions({
      n: sampleSize,
      alpha,
      p1: baseline,
      p2: baseline + effectSize,
    })
  } else if (metricType === 'continuous') {
    const variance = params.variance || baseline * 0.1
    power = calculatePowerForContinuous({
      n: sampleSize,
      alpha,
      effectSize,
      variance,
    })
  } else {
    // Count metrics
    power = calculatePowerForCount({
      n: sampleSize,
      alpha,
      lambda: baseline,
      effectSize,
    })
  }

  return {
    power,
    sampleSize,
    effectSize,
    alpha,
  }
}

/**
 * Calculate power for proportions test
 */
function calculatePowerForProportions(params: {
  n: number
  alpha: number
  p1: number
  p2: number
}): number {
  const { n, alpha, p1, p2 } = params

  // Z-score for alpha
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)

  // Standard error under alternative hypothesis
  const seAlt = Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / n)

  // Non-centrality parameter
  const ncp = (p2 - p1) / seAlt

  // Power is P(Z > z_alpha - ncp)
  const power = 1 - jStat.normal.cdf(zAlpha - ncp, 0, 1)

  return Math.max(0, Math.min(1, power))
}

/**
 * Calculate power for continuous metrics
 */
function calculatePowerForContinuous(params: {
  n: number
  alpha: number
  effectSize: number
  variance: number
}): number {
  const { n, alpha, effectSize, variance } = params

  // Z-score for alpha
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)

  // Standard error
  const se = Math.sqrt((2 * variance) / n)

  // Non-centrality parameter
  const ncp = effectSize / se

  // Power
  const power = 1 - jStat.normal.cdf(zAlpha - ncp, 0, 1)

  return Math.max(0, Math.min(1, power))
}

/**
 * Calculate power for count metrics
 */
function calculatePowerForCount(params: {
  n: number
  alpha: number
  lambda: number
  effectSize: number
}): number {
  const { n, alpha, lambda, effectSize } = params

  // Z-score for alpha
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)

  // Standard error (for Poisson, var = lambda)
  const se = Math.sqrt((2 * lambda) / n)

  // Non-centrality parameter
  const ncp = effectSize / se

  // Power
  const power = 1 - jStat.normal.cdf(zAlpha - ncp, 0, 1)

  return Math.max(0, Math.min(1, power))
}

/**
 * Generate power curve data for visualization
 * Shows how power changes with sample size
 */
export function generatePowerCurve(params: {
  minSampleSize: number
  maxSampleSize: number
  steps: number
  alpha: number
  effectSize: number
  baseline: number
  variance?: number
  metricType: 'binary' | 'continuous' | 'count'
}): PowerCurvePoint[] {
  const { minSampleSize, maxSampleSize, steps } = params
  const stepSize = (maxSampleSize - minSampleSize) / steps

  const points: PowerCurvePoint[] = []

  for (let i = 0; i <= steps; i++) {
    const sampleSize = Math.round(minSampleSize + i * stepSize)
    const result = calculatePower({
      sampleSize,
      alpha: params.alpha,
      effectSize: params.effectSize,
      baseline: params.baseline,
      variance: params.variance,
      metricType: params.metricType,
    })

    points.push({
      sampleSize,
      power: result.power,
    })
  }

  return points
}

/**
 * Generate sensitivity analysis for MDE
 * Shows how MDE changes with different sample sizes
 */
export function generateMDESensitivity(params: {
  sampleSizes: number[]
  alpha: number
  power: number
  baseline: number
  variance?: number
  metricType: 'binary' | 'continuous' | 'count'
}): Array<{ sampleSize: number; mde: number }> {
  const { sampleSizes, alpha, power, baseline, metricType } = params
  const variance = params.variance || baseline * 0.1

  return sampleSizes.map((sampleSize) => {
    const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)
    const zBeta = jStat.normal.inv(power, 0, 1)

    let mde: number

    if (metricType === 'binary') {
      // Approximation for MDE in proportions
      const p = baseline
      mde = (zAlpha + zBeta) * Math.sqrt((2 * p * (1 - p)) / sampleSize)
    } else if (metricType === 'continuous') {
      mde = (zAlpha + zBeta) * Math.sqrt((2 * variance) / sampleSize)
    } else {
      // Count metrics
      mde = (zAlpha + zBeta) * Math.sqrt((2 * baseline) / sampleSize)
    }

    return {
      sampleSize,
      mde: Math.abs(mde),
    }
  })
}
