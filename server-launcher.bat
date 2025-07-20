@echo off
echo.
echo ========================================
echo 🌐 Starting Next.js HTTPS Server
echo ========================================
echo.
echo 🔒 Starting HTTPS development server on port 3000...
echo 📡 Server will be available at: https://localhost:3000
echo 🏛️ Kiosk interface: https://localhost:3000/kiosk
echo 📺 TV display: https://localhost:3000/tv  
echo 👮 Officer panel: https://localhost:3000/officer
echo 👑 Admin panel: https://localhost:3000/admin
echo.
echo ⚠️ Note: You may see certificate warnings - this is normal for local HTTPS
echo.
call npm run dev:https

echo 🛑 HTTPS Server stopped
pause
