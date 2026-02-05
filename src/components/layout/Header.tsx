import { useState } from 'react'

export function Header() {
  const [showHelp, setShowHelp] = useState(false)

  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowHelp(true)
    setTimeout(() => {
      setShowHelp(false)
    }, 3000)
  }

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl filter drop-shadow-sm">🧪</div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Experiment Designer</h1>
                <p className="text-sm text-gray-600 mt-0.5 hidden sm:block">Design, calculate, and document your experiments</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleHelpClick}
                className="text-gray-600 hover:text-primary font-medium transition-colors duration-200 text-sm md:text-base"
              >
                Help
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Help Animation Toast */}
      {showHelp && (
        <div className="fixed top-24 right-4 z-[60] animate-slideIn">
          <div className="bg-white border-2 border-primary rounded-lg shadow-2xl p-6 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="text-3xl animate-bounce">🤔</div>
              <div>
                <p className="text-gray-900 font-semibold mb-1">
                  Help is on the way...
                </p>
                <p className="text-gray-600 text-sm">
                  or not. DM your DS instead. 😅
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
