param()
$ErrorActionPreference = 'SilentlyContinue'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

$serverDir = Join-Path $root '.server'
if (!(Test-Path $serverDir)) {
  New-Item -ItemType Directory $serverDir | Out-Null
}

$pidFile = Join-Path $serverDir 'dev.pid'
$logFile = Join-Path $serverDir 'dev.log'

# Stop previous PID if exists
if (Test-Path $pidFile) {
  $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($oldPid) {
    taskkill /PID $oldPid /T /F | Out-Null
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Start dev server in background
$p = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','dev') -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $logFile

$p.Id | Out-File -FilePath $pidFile -Encoding ascii -Force

Write-Host '[OK] Dev server started.'
Write-Host 'URL: http://localhost:3000'
Write-Host ('PID: ' + $p.Id)
Write-Host ('Log: ' + $logFile)
