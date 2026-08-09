const fs = require('fs-extra');
const path = require('path');

// 1. Modificar js/products-data.js (reemplazar price: 10000 por price: 0)
const productsDataPath = path.join(__dirname, '..', 'js', 'products-data.js');
let content = fs.readFileSync(productsDataPath, 'utf8');

// Reemplazar la asignación de precio 10000 por 0
const updatedContent = content.replace(/"price":\s*10000,/g, '"price": 0,');

fs.writeFileSync(productsDataPath, updatedContent, 'utf8');

// También actualizar en docs/js/products-data.js si existe
const docsProductsDataPath = path.join(__dirname, '..', 'docs', 'js', 'products-data.js');
if (fs.existsSync(docsProductsDataPath)) {
    fs.writeFileSync(docsProductsDataPath, updatedContent, 'utf8');
}

console.log('✅ Precios de 10000 cambiados a 0 en la web (products-data.js).');

// 2. Volver a ejecutar el generador de catálogo de Meta
require('./generate-meta-catalog');
