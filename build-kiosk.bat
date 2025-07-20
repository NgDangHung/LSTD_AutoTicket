@echo off
echo.
echo ========================================
echo 🚀 Vietnamese Government Kiosk System
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ npm is not installed!
    echo Please install npm with Node.js
    pause
    exit /b 1
)

echo 📦 Building Next.js application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    echo Please check the error messages above
    pause
    exit /b 1
)

echo.
echo ✅ Build completed successfully!
echo.

REM Create HTTPS kiosk launcher script
echo 🔒 Creating HTTPS kiosk launcher script...
(
echo @echo off
echo echo.
echo echo ========================================
echo echo 🎯 Government Kiosk System ^(HTTPS Local^)
echo echo ========================================
echo echo ⚙️ Chrome Kiosk Mode with Silent Printing
echo echo 🔒 Testing HTTPS Local Environment
echo echo.
echo.
echo REM Kill existing Chrome processes
echo echo 🔄 Stopping existing Chrome processes...
echo taskkill /F /IM chrome.exe /T 2^>NUL
echo timeout /T 3 /NOBREAK ^>NUL
echo.
echo REM Wait for user confirmation
echo echo 📋 HTTPS Local Kiosk Setup Checklist:
echo echo   ✓ Thermal printer is connected and set as default
echo echo   ✓ HTTPS dev server is running on port 3000
echo echo   ✓ SSL certificates are valid
echo echo   ✓ Touch screen is calibrated
echo echo.
echo pause
echo.
echo echo 🚀 Starting Chrome Kiosk Mode ^(HTTPS^)...
echo echo.
echo REM Start Chrome in kiosk mode with HTTPS local
echo start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
echo   --kiosk ^
echo   --kiosk-printing ^
echo   --disable-web-security ^
echo   --disable-features=VizDisplayCompositor ^
echo   --autoplay-policy=no-user-gesture-required ^
echo   --disable-background-timer-throttling ^
echo   --disable-renderer-backgrounding ^
echo   --disable-backgrounding-occluded-windows ^
echo   --ignore-certificate-errors ^
echo   --ignore-ssl-errors ^
echo   --ignore-certificate-errors-spki-list ^
echo   "https://localhost:3000/kiosk"
echo.
echo echo ✅ HTTPS Local Kiosk started successfully!
echo echo 📄 Silent printing enabled - No print dialogs will appear
echo echo 🖨️ Tickets will print directly to default thermal printer
echo echo 🔒 HTTPS security for production-like testing
echo echo.
echo echo Press any key to stop kiosk mode...
echo pause ^>nul
echo.
echo echo 🛑 Stopping kiosk mode...
echo taskkill /F /IM chrome.exe /T 2^>NUL
echo echo ✅ HTTPS Local Kiosk stopped
) > kiosk-launcher.bat

REM Create Production Netlify kiosk launcher script
echo 🌐 Creating Production Netlify kiosk launcher script...
(
echo @echo off
echo echo.
echo echo ========================================
echo echo 🎯 Government Kiosk System ^(Production^)
echo echo ========================================
echo echo ⚙️ Chrome Kiosk Mode with Silent Printing
echo echo 🌐 Connecting to Netlify Production
echo echo.
echo.
echo REM Kill existing Chrome processes
echo echo 🔄 Stopping existing Chrome processes...
echo taskkill /F /IM chrome.exe /T 2^>NUL
echo timeout /T 3 /NOBREAK ^>NUL
echo.
echo REM Wait for user confirmation
echo echo 📋 Production Kiosk Setup Checklist:
echo echo   ✓ Thermal printer is connected and set as default
echo echo   ✓ Network connection to internet is stable
echo echo   ✓ Touch screen is calibrated
echo echo   ✓ Latest code deployed to Netlify
echo echo.
echo pause
echo.
echo echo 🚀 Starting Chrome Kiosk Mode ^(Production^)...
echo echo.
echo REM Start Chrome in kiosk mode with production URL
echo start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
echo   --kiosk ^
echo   --kiosk-printing ^
echo   --disable-web-security ^
echo   --disable-features=VizDisplayCompositor ^
echo   --autoplay-policy=no-user-gesture-required ^
echo   --disable-background-timer-throttling ^
echo   --disable-renderer-backgrounding ^
echo   --disable-backgrounding-occluded-windows ^
echo   "https://laysotudong.netlify.app/kiosk"
echo.
echo echo ✅ Production Kiosk started successfully!
echo echo 📄 Silent printing enabled - No print dialogs will appear
echo echo 🖨️ Tickets will print directly to default thermal printer
echo echo 🌐 Connected to Netlify production deployment
echo echo.
echo echo Press any key to stop kiosk mode...
echo pause ^>nul
echo.
echo echo 🛑 Stopping kiosk mode...
echo taskkill /F /IM chrome.exe /T 2^>NUL
echo echo ✅ Production Kiosk stopped
) > kiosk-launcher-production.bat

REM Create HTTPS server launcher script  
echo 🔒 Creating HTTPS server launcher script...
(
echo @echo off
echo echo.
echo echo ========================================
echo echo 🌐 Starting Next.js HTTPS Server
echo echo ========================================
echo echo.
echo echo 🔒 Starting HTTPS development server on port 3000...
echo echo 📡 Server will be available at: https://localhost:3000
echo echo 🏛️ Kiosk interface: https://localhost:3000/kiosk
echo echo 📺 TV display: https://localhost:3000/tv  
echo echo 👮 Officer panel: https://localhost:3000/officer
echo echo 👑 Admin panel: https://localhost:3000/admin
echo echo.
echo echo ⚠️ Note: You may see certificate warnings - this is normal for local HTTPS
echo echo.
echo call npm run dev:https
echo.
echo echo 🛑 HTTPS Server stopped
echo pause
) > server-launcher.bat

REM Create HTTPS deployment script
echo � Creating HTTPS deployment script...
(
echo @echo off
echo echo.
echo echo ========================================
echo echo 🏛️ Government Kiosk - HTTPS Local Test
echo echo ========================================
echo echo.
echo echo This will start HTTPS server and kiosk interface for production-like testing
echo echo.
echo pause
echo.
echo echo 📡 Starting HTTPS Next.js server in background...
echo start "HTTPS Kiosk Server" /min cmd /c server-launcher.bat
echo.
echo echo ⏳ Waiting for HTTPS server to start...
echo timeout /T 15 /NOBREAK ^>NUL
echo.
echo echo 🎯 Starting HTTPS kiosk interface...
echo call kiosk-launcher.bat
) > deploy-kiosk.bat

REM Create Production deployment script
echo 🌐 Creating Production deployment script...
(
echo @echo off
echo echo.
echo echo ========================================
echo echo 🏛️ Government Kiosk - Production Deployment
echo echo ========================================
echo echo.
echo echo This will connect directly to Netlify production
echo echo No local server needed - uses live deployment
echo echo.
echo pause
echo.
echo echo 🌐 Testing network connectivity to Netlify...
echo ping -n 1 laysotudong.netlify.app ^>nul
echo if %%ERRORLEVEL%% neq 0 ^(
echo   echo ❌ Cannot reach Netlify deployment
echo   echo Please check internet connection
echo   pause
echo   exit /b 1
echo ^)
echo echo ✅ Netlify deployment reachable
echo echo.
echo echo 🎯 Starting production kiosk interface...
echo call kiosk-launcher-production.bat
) > deploy-kiosk-production.bat

echo.
echo ========================================
echo ✅ Kiosk deployment scripts created!
echo ========================================
echo.
echo 📋 Available scripts:
echo   🔒 server-launcher.bat           - Start HTTPS Next.js server (port 3000)
echo   🔒 kiosk-launcher.bat            - Start Chrome kiosk mode (HTTPS Local)
echo   🔒 deploy-kiosk.bat              - Start complete HTTPS local system
echo   🌐 kiosk-launcher-production.bat - Start Chrome kiosk mode (Production)
echo   🌐 deploy-kiosk-production.bat   - Start production kiosk system
echo.
echo 📋 Testing workflow:
echo 1. For HTTPS local testing: deploy-kiosk.bat  
echo 2. For production testing: deploy-kiosk-production.bat
echo 3. For production kiosk: kiosk-launcher-production.bat
echo.
echo 🔒 Local HTTPS Testing Benefits:
echo   ✓ Production-like environment
echo   ✓ Test SSL certificate handling
echo   ✓ Verify HTTPS-only features
echo   ✓ Security policy testing
echo.
echo 🌐 Production Deployment Benefits:
echo   ✓ Real-time connection to live system
echo   ✓ No local server maintenance
echo   ✓ Automatic updates from GitHub
echo   ✓ Production performance testing
echo.
echo 📋 Deployment instructions:
echo 1. Ensure thermal printer is connected and set as default
echo 2. Configure network access to backend API
echo 3. For HTTPS local testing: deploy-kiosk.bat
echo 4. For production deployment: deploy-kiosk-production.bat
echo 5. Push latest code to GitHub before production testing
echo.
echo 🚀 Production deployment workflow:
echo   1. git add . && git commit -m "Deploy kiosk system"
echo   2. git push origin main
echo   3. Wait for Netlify auto-rebuild (2-3 minutes)
echo   4. Run: deploy-kiosk-production.bat
echo.
echo ⚠️ Important: Chrome must support --kiosk-printing flag
echo    This requires Chrome version 88+ on Windows
echo.
pause
