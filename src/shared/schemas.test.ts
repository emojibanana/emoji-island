import { describe, it, expect } from 'vitest'
import {
  ErrorCodeSchema,
  IpcErrorSchema,
  ipcEnvelope,
  SettingsSchema,
  SettingsPatchSchema,
  WeatherCacheSchema,
  WeatherResultSchema,
  MediaStateSchema,
  ShelfItemMetadataSchema,
  ChatMessageSchema,
  WindowSetModeSchema,
  WindowSetInputActiveSchema,
  WindowSetDragActiveSchema,
  ShelfAddFromDropSchema,
  ShelfIdSchema,
  AiSendSchema,
  MediaControlSchema,
} from './schemas'

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

const validSettings = {
  schemaVersion: 1,
  locationMode: 'preset' as const,
  latitude: -6.2,
  longitude: 106.8,
  locationLabel: 'Jakarta',
  hotkey: 'Ctrl+Alt+Space',
  aiEndpoint: 'https://api.example.com/v1',
  aiModel: 'gpt-4',
  aiKeyPersisted: true,
  reducedMotion: false,
  createdAt: 1700000000000,
  updatedAt: 1700000000001,
}

describe('SettingsSchema', () => {
  it('accepts valid settings', () => expect(SettingsSchema.parse(validSettings)).toBeTruthy())
  it('accepts locationMode manual', () => {
    expect(SettingsSchema.parse({ ...validSettings, locationMode: 'manual' })).toBeTruthy()
  })
  it('rejects lat > 90', () => {
    expect(() => SettingsSchema.parse({ ...validSettings, latitude: 91 })).toThrow()
  })
  it('rejects lon < -180', () => {
    expect(() => SettingsSchema.parse({ ...validSettings, longitude: -181 })).toThrow()
  })
  it('rejects invalid hotkey', () => {
    expect(() => SettingsSchema.parse({ ...validSettings, hotkey: 'Ctrl+' })).toThrow()
  })
  it('accepts valid hotkey patterns', () => {
    expect(SettingsSchema.parse({ ...validSettings, hotkey: 'Ctrl+Alt+Space' })).toBeTruthy()
    expect(SettingsSchema.parse({ ...validSettings, hotkey: 'Super+A' })).toBeTruthy()
  })
  it('accepts https aiEndpoint', () => {
    expect(SettingsSchema.parse({ ...validSettings, aiEndpoint: 'https://example.com/v1' })).toBeTruthy()
  })
  it('accepts http localhost aiEndpoint', () => {
    expect(SettingsSchema.parse({ ...validSettings, aiEndpoint: 'http://localhost:20128/v1' })).toBeTruthy()
  })
  it('accepts http 127.0.0.1 aiEndpoint', () => {
    expect(SettingsSchema.parse({ ...validSettings, aiEndpoint: 'http://127.0.0.1:20128/v1' })).toBeTruthy()
  })
  it('accepts http [::1] aiEndpoint', () => {
    expect(SettingsSchema.parse({ ...validSettings, aiEndpoint: 'http://[::1]:20128/v1' })).toBeTruthy()
  })
  it('accepts null aiEndpoint', () => {
    expect(SettingsSchema.parse({ ...validSettings, aiEndpoint: null })).toBeTruthy()
  })
  it('rejects http non-localhost', () => {
    expect(() => SettingsSchema.parse({ ...validSettings, aiEndpoint: 'http://example.com' })).toThrow()
  })
})

describe('SettingsPatchSchema', () => {
  it('accepts partial patch', () => {
    expect(SettingsPatchSchema.parse({ reducedMotion: true })).toEqual({ reducedMotion: true })
  })
  it('accepts empty patch', () => {
    expect(SettingsPatchSchema.parse({})).toEqual({})
  })
  it('omits schemaVersion from patch', () => {
    const patch = { latitude: 10 }
    expect(SettingsPatchSchema.parse(patch)).toEqual({ latitude: 10 })
    expect('schemaVersion' in SettingsPatchSchema.shape).toBe(false)
  })
  it('accepts optional aiKey', () => {
    const result = SettingsPatchSchema.parse({ aiKey: 'sk-test123' })
    expect(result.aiKey).toBe('sk-test123')
  })
  it('rejects aiKey over 512 chars', () => {
    expect(() => SettingsPatchSchema.parse({ aiKey: 'x'.repeat(513) })).toThrow()
  })
})

const validWeatherCache = {
  latitude: -6.2,
  longitude: 106.8,
  temperature: 32.1,
  apparentTemperature: 35.2,
  weatherCode: 3,
  humidity: 65,
  updatedAt: 1700000000000,
}

describe('WeatherCacheSchema', () => {
  it('accepts valid cache', () => expect(WeatherCacheSchema.parse(validWeatherCache)).toBeTruthy())
  it('rejects missing fields', () => {
    const { temperature: _temperature, ...incomplete } = validWeatherCache
    expect(() => WeatherCacheSchema.parse(incomplete)).toThrow()
  })
})

describe('WeatherResultSchema', () => {
  it('accepts fresh status with data', () => {
    expect(WeatherResultSchema.parse({ data: validWeatherCache, status: 'fresh' })).toBeTruthy()
  })
  it('accepts stale status', () => {
    expect(WeatherResultSchema.parse({ data: validWeatherCache, status: 'stale' })).toBeTruthy()
  })
  it('accepts offline with null data', () => {
    expect(WeatherResultSchema.parse({ data: null, status: 'offline' })).toBeTruthy()
  })
  it('rejects invalid status', () => {
    expect(() => WeatherResultSchema.parse({ data: null, status: 'loading' })).toThrow()
  })
})

const validMediaState = {
  title: 'Song Title',
  artist: 'Artist Name',
  status: 'playing' as const,
  canControl: true,
}

describe('MediaStateSchema', () => {
  it('accepts valid state', () => expect(MediaStateSchema.parse(validMediaState)).toBeTruthy())
  it('accepts null title and artist', () => {
    expect(MediaStateSchema.parse({ ...validMediaState, title: null, artist: null })).toBeTruthy()
  })
  it('accepts all status values', () => {
    expect(MediaStateSchema.parse({ ...validMediaState, status: 'paused' })).toBeTruthy()
    expect(MediaStateSchema.parse({ ...validMediaState, status: 'stopped' })).toBeTruthy()
    expect(MediaStateSchema.parse({ ...validMediaState, status: 'unavailable' })).toBeTruthy()
  })
  it('rejects invalid status', () => {
    expect(() => MediaStateSchema.parse({ ...validMediaState, status: 'buffering' })).toThrow()
  })
  it('accepts canControl false', () => {
    expect(MediaStateSchema.parse({ ...validMediaState, canControl: false })).toBeTruthy()
  })
})

const validShelfItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  originalName: 'report.pdf',
  storedFileName: 'abc123.pdf',
  relativePath: 'shelf/abc123.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 204800,
  createdAt: 1700000000002,
  sourcePathHash: 'hash123',
}

describe('ShelfItemMetadataSchema', () => {
  it('accepts valid item', () => expect(ShelfItemMetadataSchema.parse(validShelfItem)).toBeTruthy())
  it('rejects non-uuid id', () => {
    expect(() => ShelfItemMetadataSchema.parse({ ...validShelfItem, id: 'not-a-uuid' })).toThrow()
  })
  it('rejects negative sizeBytes', () => {
    expect(() => ShelfItemMetadataSchema.parse({ ...validShelfItem, sizeBytes: -1 })).toThrow()
  })
  it('rejects missing fields', () => {
    const { originalName: _originalName, ...incomplete } = validShelfItem
    expect(() => ShelfItemMetadataSchema.parse(incomplete)).toThrow()
  })
})

const validMessage = {
  id: 'msg1',
  role: 'user' as const,
  content: 'Hello',
  createdAt: 1700000000003,
  provider: 'openai-compatible' as const,
  model: 'gpt-4',
}

describe('ChatMessageSchema', () => {
  it('accepts valid message', () => expect(ChatMessageSchema.parse(validMessage)).toBeTruthy())
  it('accepts system role', () => {
    expect(ChatMessageSchema.parse({ ...validMessage, role: 'system' })).toBeTruthy()
  })
  it('accepts mock provider', () => {
    expect(ChatMessageSchema.parse({ ...validMessage, provider: 'mock' })).toBeTruthy()
  })
  it('accepts optional tokenEstimate', () => {
    expect(ChatMessageSchema.parse({ ...validMessage, tokenEstimate: 150 })).toBeTruthy()
  })
  it('rejects content over 4000', () => {
    expect(() => ChatMessageSchema.parse({ ...validMessage, content: 'x'.repeat(4001) })).toThrow()
  })
  it('rejects invalid role', () => {
    expect(() => ChatMessageSchema.parse({ ...validMessage, role: 'moderator' })).toThrow()
  })
  it('rejects invalid provider', () => {
    expect(() => ChatMessageSchema.parse({ ...validMessage, provider: 'anthropic' })).toThrow()
  })
})

describe('WindowSetModeSchema', () => {
  it('accepts collapsed', () => {
    expect(WindowSetModeSchema.parse({ mode: 'collapsed' })).toBeTruthy()
  })
  it('accepts expanded', () => {
    expect(WindowSetModeSchema.parse({ mode: 'expanded' })).toBeTruthy()
  })
  it('rejects invalid mode', () => {
    expect(() => WindowSetModeSchema.parse({ mode: 'fullscreen' })).toThrow()
  })
})

describe('WindowSetInputActiveSchema', () => {
  it('accepts true', () => {
    expect(WindowSetInputActiveSchema.parse({ active: true })).toBeTruthy()
  })
  it('accepts false', () => {
    expect(WindowSetInputActiveSchema.parse({ active: false })).toBeTruthy()
  })
  it('rejects non-boolean', () => {
    expect(() => WindowSetInputActiveSchema.parse({ active: 'yes' })).toThrow()
  })
})

describe('WindowSetDragActiveSchema', () => {
  it('accepts true', () => {
    expect(WindowSetDragActiveSchema.parse({ active: true })).toBeTruthy()
  })
  it('accepts false', () => {
    expect(WindowSetDragActiveSchema.parse({ active: false })).toBeTruthy()
  })
  it('rejects non-boolean', () => {
    expect(() => WindowSetDragActiveSchema.parse({ active: 1 })).toThrow()
  })
})

describe('ShelfAddFromDropSchema', () => {
  it('accepts valid path', () => {
    expect(ShelfAddFromDropSchema.parse({ sourcePath: 'C:/file.txt' })).toBeTruthy()
  })
  it('rejects path too short', () => {
    expect(() => ShelfAddFromDropSchema.parse({ sourcePath: 'ab' })).toThrow()
  })
  it('rejects path too long', () => {
    expect(() => ShelfAddFromDropSchema.parse({ sourcePath: 'x'.repeat(1025) })).toThrow()
  })
  it('accepts path at max', () => {
    expect(ShelfAddFromDropSchema.parse({ sourcePath: 'x'.repeat(1024) })).toBeTruthy()
  })
})

describe('ShelfIdSchema', () => {
  it('accepts valid uuid', () => {
    expect(ShelfIdSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' })).toBeTruthy()
  })
  it('rejects non-uuid', () => {
    expect(() => ShelfIdSchema.parse({ id: 'not-a-uuid' })).toThrow()
  })
  it('rejects empty string', () => {
    expect(() => ShelfIdSchema.parse({ id: '' })).toThrow()
  })
})

describe('AiSendSchema', () => {
  it('accepts valid content', () => {
    expect(AiSendSchema.parse({ content: 'hello' })).toBeTruthy()
  })
  it('trims whitespace', () => {
    const result = AiSendSchema.parse({ content: '  hello  ' })
    expect(result.content).toBe('hello')
  })
  it('rejects empty content', () => {
    expect(() => AiSendSchema.parse({ content: '' })).toThrow()
  })
  it('rejects whitespace-only', () => {
    expect(() => AiSendSchema.parse({ content: '   ' })).toThrow()
  })
  it('rejects content over 4000', () => {
    expect(() => AiSendSchema.parse({ content: 'x'.repeat(4001) })).toThrow()
  })
  it('accepts content at max', () => {
    expect(AiSendSchema.parse({ content: 'x'.repeat(4000) })).toBeTruthy()
  })
})

describe('MediaControlSchema', () => {
  it('accepts play', () => {
    expect(MediaControlSchema.parse({ action: 'play' })).toBeTruthy()
  })
  it('accepts pause', () => {
    expect(MediaControlSchema.parse({ action: 'pause' })).toBeTruthy()
  })
  it('accepts next', () => {
    expect(MediaControlSchema.parse({ action: 'next' })).toBeTruthy()
  })
  it('accepts previous', () => {
    expect(MediaControlSchema.parse({ action: 'previous' })).toBeTruthy()
  })
  it('rejects invalid action', () => {
    expect(() => MediaControlSchema.parse({ action: 'stop' })).toThrow()
  })
})

