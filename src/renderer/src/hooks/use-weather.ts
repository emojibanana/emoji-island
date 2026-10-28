import { useEffect, useRef, useState } from 'react'
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

  const inFlightRef = useRef<boolean>(false)
  const lastRefreshRef = useRef<number>(0)

  useEffect(() => {
    let cancelled = false
    const isMounted = (): boolean => !cancelled

    const fetchWeather = async (): Promise<void> => {
      if (inFlightRef.current) return
      inFlightRef.current = true

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
            now - lastRefreshRef.current >= 5 * 60 * 1000
          ) {
            lastRefreshRef.current = now
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
          inFlightRef.current = false
        }
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
