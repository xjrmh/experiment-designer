import { useExperiment } from '@/hooks/useExperiment'

const STEPS = [
  { number: 1, label: 'Experiment Type', shortLabel: 'Type' },
  { number: 2, label: 'Metrics', shortLabel: 'Metrics' },
  { number: 3, label: 'Sample Size', shortLabel: 'Sample' },
  { number: 4, label: 'Randomization', shortLabel: 'Random' },
  { number: 5, label: 'Variance Reduction', shortLabel: 'Variance' },
  { number: 6, label: 'Risk Assessment', shortLabel: 'Risk' },
  { number: 7, label: 'Monitoring', shortLabel: 'Monitor' },
  { number: 8, label: 'Summary', shortLabel: 'Summary' },
]

export function WizardProgress() {
  const { currentStep, furthestStep, setCurrentStep, aiUpdatedSteps, clearAIStepHighlight } = useExperiment()

  return (
    <div>
      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Step Circles and Labels */}
          <div className="grid grid-cols-8 gap-1">
            {STEPS.map((step) => {
              const isCurrent = currentStep === step.number
              const isCompleted = !isCurrent && furthestStep > step.number
              const isPending = !isCurrent && !isCompleted
              const isAIUpdated = aiUpdatedSteps.includes(step.number)

              return (
                <div key={step.number} className="flex flex-col items-center justify-start">
                  {/* Circle */}
                  <button
                    onClick={() => {
                      setCurrentStep(step.number)
                      clearAIStepHighlight(step.number)
                    }}
                    className={`
                      relative flex items-center justify-center w-8 h-8 rounded-full font-semibold text-xs
                      transition-colors transition-transform duration-150 active:translate-y-px
                      ${isCurrent ? 'bg-primary text-white ring-2 ring-primary-100' : ''}
                      ${isCompleted ? 'bg-success text-white' : ''}
                      ${isPending ? 'bg-white border-2 border-slate-300 text-slate-400 hover:border-slate-400' : ''}
                      ${isAIUpdated ? 'ring-2 ring-primary-200 ring-offset-2 ring-offset-white' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      step.number
                    )}
                    {isAIUpdated && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary-500 ring-2 ring-white" />
                    )}
                  </button>

                  {/* Label */}
                  <div className="mt-1 text-center">
                    <div
                      className={`text-xs font-medium transition-colors leading-tight ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-success' : 'text-slate-400'
                      }`}
                    >
                      {step.shortLabel}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile/Tablet View */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => {
            const isCurrent = currentStep === step.number
            const isCompleted = !isCurrent && furthestStep > step.number
            const isAIUpdated = aiUpdatedSteps.includes(step.number)
            const isConnectorCompleted = furthestStep > step.number

            return (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => {
                    setCurrentStep(step.number)
                    clearAIStepHighlight(step.number)
                  }}
                  className={`
                    relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold
                    transition-colors transition-transform duration-150 active:translate-y-px
                    ${isCurrent ? 'bg-primary text-white ring-2 ring-primary-100' : ''}
                    ${isCompleted ? 'bg-success text-white' : ''}
                    ${!isCurrent && !isCompleted ? 'bg-slate-200 text-slate-400' : ''}
                    ${isAIUpdated ? 'ring-2 ring-primary-200 ring-offset-1 ring-offset-white' : ''}
                  `}
                >
                  {isCompleted ? '✓' : step.number}
                  {isAIUpdated && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white" />
                  )}
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-2 h-0.5 mx-1 ${isConnectorCompleted ? 'bg-success' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-primary">
            Step {currentStep}: {STEPS[currentStep - 1].label}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {currentStep} of {STEPS.length}
          </div>
        </div>
      </div>
    </div>
  )
}
