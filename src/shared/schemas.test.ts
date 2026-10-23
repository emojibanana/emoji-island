import { describe, it, expect } from 'vitest'
import {
  ErrorCodeSchema,
  IpcErrorSchema,
  ipcEnvelope,
  WeatherDataSchema,
  MediaInfoSchema,
  ShelfItemSchema,
  ShelfAddFromDropSchema,
  ChatMessageSchema,
  ChatSendSchema,
  AppSettingsSchema,
  SettingsPatchSchema,
} from './schemas'

// ---------------------------------------------------------------------------
// IPC envelope
// ---------------------------------------------------------------------------

describe('ErrorCodeSchema', () => {
  it('accepts all valid codes', () => {
    const codes = [
      'VALIDATION_ERROR', 'STORAGE_ERROR', 'NETWORK_ERROR', 'TIMEOUT',
      'PROVIDER_ERROR', 'MEDIA_UNAVAILABLE', 'FILE_TOO_LARGE',
      'UNSUPPORTED_TYPE', 'PATH_INVALID', 'PERMISSION_DENIED', 'UNKNOWN_ERROR',
    ]
    codes.forEach(c => expect(ErrorCodeSchema.parse(c)).toBe(c))
  })

  it('rejects unknown code', () => {
    expect(() => ErrorCodeSchema.parse('NOT_A_CODE')).toThrow()
  })
})

describe('IpcErrorSchema', () => {
  it('parses valid error', () => {
    const result = IpcErrorSchema.parse({ code: 'TIMEOUT', message: 'timed out' })
    expect(result.code).toBe('TIMEOUT')
  })

  it('rejects missing message', () => {
    expect(() => IpcErrorSchema.parse({ code: 'TIMEOUT' })).toThrow()
  })
})

describe('ipcEnvelope', () => {
  const NumEnvelope = ipcEnvelope(ErrorCodeSchema)

  it('parses ok envelope', () => {
    const v = NumEnvelope.parse({ ok: true, data: 'TIMEOUT', error: null })
    expect(v.ok).toBe(true)
  })

  it('parses error envelope', () => {
    const v = NumEnvelope.parse({
      ok: false, data: null,
      error: { code: 'UNKNOWN_ERROR', message: 'oops' },
    })
    expect(v.ok).toBe(false)
    expect(v.error?.code).toBe('UNKNOWN_ERROR')
  })
})

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

const validWeather = {
  tempC: 32.1, weatherCode: 3, windKph: 12.5,
  fetchedAt: 1700000000000, status: 'fresh' as const,
}

describe('WeatherDataSchema', () => {
  it('accepts valid data', () => expect(WeatherDataSchema.parse(validWeather)).toBeTruthy())

  it('rejects negative weatherCode', () => {
    expect(() => WeatherDataSchema.parse({ ...validWeather, weatherCode: -1 })).toThrow()
  })

  it('rejects invalid status', () => {
    expect(() => WeatherDataSchema.parse({ ...validWeather, status: 'loading' })).toThrow()
  })

  it('rejects negative wind', () => {
    expect(() => WeatherDataSchema.parse({ ...validWeather, windKph: -1 })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

const validMedia = {
  title: 'Song', artist: 'Artist', album: 'Album',
  artUrl: null, playbackState: 'playing' as const,
  updatedAt: 1700000000001,
}

describe('MediaInfoSchema', () => {
  it('accepts valid with null artUrl', () => expect(MediaInfoSchema.parse(validMedia)).toBeTruthy())

  it('accepts valid artUrl', () => {
    expect(MediaInfoSchema.parse({ ...validMedia, artUrl: 'https://example.com/art.jpg' })).toBeTruthy()
  })

  it('rejects non-url artUrl', () => {
    expect(() => MediaInfoSchema.parse({ ...validMedia, artUrl: 'not-a-url' })).toThrow()
  })

  it('rejects bad playbackState', () => {
    expect(() => MediaInfoSchema.parse({ ...validMedia, playbackState: 'buffering' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------

const validShelfItem = {
  id: 'abc123', type: 'file' as const, name: 'report.pdf',
  originalPath: 'C:/Users/User/report.pdf',
  storedPath: 'C:/AppData/shelf/report.pdf',
  sizeBytes: 204800, addedAt: 1700000000002,
}

describe('ShelfItemSchema', () => {
  it('accepts valid item', () => expect(ShelfItemSchema.parse(validShelfItem)).toBeTruthy())

  it('rejects empty id', () => {
    expect(() => ShelfItemSchema.parse({ ...validShelfItem, id: '' })).toThrow()
  })

  it('rejects negative sizeBytes', () => {
    expect(() => ShelfItemSchema.parse({ ...validShelfItem, sizeBytes: -1 })).toThrow()
  })

  it('rejects unknown type', () => {
    expect(() => ShelfItemSchema.parse({ ...validShelfItem, type: 'video' })).toThrow()
  })
})

describe('ShelfAddFromDropSchema', () => {
  it('accepts valid path', () => {
    expect(ShelfAddFromDropSchema.parse({ path: 'C:/file.txt' })).toBeTruthy()
  })

  it('rejects empty path', () => {
    expect(() => ShelfAddFromDropSchema.parse({ path: '' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------------------

const validMessage = {
  id: 'msg1', role: 'user' as const,
  content: 'Hello', createdAt: 1700000000003,
}

describe('ChatMessageSchema', () => {
  it('accepts valid message', () => expect(ChatMessageSchema.parse(validMessage)).toBeTruthy())

  it('rejects content over 4000 chars', () => {
    expect(() => ChatMessageSchema.parse({ ...validMessage, content: 'x'.repeat(4001) })).toThrow()
  })

  it('rejects invalid role', () => {
    expect(() => ChatMessageSchema.parse({ ...validMessage, role: 'system' })).toThrow()
  })
})

describe('ChatSendSchema', () => {
  it('accepts valid send', () => expect(ChatSendSchema.parse({ content: 'hi' })).toBeTruthy())
  it('rejects empty content', () => expect(() => ChatSendSchema.parse({ content: '' })).toThrow())
})

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const validSettings = {
  hotkey: 'Ctrl+Alt+Space',
  locationLat: -6.2, locationLon: 106.8,
  reducedMotion: false,
  logLevel: 'info' as const,
  schemaVersion: 1,
}

describe('AppSettingsSchema', () => {
  it('accepts valid settings', () => expect(AppSettingsSchema.parse(validSettings)).toBeTruthy())

  it('rejects lat > 90', () => {
    expect(() => AppSettingsSchema.parse({ ...validSettings, locationLat: 91 })).toThrow()
  })

  it('rejects lon < -180', () => {
    expect(() => AppSettingsSchema.parse({ ...validSettings, locationLon: -181 })).toThrow()
  })

  it('rejects invalid logLevel', () => {
    expect(() => AppSettingsSchema.parse({ ...validSettings, logLevel: 'verbose' })).toThrow()
  })
})

describe('SettingsPatchSchema', () => {
  it('accepts partial patch', () => {
    expect(SettingsPatchSchema.parse({ reducedMotion: true })).toEqual({ reducedMotion: true })
  })

  it('accepts empty patch', () => {
    expect(SettingsPatchSchema.parse({})).toEqual({})
  })

  it('strips unknown schemaVersion field (omitted from patch)', () => {
    const result = SettingsPatchSchema.parse({ schemaVersion: 2 })
    expect(result).not.toHaveProperty('schemaVersion')
  })
})
