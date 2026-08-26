const fs = require('fs');
const path = require('path');

const productsDataPath = path.join(__dirname, '..', 'js', 'products-data.js');
let productsContent = fs.readFileSync(productsDataPath, 'utf8');

let productsArray = [];
try {
    const fn = new Function(productsContent + '\nreturn productsData;');
    productsArray = fn();
} catch(e) {
    console.error('Error cargando productsData:', e);
    process.exit(1);
}

function toBase36(num) {
    if (typeof num !== 'number' || num <= 0 || isNaN(num)) return '0';
    return num.toString(36).toUpperCase();
}

let modifiedCount = 0;
let realCatIndex = 0;

productsArray.forEach((category) => {
    if (!category.products || !Array.isArray(category.products)) return;
    
    // Si es la categoría sintética/general "todos los productos", saltarla
    if (category.id && category.id.endsWith('-todos')) return;

    realCatIndex++;
    const catCode = toBase36(realCatIndex);

    category.products.forEach((product, pIdx) => {
        if (!product || !product.id) return;

        const prodCode = toBase36(pIdx + 1);
        const newCleanId = `${catCode}${prodCode}`;

        if (product.id !== newCleanId) {
            product.id = newCleanId;
            modifiedCount++;
        }
    });
});

// Ahora actualizar también los IDs en la categoría respaldo "-todos" para coincidir
productsArray.forEach((category) => {
    if (category.id && category.id.endsWith('-todos') && Array.isArray(category.products)) {
        category.products.forEach((product) => {
            // Buscar el producto en categorías reales para clonar su nuevo id
            for (const cat of productsArray) {
                if (cat.id && !cat.id.endsWith('-todos') && Array.isArray(cat.products)) {
                    const found = cat.products.find(p => p.title === product.title);
                    if (found) {
                        product.id = found.id;
                        break;
                    }
                }
            }
        });
    }
});

const updatedContent = `const productsData = ${JSON.stringify(productsArray, null, 4)};\n`;
fs.writeFileSync(productsDataPath, updatedContent, 'utf8');

console.log(`✅ ¡Migración de DNI/ID completada! Se actualizaron ${modifiedCount} productos en js/products-data.js.`);
