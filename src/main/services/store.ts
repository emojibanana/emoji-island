// T-006: Electron wrappers — electron-store persistence + safeStorage key handling.
// Encryption availability is injected, not a test override flag.
import { app, safeStorage } from 'electron'
import Store from 'electron-store'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, unlinkSync, copyFileSync } from 'fs'
import { parseAndRepair, defaults, type StoreShape } from './store-logic'

export interface CryptoProvider {
  isAvailable(): boolean
  encrypt(plain: string): Buffer
  decrypt(cipher: Buffer): string
}

const realCrypto: CryptoProvider = {
  isAvailable: () => safeStorage.isEncryptionAvailable(),
  encrypt: (p) => safeStorage.encryptString(p),
  decrypt: (c) => safeStorage.decryptString(c),
}

const KEY_FILE = 'ai-key.bin'

export class AppStore {
  private store: Store<StoreShape>
  private memKey: string | null = null
  constructor(private crypto: CryptoProvider = realCrypto) {
    const file = join(app.getPath('userData'), 'config.json')
    if (existsSync(file)) {
      const { data, corrupted } = parseAndRepair(readFileSync(file, 'utf8'))
      if (corrupted) {
        copyFileSync(file, join(app.getPath('userData'), 'config.backup.json'))
        writeFileSync(file, JSON.stringify(data, null, 2))
      }
      this.store = new Store<StoreShape>({ name: 'config', defaults: defaults() })
      if (!corrupted) this.store.set(data as never)
    } else {
      this.store = new Store<StoreShape>({ name: 'config', defaults: defaults() })
    }
  }

  get<K extends keyof StoreShape>(key: K): StoreShape[K] {
    return this.store.get(key)
  }

  set<K extends keyof StoreShape>(key: K, value: StoreShape[K]): void {
    this.store.set(key, value)
  }

  // Shelf: only stores and lists; no eviction here (cap enforcement = T-021/T-022).
  listShelf(): StoreShape['shelfItems'] { return this.store.get('shelfItems') }
  addShelf(item: StoreShape['shelfItems'][number]): void {
    this.store.set('shelfItems', [...this.listShelf(), item])
  }
  removeShelf(id: string): void {
    this.store.set('shelfItems', this.listShelf().filter(i => i.id !== id))
  }

  // Chat: append with cap of 50 (pure logic owns the cap constant).
  pushChat(msg: StoreShape['chatMessages'][number]): void {
    const all = [...this.store.get('chatMessages'), msg]
    this.store.set('chatMessages', all.slice(-50))
  }

  // AI key: NEVER in electron-store. Encrypted file or memory only.
  setApiKey(key: string | null): void {
    const path = join(app.getPath('userData'), KEY_FILE)
    if (key === null) {
      this.memKey = null
      if (existsSync(path)) unlinkSync(path)
      return
    }
    if (this.crypto.isAvailable()) {
      writeFileSync(path, this.crypto.encrypt(key))
      this.memKey = null
    } else {
      this.memKey = key
      if (existsSync(path)) unlinkSync(path)
    }
  }

  getApiKey(): string | null {
    if (this.memKey !== null) return this.memKey
    const path = join(app.getPath('userData'), KEY_FILE)
    if (!existsSync(path)) return null
    try {
      return this.crypto.decrypt(readFileSync(path))
    } catch {
      return null
    }
  }

  isKeyPersisted(): boolean {
    return existsSync(join(app.getPath('userData'), KEY_FILE))
  }
}