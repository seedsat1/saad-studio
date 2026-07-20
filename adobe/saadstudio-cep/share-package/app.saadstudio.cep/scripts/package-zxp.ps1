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

function Invoke-ZXPSignCmdWithTimeout {
    param(
        [string]$ExePath,
        [string[]]$ArgumentList,
        [int]$TimeoutSeconds = 20
    )

    $process = Start-Process -FilePath $ExePath -ArgumentList $ArgumentList -PassThru
    $completed = $null -ne ($process | Wait-Process -Timeout $TimeoutSeconds -ErrorAction SilentlyContinue)

    if (-not $completed -and (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }

    return [PSCustomObject]@{
        Completed = $completed
        ExitCode = if ($completed) { $process.ExitCode } else { $null }
    }
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseDir = Join-Path $root "release"
$extensionDir = Join-Path $releaseDir "extension\app.saadstudio.cep"
$zxpPath = Join-Path $releaseDir "SaadStudio.zxp"
$certDir = Join-Path $root "cert"
$certPath = Join-Path $certDir "saadstudio-selfsigned.p12"
$zxpsign = Resolve-ZXPSignCmd -RootDir $root
$tempRoot = Join-Path $env:TEMP "saadstudio-zxp"
$tempExtensionDir = Join-Path $tempRoot "app.saadstudio.cep"
$tempZxpPath = Join-Path $tempRoot "SaadStudio.zxp"
$tempCertRoot = Join-Path $env:TEMP "saadstudio-zxp-cert"
$tempCertPath = Join-Path $tempCertRoot "saadstudio-selfsigned.p12"

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

if (Test-Path $tempRoot) {
    Remove-Item $tempRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
Copy-Item $extensionDir $tempExtensionDir -Recurse

if (Test-Path $tempCertRoot) {
    Remove-Item $tempCertRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $tempCertRoot -Force | Out-Null
Copy-Item $certPath $tempCertPath -Force

if (-not (Test-Path (Join-Path $tempExtensionDir "CSXS\manifest.xml"))) {
    throw "Invalid CEP package: CSXS/manifest.xml not found at extension root."
}

Write-Host "Extension root: $tempExtensionDir"
Write-Host "Manifest: $(Join-Path $tempExtensionDir 'CSXS\manifest.xml')"
Write-Host "Output ZXP: $tempZxpPath"

$signStart = Get-Date

Write-Host "Signing ZXP package..."
$signResult = Invoke-ZXPSignCmdWithTimeout -ExePath $zxpsign -ArgumentList @("-sign", $tempExtensionDir, $tempZxpPath, $tempCertPath, $CertPassword, "-tsa", $TimestampUrl)
if (-not $signResult.Completed -or $signResult.ExitCode -ne 0 -or -not (Test-Path $tempZxpPath)) {
    Write-Warning "Signing with timestamp failed or did not produce a package. Retrying without timestamp..."
    if (Test-Path $tempZxpPath) {
        Remove-Item $tempZxpPath -Force
    }
    $signResult = Invoke-ZXPSignCmdWithTimeout -ExePath $zxpsign -ArgumentList @("-sign", $tempExtensionDir, $tempZxpPath, $tempCertPath, $CertPassword)
}

if (-not (Test-Path $tempZxpPath)) {
    $latestTmpZxp = Get-ChildItem $env:TEMP -Recurse -Filter "tmp.zxp" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -ge $signStart } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestTmpZxp) {
        throw "ZXPSignCmd did not generate the expected ZXP file at $tempZxpPath"
    }

    Write-Host "Verifying latest temporary ZXP package:"
    Write-Host "  $($latestTmpZxp.FullName)"
    & $zxpsign -verify $latestTmpZxp.FullName
    if ($LASTEXITCODE -ne 0) {
        throw "ZXPSignCmd verification failed for $($latestTmpZxp.FullName)"
    }

    Copy-Item $latestTmpZxp.FullName $tempZxpPath -Force
}

Write-Host "Verifying ZXP package..."
& $zxpsign -verify $tempZxpPath
if ($LASTEXITCODE -ne 0) {
    throw "ZXPSignCmd verification failed for $tempZxpPath"
}

Copy-Item $tempZxpPath $zxpPath -Force
$zxpFile = Get-Item $zxpPath

Write-Host ""
Write-Host "ZXP package created successfully:"
Write-Host "  $zxpPath"
Write-Host "Size:"
Write-Host "  $($zxpFile.Length) bytes"
Write-Host "Certificate:"
Write-Host "  $certPath"
