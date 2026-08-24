@echo off
chcp 65001 > NUL
title Saad Studio - AI Models Auto Installer

echo.
echo ========================================================
echo       Saad Studio - AI Whisper Models Auto-Installer
echo ========================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "PS1_FILE=%TEMP%\saadstudio-install-models-%RANDOM%.ps1"

> "%PS1_FILE%" echo $ErrorActionPreference = 'Stop'
>> "%PS1_FILE%" echo $target = Join-Path $env:LOCALAPPDATA 'SaadStudio\models\faster-whisper'
>> "%PS1_FILE%" echo $source = '%SCRIPT_DIR%'
>> "%PS1_FILE%" echo Write-Host 'Target Directory:' $target -ForegroundColor Yellow
>> "%PS1_FILE%" echo New-Item -ItemType Directory -Force -Path $target ^| Out-Null
>> "%PS1_FILE%" echo $map = @{
>> "%PS1_FILE%" echo   'medium' = @('medium', 'whisper medium');
>> "%PS1_FILE%" echo   'large-v3' = @('large-v3', 'whisper large v3');
>> "%PS1_FILE%" echo   'large-v3-turbo' = @('large-v3-turbo', 'whisper large v3 turbo');
>> "%PS1_FILE%" echo   'base' = @('base', 'whisper base')
>> "%PS1_FILE%" echo }
>> "%PS1_FILE%" echo foreach ($key in $map.Keys) {
>> "%PS1_FILE%" echo   $found = $false
>> "%PS1_FILE%" echo   foreach ($folderName in $map[$key]) {
>> "%PS1_FILE%" echo     $srcPath = Join-Path $source $folderName
>> "%PS1_FILE%" echo     if (Test-Path $srcPath) {
>> "%PS1_FILE%" echo       $destPath = Join-Path $target $key
>> "%PS1_FILE%" echo       Write-Host ('[+] Installing model [' + $key + '] -> ' + $destPath) -ForegroundColor Cyan
>> "%PS1_FILE%" echo       if (Test-Path $destPath) { Remove-Item $destPath -Recurse -Force }
>> "%PS1_FILE%" echo       New-Item -ItemType Directory -Force -Path $destPath ^| Out-Null
>> "%PS1_FILE%" echo       Copy-Item -Path (Join-Path $srcPath '*') -Destination $destPath -Recurse -Force
>> "%PS1_FILE%" echo       $found = $true
>> "%PS1_FILE%" echo       break
>> "%PS1_FILE%" echo     }
>> "%PS1_FILE%" echo   }
>> "%PS1_FILE%" echo   if (-not $found) { Write-Host ('[-] Model [' + $key + '] not present in download folder.') -ForegroundColor Gray }
>> "%PS1_FILE%" echo }
>> "%PS1_FILE%" echo Write-Host ''
>> "%PS1_FILE%" echo Write-Host '[SUCCESS] AI Models installation process completed!' -ForegroundColor Green

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_FILE%"
set "INSTALL_EXIT=%ERRORLEVEL%"
del "%PS1_FILE%" >NUL 2>NUL
if not "%INSTALL_EXIT%"=="0" (
  echo.
  echo [ERROR] AI Models installation failed.
  pause
  exit /b %INSTALL_EXIT%
)

echo.
echo ========================================================
echo   Models installed. Restart Premiere Pro before captions.
echo ========================================================
echo.
pause
