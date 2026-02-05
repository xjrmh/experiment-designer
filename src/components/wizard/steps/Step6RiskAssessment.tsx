import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Select } from '@/components/common/Select'
import { Input } from '@/components/common/Input'
import { RiskLevel } from '@/types'

export function Step6RiskAssessment() {
  const { riskAssessment, updateRiskAssessment, toggleChecklistItem } = useExperiment()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Risk Assessment & Mitigation</h2>
        <p className="mt-2 text-gray-600">
          Evaluate potential risks and define mitigation strategies
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">Optional: Risk Planning</h4>
            <p className="text-sm text-blue-800">
              This section is optional. Risk assessment helps identify potential issues before launch, but may require domain expertise.
              If you're unsure about risk evaluation, you can skip this section and consult with a Data Scientist or Product Manager.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Impact Assessment</h3>
          <div className="space-y-4">
            <Select
              label="Risk Level"
              value={riskAssessment.riskLevel}
              onChange={(e) => updateRiskAssessment({ riskLevel: e.target.value as RiskLevel })}
            >
              <option value={RiskLevel.LOW}>Low - Minimal impact</option>
              <option value={RiskLevel.MEDIUM}>Medium - Moderate impact</option>
              <option value={RiskLevel.HIGH}>High - Significant impact</option>
            </Select>

            <Input
              label="Blast Radius (%)"
              type="number"
              min="0"
              max="100"
              value={riskAssessment.blastRadius}
              onChange={(e) => updateRiskAssessment({ blastRadius: parseInt(e.target.value) })}
              helperText="Percentage of users affected"
            />

            <div className={`p-4 rounded-lg ${
              riskAssessment.riskLevel === RiskLevel.HIGH
                ? 'bg-error-50 border border-error-200'
                : riskAssessment.riskLevel === RiskLevel.MEDIUM
                ? 'bg-warning-50 border border-warning-200'
                : 'bg-success-50 border border-success-200'
            }`}>
              <p className="text-sm font-medium">
                {riskAssessment.riskLevel === RiskLevel.HIGH && '⚠️ High Risk: Extra caution required'}
                {riskAssessment.riskLevel === RiskLevel.MEDIUM && '⚡ Medium Risk: Monitor closely'}
                {riskAssessment.riskLevel === RiskLevel.LOW && '✅ Low Risk: Standard monitoring'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Mitigation Plan</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rollback Triggers
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="e.g., Error rate > 5%, Revenue drop > 10%"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Circuit Breakers
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="e.g., Auto-rollback if critical errors detected"
              />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Pre-Launch Checklist</h3>
        <p className="text-sm text-gray-600 mb-4">
          Complete all required items before launching the experiment
        </p>
        <div className="space-y-3">
          {riskAssessment.preLaunchChecklist.map((item) => (
            <label key={item.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleChecklistItem(item.id)}
                className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  {item.required && (
                    <span className="px-2 py-0.5 text-xs bg-error-100 text-error-700 rounded">Required</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Completion Progress</span>
            <span className="text-sm font-semibold text-primary">
              {riskAssessment.preLaunchChecklist.filter((i) => i.completed).length} /{' '}
              {riskAssessment.preLaunchChecklist.length}
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  (riskAssessment.preLaunchChecklist.filter((i) => i.completed).length /
                    riskAssessment.preLaunchChecklist.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">💡 Best Practices</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Always run an AA test first to verify no Sample Ratio Mismatch</li>
          <li>• Set up alerts for key guardrail metrics before launch</li>
          <li>• Have a clear rollback plan and document it</li>
          <li>• Start with a small traffic allocation for high-risk experiments</li>
        </ul>
      </Card>
    </div>
  )
}
