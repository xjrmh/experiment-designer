import { useAIChatStore } from '@/store/aiChatStore'

export function AIChatButton() {
  const toggleChat = useAIChatStore((s) => s.toggleChat)
  const isOpen = useAIChatStore((s) => s.isOpen)

  return (
    <button
      onClick={toggleChat}
      className={`
        group inline-flex lg:hidden items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
        transition-colors transition-transform duration-150 cursor-pointer select-none active:translate-y-px
        border border-primary-600 bg-primary-600 text-white hover:border-primary-500 hover:bg-primary-500
        ${isOpen ? 'ring-2 ring-primary-300' : ''}
      `}
    >
      <svg
        className="h-5 w-5 opacity-90"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
        />
      </svg>
      <span className="hidden sm:inline">Experiment Assistant</span>
    </button>
  )
}
