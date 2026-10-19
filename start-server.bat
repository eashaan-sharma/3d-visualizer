@echo off
rem Double-click to serve the app at http://localhost:8080/ and open it in the default browser.
start "" http://localhost:8080/
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1" -Port 8080
