import jStat from 'jstat'
import type { MDEResult } from '@/types'

/**
 * Calculate minimum detectable effect (MDE)
 * Given a fixed sample size, what's the smallest effect we can reliably detect?
 */
export function calculateMDE(params: {
  sampleSize: number
  alpha: number
  power: number
  baseline: number
  variance?: number
  metricType: 'binary' | 'continuous' | 'count'
}): MDEResult {
  const { sampleSize, alpha, power, baseline, metricType } = params

  // Z-scores
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1) // Two-tailed
  const zBeta = jStat.normal.inv(power, 0, 1)

  let mdeAbsolute: number

  if (metricType === 'binary') {
    // For proportions
    const p = baseline
    mdeAbsolute = (zAlpha + zBeta) * Math.sqrt((2 * p * (1 - p)) / sampleSize)
  } else if (metricType === 'continuous') {
    // For continuous metrics
    const variance = params.variance || (baseline * 0.1) ** 2 // Default: 10% CV → σ = 0.1×μ, σ² = 0.01×μ²
    mdeAbsolute = (zAlpha + zBeta) * Math.sqrt((2 * variance) / sampleSize)
  } else {
    // For count metrics (Poisson)
    const lambda = baseline
    mdeAbsolute = (zAlpha + zBeta) * Math.sqrt((2 * lambda) / sampleSize)
  }

  // Calculate relative MDE
  const mdeRelative = (mdeAbsolute / baseline) * 100

  return {
    mdeAbsolute,
    mdeRelative,
    sampleSize,
    power,
    alpha,
  }
}

/**
 * Calculate MDE for different power levels
 * Useful for understanding power/MDE tradeoff
 */
export function calculateMDEForPowerLevels(params: {
  sampleSize: number
  alpha: number
  powerLevels: number[]
  baseline: number
  variance?: number
  metricType: 'binary' | 'continuous' | 'count'
}): Array<{ power: number; mdeAbsolute: number; mdeRelative: number }> {
  const { powerLevels } = params

  return powerLevels.map((power) => {
    const result = calculateMDE({
      ...params,
      power,
    })

    return {
      power,
      mdeAbsolute: result.mdeAbsolute,
      mdeRelative: result.mdeRelative,
    }
  })
}

/**
 * Calculate required sample size to achieve a target MDE
 */
export function calculateSampleSizeForTargetMDE(params: {
  targetMDE: number
  mdeType: 'relative' | 'absolute'
  alpha: number
  power: number
  baseline: number
  variance?: number
  metricType: 'binary' | 'continuous' | 'count'
}): number {
  const { targetMDE, mdeType, alpha, power, baseline, metricType } = params

  // Convert relative MDE to absolute if needed
  const mdeAbsolute = mdeType === 'relative' ? baseline * (targetMDE / 100) : targetMDE

  // Z-scores
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const zBeta = jStat.normal.inv(power, 0, 1)

  let sampleSize: number

  if (metricType === 'binary') {
    const p = baseline
    sampleSize = (2 * (zAlpha + zBeta) ** 2 * p * (1 - p)) / (mdeAbsolute ** 2)
  } else if (metricType === 'continuous') {
    const variance = params.variance || baseline * 0.1
    sampleSize = (2 * (zAlpha + zBeta) ** 2 * variance) / (mdeAbsolute ** 2)
  } else {
    const lambda = baseline
    sampleSize = (2 * (zAlpha + zBeta) ** 2 * lambda) / (mdeAbsolute ** 2)
  }

  return Math.ceil(sampleSize)
}

/**
 * Validate if a given MDE is achievable with available traffic
 */
export function validateMDEFeasibility(params: {
  targetMDE: number
  mdeType: 'relative' | 'absolute'
  alpha: number
  power: number
  baseline: number
  variance?: number
  metricType: 'binary' | 'continuous' | 'count'
  dailyTraffic: number
  maxDurationDays: number
}): {
  feasible: boolean
  requiredSampleSize: number
  requiredDays: number
  achievableMDE?: number
  message: string
} {
  const { dailyTraffic, maxDurationDays } = params

  const requiredSampleSize = calculateSampleSizeForTargetMDE(params)
  const availableSampleSize = dailyTraffic * maxDurationDays
  const requiredDays = Math.ceil(requiredSampleSize / dailyTraffic)

  if (requiredSampleSize <= availableSampleSize) {
    return {
      feasible: true,
      requiredSampleSize,
      requiredDays,
      message: `Target MDE is achievable in ${requiredDays} days with available traffic.`,
    }
  } else {
    // Calculate what MDE is achievable with available traffic
    const achievableResult = calculateMDE({
      sampleSize: availableSampleSize,
      alpha: params.alpha,
      power: params.power,
      baseline: params.baseline,
      variance: params.variance,
      metricType: params.metricType,
    })

    return {
      feasible: false,
      requiredSampleSize,
      requiredDays,
      achievableMDE: params.mdeType === 'relative' ? achievableResult.mdeRelative : achievableResult.mdeAbsolute,
      message: `Target MDE requires ${requiredDays} days but only ${maxDurationDays} days available. ` +
        `With available traffic, achievable MDE is ${params.mdeType === 'relative' ?
          achievableResult.mdeRelative.toFixed(2) + '%' :
          achievableResult.mdeAbsolute.toFixed(4)}.`,
    }
  }
}
