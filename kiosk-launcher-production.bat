@echo off
echo.
echo ========================================
echo 🎯 Government Kiosk System (Production)
echo ========================================
echo ⚙️ Chrome Kiosk Mode with Silent Printing
echo 🌐 Connecting to Netlify Production
echo.

REM Kill existing Chrome processes
echo 🔄 Stopping existing Chrome processes...
taskkill /F /IM chrome.exe /T 2>NUL
timeout /T 3 /NOBREAK >NUL

REM Wait for user confirmation
echo 📋 Production Kiosk Setup Checklist:
echo   ✓ Thermal printer is connected and set as default
echo   ✓ Network connection to internet is stable
echo   ✓ Touch screen is calibrated
echo   ✓ Latest code deployed to Netlify
echo.
pause

echo 🚀 Starting Chrome Kiosk Mode (Production)...
echo.
REM Start Chrome in kiosk mode with production URL
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" echo   --kiosk echo   --kiosk-printing echo   --disable-web-security echo   --disable-features=VizDisplayCompositor echo   --autoplay-policy=no-user-gesture-required echo   --disable-background-timer-throttling echo   --disable-renderer-backgrounding echo   --disable-backgrounding-occluded-windows echo   "https://laysotudong.netlify.app/kiosk"

echo ✅ Production Kiosk started successfully!
echo 📄 Silent printing enabled - No print dialogs will appear
echo 🖨️ Tickets will print directly to default thermal printer
echo 🌐 Connected to Netlify production deployment
echo.
echo Press any key to stop kiosk mode...
pause >nul

echo 🛑 Stopping kiosk mode...
taskkill /F /IM chrome.exe /T 2>NUL
echo ✅ Production Kiosk stopped
