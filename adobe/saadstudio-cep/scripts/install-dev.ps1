# Install the plugin in CEP debug mode by symlinking it into Adobe's
# extensions folder. Run as Administrator the first time so PowerShell
# can create the symlink (or run with developer mode enabled in Windows).
#
# Before running:
#   1. cd adobe/saadstudio-cep/client && npm install && npm run build
#   2. Set the PlayerDebugMode flag in the registry (see README).
#   3. From an admin PowerShell:  .\scripts\install-dev.ps1
#   4. Restart Premiere / After Effects.
#
# The plugin will appear under Window → Extensions → Saad Studio.

$ErrorActionPreference = "Stop"

$source = (Resolve-Path "$PSScriptRoot\..").Path
$cepRoot = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$linkPath = Join-Path $cepRoot "app.saadstudio.cep"

if (-not (Test-Path $cepRoot)) {
    New-Item -ItemType Directory -Force -Path $cepRoot | Out-Null
}

if (Test-Path $linkPath) {
    Write-Host "Removing existing extension at $linkPath"
    Remove-Item $linkPath -Recurse -Force
}

Write-Host "Linking $source -> $linkPath"
New-Item -ItemType SymbolicLink -Path $linkPath -Target $source | Out-Null

Write-Host ""
Write-Host "Done. Make sure PlayerDebugMode is enabled for CSXS 9–12:"
Write-Host "  reg add HKCU\Software\Adobe\CSXS.9  /v PlayerDebugMode /t REG_SZ /d 1 /f"
Write-Host "  reg add HKCU\Software\Adobe\CSXS.10 /v PlayerDebugMode /t REG_SZ /d 1 /f"
Write-Host "  reg add HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1 /f"
Write-Host "  reg add HKCU\Software\Adobe\CSXS.12 /v PlayerDebugMode /t REG_SZ /d 1 /f"
Write-Host ""
Write-Host "Then restart Premiere Pro / After Effects."
