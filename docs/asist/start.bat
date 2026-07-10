@echo off
title AutoFlow Editor - TK Studio AutoResponder
echo =======================================================
echo           AutoFlow - Editor Visual de Reglas
echo =======================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Detectado Node.js. Iniciando servidor...
    start http://localhost:28282
    node server.js
    goto end
)

:: Check Python
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Detectado Python. Iniciando servidor HTTP...
    start http://localhost:28282
    python -m http.server 28282
    goto end
)

echo [ERROR] No se encontro ni Node.js ni Python en tu sistema.
echo Para usar esta aplicacion de forma interactiva e importar/exportar archivos,
echo necesitas tener instalado Node.js (recomendado) o Python.
echo.
echo Intentando abrir el archivo index.html directamente en el navegador...
echo Nota: Ciertas funcionalidades de importacion/exportacion locales podrian 
echo verse limitadas por restricciones de seguridad del navegador (CORS).
echo.
start index.html

:end
pause
