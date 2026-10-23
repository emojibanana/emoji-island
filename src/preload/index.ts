// D-014: Frozen typed islandApi — one method per IPC channel.
// MUST NOT expose ipcRenderer, require, process, or generic send/invoke.
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  IpcEnvelope,
  WeatherData,
  MediaInfo,
  ShelfItem,
  ChatMessage,
  AppSettings,
} from '../shared/types'

// ---------------------------------------------------------------------------
// Return-type aliases (keep renderer import-free from Electron)
// ---------------------------------------------------------------------------

type Env<T> = Promise<IpcEnvelope<T>>

type WindowMode = 'collapsed' | 'expanded'

type SettingsWithKeyInfo = AppSettings & { aiKeyPresent: boolean; aiKeyPersisted: boolean }

type MediaState = {
  title: string | null
  artist: string | null
  status: 'playing' | 'paused' | 'stopped' | 'unavailable'
  canControl: boolean
}

type WeatherResponse = { data: WeatherData | null; status: 'fresh' | 'stale' | 'offline' }

type PreviewResponse = {
  dataUrl: string
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
}

type AiStatus = { provider: 'mock' | 'openai-compatible'; ready: boolean; isMock: boolean }

// ---------------------------------------------------------------------------
// islandApi
// ---------------------------------------------------------------------------

const islandApi = {
  // -- Window ----------------------------------------------------------------
  /** Resize window to mode (invoke). */
  setMode: (mode: WindowMode): Env<void> =>
    ipcRenderer.invoke('window:setMode', { mode }),

  /** Fire-and-forget: input focused/active state. */
  setInputActive: (active: boolean): void =>
    ipcRenderer.send('window:setInputActive', { active }),

  /** Fire-and-forget: drag-over active state. */
  setDragActive: (active: boolean): void =>
    ipcRenderer.send('window:setDragActive', { active }),

  // -- Settings --------------------------------------------------------------
  getSettings: (): Env<SettingsWithKeyInfo> =>
    ipcRenderer.invoke('settings:get'),

  updateSettings: (patch: Partial<Omit<AppSettings, 'schemaVersion'>> & { aiKey?: string }): Env<AppSettings> =>
    ipcRenderer.invoke('settings:update', patch),

  // -- Weather ---------------------------------------------------------------
  getWeather: (): Env<WeatherResponse> =>
    ipcRenderer.invoke('weather:get'),

  refreshWeather: (): Env<WeatherResponse> =>
    ipcRenderer.invoke('weather:refresh'),

  // -- Media -----------------------------------------------------------------
  getMediaState: (): Env<MediaState> =>
    ipcRenderer.invoke('media:getState'),

  controlMedia: (action: 'play' | 'pause' | 'next' | 'previous'): Env<void> =>
    ipcRenderer.invoke('media:control', { action }),

  /** Subscribe to Main→Renderer media state push events. Returns unsubscribe fn. */
  onMediaStateChanged: (cb: (state: MediaInfo) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, state: MediaInfo): void => cb(state)
    ipcRenderer.on('media:stateChanged', listener)
    return () => ipcRenderer.removeListener('media:stateChanged', listener)
  },

  // -- Shelf -----------------------------------------------------------------
  listShelf: (): Env<ShelfItem[]> =>
    ipcRenderer.invoke('shelf:list'),

  addFromDrop: (sourcePath: string): Env<ShelfItem> =>
    ipcRenderer.invoke('shelf:addFromDrop', { sourcePath }),

  removeShelfItem: (id: string): Env<void> =>
    ipcRenderer.invoke('shelf:remove', { id }),

  revealShelfItem: (id: string): Env<void> =>
    ipcRenderer.invoke('shelf:reveal', { id }),

  copyShelfPath: (id: string): Env<void> =>
    ipcRenderer.invoke('shelf:copyPath', { id }),

  getShelfPreview: (id: string): Env<PreviewResponse> =>
    ipcRenderer.invoke('shelf:getPreview', { id }),

  // -- AI Chat ---------------------------------------------------------------
  getAiStatus: (): Env<AiStatus> =>
    ipcRenderer.invoke('ai:getStatus'),

  getAiHistory: (): Env<ChatMessage[]> =>
    ipcRenderer.invoke('ai:getHistory'),

  sendAiMessage: (content: string): Env<ChatMessage> =>
    ipcRenderer.invoke('ai:send', { content }),

  clearAiHistory: (): Env<void> =>
    ipcRenderer.invoke('ai:clear'),

  // -- File helper (D-012) ---------------------------------------------------
  /** Get the absolute filesystem path for a dropped File object. */
  getDroppedFilePath: (file: File): string =>
    webUtils.getPathForFile(file),
} as const

contextBridge.exposeInMainWorld('islandApi', islandApi)

// Export for testing (test can import this directly without relying on side-effect)
export { islandApi }

// Expose the type for the renderer via declaration merging (see src/renderer/src/env.d.ts)
export type IslandApi = typeof islandApi