export type WeatherIconKey =
  | 'sun'
  | 'cloud-sun'
  | 'cloud'
  | 'cloud-fog'
  | 'cloud-drizzle'
  | 'cloud-rain'
  | 'cloud-snow'
  | 'snowflake'
  | 'cloud-lightning'
  | 'cloud-hail'
  | 'unknown'

export interface WeatherDescription {
  label: string
  iconKey: WeatherIconKey
}

const descriptions: Readonly<Record<number, WeatherDescription>> = {
  0: { label: 'Clear sky', iconKey: 'sun' },
  1: { label: 'Mainly clear', iconKey: 'sun' },
  2: { label: 'Partly cloudy', iconKey: 'cloud-sun' },
  3: { label: 'Overcast', iconKey: 'cloud' },
  45: { label: 'Fog', iconKey: 'cloud-fog' },
  48: { label: 'Fog', iconKey: 'cloud-fog' },
  51: { label: 'Light drizzle', iconKey: 'cloud-drizzle' },
  53: { label: 'Drizzle', iconKey: 'cloud-drizzle' },
  55: { label: 'Dense drizzle', iconKey: 'cloud-drizzle' },
  56: { label: 'Freezing drizzle', iconKey: 'cloud-drizzle' },
  57: { label: 'Freezing drizzle', iconKey: 'cloud-drizzle' },
  61: { label: 'Light rain', iconKey: 'cloud-rain' },
  63: { label: 'Rain', iconKey: 'cloud-rain' },
  65: { label: 'Heavy rain', iconKey: 'cloud-rain' },
  66: { label: 'Freezing rain', iconKey: 'cloud-rain' },
  67: { label: 'Freezing rain', iconKey: 'cloud-rain' },
  71: { label: 'Light snow', iconKey: 'cloud-snow' },
  73: { label: 'Snow', iconKey: 'cloud-snow' },
  75: { label: 'Heavy snow', iconKey: 'cloud-snow' },
  77: { label: 'Snow grains', iconKey: 'snowflake' },
  80: { label: 'Light showers', iconKey: 'cloud-rain' },
  81: { label: 'Showers', iconKey: 'cloud-rain' },
  82: { label: 'Heavy showers', iconKey: 'cloud-rain' },
  85: { label: 'Light snow showers', iconKey: 'cloud-snow' },
  86: { label: 'Heavy snow showers', iconKey: 'cloud-snow' },
  95: { label: 'Thunderstorm', iconKey: 'cloud-lightning' },
  96: { label: 'Thunderstorm with hail', iconKey: 'cloud-hail' },
  99: { label: 'Thunderstorm with hail', iconKey: 'cloud-hail' },
}

export function describeWeatherCode(code: number): WeatherDescription {
  return Number.isInteger(code)
    ? descriptions[code] ?? { label: 'Unknown', iconKey: 'unknown' }
    : { label: 'Unknown', iconKey: 'unknown' }
}
