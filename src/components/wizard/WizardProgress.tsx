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
  const { currentStep, setCurrentStep } = useExperiment()

  return (
    <div>
      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Step Circles and Labels */}
          <div className="grid grid-cols-8 gap-1">
            {STEPS.map((step) => {
              const isCompleted = currentStep > step.number
              const isCurrent = currentStep === step.number
              const isPending = currentStep < step.number

              return (
                <div key={step.number} className="flex flex-col items-center justify-start">
                  {/* Circle */}
                  <button
                    onClick={() => setCurrentStep(step.number)}
                    className={`
                      relative flex items-center justify-center w-8 h-8 rounded-full font-semibold text-xs
                      transition-all duration-200 hover:scale-105
                      ${isCurrent ? 'bg-primary text-white shadow-md ring-2 ring-primary-100' : ''}
                      ${isCompleted ? 'bg-success text-white shadow-sm' : ''}
                      ${isPending ? 'bg-white border-2 border-gray-300 text-gray-500' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </button>

                  {/* Label */}
                  <div className="mt-1 text-center">
                    <div
                      className={`text-xs font-medium transition-colors leading-tight ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-success' : 'text-gray-500'
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
            const isCompleted = currentStep > step.number
            const isCurrent = currentStep === step.number

            return (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.number)}
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold
                    transition-all duration-300
                    ${isCurrent ? 'bg-primary text-white shadow-md' : ''}
                    ${isCompleted ? 'bg-success text-white' : ''}
                    ${!isCurrent && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                  `}
                >
                  {isCompleted ? '✓' : step.number}
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-2 h-0.5 mx-1 ${isCompleted ? 'bg-success' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-primary">
            Step {currentStep}: {STEPS[currentStep - 1].label}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {currentStep} of {STEPS.length}
          </div>
        </div>
      </div>
    </div>
  )
}
