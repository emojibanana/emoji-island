#requires -Version 5.1
<#
T-007a spike (throwaway): PowerShell WinRT bridge to Windows SMTC.
No npm dependency. Runs on Windows PowerShell 5.1 (powershell.exe), NOT pwsh 7.

  powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/spike-smtc-a.ps1 -Scenario info
  ... -Scenario controls
  ... -Scenario poll   -Seconds 60 -IntervalMs 3000
  ... -Scenario closed -Seconds 10 -IntervalMs 3000
#>
[CmdletBinding()]
param(
    [ValidateSet('info', 'controls', 'poll', 'closed')]
    [string]$Scenario = 'info',
    [int]$Seconds = 60,
    [int]$IntervalMs = 3000,
    [string]$AppContains = ''
)

$ErrorActionPreference = 'Stop'
$out = { param($k, $v) Write-Output ("{0}={1}" -f $k, $v) }

$MgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
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

function Get-SmtcManager { Invoke-Await -Operation ($MgrType::RequestAsync()) -ResultType $MgrType }

function Read-SmtcSession {
    param($Session)
    if ($null -eq $Session) {
        return [pscustomobject]@{ App = ''; Title = ''; Artist = ''; Album = ''; Status = 'NO_SESSION' }
    }
    $props = Invoke-Await -Operation $Session.TryGetMediaPropertiesAsync() -ResultType $PropsType
    [pscustomobject]@{
        App    = $Session.SourceAppUserModelId
        Title  = $props.Title
        Artist = $props.Artist
        Album  = $props.AlbumTitle
        Status = $Session.GetPlaybackInfo().PlaybackStatus.ToString()
    }
}

function Get-CpuSnapshot { [System.Diagnostics.Process]::GetCurrentProcess().TotalProcessorTime }

function Get-Sessions { @($manager.GetSessions()) }

function Select-SmtcSession {
    $all = Get-Sessions
    if ($AppContains) {
        $all = @($all | Where-Object { $_.SourceAppUserModelId -like "*$AppContains*" })
    }
    if ($all.Length -gt 0) { return $all[0] }
    return $null
}

function Write-Cpu {
    param([TimeSpan]$Cpu, [TimeSpan]$Wall)
    $pct1 = if ($Wall.TotalMilliseconds -gt 0) { 100 * $Cpu.TotalMilliseconds / $Wall.TotalMilliseconds } else { 0 }
    & $out 'cpu_ms' ([math]::Round($Cpu.TotalMilliseconds, 1))
    & $out 'cpu_pct_one_core' ([math]::Round($pct1, 2))
    & $out 'cpu_pct_total' ([math]::Round($pct1 / [Environment]::ProcessorCount, 2))
}

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$manager = Get-SmtcManager
& $out 'startup_ms' ([math]::Round($sw.Elapsed.TotalMilliseconds, 1))
& $out 'ps_version' $PSVersionTable.PSVersion.ToString()
& $out 'cores' ([Environment]::ProcessorCount)
& $out 'scenario' $Scenario

switch ($Scenario) {

    'info' {
        $sessions = Get-Sessions
        $i = 0
        foreach ($s in $sessions) {
            $info = Read-SmtcSession -Session $s
            & $out "session[$i].app" $info.App
            & $out "session[$i].title" $info.Title
            & $out "session[$i].artist" $info.Artist
            & $out "session[$i].album" $info.Album
            & $out "session[$i].status" $info.Status
            $i++
        }
        & $out 'sessions' $i
        $cur = Read-SmtcSession -Session $manager.GetCurrentSession()
        & $out 'current.app' $cur.App
        & $out 'current.title' $cur.Title
        & $out 'current.artist' $cur.Artist
        & $out 'current.status' $cur.Status
        & $out 'app_filter' $AppContains
        $sel = Select-SmtcSession
        if ($null -ne $sel) { & $out 'selected.app' $sel.SourceAppUserModelId } else { & $out 'selected.app' 'NONE' }
    }

    'controls' {
        $session = Select-SmtcSession
        & $out 'app_filter' $AppContains
        if ($null -eq $session) { & $out 'result' 'NO_SESSION'; break }
        & $out 'target.app' $session.SourceAppUserModelId

        $actions = [ordered]@{
            Play     = { param($s) $s.TryPlayAsync() }
            Pause    = { param($s) $s.TryPauseAsync() }
            Next     = { param($s) $s.TrySkipNextAsync() }
            Previous = { param($s) $s.TrySkipPreviousAsync() }
        }

        foreach ($name in $actions.Keys) {
            $timer = [System.Diagnostics.Stopwatch]::StartNew()
            $ok = Invoke-Await -Operation (& $actions[$name] $session) -ResultType ([bool])
            $timer.Stop()
            $after = Read-SmtcSession -Session $session
            & $out "cmd.$name.accepted" $ok
            & $out "cmd.$name.latency_ms" ([math]::Round($timer.Elapsed.TotalMilliseconds, 1))
            & $out "cmd.$name.status_after" $after.Status
            Start-Sleep -Milliseconds 700
        }
    }

    'poll' {
        $cpu0 = Get-CpuSnapshot
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        $ticks = 0; $withSession = 0; $noSession = 0; $errors = 0; $maxSessions = 0
        $readTotal = 0.0; $readMax = 0.0
        while ($timer.Elapsed.TotalSeconds -lt $Seconds) {
            try {
                $r = [System.Diagnostics.Stopwatch]::StartNew()
                $sessions = Get-Sessions
                $session = Select-SmtcSession
                if ($null -eq $session) { $session = $manager.GetCurrentSession() }
                $info = Read-SmtcSession -Session $session
                $r.Stop()
                $readTotal += $r.Elapsed.TotalMilliseconds
                if ($r.Elapsed.TotalMilliseconds -gt $readMax) { $readMax = $r.Elapsed.TotalMilliseconds }
                if ($sessions.Length -gt $maxSessions) { $maxSessions = $sessions.Length }
                $ticks++
                if ($info.Status -eq 'NO_SESSION') { $noSession++ } else { $withSession++ }
                if ($ticks -eq 1) {
                    & $out 'first.title' $info.Title
                    & $out 'first.artist' $info.Artist
                    & $out 'first.status' $info.Status
                    & $out 'first.app' $info.App
                }
            }
            catch { $errors++ }
            Start-Sleep -Milliseconds $IntervalMs
        }
        $timer.Stop()
        $cpu1 = Get-CpuSnapshot
        & $out 'window_s' ([math]::Round($timer.Elapsed.TotalSeconds, 1))
        & $out 'ticks' $ticks
        & $out 'ticks_with_session' $withSession
        & $out 'ticks_no_session' $noSession
        & $out 'ticks_error' $errors
        if ($ticks -gt 0) {
            & $out 'read_ms_avg' ([math]::Round($readTotal / $ticks, 2))
            & $out 'read_ms_max' ([math]::Round($readMax, 2))
        }
        & $out 'max_sessions' $maxSessions
        Write-Cpu -Cpu ($cpu1 - $cpu0) -Wall $timer.Elapsed
        & $out 'crashed' 'false'
    }

    'closed' {
        $sessions = Get-Sessions
        & $out 'sessions_at_start' $sessions.Length
        $cpu0 = Get-CpuSnapshot
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        $ticks = 0; $noSession = 0; $errors = 0
        while ($timer.Elapsed.TotalSeconds -lt $Seconds) {
            try {
                $info = Read-SmtcSession -Session $manager.GetCurrentSession()
                $ticks++
                if ($info.Status -eq 'NO_SESSION') { $noSession++ }
            }
            catch { $errors++ }
            Start-Sleep -Milliseconds $IntervalMs
        }
        $timer.Stop()
        & $out 'window_s' ([math]::Round($timer.Elapsed.TotalSeconds, 1))
        & $out 'ticks' $ticks
        & $out 'ticks_no_session' $noSession
        & $out 'ticks_error' $errors
        Write-Cpu -Cpu ((Get-CpuSnapshot) - $cpu0) -Wall $timer.Elapsed
        & $out 'crashed' 'false'
    }
}

& $out 'exit_code' 0
exit 0
