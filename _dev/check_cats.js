const fs = require('fs');
let code = fs.readFileSync('js/products-data.js', 'utf8');
code = code.replace(/const productsData\s*=/, 'global.productsData =');
eval(code);

console.log('--- CATEGORIAS ---');
global.productsData.forEach((c, idx) => {
  console.log(`${idx}: id="${c.id}", name="${c.name}", rubro="${c.rubro}", visible=${c.visible}, count=${c.products ? c.products.length : 0}`);
});
