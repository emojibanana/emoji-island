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

function ExpandedView(): JSX.Element {
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
        {activeTab === 'files' && <ShelfList />}
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
  // ponytail: dragEnterCount prevents false dragleave when cursor moves over child elements
  const dragEnterCount = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only process if dragged item contains files (not text, links, etc.)
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    dragEnterCount.current += 1
    if (dragEnterCount.current === 1) {
      setIsDragOver(true)
      window.islandApi.setDragActive(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    dragEnterCount.current -= 1
    if (dragEnterCount.current <= 0) {
      dragEnterCount.current = 0
      setIsDragOver(false)
      window.islandApi.setDragActive(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault() // required to allow drop
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragEnterCount.current = 0
    setIsDragOver(false)
    window.islandApi.setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return // non-file drop (text, link, etc.)

    // D-012: addFromDrop accepts a File object; preload derives path via webUtils.getPathForFile.
    // Process all dropped files sequentially (fire-and-forget; errors visible in ShelfList).
    for (const file of files) {
      // ponytail: no error UI here — ShelfList re-fetches after drop; add Toast in T-025+
      void window.islandApi.addFromDrop(file)
    }
  }, [])

  return (
    // Full-window flex root: the pill/panel is centered by layout, not fixed offsets (B-001).
    // key={mode} replays the enter transition when the window changes mode.
    // position:relative needed for the drop overlay (absolute inset-0).
    <div
      key={mode}
      data-mode={mode}
      className={`island-enter-${mode} relative flex h-full w-full items-center justify-center`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {mode === 'collapsed' ? <IslandPill /> : <ExpandedView />}
      {isDragOver && <DropOverlay />}
    </div>
  )
}

export default App