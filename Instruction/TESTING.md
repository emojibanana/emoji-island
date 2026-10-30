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
| `M-008` | Media (Locked) | Play music in Spotify. Test play, pause, next, previous. | UI updates within 2 s. Controls work. | | |
| `M-009` | Media (Degraded) | Close media app. | UI states "Media unavailable" or "No media playing". Buttons disabled. | | |
| `M-010` | Shelf Drop | Drag file <100 MB over pill. Drop. | Island expands on dragenter. File appears in list with preview. | | |
| `M-011` | Shelf Actions | Click Reveal in Explorer. Click Copy Path. | Explorer opens to file. Clipboard contains correct path. | | |
| `M-012` | OS Scaling | Change Windows display scale to 125% and 150%. | Island scales properly via Chromium DIP, layout doesn't break. | | |
| `M-013` | Artifacts | Run NSIS `.exe` and portable `.zip`. | Installs/Runs correctly. SmartScreen warns (expected). | | |
| `M-014` | Hero Moment | Follow step-by-step from `UI_SPEC.md` section 7. | Completes in about 10 s seamlessly. | | |
| `M-015` | webUtils | Drop a file; check log. | Absolute path received, sandbox still true. | | Confirm PASS recorded in D-012 |
| `M-016` | Drag auto-expand | Drag a file over collapsed pill. | Island expands <= 200 ms, no collapse while dragging. | pending | Waits for T-024. Unproven whether Windows sends drag events to a non-focusable window |
| `M-017` | Shelf limits | Drop 51st item; drop file > 100 MB. | Rejected with error banner, nothing copied. | | |
| `M-018` | Symlink | Drop a symlink/junction. | Rejected (`PATH_INVALID`). | | |
| `M-019` | AI errors | No key; stop 9router; wrong model. | Inline error text, app stays responsive. | | |
| `M-020` | Settings | Change coordinates, hotkey, endpoint. | Persisted after restart; invalid values rejected. | | |

## 4. Security & Audit
*   **Dependency Audit:** Run `npm audit` on CI.
*   **Linter:** Strict ESLint rules blocking `any` (unless justified), generic `ipcRenderer` in React, and console.log of API keys.
*   **Secrets Check:** Verify no API keys, endpoints containing credentials, or `safeStorage` bypasses are committed. Verified against ARCHITECTURE.md checklist.