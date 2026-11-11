// T-026a / D-006: MockProvider chat service (main process).
// PURE: no Electron import — the clock and the id generator are injected and the history
// lives in this module, so every rule below is testable without Electron (mirrors weather.ts).
// D-024: v0.1 ships MockProvider only. No sockets, no secrets, no logging here.
import type { ChatMessage } from '../../shared/types'

export const MOCK_PREFIX = 'Mock reply: ' // IPC_SPEC §5
export const MOCK_PROVIDER = 'mock'
export const MOCK_MODEL = 'mock-v1' // DATA_MODEL §3
export const MOCK_ECHO_CHARS = 80 // IPC_SPEC §5: first 80 chars of the user message
export const HISTORY_CAP = 50 // DATA_MODEL §2: 50 messages stored, oldest evicted
export const CONTEXT_WINDOW = 8 // DATA_MODEL §2: at most 8 previous messages in context

export type AiProvider = 'mock' | 'openai-compatible'

// IPC_SPEC §4 ai:getStatus. Same shape the preload already declares locally.
export interface AiStatus {
  provider: AiProvider
  ready: boolean
  isMock: boolean
}

export interface AiDeps {
  now(): number
  newId(): string
}

export interface AiService {
  getStatus(): AiStatus
  getHistory(): ChatMessage[]
  /** Appends the user message, then the mock reply. Returns the assistant message (IPC_SPEC §4). */
  send(content: string): ChatMessage
  clear(): void
}

export function buildMockReply(content: string): string {
  return MOCK_PREFIX + content.slice(0, MOCK_ECHO_CHARS)
}

// Request-side window: the last 8 messages only, never the whole history.
// The mock answer itself depends on the new user message alone (IPC_SPEC §5), so this is
// what a real adapter sends (T-028) and what keeps the context bounded.
export function buildContext(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-CONTEXT_WINDOW)
}

export function createAiService(deps: AiDeps): AiService {
  let history: ChatMessage[] = []

  const append = (role: ChatMessage['role'], content: string): ChatMessage => {
    const message: ChatMessage = {
      id: deps.newId(),
      role,
      content,
      createdAt: deps.now(),
      provider: MOCK_PROVIDER,
      model: MOCK_MODEL,
    }
    // Cap: keep the newest 50, evict the oldest (DATA_MODEL §2).
    history = [...history, message].slice(-HISTORY_CAP)
    return message
  }

  return {
    // D-024: v0.1 has exactly one provider and it is always ready (in-process, offline).
    getStatus: () => ({ provider: MOCK_PROVIDER, ready: true, isMock: true }),
    // Copies: callers can never mutate stored history.
    getHistory: () => history.map((m) => ({ ...m })),
    send: (content) => {
      append('user', content)
      return append('assistant', buildMockReply(content))
    },
    clear: () => {
      history = []
    },
  }
}
