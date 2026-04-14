@echo off
setlocal
cd /d "%~dp0"
start "SAAD-STUDIO-DEV" cmd /k "cd /d "%~dp0" && npm run dev"
echo [OK] Server starting in a new window: SAAD-STUDIO-DEV
echo URL: http://localhost:3000
endlocal
