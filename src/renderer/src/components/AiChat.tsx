// T-026b / UI_SPEC §3, §5, §6: AI chat panel over the T-026a mock provider.
// The renderer talks only to the typed islandApi — no Electron internals, no
// network, and no settings UI for the AI connection (that is T-027/T-028/T-029,
// v0.2 scope). window:setInputActive suspends the main-process blur-collapse
// while the user types; it is cleared on empty blur, on send, and on unmount.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import type { ChatMessage } from '../../../shared/types'
import { MessageBubble } from './MessageBubble'

type LoadState = 'loading' | 'ready' | 'error'

const GENERIC_ERROR = 'AI request failed'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AiChat(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      const res = await window.islandApi.getAiHistory()
      if (res.ok && res.data !== null) {
        setMessages(res.data)
        setLoadState('ready')
      } else {
        setLoadError(res.error?.message ?? GENERIC_ERROR)
        setLoadState('error')
      }
    } catch {
      setLoadError(GENERIC_ERROR)
      setLoadState('error')
    }
  }, [])

  // Load status + history once on mount. Both envelopes are handled here so no
  // promise rejection can escape to the console.
  useEffect(() => {
    void (async (): Promise<void> => {
      try {
        const status = await window.islandApi.getAiStatus()
        if (status.ok && status.data) setIsMock(status.data.isMock)
      } catch {
        // Status is cosmetic: a failure only drops the Mock Mode badge.
      }
      await loadHistory()
    })()
  }, [loadHistory])

  // Focus reporting: active while the input is focused or holds text, so the
  // island does not collapse mid-typing. False on empty blur and on unmount.
  const inputActive = focused || draft.length > 0

  useEffect(() => {
    window.islandApi.setInputActive(inputActive)
  }, [inputActive])

  useEffect(() => () => window.islandApi.setInputActive(false), [])

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: 'end',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [messages])

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const content = draft.trim()
    if (content === '' || sending) return

    setSending(true)
    setSendError(null)
    try {
      const res = await window.islandApi.sendAiMessage(content)
      if (res.ok) {
        setDraft('')
      } else {
        // Only ai:* envelopes — their messages are hardcoded in main, never raw errors.
        setSendError(res.error?.message ?? GENERIC_ERROR)
      }
      // Main stores the user message even when the reply fails (IPC_SPEC §5), so
      // re-read persisted history instead of guessing ids locally.
      await loadHistory()
    } catch {
      setSendError(GENERIC_ERROR)
    } finally {
      setSending(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-1 items-center justify-center text-[12px] text-[#A3A3A3]"
      >
        Loading conversation...
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div
        role="alert"
        className="rounded-[8px] border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-3 py-2 text-[12px] text-[#FF6B6B]"
      >
        Error: {loadError}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-[12px] font-medium text-[#A3A3A3]">AI Chat</h2>
        {/* UI_SPEC §5: badge when no valid AI config is found. */}
        {isMock && (
          <span className="rounded-full border border-white/[0.12] px-2 py-0.5 text-[11px] text-[#A3A3A3]">
            Mock Mode
          </span>
        )}
      </div>

      <div
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        aria-relevant="additions"
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-0.5"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-[#A3A3A3]">Start a conversation</p>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {sendError !== null && (
        <p role="alert" className="text-[11px] text-[#FF6B6B]">
          Error: {sendError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor="ai-chat-input" className="sr-only">
          Message
        </label>
        <input
          id="ai-chat-input"
          type="text"
          value={draft}
          maxLength={4000}
          autoComplete="off"
          placeholder="Type a message"
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 rounded-[8px] border border-white/[0.12] bg-white/[0.04] px-2.5 py-1.5 text-[13px] text-[#F5F5F5] placeholder:text-[#A3A3A3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF]"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={sending || draft.trim() === ''}
          className="rounded-[8px] p-1.5 text-[#F5F5F5] transition-opacity duration-100 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF] enabled:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
