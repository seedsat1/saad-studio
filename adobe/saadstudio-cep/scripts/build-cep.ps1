$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$clientDir = Join-Path $root "client"
$distDir = Join-Path $clientDir "dist"
$releaseDir = Join-Path $root "release"
$stageRoot = Join-Path $releaseDir "extension"
$extensionDir = Join-Path $stageRoot "app.saadstudio.cep"
$manualZip = Join-Path $releaseDir "SaadStudio-manual.zip"
$manifestPath = Join-Path $root "CSXS\manifest.xml"

Write-Host "Building CEP client..."
if (Test-Path $distDir) {
    Remove-Item $distDir -Recurse -Force
}
Push-Location $clientDir
try {
    $npmCommand = if ($env:OS -eq "Windows_NT") { "npm.cmd" } else { "npm" }
    & $npmCommand run build
}
finally {
    Pop-Location
}

if (-not (Test-Path (Join-Path $distDir "index.html"))) {
    throw "Build failed: client/dist/index.html was not generated."
}

if (Test-Path $releaseDir) {
    Remove-Item $releaseDir -Recurse -Force
}

New-Item -ItemType Directory -Path $extensionDir -Force | Out-Null
Copy-Item (Join-Path $root "CSXS") $extensionDir -Recurse
Copy-Item (Join-Path $root "jsx") $extensionDir -Recurse
Copy-Item (Join-Path $root "icons") $extensionDir -Recurse
Copy-Item (Join-Path $root "runtime-manifests") $extensionDir -Recurse
Copy-Item (Join-Path $root "runtime-assets") $extensionDir -Recurse
$ffmpegExe = Join-Path (Split-Path $root -Parent | Split-Path -Parent) "node_modules\ffmpeg-static\ffmpeg.exe"
if (Test-Path $ffmpegExe) {
    $ffmpegDir = Join-Path $extensionDir "tools\ffmpeg"
    New-Item -ItemType Directory -Path $ffmpegDir -Force | Out-Null
    Copy-Item $ffmpegExe (Join-Path $ffmpegDir "ffmpeg.exe") -Force
}
New-Item -ItemType Directory -Path (Join-Path $extensionDir "client") -Force | Out-Null
Copy-Item $distDir (Join-Path $extensionDir "client") -Recurse

$manifest = [xml](Get-Content $manifestPath -Raw)
$bundleVersion = $manifest.ExtensionManifest.ExtensionBundleVersion
$bundleName = $manifest.ExtensionManifest.ExtensionBundleName
$hostNames = @(
    $manifest.ExtensionManifest.ExecutionEnvironment.HostList.Host |
    ForEach-Object { $_.Name }
) -join ", "

$installDoc = @"
# Saad Studio Beta Install Guide

Version: $bundleVersion
Package: SaadStudio.zxp
Hosts: $hostNames

## Recommended installation

1. Install **aescripts + aeplugins ZXP/UXP Installer** or **ZXPInstaller**.
2. Open the installer.
3. Drag SaadStudio.zxp into the installer window.
4. Restart Adobe Premiere Pro or Adobe After Effects.
5. Open the panel from:
   - Window > Extensions > $bundleName

## Alternative manual install

If the installer fails, use SaadStudio-manual.zip:

1. Extract the zip file.
2. Copy the app.saadstudio.cep folder to:
   - Windows: %APPDATA%\Adobe\CEP\extensions\
3. Enable CEP PlayerDebugMode if Adobe blocks unsigned beta panels.
4. Restart the Adobe host app and open:
   - Window > Extensions > $bundleName

## Sign-in note

The beta panel still connects to the existing Saad Studio backend and uses the current panel auth flow. No provider credentials are stored inside the panel package.
"@

$troubleshootingDoc = @"
# Troubleshooting

## The panel does not appear in Premiere Pro or After Effects

- Restart the Adobe app after installation.
- Confirm the extension folder exists under %APPDATA%\Adobe\CEP\extensions\app.saadstudio.cep.
- If you used manual install, make sure the folder contains CSXS\manifest.xml and client\dist\index.html.

## Installer rejects the beta package

- Try the latest **aescripts ZXP/UXP Installer** first.
- If it still fails, use the manual zip package.

## The panel opens but looks blank

- Delete any old manual install folder and reinstall the beta package.
- Confirm client/dist/assets exists inside the installed extension folder.

## Sign-in opens but does not complete

- Confirm the machine can reach https://www.saadstudio.app.
- Retry the connect flow and wait for the browser tab to finish approval.

## Media import works in one app but not the other

- Premiere Pro and After Effects are both enabled in the manifest.
- Restart the host app after upgrading from an older beta.
"@

$notesDoc = @"
Saad Studio Beta release package
Version: $bundleVersion
Bundle name: $bundleName
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Hosts: $hostNames
"@

Set-Content -Path (Join-Path $releaseDir "install.md") -Value $installDoc -Encoding UTF8
Set-Content -Path (Join-Path $releaseDir "troubleshooting.md") -Value $troubleshootingDoc -Encoding UTF8
Set-Content -Path (Join-Path $releaseDir "notes.txt") -Value $notesDoc -Encoding UTF8

Compress-Archive -Path $extensionDir -DestinationPath $manualZip -Force

Write-Host ""
Write-Host "Release staging completed:"
Write-Host "  Extension root: $extensionDir"
Write-Host "  Manual zip:     $manualZip"
Write-Host "  Install doc:    $(Join-Path $releaseDir 'install.md')"
