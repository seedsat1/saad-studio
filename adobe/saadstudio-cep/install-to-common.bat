@echo off
:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ========================================================
    echo ERROR: Please right-click this file and select 'Run as Administrator'
    echo ========================================================
    pause
    exit /b
)

echo Deleting legacy folder from Program Files...
if exist "C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\saadstudio-cep" (
    rd /s /q "C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\saadstudio-cep"
)

echo Creating symbolic junction link pointing to workspace...
mklink /j "C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\saadstudio-cep" "e:\موقع ثاني\next14 ai saas\next14-ai-saas-main\next14-ai-saas-main\adobe\saadstudio-cep"

echo ========================================================
echo SUCCESS: saadstudio-cep is now linked to your workspace!
echo Any updates you build will reflect instantly.
echo ========================================================
pause
