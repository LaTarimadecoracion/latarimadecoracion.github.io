const fs = require('fs');
const path = require('path');

// 1. Leer archivo products-data.js
const productsContent = fs.readFileSync(path.join(__dirname, '..', 'js', 'products-data.js'), 'utf8');

// 2. Extraer el array (removiendo "const productsData = " y el ";\n" al final)
// Una forma simple es evaluar el archivo en un contexto
let productsArray = [];
try {
    const fn = new Function(productsContent + '\nreturn productsData;');
    productsArray = fn();
} catch(e) {
    console.error('Error parseando productsData:', e);
    process.exit(1);
}

// 3. Pegar la funcion generateSeoStubs actualizada
const ROOT_DIR = path.join(__dirname, '..');

function generateSeoStubs(productsArray) {
    const pDir = path.join(ROOT_DIR, 'p');
    
    // Create /p folder if it doesn't exist
    if (!fs.existsSync(pDir)) {
        fs.mkdirSync(pDir, { recursive: true });
    }
    
    // Generate an HTML file for each product
    productsArray.forEach(category => {
        if (!category.products) return;
        category.products.forEach(product => {
            if (!product.id) return;
            
            let imageUrl = '';
            if (Array.isArray(product.image) && product.image.length > 0) {
                imageUrl = product.image[0];
            } else if (typeof product.image === 'string') {
                imageUrl = product.image;
            } else if (product.acabados_groups && product.acabados_groups.length > 0) {
                imageUrl = product.acabados_groups[0].cover_image || '';
            }
            
            // Format URL to be absolute
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = 'https://latarimadecoracion.github.io/' + imageUrl.replace(/^[\/\\]/, '');
            }
            if (!imageUrl) {
                imageUrl = 'https://latarimadecoracion.github.io/img/logo_provisional.png';
            }
            
            let desc = product.description || 'Muebles infantiles y de diseño a medida.';
            desc = desc.replace(/<[^>]*>?/gm, '').substring(0, 150).replace(/"/g, '&quot;');
            const safeTitle = (product.title || '').replace(/"/g, '&quot;');

            const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} | LA TARIMA</title>
    <meta property="og:type" content="website">
    <meta property="og:title" content="${safeTitle} - LA TARIMA">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="https://latarimadecoracion.github.io/p/${product.id}.html">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle} - LA TARIMA">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${imageUrl}">
    
    
    <script>
        var q = window.location.search;
        var p = "https://latarimadecoracion.github.io/?prod=${product.id}";
        window.location.replace(q ? p + "&" + q.substring(1) : p);
    </script>
</head>
<body>
    <p>Redirigiendo a <a href="https://latarimadecoracion.github.io/?prod=${product.id}">${safeTitle}</a>...</p>
</body>
</html>`;

            fs.writeFileSync(path.join(pDir, `${product.id}.html`), html, 'utf8');
        });
    });
    console.log('✅ Archivos SEO generados correctamente en /p');
}

generateSeoStubs(productsArray);
