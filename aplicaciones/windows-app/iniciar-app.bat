@echo off
title La Tarima Decoracion - App Windows
echo =======================================================
echo     Iniciando Aplicacion de Escritorio La Tarima
echo =======================================================
echo.

cd /d "%~dp0"

IF NOT EXIST "node_modules\electron\dist\electron.exe" (
    echo Configurando componentes para Windows por primera vez...
    powershell -ExecutionPolicy Bypass -File install-electron.ps1
)

echo Abriendo la aplicacion de escritorio...
call npm start

pause
