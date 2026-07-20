@echo off
REM Enable CEP PlayerDebugMode so unsigned extensions can be loaded.
REM Adobe checks this flag once per app start, so restart Premiere/AE
REM after running.

reg add "HKCU\Software\Adobe\CSXS.9"  /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f

echo.
echo PlayerDebugMode enabled. Restart Premiere Pro / After Effects.
pause
