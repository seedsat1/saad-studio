param(
    [switch]$RunApp
)

Write-Host "=== Electron App Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check critical files
$checks = @(
    @{ Name = "resources.pak"; Path = ".\resources.pak" },
    @{ Name = "resources/app.asar"; Path = ".\resources\app.asar" },
    @{ Name = "snapshot_blob.bin"; Path = ".\snapshot_blob.bin" },
    @{ Name = "v8_context_snapshot.bin"; Path = ".\v8_context_snapshot.bin" },
    @{ Name = "icudtl.dat"; Path = ".\icudtl.dat" }
)

$allOk = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "✓ $($check.Name) - Found" -ForegroundColor Green
    } else {
        Write-Host "✗ $($check.Name) - MISSING" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""
Write-Host "=== DLL Files ===" -ForegroundColor Cyan
$dlls = Get-ChildItem -Path ".\*.dll" | Select-Object Name
Write-Host "Found $($dlls.Count) DLL files"
$dlls | ForEach-Object { Write-Host "  ✓ $_" -ForegroundColor Green }

Write-Host ""
Write-Host "=== Locales ===" -ForegroundColor Cyan
$locales = Get-ChildItem -Path ".\locales" -Filter "*.pak" | Measure-Object
Write-Host "Found $($locales.Count) locale files"

Write-Host ""
if ($allOk) {
    Write-Host "Status: All critical files present ✓" -ForegroundColor Green
    
    if ($RunApp) {
        Write-Host ""
        Write-Host "Starting Saad Agent..." -ForegroundColor Yellow
        & ".\Saad Agent.exe"
    }
} else {
    Write-Host "Status: Some files are missing ✗" -ForegroundColor Red
    Write-Host "Please reinstall the application." -ForegroundColor Yellow
}
