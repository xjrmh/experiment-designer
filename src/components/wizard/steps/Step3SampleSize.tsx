import { useEffect } from 'react'
import { useExperiment } from '@/hooks/useExperiment'
import { useSampleSize } from '@/hooks/useSampleSize'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import { Tooltip } from '@/components/common/Tooltip'
import { ExperimentType } from '@/types'
import { ClusterPanel, SwitchbackPanel, FactorialPanel, MABPanel, CausalInferencePanel } from './type-panels'

export function Step3SampleSize() {
  const {
    statisticalParams,
    updateStatisticalParams,
    setSampleSizeResult,
    setDurationEstimate,
    dailyTraffic,
    setDailyTraffic,
    experimentType,
  } = useExperiment()

  const { sampleSizeResult, durationEstimate, primaryMetric } = useSampleSize()

  useEffect(() => {
    if (sampleSizeResult) {
      setSampleSizeResult(sampleSizeResult)
    }
    if (durationEstimate) {
      setDurationEstimate(durationEstimate)
    }
  }, [sampleSizeResult, durationEstimate, setSampleSizeResult, setDurationEstimate])

  if (!primaryMetric) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Please select a primary metric in Step 2 first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Calculate Sample Size</h2>
        <p className="mt-2 text-gray-600">
          Configure statistical parameters to calculate required sample size
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Parameters */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Statistical Parameters</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Significance Level (α)
                </label>
                <Tooltip content="The probability of detecting an effect when there is none (Type I error). Standard is 0.05.">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold cursor-help hover:bg-gray-200 transition-colors">
                    i
                  </div>
                </Tooltip>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="0.1"
                value={statisticalParams.alpha}
                onChange={(e) => updateStatisticalParams({ alpha: parseFloat(e.target.value) })}
                helperText="Typically 0.05 (5%)"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Statistical Power (1-β)
                </label>
                <Tooltip content="The probability of detecting an effect when it truly exists. Standard is 0.8.">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold cursor-help hover:bg-gray-200 transition-colors">
                    i
                  </div>
                </Tooltip>
              </div>
              <Input
                type="number"
                step="0.05"
                min="0.7"
                max="0.99"
                value={statisticalParams.power}
                onChange={(e) => updateStatisticalParams({ power: parseFloat(e.target.value) })}
                helperText="Typically 0.8 (80%)"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Detectable Effect (%)
                </label>
                <Tooltip content="The smallest relative change you want to be able to detect. Smaller MDEs require larger sample sizes.">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold cursor-help hover:bg-gray-200 transition-colors">
                    i
                  </div>
                </Tooltip>
              </div>
              <Input
                type="number"
                step="0.5"
                min="0.1"
                value={statisticalParams.mde}
                onChange={(e) => updateStatisticalParams({ mde: parseFloat(e.target.value) })}
                helperText="Smallest effect you want to detect"
              />
            </div>

            {/* Hide variants/allocation for Factorial (auto-computed from factor config) and MAB */}
            {experimentType !== ExperimentType.FACTORIAL && experimentType !== ExperimentType.MAB && (
              <>
                <div>
                  <Input
                    label="Number of Variants"
                    type="number"
                    min="2"
                    value={statisticalParams.variants}
                    onChange={(e) => {
                      const newVariants = parseInt(e.target.value) || 2
                      // Initialize traffic allocation with equal split
                      const equalSplit = Math.floor(100 / newVariants)
                      const remainder = 100 - equalSplit * newVariants
                      const newAllocation = Array.from({ length: newVariants }, (_, i) =>
                        i === 0 ? equalSplit + remainder : equalSplit
                      )
                      updateStatisticalParams({
                        variants: newVariants,
                        trafficAllocation: newAllocation,
                      })
                    }}
                    helperText="Including control"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Traffic Allocation (%)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: statisticalParams.variants }).map((_, index) => {
                      const isLast = index === statisticalParams.variants - 1
                      const label = index === 0 ? 'Control' : `Treatment ${index}`

                      return (
                        <Input
                          key={index}
                          label={label}
                          type="number"
                          min="1"
                          max="99"
                          value={statisticalParams.trafficAllocation[index] || 0}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value) || 0
                            const newAllocation = [...statisticalParams.trafficAllocation]
                            newAllocation[index] = newValue

                            // Auto-calculate the last variant to ensure 100% total
                            if (!isLast) {
                              const sumOfOthers = newAllocation.slice(0, -1).reduce((sum, val) => sum + val, 0)
                              newAllocation[statisticalParams.variants - 1] = Math.max(0, 100 - sumOfOthers)
                            }

                            updateStatisticalParams({ trafficAllocation: newAllocation })
                          }}
                          disabled={isLast}
                        />
                      )
                    })}
                  </div>
                  {(() => {
                    const sumOfEditable = statisticalParams.trafficAllocation
                      .slice(0, -1)
                      .reduce((sum, val) => sum + val, 0)
                    const lastVariant = statisticalParams.trafficAllocation[statisticalParams.variants - 1]
                    const totalSum = statisticalParams.trafficAllocation.reduce((sum, val) => sum + val, 0)

                    if (sumOfEditable > 100) {
                      return (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">
                            ⚠️ Error: Traffic allocation exceeds 100% (currently {sumOfEditable}%). Please reduce the values.
                          </p>
                        </div>
                      )
                    } else if (lastVariant === 0) {
                      return (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-700">
                            ⚠️ Warning: Last variant has 0% traffic. Consider reducing other allocations.
                          </p>
                        </div>
                      )
                    } else {
                      return (
                        <p className="mt-1 text-xs text-gray-500">
                          Last variant is auto-calculated to ensure 100% total (Total: {totalSum}%)
                        </p>
                      )
                    }
                  })()}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {sampleSizeResult && (
            <Card className="bg-primary-50 border-primary">
              <h3 className="font-semibold text-gray-900 mb-4">
                {sampleSizeResult.isAdaptive ? 'Exploration Budget' : 'Sample Size Calculation'}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">
                    {sampleSizeResult.isAdaptive
                      ? 'Exploration Budget per Arm'
                      : sampleSizeResult.totalCells
                        ? 'Sample Size per Cell'
                        : 'Sample Size per Variant'}
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {sampleSizeResult.sampleSizePerVariant.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">
                    {sampleSizeResult.isAdaptive ? 'Total Horizon' : 'Total Sample Size'}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {sampleSizeResult.totalSampleSize.toLocaleString()}
                  </div>
                </div>
                {!sampleSizeResult.isAdaptive && (
                  <div className="pt-3 border-t border-primary-200">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Power: {(sampleSizeResult.calculatedPower * 100).toFixed(1)}%</div>
                      <div>MDE: {sampleSizeResult.calculatedMDE.toFixed(2)}%</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Duration Estimate</h3>
            <div className="space-y-4">
              <Input
                label="Daily Traffic"
                type="text"
                value={dailyTraffic.toLocaleString()}
                onChange={(e) => {
                  const numericValue = parseInt(e.target.value.replace(/,/g, '')) || 0
                  setDailyTraffic(numericValue)
                }}
                helperText="Average number of users per day"
              />
              {durationEstimate && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Estimated Duration</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {durationEstimate.days} days
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ({durationEstimate.weeks} weeks)
                  </div>
                </div>
              )}
            </div>
          </Card>

          {sampleSizeResult?.warnings && sampleSizeResult.warnings.length > 0 && (
            <Card className="bg-warning-50 border-warning-200">
              <h4 className="font-medium text-warning-800 mb-2">⚠️ Warnings</h4>
              <ul className="space-y-1 text-sm text-warning-700">
                {sampleSizeResult.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Type-specific input panels */}
      {experimentType === ExperimentType.CLUSTER && <ClusterPanel sampleSizeResult={sampleSizeResult} />}
      {experimentType === ExperimentType.SWITCHBACK && <SwitchbackPanel sampleSizeResult={sampleSizeResult} />}
      {experimentType === ExperimentType.FACTORIAL && <FactorialPanel sampleSizeResult={sampleSizeResult} />}
      {experimentType === ExperimentType.MAB && <MABPanel sampleSizeResult={sampleSizeResult} />}
      {experimentType === ExperimentType.CAUSAL_INFERENCE && <CausalInferencePanel sampleSizeResult={sampleSizeResult} />}

      {sampleSizeResult && (
        <Card>
          <h4 className="font-medium text-gray-900 mb-2">Assumptions</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            {sampleSizeResult.assumptions.map((assumption, i) => (
              <li key={i}>• {assumption}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
