@echo off
title BuildProp Mobile — Build APK

echo ========================================
echo   BuildProp Mobile — Build Android APK
echo ========================================
echo.
echo This will build the APK using Expo's cloud build service (EAS).
echo You need an Expo account (free) to use this.
echo.
echo Step 1: Login to Expo
call npx eas login
if %errorlevel% neq 0 (
    echo.
    echo Login failed. Create an account at https://expo.dev/signup
    pause
    exit /b 1
)
echo.
echo Step 2: Build APK
echo This uploads the source to Expo's cloud servers and returns an APK download link.
echo.
npx eas build --platform android --profile production
if %errorlevel% neq 0 (
    echo.
    echo Build failed. Check the error above.
    pause
    exit /b 1
)
echo.
echo APK build initiated! Check the Expo dashboard for your download link.
pause