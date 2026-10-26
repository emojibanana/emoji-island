// T-011: Global hotkey wrapper (FR-003, D-011).
// The shortcut API is injected so this module unit-tests without Electron.

export interface ShortcutApi {
  register(accelerator: string, callback: () => void): boolean
  unregister(accelerator: string): void
}

export interface HotkeyResult {
  ok: boolean
  error?: string
}

// ponytail: one active hotkey at a time; upgrade when Settings exposes multiple bindings.
let current: { accel: string; api: ShortcutApi } | null = null

export function registerHotkey(
  accelerator: string,
  onToggle: () => void,
  api: ShortcutApi
): HotkeyResult {
  try {
    if (!api.register(accelerator, onToggle)) {
      return { ok: false, error: 'hotkey already taken' }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  current = { accel: accelerator, api }
  return { ok: true }
}

export function unregisterHotkey(): void {
  if (!current) return
  const { accel, api } = current
  current = null
  api.unregister(accel)
}

// Re-bind safely: release the old binding only after the new one succeeds,
// so a failed rebind never leaves us with no hotkey at all.
export function rebindHotkey(
  newAccel: string,
  onToggle: () => void,
  api: ShortcutApi
): HotkeyResult {
  const prev = current
  const result = registerHotkey(newAccel, onToggle, api)
  if (result.ok && prev) prev.api.unregister(prev.accel)
  return result
}