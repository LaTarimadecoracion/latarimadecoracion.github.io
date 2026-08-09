const fs = require('fs-extra');
const path = require('path');

// 1. Cargar productos desde js/products-data.js
const productsDataPath = path.join(__dirname, '..', 'js', 'products-data.js');
let productsDataContent = fs.readFileSync(productsDataPath, 'utf8');

// Extraer el array JS
const jsonStr = productsDataContent.replace(/^const\s+productsData\s*=\s*/, '').replace(/;\s*$/, '');
let categories = [];
try {
    categories = JSON.parse(jsonStr);
} catch (err) {
    console.error('Error parseando products-data.js:', err);
    process.exit(1);
}

// Dominio base de tu sitio web público en GitHub Pages
const BASE_URL = 'https://latarimadecoracion.github.io';

// Campos requeridos por Meta / Facebook Catalog:
// id, title, description, availability, condition, price, link, image_link, brand
const headers = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
    'google_product_category'
];

function escapeCSV(text) {
    if (!text) return '""';
    const str = String(text).replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${str}"`;
}

const rows = [headers.join(',')];
const addedProductIds = new Set();

categories.forEach(cat => {
    if (!cat.products || !Array.isArray(cat.products)) return;

    cat.products.forEach(prod => {
        if (!prod.id || addedProductIds.has(prod.id)) return;
        addedProductIds.add(prod.id);

        const title = prod.title || 'Producto La Tarima';
        const description = prod.description || title;
        
        // Obtener precio (de variantes o directo)
        let priceNum = 0;
        if (prod.acabados_groups && prod.acabados_groups.length > 0) {
            for (const group of prod.acabados_groups) {
                if (group.medidas_variants && group.medidas_variants.length > 0) {
                    const defVar = group.medidas_variants.find(v => v.default) || group.medidas_variants[v => v.price > 0] || group.medidas_variants[0];
                    if (defVar && defVar.price) {
                        priceNum = defVar.price;
                        break;
                    }
                }
            }
        }
        
        const priceFormatted = priceNum > 0 ? `${priceNum} ARS` : "";
        
        // Imagen
        let imgUrl = prod.image || 'img/logo_provisional.png';
        if (!imgUrl.startsWith('http')) {
            imgUrl = `${BASE_URL}/${imgUrl.replace(/^\//, '')}`;
        }

        // Link de compra / producto
        const link = `${BASE_URL}/#catalog?prod=${prod.id}`;

        const row = [
            escapeCSV(prod.id),
            escapeCSV(title),
            escapeCSV(description),
            escapeCSV('in stock'),
            escapeCSV('new'),
            escapeCSV(priceFormatted),
            escapeCSV(link),
            escapeCSV(imgUrl),
            escapeCSV('La Tarima'),
            escapeCSV('Furniture')
        ];

        rows.push(row.join(','));
    });
});

const csvContent = rows.join('\n');

// Guardar en la raíz y en /docs/
const rootOutputPath = path.join(__dirname, '..', 'meta-catalog.csv');
const docsOutputPath = path.join(__dirname, '..', 'docs', 'meta-catalog.csv');

fs.writeFileSync(rootOutputPath, csvContent, 'utf8');
if (fs.existsSync(path.join(__dirname, '..', 'docs'))) {
    fs.writeFileSync(docsOutputPath, csvContent, 'utf8');
}

console.log(`✅ ¡Catálogo para Meta/Facebook creado exitosamente con ${addedProductIds.size} productos!`);
console.log(`📍 Archivo guardado en: ${rootOutputPath}`);
