// T-026b / UI_SPEC §3: one chat message bubble.
// Content renders as plain text — React escapes it. No HTML or markdown is
// rendered, and the bubble shows only the role label, time, and text.
import type { ChatMessage } from '../../../shared/types'

const ROLE_LABEL: Record<ChatMessage['role'], string> = {
  user: 'You',
  assistant: 'AI',
  system: 'System',
}

function formatTime(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps): JSX.Element {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Role is spelled out in text, so roles are never distinguished by color alone (UI_SPEC §6). */}
      <p className="text-[11px] text-[#A3A3A3]">
        {ROLE_LABEL[message.role]} ·{' '}
        <time dateTime={new Date(message.createdAt).toISOString()}>
          {formatTime(message.createdAt)}
        </time>
      </p>
      <p
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-[8px] border px-2.5 py-1.5 text-[13px] text-[#F5F5F5] ${
          isUser
            ? 'border-[#7C9CFF]/30 bg-[#7C9CFF]/[0.12]'
            : 'border-white/[0.08] bg-white/[0.04]'
        }`}
      >
        {message.content}
      </p>
    </div>
  )
}
