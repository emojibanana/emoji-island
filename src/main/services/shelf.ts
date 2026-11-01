// T-022 / D-012: Shelf copy service — stream-copy to userData/shelf with validation.
// Main validates path (lstat, realpath, reject symlinks/dirs), checks capacity,
// sanitizes filename, stream-copies to temp, atomic rename. No path logging.

import { lstat, realpath, unlink, rename } from 'fs/promises'
import { createReadStream, createWriteStream, mkdirSync, existsSync } from 'fs'
import { createHash, randomUUID } from 'crypto'
import { join, extname, basename } from 'path'
import { app, shell, clipboard } from 'electron'
import type { ShelfItemMetadata } from '../../shared/types'
import {
  sanitizeFilename,
  validatePathLength,
  canAddItem,
  resolveUniqueFilename,
} from './sanitizer'
import type { AppStore } from './store'

const shelfDir = () => join(app.getPath('userData'), 'shelf')

function ensureShelfDir(): void {
  const dir = shelfDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function mimeFromExt(ext: string): string {
  const m: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
    '.7z': 'application/x-7z-compressed',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
  }
  return m[ext.toLowerCase()] || 'application/octet-stream'
}

function hashPath(p: string): string {
  return createHash('sha256').update(p).digest('hex').slice(0, 16)
}

type Result<T> = { ok: true; data: T } | { ok: false; code: string; message: string }

export async function addFromDrop(
  store: AppStore,
  sourcePath: string
): Promise<Result<ShelfItemMetadata>> {
  try {
    // 1. Validate: lstat + realpath, reject symlinks/dirs per D-012
    const stats = await lstat(sourcePath)

    if (!stats.isFile()) {
      return { ok: false, code: 'PATH_INVALID', message: 'Not a file' }
    }

    if (stats.isSymbolicLink()) {
      return { ok: false, code: 'PATH_INVALID', message: 'Symlinks rejected' }
    }

    const realPath = await realpath(sourcePath)
    if (realPath !== sourcePath) {
      return { ok: false, code: 'PATH_INVALID', message: 'Junctions rejected' }
    }

    // 2. Check capacity (50 items, 500 MB total, 100 MB per file)
    const currentItems = store.listShelf()
    const fileSize = stats.size
    const cap = canAddItem(currentItems, fileSize)

    if (!cap.ok) {
      const msg = {
        ITEM_LIMIT: 'Shelf full (50 items)',
        FILE_SIZE_LIMIT: 'File exceeds 100 MB',
        TOTAL_SIZE_LIMIT: 'Total exceeds 500 MB',
      }[cap.reason!]
      return {
        ok: false,
        code: cap.reason === 'FILE_SIZE_LIMIT' ? 'FILE_TOO_LARGE' : 'VALIDATION_ERROR',
        message: msg,
      }
    }

    // 3. Sanitize + resolve unique filename
    ensureShelfDir()
    const originalName = basename(sourcePath)
    const sanitized = sanitizeFilename(originalName)
    const existing = currentItems.map((i) => i.storedFileName)
    const storedFileName = resolveUniqueFilename(sanitized, existing)

    // 4. Check path length (max 240)
    if (!validatePathLength(shelfDir(), storedFileName)) {
      return { ok: false, code: 'PATH_INVALID', message: 'Path length > 240' }
    }

    // 5. Stream-copy to temp, atomic rename
    const destPath = join(shelfDir(), storedFileName)
    const tempPath = `${destPath}.tmp`

    await new Promise<void>((resolve, reject) => {
      const rd = createReadStream(sourcePath)
      const wr = createWriteStream(tempPath)
      rd.on('error', reject)
      wr.on('error', reject)
      wr.on('finish', () => resolve())
      rd.pipe(wr)
    })

    await rename(tempPath, destPath)

    // 6. Create metadata and store
    const item: ShelfItemMetadata = {
      id: randomUUID(),
      originalName,
      storedFileName,
      relativePath: storedFileName,
      mimeType: mimeFromExt(extname(originalName)),
      sizeBytes: fileSize,
      createdAt: Date.now(),
      sourcePathHash: hashPath(sourcePath),
    }

    store.addShelf(item)

    return { ok: true, data: item }
  } catch (err) {
    // Clean up temp file if exists
    try {
      const temp = join(shelfDir(), `${basename(sourcePath)}.tmp`)
      await unlink(temp).catch(() => {
        // Ignore cleanup errors
      })
    } catch {
      // Ignore cleanup errors
    }

    if ((err as NodeJS.ErrnoException).code === 'EACCES') {
      return { ok: false, code: 'PERMISSION_DENIED', message: 'Access denied' }
    }

    return { ok: false, code: 'STORAGE_ERROR', message: 'Copy failed' }
  }
}

export function listItems(store: AppStore): ShelfItemMetadata[] {
  return store.listShelf()
}

export async function removeItem(store: AppStore, id: string): Promise<Result<void>> {
  try {
    const items = store.listShelf()
    const item = items.find((i) => i.id === id)

    if (!item) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'Item not found' }
    }

    const filePath = join(shelfDir(), item.storedFileName)
    await unlink(filePath).catch((err) => {
      // File already gone? Still remove from store
      if (err.code !== 'ENOENT') throw err
    })
    store.removeShelf(id)

    return { ok: true, data: undefined }
  } catch {
    return { ok: false, code: 'STORAGE_ERROR', message: 'Remove failed' }
  }
}

export async function revealItem(store: AppStore, id: string): Promise<Result<void>> {
  const items = store.listShelf()
  const item = items.find((i) => i.id === id)

  if (!item) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Item not found' }
  }

  const filePath = join(shelfDir(), item.storedFileName)
  shell.showItemInFolder(filePath)

  return { ok: true, data: undefined }
}

export async function copyItemPath(store: AppStore, id: string): Promise<Result<void>> {
  const items = store.listShelf()
  const item = items.find((i) => i.id === id)

  if (!item) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Item not found' }
  }

  const filePath = join(shelfDir(), item.storedFileName)
  clipboard.writeText(filePath)

  return { ok: true, data: undefined }
}
