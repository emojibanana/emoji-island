// Pure filename sanitization and shelf capacity validation.
// No electron imports; all functions are stateless.

import type { ShelfItemMetadata } from '../../shared/types'

const RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])

const ILLEGAL_CHARS_REGEX = /[<>:"/\\|?*]/g

export interface CapacityCheckResult {
  ok: boolean
  reason?: 'ITEM_LIMIT' | 'TOTAL_SIZE_LIMIT' | 'FILE_SIZE_LIMIT'
}

/**
 * Sanitize a filename by removing/replacing illegal characters and reserved names.
 * Does NOT handle duplicate resolution or path length validation.
 */
export function sanitizeFilename(name: string): string {
  // Strip illegal characters
  let sanitized = name.replace(ILLEGAL_CHARS_REGEX, '')

  // Trim trailing dots and spaces
  sanitized = sanitized.replace(/[. ]+$/, '')

  // Check if the base name (without extension) is reserved
  const dotIndex = sanitized.lastIndexOf('.')
  const baseName = dotIndex > 0 ? sanitized.slice(0, dotIndex) : sanitized
  const extension = dotIndex > 0 ? sanitized.slice(dotIndex) : ''

  if (RESERVED_NAMES.has(baseName.toUpperCase())) {
    return `_${baseName}${extension}`
  }

  // If sanitization left an empty string, use a fallback
  if (sanitized.length === 0) {
    return 'file'
  }

  return sanitized
}

/**
 * Check if the full path (base + filename) exceeds 240 characters.
 */
export function validatePathLength(basePath: string, fileName: string): boolean {
  const fullPath = `${basePath}\\${fileName}`
  return fullPath.length <= 240
}

/**
 * Check if a new file can be added given current shelf items and file size.
 * Limits: max 50 items, max 500 MB total, max 100 MB per file.
 */
export function canAddItem(
  currentItems: ShelfItemMetadata[],
  newFileSizeBytes: number
): CapacityCheckResult {
  const MAX_ITEMS = 50
  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
  const MAX_TOTAL_SIZE = 500 * 1024 * 1024 // 500 MB

  // Check item count
  if (currentItems.length >= MAX_ITEMS) {
    return { ok: false, reason: 'ITEM_LIMIT' }
  }

  // Check per-file size
  if (newFileSizeBytes > MAX_FILE_SIZE) {
    return { ok: false, reason: 'FILE_SIZE_LIMIT' }
  }

  // Check total size
  const currentTotalSize = currentItems.reduce((sum, item) => sum + item.sizeBytes, 0)
  if (currentTotalSize + newFileSizeBytes > MAX_TOTAL_SIZE) {
    return { ok: false, reason: 'TOTAL_SIZE_LIMIT' }
  }

  return { ok: true }
}

/**
 * Generate a unique filename by appending a counter if a duplicate exists.
 */
export function resolveUniqueFilename(
  desiredName: string,
  existingNames: string[]
): string {
  const existingSet = new Set(existingNames.map((n) => n.toLowerCase()))

  if (!existingSet.has(desiredName.toLowerCase())) {
    return desiredName
  }

  const dotIndex = desiredName.lastIndexOf('.')
  const baseName = dotIndex > 0 ? desiredName.slice(0, dotIndex) : desiredName
  const extension = dotIndex > 0 ? desiredName.slice(dotIndex) : ''

  let counter = 1
  let candidate = `${baseName}-${counter}${extension}`

  while (existingSet.has(candidate.toLowerCase())) {
    counter++
    candidate = `${baseName}-${counter}${extension}`
  }

  return candidate
}
