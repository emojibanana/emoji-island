// T-023 / UI_SPEC §3 & §5: ShelfList — scrollable list of shelf items.
// Fetches via islandApi.listShelf(); shows loading, empty, error, preview modal states.
import { useState, useEffect, useCallback } from 'react'
import type { ShelfItemMetadata } from '../../../shared/types'
import { ShelfItem } from './ShelfItem'

type LoadState = 'loading' | 'ready' | 'error'

interface PreviewModal {
  dataUrl: string
  mimeType: string
  name: string
}

export function ShelfList(): JSX.Element {
  const [items, setItems] = useState<ShelfItemMetadata[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewModal | null>(null)

  const loadItems = useCallback(async () => {
    setLoadState('loading')
    try {
      const res = await window.islandApi.listShelf()
      if (res.ok && res.data !== null) {
        setItems(res.data)
        setLoadState('ready')
      } else {
        setErrorMsg(res.error?.message ?? 'Failed to load shelf')
        setLoadState('error')
      }
    } catch {
      setErrorMsg('Unexpected error loading shelf')
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const handleReveal = useCallback(async (id: string) => {
    await window.islandApi.revealShelfItem(id)
  }, [])

  const handleCopyPath = useCallback(async (id: string) => {
    await window.islandApi.copyShelfPath(id)
  }, [])

  const handleRemove = useCallback(async (id: string) => {
    const res = await window.islandApi.removeShelfItem(id)
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id))
    }
  }, [])

  const handlePreview = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id)
    const res = await window.islandApi.getShelfPreview(id)
    if (res.ok && res.data) {
      setPreview({ dataUrl: res.data.dataUrl, mimeType: res.data.mimeType, name: item?.originalName ?? '' })
    }
  }, [items])

  if (loadState === 'loading') {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center py-8 text-[12px] text-[#A3A3A3]">
        Loading shelf...
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div role="alert" className="rounded-lg border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-3 py-2 text-[12px] text-[#FF6B6B]">
        Error: {errorMsg}
      </div>
    )
  }

  return (
    <>
      {items.length === 0 ? (
        <p role="status" aria-live="polite" className="py-8 text-center text-[12px] text-[#A3A3A3]">
          No items in shelf. Drag a file over the island to add it.
        </p>
      ) : (
        <ul
          aria-label="Shelf items"
          className="flex flex-col gap-1.5 overflow-y-auto"
        >
          {items.map((item) => (
            <ShelfItem
              key={item.id}
              item={item}
              onReveal={handleReveal}
              onCopyPath={handleCopyPath}
              onRemove={handleRemove}
              onPreview={handlePreview}
            />
          ))}
        </ul>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview: ${preview.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-full max-w-full overflow-hidden rounded-lg border border-white/[0.12] bg-[rgba(15,15,15,0.96)] p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Close preview"
              onClick={() => setPreview(null)}
              className="absolute right-2 top-2 rounded px-2 py-0.5 text-[12px] text-[#A3A3A3] hover:text-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF]"
            >
              ✕
            </button>
            <p className="mb-2 max-w-xs truncate pr-6 text-[12px] text-[#A3A3A3]">{preview.name}</p>
            <img
              src={preview.dataUrl}
              alt={`Preview of ${preview.name}`}
              className="max-h-64 max-w-full rounded object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}
