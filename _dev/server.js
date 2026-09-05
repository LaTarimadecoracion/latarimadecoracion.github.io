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

// Ensure offers database file exists
const offersDbPath = path.join(ROOT_DIR, 'js', 'offers-data.js');
if (!fs.existsSync(offersDbPath)) {
    fs.writeFileSync(offersDbPath, 'const offersData = [];\n', 'utf8');
}

// Ensure payment config database file exists
const paymentConfigDbPath = path.join(ROOT_DIR, 'js', 'payment-config.js');
if (!fs.existsSync(paymentConfigDbPath)) {
    const defaultPaymentConfig = {
        transfer: { active: true, alias: 'VENUS.PULMON.METRO', cbu: '0720048988000002273736', bank: 'Banco Santander', titular: 'Yonatan Lucas Orellana', cuit: '20-35281538-2', discountPercent: 0 },
        mercadopago: { active: false, mode: 'sandbox', publicKey: '', accessToken: '', maxInstallments: 12 },
        credit: { active: true, surchargePercent: 0 }
    };
    fs.writeFileSync(paymentConfigDbPath, '// js/payment-config.js\nwindow.sessionPaymentConfig = ' + JSON.stringify(defaultPaymentConfig, null, 4) + ';\n', 'utf8');
}

// Ensure orders database file exists
const ordersDbPath = path.join(ROOT_DIR, 'js', 'orders-data.js');
if (!fs.existsSync(ordersDbPath)) {
    fs.writeFileSync(ordersDbPath, 'const ordersData = [];\n', 'utf8');
}

// Ensure orders config file exists
const ordersConfigDbPath = path.join(ROOT_DIR, 'js', 'orders-config.js');
const defaultOrdersConfig = {
    milestones: {
        readyDesc: '¡Tu pedido ya está listo! ✅',
        retiraTitle: 'Retiro por Taller',
        retiraDesc: 'Ya podés retirar tu pedido por nuestro domicilio. Coordinaremos el día y horario con vos 🏁',
        envioTitle: 'Despacho de Pedido',
        envioDesc: 'Tu pedido se encuentra en proceso de despacho o en camino. Podés seguir su recorrido en el apartado de abajo ⬇️'
    },
    conditions: [
        { id: '1', title: 'Retiro por Taller:', text: 'Una vez finalizado su pedido, coordinaremos previamente el día y horario para que pueda retirarlo por nuestro taller. Las visitas se realizan únicamente con coordinación previa para asegurar nuestra disponibilidad al recibirlo.' },
        { id: '2', title: 'Envíos a Domicilio:', text: 'Trabajamos con Correo Argentino, Vía Cargo y Cadetería/Envíos Particulares. Si requiere un transporte en especial, puede coordinarlo con nosotros. La información y número de seguimiento aparecerán automáticamente en esta página una vez despachado.' },
        { id: '3', title: 'Pago de Saldos:', text: 'El saldo pendiente deberá abonarse en su totalidad al momento de retirar por el taller o de manera previa al despacho en caso de envío.' },
        { id: '4', title: 'Plazo para Retirar (Abandono):', text: 'Una vez listo el pedido, se dispone de un plazo máximo de 30 días hábiles para ser retirado. Transcurrido dicho período, el pedido será considerado como abandonado sin posibilidad de reembolso.' },
        { id: '5', title: 'Cancelaciones:', text: 'En pedidos personalizados, cuenta con un plazo de 48 hs desde la toma de la orden para cancelar la compra y solicitar el reembolso total del importe abonado.' },
        { id: '6', title: 'Facturación:', text: 'Emitimos factura sobre el valor del producto (no incluye costo de envío). Si requiere Factura A, deberá informarlo previamente para coordinar los datos correspondientes.' },
        { id: '7', title: 'Contacto y Atención:', text: 'Ante cualquier duda o consulta sobre el estado de su pedido, envianos un mensaje por WhatsApp al taller mencionando tu N° de Orden.' }
    ]
};

function getOrdersConfig() {
    try {
        if (fs.existsSync(ordersConfigDbPath)) {
            const content = fs.readFileSync(ordersConfigDbPath, 'utf8');
            const jsonMatch = content.match(/const\s+ordersConfig\s*=\s*([\s\S]*?);?\s*$/);
            if (jsonMatch && jsonMatch[1]) {
                return JSON.parse(jsonMatch[1]);
            }
        }
    } catch (e) {
        console.error('⚠️ Error leyendo orders-config.js:', e);
    }
    return defaultOrdersConfig;
}

// Escanear carpeta de música en el arranque
const scanMusica = require('./scan-musica');
try {
    scanMusica(ROOT_DIR);
} catch (err) {
    console.error('❌ Error escaneando música al arrancar el servidor:', err);
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

// Disable caching specifically for js/site-config.js & js/payment-config.js to allow dynamic changes on localhost
app.get(['/js/site-config.js', '/js/payment-config.js'], (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Manejo de rutas limpias SPA (/stock, /mayorista, /catalogo, /musica, /alquileres, /admin)
app.get(['/stock', '/mayorista', '/catalogo', '/musica', '/alquileres', '/admin'], (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// Serve static files from the current directory
app.use(express.static(ROOT_DIR));

const sanitizeFolderName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Saca acentos
        .replace(/[^a-z0-9]+/g, '-')     // Reemplaza espacios y raros por guión único
        .replace(/^-+|-+$/g, '');
};

// Multer storage configuration for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Obtenemos los datos sanitizados
        const rubroFolder = req.body.rubro && req.body.rubro !== 'carpinteria' ? sanitizeFolderName(req.body.rubro) : '';
        const catFolder = sanitizeFolderName(req.body.category) || 'general';
        const prodFolder = sanitizeFolderName(req.body.title);

        // Construimos la ruta base: img/[rubro]/[categoria] o img/[categoria]
        let targetDir = rubroFolder 
            ? path.join(ROOT_DIR, 'img', rubroFolder, catFolder)
            : path.join(ROOT_DIR, 'img', catFolder);

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

// API Endpoint to save assistant rules (Bot-Demo1.csv)
app.post('/api/save-assistant-rules', (req, res) => {
    try {
        const { csvText } = req.body;
        if (typeof csvText !== 'string') {
            return res.status(400).json({ success: false, message: 'El payload debe contener csvText de tipo string.' });
        }

        const filePath = path.join(ROOT_DIR, 'asist', 'Bot-Demo1.csv');
        fs.writeFileSync(filePath, csvText, 'utf8');
        console.log('✅ asist/Bot-Demo1.csv actualizado correctamente.');

        res.json({ success: true, message: 'Reglas del asistente guardadas exitosamente.' });
    } catch (error) {
        console.error('❌ Error guardando reglas del asistente:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// API Endpoint to save assistant global configuration (config.json)
app.post('/api/save-assistant-config', (req, res) => {
    try {
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ success: false, message: 'El payload debe contener enabled de tipo boolean.' });
        }

        const filePath = path.join(ROOT_DIR, 'asist', 'config.json');
        fs.writeFileSync(filePath, JSON.stringify({ enabled }, null, 2), 'utf8');
        console.log(`✅ asist/config.json actualizado correctamente (enabled: ${enabled}).`);

        res.json({ success: true, message: 'Configuración del asistente guardada exitosamente.' });
    } catch (error) {
        console.error('❌ Error guardando configuración del asistente:', error);
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

// API Endpoint to save offersData JSON
app.post('/api/save-offers', (req, res) => {
    try {
        const offersArray = req.body;
        
        if (!Array.isArray(offersArray)) {
            return res.status(400).json({ success: false, message: 'El payload debe ser un array.' });
        }

        const fileContent = 'const offersData = ' + JSON.stringify(offersArray, null, 4) + ';\n';
        const filePath = path.join(ROOT_DIR, 'js', 'offers-data.js');
        
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log('✅ js/offers-data.js actualizado correctamente.');
        res.json({ success: true, message: 'Ofertas guardadas exitosamente.' });
    } catch (error) {
        console.error('❌ Error guardando ofertas:', error);
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

// API Endpoint to save paymentConfig JSON
app.post('/api/save-payment-config', (req, res) => {
    try {
        const paymentConfig = req.body;
        
        if (typeof paymentConfig !== 'object' || paymentConfig === null) {
            return res.status(400).json({ success: false, message: 'El payload debe ser un objeto válido.' });
        }

        const fileContent = '// js/payment-config.js\n// --- PAYMENT CONFIGURATION DATABASE ---\n// Overwritten automatically by the Node server. DO NOT EDIT MANUALLY.\n\nwindow.sessionPaymentConfig = ' + JSON.stringify(paymentConfig, null, 4) + ';\n';
        const filePath = path.join(ROOT_DIR, 'js', 'payment-config.js');
        
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log('✅ js/payment-config.js actualizado correctamente.');
        res.json({ success: true, message: 'Configuración de pagos guardada exitosamente.' });
    } catch (error) {
        console.error('❌ Error guardando configuración de pagos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al guardar configuración de pagos.' });
    }
});

// API Endpoint to build and publish to GitHub Pages
app.post('/api/publish-github', async (req, res) => {
    // Verificar que la petición provenga de la PC local (localhost) o de la red local (LAN)
    const clientIp = req.ip || req.connection.remoteAddress || '';
    const cleanIp = clientIp.replace(/^.*:/, ''); // Extraer IPv4 de ::ffff:192.168.x.x
    const isLocalAccess = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.endsWith('127.0.0.1') || cleanIp === '127.0.0.1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.');
    
    if (!isLocalAccess) {
        console.warn(`⚠️ Intento de publicación denegado desde IP externa: ${clientIp}`);
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso denegado. La publicación a GitHub solo se puede realizar desde la PC local o red local.' 
        });
    }

    console.log('🚀 Iniciando publicación a GitHub...');
    const { exec } = require('child_process');
    const execPromise = (cmd, options = {}) => {
        return new Promise((resolve, reject) => {
            const opts = Object.assign({ cwd: ROOT_DIR, timeout: 120000, env: process.env }, options);
            exec(cmd, opts, (error, stdout, stderr) => {
                if (error) {
                    reject({ error, stdout, stderr });
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    };

    // Helper para remover el archivo de bloqueo lock de Git si quedó varado
    const cleanGitLock = () => {
        const lockFilePath = path.join(ROOT_DIR, '.git', 'index.lock');
        if (fs.existsSync(lockFilePath)) {
            try { fs.unlinkSync(lockFilePath); } catch (e) {}
        }
    };

    try {
        // Paso 1: Compilar
        console.log('1. Compilando la web...');
        await execPromise('node _dev/build.js');

        // Paso 2: Staging de archivos (limpiando lock file si quedó bloqueado)
        console.log('2. Staging files...');
        cleanGitLock();
        await execPromise('git add .');

        // Paso 3: Comprobar si hay cambios para hacer commit
        cleanGitLock();
        const { stdout: statusOut } = await execPromise('git status --porcelain');
        
        if (statusOut.trim().length > 0) {
            console.log('3. Guardando cambios (commit)...');
            cleanGitLock();
            await execPromise('git commit -m "Actualización desde Panel de Administración"');
        } else {
            console.log('3. No hay cambios pendientes para guardar (omitiendo commit).');
        }

        // Paso 4: Subir a GitHub
        console.log('4. Subiendo cambios a GitHub (push)...');
        cleanGitLock();
        const { stdout: pushOut } = await execPromise('git push');
        
        console.log('✅ Publicación a GitHub completada exitosamente.');
        res.json({ 
            success: true, 
            message: 'Web compilada y publicada exitosamente en GitHub Pages.',
            details: pushOut
        });

    } catch (errObj) {
        console.error('❌ Error en la publicación:', errObj);
        let errMsg = errObj.error ? errObj.error.message : (typeof errObj === 'string' ? errObj : 'Error desconocido');
        const errDetails = (errObj.stderr || errObj.stdout || '').toString();

        if (errDetails.includes('could not read Username') || errDetails.includes('terminal prompts disabled') || errDetails.includes('Permission denied') || errDetails.includes('Authentication failed')) {
            errMsg = '🔑 Git requiere autenticación con tu cuenta de GitHub. Abrí una consola/CMD en tu PC y ejecutá "git push" manualmente una vez para iniciar sesión o guardar tus credenciales.';
        } else if (errObj.error && errObj.error.killed) {
            errMsg = '⏳ La subida a GitHub excedió el tiempo máximo de espera. Verificá tu conexión a Internet.';
        }

        res.status(500).json({ 
            success: false, 
            message: errMsg, 
            error: errMsg,
            details: errDetails
        });
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

        const rubroFolder = req.body.rubro && req.body.rubro !== 'carpinteria' ? sanitizeFolderName(req.body.rubro) : '';
        const catFolder = sanitizeFolderName(req.body.category) || 'general';
        const prodFolder = sanitizeFolderName(req.body.title);
        
        let publicPath = rubroFolder ? `img/${rubroFolder}/${catFolder}/` : `img/${catFolder}/`;
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
        const { id, oldName, newName, currentImageUrl, rubro } = req.body;
        
        const rubroFolder = rubro && rubro !== 'carpinteria' ? sanitizeFolderName(rubro) : '';
        const oldFolder = sanitizeFolderName(oldName);
        const newFolder = sanitizeFolderName(newName);
        
        const oldDirPath = rubroFolder 
            ? path.join(ROOT_DIR, 'img', rubroFolder, oldFolder)
            : path.join(ROOT_DIR, 'img', oldFolder);
            
        const newDirPath = rubroFolder 
            ? path.join(ROOT_DIR, 'img', rubroFolder, newFolder)
            : path.join(ROOT_DIR, 'img', newFolder);

        // CASO 1: Si el nombre cambió, renombramos la carpeta física (tenga o no nueva foto)
        if (oldFolder !== newFolder && fs.existsSync(oldDirPath)) {
            fs.renameSync(oldDirPath, newDirPath);
        }

        const publicPath = rubroFolder ? `img/${rubroFolder}/${newFolder}/` : `img/${newFolder}/`;
        let finalImageUrl = currentImageUrl; 

        // Si el nombre de la carpeta cambió, actualizamos la ruta base de la imagen vieja
        if (oldFolder !== newFolder && currentImageUrl) {
            const oldImgPrefix = rubroFolder ? `img/${rubroFolder}/${oldFolder}/` : `img/${oldFolder}/`;
            const newImgPrefix = rubroFolder ? `img/${rubroFolder}/${newFolder}/` : `img/${newFolder}/`;
            finalImageUrl = currentImageUrl.replace(oldImgPrefix, newImgPrefix);
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
        const { title, category, rubro } = req.body;
        
        const rubroFolder = rubro && rubro !== 'carpinteria' ? sanitizeFolderName(rubro) : '';
        const catFolder = sanitizeFolderName(category);
        const prodFolder = sanitizeFolderName(title);

        if (catFolder && prodFolder) {
            const productDirPath = rubroFolder
                ? path.join(ROOT_DIR, 'img', rubroFolder, catFolder, prodFolder)
                : path.join(ROOT_DIR, 'img', catFolder, prodFolder);

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
        const { name, rubro } = req.body;
        const rubroFolder = rubro && rubro !== 'carpinteria' ? sanitizeFolderName(rubro) : '';
        const catFolder = sanitizeFolderName(name);

        if (catFolder) {
            const categoryDirPath = rubroFolder
                ? path.join(ROOT_DIR, 'img', rubroFolder, catFolder)
                : path.join(ROOT_DIR, 'img', catFolder);

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

// --- ENDPOINTS PARA PEDIDOS AUTÓNOMOS ---

// ordersDbPath is already declared at the top of the file

function calculateEstimatedReadyDate(startDateStr, prepDaysMin, prepDaysMax) {
    if (typeof prepDaysMax === 'undefined') {
        prepDaysMax = prepDaysMin;
    }
    let date = new Date(startDateStr);
    let day  = date.getDay();
    let hour = date.getHours();
    
    // Regla de corte: si se carga a partir de las 14hs o es fin de semana,
    // el pedido empieza a correr el proximo dia habil desde las 00hs.
    // Si se carga entre 00hs y 13:59hs, ese dia ya cuenta completo.
    let startOnNextBusinessDay = false;
    if (day === 0 || day === 6 || hour >= 14) {
        startOnNextBusinessDay = true;
    }
    
    if (startOnNextBusinessDay) {
        // Avanzar al proximo dia habil
        do {
            date.setDate(date.getDate() + 1);
            day = date.getDay();
        } while (day === 0 || day === 6);
    }
    // El dia siempre empieza desde las 00hs (dia completo)
    date.setHours(0, 0, 0, 0);
    
    const actualStartDate = new Date(date);
    
    // Sumar dias de preparacion maximos (solo dias habiles)
    let dateMax = new Date(actualStartDate);
    let daysToAdd = prepDaysMax;
    while (daysToAdd > 0) {
        dateMax.setDate(dateMax.getDate() + 1);
        day = dateMax.getDay();
        if (day !== 0 && day !== 6) {
            daysToAdd--;
        }
    }
    
    dateMax.setHours(23, 59, 0, 0);
    
    return {
        startDate: actualStartDate.toISOString(),
        estimatedReadyDate: dateMax.toISOString()
    };
}

function countBusinessDays(startDate, endDate) {
    let start = new Date(startDate);
    let end = new Date(endDate);
    if (start > end) return 0;
    
    let count = 0;
    let temp = new Date(start);
    while (temp <= end) {
        let day = temp.getDay();
        if (day !== 0 && day !== 6) {
            count++;
        }
        temp.setDate(temp.getDate() + 1);
    }
    return count;
}

function cleanExpiredOrders(orders) {
    const today = new Date();
    const activeOrders = [];
    const expiredIds = [];
    
    orders.forEach(order => {
        let isExpired = false;
        
        // Regla 1: 60 días de corrido desde que fue tomado (creationDate)
        if (order.creationDate) {
            const created = new Date(order.creationDate);
            const diffTime = today.getTime() - created.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            if (diffDays > 60) {
                isExpired = true;
            }
        }
        
        // Regla 2: 30 días hábiles posteriores a su finalización (listo/entregado)
        if (!isExpired && (order.status === 'listo' || order.status === 'entregado') && order.completedDate) {
            const completed = new Date(order.completedDate);
            const businessDaysSinceCompletion = countBusinessDays(completed, today) - 1;
            if (businessDaysSinceCompletion > 30) {
                isExpired = true;
            }
        }
        
        if (isExpired) {
            expiredIds.push(order.id);
            // Delete client HTML page
            const clientPagePath = path.join(ROOT_DIR, 'pedidos', `${order.id}.html`);
            if (fs.existsSync(clientPagePath)) {
                try {
                    fs.unlinkSync(clientPagePath);
                    console.log(`🧹 Borrado archivo de pedido expirado: pedidos/${order.id}.html`);
                } catch (err) {
                    console.error(`❌ Error borrando archivo de pedido expirado ${order.id}:`, err);
                }
            }
            
            // Delete image folder if exists
            const imageFolder = path.join(ROOT_DIR, 'img', 'pedidos', order.id);
            if (fs.existsSync(imageFolder)) {
                try {
                    fse.removeSync(imageFolder);
                    console.log(`🧹 Borrada carpeta de imágenes del pedido expirado: img/pedidos/${order.id}`);
                } catch (err) {
                    console.error(`❌ Error borrando carpeta de imágenes ${order.id}:`, err);
                }
            }
        } else {
            activeOrders.push(order);
        }
    });
    
    return { activeOrders, expiredIds };
}

function getSocialLinks() {
    try {
        const configPath = path.join(ROOT_DIR, 'js', 'site-config.js');
        if (fs.existsSync(configPath)) {
            const rawFile = fs.readFileSync(configPath, 'utf8');
            const getLink = (name) => {
                const regex = new RegExp(`['"]?${name}['"]?\\s*:\\s*['"]([^'"]+)['"]`);
                const match = rawFile.match(regex);
                return match ? match[1] : '';
            };
            return {
                instagram: getLink('instagram'),
                tiktok: getLink('tiktok'),
                facebook: getLink('facebook'),
                whatsapp: getLink('whatsapp')
            };
        }
    } catch (e) {
        console.error('⚠️ Error parsing site-config.js for socialLinks:', e);
    }
    return { instagram: '', tiktok: '', facebook: '', whatsapp: '' };
}

function generateClientPage(order) {
    const pedidosDir = path.join(ROOT_DIR, 'pedidos');
    if (!fs.existsSync(pedidosDir)) {
        fs.mkdirSync(pedidosDir, { recursive: true });
    }
    
    const filePath = path.join(pedidosDir, `${order.id}.html`);
    const socialLinks = getSocialLinks();
    const ordersConfig = getOrdersConfig();
    
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Seguimiento de Pedido #${order.id} | LA TARIMA</title>
    
    <!-- Fonts & Icons -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
    
    <!-- CSS -->
    <link rel="stylesheet" href="../css/style.css?v=25">
    
    <style>
        :root {
            --primary-hsl: 25, 30%, 45%;
            --primary-color: hsl(var(--primary-hsl));
            --surface-color: #ffffff;
            --bg-color: #faf9f6;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --radius-lg: 24px;
            --radius-md: 16px;
            --shadow-sm: 0 4px 18px rgba(0, 0, 0, 0.015);
            --shadow-md: 0 10px 30px rgba(0, 0, 0, 0.04);
        }
        
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            overflow-y: auto !important;
            height: auto !important;
        }
        
        body.in-iframe {
            background: transparent !important;
            min-height: auto;
            overflow-y: auto !important;
            height: auto !important;
            padding: 55px 16px 40px 16px !important;
            box-sizing: border-box;
        }
        
        body.in-iframe .client-header,
        body.in-iframe .client-footer {
            display: none !important;
        }
        
        body.in-iframe .main-container {
            margin: 0 auto !important;
            padding: 0 !important;
            max-width: 100% !important;
        }
        
        body.in-iframe .order-card {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            margin-bottom: 1rem !important;
        }
        
        body.in-iframe .order-header {
            padding: 0.75rem 0 !important;
            background: transparent !important;
            border-bottom: 1px dashed var(--border-color) !important;
        }
        
        body.in-iframe .order-body {
            padding: 1.25rem 0 !important;
        }
        
        body.in-iframe .conditions-card {
            border: 1px solid var(--border-color) !important;
            box-shadow: none !important;
            background: rgba(0, 0, 0, 0.02) !important;
            padding: 1.25rem !important;
        }
        
        .client-header {
            background: var(--surface-color);
            border-bottom: 1.5px solid var(--border-color);
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow-sm);
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: var(--text-main);
        }
        
        .logo-img {
            height: 38px;
            width: auto;
        }
        
        .logo-text {
            font-weight: 800;
            font-size: 1.25rem;
            letter-spacing: -0.5px;
        }
        
        .main-container {
            max-width: 750px;
            width: 100%;
            margin: 2rem auto;
            padding: 0 16px;
            box-sizing: border-box;
            flex-grow: 1;
        }
        
        body.in-iframe .main-container {
            margin: 0 auto;
            padding: 10px 0;
        }
        
        .order-card {
            background: var(--surface-color);
            border-radius: var(--radius-lg);
            border: 1.5px solid var(--border-color);
            box-shadow: var(--shadow-md);
            overflow: hidden;
            margin-bottom: 1.5rem;
        }
        
        .order-header {
            padding: 1.75rem;
            border-bottom: 1.5px solid var(--border-color);
            background: linear-gradient(135deg, rgba(180, 132, 108, 0.05) 0%, rgba(180, 132, 108, 0.01) 100%);
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        .order-title-block h1 {
            margin: 0 0 0.25rem 0;
            font-size: 1.4rem;
            font-weight: 800;
        }
        
        .order-number {
            color: var(--text-muted);
            font-size: 0.88rem;
            font-weight: 500;
        }
        
        .status-badge {
            padding: 0.5rem 1rem;
            border-radius: 50px;
            font-size: 0.82rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        
        .status-pendiente {
            background: #fef3c7;
            color: #d97706;
            border: 1px solid #fde68a;
        }
        
        .status-listo {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
            animation: pulse-green 2s infinite;
        }
        
        .status-entregado {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
        }
        
        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(21, 128, 61, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(21, 128, 61, 0); }
            100% { box-shadow: 0 0 0 0 rgba(21, 128, 61, 0); }
        }
        
        .order-body {
            padding: 1.75rem;
        }
        
        .product-section {
            display: flex;
            gap: 1.5rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        
        .product-image {
            width: 150px;
            height: 150px;
            border-radius: var(--radius-md);
            object-fit: cover;
            border: 1.5px solid var(--border-color);
            background: #f5f2ee;
            flex-shrink: 0;
        }
        
        .product-info {
            flex: 1;
            min-width: 250px;
        }
        
        .product-info h2 {
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary-color);
        }
        
        .product-desc {
            font-size: 0.92rem;
            line-height: 1.5;
            color: var(--text-muted);
            margin: 0;
            white-space: pre-line;
        }
        
        .payment-banner {
            background: #f8fafc;
            border: 1.5px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 1.25rem;
            margin-bottom: 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 1rem;
        }
        
        .payment-item {
            display: flex;
            flex-direction: column;
        }
        
        .payment-label {
            font-size: 0.76rem;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--text-muted);
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .payment-value {
            font-size: 1.15rem;
            font-weight: 800;
        }
        
        .payment-value.saldo {
            color: #e11d48;
        }
        
        .payment-value.pagado {
            color: #16a34a;
        }
        
        .section-title {
            font-size: 1rem;
            font-weight: 700;
            color: var(--text-main);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.5rem;
        }
        
        .timeline {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-bottom: 2rem;
        }
        
        .timeline-item {
            display: flex;
            gap: 1rem;
            position: relative;
            transition: all 0.25s ease;
        }
        
        .timeline-item::after {
            content: '';
            position: absolute;
            left: 20px;
            top: 40px;
            bottom: -20px;
            width: 2px;
            background: var(--border-color);
            z-index: 1;
        }
        
        .timeline-item:last-child::after {
            display: none;
        }
        
        /* Dias ya pasados: compactos y tenues */
        .timeline-item.completed {
            opacity: 0.55;
        }
        .timeline-item.completed .timeline-icon-wrapper {
            width: 30px;
            height: 30px;
            font-size: 14px;
        }
        .timeline-item.completed .timeline-icon-wrapper .material-symbols-outlined {
            font-size: 15px;
        }
        .timeline-item.completed .timeline-title {
            font-size: 0.78rem;
            font-weight: 500;
        }
        .timeline-item.completed .timeline-desc {
            font-size: 0.73rem;
        }
        .timeline-item.completed::after {
            left: 14px;
        }
        
        .timeline-icon-wrapper {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #f1f5f9;
            border: 2px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
            flex-shrink: 0;
            color: var(--text-muted);
            transition: all 0.3s ease;
        }
        
        .timeline-item.completed .timeline-icon-wrapper {
            background: #dcfce7;
            border-color: #22c55e;
            color: #15803d;
        }
        
        .timeline-item.active .timeline-icon-wrapper {
            background: rgba(180, 132, 108, 0.15);
            border-color: var(--primary-color);
            color: var(--primary-color);
            box-shadow: 0 0 0 4px rgba(180, 132, 108, 0.2);
            animation: pulse-active 1.5s infinite;
        }
        
        @keyframes pulse-active {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .timeline-item.weekend .timeline-icon-wrapper {
            background: #f8fafc;
            border-color: #cbd5e1;
            color: #94a3b8;
            border-style: dashed;
        }
        
        /* Hito: Fin de Fabricación */
        .timeline-item.milestone-ready .timeline-icon-wrapper {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border-color: #f59e0b;
            border-width: 2.5px;
            color: #92400e;
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15);
        }
        .timeline-item.milestone-ready .timeline-icon-wrapper .material-symbols-outlined {
            font-size: 22px;
        }
        .timeline-item.milestone-ready .timeline-title {
            font-size: 1rem;
            font-weight: 800;
            color: #92400e;
        }
        .timeline-item.milestone-ready .timeline-desc {
            color: #b45309;
            font-weight: 500;
        }
        .timeline-item.milestone-ready::after {
            background: linear-gradient(to bottom, #f59e0b, var(--border-color));
        }
        
        /* Hito: Retiro / Despacho */
        .timeline-item.milestone-pickup .timeline-icon-wrapper {
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, rgba(180,132,108,0.15), rgba(180,132,108,0.3));
            border-color: var(--primary-color);
            border-width: 2.5px;
            color: var(--primary-color);
            box-shadow: 0 0 0 5px rgba(180, 132, 108, 0.15);
        }
        .timeline-item.milestone-pickup .timeline-icon-wrapper .material-symbols-outlined {
            font-size: 24px;
        }
        .timeline-item.milestone-pickup .timeline-title {
            font-size: 1.05rem;
            font-weight: 800;
            color: var(--primary-color);
        }
        .timeline-item.milestone-pickup .timeline-desc {
            color: var(--primary-color);
            font-weight: 600;
            font-size: 0.88rem;
        }
        .timeline-item.milestone-pickup::after {
            display: none;
        }

        /* Boton para expandir la lista de dias */
        .timeline-expand-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: none;
            border: 1.5px dashed var(--border-color);
            border-radius: 20px;
            padding: 6px 16px;
            font-size: 0.82rem;
            color: var(--text-muted);
            cursor: pointer;
            margin: 0 0 0 56px;
            transition: all 0.2s ease;
            font-family: 'Outfit', sans-serif;
        }
        .timeline-expand-btn:hover {
            border-color: var(--primary-color);
            color: var(--primary-color);
            background: rgba(180, 132, 108, 0.05);
        }
        .timeline-expand-btn .material-symbols-outlined {
            font-size: 16px;
            transition: transform 0.3s ease;
        }
        .timeline-expand-btn.expanded .material-symbols-outlined {
            transform: rotate(180deg);
        }
        
        .timeline-content {
            flex: 1;
            padding-top: 8px;
        }
        
        .timeline-title {
            font-size: 0.95rem;
            font-weight: 700;
            margin: 0 0 2px 0;
        }
        
        .timeline-item.weekend .timeline-title {
            color: var(--text-muted);
            font-weight: 500;
        }
        
        .timeline-desc {
            font-size: 0.82rem;
            color: var(--text-muted);
            margin: 0;
        }
        
        .conditions-card {
            background: #fafafa;
            border: 1.5px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 1.5rem;
            font-size: 0.86rem;
            color: #475569;
            line-height: 1.6;
        }
        
        .conditions-card h3 {
            margin: 0 0 0.75rem 0;
            color: var(--text-main);
            font-weight: 700;
            font-size: 0.95rem;
        }
        
        .conditions-card ul {
            margin: 0;
            padding-left: 1.25rem;
        }
        
        .conditions-card li {
            margin-bottom: 0.5rem;
        }
        
        .client-footer {
            background: var(--surface-color);
            border-top: 1.5px solid var(--border-color);
            padding: 2rem 1.5rem;
            text-align: center;
            margin-top: auto;
        }
        
        .social-icons {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 1rem;
        }
        
        .social-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-main);
            text-decoration: none;
            transition: all 0.2s ease;
        }
        
        .social-btn:hover {
            background: var(--primary-color);
            color: white;
            transform: translateY(-2px);
        }
        
        .footer-text {
            font-size: 0.82rem;
            color: var(--text-muted);
        }
        
        @media (max-width: 500px) {
            .product-section {
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .product-image {
                width: 100%;
                max-width: 200px;
                height: 200px;
            }
        }
    </style>
</head>
<body>
    
    <script>
        (function () {
            if (window.self === window.top) {
                var q = window.location.search;
                var orderId = "${order.id}";
                var p = window.location.origin + window.location.pathname.replace(/\\/pedidos\\/[^\\/]+$/, "/?view=pedidos&id=" + orderId);
                window.location.replace(q ? p + "&" + q.substring(1) : p);
                return;
            }
            document.body.classList.add('in-iframe');
            
            if (window.parent && window.parent.document.body) {
                document.body.className = window.parent.document.body.className + ' in-iframe';
            }
        })();
    </script>

    <header class="client-header">
        <a href="../" class="logo-container">
            <img src="../img/logo_provisional.png" alt="La Tarima Logo" class="logo-img">
            <span class="logo-text">LA TARIMA</span>
        </a>
        <div style="font-size: 0.88rem; font-weight: 600; color: var(--primary-color);">Seguimiento de Pedido</div>
    </header>

    <main class="main-container">
        
        <div class="order-card">
            <div class="order-header" style="flex-direction: column; align-items: stretch; gap: 0.25rem; padding: 1.5rem 1.5rem 1.25rem 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; width: 100%;">
                    <h1 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: var(--text-main);">${order.clientName}</h1>
                    <div id="order-status-badge" class="status-badge"></div>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600; margin-top: 0.25rem;">
                    Orden #${order.id}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.1rem;">
                    Fecha: <span id="created-date-formatted"></span>
                </div>
            </div>
            
            <div class="order-body" style="padding: 1.5rem;">
                <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 1rem 0; color: var(--text-main);">${order.productName}</h2>
                
                <div style="margin-bottom: 1.25rem; display: flex; justify-content: center;">
                    <img src="../${order.image || 'img/logo_provisional.png'}" alt="Foto del Producto" style="width: 100%; max-width: 320px; height: auto; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); object-fit: cover;" onerror="this.src='../img/logo_provisional.png'">
                </div>

                ${order.selectedFinish ? `
                <div style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.5rem; display: block;">
                    <strong>Terminación:</strong> ${order.selectedFinish}
                </div>
                ` : ''}

                ${order.selectedMeasure ? `
                <div style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.5rem; display: block;">
                    <strong>Medida:</strong> ${order.selectedMeasure}
                </div>
                ` : ''}

                <div style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 1.75rem; line-height: 1.5; display: block;">
                    <strong>Descripción:</strong> <span style="color: var(--text-muted); font-style: italic;">${order.description || 'Sin descripción adicional.'}</span>
                </div>
                
                <div class="payment-banner">
                    <div class="payment-item">
                        <span class="payment-label">Total Pedido</span>
                        <span class="payment-value">$${Number(order.totalAmount || 0).toLocaleString('es-AR')}</span>
                    </div>
                    <div class="payment-item">
                        <span class="payment-label">Abonado</span>
                        <span class="payment-value pagado">$${Number(order.paidAmount || 0).toLocaleString('es-AR')}</span>
                    </div>
                    <div class="payment-item">
                        <span class="payment-label">Saldo Restante</span>
                        <span id="payment-saldo" class="payment-value"></span>
                    </div>
                </div>
                
                <div class="section-title">
                    <span class="material-symbols-outlined" style="font-size: 20px;">calendar_month</span>
                    Calendario de Fabricación
                </div>
                
                <div id="timeline-container" class="timeline"></div>
                
                <div style="background: rgba(180, 132, 108, 0.05); border: 1px solid rgba(180, 132, 108, 0.15); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="material-symbols-outlined" style="font-size: 32px; color: var(--primary-color);">
                            ${order.deliveryMethod === 'envio' ? 'local_shipping' : 'storefront'}
                        </span>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">
                                ${order.deliveryMethod === 'envio' ? 'Método de Entrega: Envío a Domicilio' : 'Método de Entrega: Retira por Taller'}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
                                ${order.deliveryMethod === 'envio' 
                                    ? (order.dispatchInfo && order.dispatchInfo.courier ? `Despachado por: <strong>${order.dispatchInfo.courierName || order.dispatchInfo.courier}</strong>` : 'Coordinaremos el envío una vez que el producto esté listo.')
                                    : 'Podrás retirar tu pedido por nuestro domicilio.'}
                            </div>
                        </div>
                    </div>

                    ${(function() {
                        if (order.deliveryMethod === 'retira') {
                            if (order.status !== 'listo' && order.status !== 'entregado') return '';
                            return `
                            <div style="margin-top: 1rem; padding: 1.25rem; background: rgba(16, 185, 129, 0.08); border: 1.5px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md);">
                                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #065f46; font-size: 1rem;">
                                        <span class="material-symbols-outlined" style="font-size: 26px; color: #10b981;">storefront</span>
                                        ${order.status === 'entregado' ? '¡Pedido Entregado en Taller! 🏁' : '¡Tu pedido ya está listo para retirar en el taller! 🏁'}
                                    </div>
                                    ${order.status === 'listo' ? `
                                    <a href="https://wa.me/5491167007723?text=${encodeURIComponent('¡Hola! Mi pedido #' + order.id + ' figura listo. Quisiera coordinar día y horario para retirarlo por el taller. 😊')}" target="_blank" rel="noopener noreferrer" style="background: #10b981; color: white; text-decoration: none; padding: 8px 18px; border-radius: 50px; font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 10px rgba(16,185,129,0.3);">
                                        <span class="material-symbols-outlined" style="font-size: 18px;">chat</span> Coordinar Retiro por WhatsApp
                                    </a>` : ''}
                                </div>
                                <div style="font-size: 0.88rem; color: #047857; line-height: 1.5; margin-top: 0.5rem;">
                                    ${order.status === 'entregado' 
                                        ? 'Este pedido ya fue retirado por el taller. ¡Muchas gracias por tu compra en La Tarima!' 
                                        : 'Podés pasar a retirarlo coordinando previamente con nosotros por WhatsApp para asegurar nuestra presencia en el taller al momento de recibirte. ¡Te esperamos! 🌲'}
                                </div>
                            </div>
                            `;
                        }

                        if (order.deliveryMethod !== 'envio' || !order.dispatchInfo || !order.dispatchInfo.courier) return '';
                        
                        const d = order.dispatchInfo;
                        let trackingUrl = d.trackingUrl || d.url || '';
                        let courierLabel = d.courierName || d.courier;

                        if (d.courier === 'correo_argentino' || d.courier === 'correo-argentino') {
                            trackingUrl = trackingUrl || 'https://www.correoargentino.com.ar/formularios/e-commerce';
                            courierLabel = 'Correo Argentino';
                        } else if (d.courier === 'via_cargo' || d.courier === 'via_cargo') {
                            trackingUrl = trackingUrl || (d.trackingNumber ? `https://www.viacargo.com.ar/seguimiento?nroenvio=${encodeURIComponent(d.trackingNumber)}` : 'https://www.viacargo.com.ar/seguimiento');
                            courierLabel = 'Vía Cargo';
                        } else if (d.courier === 'andreani') {
                            trackingUrl = trackingUrl || (d.trackingNumber ? `https://www.andreani.com/#!/informacionEnvio/${encodeURIComponent(d.trackingNumber)}` : 'https://www.andreani.com');
                            courierLabel = 'Andreani';
                        } else if (d.courier === 'envio_personal' || d.courier === 'envio-personal') {
                            trackingUrl = trackingUrl || '';
                            courierLabel = 'Envío Personal / Cadetería';
                        } else {
                            trackingUrl = trackingUrl || '';
                            courierLabel = d.courierName || 'Empresa de Transporte';
                        }

                        if (!trackingUrl && !d.trackingNumber) return '';

                        return `
                        <div style="margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px dashed rgba(180, 132, 108, 0.25); display: flex; flex-direction: column; gap: 8px;">
                            ${d.trackingNumber ? `
                            <div style="font-size: 0.88rem; color: var(--text-main); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <strong>N° de Guía / Tracking:</strong>
                                <span onclick="navigator.clipboard.writeText('${d.trackingNumber}'); const icon = this.querySelector('.material-symbols-outlined'); if(icon){ icon.textContent='check'; setTimeout(()=>icon.textContent='content_copy', 2000); }" title="Haz clic para copiar" style="font-family: monospace; font-weight: 700; background: rgba(0, 0, 0, 0.05); padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(0,0,0,0.08); user-select: all;">
                                    ${d.trackingNumber}
                                    <span class="material-symbols-outlined" style="font-size: 16px; color: var(--primary-color);">content_copy</span>
                                </span>
                            </div>
                            ` : ''}
                            ${trackingUrl ? `
                            <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" onclick="if('${d.trackingNumber}' && navigator.clipboard){ navigator.clipboard.writeText('${d.trackingNumber}'); }" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; padding: 0.65rem 1.25rem; font-weight: 700; font-size: 0.9rem; margin-top: 4px; border-radius: var(--radius-sm);">
                                <span class="material-symbols-outlined" style="font-size: 20px;">open_in_new</span>
                                Seguir Pedido (${courierLabel})
                            </a>
                            ` : ''}
                        </div>
                        `;
                    })()}
                </div>
                
            </div>
        </div>
        
        <div class="conditions-card">
            <h3>Condiciones Generales del Pedido</h3>
            <ul>
                ${(ordersConfig.conditions || defaultOrdersConfig.conditions).map(c => `<li><strong>${c.title || ''}</strong> ${c.text || ''}</li>`).join('\n                ')}
            </ul>
        </div>
        
    </main>

    <footer class="client-footer">
        <div class="social-icons">
            ${socialLinks.instagram ? '<a href="' + socialLinks.instagram + '" target="_blank" class="social-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>' : ''}
            ${socialLinks.tiktok ? '<a href="' + socialLinks.tiktok + '" target="_blank" class="social-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg></a>' : ''}
            ${socialLinks.facebook ? '<a href="' + socialLinks.facebook + '" target="_blank" class="social-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>' : ''}
            ${socialLinks.whatsapp ? '<a href="https://wa.me/' + socialLinks.whatsapp.replace(/[^0-9]/g, '') + '" target="_blank" class="social-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></a>' : ''}
        </div>
        <div class="footer-text">
            &copy; 2026 La Tarima. Todos los derechos reservados.
        </div>
    </footer>

    <script>
        const orderData = ${JSON.stringify(order)};
        const ordersConfigData = ${JSON.stringify(ordersConfig)};
        
        document.addEventListener('DOMContentLoaded', () => {
            const createdDate = new Date(orderData.creationDate);
            document.getElementById('created-date-formatted').textContent = createdDate.toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' hs';
            
            const badgeEl = document.getElementById('order-status-badge');
            badgeEl.className = 'status-badge status-' + orderData.status;
            
            let statusText = 'Pendiente de Elaboración';
            let statusIcon = 'hourglass_empty';
            if (orderData.status === 'listo') {
                statusText = 'Listo para retirar / Enviar';
                statusIcon = 'check_circle';
            } else if (orderData.status === 'entregado') {
                statusText = 'Entregado';
                statusIcon = 'task_alt';
            }
            badgeEl.innerHTML = \`<span class="material-symbols-outlined" style="font-size: 16px;">\${statusIcon}</span> \${statusText}\`;
            
            const total = Number(orderData.totalAmount || 0);
            const paid = Number(orderData.paidAmount || 0);
            const saldo = total - paid;
            const saldoEl = document.getElementById('payment-saldo');
            saldoEl.textContent = '$' + saldo.toLocaleString('es-AR');
            if (saldo > 0) {
                saldoEl.className = 'payment-value saldo';
            } else {
                saldoEl.className = 'payment-value pagado';
            }
            
            renderTimeline();
        });
        
        function renderTimeline() {
            const container = document.getElementById('timeline-container');
            container.innerHTML = '';
            
            const start = new Date(orderData.startDate);
            const end = new Date(orderData.estimatedReadyDate);
            const today = new Date();
            
            const startZero = new Date(start); startZero.setHours(0,0,0,0);
            const endZero = new Date(end); endZero.setHours(0,0,0,0);
            const todayZero = new Date(today); todayZero.setHours(0,0,0,0);
            
            let days = [];
            let temp = new Date(startZero);
            let safety = 0;
            while (temp <= endZero && safety < 100) {
                safety++;
                days.push(new Date(temp));
                temp.setDate(temp.getDate() + 1);
            }
            
            // Dia habil siguiente (retiro/despacho)
            let nextDay = new Date(endZero);
            nextDay.setDate(nextDay.getDate() + 1);
            while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
                nextDay.setDate(nextDay.getDate() + 1);
            }
            const nextDayZero = new Date(nextDay);
            nextDayZero.setHours(0,0,0,0);
            days.push(nextDayZero);
            
            let businessDayCounter = 0;
            
            // Construir datos de cada dia
            const builtDays = days.map((d, idx) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday   = d.getTime() === todayZero.getTime();
                const isLast    = idx === days.length - 1;
                const isReadyDay = idx === days.length - 2;
                const isFirst   = idx === 0;
                
                let isCompleted = false;
                if (orderData.status === 'listo' || orderData.status === 'entregado') {
                    isCompleted = !isLast;
                } else {
                    isCompleted = d < todayZero;
                }
                
                let itemClass = 'timeline-item';
                let iconText  = 'pending';
                
                if (isWeekend) {
                    itemClass += ' weekend';
                    iconText = 'hotel';
                } else {
                    if (isLast) {
                        itemClass += ' milestone-pickup';
                        if (orderData.status === 'listo' || orderData.status === 'entregado') {
                            itemClass += ' completed-milestone';
                            iconText = orderData.deliveryMethod === 'envio' ? 'local_shipping' : 'storefront';
                        } else {
                            iconText = orderData.deliveryMethod === 'envio' ? 'local_shipping' : 'storefront';
                        }
                    } else if (isReadyDay) {
                        itemClass += ' milestone-ready';
                        if (isCompleted) { itemClass += ' completed-milestone'; }
                        iconText = isCompleted ? 'verified' : 'flag';
                    } else {
                        businessDayCounter++;
                        if (isCompleted) {
                            itemClass += ' completed';
                            iconText = 'check';
                        } else if (isToday) {
                            itemClass += ' active';
                            iconText = 'construction';
                        } else {
                            iconText = 'schedule';
                        }
                    }
                }
                
                const weekday = d.toLocaleDateString('es-AR', { weekday: 'long' });
                const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                const dateStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                
                let title = '';
                let desc  = '';
                
                if (isWeekend) {
                    title = \`\${capitalizedWeekday} \&bull; \${dateStr}\`;
                    desc  = 'Fines de semana el taller permanece cerrado 🌲';
                } else {
                    if (isFirst) {
                        title = \`\${capitalizedWeekday} \&bull; \${dateStr} — Inicio\`;
                        desc  = \`Día 1 de fabricación en taller 🛠️\`;
                    } else if (isReadyDay) {
                        const readyDescCfg = (ordersConfigData.milestones && ordersConfigData.milestones.readyDesc) || '¡Tu mueble ya está listo! ✅';
                        const isFinished = (orderData.status === 'listo' || orderData.status === 'entregado');
                        const isEarly = isFinished && businessDayCounter < maxDays;
                        const daysSaved = maxDays - businessDayCounter;
                        title = \`\${capitalizedWeekday} \&bull; \${dateStr} — \${(isEarly && daysSaved > 0) ? '¡Pedido Listo con Anticipación! ⚡' : 'Fin de Fabricación'}\`;
                        desc  = isFinished
                            ? ((isEarly && daysSaved > 0)
                                ? \`\${readyDescCfg} ⚡ ¡Finalizado con anticipación en solo \${businessDayCounter} días hábiles! (\${daysSaved} \${daysSaved === 1 ? 'día hábil' : 'días hábiles'} antes de lo pactado) 🎉\`
                                : \`\${readyDescCfg} (Finalizado en \${businessDayCounter} días hábiles)\`)
                            : \`Fecha estimada de finalización (Día \${businessDayCounter})\`;
                    } else if (isLast) {
                        const mCfg = ordersConfigData.milestones || {};
                        const isEnvio = orderData.deliveryMethod === 'envio';
                        const customTitle = isEnvio ? (mCfg.envioTitle || 'Despacho de Pedido') : (mCfg.retiraTitle || 'Retiro por Taller');
                        const customDesc  = isEnvio
                            ? (mCfg.envioDesc || 'Tu pedido se encuentra en proceso de despacho o en camino. Podés seguir su recorrido en el apartado de abajo ⬇️')
                            : (mCfg.retiraDesc || 'Ya podés retirar tu pedido por nuestro domicilio. Coordinaremos el día y horario con vos 🏁');
                        title = \`\${capitalizedWeekday} \&bull; \${dateStr} — \${customTitle}\`;
                        desc  = customDesc;
                    } else {
                        title = \`\${capitalizedWeekday} \&bull; \${dateStr}\`;
                        desc  = \`Día \${businessDayCounter} de elaboración\`;
                    }
                }
                
                if (isToday && !isWeekend && orderData.status === 'pendiente' && !isLast) {
                    desc += ' (¡Hoy estamos trabajando en tu pedido! 🛠️)';
                }
                
                return { d, itemClass, iconText, title, desc, isFirst, isLast, isReadyDay, isWeekend };
            });
            

            function createRow(dayData) {
                const row = document.createElement('div');
                row.className = dayData.itemClass;
                row.innerHTML = \`
                    <div class="timeline-icon-wrapper">
                        <span class="material-symbols-outlined">\${dayData.iconText}</span>
                    </div>
                    <div class="timeline-content">
                        <h4 class="timeline-title">\${dayData.title}</h4>
                        <p class="timeline-desc">\${dayData.desc}</p>
                    </div>
                \`;
                return row;
            }

            function makeExpandBtn(wrapperId, labelShow, labelHide) {
                const btn = document.createElement('button');
                btn.className = 'timeline-expand-btn';
                btn.innerHTML = \`<span class="material-symbols-outlined">expand_more</span> \${labelShow}\`;
                btn.addEventListener('click', function() {
                    const w = document.getElementById(wrapperId);
                    const isOpen = w.style.display !== 'none';
                    w.style.display = isOpen ? 'none' : 'block';
                    this.classList.toggle('expanded', !isOpen);
                    this.innerHTML = isOpen
                        ? \`<span class="material-symbols-outlined">expand_more</span> \${labelShow}\`
                        : \`<span class="material-symbols-outlined">expand_less</span> \${labelHide}\`;
                });
                return btn;
            }

            // Indices de referencia
            const milestoneReadyIdx  = builtDays.length - 2;
            const milestonePickupIdx = builtDays.length - 1;
            const todayIdx = builtDays.findIndex(bd => bd.d.getTime() === todayZero.getTime());

            // Si hoy esta fuera del rango, usar indice 0 como "hoy"
            const anchorToday    = todayIdx !== -1 ? todayIdx    : 0;
            const anchorTomorrow = todayIdx !== -1 ? todayIdx + 1 : 1;

            // Grupo 1: dias pasados (antes de hoy)
            const pastIndices   = builtDays.map((_,i) => i).filter(i => i < anchorToday && i !== milestoneReadyIdx && i !== milestonePickupIdx);
            // Grupo 2: dias del medio (despues de manana y antes de milestones)
            const middleIndices = builtDays.map((_,i) => i).filter(i => i > anchorTomorrow && i !== milestoneReadyIdx && i !== milestonePickupIdx);

            // ── Bloque de dias pasados ──
            if (pastIndices.length > 0) {
                const pastWrapper = document.createElement('div');
                pastWrapper.id = 'timeline-past';
                pastWrapper.style.display = 'none';
                pastIndices.forEach(i => pastWrapper.appendChild(createRow(builtDays[i])));
                container.appendChild(pastWrapper);
                container.appendChild(makeExpandBtn('timeline-past', 'Ver días anteriores', 'Ocultar días anteriores'));
            }

            // ── Hoy y mañana siempre visibles ──
            container.appendChild(createRow(builtDays[anchorToday]));
            if (anchorTomorrow < milestoneReadyIdx) {
                container.appendChild(createRow(builtDays[anchorTomorrow]));
            }

            // ── Dias del medio ──
            if (middleIndices.length > 0) {
                const middleWrapper = document.createElement('div');
                middleWrapper.id = 'timeline-middle';
                middleWrapper.style.display = 'none';
                middleIndices.forEach(i => middleWrapper.appendChild(createRow(builtDays[i])));
                container.appendChild(makeExpandBtn('timeline-middle', 'Ver detalle completo', 'Ocultar detalle'));
                container.appendChild(middleWrapper);
            }

            // ── Milestones siempre visibles ──
            container.appendChild(createRow(builtDays[milestoneReadyIdx]));
            container.appendChild(createRow(builtDays[milestonePickupIdx]));
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`✅ Página de seguimiento del cliente creada/actualizada: pedidos/\${order.id}.html`);
}

app.get('/api/orders', (req, res) => {
    try {
        if (!fs.existsSync(ordersDbPath)) {
            return res.json([]);
        }
        const fileContent = fs.readFileSync(ordersDbPath, 'utf8');
        const jsonStr = fileContent
            .replace(/^\s*const\s+ordersData\s*=\s*/, '')
            .replace(/;\s*$/, '')
            .trim();
        const orders = JSON.parse(jsonStr);
        
        const { activeOrders, expiredIds } = cleanExpiredOrders(orders);
        if (expiredIds.length > 0) {
            const updatedContent = 'const ordersData = ' + JSON.stringify(activeOrders, null, 4) + ';\n';
            fs.writeFileSync(ordersDbPath, updatedContent, 'utf8');
            console.log(`🧹 Base de datos de pedidos limpia: se eliminaron \${expiredIds.length} pedidos expirados.`);
        }
        
        res.json(activeOrders);
    } catch (error) {
        console.error('❌ Error leyendo pedidos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener pedidos.' });
    }
});

app.post('/api/save-orders', (req, res) => {
    try {
        const { orders, modifiedOrder } = req.body;
        if (!Array.isArray(orders)) {
            return res.status(400).json({ success: false, message: 'El payload debe contener un array "orders".' });
        }
        
        const { activeOrders, expiredIds } = cleanExpiredOrders(orders);
        
        if (modifiedOrder) {
            const index = activeOrders.findIndex(o => o.id === modifiedOrder.id);
            if (index !== -1) {
                    const pMin = Number(modifiedOrder.prepDaysMin || modifiedOrder.prepDays || 10);
                    const pMax = Number(modifiedOrder.prepDaysMax || modifiedOrder.prepDays || pMin);
                    const dates = calculateEstimatedReadyDate(modifiedOrder.creationDate || new Date().toISOString(), pMin, pMax);
                    modifiedOrder.startDate = dates.startDate;
                    modifiedOrder.estimatedReadyDate = dates.estimatedReadyDate;
                activeOrders[index] = modifiedOrder;
            }
        }
        
        const fileContent = 'const ordersData = ' + JSON.stringify(activeOrders, null, 4) + ';\n';
        fs.writeFileSync(ordersDbPath, fileContent, 'utf8');
        console.log('✅ js/orders-data.js actualizado correctamente.');
        
        activeOrders.forEach(order => {
            generateClientPage(order);
        });
        
        const activeIds = activeOrders.map(o => o.id);
        const pedidosDir = path.join(ROOT_DIR, 'pedidos');
        if (fs.existsSync(pedidosDir)) {
            const files = fs.readdirSync(pedidosDir).filter(f => f.endsWith('.html') && f !== 'index.html' && f !== 'admin.html');
            files.forEach(file => {
                const id = file.replace('.html', '');
                if (!activeIds.includes(id)) {
                    const filePathToDelete = path.join(pedidosDir, file);
                    try {
                        fs.unlinkSync(filePathToDelete);
                        console.log(`🧹 Eliminado archivo huérfano: pedidos/\${file}`);
                    } catch (e) {
                        console.error(`Error eliminando archivo huérfano \${file}:`, e);
                    }
                }
            });
        }
        
        res.json({ success: true, message: 'Pedidos y páginas de seguimiento sincronizados con éxito.', orders: activeOrders });
    } catch (error) {
        console.error('❌ Error guardando pedidos:', error);
        res.status(500).json({ success: false, message: 'Error interno al guardar pedidos.' });
    }
});

app.get('/api/orders-config', (req, res) => {
    try {
        const config = getOrdersConfig();
        res.json(config);
    } catch (e) {
        console.error('❌ Error obteniendo orders-config:', e);
        res.status(500).json({ success: false, message: 'Error al obtener la configuración de pedidos.' });
    }
});

app.post('/api/save-orders-config', (req, res) => {
    try {
        const config = req.body;
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ success: false, message: 'Payload de configuración inválido.' });
        }
        
        const fileContent = 'const ordersConfig = ' + JSON.stringify(config, null, 4) + ';\n';
        fs.writeFileSync(ordersConfigDbPath, fileContent, 'utf8');
        console.log('✅ js/orders-config.js actualizado correctamente.');
        
        // Regenerar todas las páginas de pedidos para aplicar las nuevas leyendas y términos
        if (fs.existsSync(ordersDbPath)) {
            const content = fs.readFileSync(ordersDbPath, 'utf8');
            const jsonStr = content.replace(/^\s*const\s+ordersData\s*=\s*/, '').replace(/;\s*$/, '').trim();
            try {
                const orders = JSON.parse(jsonStr);
                const { activeOrders } = cleanExpiredOrders(orders);
                activeOrders.forEach(order => generateClientPage(order));
            } catch(e) {}
        }
        
        res.json({ success: true, message: 'Configuración de leyendas y términos guardada con éxito.', config });
    } catch (e) {
        console.error('❌ Error guardando orders-config:', e);
        res.status(500).json({ success: false, message: 'Error al guardar la configuración.' });
    }
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    const cleanUrl = req.path.toLowerCase().replace(/\/$/, '');
    
    // 🔍 Detectar solicitudes de orden directa tipo /500102800 o /pedidos/500102800 o /web/500102800
    const urlSegments = req.path.split('/').filter(Boolean);
    if (urlSegments.length > 0) {
        const lastSeg = urlSegments[urlSegments.length - 1].replace('.html', '').trim();
        const orderDigits = lastSeg.replace(/[^0-9]/g, '');
        if (orderDigits.length >= 6 && /^\d+$/.test(orderDigits)) {
            return res.redirect(`/?view=pedidos&id=${orderDigits}`);
        }

        // 🔗 Detectar si el último segmento de la URL es un código corto Base36 (ej: /1.1D.0.1 o /1.A)
        const shortCodeRegex = /^[0-9a-z]{1,4}(\.[0-9a-z]{1,4})+$/i;
        if (shortCodeRegex.test(lastSeg)) {
            return res.redirect(`/?s=${lastSeg}`);
        }
    }
    
    // Rutas del catálogo mayorista sin .html visible
    if (cleanUrl === '/web/mayorista' || cleanUrl === '/mayorista' || cleanUrl === '/mayoristas') {
        const mayoristaPath = fs.existsSync(path.join(ROOT_DIR, 'apps', 'mayorista.html'))
            ? path.join(ROOT_DIR, 'apps', 'mayorista.html')
            : path.join(ROOT_DIR, 'mayorista.html');
        if (fs.existsSync(mayoristaPath)) {
            return res.sendFile(mayoristaPath);
        }
    }

    // Rutas del calculador de medidas sin .html visible
    if (cleanUrl === '/web/calcular' || cleanUrl === '/calcular' || cleanUrl === '/calculador') {
        const calcularPath = fs.existsSync(path.join(ROOT_DIR, 'apps', 'calcular.html'))
            ? path.join(ROOT_DIR, 'apps', 'calcular.html')
            : path.join(ROOT_DIR, 'calcular.html');
        if (fs.existsSync(calcularPath)) {
            return res.sendFile(calcularPath);
        }
    }

    // Mapeo automático de archivos HTML redirigidos a la carpeta apps/
    const appNameMap = {
        '/catalogo.html': 'catalogo.html',
        '/mayorista.html': 'mayorista.html',
        '/calcular.html': 'calcular.html',
        '/musica.html': 'musica.html',
        '/ayudin.html': 'ayudin.html'
    };
    if (appNameMap[cleanUrl]) {
        const appPath = path.join(ROOT_DIR, 'apps', appNameMap[cleanUrl]);
        if (fs.existsSync(appPath)) {
            return res.sendFile(appPath);
        }
    }
    
    // Ruta de Ayudín / Guías
    if (cleanUrl === '/web/ayudin' || cleanUrl === '/ayudin' || cleanUrl === '/help' || cleanUrl === '/herramientas') {
        const ayudinPath = path.join(ROOT_DIR, 'apps', 'ayudin.html');
        if (fs.existsSync(ayudinPath)) {
            return res.sendFile(ayudinPath);
        }
    }

    // Rutas de Pedidos y Admin de Pedidos
    if (cleanUrl === '/web/pedidos-admin' || cleanUrl === '/pedidos-admin') {
        const adminPedidosPath = path.join(ROOT_DIR, 'pedidos', 'admin.html');
        if (fs.existsSync(adminPedidosPath)) return res.sendFile(adminPedidosPath);
    }
    if (cleanUrl === '/web/pedidos' || cleanUrl === '/pedidos') {
        const indexPedidosPath = path.join(ROOT_DIR, 'pedidos', 'index.html');
        if (fs.existsSync(indexPedidosPath)) return res.sendFile(indexPedidosPath);
    }

    // Ruta del Editor de Fotos Masivo sin .html visible
    if (cleanUrl === '/web/edit' || cleanUrl === '/edit' || cleanUrl === '/editor' || cleanUrl === '/web/editor') {
        const editorPath = path.join(ROOT_DIR, 'apps', 'editor-fotos.html');
        if (fs.existsSync(editorPath)) {
            return res.sendFile(editorPath);
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

function regenerateAllClientPages() {
    try {
        if (fs.existsSync(ordersDbPath)) {
            const fileContent = fs.readFileSync(ordersDbPath, 'utf8');
            const jsonStr = fileContent
                .replace(/^\s*const\s+ordersData\s*=\s*/, '')
                .replace(/;\s*$/, '')
                .trim();
            const orders = JSON.parse(jsonStr);
            const { activeOrders } = cleanExpiredOrders(orders);
            activeOrders.forEach(order => {
                generateClientPage(order);
            });
            console.log(`✅ Regeneradas ${activeOrders.length} páginas de seguimiento de clientes.`);
        }
    } catch (e) {
        console.error('❌ Error regenerando páginas de seguimiento al arrancar:', e);
    }
}

// Manejo de rutas limpias SPA (/stock, /mayorista, /catalogo, /musica, /alquileres, /admin)
app.get(['/stock', '/mayorista', '/catalogo', '/musica', '/alquileres', '/admin'], (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    regenerateAllClientPages();
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
