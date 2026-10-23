// T-006: PURE store logic — no 'electron' import.
// Defaults, validation (zod), migration by schemaVersion, chat cap 50, corrupt detection.
import { SettingsSchema, WeatherCacheSchema, ShelfItemMetadataSchema, ChatMessageSchema } from '../../shared/schemas'
import type { AppSettings, WeatherCache, ShelfItemMetadata, ChatMessage } from '../../shared/types'

export const CURRENT_SCHEMA_VERSION = 1
export const CHAT_CAP = 50

export interface StoreShape {
  settings: AppSettings
  weatherCache: WeatherCache | null
  shelfItems: ShelfItemMetadata[]
  chatMessages: ChatMessage[]
}

export function defaultSettings(now: number): AppSettings {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    locationMode: 'preset',
    latitude: -6.2,
    longitude: 106.8,
    locationLabel: 'Jakarta',
    hotkey: 'Ctrl+Alt+Space',
    aiEndpoint: null,
    aiModel: null,
    aiKeyPersisted: false,
    reducedMotion: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function defaults(): StoreShape {
  const now = Date.now()
  return { settings: defaultSettings(now), weatherCache: null, shelfItems: [], chatMessages: [] }
}

type MigrateFn = (data: Record<string, unknown>) => Record<string, unknown>
const migrations: Record<number, MigrateFn> = {} // ponytail: add v1->v2 entry when schema bumps

function migrate(data: Record<string, unknown>): Record<string, unknown> {
  const settings = (data.settings ?? {}) as Record<string, unknown>
  const sv = Number(settings.schemaVersion) || 0
  let cur: Record<string, unknown> = data
  for (let v = sv; v < CURRENT_SCHEMA_VERSION; v++) {
    const fn = migrations[v]
    if (fn) cur = fn(cur)
  }
  if (sv < CURRENT_SCHEMA_VERSION) {
    cur = { ...cur, settings: { ...(cur.settings as Record<string, unknown>), schemaVersion: CURRENT_SCHEMA_VERSION } }
  }
  return cur
}

export function validate(raw: unknown): StoreShape | null {
  try {
    const obj = raw as Record<string, unknown>
    const migrated = migrate(obj)
    const s = SettingsSchema.parse(migrated.settings)
    const wc = migrated.weatherCache != null ? WeatherCacheSchema.parse(migrated.weatherCache) : null
    const si = Array.isArray(migrated.shelfItems)
      ? migrated.shelfItems.map(i => ShelfItemMetadataSchema.parse(i))
      : []
    const cm = Array.isArray(migrated.chatMessages)
      ? migrated.chatMessages.slice(-CHAT_CAP).map(m => ChatMessageSchema.parse(m))
      : []
    return { settings: s, weatherCache: wc, shelfItems: si, chatMessages: cm }
  } catch {
    return null
  }
}

export function parseAndRepair(text: string): { data: StoreShape; corrupted: boolean } {
  try {
    const parsed = JSON.parse(text) as unknown
    const valid = validate(parsed)
    if (valid) return { data: valid, corrupted: false }
  } catch { /* fall through */ }
  return { data: defaults(), corrupted: true }
}