// js/data.js
// --- DATA MODULE ---
// Navegación inteligente - Historial de vistas
window.navigationHistory = [];

// Helper to get max modification timestamp of products
function getMaxProductTimestamp(arr) {
    let max = 0;
    if (Array.isArray(arr)) {
        arr.forEach(cat => {
            if (cat.products && Array.isArray(cat.products)) {
                cat.products.forEach(p => {
                    if (p.last_modified && !isNaN(p.last_modified)) {
                        max = Math.max(max, Number(p.last_modified));
                    }
                });
            }
        });
    }
    return max;
}

// Helper to get max modification timestamp of rentals
function getMaxRentalTimestamp(arr) {
    let max = 0;
    if (Array.isArray(arr)) {
        arr.forEach(r => {
            if (r.last_modified && !isNaN(r.last_modified)) {
                max = Math.max(max, Number(r.last_modified));
            }
        });
    }
    return max;
}

// Estado global de Productos
window.sessionProducts = (() => {
    let localList = null;
    try {
        const stored = localStorage.getItem('sessionProducts');
        if (stored) localList = JSON.parse(stored);
    } catch (e) {}

    const hasServerData = typeof productsData !== 'undefined' && Array.isArray(productsData) && productsData.length > 0;
    if (!localList || !Array.isArray(localList) || localList.length === 0) {
        return hasServerData ? [...productsData] : [];
    }

    if (!hasServerData) return localList;

    const serverMaxTime = getMaxProductTimestamp(productsData);
    const localMaxTime = getMaxProductTimestamp(localList);

    // Si los datos del servidor son iguales o más nuevos, o si localStorage no tiene la última versión
    if (serverMaxTime >= localMaxTime) {
        return [...productsData];
    }

    // Si localStorage tiene cambios locales más recientes, aún así sincronizar categorías o productos faltantes
    productsData.forEach(serverCat => {
        const exists = localList.find(c => c.id === serverCat.id);
        if (!exists) {
            localList.push(serverCat);
        } else if (serverCat.id === 'cortes-madera' || serverCat.id === 'cajones-madera' || serverCat.id === 'cajones-crossfit') {
            exists.products = serverCat.products;
            exists.name = serverCat.name;
            exists.visible = serverCat.visible;
        }
    });
    return localList;
})();

window.sessionRentals = [];

// Estado global de Ofertas (Priorizar base de datos del servidor js/offers-data.js)
window.sessionOffers = typeof offersData !== 'undefined' && Array.isArray(offersData) && offersData.length > 0
    ? [...offersData]
    : (localStorage.getItem('sessionOffers') ? JSON.parse(localStorage.getItem('sessionOffers')) : []);

// Limpieza de claves obsoletas de respaldo
try {
    localStorage.removeItem('sessionOffersAutonomo');
    localStorage.removeItem('sessionProductsAutonomo');
} catch (e) {}

// Garantizar que existan las estructuras de siteConfig del servidor
if (!window.siteConfig) {
    window.siteConfig = {
        activeTheme: "classic",
        appConfig: {
            home: { title: "La Tarima", subtitle: "Diseño en madera", icon: "home", visible: true, contentStack: [] },
            categories: { title: "Categorías", subtitle: "Nuestras líneas de productos", icon: "category", visible: true, contentStack: [] },
            cart: { title: "Carrito", subtitle: "Tus productos seleccionados", icon: "shopping_cart", visible: true },
            videos: { title: "Videos", subtitle: "Descubrí nuestro contenido", icon: "play_circle", visible: true },
            catalogo: { title: "Catálogo", subtitle: "Catálogo completo", icon: "menu_book", visible: true },
            avisos: { title: "Avisos", subtitle: "Novedades del taller", icon: "notifications", visible: true, contentStack: [] },
            nosotros: { title: "Pasión por la madera", subtitle: "Conocé quiénes somos", icon: "info", visible: true },
            search: { title: "Explorar", subtitle: "Encontrá lo que buscás", icon: "search", visible: true }
        },
        contentRegistry: { home: [], categories: [], avisos: [], cart: [], videos: [], catalogo: [], nosotros: [], search: [] },
        socialLinks: { instagram: "", tiktok: "", facebook: "", youtube: "", whatsapp: "", mercadolibre: "" },
        sessionNosotros: [],
        sessionAvisos: [],
        homeConfig: {
            order: ['categorias', 'ofertas', 'novedades', 'buscados'],
            sections: {
                categorias: { title: "Categorías", subtitle: "Nuestras líneas de productos", icon: "table_restaurant" },
                ofertas: { title: "Ofertas Especiales", subtitle: "Promociones y combos por tiempo limitado", icon: "local_offer" },
                novedades: { title: "Nuevos Diseños 2026", subtitle: "Novedades del taller", icon: "auto_awesome" },
                buscados: { title: "Los más buscados", subtitle: "Los preferidos de nuestros clientes", icon: "favorite" }
            }
        }
    };
}

let localMayorista = null;
try {
    const cachedMay = localStorage.getItem('mayoristaConfig');
    if (cachedMay) localMayorista = JSON.parse(cachedMay);
} catch (e) {
    console.error("Error loading mayoristaConfig from localStorage:", e);
}

window.mayoristaConfig = localMayorista || window.siteConfig.mayoristaConfig || {
    markupPercent: 10,
    cbu: "0720048988000002273736",
    alias: "VENUS.PULMON.METRO",
    bank: "Banco Santander",
    titular: "Yonatan Lucas Orellana",
    cuit: "20-35281538-2",
    terms: "Condiciones de Venta Mayorista:\n1. Compra mínima de $100.000.\n2. Los precios no incluyen IVA.\n3. Retiro por taller o envío a convenir.\n4. Demora estimada de entrega de 15 a 20 días."
};
window.siteConfig.mayoristaConfig = window.mayoristaConfig;

// Función para aplicar la skin de forma reactiva en el body
window.applyTheme = function(themeName) {
    document.body.classList.remove('theme-sobrio', 'theme-mundial', 'theme-final-mundial', 'theme-navidad', 'theme-halloween', 'theme-valentin', 'theme-imperial');
    if (themeName && themeName !== 'classic') {
        document.body.classList.add(`theme-${themeName}`);
    }
    if (window.updateGarlandVisibility) {
        window.updateGarlandVisibility();
    }
};


// Limpiar residuos de localStorage que pisan la config del servidor
localStorage.removeItem('activeTheme');

// El tema siempre viene del servidor (site-config.js). userSelectedTheme solo aplica en esa sesión de navegación.
window.userSelectedTheme = null;
window.activeTheme = window.siteConfig.activeTheme || 'classic';
window.applyTheme(window.activeTheme);

// 1. App Configurator: Dynamic Identity and Navigation State
window.appConfig = window.siteConfig.appConfig || {
    home: { title: "La Tarima", subtitle: "Diseño en madera", icon: "home", visible: true, contentStack: [] },
    search: { title: "Explorar", subtitle: "Encontrá lo que buscás", icon: "search", visible: true, contentStack: [] },
    profile: { title: "Tu Perfil", subtitle: "Gestioná tus datos", icon: "person", visible: true },
    avisos: { title: "Avisos", subtitle: "Novedades del taller", icon: "notifications", visible: true, contentStack: [] },
    nosotros: { title: "Pasión por la madera", subtitle: "Conocé quiénes somos", icon: "info", visible: true }
};

// Fallback por si localConfig existía (migración retroactiva a disco)
try {
    const localConfig = localStorage.getItem('appConfig');
    if (localConfig) {
        const parsed = JSON.parse(localConfig);
        // Mezclar con siteConfig si corresponde, para conservar compatibilidad
        Object.keys(parsed).forEach(key => {
            if (!window.appConfig[key]) window.appConfig[key] = parsed[key];
        });
        ['home', 'categories', 'avisos', 'cart', 'videos', 'catalogo', 'nosotros', 'search'].forEach(k => {
            if (window.appConfig[k] && !window.appConfig[k].contentStack) window.appConfig[k].contentStack = [];
        });
    }
} catch (e) {
    console.error("Error loading appConfig fallback:", e);
}

// 2. Content Registry: almacén independiente de stacks de componentes por sección
window.contentRegistry = window.siteConfig.contentRegistry || { home: [], search: [], avisos: [] };
try {
    const savedRegistry = localStorage.getItem('contentRegistry');
    if (savedRegistry) {
        const parsed = JSON.parse(savedRegistry);
        ['home', 'categories', 'avisos', 'cart', 'videos', 'catalogo', 'nosotros', 'search'].forEach(k => {
            if (!window.contentRegistry[k]) window.contentRegistry[k] = [];
            if (!window.contentRegistry[k].length && parsed[k]) window.contentRegistry[k] = parsed[k];
        });
    }
} catch (e) {
    console.error("Error loading contentRegistry fallback:", e);
}

// 3. Estado global de Nosotros
window.defaultNosotros = [
    {
        title: "Pasión por la madera",
        image: "img/logo_provisional.png",
        description: "Somos una carpintería especializada en crear productos únicos, seguros y con diseño para tu hogar. Ubicados en Hurlingham, Buenos Aires.",
        linkUrl: "https://wa.me/5491167007723",
        linkText: "Contactarnos por WhatsApp"
    },
    {
        title: "Ubicación en Hurlingham",
        image: "img/logo_provisional.png",
        description: "Nuestro taller se encuentra en el corazón de Hurlingham, provincia de Buenos Aires. Diseñamos muebles premium con maderas seleccionadas para garantizar máxima durabilidad.",
        linkUrl: "",
        linkText: ""
    },
    {
        title: "Calidad y Seguridad",
        image: "img/logo_provisional.png",
        description: "Cada pieza pasa por un estricto control de lijado y acabado con productos no tóxicos. La viruta y frescura de la madera en tu hogar, con la tranquilidad que tu familia se merece.",
        linkUrl: "",
        linkText: ""
    }
];

// Priorizar localStorage sobre siteConfig para no perder cambios locales en Nosotros
let savedNosotros = null;
try {
    const localNosotros = localStorage.getItem('sessionNosotros');
    if (localNosotros) {
        savedNosotros = JSON.parse(localNosotros);
    }
} catch(e) {
    console.error("Error loading sessionNosotros fallback:", e);
}

window.sessionNosotros = (savedNosotros && savedNosotros.length)
    ? savedNosotros
    : ((window.siteConfig.sessionNosotros && window.siteConfig.sessionNosotros.length) 
        ? window.siteConfig.sessionNosotros 
        : [...window.defaultNosotros]);

let savedAvisos = null;
try {
    const localAvisos = localStorage.getItem('sessionAvisosAutonomo');
    if (localAvisos) {
        savedAvisos = JSON.parse(localAvisos);
    }
} catch(e) {
    console.error("Error loading sessionAvisos fallback:", e);
}

window.sessionAvisos = (savedAvisos && savedAvisos.length)
    ? savedAvisos
    : ((window.siteConfig.sessionAvisos && window.siteConfig.sessionAvisos.length) 
        ? window.siteConfig.sessionAvisos 
        : []);

// De-duplicar y sincronizar imágenes de avisos vinculados a productos
if (Array.isArray(window.sessionAvisos)) {
    const seenAvisos = new Set();
    window.sessionAvisos = window.sessionAvisos.filter(aviso => {
        if (!aviso) return false;
        const key = `${(aviso.title || '').trim().toLowerCase()}_${(aviso.linkUrl || '').trim().toLowerCase()}`;
        if (seenAvisos.has(key)) {
            return false;
        }
        seenAvisos.add(key);
        return true;
    });

    // Sincronizar automáticamente fotos de avisos vinculados a productos/alquileres
    let avisosMigrated = false;
    window.sessionAvisos.forEach(aviso => {
        let prodId = null;
        if (aviso.linkUrl) {
            const match = aviso.linkUrl.match(/prod=([^&]+)/);
            if (match) prodId = match[1];
        }
        if (!prodId && aviso.links && aviso.links.length > 0) {
            aviso.links.forEach(l => {
                if (l.url) {
                    const match = l.url.match(/prod=([^&]+)/);
                    if (match) prodId = match[1];
                }
            });
        }

        if (prodId) {
            const decodedProdId = decodeURIComponent(prodId).trim().toLowerCase();
            let targetCover = null;

            if (window.sessionProducts && Array.isArray(window.sessionProducts)) {
                for (const cat of window.sessionProducts) {
                    if (cat.products) {
                        const found = cat.products.find(p => {
                            if (!p) return false;
                            const pId = String(p.id != null ? p.id : '').trim().toLowerCase();
                            const pTitle = String(p.title != null ? p.title : '').trim().toLowerCase();
                            return pId === decodedProdId || pTitle === decodedProdId;
                        });

                        if (found) {
                            if (found.acabados_groups && found.acabados_groups.length > 0) {
                                for (const g of found.acabados_groups) {
                                    if (g && !g.hidden) {
                                        targetCover = g.cover_image || (g.images_list && g.images_list[0]);
                                        if (targetCover) break;
                                    }
                                }
                                if (!targetCover && found.acabados_groups[0]) {
                                    targetCover = found.acabados_groups[0].cover_image || (found.acabados_groups[0].images_list && found.acabados_groups[0].images_list[0]);
                                }
                            }
                            if (!targetCover && found.image) {
                                targetCover = Array.isArray(found.image) ? found.image[0] : found.image;
                            }
                            if (targetCover) break;
                        }
                    }
                }
            }



            if (targetCover && targetCover !== 'img/logo_provisional.png' && aviso.image !== targetCover) {
                aviso.image = targetCover;
                avisosMigrated = true;
            }
        }
    });

    // Depurar avisos huérfanos vinculados a productos/alquileres inexistentes
    const initialAvisosCount = window.sessionAvisos.length;
    window.sessionAvisos = window.sessionAvisos.filter(aviso => {
        if (!aviso) return false;
        let targetUrl = aviso.linkUrl || (aviso.links && aviso.links[0] ? aviso.links[0].url : '');
        let prodParam = null;
        if (targetUrl) {
            const match = targetUrl.match(/(?:prod|product|p|s)=([^&]+)/);
            if (match) prodParam = decodeURIComponent(match[1]).trim().toLowerCase();
        }
        const isAutoNotice = Boolean(prodParam) || /^¡?Nuevo (Ingreso|Alquiler)/i.test(aviso.title || '');
        if (!isAutoNotice) return true; // Mantener avisos informativos generales

        const normATitle = String(aviso.title || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^¡?nuevo\s+(ingreso|alquiler):\s*/i, "").replace(/[^a-z0-9]/g, "");

        // Verificar existencia en productos
        if (window.sessionProducts && Array.isArray(window.sessionProducts)) {
            for (const cat of window.sessionProducts) {
                if (cat.products && Array.isArray(cat.products)) {
                    for (const p of cat.products) {
                        if (!p) continue;
                        const pId = String(p.id != null ? p.id : '').trim().toLowerCase();
                        const pTitle = String(p.title != null ? p.title : '').trim().toLowerCase();
                        const normPTitle = pTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                        if (prodParam && (pId === prodParam || normPTitle === prodParam)) return true;
                        if (normATitle && (normPTitle === normATitle || (normPTitle.length > 5 && normATitle.includes(normPTitle)))) return true;
                    }
                }
            }
        }

        // Verificar existencia en ofertas
        if (window.sessionOffers && Array.isArray(window.sessionOffers)) {
            for (const o of window.sessionOffers) {
                if (!o) continue;
                const oId = String(o.id != null ? o.id : '').trim().toLowerCase();
                const oTitle = String(o.title != null ? o.title : '').trim().toLowerCase();
                const normOTitle = oTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                if (prodParam && (oId === prodParam || normOTitle === prodParam)) return true;
                if (normATitle && (normOTitle === normATitle || (normOTitle.length > 5 && normATitle.includes(normOTitle)))) return true;
            }
        }



        return false; // Es un aviso de producto pero el producto ya no existe: eliminar
    });

    if (avisosMigrated || window.sessionAvisos.length !== initialAvisosCount) {
        try {
            localStorage.setItem('sessionAvisosAutonomo', JSON.stringify(window.sessionAvisos));
        } catch (e) {}
        if (window.syncSiteConfigWithServer) {
            window.syncSiteConfigWithServer();
        }
    }
}

// 4. CONFIGURACIÓN DE ORDEN Y CONTROL DE SECCIONES DEL HOME
window.homeConfig = window.siteConfig.homeConfig || {
    order: ['categorias', 'ofertas', 'novedades', 'buscados'],
    sections: {
        categorias: { title: "Categorías", subtitle: "Nuestras líneas de productos", icon: "table_restaurant" },
        ofertas: { title: "Ofertas Especiales", subtitle: "Promociones y combos por tiempo limitado", icon: "local_offer" },
        novedades: { title: "Nuevos Diseños 2026", subtitle: "Novedades del taller", icon: "auto_awesome" },
        buscados: { title: "Los más buscados", subtitle: "Los preferidos de nuestros clientes", icon: "favorite" }
    }
};

// 4b. Enlaces a Redes Sociales
window.socialLinks = window.siteConfig.socialLinks || {
    instagram: "https://instagram.com",
    tiktok: "https://tiktok.com",
    facebook: "https://facebook.com",
    youtube: "https://youtube.com",
    whatsapp: "https://wa.me/5491167007723",
    mercadolibre: "#"
};

try {
    const localSocial = localStorage.getItem('socialLinks');
    if (localSocial && !window.siteConfig.socialLinks) {
        window.socialLinks = JSON.parse(localSocial);
    }
} catch (e) {
    console.error("Error loading socialLinks fallback:", e);
}

try {
    const localHomeConfig = localStorage.getItem('homeConfig');
    if (localHomeConfig) {
        const parsed = JSON.parse(localHomeConfig);
        // Sincronizar secciones combinando los datos actualizados del servidor/siteConfig
        if (window.siteConfig && window.siteConfig.homeConfig) {
            window.homeConfig = {
                order: parsed.order || window.siteConfig.homeConfig.order,
                sections: Object.assign({}, window.siteConfig.homeConfig.sections, parsed.sections || {})
            };
            // Si en siteConfig una sección está explícitamente oculta (visible === false) y en local no se guardó, respetar siteConfig
            if (window.siteConfig.homeConfig.sections) {
                Object.keys(window.siteConfig.homeConfig.sections).forEach(secKey => {
                    const serverSec = window.siteConfig.homeConfig.sections[secKey];
                    if (serverSec && serverSec.visible === false && parsed.sections && parsed.sections[secKey] && parsed.sections[secKey].visible === undefined) {
                        window.homeConfig.sections[secKey].visible = false;
                    }
                });
            }
        } else {
            window.homeConfig = parsed;
        }
    }
} catch (e) {
    console.error("Error loading homeConfig fallback:", e);
}

// 4c. Rubros de productos (Carpintería, Pinturería, Ferretería, etc.)
window.rubros = window.siteConfig.rubros || [
    { id: "carpinteria", name: "Carpintería" }
];

// 4d. Configuración del Modo Vacaciones
window.vacationConfig = window.siteConfig.vacationConfig || {
    active: false,
    startDate: "",
    endDate: "",
    deliveriesDate: "",
    message: "Estamos de vacaciones, pero seguimos tomando pedidos."
};

// 4e. Configuración de Notificaciones
window.notificationsConfig = window.siteConfig.notificationsConfig || null;

// 5. Motor de Sincronización en Red con Servidor Local (Físico en Disco)
window.syncSiteConfigWithServer = async function() {
    try {
        window.siteConfig = {
            activeTheme: window.activeTheme || 'classic',
            appConfig: window.appConfig,
            contentRegistry: window.contentRegistry,
            homeConfig: window.homeConfig,
            sessionNosotros: window.sessionNosotros,
            sessionAvisos: window.sessionAvisos,
            socialLinks: window.socialLinks,
            mayoristaConfig: window.mayoristaConfig,
            vacationConfig: window.vacationConfig,
            rubros: window.rubros,
            notificationsConfig: window.notificationsConfig
        };

        // Guardar en localStorage como respaldo local
        localStorage.setItem('mayoristaConfig', JSON.stringify(window.mayoristaConfig));

        const res = await fetch('/api/save-site-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.siteConfig)
        });
        const data = await res.json();
        if (!data.success) {
            console.error('[Data Sync] Error guardando config en el servidor:', data.message);
            throw new Error(data.message || 'Error guardando config');
        } else {
            console.log('[Data Sync] Configuración sincronizada y guardada en disco.');
        }
    } catch (e) {
        console.error('[Data Sync] Error en red sincronizando config:', e);
        throw e;
    }
};

window.saveHomeConfig = function(skipServerSync = false) {
    try {
        localStorage.setItem('homeConfig', JSON.stringify(window.homeConfig));
        if (!skipServerSync && window.syncSiteConfigWithServer) window.syncSiteConfigWithServer();
    } catch (e) {
        console.error('Error saving homeConfig:', e);
    }
};

window.saveContentRegistry = function(skipServerSync = false) {
    try {
        localStorage.setItem('contentRegistry', JSON.stringify(window.contentRegistry));
        if (!skipServerSync && window.syncSiteConfigWithServer) window.syncSiteConfigWithServer();
    } catch (e) {
        console.error('Error saving contentRegistry:', e);
    }
};

// --- CACHÉ Y CARGADOR DE PRODUCTOS DESACOPLADOS (Bajo Demanda) ---
window.productDetailCache = window.productDetailCache || new Map();

/**
 * Carga la ficha técnica completa individual de un producto (data/products/p-{id}.json).
 * Si ya está en memoria o en window.sessionProducts, la retorna de inmediato (0ms).
 */
window.fetchProductDetailAsync = async function(productId) {
    if (!productId) return null;
    const cleanId = String(productId).trim();

    // 1. Revisar caché en memoria
    if (window.productDetailCache.has(cleanId)) {
        return window.productDetailCache.get(cleanId);
    }

    // 2. Buscar si ya existe en window.sessionProducts en memoria completa
    if (Array.isArray(window.sessionProducts)) {
        for (const cat of window.sessionProducts) {
            if (cat && Array.isArray(cat.products)) {
                const found = cat.products.find(p => p && String(p.id).trim() === cleanId);
                if (found) {
                    window.productDetailCache.set(cleanId, found);
                    return found;
                }
            }
        }
    }

    // 3. Carga bajo demanda desde data/products/[rubro]/[categoria]/p-{id}.json
    try {
        const isApps = window.location.pathname.includes('/apps/');
        const prefix = isApps ? '../' : '';

        // Si tenemos el índice en memoria o podemos consultar catalog-index.json
        if (!window.catalogIndex) {
            try {
                const idxRes = await fetch(`${prefix}data/catalog-index.json`);
                if (idxRes.ok) window.catalogIndex = await idxRes.json();
            } catch (e) {}
        }

        let targetRelPath = null;
        if (Array.isArray(window.catalogIndex)) {
            const normClean = cleanId.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            const entry = window.catalogIndex.find(item => {
                if (!item) return false;
                const itemId = String(item.id || '').trim();
                const itemShort = String(item.shortId || '').trim();
                if (itemId === cleanId || itemShort === cleanId) return true;
                const itemSlug = (item.title || '').trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, '-').replace(/-+/g, '-').toLowerCase();
                if (itemSlug === cleanId.toLowerCase()) return true;
                const normTitle = (item.title || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                return normClean && normTitle === normClean;
            });
            if (entry && entry.file) {
                targetRelPath = entry.file;
            }
        }

        const candidateUrls = [];
        if (targetRelPath) {
            candidateUrls.push(`${prefix}${targetRelPath}`);
        }
        // Fallback directo a data/products/p-{id}.json
        candidateUrls.push(`${prefix}data/products/p-${cleanId}.json`);

        for (const url of candidateUrls) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const product = await response.json();
                    window.productDetailCache.set(cleanId, product);

                    // Inyectar en window.sessionProducts para mantener compatibilidad
                    if (Array.isArray(window.sessionProducts)) {
                        const catId = product.primaryCatId || (product.categories && product.categories[0]);
                        let targetCat = window.sessionProducts.find(c => c.id === catId);
                        if (targetCat) {
                            if (!Array.isArray(targetCat.products)) targetCat.products = [];
                            const existsIdx = targetCat.products.findIndex(p => p && String(p.id).trim() === cleanId);
                            if (existsIdx >= 0) targetCat.products[existsIdx] = product;
                            else targetCat.products.push(product);
                        }
                    }

                    return product;
                }
            } catch (fetchErr) {}
        }
    } catch (err) {
        console.warn(`[ProductLoader] No se pudo cargar el producto ${cleanId}:`, err);
    }

    return null;
};

// Helper para extraer el nombre base de un producto limpiando sufijos de tamaño y medidas
window.getBaseProductTitle = function(title) {
    if (!title) return '';
    let clean = title.trim();
    // Quitar tamaños entre paréntesis: (80 cm), (60 cm), (100 cm), (30 cm), (50cm), (30 X 40 Cm), etc.
    clean = clean.replace(/\s*\(\s*\d+\s*(?:cm|x|\/|\s*|-)\s*[^)]*\)/gi, '');
    // Quitar sufijos de tamaño: - Mediano, - Chico, - Grande, - 5 Vinos, - 9 Vinos, etc.
    clean = clean.replace(/\s*[-–]\s*(?:Chico|Mediano|Grande|Pequeño|Extra Grande|\d+\s*Vinos|\d+\s*Ambientes)\b/gi, '');
    // Quitar dimensiones como 45x45cm o 50x50cm
    clean = clean.replace(/\s*\b\d+\s*[xX]\s*\d+\s*(?:cm)?\b/gi, '');
    // Quitar espacios extra y guiones huérfanos
    clean = clean.replace(/\s{2,}/g, ' ').replace(/\s*[-–]\s*$/, '').trim();
    return clean;
};

// Asegura que en categorías cada producto aparezca exactamente 1 vez (sin multiplicar por sus acabados/variantes internas)
// Preserva todos los productos independientes del catálogo según su ID único
window.groupCategoryProducts = function(items) {
    if (!Array.isArray(items) || items.length <= 1) return items || [];

    const seenIds = new Set();
    const result = [];

    items.forEach(item => {
        if (!item) return;
        const rawProd = item.product || item;
        const pId = String(rawProd.id || item.id || item.productId || '').trim();
        if (pId && seenIds.has(pId)) return;
        if (pId) seenIds.add(pId);
        result.push(item);
    });

    return result;
};

// Motor centralizado unificado de indexación de productos/acabados
window.getNormalizedCatalogProducts = function(targetRubro = null, options = {}) {
    const expandVariants = options.expandVariants === true;
    const indexed = [];
    
    // Obtener la fuente de verdad de productos (sessionProducts > productsData)
    const sourceProducts = (typeof window.sessionProducts !== 'undefined' && Array.isArray(window.sessionProducts) && window.sessionProducts.length > 0)
        ? window.sessionProducts
        : (typeof productsData !== 'undefined' ? productsData : []);

    const seenProductIds = new Set();

    sourceProducts.forEach(catObj => {
        if (!catObj || catObj.visible === false || (catObj.id && catObj.id.endsWith('-todos'))) return;

        const catRubro = catObj.rubro || 'carpinteria';
        if (targetRubro && catRubro !== targetRubro) return;

        if (catObj.products && Array.isArray(catObj.products)) {
            catObj.products.forEach(product => {
                if (!product || product.visible === false) return;
                if (seenProductIds.has(product.id)) return;

                // Si tiene primaryCatId y no es esta categoría, esperar a que la iteración pase por su categoría principal oficial
                if (product.primaryCatId && product.primaryCatId !== catObj.id) {
                    const primaryCat = sourceProducts.find(c => c.id === product.primaryCatId && c.visible !== false);
                    if (primaryCat) return;
                }

                seenProductIds.add(product.id);

                // Si expandVariants es false (comportamiento estándar de catálogo y categorías):
                // Indexar el producto UNA SOLA VEZ, sin multiplicar tarjetas por cada acabado
                if (!expandVariants) {
                    const allAcabadosNames = (product.acabados_groups || []).map(g => g.acabado_name || '').join(' ');
                    const allMedidas = [];
                    (product.acabados_groups || []).forEach(ag => {
                        (ag.medidas_variants || []).forEach(mv => {
                            if (mv && mv.medida && !allMedidas.includes(mv.medida)) allMedidas.push(mv.medida);
                        });
                    });
                    if (product.medidas_variants) {
                        product.medidas_variants.forEach(mv => {
                            if (mv && mv.medida && !allMedidas.includes(mv.medida)) allMedidas.push(mv.medida);
                        });
                    }

                    let coverImg = product.image;
                    if (Array.isArray(coverImg)) coverImg = coverImg[0];
                    if (!coverImg && product.acabados_groups?.[0]) {
                        coverImg = product.acabados_groups[0].cover_image || product.acabados_groups[0].images_list?.[0];
                    }

                    indexed.push({
                        uniqueId: String(product.id),
                        id: product.id,
                        productId: product.id,
                        product: product,
                        cat: catObj,
                        categoryName: catObj.name,
                        title: product.title,
                        baseTitle: product.title,
                        nombre: product.title,
                        description: product.description || '',
                        acabado: '',
                        selectedAcabado: '',
                        image: coverImg || 'img/logo_provisional.png',
                        acabados_groups: product.acabados_groups || [],
                        all_acabados_groups: product.acabados_groups || [],
                        medidas_variants: product.acabados_groups?.[0]?.medidas_variants || product.medidas_variants || [],
                        optional_variant: product.optional_variant || null,
                        tags: product.tags || [],
                        acabadosSearch: allAcabadosNames,
                        medidas: allMedidas,
                        shippingConfig: product.shippingConfig || null,
                        isFreeShipping: product.isFreeShipping || false,
                        quantityDiscounts: product.quantityDiscounts || null,
                        discountPercent: product.discountPercent || 0,
                        comparePrice: product.comparePrice || null,
                        originalPrice: product.originalPrice || null
                    });
                    return;
                }

                let indexedAnyVariant = false;

                // Indexar cada acabado visible como elemento independiente (solo si expandVariants es explícitamente true)
                if (product.acabados_groups && Array.isArray(product.acabados_groups) && product.acabados_groups.length > 0) {
                    product.acabados_groups.forEach(acabado => {
                        if (acabado && acabado.hidden !== true && acabado.acabado_name) {
                            const acabMedidas = [];
                            if (acabado.medidas_variants) {
                                acabado.medidas_variants.forEach(mv => { 
                                    if (mv.medida) acabMedidas.push(mv.medida); 
                                    if (mv.linkLabel) acabMedidas.push(mv.linkLabel);
                                    if (mv.legend) acabMedidas.push(mv.legend);
                                });
                            }

                            let acabImg = acabado.cover_image || (acabado.images_list && acabado.images_list[0]) || product.image;
                            if (Array.isArray(acabImg)) acabImg = acabImg[0];

                            const isUnico = acabado.acabado_name.toLowerCase() === 'único';
                            const displayTitle = isUnico ? product.title : `${product.title} (${acabado.acabado_name})`;

                            // Recopilar todos los nombres de acabados y leyendas para indexado inteligente
                            const allAcabadosNames = (product.acabados_groups || []).map(g => g.acabado_name || '').join(' ');

                            indexed.push({
                                uniqueId: `${product.id}::${acabado.acabado_name}`,
                                id: product.id,
                                productId: product.id,
                                product: product,
                                cat: catObj,
                                categoryName: catObj.name,
                                title: displayTitle,
                                baseTitle: product.title,
                                nombre: product.title,
                                description: product.description || '',
                                acabado: isUnico ? '' : acabado.acabado_name,
                                selectedAcabado: isUnico ? '' : acabado.acabado_name,
                                image: acabImg || 'img/logo_provisional.png',
                                acabados_groups: [acabado],
                                all_acabados_groups: product.acabados_groups,
                                medidas_variants: acabado.medidas_variants || product.medidas_variants || [],
                                optional_variant: product.optional_variant || null,
                                tags: product.tags || [],
                                acabadosSearch: allAcabadosNames,
                                medidas: acabMedidas,
                                shippingConfig: product.shippingConfig || null,
                                isFreeShipping: product.isFreeShipping || false,
                                quantityDiscounts: product.quantityDiscounts || null,
                                discountPercent: product.discountPercent || 0,
                                comparePrice: product.comparePrice || null,
                                originalPrice: product.originalPrice || null
                            });
                            indexedAnyVariant = true;
                        }
                    });
                }

                // Fallback si no tiene grupos de acabados
                if (!indexedAnyVariant) {
                    const allMedidas = [];
                    if (product.medidas_variants) {
                        product.medidas_variants.forEach(mv => { if (mv.medida) allMedidas.push(mv.medida); });
                    }
                    let coverImg = product.image;
                    if (Array.isArray(coverImg)) coverImg = coverImg[0];

                    indexed.push({
                        uniqueId: product.id,
                        id: product.id,
                        productId: product.id,
                        product: product,
                        cat: catObj,
                        categoryName: catObj.name,
                        title: product.title,
                        baseTitle: product.title,
                        nombre: product.title,
                        description: product.description || '',
                        acabado: '',
                        selectedAcabado: '',
                        image: coverImg || 'img/logo_provisional.png',
                        acabados_groups: product.acabados_groups || [],
                        medidas_variants: product.medidas_variants || [],
                        optional_variant: product.optional_variant || null,
                        tags: product.tags || [],
                        acabadosSearch: '',
                        medidas: allMedidas,
                        shippingConfig: product.shippingConfig || null,
                        isFreeShipping: product.isFreeShipping || false,
                        quantityDiscounts: product.quantityDiscounts || null,
                        discountPercent: product.discountPercent || 0,
                        comparePrice: product.comparePrice || null,
                        originalPrice: product.originalPrice || null
                    });
                }
            });
        }
    });

    return indexed;
};

window.syncHomeOrder = function() {
    if (!window.homeConfig) return;
    if (!window.homeConfig.order) window.homeConfig.order = ['categorias', 'ofertas', 'novedades', 'buscados'];
    
    const homeStack = (typeof contentRegistry !== 'undefined' && contentRegistry.home) ? contentRegistry.home : [];
    const activeCompIds = homeStack.map(c => c.id);
    
    // 1. Filtrar IDs inexistentes (manteniendo solo fijos o components existentes)
    window.homeConfig.order = window.homeConfig.order.filter(id => 
        ['categorias', 'ofertas', 'novedades', 'buscados'].includes(id) || activeCompIds.includes(id)
    );
    
    // 2. Añadir nuevos components al final si no figuran en el orden
    activeCompIds.forEach(id => {
        if (!window.homeConfig.order.includes(id)) {
            window.homeConfig.order.push(id);
        }
    });
    
    window.saveHomeConfig(true); // Skip server sync on startup/auto-alignment!
};

// Sincronizar inmediatamente al cargar el módulo
setTimeout(() => {
    if (window.syncHomeOrder) window.syncHomeOrder();
}, 0);

function updateHeader(viewId, context = null) {
    if (!dynamicTitle || !dynamicSubtitle || !btnBack) return;

    // Mostrar u ocultar botón de retroceso y reemplazar el título
    if (navigationHistory.length > 0) {
        btnBack.style.display = 'flex';
        dynamicTitle.style.display = 'none';
    } else {
        btnBack.style.display = 'none';
        dynamicTitle.style.display = '';
    }

    // Mostrar u ocultar botón de compartir categoría
    if (window.btnShareHeader) {
        if (viewId === 'view-category-feed') {
            window.btnShareHeader.style.display = 'flex';
        } else {
            window.btnShareHeader.style.display = 'none';
        }
    }
}

// User Theme Selector Logic
window.initThemeSelector = function() {
    const themeSelect = document.getElementById('user-theme-select');
    const resetBtn = document.getElementById('btn-reset-user-theme');
    
    if (themeSelect) {
        themeSelect.value = window.activeTheme;
        themeSelect.addEventListener('change', (e) => {
            const theme = e.target.value;
            localStorage.setItem('userSelectedTheme', theme);
            window.userSelectedTheme = theme;
            window.activeTheme = theme;
            window.applyTheme(theme);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            localStorage.removeItem('userSelectedTheme');
            window.userSelectedTheme = null;
            const defaultTheme = window.siteConfig.activeTheme || localStorage.getItem('activeTheme') || 'classic';
            window.activeTheme = defaultTheme;
            window.applyTheme(defaultTheme);
            if (themeSelect) themeSelect.value = defaultTheme;
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.initThemeSelector();
});

// --- UNIFIED LOCAL USER DATA MANAGER (UserDataManager) ---
(function() {
    window.UserDataManager = {
        get: function() {
            let data = { 
                avatar: '👤', 
                name: '', 
                phone: '', 
                email: '', 
                zipCode: '', 
                address: '', 
                locality: '', 
                province: '', 
                deliveryNotes: '', 
                razonSocial: '', 
                cuit: '', 
                dirFiscal: '', 
                provinciaFiscal: '', 
                condIva: '', 
                emailFiscal: '',
                addresses: [] 
            };
            
            // 1. Base primaria en userData
            try {
                const raw = localStorage.getItem('userData');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    Object.assign(data, parsed);
                    if (Array.isArray(parsed.addresses)) {
                        data.addresses = parsed.addresses;
                    }
                }
            } catch(e) {}

            // 2. Respaldo en checkout data
            try {
                const rawChk = localStorage.getItem('latarima_checkout_user_data');
                if (rawChk) {
                    const parsed = JSON.parse(rawChk);
                    if (parsed.name && !data.name) data.name = parsed.name;
                    if (parsed.phone && !data.phone) data.phone = parsed.phone;
                    if ((parsed.cp || parsed.zipCode) && !data.zipCode) data.zipCode = parsed.cp || parsed.zipCode;
                    if (parsed.direccion && !data.address) data.address = parsed.direccion;
                }
            } catch(e) {}

            // 3. Respaldo en user_offers_cp
            try {
                const offersCp = localStorage.getItem('user_offers_cp');
                if (offersCp && !data.zipCode) data.zipCode = offersCp;
            } catch(e) {}

            // 4. Si tiene dirección base pero no lista de direcciones, migrar como primera dirección
            if (!Array.isArray(data.addresses) || data.addresses.length === 0) {
                if ((data.address && data.address.trim()) || (data.zipCode && data.zipCode.trim())) {
                    data.addresses = [{
                        id: 'addr_default_init',
                        alias: 'Principal',
                        street: (data.address || '').trim(),
                        depto: '',
                        cp: (data.zipCode || '').trim(),
                        city: (data.locality || '').trim(),
                        province: (data.province || '').trim(),
                        notes: (data.deliveryNotes || '').trim(),
                        isDefault: true
                    }];
                } else {
                    data.addresses = [];
                }
            }

            return data;
        },

        save: function(newData) {
            if (!newData || typeof newData !== 'object') return;
            const current = this.get();
            const updated = Object.assign({}, current, newData);

            // Asegurar integridad de addresses (máximo 5)
            if (Array.isArray(updated.addresses)) {
                if (updated.addresses.length > 5) {
                    updated.addresses = updated.addresses.slice(0, 5);
                }
                // Si hay direcciones y ninguna está marcada como default, marcar la primera
                if (updated.addresses.length > 0 && !updated.addresses.some(a => a.isDefault)) {
                    updated.addresses[0].isDefault = true;
                }
            }

            try {
                localStorage.setItem('userData', JSON.stringify(updated));
                if (updated.zipCode) {
                    localStorage.setItem('user_offers_cp', updated.zipCode);
                }
                
                // Disparar evento global para sincronizar interfaz en tiempo real
                window.dispatchEvent(new CustomEvent('latarima:cp-updated', { 
                    detail: {
                        zipCode: updated.zipCode,
                        locality: updated.locality || '',
                        province: updated.province || '',
                        userData: updated
                    } 
                }));
            } catch(e) {
                console.error('[UserDataManager] Error guardando datos locales:', e);
            }

            return updated;
        },

        // Devuelve la lista completa de direcciones (hasta 5)
        getAddresses: function() {
            const d = this.get();
            return Array.isArray(d.addresses) ? d.addresses : [];
        },

        // Devuelve la dirección de entrega prioritaria / predeterminada
        getDefaultAddress: function() {
            const addrs = this.getAddresses();
            if (!addrs || addrs.length === 0) return null;
            return addrs.find(a => a.isDefault) || addrs[0] || null;
        },

        // PRIORIDAD ABSOLUTA: El CP de la dirección de entrega activa manda sobre todo
        getZipCode: function() {
            const def = this.getDefaultAddress();
            if (def && (def.cp || '').trim()) {
                return (def.cp || '').trim();
            }
            return (this.get().zipCode || '').trim();
        },

        // Guarda o actualiza una dirección (Máx 5 direcciones)
        saveAddress: function(addrData) {
            if (!addrData || typeof addrData !== 'object') {
                return { success: false, message: 'Datos de dirección inválidos' };
            }
            const current = this.get();
            let addrs = Array.isArray(current.addresses) ? [...current.addresses] : [];

            const isEdit = Boolean(addrData.id && addrs.some(a => String(a.id) === String(addrData.id)));
            if (!isEdit && addrs.length >= 5) {
                return { 
                    success: false, 
                    message: 'Límite máximo de 5 direcciones alcanzado. Editá o eliminá una para agregar otra.' 
                };
            }

            const cleanId = addrData.id || ('addr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
            const shouldBeDefault = Boolean(addrData.isDefault || addrs.length === 0 || !addrs.some(a => a.isDefault));

            const newEntry = {
                id: cleanId,
                alias: (addrData.alias || 'Mi Dirección').trim(),
                street: (addrData.street || '').trim(),
                depto: (addrData.depto || '').trim(),
                cp: (addrData.cp || '').trim(),
                city: (addrData.city || addrData.locality || '').trim(),
                province: (addrData.province || '').trim(),
                notes: (addrData.notes || addrData.deliveryNotes || '').trim(),
                isDefault: shouldBeDefault
            };

            if (shouldBeDefault) {
                addrs.forEach(a => { if (String(a.id) !== String(cleanId)) a.isDefault = false; });
            }

            if (isEdit) {
                const idx = addrs.findIndex(a => String(a.id) === String(cleanId));
                addrs[idx] = newEntry;
            } else {
                addrs.push(newEntry);
            }

            // Sincronizar campos prioritarios en userData si esta dirección es la predeterminada
            const updatePayload = { addresses: addrs };
            if (newEntry.isDefault) {
                updatePayload.address = newEntry.street + (newEntry.depto ? ' ' + newEntry.depto : '');
                updatePayload.zipCode = newEntry.cp;
                updatePayload.locality = newEntry.city;
                updatePayload.province = newEntry.province;
                updatePayload.deliveryNotes = newEntry.notes;
            }

            const saved = this.save(updatePayload);
            if (window.AdminAuth && typeof window.AdminAuth.saveClientProfileToCloud === 'function') {
                window.AdminAuth.saveClientProfileToCloud(saved);
            }

            return { success: true, address: newEntry };
        },

        // Elimina una dirección por ID
        deleteAddress: function(id) {
            const current = this.get();
            let addrs = Array.isArray(current.addresses) ? [...current.addresses] : [];
            const target = addrs.find(a => String(a.id) === String(id));
            if (!target) return false;

            const wasDefault = Boolean(target.isDefault);
            addrs = addrs.filter(a => String(a.id) !== String(id));

            if (wasDefault && addrs.length > 0) {
                addrs[0].isDefault = true;
            }

            const updatePayload = { addresses: addrs };
            if (addrs.length > 0 && wasDefault) {
                const def = addrs[0];
                updatePayload.address = def.street + (def.depto ? ' ' + def.depto : '');
                updatePayload.zipCode = def.cp;
                updatePayload.locality = def.city;
                updatePayload.province = def.province;
                updatePayload.deliveryNotes = def.notes;
            } else if (addrs.length === 0) {
                updatePayload.address = '';
                updatePayload.deliveryNotes = '';
            }

            const saved = this.save(updatePayload);
            if (window.AdminAuth && typeof window.AdminAuth.saveClientProfileToCloud === 'function') {
                window.AdminAuth.saveClientProfileToCloud(saved);
            }
            return true;
        },

        // Establece una dirección existente como la prioritaria / predeterminada
        setDefaultAddress: function(id) {
            const current = this.get();
            let addrs = Array.isArray(current.addresses) ? [...current.addresses] : [];
            const target = addrs.find(a => String(a.id) === String(id));
            if (!target) return false;

            addrs.forEach(a => {
                a.isDefault = (String(a.id) === String(id));
            });

            const updatePayload = {
                addresses: addrs,
                address: target.street + (target.depto ? ' ' + target.depto : ''),
                zipCode: target.cp,
                locality: target.city,
                province: target.province,
                deliveryNotes: target.notes
            };

            const saved = this.save(updatePayload);
            if (window.AdminAuth && typeof window.AdminAuth.saveClientProfileToCloud === 'function') {
                window.AdminAuth.saveClientProfileToCloud(saved);
            }
            return true;
        },

        hasCompleteProfile: function() {
            const d = this.get();
            return !!(
                (d.name || '').trim() &&
                (d.phone || '').trim() &&
                (d.email || '').trim() &&
                (d.address || '').trim() &&
                (d.zipCode || '').trim() &&
                (d.locality || '').trim() &&
                (d.province || '').trim()
            );
        },

        clear: function() {
            try {
                localStorage.removeItem('userData');
                localStorage.removeItem('user_offers_cp');
                localStorage.removeItem('latarima_checkout_user_data');
                window.dispatchEvent(new CustomEvent('latarima:cp-updated', { 
                    detail: { zipCode: '', userData: this.get() } 
                }));
            } catch(e) {
                console.error('[UserDataManager] Error limpiando datos locales:', e);
            }
            return this.get();
        }
    };
})();

// --- GLOBAL LOCAL ORDERS HELPERS (disponibles sin depender de my-orders.js) ---
(function() {
    const LOCAL_ORDERS_KEY = 'latarima_my_orders';

    window.getMyLocalOrders = function() {
        try {
            const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
            if (!raw) return [];
            const list = JSON.parse(raw);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    };

    window.saveMyLocalOrder = function(order) {
        if (!order || !order.id) return;
        try {
            const list = window.getMyLocalOrders();
            const idx = list.findIndex(o => String(o.id) === String(order.id));
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...order };
            } else {
                list.unshift(order);
            }
            localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list.slice(0, 50)));
        } catch (e) {
            console.warn('[MyOrders] Error guardando pedido local:', e);
        }
    };
})();