import { useRef, type KeyboardEvent } from 'react'
import { Clock, type LucideIcon } from 'lucide-react'

export interface Tab {
  id: string
  label: string
  icon: LucideIcon
}

export const TABS: Tab[] = [
  {
    id: 'clock-weather',
    label: 'Clock & Weather',
    icon: Clock,
  },
]

export interface TabBarProps {
  activeTab: string
  onSelectTab: (tabId: string) => void
}

export function TabBar({ activeTab, onSelectTab }: TabBarProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)

  // Roving tabindex: move selection AND focus together, otherwise focus is lost on re-render.
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let nextIndex: number
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
    else return
    e.preventDefault()
    onSelectTab(TABS[nextIndex].id)
    listRef.current?.querySelectorAll('button')[nextIndex]?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Navigation tabs"
      className="flex items-center gap-1 border-b border-white/[0.08] px-3 py-2"
    >
      {TABS.map((tab, index) => {
        const Icon = tab.icon
        const isSelected = tab.id === activeTab

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isSelected}
            aria-label={tab.label}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-opacity duration-100 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF] ${
              isSelected
                ? 'bg-white/[0.12] text-[#F5F5F5]'
                : 'text-[#A3A3A3] hover:bg-white/[0.06] hover:text-[#F5F5F5]'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
