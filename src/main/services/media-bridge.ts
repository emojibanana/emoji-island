// T-020-La / D-008 Locked: Persistent PowerShell 5.1 SMTC bridge.
// One child process, newline-delimited JSON over stdio.
// No user-supplied arguments. No title/artist in logs.
import { ChildProcess, spawn } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import log from 'electron-log'
import type { MediaState } from '../../shared/types'

// ponytail: asar unpack path is wired in T-032 (electron-builder extraResources).
// Until then the script is resolved relative to the app root.
function scriptPath(): string {
  // In packaged builds T-032 unpacks the script to resources/scripts/.
  // In dev it sits at <root>/scripts/smtc-bridge.ps1.
  if (app.isPackaged) {
    return join(process.resourcesPath, 'scripts', 'smtc-bridge.ps1')
  }
  // dev: __dirname is dist/main, project root is three levels up.
  return join(__dirname, '..', '..', '..', 'scripts', 'smtc-bridge.ps1')
}

const MAX_RESTARTS = 3
const RESTART_DELAY_MS = 2000
const UNAVAILABLE_STATE: MediaState = {
  title: null,
  artist: null,
  status: 'unavailable',
  canControl: false,
}

// Parsed response from the PS1 bridge.
type BridgeResponse =
  | { ok: true; hasSession: false }
  | { ok: true; hasSession: true; title: string | null; artist: string | null; status: 'playing' | 'paused' | 'stopped'; canControl: boolean }
  | { ok: true; accepted: boolean }
  | { ok: false; error: string }

export type MediaStateChangedCallback = (state: MediaState) => void

export interface MediaBridge {
  /** Send a control command. Resolves with ok:true if accepted or no-session. */
  sendCommand(action: 'play' | 'pause' | 'next' | 'previous'): Promise<{ ok: boolean; error?: string }>
  /** Read the current state directly (used for initial fetch). */
  readState(): Promise<MediaState>
  /** Clean up: stop polling, kill the child process. */
  dispose(): void
}

export function createMediaBridge(onStateChanged: MediaStateChangedCallback): MediaBridge {
  let child: ChildProcess | null = null
  let disposed = false
  let restarts = 0
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let lineBuffer = ''
  // Pending resolve/reject for the current in-flight command, keyed by sequence.
  const pending = new Map<number, { resolve: (r: BridgeResponse) => void; reject: (e: Error) => void }>()
  let seq = 0
  // Track whether a session was present to decide whether to poll.
  let hasActiveSession = false

  function clearPollTimer(): void {
    if (pollTimer !== null) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  function schedulePoll(delayMs: number): void {
    if (disposed) return
    clearPollTimer()
    pollTimer = setTimeout(() => {
      void doPoll()
    }, delayMs)
  }

  function doPoll(): Promise<void> {
    if (disposed || !child) return Promise.resolve()
    return sendRaw({ cmd: 'read' }).then((resp) => {
      if (disposed) return
      const state = responseToState(resp)
      hasActiveSession = state.status !== 'unavailable'
      onStateChanged(state)
      // D-008: poll every 3 s only while a session exists.
      if (hasActiveSession) {
        schedulePoll(3000)
      }
      // If no session, stop polling; the bridge stays alive awaiting restart cues.
    }).catch(() => {
      if (!disposed) onStateChanged(UNAVAILABLE_STATE)
    })
  }

  function responseToState(resp: BridgeResponse): MediaState {
    if (!resp.ok) return UNAVAILABLE_STATE
    if ('hasSession' in resp) {
      if (!resp.hasSession) return UNAVAILABLE_STATE
      return {
        title: resp.title ?? null,
        artist: resp.artist ?? null,
        status: resp.status,
        canControl: true,
      }
    }
    return UNAVAILABLE_STATE
  }

  function sendRaw(payload: object): Promise<BridgeResponse> {
    return new Promise<BridgeResponse>((resolve, reject) => {
      if (!child || child.killed || disposed) {
        reject(new Error('bridge_unavailable'))
        return
      }
      const id = ++seq
      pending.set(id, { resolve, reject })
      // Attach id so we can match responses (simple FIFO is also fine since PS1
      // processes commands sequentially, but id makes tests explicit).
      const line = JSON.stringify({ ...payload, _id: id }) + '\n'
      child.stdin!.write(line, (err) => {
        if (err) {
          pending.delete(id)
          reject(err)
        }
      })
    })
  }

  function handleLine(line: string): void {
    let resp: BridgeResponse
    try {
      resp = JSON.parse(line) as BridgeResponse
    } catch {
      // D-008: handle malformed lines without crashing.
      log.warn('[media-bridge] malformed line received')
      return
    }
    // Resolve the oldest pending promise (FIFO, since PS1 is sequential).
    const first = pending.keys().next()
    if (!first.done) {
      const entry = pending.get(first.value)!
      pending.delete(first.value)
      entry.resolve(resp)
    }
  }

  function startChild(): void {
    if (disposed) return
    const ps = scriptPath()
    // D-008: fixed script path, NO user-supplied arguments.
    child = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', ps,
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    child.stdout!.setEncoding('utf8')
    child.stdout!.on('data', (chunk: string) => {
      lineBuffer += chunk
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) handleLine(trimmed)
      }
    })

    // D-008 / security: stderr goes to log as non-sensitive indicator only.
    child.stderr!.on('data', () => {
      log.warn('[media-bridge] stderr output received')
    })

    child.on('exit', (code) => {
      // Reject all pending so callers don't hang.
      for (const [, entry] of pending) {
        entry.reject(new Error('bridge_exited'))
      }
      pending.clear()
      child = null

      if (disposed) return
      onStateChanged(UNAVAILABLE_STATE)
      log.warn(`[media-bridge] child exited code=${code ?? 'null'}`)

      if (restarts < MAX_RESTARTS) {
        restarts++
        log.warn(`[media-bridge] restarting (attempt ${restarts}/${MAX_RESTARTS})`)
        setTimeout(() => {
          if (!disposed) {
            startChild()
            schedulePoll(500)
          }
        }, RESTART_DELAY_MS)
      } else {
        log.error('[media-bridge] max restarts reached, staying unavailable')
      }
    })

    lineBuffer = ''
    hasActiveSession = false
  }

  // Start the bridge and kick off the first poll.
  startChild()
  schedulePoll(500)

  return {
    async sendCommand(action): Promise<{ ok: boolean; error?: string }> {
      const cmdMap: Record<string, string> = {
        play: 'play', pause: 'pause', next: 'next', previous: 'previous',
      }
      const cmd = cmdMap[action]
      if (!cmd) return { ok: false, error: 'unknown_action' }

      try {
        const resp = await sendRaw({ cmd })
        if (!resp.ok) return { ok: false, error: (resp as { ok: false; error: string }).error }
        return { ok: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown'
        log.warn(`[media-bridge] sendCommand ${action} failed: ${msg}`)
        return { ok: false, error: msg }
      }
    },

    async readState(): Promise<MediaState> {
      try {
        const resp = await sendRaw({ cmd: 'read' })
        return responseToState(resp)
      } catch {
        return UNAVAILABLE_STATE
      }
    },

    dispose(): void {
      disposed = true
      clearPollTimer()
      for (const [, entry] of pending) {
        entry.reject(new Error('bridge_disposed'))
      }
      pending.clear()
      if (child && !child.killed) {
        try {
          child.stdin!.write(JSON.stringify({ cmd: 'quit' }) + '\n')
        } catch { /* ignore */ }
        child.kill()
      }
      child = null
    },
  }
}
