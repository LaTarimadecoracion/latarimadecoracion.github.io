const fs = require('fs');
const path = require('path');

// 1. Leer archivo products-data.js
const productsContent = fs.readFileSync(path.join(__dirname, '..', 'js', 'products-data.js'), 'utf8');

let productsArray = [];
try {
    const fn = new Function(productsContent + '\nreturn productsData;');
    productsArray = fn();
} catch(e) {
    console.error('Error parseando productsData:', e);
    process.exit(1);
}

const ROOT_DIR = path.join(__dirname, '..');
const BASE_URL = 'https://latarimadecoracion.github.io';

function toBase36(num) {
    if (typeof num !== 'number' || num <= 0 || isNaN(num)) return '0';
    return num.toString(36).toUpperCase();
}

function generateSeoHtml(product, shortCode) {
    let imageUrl = '';
    if (Array.isArray(product.image) && product.image.length > 0) {
        imageUrl = product.image[0];
    } else if (typeof product.image === 'string') {
        imageUrl = product.image;
    } else if (product.acabados_groups && product.acabados_groups.length > 0) {
        imageUrl = product.acabados_groups[0].cover_image || '';
    }
    
    // Si la imagen es relativa, asegurarla con encodeURI
    if (imageUrl && !imageUrl.startsWith('http')) {
        const cleanPath = imageUrl.replace(/^[\/\\]/, '').split('/').map(encodeURIComponent).join('/');
        imageUrl = `${BASE_URL}/${cleanPath}`;
    }
    if (!imageUrl) {
        imageUrl = `${BASE_URL}/img/logo_provisional.png`;
    }
    
    let desc = product.description || 'Muebles infantiles y de diseño a medida en madera de pino y eucalipto.';
    desc = desc.replace(/<[^>]*>?/gm, '').substring(0, 150).replace(/"/g, '&quot;');
    const safeTitle = (product.title || 'Producto La Tarima').replace(/"/g, '&quot;');
    
    const pageUrl = `${BASE_URL}/p/${shortCode}.html`;
    const redirectTarget = `${BASE_URL}/?s=${shortCode}`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} | LA TARIMA</title>
    
    <!-- Meta Tags para buscadores y redes sociales (WhatsApp, Facebook, Twitter, Instagram) -->
    <meta name="description" content="${desc}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="LA TARIMA DECORACIÓN">
    <meta property="og:title" content="${safeTitle} - LA TARIMA">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${pageUrl}">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle} - LA TARIMA">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${imageUrl}">
    
    <script>
        (function() {
            var q = window.location.search;
            var target = "${redirectTarget}";
            window.location.replace(q ? target + "&" + q.substring(1) : target);
        })();
    </script>
</head>
<body>
    <p>Redirigiendo a <a href="${redirectTarget}">${safeTitle}</a>...</p>
</body>
</html>`;
}

function generateSeoStubs(productsArray) {
    const pDir = path.join(ROOT_DIR, 'p');
    
    if (!fs.existsSync(pDir)) {
        fs.mkdirSync(pDir, { recursive: true });
    } else {
        const existingFiles = fs.readdirSync(pDir);
        existingFiles.forEach(file => {
            if (file.endsWith('.html')) {
                fs.unlinkSync(path.join(pDir, file));
            }
        });
    }
    
    let count = 0;
    
    productsArray.forEach((category, cIdx) => {
        if (!category.products || !Array.isArray(category.products)) return;
        
        const catCode = toBase36(cIdx + 1);
        
        category.products.forEach((product, pIdx) => {
            if (!product || !product.id) return;
            
            const prodCode = toBase36(pIdx + 1);
            const shortCodeWithDot = `${catCode}.${prodCode}`;
            const shortCodeClean = product.id || `${catCode}${prodCode}`;
            
            // Generar HTML para el ID del producto (ej: p/52.html)
            const htmlClean = generateSeoHtml(product, shortCodeClean);
            fs.writeFileSync(path.join(pDir, `${shortCodeClean}.html`), htmlClean, 'utf8');
            count++;

            // Si el ID del producto no incluye punto, generar también la versión con punto (ej: p/5.2.html) para mantener ambos links activos
            if (shortCodeWithDot !== shortCodeClean) {
                const htmlWithDot = generateSeoHtml(product, shortCodeWithDot);
                fs.writeFileSync(path.join(pDir, `${shortCodeWithDot}.html`), htmlWithDot, 'utf8');
                count++;
            }
        });
    });
    
    console.log(`✅ ¡Proceso finalizado! Se generaron únicamente los ${count} archivos HTML de URLs cortas en /p.`);
}

generateSeoStubs(productsArray);
