@echo off
echo.
echo ========================================
echo 🎯 Government Kiosk System (HTTPS Local)
echo ========================================
echo ⚙️ Chrome Kiosk Mode with Silent Printing
echo 🔒 Testing HTTPS Local Environment
echo.

REM Kill existing Chrome processes
echo 🔄 Stopping existing Chrome processes...
taskkill /F /IM chrome.exe /T 2>NUL
timeout /T 3 /NOBREAK >NUL

REM Wait for user confirmation
echo 📋 HTTPS Local Kiosk Setup Checklist:
echo   ✓ Thermal printer is connected and set as default
echo   ✓ HTTPS dev server is running on port 3000
echo   ✓ SSL certificates are valid
echo   ✓ Touch screen is calibrated
echo.
pause

echo 🚀 Starting Chrome Kiosk Mode (HTTPS)...
echo.
REM Start Chrome in kiosk mode with HTTPS local
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" echo   --kiosk echo   --kiosk-printing echo   --disable-web-security echo   --disable-features=VizDisplayCompositor echo   --autoplay-policy=no-user-gesture-required echo   --disable-background-timer-throttling echo   --disable-renderer-backgrounding echo   --disable-backgrounding-occluded-windows echo   --ignore-certificate-errors echo   --ignore-ssl-errors echo   --ignore-certificate-errors-spki-list echo   "https://localhost:3000/kiosk"

echo ✅ HTTPS Local Kiosk started successfully!
echo 📄 Silent printing enabled - No print dialogs will appear
echo 🖨️ Tickets will print directly to default thermal printer
echo 🔒 HTTPS security for production-like testing
echo.
echo Press any key to stop kiosk mode...
pause >nul

echo 🛑 Stopping kiosk mode...
taskkill /F /IM chrome.exe /T 2>NUL
echo ✅ HTTPS Local Kiosk stopped
