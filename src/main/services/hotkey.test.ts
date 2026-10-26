// T-011: hotkey service tests with an injected fake shortcut API (no Electron).
import { describe, it, expect, beforeEach } from 'vitest'
import { registerHotkey, unregisterHotkey, rebindHotkey, type ShortcutApi } from './hotkey'

interface FakeApi extends ShortcutApi {
  registered: string[]
  unregistered: string[]
  returnValue: boolean
  throwMessage: string | null
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

describe('registerHotkey', () => {
  beforeEach(() => unregisterHotkey())

  it('returns ok on success', () => {
    const api = fakeApi()
    const res = registerHotkey('Ctrl+Alt+Space', () => {}, api)
    expect(res).toEqual({ ok: true })
    expect(api.registered).toEqual(['Ctrl+Alt+Space'])
  })

  it('returns ok:false when register returns false (already taken)', () => {
    const api = fakeApi()
    api.returnValue = false
    const res = registerHotkey('Ctrl+Alt+Space', () => {}, api)
    expect(res.ok).toBe(false)
    expect(res.error).toBeTruthy()
    expect(api.registered).toEqual(['Ctrl+Alt+Space']) // attempt recorded, no stale state
    // a failed register must not leave a current binding to release later
    unregisterHotkey()
    expect(api.unregistered).toEqual([])
  })

  it('returns ok:false and does not throw when register throws (invalid accelerator)', () => {
    const api = fakeApi()
    api.throwMessage = 'Failed to register'
    let res!: ReturnType<typeof registerHotkey>
    expect(() => { res = registerHotkey('bogus key', () => {}, api) }).not.toThrow()
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Failed to register')
    unregisterHotkey()
    expect(api.unregistered).toEqual([])
  })
})

describe('rebindHotkey', () => {
  beforeEach(() => unregisterHotkey())

  it('keeps the old hotkey when the new one fails', () => {
    const api = fakeApi()
    registerHotkey('Ctrl+Alt+Space', () => {}, api)
    api.returnValue = false
    const res = rebindHotkey('Ctrl+Shift+X', () => {}, api)
    expect(res.ok).toBe(false)
    // old binding stays active; nothing released
    expect(api.unregistered).toEqual([])
  })

  it('releases the old hotkey only after the new one succeeds', () => {
    const api = fakeApi()
    registerHotkey('Ctrl+Alt+Space', () => {}, api)
    const res = rebindHotkey('Ctrl+Shift+X', () => {}, api)
    expect(res.ok).toBe(true)
    expect(api.registered).toEqual(['Ctrl+Alt+Space', 'Ctrl+Shift+X'])
    expect(api.unregistered).toEqual(['Ctrl+Alt+Space'])
  })
})

describe('unregisterHotkey', () => {
  it('is idempotent', () => {
    const api = fakeApi()
    registerHotkey('Ctrl+Alt+Space', () => {}, api)
    unregisterHotkey()
    unregisterHotkey()
    unregisterHotkey()
    expect(api.unregistered).toEqual(['Ctrl+Alt+Space'])
  })
})