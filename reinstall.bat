@echo off
chcp 65001 >nul
echo ==========================================
echo       Blueprint Plan Reinstall Script
echo ==========================================

echo 1. Cleaning up old dependency files...
if exist node_modules (
    echo    - Removing node_modules directory...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo    - Removing package-lock.json...
    del package-lock.json
)

echo 2. Cleaning npm cache...
call npm cache clean --force

echo 3. Setting environment variables for Electron mirror...
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

echo 4. Installing dependencies (using npmmirror)...
echo    Note: This may take a few minutes. Please wait.
call npm install --registry=https://registry.npmmirror.com

if %errorlevel% neq 0 (
    echo.
    echo [Error] Installation failed. Please check your network or try running 'npm install' manually.
    pause
    exit /b %errorlevel%
)

echo.
echo [Success] Dependencies installed successfully!
echo.
pause
