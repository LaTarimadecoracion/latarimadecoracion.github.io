@echo off
title La Tarima Decoracion - Compilando Ejecutable Windows
echo =======================================================
echo     Generando archivo ejecutable (.exe) para Windows
echo =======================================================
echo.

cd /d "%~dp0"

IF NOT EXIST "node_modules\electron-packager" (
    echo Preparando herramientas de compilacion (solo la primera vez)...
    call npm install electron-packager --save-dev
)

echo Generando el programa ejecutable de Windows...
call npm run build:win

echo.
echo =======================================================
echo   ¡Listo! El programa se guardo en la carpeta:
echo   aplicaciones\windows-app\dist\win-unpacked\La Tarima Decoracion.exe
echo =======================================================
pause
