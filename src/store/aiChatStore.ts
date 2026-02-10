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
  resetVersion: number

  toggleChat: () => void
  setOpen: (open: boolean) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setLoading: (loading: boolean) => void
  setApiKey: (key: string) => void
  setDemo: (isDemo: boolean) => void
  clearMessages: () => void
  resetConversation: () => void
}

export const useAIChatStore = create<AIChatState>()(
  persist(
    (set) => ({
      messages: [],
      isOpen: false,
      apiKey: '',
      isDemo: false,
      isLoading: false,
      resetVersion: 0,

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

      setApiKey: (key) =>
        set((state) => {
          const trimmedKey = key.trim()
          return {
            apiKey: trimmedKey,
            // If a personal key is provided, prefer direct mode.
            isDemo: trimmedKey ? false : state.isDemo,
          }
        }),

      setDemo: (isDemo) => set({ isDemo }),

      clearMessages: () => set({ messages: [] }),

      resetConversation: () =>
        set((state) => ({
          messages: [],
          isLoading: false,
          resetVersion: state.resetVersion + 1,
        })),
    }),
    {
      name: 'ai-chat-storage',
      partialize: (state) => ({ apiKey: state.apiKey, isDemo: state.isDemo }),
    }
  )
)
