import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Snowflake,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import type { WeatherResult } from '@shared/types'
import { describeWeatherCode, type WeatherIconKey } from '../lib/weather-code'

const icons: Record<WeatherIconKey, LucideIcon> = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  'cloud-fog': CloudFog,
  'cloud-drizzle': CloudDrizzle,
  'cloud-rain': CloudRain,
  'cloud-snow': CloudSnow,
  snowflake: Snowflake,
  'cloud-lightning': CloudLightning,
  'cloud-hail': CloudHail,
  unknown: Cloud,
}

export interface WeatherCardProps {
  result: WeatherResult | null
  loading: boolean
  error: string | null
}

export function WeatherCard({ result, loading, error }: WeatherCardProps): JSX.Element {
  if (loading) {
    return <div role="status">Loading weather</div>
  }

  if (error) {
    return <div role="status">Error: {error}</div>
  }

  if (!result?.data) {
    return (
      <div className="flex items-center gap-2">
        <span role="status">Weather unavailable (offline)</span>
        <span className="rounded bg-[#A3A3A3]/20 px-1.5 py-0.5 text-[10px] text-[#A3A3A3]">
          Offline
        </span>
      </div>
    )
  }

  const { data, status } = result
  const { label, iconKey } = describeWeatherCode(data.weatherCode)
  const Icon = icons[iconKey] ?? Cloud

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-6 w-6" />
        <span className="text-[20px] font-medium">{Math.round(data.temperature)}°C</span>
        {status === 'stale' && (
          <span className="rounded bg-[#F5B342]/20 px-1.5 py-0.5 text-[10px] text-[#F5B342]">
            Stale
          </span>
        )}
        {status === 'offline' && (
          <span className="rounded bg-[#A3A3A3]/20 px-1.5 py-0.5 text-[10px] text-[#A3A3A3]">
            Offline
          </span>
        )}
      </div>
      <div className="text-[14px]">{label}</div>
      <div className="flex gap-4 text-[12px] text-[#A3A3A3]">
        <span>Feels like {Math.round(data.apparentTemperature)}°C</span>
        <span>Humidity {Math.round(data.humidity)}%</span>
      </div>
    </div>
  )
}
