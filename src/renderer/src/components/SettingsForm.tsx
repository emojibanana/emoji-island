import { useEffect, useState } from 'react'
import type { AppSettings } from '../../../shared/types'

type SettingsPatch = Pick<AppSettings, 'locationMode' | 'latitude' | 'longitude' | 'hotkey' | 'reducedMotion'>

const EMPTY_SETTINGS: SettingsPatch = {
  locationMode: 'preset',
  latitude: 0,
  longitude: 0,
  hotkey: '',
  reducedMotion: false,
}

function safeError(code: string | undefined, message: string | undefined): string {
  return code === 'VALIDATION_ERROR' && message === 'Hotkey unavailable'
    ? 'Hotkey unavailable'
    : 'Unable to save settings.'
}

export function SettingsForm(): JSX.Element {
  const [settings, setSettings] = useState<SettingsPatch>(EMPTY_SETTINGS)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void window.islandApi.getSettings().then((response) => {
      if (response.ok && response.data) {
        const { locationMode, latitude, longitude, hotkey, reducedMotion } = response.data
        setSettings({ locationMode, latitude, longitude, hotkey, reducedMotion })
        setStatus('ready')
      } else {
        setError('Unable to load settings.')
        setStatus('error')
      }
    }).catch(() => {
      setError('Unable to load settings.')
      setStatus('error')
    })
  }, [])

  const update = <K extends keyof SettingsPatch>(key: K, value: SettingsPatch[K]): void => {
    setSettings((current) => ({ ...current, [key]: value }))
    setStatus('ready')
    setError(null)
  }

  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setStatus('saving')
    setError(null)
    try {
      const response = await window.islandApi.updateSettings(settings)
      if (response.ok) setStatus('saved')
      else {
        setError(safeError(response.error?.code, response.error?.message))
        setStatus('error')
      }
    } catch {
      setError('Unable to save settings.')
      setStatus('error')
    }
  }

  if (status === 'loading') return <div role="status" aria-live="polite">Loading settings...</div>

  return (
    <form onSubmit={(event) => void save(event)} className="flex flex-col gap-3 overflow-auto" aria-label="Settings">
      <h2 className="text-base font-semibold">Settings</h2>
      <label className="flex flex-col gap-1">Location mode
        <select value={settings.locationMode} onChange={(event) => update('locationMode', event.target.value as SettingsPatch['locationMode'])} className="rounded border border-white/20 bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-[#7C9CFF]">
          <option value="preset">Preset</option>
          <option value="manual">Manual</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">Latitude
        <input type="number" step="any" value={settings.latitude} onChange={(event) => update('latitude', Number(event.target.value))} className="rounded border border-white/20 bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-[#7C9CFF]" />
      </label>
      <label className="flex flex-col gap-1">Longitude
        <input type="number" step="any" value={settings.longitude} onChange={(event) => update('longitude', Number(event.target.value))} className="rounded border border-white/20 bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-[#7C9CFF]" />
      </label>
      <label className="flex flex-col gap-1">Hotkey
        <input value={settings.hotkey} onChange={(event) => update('hotkey', event.target.value)} className="rounded border border-white/20 bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-[#7C9CFF]" />
      </label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={settings.reducedMotion} onChange={(event) => update('reducedMotion', event.target.checked)} /> Reduced motion</label>
      <button type="submit" disabled={status === 'saving'} className="rounded bg-[#7C9CFF] px-3 py-2 font-medium text-black focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60">{status === 'saving' ? 'Saving...' : 'Save settings'}</button>
      {status === 'saved' && <p role="status" aria-live="polite">Settings saved.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
