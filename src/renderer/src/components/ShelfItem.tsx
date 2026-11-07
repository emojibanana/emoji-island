// T-023 / UI_SPEC §3: ShelfItem — displays one shelf entry with action menu.
// Actions: Reveal in Explorer, Copy Path, Remove, Preview (image only).
// Accessible: keyboard-reachable, aria labels, visible focus rings, no color-only indicators.
import { useState } from 'react'
import { FolderOpen, Copy, Trash2, Eye, File, Image } from 'lucide-react'
import type { ShelfItemMetadata } from '../../../shared/types'

export interface ShelfItemProps {
  item: ShelfItemMetadata
  onReveal: (id: string) => void
  onCopyPath: (id: string) => void
  onRemove: (id: string) => void
  onPreview: (id: string) => void
}

function isImage(mimeType: string): boolean {
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mimeType)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function ShelfItem({ item, onReveal, onCopyPath, onRemove, onPreview }: ShelfItemProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const image = isImage(item.mimeType)

  return (
    <li
      className="rounded-lg border border-white/[0.08] bg-white/[0.04] text-[13px] text-[#F5F5F5] overflow-hidden"
      aria-label={`Shelf item: ${item.originalName}`}
    >
      {/* Main item row */}
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.07] transition-colors motion-reduce:transition-none">
        {/* File type icon */}
        <span className="shrink-0 text-[#A3A3A3]" aria-hidden="true">
          {image ? <Image className="h-4 w-4" /> : <File className="h-4 w-4" />}
        </span>

        {/* Name + size */}
        <span className="min-w-0 flex-1 truncate" title={item.originalName}>
          {item.originalName}
        </span>
        <span className="shrink-0 text-[11px] text-[#A3A3A3]">{formatBytes(item.sizeBytes)}</span>

        {/* Action menu toggle */}
        <button
          aria-label={`Actions for ${item.originalName}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="shrink-0 rounded px-1.5 py-0.5 text-[#A3A3A3] hover:bg-white/[0.1] hover:text-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF]"
        >
          •••
        </button>
      </div>

      {/* Inline action panel */}
      {menuOpen && (
        <div className="border-t border-white/[0.08] bg-white/[0.02]">
          <ul
            role="menu"
            aria-label={`Actions for ${item.originalName}`}
            className="py-1"
          >
            <ActionItem
              icon={<FolderOpen className="h-3.5 w-3.5" />}
              label="Reveal in Explorer"
              onClick={() => { onReveal(item.id); setMenuOpen(false) }}
            />
            <ActionItem
              icon={<Copy className="h-3.5 w-3.5" />}
              label="Copy Path"
              onClick={() => { onCopyPath(item.id); setMenuOpen(false) }}
            />
            {image && (
              <ActionItem
                icon={<Eye className="h-3.5 w-3.5" />}
                label="Preview"
                onClick={() => { onPreview(item.id); setMenuOpen(false) }}
              />
            )}
            <li role="separator" className="my-1 border-t border-white/[0.08]" />
            <ActionItem
              icon={<Trash2 className="h-3.5 w-3.5 text-[#FF6B6B]" />}
              label="Remove"
              className="text-[#FF6B6B]"
              onClick={() => { onRemove(item.id); setMenuOpen(false) }}
            />
          </ul>
        </div>
      )}
    </li>
  )
}

interface ActionItemProps {
  icon: JSX.Element
  label: string
  onClick: () => void
  className?: string
}

function ActionItem({ icon, label, onClick, className = '' }: ActionItemProps): JSX.Element {
  return (
    <li role="none">
      <button
        role="menuitem"
        onClick={onClick}
        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#F5F5F5] hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7C9CFF] ${className}`}
      >
        {icon}
        {label}
      </button>
    </li>
  )
}
