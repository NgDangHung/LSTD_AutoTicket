@echo off
echo.
echo ========================================
echo 🏛️ Government Kiosk - Production Deployment
echo ========================================
echo.
echo This will connect directly to Netlify production
echo No local server needed - uses live deployment
echo.
pause

echo 🌐 Testing network connectivity to Netlify...
ping -n 1 laysotudong.netlify.app >nul
if %ERRORLEVEL% neq 0 (
  echo ❌ Cannot reach Netlify deployment
  echo Please check internet connection
  pause
  exit /b 1
)
echo ✅ Netlify deployment reachable
echo.
echo 🎯 Starting production kiosk interface...
call kiosk-launcher-production.bat
