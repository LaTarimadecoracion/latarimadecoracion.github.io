const fs = require('fs-extra');
const path = require('path');

// 1. Eliminar la propiedad "price": 0 o dejarla sin valor en js/products-data.js
const productsDataPath = path.join(__dirname, '..', 'js', 'products-data.js');
let content = fs.readFileSync(productsDataPath, 'utf8');

// Quitar la línea "price": 0, por completo
const updatedContent = content.replace(/\s*"price":\s*0,?\r?\n/g, '\n');

fs.writeFileSync(productsDataPath, updatedContent, 'utf8');

// También actualizar en docs/js/products-data.js si existe
const docsProductsDataPath = path.join(__dirname, '..', 'docs', 'js', 'products-data.js');
if (fs.existsSync(docsProductsDataPath)) {
    fs.writeFileSync(docsProductsDataPath, updatedContent, 'utf8');
}

console.log('✅ Eliminadas las propiedades "price": 0 de la web (products-data.js).');

// 2. Modificar el generador de Meta para que si price <= 0 no ponga "0 ARS" sino celda vacía o ""
const generatorPath = path.join(__dirname, 'generate-meta-catalog.js');
let genContent = fs.readFileSync(generatorPath, 'utf8');
genContent = genContent.replace(
    /const priceFormatted = `\${priceNum} ARS`;/g,
    'const priceFormatted = priceNum > 0 ? `${priceNum} ARS` : "";'
);
fs.writeFileSync(generatorPath, genContent, 'utf8');

// Recompilar catálogo y build local
require('./build');
