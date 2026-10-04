const fs = require('fs');

let code = fs.readFileSync('js/products-data.js', 'utf8');
code = code.replace(/const productsData\s*=/, 'global.productsData =');
eval(code);

let data = global.productsData;

// Mapa de todos los productos por id (usando la mejor copia que exista)
let prodCatalog = new Map();
data.forEach(cat => {
  if (cat.products) {
    cat.products.forEach(p => {
      if (!prodCatalog.has(p.id)) {
        prodCatalog.set(p.id, JSON.parse(JSON.stringify(p)));
      }
    });
  }
});

console.log('Total productos indexados:', prodCatalog.size);

// 1. Crear categoría 'Bazar & Cocina' si no existe
let catBazar = data.find(c => c.id === 'bazar-cocina' || c.name === 'Bazar & Cocina');
if (!catBazar) {
  catBazar = {
    id: 'bazar-cocina',
    name: 'Bazar & Cocina',
    image: 'img/organizadores/verdulero-x3/1780708453865-imagen.webp',
    rubro: 'carpinteria',
    order: 6,
    products: [],
    visible: true
  };
  data.push(catBazar);
  console.log('Categoria "Bazar & Cocina" creada con exito.');
}

// IDs que deben ir en cada categoría
const targetAssignments = {
  'bazar-cocina': ['43', '47', '44', '42', 'JC', 'G8', 'G9', 'G1', 'G3', 'G2', '4A'],
  'Vinotecas': ['21', '22', '24', '23', '25', '26', '27'],
  'Percheros': ['31', '39', '34', '33', '38', '37', '36', '35', '32'],
  'Barandas': ['52', '51', '54', '55', '57', '58', '59', '53', '56'],
  'cunas-madera-pino': ['71', '72', '73', '74', '75', '76', '77', '78'],
  'camas-madera-pino': ['81', '79', '41'],
  'Juguetes': ['B1', 'B4', 'B5', 'B6', 'C2', 'C1', 'C3', '4G', '4E', '4H', '7D', '4I'],
  'sillas-sillones': ['C1', 'C2', 'C3', 'B4', 'B5', 'B6'],
  'Mesas-madera': ['D2', 'D3', 'D4', 'D7', 'D6'],
  'Hogar': ['F2', 'F3', '46', 'F4', 'D6', '7C'],
  'Estantes': ['69', '11', '62', '65', '64', '67', '63', '48', '7C', '4E', '4H', '7D'],
  'muebles': ['91', '92', '4D', '4G'], // Escaleras
  'jardin-patio': ['E2', 'E1', 'E3', 'E4', 'E5'],
  'Organizadores': ['45', '9K', '49', '4B', '4C', '4F', '7C', '48', '41'],
  'Steps': ['A4', 'A3', 'A2', 'A1'],
  'Podios': ['H2', 'H1', 'H3'],
  'productos-algarrobo': ['G1', 'G2', 'G3']
};

// Aplicar asignaciones
Object.keys(targetAssignments).forEach(catId => {
  const cat = data.find(c => c.id === catId);
  if (!cat) {
    console.warn(`No se encontro la categoria: ${catId}`);
    return;
  }
  const targetIds = targetAssignments[catId];
  cat.products = [];
  targetIds.forEach(pId => {
    if (prodCatalog.has(pId)) {
      const pCopy = JSON.parse(JSON.stringify(prodCatalog.get(pId)));
      pCopy.primaryCatId = catId;
      cat.products.push(pCopy);
    } else {
      console.warn(`Producto no encontrado en catálogo: ${pId} para ${catId}`);
    }
  });
  console.log(`Cat "${cat.name}" (${cat.id}): ${cat.products.length} productos asignados.`);
});

// Ahora verificar 'carpinteria-todos': debe tener todos los productos únicos de carpintería
const carpTodos = data.find(c => c.id === 'carpinteria-todos');
if (carpTodos) {
  let carpIds = new Set();
  data.forEach(c => {
    if ((c.rubro === 'carpinteria' || !c.rubro) && c.id !== 'carpinteria-todos' && c.id !== 'Borrador') {
      if (c.products) c.products.forEach(p => carpIds.add(p.id));
    }
  });
  carpTodos.products = [];
  carpIds.forEach(pId => {
    if (prodCatalog.has(pId)) {
      carpTodos.products.push(JSON.parse(JSON.stringify(prodCatalog.get(pId))));
    }
  });
  console.log(`"carpinteria-todos": ${carpTodos.products.length} productos asignados.`);
}

// Guardar archivo actualizado
const newFileContent = 'const productsData = ' + JSON.stringify(data, null, 4) + ';\n';
fs.writeFileSync('js/products-data.js', newFileContent, 'utf8');
console.log('--- ACTUALIZACION COMPLETADA CON EXITO ---');
