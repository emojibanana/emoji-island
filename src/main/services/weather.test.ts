// T-014: hermetic tests — the HTTP layer is injected, Open-Meteo is never called.
import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
import {
  BACKOFF_MS,
  TIMEOUT_MS,
  createWeatherService,
  deriveStatus,
  type FetchLike,
  type WeatherDeps,
} from './weather'
import type { WeatherCache } from '../../shared/types'

const NOW = 1_700_000_000_000
const LAT = -6.2
const LON = 106.8

const staleCache: WeatherCache = {
  latitude: LAT,
  longitude: LON,
  temperature: 30.1,
  apparentTemperature: 33.4,
  weatherCode: 3,
  humidity: 70,
  updatedAt: NOW - 60 * 60 * 1000, // 1 h old -> stale
}

const freshCache: WeatherCache = { ...staleCache, updatedAt: NOW - 60 * 1000 }

const dayOldCache: WeatherCache = { ...staleCache, updatedAt: NOW - 24 * 60 * 60 * 1000 - 1 }

const apiBody = {
  current: {
    temperature_2m: 32.4,
    apparent_temperature: 37.6,
    relative_humidity_2m: 56,
    weather_code: 3,
  },
}

const ok = (body: unknown): Response => ({ ok: true, json: async () => body }) as unknown as Response

function jsonThatThrows(): Response {
  return {
    ok: true,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON')
    },
  } as unknown as Response
}

interface Setup {
  service: ReturnType<typeof createWeatherService>
  fetchMock: Mock<FetchLike>
  setSpy: Mock<(cache: WeatherCache) => void>
  sleepSpy: Mock<(ms: number) => Promise<void>>
}

// responses: one entry per attempt (last entry repeats). Error entries reject the fetch.
function setup(
  responses: Array<Response | Error>,
  cached: WeatherCache | null = null,
  location = { latitude: LAT, longitude: LON }
): Setup {
  let call = 0
  const fetchMock = vi.fn<FetchLike>(async () => {
    const next = responses[Math.min(call++, responses.length - 1)]
    if (next instanceof Error) throw next
    return next
  })
  const setSpy = vi.fn<(cache: WeatherCache) => void>()
  const sleepSpy = vi.fn<(ms: number) => Promise<void>>(async () => undefined)
  const deps: WeatherDeps = {
    fetch: fetchMock,
    now: () => NOW,
    sleep: sleepSpy,
    location: () => location,
    cache: { get: () => cached, set: setSpy },
  }
  return { service: createWeatherService(deps), fetchMock, setSpy, sleepSpy }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('deriveStatus (FR-007 / D-016)', () => {
  it('is offline without a cache', () => {
    expect(deriveStatus(null, NOW)).toBe('offline')
  })

  it('is fresh below 30 minutes', () => {
    expect(deriveStatus({ ...staleCache, updatedAt: NOW - 29 * 60 * 1000 }, NOW)).toBe('fresh')
  })

  it('is stale at exactly 30 minutes', () => {
    expect(deriveStatus({ ...staleCache, updatedAt: NOW - 30 * 60 * 1000 }, NOW)).toBe('stale')
  })

  it('is stale at exactly 24 hours and offline one ms later', () => {
    const dayMs = 24 * 60 * 60 * 1000
    expect(deriveStatus({ ...staleCache, updatedAt: NOW - dayMs }, NOW)).toBe('stale')
    expect(deriveStatus({ ...staleCache, updatedAt: NOW - dayMs - 1 }, NOW)).toBe('offline')
  })
})

describe('weather:get', () => {
  it('never fetches and returns the cached value with a derived status', () => {
    const s = setup([ok(apiBody)], staleCache)
    expect(s.service.getWeather()).toEqual({ data: staleCache, status: 'stale' })
    expect(s.fetchMock).not.toHaveBeenCalled()
  })

  it('treats a corrupt cached value as offline', () => {
    const s = setup([ok(apiBody)], { temperature: 'hot' } as unknown as WeatherCache)
    expect(s.service.getWeather()).toEqual({ data: null, status: 'offline' })
  })

  // DATA_MODEL: Settings "determines location" — the cache belongs to one coordinate pair.
  it('ignores a cache recorded for another location', () => {
    const s = setup([ok(apiBody)], freshCache, { latitude: -7.25, longitude: 112.75 }) // Surabaya
    expect(s.service.getWeather()).toEqual({ data: null, status: 'offline' })
    expect(s.fetchMock).not.toHaveBeenCalled()
  })

  // Finding A: `offline` carries no data — a 25 h-old value is not displayable.
  it('drops a cache older than 24 h instead of pairing it with an offline status', () => {
    const s = setup([ok(apiBody)], dayOldCache)
    expect(s.service.getWeather()).toEqual({ data: null, status: 'offline' })
    expect(s.fetchMock).not.toHaveBeenCalled()
  })
})

describe('weather:refresh — happy path', () => {
  it('fetches, maps to WeatherCache and persists it', async () => {
    const s = setup([ok(apiBody)])
    const res = await s.service.refreshWeather()

    expect(res.status).toBe('fresh')
    expect(res.data).toEqual({
      latitude: LAT,
      longitude: LON,
      temperature: 32.4,
      apparentTemperature: 37.6,
      weatherCode: 3,
      humidity: 56,
      updatedAt: NOW,
    })
    expect(s.setSpy).toHaveBeenCalledTimes(1)
    expect(s.sleepSpy).not.toHaveBeenCalled()
  })

  it('builds the documented Open-Meteo URL', async () => {
    const s = setup([ok(apiBody)])
    await s.service.refreshWeather()
    const url = s.fetchMock.mock.calls[0][0]
    expect(url).toContain('https://api.open-meteo.com/v1/forecast')
    expect(url).toContain('latitude=-6.2')
    expect(url).toContain('longitude=106.8')
    expect(url).toContain('timezone=auto')
    expect(url).toContain(
      'current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code'
    )
  })

  it('serves a fresh cache without any request (30-minute window)', async () => {
    const s = setup([ok(apiBody)], freshCache)
    expect(await s.service.refreshWeather()).toEqual({ data: freshCache, status: 'fresh' })
    expect(s.fetchMock).not.toHaveBeenCalled()
    expect(s.setSpy).not.toHaveBeenCalled()
  })

  it('refetches a stale cache recorded for another location and persists the new coordinates', async () => {
    const s = setup([ok(apiBody)], staleCache, { latitude: -7.25, longitude: 112.75 })
    const res = await s.service.refreshWeather()

    expect(s.fetchMock).toHaveBeenCalledTimes(1)
    expect(res.status).toBe('fresh')
    expect(res.data).toEqual(
      expect.objectContaining({ latitude: -7.25, longitude: 112.75, temperature: 32.4 })
    )
    expect(s.setSpy).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ latitude: -7.25, longitude: 112.75 })
    )
  })
})

describe('weather:refresh — failure paths', () => {
  it('retries once after a network error and succeeds', async () => {
    const s = setup([new Error('ECONNRESET'), ok(apiBody)])
    const res = await s.service.refreshWeather()

    expect(s.fetchMock).toHaveBeenCalledTimes(2)
    expect(s.sleepSpy).toHaveBeenCalledExactlyOnceWith(BACKOFF_MS)
    expect(res.status).toBe('fresh')
  })

  it('keeps the stale cache when both attempts fail', async () => {
    const s = setup([new Error('ECONNRESET')], staleCache)
    const res = await s.service.refreshWeather()

    expect(s.fetchMock).toHaveBeenCalledTimes(2)
    expect(s.setSpy).not.toHaveBeenCalled()
    expect(res).toEqual({ data: staleCache, status: 'stale' })
  })

  it('is offline with no data when both attempts fail on a > 24 h cache', async () => {
    const s = setup([new Error('ECONNRESET')], dayOldCache)
    expect(await s.service.refreshWeather()).toEqual({ data: null, status: 'offline' })
    expect(s.fetchMock).toHaveBeenCalledTimes(2)
    expect(s.setSpy).not.toHaveBeenCalled()
  })

  it('is offline when both attempts fail and no cache exists', async () => {
    const s = setup([new Error('offline')])
    expect(await s.service.refreshWeather()).toEqual({ data: null, status: 'offline' })
    expect(s.setSpy).not.toHaveBeenCalled()
  })

  it('rejects a non-200 response', async () => {
    const bad = { ok: false, status: 500, json: async () => ({}) } as unknown as Response
    const s = setup([bad])
    expect(await s.service.refreshWeather()).toEqual({ data: null, status: 'offline' })
    expect(s.fetchMock).toHaveBeenCalledTimes(2)
    expect(s.setSpy).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON', async () => {
    const s = setup([jsonThatThrows()])
    expect(await s.service.refreshWeather()).toEqual({ data: null, status: 'offline' })
    expect(s.setSpy).not.toHaveBeenCalled()
  })

  it('rejects a payload that fails zod validation', async () => {
    const s = setup([ok({ current: { temperature_2m: '32.4' } })], staleCache)
    expect(await s.service.refreshWeather()).toEqual({ data: staleCache, status: 'stale' })
    expect(s.setSpy).not.toHaveBeenCalled()
  })

  it('rejects a payload with no current block', async () => {
    const s = setup([ok({ latitude: LAT, longitude: LON })])
    expect(await s.service.refreshWeather()).toEqual({ data: null, status: 'offline' })
  })

  it('aborts at TIMEOUT_MS, retries once, then falls back', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn<FetchLike>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')))
        })
    )
    const setSpy = vi.fn<(cache: WeatherCache) => void>()
    const service = createWeatherService({
      fetch: fetchMock,
      now: () => NOW,
      sleep: async () => undefined,
      location: () => ({ latitude: LAT, longitude: LON }),
      cache: { get: () => staleCache, set: setSpy },
    })

    const pending = service.refreshWeather()
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    const res = await pending

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(setSpy).not.toHaveBeenCalled()
    expect(res).toEqual({ data: staleCache, status: 'stale' })
  })
})
