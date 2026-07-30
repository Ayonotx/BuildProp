@echo off
title Building BuildProp Desktop Application
setlocal enabledelayedexpansion

:: Determine build type from argument: premium (default) or standard
set "BUILD_TYPE=%~1"
if "%BUILD_TYPE%"=="" set "BUILD_TYPE=premium"
if /i "%BUILD_TYPE%"=="premium" (
    set "CONFIG_FILE=builder.premium.json"
    set "OUTPUT_DIR=dist-electron"
    set "BUILD_LABEL=PREMIUM"
) else if /i "%BUILD_TYPE%"=="standard" (
    set "CONFIG_FILE=builder.standard.json"
    set "OUTPUT_DIR=dist-electron-standard"
    set "BUILD_LABEL=STANDARD"
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

:: Check for existing standalone build
set "SKIP_BUILD="
if exist ".next\standalone\server.js" (
    echo  A previous standalone build was found at .next\standalone\server.js
    set /p "SKIP_BUILD=Rebuild Next.js? (y/N): "
    if /i "!SKIP_BUILD!"=="Y" (
        set "SKIP_BUILD="
    ) else (
        set "SKIP_BUILD=1"
        echo  Skipping Next.js build, using existing standalone output.
    )
)

:: Regenerate the icon from source (ensures consistency)
echo  [0/6] Generating application icon...
if exist "scripts\generate-ico.js" (
    node scripts\generate-ico.js
    if %errorlevel% neq 0 (
        echo  [WARN] Icon generation failed, using existing favicon.ico
    )
) else (
    echo  [SKIP] Icon generation script not found.
)

:: Install root dependencies if needed
if not exist "node_modules" (
    echo  [1/6] Installing root dependencies...
    call npm install
) else (
    echo  [1/6] Root dependencies found.
)

if not defined SKIP_BUILD (
    :: Build Next.js for production (creates standalone output)
    echo.
    echo  [2/6] Building Next.js application...
    call npm run build
    if %errorlevel% neq 0 (
        echo  [ERROR] Next.js build failed!
        pause
        exit /b 1
    )
) else (
    echo.
    echo  [2/6] Skipping Next.js build (using existing output).
)

:: Copy static assets into standalone folder
echo.
echo  [3/6] Copying static assets into standalone build...
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
if exist "prisma\dev.db" (
    copy /Y "prisma\dev.db" ".next\standalone\prisma\dev.db" >nul
)
if not exist ".next\standalone\data" mkdir ".next\standalone\data"
if exist "data\settings.json" (
    copy /Y "data\settings.json" ".next\standalone\data\settings.json" >nul
)

if exist "src\app" (
    copy /Y "public\favicon.ico" "src\app\favicon.ico" >nul 2>nul
)
echo  Done.

:: Install Electron dependencies
echo.
echo  [4/6] Installing Electron build tools...
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
echo  [5/6] Packaging desktop application (%BUILD_LABEL%)...
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
echo  [6/6] Verifying build output...
if exist "%OUTPUT_DIR%" (
    dir /b "%OUTPUT_DIR%\*.exe" 2>nul | findstr /i "setup" >nul
    if !errorlevel! equ 0 (
        echo  Found installer executable in %OUTPUT_DIR%.
    ) else (
        echo  [WARN] No setup EXE found in %OUTPUT_DIR%. See above for details.
    )
) else (
    echo  [WARN] %OUTPUT_DIR% folder not found. Check for errors above.
)

echo.
echo  ========================================
echo    Build Complete! (%BUILD_LABEL%)
echo    Check the %OUTPUT_DIR% folder
echo  ========================================
echo.
pause
