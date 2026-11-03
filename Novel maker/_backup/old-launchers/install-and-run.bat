@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo   Novel Flow - Install ^& Run
echo ========================================
echo.

rem ---- 1) Node.js -------------------------------------------------------
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

rem ---- 2) Dependencies --------------------------------------------------
rem "npm ls" fails when node_modules is missing OR when package.json gained
rem new packages after an update, so updates install automatically.
echo Checking dependencies...
call npm ls --depth=0 >nul 2>nul
if errorlevel 1 (
  echo Installing / updating dependencies - this can take 1-2 minutes...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. See the messages above.
    pause
    exit /b 1
  )
) else (
  echo Dependencies are up to date.
)
echo.

rem ---- 3a) "install-and-run.bat test" runs the test suite ---------------
if /i "%~1"=="test" goto :runtests

rem ---- 3b) Start the app ------------------------------------------------
echo ========================================
echo   Novel Flow is starting at http://localhost:5173
echo   - Opens on the Projects page
echo   - Projects are saved in: %~dp0saves
echo   Press Ctrl+C in this window to stop.
echo ========================================
echo.

call npm run dev
endlocal
exit /b 0

:runtests
echo ========================================
echo   Running tests
echo ========================================
echo.
call npm test
set TEST_RC=%errorlevel%
echo.
if not "%TEST_RC%"=="0" echo [FAILED] Some tests failed. See the messages above.
if "%TEST_RC%"=="0" echo All tests passed.
pause
endlocal & exit /b %TEST_RC%
