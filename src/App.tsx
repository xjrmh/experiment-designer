import { useEffect, useState } from 'react'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { WizardContainer } from './components/wizard/WizardContainer'
import { WizardProgress } from './components/wizard/WizardProgress'
import { AIChatDialog } from './components/ai/AIChatDialog'
import { AIChatButton } from './components/ai/AIChatButton'

const LG_BREAKPOINT = 1024

function App() {
  const [isLg, setIsLg] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= LG_BREAKPOINT : false
  )

  useEffect(() => {
    const handleResize = () => {
      setIsLg(window.innerWidth >= LG_BREAKPOINT)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className={`flex h-screen overflow-hidden bg-white ${isLg ? 'flex-row' : 'flex-col'}`}>
      {isLg && <Header orientation="vertical" />}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Header */}
        {!isLg && <Header />}

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Left: Progress + scrollable main content */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Wizard progress — always visible */}
            <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-5xl">
                <WizardProgress />
              </div>
            </div>

            {/* Scrollable main content */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
              <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="p-5 sm:p-7 lg:p-8">
                  <WizardContainer />
                </div>
              </main>
              <div className="mt-auto">
                <Footer />
              </div>
            </div>
          </div>

          {/* Right: AI Assistant — always visible panel (desktop) */}
          {isLg ? (
            <aside className="flex w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white">
              <AIChatDialog mode="docked" />
            </aside>
          ) : (
            <AIChatDialog mode="popup" />
          )}
        </div>

        {/* Mobile: floating AI chat trigger */}
        {!isLg && (
          <div className="fixed bottom-5 right-5 z-50">
            <AIChatButton />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
