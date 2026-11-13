# Tasks: Milestone 0 to Milestone 4

## Milestone 0 (Foundation + Spike Gate)

### T-001: Scaffold & Verify
*   **Depends On:** None
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** any
*   **Context Pack:** AGENTS.md, DECISIONS (D-002, D-003, D-018), This task card.
*   **Files:** `package.json`, `electron.vite.config.ts`, `tailwind.config.js`
*   **read_files:** None.
*   **commit:** `chore: initialize electron-vite and tailwind scaffold`
*   **Steps:** Initialize `electron-vite` React-TS template. Install exactly the dependency allowlist from D-003. Configure Tailwind. Validate versions `[VERIFY: latest stable]`. [SIZE-EXCEPTION: initial scaffold].
*   **Verification:** `automated_command`: `npm run build && npm run test` (if tests exist) or `npm run dev` smoke timeout.

### T-002: Tooling & Environment
*   **Depends On:** T-001
*   **Hours:** Agent: 1.0 | Review: 1.0 | Est: 2.0
*   **Tier:** any
*   **Context Pack:** AGENTS.md, DECISIONS (D-003, D-018, D-020), This task card.
*   **Files:** `vitest.config.ts`, `.env.example`, `.eslintrc.cjs`
*   **read_files:** `package.json`
*   **commit:** `chore: configure tooling and environments`
*   **Steps:** Configure Vitest with jsdom and coverage-v8. Add `.env.example`. Enforce strict ESLint rules (no implicit any).
*   **Verification:** `automated_command`: `npx vitest run`

### T-003: Types & Zod Schemas
*   **Depends On:** T-002
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-015), This task card.
*   **Files:** `src/shared/types.ts`, `src/shared/schemas.ts`, `src/shared/schemas.test.ts`
*   **read_files:** None.
*   **commit:** `feat(shared): define types and schemas`
*   **Steps:** Define types and strict Zod schemas per IPC_SPEC. Write schema unit tests.
*   **Verification:** `automated_command`: `npx vitest run src/shared/schemas.test.ts`

### T-004: Preload islandApi
*   **Depends On:** T-003
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-014), This task card.
*   **Files:** `src/preload/index.ts`, `src/preload/index.test.ts`
*   **read_files:** `src/shared/types.ts`, `src/shared/schemas.ts`, `src/main/index.ts` (webPreferences section only)
*   **commit:** `feat(preload): implement islandApi with 20 channels`
*   **Steps:** Expose frozen `islandApi`: one method per channel in IPC_SPEC (20 channels); `window:setInputActive` and `window:setDragActive` use `ipcRenderer.send`, all others invoke. Include helper `getDroppedFilePath(file)` calling `webUtils.getPathForFile`. No handlers are implemented in this task.
*   **Verification:** `automated_command`: `npx vitest run src/preload/index.test.ts`

### T-005: webUtils drop verification
*   **Depends On:** T-004
*   **Hours:** Agent: 1.0 | Review: 1.0 | Est: 2.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-012), This task card.
*   **Files:** `src/renderer/src/App.tsx`, `docs/DECISIONS.md`
*   **read_files:** `src/preload/index.ts`, `src/renderer/src/App.tsx`
*   **commit:** `test(drop): verify webUtils absolute path retrieval`
*   **Steps:** Temporary drop listener calls `getDroppedFilePath` and logs absolute path via temporary main-process log; verify `sandbox:true` and `contextIsolation:true` remain set. Record PASS/FAIL in D-012. Remove temporary listener afterwards.
*   **Verification:** `manual_check_id`: M-015

### T-006: Storage Service & Migration
*   **Depends On:** T-003
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-004, D-005), This task card.
*   **Files:** `src/main/services/store.ts`, `src/main/services/store.test.ts`
*   **read_files:** `src/shared/schemas.ts`
*   **commit:** `feat(store): implement electron-store and safeStorage`
*   **Steps:** Implement typed `electron-store` with v1 defaults. Implement `safeStorage` wrapper (memory fallback if `!isEncryptionAvailable()`).
*   **Verification:** `automated_command`: `npx vitest run src/main/services/store.test.ts`

### T-007a: SMTC spike, primary option
*   **Depends On:** T-002
*   **Hours:** Agent: 3.0 | Review: 1.0 | Est: 4.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-008), This task card.
*   **Files:** `scripts/spike-smtc-a.*`, `SPIKE_RESULT.md`
*   **read_files:** None.
*   **commit:** `test(smtc): spike primary media integration option`
*   **Steps:** Implement ONE option (npm package or PowerShell WinRT bridge) in a throwaway script. Test read info and playback controls. Stop at 4 h. Output to `SPIKE_RESULT.md` section "Primary".
*   **Verification:** `manual_check_id`: M-008

### T-007b: SMTC spike, fallback option
*   **Depends On:** T-007a
*   **Hours:** Agent: 3.0 | Review: 1.0 | Est: 4.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-008), This task card.
*   **Files:** `scripts/spike-smtc-b.*`, `SPIKE_RESULT.md`
*   **read_files:** `SPIKE_RESULT.md`
*   **commit:** `test(smtc): spike fallback media integration option`
*   **Steps:** Run ONLY if T-007a FAIL. Implement fallback option in a throwaway script. Time-box 4 h. If still FAIL at 8 h total: Degraded. Any candidate npm dependency is recorded in `SPIKE_RESULT.md` and added to D-003 only in T-008 if PASS.
*   **Verification:** `manual_check_id`: M-008

### T-008: Record Spike Result
*   **Depends On:** T-007b
*   **Hours:** Agent: 1.0 | Review: 1.0 | Est: 2.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-008), This task card.
*   **Files:** `docs/DECISIONS.md`
*   **read_files:** `docs/spike/SPIKE_RESULT.md`
*   **commit:** `docs(decisions): record SMTC spike result and clean up`
*   **Steps:** Set D-008 Locked or Degraded; add chosen dependency (if any) to D-003; move throwaway scripts to `docs/spike/` (kept — T-020-La reuses them).
*   **Verification:** `automated_command`: `cat docs/DECISIONS.md`

### T-009: Wrap Milestone 0
*   **Depends On:** T-008
*   **Hours:** Agent: 0.5 | Review: 1.0 | Est: 1.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, This task card.
*   **Files:** `STATUS.md`
*   **read_files:** `STATUS.md`
*   **commit:** `chore: wrap milestone 0`
*   **Steps:** Update `STATUS.md`. Create git tag `m0-done`.
*   **Verification:** `automated_command`: `git tag -l "m0-done"`

---
## Milestone 1 (Island Shell + Clock + Weather)

### T-010: Window Shell & Tray & Pill
*   **Depends On:** T-009
*   **Hours:** Agent: 3.0 | Review: 1.0 | Est: 4.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-009), This task card.
*   **Files:** `src/main/index.ts`, `src/main/services/tray.ts`, `src/renderer/src/App.tsx`, `src/renderer/src/components/IslandPill.tsx`
*   **read_files:** `src/main/index.ts`
*   **commit:** `feat(shell): add overlay window, tray, and minimal pill`
*   **Steps:** Configure BrowserWindow strictly to specs (frameless, transparent, always-on-top, skipTaskbar true). Setup System Tray menu. Render minimal solid-color `IslandPill` (verifiable for M-001).
*   **Verification:** `manual_check_id`: M-001, M-006

### T-011: Single Instance & Global Hotkey
*   **Depends On:** T-010
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-011), This task card.
*   **Files:** `src/main/index.ts`, `src/main/services/hotkey.ts`
*   **read_files:** `src/main/index.ts`
*   **commit:** `feat(shell): enforce single instance and global hotkey`
*   **Steps:** Implement single instance lock via `app.requestSingleInstanceLock()`. Register global hotkey to toggle window bounds.
*   **Verification:** `manual_check_id`: M-002, M-003, M-005

### T-012: Focus Model & Auto-Expand On Drag
*   **Depends On:** T-011
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-010), This task card.
*   **Files:** `src/main/index.ts`, `src/main/ipcHandlers.ts`
*   **read_files:** `src/main/index.ts`, `src/preload/index.ts`
*   **commit:** `feat(shell): implement focus model and auto-expand on drag`
*   **Steps:** IPC listeners for `window:setInputActive` and `window:setDragActive`. `browserWindow.on('blur')` manages 300 ms timeout. If `window:setDragActive` receives `true`, expand <= 200 ms and suspend timer.
*   **Verification:** `manual_check_id`: M-004, M-016

### T-013: UI Shell & Transitions
*   **Depends On:** T-012
*   **Hours:** Agent: 3.0 | Review: 1.0 | Est: 4.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-017), This task card.
*   **Files:** `src/renderer/src/App.tsx`, `src/renderer/src/index.css`
*   **read_files:** `src/renderer/src/App.tsx`, `src/renderer/src/index.css`
*   **commit:** `feat(ui): implement main panel layout and transitions`
*   **Steps:** Apply Tailwind glass tokens. Map React state to window modes (Collapsed 280x40, Expanded 420x360). Add CSS transition(`ease-out` / `ease-in`). Derive the collapsed or expanded view from the window size (window.innerWidth and the 'resize' event), not from renderer state. Main changes the size on blur-collapse, hotkey, tray and drag, and there is no main-to-renderer mode channel in IPC_SPEC.    The root container fills 100% width and height of the window in both modes (pill and panel never keep a fixed width smaller than the window).
   Derive the collapsed or expanded view from the window size (window.innerWidth and the 'resize' event), not from renderer state.
*   **Verification:** `manual_check_id`: M-012, M-002

### T-014: Weather Service (Main)
*   **Depends On:** T-013
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-016), This task card.
*   **Files:** `src/main/services/weather.ts`, `src/main/services/weather.test.ts`, `src/main/ipcHandlers.ts`, `src/main/index.ts` *(corrected in T-014: the handler had no call site without index.ts — approved by the owner)*
*   **read_files:** `src/shared/types.ts`
*   **commit:** `feat(weather): implement open-meteo fetch and caching`
*   **Steps:** Native `fetch` to Open-Meteo. Cache and state derivation logic. Expose `weather:get` and `weather:refresh` handlers yielding `WeatherResult`.
*   **Verification:** `automated_command`: `npx vitest run src/main/services/weather.test.ts`

### T-015a: Weather Code Mapping, ClockCard and WeatherCard
*   **Depends On:** T-014
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, UI_SPEC (Weather code mapping, Components, View states), This task card.
*   **Files:** `src/renderer/src/lib/weather-code.ts`, `src/renderer/src/lib/weather-code.test.ts`, `src/renderer/src/components/ClockCard.tsx`, `src/renderer/src/components/WeatherCard.tsx`
*   **read_files:** `src/shared/types.ts`
*   **commit:** `feat(ui): add weather code mapping, clock card and weather card`
*   **Steps:**
    1. `weather-code.ts` (pure, no React or lucide import): export `WeatherIconKey` and `describeWeatherCode(code: number): { label; iconKey }` following the UI_SPEC table. Non-integers and NaN return Unknown. If the Open-Meteo docs differ from the table, the docs win; record it in STATUS.md notes.
    2. `weather-code.test.ts`: every code in the table returns its label and iconKey; -1, 4, 100, 1.5 and NaN return Unknown.
    3. `WeatherCard` props `{ result: WeatherResult | null; loading: boolean; error: string | null }`. No fetch or IPC inside. Map iconKey to `lucide-react` icons in a Record (use `Cloud` if an icon is missing in the installed version). States: loading "Loading weather"; error "Error: <message>"; offline with null data "Weather unavailable (offline)" plus an "Offline" badge; success shows icon, temperature rounded with °C, label, "Feels like N°C", "Humidity N%"; stale adds an amber "Stale" badge. Badges carry text, never color only. State text uses `role="status"`. Tokens: text #F5F5F5, muted #A3A3A3, warning #F5B342.
    4. `ClockCard` (no props): HH:MM (24-hour) plus a date line from `Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })` [ASSUMPTION]. Update with a `setTimeout` to the next minute boundary, cleared on unmount.
    5. Do not touch `App.tsx`, `TabBar.tsx`, `IslandPill.tsx`, `src/main`, `src/preload`, `src/shared` or `package.json`.
*   **Acceptance Criteria:** mapping tests pass; components render every state; typecheck, lint and build pass.
*   **Verification:** `automated_command`: `npx vitest run src/renderer/src/lib/weather-code.test.ts`

### T-015b: Tab Bar, Weather Hook and Expanded View Wiring
*   **Depends On:** T-015a
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, UI_SPEC (Components, Animations, Accessibility), This task card.
*   **Files:** `src/renderer/src/components/TabBar.tsx`, `src/renderer/src/hooks/use-weather.ts`, `src/renderer/src/App.tsx`
*   **read_files:** `src/renderer/src/App.tsx`, `src/preload/index.ts`, `src/main/services/weather.ts`
*   **commit:** `feat(ui): add tab bar and weather polling to expanded view`
*   **Steps:**
    1. `TabBar`: driven by an exported `TABS` array with one entry (clock and weather); later tasks append entries. `role="tablist"`, each button `role="tab"` with `aria-selected` and `aria-label`, ArrowLeft/ArrowRight navigation, visible focus ring, tab switch fade <= 120 ms, disabled under `prefers-reduced-motion`.
    2. `use-weather.ts`: used only inside the expanded view, so it polls only while the island is expanded and never calls IPC while collapsed. Call `weather:get` on mount and every 60 s. Read `weather.ts` and follow what T-014 implemented: if `get` does not refetch stale data, call `refresh` when status is not `fresh`, at most once per 5 minutes. On an envelope error set the error message. Clear timers on unmount and ignore results that arrive after unmount. Use only methods that exist in the preload; never invent names.
    3. `App.tsx`: keep the pill/expanded view derived from the window size. In the expanded view render `TabBar` and, for the active tab, `ClockCard` and `WeatherCard` fed by the hook.
    4. Do not touch `IslandPill.tsx`, `src/main`, `src/preload`, `src/shared` or `package.json`.
*   **Acceptance Criteria:** weather and clock show in the expanded view; offline shows the offline state without a crash; no IPC calls while collapsed; typecheck, lint and build pass.
*   **Verification:** `manual_check_id`: M-007 (plus M-002 for expand/collapse); repo gates `npm run typecheck` and `npx vitest run`.

### T-016: Wrap Milestone 1
*   **Depends On:** T-015b
*   **Hours:** Agent: 0.5 | Review: 1.0 | Est: 1.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, This task card.
*   **Files:** `STATUS.md`
*   **read_files:** `STATUS.md`
*   **commit:** `chore: wrap milestone 1`
*   **Steps:** Update STATUS.md. (Commit first, then create git tag `m1-done`).
*   **Verification:** `automated_command`: `git tag -l "m1-done"`

---
## Milestone 2 (Media & File Shelf)

### T-020-La: Media Bridge Service (Locked Variant)
*   **Depends On:** T-016
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-008, D-015), This task card.
*   **Files:** `src/main/services/media.ts`, `src/main/services/media-bridge.ts`, `src/main/services/media-bridge.test.ts`
*   **read_files:** `src/shared/types.ts`, `docs/spike/spike-smtc-a.ps1`
*   **commit:** `feat(media): implement persistent smtc bridge service`
*   **Steps:** Run ONLY if D-008 Locked. Turn the spike script into the shipped bridge: fixed bundled file, no user-supplied arguments, unpacked from asar when packaged (T-032), run as ONE persistent `powershell.exe` **5.1** child process (never `pwsh`) speaking newline-delimited JSON over stdio. Session selection: `PlaybackStatus == Playing` first, then AUMID allowlist — never `GetCurrentSession()` alone. Poll every 3 s only while a session exists; re-poll status ~700 ms after a control command. Never log media titles. Push `media:stateChanged`. Child exit or no session: `MEDIA_UNAVAILABLE` with `canControl:false`, bounded restart, never crash.
*   **Verification:** `manual_check_id`: M-008

### T-020-Lb: Media Card UI & IPC Handlers (Locked Variant)
*   **Depends On:** T-020-La
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-008, D-015), This task card.
*   **Files:** `src/renderer/src/components/MediaCard.tsx`, `src/main/ipcHandlers.ts`, `src/main/index.ts`
*   **read_files:** `src/shared/schemas.ts`
*   **commit:** `feat(media): tambah card ui untuk media dan ipc handlers`
*   **Steps:** Run ONLY if D-008 Locked. Render title/artist/status from `media:stateChanged`; emit `media:control` (play/pause/next/previous) with zod-validated payloads. Render a disabled card when the bridge reports unavailable.
*   **Verification:** `manual_check_id`: M-008

### T-020-D: Media Service & UI (Degraded Variant)
*   **Depends On:** T-016
*   **Hours:** Agent: 1.0 | Review: 1.0 | Est: 2.0
*   **Tier:** any
*   **Context Pack:** AGENTS.md, DECISIONS (D-008), This task card.
*   **Files:** `src/main/services/media.ts`, `src/renderer/src/components/MediaCard.tsx`, `src/main/ipcHandlers.ts`
*   **read_files:** `src/shared/types.ts`
*   **commit:** `feat(media): implement degraded read-only media fallback`
*   **Steps:** Run ONLY if D-008 Degraded. Implement mock service returning `{ title:null, artist:null, status:'unavailable', canControl:false }` with NO polling. `media:control` returns `MEDIA_UNAVAILABLE`. Build `MediaCard` showing disabled state.
*   **Verification:** `manual_check_id`: M-009

### T-021: Shelf Sanitizer & Capacity Limits
*   **Depends On:** T-016
*   **Hours:** Agent: 1.0 | Review: 1.0 | Est: 2.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-005, D-012), This task card.
*   **Files:** `src/main/services/sanitizer.ts`, `src/main/services/sanitizer.test.ts`
*   **read_files:** `src/shared/schemas.ts`
*   **commit:** `feat(shelf): add sanitizer and capacity validation`
*   **Steps:** Implement pure function sanitizers and capacity checkers. Write unit tests covering illegal names, path length > 240 rejection (no truncation), and cap overflows.
*   **Verification:** `automated_command`: `npx vitest run src/main/services/sanitizer.test.ts`

### T-022: Shelf Copy Service & IPC Handlers
*   **Depends On:** T-021
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-012), This task card.
*   **Files:** `src/main/services/shelf.ts`, `src/main/ipcHandlers.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/shared/types.ts`
*   **read_files:** `src/main/services/sanitizer.ts`, `src/shared/types.ts`
*   **commit:** `feat(shelf): implement shelf copy service and ipc handlers`
*   **Steps:** Stream-copy to temp file in `userData/shelf`, atomic rename. Wire IPC handlers for `addFromDrop`, `list`, `remove`, `reveal`, `copyPath`.
*   **Verification:** `manual_check_id`: M-011, M-018

### T-023: Shelf Preview Handler & UI List
*   **Depends On:** T-022
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-013), UI_SPEC, This task card.
*   **Files:** `src/main/services/shelfPreview.ts`, `src/main/ipcHandlers.ts`, `src/main/index.ts`, `src/renderer/src/components/ShelfList.tsx`, `src/renderer/src/components/ShelfItem.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/components/TabBar.tsx`
*   **read_files:** `src/preload/index.ts`, `src/renderer/src/App.tsx`
*   **commit:** `feat(shelf): build preview handler and shelf ui`
*   **Steps:** `shelf:getPreview` generates base64 data URL. Render `ShelfList` and `ShelfItem` components with action menus.
*   **Verification:** `manual_check_id`: M-010, M-011

### T-024: Drop Zone Wiring
*   **Depends On:** T-023
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-010, D-012), This task card.
*   **Files:** `src/renderer/src/App.tsx`, `src/renderer/src/components/ShelfList.tsx`
*   **read_files:** `src/renderer/src/App.tsx`, `src/preload/index.ts`
*   **commit:** `feat(shelf): wire drag and drop auto-expand zone`
*   **Steps:** Attach global dragenter/dragleave/drop handlers in App.tsx sending `window:setDragActive`.
*   **Verification:** `manual_check_id`: M-016

### T-025: Wrap Milestone 2
*   **Depends On:** T-020, T-024
*   **Hours:** Agent: 0.5 | Review: 1.0 | Est: 1.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, This task card.
*   **Files:** `STATUS.md`
*   **read_files:** `STATUS.md`
*   **commit:** `chore: wrap milestone 2`
*   **Steps:** Update STATUS.md. Commit changes first, then create git tag `m2-done`.
*   **Verification:** `automated_command`: `git tag -l "m2-done"`

### T-025b: Media Tab Wiring & Artwork (Post-M2 Correction)
*   **Depends On:** T-020-Lb, T-025
*   **Hours:** Agent: 0.5 | Review: 0.5 | Est: 1.0
*   **Tier:** any
*   **Context Pack:** AGENTS.md, DECISIONS (D-008, D-015), UI_SPEC, This task card.
*   **Files:** `src/renderer/src/components/TabBar.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/components/MediaCard.tsx`
*   **read_files:** `src/shared/types.ts`, `src/shared/schemas.ts`, `src/main/services/media.ts`, `src/main/services/media-bridge.ts`, `scripts/smtc-bridge.ps1`, `Instruction/IPC_SPEC.md`, `Instruction/UI_SPEC.md`, `Instruction/DECISIONS.md`
*   **commit:** `fix(ui): tambahkan tab media dan artwork jika tersedia`
*   **Steps:**
    1. Add a `media` tab to `TAB` in `TabBar.tsx`, ordered after Clock & Weather and before Files.
    2. Import and render `MediaCard` in `App.tsx` when `activeTab === 'media'`.
    3. If `MediaState` already exposes a safe artwork field such as `artworkDataUrl`, render it in `MediaCard` with a fallback icon.
    4. If artwork is not already safely available in `MediaState`, do not modify main/preload/shared/scripts/CSP. Report artwork as a separate blocker.
    5. Do not log title, artist, album, artwork URL, or media metadata.
*   **Acceptance Criteria:** Media tab appears; MediaCard renders; unavailable state works; controls work; artwork appears only if already safely provided by existing MediaState; no new IPC channels; no CSP change; no media metadata logging.
*   **Verification:** `manual_check_id`: M-008

### T-025c: Media Bridge UTF-8 Encoding Hotfix

*   **Depends On:** T-025b
*   **Hours:** Agent: 0.5 | Review: 0.5 | Est: 1.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-008), This task card.
*   **Files:** `scripts/smtc-bridge.ps1`, `src/main/services/media-bridge.ts`
*   **read_files:** `src/shared/types.ts`, `src/main/services/media.ts`, `Instruction/IPC_SPEC.md`, `Instruction/DECISIONS.md`
*   **commit:** `fix(media): pakai UTF-8 untuk bridge PowerShell dan stdout`
*   **Steps:** Ensure PowerShell bridge emits newline-delimited JSON as UTF-8 without BOM and Node decodes child stdout as UTF-8. Do not change D-008 process model, polling, session selection, IPC schema, renderer, preload, shared, CSP, or dependencies.
*   **Acceptance Criteria:** Non-ASCII media title/artist no longer renders as ?????; media controls still work; no media metadata logged; gates pass.
*   **Verification:** `manual_check_id`: M-008

### T-025d: Media Artwork Support

*   **Depends On:** T-025c, T-025d-inv
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-008, D-013, D-015), UI_SPEC, IPC_SPEC, Instruction/INVESTIGATION_T025d_ARTWORK.md, This task card.
*   **Files:** `scripts/smtc-bridge.ps1`, `src/main/services/media-bridge.ts`, `src/main/services/media.ts`, `src/shared/types.ts`, `src/shared/schemas.ts`, `src/renderer/src/components/MediaCard.tsx`
*   **read_files:** `Instruction/IPC_SPEC.md`, `Instruction/DATA_MODEL.md`, `Instruction/UI_SPEC.md`, `Instruction/DECISIONS.md`, `src/main/ipcHandlers.ts`, `src/preload/index.ts`, `src/main/index.ts`, `src/renderer/index.html`
*   **commit:** `feat(media): tambahkan artwork data URL untuk media card`
*   **Steps:**
    1. Add optional nullable `artworkDataUrl` to `MediaState`.
    2. Extend PowerShell bridge to read SMTC thumbnail only from selected session, enforce 200 KiB raw limit, detect supported MIME types, and emit `artworkDataUrl` only as a data URL.
    3. Keep D-008 process model unchanged: one persistent PowerShell 5.1 child, newline-delimited JSON stdio, no pwsh, no polling/re-poll changes.
    4. Validate optional artwork in main bridge/media service and degrade to null on missing, zero-size, oversized, unsupported, or malformed artwork.
    5. Render artwork in MediaCard with fallback Music icon.
    6. Never log title, artist, album, artwork URL, artwork data, or media metadata.
    7. Do not add new IPC channels.
    8. Do not change CSP unless owner separately approves; if current CSP blocks data URL images, stop and report.
*   **Acceptance Criteria:** Artwork appears when available; fallback appears when missing; oversized/unsupported/zero-size artwork degrades safely; non-ASCII title/artist still works; controls still work; no metadata logged; gates pass.
*   **Verification:** `manual_check_id`: M-008

### T-025f-spike: Shelf Drag-Out Gesture Spike
*   **Depends On:** T-025d, owner-approved D-014/IPC_SPEC amendment
*   **Hours:** Agent: 1.0 | Review: 1.0 | Human manual: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-012, D-013, D-014, D-022), IPC_SPEC, UI_SPEC, This task card.
*   **Files:** `src/preload/index.ts`, `src/preload/index.test.ts`, `src/main/ipcHandlers.ts`, `src/main/services/shelf.ts`, `src/renderer/src/components/ShelfItem.tsx`
*   **read_files:** `src/shared/types.ts`, `src/shared/schemas.ts`, `Instruction/DECISIONS.md`, `Instruction/IPC_SPEC.md`, `Instruction/UI_SPEC.md`, `Instruction/TESTING.md`, `src/main/services/shelfPreview.ts`, `src/renderer/src/components/ShelfList.tsx`, `src/renderer/src/App.tsx`, `src/main/index.ts`, `resources/tray-icon.png`
*   **commit:** `feat(shelf): prototipe drag-out single-file tanpa auto-remove`
*   **Steps:**
    1. Confirm owner-approved D-014 amendment and IPC_SPEC `shelf:dragOut` exist before editing.
    2. Add typed preload method `dragOutShelfItem(id: string): Promise<Env<void>>`.
    3. Update `src/preload/index.test.ts` frozen surface contract from 20 keys to 21 keys by adding `dragOutShelfItem` to `EXPECTED_KEYS` and updating the test name/assertion.
    4. Add main IPC handler `shelf:dragOut` validating payload with existing `ShelfIdSchema`.
    5. Resolve shelf file from store metadata and `userData/shelf` only.
    6. Enforce containment, `lstat`, `realpath`, regular file, and existence checks.
    7. Call `event.sender.startDrag` with the validated shelf file path and safe app icon resource. Do not return the path in the envelope.
    8. Make `ShelfItem` draggable for single-file drag-out.
    9. Do not remove, mark taken, TTL, or mutate shelf metadata after drag-out.
    10. Do not implement multi-file drag-out.
    11. Do not change auto-expand/drop-in behavior.
    12. Do not log file paths, file names, file contents, or media metadata.
*   **Acceptance Criteria:** Single shelf item can begin native drag to external target; shelf item remains after drag; missing file produces safe error; cancel does not corrupt shelf; no renderer-supplied path; no auto-remove; preload surface test is updated to 21 keys and all gates pass.
*   **Verification:** `manual_check_id`: M-021, M-023, M-025, M-026. M-022 is optional but recommended.

### T-025g: Shelf UI Simplification

*   **Depends On:** T-025f-spike
*   **Hours:** Agent: 0.75 | Review: 0.5 | Human manual: 0.5 | Est: 1.75
*   **Tier:** any
*   **Context Pack:** AGENTS.md, UI_SPEC, DECISIONS (D-010, D-012, D-013, D-014), This task card.
*   **Files:** `src/renderer/src/components/ShelfItem.tsx`, `src/renderer/src/components/ShelfList.tsx`
*   **read_files:** `src/shared/types.ts`, `src/preload/index.ts`, `src/main/ipcHandlers.ts`, `src/main/services/shelf.ts`, `Instruction/UI_SPEC.md`, `Instruction/TESTING.md`, `Instruction/DECISIONS.md`
*   **commit:** `fix(ui): sederhanakan UI shelf menjadi icon action tanpa menu inline`
*   **Steps:**
    1. Remove the inline action menu / three-dot disclosure from ShelfItem.
    2. Render each shelf item as a single row: file icon, truncated name, size, optional preview icon, remove icon.
    3. Preview icon appears only for supported image MIME types.
    4. Remove icon is always present.
    5. Icon buttons have no visible text label but must have accessible aria-labels.
    6. Clicking an image item opens preview. Clicking a non-image item does nothing.
    7. Keep the whole item draggable for shelf drag-out.
    8. Action buttons must not start item drag and must not trigger item click propagation.
    9. Move drag-out failure feedback out of per-item variable-height layout into a single non-sensitive ShelfList status region.
    10. Do not remove backend reveal/copyPath IPC in this task.
    11. Do not log file paths, file names, file contents, or media metadata.
*   **Acceptance Criteria:** No inline menu; no clipped Remove action; no layout shift from menus/errors; image preview works via click/    icon; remove works via icon; non-image click is no-op; drag-out remains functional; accessibility preserved; gates pass.
*   **Verification:** `manual_check_id`: M-010

### T-025h: Shelf IPC Surface Reduction + Self-Drop Guard

*   **Depends On:** T-025g, owner-approved D-014 amendment
*   **Hours:** Agent: 1.5 | Review: 1.0 | Human manual: 0.5 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-012, D-013, D-014, D-015), IPC_SPEC, DATA_MODEL, UI_SPEC, This task card.
*   **Files:** `src/shared/types.ts`, `src/shared/schemas.ts`, `src/preload/index.ts`, `src/preload/index.test.ts`, `src/main/ipcHandlers.ts`, `src/main/services/shelf.ts`
*   **read_files:** `src/main/services/shelfPreview.ts`, `src/main/services/store.ts`, `src/renderer/src/components/ShelfItem.tsx`, `src/renderer/src/components/ShelfList.tsx`, `Instruction/DECISIONS.md`, `Instruction/IPC_SPEC.md`, `Instruction/DATA_MODEL.md`, `Instruction/UI_SPEC.md`, `Instruction/TESTING.md`
*   **commit:** `refactor(shelf): hapus reveal/copy path dan tambahkan self-drop guard`
*   **Steps:**
    1. Confirm owner-approved D-014 amendment exists before editing.
    2. Remove revealShelfItem and copyShelfPath from shared types/schemas if present there.
    3. Remove shelf:reveal and shelf:copyPath handlers from main.
    4. Remove corresponding preload methods.
    5. Update preload surface test from 21 keys to 19 keys by removing revealShelfItem and copyShelfPath.
    6. Add main-side self-drop guard to shelf:addFromDrop.
    7. Self-drop guard must detect source path inside userData/shelf.
    8. Self-drop must not create duplicate metadata or physical file.
    9. If matching existing metadata can be identified safely, return existing metadata. Otherwise reject with PATH_INVALID.
    10. Do not log paths, names, contents, or media metadata.
    11. Do not add new IPC channels.
    12. Do not modify renderer unless a compile error proves it still references removed methods; if renderer changes are required, stop and report scope blocker.
*   **Acceptance Criteria:** reveal/copyPath absent from shared/preload/main/test; islandApi surface is 19 keys; self-drop from island to island does not duplicate; normal external drop still works; missing file safe; gates pass.
*   **Verification:** `manual_check_id`: M-010, M-011, M-021, M-023, M-026, M-028

### T-025i: Media Session Discovery Poll Fix
*   **Depends On:** T-025h, owner-approved D-008 amendment
*   **Hours:** Agent: 0.5 | Review: 0.5 | Human manual: 0.5 | Est: 1.5
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-008), IPC_SPEC, TESTING, This task card.
*   **Files:** `src/main/services/media-bridge.ts`
*   **read_files:** `src/main/services/media.ts`, `scripts/smtc-bridge.ps1`, `src/main/ipcHandlers.ts`, `src/shared/types.ts`, `Instruction/DECISIONS.md`, `Instruction/IPC_SPEC.md`, `Instruction/TESTING.md`
*   **commit:** `fix(media): tambahkan discovery poll saat tidak ada sesi media`
*   **Steps:**
    1. Confirm owner-approved D-008 amendment exists before editing.
    2. Add low-frequency discovery polling while no usable media session is present.
    3. Preserve active polling at ~3000 ms while a session exists.
    4. Preserve ~700 ms re-poll after media commands.
    5. Preserve one persistent PowerShell 5.1 bridge process.
    6. Do not spawn new PowerShell processes.
    7. Do not log media metadata.
    8. Do not change renderer, preload, shared, IPC channels, CSP, dependencies, or PowerShell bridge unless a scope blocker is reported.
*   **Acceptance Criteria:** Starting Island with no media, then starting music later, causes the track to appear within the discovery poll window without restarting Island. Stopping music returns unavailable. Starting music again is detected again. Gates pass.
*   **Verification:** `manual_check_id`: M-008b

# Tasks: Milestone 3 & 4

---
## Milestone 3 (AI Chat & Settings)

### T-026a: AI Mock Provider & History Store
*   **Depends On:** T-025
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-006), This task card.
*   **Files:** `src/main/services/ai.ts`, `src/main/ipcHandlers.ts`, `src/main/services/ai.test.ts`, `src/main/index.ts`
*   **read_files:** `src/shared/types.ts`
*   **commit:** `feat(ai): implement mock provider and history store`
*   **Steps:** Build MockProvider (returns "Mock reply: " + first 80 chars within 1s). Implement chat history array (max 50) and context builder (last 8). Wire `ai:getStatus`, `ai:getHistory`, `ai:send`, `ai:clear`. Call `registerAiHandlers(store)` from the main bootstrap so the AI IPC handlers are active. History must be store-backed via existing `AppStore` `chatMessages` storage, not in-memory. Use existing `store.get('chatMessages')`, `store.pushChat()`, and `store.set('chatMessages', [])`; do not add new persistence fields or new store methods unless a scope blocker is reported.
*   **Verification:** `automated_command`: `npx vitest run src/main/services/ai.test.ts`
*   Owner-approved registration call-site amendment: src/main/index.ts is added because the original card omitted the bootstrap registration point.

### T-026b: AI Chat UI & Focus Reporting
*   **Depends On:** T-026a
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, UI_SPEC, This task card.
*   **Files:** `src/renderer/src/components/AiChat.tsx`, `src/renderer/src/components/MessageBubble.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/components/TabBar.tsx`
*   **read_files:** `src/main/ipcHandlers.ts`
*   **commit:** `feat(ui): build ai chat ui and focus reporting`
*   **Steps:** Implement `AiChat` and `MessageBubble`. Wire inputs to `window:setInputActive` (true on focus/text, false on blur/empty) to suspend window collapse. Register the tab in TabBar and App.tsx.
*   **Verification:** `manual_check_id`: M-014 (Mock part)

### T-026c: IPC Error Logging Privacy Hardening
*   **Depends On:** T-026b
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-008 amendment, D-012), This task card.
*   **Files:** `src/main/ipcHandlers.ts`, `src/main/ipcHandlers.privacy.test.ts`
*   **read_files:** `src/main/ipcHandlers.ts`
*   **commit:** `fix(ipc): remove raw error messages from shelf and media handler logs`
*   **Steps:**
    1. In `shelf:list` and `media:getState` handlers, replace raw `error.message` logging with the channel name and a fixed error code only.
    2. Return the same generic envelope messages as `registerAiHandlers` does.
    3. Add a test that forces each handler to throw an error containing a fake path, a fake media title and a fake key, and asserts the log call arguments contain none of them.
    4. Search all of `src/main` for other log calls that print raw errors. If one is outside `ipcHandlers.ts`, STOP and report it; do not widen scope.
*   **Acceptance Criteria:** no raw `error.message`, file path, media metadata or key reaches any log call in the two handlers; the test passes; typecheck, vitest, lint, build pass.
*   **Verification:** `automated_command`: `npx vitest run src/main/ipcHandlers.privacy.test.ts`

### T-026d: Spec Sync After Shelf Drag-Out (docs only)
*   **Depends On:** T-026b
*   **Hours:** Agent: 1.0 | Review: 1.0 | Est: 2.0
*   **Tier:** any
*   **Context Pack:** AGENTS.md, DECISIONS (D-014 amendments, D-022, D-023), This task card.
*   **Files:** `Instruction/PRD.md`, `Instruction/DECISIONS.md`, `Instruction/TESTING.md`, `Instruction/STATUS.md`, `Instruction/UI_SPEC.md`
*   **read_files:** `Instruction/PRD.md`, `Instruction/DECISIONS.md`
*   **commit:** `docs: sync spec with shelf drag-out and removed reveal and copy path`
*   **Steps:**
    1. PRD Non-Goals: replace "true drag-out" with "multi-file drag-out, auto-remove or TTL for shelf items, consume-on-drop lifecycle".
    2. PRD: keep IDs stable. Rewrite FR-012b as "FR-012b: superseded by FR-012e." and FR-012c as "FR-012c: superseded by FR-012f." Add FR-012e (Drag-Out: Given a shelf item in the Files tab, When the user drags it onto an Explorer folder or another app that accepts files, Then the file is copied there with its stored name and the shelf item remains; single file only) and FR-012f (Self-Drop Guard: Given a shelf item, When it is dragged back onto the island, Then no duplicate item or file is created).
    3. PRD user flow 2 and the "NOT cuttable" line: replace reveal/copy path with add, list, preview, remove (drag-out is implemented and tested but not part of the minimum).
    4. DECISIONS D-022: change the shelf item in the NOT-cuttable list to "add/list/preview/remove". D-023: move single-file shelf drag-out into the v0.1 scope (post-M2 enhancement, M-021 and M-025 passed); keep multi-file drag-out in Future.
    5. DECISIONS: move the table row at the D-014 amendment (a two-cell row that breaks the table) out of the table into its own "### D-014 amendment" section. Add "(see D-008 amendment below)" after the polling sentence in the D-008 row.
    6. TESTING: in M-016 replace the Notes with "Passed in T-024: drag events reach the collapsed window." Do NOT invent M-024 or M-027; report whether they exist.
    7. STATUS: append one closing line (never delete or rewrite existing text) to the notes of T-025d, T-025f-spike, T-025g, T-025h only where TESTING.md shows the related manual checks passed. For any other case, do not edit; list it in your reply as "owner to confirm".
    8. UI_SPEC: change only lines that still describe a Reveal or Copy Path action menu (ShelfItem). Do not touch other sections.
    9. Do not edit TASKS.md (the traceability table is updated in T-034a), README, source code or package.json.
*   **Acceptance Criteria:** no stale reveal or copy-path wording remains in PRD, DECISIONS and UI_SPEC; the D-014 amendment is no longer a broken table row; existing history in STATUS notes is untouched.
*   **Verification:** `automated_command`: `Select-String -Path Instruction\PRD.md,Instruction\DECISIONS.md,Instruction\UI_SPEC.md -Pattern "reveal/copy","copy/list/reveal","reveal in explorer","copy path"` must print nothing.

### T-026e: Log Hygiene for Weather and Hotkey Handlers
*   **Depends On:** T-026c
*   **Hours:** Agent: 1.0 | Review: 1.0 | Est: 2.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-011, D-016, D-015), This task card.
*   **Files:** `src/main/ipcHandlers.ts`, `src/main/index.ts`, `src/main/ipcHandlers.privacy.test.ts`
*   **read_files:** `src/main/services/weather.ts`, `src/main/services/hotkey.ts`, `src/shared/types.ts`, `src/shared/schemas.ts`, `Instruction/DECISIONS.md`, `Instruction/IPC_SPEC.md`, `Instruction/TESTING.md`
*   **commit:** `fix(ipc): log kode error tetap untuk weather dan hotkey`
*   **Steps:**
    1. Confirm T-026c is done and its privacy test pattern exists before editing.
    2. In weather failure paths, replace raw error logging with channel name plus fixed error code only.
    3. Never log URL, query string, coordinates, provider response body, raw `error.message`, or raw error object.
    4. In hotkey registration failure path in `src/main/index.ts`, log only a fixed error code or generic failure message.
    5. Do not log raw shortcut strings if they are not required for diagnosis.
    6. Extend `src/main/ipcHandlers.privacy.test.ts` with tests that force weather and hotkey failures containing fake coordinates, fake URL fragments, and fake raw error text, then assert no log call receives those strings.
    7. Search all of `src/main` for other raw error logging. If a finding is outside the allowed files, STOP and report it; do not widen scope.
    8. Preserve existing IPC envelope behavior and error codes.
    9. Do not change weather cache behavior, hotkey behavior, settings behavior, renderer, preload, shared, scripts, dependencies, CSP, or Electron security flags.
*   **Acceptance Criteria:** No raw error text, URL, coordinates, query string, provider response body, or shortcut diagnostic string reaches a log call in weather failure or hotkey registration failure paths; privacy tests pass; typecheck, vitest, lint, build pass.
*   **Verification:** `automated_command`: `npx vitest run src/main/ipcHandlers.privacy.test.ts`

### T-027: AI Endpoint Validator & HTTP Client [v0.2]
*   **Depends On:** T-026a
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-007), This task card.
*   **Files:** `src/main/services/aiAdapter.ts`, `src/main/services/aiAdapter.test.ts`
*   **read_files:** `src/shared/schemas.ts`
*   **commit:** `feat(ai): add secure endpoint validator and hardened http client`
*   **Steps:** Implement native fetch client enforcing security rules. **Mandatory Tests:** (a) https accepted, (b) localhost/127.0.0.1/[::1] http accepted, (c) example.com http rejected, (d) redirect rejected, (e) body > 1 MB rejected, (f) non-JSON rejected, (g) empty or >4000 chars rejected, (h) 4xx -> PROVIDER_ERROR no retry, (i) network error 1 retry, (j) 15s timeout aborts.
*   **Verification:** `automated_command`: `npx vitest run src/main/services/aiAdapter.test.ts`

### T-028: Real AI Adapter Wiring [v0.2]
*   **Depends On:** T-027
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-006, D-007), This task card.
*   **Files:** `src/main/services/ai.ts`, `src/renderer/src/components/AiChat.tsx`
*   **read_files:** `src/main/services/aiAdapter.ts`
*   **commit:** `feat(ai): wire real openai-compatible adapter`
*   **Steps:** Provider selection: use real adapter ONLY if `aiEndpoint` and `aiModel` are set; otherwise MockProvider. On real-adapter failure, return error envelope (DO NOT silently switch to Mock). Handle error states inline in UI.
*   **Verification:** `manual_check_id`: M-019

### T-029: Settings Core UI — split into T-029a/T-029b

*   **Status:** split; do not implement as one task.
*   **Replacement:** T-029a and T-029b.
*   **Reason:** Original card mixed main settings IPC, hotkey re-registration, bootstrap wiring, and renderer Settings UI. Split reduces scope and keeps each task within safe edit boundaries.

### T-029a: Settings IPC & Hotkey Re-registration Core
*   **Depends On:** T-026e
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-011, D-015, D-016), IPC_SPEC, DATA_MODEL, This task card.
*   **Files:** `src/main/ipcHandlers.ts`, `src/main/services/hotkey.ts`, `src/main/index.ts`, `src/main/ipcHandlers.settings.test.ts`
*   **read_files:** `src/main/services/store.ts`, `src/main/services/weather.ts`, `src/shared/types.ts`, `src/shared/schemas.ts`, `src/preload/index.ts`, `Instruction/IPC_SPEC.md`, `Instruction/DATA_MODEL.md`, `Instruction/DECISIONS.md`
*   **commit:** `feat(settings): implement settings handlers dan hotkey re-registration`
*   **Steps:**
    1. Confirm existing preload surface already exposes typed settings methods, e.g. `getSettings` and `updateSettings`, and existing IPC_SPEC defines `settings:get` / `settings:update`. If not, STOP and report a scope blocker.
    2. Implement or complete `settings:get` handler returning stored settings according to existing shared types/schemas.
    3. Implement or complete `settings:update` handler validating payload with existing schemas only. Do not invent forbidden type/schema names.
    4. Support core v0.1 settings only: location mode, latitude, longitude, hotkey, and reducedMotion. Do not add AI endpoint, AI model, or AI key handling; those belong to T-030/v0.2.
    5. When location changes, do not manually clear or overwrite `weatherCache`. Weather cache invalidation is already owned by weather service logic. Duplicate invalidation is forbidden.
    6. When hotkey changes, re-register the global shortcut dynamically.
    7. If new hotkey registration fails, keep the old hotkey active and return `VALIDATION_ERROR` with message `"Hotkey unavailable"`.
    8. Hotkey failure logging must follow T-026e hygiene: log only channel/fixed code, never raw error.message.
    9. Wire `registerSettingsHandlers(...)` from main bootstrap if not already wired.
    10. Add tests in `src/main/ipcHandlers.settings.test.ts` covering:
        - valid settings update persists;
        - invalid coordinates rejected;
        - invalid hotkey rejected or falls back safely;
        - failed new hotkey keeps old hotkey;
        - settings location update does not clear weatherCache;
        - no raw error.message logged in hotkey failure path.
    11. Do not modify renderer, preload, shared, scripts, package.json, lockfiles, dependencies, CSS, CSP, Electron security flags, or docs.
*   **Acceptance Criteria:** `settings:get` and `settings:update` work through typed existing preload surface; core settings validate correctly; hotkey re-registration keeps old hotkey on failure; weatherCache is not manually cleared by settings update; privacy/logging hygiene preserved; tests and gates pass.
*   **Verification:** `automated_command`: `npx vitest run src/main/ipcHandlers.settings.test.ts`

### T-029b: Settings UI Tab

*   **Depends On:** T-029a
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, UI_SPEC, DATA_MODEL, This task card.
*   **Files:** `src/renderer/src/components/SettingsForm.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/components/TabBar.tsx`
*   **read_files:** `src/preload/index.ts`, `src/shared/types.ts`, `src/main/ipcHandlers.ts`, `Instruction/UI_SPEC.md`, `Instruction/DATA_MODEL.md`, `Instruction/TESTING.md`
*   **commit:** `feat(ui): bangun tab settings core`
*   **Steps:**
    1. Confirm T-029a is done and `settings:get` / `settings:update` are active in main.
    2. Add a Settings tab to TabBar using an existing lucide-react icon already available in the project. Do not add dependencies.
    3. Render `SettingsForm` in App.tsx when active tab is settings.
    4. Implement core v0.1 settings UI only:
        - location mode;
        - latitude;
        - longitude;
        - hotkey;
        - reducedMotion.
    5. Do not render AI endpoint, AI model, or AI key fields. Those are deferred to T-030/v0.2.
    6. Use typed `window.islandApi` methods only. Do not call `ipcRenderer` directly.
    7. Load current settings on mount using existing typed settings API.
    8. Save settings through existing typed update API.
    9. Show safe validation/error messages only. Do not display raw filesystem paths, provider URLs, coordinates in error logs, chat content, API keys, endpoints, models, or media metadata.
    10. If hotkey update fails, show `"Hotkey unavailable"` or equivalent safe error and preserve current working hotkey state in UI according to main response.
    11. Preserve accessibility:
        - labeled inputs;
        - keyboard reachable;
        - visible focus rings;
        - no color-only status;
        - respects prefers-reduced-motion.
    12. Do not modify main, preload, shared, scripts, package.json, lockfiles, dependencies, CSS, CSP, Electron security flags, or docs.
*   **Acceptance Criteria:** Settings tab appears; core settings can be viewed and updated; AI config fields are absent in v0.1; invalid values produce safe errors; hotkey failure does not crash or silently replace working hotkey; accessibility preserved; gates pass.
*   **Verification:** `manual_check_id`: M-003, M-020

### T-030: Settings UI (AI Config) [v0.2]
*   **Depends On:** T-028, T-029
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-006), This task card.
*   **Files:** `src/renderer/src/components/SettingsForm.tsx`, `src/main/services/store.ts`
*   **read_files:** `src/main/ipcHandlers.ts`
*   **commit:** `feat(settings): add ai config fields and secure key storage`
*   **Steps:** Extend `SettingsForm` with AI inputs. Persist key strictly via `safeStorage`. API key is never returned to Renderer; memory fallback displays "key not persisted" notice.
*   **Verification:** `manual_check_id`: M-019, M-020

### T-031: Wrap Milestone 3
*   **Depends On:** T-029a, T-029b, T-026c, T-026d, T-026e
*   **Hours:** Agent: 0.5 | Review: 1.0 | Est: 1.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, This task card.
*   **Files:** `Instruction/STATUS.md`, `Instruction/HANDOFF.md`
*   **read_files:** `Instruction/STATUS.md`, `Instruction/HANDOFF.md`, `Instruction/TASKS.md`, `Instruction/TESTING.md`
*   **commit:** `chore: wrap milestone 3`
*   **Steps:**
    1. Confirm all M3 tasks are done: T-026a, T-026b, T-026c, T-026d, T-026e, T-029a, T-029b.
    2. Confirm related manual checks are recorded as passed in TESTING.md where required.
    3. Update STATUS.md to summarize M3 completion.
    4. Set T-031 row to `manual-pending` with hash `-`, meaning docs wrap is ready but owner tag is pending.
    5. Update HANDOFF.md: next action is owner creating tag `m3-done`, then M4/T-032.
    6. Run automated gates as sanity check.
    7. Commit docs only.
    8. Do not create, move, or delete any git tag.
    9. Do not push.
*   **Acceptance Criteria:** STATUS.md and HANDOFF.md accurately reflect M3 docs wrap complete, T-031 pending owner tag, no source/package/dependency changes, no tag created by agent, gates pass.
*   **Verification:** `automated_command`: `npm run typecheck && npx vitest run && npm run lint && npm run build`

---
## Milestone 4 (Delivery & Packaging)

### T-032: Packaging, Portable Script & CI
*   **Depends On:** T-031
*   **Hours:** Agent: 1.5 | Review: 1.0 | Human manual: 1.0 | Est: 3.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, DECISIONS (D-019, D-008, D-013, D-014), This task card.
*   **Files:** `electron-builder.yml`, `scripts/make-portable-zip.ps1`, `.github/workflows/release.yml`
*   **read_files:** `package.json`, `package-lock.json`, `src/main/services/media-bridge.ts`, `src/main/index.ts`, `resources/tray-icon.png`, `Instruction/DECISIONS.md`, `Instruction/TESTING.md`, `Instruction/STATUS.md`, `Instruction/HANDOFF.md`
*   **commit:** `chore(release): configure electron-builder dan github actions`
*   **Owner packaging decisions:**
    - `package.json` version remains `0.1.0`.
    - Release Git tag convention is `v0.1.0`, not `v0.1`.
    - `appId`: `com.emoji-island.app`
    - `productName`: `Emoji Island`
    - executable/artifact base name: `EmojiIsland`
    - Windows targets: NSIS setup plus unpacked directory for portable ZIP generation.
    - Portable artifact name: `EmojiIsland-${version}-win-x64-portable.zip`, generated from `dist/win-unpacked`.
    - CI Node version: `22.x`.
    - CI behavior:
      - Pull request: typecheck, vitest, lint, build.
      - Tag `v*`: same quality gates plus Electron-builder packaging and artifact upload.
      - No automatic GitHub Release.
    - Custom packaging icon is deferred. Do not reference `resources/icon.ico` unless it already exists. Runtime tray icon remains `resources/tray-icon.png`.
    - If packaging requires source-code path changes for `scripts/smtc-bridge.ps1` or `resources/tray-icon.png`, STOP and report a scope blocker. Do not modify source code in T-032.
*   **Steps:**
    1. Confirm `electron-builder` is already available as a devDependency or can be invoked without modifying `package.json`/lockfile. If not, STOP and report a dependency scope blocker.
    2. Inspect `src/main/services/media-bridge.ts` and `src/main/index.ts` to determine how the packaged app resolves `scripts/smtc-bridge.ps1` and `resources/tray-icon.png`.
    3. Configure `electron-builder.yml` with owner decisions above.
    4. Ensure Windows build produces:
       - `dist/EmojiIsland-${version}-setup.exe`
       - `dist/win-unpacked/`
    5. Ensure packaging includes the built Electron-vite output and required local resources/scripts without changing source code.
    6. Ensure `scripts/smtc-bridge.ps1` is available to the packaged app. If the existing source path assumes unpacked files, configure `asarUnpack` or `asar` settings accordingly. If source changes are required, STOP and report.
    7. Ensure `resources/tray-icon.png` is available to the packaged app. If source changes are required to resolve it from packaged resources, STOP and report.
    8. Create `scripts/make-portable-zip.ps1` compatible with Windows PowerShell 5.1. It must read version from `package.json` if not supplied and produce `dist/EmojiIsland-${version}-win-x64-portable.zip` from `dist/win-unpacked`.
    9. Create `.github/workflows/release.yml` using Node 22.x, Windows runner, PR quality gates, and tag-triggered packaging/upload artifacts. No GitHub Release creation.
    10. Do not run Electron.
    11. Do not run `npm run dev`.
    12. Do not run `electron-builder` locally unless explicitly owner-approved later; CI/manual M-013 verifies packaging.
    13. Do not create, move, or delete git tags.
    14. Do not push.
*   **Acceptance Criteria:** Packaging config, portable ZIP script, and CI workflow are committed; existing source path assumptions are respected or a scope blocker is reported; gates pass; no dependency/package.json/lockfile change; no tag/push; manual packaging remains pending for human/CI.
*   **Verification:** `manual_check_id`: M-013

### T-033: README & LICENSE
*   **Depends On:** T-032
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, DECISIONS (D-019), UI_SPEC, This task card.
*   **Files:** `README.md`, `LICENSE`
*   **read_files:** `package.json`
*   **commit:** `docs: add readme and license`
*   **Steps:** Write comprehensive `README.md` and `LICENSE`. Include SmartScreen notice, fallbacks, and usage. [SIZE-EXCEPTION: Docs]
*   **Verification:** `manual_check_id`: M-014

### T-034a: Final QA & Soft Targets
*   **Depends On:** T-033
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** any
*   **Context Pack:** AGENTS.md, TESTING.md, This task card.
*   **Files:** `STATUS.md`
*   **read_files:** `STATUS.md`
*   **commit:** `chore: perform full manual qa and record soft targets`
*   **Steps:**
    1. Perform full manual QA checklist M-001 through M-020, including full M-014 hero moment run-through.
    2. Measure soft targets: idle CPU, media polling impact, memory footprint, and startup behavior.
    3. Record QA results and soft targets in Instruction/STATUS.md.
    4. Update Instruction/TASKS.md traceability table:
       - FR-012b and FR-012c marked superseded;
       - FR-012e single-file drag-out added;
       - FR-012f self-drop guard added.
    5. Do not create, move, or delete git tags.
    6. Do not push.
*   **Verification:** `manual_check_id`: M-014

### T-034b: Hero Moment & Wrap M4
*   **Depends On:** T-034a
*   **Hours:** Agent: 0.5 | Review: 1.0 | Est: 1.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, This task card.
*   **Files:** `STATUS.md`
*   **read_files:** `README.md`
*   **commit:** `chore: wrap milestone 4 and project delivery`
*   **Steps:** Record Hero Moment GIF. Add link to README. Commit and tag `m4-done`.
*   **Verification:** `automated_command`: `git tag -l "m4-done"`