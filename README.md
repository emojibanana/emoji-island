# Emoji Island

Emoji Island is a glanceable Windows HUD overlay for everyday utilities: a clock and weather header, media controls, a file shelf, mock AI chat, and settings in one compact island.

This repository contains v0.1. The current package version is recorded in `package.json`. Release artifact names follow the `EmojiIsland` base configured by the packaging files:

- `EmojiIsland-<version>-setup.exe` (NSIS setup)
- `EmojiIsland-<version>-win-x64-portable.zip` (portable ZIP)

## Features

### Clock & Weather

- Clock and current conditions are always shown in the header.
- Weather uses Open-Meteo and requires no API key.
- Weather data is cached for 30 minutes.
- Cached data is labelled stale for up to 24 hours; after that the UI shows offline.
- Default location is Jakarta, with preset and manual coordinate settings.

### Media

- Windows System Media Transport Controls (SMTC) integration.
- Uses an application allowlist for session selection.
- Artwork is exposed only as a bounded data URL.
- Supports play/pause, next, and previous controls.
- Shows a safe unavailable fallback when no usable media session is detected.
- Media metadata (title, artist, album, path) is never logged.

### Files shelf

- Drop a file onto the island to add an internal copy to the shelf.
- Drag a single shelf row to another application to copy it there; the shelf item remains.
- Original source files are never moved or deleted by drag-out.
- Supported images can be previewed inline.
- Removing a shelf item is always explicit.
- Dragging a shelf item back onto the island is guarded; no duplicate is created.

Out of scope in v0.1: automatic removal, TTL, consume-on-drop, and multi-file drag-out.

### AI Chat

v0.1 uses `MockProvider` only. It runs offline and returns `Mock reply: ` followed by the first 80 characters of the submitted text. No network request, API key, endpoint, or model is involved.

The real OpenAI-compatible adapter and AI endpoint/model/key settings are v0.2 work (T-027, T-028, T-030).

### Settings

- Location: preset or manual latitude/longitude.
- Global hotkey: configurable. Default is `Ctrl+Alt+Space`.
- Reduced motion: toggle for CSS transitions.

AI endpoint, model, and key settings are not present in the v0.1 UI.

## Download for Windows

The easiest way to install Emoji Island is from the **[latest GitHub Release](https://github.com/emojibanana/emoji-island/releases/latest)**.

Download one of these files from the release's **Assets** section:

- **`EmojiIsland-0.1.0-setup.exe`** — recommended for normal installation. Run it and follow the installer.
- **`EmojiIsland-0.1.0-win-x64-portable.zip`** — no-install version. Extract the ZIP to a folder and run `Emoji Island.exe`.

### Direct download links

If you prefer direct links (skip the Release page), use these URLs. They always target the assets from the latest release:

- [Download Emoji Island Installer (.exe)](https://github.com/emojibanana/emoji-island/releases/latest/download/EmojiIsland-0.1.0-setup.exe)
- [Download Emoji Island Portable (.zip)](https://github.com/emojibanana/emoji-island/releases/latest/download/EmojiIsland-0.1.0-win-x64-portable.zip)

If a link returns 404, the latest release does not contain an asset with that filename yet. Use the [latest release page](https://github.com/emojibanana/emoji-island/releases/latest) to check the available asset names.

If the latest release page does not contain downloadable assets yet, open the repository's [Actions](https://github.com/emojibanana/emoji-island/actions) page and download the artifact from the successful packaging workflow, or build from source using the instructions below.

### Windows SmartScreen notice

Release builds are unsigned. Windows SmartScreen may show a warning before installation or first launch. This is expected behavior for unsigned builds. Choose **More info → Run anyway** only if you trust the download source. The project is released under the MIT license and the source is fully auditable; inspect or build from source if you prefer to verify before running.

### Build artifacts

CI (T-032) produces these Windows artifacts for each release tag:

- `EmojiIsland-<version>-setup.exe` — NSIS installer.
- `EmojiIsland-<version>-win-x64-portable.zip` — portable ZIP, no installation needed.


## Usage

- Expand or collapse the island with the configured hotkey (default: `Ctrl+Alt+Space`).
- Use the tray icon (system tray) to show, hide, or quit. The tray is the fallback if the hotkey cannot be registered on your system.
- After expanding, click the clock/weather, media, files, chat, or settings tab.
- Drag a file from your system onto the island to add it to the shelf.
- Drag a single shelf row to another application to copy it there.

## Privacy and security

- Renderer runs with `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.
- Preload exposes a frozen, typed `islandApi`. It does not expose `ipcRenderer`, `require`, `process`, or generic `send`/`invoke`.
- All IPC payloads are validated in the main process using zod.
- No filesystem path, file name, file content, media metadata, chat content, API key, endpoint, or model is logged.
- Shelf files are stored as internal copies under the Electron `userData/shelf` directory; original source files are never moved or deleted by drag-out.
- A successful drag-out means the destination accepted the operation. It does not mean the external application has finished copying or uploading the file.

## Known limitations and scope boundaries

- Unsigned builds: a Windows SmartScreen warning is expected.
- Custom Windows packaging icon deferred; only the runtime tray icon exists in v0.1. A branded `resources/icon.ico` is a small future task.
- Multi-file drag-out is Future scope (D-022/D-023).
- Auto-remove, TTL, and consume-on-drop are not approved.
- The real AI adapter and AI settings are v0.2.
- Linux and macOS are out of scope.
- Multi-monitor auto-hide, voice/tool-calling/shell/system-control by AI, launch-at-login, a light theme, telemetry, and accounts are out of scope.

## Development

Prerequisites:

- Windows
- Node.js 22.x (the version pinned by CI)
- npm

```text
npm install          # install dependencies
npm run typecheck    # TypeScript type check
npm test             # run Vitest unit tests
npm run lint         # ESLint
npm run build        # production build
npm run dev          # development server (hot reload, do not use as a CI gate)
```

Contributors should read the documents in `Instruction/` before making changes. Key files: `AGENTS.md`, `TASKS.md`, `DECISIONS.md`, `UI_SPEC.md`, `IPC_SPEC.md`, `DATA_MODEL.md`, `TESTING.md`.

The full hero-moment demo and final QA are tracked in `TESTING.md` (M-014) and are completed at T-034a. This documentation task does not assert that the full M-014 run-through has been verified here.

## License

MIT License. See [LICENSE](LICENSE).

Copyright (c) 2026 Emoji Island contributors.
