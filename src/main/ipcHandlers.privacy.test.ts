import { beforeEach, describe, expect, it, vi } from 'vitest'

const { handlers, logError } = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  logError: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => handlers.set(channel, handler),
    on: vi.fn(),
  },
}))

vi.mock('electron-log', () => ({ default: { error: logError, warn: vi.fn() } }))

import { registerMediaHandlers, registerShelfHandlers } from './ipcHandlers'

const secret = '/Users/test/private/media-title-api-key.txt'

beforeEach(() => {
  handlers.clear()
  logError.mockClear()
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
    expect(JSON.stringify(logError.mock.calls)).not.toContain('sk-test-secret')
  })
})
