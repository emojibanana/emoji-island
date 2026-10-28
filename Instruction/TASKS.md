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
*   **Files:** `src/renderer/src/components/MediaCard.tsx`, `src/main/ipcHandlers.ts`
*   **read_files:** `src/shared/schemas.ts`
*   **commit:** `feat(media): add media card ui and ipc handlers`
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
*   **Files:** `src/main/services/shelf.ts`, `src/main/ipcHandlers.ts`
*   **read_files:** `src/main/services/sanitizer.ts`, `src/shared/types.ts`
*   **commit:** `feat(shelf): implement shelf copy service and ipc handlers`
*   **Steps:** Stream-copy to temp file in `userData/shelf`, atomic rename. Wire IPC handlers for `addFromDrop`, `list`, `remove`, `reveal`, `copyPath`.
*   **Verification:** `manual_check_id`: M-011, M-018

### T-023: Shelf Preview Handler & UI List
*   **Depends On:** T-022
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-013), UI_SPEC, This task card.
*   **Files:** `src/main/services/shelfPreview.ts`, `src/renderer/src/components/ShelfList.tsx`, `src/renderer/src/components/ShelfItem.tsx`
*   **read_files:** `src/preload/index.ts`, `src/renderer/src/App.tsx`
*   **commit:** `feat(shelf): build preview handler and shelf ui`
*   **Steps:** `shelf:getPreview` generates base64 data URL. Render `ShelfList` and `ShelfItem` components with action menus.
*   **Verification:** `manual_check_id`: M-010, M-011

### T-024: Drop Zone Wiring
*   **Depends On:** T-023
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-010, D-012), This task card.
*   **Files:** `src/renderer/src/App.tsx`
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

# Tasks: Milestone 3 & 4

---
## Milestone 3 (AI Chat & Settings)

### T-026a: AI Mock Provider & History Store
*   **Depends On:** T-025
*   **Hours:** Agent: 2.0 | Review: 1.0 | Est: 3.0
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DECISIONS (D-006), This task card.
*   **Files:** `src/main/services/ai.ts`, `src/main/ipcHandlers.ts`, `src/main/services/ai.test.ts`
*   **read_files:** `src/shared/types.ts`
*   **commit:** `feat(ai): implement mock provider and history store`
*   **Steps:** Build MockProvider (returns "Mock reply: " + first 80 chars within 1s). Implement chat history array (max 50) and context builder (last 8). Wire `ai:getStatus`, `ai:getHistory`, `ai:send`, `ai:clear`.
*   **Verification:** `automated_command`: `npx vitest run src/main/services/ai.test.ts`

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

### T-029: Settings UI (Core Settings)
*   **Depends On:** T-026a
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** strong
*   **Context Pack:** AGENTS.md, DATA_MODEL, This task card.
*   **Files:** `src/renderer/src/components/SettingsForm.tsx`, `src/main/ipcHandlers.ts`, `src/renderer/src/App.tsx`, `src/renderer/src/components/TabBar.tsx`
*   **read_files:** `src/main/services/store.ts`, `src/main/services/hotkey.ts`
*   **commit:** `feat(settings): build settings ui for location and hotkey`
*   **Steps:** Implement `SettingsForm` for location and hotkey. Add `settings:get` and `settings:update` in `ipcHandlers.ts`. Re-register shortcut dynamically; if hotkey fails, keep old hotkey and return VALIDATION_ERROR "Hotkey unavailable". Register the tab in TabBar and App.tsx.
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
*   **Depends On:** T-029
*   **Hours:** Agent: 0.5 | Review: 1.0 | Est: 1.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, This task card.
*   **Files:** `STATUS.md`
*   **read_files:** `STATUS.md`
*   **commit:** `chore: wrap milestone 3`
*   **Steps:** Update STATUS.md. Commit changes, then create git tag `m3-done`.
*   **Verification:** `automated_command`: `git tag -l "m3-done"`

---
## Milestone 4 (Delivery & Packaging)

### T-032: Packaging, Portable Script & CI
*   **Depends On:** T-031
*   **Hours:** Agent: 1.5 | Review: 1.0 | Est: 2.5
*   **Tier:** any
*   **Context Pack:** AGENTS.md, DECISIONS (D-019), This task card.
*   **Files:** `electron-builder.yml`, `scripts/make-portable-zip.ps1`, `.github/workflows/release.yml`
*   **read_files:** `package.json`
*   **commit:** `chore(release): configure electron-builder and github actions`
*   **Steps:** Configure `electron-builder`. Create PowerShell ZIP fallback script. Add GitHub Actions workflow. [SIZE-EXCEPTION: CI & build scripts]
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
*   **Steps:** Perform full manual QA checklist (M-001 through M-020). Measure soft targets (CPU idle, polling, memory) and record in `STATUS.md`.
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