@echo off
title Servidor de Produccion (Minificado) - LA TARIMA
echo =========================================================
echo Iniciando Servidor local para la carpeta MINIFICADA (docs)
echo =========================================================
echo.
echo TIP: Para probar la version final optimizada:
echo 1. Abrir en tu navegador: http://localhost:7500
echo 2. Para cerrar el servidor, presiona Ctrl+C en esta ventana.
echo.
echo =========================================================
echo.

:: Abre el navegador local en el puerto 7500
start http://localhost:7500

:: Inicia el servidor express en una sola linea de comando Node
node -e "const express = require('express'); const path = require('path'); const app = express(); app.use(express.static('.')); app.get('*', (req, res) => res.sendFile(path.resolve('./index.html'))); app.listen(7500, () => console.log('>>> Servidor web listo en el puerto 7500.'));"
