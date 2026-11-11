// T-026a: MockProvider + store-backed history. Hermetic: no Electron, no network, no timers.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  CONTEXT_WINDOW,
  MOCK_ECHO_CHARS,
  MOCK_MODEL,
  MOCK_PREFIX,
  buildContext,
  buildMockReply,
  createAiService,
  type AiService,
  type ChatStorePort,
} from './ai'
import type { ChatMessage } from '../../shared/types'

const NOW = 1_700_000_000_000

// Fake port: mimics AppStore.pushChat — append then cap at 50, oldest evicted (DATA_MODEL §2).
const fakeStore = (cap = 50): ChatStorePort & { messages: ChatMessage[]; pushes: ChatMessage[] } => {
  const store = {
    messages: [] as ChatMessage[],
    pushes: [] as ChatMessage[],
    getMessages: (): ChatMessage[] => store.messages,
    pushMessage: (message: ChatMessage): void => {
      store.pushes.push(message)
      store.messages = [...store.messages, message].slice(-cap)
    },
    clearMessages: (): void => {
      store.messages = []
    },
  }
  return store
}

// Deterministic deps: fixed clock, sequential ids. No state lives in the service.
let seq = 0
const service = (chatStore: ChatStorePort = fakeStore()): AiService =>
  createAiService({ now: () => NOW, newId: () => `id-${++seq}`, chatStore })

const sendN = (svc: AiService, n: number): void => {
  for (let i = 1; i <= n; i++) svc.send(`m${i}`)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('MockProvider reply', () => {
  it('starts with "Mock reply: "', () => {
    const reply = service().send('hello')
    expect(reply.content.startsWith(MOCK_PREFIX)).toBe(true)
    expect(reply.content).toBe('Mock reply: hello')
  })

  it('includes at most the first 80 characters of the user message', () => {
    const reply = service().send('x'.repeat(500))
    expect(reply.content).toBe(MOCK_PREFIX + 'x'.repeat(80))
    expect(reply.content.length).toBe(MOCK_PREFIX.length + MOCK_ECHO_CHARS)
    expect(buildMockReply('y'.repeat(81))).toBe(MOCK_PREFIX + 'y'.repeat(80))
  })

  it('does not pad or trim short messages', () => {
    const svc = service()
    expect(svc.send('hi').content).toBe('Mock reply: hi')
    expect(svc.send('').content).toBe('Mock reply: ')
    const exact = 'z'.repeat(80)
    expect(svc.send(exact).content).toBe(MOCK_PREFIX + exact)
  })
})

describe('store-backed history', () => {
  it('send appends the user message then the assistant message to the port', () => {
    const store = fakeStore()
    const reply = service(store).send('first')

    expect(store.pushes.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(store.pushes[0]).toMatchObject({
      role: 'user',
      content: 'first',
      createdAt: NOW,
      provider: 'mock',
      model: MOCK_MODEL,
    })
    expect(store.pushes[1].content).toBe('Mock reply: first')
    expect(reply).toBe(store.pushes[1])
    expect(store.messages).toHaveLength(2)
    expect(new Set(store.pushes.map((m) => m.id)).size).toBe(2)
  })

  it('getHistory returns copies, not mutable store references', () => {
    const store = fakeStore()
    const svc = service(store)
    svc.send('immutable')

    const snapshot = svc.getHistory()
    snapshot.pop()
    snapshot[0].content = 'mutated'

    expect(store.messages).toHaveLength(2)
    expect(store.messages[0].content).toBe('immutable')
    const after = svc.getHistory()
    expect(after).toHaveLength(2)
    expect(after[0]).not.toBe(store.messages[0])
  })

  it('clear empties the chat store port and stays safe when already empty', () => {
    const store = fakeStore()
    const svc = service(store)
    sendN(svc, 5)
    expect(svc.getHistory()).toHaveLength(10)

    svc.clear()
    expect(store.messages).toEqual([])
    expect(store.pushes).toHaveLength(10)

    svc.clear()
    expect(svc.getHistory()).toEqual([])
  })

  it('history persists across two services sharing one store', () => {
    const store = fakeStore()
    service(store).send('kept')

    const second = service(store)
    expect(second.getHistory().map((m) => m.content)).toEqual(['kept', 'Mock reply: kept'])
    second.send('second')
    expect(service(store).getHistory()).toHaveLength(4)
  })

  it('store cap keeps only the latest 50 messages', () => {
    const store = fakeStore()
    const svc = service(store)
    sendN(svc, 30) // 60 messages

    expect(store.messages).toHaveLength(50)
    // 60 produced, oldest 10 evicted: the store now starts at m6/user.
    expect(store.messages[0]).toMatchObject({ role: 'user', content: 'm6' })
    expect(store.messages[49]).toMatchObject({ role: 'assistant', content: 'Mock reply: m30' })
    expect(svc.getHistory()).toHaveLength(50)
  })
})

describe('context builder', () => {
  it('uses only the last 8 store-backed messages', () => {
    const store = fakeStore()
    const svc = service(store)
    sendN(svc, 10) // 20 messages

    const history = svc.getHistory()
    const context = buildContext(history)

    expect(CONTEXT_WINDOW).toBe(8)
    expect(context).toHaveLength(8)
    expect(context.map((m) => m.id)).toEqual(history.slice(-8).map((m) => m.id))
    expect(buildContext([])).toEqual([])
  })
})

describe('offline isolation', () => {
  it('never touches the network', () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('network is forbidden in v0.1')))
    vi.stubGlobal('fetch', fetchSpy)

    const store = fakeStore()
    const svc = service(store)
    expect(svc.getStatus()).toEqual({ provider: 'mock', ready: true, isMock: true })
    svc.send('offline please')
    svc.getHistory()
    svc.clear()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('logs nothing while handling a message', () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined)
    )

    const svc = service(fakeStore())
    svc.send('SECRET-CONTENT-MARKER')
    svc.getHistory()
    svc.clear()

    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('source declares no network, secret, Electron or logging surface', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/main/services/ai.ts'), 'utf8')
    expect(src).not.toMatch(/console\.|from 'electron|electron-log|fetch\(|apiKey|safeStorage|require\(/)
  })
})
