// minify-local.js
const fs = require('fs-extra');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const cleanCSS = new CleanCSS({ compatibility: '*' });

async function build() {
    const srcDir = path.join(__dirname, '..');
    const distDir = path.join(srcDir, 'docs');

    // Escanear música para generar list.json actualizado
    const scanMusica = require('./scan-musica');
    try {
        console.log('🎵 Escaneando carpeta de música...');
        scanMusica(srcDir);
    } catch (err) {
        console.error('❌ Error escaneando música:', err);
    }

    console.log('🧹 Limpiando carpeta docs...');
    fs.emptyDirSync(distDir);

    // 1. Copiar carpetas estáticas que no requieren minificación
    const foldersToCopy = ['img', 'GASTOS', 'p', 'audio', 'Musica', 'asist'];
    for (const folder of foldersToCopy) {
        const folderSrc = path.join(srcDir, folder);
        if (fs.existsSync(folderSrc)) {
            console.log(`📂 Copiando carpeta ${folder}...`);
            fs.copySync(folderSrc, path.join(distDir, folder));
        }
    }

    // 2. Copiar archivos raíz sueltos
    const rootFiles = ['favicon.ico', 'manifest.json', 'robots.txt', 'sitemap.xml', 'sw.js'];
    for (const file of rootFiles) {
        const fileSrc = path.join(srcDir, file);
        if (fs.existsSync(fileSrc)) {
            if (file === 'sw.js') {
                console.log('⚙️ Minificando sw.js...');
                const content = fs.readFileSync(fileSrc, 'utf8');
                const minified = await minify(content, { mangle: false });
                fs.writeFileSync(path.join(distDir, file), minified.code);
            } else {
                console.log(`📄 Copiando ${file}...`);
                fs.copySync(fileSrc, path.join(distDir, file));
            }
        }
    }

    // 3. Minificar HTMLs
    const htmlFiles = ['index.html', 'catalogo.html', 'calcular.html', 'visualizador.html', 'mayorista.html', 'musica.html', '404.html'];
    for (const html of htmlFiles) {
        const htmlSrc = path.join(srcDir, html);
        if (fs.existsSync(htmlSrc)) {
            console.log(`📄 Copiando y limpiando comentarios en ${html}...`);
            let content = fs.readFileSync(htmlSrc, 'utf8');
            // Quitar comentarios HTML para aligerar peso
            content = content.replace(/<!--[\s\S]*?-->/g, '');
            fs.writeFileSync(path.join(distDir, html), content);
        }
    }

    // 4. Procesar y Minificar CSS
    console.log('🎨 Procesando hojas de estilo CSS...');
    const cssSrcDir = path.join(srcDir, 'css');
    const cssDistDir = path.join(distDir, 'css');
    fs.ensureDirSync(cssDistDir);

    if (fs.existsSync(cssSrcDir)) {
        const cssFiles = fs.readdirSync(cssSrcDir).filter(f => f.endsWith('.css'));
        for (const file of cssFiles) {
            const filePath = path.join(cssSrcDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const minified = cleanCSS.minify(content);
            if (minified.errors.length) {
                console.error(`❌ Error en CSS ${file}:`, minified.errors);
            }
            fs.writeFileSync(path.join(cssDistDir, file), minified.styles);
            console.log(`   ⚡ CSS Minificado: ${file}`);
        }
    }

    // 5. Procesar y Minificar JS (Mangle: False)
    console.log('⚡ Procesando archivos de lógica JS...');
    const jsSrcDir = path.join(srcDir, 'js');
    const jsDistDir = path.join(distDir, 'js');
    fs.ensureDirSync(jsDistDir);

    if (fs.existsSync(jsSrcDir)) {
        const jsFiles = fs.readdirSync(jsSrcDir).filter(f => f.endsWith('.js'));
        for (const file of jsFiles) {
            const filePath = path.join(jsSrcDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            try {
                // MANGLE: FALSE es vital para no romper nombres de variables globales entre archivos SPA
                const minified = await minify(content, {
                    mangle: false,
                    compress: {
                        passes: 2
                    }
                });
                fs.writeFileSync(path.join(jsDistDir, file), minified.code);
                console.log(`   ⚡ JS Minificado: ${file}`);
            } catch (err) {
                console.error(`   ❌ Error minificando JS ${file}:`, err.message);
                // Fallback: copiar original si falla Terser
                fs.copySync(filePath, path.join(jsDistDir, file));
            }
        }
    }

    // 6. Crear el archivo iniciar.bat de conveniencia en la carpeta docs
    console.log('📄 Generando iniciar.bat en la carpeta docs...');
    const batContent = `@echo off\r\ntitle Servidor de Produccion (Minificado) - LA TARIMA\r\necho =========================================================\r\necho Iniciando Servidor local para la carpeta MINIFICADA (docs)\r\necho =========================================================\r\necho.\r\necho TIP: Para probar la version final optimizada:\r\necho 1. Abrir en tu navegador: http://localhost:7500\r\necho 2. Para cerrar el servidor, presiona Ctrl+C en esta ventana.\r\necho.\r\necho =========================================================\r\necho.\r\n\r\n:: Abre el navegador local en el puerto 7500\r\nstart http://localhost:7500\r\n\r\n:: Inicia el servidor express en una sola linea de comando Node\r\nnode -e "const express = require('express'); const path = require('path'); const app = express(); app.use(express.static('.')); app.get('*', (req, res) => res.sendFile(path.resolve('./index.html'))); app.listen(7500, () => console.log('>>> Servidor web listo en el puerto 7500.'));"\r\n`;
    fs.writeFileSync(path.join(distDir, 'iniciar.bat'), batContent, 'utf8');

    console.log('\n🎉 ¡CONSTRUCCIÓN LOCAL COMPLETADA EN CARPETA /docs/!');
}

build().catch(console.error);
