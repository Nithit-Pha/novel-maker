@echo off
setlocal

echo.
echo ========================================
echo   Novel Flow - Install ^& Run
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on PATH.
  echo.
  echo Please install Node.js 18+ from https://nodejs.org and run this script again.
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo Node.js detected: %NODE_VER%
echo.

if not exist node_modules (
  echo Installing dependencies (this takes 1-2 minutes the first time)...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. See messages above.
    pause
    exit /b 1
  )
) else (
  echo Dependencies already installed. Skipping npm install.
  echo (Delete the node_modules folder if you want to reinstall.)
)

echo.
echo ========================================
echo   Starting dev server at http://localhost:5173
echo   Press Ctrl+C in this window to stop.
echo ========================================
echo.

call npm run dev

endlocal
