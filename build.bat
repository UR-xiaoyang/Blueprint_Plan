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
    echo Visit http://localhost:5173 in your browser
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
        echo Running app on device...
        call npx cap run android
    )

    echo ===== Build complete =====
    pause
    goto :eof 