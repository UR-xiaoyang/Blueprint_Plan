# Blueprint Plan Reinstall Script
# UTF-8 Encoding

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      Blueprint Plan Reinstall Script" -ForegroundColor Cyan
Write-Host "=========================================="
Write-Host ""

Write-Host "1. Cleaning up old dependency files..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   - Removing node_modules directory..."
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Write-Host "   - Removing package-lock.json..."
    Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
}

Write-Host "2. Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "3. Setting environment variables for Electron mirror..." -ForegroundColor Yellow
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"

Write-Host "4. Installing dependencies (using npmmirror)..." -ForegroundColor Yellow
Write-Host "   Note: This may take a few minutes. Please wait."
npm install --registry=https://registry.npmmirror.com

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[Error] Installation failed. Please check your network or try running 'npm install' manually." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[Success] Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
