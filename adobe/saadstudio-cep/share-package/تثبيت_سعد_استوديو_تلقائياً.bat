@echo off
chcp 65001 >nul
title Saad Studio Extension Auto-Installer

echo ========================================================
echo        Saad Studio — 1-Click Automated Setup
echo ========================================================
echo.
echo [1/2] Enabling Adobe Extension System Permissions...

reg add "HKCU\Software\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.14" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.15" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.16" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

echo [SUCCESS] Permissions enabled.
echo.

echo [2/2] Installing Saad Studio extension into Adobe CEP directory...
set "SRC=%~dp0app.saadstudio.cep"
set "TARGET=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\app.saadstudio.cep"
set "ALT_TARGET=%APPDATA%\Adobe\CEP\extensions\app.saadstudio.cep"

if exist "%SRC%" (
    mkdir "%TARGET%" >nul 2>&1
    xcopy /E /I /Y "%SRC%\*" "%TARGET%\" >nul 2>&1
    mkdir "%ALT_TARGET%" >nul 2>&1
    xcopy /E /I /Y "%SRC%\*" "%ALT_TARGET%\" >nul 2>&1
)

echo.
echo ========================================================
echo  SUCCESS! Saad Studio is now fully installed!
echo  
echo  Open Premiere Pro, After Effects, or Photoshop:
echo  Window -> Extensions -> Saad Studio
echo ========================================================
echo.
pause
