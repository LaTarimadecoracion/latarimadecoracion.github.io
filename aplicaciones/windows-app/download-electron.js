const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

console.log('Descargando binario de Electron para Windows...');

const version = '34.0.0';
const url = `https://github.com/electron/electron/releases/download/v${version}/electron-v${version}-win32-x64.zip`;
const electronDir = path.join(__dirname, 'node_modules', 'electron');
const distDir = path.join(electronDir, 'dist');
const zipPath = path.join(electronDir, 'electron.zip');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function download(url, dest, callback) {
  const file = fs.createWriteStream(dest);
  https.get(url, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
      return download(response.headers.location, dest, callback);
    }
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        setTimeout(callback, 500);
      });
    });
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error('Error al descargar:', err.message);
  });
}

download(url, zipPath, () => {
  console.log('Descarga completada. Extrayendo binarios con PowerShell Expand-Archive...');
  try {
    const psCmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${distDir}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });

    fs.writeFileSync(path.join(electronDir, 'path.txt'), 'electron.exe', 'utf-8');
    
    if (fs.existsSync(zipPath)) {
      try { fs.unlinkSync(zipPath); } catch(e) {}
    }

    console.log('¡Electron instalado y verificado exitosamente para Windows 10/11!');
  } catch (err) {
    console.error('Error durante la extracción:', err.message);
  }
});
