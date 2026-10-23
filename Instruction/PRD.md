# Product Requirements Document (PRD)

## 1. Overview
**Product Name:** Emoji Island
**Repository:** `emoji-island`
**Description:** A Windows 10/11 desktop island-style HUD overlay providing quick access to a clock/weather widget, currently playing media, a temporary file shelf, and an AI chat interface. Designed as a thin vertical slice for single-monitor setups.
**Primary User:** Single author (local-first, no accounts).

## 2. Goals & Success Metrics
*   **Goal:** Deliver a stable, 3-minute demoable minimum viable product (v0.1). Stability outranks visual polish.
*   **Success Metric 1:** The "Hero Moment" (10s) works end-to-end without errors under the recorded media status (Locked or Degraded).
*   **Success Metric 2:** The 3-minute demo (FR-020) passes under Degraded media status.

## 3. Non-Goals
Multi-monitor and fullscreen auto-hide; macOS/Linux; true drag-out; voice, tool calling, shell, file access, system control by AI; Gemini adapter; launch at login; light theme; telemetry; accounts.

## 4. Functional Requirements (FR)

### System & Overlay
*   **FR-001 [Overlay Shell]:** *Given* the app is launched, *When* initialized, *Then* it displays a frameless, transparent, always-on-top window at the top-center of the primary display.
*   **FR-002 [Single Instance Lock]:** *Given* the app is running, *When* a second instance is launched, *Then* the first instance expands/focuses and the second instance quits.
*   **FR-003 [Global Hotkey]:** 
    *   *Given* the app is running, *When* the configured hotkey (default `Ctrl+Alt+Space`) is pressed, *Then* the island toggles between expanded and collapsed.
    *   *Given* hotkey registration fails, *When* the app starts, *Then* it shows a notice, keeps running, and the tray menu can toggle the island.
*   **FR-004 [Blur Collapse]:** *Given* the app is expanded, *When* the window loses focus and `window:setInputActive` is false, *Then* it collapses after a 300 ms delay.
*   **FR-015 [Tray]:** *Given* the app is running, *Then* a tray icon offers Show/Hide and Quit; Quit unregisters shortcuts and exits.

### Clock & Weather
*   **FR-005 [Local Time]:** *Given* the clock tab is active, *When* viewed, *Then* it shows the current system time and date.
*   **FR-006 [Weather Fetch]:** *Given* an active internet connection, *When* weather is requested for the target coordinates, *Then* it fetches current metric data from Open-Meteo and caches it for 30 minutes.
*   **FR-007 [Weather States]:** 
    *   *Given* cache age < 30 min, *Then* show weather as fresh.
    *   *Given* cache age from 30 min up to 24 h, *When* refresh fails or is pending, *Then* show cached data with a "stale" label.
    *   *Given* cache age > 24 h or no cache, *When* the network fails, *Then* show an "offline" state.

### Media (Subject to M0 Spike)
*   **FR-008 [Media Read]:** *Given* a media app (e.g., Spotify) is playing, *When* the media tab is active, *Then* it displays the track title, artist, and playback status.
*   **FR-009 [Media Control]:** 
    *   *Given* DECISIONS D-008 is Locked and a session exists, *When* the user clicks play/pause/next/previous, *Then* the action is sent and the status updates within 2 s.
    *   *Given* D-008 is Degraded, *Then* control buttons are disabled and the tab shows read-only data or "Media unavailable".
*   **FR-019 [No Media Session]:** *Given* no media session exists, *Then* the media tab shows "No media playing" and polling stops.

### File Shelf
*   **FR-010 [File Drop-in]:** 
    *   *Given* the island is expanded or collapsed, *When* a file is dragged over it, *Then* it expands and shows a drop target within 200 ms; blur-collapse is suspended while a drag is active.
    *   *Given* a valid file <= 100 MB, *When* dropped, *Then* it is copied to `userData/shelf` and listed.
*   **FR-011 [Shelf Limits]:** *Given* the shelf has 50 items or 500 MB, or the file exceeds 100 MB, *When* a drop occurs, *Then* the drop is rejected with an error banner (`FILE_TOO_LARGE` or `VALIDATION_ERROR`) and nothing is copied.
*   **FR-012a [Image Preview]:** *Given* a PNG/JPEG/WebP/GIF item <= 2 MB, *Then* a thumbnail is shown; otherwise a generic icon.
*   **FR-012b [Reveal]:** *Given* a shelf item, *When* "Reveal" is chosen, *Then* Explorer opens with the file selected.
*   **FR-012c [Copy Path]:** *Given* a shelf item, *When* "Copy path" is chosen, *Then* the path is placed on the clipboard.
*   **FR-012d [Delete]:** *Given* a shelf item, *When* "Delete" is chosen, *Then* the file and its metadata are removed.

### AI Chat & Settings
*   **FR-013 [Mock Mode - v0.1]:** *Given* no valid AI configuration, *When* the user sends a message, *Then* the `MockProvider` replies with a placeholder text.
*   **FR-018 [Chat History - v0.1]:** *Given* chat messages, *Then* the last 50 are kept, the last 8 are sent as context, and "Clear" removes all.
*   **FR-016 [Settings]:** 
    *   *[v0.1]* *Given* the Settings tab, *Then* the user can edit location (preset Jakarta or manual coordinates), hotkey, and reduced motion. Invalid values are rejected.
    *   *[v0.2]* *Given* the Settings tab, *Then* the user can also edit AI endpoint, AI model, and AI key (write-only).
*   **FR-014 [OpenAI-compatible Adapter - v0.2]:** 
    *   *Given* a valid endpoint, model, and key configured in Settings, *When* a prompt is sent, *Then* the app requests a completion within 15 s and shows the reply as plain text.
    *   *Given* an endpoint is set but no key is provided, *When* a prompt is sent, *Then* it sends without Authorization; a 401 returns "Check API key".
    *   *Given* a network error, 4xx, or timeout, *Then* an inline error is shown and the chat DOES NOT silently switch to MockProvider for that message.
*   **FR-017 [Key Handling - v0.2]:** *Given* `safeStorage` is unavailable, *When* a key is entered, *Then* it is held in memory only and a "key not persisted" notice is shown.

### Demo
*   **FR-020 [Demo Flow]:** *Given* a fresh launch, *Then* the 3-minute demo (clock/weather, media or fallback, file drop, AI Mock reply) runs without errors under Degraded media.

## 5. Non-Functional Requirements (NFR)
*   **Hard release gates:** 
    *   NFR-001 cold start <= 5 s; 
    *   NFR-002 expand/collapse <= 250 ms; 
    *   NFR-003 weather timeout 3 s with 1 retry; 
    *   NFR-004 file drop feedback <= 200 ms; 
    *   NFR-005 media action feedback <= 2 s; 
    *   NFR-006 MockProvider reply <= 1 s; 
    *   NFR-007 real AI timeout 15 s.
*   **Soft targets (record in STATUS.md, do not block release):** 
    *   NFR-008 idle CPU <= 3%; 
    *   NFR-009 media polling CPU <= 1.5%; 
    *   NFR-010 memory <= 350 MB. 
*   **Security:** 
    *   NFR-011 key only in main process; 
    *   NFR-012 preload exposes only `islandApi`; 
    *   NFR-013 all IPC payloads validated.

## 6. User Flows
1. Hotkey -> expand -> pick tab -> blur -> collapse.
2. Drag file -> auto-expand -> drop -> listed -> reveal/copy/delete.
3. Settings -> enter config -> send message -> reply or inline error.

## 7. Edge Cases
No media session; media app closed mid-playback; offline weather; shelf full; file too large; unsupported preview; symlink dropped; hotkey conflict; safeStorage unavailable; scaling 100/125/150%; AI reply > 4000 chars.

## 8. Risks & Mitigations
*   SMTC fails -> Degraded variant. 
*   Free model rate limits -> one task per session, switch route. 
*   Schedule overrun -> cut order in D-022. 
*   Transparent window quirks -> manual checks M1.

## 9. Assumptions
*   [ASSUMPTION] Jakarta as default location. 
*   [ASSUMPTION] Reduced-motion follows the Settings toggle.

## 10. Cut Priority
Same as D-022. NOT cuttable: single instance lock, hotkey, overlay shell, clock, basic weather, shelf basics (copy/list/reveal/copy path/delete), MockProvider chat, basic packaging, README, LICENSE.