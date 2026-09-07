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
window.sessionProducts = typeof productsData !== 'undefined' && Array.isArray(productsData) && productsData.length > 0
    ? [...productsData]
    : (localStorage.getItem('sessionProducts') ? JSON.parse(localStorage.getItem('sessionProducts')) : []);

// Estado global de Alquileres
window.sessionRentals = typeof rentalsData !== 'undefined' && Array.isArray(rentalsData) && rentalsData.length > 0
    ? [...rentalsData]
    : (localStorage.getItem('sessionRentals') ? JSON.parse(localStorage.getItem('sessionRentals')) : []);

// Estado global de Ofertas (Priorizar base de datos del servidor js/offers-data.js)
window.sessionOffers = typeof offersData !== 'undefined' && Array.isArray(offersData) && offersData.length > 0
    ? [...offersData]
    : (localStorage.getItem('sessionOffers') ? JSON.parse(localStorage.getItem('sessionOffers')) : []);

// Limpieza de claves obsoletas de respaldo
try {
    localStorage.removeItem('sessionOffersAutonomo');
    localStorage.removeItem('sessionProductsAutonomo');
    localStorage.removeItem('sessionRentalsAutonomo');
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
            order: ['categorias', 'novedades', 'buscados'],
            sections: {
                categorias: { title: "Categorías", subtitle: "Nuestras líneas de productos", icon: "table_restaurant" },
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

window.sessionNosotros = window.siteConfig.sessionNosotros && window.siteConfig.sessionNosotros.length 
    ? window.siteConfig.sessionNosotros 
    : [...window.defaultNosotros];

try {
    const localNosotros = localStorage.getItem('sessionNosotros');
    if (localNosotros && (!window.siteConfig.sessionNosotros || !window.siteConfig.sessionNosotros.length)) {
        window.sessionNosotros = JSON.parse(localNosotros);
    }
} catch(e) {
    console.error("Error loading sessionNosotros fallback:", e);
}

window.sessionAvisos = window.siteConfig.sessionAvisos && window.siteConfig.sessionAvisos.length 
    ? window.siteConfig.sessionAvisos 
    : [];

try {
    const localAvisos = localStorage.getItem('sessionAvisosAutonomo'); // Legacy fallback
    if (localAvisos && (!window.siteConfig.sessionAvisos || !window.siteConfig.sessionAvisos.length)) {
        window.sessionAvisos = JSON.parse(localAvisos);
    }
} catch(e) {
    console.error("Error loading sessionAvisos fallback:", e);
}

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
                            const pId = (p.id || '').trim().toLowerCase();
                            const pTitle = (p.title || '').trim().toLowerCase();
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

            if (!targetCover && window.sessionRentals && Array.isArray(window.sessionRentals)) {
                const found = window.sessionRentals.find(r => {
                    if (!r) return false;
                    const rId = (r.id || '').trim().toLowerCase();
                    const rTitle = (r.title || '').trim().toLowerCase();
                    return rId === decodedProdId || rTitle === decodedProdId;
                });
                if (found) {
                    if (found.acabados_groups && found.acabados_groups.length > 0) {
                        targetCover = found.acabados_groups[0].cover_image || (found.acabados_groups[0].images_list && found.acabados_groups[0].images_list[0]);
                    }
                    if (!targetCover && found.image) {
                        targetCover = Array.isArray(found.image) ? found.image[0] : found.image;
                    }
                }
            }

            if (targetCover && targetCover !== 'img/logo_provisional.png' && aviso.image !== targetCover) {
                aviso.image = targetCover;
                avisosMigrated = true;
            }
        }
    });

    if (avisosMigrated) {
        localStorage.setItem('sessionAvisosAutonomo', JSON.stringify(window.sessionAvisos));
    }
}

// 4. CONFIGURACIÓN DE ORDEN Y CONTROL DE SECCIONES DEL HOME
window.homeConfig = window.siteConfig.homeConfig || {
    order: ['categorias', 'novedades', 'buscados'],
    sections: {
        categorias: { title: "Categorías", subtitle: "Nuestras líneas de productos", icon: "table_restaurant" },
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
    if (localHomeConfig && (!window.siteConfig.homeConfig || !window.siteConfig.homeConfig.order)) {
        window.homeConfig = JSON.parse(localHomeConfig);
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
            rubros: window.rubros
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

// Motor centralizado unificado de indexación de productos/acabados
window.getNormalizedCatalogProducts = function(targetRubro = null) {
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

                let indexedAnyVariant = false;

                // Indexar cada acabado visible como elemento independiente
                if (product.acabados_groups && Array.isArray(product.acabados_groups) && product.acabados_groups.length > 0) {
                    product.acabados_groups.forEach(acabado => {
                        if (acabado && acabado.hidden !== true && acabado.acabado_name) {
                            const acabMedidas = [];
                            if (acabado.medidas_variants) {
                                acabado.medidas_variants.forEach(mv => { if (mv.medida) acabMedidas.push(mv.medida); });
                            }

                            let acabImg = acabado.cover_image || (acabado.images_list && acabado.images_list[0]) || product.image;
                            if (Array.isArray(acabImg)) acabImg = acabImg[0];

                            const isUnico = acabado.acabado_name.toLowerCase() === 'único';
                            const displayTitle = isUnico ? product.title : `${product.title} (${acabado.acabado_name})`;

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
                                acabadosSearch: (product.acabados_groups || []).map(g => g.acabado_name).join(' '),
                                medidas: acabMedidas
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
                        medidas: allMedidas
                    });
                }
            });
        }
    });

    return indexed;
};

window.syncHomeOrder = function() {
    if (!window.homeConfig) return;
    if (!window.homeConfig.order) window.homeConfig.order = ['categorias', 'novedades', 'buscados'];
    
    const homeStack = (typeof contentRegistry !== 'undefined' && contentRegistry.home) ? contentRegistry.home : [];
    const activeCompIds = homeStack.map(c => c.id);
    
    // 1. Filtrar IDs inexistentes (manteniendo solo fijos o components existentes)
    window.homeConfig.order = window.homeConfig.order.filter(id => 
        ['categorias', 'novedades', 'buscados'].includes(id) || activeCompIds.includes(id)
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