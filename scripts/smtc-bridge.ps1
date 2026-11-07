#requires -Version 5.1
<#
Emoji Island SMTC bridge (T-020-La / D-008 Locked).
Shipped as a fixed bundled file. Invoked with NO user-supplied arguments.
Speaks newline-delimited JSON over stdout; reads newline-delimited JSON commands
from stdin.

Protocol (one object per line, no multi-line JSON):
  STDIN  (commands from Node):
    {"cmd":"read"}
    {"cmd":"play"}  {"cmd":"pause"}  {"cmd":"next"}  {"cmd":"previous"}
    {"cmd":"quit"}

  STDOUT (responses to Node):
    {"ok":true,"hasSession":false}
    {"ok":true,"hasSession":true,"title":null,"artist":null,"status":"playing","canControl":true}
    {"ok":false,"error":"<non-sensitive message>"}

Rules enforced here:
  - Session selection: PlaybackStatus == Playing first; otherwise AUMID allowlist.
  - Never GetCurrentSession() alone.
  - Never log/output title or artist in diagnostic fields — only in the data payload.
  - Stdout is the JSON protocol channel only; no Write-Host, no Write-Error to stdout.
#>
[CmdletBinding()]
param()

# Keep the newline-delimited JSON protocol UTF-8 without a BOM.
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# AUMID allowlist — media-only apps whose sessions are accepted even when paused.
# Non-music apps (e.g. WhatsApp) are excluded by this list.
# ---------------------------------------------------------------------------
$AumidAllowlist = @(
    'SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify'
    'Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic'   # Groove/Media Player
    'AppleInc.iTunes_nzyj5cx40ttqa!iTunes'
    'foobar2000'
    'AIMP'
    'MusicBee'
    'WindowsMediaPlayer'
)

# ---------------------------------------------------------------------------
# WinRT bootstrap (Windows PowerShell 5.1 only)
# ---------------------------------------------------------------------------
$MgrType   = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$PropsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$AsTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Invoke-Await {
    param([Parameter(Mandatory)][object]$Operation, [Parameter(Mandatory)][Type]$ResultType)
    $task = $AsTask.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $null = $task.Wait(-1)
    $task.Result
}

$manager = Invoke-Await -Operation ($MgrType::RequestAsync()) -ResultType $MgrType

# ---------------------------------------------------------------------------
# Helper: emit one JSON line to stdout (protocol channel)
# ---------------------------------------------------------------------------
function Write-Json {
    param([hashtable]$Obj)
    # ConvertTo-Json -Compress keeps it on one line.
    [Console]::Out.WriteLine(($Obj | ConvertTo-Json -Compress -Depth 4))
    [Console]::Out.Flush()
}

# ---------------------------------------------------------------------------
# Session selection: Playing first, then AUMID allowlist.
# Never GetCurrentSession() alone.
# ---------------------------------------------------------------------------
function Select-Session {
    try {
        $all = @($manager.GetSessions())
    } catch {
        return $null
    }

    # 1. Prefer a session whose PlaybackStatus is Playing.
    foreach ($s in $all) {
        try {
            if ($s.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing') {
                return $s
            }
        } catch { }
    }

    # 2. Fall back to AUMID allowlist (paused/stopped but known media app).
    foreach ($s in $all) {
        try {
            $aumid = $s.SourceAppUserModelId
            foreach ($allowed in $AumidAllowlist) {
                if ($aumid -like "*$allowed*") {
                    return $s
                }
            }
        } catch { }
    }

    return $null
}

# ---------------------------------------------------------------------------
# Helper: Extract artwork thumbnail as a data URL (T-025d).
# Returns a data URL string or $null if missing/oversized/unsupported.
# ---------------------------------------------------------------------------
function Get-ArtworkDataUrl {
    param($MediaProperties)
    try {
        $thumbnail = $MediaProperties.Thumbnail
        if ($null -eq $thumbnail) { return $null }

        # Open stream
        $streamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
        $stream = Invoke-Await -Operation $thumbnail.OpenReadAsync() -ResultType $streamType
        if ($null -eq $stream) { return $null }

        $size = $stream.Size
        # D-025d: hard limit 200 KiB (204800 bytes)
        if ($size -eq 0 -or $size -gt 204800) {
            $stream.Dispose()
            return $null
        }

        # Convert WinRT stream to .NET stream
        $asStreamForRead = ([System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object {
            $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1
        })[0]
        $netStream = $asStreamForRead.Invoke($null, @($stream))

        # Read bytes
        $bytes = New-Object byte[] $size
        $bytesRead = $netStream.Read($bytes, 0, $size)

        # Detect MIME from magic bytes
        $mime = 'image/jpeg'  # default fallback
        if ($bytesRead -ge 4) {
            $magic = '{0:X2}{1:X2}{2:X2}{3:X2}' -f $bytes[0],$bytes[1],$bytes[2],$bytes[3]
            $mime = switch -Regex ($magic) {
                '^89504E47' { 'image/png' }
                '^FFD8FF'   { 'image/jpeg' }
                '^52494646' { 'image/webp' }
                '^474946'   { 'image/gif' }
                default {
                    # Unsupported format → reject
                    $netStream.Dispose()
                    $stream.Dispose()
                    return $null
                }
            }
        }

        # Base64 encode
        $base64 = [Convert]::ToBase64String($bytes, 0, $bytesRead)
        $dataUrl = "data:$mime;base64,$base64"

        # Cleanup
        $netStream.Dispose()
        $stream.Dispose()

        return $dataUrl
    } catch {
        # Any error → gracefully return null
        return $null
    }
}

# ---------------------------------------------------------------------------
# Read state from a session. Returns a hashtable safe to serialise.
# Title/artist are data payload fields only — never used in diagnostic output.
# ---------------------------------------------------------------------------
function Read-SessionState {
    param($Session)
    if ($null -eq $Session) {
        return @{ ok = $true; hasSession = $false }
    }
    try {
        $props  = Invoke-Await -Operation $Session.TryGetMediaPropertiesAsync() -ResultType $PropsType
        $pbInfo = $Session.GetPlaybackInfo()
        $rawStatus = $pbInfo.PlaybackStatus.ToString().ToLower()
        # Map WinRT PlaybackStatus to our enum: playing/paused/stopped
        $status = switch ($rawStatus) {
            'playing' { 'playing' }
            'paused'  { 'paused'  }
            default   { 'stopped' }
        }

        # T-025d: Extract artwork (null if missing/oversized/unsupported)
        $artworkDataUrl = Get-ArtworkDataUrl -MediaProperties $props

        return @{
            ok             = $true
            hasSession     = $true
            title          = if ($props.Title)  { $props.Title }  else { $null }
            artist         = if ($props.Artist) { $props.Artist } else { $null }
            status         = $status
            canControl     = $true
            artworkDataUrl = $artworkDataUrl
        }
    } catch {
        return @{ ok = $false; error = 'read_failed' }
    }
}

# ---------------------------------------------------------------------------
# Main command loop — reads stdin line by line until "quit" or pipe closes.
# ---------------------------------------------------------------------------
try {
    while ($true) {
        $line = [Console]::In.ReadLine()
        if ($null -eq $line) { break }   # stdin closed → clean exit
        $line = $line.Trim()
        if ($line -eq '') { continue }

        $cmd = $null
        try {
            $parsed = $line | ConvertFrom-Json
            $cmd = $parsed.cmd
        } catch {
            Write-Json @{ ok = $false; error = 'malformed_input' }
            continue
        }

        switch ($cmd) {
            'read' {
                $session = Select-Session
                $state   = Read-SessionState -Session $session
                Write-Json $state
            }
            'play' {
                $session = Select-Session
                if ($null -eq $session) { Write-Json @{ ok = $false; error = 'no_session' }; break }
                try {
                    $accepted = Invoke-Await -Operation $session.TryPlayAsync() -ResultType ([bool])
                    Write-Json @{ ok = $true; accepted = $accepted }
                } catch { Write-Json @{ ok = $false; error = 'cmd_failed' } }
            }
            'pause' {
                $session = Select-Session
                if ($null -eq $session) { Write-Json @{ ok = $false; error = 'no_session' }; break }
                try {
                    $accepted = Invoke-Await -Operation $session.TryPauseAsync() -ResultType ([bool])
                    Write-Json @{ ok = $true; accepted = $accepted }
                } catch { Write-Json @{ ok = $false; error = 'cmd_failed' } }
            }
            'next' {
                $session = Select-Session
                if ($null -eq $session) { Write-Json @{ ok = $false; error = 'no_session' }; break }
                try {
                    $accepted = Invoke-Await -Operation $session.TrySkipNextAsync() -ResultType ([bool])
                    Write-Json @{ ok = $true; accepted = $accepted }
                } catch { Write-Json @{ ok = $false; error = 'cmd_failed' } }
            }
            'previous' {
                $session = Select-Session
                if ($null -eq $session) { Write-Json @{ ok = $false; error = 'no_session' }; break }
                try {
                    $accepted = Invoke-Await -Operation $session.TrySkipPreviousAsync() -ResultType ([bool])
                    Write-Json @{ ok = $true; accepted = $accepted }
                } catch { Write-Json @{ ok = $false; error = 'cmd_failed' } }
            }
            'quit' {
                break
            }
            default {
                Write-Json @{ ok = $false; error = 'unknown_cmd' }
            }
        }

        if ($cmd -eq 'quit') { break }
    }
} catch {
    # Unhandled — exit cleanly so Node detects the process death and can restart.
    exit 1
}

exit 0
