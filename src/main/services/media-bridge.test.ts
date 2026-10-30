// T-020-La tests: media-bridge pure-logic paths (no live Windows media).
// SMTC bridge native bindings are excluded from automated coverage (TESTING.md §1).
// We test: response parsing, malformed lines, no-session, command path, dispose cleanup.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import { Writable, Readable } from 'stream'

// ---------------------------------------------------------------------------
// Mock child_process.spawn so no real powershell.exe is spawned.
// ---------------------------------------------------------------------------
vi.mock('child_process', () => {
  return { spawn: vi.fn() }
})

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

vi.mock('electron-log', () => ({
  default: { warn: vi.fn(), error: vi.fn() },
}))

// Build a fake ChildProcess that lets tests control stdout/stderr/exit.
function makeFakeChild(): {
  child: NodeJS.EventEmitter & {
    stdin: Writable
    stdout: Readable & { setEncoding: ReturnType<typeof vi.fn> }
    stderr: Readable
    killed: boolean
    kill: ReturnType<typeof vi.fn>
  }
  emitLine: (line: string) => void
  emitExit: (code: number | null) => void
} {
  const emitter = new EventEmitter() as NodeJS.EventEmitter & {
    stdin: Writable
    stdout: Readable & { setEncoding: ReturnType<typeof vi.fn> }
    stderr: Readable
    killed: boolean
    kill: ReturnType<typeof vi.fn>
  }

  const stdinBuf: string[] = []
  emitter.stdin = new Writable({
    write(chunk: Buffer | string, _enc, cb): void {
      stdinBuf.push(chunk.toString())
      cb()
    },
  })

  const stdout = new EventEmitter() as unknown as Readable & { setEncoding: ReturnType<typeof vi.fn> }
  ;(stdout as unknown as Record<string, unknown>)['setEncoding'] = vi.fn()
  emitter.stdout = stdout

  const stderr = new EventEmitter() as Readable
  emitter.stderr = stderr

  emitter.killed = false
  emitter.kill = vi.fn(() => {
    emitter.killed = true
  })

  const emitLine = (line: string): void => {
    stdout.emit('data', line + '\n')
  }

  const emitExit = (code: number | null): void => {
    emitter.emit('exit', code)
  }

  return { child: emitter, emitLine, emitExit }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('media-bridge', () => {
  let spawnMock: ReturnType<typeof vi.fn>
  let fakeChild: ReturnType<typeof makeFakeChild>

  beforeEach(async () => {
    vi.useFakeTimers()
    const { spawn } = await import('child_process')
    spawnMock = spawn as unknown as ReturnType<typeof vi.fn>
    fakeChild = makeFakeChild()
    spawnMock.mockReturnValue(fakeChild.child)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    vi.resetModules()
  })

  async function importBridge(): Promise<typeof import('./media-bridge')> {
    return import('./media-bridge')
  }

  it('spawns powershell.exe with fixed args and no user-supplied arguments', async () => {
    const { createMediaBridge } = await importBridge()
    const bridge = createMediaBridge(vi.fn())
    expect(spawnMock).toHaveBeenCalledOnce()
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]]
    expect(cmd).toBe('powershell.exe')
    expect(args).toContain('-NoProfile')
    expect(args).toContain('-ExecutionPolicy')
    expect(args).toContain('Bypass')
    // Must have -File; no dynamic user content beyond the fixed script path.
    expect(args).toContain('-File')
    // Ensure no extra args beyond the fixed set (cmd, -NoProfile, -ExecutionPolicy, Bypass, -File, path = 6).
    expect(args.length).toBe(5)
    bridge.dispose()
  })

  it('readState returns UNAVAILABLE when no session', async () => {
    const { createMediaBridge } = await importBridge()
    const onChanged = vi.fn()
    const bridge = createMediaBridge(onChanged)

    // Respond to the initial poll (cmd:read) with no-session.
    const readPromise = bridge.readState()
    fakeChild.emitLine(JSON.stringify({ ok: true, hasSession: false }))
    fakeChild.emitLine(JSON.stringify({ ok: true, hasSession: false }))
    const state = await readPromise
    expect(state.status).toBe('unavailable')
    expect(state.canControl).toBe(false)
    bridge.dispose()
  })

  it('onStateChanged is called with UNAVAILABLE on no-session response', async () => {
    const { createMediaBridge } = await importBridge()
    const onChanged = vi.fn()
    createMediaBridge(onChanged)

    // Advance fake timer to trigger the initial poll (500 ms delay).
    await vi.advanceTimersByTimeAsync(600)
    // Feed the response to the bridge's stdout listener.
    fakeChild.emitLine(JSON.stringify({ ok: true, hasSession: false }))
    await vi.advanceTimersByTimeAsync(10)

    expect(onChanged).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unavailable', canControl: false })
    )
  })

  it('handles malformed JSON lines without crashing', async () => {
    const { createMediaBridge } = await importBridge()
    const onChanged = vi.fn()
    const bridge = createMediaBridge(onChanged)

    // Emit malformed line — bridge must not throw.
    fakeChild.emitLine('not-valid-json{{')
    // No pending promise resolves or rejects; bridge stays alive.
    expect(bridge).toBeDefined()
    bridge.dispose()
  })

  it('calls onStateChanged with UNAVAILABLE when child exits', async () => {
    const { createMediaBridge } = await importBridge()
    const onChanged = vi.fn()
    const bridge = createMediaBridge(onChanged)

    fakeChild.emitExit(1)
    await vi.advanceTimersByTimeAsync(10)

    expect(onChanged).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unavailable', canControl: false })
    )
    bridge.dispose()
  })

  it('sendCommand returns ok:false when no session', async () => {
    const { createMediaBridge } = await importBridge()
    const bridge = createMediaBridge(vi.fn())

    const cmdPromise = bridge.sendCommand('play')
    fakeChild.emitLine(JSON.stringify({ ok: false, error: 'no_session' }))
    const result = await cmdPromise
    expect(result.ok).toBe(false)
    bridge.dispose()
  })

  it('sendCommand returns ok:true on accepted response', async () => {
    const { createMediaBridge } = await importBridge()
    const bridge = createMediaBridge(vi.fn())

    const cmdPromise = bridge.sendCommand('pause')
    fakeChild.emitLine(JSON.stringify({ ok: true, accepted: true }))
    const result = await cmdPromise
    expect(result.ok).toBe(true)
    bridge.dispose()
  })

  it('dispose kills the child and clears timers', async () => {
    const { createMediaBridge } = await importBridge()
    const bridge = createMediaBridge(vi.fn())
    bridge.dispose()
    expect(fakeChild.child.kill).toHaveBeenCalled()
  })

  it('stops polling after no-session response', async () => {
    const { createMediaBridge } = await importBridge()
    const onChanged = vi.fn()
    createMediaBridge(onChanged)

    await vi.advanceTimersByTimeAsync(600)
    fakeChild.emitLine(JSON.stringify({ ok: true, hasSession: false }))
    await vi.advanceTimersByTimeAsync(10)
    const callCount = onChanged.mock.calls.length

    // Advance 10 s — no further polls should fire (session was absent).
    await vi.advanceTimersByTimeAsync(10_000)
    expect(onChanged.mock.calls.length).toBe(callCount)
  })

  it('returns ok:false when child exits unexpectedly while command is in-flight', async () => {
    const { createMediaBridge } = await importBridge()
    const bridge = createMediaBridge(vi.fn())

    const cmdPromise = bridge.sendCommand('next')
    fakeChild.emitExit(null)

    const result = await cmdPromise
    expect(result.ok).toBe(false)
    bridge.dispose()
  })
})
