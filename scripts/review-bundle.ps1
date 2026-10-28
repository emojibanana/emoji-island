# Builds a compact review bundle for one task, ready to paste into a reviewer chat.
# Usage (from the repo root, after the agent committed the task):
#   powershell -ExecutionPolicy Bypass -File scripts\review-bundle.ps1 -TaskId T-013 -Copy
# Add -SkipGates to skip typecheck/vitest/lint/build (faster).
param(
  [Parameter(Mandatory = $true)][string]$TaskId,
  [string]$Spec = "Instruction",
  [int]$MaxDiffLines = 500,
  [switch]$SkipGates,
  [switch]$Copy
)

$ErrorActionPreference = "Continue"
$out = New-Object System.Collections.Generic.List[string]

function Add-Section([string]$Title, $Lines) {
  $items = @($Lines) | Where-Object { $_ -ne $null }
  if ($items.Count -eq 0) { $items = @("(empty)") }
  $out.Add("## $Title")
  $out.Add('```')
  foreach ($l in $items) { $out.Add([string]$l) }
  $out.Add('```')
  $out.Add("")
}

function Run-Gate([string]$Name, [string]$Cmd) {
  $res = & cmd /c "$Cmd 2>&1"
  $code = $LASTEXITCODE
  Add-Section "Gate: $Name (exit $code)" (@($res) | Select-Object -Last 15)
}

$out.Add("# Review bundle: $TaskId")
$out.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
$out.Add("")

# Task card
$cardText = ""
$tasksPath = Join-Path $Spec "TASKS.md"
if (Test-Path $tasksPath) {
  $tasks = Get-Content $tasksPath -Raw
  $m = [regex]::Match($tasks, "(?ms)^### $([regex]::Escape($TaskId))\b.*?(?=^### |\z)")
  if ($m.Success) { $cardText = $m.Value.Trim() } else { $cardText = "Task card not found: $TaskId" }
} else { $cardText = "Missing file: $tasksPath" }
Add-Section "Task card" ($cardText -split "`r?`n")

# STATUS row
$statusPath = Join-Path $Spec "STATUS.md"
if (Test-Path $statusPath) {
  Add-Section "STATUS row" (Select-String -Path $statusPath -Pattern ([regex]::Escape($TaskId)) | ForEach-Object { $_.Line })
}

# Git state
Add-Section "git log" (git log --oneline -5)
Add-Section "git status (must be clean)" (git status --short)
Add-Section "git show --stat HEAD" (git show HEAD --stat --no-color)

# Diff (truncated)
$diff = @(git show HEAD --no-color)
$total = $diff.Count
$shown = $diff | Select-Object -First $MaxDiffLines
if ($total -gt $MaxDiffLines) { $shown += "... diff truncated: $total lines total, $MaxDiffLines shown" }
Add-Section "Diff of HEAD" $shown

# Forbidden names
$pattern = "testLogDropPath|locationLat|locationLon|originalPath|addedAt|logLevel|storedPath|AppSettingsSchema|WeatherData|MediaInfo"
$hits = Get-ChildItem src -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
  Select-String -Pattern $pattern |
  ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
Add-Section "Forbidden names (must be empty)" $hits

# Security flags
$sec = Get-ChildItem src\main -Recurse -Include *.ts -ErrorAction SilentlyContinue |
  Select-String -Pattern "contextIsolation|sandbox|nodeIntegration|webSecurity|allowRunningInsecureContent" |
  ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
Add-Section "Electron security flags" $sec

# Gates
if (-not $SkipGates) {
  Run-Gate "typecheck" "npm run typecheck"
  Run-Gate "vitest" "npx vitest run"
  Run-Gate "lint" "npm run lint"
  Run-Gate "build" "npm run build"
}

# Write file
$dir = ".review"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$file = Join-Path $dir "bundle-$TaskId.md"
$out | Set-Content -Path $file -Encoding UTF8
Write-Host "Bundle written to $file ($($out.Count) lines)."
Write-Host "Check it for secrets (keys, tokens, private URLs) before pasting it anywhere."
if ($Copy) {
  Get-Content $file -Raw | Set-Clipboard
  Write-Host "Copied to clipboard."
}
