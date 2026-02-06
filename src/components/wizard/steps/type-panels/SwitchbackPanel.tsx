import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import type { SampleSizeResult } from '@/types'

interface SwitchbackPanelProps {
  sampleSizeResult: SampleSizeResult | null
}

export function SwitchbackPanel({ sampleSizeResult }: SwitchbackPanelProps) {
  const { statisticalParams, updateTypeSpecificParams } = useExperiment()
  const tp = statisticalParams.typeSpecificParams || {}

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-1">Switchback Parameters</h3>
      <p className="text-sm text-gray-500 mb-4">
        Switchback experiments alternate between treatment and control over time periods. Autocorrelation between periods reduces effective sample size.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Number of Periods"
          type="number"
          min={4}
          value={tp.numPeriods ?? 14}
          onChange={(e) => updateTypeSpecificParams({ numPeriods: parseInt(e.target.value) || 4 })}
          helperText="Total switchback periods"
        />
        <Input
          label="Period Length (hours)"
          type="number"
          min={1}
          value={tp.periodLength ?? 24}
          onChange={(e) => updateTypeSpecificParams({ periodLength: parseInt(e.target.value) || 1 })}
          helperText="Duration of each period"
        />
        <Input
          label="Autocorrelation (ρ)"
          type="number"
          step={0.05}
          min={0}
          max={0.9}
          value={tp.autocorrelation ?? 0.3}
          onChange={(e) => updateTypeSpecificParams({ autocorrelation: parseFloat(e.target.value) || 0 })}
          helperText="Temporal correlation between periods"
        />
      </div>
      {sampleSizeResult?.effectivePeriods != null && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600">Effective Periods</div>
          <div className="text-2xl font-bold text-blue-700">
            {sampleSizeResult.effectivePeriods}
            <span className="text-sm font-normal text-gray-500 ml-2">
              of {tp.numPeriods ?? 14} total
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Reduced from total due to autocorrelation
          </div>
        </div>
      )}
    </Card>
  )
}
