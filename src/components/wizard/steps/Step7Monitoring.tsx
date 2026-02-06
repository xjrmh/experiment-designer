import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Select } from '@/components/common/Select'
import { Input } from '@/components/common/Input'
import { MultipleTestingCorrection, ExperimentType } from '@/types'

export function Step7Monitoring() {
  const { monitoring, updateMonitoring, experimentType } = useExperiment()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Monitoring & Stopping Rules</h2>
        <p className="mt-2 text-gray-600">
          Configure experiment monitoring and decision criteria
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">Optional: Advanced Monitoring</h4>
            <p className="text-sm text-blue-800">
              This section is optional. Monitoring and stopping rules require careful statistical consideration to avoid false positives.
              If you're unsure about these settings, you can skip this section and consult with a Data Scientist to define appropriate criteria.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Monitoring Configuration</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Refresh Frequency (minutes)"
            type="number"
            min="1"
            value={monitoring.refreshFrequency}
            onChange={(e) => updateMonitoring({ refreshFrequency: parseInt(e.target.value) })}
            helperText="How often to update dashboards"
          />

          <Input
            label="SRM Detection Threshold"
            type="number"
            step="0.001"
            value={monitoring.srmThreshold}
            onChange={(e) => updateMonitoring({ srmThreshold: parseFloat(e.target.value) })}
            helperText="P-value threshold for Sample Ratio Mismatch"
          />
        </div>
      </Card>

      {experimentType === ExperimentType.MAB && (
        <Card className="bg-amber-50 border-amber-200">
          <h4 className="font-medium text-amber-900 mb-2">MAB Convergence</h4>
          <p className="text-sm text-amber-800">
            MAB experiments do not use traditional significance-based stopping rules. Instead, define convergence criteria — e.g., when the best arm's selection probability exceeds 95% for 3 consecutive evaluation windows, or when exploration rounds are exhausted.
          </p>
        </Card>
      )}

      {experimentType === ExperimentType.SWITCHBACK && (
        <Card className="bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Switchback Monitoring</h4>
          <p className="text-sm text-blue-800">
            Monitor at the period level. Ensure time-of-day and day-of-week balance across treatment conditions. Watch for carryover effects between periods.
          </p>
        </Card>
      )}

      {experimentType === ExperimentType.AB_TEST && (
        <Card className="bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Sequential Testing</h4>
          <p className="text-sm text-blue-800">
            Consider using sequential testing boundaries (O'Brien-Fleming or Pocock) to allow valid early stopping while controlling Type I error. This lets you peek at results without inflating false positive rates.
          </p>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Stopping Rules</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define criteria for early termination
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Success Stopping</h4>
            <p className="text-sm text-gray-600 mb-3">
              Stop early if overwhelming evidence of positive effect
            </p>
            <Input
              placeholder="e.g., p-value < 0.001 and effect size > 2x MDE"
              helperText="Criteria for declaring early success"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Futility Stopping</h4>
            <p className="text-sm text-gray-600 mb-3">
              Stop early if very unlikely to reach significance
            </p>
            <Input
              placeholder="e.g., Conditional power < 20% at 75% of planned duration"
              helperText="Criteria for stopping due to futility"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Harm Stopping</h4>
            <p className="text-sm text-gray-600 mb-3">
              Stop immediately if significant negative impact
            </p>
            <Input
              placeholder="e.g., Any guardrail metric degrades by > 5%"
              helperText="Criteria for stopping due to harm"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Statistical Testing</h3>
        <div className="space-y-4">
          <Select
            label="Multiple Testing Correction"
            value={monitoring.multipleTestingCorrection}
            onChange={(e) =>
              updateMonitoring({ multipleTestingCorrection: e.target.value as MultipleTestingCorrection })
            }
          >
            <option value={MultipleTestingCorrection.NONE}>None</option>
            <option value={MultipleTestingCorrection.BONFERRONI}>Bonferroni</option>
            <option value={MultipleTestingCorrection.BENJAMINI_HOCHBERG}>Benjamini-Hochberg (FDR)</option>
            <option value={MultipleTestingCorrection.HOLM}>Holm-Bonferroni</option>
          </Select>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Use Bonferroni for conservative control of family-wise error rate.
              Use Benjamini-Hochberg (FDR) for more power when testing multiple metrics.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Decision Framework</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ship Criteria (✅ Launch to all users)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={2}
              placeholder="e.g., Primary metric improves by ≥ MDE, no guardrail degradation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Iterate Criteria (🔄 Refine and re-test)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={2}
              placeholder="e.g., Positive trend but not significant, mixed results on metrics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kill Criteria (❌ Abandon the change)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={2}
              placeholder="e.g., Significant negative impact on primary or guardrail metrics"
            />
          </div>
        </div>
      </Card>

      <Card className="bg-warning-50 border-warning-200">
        <h4 className="font-medium text-warning-900 mb-2">⚠️ Important</h4>
        <ul className="space-y-1 text-sm text-warning-800">
          <li>• Avoid peeking at results too frequently - increases false positive rate</li>
          <li>• Always apply multiple testing correction when testing multiple metrics</li>
          <li>• Document all stopping rules before the experiment starts</li>
          <li>• Monitor for Sample Ratio Mismatch throughout the experiment</li>
        </ul>
      </Card>
    </div>
  )
}
