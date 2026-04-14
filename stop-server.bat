@echo off
setlocal
cd /d "%~dp0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  taskkill /PID %%a /T /F >nul 2>nul
)

taskkill /FI "WINDOWTITLE eq SAAD-STUDIO-DEV" /T /F >nul 2>nul

echo [OK] Server stopped (if it was running).
endlocal
