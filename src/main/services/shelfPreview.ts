// T-023 / D-013: shelf:getPreview — read image file from userData/shelf, return data URL.
// Rules: only files registered in shelf metadata; lstat + validate regular file;
// reject symlinks and directories; PNG/JPEG/WebP/GIF only; <= 2 MB.
// Never log file paths or file contents.
import { lstat } from 'fs/promises'
import { readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { ShelfItemMetadata, ErrorCode } from '../../shared/types'
import type { AppStore } from './store'

const PREVIEW_MAX_BYTES = 2 * 1024 * 1024 // 2 MB per D-013

type MimeType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'

const ALLOWED_MIME: Record<string, MimeType> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/webp': 'image/webp',
  'image/gif': 'image/gif',
}

type PreviewResult =
  | { ok: true; data: { dataUrl: string; mimeType: MimeType } }
  | { ok: false; code: ErrorCode; message: string }

export async function getPreview(store: AppStore, id: string): Promise<PreviewResult> {
  // 1. Resolve item from metadata — D-013: only registered files
  const items: ShelfItemMetadata[] = store.listShelf()
  const item = items.find((i) => i.id === id)
  if (!item) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Item not found' }
  }

  // 2. Check mime type before touching disk
  const mimeType = ALLOWED_MIME[item.mimeType]
  if (!mimeType) {
    return { ok: false, code: 'UNSUPPORTED_TYPE', message: 'Preview not available for this file type' }
  }

  // 3. Resolve stored path from metadata (relativePath = storedFileName, per shelf.ts convention)
  const shelfDir = join(app.getPath('userData'), 'shelf')
  const filePath = join(shelfDir, item.relativePath)

  // 4. lstat: validate regular file, reject symlinks/dirs per D-013
  let stats: Awaited<ReturnType<typeof lstat>>
  try {
    stats = await lstat(filePath)
  } catch {
    return { ok: false, code: 'STORAGE_ERROR', message: 'Preview file not accessible' }
  }

  if (stats.isSymbolicLink()) {
    return { ok: false, code: 'PATH_INVALID', message: 'Symlinks rejected' }
  }
  if (!stats.isFile()) {
    return { ok: false, code: 'PATH_INVALID', message: 'Not a regular file' }
  }

  // 5. Enforce 2 MB limit per D-013 / D-005
  if (stats.size > PREVIEW_MAX_BYTES) {
    return { ok: false, code: 'FILE_TOO_LARGE', message: 'Image exceeds 2 MB preview limit' }
  }

  // 6. Read and encode — synchronous is acceptable here: file is already capped at 2 MB
  let buffer: Buffer
  try {
    buffer = readFileSync(filePath)
  } catch {
    return { ok: false, code: 'STORAGE_ERROR', message: 'Failed to read preview file' }
  }

  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
  return { ok: true, data: { dataUrl, mimeType } }
}
