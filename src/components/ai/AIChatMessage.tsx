import type { ChatMessage } from '@/store/aiChatStore'

interface AIChatMessageProps {
  message: ChatMessage
}

export function AIChatMessage({ message }: AIChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-blue-600 text-white'
            : 'rounded-bl-md border border-blue-100 bg-white text-slate-700'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.configuredAction && (
          <div
            className={`mt-2 pt-2 border-t text-xs ${
              isUser ? 'border-blue-400/30 text-blue-100' : 'border-blue-50 text-slate-400'
            }`}
          >
            {message.configuredAction}
          </div>
        )}
      </div>
    </div>
  )
}
