import { useMemo } from 'react'
import { calculateSampleSize, estimateDuration } from '@/lib/statistics/sampleSize'
import { useExperiment } from './useExperiment'

/**
 * Hook for sample size calculations with memoization
 */
export function useSampleSize() {
  const { metrics, statisticalParams, dailyTraffic } = useExperiment()

  const primaryMetric = metrics.find((m) => m.category === 'PRIMARY')

  const sampleSizeResult = useMemo(() => {
    if (!primaryMetric) return null

    try {
      return calculateSampleSize({
        alpha: statisticalParams.alpha,
        power: statisticalParams.power,
        baseline: primaryMetric.baseline,
        mde: statisticalParams.mde,
        mdeType: statisticalParams.mdeType,
        variance: primaryMetric.variance,
        stdDev: primaryMetric.stdDev,
        metricType: primaryMetric.type === 'BINARY' ? 'binary' : primaryMetric.type === 'CONTINUOUS' ? 'continuous' : 'count',
        variants: statisticalParams.variants,
        trafficAllocation: statisticalParams.trafficAllocation,
      })
    } catch (error) {
      console.error('Sample size calculation error:', error)
      return null
    }
  }, [primaryMetric, statisticalParams])

  const durationEstimate = useMemo(() => {
    if (!sampleSizeResult || !dailyTraffic) return null

    try {
      return estimateDuration({
        totalSampleSize: sampleSizeResult.totalSampleSize,
        dailyTraffic,
        trafficAllocation: statisticalParams.trafficAllocation,
        bufferDays: 2,
      })
    } catch (error) {
      console.error('Duration estimation error:', error)
      return null
    }
  }, [sampleSizeResult, dailyTraffic, statisticalParams.trafficAllocation])

  return {
    sampleSizeResult,
    durationEstimate,
    primaryMetric,
  }
}
