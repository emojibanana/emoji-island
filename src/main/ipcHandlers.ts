// T-012 / D-010: Window IPC handlers. Fire-and-forget for input/drag, invoke for setMode.
// T-014 / D-016: Weather IPC — handlers never throw; failures degrade to stale/offline.
// T-020-Lb / D-008 Locked: Media IPC handlers — media:getState and media:control.
import { ipcMain } from 'electron'
import log from 'electron-log'
import {
  WindowSetDragActiveSchema,
  WindowSetInputActiveSchema,
  WindowSetModeSchema,
  MediaControlSchema,
} from '../shared/schemas'
import type { IpcEnvelope, MediaState, WeatherResult } from '../shared/types'
import type { FocusController } from './services/focus-controller'
import type { AppStore } from './services/store'
import { createWeatherService } from './services/weather'
import type { MediaService } from './services/media'

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