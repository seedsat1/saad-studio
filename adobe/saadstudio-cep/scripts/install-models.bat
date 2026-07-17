@echo off
chcp 65001 > NUL
title Saad Studio - AI Models Auto Installer

echo.
echo ========================================================
echo       Saad Studio - AI Whisper Models Auto-Installer
echo       تثبيت نماذج البودكاست والترجمة الآلية تلقائياً
echo ========================================================
echo.

set "SCRIPT_DIR=%~dp0"

powershell -ExecutionPolicy Bypass -Command "^
    $target = [System.Environment]::ExpandEnvironmentVariables('%%APPDATA%%\SaadStudio\runtime\models'); ^
    $source = '%SCRIPT_DIR%'; ^
    Write-Host 'Target Directory:' $target -ForegroundColor Yellow; ^
    New-Item -ItemType Directory -Force -Path $target | Out-Null; ^
    ^
    $map = @{ ^
        'medium' = @('medium', 'whisper medium'); ^
        'large-v3' = @('large-v3', 'whisper large v3'); ^
        'large-v3-turbo' = @('large-v3-turbo', 'whisper large v3 turbo'); ^
        'base' = @('base', 'whisper base') ^
    }; ^
    ^
    foreach ($key in $map.Keys) { ^
        $found = $false; ^
        foreach ($folderName in $map[$key]) { ^
            $srcPath = Join-Path $source $folderName; ^
            if (Test-Path $srcPath) { ^
                $destPath = Join-Path $target $key; ^
                Write-Host ('[+] Installing model [' + $key + '] -> ' + $destPath) -ForegroundColor Cyan; ^
                New-Item -ItemType Directory -Force -Path $destPath | Out-Null; ^
                Copy-Item -Path (Join-Path $srcPath '*') -Destination $destPath -Recurse -Force; ^
                $found = $true; ^
                break; ^
            } ^
        } ^
        if (-not $found) { ^
            Write-Host ('[-] Model [' + $key + '] not present in download folder.') -ForegroundColor Gray; ^
        } ^
    } ^
    Write-Host ''; ^
    Write-Host '[SUCCESS] AI Models installation process completed!' -ForegroundColor Green; ^
"

echo.
echo ========================================================
echo   [✓] تم تثبيت وتفعيل نماذج البودكاست بنجاح!
echo   يمكنك الآن فتح البريمير واستخدام أداة الترجمة الآلية.
echo ========================================================
echo.
pause
