@echo off
:: Deploy Saad Studio CEP build + jsx to the installed Adobe extension folder.
:: Auto-elevates via UAC (single approval needed).

setlocal
set "SRC=%~dp0"
set "DST=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\saadstudio-cep"

:: Check for admin; if not elevated, relaunch elevated.
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo Copying client/dist -> %DST%\client\dist
xcopy /E /Y /I /Q "%SRC%client\dist\*" "%DST%\client\dist\" >nul
if errorlevel 1 goto :err

echo Copying jsx/index.jsx -> %DST%\jsx\index.jsx
copy /Y "%SRC%jsx\index.jsx" "%DST%\jsx\index.jsx" >nul
if errorlevel 1 goto :err

echo.
echo === DONE ===
echo Now close and reopen Premiere Pro / After Effects to load the new build.
echo.
pause
exit /b 0

:err
echo.
echo *** FAILED. Check that Adobe is closed and try again. ***
pause
exit /b 1
