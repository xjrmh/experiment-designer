import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { WizardContainer } from './components/wizard/WizardContainer'
import { WizardProgress } from './components/wizard/WizardProgress'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Banner: Header + Navigation Bar */}
      <div className="sticky top-0 z-50">
        <Header />
        <div className="bg-gradient-to-b from-white/95 to-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <WizardProgress />
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 lg:p-10 border border-gray-200">
          <WizardContainer />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default App
