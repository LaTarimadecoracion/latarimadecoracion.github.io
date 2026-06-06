// convert-and-optimize.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sanitizeFolderName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Saca acentos
        .replace(/[^a-z0-9]/g, '-');     // Reemplaza espacios por guiones
};

async function processImage(relPath, catId, prodId) {
    if (!relPath || !relPath.startsWith('La Tarima/')) {
        return relPath; // Keep as is if it's already in the new format or empty
    }

    const sourcePath = path.join(__dirname, relPath);
    if (!fs.existsSync(sourcePath)) {
        console.log(`  ⚠️ Archivo no encontrado en disco: ${relPath}`);
        return 'img/logo_provisional.png'; // Fallback
    }

    // Determine target directory and filename
    const ext = path.extname(relPath);
    const baseName = path.basename(relPath, ext);
    const targetCatFolder = sanitizeFolderName(catId);
    const targetProdFolder = prodId ? sanitizeFolderName(prodId) : 'general';
    const targetDir = path.join(__dirname, 'img', 'migrados', targetCatFolder, targetProdFolder);
    
    fs.mkdirSync(targetDir, { recursive: true });

    const targetFileName = `${baseName}.webp`;
    const targetPath = path.join(targetDir, targetFileName);
    const relTargetPath = `img/migrados/${targetCatFolder}/${targetProdFolder}/${targetFileName}`;

    // Si ya existe el archivo webp de destino y no queremos re-procesarlo (ahorrar tiempo), retornamos su ruta
    if (fs.existsSync(targetPath)) {
        return relTargetPath;
    }

    try {
        // Convert to WebP using sharp
        await sharp(sourcePath)
            .webp({ quality: 82 }) // Premium WebP compression
            .toFile(targetPath);
        
        console.log(`  ⚡ Convertido a WebP: ${relPath} -> ${relTargetPath}`);
        return relTargetPath;
    } catch (err) {
        console.error(`  ❌ Error convirtiendo ${relPath} con sharp:`, err.message);
        return relPath; // Fallback to original if sharp fails
    }
}

async function run() {
    console.log('🚀 Iniciando Optimización y Conversión Masiva a WebP...');
    
    // 1. Cargar base de datos actual
    const currentJsPath = path.join(__dirname, 'js', 'products-data.js');
    const currentContent = fs.readFileSync(currentJsPath, 'utf8');
    const jsonString = currentContent.replace('const productsData = ', '').trim().replace(/;$/, '');
    let categories = JSON.parse(jsonString);
    
    let totalImagesProcessed = 0;

    // 2. Procesar recursivamente cada categoría y producto
    for (let cat of categories) {
        console.log(`\n📂 Optimizando Categoría [${cat.name}]`);
        
        const oldCatImg = cat.image;
        cat.image = await processImage(cat.image, cat.id, null);
        if (cat.image !== oldCatImg) totalImagesProcessed++;

        for (let prod of cat.products) {
            console.log(`  📦 Optimizando Producto [${prod.title}]`);
            
            const oldProdImg = prod.image;
            prod.image = await processImage(prod.image, cat.id, prod.id);
            if (prod.image !== oldProdImg) totalImagesProcessed++;

            // Procesar los acabados
            if (prod.acabados_groups) {
                for (let group of prod.acabados_groups) {
                    const oldGroupImg = group.cover_image;
                    group.cover_image = await processImage(group.cover_image, cat.id, prod.id);
                    if (group.cover_image !== oldGroupImg) totalImagesProcessed++;
                    
                    if (group.images_list) {
                        const newList = [];
                        for (let img of group.images_list) {
                            const oldImg = img;
                            const newImg = await processImage(img, cat.id, prod.id);
                            newList.push(newImg);
                            if (newImg !== oldImg) totalImagesProcessed++;
                        }
                        group.images_list = newList;
                    }
                }
            }
        }
    }

    // 3. Escribir resultados de vuelta a js/products-data.js
    const outputContent = 'const productsData = ' + JSON.stringify(categories, null, 4) + ';\n';
    fs.writeFileSync(currentJsPath, outputContent, 'utf8');
    
    console.log('\n=========================================================');
    console.log('🎉 ¡OPTIMIZACIÓN Y CONVERSIÓN A WEBP COMPLETADA!');
    console.log('=========================================================');
    console.log(`• Archivo js/products-data.js actualizado con rutas locales.`);
    console.log(`• Total de imágenes procesadas y convertidas: ${totalImagesProcessed}`);
    console.log(`• Todas las imágenes residen ahora dentro de e:/Web/WEB MINI/La Tarima 2.0/img/migrados/`);
    console.log(`• ¡YA PUEDES ELIMINAR LA CARPETA "La Tarima" DE LA WEB VIEJA CON TOTAL SEGURIDAD!`);
}

run();
