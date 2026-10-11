const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'data', 'catalog-index.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// 1. Actualizar p-67
const idx67 = catalog.findIndex(p => p.id === "67");
if (idx67 !== -1) {
    catalog[idx67].title = "Cortes de Madera para Estantes";
    catalog[idx67].primaryCatId = "cortes-madera";
    catalog[idx67].price = 5800;
}

// 2. Actualizar p-69
const idx69 = catalog.findIndex(p => p.id === "69");
if (idx69 !== -1) {
    catalog[idx69].title = "Cortes de Madera a Medida (Personalizado)";
    catalog[idx69].primaryCatId = "cortes-madera";
    catalog[idx69].price = 3500;
}

// 3. Agregar p-68 si no existe
const idx68 = catalog.findIndex(p => p.id === "68");
if (idx68 === -1) {
    catalog.push({
        id: "68",
        shortId: null,
        title: "Cortes de Madera para Escritorios y Mesas",
        rubro: "carpinteria",
        primaryCatId: "cortes-madera",
        categories: ["carpinteria-todos", "cortes-madera"],
        subcategoria: "",
        price: 27500,
        image: "img/estantes/estantes/estantes.webp",
        tags: ["escritorio", "mesa", "tapa", "tablero", "corte", "madera"],
        visible: true,
        file: "data/products/carpinteria/cortes-madera/p-68.json"
    });
} else {
    catalog[idx68].title = "Cortes de Madera para Escritorios y Mesas";
    catalog[idx68].primaryCatId = "cortes-madera";
    catalog[idx68].price = 27500;
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
console.log('✅ catalog-index.json sincronizado correctamente.');
