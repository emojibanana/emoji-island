// T-013 / D-009-D-010: the renderer derives the view from the window size
// (window.innerWidth + 'resize'). Main owns sizing and there is no mode channel
// in IPC_SPEC, so the renderer never resizes or moves the window itself.
// T-024 / D-010 / D-012: global drag handlers send window:setDragActive via
// islandApi.setDragActive (fire-and-forget). The renderer never resizes the
// window; main process handles expand/collapse. File path is derived in preload
// via webUtils.getPathForFile (addFromDrop accepts a File object, not a string).
import { useCallback, useEffect, useRef, useState } from 'react'
import { IslandPill } from './components/IslandPill'
import { ClockCard } from './components/ClockCard'
import { WeatherCard } from './components/WeatherCard'
import { TabBar, TABS } from './components/TabBar'
import { ShelfList } from './components/ShelfList'
import { useWeather } from './hooks/use-weather'

const COLLAPSED_WIDTH = 280 // D-017

type IslandMode = 'collapsed' | 'expanded'

function readMode(): IslandMode {
  return window.innerWidth > COLLAPSED_WIDTH ? 'expanded' : 'collapsed'
}

function useIslandMode(): IslandMode {
  const [mode, setMode] = useState<IslandMode>(readMode)

  useEffect(() => {
    const sync = (): void => setMode(readMode())
    window.addEventListener('resize', sync)
    sync() // the window can change size between first paint and mount
    return () => window.removeEventListener('resize', sync)
  }, [])

  return mode
}

function ExpandedView({ shelfVersion }: { shelfVersion: number }): JSX.Element {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id)
  const weather = useWeather()

  return (
    <main aria-label="Emoji Island panel" className="flex h-full w-full flex-col overflow-hidden rounded-[16px] border border-white/[0.12] bg-[rgba(15,15,15,0.88)] text-[14px] text-[#F5F5F5]">
      <TabBar activeTab={activeTab} onSelectTab={setActiveTab} />
      <section key={activeTab} role="tabpanel" aria-label={TABS.find((tab) => tab.id === activeTab)?.label} className="flex flex-1 flex-col gap-4 p-4 animate-[island-fade_100ms_ease-out] motion-reduce:animate-none overflow-hidden">
        {activeTab === 'clock-weather' && (
          <>
            <ClockCard />
            <WeatherCard {...weather} />
          </>
        )}
        {activeTab === 'files' && <ShelfList version={shelfVersion} />}
      </section>
    </main>
  )
}

// T-024: Drop zone overlay shown while a file is dragged over the window.
// UI_SPEC §5: dashed Accent border + "Drop file to add", <= 200ms transition.
// Drop feedback must not rely on color alone (aria-label added).
function DropOverlay(): JSX.Element {
  return (
    <div
      aria-label="Drop zone active — release to add file"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-[16px] border-2 border-dashed border-[#7C9CFF] bg-[rgba(124,156,255,0.08)] motion-reduce:transition-none transition-opacity duration-200"
    >
      <span className="select-none text-[14px] font-medium text-[#7C9CFF]">Drop file to add</span>
    </div>
  )
}

function App(): JSX.Element {
  const mode = useIslandMode()
  const [isDragOver, setIsDragOver] = useState(false)
  const [shelfVersion, setShelfVersion] = useState(0)
  const dragEnterCount = useRef(0)
  const dragActive = useRef(false)
  const lastDragOverAt = useRef(0)
  const dragHeartbeat = useRef<number | null>(null)

  const stopDragHeartbeat = useCallback(() => {
    if (dragHeartbeat.current !== null) {
      window.clearInterval(dragHeartbeat.current)
      dragHeartbeat.current = null
    }
    lastDragOverAt.current = 0
  }, [])

  const resetDragState = useCallback(() => {
    dragEnterCount.current = 0
    setIsDragOver(false)
    stopDragHeartbeat()
    if (dragActive.current) {
      dragActive.current = false
      window.islandApi.setDragActive(false)
    }
  }, [stopDragHeartbeat])

  const startDragHeartbeat = useCallback(() => {
    if (dragHeartbeat.current !== null) return
    dragHeartbeat.current = window.setInterval(() => {
      if (!dragActive.current) return
      if (Date.now() - lastDragOverAt.current > 300) {
        resetDragState()
      }
    }, 100)
  }, [resetDragState])

  // Native window drag listeners for robust state cleanup
  useEffect(() => {
    const handleDragEnter = (e: DragEvent): void => {
      if (!e.dataTransfer?.types.includes('Files')) return
      e.preventDefault()
      dragEnterCount.current += 1
      if (!dragActive.current) {
        dragActive.current = true
        setIsDragOver(true)
        lastDragOverAt.current = Date.now()
        startDragHeartbeat()
        window.islandApi.setDragActive(true)
      }
    }

    const handleDragOver = (e: DragEvent): void => {
      if (!e.dataTransfer?.types.includes('Files')) return
      e.preventDefault()
      lastDragOverAt.current = Date.now()
    }

    const handleDragLeave = (e: DragEvent): void => {
      if (!e.dataTransfer?.types.includes('Files')) return
      e.preventDefault()
      dragEnterCount.current -= 1
      if (dragEnterCount.current <= 0) {
        resetDragState()
      }
    }

    const handleDrop = async (e: DragEvent): Promise<void> => {
      e.preventDefault()
      resetDragState()

      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return

      await Promise.allSettled(files.map((file) => window.islandApi.addFromDrop(file)))
      setShelfVersion((v) => v + 1)
    }

    const handleDragEnd = (): void => {
      resetDragState()
    }

    const handleBlur = (): void => {
      resetDragState()
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    window.addEventListener('dragend', handleDragEnd)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
      window.removeEventListener('dragend', handleDragEnd)
      window.removeEventListener('blur', handleBlur)
      stopDragHeartbeat()
    }
  }, [resetDragState, startDragHeartbeat, stopDragHeartbeat])

  // Reset drag state when mode collapses
  useEffect(() => {
    if (mode === 'collapsed') {
      resetDragState()
    }
  }, [mode, resetDragState])

  return (
    // Full-window flex root: the pill/panel is centered by layout, not fixed offsets (B-001).
    // key={mode} replays the enter transition when the window changes mode.
    // position:relative needed for the drop overlay (absolute inset-0).
    <div
      key={mode}
      data-mode={mode}
      className={`island-enter-${mode} relative flex h-full w-full items-center justify-center`}
    >
      {mode === 'collapsed' ? <IslandPill /> : <ExpandedView shelfVersion={shelfVersion} />}
      {isDragOver && <DropOverlay />}
    </div>
  )
}

export default App