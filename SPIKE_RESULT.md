# SMTC Spike Result

Spike task: T-007a (decision D-008, 4 h checkpoint). Throwaway script: `scripts/spike-smtc-a.ps1`.
No npm package was installed; no dependency was added to D-003.

The 4 h checkpoint was met: a media session is readable and controllable, so the fallback
option (T-007b) is not required.

## Primary

**Result: PASS**

**Option evaluated:** PowerShell WinRT bridge to the Windows SMTC API
(`Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager`), driven by
Windows PowerShell 5.1 (`powershell.exe`). The npm-package option was deliberately not
attempted (would need D-003 approval first).

**Windows version:** Windows 11 Home Single Language, 10.0.26200 (build 26200),
64-bit. Host: Windows PowerShell 5.1.26100.9711, 8 logical cores.
Mind the host: the WinRT type projection used here is not available in PowerShell 7
(`pwsh`) without extra modules, so the bridge must run on `powershell.exe` 5.1.

**Media apps tested**

| App | AUMID | What was exercised |
| :--- | :--- | :--- |
| Spotify | `SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify` | title/artist/album/status read, Play, Pause, Next, Previous |
| WhatsApp Desktop | `5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App` | read only (`(14) WhatsApp`, empty artist) |
| none (both apps quit) | - | 0 sessions, 10 s poll, no crash |

Observed read while Spotify was playing:
`title=They Don't Care About Us`, `artist=Michael Jackson`, `status=Playing` (album field also returned).

**Commands used**

```powershell
# read sessions
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/spike-smtc-a.ps1 -Scenario info   -AppContains Spotify
# playback controls
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/spike-smtc-a.ps1 -Scenario controls -AppContains Spotify
# 60 s poll, 3 s interval
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/spike-smtc-a.ps1 -Scenario poll -Seconds 60 -IntervalMs 3000 -AppContains Spotify
# media apps closed
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/spike-smtc-a.ps1 -Scenario closed -Seconds 10 -IntervalMs 3000
```

WinRT members actually used (all asynchronous ones awaited through
`[System.WindowsRuntimeSystemExtensions]` → `AsTask` → `MakeGenericMethod(<result type>)`):

* `GlobalSystemMediaTransportControlsSessionManager.RequestAsync()` — note: **not**
  `GetDefaultAsync()`; that member does not exist and fails with `MethodNotFound`.
* `manager.GetSessions()`, `manager.GetCurrentSession()`
* `session.SourceAppUserModelId`
* `session.TryGetMediaPropertiesAsync()` → `.Title`, `.Artist`, `.AlbumTitle`
* `session.GetPlaybackInfo().PlaybackStatus` (`Playing` / `Paused` / `Stopped` / `Closed` / …)
* `session.TryPlayAsync()`, `TryPauseAsync()`, `TrySkipNextAsync()`, `TrySkipPreviousAsync()` (all return `bool`)

**Latency** (Stopwatch around the awaited WinRT call, single sample each, Spotify target)

| Command | accepted | latency |
| :--- | :--- | :--- |
| Play | true | 32.7 ms |
| Pause | true | 22.3 ms |
| Next | true | 26.4 ms |
| Previous | true | 27.3 ms |

Read latency (poll scenario, 20 samples, includes `GetSessions` + session selection +
`TryGetMediaPropertiesAsync`): **7.66 ms average**, **53.09 ms max**.
Script startup (process + `Add-Type System.Runtime.WindowsRuntime` + `RequestAsync`):
**32–35 ms** per invocation.

**CPU** (process `TotalProcessorTime` delta, startup excluded)

* Polling every 3 s for 60 s while Spotify played: 359.4 ms CPU over 60.4 s =
  **0.60 % of one core**, **0.07 % of the 8-core machine**. 20/20 ticks returned a
  session, 0 errors.
* 10 s with zero media sessions: 46.9 ms over 12.1 s = **0.39 % of one core**.

**Behaviour when the media app is closed**

Both media apps quit, then `-Scenario closed` for 10 s: `sessions_at_start=0`,
4/4 ticks returned `NO_SESSION`, 0 errors, `crashed=false`, process exit code 0.
The bridge survives a missing session and an empty session list. Re-opening the app was
not needed for the script to stay healthy; a new `GetCurrentSession()` / `GetSessions()`
call after launch picks the session up again (verified by the later `info` run).

**Limitations**

1. Not in-process. WinRT from Electron requires either a native module or a child
   `powershell.exe`. This spike only proved the child-process form, one command per
   process, so every call pays the ~33 ms startup.
2. No long-lived bridge yet. A real service needs one persistent `powershell.exe` with a
   line-based stdin/stdout (JSON) protocol, plus restart handling. Not built here.
3. `GetCurrentSession()` is unreliable for picking the app the user is listening to: with
   Spotify playing and WhatsApp Desktop idle, it returned **WhatsApp**. Selection must be
   by `SourceAppUserModelId` allowlist and/or `PlaybackStatus == Playing`.
4. Playback status read immediately after a control command lags by one step. In the same
   run: after `Play` the status still read `Paused`; after `Pause` it read `Playing`
   (700 ms wait between commands). The status must be re-polled, not trusted from the
   post-command read.
5. `Try*Async` returning `true` means the request was accepted by SMTC, not that the app
   actually changed state.
6. AUMIDs are vendor/version-specific strings; mapping them to friendly app names needs a
   separate lookup table.
7. Not measured: `GetTimelineProperties()` (position/duration), thumbnail (`Thumbnail`),
   multiple concurrent sessions of the same app, and private/incognito sessions.
8. The control path is global to the OS: sending Next/Previous changes the user's actual
   playback (observed during this spike — the music track changed).
9. Non-music apps expose junk metadata (`(14) WhatsApp`, no artist).
10. Numbers above are single-run samples on this machine, not statistical averages.

**Recommendation**

Adopt the PowerShell WinRT bridge as the primary media integration (PASS). No npm
dependency, no new D-003 entry, no native build step.

Shape for the real implementation (M2 / T-020-L):

* One persistent `powershell.exe -NoProfile -ExecutionPolicy Bypass` child process,
  spawned by the main process, speaking newline-delimited JSON over stdio
  (`{cmd:"read"}` / `{cmd:"play"}`, responses `{ok, app, title, artist, status}`).
  Same script logic as this spike, but the manager created once and reused.
* Poll every 3 s **only while a session is present and playing** (D-008). The measured
  cost of that is ~0.6 % of one core, so a 3 s interval is affordable.
* Select the session by AUMID allowlist, never by `GetCurrentSession()` alone.
* Treat every failure as non-fatal: no session → report `unavailable`; child process died
  → restart it (bounded retries) and keep the UI alive. The spike shows both paths return
  cleanly instead of throwing.
* Keep this Degraded/`-D` switch in mind: if the child process is unavailable, the media
  UI must still render read-only/empty state.

Because the primary option passed, do **not** run T-007b. T-008 should set D-008 to
`Locked` on the strength of this result, after a human confirms manual check M-008.
