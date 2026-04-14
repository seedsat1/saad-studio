param()
$ErrorActionPreference = 'SilentlyContinue'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

$serverDir = Join-Path $root '.server'
$pidFile = Join-Path $serverDir 'dev.pid'

# Stop using PID file
if (Test-Path $pidFile) {
  $pidValue = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pidValue) {
    taskkill /PID $pidValue /T /F | Out-Null
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Fallback: stop anything listening on 3000
$lines = netstat -ano | Select-String ':3000' | Select-String 'LISTENING'
foreach ($line in $lines) {
  $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne '' }
  $pid = $parts[-1]
  if ($pid) { taskkill /PID $pid /T /F | Out-Null }
}

Write-Host '[OK] Dev server stopped (if running).'
