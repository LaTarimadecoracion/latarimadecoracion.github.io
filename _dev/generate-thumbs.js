// _dev/generate-thumbs.js
// Escanea todas las imágenes en /img y genera automáticamente versiones miniatura (_thumb.webp, 420px ancho)
// para acelerar la carga de grillas, carruseles y vistas previas sin tocar los originales.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.join(__dirname, '..');
const IMG_DIR = path.join(ROOT_DIR, 'img');
const DOCS_IMG_DIR = path.join(ROOT_DIR, 'docs', 'img');

const THUMB_WIDTH = 720;
const THUMB_QUALITY = 85;

async function generateThumbForFile(filePath, force = false) {
    try {
        const ext = path.extname(filePath).toLowerCase();
        if (!['.webp', '.jpg', '.jpeg', '.png'].includes(ext)) return false;

        const baseName = path.basename(filePath, ext);
        // Evitar procesar miniaturas existentes o logos del sistema
        if (baseName.endsWith('_thumb')) return false;
        const lowerBase = baseName.toLowerCase();
        if (lowerBase === 'logo_provisional' || lowerBase === 'logo-dark' || lowerBase === 'logo-light' || lowerBase === 'platinum') return false;

        const dirName = path.dirname(filePath);
        const thumbPath = path.join(dirName, `${baseName}_thumb.webp`);

        // Si la miniatura ya existe y es más nueva o igual que el archivo original, omitir para velocidad instantánea
        if (!force && fs.existsSync(thumbPath)) {
            const srcStat = fs.statSync(filePath);
            const thumbStat = fs.statSync(thumbPath);
            if (thumbStat.mtimeMs >= srcStat.mtimeMs && thumbStat.size > 0) {
                return false;
            }
        }

        await sharp(filePath)
            .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
            .webp({ quality: THUMB_QUALITY })
            .toFile(thumbPath);

        // Si existe la carpeta espejo en docs/img, copiar también allí
        const relFromImg = path.relative(IMG_DIR, thumbPath);
        if (!relFromImg.startsWith('..')) {
            const docsThumbPath = path.join(DOCS_IMG_DIR, relFromImg);
            const docsThumbDir = path.dirname(docsThumbPath);
            if (fs.existsSync(docsThumbDir)) {
                try { fs.copyFileSync(thumbPath, docsThumbPath); } catch (e) {}
            }
        }

        return true;
    } catch (err) {
        console.warn(`⚠️ [Thumbs] No se pudo crear miniatura para ${filePath}:`, err.message);
        return false;
    }
}

async function scanAndGenerateThumbs(dirPath = IMG_DIR, force = false) {
    if (!fs.existsSync(dirPath)) return { created: 0, total: 0 };

    let created = 0;
    let total = 0;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            const sub = await scanAndGenerateThumbs(fullPath, force);
            created += sub.created;
            total += sub.total;
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.webp', '.jpg', '.jpeg', '.png'].includes(ext) && !entry.name.toLowerCase().endsWith('_thumb.webp')) {
                total++;
                const wasCreated = await generateThumbForFile(fullPath, force);
                if (wasCreated) created++;
            }
        }
    }

    return { created, total };
}

if (require.main === module) {
    const force = process.argv.includes('--force');
    console.log(`🖼️ Escaneando y generando miniaturas (_thumb.webp, ${THUMB_WIDTH}px, Q${THUMB_QUALITY})...`);
    scanAndGenerateThumbs(IMG_DIR, force).then(({ created, total }) => {
        console.log(`✅ Miniaturas listas: ${created} nuevas generadas (de ${total} imágenes principales escaneadas).`);
    }).catch(err => {
        console.error('❌ Error generando miniaturas:', err);
    });
}

module.exports = {
    generateThumbForFile,
    scanAndGenerateThumbs
};
