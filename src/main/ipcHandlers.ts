// T-012 / D-010: Window IPC handlers. Fire-and-forget for input/drag, invoke for setMode.
// T-014 / D-016: Weather IPC — handlers never throw; failures degrade to stale/offline.
import { ipcMain } from 'electron'
import log from 'electron-log'
import {
  WindowSetDragActiveSchema,
  WindowSetInputActiveSchema,
  WindowSetModeSchema,
} from '../shared/schemas'
import type { IpcEnvelope, WeatherResult } from '../shared/types'
import type { FocusController } from './services/focus-controller'
import type { AppStore } from './services/store'
import { createWeatherService } from './services/weather'

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