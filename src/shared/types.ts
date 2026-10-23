// D-015: IPC envelope and shared domain types
// Timestamps are epoch milliseconds everywhere.

// ---------------------------------------------------------------------------
// IPC envelope
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'STORAGE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'MEDIA_UNAVAILABLE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_TYPE'
  | 'PATH_INVALID'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR'

export interface IpcError {
  code: ErrorCode
  message: string
}

export interface IpcEnvelope<T = null> {
  ok: boolean
  data: T | null
  error: IpcError | null
}

// ---------------------------------------------------------------------------
// Weather  (D-016: Open-Meteo, metric, 30-min cache)
// ---------------------------------------------------------------------------

export type WeatherStatus = 'fresh' | 'stale' | 'offline'

export interface WeatherData {
  tempC: number
  weatherCode: number
  windKph: number
  fetchedAt: number   // epoch ms
  status: WeatherStatus
}

// ---------------------------------------------------------------------------
// Media  (D-008: SMTC; variant set after spike)
// ---------------------------------------------------------------------------

export type PlaybackState = 'playing' | 'paused' | 'stopped' | 'unknown'

export interface MediaInfo {
  title: string
  artist: string
  album: string
  artUrl: string | null
  playbackState: PlaybackState
  updatedAt: number   // epoch ms
}

// ---------------------------------------------------------------------------
// Shelf  (D-005: 50 items, 500 MB total, 100 MB per file)
// ---------------------------------------------------------------------------

export type ShelfItemType = 'file' | 'image'

export interface ShelfItem {
  id: string
  type: ShelfItemType
  name: string
  originalPath: string
  storedPath: string
  sizeBytes: number
  addedAt: number     // epoch ms
}

// ---------------------------------------------------------------------------
// AI Chat  (D-006: MockProvider default, v0.1)
// ---------------------------------------------------------------------------

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: number   // epoch ms
}

// ---------------------------------------------------------------------------
// Settings  (D-011: hotkey, D-016: location, D-010: reducedMotion)
// ---------------------------------------------------------------------------

export interface AppSettings {
  hotkey: string                    // default 'Ctrl+Alt+Space'
  locationLat: number               // default -6.2 (Jakarta)
  locationLon: number               // default 106.8
  reducedMotion: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent'
  schemaVersion: number             // for electron-store migration
}