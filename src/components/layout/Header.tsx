import { useState, useCallback } from 'react'
import { AIChatButton } from '../ai/AIChatButton'

const BUBBLES = ['🔬', '⚗️', '🧬', '💊', '📊', '✨', '🎯', '📈', '🧫', '💡']

export function Header() {
  const [bubbles, setBubbles] = useState<{ id: number; emoji: string; x: number; y: number }[]>([])
  const [shaking, setShaking] = useState(false)

  const handleClick = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)

    const newBubbles = Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 30 + Math.random() * 20 - 10) * (Math.PI / 180)
      const dist = Math.random() * 60 + 80
      return {
        id: Date.now() + i,
        emoji: BUBBLES[Math.floor(Math.random() * BUBBLES.length)],
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      }
    })
    setBubbles((prev) => [...prev, ...newBubbles])
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => !newBubbles.some((nb) => nb.id === b.id)))
    }, 900)
  }, [])

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <style>{`
        @keyframes bubble-float {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(calc(var(--bx) - 50%), calc(var(--by) - 50%)) scale(0.4); }
        }
        @keyframes flask-shake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(12deg); }
          60% { transform: rotate(-8deg); }
          80% { transform: rotate(5deg); }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClick}
              className="relative text-4xl filter drop-shadow-sm cursor-pointer select-none hover:scale-110 transition-transform"
              style={shaking ? { animation: 'flask-shake 0.5s ease-in-out' } : undefined}
            >
              🧪
              {bubbles.map((b) => (
                <span
                  key={b.id}
                  className="absolute left-1/2 top-1/2 pointer-events-none text-xl"
                  style={{
                    '--bx': `${b.x}px`,
                    '--by': `${b.y}px`,
                    animation: 'bubble-float 0.8s ease-out forwards',
                  } as React.CSSProperties}
                >
                  {b.emoji}
                </span>
              ))}
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Experiment Designer</h1>
              <p className="text-sm text-gray-600 mt-0.5 hidden sm:block">Design, calculate, and document your experiments</p>
            </div>
          </div>
          <AIChatButton />
        </div>
      </div>
    </header>
  )
}
