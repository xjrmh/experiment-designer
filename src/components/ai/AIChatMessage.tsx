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
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.configuredAction && (
          <div
            className={`mt-2 pt-2 border-t text-xs ${
              isUser ? 'border-white/20 text-white/80' : 'border-gray-200 text-gray-500'
            }`}
          >
            {message.configuredAction}
          </div>
        )}
      </div>
    </div>
  )
}
