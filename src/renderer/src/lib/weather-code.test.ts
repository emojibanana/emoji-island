import { describe, expect, it } from 'vitest'
import { describeWeatherCode } from './weather-code'

const cases = [
  [0, 'Clear sky', 'sun'], [1, 'Mainly clear', 'sun'], [2, 'Partly cloudy', 'cloud-sun'], [3, 'Overcast', 'cloud'],
  [45, 'Fog', 'cloud-fog'], [48, 'Fog', 'cloud-fog'], [51, 'Light drizzle', 'cloud-drizzle'], [53, 'Drizzle', 'cloud-drizzle'],
  [55, 'Dense drizzle', 'cloud-drizzle'], [56, 'Freezing drizzle', 'cloud-drizzle'], [57, 'Freezing drizzle', 'cloud-drizzle'],
  [61, 'Light rain', 'cloud-rain'], [63, 'Rain', 'cloud-rain'], [65, 'Heavy rain', 'cloud-rain'], [66, 'Freezing rain', 'cloud-rain'],
  [67, 'Freezing rain', 'cloud-rain'], [71, 'Light snow', 'cloud-snow'], [73, 'Snow', 'cloud-snow'], [75, 'Heavy snow', 'cloud-snow'],
  [77, 'Snow grains', 'snowflake'], [80, 'Light showers', 'cloud-rain'], [81, 'Showers', 'cloud-rain'], [82, 'Heavy showers', 'cloud-rain'],
  [85, 'Light snow showers', 'cloud-snow'], [86, 'Heavy snow showers', 'cloud-snow'], [95, 'Thunderstorm', 'cloud-lightning'],
  [96, 'Thunderstorm with hail', 'cloud-hail'], [99, 'Thunderstorm with hail', 'cloud-hail'],
] as const

describe('describeWeatherCode', () => {
  it.each(cases)('maps code %s', (code, label, iconKey) => {
    expect(describeWeatherCode(code)).toEqual({ label, iconKey })
  })

  it.each([-1, 4, 100, 1.5, Number.NaN])('returns Unknown for %s', (code) => {
    expect(describeWeatherCode(code)).toEqual({ label: 'Unknown', iconKey: 'unknown' })
  })
})
