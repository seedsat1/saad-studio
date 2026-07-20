param(
    [string]$CertPassword = "123456"
)

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "build-cep.ps1")
& (Join-Path $PSScriptRoot "package-zxp.ps1") -CertPassword $CertPassword
