import { describe, it, expect } from 'vitest'
import {
  sanitizeFilename,
  validatePathLength,
  canAddItem,
  resolveUniqueFilename,
} from './sanitizer'
import type { ShelfItemMetadata } from '../../shared/types'

describe('sanitizeFilename', () => {
  it('removes illegal characters', () => {
    expect(sanitizeFilename('file<name>.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file>name.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file:name.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file"name.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file/name.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file\\name.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file|name.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file?name.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file*name.txt')).toBe('filename.txt')
  })

  it('trims trailing dots and spaces', () => {
    expect(sanitizeFilename('filename.txt...')).toBe('filename.txt')
    expect(sanitizeFilename('filename.txt   ')).toBe('filename.txt')
    expect(sanitizeFilename('filename.txt. . ')).toBe('filename.txt')
  })

  it('prefixes reserved names with underscore', () => {
    expect(sanitizeFilename('CON')).toBe('_CON')
    expect(sanitizeFilename('PRN.txt')).toBe('_PRN.txt')
    expect(sanitizeFilename('AUX.log')).toBe('_AUX.log')
    expect(sanitizeFilename('NUL.dat')).toBe('_NUL.dat')
    expect(sanitizeFilename('COM1')).toBe('_COM1')
    expect(sanitizeFilename('COM5.bin')).toBe('_COM5.bin')
    expect(sanitizeFilename('COM9.txt')).toBe('_COM9.txt')
    expect(sanitizeFilename('LPT1')).toBe('_LPT1')
    expect(sanitizeFilename('LPT5.doc')).toBe('_LPT5.doc')
    expect(sanitizeFilename('LPT9.pdf')).toBe('_LPT9.pdf')
  })

  it('handles reserved names case-insensitively', () => {
    expect(sanitizeFilename('con.txt')).toBe('_con.txt')
    expect(sanitizeFilename('Con.txt')).toBe('_Con.txt')
    expect(sanitizeFilename('cOm1.dat')).toBe('_cOm1.dat')
  })

  it('returns "file" for empty string after sanitization', () => {
    expect(sanitizeFilename('<<<')).toBe('file')
    expect(sanitizeFilename('...')).toBe('file')
    expect(sanitizeFilename('   ')).toBe('file')
  })

  it('removes Windows C0 control characters', () => {
    expect(sanitizeFilename('file\u0000name.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file\tname.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file\nname.txt')).toBe('filename.txt')
    expect(sanitizeFilename('file\rname.txt')).toBe('filename.txt')
  })

  it('preserves valid filenames', () => {
    expect(sanitizeFilename('document.pdf')).toBe('document.pdf')
    expect(sanitizeFilename('image_2024.png')).toBe('image_2024.png')
    expect(sanitizeFilename('my-file (1).txt')).toBe('my-file (1).txt')
  })
})

describe('validatePathLength', () => {
  it('accepts paths <= 240 characters', () => {
    const basePath = 'C:\\Users\\User\\AppData\\Roaming\\emoji-island\\shelf'
    expect(validatePathLength(basePath, 'short.txt')).toBe(true)
    
    // base path = 48 chars, 240 chars exactly: 48 + 1 + 191 = 240
    const longFilename = 'a'.repeat(191)
    expect(validatePathLength(basePath, longFilename)).toBe(true)
  })

  it('rejects paths > 240 characters', () => {
    const basePath = 'C:\\Users\\User\\AppData\\Roaming\\emoji-island\\shelf'
    // 241 chars: base 48 + backslash 1 + filename 192 = 241
    const tooLongFilename = 'a'.repeat(192)
    expect(validatePathLength(basePath, tooLongFilename)).toBe(false)
  })

  it('rejects extremely long paths', () => {
    const basePath = 'C:\\Users\\User\\AppData\\Roaming\\emoji-island\\shelf'
    const extremeFilename = 'x'.repeat(500)
    expect(validatePathLength(basePath, extremeFilename)).toBe(false)
  })
})

describe('canAddItem', () => {
  const mockItem = (sizeBytes: number): ShelfItemMetadata => ({
    id: crypto.randomUUID(),
    originalName: 'test.txt',
    storedFileName: 'test.txt',
    relativePath: 'test.txt',
    mimeType: 'text/plain',
    sizeBytes,
    createdAt: Date.now(),
    sourcePathHash: 'abc123',
  })

  it('accepts a file when shelf is empty', () => {
    const result = canAddItem([], 1024)
    expect(result.ok).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('rejects when shelf has 50 items', () => {
    const items = Array.from({ length: 50 }, () => mockItem(1024))
    const result = canAddItem(items, 1024)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('ITEM_LIMIT')
  })

  it('rejects a file larger than 100 MB', () => {
    const result = canAddItem([], 101 * 1024 * 1024)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('FILE_SIZE_LIMIT')
  })

  it('accepts a file exactly 100 MB', () => {
    const result = canAddItem([], 100 * 1024 * 1024)
    expect(result.ok).toBe(true)
  })

  it('rejects when total size would exceed 500 MB', () => {
    const items = [mockItem(450 * 1024 * 1024)]
    const result = canAddItem(items, 51 * 1024 * 1024)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('TOTAL_SIZE_LIMIT')
  })

  it('accepts when total size reaches exactly 500 MB', () => {
    const items = [mockItem(400 * 1024 * 1024)]
    const result = canAddItem(items, 100 * 1024 * 1024)
    expect(result.ok).toBe(true)
  })

  it('rejects when adding 1 byte over total limit', () => {
    const items = [mockItem(499 * 1024 * 1024 + 1024 * 1024)]
    const result = canAddItem(items, 1)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('TOTAL_SIZE_LIMIT')
  })
})

describe('resolveUniqueFilename', () => {
  it('returns original name when no duplicates exist', () => {
    expect(resolveUniqueFilename('file.txt', [])).toBe('file.txt')
    expect(resolveUniqueFilename('image.png', ['other.png'])).toBe('image.png')
  })

  it('appends -1 when duplicate exists', () => {
    expect(resolveUniqueFilename('file.txt', ['file.txt'])).toBe('file-1.txt')
  })

  it('increments counter for multiple duplicates', () => {
    const existing = ['file.txt', 'file-1.txt', 'file-2.txt']
    expect(resolveUniqueFilename('file.txt', existing)).toBe('file-3.txt')
  })

  it('handles case-insensitive duplicates', () => {
    expect(resolveUniqueFilename('File.txt', ['file.txt'])).toBe('File-1.txt')
    expect(resolveUniqueFilename('IMAGE.PNG', ['image.png'])).toBe('IMAGE-1.PNG')
  })

  it('preserves extension when appending counter', () => {
    expect(resolveUniqueFilename('doc.pdf', ['doc.pdf'])).toBe('doc-1.pdf')
    expect(resolveUniqueFilename('archive.tar.gz', ['archive.tar.gz'])).toBe(
      'archive.tar-1.gz'
    )
  })

  it('handles files without extension', () => {
    expect(resolveUniqueFilename('README', ['README'])).toBe('README-1')
    expect(resolveUniqueFilename('Makefile', ['Makefile', 'Makefile-1'])).toBe(
      'Makefile-2'
    )
  })
})
