import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import type { SampleSizeResult } from '@/types'

interface ClusterPanelProps {
  sampleSizeResult: SampleSizeResult | null
}

export function ClusterPanel({ sampleSizeResult }: ClusterPanelProps) {
  const { statisticalParams, updateTypeSpecificParams } = useExperiment()
  const tp = statisticalParams.typeSpecificParams || {}

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-1">Cluster Design Parameters</h3>
      <p className="text-sm text-gray-500 mb-4">
        Cluster randomization inflates required sample size due to within-cluster correlation.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Intra-Cluster Correlation (ICC)"
          type="number"
          step={0.01}
          min={0}
          max={1}
          value={tp.icc ?? 0.05}
          onChange={(e) => updateTypeSpecificParams({ icc: parseFloat(e.target.value) || 0 })}
          helperText="Typical range: 0.01 - 0.10"
        />
        <Input
          label="Average Cluster Size"
          type="number"
          min={2}
          value={tp.clusterSize ?? 50}
          onChange={(e) => updateTypeSpecificParams({ clusterSize: parseInt(e.target.value) || 2 })}
          helperText="Average number of units per cluster"
        />
      </div>
      {sampleSizeResult?.designEffect != null && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Design Effect (DEFF)</div>
            <div className="text-2xl font-bold text-blue-700">
              {sampleSizeResult.designEffect.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Sample size multiplier due to clustering
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Clusters Needed (Total)</div>
            <div className="text-2xl font-bold text-blue-700">
              {sampleSizeResult.clustersNeeded ?? '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Across all arms
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
