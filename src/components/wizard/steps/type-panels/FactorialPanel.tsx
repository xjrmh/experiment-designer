import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import { Button } from '@/components/common/Button'
import type { SampleSizeResult } from '@/types'

interface FactorialPanelProps {
  sampleSizeResult: SampleSizeResult | null
}

export function FactorialPanel({ sampleSizeResult }: FactorialPanelProps) {
  const { statisticalParams, updateTypeSpecificParams, updateStatisticalParams } = useExperiment()
  const tp = statisticalParams.typeSpecificParams || {}
  const factors = tp.factors || [{ name: 'Factor A', levels: 2 }, { name: 'Factor B', levels: 2 }]

  const totalCells = factors.reduce((p, f) => p * f.levels, 1)

  const syncVariants = (newFactors: typeof factors) => {
    const cells = newFactors.reduce((p, f) => p * f.levels, 1)
    const allocation = Array(cells).fill(Math.floor(100 / cells))
    allocation[allocation.length - 1] = 100 - allocation.slice(0, -1).reduce((s, v) => s + v, 0)
    updateStatisticalParams({ variants: cells, trafficAllocation: allocation })
  }

  const updateFactor = (index: number, field: 'name' | 'levels', value: string | number) => {
    const updated = factors.map((f, i) =>
      i === index ? { ...f, [field]: field === 'levels' ? Math.max(2, Number(value)) : value } : f
    )
    updateTypeSpecificParams({ factors: updated })
    syncVariants(updated)
  }

  const addFactor = () => {
    const updated = [...factors, { name: `Factor ${String.fromCharCode(65 + factors.length)}`, levels: 2 }]
    updateTypeSpecificParams({ factors: updated })
    syncVariants(updated)
  }

  const removeFactor = (index: number) => {
    if (factors.length <= 2) return
    const updated = factors.filter((_, i) => i !== index)
    updateTypeSpecificParams({ factors: updated })
    syncVariants(updated)
  }

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-1">Factorial Design</h3>
      <p className="text-sm text-gray-500 mb-4">
        Test multiple factors simultaneously. Total cells = product of all factor levels.
      </p>
      <div className="space-y-3">
        {factors.map((factor, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg bg-slate-50/70 p-3 sm:flex-row sm:items-end sm:bg-transparent sm:p-0">
            <div className="flex-1">
              <Input
                label={i === 0 ? 'Factor Name' : undefined}
                value={factor.name}
                onChange={(e) => updateFactor(i, 'name', e.target.value)}
              />
            </div>
            <div className="w-full sm:w-28">
              <Input
                label={i === 0 ? 'Levels' : undefined}
                type="number"
                min={2}
                max={10}
                value={factor.levels}
                onChange={(e) => updateFactor(i, 'levels', e.target.value)}
              />
            </div>
            {factors.length > 2 && (
              <button
                onClick={() => removeFactor(i)}
                className="self-end p-2 text-gray-400 transition-colors hover:text-red-500 sm:mb-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      {factors.length < 5 && (
        <Button variant="ghost" size="sm" onClick={addFactor} className="mt-3">
          + Add Factor
        </Button>
      )}
      <div className="mt-4 flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={tp.detectInteraction ?? false}
            onChange={(e) => updateTypeSpecificParams({ detectInteraction: e.target.checked })}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">Detect interaction effects (~4x sample size)</span>
        </label>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600">Total Cells</div>
          <div className="text-2xl font-bold text-blue-700">{totalCells}</div>
          <div className="text-xs text-gray-500 mt-1">
            {factors.map(f => f.levels).join(' × ')}
          </div>
        </div>
        {sampleSizeResult?.cellSampleSize != null && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Sample per Cell</div>
            <div className="text-2xl font-bold text-blue-700">
              {sampleSizeResult.cellSampleSize.toLocaleString()}
            </div>
          </div>
        )}
        {sampleSizeResult?.interactionSampleSize != null && (
          <div className="p-4 bg-amber-50 rounded-lg">
            <div className="text-sm text-gray-600">Total (with Interaction)</div>
            <div className="text-2xl font-bold text-amber-700">
              {sampleSizeResult.interactionSampleSize.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
