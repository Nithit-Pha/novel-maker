@echo off
rem Thin wrapper: launches the .vbs so the app starts with no console window.
cd /d "%~dp0"
start "" wscript.exe "%~dp0Open Novel Flow.vbs"
exit
