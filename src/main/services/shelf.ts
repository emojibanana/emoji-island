// T-022 / D-012: Shelf copy service — stream-copy to userData/shelf with validation.
// Main validates path (lstat, realpath, reject symlinks/dirs), checks capacity,
// sanitizes filename, stream-copies to temp, atomic rename. No path logging.

import { lstat, realpath, unlink, rename } from 'fs/promises'
import { createReadStream, createWriteStream, mkdirSync, existsSync, lstatSync, realpathSync } from 'fs'
import { createHash, randomUUID } from 'crypto'
import { join, extname, basename, resolve, sep } from 'path'
import { app } from 'electron'
import type { ShelfItemMetadata, ErrorCode } from '../../shared/types'
import {
  sanitizeFilename,
  validatePathLength,
  canAddItem,
  resolveUniqueFilename,
} from './sanitizer'
import type { AppStore } from './store'

function isInsideShelfDir(root: string, candidate: string): boolean {
  const normalizedRoot = resolve(root)
  const normalizedCandidate = resolve(normalizedRoot, candidate)
  if (normalizedCandidate === normalizedRoot) return false
  return normalizedCandidate.toLowerCase().startsWith(normalizedRoot.toLowerCase() + sep.toLowerCase())
}

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

type Result<T> = { ok: true; data: T } | { ok: false; code: ErrorCode; message: string }

function sameNormalizedPath(a: string, b: string): boolean {
  const na = resolve(a).replace(/\//g, '\\')
  const nb = resolve(b).replace(/\//g, '\\')
  return na.toLowerCase() === nb.toLowerCase()
}

let addQueue = Promise.resolve()

async function addFromDropInner(
  store: AppStore,
  sourcePath: string
): Promise<Result<ShelfItemMetadata>> {
  let tempPath: string | null = null
  let destPath: string | null = null

  try {
    // 1. Validate: lstat + realpath, reject symlinks/dirs per D-012
    const stats = await lstat(sourcePath)

    if (stats.isSymbolicLink()) {
      return { ok: false, code: 'PATH_INVALID', message: 'Symlinks rejected' }
    }

    if (!stats.isFile()) {
      return { ok: false, code: 'PATH_INVALID', message: 'Not a file' }
    }

    const realPath = await realpath(sourcePath)
    if (!sameNormalizedPath(realPath, sourcePath)) {
      return { ok: false, code: 'PATH_INVALID', message: 'Junctions rejected' }
    }

    // 2. T-025h / D-014 amendment: main-side self-drop guard.
    // A shelf file dragged out and dropped back onto the island resolves inside userData/shelf.
    // Never re-copy, never add metadata: return the existing item or reject. No path/name logging.
    const shelfRoot = shelfDir()
    const realRoot = existsSync(shelfRoot) ? realpathSync(shelfRoot) : shelfRoot
    if (isInsideShelfDir(shelfRoot, realPath) || isInsideShelfDir(realRoot, realPath)) {
      const storedName = basename(realPath).toLowerCase()
      const dupes = store.listShelf().filter((i) => i.storedFileName.toLowerCase() === storedName)
      const existing = dupes.length === 1 ? dupes[0] : undefined
      return existing
        ? { ok: true, data: existing }
        : { ok: false, code: 'PATH_INVALID', message: 'Shelf file cannot be re-added' }
    }

    // 3. Check capacity (50 items, 500 MB total, 100 MB per file)
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
    destPath = join(shelfDir(), storedFileName)
    tempPath = `${destPath}.${randomUUID()}.tmp`

    await new Promise<void>((resolve, reject) => {
      const rd = createReadStream(sourcePath)
      const wr = createWriteStream(tempPath!)
      rd.on('error', reject)
      wr.on('error', reject)
      wr.on('finish', () => resolve())
      rd.pipe(wr)
    })

    await rename(tempPath, destPath)
    tempPath = null

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
    destPath = null

    return { ok: true, data: item }
  } catch (err) {
    // Clean up temp or dest file if exists
    if (tempPath) {
      await unlink(tempPath).catch(() => {})
    } else if (destPath) {
      await unlink(destPath).catch(() => {})
    }

    if ((err as NodeJS.ErrnoException).code === 'EACCES') {
      return { ok: false, code: 'PERMISSION_DENIED', message: 'Access denied' }
    }

    return { ok: false, code: 'STORAGE_ERROR', message: 'Copy failed' }
  }
}

export async function addFromDrop(
  store: AppStore,
  sourcePath: string
): Promise<Result<ShelfItemMetadata>> {
  return new Promise((resolve) => {
    addQueue = addQueue.then(() => addFromDropInner(store, sourcePath).then(resolve))
  })
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
    if (!isInsideShelfDir(shelfDir(), item.storedFileName)) {
      return { ok: false, code: 'PATH_INVALID', message: 'Path outside shelf directory' }
    }
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

// T-025f-spike / D-014 amendment: resolve a shelf file for native drag-out.
// Main-only: the resolved absolute path is never returned to the renderer and never logged.
// Synchronous on purpose — webContents.startDrag must run in the same main-process turn as
// the renderer's dragstart gesture (Electron native-file-drag-drop pattern), so no async hops.
export function resolveDragFilePath(store: AppStore, id: string): Result<string> {
  const item = store.listShelf().find((i) => i.id === id)
  if (!item) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Item not found' }
  }

  const root = shelfDir()
  if (!isInsideShelfDir(root, item.relativePath)) {
    return { ok: false, code: 'PATH_INVALID', message: 'Path outside shelf directory' }
  }
  const filePath = join(root, item.relativePath)

  let realPath: string
  try {
    const stats = lstatSync(filePath)
    if (stats.isSymbolicLink()) {
      return { ok: false, code: 'PATH_INVALID', message: 'Symlinks rejected' }
    }
    if (!stats.isFile()) {
      return { ok: false, code: 'PATH_INVALID', message: 'Not a regular file' }
    }
    realPath = realpathSync(filePath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ok: false, code: 'PATH_INVALID', message: 'Shelf file missing' }
    }
    return { ok: false, code: 'STORAGE_ERROR', message: 'Shelf file not accessible' }
  }

  // Junction / symlinked parent: the real path must still land inside the shelf root.
  if (!isInsideShelfDir(realpathSync(root), realPath)) {
    return { ok: false, code: 'PATH_INVALID', message: 'Path outside shelf directory' }
  }

  return { ok: true, data: realPath }
}
