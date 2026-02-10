import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Select } from '@/components/common/Select'
import { Input } from '@/components/common/Input'
import { RandomizationUnit, BucketingStrategy, ExperimentType } from '@/types'
import { EXPERIMENT_TEMPLATES } from '@/constants/experimentTypes'

const LOCKED_UNIT_TYPES: ExperimentType[] = [ExperimentType.CLUSTER, ExperimentType.SWITCHBACK, ExperimentType.MAB]

export function Step4Randomization() {
  const { randomization, updateRandomization, experimentType } = useExperiment()
  const template = experimentType ? EXPERIMENT_TEMPLATES[experimentType] : null
  const isUnitLocked = experimentType != null && LOCKED_UNIT_TYPES.includes(experimentType)
  const isConsistentLocked = experimentType === ExperimentType.SWITCHBACK || experimentType === ExperimentType.MAB
  const stratificationValue = randomization.stratificationVariables.map((v) => v.name).join(', ')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Randomization Strategy</h2>
        <p className="mt-2 text-gray-600">
          Define how users will be assigned to experiment variants
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Randomization Unit</h3>
          <div className="space-y-4">
            <Select
              label="Unit of Randomization"
              value={randomization.unit}
              onChange={(e) => updateRandomization({ unit: e.target.value as RandomizationUnit })}
              disabled={isUnitLocked}
            >
              <option value={RandomizationUnit.USER_ID}>User ID</option>
              <option value={RandomizationUnit.SESSION}>Session</option>
              <option value={RandomizationUnit.DEVICE}>Device</option>
              <option value={RandomizationUnit.REQUEST}>Request</option>
              <option value={RandomizationUnit.CLUSTER}>Cluster</option>
            </Select>

            {isUnitLocked && template && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Randomization unit is set to <strong>{randomization.unit}</strong> as required for {template.name}.
                </p>
              </div>
            )}

            {!isUnitLocked && template?.recommendedRandomization?.unit && randomization.unit !== template.recommendedRandomization.unit && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  The recommended randomization unit for {template.name} is <strong>{template.recommendedRandomization.unit}</strong>.
                </p>
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>User ID:</strong> Most common. Same user always sees same variant.</p>
              <p><strong>Session:</strong> User may see different variants across sessions.</p>
              <p><strong>Device:</strong> Randomize by device identifier.</p>
              <p><strong>Request:</strong> Each request is randomized independently.</p>
              <p><strong>Cluster:</strong> Randomize groups (cities, stores, etc.).</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Bucketing Strategy</h3>
          <div className="space-y-4">
            <Select
              label="Bucketing Method"
              value={randomization.bucketingStrategy}
              onChange={(e) =>
                updateRandomization({ bucketingStrategy: e.target.value as BucketingStrategy })
              }
            >
              <option value={BucketingStrategy.HASH_BASED}>Hash-based</option>
              <option value={BucketingStrategy.RANDOM}>Random</option>
            </Select>

            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={randomization.consistentAssignment}
                  onChange={(e) => updateRandomization({ consistentAssignment: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={isConsistentLocked}
                />
                <span className="text-sm text-gray-700">Consistent Assignment</span>
              </label>
              <p className="text-sm text-gray-600 ml-6">
                User sees same variant on return visits
              </p>
              {isConsistentLocked && (
                <p className="text-sm text-blue-700 ml-6">
                  Disabled for {template?.name} — users experience different conditions across periods/requests.
                </p>
              )}
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Hash-based:</strong> Deterministic assignment based on user ID hash. Ensures consistency.</p>
              <p><strong>Random:</strong> True random assignment. Use for switchback experiments.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Stratification (Optional)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Stratify randomization by key variables to ensure balance across groups
        </p>
        <Input
          label="Stratification Variables"
          placeholder="e.g., platform, geography, user_segment (comma-separated)"
          value={stratificationValue}
          onChange={(e) =>
            updateRandomization({
              stratificationVariables: e.target.value
                .split(',')
                .map((name) => name.trim())
                .filter(Boolean)
                .map((name) => ({ name, values: [] })),
            })
          }
          helperText="Leave empty if not using stratification"
        />
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">💡 Best Practices</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Use <strong>User ID</strong> randomization for most experiments</li>
          <li>• Enable <strong>consistent assignment</strong> to avoid user confusion</li>
          <li>• Use <strong>hash-based</strong> bucketing for reproducibility</li>
          <li>• Consider stratification if key variables affect the metric</li>
        </ul>
      </Card>
    </div>
  )
}
