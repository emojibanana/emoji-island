# UI Specification

## 1. Screens & Layout
*   **Collapsed Pill:** `280x40` px. Shows the clock (HH:MM) only. No media indicator in v1. Non-focusable.
*   **Expanded Panel:** `420x360` px. Comprises the top TabBar, the content area (max height `420` px including tabs), and bottom margins. Focusable.
*   **Position:** Top-center of the primary display with a `12 px` top margin.

## 2. Design Tokens & Theming
*   **Theme:** Dark glass theme. No light mode.
*   **Glass Material:** Semi-opaque solid rgba background `rgba(15, 15, 15, 0.88)` + `1 px` border `rgba(255, 255, 255, 0.12)`. Desktop blur is NOT utilized.
*   **Colors:** Text `#F5F5F5`, Muted `#A3A3A3`, Accent `#7C9CFF`, Error `#FF6B6B`, Warning `#F5B342`.
*   **Typography:** System fonts (Segoe UI on Windows). Font sizes: `12 / 14 / 16 / 20` px.
*   **Spacing Scale:** `4 / 8 / 12 / 16` px.
*   **Radii:** `16px` for the main window, `8px` for inner cards/buttons.
*   **Icons:** `lucide-react`.

## 3. Components
*   **`IslandPill`:** The collapsed state view.
*   **`ExpandedPanel`:** The expanded state view wrapper.
*   **`TabBar`:** Navigation icons (Clock/Weather, Media, Files, AI, Settings).
*   **`ClockCard`:** Displays current local time (HH:MM) and date.
*   **`WeatherCard`:** Displays temperature, humidity, and condition icon.
*   **`MediaCard`:** Shows track title, artist, and playback controls (play/pause/prev/next).
*   **`ShelfList` & `ShelfItem`:** Scrollable list of dropped files. Each item shows an icon or image preview, filename, and an action menu (Reveal, Copy Path, Delete).
*   **`AiChat` & `MessageBubble`:** Scrollable conversation view. Input field at the bottom.
*   **`SettingsForm`:** Inputs for coordinates, hotkey, AI endpoint, AI model, AI key, and a reduced motion toggle.
*   **`ErrorBanner` & `Toast`:** Transient feedback elements. Auto-dismiss after 4s except blocking errors, which stay until dismissed.

## 4. Animations & Transitions
*   **Expand:** `<= 200 ms` ease-out.
*   **Collapse:** `<= 180 ms` ease-in.
*   **Tab Switch:** `<= 120 ms` cross-fade.
*   **Interactions:** Hover scale `<= 1.02` for buttons/cards.
*   **Reduced Motion:** If `settings.reducedMotion` is true, all transform/scale animations are disabled (replaced with instant swaps or opacity-only transitions).

## 5. View States
*   **Loading:** Skeleton loaders or subtle spinners.
*   **Empty:** "No items in shelf", "Start a conversation".
*   **Error:** Inline red text or banner (e.g., "Invalid API Key", "File > 100 MB").
*   **Stale/Offline (Weather):** Amber "stale" badge or grey "offline" badge.
*   **Unavailable (Media):** Tab remains, but content states "Media unavailable" or "No media playing". Buttons disabled.
*   **Mock Mode (AI):** A subtle "Mock Mode" badge is visible in the chat header when no valid AI config is found.
*   **Drop Target:** Dashed Accent border + "Drop file to add", shown `<= 200 ms` when a file drag is active over the window.
*   **Notices:** 
    *   "Hotkey unavailable, use the tray icon".
    *   "Key not persisted (stored in memory for this session)".

## 6. Accessibility (a11y)
*   Keyboard navigation (Tab, Enter, Space) must work across all interactive elements in the expanded state.
*   Visible focus rings (`focus:ring-2`) on all inputs and buttons.
*   `aria-label` required on all icon-only buttons (e.g., Play, Settings, Send).
*   Errors and status changes must not rely solely on color (e.g., add text labels like "Error:" or distinct icons).

## 7. Hero Moment Step-by-Step (10s)
*This sequence optimizes the 3-minute demo for recording a 10s GIF.*

**Scenario A: Media Locked (Full Control)**
1.  **0.0s:** User presses `Ctrl+Alt+Space`. The window expands (`<= 200 ms`).
2.  **0.5s:** User clicks the Media tab. Track title and artist are visible; playback status updates.
3.  **2.5s:** User drags an image file from the desktop. The window visually highlights as a drop target (`<= 200 ms`). Blur-collapse is suspended.
4.  **4.0s:** File is dropped. It appears immediately in the `ShelfList` with a generated preview.
5.  **6.0s:** User clicks the AI tab and types "Hello", pressing Enter.
6.  **7.0s:** `MockProvider` replies with placeholder text instantly (`<= 1s`).

**Scenario B: Media Degraded (Read-Only/Fallback)**
1.  **0.0s:** User presses `Ctrl+Alt+Space`. The window expands (`<= 200 ms`).
2.  **0.5s:** User clicks the Media tab. The UI explicitly shows "Media unavailable" (or read-only data). Controls are disabled.
3.  **2.5s - 7.0s:** The rest of the file drop and AI steps execute exactly as Scenario A. The demo passes.

## Weather code mapping
| Codes | Label | iconKey |
| 0 | Clear sky | sun |
| 1 | Mainly clear | sun |
| 2 | Partly cloudy | cloud-sun |
| 3 | Overcast | cloud |
| 45, 48 | Fog | cloud-fog |
| 51 / 53 / 55 | Light drizzle / Drizzle / Dense drizzle | cloud-drizzle |
| 56, 57 | Freezing drizzle | cloud-drizzle |
| 61 / 63 / 65 | Light rain / Rain / Heavy rain | cloud-rain |
| 66, 67 | Freezing rain | cloud-rain |
| 71 / 73 / 75 | Light snow / Snow / Heavy snow | cloud-snow |
| 77 | Snow grains | snowflake |
| 80 / 81 / 82 | Light showers / Showers / Heavy showers | cloud-rain |
| 85 / 86 | Light snow showers / Heavy snow showers | cloud-snow |
| 95 | Thunderstorm | cloud-lightning |
| 96, 99 | Thunderstorm with hail | cloud-hail |
| anything else, NaN | Unknown | unknown |