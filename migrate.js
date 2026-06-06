// migrate.js
const fs = require('fs');
const path = require('path');

const sanitizeFolderName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Saca acentos
        .replace(/[^a-z0-9]/g, '-');     // Reemplaza espacios por guiones
};

function normalizeAcabado(tipo) {
    if (!tipo) return 'Natural';
    const lower = tipo.toLowerCase().trim();
    if (lower.startsWith('natural') || lower === 'comprar' || lower === 'inclinada' || lower === 'vertical') return 'Natural';
    if (lower.startsWith('barniz') || lower === 'barnizadas' || lower === 'barnizado') return 'Barnizado';
    if (lower.startsWith('blanc') || lower === 'blancas' || lower === 'blanco') return 'Blanco';
    if (lower.startsWith('tint') || lower === 'tintado' || lower === 'tintadas') return 'Tintado';
    if (lower.startsWith('pint') || lower === 'pintado') return 'Pintado';
    if (lower.match(/\d+un/)) return 'Natural';
}

function formatVariantLabel(medida, tipo) {
    let size = medida ? medida.trim() : '';
    let pack = tipo ? tipo.trim() : '';

    // Detect if 'pack' represents a quantity pack (e.g. "1un", "2un", "3un", "12 un")
    const isPack = /\d+\s*un/i.test(pack);
    
    if (isPack) {
        const qty = pack.replace(/\D/g, '');
        const packLabel = qty === '1' ? '1 Unidad' : `Combo x${qty}`;
        if (size) {
            return `${size} (${packLabel})`;
        } else {
            return packLabel;
        }
    }
    
    // Normal fallback
    if (size) return size;
    if (pack && pack !== 'Comprar' && pack !== 'Natural') return pack;
    return 'Único';
}

function resolveImages(oldProductId, modelo) {
    const sanModelo = sanitizeFolderName(modelo);
    const candidates = [
        path.join(__dirname, 'La Tarima', 'productos', oldProductId, 'img', sanModelo),
        path.join(__dirname, 'La Tarima', 'productos', oldProductId, 'img', modelo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()),
        path.join(__dirname, 'La Tarima', 'productos', oldProductId, 'img')
    ];

    for (const dir of candidates) {
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            const files = fs.readdirSync(dir);
            const imageFiles = files
                .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.startsWith('.'))
                .map(f => {
                    const rel = path.relative(__dirname, path.join(dir, f));
                    return rel.replace(/\\/g, '/'); // URL format
                });

            if (imageFiles.length > 0) {
                // Sort to get cover/01 images first
                imageFiles.sort((a, b) => {
                    const lowerA = a.toLowerCase();
                    const lowerB = b.toLowerCase();
                    if (lowerA.includes('portada') || lowerA.includes('01') || lowerA.includes('base') || lowerA.includes('fija-clasica')) return -1;
                    if (lowerB.includes('portada') || lowerB.includes('01') || lowerB.includes('base') || lowerB.includes('fija-clasica')) return 1;
                    return a.localeCompare(b);
                });
                return imageFiles;
            }
        }
    }
    return [];
}

async function run() {
    console.log('🚀 Iniciando Migración Masiva de Catálogo...');
    
    // 1. Cargar base de datos actual
    const currentJsPath = path.join(__dirname, 'js', 'products-data.js');
    const currentContent = fs.readFileSync(currentJsPath, 'utf8');
    const jsonString = currentContent.replace('const productsData = ', '').trim().replace(/;$/, '');
    let categories = JSON.parse(jsonString);
    
    console.log(`• Cargadas ${categories.length} categorías de js/products-data.js`);

    // 2. Cargar base de datos vieja
    const oldProductsPath = path.join(__dirname, 'La Tarima', 'products.json');
    const oldLinksPath = path.join(__dirname, 'La Tarima', 'Links', 'links.json');
    
    if (!fs.existsSync(oldProductsPath) || !fs.existsSync(oldLinksPath)) {
        console.error('❌ Error: No se encontraron los archivos viejos en La Tarima/');
        return;
    }
    
    const oldProductsRaw = fs.readFileSync(oldProductsPath, 'utf8').replace(/^\uFEFF/, '');
    const oldLinksRaw = fs.readFileSync(oldLinksPath, 'utf8').replace(/^\uFEFF/, '');
    const oldProducts = JSON.parse(oldProductsRaw);
    const oldLinks = JSON.parse(oldLinksRaw);
    
    console.log(`• Cargados ${oldProducts.length} productos metadatos de products.json`);
    console.log(`• Cargadas ${Object.keys(oldLinks.modules).length} secciones de links.json`);

    // Mapa de correspondencia de categorías para homogeneizar
    const categoryMapping = {
        'barandas': 'Barandas',
        'exterior': 'Exterior',
        'decoracion': 'Decoracion',
        'muebles': 'Muebles',
        'infantil': 'Infantil',
        'Organizacion, decoracion, otros': 'Organizacion',
        'Organizacion': 'Organizacion',
        'Cosina, organizador, verdule, organizacion, muebles, verduras': 'Organizacion',
        'organizacion': 'Organizacion',
        'cocina': 'Organizacion',
        'otros': 'Otros'
    };

    // Procesar cada sección en links.json
    for (const [moduleId, entries] of Object.entries(oldLinks.modules)) {
        if (moduleId === 'regalos') continue; // Omitir sección no comercial
        
        // Buscar metadato
        const oldMeta = oldProducts.find(p => p.id.toLowerCase().replace(/_/g, '-') === moduleId.toLowerCase().replace(/_/g, '-'));
        const oldMetaCat = oldMeta ? oldMeta.category : 'otros';
        
        // Resolver id de categoría nueva y nombre
        const newCatId = sanitizeFolderName(categoryMapping[oldMetaCat] || oldMetaCat || 'Otros');
        const newCatName = categoryMapping[oldMetaCat] || oldMetaCat || 'Otros';
        
        console.log(`\n📦 Procesando Módulo viejo [${moduleId}] -> Categoría destino [${newCatName}]`);

        // Buscar si ya existe la categoría
        let category = categories.find(c => c.id.toLowerCase() === newCatId.toLowerCase());
        if (!category) {
            category = {
                id: newCatId,
                name: newCatName.charAt(0).toUpperCase() + newCatName.slice(1),
                image: oldMeta ? 'La Tarima/' + oldMeta.image : 'img/logo_provisional.png',
                order: categories.length,
                products: []
            };
            categories.push(category);
            console.log(`➕ Categoría CREADA: ${category.name} (${category.id})`);
        }

        // Agrupar entradas por modelo
        const entriesByModel = {};
        entries.forEach(e => {
            const modelName = e.modelo || (oldMeta ? oldMeta.name : moduleId);
            if (!entriesByModel[modelName]) entriesByModel[modelName] = [];
            entriesByModel[modelName].push(e);
        });

        // Crear productos para cada modelo
        for (const [modelName, modelEntries] of Object.entries(entriesByModel)) {
            const prodId = sanitizeFolderName(modelName);
            
            // Si el producto es uno de los nuevos manuales detallados de la v2, lo respetamos intacto
            if (prodId === 'baranda-desmontable' || prodId === 'baranda-desmontable-montessori') {
                console.log(`  ⚠️ Respetado (Sin sobrescribir): El producto base [${modelName}].`);
                continue;
            }
            
            // Si ya existe en la categoría, lo removeremos para re-crearlo con el nuevo formato de combos
            const existingIdx = category.products.findIndex(p => p.id === prodId);
            if (existingIdx !== -1) {
                category.products.splice(existingIdx, 1);
                console.log(`  🔄 Actualizando: El producto [${modelName}] se re-generará con el nuevo formato de combos.`);
            }

            // Resolver imágenes
            const oldIdForPhotos = oldMeta ? oldMeta.id : moduleId;
            const images = resolveImages(oldIdForPhotos, modelName);
            const coverImage = images.length > 0 ? images[0] : (oldMeta ? 'La Tarima/' + oldMeta.image : 'img/logo_provisional.png');

            // Agrupar entradas del modelo por acabado
            const acabadosMap = {};
            modelEntries.forEach(entry => {
                const acaName = normalizeAcabado(entry.tipo);
                if (!acabadosMap[acaName]) acabadosMap[acaName] = [];
                acabadosMap[acaName].push(entry);
            });

            // Construir los grupos de acabados
            const acabadosGroups = [];
            for (const [acabadoName, acabadoEntries] of Object.entries(acabadosMap)) {
                const medidasVariants = acabadoEntries.map((e, idx) => {
                    const sizeLabel = formatVariantLabel(e.medida, e.tipo);

                    return {
                        medida: sizeLabel,
                        link: e.href || '',
                        default: false // se setea al final
                    };
                });

                // Setear default en la primera variante con link, o la primera en general
                const defaultIdx = medidasVariants.findIndex(v => v.link !== '');
                if (defaultIdx !== -1) {
                    medidasVariants[defaultIdx].default = true;
                } else if (medidasVariants.length > 0) {
                    medidasVariants[0].default = true;
                }

                acabadosGroups.push({
                    acabado_name: acabadoName,
                    cover_image: coverImage,
                    images_list: images.length > 0 ? images : [coverImage],
                    medidas_variants: medidasVariants
                });
            }

            // Crear el producto final
            const newProduct = {
                id: prodId,
                title: modelName,
                description: oldMeta ? oldMeta.description : `${modelName} con diseño artesanal en madera seleccionada.`,
                image: coverImage,
                acabados_groups: acabadosGroups
            };

            // Inyectar opcionales para barandas de sommier si corresponde
            if (moduleId.includes('sommier') || moduleId.includes('baranda')) {
                newProduct.optional_variant = {
                    label: "Espesor del tirante (opcional)",
                    options: [
                        "1.8 cm", "1.9 cm", "2 cm", "2.1 cm", "2.2 cm", "2.3 cm", "2.4 cm", "2.5 cm", "2.6 cm", "2.7 cm",
                        "2.8 cm", "2.9 cm", "3 cm", "3.1 cm", "3.2 cm", "3.3 cm", "3.4 cm", "3.5 cm", "Otras medidas"
                    ]
                };
            }

            category.products.push(newProduct);
            console.log(`  ✅ Producto IMPORTADO: ${newProduct.title} (${newProduct.acabados_groups.length} acabados, ${images.length} imágenes resolutas)`);
        }
    }

    // 3. Escribir resultados de vuelta a js/products-data.js
    const outputContent = 'const productsData = ' + JSON.stringify(categories, null, 4) + ';\n';
    fs.writeFileSync(currentJsPath, outputContent, 'utf8');
    
    console.log('\n=========================================================');
    console.log('🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('=========================================================');
    console.log(`• Archivo js/products-data.js sobrescrito.`);
    console.log(`• Categorías totales en el catálogo actual: ${categories.length}`);
}

run();
