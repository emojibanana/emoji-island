// T-013 / D-009-D-010: the renderer derives the view from the window size
// (window.innerWidth + 'resize'). Main owns sizing and there is no mode channel
// in IPC_SPEC, so the renderer never resizes or moves the window itself.
import { useEffect, useState } from 'react'
import { IslandPill } from './components/IslandPill'
import { ClockCard } from './components/ClockCard'
import { WeatherCard } from './components/WeatherCard'
import { TabBar, TABS } from './components/TabBar'
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
      <section key={activeTab} role="tabpanel" aria-label={TABS.find((tab) => tab.id === activeTab)?.label} className="flex flex-1 flex-col gap-4 p-4 transition-opacity duration-100 motion-reduce:transition-none">
        <ClockCard />
        <WeatherCard {...weather} />
      </section>
    </main>
  )
}

function App(): JSX.Element {
  const mode = useIslandMode()

  return (
    // Full-window flex root: the pill/panel is centered by layout, not fixed offsets (B-001).
    // key={mode} replays the enter transition when the window changes mode.
    <div key={mode} data-mode={mode} className={`island-enter-${mode} flex h-full w-full items-center justify-center`}>
      {mode === 'collapsed' ? <IslandPill /> : <ExpandedView />}
    </div>
  )
}

export default App