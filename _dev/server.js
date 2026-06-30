const express = require('express');
const fs      = require('fs');
const fse     = require('fs-extra');  // fs-extra para operaciones segúras
const path = require('path');
const ROOT_DIR = require('path').join(__dirname, '..');
const multer  = require('multer');
const sharp   = require('sharp');     // Conversión de imágenes a WebP


const app = express();
const PORT = 7000;

// Ensure rentals database file exists
const rentalsDbPath = path.join(ROOT_DIR, 'js', 'rentals-data.js');
if (!fs.existsSync(rentalsDbPath)) {
    fs.writeFileSync(rentalsDbPath, 'const rentalsData = [];\n', 'utf8');
}

// Configure body parser for JSON (with higher limit to support large product arrays)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper function to serve index.html with dynamic Open Graph tags
const serveIndexWithOG = (req, res) => {
    const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
    
    try {
        if (fs.existsSync(indexHtmlPath)) {
            let html = fs.readFileSync(indexHtmlPath, 'utf8');
            
            // If there's a product query parameter, we want to inject metadata
            const prodParam = req.query.prod || req.query.product || req.query.p;
            if (prodParam) {
                const databasePath = path.join(ROOT_DIR, 'js', 'products-data.js');
                if (fs.existsSync(databasePath)) {
                    const rawFile = fs.readFileSync(databasePath, 'utf8');
                    const jsonStr = rawFile
                        .replace(/^\s*const\s+productsData\s*=\s*/, '')
                        .replace(/;\s*$/, '')
                        .trim();
                    const productsData = JSON.parse(jsonStr);
                    
                    // Find product by ID/slug
                    let foundProduct = null;
                    for (const category of productsData) {
                        if (category.products) {
                            const p = category.products.find(prod => prod.id === prodParam);
                            if (p) {
                                foundProduct = p;
                                break;
                            }
                        }
                    }
                    
                    if (foundProduct) {
                        const host = req.get('host');
                        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
                        const baseUrl = `${protocol}://${host}`;
                        
                        let imageUrl = foundProduct.image;
                        if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
                            imageUrl = `${baseUrl}/${imageUrl.replace(/^\//, '')}`;
                        } else if (!imageUrl) {
                            imageUrl = `${baseUrl}/img/logo_provisional.png`;
                        }
                        
                        const productUrl = `${baseUrl}/?prod=${prodParam}`;
                        const pageTitle = `${foundProduct.title} | LA TARIMA`;
                        const pageDesc = foundProduct.description || '';
                        
                        const escapeAttr = (str) => {
                            if (!str) return '';
                            return str
                                .replace(/&/g, '&amp;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#039;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;');
                        };
                        
                        const replaceMetaTag = (htmlContent, property, newValue) => {
                            const regex = new RegExp(`(<meta\\s+[^>]*property="${property}"[^>]*content=")([^"]*)("[^>]*>)`, 'gi');
                            if (regex.test(htmlContent)) {
                                return htmlContent.replace(regex, `$1${newValue}$3`);
                            }
                            const regexAlt = new RegExp(`(<meta\\s+[^>]*content=")([^"]*)("[^>]*property="${property}"[^>]*>)`, 'gi');
                            if (regexAlt.test(htmlContent)) {
                                return htmlContent.replace(regexAlt, `$1${newValue}$3`);
                            }
                            return htmlContent;
                        };
                        
                        html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(pageTitle)}</title>`);
                        html = replaceMetaTag(html, 'og:title', escapeAttr(foundProduct.title));
                        html = replaceMetaTag(html, 'og:description', escapeAttr(pageDesc));
                        html = replaceMetaTag(html, 'og:image', escapeAttr(imageUrl));
                        html = replaceMetaTag(html, 'og:url', escapeAttr(productUrl));
                        
                        console.log(`📡 [OG Injector] Servida metadata dinámica para: ${foundProduct.title}`);
                        return res.send(html);
                    }
                }
            }
            
            // If no product query param or product not found, serve regular index.html
            return res.send(html);
        }
    } catch (error) {
        console.error('❌ Error serving index with dynamic OG tags:', error);
    }
    
    // Standard fallback if files not found or read error
    res.sendFile(indexHtmlPath);
};

// Intercept requests to root or index.html to inject Open Graph tags dynamically
app.get(['/', '/index.html'], (req, res, next) => {
    // Only run if there is a query parameter, otherwise let express.static handle it (highly efficient)
    if (req.query.prod || req.query.product || req.query.p) {
        return serveIndexWithOG(req, res);
    }
    next();
});

// Serve static files from the current directory
app.use(express.static(ROOT_DIR));

const sanitizeFolderName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Saca acentos
        .replace(/[^a-z0-9]/g, '-');     // Reemplaza espacios y raros por guiones
};

// Multer storage configuration for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Obtenemos los datos sanitizados
        const catFolder = sanitizeFolderName(req.body.category) || 'general';
        const prodFolder = sanitizeFolderName(req.body.title);

        // Construimos la ruta base: img/categoria
        let targetDir = path.join(ROOT_DIR, 'img', catFolder);

        // Si es un producto, le sumamos su subcarpeta
        if (prodFolder) {
            targetDir = path.join(targetDir, prodFolder);
        }

        // Forzar la creación recursiva de las carpetas en el disco
        fs.mkdirSync(targetDir, { recursive: true });

        cb(null, targetDir);
    },
    filename: function (req, file, cb) {
        const prodFolder = sanitizeFolderName(req.body.title);
        // Si es producto usa timestamp, si es categoría se llama portada
        const uniqueName = prodFolder 
            ? `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`
            : `portada-${file.originalname.replace(/\s+/g, '_')}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// Function to generate SEO HTML stubs for WhatsApp/Facebook
function generateSeoStubs(productsArray) {
    const pDir = path.join(ROOT_DIR, 'p');
    
    // Create /p folder if it doesn't exist
    if (!fs.existsSync(pDir)) {
        fs.mkdirSync(pDir, { recursive: true });
    }
    
    // Generate an HTML file for each product
    productsArray.forEach(category => {
        if (!category.products) return;
        category.products.forEach(product => {
            if (!product.id) return;
            
            let imageUrl = '';
            if (Array.isArray(product.image) && product.image.length > 0) {
                imageUrl = product.image[0];
            } else if (typeof product.image === 'string') {
                imageUrl = product.image;
            } else if (product.acabados_groups && product.acabados_groups.length > 0) {
                imageUrl = product.acabados_groups[0].cover_image || '';
            }
            
            // Format URL to be absolute
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = 'https://latarimadecoracion.github.io/' + imageUrl.replace(/^[\/\\]/, '');
            }
            if (!imageUrl) {
                imageUrl = 'https://latarimadecoracion.github.io/img/logo_provisional.png';
            }
            
            let desc = product.description || 'Muebles infantiles y de diseño a medida.';
            desc = desc.replace(/<[^>]*>?/gm, '').substring(0, 150).replace(/"/g, '&quot;');
            const safeTitle = (product.title || '').replace(/"/g, '&quot;');

            const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} | LA TARIMA</title>
    <meta property="og:type" content="website">
    <meta property="og:title" content="${safeTitle} - LA TARIMA">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="https://latarimadecoracion.github.io/p/${product.id}.html">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle} - LA TARIMA">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${imageUrl}">
    
    
    <script>
        var q = window.location.search;
        var p = "https://latarimadecoracion.github.io/?prod=${product.id}";
        window.location.replace(q ? p + "&" + q.substring(1) : p);
    </script>
</head>
<body>
    <p>Redirigiendo a <a href="https://latarimadecoracion.github.io/?prod=${product.id}">${safeTitle}</a>...</p>
</body>
</html>`;
            
            fs.writeFileSync(path.join(pDir, `${product.id}.html`), html, 'utf8');
        });
    });
    console.log('✅ SEO Stubs estáticos generados en la carpeta /p');
}

// API Endpoint to save productsData JSON
app.post('/api/save-products', (req, res) => {
    try {
        const productsArray = req.body;
        
        if (!Array.isArray(productsArray)) {
            return res.status(400).json({ success: false, message: 'El payload debe ser un array.' });
        }

        const fileContent = 'const productsData = ' + JSON.stringify(productsArray, null, 4) + ';\n';
        const filePath = path.join(ROOT_DIR, 'js', 'products-data.js');
        
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log('✅ js/products-data.js actualizado correctamente.');
        
        // Generar archivos estáticos para Redes Sociales
        generateSeoStubs(productsArray);
        res.json({ success: true, message: 'Productos guardados exitosamente.' });
    } catch (error) {
        console.error('❌ Error guardando productos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// API Endpoint to save rentalsData JSON
app.post('/api/save-rentals', (req, res) => {
    try {
        const rentalsArray = req.body;
        
        if (!Array.isArray(rentalsArray)) {
            return res.status(400).json({ success: false, message: 'El payload debe ser un array.' });
        }

        const fileContent = 'const rentalsData = ' + JSON.stringify(rentalsArray, null, 4) + ';\n';
        const filePath = path.join(ROOT_DIR, 'js', 'rentals-data.js');
        
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log('✅ js/rentals-data.js actualizado correctamente.');
        res.json({ success: true, message: 'Alquileres guardados exitosamente.' });
    } catch (error) {
        console.error('❌ Error guardando alquileres:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// API Endpoint to save siteConfig JSON
app.post('/api/save-site-config', (req, res) => {
    try {
        const siteConfig = req.body;
        
        if (typeof siteConfig !== 'object' || siteConfig === null) {
            return res.status(400).json({ success: false, message: 'El payload debe ser un objeto válido.' });
        }

        const fileContent = '// js/site-config.js\n// --- SITE CONFIGURATION DATABASE ---\n// Overwritten automatically by the Node server. DO NOT EDIT MANUALLY.\n\nwindow.siteConfig = ' + JSON.stringify(siteConfig, null, 4) + ';\n';
        const filePath = path.join(ROOT_DIR, 'js', 'site-config.js');
        
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log('✅ js/site-config.js actualizado correctamente.');
        res.json({ success: true, message: 'Configuración de sitio guardada exitosamente.' });
    } catch (error) {
        console.error('❌ Error guardando configuración de sitio:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al guardar configuración.' });
    }
});

// Archivo físico para almacenar conteo de vistas
const VIEWS_FILE = path.join(__dirname, 'views-stats.json');

// Helper para leer vistas
const readViewsStats = () => {
    try {
        if (fs.existsSync(VIEWS_FILE)) {
            return JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('❌ Error leyendo views-stats.json:', e);
    }
    return {};
};

// Helper para guardar vistas
const saveViewsStats = (stats) => {
    try {
        fs.writeFileSync(VIEWS_FILE, JSON.stringify(stats, null, 2), 'utf8');
    } catch (e) {
        console.error('❌ Error guardando views-stats.json:', e);
    }
};

// API Endpoint para obtener el mapa de vistas
app.get('/api/views', (req, res) => {
    res.json(readViewsStats());
});

// API Endpoint para registrar una visita de un producto
app.post('/api/products/view', (req, res) => {
    const { productId } = req.body;
    if (!productId) {
        return res.status(400).json({ success: false, message: 'productId es requerido.' });
    }
    
    const stats = readViewsStats();
    stats[productId] = (stats[productId] || 0) + 1;
    saveViewsStats(stats);
    
    res.json({ success: true, views: stats[productId] });
});

// API Endpoint to upload an image
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });
        }

        // Estandarizar la imagen subida en caliente (1200x791 px, relleno #F5F2EE)
        try {
            const TARGET_WIDTH = 1200;
            const TARGET_HEIGHT = 791;
            const BACKGROUND_COLOR = { r: 255, g: 255, b: 255, alpha: 1 };

            const inputBuffer = fs.readFileSync(req.file.path);
            const processedBuffer = await sharp(inputBuffer)
                .resize({
                    width: TARGET_WIDTH,
                    height: TARGET_HEIGHT,
                    fit: 'contain',
                    background: BACKGROUND_COLOR
                })
                .webp({ quality: 85 })
                .toBuffer();
            
            fs.writeFileSync(req.file.path, processedBuffer);
            console.log(`✨ Imagen subida estandarizada con éxito (1200x791, WebP): ${req.file.path}`);
        } catch (sharpError) {
            console.error('⚠️ Error al estandarizar la imagen con Sharp:', sharpError.message);
        }

        const catFolder = sanitizeFolderName(req.body.category) || 'general';
        const prodFolder = sanitizeFolderName(req.body.title);
        
        let publicPath = `img/${catFolder}/`;
        if (prodFolder) publicPath += `${prodFolder}/`;
        
        const imagePath = publicPath + req.file.filename;
        
        console.log(`✅ Imagen subida: ${imagePath}`);
        // Return the relative path
        res.json({ success: true, imagePath: imagePath });
    } catch (error) {
        console.error('❌ Error subiendo imagen:', error);
        res.status(500).json({ success: false, message: 'Error subiendo la imagen.' });
    }
});

app.post('/api/categories/edit', upload.single('image'), async (req, res) => {
    try {
        const { id, oldName, newName, currentImageUrl } = req.body;
        
        const oldFolder = sanitizeFolderName(oldName);
        const newFolder = sanitizeFolderName(newName);
        
        const oldDirPath = path.join(ROOT_DIR, 'img', oldFolder);
        const newDirPath = path.join(ROOT_DIR, 'img', newFolder);

        // CASO 1: Si el nombre cambió, renombramos la carpeta física (tenga o no nueva foto)
        if (oldFolder !== newFolder && fs.existsSync(oldDirPath)) {
            fs.renameSync(oldDirPath, newDirPath);
        }

        const publicPath = `img/${newFolder}/`;
        let finalImageUrl = currentImageUrl; 

        // Si el nombre de la carpeta cambió, actualizamos la ruta base de la imagen vieja
        if (oldFolder !== newFolder && currentImageUrl) {
            finalImageUrl = currentImageUrl.replace(`img/${oldFolder}/`, `img/${newFolder}/`);
        }

        // CASO 2: Si el usuario SÍ subió una nueva foto de portada
        if (req.file) {
            // Estandarizar la portada de la categoría en caliente (1200x791 px, relleno #F5F2EE)
            try {
                const TARGET_WIDTH = 1200;
                const TARGET_HEIGHT = 791;
                const BACKGROUND_COLOR = { r: 255, g: 255, b: 255, alpha: 1 };

                const inputBuffer = fs.readFileSync(req.file.path);
                const processedBuffer = await sharp(inputBuffer)
                    .resize({
                        width: TARGET_WIDTH,
                        height: TARGET_HEIGHT,
                        fit: 'contain',
                        background: BACKGROUND_COLOR
                    })
                    .webp({ quality: 85 })
                    .toBuffer();
                
                fs.writeFileSync(req.file.path, processedBuffer);
                console.log(`✨ Portada de categoría estandarizada con éxito (1200x791, WebP): ${req.file.path}`);
            } catch (sharpError) {
                console.error('⚠️ Error al estandarizar portada de categoría con Sharp:', sharpError.message);
            }

            const finalImgName = `portada-${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
            const finalImgPath = path.join(newDirPath, finalImgName);
            
            if (!fs.existsSync(newDirPath)){
                fs.mkdirSync(newDirPath, { recursive: true });
            }

            // Multer la deja temporalmente en el destino asignado; la renombramos
            fs.renameSync(req.file.path, finalImgPath);
            finalImageUrl = publicPath + finalImgName;
        }

        res.json({
            success: true,
            newFolderName: newFolder,
            imageUrl: finalImageUrl 
        });
    } catch (error) {
        console.error('❌ Error editando categoría:', error);
        res.status(500).json({ success: false, message: 'Error editando la categoría.' });
    }
});

app.post('/api/products/delete', (req, res) => {
    try {
        const { title, category } = req.body;
        
        const catFolder = sanitizeFolderName(category);
        const prodFolder = sanitizeFolderName(title);

        if (catFolder && prodFolder) {
            const productDirPath = path.join(ROOT_DIR, 'img', catFolder, prodFolder);

            // REGLA DE ORO: Borrado físico recursivo de la carpeta del producto
            if (fs.existsSync(productDirPath)) {
                fs.rmSync(productDirPath, { recursive: true, force: true });
                console.log(`🧹 Éxito: Carpeta física de producto eliminada: ${productDirPath}`);
            }
        }

        res.json({ success: true, message: "Producto y archivos físicos eliminados con éxito." });
    } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        res.status(500).json({ success: false, message: 'Error eliminando el producto.' });
    }
});

app.post('/api/categories/delete', (req, res) => {
    try {
        const { name } = req.body;
        const catFolder = sanitizeFolderName(name);

        if (catFolder) {
            const categoryDirPath = path.join(ROOT_DIR, 'img', catFolder);

            // REGLA DE ORO: Borrado físico recursivo de la carpeta madre de la categoría
            if (fs.existsSync(categoryDirPath)) {
                fs.rmSync(categoryDirPath, { recursive: true, force: true });
                console.log(`🧹 Carpeta de categoría eliminada con todo su contenido: ${categoryDirPath}`);
            }
        }

        res.json({ success: true, message: "Categoría y árbol de archivos eliminados." });
    } catch (error) {
        console.error('❌ Error eliminando categoría:', error);
        res.status(500).json({ success: false, message: 'Error eliminando la categoría.' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MANTENIMIENTO: Limpiar huérfanos y convertir todo a WebP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/api/maintenance/clean-and-convert', async (req, res) => {
    const log = [];
    const databasePath = path.join(ROOT_DIR, 'js', 'products-data.js');
    const imgDir       = path.join(ROOT_DIR, 'img');

    try {
        // ── 1. Leer y parsear products-data.js ──
        const rawFile = fs.readFileSync(databasePath, 'utf8');
        // El archivo tiene el formato: const productsData = [...JSON...];
        const jsonStr = rawFile
            .replace(/^\s*const\s+productsData\s*=\s*/, '')
            .replace(/;\s*$/, '')
            .trim();
        const productsData = JSON.parse(jsonStr);

        // ── 2. Mapear rutas activas en la BD y normalizar extensiones a .webp ──
        const validWebpPaths = new Set();

        function normalizeToWebP(route) {
            if (!route || typeof route !== 'string') return route;
            // Ignorar rutas externas (http/https) o data URLs
            if (route.startsWith('http') || route.startsWith('data:')) return route;
            const parsed = path.parse(route);
            const newRoute = (parsed.dir ? parsed.dir + '/' : '') + parsed.name + '.webp';
            validWebpPaths.add(newRoute);
            return newRoute;
        }

        productsData.forEach(category => {
            category.image = normalizeToWebP(category.image);
            (category.products || []).forEach(product => {
                (product.acabados_groups || []).forEach(group => {
                    group.cover_image  = normalizeToWebP(group.cover_image);
                    group.images_list  = (group.images_list || []).map(normalizeToWebP);
                });
            });
        });

        // ── 2b. Mapear y normalizar rutas en site-config.js ──
        const configPath = path.join(ROOT_DIR, 'js', 'site-config.js');
        let siteConfig = null;
        if (fs.existsSync(configPath)) {
            try {
                const rawConfig = fs.readFileSync(configPath, 'utf8');
                const configJsonStr = rawConfig
                    .replace(/^\s*window\.siteConfig\s*=\s*/, '')
                    .replace(/;\s*$/, '')
                    .trim();
                siteConfig = JSON.parse(configJsonStr);
            } catch (err) {
                log.push(`⚠️ Error leyendo/parseando site-config.js: ${err.message}`);
            }
        }

        if (siteConfig) {
            // Recorrer recursivamente y normalizar cualquier cadena que empiece con "img/"
            function normalizeConfigImages(obj) {
                if (!obj || typeof obj !== 'object') return;
                for (const key in obj) {
                    if (typeof obj[key] === 'string' && obj[key].startsWith('img/')) {
                        obj[key] = normalizeToWebP(obj[key]);
                    } else if (typeof obj[key] === 'object') {
                        normalizeConfigImages(obj[key]);
                    }
                }
            }
            normalizeConfigImages(siteConfig);
        }

        // ── 2c. Extraer archivos protegidos de html, css y js en el raíz del proyecto ──
        const protectedPaths = new Set();
        try {
            const rootFiles = fs.readdirSync(ROOT_DIR);
            for (const file of rootFiles) {
                const ext = path.extname(file).toLowerCase();
                if (['.html', '.css', '.js'].includes(ext) && file !== 'products-data.js' && file !== 'site-config.js') {
                    const content = fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
                    const matches = content.match(/img\/[a-zA-Z0-9_\-\.\/]+/g);
                    if (matches) {
                        matches.forEach(match => {
                            const cleanMatch = match.replace(/['"\)\(;,>]/g, '').trim();
                            protectedPaths.add(cleanMatch);
                        });
                    }
                }
            }
        } catch (err) {
            log.push(`⚠️ Error escaneando archivos estáticos para protección: ${err.message}`);
        }

        // ── 3. Escanear todos los archivos físicos en img/ ──
        const allFilesOnDisk = [];

        async function scanDir(dir) {
            if (!await fse.pathExists(dir)) return;
            const entries = await fse.readdir(dir);
            for (const entry of entries) {
                const fullPath = path.join(dir, entry);
                const stat     = await fse.stat(fullPath);
                if (stat.isDirectory()) {
                    await scanDir(fullPath);
                } else {
                    const ext = path.extname(entry).toLowerCase();
                    // Solo procesar archivos de imagen
                    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext)) {
                        allFilesOnDisk.push({
                            absolute:      fullPath,
                            relative:      path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/'),
                            ext:           ext,
                            nameWithoutExt: path.parse(fullPath).name,
                            dir:           path.dirname(fullPath)
                        });
                    }
                }
            }
        }
        await scanDir(imgDir);

        // ── 4. Comparar y actuar ──
        let convertedCount = 0;
        let deletedCount   = 0;
        let keptCount      = 0;

        for (const file of allFilesOnDisk) {
            // La ruta webp equivalente a este archivo físico (relativa al root del proyecto)
            const equivalentWebpRelative = path.relative(
                ROOT_DIR,
                path.join(file.dir, file.nameWithoutExt + '.webp')
            ).replace(/\\/g, '/');

            const isInDB  = validWebpPaths.has(equivalentWebpRelative);
            const isWebP  = file.ext === '.webp';
            const isRootImg = file.dir === imgDir;
            const isProtected = isRootImg || protectedPaths.has(file.relative);

            if (isProtected) {
                // Mantener intacto sin borrar ni convertir (a menos que esté también en DB)
                keptCount++;
                log.push(`🛡️ PROTEGIDO: ${file.relative}`);
            } else if (isInDB && isWebP) {
                // CASO 3: En uso y ya es WebP → mantener intacto
                keptCount++;
                log.push(`✅ OK:        ${file.relative}`);

            } else if (isInDB && !isWebP) {
                // CASO 1: En uso pero formato viejo → convertir a WebP y eliminar original
                const targetWebpPath = path.join(file.dir, file.nameWithoutExt + '.webp');
                try {
                    await sharp(file.absolute)
                        .webp({ quality: 80 })
                        .toFile(targetWebpPath);
                    await fse.remove(file.absolute);
                    convertedCount++;
                    log.push(`🔄 Convertido: ${file.relative}  →  ...${file.nameWithoutExt}.webp`);
                } catch (err) {
                    log.push(`⚠️  Error convirtiendo ${file.relative}: ${err.message}`);
                }

            } else {
                // CASO 2: Huérfano (no está en la BD ni protegido) → eliminar
                try {
                    await fse.remove(file.absolute);
                    deletedCount++;
                    log.push(`🗑️ Eliminado:  ${file.relative}`);
                } catch (err) {
                    log.push(`⚠️  Error eliminando ${file.relative}: ${err.message}`);
                }
            }
        }

        // ── 5. Guardar bases de datos unificadas ──
        const updatedContent = `const productsData = ${JSON.stringify(productsData, null, 4)};
`;
        await fse.writeFile(databasePath, updatedContent, 'utf8');
        log.push(`\n💾 products-data.js actualizado con rutas .webp unificadas.`);

        if (siteConfig) {
            const fileContent = '// js/site-config.js\n// --- SITE CONFIGURATION DATABASE ---\n// Overwritten automatically by the Node server. DO NOT EDIT MANUALLY.\n\nwindow.siteConfig = ' + JSON.stringify(siteConfig, null, 4) + ';\n';
            await fse.writeFile(configPath, fileContent, 'utf8');
            log.push(`💾 site-config.js actualizado con rutas .webp unificadas.`);
        }

        console.log('\n🧹 MANTENIMIENTO COMPLETADO:\n' + log.join('\n'));

        res.status(200).json({
            success: true,
            summary: {
                imagenes_mantenidas:   keptCount,
                convertidas_a_webp:    convertedCount,
                huerfanos_eliminados:  deletedCount
            },
            log
        });

    } catch (error) {
        console.error('❌ Error en mantenimiento:', error);
        res.status(500).json({ success: false, error: error.message, log });
    }
});

// Fallback to index.html for SPA routing
// Catch-all route to handle clean mayorista URLs and redirect unrecognized routes to root
app.get('*', (req, res) => {
    const cleanUrl = req.path.toLowerCase().replace(/\/$/, '');
    
    // Rutas del catálogo mayorista sin .html visible
    if (cleanUrl === '/web/mayorista' || cleanUrl === '/mayorista' || cleanUrl === '/mayoristas') {
        const mayoristaPath = path.join(ROOT_DIR, 'mayorista.html');
        if (fs.existsSync(mayoristaPath)) {
            return res.sendFile(mayoristaPath);
        }
    }
    
    // Si contiene parámetros de producto para Open Graph, sirve index con OG
    if (req.query.prod || req.query.product || req.query.p) {
        return serveIndexWithOG(req, res);
    }

    // Cualquier otra ruta no existente, redirige al inicio
    res.redirect('/');
});


const os = require('os');

// Obtener las IPs de red local para mostrarlas en la terminal
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    return addresses;
}

app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIPs();
    console.log(`
=============================================
🚀 Servidor Local de La Tarima encendido
=============================================
Accedé localmente en: http://localhost:${PORT}`);
    
    ips.forEach(ip => {
        console.log(`Accedé desde tu celular u otros dispositivos en: http://${ip}:${PORT}`);
    });
    
    console.log(`
Presioná Ctrl+C para apagar el servidor.
=============================================
    `);
});
