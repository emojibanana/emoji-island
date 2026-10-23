// D-015: Zod schemas matching types.ts exactly.
// Used by main process to validate all IPC payloads.
import { z } from 'zod'

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

// Convenience: ok envelope with typed data, no error.
export const okEnvelope = <T>(data: z.ZodType<T>): z.ZodEffects<ReturnType<typeof ipcEnvelope<z.ZodType<T>>>> =>
  ipcEnvelope(data).refine((v) => v.ok && v.error === null)

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export const WeatherStatusSchema = z.enum(['fresh', 'stale', 'offline'])

export const WeatherDataSchema = z.object({
  tempC: z.number(),
  weatherCode: z.number().int().nonnegative(),
  windKph: z.number().nonnegative(),
  fetchedAt: z.number().int().positive(),
  status: WeatherStatusSchema,
})

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const PlaybackStateSchema = z.enum(['playing', 'paused', 'stopped', 'unknown'])

export const MediaInfoSchema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  artUrl: z.string().url().nullable(),
  playbackState: PlaybackStateSchema,
  updatedAt: z.number().int().positive(),
})

// ---------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------

export const ShelfItemTypeSchema = z.enum(['file', 'image'])

export const ShelfItemSchema = z.object({
  id: z.string().min(1),
  type: ShelfItemTypeSchema,
  name: z.string().min(1),
  originalPath: z.string().min(1),
  storedPath: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  addedAt: z.number().int().positive(),
})

// IPC payloads
export const ShelfAddFromDropSchema = z.object({
  path: z.string().min(1),
})

// ---------------------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------------------

export const ChatRoleSchema = z.enum(['user', 'assistant'])

export const ChatMessageSchema = z.object({
  id: z.string().min(1),
  role: ChatRoleSchema,
  content: z.string().min(1).max(4000),
  createdAt: z.number().int().positive(),
})

export const ChatSendSchema = z.object({
  content: z.string().min(1).max(4000),
})

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const AppSettingsSchema = z.object({
  hotkey: z.string().min(1),
  locationLat: z.number().gte(-90).lte(90),
  locationLon: z.number().gte(-180).lte(180),
  reducedMotion: z.boolean(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'silent']),
  schemaVersion: z.number().int().positive(),
})

export const SettingsPatchSchema = AppSettingsSchema.partial().omit({ schemaVersion: true })
