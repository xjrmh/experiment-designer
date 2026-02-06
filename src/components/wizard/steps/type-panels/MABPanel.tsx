import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import type { SampleSizeResult } from '@/types'

interface MABPanelProps {
  sampleSizeResult: SampleSizeResult | null
}

export function MABPanel({ sampleSizeResult }: MABPanelProps) {
  const { statisticalParams, updateTypeSpecificParams } = useExperiment()
  const tp = statisticalParams.typeSpecificParams || {}

  return (
    <>
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 font-medium">
          Multi-Armed Bandits use adaptive allocation — traditional power analysis does not directly apply.
        </p>
        <p className="text-sm text-amber-700 mt-1">
          Configure your exploration budget below. The exploration phase determines how many observations each arm receives before the algorithm converges.
        </p>
      </div>
      <Card>
        <h3 className="font-semibold text-gray-900 mb-1">MAB Configuration</h3>
        <p className="text-sm text-gray-500 mb-4">
          Epsilon-greedy: explores with probability ε, exploits best arm otherwise.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Number of Arms"
            type="number"
            min={2}
            value={tp.numArms ?? 3}
            onChange={(e) => updateTypeSpecificParams({ numArms: parseInt(e.target.value) || 2 })}
            helperText="Treatment variants to test"
          />
          <Input
            label="Total Horizon"
            type="number"
            min={1000}
            step={1000}
            value={tp.horizon ?? 100000}
            onChange={(e) => updateTypeSpecificParams({ horizon: parseInt(e.target.value) || 1000 })}
            helperText="Total observations budget"
          />
          <Input
            label="Exploration Rate (ε)"
            type="number"
            step={0.01}
            min={0.01}
            max={0.5}
            value={tp.explorationRate ?? 0.1}
            onChange={(e) => updateTypeSpecificParams({ explorationRate: parseFloat(e.target.value) || 0.01 })}
            helperText="Fraction allocated to exploration"
          />
        </div>
        {sampleSizeResult && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Exploration Budget per Arm</div>
              <div className="text-2xl font-bold text-blue-700">
                {sampleSizeResult.sampleSizePerVariant.toLocaleString()}
              </div>
            </div>
            {sampleSizeResult.estimatedRegret != null && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Estimated Regret</div>
                <div className="text-2xl font-bold text-blue-700">
                  {sampleSizeResult.estimatedRegret.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Opportunity cost of exploration
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  )
}
