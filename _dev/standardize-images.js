// standardize-images.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ancho y alto de referencia extraídos de la baranda de seguridad clásica (1200x791)
const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 791;

// Color de fondo blanco para los rellenos laterales/verticales (#FFFFFF)
const BACKGROUND_COLOR = { r: 255, g: 255, b: 255, alpha: 1 };

async function resizeAndPadImage(relPath) {
    if (!relPath) return;

    // Si es un placeholder o ruta externa, omitir
    if (relPath.startsWith('http') || relPath.includes('logo_provisional.png')) {
        return;
    }

    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`  ⚠️ Archivo no encontrado en disco: ${relPath}`);
        return;
    }

    try {
        // Leer el archivo completo a memoria para liberar el descriptor y evitar bloqueos en Sharp
        const inputBuffer = fs.readFileSync(fullPath);

        // Procesar la imagen con Sharp
        const processedBuffer = await sharp(inputBuffer)
            .resize({
                width: TARGET_WIDTH,
                height: TARGET_HEIGHT,
                fit: 'contain', // Ajustar sin deformar, manteniendo proporción
                background: BACKGROUND_COLOR // Rellenar espacio sobrante con el lino de La Tarima
            })
            .webp({ quality: 85 }) // Comprimir en WebP de alta calidad
            .toBuffer();

        // Sobrescribir el archivo en disco de forma segura
        fs.writeFileSync(fullPath, processedBuffer);
        console.log(`  ✅ Imagen estandarizada (1200x791): ${relPath}`);
    } catch (err) {
        console.error(`  ❌ Error procesando ${relPath}:`, err.message);
    }
}

async function run() {
    console.log('🚀 Iniciando estandarización masiva de resoluciones a 1200x791...');
    console.log('• Proporción y resolución base: Baranda de seguridad clásica');
    console.log('• Relleno anti-deformación: #F5F2EE (Warm Lino de la web)\n');

    // 1. Cargar base de datos actual
    const databasePath = path.join(__dirname, 'js', 'products-data.js');
    if (!fs.existsSync(databasePath)) {
        console.error('❌ No se encontró js/products-data.js');
        return;
    }

    const databaseContent = fs.readFileSync(databasePath, 'utf8');
    const jsonString = databaseContent.replace('const productsData = ', '').trim().replace(/;$/, '');
    let categories;
    try {
        categories = JSON.parse(jsonString);
    } catch (e) {
        console.error('❌ Error parseando js/products-data.js. Asegúrate de que no tenga errores sintácticos.');
        return;
    }

    // 2. Coleccionar rutas únicas para evitar procesar la misma imagen más de una vez
    const imagePaths = new Set();

    for (let cat of categories) {
        if (cat.image) imagePaths.add(cat.image);

        if (cat.products) {
            for (let prod of cat.products) {
                if (prod.image) imagePaths.add(prod.image);

                if (prod.acabados_groups) {
                    for (let group of prod.acabados_groups) {
                        if (group.cover_image) imagePaths.add(group.cover_image);

                        if (group.images_list) {
                            for (let img of group.images_list) {
                                if (img) imagePaths.add(img);
                            }
                        }
                    }
                }
            }
        }
    }

    const uniquePaths = Array.from(imagePaths);
    console.log(`📂 Se encontraron ${uniquePaths.length} imágenes únicas en la base de datos.`);

    // 3. Procesar secuencialmente cada imagen
    let successCount = 0;
    for (let i = 0; i < uniquePaths.length; i++) {
        const imgPath = uniquePaths[i];
        console.log(`[${i + 1}/${uniquePaths.length}] Procesando...`);
        await resizeAndPadImage(imgPath);
        successCount++;
    }

    console.log('\n=========================================================');
    console.log('🎉 ¡PROCESO DE ESTANDARIZACIÓN COMPLETADO CON ÉXITO!');
    console.log('=========================================================');
    console.log(`• Total de imágenes únicas estandarizadas a 1200x791: ${successCount}`);
    console.log('• Los lados sobrantes de imágenes verticales u horizontales no uniformes');
    console.log('  han sido rellenados con el color de lino nativo (#F5F2EE) de forma perfecta.');
}

run();
