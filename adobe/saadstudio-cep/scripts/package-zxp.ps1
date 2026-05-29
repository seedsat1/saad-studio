param(
    [string]$CertPassword = "123456",
    [string]$CountryCode = "US",
    [string]$StateOrProvince = "NY",
    [string]$Organization = "SaadStudio",
    [string]$CommonName = "SaadStudio",
    [string]$TimestampUrl = "http://timestamp.digicert.com/"
)

$ErrorActionPreference = "Stop"

function Resolve-ZXPSignCmd {
    param([string]$RootDir)

    $candidates = @(
        $env:ZXPSIGNCMD_PATH,
        (Join-Path $RootDir "tools\ZXPSignCmd.exe")
    ) | Where-Object { $_ }

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return (Resolve-Path $candidate).Path
        }
    }

    $cmd = Get-Command "ZXPSignCmd.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    throw "ZXPSignCmd.exe was not found. Put it in adobe/saadstudio-cep/tools/ or set ZXPSIGNCMD_PATH."
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseDir = Join-Path $root "release"
$extensionDir = Join-Path $releaseDir "extension\app.saadstudio.cep"
$zxpPath = Join-Path $releaseDir "SaadStudio.zxp"
$certDir = Join-Path $root "cert"
$certPath = Join-Path $certDir "saadstudio-selfsigned.p12"
$zxpsign = Resolve-ZXPSignCmd -RootDir $root

if (-not (Test-Path $extensionDir)) {
    & (Join-Path $PSScriptRoot "build-cep.ps1")
}

New-Item -ItemType Directory -Path $certDir -Force | Out-Null

if (-not (Test-Path $certPath)) {
    Write-Host "Creating self-signed certificate..."
    & $zxpsign -selfSignedCert $CountryCode $StateOrProvince $Organization $CommonName $CertPassword $certPath
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $certPath)) {
        throw "Failed to create self-signed certificate at $certPath"
    }
}

if (Test-Path $zxpPath) {
    Remove-Item $zxpPath -Force
}

Write-Host "Signing ZXP package..."
& $zxpsign -sign $extensionDir $zxpPath $certPath $CertPassword -tsa $TimestampUrl
$signExit = $LASTEXITCODE

if ($signExit -ne 0 -or -not (Test-Path $zxpPath)) {
    Write-Warning "Signing with timestamp failed or did not produce a package. Retrying without timestamp..."
    if (Test-Path $zxpPath) {
        Remove-Item $zxpPath -Force
    }
    & $zxpsign -sign $extensionDir $zxpPath $certPath $CertPassword
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $zxpPath)) {
        throw "Failed to generate $zxpPath"
    }
}

Write-Host "Verifying ZXP package..."
& $zxpsign -verify $zxpPath
if ($LASTEXITCODE -ne 0) {
    throw "ZXPSignCmd verification failed for $zxpPath"
}

Write-Host ""
Write-Host "ZXP package created successfully:"
Write-Host "  $zxpPath"
Write-Host "Certificate:"
Write-Host "  $certPath"
