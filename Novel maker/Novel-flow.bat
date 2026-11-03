@echo off
rem ======================================================================
rem  Novel Flow - the one launcher.
rem
rem  Double-click:
rem    - not running: installs/updates packages if needed, starts the app
rem                      in a minimized "Novel Flow server" window and opens
rem                      your browser. Close that window to stop the app.
rem    - running:     asks Open browser / Restart / Stop
rem
rem  From a terminal:   Novel-flow.bat start, stop, restart, test or check
rem    test   = run the tests
rem    check  = tests + typecheck + build (the full check before sharing)
rem
rem  Novel-flow.vbs does the same start with no window at all.
rem  Projects are saved in the "saves" folder next to this file.
rem ======================================================================
setlocal EnableExtensions
cd /d "%~dp0"
title Novel Flow
set "PORT=5173"
set "URL=http://localhost:%PORT%"
set "MODE=%~1"

if /i "%MODE%"=="stop" goto :mode_stop
if /i "%MODE%"=="restart" goto :mode_restart
if /i "%MODE%"=="test" goto :deps
if /i "%MODE%"=="check" goto :deps

rem ---- Already running? ------------------------------------------------
call :find_pid
if not defined PID goto :deps
call :pid_name
if /i not "%PNAME%"=="node.exe" goto :port_taken

echo.
echo  Novel Flow is already running at %URL%
echo.
echo    [O] Open it in the browser   - default in 10 seconds
echo    [R] Restart it
echo    [S] Stop it
echo.
choice /c ORS /t 10 /d O /n /m "  Your choice [O/R/S]: "
if errorlevel 3 goto :mode_stop
if errorlevel 2 goto :mode_restart
start "" "%URL%"
exit /b 0

:port_taken
echo.
echo  [ERROR] Port %PORT% is used by another program: %PNAME% - PID %PID%.
echo  Close that program, then double-click Novel-flow.bat again.
echo.
pause
exit /b 1

rem ---- stop / restart ---------------------------------------------------
:mode_stop
call :stop_server
echo.
if defined STOPPED (echo  Novel Flow stopped.) else (echo  Novel Flow was not running.)
timeout /t 3 >nul
exit /b 0

:mode_restart
call :stop_server
if defined STOPPED (
  echo  Stopped the running Novel Flow. Starting it again...
  timeout /t 1 /nobreak >nul
)
goto :deps

rem ---- 1) Node.js -------------------------------------------------------
:deps
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERROR] Node.js is not installed or not on PATH.
  echo  Install Node.js 18+ from https://nodejs.org and run this again.
  echo.
  pause
  exit /b 1
)

rem ---- 2) Packages: "npm ls" fails when node_modules is missing OR when
rem         an update added new packages, so updates install automatically.
call npm ls --depth=0 >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Installing / updating packages - this can take 1-2 minutes...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  [ERROR] npm install failed. See the messages above.
    pause
    exit /b 1
  )
)

if /i "%MODE%"=="test" goto :run_test
if /i "%MODE%"=="check" goto :run_check

rem ---- 3) Start: server in its own minimized window ----------------------
rem  strictPort is on in vite.config.ts, so it never drifts to another port.
rem  If the server fails, its window stays open (minimized) to show why.
start "Novel Flow server" /min cmd /c "npm run dev || pause"
echo.
echo  ========================================================
echo   Novel Flow is starting at %URL%
echo   Your browser opens by itself when it is ready.
echo.
echo   The app runs in the minimized "Novel Flow server" window
echo   on the taskbar. Close it to stop - or double-click
echo   Novel-flow.bat again and pick Stop.
echo.
echo   Projects are saved in: %~dp0saves
echo  ========================================================
timeout /t 8 >nul
exit /b 0

rem ---- test / check -----------------------------------------------------
:run_test
echo.
echo  Running tests...
echo.
call npm test
set "RC=%errorlevel%"
goto :report

:run_check
echo.
echo  [1/2] Tests...
echo.
call npm test
set "RC=%errorlevel%"
if not "%RC%"=="0" goto :report
echo.
echo  [2/2] Typecheck + build...
echo.
call npm run build
set "RC=%errorlevel%"
goto :report

:report
echo.
if "%RC%"=="0" (echo  All good.) else (echo  [FAILED] See the messages above.)
echo.
pause
exit /b %RC%

rem ---- helpers ----------------------------------------------------------
:find_pid
set "PID="
for /f "tokens=5" %%p in ('netstat -aon ^| findstr /c:":%PORT% " ^| findstr LISTENING') do set "PID=%%p"
exit /b 0

:pid_name
set "PNAME="
for /f "tokens=1 delims=," %%n in ('tasklist /fi "PID eq %PID%" /fo csv /nh') do set "PNAME=%%~n"
exit /b 0

:stop_server
set "STOPPED="
for /f "tokens=5" %%p in ('netstat -aon ^| findstr /c:":%PORT% " ^| findstr LISTENING') do call :kill_if_node %%p
exit /b 0

:kill_if_node
set "PID=%~1"
call :pid_name
if /i not "%PNAME%"=="node.exe" exit /b 0
taskkill /f /t /pid %PID% >nul 2>nul
set "STOPPED=1"
exit /b 0
