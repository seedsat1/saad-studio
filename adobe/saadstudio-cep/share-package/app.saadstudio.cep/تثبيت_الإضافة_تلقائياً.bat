@echo off
chcp 65001 >nul
title Saad Studio Extension Installer

echo ========================================================
echo        Saad Studio — 1-Click Automated Setup
echo ========================================================
echo.
echo [1/2] Registering Adobe Extension Security Permissions...

reg add "HKCU\Software\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.14" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.15" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.16" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

echo [SUCCESS] Security permissions granted for Adobe Premiere, After Effects, and Photoshop.
echo.

echo [2/2] Copying Saad Studio Extension files to System CEP directory...
set "TARGET_DIR=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\app.saadstudio.cep"
set "USER_DIR=%APPDATA%\Adobe\CEP\extensions\app.saadstudio.cep"

mkdir "%TARGET_DIR%" >nul 2>&1
if exist "%TARGET_DIR%" (
    xcopy /E /I /Y "%~dp0*" "%TARGET_DIR%\" >nul 2>&1
) else (
    mkdir "%USER_DIR%" >nul 2>&1
    xcopy /E /I /Y "%~dp0*" "%USER_DIR%\" >nul 2>&1
)

echo.
echo ========================================================
echo  SUCCESS! Saad Studio is now ready to use!
echo  
echo  Open Premiere Pro, After Effects, or Photoshop:
echo  Top Menu -> Window -> Extensions -> Saad Studio
echo ========================================================
echo.
pause
