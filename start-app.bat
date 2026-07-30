@echo off
title BuildProp ERP

echo ========================================
echo   BuildProp ERP — Construction Management
echo ========================================
echo.
echo Starting server...

:: Set port and host
set PORT=3456
set HOSTNAME=127.0.0.1

:: Start the production server
node .next\standalone\server.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Server failed to start.
    echo Make sure you have run "npm install" and "npm run build" first.
    echo.
    pause
)

:: Keep window open
pause