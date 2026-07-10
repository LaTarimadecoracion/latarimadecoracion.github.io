// convert-asist-images.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const targetDir = path.join(__dirname, '..', 'asist', 'img');

async function run() {
    console.log('🚀 Iniciando conversión de imágenes de asist/img a WebP...');
    
    if (!fs.existsSync(targetDir)) {
        console.error(`❌ La carpeta no existe: ${targetDir}`);
        return;
    }
    
    const files = fs.readdirSync(targetDir);
    let convertedCount = 0;
    let deletedCount = 0;
    
    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            const baseName = path.basename(file, ext);
            const sourcePath = path.join(targetDir, file);
            const targetPath = path.join(targetDir, `${baseName}.webp`);
            
            console.log(`⏳ Convirtiendo: ${file} -> ${baseName}.webp`);
            
            try {
                await sharp(sourcePath)
                    .webp({ quality: 80 }) // Optimize quality vs size
                    .toFile(targetPath);
                convertedCount++;
                
                // Delete original
                fs.unlinkSync(sourcePath);
                deletedCount++;
                console.log(`✅ Listo y eliminado original: ${file}`);
            } catch (err) {
                console.error(`❌ Error al convertir ${file}:`, err.message);
            }
        }
    }
    
    console.log('\n=========================================');
    console.log('🎉 Conversión completada con éxito.');
    console.log(`• Convertidas a WebP: ${convertedCount}`);
    console.log(`• Eliminadas originales: ${deletedCount}`);
    console.log('=========================================');
}

run();
