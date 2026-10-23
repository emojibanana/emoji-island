// src/preload/index.test.ts
// Verifies islandApi surface: exactly the 20 IPC channels, no forbidden keys.
// Uses vi.mock to stub Electron — preload cannot run in jsdom without it.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Electron before importing the preload
// ---------------------------------------------------------------------------

const mockInvoke = vi.fn().mockResolvedValue({ ok: true, data: null, error: null })
const mockSend = vi.fn()
const mockOn = vi.fn()
const mockRemoveListener = vi.fn()
const mockGetPathForFile = vi.fn().mockReturnValue('C:/Users/User/file.txt')
const mockExposeInMainWorld = vi.fn()

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: mockExposeInMainWorld },
  ipcRenderer: {
    invoke: mockInvoke,
    send: mockSend,
    on: mockOn,
    removeListener: mockRemoveListener,
  },
  webUtils: { getPathForFile: mockGetPathForFile },
}))

let islandApi: Record<string, unknown>

beforeAll(async () => {
  // Import after mock is set up — directly use exported islandApi
  const mod = await import('./index')
  islandApi = mod.islandApi as unknown as Record<string, unknown>
})

// ---------------------------------------------------------------------------
// Surface contract
// ---------------------------------------------------------------------------

const EXPECTED_KEYS = [
  // Window (2 send + 1 invoke)
  'setMode',
  'setInputActive',
  'setDragActive',
  // Settings
  'getSettings',
  'updateSettings',
  // Weather
  'getWeather',
  'refreshWeather',
  // Media
  'getMediaState',
  'controlMedia',
  'onMediaStateChanged',
  // Shelf
  'listShelf',
  'addFromDrop',
  'removeShelfItem',
  'revealShelfItem',
  'copyShelfPath',
  'getShelfPreview',
  // AI Chat
  'getAiStatus',
  'getAiHistory',
  'sendAiMessage',
  'clearAiHistory',
  // Helper
  'getDroppedFilePath',
] as const

const FORBIDDEN_KEYS = ['ipcRenderer', 'require', 'process', 'send', 'invoke', 'on']

describe('islandApi surface', () => {
  it('exposes exactly 22 keys (20 IPC channels + getDroppedFilePath + onMediaStateChanged)', () => {
    // 20 channels per spec + onMediaStateChanged (event sub) + getDroppedFilePath (helper)
    expect(Object.keys(islandApi)).toHaveLength(EXPECTED_KEYS.length)
  })

  it('contains every expected key', () => {
    EXPECTED_KEYS.forEach((key) => {
      expect(islandApi).toHaveProperty(key)
    })
  })

  it('does not expose forbidden keys', () => {
    FORBIDDEN_KEYS.forEach((key) => {
      expect(islandApi).not.toHaveProperty(key)
    })
  })

  it('all values are functions', () => {
    Object.values(islandApi).forEach((val) => {
      expect(typeof val).toBe('function')
    })
  })
})

// ---------------------------------------------------------------------------
// Behaviour: invoke channels
// ---------------------------------------------------------------------------

describe('islandApi invoke channels', () => {
  beforeEach(() => vi.clearAllMocks())

  it('setMode calls invoke with window:setMode', async () => {
    await (islandApi.setMode as (m: string) => Promise<unknown>)('expanded')
    expect(mockInvoke).toHaveBeenCalledWith('window:setMode', { mode: 'expanded' })
  })

  it('getSettings calls invoke with settings:get', async () => {
    await (islandApi.getSettings as () => Promise<unknown>)()
    expect(mockInvoke).toHaveBeenCalledWith('settings:get')
  })

  it('updateSettings calls invoke with settings:update', async () => {
    await (islandApi.updateSettings as (p: unknown) => Promise<unknown>)({ reducedMotion: true })
    expect(mockInvoke).toHaveBeenCalledWith('settings:update', { reducedMotion: true })
  })

  it('getWeather calls invoke with weather:get', async () => {
    await (islandApi.getWeather as () => Promise<unknown>)()
    expect(mockInvoke).toHaveBeenCalledWith('weather:get')
  })

  it('refreshWeather calls invoke with weather:refresh', async () => {
    await (islandApi.refreshWeather as () => Promise<unknown>)()
    expect(mockInvoke).toHaveBeenCalledWith('weather:refresh')
  })

  it('getMediaState calls invoke with media:getState', async () => {
    await (islandApi.getMediaState as () => Promise<unknown>)()
    expect(mockInvoke).toHaveBeenCalledWith('media:getState')
  })

  it('controlMedia calls invoke with media:control', async () => {
    await (islandApi.controlMedia as (a: string) => Promise<unknown>)('play')
    expect(mockInvoke).toHaveBeenCalledWith('media:control', { action: 'play' })
  })

  it('listShelf calls invoke with shelf:list', async () => {
    await (islandApi.listShelf as () => Promise<unknown>)()
    expect(mockInvoke).toHaveBeenCalledWith('shelf:list')
  })

  it('addFromDrop calls invoke with shelf:addFromDrop', async () => {
    await (islandApi.addFromDrop as (p: string) => Promise<unknown>)('C:/file.txt')
    expect(mockInvoke).toHaveBeenCalledWith('shelf:addFromDrop', { sourcePath: 'C:/file.txt' })
  })

  it('removeShelfItem calls invoke with shelf:remove', async () => {
    await (islandApi.removeShelfItem as (id: string) => Promise<unknown>)('id-1')
    expect(mockInvoke).toHaveBeenCalledWith('shelf:remove', { id: 'id-1' })
  })

  it('revealShelfItem calls invoke with shelf:reveal', async () => {
    await (islandApi.revealShelfItem as (id: string) => Promise<unknown>)('id-1')
    expect(mockInvoke).toHaveBeenCalledWith('shelf:reveal', { id: 'id-1' })
  })

  it('copyShelfPath calls invoke with shelf:copyPath', async () => {
    await (islandApi.copyShelfPath as (id: string) => Promise<unknown>)('id-1')
    expect(mockInvoke).toHaveBeenCalledWith('shelf:copyPath', { id: 'id-1' })
  })

  it('getShelfPreview calls invoke with shelf:getPreview', async () => {
    await (islandApi.getShelfPreview as (id: string) => Promise<unknown>)('id-1')
    expect(mockInvoke).toHaveBeenCalledWith('shelf:getPreview', { id: 'id-1' })
  })

  it('getAiStatus calls invoke with ai:getStatus', async () => {
    await (islandApi.getAiStatus as () => Promise<unknown>)()
    expect(mockInvoke).toHaveBeenCalledWith('ai:getStatus')
  })

  it('getAiHistory calls invoke with ai:getHistory', async () => {
    await (islandApi.getAiHistory as () => Promise<unknown>)()
    expect(mockInvoke).toHaveBeenCalledWith('ai:getHistory')
  })

  it('sendAiMessage calls invoke with ai:send', async () => {
    await (islandApi.sendAiMessage as (c: string) => Promise<unknown>)('hello')
    expect(mockInvoke).toHaveBeenCalledWith('ai:send', { content: 'hello' })
  })

  it('clearAiHistory calls invoke with ai:clear', async () => {
    await (islandApi.clearAiHistory as () => Promise<unknown>)()
    expect(mockInvoke).toHaveBeenCalledWith('ai:clear')
  })
})

// ---------------------------------------------------------------------------
// Behaviour: send channels (fire-and-forget)
// ---------------------------------------------------------------------------

describe('islandApi send channels', () => {
  beforeEach(() => vi.clearAllMocks())

  it('setInputActive calls send with window:setInputActive', () => {
    (islandApi.setInputActive as (a: boolean) => void)(true)
    expect(mockSend).toHaveBeenCalledWith('window:setInputActive', { active: true })
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('setDragActive calls send with window:setDragActive', () => {
    (islandApi.setDragActive as (a: boolean) => void)(false)
    expect(mockSend).toHaveBeenCalledWith('window:setDragActive', { active: false })
    expect(mockInvoke).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Behaviour: onMediaStateChanged event subscription
// ---------------------------------------------------------------------------

describe('onMediaStateChanged', () => {
  beforeEach(() => vi.clearAllMocks())

  it('registers listener on media:stateChanged', () => {
    const cb = vi.fn()
    ;(islandApi.onMediaStateChanged as (cb: unknown) => () => void)(cb)
    expect(mockOn).toHaveBeenCalledWith('media:stateChanged', expect.any(Function))
  })

  it('returns an unsubscribe function that calls removeListener', () => {
    const cb = vi.fn()
    const unsub = (islandApi.onMediaStateChanged as (cb: unknown) => () => void)(cb)
    unsub()
    expect(mockRemoveListener).toHaveBeenCalledWith('media:stateChanged', expect.any(Function))
  })
})

// ---------------------------------------------------------------------------
// Behaviour: getDroppedFilePath helper
// ---------------------------------------------------------------------------

describe('getDroppedFilePath', () => {
  it('delegates to webUtils.getPathForFile', () => {
    const fakeFile = {} as File
    const result = (islandApi.getDroppedFilePath as (f: File) => string)(fakeFile)
    expect(mockGetPathForFile).toHaveBeenCalledWith(fakeFile)
    expect(result).toBe('C:/Users/User/file.txt')
  })
})
