const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 28282;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Decode URI to support spaces or special chars in files/folders
    let filePath = '.' + decodeURIComponent(req.url);
    if (filePath === './') {
        filePath = './index.html';
    }
    
    // Resolve relative path
    filePath = path.resolve(filePath);
    
    // Security: Prevent directory traversal (serve files only from the current project directory)
    const currentDir = path.resolve('.');
    if (!filePath.startsWith(currentDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Acceso denegado');
        return;
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Archivo no encontrado');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Error interno del servidor: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

function startServer(port) {
    server.listen(port, () => {
        console.log('==================================================');
        console.log(` Servidor AutoFlow iniciado con exito!`);
        console.log(` Abri tu navegador en: http://localhost:${port}`);
        console.log('==================================================');
        console.log(' Presiona Ctrl+C para detener el servidor.');
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`El puerto ${port} esta ocupado, probando con el ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });
}

startServer(PORT);
