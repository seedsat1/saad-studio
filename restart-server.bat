@echo off
call "%~dp0stop-server.bat"
timeout /t 1 >nul
call "%~dp0start-server.bat"
