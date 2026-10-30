// T-020-La / D-008 Locked: Media service — orchestrates the bridge and pushes
// media:stateChanged events to the renderer via the provided sender.
// This file stays Electron-aware (uses BrowserWindow.webContents.send).
import type { WebContents } from 'electron'
import type { MediaState } from '../../shared/types'
import { createMediaBridge } from './media-bridge'
import type { MediaBridge } from './media-bridge'

const UNAVAILABLE_STATE: MediaState = {
  title: null,
  artist: null,
  status: 'unavailable',
  canControl: false,
}

export interface MediaService {
  getState(): MediaState
  sendControl(action: 'play' | 'pause' | 'next' | 'previous'): Promise<{ ok: boolean; error?: string }>
  dispose(): void
}

/**
 * Create the media service.
 * @param sender – webContents.send bound to the active BrowserWindow; used to
 *                 push media:stateChanged events. May be null while the window
 *                 is not yet ready.
 */
export function createMediaService(
  getSender: () => WebContents | null
): MediaService {
  let currentState: MediaState = UNAVAILABLE_STATE
  let bridge: MediaBridge | null = null

  bridge = createMediaBridge((state: MediaState) => {
    currentState = state
    const sender = getSender()
    if (sender && !sender.isDestroyed()) {
      sender.send('media:stateChanged', state)
    }
  })

  return {
    getState(): MediaState {
      return currentState
    },

    async sendControl(action): Promise<{ ok: boolean; error?: string }> {
      if (!bridge) return { ok: false, error: 'bridge_unavailable' }
      const result = await bridge.sendCommand(action)
      // D-008: re-poll status ~700 ms after a control command.
      if (result.ok) {
        setTimeout(() => {
          void bridge?.readState().then((state) => {
            currentState = state
            const sender = getSender()
            if (sender && !sender.isDestroyed()) {
              sender.send('media:stateChanged', state)
            }
          })
        }, 700)
      }
      return result
    },

    dispose(): void {
      bridge?.dispose()
      bridge = null
    },
  }
}
