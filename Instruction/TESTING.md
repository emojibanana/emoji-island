# Testing Strategy & Quality Assurance

## 1. Coverage Strategy
*   **Target:** `>= 70%` line coverage strictly for critical pure-logic modules.
*   **Included Modules:** Zod validation schemas, `electron-store` migration scripts, shelf metadata builders, filename sanitizers, shelf capacity enforcement, AI endpoint validators, AI request builder and response mapper, weather data mapper, IPC envelope helpers, and pure media state mappers.
*   **Excluded Modules:** UI rendering (React components), window management (BrowserWindow lifecycle), SMTC bridge native bindings, drag-and-drop HTML5 glue, System Tray, packaging scripts.
*   **Justification:** Native Electron features, OS-level media integrations, and transparent window behaviors are notoriously flaky in headless CI and are better verified via the manual checklist.

## 2. Automated Tests (Vitest)
*   **Unit Tests:**
    *   `preload.test.ts`: Asserts that `islandApi` exposes exactly the allowed keys defined in `IPC_SPEC.md` and nothing else (no `ipcRenderer`, `require`, etc.).
    *   `security.test.ts`: Verifies the production CSP string matches the ARCHITECTURE exact requirement.
    *   `schemas.test.ts`: Runs edge cases through Zod (e.g., negative coords, oversized strings, missing fields).
    *   `sanitizer.test.ts`: Tests reserved filenames (`CON`, `PRN`), illegal chars, and reject path length > 240 (no truncation).
*   **Integration Tests:** Uses mocked externals (Open-Meteo, Mock AI endpoint). Generates a temporary directory for shelf file copy tests. Never mock internal pure logic.
*   **Libraries:** `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.

## 3. Manual Checklists
For features excluded from automated coverage, verification relies on this manual checklist. Tasks reference these via `manual_check_id`. The status remains `manual-pending` until a human verifies.

| Check ID | Category | Steps to Verify | Expected Outcome | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `M-001` | Overlay | Launch app. Open a normal app (browser or VS Code). | Island is top-center, frameless, transparent, and stays above the normal app. | ✅ | |
| `M-001b` | Overlay (info) | Open an exclusive-fullscreen game/app. | Record whether the island is covered. Informational, not pass/fail. | ✅ | |
| `M-002` | Hotkey | Press `Ctrl+Alt+Space` globally. | Island expands and collapses reliably, centered. | ✅ | Bug B-001: expanded not centered, fix in T-012c |
| `M-003` | Hotkey Conflict | Bind `Ctrl+Alt+Space` in another app first, then launch Island. | Island shows "Hotkey unavailable" notice, doesn't crash, uses Tray to toggle. | ✅ | |
| `M-004` | Focus/Blur | Expand island. Click desktop background. | Island collapses after about 300 ms. | ✅ | |
| `M-005` | Single Instance | Launch app. Launch it again. | Second instance quits immediately; first instance expands/focuses. | ✅ | |
| `M-006` | Tray | Right-click tray icon. | Shows Show/Hide and Quit. Quit unregisters hotkeys and kills process. | ✅ | |
| `M-007` | Weather | Disconnect internet. | Weather UI displays offline badge. | ✅ | |
| `M-008` | Media (Locked) | Play music in Spotify. Test play, pause, next, previous. | UI updates within 2 s. Controls work. | ✅ | |
| `M-008b` | Media Session Discovery | Launch Island with no media playing. Start music in an allowlisted app, e.g. Spotify. Wait up to 10 seconds. Stop music. Start music again without restarting Island. | Newly started media appears without restarting Island. Unavailable state returns after stop. Second start is also detected. Controls work. No orphan powershell.exe. No media metadata logged. | | |
| `M-009` | Media (Degraded) | Close media app. | UI states "Media unavailable" or "No media playing". Buttons disabled. | ✅ | |
| `M-010` | Files Tab & Inline Actions | Drop a file, open Files tab. Click an image item. Click a non-image item. Use Remove icon. Use Preview icon for image. Drag an item out. | Item renders as single row with icon-only actions. No three-dot menu. Image click/icon opens preview. Non-image click does nothing. Remove icon deletes item. Drag-out starts native drag. No layout clipping or shifting. | ✅ | |
| `M-011` | Shelf Remove Integrity | Remove a shelf item. Check Files tab and userData/shelf. Try removing when stored file is missing outside UI. | Metadata and physical file are removed for normal item. Missing stored file produces safe error, no crash, metadata not silently corrupted. No .tmp remains. | ✅ | |
| `M-012` | OS Scaling | Change Windows display scale to 125% and 150%. | Island scales properly via Chromium DIP, layout doesn't break. | | |
| `M-013` | Artifacts | Run NSIS `.exe` and portable `.zip`. | Installs/Runs correctly. SmartScreen warns (expected). | | |
| `M-014` | Hero Moment | Follow step-by-step from `UI_SPEC.md` section 7. | Completes in about 10 s seamlessly. | ✅ | |
| `M-015` | webUtils | Drop a file; check log. | Absolute path received, sandbox still true. | | Confirm PASS recorded in D-012 |
| `M-016` | Drag auto-expand | Drag a file over collapsed pill. | Island expands <= 200 ms, no collapse while dragging. | ✅ | Passed in T-024: drag events reach the collapsed window.  |
| `M-017` | Shelf limits | Drop 51st item; drop file > 100 MB. | Rejected with error banner, nothing copied. | ✅ | |
| `M-018` | Symlink | Drop a symlink/junction. | Rejected (`PATH_INVALID`). | ✅ | |
| `M-019` | AI errors | No key; stop 9router; wrong model. | Inline error text, app stays responsive. | | |
| `M-020` | Settings | Change coordinates, hotkey, endpoint. | Persisted after restart; invalid values rejected. | | |
| `M-021` | Shelf Drag-Out to Explorer | From Files tab, drag one shelf item to an Explorer folder. | Explorer receives a file with correct name/size; shelf item remains. | ✅ | |
| `M-022` | Shelf Drag-Out to Google Drive | Drag one shelf item to Google Drive/browser target. | Target receives file; upload may continue after drag; shelf item remains. Do not treat drag completion as upload completion. | ✅ | |
| `M-023` | Shelf Drag-Out Missing File | Delete the stored shelf file outside the UI, then attempt drag-out from Files tab. | Safe error, no crash, metadata not removed. | ✅ | |
| `M-025` | Shelf Drag-Out Gesture Reliability | Start drag from a ShelfItem at least 20 times on Windows. | Native drag starts consistently; if not, record platform limitation and use fallback. | ✅ | |
| `M-026` | Shelf Drag-Out Cancel | Start drag from Files tab, then drop on empty area/cancel. | Shelf remains intact; UI recovers; no crash. | ✅ | |
| `M-028` | Shelf Self-Drop Guard | Drag a shelf item from Files tab and drop it back onto the island. | No duplicate item is created. Existing item remains. No .tmp remains. No crash. | ✅ | |

## 4. Security & Audit
*   **Dependency Audit:** Run `npm audit` on CI.
*   **Linter:** Strict ESLint rules blocking `any` (unless justified), generic `ipcRenderer` in React, and console.log of API keys.
*   **Secrets Check:** Verify no API keys, endpoints containing credentials, or `safeStorage` bypasses are committed. Verified against ARCHITECTURE.md checklist.