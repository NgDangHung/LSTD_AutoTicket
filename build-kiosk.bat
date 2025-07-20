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

REM Create kiosk launcher script
echo 🖥️ Creating kiosk launcher script...
(
echo @echo off
echo echo.
echo echo ========================================
echo echo 🎯 Starting Government Kiosk System
echo echo ========================================
echo echo ⚙️ Chrome Kiosk Mode with Silent Printing
echo echo.
echo.
echo REM Kill existing Chrome processes
echo echo 🔄 Stopping existing Chrome processes...
echo taskkill /F /IM chrome.exe /T 2^>NUL
echo timeout /T 3 /NOBREAK ^>NUL
echo.
echo REM Wait for user confirmation
echo echo 📋 Kiosk Setup Checklist:
echo echo   ✓ Thermal printer is connected and set as default
echo echo   ✓ Network connection is stable
echo echo   ✓ Touch screen is calibrated
echo echo   ✓ Backend API server is running
echo echo.
echo pause
echo.
echo echo 🚀 Starting Chrome Kiosk Mode...
echo echo.
echo REM Start Chrome in kiosk mode with silent printing
echo start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
echo   --kiosk ^
echo   --kiosk-printing ^
echo   --disable-web-security ^
echo   --disable-features=VizDisplayCompositor ^
echo   --autoplay-policy=no-user-gesture-required ^
echo   --disable-background-timer-throttling ^
echo   --disable-renderer-backgrounding ^
echo   --disable-backgrounding-occluded-windows ^
echo   "http://localhost:3000/kiosk"
echo.
echo echo ✅ Kiosk started successfully!
echo echo 📄 Silent printing enabled - No print dialogs will appear
echo echo 🖨️ Tickets will print directly to default thermal printer
echo echo.
echo echo Press any key to stop kiosk mode...
echo pause ^>nul
echo.
echo echo 🛑 Stopping kiosk mode...
echo taskkill /F /IM chrome.exe /T 2^>NUL
echo echo ✅ Kiosk stopped
) > kiosk-launcher.bat

REM Create server launcher script  
echo 📡 Creating server launcher script...
(
echo @echo off
echo echo.
echo echo ========================================
echo echo 🌐 Starting Next.js Server
echo echo ========================================
echo echo.
echo echo 🔄 Starting production server on port 3000...
echo echo 📡 Server will be available at: http://localhost:3000
echo echo 🏛️ Kiosk interface: http://localhost:3000/kiosk
echo echo 📺 TV display: http://localhost:3000/tv  
echo echo 👮 Officer panel: http://localhost:3000/officer
echo echo 👑 Admin panel: http://localhost:3000/admin
echo echo.
echo call npm start
echo.
echo echo 🛑 Server stopped
echo pause
) > server-launcher.bat

REM Create complete deployment script
echo 🔗 Creating complete deployment script...
(
echo @echo off
echo echo.
echo echo ========================================
echo echo 🏛️ Government Kiosk - Full Deployment
echo echo ========================================
echo echo.
echo echo This will start both the server and kiosk interface
echo echo.
echo pause
echo.
echo echo 📡 Starting Next.js server in background...
echo start "Kiosk Server" /min cmd /c server-launcher.bat
echo.
echo echo ⏳ Waiting for server to start...
echo timeout /T 10 /NOBREAK ^>NUL
echo.
echo echo 🎯 Starting kiosk interface...
echo call kiosk-launcher.bat
) > deploy-kiosk.bat

echo.
echo ========================================
echo ✅ Kiosk deployment scripts created!
echo ========================================
echo.
echo 📋 Available scripts:
echo   🌐 server-launcher.bat     - Start Next.js server only
echo   🖥️ kiosk-launcher.bat      - Start Chrome kiosk mode only  
echo   🚀 deploy-kiosk.bat        - Start complete kiosk system
echo.
echo 📋 Deployment instructions:
echo 1. Ensure thermal printer is connected and set as default
echo 2. Configure network access to backend API
echo 3. Run: deploy-kiosk.bat
echo.
echo ⚠️ Important: Chrome must support --kiosk-printing flag
echo    This requires Chrome version 88+ on Windows
echo.
pause
