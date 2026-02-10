import { useExperiment } from '@/hooks/useExperiment'
import { Button } from '../common/Button'
import { ExperimentType } from '@/types'
import { Step1ExperimentType } from './steps/Step1ExperimentType'
import { Step2MetricsSelection } from './steps/Step2MetricsSelection'
import { Step3SampleSize } from './steps/Step3SampleSize'
import { Step4Randomization } from './steps/Step4Randomization'
import { Step5VarianceReduction } from './steps/Step5VarianceReduction'
import { Step6RiskAssessment } from './steps/Step6RiskAssessment'
import { Step7Monitoring } from './steps/Step7Monitoring'
import { Step8Summary } from './steps/Step8Summary'

export function WizardContainer() {
  const { currentStep, previousStep, nextStep, experimentType, metrics, statisticalParams, reset } = useExperiment()

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ExperimentType />
      case 2:
        return <Step2MetricsSelection />
      case 3:
        return <Step3SampleSize />
      case 4:
        return <Step4Randomization />
      case 5:
        return <Step5VarianceReduction />
      case 6:
        return <Step6RiskAssessment />
      case 7:
        return <Step7Monitoring />
      case 8:
        return <Step8Summary />
      default:
        return <Step1ExperimentType />
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return experimentType !== null
      case 2:
        return metrics.length > 0 && metrics.some((m) => m.category === 'PRIMARY')
      case 3: {
        const tp = statisticalParams.typeSpecificParams
        if (experimentType === ExperimentType.CLUSTER) {
          return tp?.icc != null && tp.icc > 0 && tp?.clusterSize != null && tp.clusterSize >= 2
        }
        if (experimentType === ExperimentType.FACTORIAL) {
          return tp?.factors != null && tp.factors.length >= 2 && tp.factors.every(f => f.levels >= 2)
        }
        return true
      }
      default:
        return true
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 min-h-[500px]">
        {renderStep()}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6">
        {currentStep < 8 && (
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStep === 1}
            size="md"
          >
            <span className="flex items-center gap-2">
              <span>←</span>
              <span>Previous</span>
            </span>
          </Button>
        )}

        <div className="ml-auto flex gap-3">
          <Button variant="ghost" onClick={reset} size="md">
            Reset
          </Button>
          {currentStep < 8 ? (
            <Button onClick={nextStep} disabled={!canProceed()} size="md">
              <span className="flex items-center gap-2">
                <span>Next</span>
                <span>→</span>
              </span>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
