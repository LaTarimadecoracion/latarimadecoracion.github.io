@echo off
echo =========================================================
echo Iniciando La Tarima 2.0 en Red Local...
echo =========================================================
echo.
echo TIP: Para entrar desde tu celular o tablet:
echo 1. Asegurate de que esten conectados al mismo Wi-Fi.
echo 2. Mira la pantalla negra a continuacion para ver tu IP local
echo    (ejemplo: http://192.168.1.15:7000) e ingresala en tu navegador.
echo.
echo =========================================================
echo.

:: Abre el navegador local
start http://localhost:7000

:: Inicia el servidor Node.js desde _dev
cd _dev
npm start
