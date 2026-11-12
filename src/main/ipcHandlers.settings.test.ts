// T-029a: settings:get / settings:update — persistence, validation, safe hotkey rebind,
// and no manual weatherCache writes on a location change.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { handlers, logWarn } = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  logWarn: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => handlers.set(channel, handler),
    on: vi.fn(),
  },
  app: {
    getPath: () => 'C:/userData',
    on: vi.fn(),
    quit: vi.fn(),
    requestSingleInstanceLock: () => true,
    setAppUserModelId: vi.fn(),
    whenReady: () => Promise.resolve(),
  },
  screen: { getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 1440, height: 900 } }) },
  globalShortcut: { register: vi.fn(() => true), unregister: vi.fn(), unregisterAll: vi.fn() },
  BrowserWindow: class {
    static getAllWindows = (): unknown[] => []
    webContents = { on: vi.fn(), setWindowOpenHandler: vi.fn(), send: vi.fn() }
    setAlwaysOnTop = vi.fn()
    on = vi.fn()
    show = vi.fn()
    loadFile = vi.fn()
    loadURL = vi.fn()
    isDestroyed = (): boolean => false
  },
}))

vi.mock('electron-log', () => ({ default: { error: vi.fn(), warn: logWarn } }))

import { registerSettingsHandlers } from './ipcHandlers'
import { registerHotkey, unregisterHotkey } from './services/hotkey'
import { defaultSettings } from './services/store-logic'
import type { AppStore } from './services/store'
import type { AppSettings, IpcEnvelope, SettingsView } from '../shared/types'

// Fake globalShortcut surface: records the calls the handler makes (services/hotkey.ts is Electron-free).
interface FakeApi {
  registered: string[]
  unregistered: string[]
  returnValue: boolean
  throwMessage: string | null
  register(accel: string, onToggle: () => void): boolean
  unregister(accel: string): void
}

function fakeApi(): FakeApi {
  return {
    registered: [],
    unregistered: [],
    returnValue: true,
    throwMessage: null,
    register(accel) {
      if (this.throwMessage) throw new Error(this.throwMessage)
      this.registered.push(accel)
      return this.returnValue
    },
    unregister(accel) {
      this.unregistered.push(accel)
    },
  }
}

const CACHE_SENTINEL = {
  latitude: -6.2,
  longitude: 106.8,
  temperature: 30,
  apparentTemperature: 32,
  weatherCode: 3,
  humidity: 70,
  updatedAt: 1,
}

function fakeStore() {
  const state = { settings: defaultSettings(1), weatherCache: { ...CACHE_SENTINEL } }
  const sets: Array<[string, unknown]> = []
  return {
    state,
    sets,
    get: (key: 'settings' | 'weatherCache') => state[key],
    set: (key: string, value: unknown) => {
      sets.push([key, value])
      ;(state as Record<string, unknown>)[key] = value
    },
    getApiKey: () => null,
  }
}

type Store = ReturnType<typeof fakeStore>

function register(store: Store = fakeStore(), api: FakeApi = fakeApi()): { store: Store; api: FakeApi } {
  registerSettingsHandlers(store as unknown as AppStore, { api, onToggle: () => {} })
  return { store, api }
}

const update = (payload: unknown): IpcEnvelope<AppSettings> =>
  handlers.get('settings:update')?.(undefined, payload) as IpcEnvelope<AppSettings>

const invalid = {
  ok: false,
  data: null,
  error: { code: 'VALIDATION_ERROR', message: 'Invalid settings payload' },
}

const hotkeyUnavailable = {
  ok: false,
  data: null,
  error: { code: 'VALIDATION_ERROR', message: 'Hotkey unavailable' },
}

beforeEach(() => {
  handlers.clear()
  logWarn.mockClear()
  unregisterHotkey()
})

describe('settings:get', () => {
  it('returns stored settings with a derived aiKeyPresent and never the key', () => {
    register()

    const res = handlers.get('settings:get')?.() as IpcEnvelope<SettingsView>

    expect(res.ok).toBe(true)
    expect(res.data).toMatchObject({
      locationMode: 'preset',
      latitude: -6.2,
      longitude: 106.8,
      hotkey: 'Ctrl+Alt+Space',
      reducedMotion: false,
      aiKeyPresent: false,
    })
    expect(res.data).not.toHaveProperty('aiKey')
  })
})

describe('settings:update', () => {
  it('persists a valid core settings update', () => {
    const { store } = register()

    const res = update({ locationMode: 'manual', latitude: 10, longitude: 20, reducedMotion: true })

    expect(res.ok).toBe(true)
    expect(res.data).toMatchObject({
      locationMode: 'manual',
      latitude: 10,
      longitude: 20,
      reducedMotion: true,
      hotkey: 'Ctrl+Alt+Space',
    })
    expect(typeof res.data?.updatedAt).toBe('number')
    expect(store.sets).toEqual([['settings', res.data]])
  })

  it('rejects out-of-range coordinates', () => {
    const { store } = register()

    expect(update({ latitude: 91 })).toEqual(invalid)
    expect(update({ latitude: 10, longitude: -181 })).toEqual(invalid)
    expect(store.sets).toEqual([])
  })

  it('rejects a malformed hotkey', () => {
    const { store } = register()

    expect(update({ hotkey: 'bogus key' })).toEqual(invalid)
    expect(store.sets).toEqual([])
  })

  it('re-registers the global hotkey on a valid hotkey update', () => {
    const store = fakeStore()
    const api = fakeApi()
    registerHotkey('Ctrl+Alt+Space', () => {}, api) // startup binding
    register(store, api)

    const res = update({ hotkey: 'Ctrl+Shift+X' })

    expect(res.ok).toBe(true)
    expect(api.registered).toEqual(['Ctrl+Alt+Space', 'Ctrl+Shift+X'])
    expect(api.unregistered).toEqual(['Ctrl+Alt+Space']) // old binding released after the new one worked
    expect(store.sets).toEqual([['settings', res.data]])

    unregisterHotkey()
    expect(api.unregistered).toEqual(['Ctrl+Alt+Space', 'Ctrl+Shift+X'])
  })

  it('keeps the old hotkey and returns "Hotkey unavailable" when the new one fails', () => {
    const store = fakeStore()
    const api = fakeApi()
    registerHotkey('Ctrl+Alt+Space', () => {}, api)
    api.returnValue = false
    register(store, api)

    const res = update({ hotkey: 'Ctrl+Shift+Q' })

    expect(res).toEqual(hotkeyUnavailable)
    expect(api.registered).toEqual(['Ctrl+Alt+Space', 'Ctrl+Shift+Q']) // attempt recorded
    expect(api.unregistered).toEqual([]) // old binding never released
    expect(store.sets).toEqual([]) // and nothing persisted
    expect(store.state.settings.hotkey).toBe('Ctrl+Alt+Space')

    unregisterHotkey()
    expect(api.unregistered).toEqual(['Ctrl+Alt+Space']) // the original binding is still live
  })

  it('logs a fixed code only when the hotkey rebind path fails', () => {
    const rawFailure =
      'Failed to register Ctrl+Shift+X https://api.open-meteo.com/v1/forecast?latitude=52.37&longitude=4.89 C:/Users/User/private/key.txt'
    const api = fakeApi()
    api.throwMessage = rawFailure
    register(fakeStore(), api)

    const res = update({ hotkey: 'Ctrl+Shift+X' })

    expect(res).toEqual(hotkeyUnavailable)
    expect(logWarn).toHaveBeenCalledWith('settings:update hotkey rebind failed')

    const logged = JSON.stringify(logWarn.mock.calls)
    expect(logged).not.toContain(rawFailure)
    expect(logged).not.toContain('Ctrl+Shift+X')
    expect(logged).not.toContain('latitude=52.37')
    expect(logged).not.toContain('C:/Users/User/private')
  })

  it('does not clear weatherCache when the location changes', () => {
    const { store } = register()

    const res = update({ latitude: -6.5, longitude: 107 })

    expect(res.ok).toBe(true)
    expect(store.sets.map(([key]) => key)).toEqual(['settings']) // no weatherCache write at all
    expect(store.state.weatherCache).toEqual(CACHE_SENTINEL)
  })
})
