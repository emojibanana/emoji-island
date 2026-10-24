import { useEffect, useState } from 'react'

function formatClock(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function IslandPill(): JSX.Element {
  const [time, setTime] = useState<string>(() => formatClock(new Date()))

  useEffect(() => {
    const id = setInterval(() => {
      const next = formatClock(new Date())
      setTime((prev) => (prev === next ? prev : next))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      aria-label="Clock"
      className="flex h-[40px] w-[280px] items-center justify-center rounded-[16px] border border-white/[0.12] bg-[rgba(15,15,15,0.88)] text-[14px] text-[#F5F5F5]"
    >
      {time}
    </div>
  )
}