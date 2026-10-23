# Agent Instructions

**Summary:** You are an autonomous coding agent building "Emoji Island", a Windows HUD overlay. 
**Stack:** Electron, React, TypeScript (strict), Tailwind CSS. Scaffold is `electron-vite`.

## Tooling Commands
*   Install: `npm install`
*   Dev (Smoke): `npm run dev`
*   Test: `npx vitest run <path>`
*   Lint: `npm run lint`
*   Commands (typecheck, package) are locked in T-001/T-032 and recorded here.

## Code Style
*   **TypeScript:** Strict mode enabled (`noImplicitAny`).
*   **React:** Functional components, hooks, named exports.
*   **Naming:** kebab-case (files), PascalCase (components/types), camelCase (functions), `domain:action` (IPC channels). No use of 'Dynamic Island' or 'JARVIS'.

## Stop Conditions (Halt and ask human)
1.  Requirement conflict or ambiguity not covered by [ASSUMPTION].
2.  A dependency outside `DECISIONS.md` Allowlist is required.
3.  Tests fail 3 consecutive times on the same logical issue.
4.  A native OS feature (e.g., SMTC, drag-and-drop pathing) completely fails.
5.  A task requires more than 3 source files or >150 lines (excluding tests/docs/CI).
6.  A `Locked` decision in DECISIONS.md needs to be changed.
7.  The SMTC spike passes its 4 h checkpoint without reading a media session (switch to ONE fallback via T-007b) or reaches 8 h total without PASS (set D-008 Degraded and stop; extension needs human approval).
8.  You are asked to implement Gemini, voice, or tool-calling (Future scope).

## Always
*   Read STATUS.md, then DECISIONS rows and `read_files` listed in the task card only.
*   Run the task's verification. GUI tasks: record `manual-pending` in STATUS.md until the human confirms.
*   Do not run a long-lived dev server as verification unless the task says `dev_smoke` (use a timeout).
*   T-020 = T-020-L if D-008 is Locked, T-020-D if Degraded. Mark the other `n/a` in STATUS.md.
*   Create a milestone git tag only AFTER committing the wrap task.
*   v0.2 tasks (T-027, T-028, T-030) are NOT executed during v0.1.

## Never
*   Weaken Electron security (contextIsolation, sandbox, CSP), expose ipcRenderer, or put the API key in the renderer.
*   Commit secrets or execute AI output.
*   Install a package outside the D-003 allowlist, use paid services, add telemetry, login, or remote code.
*   Rename channels, entities, or folders without updating DECISIONS.md.
*   Work on more than one task per session or skip verification.
*   Hardcode development-agent model names into the app.

## Definition of Done
*   Acceptance Criteria in the task card are met.
*   Verification (`automated_command` or `manual_check_id`) passes (or is recorded as manual-pending).
*   No new ESLint or TypeScript compiler errors.
*   Fallback/error states are explicitly handled.
*   Conventional commit created.
*   `STATUS.md` updated to `done` (or `manual-pending`).