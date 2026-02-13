@echo off
echo ========================================
echo RESTARTING DEV SERVER TO CLEAR CACHE
echo ========================================
echo.
echo Stopping current dev server...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting dev server...
cd /d "G:\Motocare"
start cmd /k "npm run dev"
echo.
echo ========================================
echo Server is restarting in new window
echo Wait 10 seconds then open browser at:
echo http://localhost:4310/finance
echo ========================================
pause
