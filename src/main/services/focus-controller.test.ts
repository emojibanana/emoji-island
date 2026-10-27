import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { FocusController, type IslandMode, type FocusControllerDeps } from './focus-controller'

describe('FocusController', () => {
  let setModeSpy: Mock<(mode: IslandMode) => void>
  let ctrl: FocusController

  beforeEach(() => {
    vi.useFakeTimers()
    setModeSpy = vi.fn<(mode: IslandMode) => void>()
    const deps: FocusControllerDeps = {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
      setMode: setModeSpy,
    }
    ctrl = new FocusController(deps)
  })

  afterEach(() => {
    ctrl.dispose()
    vi.useRealTimers()
  })

  it('blur starts exactly one 300ms timer and collapses at 300ms', () => {
    ctrl.setMode('expanded')
    setModeSpy.mockClear()
    ctrl.onBlur()
    vi.advanceTimersByTime(299)
    expect(setModeSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(setModeSpy).toHaveBeenCalledTimes(1)
    expect(setModeSpy).toHaveBeenCalledWith('collapsed')
  })

  it('refocus before 300ms cancels the timer', () => {
    ctrl.setMode('expanded')
    setModeSpy.mockClear()
    ctrl.onBlur()
    vi.advanceTimersByTime(150)
    ctrl.onFocus()
    vi.advanceTimersByTime(300)
    expect(setModeSpy).not.toHaveBeenCalled()
  })

  it('inputActive=true prevents the timer and cancels a running one', () => {
    ctrl.setMode('expanded')
    setModeSpy.mockClear()
    ctrl.setInputActive(true)
    ctrl.onBlur()
    expect(setModeSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(setModeSpy).not.toHaveBeenCalled()
  })

  it('inputActive=false after blur starts the timer', () => {
    ctrl.setMode('expanded')
    ctrl.setInputActive(true)
    ctrl.onBlur()
    setModeSpy.mockClear()
    ctrl.setInputActive(false)
    vi.advanceTimersByTime(300)
    expect(setModeSpy).toHaveBeenCalledWith('collapsed')
  })

  it('dragActive=true while collapsed expands immediately', () => {
    setModeSpy.mockClear()
    ctrl.setDragActive(true)
    expect(setModeSpy).toHaveBeenCalledTimes(1)
    expect(setModeSpy).toHaveBeenCalledWith('expanded')
  })

  it('dragActive=true suspends a running timer', () => {
    ctrl.setMode('expanded')
    setModeSpy.mockClear()
    ctrl.onBlur()
    vi.advanceTimersByTime(150)
    ctrl.setDragActive(true)
    vi.advanceTimersByTime(300)
    expect(setModeSpy).not.toHaveBeenCalled()
  })

  it('dragActive=false after blur restarts the timer', () => {
    ctrl.setMode('expanded')
    ctrl.setDragActive(true)
    setModeSpy.mockClear()
    ctrl.onBlur()
    vi.advanceTimersByTime(150)
    ctrl.setDragActive(false)
    vi.advanceTimersByTime(299)
    expect(setModeSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(setModeSpy).toHaveBeenCalledWith('collapsed')
  })

  it('mode change cancels the timer', () => {
    ctrl.setMode('expanded')
    setModeSpy.mockClear()
    ctrl.onBlur()
    vi.advanceTimersByTime(150)
    ctrl.setMode('collapsed')
    setModeSpy.mockClear()
    vi.advanceTimersByTime(300)
    expect(setModeSpy).not.toHaveBeenCalled()
  })

  it('dispose clears the timer', () => {
    ctrl.setMode('expanded')
    setModeSpy.mockClear()
    ctrl.onBlur()
    vi.advanceTimersByTime(150)
    ctrl.dispose()
    vi.advanceTimersByTime(300)
    expect(setModeSpy).not.toHaveBeenCalled()
  })

  it('never leaves two timers running', () => {
    ctrl.setMode('expanded')
    setModeSpy.mockClear()
    ctrl.onBlur()
    vi.advanceTimersByTime(100)
    ctrl.onFocus()
    ctrl.onBlur()
    vi.advanceTimersByTime(200)
    expect(setModeSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(setModeSpy).toHaveBeenCalledTimes(1)
  })
})