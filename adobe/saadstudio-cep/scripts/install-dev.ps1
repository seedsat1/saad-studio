# Install the Saad Studio CEP panel for development.
# - Enables PlayerDebugMode for CSXS 9..12
# - Symlinks this folder into Adobe's CEP extensions folder
# Run from an Administrator PowerShell.

$ErrorActionPreference = "Stop"

Write-Host "Enabling CEP PlayerDebugMode..."
foreach ($v in 9, 10, 11, 12) {
    $key = "HKCU:\Software\Adobe\CSXS.$v"
    if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
    Set-ItemProperty -Path $key -Name "PlayerDebugMode" -Value "1" -Type String
    Write-Host "  CSXS.$v enabled"
}

$source = (Resolve-Path "$PSScriptRoot\..").Path
$cepRoot = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$linkPath = Join-Path $cepRoot "app.saadstudio.cep"

if (-not (Test-Path $cepRoot)) {
    New-Item -ItemType Directory -Force -Path $cepRoot | Out-Null
}

if (Test-Path $linkPath) {
    Write-Host "Removing existing link at $linkPath"
    Remove-Item $linkPath -Recurse -Force
}

Write-Host "Linking $source"
Write-Host "     -> $linkPath"
New-Item -ItemType SymbolicLink -Path $linkPath -Target $source | Out-Null

Write-Host ""
Write-Host "Done. Restart Premiere Pro or After Effects, then open:"
Write-Host "  Window > Extensions > Saad Studio"
