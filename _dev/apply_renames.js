const fs = require('fs');

let code = fs.readFileSync('js/products-data.js', 'utf8');
code = code.replace(/const productsData\s*=/, 'global.productsData =');
eval(code);

let data = global.productsData;

// 1. Renombrar las categorías solicitadas
const renames = {
  'cunas-madera-pino': 'Cunas & Sueños',
  'Juguetes': 'Rincón Infantil',
  'camas-madera-pino': 'Camas & Cuchetas',
  'Estantes': 'Repisas & Estantes',
  'Mesas-madera': 'Mesas & Escritorios',
  'Hogar': 'Muebles de Hogar',
  'productos-algarrobo': 'Línea Algarrobo',
  'Steps': 'Fitness & Steps'
};

Object.keys(renames).forEach(id => {
  const cat = data.find(c => c.id === id);
  if (cat) {
    const oldName = cat.name;
    cat.name = renames[id];
    console.log(`Renombrada: "${oldName}" -> "${cat.name}"`);
  }
});

// 2. Crear categoría 'Cajones de Madera'
let catCajones = data.find(c => c.id === 'cajones-madera');
if (!catCajones) {
  catCajones = {
    id: 'cajones-madera',
    name: 'Cajones de Madera',
    image: 'img/organizadores/baul-de-madera-de-pino/1782487445775-imagen.webp',
    rubro: 'carpinteria',
    order: 14,
    products: [],
    visible: true
  };
  data.push(catCajones);
  console.log('Creada categoría: "Cajones de Madera"');
}

// Asociar el baúl / cajón de guardado y los steps/cajones si corresponde
let prodCatalog = new Map();
data.forEach(c => {
  if (c.products) c.products.forEach(p => {
    if (!prodCatalog.has(p.id)) prodCatalog.set(p.id, p);
  });
});

['41', 'A1', 'A2', 'A3', 'A4'].forEach(pId => {
  if (prodCatalog.has(pId)) {
    const pCopy = JSON.parse(JSON.stringify(prodCatalog.get(pId)));
    pCopy.primaryCatId = 'cajones-madera';
    catCajones.products.push(pCopy);
  }
});
console.log(`Cajones de Madera tiene ${catCajones.products.length} productos.`);

// Guardar
const newContent = 'const productsData = ' + JSON.stringify(data, null, 4) + ';\n';
fs.writeFileSync('js/products-data.js', newContent, 'utf8');
console.log('--- ACTUALIZADO CON ÉXITO ---');
