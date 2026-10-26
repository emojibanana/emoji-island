# Project Status

**Legend:** `todo` | `doing` | `done` | `manual-pending` | `skipped` | `n/a` | `conditional` | `deferred (v0.2)`

## Milestones
*   `m0-done`: done
*   `m1-done`: pending
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
| T-012 | Focus Model & Drag-Expand | todo | - |
| T-013 | UI Shell & Transitions | todo | - |
| T-014 | Weather Service (Main) | todo | - |
| T-015 | Clock & Weather UI | todo | - |
| T-016 | Wrap M1 | todo | - |
| **M2** | **Media & File Shelf** | | |
| T-020 | Media (active variant: L) | todo | - |
| T-020-La | Media Bridge Service (Locked) | todo | - |
| T-020-Lb | Media Card UI & IPC (Locked) | todo | - |
| T-020-D | Media Service (Degraded) | n/a | - |
| T-021 | Shelf Sanitizer & Caps | todo | - |
| T-022 | Shelf Copy & IPC Handlers | todo | - |
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
