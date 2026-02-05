import { useExperiment } from '@/hooks/useExperiment'
import { Button } from '../common/Button'
import { Step1ExperimentType } from './steps/Step1ExperimentType'
import { Step2MetricsSelection } from './steps/Step2MetricsSelection'
import { Step3SampleSize } from './steps/Step3SampleSize'
import { Step4Randomization } from './steps/Step4Randomization'
import { Step5VarianceReduction } from './steps/Step5VarianceReduction'
import { Step6RiskAssessment } from './steps/Step6RiskAssessment'
import { Step7Monitoring } from './steps/Step7Monitoring'
import { Step8Summary } from './steps/Step8Summary'

export function WizardContainer() {
  const { currentStep, previousStep, nextStep, experimentType, metrics, reset } = useExperiment()

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
      default:
        return true
    }
  }

  return (
    <div className="w-full">
      <div className="min-h-[500px] mb-8">
        {renderStep()}
      </div>

      <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-200 bg-white/50 backdrop-blur-sm -mx-6 px-6 py-4 rounded-b-xl">
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

        <div className="flex gap-3">
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
