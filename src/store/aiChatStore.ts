import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  /** If the assistant called a function, store what was configured */
  configuredAction?: string
}

interface AIChatState {
  messages: ChatMessage[]
  isOpen: boolean
  apiKey: string
  isDemo: boolean
  isLoading: boolean

  toggleChat: () => void
  setOpen: (open: boolean) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setLoading: (loading: boolean) => void
  setApiKey: (key: string) => void
  setDemo: (isDemo: boolean) => void
  clearMessages: () => void
}

export const DEMO_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

export const useAIChatStore = create<AIChatState>()(
  persist(
    (set) => ({
      messages: [],
      isOpen: false,
      apiKey: '',
      isDemo: false,
      isLoading: false,

      toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (open) => set({ isOpen: open }),

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            },
          ],
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      setApiKey: (key) => set({ apiKey: key }),

      setDemo: (isDemo) => set({ isDemo }),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'ai-chat-storage',
      partialize: (state) => ({ apiKey: state.apiKey, isDemo: state.isDemo }),
    }
  )
)
