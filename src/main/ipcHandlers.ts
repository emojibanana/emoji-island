// T-012 / D-010: Window IPC handlers. Fire-and-forget for input/drag, invoke for setMode.
// T-014 / D-016: Weather IPC — handlers never throw; failures degrade to stale/offline.
// T-020-Lb / D-008 Locked: Media IPC handlers — media:getState and media:control.
// T-022 / D-012 / T-025h: Shelf IPC handlers — addFromDrop, list, remove.
// T-023 / D-013: shelf:getPreview handler.
// T-025f-spike / D-014 amendment: shelf:dragOut handler.
// T-026a / D-006: AI Chat handlers — ai:getStatus, ai:getHistory, ai:send, ai:clear (mock only, D-024).
import { ipcMain } from 'electron'
import log from 'electron-log'
import { randomUUID } from 'crypto'
import { join } from 'path'
import {
  AiSendSchema,
  WindowSetDragActiveSchema,
  WindowSetInputActiveSchema,
  WindowSetModeSchema,
  MediaControlSchema,
  ShelfAddFromDropSchema,
  ShelfIdSchema,
} from '../shared/schemas'
import type { ChatMessage, IpcEnvelope, MediaState, WeatherResult, ShelfItemMetadata } from '../shared/types'
import * as shelfPreview from './services/shelfPreview'
import { createAiService, type AiStatus, type ChatStorePort } from './services/ai'
import type { FocusController } from './services/focus-controller'
import type { AppStore } from './services/store'
import { createWeatherService } from './services/weather'
import type { MediaService } from './services/media'
import * as shelf from './services/shelf'

// T-025f-spike: app-bundled drag icon. Never a user file path.
// Main bundles to out/main/index.js, so this resolves the same as services/tray.ts.
const DRAG_ICON_PATH = join(__dirname, '../../resources/tray-icon.png')

export function registerWindowHandlers(controller: FocusController): void {
  ipcMain.on('window:setInputActive', (_event, payload: unknown) => {
    const result = WindowSetInputActiveSchema.safeParse(payload)
    if (!result.success) {
      log.warn('Invalid window:setInputActive payload')
      return
    }
    controller.setInputActive(result.data.active)
  })

  ipcMain.on('window:setDragActive', (_event, payload: unknown) => {
    const result = WindowSetDragActiveSchema.safeParse(payload)
    if (!result.success) {
      log.warn('Invalid window:setDragActive payload')
      return
    }
    controller.setDragActive(result.data.active)
  })

  ipcMain.handle('window:setMode', (_event, payload: unknown): IpcEnvelope<void> => {
    const result = WindowSetModeSchema.safeParse(payload)
    if (!result.success) {
      return {
        ok: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid window:setMode payload' },
      }
    }
    controller.setMode(result.data.mode)
    return { ok: true, data: null, error: null }
  })
}

function weatherFailure(channel: string, error: unknown): IpcEnvelope<WeatherResult> {
  const message = error instanceof Error ? error.message : 'unknown'
  log.error(`${channel} failed: ${message}`) // no payload dump (never logs coordinates/settings)
  return { ok: false, data: null, error: { code: 'UNKNOWN_ERROR', message: 'Weather unavailable' } }
}

export function registerWeatherHandlers(store: AppStore): void {
  // Composition root lives here: the service itself stays Electron-free (see services/weather.ts).
  const service = createWeatherService({
    fetch: (url, init) => fetch(url, init),
    now: () => Date.now(),
    sleep: (ms) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms)),
    location: () => {
      const { latitude, longitude } = store.get('settings')
      return { latitude, longitude }
    },
    cache: {
      get: () => store.get('weatherCache'),
      set: (cache) => store.set('weatherCache', cache),
    },
  })

  // Both channels take no input (IPC_SPEC §3), so there is no payload to validate.
  // Network/timeout/malformed payload are normal states here: ok stays true and the
  // renderer reads `status` (fresh | stale | offline) per FR-007.
  ipcMain.handle('weather:get', (): IpcEnvelope<WeatherResult> => {
    try {
      return { ok: true, data: service.getWeather(), error: null }
    } catch (error) {
      return weatherFailure('weather:get', error)
    }
  })

  ipcMain.handle('weather:refresh', async (): Promise<IpcEnvelope<WeatherResult>> => {
    try {
      return { ok: true, data: await service.refreshWeather(), error: null }
    } catch (error) {
      return weatherFailure('weather:refresh', error)
    }
  })
}

// T-020-Lb / D-008 Locked: Media IPC handlers.
// media:getState — synchronous read of the last known state (no blocking poll).
// media:control — validated action forwarded to the bridge; timeout 2 s per IPC_SPEC.
export function registerMediaHandlers(mediaService: MediaService): void {
  ipcMain.handle('media:getState', (): IpcEnvelope<MediaState> => {
    try {
      return { ok: true, data: mediaService.getState(), error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown'
      log.error(`media:getState failed: ${message}`)
      return { ok: false, data: null, error: { code: 'MEDIA_UNAVAILABLE', message: 'Media unavailable' } }
    }
  })

  ipcMain.handle('media:control', async (_event, payload: unknown): Promise<IpcEnvelope<void>> => {
    const parsed = MediaControlSchema.safeParse(payload)
    if (!parsed.success) {
      return { ok: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid media:control payload' } }
    }

    // D-008: timeout 2 s per IPC_SPEC §4 Media.
    const result = await Promise.race([
      mediaService.sendControl(parsed.data.action),
      new Promise<{ ok: false; error: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, error: 'timeout' }), 2000)
      ),
    ])

    if (!result.ok) {
      // D-008: log only non-sensitive state (action kind, not title).
      log.warn(`[media] control ${parsed.data.action} failed: ${result.error ?? 'unknown'}`)
      return {
        ok: false,
        data: null,
        error: {
          code: result.error === 'timeout' ? 'TIMEOUT' : 'MEDIA_UNAVAILABLE',
          message: result.error === 'timeout' ? 'Media control timed out' : 'Media control failed',
        },
      }
    }
    return { ok: true, data: null, error: null }
  })
}

// T-022 / D-012: Shelf IPC handlers.
export function registerShelfHandlers(store: AppStore): void {
  ipcMain.handle('shelf:list', (): IpcEnvelope<ShelfItemMetadata[]> => {
    try {
      return { ok: true, data: shelf.listItems(store), error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown'
      log.error(`shelf:list failed: ${message}`)
      return { ok: false, data: null, error: { code: 'STORAGE_ERROR', message: 'List failed' } }
    }
  })

  ipcMain.handle('shelf:addFromDrop', async (_event, payload: unknown): Promise<IpcEnvelope<ShelfItemMetadata>> => {
    const parsed = ShelfAddFromDropSchema.safeParse(payload)
    if (!parsed.success) {
      return { ok: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid sourcePath' } }
    }

    const result = await shelf.addFromDrop(store, parsed.data.sourcePath)
    if (!result.ok) {
      return { ok: false, data: null, error: { code: result.code, message: result.message } }
    }
    return { ok: true, data: result.data, error: null }
  })

  ipcMain.handle('shelf:remove', async (_event, payload: unknown): Promise<IpcEnvelope<void>> => {
    const parsed = ShelfIdSchema.safeParse(payload)
    if (!parsed.success) {
      return { ok: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } }
    }

    const result = await shelf.removeItem(store, parsed.data.id)
    if (!result.ok) {
      return { ok: false, data: null, error: { code: result.code, message: result.message } }
    }
    return { ok: true, data: null, error: null }
  })

  // T-023 / D-013: shelf:getPreview — data URL for PNG/JPEG/WebP/GIF <= 2 MB.
  ipcMain.handle(
    'shelf:getPreview',
    async (_event, payload: unknown): Promise<IpcEnvelope<{ dataUrl: string; mimeType: string }>> => {
      const parsed = ShelfIdSchema.safeParse(payload)
      if (!parsed.success) {
        return { ok: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } }
      }

      const result = await shelfPreview.getPreview(store, parsed.data.id)
      if (!result.ok) {
        return { ok: false, data: null, error: { code: result.code, message: result.message } }
      }
      return { ok: true, data: result.data, error: null }
    }
  )

  // T-025f-spike / D-014 amendment: shelf:dragOut — native drag-out of one shelf file.
  // Resolution is synchronous so startDrag runs in the same turn as the renderer gesture.
  // ponytail: spike scope — single file, shelf item stays, no consume/TTL/multi-file.
  ipcMain.handle('shelf:dragOut', (event, payload: unknown): IpcEnvelope<void> => {
    const parsed = ShelfIdSchema.safeParse(payload)
    if (!parsed.success) {
      return { ok: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } }
    }

    const resolved = shelf.resolveDragFilePath(store, parsed.data.id)
    if (!resolved.ok) {
      log.warn(`[shelf] dragOut rejected: ${resolved.code}`) // error code only, no path/name
      return { ok: false, data: null, error: { code: resolved.code, message: resolved.message } }
    }

    // The resolved path stays in main: startDrag only, never returned in the envelope.
    // Success here means the drag started — not that the external target copied/uploaded it.
      try {
    event.sender.startDrag({ file: resolved.data, icon: DRAG_ICON_PATH })
  } catch {
    log.warn('[shelf] dragOut start failed')
    return {
      ok: false,
      data: null,
      error: { code: 'STORAGE_ERROR', message: 'Drag-out failed' },
    }
  }

  return { ok: true, data: null, error: null }
    })
}

// T-026a / D-006 / D-024: AI Chat IPC handlers over the in-process MockProvider.
// History is store-backed: AppStore owns chatMessages and its 50-message cap (DATA_MODEL §2).
export function registerAiHandlers(store: AppStore): void {
  // Composition root: the service itself stays Electron-free (see services/ai.ts).
  const chatStore: ChatStorePort = {
    getMessages: () => store.get('chatMessages'),
    pushMessage: (message) => store.pushChat(message),
    clearMessages: () => store.set('chatMessages', []),
  }
  const service = createAiService({ now: () => Date.now(), newId: () => randomUUID(), chatStore })

  ipcMain.handle('ai:getStatus', (): IpcEnvelope<AiStatus> => {
    return { ok: true, data: service.getStatus(), error: null }
  })

  ipcMain.handle('ai:getHistory', (): IpcEnvelope<ChatMessage[]> => {
    try {
      return { ok: true, data: service.getHistory(), error: null }
    } catch (err) {
      return aiFailure('ai:getHistory', err)
    }
  })

  // IPC_SPEC §4: ai:send returns the assistant message. The mock provider runs in-process
  // and cannot fail on its own; only storage reads/writes can, hence the try/catch below.
  ipcMain.handle('ai:send', (_event, payload: unknown): IpcEnvelope<ChatMessage> => {
    const parsed = AiSendSchema.safeParse(payload)
    if (!parsed.success) {
      return { ok: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid ai:send payload' } }
    }
    try {
      return { ok: true, data: service.send(parsed.data.content), error: null }
    } catch (err) {
      return aiFailure('ai:send', err)
    }
  })

  ipcMain.handle('ai:clear', (): IpcEnvelope<void> => {
    try {
      service.clear()
      return { ok: true, data: null, error: null }
    } catch (err) {
      return aiFailure('ai:clear', err)
    }
  })
}

// Storage failure is a normal state (disk/file errors): generic envelope, and only the error
// message is logged — never chat content, ids, model, endpoint or paths.
function aiFailure<T>(channel: string, error: unknown): IpcEnvelope<T> {
  const message = error instanceof Error ? error.message : 'unknown'
  log.error(`${channel} failed: ${message}`)
  return { ok: false, data: null, error: { code: 'STORAGE_ERROR', message: 'Chat history unavailable' } }
}