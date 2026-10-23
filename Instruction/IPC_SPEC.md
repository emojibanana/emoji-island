# IPC Specification

## 1. Universal Envelope & Error Codes
All IPC responses from the Main process to the Renderer process MUST follow this exact envelope shape, enforced via shared TypeScript interfaces in `src/shared/types.ts`.

```typescript
export interface IpcResponse<T> {
  ok: boolean;
  data: T | null;
  error: {
    code: ErrorCode;
    message: string;
  } | null;
}
```

**Allowed `ErrorCode` values:**
*   `VALIDATION_ERROR`: Payload failed Zod schema validation, shelf is full (50 items or >500MB), or hotkey registration failed.
*   `STORAGE_ERROR`: Failed to read/write to `electron-store` or disk.
*   `NETWORK_ERROR`: HTTP fetch failed (DNS, connection reset, offline).
*   `TIMEOUT`: Request exceeded configured time limits.
*   `PROVIDER_ERROR`: AI endpoint returned a 4xx/5xx status.
*   `MEDIA_UNAVAILABLE`: Media session cannot be found or controlled.
*   `FILE_TOO_LARGE`: Dropped file or requested image exceeds limits (100 MB per file, or > 2 MB for preview).
*   `UNSUPPORTED_TYPE`: Invalid preview request (e.g., requesting preview for `.exe` or `.svg`).
*   `PATH_INVALID`: File path is a symlink, directory, or outside safe local boundaries.
*   `PERMISSION_DENIED`: OS denied file or window access.
*   `UNKNOWN_ERROR`: Catch-all for unhandled exceptions.

## 2. Validation & Sanitization Rules (Main Process)
*   **Filename Sanitizer:** 
    *   Reject or rewrite reserved names: `CON`, `PRN`, `AUX`, `NUL`, `COM1-COM9`, `LPT1-LPT9`.
    *   Strip illegal characters: `< > : " / \ | ? *`.
    *   Trim trailing dots and spaces.
    *   If a duplicate sanitized name exists, append a counter (e.g., `file-1.jpg`).
    *   Reject if total path length exceeds `240` characters.

## 3. Zod Schemas
These schemas are the single source of truth for IPC validation, located in `src/shared/schemas.ts`. Every handler runs `schema.safeParse` and returns `VALIDATION_ERROR` on failure. Channels with no input take no arguments.

```typescript
const Mode = z.enum(['collapsed', 'expanded']);

// Input Schemas
window:setMode        // in: z.object({ mode: Mode })
window:setInputActive // in: z.object({ active: z.boolean() })
window:setDragActive  // in: z.object({ active: z.boolean() })
shelf:addFromDrop     // in: z.object({ sourcePath: z.string().min(3).max(1024) })
shelf:remove          // in: z.object({ id: z.string().uuid() })
shelf:reveal          // in: z.object({ id: z.string().uuid() })
shelf:copyPath        // in: z.object({ id: z.string().uuid() })
shelf:getPreview      // in: z.object({ id: z.string().uuid() })
ai:send               // in: z.object({ content: z.string().trim().min(1).max(4000) })
media:control         // in: z.object({ action: z.enum(['play','pause','next','previous']) })

// settings:update validation
// All Settings fields are optional, plus aiKey: z.string().min(1).max(512).optional()
// aiEndpoint must be https, or http ONLY for localhost, 127.0.0.1, ::1 (any port).
// latitude (-90 to 90), longitude (-180 to 180).
// hotkey must match: /^(Ctrl|Alt|Shift|Super)(\+(Ctrl|Alt|Shift|Super))*\+[A-Za-z0-9]+|Space$/
```

## 4. IPC Channels
The preload exposes a frozen typed `islandApi`. `window:setInputActive` and `window:setDragActive` use `ipcRenderer.send` (fire-and-forget). All other channels use `ipcRenderer.invoke`.

### Window Management
*   **`window:setMode`** -> `IpcResponse<void>`
    *   Resizes the window bounds manually (used for tab-clicks if collapsed).
*   **`window:setInputActive`** (Fire-and-forget)
    *   Renderer sets `true` when AI input is focused or holds non-whitespace text. Main starts the 300 ms blur-collapse timer ONLY when `false`, and cancels it immediately upon window refocus or receiving `true`.
*   **`window:setDragActive`** (Fire-and-forget)
    *   Renderer sets `true` on `dragenter` over the window, and `false` on `dragleave`/`drop`. 
    *   While `true`: if collapsed, main expands the window within 200 ms and the blur-collapse timer is suspended. When `false`, normal blur rules resume.
    *   *Limitation:* the window receives `dragenter` only while bounds are on screen under the cursor; the collapsed pill (280x40) is the drop target that triggers the expand.

### Settings
*   **`settings:get`** -> `IpcResponse<Settings & { aiKeyPresent: boolean }>`
    *   Returns stored settings. The API key is NEVER returned. Includes `aiKeyPersisted` (boolean from storage) and a derived `aiKeyPresent` (boolean, true if a key exists in safeStorage or memory).
*   **`settings:update`** -> `IpcResponse<Settings>`
    *   Validates payload. If `globalShortcut` registration of a new hotkey fails, keeps the old hotkey and returns `VALIDATION_ERROR` with message "Hotkey unavailable". 
    *   If `aiKey` is sent and `safeStorage` is unavailable, the key is kept in memory and the response includes `aiKeyPersisted=false`.

### Weather
*   **`weather:get`** -> `IpcResponse<{ data: WeatherCache | null; status: 'fresh' | 'stale' | 'offline' }>`
*   **`weather:refresh`** -> `IpcResponse<{ data: WeatherCache | null; status: 'fresh' | 'stale' | 'offline' }>`

### Media
*   **`media:getState`** -> `IpcResponse<{ title: string | null; artist: string | null; status: 'playing' | 'paused' | 'stopped' | 'unavailable'; canControl: boolean }>`
    *   `canControl` is false when D-008 is Degraded or no session exists. Refresh timeout 3s.
*   **`media:control`** -> `IpcResponse<void>`
    *   Timeout 2s. If Degraded, returns `MEDIA_UNAVAILABLE`.
*   **`media:stateChanged`** (Event, Main -> Renderer) -> `MediaState`

### File Shelf
*   **`shelf:list`** -> `IpcResponse<ShelfItemMetadata[]>`
*   **`shelf:addFromDrop`** -> `IpcResponse<ShelfItemMetadata>`
*   **`shelf:remove`** -> `IpcResponse<void>`
*   **`shelf:reveal`** -> `IpcResponse<void>`
*   **`shelf:copyPath`** -> `IpcResponse<void>`
*   **`shelf:getPreview`** -> `IpcResponse<{ dataUrl: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' }>`
    *   The data URL is generated on demand and never persisted. Non-image or > 2 MB returns `UNSUPPORTED_TYPE` or `FILE_TOO_LARGE`.

### AI Chat
*   **`ai:getStatus`** -> `IpcResponse<{ provider: 'mock' | 'openai-compatible'; ready: boolean; isMock: boolean }>`
*   **`ai:getHistory`** -> `IpcResponse<ChatMessage[]>`
*   **`ai:send`** -> `IpcResponse<ChatMessage>`
*   **`ai:clear`** -> `IpcResponse<void>`

## 5. External HTTP Calls & Behaviors

### Open-Meteo
*   GET `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&timezone=auto`
*   Timeout 3s, 1 retry, 1s backoff. Map to `WeatherCache` (epoch ms `updatedAt = Date.now()`). [VERIFY: parameter names against current Open-Meteo docs in the weather task].

### AI (OpenAI-compatible)
*   `aiEndpoint` is a BASE URL (e.g., ending in `/v1`). The adapter appends `/chat/completions`; trim a trailing slash; do not append twice if the URL already ends with `/chat/completions`.
*   **Request:** POST `{base}/chat/completions`, headers `Content-Type: application/json` and `Authorization: Bearer <key>` (omit when no key), body `{ model: aiModel, messages: [<= 8 previous + new user message], stream: false }`.
*   **Response:** Require `choices[0].message.content` as a non-empty string <= 4000 chars (truncate beyond that and mark in text).
*   **Provider Selection (in `ai:send`):**
    *   If `aiEndpoint` and `aiModel` are both set -> use real adapter. Otherwise -> use MockProvider.
    *   If the real adapter fails, return the error envelope and DO NOT silently switch to Mock for that message. The user message is kept in history; no assistant message is stored on failure.
    *   If key missing but endpoint set: send without `Authorization` (local routers may allow it); a 401 maps to `PROVIDER_ERROR` with message "Check API key".
*   **MockProvider:** Returns `"Mock reply: " + first 80 chars of the user message`, `provider='mock'`, `model='mock-v1'`, within 1s, no network.