// _dev/split_products.js
// Script para desacoplar products-data.js en:
// 1. data/products/[rubro]/[categoria]/p-{id}.json (Fichas individuales organizadas en subcarpetas)
// 2. data/catalog-index.json (Índice liviano con atributo "file" relativo)
// 3. data/categories.json (Estructura de rubros y categorías)
// 4. docs/data/... (Sincronización estática para GitHub Pages)

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PRODUCTS_DIR = path.join(DATA_DIR, 'products');

const DOCS_DATA_DIR = path.join(ROOT_DIR, 'docs', 'data');
const DOCS_PRODUCTS_DIR = path.join(DOCS_DATA_DIR, 'products');

// 1. Leer el archivo fuente actual
const sourceFile = path.join(ROOT_DIR, 'js', 'products-data.js');
if (!fs.existsSync(sourceFile)) {
    console.error('❌ No se encontró js/products-data.js');
    process.exit(1);
}

let code = fs.readFileSync(sourceFile, 'utf8');
code = code.replace(/^\s*const\s+productsData\s*=/, 'global.productsData =');
eval(code);

const categoriesRaw = global.productsData;
if (!Array.isArray(categoriesRaw)) {
    console.error('❌ productsData no es un array válido');
    process.exit(1);
}

// 2. Mapeo de categorías a slugs limpios de carpetas
const CAT_SLUGS = {
    'Vinotecas': 'vinotecas',
    'Percheros': 'percheros',
    'Barandas': 'barandas',
    'Organizadores': 'organizadores',
    'Estantes': 'estantes',
    'cunas-madera-pino': 'cunas-madera-pino',
    'camas-madera-pino': 'camas-madera-pino',
    'muebles': 'escaleras',
    'Steps': 'fitness-steps',
    'Juguetes': 'rincon-infantil',
    'sillas-sillones': 'sillas-sillones',
    'Mesas-madera': 'mesas-madera',
    'jardin-patio': 'jardin-patio',
    'Hogar': 'hogar',
    'productos-algarrobo': 'productos-algarrobo',
    'bazar-cocina': 'bazar-cocina',
    'cajones-madera': 'cajones-madera',
    'Podios': 'podios',
    'Borrador': 'borrador',
    'cat-21-mu7q9i7y': 'kits-electricos',
    'cat-23-mu93q76a': 'tornillos'
};

function getCategorySlug(catId) {
    if (CAT_SLUGS[catId]) return CAT_SLUGS[catId];
    return String(catId || 'general')
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '');
}

function getRubroForCategory(catId) {
    if (catId === 'cat-21-mu7q9i7y' || catId === 'electricidad-todos') return 'electricidad';
    if (catId === 'cat-23-mu93q76a' || catId === 'herrajes-todos') return 'herrajes';
    if (catId && catId.startsWith('pintureria')) return 'pintureria';
    return 'carpinteria';
}

// 3. Limpiar carpeta products previa para evitar archivos planos antiguos mezclados
if (fs.existsSync(PRODUCTS_DIR)) {
    fs.rmSync(PRODUCTS_DIR, { recursive: true, force: true });
}
if (fs.existsSync(DOCS_PRODUCTS_DIR)) {
    fs.rmSync(DOCS_PRODUCTS_DIR, { recursive: true, force: true });
}

[DATA_DIR, PRODUCTS_DIR, DOCS_DATA_DIR, DOCS_PRODUCTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 4. Extraer categorías sin el array pesado de productos
const categoriesOnly = categoriesRaw.map(c => {
    const copy = { ...c };
    delete copy.products;
    if (copy.id === 'Steps' && !copy.rubro) copy.rubro = 'carpinteria';
    return copy;
});

fs.writeFileSync(path.join(DATA_DIR, 'categories.json'), JSON.stringify(categoriesOnly, null, 2), 'utf8');
fs.writeFileSync(path.join(DOCS_DATA_DIR, 'categories.json'), JSON.stringify(categoriesOnly, null, 2), 'utf8');
console.log('✅ data/categories.json generado (' + categoriesOnly.length + ' categorías)');

// 5. Mapear y unificar todos los productos únicos
const uniqueProductsMap = new Map();

categoriesRaw.forEach(cat => {
    if (Array.isArray(cat.products)) {
        cat.products.forEach(p => {
            if (!p || !p.id) return;
            const pid = String(p.id).trim();

            if (!uniqueProductsMap.has(pid)) {
                const pClone = JSON.parse(JSON.stringify(p));
                pClone.categories = [cat.id];
                if (!pClone.primaryCatId) {
                    pClone.primaryCatId = !cat.id.endsWith('-todos') ? cat.id : 'carpinteria-todos';
                }
                uniqueProductsMap.set(pid, pClone);
            } else {
                const existing = uniqueProductsMap.get(pid);
                if (!existing.categories.includes(cat.id)) {
                    existing.categories.push(cat.id);
                }
                if (existing.primaryCatId && existing.primaryCatId.endsWith('-todos') && !cat.id.endsWith('-todos')) {
                    existing.primaryCatId = cat.id;
                }
            }
        });
    }
});

console.log(`🔍 Total de productos únicos procesados: ${uniqueProductsMap.size}`);

// 6. Escribir cada archivo en su subcarpeta y armar el catalog-index.json
const catalogIndex = [];

uniqueProductsMap.forEach((product, pid) => {
    // Determinar rubro y categoría limpia
    let primaryCat = product.primaryCatId;
    if (!primaryCat || primaryCat.endsWith('-todos')) {
        primaryCat = product.categories.find(c => !c.endsWith('-todos')) || product.categories[0] || 'carpinteria-todos';
        product.primaryCatId = primaryCat;
    }

    const rubro = getRubroForCategory(primaryCat);
    product.rubro = rubro;
    const catSlug = getCategorySlug(primaryCat);

    // Carpetas físicas por Rubro y Categoría
    const productDir = path.join(PRODUCTS_DIR, rubro, catSlug);
    const docsProductDir = path.join(DOCS_PRODUCTS_DIR, rubro, catSlug);
    [productDir, docsProductDir].forEach(d => {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });

    const relFilePath = `data/products/${rubro}/${catSlug}/p-${pid}.json`;
    const singleProductPath = path.join(productDir, `p-${pid}.json`);
    const singleProductDocsPath = path.join(docsProductDir, `p-${pid}.json`);
    const productJson = JSON.stringify(product, null, 2);

    fs.writeFileSync(singleProductPath, productJson, 'utf8');
    fs.writeFileSync(singleProductDocsPath, productJson, 'utf8');

    // Determinar miniatura y precio representativo para el índice liviano
    const firstAcabado = (product.acabados_groups && product.acabados_groups.find(g => !g.hidden)) ||
                         (product.acabados_groups && product.acabados_groups[0]) || {};
    const firstMedida = (firstAcabado.medidas_variants && firstAcabado.medidas_variants.find(m => !m.hidden && m.price > 0)) ||
                        (firstAcabado.medidas_variants && firstAcabado.medidas_variants[0]) || {};

    let coverImg = firstAcabado.cover_image || '';
    if (!coverImg && product.image) {
        coverImg = Array.isArray(product.image) ? product.image[0] : product.image;
    }

    catalogIndex.push({
        id: product.id,
        shortId: product.shortId || null,
        title: product.title,
        rubro: rubro,
        primaryCatId: product.primaryCatId,
        categories: product.categories || [],
        subcategoria: product.subcategoria || '',
        price: firstMedida.price || product.price || 0,
        image: coverImg,
        tags: product.tags || [],
        visible: product.visible !== false,
        file: relFilePath
    });
});

const catalogIndexJson = JSON.stringify(catalogIndex, null, 2);
fs.writeFileSync(path.join(DATA_DIR, 'catalog-index.json'), catalogIndexJson, 'utf8');
fs.writeFileSync(path.join(DOCS_DATA_DIR, 'catalog-index.json'), catalogIndexJson, 'utf8');

console.log(`✅ ${uniqueProductsMap.size} fichas individuales creadas en subcarpetas data/products/[rubro]/[categoria]/`);
console.log(`✅ data/catalog-index.json creado con rutas relativas 'file' (~${(catalogIndexJson.length / 1024).toFixed(1)} KB)`);
console.log('🚀 Migración a subcarpetas de productos completada.');
