import { useState } from 'react'
import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { COMMON_METRICS, createMetric } from '@/lib/metrics/metricDefinitions'
import { MetricCategory, MetricType, MetricDirection, ExperimentType, type Metric } from '@/types'

function getMetricGuidance(experimentType: ExperimentType | null): { message: string; level: 'info' | 'warning' } | null {
  switch (experimentType) {
    case ExperimentType.MAB:
      return { message: 'Multi-Armed Bandits typically optimize a single reward metric. Multiple PRIMARY metrics may cause conflicting optimization signals.', level: 'warning' }
    case ExperimentType.CAUSAL_INFERENCE:
      return { message: 'Define a clear outcome variable as your PRIMARY metric. Consider whether confounders are measured and included as covariates.', level: 'info' }
    case ExperimentType.FACTORIAL:
      return { message: 'Metrics will be measured across all factor combinations. Ensure your primary metric is meaningful for every cell.', level: 'info' }
    case ExperimentType.CLUSTER:
      return { message: 'Choose metrics that can be aggregated at the cluster level. Individual-level metrics will need cluster-level adjustment.', level: 'info' }
    case ExperimentType.SWITCHBACK:
      return { message: 'Select metrics that respond quickly to treatment changes. Slow-moving metrics may not capture switchback effects within each period.', level: 'info' }
    default:
      return null
  }
}

export function Step2MetricsSelection() {
  const {
    metrics,
    addMetric,
    removeMetric,
    updateMetric,
    experimentType,
    aiUpdatedFields,
    aiUpdatedMetricIds,
    clearAIFieldHighlight,
    clearAIMetricHighlight,
    clearAIStepHighlight,
  } = useExperiment()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: MetricCategory.PRIMARY,
    type: MetricType.CONTINUOUS,
    direction: MetricDirection.INCREASE,
    baseline: 0,
    variance: 0,
  })

  const handleAddMetric = () => {
    const newMetric = createMetric(formData)
    addMetric(newMetric)
    clearAIFieldHighlight('metrics')
    clearAIStepHighlight(2)
    setShowForm(false)
    setFormData({
      name: '',
      category: MetricCategory.PRIMARY,
      type: MetricType.CONTINUOUS,
      direction: MetricDirection.INCREASE,
      baseline: 0,
      variance: 0,
    })
  }

  const handleAddCommonMetric = (metricTemplate: Partial<Metric>) => {
    const newMetric = createMetric(metricTemplate)
    addMetric(newMetric)
    clearAIFieldHighlight('metrics')
    clearAIStepHighlight(2)
  }

  const primaryCount = metrics.filter((m) => m.category === MetricCategory.PRIMARY).length
  const metricsUpdatedByAI = aiUpdatedFields.includes('metrics')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select Metrics to Monitor</h2>
        <p className="mt-2 text-gray-600">
          Choose or define the metrics you'll track during the experiment
        </p>
      </div>

      {/* Type-specific guidance */}
      {(() => {
        const guidance = getMetricGuidance(experimentType)
        if (!guidance) return null
        const isWarning = guidance.level === 'warning'
        return (
          <div className={`p-4 rounded-lg border ${isWarning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-sm ${isWarning ? 'text-amber-800' : 'text-blue-800'}`}>
              {guidance.message}
            </p>
          </div>
        )
      })()}

      {experimentType === ExperimentType.MAB && primaryCount > 1 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">
            You have {primaryCount} PRIMARY metrics. MAB algorithms work best with a single reward signal.
          </p>
        </div>
      )}

      {metricsUpdatedByAI && (
        <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <p className="text-sm text-primary-800">
            AI updated metrics in this step. Review highlighted rows and adjust if needed.
          </p>
        </div>
      )}

      {/* Current Metrics */}
      {metrics.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Your Metrics ({metrics.length})</h3>
          {metrics.map((metric) => {
            const getCategoryColor = (cat: MetricCategory) => {
              if (cat === MetricCategory.PRIMARY) return 'bg-primary-100 text-primary-700 border-primary-200'
              if (cat === MetricCategory.GUARDRAIL) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
              if (cat === MetricCategory.MONITOR) return 'bg-green-100 text-green-700 border-green-200'
              return 'bg-gray-100 text-gray-700 border-gray-200'
            }

            const getCategoryLabel = (cat: MetricCategory) => {
              if (cat === MetricCategory.PRIMARY) return 'Primary'
              if (cat === MetricCategory.GUARDRAIL) return 'Guardrail'
              if (cat === MetricCategory.MONITOR) return 'Monitor'
              return cat
            }

            const toggleCategory = () => {
              clearAIMetricHighlight(metric.id)
              clearAIFieldHighlight('metrics')
              clearAIStepHighlight(2)
              if (metric.category === MetricCategory.PRIMARY) {
                updateMetric(metric.id, { category: MetricCategory.GUARDRAIL })
              } else if (metric.category === MetricCategory.GUARDRAIL) {
                updateMetric(metric.id, { category: MetricCategory.MONITOR })
              } else {
                updateMetric(metric.id, { category: MetricCategory.PRIMARY })
              }
            }

            return (
              <Card
                key={metric.id}
                className={`flex items-start justify-between ${aiUpdatedMetricIds.includes(metric.id) ? 'ai-updated' : ''}`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{metric.name}</h4>
                    <button
                      onClick={toggleCategory}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors hover:border-primary-300 ${getCategoryColor(metric.category)}`}
                      title="Click to toggle category"
                    >
                      {getCategoryLabel(metric.category)}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Type: {metric.type} | Baseline: {metric.baseline} | Direction: {metric.direction}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Click category badge to toggle: Primary → Guardrail → Monitor
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearAIMetricHighlight(metric.id)
                    clearAIFieldHighlight('metrics')
                    clearAIStepHighlight(2)
                    removeMetric(metric.id)
                  }}
                >
                  Remove
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Custom Metric */}
      {!showForm ? (
        <div className="space-y-3">
          <Button onClick={() => setShowForm(true)}>+ Add Custom Metric</Button>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Or Choose from Common Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COMMON_METRICS.slice(0, 6).map((metric, index) => (
                <Card
                  key={index}
                  hover
                  onClick={() => handleAddCommonMetric(metric)}
                  className="cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{metric.name}</h4>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                        {metric.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Add Custom Metric</h3>
          <div className="space-y-4">
            <Input
              label="Metric Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category: MetricCategory.PRIMARY })}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                    formData.category === MetricCategory.PRIMARY
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Primary
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category: MetricCategory.GUARDRAIL })}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                    formData.category === MetricCategory.GUARDRAIL
                      ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Guardrail
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category: MetricCategory.MONITOR })}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                    formData.category === MetricCategory.MONITOR
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Monitor
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Primary: Main success metric | Guardrail: Safety metric | Monitor: Observational metric
              </p>
            </div>

            <Select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as MetricType })}
            >
              <option value={MetricType.BINARY}>Binary (e.g., conversion rate)</option>
              <option value={MetricType.CONTINUOUS}>Continuous (e.g., revenue)</option>
              <option value={MetricType.COUNT}>Count (e.g., number of purchases)</option>
            </Select>

            <Select
              label="Direction"
              value={formData.direction}
              onChange={(e) => setFormData({ ...formData, direction: e.target.value as MetricDirection })}
            >
              <option value={MetricDirection.INCREASE}>Increase (higher is better)</option>
              <option value={MetricDirection.DECREASE}>Decrease (lower is better)</option>
            </Select>

            <Input
              label="Baseline Value"
              type="number"
              step="0.01"
              value={formData.baseline}
              onChange={(e) => setFormData({ ...formData, baseline: parseFloat(e.target.value) })}
              helperText="Current average value of this metric"
              required
            />

            {formData.type === MetricType.CONTINUOUS && (
              <Input
                label="Variance"
                type="number"
                step="0.01"
                value={formData.variance}
                onChange={(e) => setFormData({ ...formData, variance: parseFloat(e.target.value) })}
                helperText="Historical variance of this metric"
              />
            )}

            <div className="flex space-x-3">
              <Button onClick={handleAddMetric}>Add Metric</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {primaryCount === 0 && metrics.length > 0 && (
        <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
          <p className="text-sm text-warning-700">
            ⚠️ You must select at least one PRIMARY metric to proceed.
          </p>
        </div>
      )}
    </div>
  )
}
