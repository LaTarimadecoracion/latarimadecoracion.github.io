const fs = require('fs');
const path = require('path');

// 1. Leer archivo products-data.js (desde js/data/ con fallback a js/)
const productsPath = fs.existsSync(path.join(__dirname, '..', 'js', 'data', 'products-data.js'))
    ? path.join(__dirname, '..', 'js', 'data', 'products-data.js')
    : path.join(__dirname, '..', 'js', 'products-data.js');
const productsContent = fs.readFileSync(productsPath, 'utf8');

let productsArray = [];
try {
    const fn = new Function(productsContent + '\nreturn productsData;');
    productsArray = fn();
} catch(e) {
    console.error('Error parseando productsData:', e);
    process.exit(1);
}

const ROOT_DIR = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const BASE_URL = 'https://latarimadecoracion.github.io';
const TODAY = new Date().toISOString().split('T')[0];

function toBase36(num) {
    if (typeof num !== 'number' || num <= 0 || isNaN(num)) return '0';
    return num.toString(36).toUpperCase();
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function generateSeoHtml(product, shortCode, categoryName = '') {
    let imageUrl = '';
    if (Array.isArray(product.image) && product.image.length > 0) {
        imageUrl = product.image[0];
    } else if (typeof product.image === 'string') {
        imageUrl = product.image;
    } else if (product.acabados_groups && product.acabados_groups.length > 0) {
        imageUrl = product.acabados_groups[0].cover_image || '';
    }
    
    // Si la imagen es relativa, asegurar URL absoluta
    if (imageUrl && !imageUrl.startsWith('http')) {
        const cleanPath = imageUrl.replace(/^[\/\\]/, '').split('/').map(encodeURIComponent).join('/');
        imageUrl = `${BASE_URL}/${cleanPath}`;
    }
    if (!imageUrl) {
        imageUrl = `${BASE_URL}/img/logo_provisional.png`;
    }
    
    // Mejor precio
    let bestPrice = 0;
    const firstGroup = (product.acabados_groups || []).find(g => !g.hidden);
    if (firstGroup && firstGroup.medidas_variants && firstGroup.medidas_variants.length > 0) {
        const firstVariant = firstGroup.medidas_variants.find(v => !v.hidden && v.price > 0);
        if (firstVariant) bestPrice = firstVariant.price;
    }
    if (!bestPrice && product.price) bestPrice = product.price;

    const rawDesc = (product.description || 'Muebles infantiles y de diseño a medida en madera de pino y eucalipto.').replace(/<[^>]*>?/gm, '');
    const metaDesc = rawDesc.substring(0, 160).trim();
    const safeTitle = escapeHtml(product.title || 'Producto La Tarima');
    const safeDesc = escapeHtml(rawDesc);
    const safeCategory = escapeHtml(categoryName);
    
    const pageUrl = `${BASE_URL}/p/${shortCode}.html`;
    const redirectTarget = `${BASE_URL}/?s=${shortCode}`;

    // Schema.org JSON-LD para indexación directa por Googlebot
    const schemaData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.title || "Producto La Tarima",
        "image": [imageUrl],
        "description": metaDesc,
        "brand": {
            "@type": "Brand",
            "name": "LA TARIMA"
        },
        "category": categoryName || "Muebles y Decoración",
        "offers": {
            "@type": "Offer",
            "url": pageUrl,
            "priceCurrency": "ARS",
            "price": bestPrice || 0,
            "availability": "https://schema.org/InStock",
            "itemCondition": "https://schema.org/NewCondition"
        }
    };

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} | LA TARIMA</title>
    
    <meta name="robots" content="index, follow">
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <link rel="canonical" href="${pageUrl}">

    <!-- Open Graph / Redes Sociales (WhatsApp, Facebook, Twitter, Instagram) -->
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="LA TARIMA DECORACIÓN">
    <meta property="og:title" content="${safeTitle} - LA TARIMA">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${pageUrl}">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle} - LA TARIMA">
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
    <meta name="twitter:image" content="${imageUrl}">

    <!-- Structured Data JSON-LD para Google Search & Shopping -->
    <script type="application/ld+json">
${JSON.stringify(schemaData, null, 2)}
    </script>
    
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 2rem; background: #FAF9F6; color: #1C1917; }
        .product-card { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; }
        img { max-width: 100%; height: auto; border-radius: 12px; margin-bottom: 1.5rem; }
        h1 { font-size: 1.6rem; margin-bottom: 0.5rem; }
        .category { color: #A0715B; font-weight: 700; text-transform: uppercase; font-size: 0.8rem; margin-bottom: 1rem; }
        .price { font-size: 1.5rem; font-weight: 800; color: #059669; margin: 1rem 0; }
        .desc { font-size: 0.95rem; line-height: 1.6; color: #44403C; text-align: left; margin-bottom: 2rem; }
        .btn-view { display: inline-block; background: #A0715B; color: white; padding: 12px 28px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 1rem; transition: background 0.2s; }
        .btn-view:hover { background: #8C5E49; }
    </style>

    <script>
        (function() {
            var q = window.location.search;
            var target = "${redirectTarget}";
            // Redirigir a la app SPA preservando parámetros
            window.location.replace(q ? target + "&" + q.substring(1) : target);
        })();
    </script>
</head>
<body>
    <noscript>
        <div class="product-card">
            <span class="category">${safeCategory}</span>
            <h1>${safeTitle}</h1>
            <img src="${imageUrl}" alt="${safeTitle}">
            ${bestPrice ? `<div class="price">$${bestPrice.toLocaleString('es-AR')}</div>` : ''}
            <div class="desc">${safeDesc}</div>
            <a href="${redirectTarget}" class="btn-view">Ver en La Tarima</a>
        </div>
    </noscript>
    <p style="text-align: center; margin-top: 2rem; color: #78716C;">
        Cargando <a href="${redirectTarget}" style="color: #A0715B; font-weight: 700;">${safeTitle}</a> en La Tarima...
    </p>
</body>
</html>`;
}

function run() {
    const rootPDir = path.join(ROOT_DIR, 'p');
    const docsPDir = path.join(DOCS_DIR, 'p');
    
    [rootPDir, docsPDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    const sitemapUrls = [
        { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily' },
        { loc: `${BASE_URL}/catalogo.html`, priority: '0.9', changefreq: 'daily' },
        { loc: `${BASE_URL}/calcular.html`, priority: '0.8', changefreq: 'monthly' },
        { loc: `${BASE_URL}/visualizador.html`, priority: '0.7', changefreq: 'monthly' }
    ];

    let count = 0;
    const addedShortCodes = new Set();

    productsArray.forEach((category, cIdx) => {
        if (!category.products || !Array.isArray(category.products)) return;
        
        const catCode = toBase36(cIdx + 1);
        const catName = category.name || '';
        
        category.products.forEach((product, pIdx) => {
            if (!product || !product.id) return;
            
            const prodCode = toBase36(pIdx + 1);
            const shortCodeWithDot = `${catCode}.${prodCode}`;
            const shortCodeClean = product.id || `${catCode}${prodCode}`;
            
            // Generar HTML para el ID corto limpio
            const htmlClean = generateSeoHtml(product, shortCodeClean, catName);
            fs.writeFileSync(path.join(rootPDir, `${shortCodeClean}.html`), htmlClean, 'utf8');
            if (fs.existsSync(DOCS_DIR)) {
                fs.writeFileSync(path.join(docsPDir, `${shortCodeClean}.html`), htmlClean, 'utf8');
            }
            count++;

            if (!addedShortCodes.has(shortCodeClean)) {
                addedShortCodes.add(shortCodeClean);
                sitemapUrls.push({
                    loc: `${BASE_URL}/p/${shortCodeClean}.html`,
                    priority: '0.8',
                    changefreq: 'weekly'
                });
            }

            // Si el ID del producto difiere del formato con punto (ej: 5.2 vs 52), generar ambos
            if (shortCodeWithDot !== shortCodeClean) {
                const htmlWithDot = generateSeoHtml(product, shortCodeWithDot, catName);
                fs.writeFileSync(path.join(rootPDir, `${shortCodeWithDot}.html`), htmlWithDot, 'utf8');
                if (fs.existsSync(DOCS_DIR)) {
                    fs.writeFileSync(path.join(docsPDir, `${shortCodeWithDot}.html`), htmlWithDot, 'utf8');
                }
                count++;

                if (!addedShortCodes.has(shortCodeWithDot)) {
                    addedShortCodes.add(shortCodeWithDot);
                    sitemapUrls.push({
                        loc: `${BASE_URL}/p/${shortCodeWithDot}.html`,
                        priority: '0.8',
                        changefreq: 'weekly'
                    });
                }
            }
        });
    });

    // 2. Generar sitemap.xml enriquecido
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

    fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
    if (fs.existsSync(DOCS_DIR)) {
        fs.writeFileSync(path.join(DOCS_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
    }

    console.log(`✅ ¡Proceso completado con éxito!`);
    console.log(`📄 Se generaron ${count} páginas HTML con contenido e indexación en /p y /docs/p.`);
    console.log(`🗺️ Se actualizó sitemap.xml con ${sitemapUrls.length} URLs indexables.`);
}

run();
