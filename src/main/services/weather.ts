// T-014 / D-016: Open-Meteo weather service (main process).
// PURE: no 'electron' import — fetch, clock, sleep, location and cache are injected,
// so the whole module is testable without Electron (card T-014 / TESTING.md §1).
import { z } from 'zod'
import { WeatherCacheSchema } from '../../shared/schemas'
import type { WeatherCache, WeatherResult, WeatherStatus } from '../../shared/types'

export const FRESH_MS = 30 * 60 * 1000 // D-016: 30-minute cache
export const STALE_MS = 24 * 60 * 60 * 1000 // FR-007: stale up to 24 h, then offline
export const TIMEOUT_MS = 3000 // D-016: 3 s, 1 retry, 1 s backoff
export const BACKOFF_MS = 1000
export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

// Verified live against https://open-meteo.com/en/docs on 2026-10-28 (IPC_SPEC §5 [VERIFY]):
// GET .../v1/forecast?latitude=&longitude=&current=<fields>&timezone=auto
// -> { current: { temperature_2m: 32.4, apparent_temperature: 37.6,
//                 relative_humidity_2m: 56, weather_code: 3 } }   (metric °C / % / WMO code)
const CURRENT_FIELDS = 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code'

const OpenMeteoCurrentSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    weather_code: z.number().int(),
  }),
})

export type FetchLike = (url: string, init: { signal: AbortSignal }) => Promise<Response>

export interface WeatherCachePort {
  get(): WeatherCache | null
  set(cache: WeatherCache): void
}

export interface WeatherDeps {
  fetch: FetchLike
  now(): number
  sleep(ms: number): Promise<void>
  location(): { latitude: number; longitude: number }
  cache: WeatherCachePort
}

export interface WeatherService {
  getWeather(): WeatherResult
  refreshWeather(): Promise<WeatherResult>
}

export function deriveStatus(cache: WeatherCache | null, now: number): WeatherStatus {
  if (!cache) return 'offline'
  const age = now - cache.updatedAt
  if (age < FRESH_MS) return 'fresh'
  if (age <= STALE_MS) return 'stale'
  return 'offline'
}

export function createWeatherService(deps: WeatherDeps): WeatherService {
  // Re-validate on read: a corrupt store value must never reach the renderer.
  // DATA_MODEL: Settings "determines location" — a cache for other coordinates is another
  // city's weather, so a location change invalidates it (getWeather reports offline, refresh refetches).
  const readCache = (): WeatherCache | null => {
    const parsed = WeatherCacheSchema.safeParse(deps.cache.get())
    if (!parsed.success) return null
    const { latitude, longitude } = deps.location()
    if (parsed.data.latitude !== latitude || parsed.data.longitude !== longitude) return null
    return parsed.data
  }

  // One HTTP attempt. Returns null on timeout, network error, non-200, invalid JSON
  // or a payload that fails zod — the caller turns null into stale/offline, never partial data.
  const fetchCurrent = async (): Promise<WeatherCache | null> => {
    const { latitude, longitude } = deps.location()
    const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&current=${CURRENT_FIELDS}&timezone=auto`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await deps.fetch(url, { signal: controller.signal })
      if (!res.ok) return null
      const parsed = OpenMeteoCurrentSchema.safeParse(await res.json())
      if (!parsed.success) return null
      const current = parsed.data.current
      return {
        latitude,
        longitude,
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        weatherCode: current.weather_code,
        humidity: current.relative_humidity_2m,
        updatedAt: deps.now(),
      }
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  const getWeather = (): WeatherResult => {
    const data = readCache()
    return { data, status: deriveStatus(data, deps.now()) }
  }

  const refreshWeather = async (): Promise<WeatherResult> => {
    const cached = readCache()
    // Within the 30-minute window the cache is served as-is (D-016); no needless requests.
    if (deriveStatus(cached, deps.now()) === 'fresh') return { data: cached, status: 'fresh' }

    let fresh = await fetchCurrent()
    if (!fresh) {
      await deps.sleep(BACKOFF_MS) // D-016: 1 retry, 1 s backoff
      fresh = await fetchCurrent()
    }
    if (fresh) {
      deps.cache.set(fresh)
      return { data: fresh, status: 'fresh' }
    }
    // FR-007: keep showing the cached value while it is < 24 h old, otherwise offline.
    return { data: cached, status: deriveStatus(cached, deps.now()) }
  }

  return { getWeather, refreshWeather }
}
