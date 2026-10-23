// D-015: Zod schemas matching types.ts exactly.
// Used by main process to validate all IPC payloads.
import { z } from 'zod'
import type {
  AppSettings,
  WeatherCache,
  WeatherResult,
  ShelfItemMetadata,
  ChatMessage,
  MediaState,
} from './types'

// ---------------------------------------------------------------------------
// IPC envelope helpers
// ---------------------------------------------------------------------------

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'STORAGE_ERROR',
  'NETWORK_ERROR',
  'TIMEOUT',
  'PROVIDER_ERROR',
  'MEDIA_UNAVAILABLE',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_TYPE',
  'PATH_INVALID',
  'PERMISSION_DENIED',
  'UNKNOWN_ERROR',
])

export const IpcErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
})

export const ipcEnvelope = <T extends z.ZodTypeAny>(dataSchema: T): z.ZodObject<{
  ok: z.ZodBoolean
  data: z.ZodNullable<T>
  error: z.ZodNullable<typeof IpcErrorSchema>
}> =>
  z.object({
    ok: z.boolean(),
    data: dataSchema.nullable(),
    error: IpcErrorSchema.nullable(),
  })

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const hotkeyRegex = /^(Ctrl|Alt|Shift|Super)(\+(Ctrl|Alt|Shift|Super))*\+([A-Za-z0-9]+|Space)$/

const aiEndpointSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      if (url.startsWith('https://')) return true
      if (url.startsWith('http://')) {
        const host = new URL(url).hostname.replace(/^\[|\]$/g, '')
        return host === 'localhost' || host === '127.0.0.1' || host === '::1'
      }
      return false
    },
    { message: 'aiEndpoint must be https, or http for localhost/127.0.0.1/::1 only' }
  )
  .nullable()

export const SettingsSchema = z.object({
  schemaVersion: z.number().int().positive(),
  locationMode: z.enum(['preset', 'manual']),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  locationLabel: z.string(),
  hotkey: z.string().regex(hotkeyRegex),
  aiEndpoint: aiEndpointSchema,
  aiModel: z.string().nullable(),
  aiKeyPersisted: z.boolean(),
  reducedMotion: z.boolean(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
}) satisfies z.ZodType<AppSettings>

export const SettingsPatchSchema = SettingsSchema.partial()
  .omit({ schemaVersion: true, createdAt: true, updatedAt: true, aiKeyPersisted: true })
  .extend({
    aiKey: z.string().min(1).max(512).optional(),
  })

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export const WeatherStatusSchema = z.enum(['fresh', 'stale', 'offline'])

export const WeatherCacheSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  temperature: z.number(),
  apparentTemperature: z.number(),
  weatherCode: z.number().int(),
  humidity: z.number(),
  updatedAt: z.number().int().positive(),
}) satisfies z.ZodType<WeatherCache>

export const WeatherResultSchema = z.object({
  data: WeatherCacheSchema.nullable(),
  status: WeatherStatusSchema,
}) satisfies z.ZodType<WeatherResult>

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const MediaStateSchema = z.object({
  title: z.string().nullable(),
  artist: z.string().nullable(),
  status: z.enum(['playing', 'paused', 'stopped', 'unavailable']),
  canControl: z.boolean(),
}) satisfies z.ZodType<MediaState>

// ---------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------

export const ShelfItemMetadataSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedFileName: z.string(),
  relativePath: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.number().int().positive(),
  sourcePathHash: z.string(),
}) satisfies z.ZodType<ShelfItemMetadata>

// ---------------------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------------------

export const ChatRoleSchema = z.enum(['user', 'assistant', 'system'])

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: ChatRoleSchema,
  content: z.string().min(1).max(4000),
  createdAt: z.number().int().positive(),
  provider: z.enum(['mock', 'openai-compatible']),
  model: z.string(),
  tokenEstimate: z.number().int().nonnegative().optional(),
}) satisfies z.ZodType<ChatMessage>

// ---------------------------------------------------------------------------
// IPC Input Schemas (20 channels)
// ---------------------------------------------------------------------------

// Window
export const WindowSetModeSchema = z.object({
  mode: z.enum(['collapsed', 'expanded']),
})

export const WindowSetInputActiveSchema = z.object({
  active: z.boolean(),
})

export const WindowSetDragActiveSchema = z.object({
  active: z.boolean(),
})

// Shelf
export const ShelfAddFromDropSchema = z.object({
  sourcePath: z.string().min(3).max(1024),
})

export const ShelfIdSchema = z.object({
  id: z.string().uuid(),
})

// AI
export const AiSendSchema = z.object({
  content: z.string().trim().min(1).max(4000),
})

// Media
export const MediaControlSchema = z.object({
  action: z.enum(['play', 'pause', 'next', 'previous']),
})
