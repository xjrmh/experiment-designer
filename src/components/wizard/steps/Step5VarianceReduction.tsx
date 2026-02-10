import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import { Tooltip } from '@/components/common/Tooltip'
import { ExperimentType } from '@/types'

export function Step5VarianceReduction() {
  const { varianceReduction, updateVarianceReduction, experimentType } = useExperiment()
  const isMAB = experimentType === ExperimentType.MAB
  const stratificationValue = varianceReduction.stratificationVariables.join(', ')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Variance Reduction Techniques</h2>
        <p className="mt-2 text-gray-600">
          Apply techniques to reduce variance and increase statistical power
        </p>
      </div>

      {isMAB ? (
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 mb-1">Not Applicable for Multi-Armed Bandits</h4>
              <p className="text-sm text-amber-800">
                Variance reduction techniques are designed for fixed-sample statistical testing and do not apply to adaptive MAB algorithms.
                You can skip this step.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Optional: Advanced Technique</h4>
              <p className="text-sm text-blue-800">
                This section is optional. Variance reduction techniques can improve experiment efficiency, but they require statistical expertise to implement correctly.
                If you're unsure, you can skip this section and consult with a Data Scientist later.
              </p>
            </div>
          </div>
        </Card>
      )}

      {!isMAB && <><Card>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">CUPED (Recommended)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Controlled-experiment Using Pre-Experiment Data. Reduce variance by 30-50% using pre-experiment covariates.
            </p>
          </div>
          <Tooltip content="CUPED uses pre-experiment data of the same metric to reduce variance. This allows detecting smaller effects with the same sample size.">
            <span className="text-gray-400 cursor-help">ℹ️</span>
          </Tooltip>
        </div>

        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={varianceReduction.useCUPED}
              onChange={(e) => updateVarianceReduction({ useCUPED: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-gray-700">Enable CUPED</span>
          </label>

          {varianceReduction.useCUPED && (
            <div className="ml-6 space-y-3 p-4 bg-gray-50 rounded-lg">
              <Input
                label="Covariate Metric"
                placeholder="e.g., pre_experiment_revenue"
                value={varianceReduction.cupedCovariate || ''}
                onChange={(e) => updateVarianceReduction({ cupedCovariate: e.target.value })}
                helperText="Select a pre-experiment version of your primary metric"
              />
              <Input
                label="Expected Variance Reduction (%)"
                type="number"
                min="0"
                max="70"
                value={varianceReduction.cupedExpectedReduction}
                onChange={(e) =>
                  updateVarianceReduction({ cupedExpectedReduction: parseFloat(e.target.value) })
                }
                helperText="Typical range: 30-50%"
              />
              {experimentType === ExperimentType.SWITCHBACK && (
                <p className="text-sm text-blue-700">
                  Within-unit comparison in switchback designs already provides some variance reduction. CUPED can provide additional benefit if applied at the period level.
                </p>
              )}
              {experimentType === ExperimentType.CLUSTER && (
                <p className="text-sm text-blue-700">
                  CUPED can be applied at the cluster level using pre-experiment cluster-level averages as covariates.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Post-Stratification</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={varianceReduction.useStratification}
              onChange={(e) => updateVarianceReduction({ useStratification: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-gray-700">Use Post-Stratification</span>
          </label>

          {varianceReduction.useStratification && (
            <div className="ml-6">
              <Input
                placeholder="e.g., platform, country, user_segment"
                value={stratificationValue}
                onChange={(e) =>
                  updateVarianceReduction({
                    stratificationVariables: e.target.value
                      .split(',')
                      .map((name) => name.trim())
                      .filter(Boolean),
                  })
                }
                helperText="Comma-separated list of variables to stratify on"
              />
            </div>
          )}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Matched Pairs</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={varianceReduction.useMatchedPairs}
              onChange={(e) => updateVarianceReduction({ useMatchedPairs: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Use matched pairs design</span>
          </label>
          <p className="text-sm text-gray-600 mt-2 ml-6">
            Pair similar units before randomization
          </p>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Blocking</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={varianceReduction.useBlocking}
              onChange={(e) => updateVarianceReduction({ useBlocking: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Use blocking design</span>
          </label>
          <p className="text-sm text-gray-600 mt-2 ml-6">
            Randomize within homogeneous blocks
          </p>
        </Card>
      </div>

      <Card className="bg-success-50 border-success-200">
        <h4 className="font-medium text-success-900 mb-2">💡 Impact</h4>
        <p className="text-sm text-success-800">
          Variance reduction techniques can significantly reduce required sample size or experiment duration.
          CUPED is the most impactful and easiest to implement.
        </p>
      </Card></>}
    </div>
  )
}
