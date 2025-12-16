@echo off
chcp 65001 > nul
setlocal

rem ================================================================
rem Blueprint Plan - Unified Build & Launch Script (v2) for Windows
rem
rem This script provides a menu to simplify launching the
rem Blueprint Plan application on different platforms.
rem ================================================================

rem --- Main Program ---
:main
cls
call :print_header
call :check_dependencies
if %errorlevel% neq 0 exit /b 1

:main_menu
rem Main menu
echo Please select a launch option:
echo   1. Web (Run in browser)
echo   2. Desktop (Launch Electron app)
echo   3. Mobile (Build and prepare Android app)
echo   4. Exit
echo.

choice /c 1234 /n /m "Enter your choice [1-4]: "

if errorlevel 4 (
    echo.
    echo Goodbye!
    goto :eof
)
if errorlevel 3 goto build_mobile
if errorlevel 2 goto start_electron
if errorlevel 1 goto start_web

echo.
echo Invalid choice, please try again.
pause
goto main_menu

rem --- Subroutines ---

:print_header
    echo ==========================================
    echo      Blueprint Plan - Launcher
    echo ==========================================
    echo.
    goto :eof

:check_dependencies
    if not exist "node_modules" (
        echo.
        echo Warning: node_modules directory not found.
        choice /c yn /m "Run 'npm install' now to install dependencies? "
        rem ERRORLEVEL 1 is y, 2 is n. Check from high to low.
        if errorlevel 2 (
            echo.
            echo Operation cancelled. Please install dependencies manually.
            pause
            exit /b 1
        )
        rem This will run if errorlevel is 1
        echo.
        echo Installing dependencies...
        call npm install
        if %errorlevel% neq 0 (
            echo npm install failed.
            pause
            exit /b 1
        )
    )
    goto :eof

:start_web
    echo Starting Web dev server...
    echo Visit http://localhost:8079 in your browser
    call npm run dev
    goto :eof

:start_electron
    echo Starting Electron app in dev mode...
    call npm run electron-dev
    goto :eof

:open_android_studio
    echo Attempting to open project in Android Studio...
    call npx cap open android
    if %errorlevel% neq 0 (
        echo ----------------------------------------------------------------
        echo Warning: Failed to open Android Studio automatically.
        echo This is usually because Capacitor cannot find your Android Studio installation.
        echo.
        echo Please enter the full path to your 'studio64.exe'.
        echo Example: C:\Program Files\Android\Android Studio\bin\studio64.exe
        set /p "studio_path=Path (leave empty to skip): "

        if defined studio_path (
            if exist "%studio_path%" (
                echo Retrying with the path you provided...
                rem Set the environment variable for the Capacitor CLI
                set "CAPACITOR_ANDROID_STUDIO_PATH=%studio_path%"
                call npx cap open android
                if %errorlevel% neq 0 (
                     echo Failed again using the specified path. Please check the path and try again.
                )
            ) else (
                echo Error: File not found at '%studio_path%'. Please provide the correct path.
            )
        ) else (
            echo Operation skipped. Please open the project in Android Studio manually.
            for %%F in ("%cd%") do set "current_dir=%%~fF"
            echo Your Android project is located at: %current_dir%\android
        )
        echo ----------------------------------------------------------------
    )
    goto :eof

:check_android_sdk
    rem 检查 ANDROID_SDK_ROOT 和 ANDROID_HOME 是否已配置且有效
    if defined ANDROID_SDK_ROOT (
        if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
            echo Android SDK 已检测到: %ANDROID_SDK_ROOT%
            set "ANDROID_HOME=%ANDROID_SDK_ROOT%"
            exit /b 0
        )
    )
    if defined ANDROID_HOME (
        if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
            echo Android SDK 已检测到: %ANDROID_HOME%
            set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
            exit /b 0
        )
    )

    rem 尝试常见安装路径（Windows）
    for %%P in ("%LOCALAPPDATA%\Android\Sdk" "%USERPROFILE%\AppData\Local\Android\Sdk" "C:\Android\sdk") do (
        if exist "%%~P\platform-tools\adb.exe" (
            set "ANDROID_SDK_ROOT=%%~P"
            set "ANDROID_HOME=%%~P"
            echo Android SDK 已检测到: %%~P
            exit /b 0
        )
    )

    echo 未检测到有效的 Android SDK。
    echo 请安装 Android Studio 或手动指定 SDK 路径（例如：C:\Users\%USERNAME%\AppData\Local\Android\Sdk）。
    set /p "sdk_path=请输入 Android SDK 路径（留空跳过在设备上运行）： "
    if defined sdk_path (
        if exist "%sdk_path%\platform-tools\adb.exe" (
            set "ANDROID_SDK_ROOT=%sdk_path%"
            set "ANDROID_HOME=%sdk_path%"
            echo 已设置 ANDROID_SDK_ROOT=%sdk_path%
            exit /b 0
        ) else (
            echo 提供的路径无效：未找到 platform-tools\adb.exe
            exit /b 1
        )
    ) else (
        exit /b 1
    )
:build_mobile
    echo ===== Starting mobile app build =====

    rem Check for required tools
    where npm >nul 2>nul
    if %errorlevel% neq 0 (
        echo Error: npm is not installed. Please install Node.js and npm.
        pause
        exit /b 1
    )
    where npx >nul 2>nul
    if %errorlevel% neq 0 (
        echo Error: npx is not installed. Please install the latest version of npm.
        pause
        exit /b 1
    )

    rem Install dependencies
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
      echo npm install failed.
      pause
      exit /b 1
    )

    echo 1. Building web assets...
    call npm run build
    if %errorlevel% neq 0 (
        echo Web asset build failed. Please check the error messages.
        pause
        exit /b 1
    )
    echo Web assets built successfully.
    echo.

    echo 2. Syncing Capacitor assets...
    call npx cap sync
    if %errorlevel% neq 0 (
        echo Capacitor sync failed. Please ensure Capacitor is configured correctly.
        pause
        exit /b 1
    )
    echo Capacitor sync complete.
    echo.

    echo 3. Copying assets to Android project...
    call npx cap copy android
    echo Assets copied successfully.
    echo.

    rem Ask to open Android Studio
    choice /c yn /m "Open Android Studio? "
    rem errorlevel 1 is y, 2 is n
    if not errorlevel 2 (
        call :open_android_studio
    )

    rem Ask to run on device
    choice /c yn /m "Run on a connected device? "
    rem errorlevel 1 is y, 2 is n
    if not errorlevel 2 (
        rem 先检查并配置 Android SDK，避免 native-run 的 ERR_SDK_NOT_FOUND
        call :check_android_sdk
        if %errorlevel% neq 0 (
            echo 跳过在设备上运行：未找到或未正确配置 Android SDK。
            echo 请安装/配置后再运行：npx cap run android
        ) else (
            echo Running app on device...
            call npx cap run android
        )
    )

    echo ===== Build complete =====
    pause
    goto :eof