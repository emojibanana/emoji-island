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
// Settings
// ---------------------------------------------------------------------------

export interface AppSettings {
  schemaVersion: number
  locationMode: 'preset' | 'manual'
  latitude: number
  longitude: number
  locationLabel: string
  hotkey: string
  aiEndpoint: string | null
  aiModel: string | null
  aiKeyPersisted: boolean
  reducedMotion: boolean
  createdAt: number
  updatedAt: number
}

export interface SettingsView extends AppSettings {
  aiKeyPresent: boolean
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export type WeatherStatus = 'fresh' | 'stale' | 'offline'

export interface WeatherCache {
  latitude: number
  longitude: number
  temperature: number
  apparentTemperature: number
  weatherCode: number
  humidity: number
  updatedAt: number
}

export interface WeatherResult {
  data: WeatherCache | null
  status: WeatherStatus
}

// ---------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------

export interface ShelfItemMetadata {
  id: string
  originalName: string
  storedFileName: string
  relativePath: string
  mimeType: string
  sizeBytes: number
  createdAt: number
  sourcePathHash: string
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  provider: 'mock' | 'openai-compatible'
  model: string
  tokenEstimate?: number
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface MediaState {
  title: string | null
  artist: string | null
  status: 'playing' | 'paused' | 'stopped' | 'unavailable'
  canControl: boolean
}