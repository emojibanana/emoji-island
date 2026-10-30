// T-020-Lb / D-008 Locked: Media card component.
// Subscribes to media:stateChanged push events from main; never polls IPC.
// Controls disabled when canControl=false or state is unavailable.
// D-008: never logs title/artist/album.
import { useEffect, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react'
import type { MediaState } from '../../../shared/types'

const UNAVAILABLE: MediaState = {
  title: null,
  artist: null,
  status: 'unavailable',
  canControl: false,
}

type ControlAction = 'play' | 'pause' | 'next' | 'previous'

function useMediaState(): MediaState {
  const [state, setState] = useState<MediaState>(UNAVAILABLE)

  useEffect(() => {
    // Fetch current state on mount.
    void window.islandApi.getMediaState().then((env) => {
      if (env.ok && env.data) setState(env.data)
    })

    // Subscribe to push events.
    const unsub = window.islandApi.onMediaStateChanged((s: MediaState) => setState(s))
    return unsub
  }, [])

  return state
}

export function MediaCard(): JSX.Element {
  const state = useMediaState()
  const [cmdError, setCmdError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const unavailable = state.status === 'unavailable'
  const disabled = !state.canControl || pending

  async function handleControl(action: ControlAction): Promise<void> {
    if (disabled) return
    setPending(true)
    setCmdError(null)
    const env = await window.islandApi.controlMedia(action)
    setPending(false)
    if (!env.ok) {
      setCmdError(env.error?.message ?? 'Control failed')
    }
  }

  // Status text — not color-only (UI_SPEC §6).
  function statusLabel(): string {
    if (unavailable) return 'No media playing'
    if (state.status === 'playing') return 'Playing'
    if (state.status === 'paused') return 'Paused'
    if (state.status === 'stopped') return 'Stopped'
    return ''
  }

  return (
    <div
      role="region"
      aria-label="Media"
      className="flex flex-col gap-3 rounded-[8px] border border-white/[0.08] bg-white/[0.04] p-3"
    >
      {/* Track info */}
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[6px] bg-white/[0.08]"
        >
          <Music className="h-5 w-5 text-[#A3A3A3]" />
        </div>
        <div className="min-w-0 flex-1">
          {unavailable ? (
            <p role="status" className="text-[13px] text-[#A3A3A3]">
              Media unavailable
            </p>
          ) : (
            <>
              <p
                className="truncate text-[13px] font-medium text-[#F5F5F5]"
                title={state.title ?? undefined}
              >
                {state.title ?? 'Unknown title'}
              </p>
              <p className="truncate text-[12px] text-[#A3A3A3]">
                {state.artist ?? 'Unknown artist'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <p role="status" className="text-[11px] text-[#A3A3A3]">
        {statusLabel()}
      </p>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Previous"
          disabled={disabled}
          onClick={() => { void handleControl('previous') }}
          className="rounded-[6px] p-1.5 text-[#A3A3A3] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF] enabled:hover:text-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {state.status === 'playing' ? (
          <button
            type="button"
            aria-label="Pause"
            disabled={disabled}
            onClick={() => { void handleControl('pause') }}
            className="rounded-[6px] p-1.5 text-[#F5F5F5] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pause className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Play"
            disabled={disabled}
            onClick={() => { void handleControl('play') }}
            className="rounded-[6px] p-1.5 text-[#F5F5F5] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-5 w-5" />
          </button>
        )}

        <button
          type="button"
          aria-label="Next"
          disabled={disabled}
          onClick={() => { void handleControl('next') }}
          className="rounded-[6px] p-1.5 text-[#A3A3A3] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C9CFF] enabled:hover:text-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Command error — not color-only */}
      {cmdError !== null && (
        <p role="alert" className="text-[11px] text-[#FF6B6B]">
          Error: {cmdError}
        </p>
      )}
    </div>
  )
}
