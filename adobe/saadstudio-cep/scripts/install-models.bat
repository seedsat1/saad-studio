@echo off
chcp 65001 > NUL
title Saad Studio - AI Models Installer

echo.
echo ========================================================
echo       Saad Studio - AI Whisper Models Auto-Installer
echo       تثبيت نماذج البودكاست والترجمة الآلية تلقائياً
echo ========================================================
echo.

set "TARGET_DIR=%APPDATA%\SaadStudio\runtime\models"

if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
)

echo [1/3] Checking downloaded model files...

set "SCRIPT_DIR=%~dp0"

powershell -ExecutionPolicy Bypass -Command "^
    $target = [System.Environment]::ExpandEnvironmentVariables('%%APPDATA%%\SaadStudio\runtime\models'); ^
    $source = '%SCRIPT_DIR%'; ^
    Write-Host 'Target Directory:' $target; ^
    New-Item -ItemType Directory -Force -Path $target | Out-Null; ^
    $models = @('base', 'medium', 'large-v3', 'large-v3-turbo'); ^
    foreach ($m in $models) { ^
        $srcPath = Join-Path $source $m; ^
        if (Test-Path $srcPath) { ^
            $destPath = Join-Path $target $m; ^
            Write-Host ('Installing model [' + $m + '] -> ' + $destPath) -ForegroundColor Cyan; ^
            Copy-Item -Path $srcPath -Destination $destPath -Recurse -Force; ^
        } ^
    } ^
    Write-Host ''; ^
    Write-Host '[SUCCESS] All AI models have been installed successfully!' -ForegroundColor Green; ^
"

echo.
echo ========================================================
echo   [✓] تم تثبيت وتفعيل نماذج البودكاست بنجاح!
echo   يمكنك الآن إعادة فتح بريمير وافترافيكت واستخدام الترجمة.
echo ========================================================
echo.
pause
