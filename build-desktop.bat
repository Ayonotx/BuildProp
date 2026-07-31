@echo off
title Building BuildProp Desktop Application
setlocal enabledelayedexpansion

:: Determine build type from argument: premium (default) or standard
set "BUILD_TYPE=%~1"
if "%BUILD_TYPE%"=="" set "BUILD_TYPE=premium"
if /i "%BUILD_TYPE%"=="premium" (
    set "CONFIG_FILE=builder.premium.json"
    set "OUTPUT_DIR=dist\premium"
    set "ENV_FILE=.env.premium"
    set "BUILD_LABEL=PREMIUM"
    set "NEXT_BUILD_SCRIPT=build:premium"
) else if /i "%BUILD_TYPE%"=="standard" (
    set "CONFIG_FILE=builder.standard.json"
    set "OUTPUT_DIR=dist\standard"
    set "ENV_FILE=.env.standard"
    set "BUILD_LABEL=STANDARD"
    set "NEXT_BUILD_SCRIPT=build:standard"
) else (
    echo  [ERROR] Unknown build type: %BUILD_TYPE%
    echo  Usage: %~nx0 [premium^|standard]
    pause
    exit /b 1
)

echo.
echo  ========================================
echo    Building Desktop Application (EXE)
echo    Variant: %BUILD_LABEL%
echo  ========================================
echo.

:: Check for node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

cd /d "%~dp0"

:: Install root dependencies if needed
if not exist "node_modules" (
    echo  [1/5] Installing root dependencies...
    call npm install
) else (
    echo  [1/5] Root dependencies found.
)

:: Build Next.js for production (creates standalone output + copies .env)
echo.
echo  [2/5] Building Next.js application...
call npm run %NEXT_BUILD_SCRIPT%
if %errorlevel% neq 0 (
    echo  [ERROR] Next.js build failed!
    pause
    exit /b 1
)

:: Verify .env was copied
if exist ".next\standalone\.env" (
    echo  [OK] .env file placed in standalone
) else (
    echo  [WARN] .env not found in standalone - copying manually
    copy /Y "electron\%ENV_FILE%" ".next\standalone\.env"
)

:: Ensure correct .env for this edition (in case previous build overwrote it)
copy /Y "electron\%ENV_FILE%" ".next\standalone\.env" >nul 2>nul
if exist ".next\standalone\.env" (
    echo  [OK] .env configured for %BUILD_LABEL% edition
) else (
    echo  [WARN] .env not found
)

:: Copy static assets into standalone folder
echo.
echo  [3/5] Copying static assets into standalone build...
if not exist ".next\standalone\.next" mkdir ".next\standalone\.next"
if not exist ".next\standalone\.next\static" mkdir ".next\standalone\.next\static"
if exist ".next\static" (
    xcopy /E /Y /Q ".next\static\*" ".next\standalone\.next\static\" >nul
)
if not exist ".next\standalone\public" mkdir ".next\standalone\public"
if exist "public" (
    xcopy /E /Y /Q "public\*" ".next\standalone\public\" >nul
)
if not exist ".next\standalone\prisma" mkdir ".next\standalone\prisma"
if exist "prisma\production.db" (
    copy /Y "prisma\production.db" ".next\standalone\prisma\dev.db" >nul
    echo  [OK] Shipped empty production database (prisma\production.db as dev.db)
) else (
    echo  [WARN] prisma\production.db not found - installer will ship without a database
)
:: NOTE: data\settings.json is intentionally NOT shipped so every fresh install
:: starts unconfigured and shows the company setup wizard before login.

:: Install Electron dependencies
echo.
echo  [4/5] Installing Electron build tools...
cd electron
call npm install
if %errorlevel% neq 0 (
    echo  [ERROR] Electron dependencies install failed!
    cd /d "%~dp0"
    pause
    exit /b 1
)
cd /d "%~dp0"

:: Build Electron app
echo.
echo  [5/5] Packaging desktop application (%BUILD_LABEL%)...
cd electron
call npx.cmd electron-builder --win --x64 --config %CONFIG_FILE% --config.win.signAndEditExecutable=false
if %errorlevel% neq 0 (
    echo  [ERROR] Electron build failed!
    cd /d "%~dp0"
    pause
    exit /b 1
)
cd /d "%~dp0"

:: Verify output
echo.
echo  ========================================
echo    Build Complete! (%BUILD_LABEL%)
echo    Check the %OUTPUT_DIR% folder
echo  ========================================
echo.
pause
