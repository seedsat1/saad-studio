$ErrorActionPreference = "Stop"

$repoExe = Split-Path -Parent $MyInvocation.MyCommand.Path
$adobeRoot = Split-Path -Parent $repoExe
$sourceRoot = Join-Path $adobeRoot "saadstudio-cep\release\extension\saadstudio-cep"
$payloadZip = Join-Path $repoExe "payload.zip"
$installerSource = Join-Path $repoExe "SaadStudioInstaller.cs"
$installerExe = Join-Path $repoExe "SaadStudio-Setup.exe"

if (-not (Test-Path $sourceRoot)) {
    throw "Clean release source was not found. Run npm.cmd run build:cep in saadstudio-cep first."
}

$required = @(
    "CSXS\manifest.xml",
    "client\dist\index.html",
    "jsx\index.jsx",
    "runtime-assets\faster-whisper-captions.py",
    "runtime-assets\faster-whisper-runtime-self-test.py",
    "runtime-manifests\faster-whisper-runtime-lock.json",
    "tools\ffmpeg\ffmpeg.exe",
    "tools\ffmpeg\vcruntime140.dll",
    "tools\ffmpeg\vcruntime140_1.dll",
    "tools\ffmpeg\msvcp140.dll",
    "tools\ffmpeg\concrt140.dll"
)

$missing = @()
foreach ($item in $required) {
    if (-not (Test-Path (Join-Path $sourceRoot $item))) {
        $missing += $item
    }
}
if ($missing.Count -gt 0) {
    throw "Release source is missing required files: $($missing -join ', ')"
}

if (Test-Path $payloadZip) {
    Remove-Item $payloadZip -Force
}
Compress-Archive -Path (Join-Path $sourceRoot "*") -DestinationPath $payloadZip -Force

$cscCandidates = @(
    "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$csc = $cscCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $csc) {
    throw "C# compiler csc.exe was not found."
}

$references = @(
    "/r:System.dll",
    "/r:System.Core.dll",
    "/r:System.Drawing.dll",
    "/r:System.IO.Compression.dll",
    "/r:System.IO.Compression.FileSystem.dll",
    "/r:System.Windows.Forms.dll"
)

& $csc /nologo /target:winexe /platform:anycpu /out:$installerExe "/resource:$payloadZip,SaadStudioInstaller.payload.zip" $references $installerSource
if ($LASTEXITCODE -ne 0) {
    throw "Installer compilation failed."
}

Write-Host "Packaged from clean release: $sourceRoot"
Write-Host "Payload:                     $payloadZip"
Write-Host "Installer:                   $installerExe"
