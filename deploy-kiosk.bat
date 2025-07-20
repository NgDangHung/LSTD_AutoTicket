@echo off
echo.
echo ========================================
echo 🏛️ Government Kiosk - HTTPS Local Test
echo ========================================
echo.
echo This will start HTTPS server and kiosk interface for production-like testing
echo.
pause

echo 📡 Starting HTTPS Next.js server in background...
start "HTTPS Kiosk Server" /min cmd /c server-launcher.bat

echo ⏳ Waiting for HTTPS server to start...
timeout /T 15 /NOBREAK >NUL

echo 🎯 Starting HTTPS kiosk interface...
call kiosk-launcher.bat
