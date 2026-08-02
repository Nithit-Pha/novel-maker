@echo off
title Stop Novel Flow
echo Stopping the Novel Flow dev server (whatever is listening on port 5173)...
set FOUND=
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
  set FOUND=1
  taskkill /f /pid %%p >nul 2>nul
)
if defined FOUND (echo Stopped.) else (echo Nothing was running on port 5173.)
echo.
echo You can close this window.
pause
