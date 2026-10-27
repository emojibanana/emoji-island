// T-012 / D-010 / FR-004 / FR-010: Pure focus & drag state machine.
// No 'electron' import — timer and window actions are injected for testability.

export type IslandMode = 'collapsed' | 'expanded'

export interface FocusControllerDeps {
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (id: unknown) => void
  setMode: (mode: IslandMode) => void
}

const COLLAPSE_DELAY_MS = 300

export class FocusController {
  private readonly deps: FocusControllerDeps
  private mode: IslandMode = 'collapsed'
  private inputActive = false
  private dragActive = false
  private windowFocused = false
  private collapseTimer: unknown = null

  constructor(deps: FocusControllerDeps) {
    this.deps = deps
  }

  // -- Public API ------------------------------------------------------------

  getMode(): IslandMode {
    return this.mode
  }

  setMode(mode: IslandMode): void {
    if (this.mode === mode) return
    this.cancelTimer()
    this.mode = mode
    this.deps.setMode(mode)
  }

  setInputActive(active: boolean): void {
    if (this.inputActive === active) return
    this.inputActive = active
    if (active) {
      this.cancelTimer()
    } else if (!this.windowFocused && this.mode === 'expanded') {
      this.startCollapseTimer()
    }
  }

  setDragActive(active: boolean): void {
    if (this.dragActive === active) return
    this.dragActive = active
    if (active) {
      this.cancelTimer()
      if (this.mode === 'collapsed') {
        this.mode = 'expanded'
        this.deps.setMode('expanded')
      }
    } else if (!this.windowFocused && this.mode === 'expanded' && !this.inputActive) {
      this.startCollapseTimer()
    }
  }

  onFocus(): void {
    this.windowFocused = true
    this.cancelTimer()
  }

  onBlur(): void {
    this.windowFocused = false
    if (this.mode === 'expanded' && !this.inputActive && !this.dragActive) {
      this.startCollapseTimer()
    }
  }

  dispose(): void {
    this.cancelTimer()
  }

  // -- Internals -------------------------------------------------------------

  private startCollapseTimer(): void {
    this.cancelTimer()
    this.collapseTimer = this.deps.setTimeout(() => {
      this.collapseTimer = null
      if (this.mode !== 'collapsed') {
        this.mode = 'collapsed'
        this.deps.setMode('collapsed')
      }
    }, COLLAPSE_DELAY_MS)
  }

  private cancelTimer(): void {
    if (this.collapseTimer !== null) {
      this.deps.clearTimeout(this.collapseTimer)
      this.collapseTimer = null
    }
  }
}