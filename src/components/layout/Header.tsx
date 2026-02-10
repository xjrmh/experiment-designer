type HeaderOrientation = 'horizontal' | 'vertical'

type HeaderProps = {
  orientation?: HeaderOrientation
}

function LogoMark() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.47 4.306a2.25 2.25 0 0 1-2.133 1.544H8.603a2.25 2.25 0 0 1-2.134-1.544L5 14.5m14 0H5"
        />
      </svg>
    </div>
  )
}

export function Header({ orientation = 'horizontal' }: HeaderProps) {
  if (orientation === 'vertical') {
    return (
      <header className="flex w-12 shrink-0 border-r border-slate-100 bg-white">
        <div className="relative flex h-full w-full flex-col items-center py-4">
          <LogoMark />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-center pl-1 pt-16">
            <span
              className="whitespace-nowrap text-sm tracking-[0.16em]"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              <span className="font-semibold text-slate-800">Experiment Designer</span>
              <span className="text-slate-300"> / </span>
              <span className="font-medium text-slate-400">Guided Workflow</span>
            </span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="shrink-0 border-b border-slate-100 bg-white">
      <div className="flex h-12 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <LogoMark />

        {/* Title */}
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-slate-900">Experiment Designer</span>
          <span className="hidden text-xs text-slate-300 sm:inline">/</span>
          <span className="hidden text-xs text-slate-400 sm:inline">Guided Workflow</span>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center sm:flex">
            <span className="text-xs text-slate-400">Ready</span>
          </div>
        </div>
      </div>
    </header>
  )
}
