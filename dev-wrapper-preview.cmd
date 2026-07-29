@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
if "%PORT%"=="" set "PORT=3100"
"C:\Program Files\nodejs\npx.cmd" next dev -p %PORT%
