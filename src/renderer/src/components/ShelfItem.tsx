// T-025g / UI_SPEC §3: compact single-row shelf item with icon-only actions.
// No inline menu. Preview icon only for supported images; remove icon always.
// Whole row stays draggable for shelf drag-out (D-014): the renderer sends only
// the item id, never a filesystem path. Drag-out failure is reported to ShelfList
// so rows keep a fixed height.
import type { DragEvent } from 'react'
import { Eye, File, Image, Trash2 } from 'lucide-react'
import type { ShelfItemMetadata } from '../../../shared/types'

export interface ShelfItemProps {
  item: ShelfItemMetadata
  onRemove: (id: string) => void
  onPreview: (id: string) => void
  onDragFailed: () => void
}

function isImage(mimeType: string): boolean {
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mimeType)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function ShelfItem({ item, onRemove, onPreview, onDragFailed }: ShelfItemProps): JSX.Element {
  const image = isImage(item.mimeType)

  const handleDragStart = async (event: DragEvent<HTMLLIElement>): Promise<void> => {
    event.preventDefault()
    try {
      const result = await window.islandApi.dragOutShelfItem(item.id)
      if (!result.ok) onDragFailed()
    } catch {
      onDragFailed()
    }
  }

  const body = (
    <>
      <span className="shrink-0 text-[#A3A3A3]" aria-hidden="true">
        {image ? <Image className="h-4 w-4" /> : <File className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1 truncate" title={item.originalName}>{item.originalName}</span>
      <span className="shrink-0 text-[11px] text-[#A3A3A3]">{formatBytes(item.sizeBytes)}</span>
    </>
  )

  return (
    <li
      className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-[#F5F5F5] cursor-grab hover:bg-white/[0.07] transition-colors motion-reduce:transition-none"
      aria-label={`Shelf item: ${item.originalName}`}
      draggable
      onDragStart={(event) => { void handleDragStart(event) }}
    >
      {image ? (
        <button
          type="button"
          className="-my-2 -ml-3 flex min-w-0 flex-1 items-center gap-2 self-stretch py-2 pl-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7C9CFF]"
          onClick={(event) => { event.stopPropagation(); onPreview(item.id) }}
          onDragStart={(event) => event.stopPropagation()}
        >{body}</button>
      ) : <span className="flex min-w-0 flex-1 items-center gap-2">{body}</span>}

      {image && (
        <button
          type="button"
          aria-label="Preview image"
          className="shrink-0 rounded p-1 text-[#A3A3A3] hover:bg-white/[0.1] hover:text-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF]"
          onClick={(event) => { event.stopPropagation(); onPreview(item.id) }}
          onDragStart={(event) => event.stopPropagation()}
        ><Eye className="h-4 w-4" aria-hidden="true" /></button>
      )}
      <button
        type="button"
        aria-label="Remove item"
        className="shrink-0 rounded p-1 text-[#FF6B6B] hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF]"
        onClick={(event) => { event.stopPropagation(); onRemove(item.id) }}
        onDragStart={(event) => event.stopPropagation()}
      ><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
    </li>
  )
}
