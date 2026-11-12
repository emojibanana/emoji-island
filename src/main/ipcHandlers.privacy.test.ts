import { beforeEach, describe, expect, it, vi } from 'vitest'

const { handlers, logError, logWarn, registerHotkey, setTrayTooltip } = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  registerHotkey: vi.fn(),
  setTrayTooltip: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => handlers.set(channel, handler),
    on: vi.fn(),
  },
  app: {
    requestSingleInstanceLock: () => true,
    on: vi.fn(),
    quit: vi.fn(),
    setAppUserModelId: vi.fn(),
    whenReady: () => Promise.resolve(),
  },
  screen: { getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 1440, height: 900 } }) },
  globalShortcut: { unregisterAll: vi.fn() },
  BrowserWindow: class {
    static getAllWindows = () => []
    webContents = { on: vi.fn(), setWindowOpenHandler: vi.fn(), send: vi.fn() }
    setAlwaysOnTop = vi.fn()
    on = vi.fn()
    show = vi.fn()
    loadFile = vi.fn()
    loadURL = vi.fn()
    isDestroyed = () => false
  },
}))

vi.mock('electron-log', () => ({ default: { error: logError, warn: logWarn } }))

// T-026e: index.ts is imported only to exercise the hotkey failure log, so its bootstrap
// dependencies are stubbed instead of starting a real store/tray/media bridge.
vi.mock('./services/store', () => ({
  AppStore: class {
    get = () => ({ hotkey: 'Ctrl+Alt+Space' })
  },
}))
vi.mock('./services/tray', () => ({ createTray: vi.fn(), destroyTray: vi.fn(), setTrayTooltip }))
vi.mock('./services/hotkey', () => ({ registerHotkey, unregisterHotkey: vi.fn() }))
vi.mock('./services/media', () => ({
  createMediaService: () => ({ getState: vi.fn(), sendControl: vi.fn() }),
}))

import { registerMediaHandlers, registerShelfHandlers, registerWeatherHandlers } from './ipcHandlers'

const secret = '/Users/test/private/media-title-api-key.txt'
const fakeCoords = 'latitude=52.37&longitude=4.89'
const fakeUrl = 'https://api.open-meteo.com/v1/forecast'
const rawFailure = `failed ${fakeUrl}?${fakeCoords} «redacted:sk-...» ${secret}`

beforeEach(() => {
  handlers.clear()
  logError.mockClear()
  logWarn.mockClear()
})

describe('IPC privacy logging', () => {
  it('does not log raw media errors', () => {
    registerMediaHandlers({
      getState: () => {
        throw new Error(`media failure ${secret} Fake Media Title sk-test-secret`)
      },
      sendControl: vi.fn(),
    } as never)

    const result = handlers.get('media:getState')?.()

    expect(result).toEqual({
      ok: false,
      data: null,
      error: { code: 'MEDIA_UNAVAILABLE', message: 'Media unavailable' },
    })
    expect(logError).toHaveBeenCalledWith('media:getState failed: MEDIA_UNAVAILABLE')
    expect(JSON.stringify(logError.mock.calls)).not.toContain(secret)
    expect(JSON.stringify(logError.mock.calls)).not.toContain('Fake Media Title')
    expect(JSON.stringify(logError.mock.calls)).not.toContain('sk-test-secret')
  })

  it('does not log raw shelf errors', () => {
    registerShelfHandlers({ get: () => { throw new Error(`shelf failure ${secret} Fake Media Title sk-test-secret`) } } as never)

    const result = handlers.get('shelf:list')?.()

    expect(result).toEqual({
      ok: false,
      data: null,
      error: { code: 'STORAGE_ERROR', message: 'List failed' },
    })
    expect(logError).toHaveBeenCalledWith('shelf:list failed: STORAGE_ERROR')
    expect(JSON.stringify(logError.mock.calls)).not.toContain(secret)
    expect(JSON.stringify(logError.mock.calls)).not.toContain('Fake Media Title')
    expect(JSON.stringify(logError.mock.calls)).not.toContain('«redacted:sk-...»')
  })

  // T-026e: the store throws a message carrying the request URL, the query string with
  // coordinates and a fake key; neither weather channel may put any of it in the log.
  it('does not log raw weather errors', async () => {
    registerWeatherHandlers({
      get: (key: string) => {
        if (key === 'weatherCache') throw new Error(rawFailure)
        return { latitude: 52.37, longitude: 4.89 }
      },
    } as never)

    const result = handlers.get('weather:get')?.()
    const refreshed = await (handlers.get('weather:refresh') as () => Promise<unknown>)()

    const envelope = { ok: false, data: null, error: { code: 'UNKNOWN_ERROR', message: 'Weather unavailable' } }
    expect(result).toEqual(envelope)
    expect(refreshed).toEqual(envelope)
    expect(logError).toHaveBeenCalledWith('weather:get failed: UNKNOWN_ERROR')
    expect(logError).toHaveBeenCalledWith('weather:refresh failed: UNKNOWN_ERROR')

    const logged = JSON.stringify(logError.mock.calls)
    expect(logged).not.toContain(rawFailure)
    expect(logged).not.toContain(fakeUrl)
    expect(logged).not.toContain(fakeCoords)
    expect(logged).not.toContain('latitude=52.37')
    expect(logged).not.toContain(secret)
  })

  // T-026e: registerHotkey returns the raw exception text; index.ts must log a fixed message only.
  it('does not log raw hotkey errors or the accelerator', async () => {
    registerHotkey.mockReturnValue({ ok: false, error: rawFailure })

    await import('./index')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(setTrayTooltip).toHaveBeenCalled()
    expect(logWarn).toHaveBeenCalledWith('hotkey registration failed')

    const logged = JSON.stringify(logWarn.mock.calls)
    expect(logged).not.toContain(rawFailure)
    expect(logged).not.toContain(fakeUrl)
    expect(logged).not.toContain(fakeCoords)
    expect(logged).not.toContain(secret)
    expect(logged).not.toContain('Ctrl+Alt+Space')
  })
})
