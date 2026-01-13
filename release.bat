@echo off
chcp 65001 >nul
setlocal

echo ==========================================
echo      Blueprint Plan GitHub Release Script
echo ==========================================
echo.

:input_msg
set /p msg="Please enter commit message: "
if "%msg%"=="" (
    echo Commit message cannot be empty.
    goto input_msg
)

echo.
set /p tag="Please enter tag (e.g. v0.4.1) [Press Enter to skip]: "

set retag=n
if not "%tag%"=="" (
    set /p retag="Overwrite existing tag %tag%? (y/n) [default n]: "
)

echo.
echo [1/4] Adding all changes (git add .)...
git add .

echo.
echo [2/4] Committing changes (git commit)...
git commit -m "%msg%"

echo.
echo [3/4] Pushing to remote (git push)...
git push

if "%tag%"=="" goto end

echo.
echo [4/4] Processing tag %tag%...

if /i "%retag%"=="y" (
    echo Deleting old tag (local and remote)...
    git tag -d %tag% 2>nul
    git push origin :refs/tags/%tag% 2>nul
)

git tag %tag%
git push origin %tag%

:end
echo.
echo ==========================================
echo                 Done
echo ==========================================
pause
