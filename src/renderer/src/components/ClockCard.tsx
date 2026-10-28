import { useEffect, useState } from 'react'

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function ClockCard(): JSX.Element {
  const [time, setTime] = useState<string>(() => formatTime(new Date()))
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const update = (): void => {
      const now = new Date()
      setTime(formatTime(now))
      setDate(now.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }))
      const delay = 60_000 - (now.getSeconds() * 1_000 + now.getMilliseconds())
      timeout = window.setTimeout(update, delay)
    }
    let timeout = 0
    update()
    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <div className="space-y-1">
      <div className="text-[20px] font-medium">{time}</div>
      <div className="text-[12px] text-[#A3A3A3]">{date}</div>
    </div>
  )
}