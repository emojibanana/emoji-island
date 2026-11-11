// T-026a: MockProvider + history rules. Hermetic: no Electron, no network, no timers.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  CONTEXT_WINDOW,
  HISTORY_CAP,
  MOCK_ECHO_CHARS,
  MOCK_MODEL,
  MOCK_PREFIX,
  buildContext,
  buildMockReply,
  createAiService,
  type AiService,
} from './ai'
import type { ChatMessage } from '../../shared/types'

const NOW = 1_700_000_000_000

// Deterministic deps: fixed clock, sequential ids.
const newService = (): AiService => {
  let n = 0
  return createAiService({ now: () => NOW, newId: () => `id-${++n}` })
}

const sendN = (service: AiService, n: number): void => {
  for (let i = 1; i <= n; i++) service.send(`m${i}`)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('MockProvider reply', () => {
  it('starts with "Mock reply: "', () => {
    const service = newService()
    const reply = service.send('hello')
    expect(reply.content.startsWith('Mock reply: ')).toBe(true)
    expect(reply.content).toBe('Mock reply: hello')
  })

  it('includes at most the first 80 characters of the user message', () => {
    const service = newService()
    const reply = service.send('x'.repeat(500))
    expect(reply.content).toBe(MOCK_PREFIX + 'x'.repeat(80))
    expect(reply.content.length).toBe(MOCK_PREFIX.length + MOCK_ECHO_CHARS)
    expect(buildMockReply('y'.repeat(81))).toBe(MOCK_PREFIX + 'y'.repeat(80))
  })

  it('does not pad or trim short messages', () => {
    const service = newService()
    expect(service.send('hi').content).toBe('Mock reply: hi')
    expect(service.send('').content).toBe('Mock reply: ')
    const exact = 'z'.repeat(80)
    expect(service.send(exact).content).toBe(MOCK_PREFIX + exact)
  })

  it('answers synchronously, well inside the 1 s budget', () => {
    const service = newService()
    const started = Date.now()
    const reply = service.send('timing')
    expect(reply).not.toBeInstanceOf(Promise)
    expect(Date.now() - started).toBeLessThan(1000)
  })
})

describe('history store', () => {
  it('ai:send appends the user message then the assistant message', () => {
    const service = newService()
    const reply = service.send('first')

    const history = service.getHistory()
    expect(history.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(history[0].content).toBe('first')
    expect(history[1]).toEqual(reply)
    expect(reply.provider).toBe('mock')
    expect(reply.model).toBe(MOCK_MODEL)
    expect(reply.createdAt).toBe(NOW)
    expect(new Set(history.map((m) => m.id)).size).toBe(2)
  })

  it('caps at 50 messages and evicts the oldest', () => {
    const service = newService()
    sendN(service, 30) // 60 messages
    const history = service.getHistory()

    expect(HISTORY_CAP).toBe(50)
    expect(history).toHaveLength(50)
    // 60 messages produced, the oldest 10 evicted: history now starts at m6/user.
    expect(history[0]).toEqual({ id: 'id-11', role: 'user', content: 'm6', createdAt: NOW, provider: 'mock', model: MOCK_MODEL })
    expect(history[1].role).toBe('assistant')
    expect(history[48]).toEqual({ id: 'id-59', role: 'user', content: 'm30', createdAt: NOW, provider: 'mock', model: MOCK_MODEL })
    expect(history[49]).toEqual({ id: 'id-60', role: 'assistant', content: 'Mock reply: m30', createdAt: NOW, provider: 'mock', model: MOCK_MODEL })
  })

  it('returns copies, so callers cannot mutate stored history', () => {
    const service = newService()
    service.send('immutable')
    const snapshot = service.getHistory()
    snapshot.pop()
    snapshot[0].content = 'mutated'
    expect(snapshot).toHaveLength(1)
    const after = service.getHistory()
    expect(after).toHaveLength(2)
    expect(after[0].content).toBe('immutable')
  })

  it('ai:clear empties the history and stays safe when already empty', () => {
    const service = newService()
    sendN(service, 5)
    expect(service.getHistory()).toHaveLength(10)
    service.clear()
    expect(service.getHistory()).toEqual([])
    service.clear()
    expect(service.getHistory()).toEqual([])
  })
})

describe('context builder', () => {
  it('uses only the last 8 messages', () => {
    const service = newService()
    sendN(service, 10) // 20 messages
    const history = service.getHistory()
    const context = buildContext(history)

    expect(CONTEXT_WINDOW).toBe(8)
    expect(context).toHaveLength(8)
    expect(context.map((m) => m.id)).toEqual(history.slice(-8).map((m) => m.id))
    expect(context).not.toContain(history[0])
  })

  it('returns short histories unchanged and empty input as empty', () => {
    const service = newService()
    sendN(service, 2)
    expect(buildContext(service.getHistory())).toHaveLength(4)
    expect(buildContext([])).toEqual([])
  })

  it('does not alias the caller array', () => {
    const messages: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
      id: `x-${i}`,
      role: 'user',
      content: 'c',
      createdAt: NOW,
      provider: 'mock',
      model: MOCK_MODEL,
    }))
    const context = buildContext(messages)
    context.pop()
    expect(messages).toHaveLength(10)
  })
})

describe('offline isolation', () => {
  it('never touches the network', () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('network is forbidden in v0.1')))
    vi.stubGlobal('fetch', fetchSpy)

    const service = newService()
    expect(service.getStatus()).toEqual({ provider: 'mock', ready: true, isMock: true })
    service.send('offline please')
    service.getHistory()
    service.clear()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('logs nothing while handling a message', () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined)
    )

    const service = newService()
    service.send('SECRET-CONTENT-MARKER')
    service.clear()

    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('source declares no network, secret, Electron or logging surface', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/main/services/ai.ts'), 'utf8')
    expect(src).not.toMatch(/console\.|from 'electron|electron-log|fetch\(|apiKey|safeStorage|require\(/)
  })
})
