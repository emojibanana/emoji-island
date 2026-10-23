import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const userDataDir = mkdtempSync(join(tmpdir(), 'emoji-store-'))
vi.mock('electron', () => ({
  app: { getPath: (k: string) => k === 'userData' ? userDataDir : userDataDir },
  safeStorage: { isEncryptionAvailable: () => true, encryptString: (s: string) => Buffer.from(`enc:${s}`), decryptString: (b: Buffer) => b.toString().replace(/^enc:/, '') },
}))

// Import AFTER mock so electron resolves to the stub.
const { AppStore } = await import('./store')

afterEach(() => {
  for (const f of ['config.json', 'config.backup.json', 'ai-key.bin']) {
    const p = join(userDataDir, f)
    if (existsSync(p)) rmSync(p)
  }
})

describe('AppStore wrappers', () => {
  it('writes encrypted key file when crypto available', () => {
    const s = new AppStore()
    s.setApiKey('sk-test')
    const path = join(userDataDir, 'ai-key.bin')
    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path, 'utf8')).toContain('enc:')
    expect(s.getApiKey()).toBe('sk-test')
    expect(s.isKeyPersisted()).toBe(true)
  })

  it('memory fallback writes no file and reports not persisted', () => {
    const noopCrypto = { isAvailable: () => false, encrypt: (p: string) => Buffer.from(p), decrypt: (c: Buffer) => c.toString() }
    const s = new AppStore(noopCrypto)
    s.setApiKey('sk-mem')
    expect(existsSync(join(userDataDir, 'ai-key.bin'))).toBe(false)
    expect(s.getApiKey()).toBe('sk-mem')
    expect(s.isKeyPersisted()).toBe(false)
  })

  it('setApiKey(null) deletes the file', () => {
    const s = new AppStore()
    s.setApiKey('sk-x')
    s.setApiKey(null)
    expect(existsSync(join(userDataDir, 'ai-key.bin'))).toBe(false)
    expect(s.getApiKey()).toBeNull()
  })

  it('backup file content equals original corrupt file', () => {
    const cfgPath = join(userDataDir, 'config.json')
    const junk = '{not valid json'
    writeFileSync(cfgPath, junk)
    new AppStore()
    const backup = readFileSync(join(userDataDir, 'config.backup.json'), 'utf8')
    expect(backup).toBe(junk)
  })

  it('aiKeyPersisted reflects storage state', () => {
    const s = new AppStore()
    expect(s.isKeyPersisted()).toBe(false)
    s.setApiKey('abc')
    expect(s.isKeyPersisted()).toBe(true)
  })
})