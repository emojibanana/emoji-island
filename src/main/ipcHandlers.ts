// T-012 / D-010: Window IPC handlers. Fire-and-forget for input/drag, invoke for setMode.
import { ipcMain } from 'electron'
import log from 'electron-log'
import {
  WindowSetDragActiveSchema,
  WindowSetInputActiveSchema,
  WindowSetModeSchema,
} from '../shared/schemas'
import type { IpcEnvelope } from '../shared/types'
import type { FocusController } from './services/focus-controller'

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