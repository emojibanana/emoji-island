[CmdletBinding()]
param(
    [string]$Version
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$packagePath = Join-Path $repoRoot 'package.json'
$distPath = Join-Path $repoRoot 'dist'
$unpackedPath = Join-Path $distPath 'win-unpacked'

if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) {
    throw 'Required package.json was not found.'
}
if (-not (Test-Path -LiteralPath $distPath -PathType Container)) {
    throw 'Required dist directory was not found.'
}
if (-not (Test-Path -LiteralPath $unpackedPath -PathType Container)) {
    throw 'Required dist/win-unpacked directory was not found.'
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    try {
        $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
        $Version = [string]$package.version
    }
    catch {
        throw 'Could not read the version from package.json.'
    }
}
if ([string]::IsNullOrWhiteSpace($Version)) {
    throw 'A package version is required.'
}

$zipPath = Join-Path $distPath ("EmojiIsland-{0}-win-x64-portable.zip" -f $Version)
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $unpackedPath '*') -DestinationPath $zipPath -CompressionLevel Optimal
Write-Output ("Created portable archive: {0}" -f (Split-Path -Leaf $zipPath))
