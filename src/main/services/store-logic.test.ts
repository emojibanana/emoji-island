import { describe, it, expect } from 'vitest'
import { parseAndRepair, defaults, validate, CHAT_CAP, CURRENT_SCHEMA_VERSION } from './store-logic'

describe('store-logic', () => {
  it('returns defaults on empty input', () => {
    const d = defaults()
    expect(d.settings.latitude).toBe(-6.2)
    expect(d.shelfItems).toEqual([])
    expect(d.chatMessages).toEqual([])
  })

  it('rejects invalid latitude', () => {
    const bad = { settings: { ...defaults().settings, latitude: 91 }, weatherCache: null, shelfItems: [], chatMessages: [] }
    expect(validate(bad)).toBeNull()
  })

  it('rejects invalid longitude', () => {
    const bad = { settings: { ...defaults().settings, longitude: -181 }, weatherCache: null, shelfItems: [], chatMessages: [] }
    expect(validate(bad)).toBeNull()
  })

  it('rejects invalid hotkey', () => {
    const bad = { settings: { ...defaults().settings, hotkey: 'Ctrl+' }, weatherCache: null, shelfItems: [], chatMessages: [] }
    expect(validate(bad)).toBeNull()
  })

  it('rejects http://example.com aiEndpoint', () => {
    const bad = { settings: { ...defaults().settings, aiEndpoint: 'http://example.com' }, weatherCache: null, shelfItems: [], chatMessages: [] }
    expect(validate(bad)).toBeNull()
  })

  it('accepts loopback http aiEndpoint', () => {
    const ok = { settings: { ...defaults().settings, aiEndpoint: 'http://localhost:20128/v1' }, weatherCache: null, shelfItems: [], chatMessages: [] }
    expect(validate(ok)?.settings.aiEndpoint).toBe('http://localhost:20128/v1')
  })

  it('corrupt JSON falls back to defaults with corrupted=true', () => {
    const r = parseAndRepair('{not json')
    expect(r.corrupted).toBe(true)
    expect(r.data.settings.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('invalid schema falls back to defaults with corrupted=true', () => {
    const r = parseAndRepair(JSON.stringify({ garbage: true }))
    expect(r.corrupted).toBe(true)
    expect(r.data.shelfItems).toEqual([])
  })

  it('caps chat messages at 50 keeping the latest', () => {
    const base = defaults()
    const msgs = Array.from({ length: 70 }, (_, i) => ({
      id: `${i}`, role: 'user', content: `m${i}`, createdAt: i, provider: 'mock', model: 'mock-v1',
    }))
    const r = validate({ ...base, chatMessages: msgs })
    expect(r?.chatMessages.length).toBe(CHAT_CAP)
    expect(r?.chatMessages[CHAT_CAP - 1].content).toBe('m69')
  })

  it('migration stub: missing schemaVersion treated as v0 and bumped to current', () => {
    const legacy = { ...defaults(), settings: { ...defaults().settings, schemaVersion: undefined } }
    const r = validate(legacy)
    expect(r?.settings.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })
})