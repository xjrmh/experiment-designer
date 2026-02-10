import type { ChatMessage } from '@/store/aiChatStore'

interface AIChatMessageProps {
  message: ChatMessage
}

export function AIChatMessage({ message }: AIChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'rounded-br-md bg-primary-600 text-white'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.configuredAction && (
          <div
            className={`mt-2 pt-2 border-t text-xs ${
              isUser ? 'border-primary-400/40 text-primary-100' : 'border-slate-200 text-primary-600'
            }`}
          >
            {message.configuredAction}
          </div>
        )}
      </div>
    </div>
  )
}
