import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import type { SampleSizeResult } from '@/types'

interface CausalInferencePanelProps {
  sampleSizeResult: SampleSizeResult | null
}

const METHODS = [
  { value: 'did', label: 'Difference-in-Differences (DiD)' },
  { value: 'rdd', label: 'Regression Discontinuity Design (RDD)' },
  { value: 'psm', label: 'Propensity Score Matching (PSM)' },
  { value: 'iv', label: 'Instrumental Variables (IV)' },
]

export function CausalInferencePanel({ sampleSizeResult }: CausalInferencePanelProps) {
  const { statisticalParams, updateTypeSpecificParams } = useExperiment()
  const tp = statisticalParams.typeSpecificParams || {}

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-1">Causal Inference Method</h3>
      <p className="text-sm text-gray-500 mb-4">
        Select the estimation strategy. Each method has different assumptions and data requirements.
      </p>
      <div className="space-y-4">
        <Select
          label="Estimation Method"
          value={tp.causalMethod ?? 'did'}
          onChange={(e) => updateTypeSpecificParams({ causalMethod: e.target.value as 'did' | 'rdd' | 'psm' | 'iv' })}
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>

        {tp.causalMethod === 'did' && (
          <Input
            label="Serial Correlation"
            type="number"
            step={0.05}
            min={0}
            max={0.9}
            value={tp.serialCorrelation ?? 0.2}
            onChange={(e) => updateTypeSpecificParams({ serialCorrelation: parseFloat(e.target.value) || 0 })}
            helperText="Within-unit correlation over time. Inflates required sample size."
          />
        )}

        {tp.causalMethod === 'rdd' && (
          <Input
            label="Bandwidth"
            type="number"
            step={0.1}
            min={0.1}
            value={tp.bandwidth ?? 1}
            onChange={(e) => updateTypeSpecificParams({ bandwidth: parseFloat(e.target.value) || 0.1 })}
            helperText="Distance from threshold to include. Smaller = less bias, larger = more power."
          />
        )}

        {sampleSizeResult?.methodNotes && sampleSizeResult.methodNotes.length > 0 && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Method Notes</div>
            <ul className="space-y-1">
              {sampleSizeResult.methodNotes.map((note, i) => (
                <li key={i} className="text-sm text-gray-600">• {note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
