const fs = require('fs');
const path = require('path');

const catalogIndex = JSON.parse(fs.readFileSync('data/catalog-index.json', 'utf8'));
const allProducts = [];

for (const entry of catalogIndex) {
  try {
    const fullPath = path.resolve(entry.file);
    if (fs.existsSync(fullPath)) {
      const prodData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      allProducts.push(prodData);
    } else {
      console.warn('No existe:', entry.file);
    }
  } catch (err) {
    console.error('Error leyendo', entry.file, err.message);
  }
}

console.log(`Reuniendo ${allProducts.length} productos en bundle...`);

const jsContent = `const productsData = ${JSON.stringify(allProducts, null, 2)};`;

// Guardar en todas las ubicaciones donde la web lee productos
const targets = [
  'js/products-data.js',
  'js/data/products-data.js',
  'docs/js/products-data.js',
  'docs/js/data/products-data.js'
];

for (const t of targets) {
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, jsContent, 'utf8');
  console.log(`Actualizado: ${t}`);
}

console.log('¡Sincronización de products-data.js completada con éxito!');
