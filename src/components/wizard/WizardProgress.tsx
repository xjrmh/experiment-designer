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
  const progressPercent = (currentStep / STEPS.length) * 100

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
      <div className="space-y-3 lg:hidden">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-primary">
                Step {currentStep}: {STEPS[currentStep - 1].label}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {currentStep} of {STEPS.length}
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-slate-500">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="w-full pb-1">
          <div className="grid grid-cols-8 gap-2">
            {STEPS.map((step) => {
              const isCurrent = currentStep === step.number
              const isCompleted = !isCurrent && furthestStep > step.number
              const isAIUpdated = aiUpdatedSteps.includes(step.number)

              return (
                <button
                  key={step.number}
                  onClick={() => {
                    setCurrentStep(step.number)
                    clearAIStepHighlight(step.number)
                  }}
                  title={`${step.number}. ${step.label}`}
                  className={`
                    relative flex h-8 w-full items-center justify-center rounded-full text-xs font-semibold
                    transition-colors transition-transform duration-150 active:translate-y-px
                    ${isCurrent ? 'bg-primary text-white ring-2 ring-primary-100' : ''}
                    ${isCompleted ? 'bg-success text-white' : ''}
                    ${!isCurrent && !isCompleted ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' : ''}
                    ${isAIUpdated ? 'ring-2 ring-primary-200 ring-offset-1 ring-offset-white' : ''}
                  `}
                >
                  {isCompleted ? '✓' : step.number}
                  {isAIUpdated && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
