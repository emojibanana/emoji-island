# Project Status

**Legend:** `todo` | `doing` | `done` | `manual-pending` | `skipped` | `n/a` | `conditional` | `deferred (v0.2)`

## Milestones
*   `m0-done`: done
*   `m1-done`: done
*   `m2-done`: pending
*   `m3-done`: pending
*   `m4-done`: pending

## Soft Targets (Recorded at M4)
*   **Idle CPU (%):** pending
*   **Media Polling CPU (%):** pending
*   **Memory (MB):** pending

## Task Ledger

| ID | Title | Status | Last Commit |
| :--- | :--- | :--- | :--- |
| **M0** | **Foundation** | | |
| T-001 | Scaffold & Verify | done | 96d198b |
| T-002 | Tooling & Environment | done | 57d117d |
| T-003 | Types & Zod Schemas | done | c08137e |
| T-004 | Preload islandApi | done | 4678ac0 |
| T-005 | webUtils drop verification | done | b50bdd4 |
| T-006 | Storage Service & Migration | done | 6e18603 |
| T-007a | SMTC spike, primary | done | ccba972 |
| T-007b | SMTC spike, fallback | skipped | - |
| T-008 | Record Spike Result | done | - |
| T-009 | Wrap M0 | done | 60d0896 |
| **M1** | **Island Shell + Weather** | | |
| T-010a | Window Shell & Tray | done | a002f51 |
| T-010b | Minimal IslandPill | done | - |
| T-011 | Single Instance & Hotkey | done | c5e04f7 |
| T-012 | Focus Model & Drag-Expand | done | - |
| T-013 | UI Shell & Transitions | done | - |
| T-014 | Weather Service (Main) | done | - |
| T-015a | Clock & Weather UI | done | - |
| T-015b | Tab bar & Expanded View Wiring | done | 6ea45f3 |
| T-016 | Wrap M1 | done | 2a96867 |
| **M2** | **Media & File Shelf** | | |
| T-020 | Media (active variant: L) | done | - |
| T-020-La | Media Bridge Service (Locked) | done | e726a2b |
| T-020-Lb | Media Card UI & IPC (Locked) | done | c4a473e |
| T-020-D | Media Service (Degraded) | n/a | - |
| T-021 | Shelf Sanitizer & Caps | done | 35b83b0 |
| T-022 | Shelf Copy & IPC Handlers | manual-pending | ee2329c |
| T-023 | Shelf Preview & UI List | todo | - |
| T-024 | Drop Zone Auto-Expand | todo | - |
| T-025 | Wrap M2 | todo | - |
| **M3** | **AI Chat & Settings** | | |
| T-026a | MockProvider & History | todo | - |
| T-026b | AiChat UI & Focus active | todo | - |
| T-027 | Endpoint Validator [v0.2] | deferred (v0.2)| - |
| T-028 | Real Adapter Wire [v0.2] | deferred (v0.2)| - |
| T-029 | Settings Core UI | todo | - |
| T-030 | Settings AI Config [v0.2] | deferred (v0.2)| - |
| T-031 | Wrap M3 | todo | - |
| **M4** | **Delivery & QA** | | |
| T-032 | Packaging & CI | todo | - |
| T-033 | README & LICENSE | todo | - |
| T-034a | Final QA & Soft Targets | todo | - |
| T-034b | Hero Moment & Wrap M4 | todo | - |

## Notes
*   T-003 follow-up: schemas.test.ts rewritten against corrected Settings/Weather/Media/Shelf/AI shapes; covers lat/lon bounds, hotkey regex, endpoint rule (https + http localhost/127.0.0.1/[::1]), uuid shelf ids, path length 3..1024, ai:send trim+4000 cap, all 20 channel input schemas, SettingsPatch omits schemaVersion. schemas.ts: [::1] hostname bracket-strip in endpoint validator; explicit return type on ipcEnvelope. .eslintrc.cjs: varsIgnorePattern '^_' so destructure-to-discard stays warning-free. Verify: typecheck OK, vitest 72/72, lint 0 warnings, build OK, grep for locationLat|locationLon|originalPath|addedAt|logLevel|storedPath|AppSettingsSchema|WeatherData|MediaInfo = empty.
*   T-006 redo: split store into src/main/services/store-logic.ts (PURE: defaults, zod validation via shared schemas, migration by schemaVersion, chat cap 50, corrupt->defaults; no electron import) and src/main/services/store.ts (electron-store + safeStorage wrappers; CryptoProvider injected). Shelf only stores/lists — no eviction (cap = T-021/T-022). API key never in electron-store; memory fallback sets aiKeyPersisted=false. Tests: store-logic.test.ts (10 cases incl. lat/lon/hotkey/endpoint/migration/corrupt/chat-cap), store.test.ts (5 cases with vi.mock('electron'), os.tmpdir()). Verify: typecheck OK, vitest 15/15, lint 0 warnings, build OK, grep deprecated fields empty. All files < 120 lines.
*   T-008: D-008 **Locked** on the T-007a PASS — PowerShell 5.1 WinRT bridge (`powershell.exe` child, newline-delimited JSON over stdio), no npm package, so D-003 is unchanged and T-007b (fallback) is skipped per D-021. Spike numbers: 22-33 ms per control command, 7.66 ms avg / 53 ms max session read, 0.6 % of one core polling every 3 s while playing, no crash with zero sessions. Spike artifacts were kept and moved to `Instruction/spike/` (the doc folder; TASKS.md cards refer to it as `docs/`). **T-020-La reuses `spike-smtc-a.ps1`** as the shipped bridge (fixed path, no user arguments, unpacked from asar in T-032). T-020-L was split into T-020-La (bridge service, Est 2.5) + T-020-Lb (UI & IPC, Est 2.0) = 4.5 h vs 3.0 h before; the +1.5 h is the extra review boundary from the split.
*   T-009: M0 wrap committed. T-009 verification (`git tag -l "m0-done"`) is deferred — the `m0-done` tag is deliberately NOT created by the agent and is created by the owner after this commit.
*   T-012: `src/main/services/focus-controller.ts` is a PURE state machine (no `electron` import; timers + `setMode` injected) holding `mode`/`inputActive`/`dragActive`/`windowFocused`. Rules: blur while expanded starts a single 300 ms collapse timer only when `!inputActive && !dragActive`; cancelled by focus, `inputActive=true`, `dragActive=true`, any mode change, `dispose()`, and `win.on('hide')`. `dragActive=true` while collapsed expands immediately (no delay) and suspends the timer; `dragActive=false` restores normal blur rules. `src/main/ipcHandlers.ts` (`registerWindowHandlers(controller)`) uses `ipcMain.on` for `window:setInputActive`/`window:setDragActive` (invalid payload → `log.warn`, no payload dump) and `ipcMain.handle` for `window:setMode` returning the `IpcEnvelope` (`VALIDATION_ERROR` on bad input). `index.ts` is the only place that touches the window: `applyIslandMode` resizes, sends `window:modeChanged`, and sets `setFocusable(false)` on collapsed / `setFocusable(true)`+`focus()` on expanded; every mode change (hotkey toggle, tray click, second-instance, drag, blur) routes through the controller. Verify: typecheck OK, vitest 129/129 (6 files), lint 0 warnings, build OK, forbidden-pattern grep empty. Status `manual-pending` — M-004 and M-016 need the human.
*   T-013: `App.tsx` now owns the shell — `readMode()` derives `collapsed`/`expanded` from `window.innerWidth > 280` and re-syncs on the `resize` event (no mode channel in IPC_SPEC; the renderer never sizes or moves the window). The root is a full-window flex container (`h-full w-full items-center justify-center`), so the pill/panel is centered by layout instead of being pinned left at 280 px inside the 420 px expanded window — this closes B-001. `key={mode}` remounts the root so the enter animation replays on every mode change. Expanded mode renders an inline glass `<main>` (`rounded-[16px]`, `border-white/[0.12]`, `bg-[rgba(15,15,15,0.88)]`) that fills the window; its content lands in T-015. `index.css` adds `island-enter` / `island-fade` keyframes and the `.island-enter-expanded` (200 ms ease-out) / `.island-enter-collapsed` (180 ms ease-in) classes per UI_SPEC 4, with a `prefers-reduced-motion: reduce` block that drops the scale transform (opacity-only). Verify: typecheck OK, vitest 129/129 (6 files), lint 0 warnings, build OK, forbidden-pattern grep empty. Status `manual-pending` — M-012 and M-002 need the human (no Electron started, per the T-013 card).
*   T-014: `src/main/services/weather.ts` is PURE (no `electron` import; `fetch`, clock, `sleep`, location and cache are injected) — `createWeatherService(deps)` exposes `getWeather()` (cache only) and `refreshWeather()` (network). `deriveStatus()`: `fresh` < 30 min, `stale` <= 24 h, else `offline` (FR-007/D-016). Open-Meteo URL and `current` parameter names were verified against a live response, not just the docs. One attempt = `AbortController` timeout 3 s + `res.ok` check + zod validation of `current` (temperature_2m, apparent_temperature, relative_humidity_2m, weather_code); on failure one retry after 1 s backoff, then the cached value with its derived status (never partial/unvalidated data). `ipcHandlers.ts` adds `registerWeatherHandlers(store)`, which composes the service from `AppStore` and wraps both channels in try/catch; per owner decision the handlers keep `ok: true` for network/timeout/malformed responses (the renderer reads `status`), and only an unexpected exception becomes `UNKNOWN_ERROR`. Card corrected: `src/main/index.ts` added to the T-014 `Files` list (one import + one `registerWeatherHandlers(store)` call next to the existing `registerWindowHandlers`) because the card's file list left the handler with no call site. Location changes invalidate the cache inside the service: `readCache()` drops a cached value whose `latitude`/`longitude` differ from `Settings` (DATA_MODEL.md:9 "Settings ||--o| WeatherCache — determines location"), so `getWeather()` reports `offline` and `refreshWeather()` refetches for the new coordinates. Invalidation therefore lives in T-014, **not** in the settings task — T-029 must not clear `weatherCache` itself (no other task references that key). Verify: typecheck OK, vitest 148/148 (7 files, 19 in weather.test.ts), lint 0 warnings, build OK, forbidden-names grep empty. Verification is `automated_command`, so status is `done`. Post-review fix (commit `fix(weather): null data when offline and invalidate cache on location chan... [truncated]
*   T-015a: `weather-code.ts` pure function maps all UI_SPEC codes to label & iconKey, returning Unknown for invalid/NaN/non-integers. `weather-code.test.ts` covers all 27 mapped conditions plus edge cases (-1, 4, 100, 1.5, NaN). `ClockCard` renders 24-hr time & formatted date with a timeout to the next minute boundary. `WeatherCard` handles loading, error, offline (null data), success with lucide icons, stale & offline badges, and aria roles without color-only indicators. Verify: typecheck OK, vitest 183/183 (8 files, 33 in weather-code.test.ts), lint 0 warnings, build OK. Status `done`.
*   T-015b: Expanded view wires the accessible single-tab clock/weather panel to the guarded 60-second weather poller; collapsed mode never mounts the hook. Verify: typecheck, vitest 183/183, lint, build OK. Manual checks M-007 and M-002 remain pending.
*   T-016: M1 wrap committed (wrap commit `2a96867` `chore: wrap milestone 1`; STATUS hash/note recorded in the two follow-up `docs(status)` commits). Only `Instruction/STATUS.md` changed — no source, test, config or `package.json` file was touched. Gates run on the wrap: typecheck OK, vitest 183/183 (8 files), lint 0 warnings, build OK, forbidden-names grep over `src` empty. T-016 verification (`git tag -l "m1-done"`) is deferred — the `m1-done` tag is deliberately NOT created by the agent and is created by the owner after this commit, same as `m0-done` in T-009.
*   T-020-Lb: MediaCard subscribes to media:stateChanged and exposes play/pause/next/previous controls with disabled unavailable state; main IPC handlers validate media:control and enforce the 2-second timeout from IPC_SPEC. Owner-approved scope correction: src/main/index.ts was touched to instantiate and register the media service because the card Files list omitted the call site; TASKS.md was corrected to include src/main/index.ts. Owner-approved commit-language override: Indonesian commit descriptions are now used for this repo while keeping Conventional Commits type/scope in English. Verify: typecheck OK, vitest 193/193, lint OK, build OK, forbidden-names grep empty. Manual check M-008 passed by human.
*   T-020-D: n/a because D-008 is Locked after the T-007a PASS. The degraded read-only media fallback is not implemented; T-020-La and T-020-Lb are the active media path. Manual check M-009 is not applicable while D-008 remains Locked. If D-008 ever changes to Degraded, update DECISIONS.md first, then reopen T-020-D in a new task session.
*   T-021: Pure shelf sanitizer and capacity checker. sanitizeFilename strips visible Windows-illegal characters, trailing dots/spaces, and prefixes reserved device names; validatePathLength rejects full paths over 240 characters without truncation; canAddItem enforces 50 items, 100 MB per file, and 500 MB total; resolveUniqueFilename performs case-insensitive duplicate resolution while preserving extension. Known point: sanitizeFilename does not yet strip C0 control characters U+0000-U+001F; harden before T-022 uses sanitized names as stored filenames. Verify: typecheck OK, vitest 215/215 with 22 sanitizer tests, lint OK, build OK, forbidden-names grep empty. Automated verification: npx vitest run src/main/services/sanitizer.test.ts.
*   T-022: Shelf copy service and IPC handlers implemented. Post-review fixes: registerShelfHandlers is called from the main bootstrap; temp cleanup uses the actual temp path and removes orphan final files if metadata storage fails; addFromDrop is serialized to prevent concurrent multi-drop races; symlink/path validation is hardened; IPC error-code casts are removed. Owner-approved scope correction: src/main/index.ts was touched to register shelf IPC handlers because the card Files list omitted the call site. Owner-approved security correction: src/preload/index.ts and src/shared/types.ts were touched so the shelf drop path is derived from webUtils.getPathForFile in preload instead of accepting an arbitrary sourcePath string from renderer. Verify: typecheck OK, vitest 216/216, lint OK, build OK, forbidden-names grep empty. Manual checks M-011 and M-018 remain pending by human.
*   T-022: Shelf copy service and IPC handlers implemented. Post-review fixes landed: shelf IPC handlers are registered from the main bootstrap; temp cleanup uses the actual temp path and removes orphan final files if metadata storage fails; addFromDrop is serialized to prevent concurrent multi-drop races; symlink/path validation is hardened; preload shelf drop path is derived through webUtils.getPathForFile; IPC error-code casts are removed. Automated gates pass: typecheck OK, vitest OK, lint OK, build OK, forbidden-names grep empty. Official manual checks remain incomplete: M-011 requires shelf UI actions from T-023, and M-018 requires real drag-drop symlink/junction behavior from T-024. File-input symlink diagnostic resolved the symlink to its target and is not valid M-018 evidence; drag-drop symlink rejection is provisionally treated as a Windows Shell platform limitation until real drop evidence exists or the owner updates D-012/TESTING.md. Status manual-pending. Do not mark T-022 done until M-011 passes and M-018 is either proven, replaced by an owner-approved spec/decision update, or formally deferred with a known limitation.
- shelf:list returns envelope ok:true.
- addFromDrop accepts a valid file and stores metadata.
- duplicate filename resolution works.
- removeShelfItem removes metadata via IPC.
- invalid UUID is rejected with VALIDATION_ERROR.
- file > 100 MB is rejected with FILE_TOO_LARGE.
- revealShelfItem IPC returns ok:true for an existing item.
- copyShelfPath IPC returns ok:true for an existing item.
- no .tmp files observed in checked runs.
- log grep did not reveal sensitive source paths/file names.
- registerShelfHandlers is called.
- no as never casts.
- preload uses webUtils.getPathForFile.
- typecheck, vitest, lint, build pass.