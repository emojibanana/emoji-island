import { useEffect, useState } from 'react'
import type { WeatherResult } from '@shared/types'

export interface UseWeatherResult {
  result: WeatherResult | null
  loading: boolean
  error: string | null
}

export function useWeather(): UseWeatherResult {
  const [result, setResult] = useState<WeatherResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Keep poller guards local to the effect to avoid stranded loading state under StrictMode double-mount.
    let cancelled = false
    let inFlight = false
    let lastRefreshAt = 0
    const isMounted = (): boolean => !cancelled

    const fetchWeather = async (): Promise<void> => {
      if (inFlight) return
      inFlight = true

      try {
        if (!window.islandApi) {
          if (isMounted()) {
            setError('Island API not available')
          }
          return
        }

        const getEnv = await window.islandApi.getWeather()
        if (!isMounted()) return

        if (!getEnv.ok) {
          setError(getEnv.error?.message ?? 'Failed to fetch weather')
          return
        }

        const getResult = getEnv.data
        if (getResult) {
          setResult(getResult)
          setError(null)

          const now = Date.now()
          if (
            getResult.status !== 'fresh' &&
            now - lastRefreshAt >= 5 * 60 * 1000
          ) {
            lastRefreshAt = now
            const refreshEnv = await window.islandApi.refreshWeather()
            if (!isMounted()) return

            if (!refreshEnv.ok) {
              setError(refreshEnv.error?.message ?? 'Failed to refresh weather')
            } else if (refreshEnv.data) {
              setResult(refreshEnv.data)
              setError(null)
            }
          }
        }
      } catch (err) {
        if (isMounted()) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (isMounted()) {
          setLoading(false)
        }
        inFlight = false
      }
    }

    fetchWeather()
    const intervalId = window.setInterval(fetchWeather, 60_000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  return { result, loading, error }
}
