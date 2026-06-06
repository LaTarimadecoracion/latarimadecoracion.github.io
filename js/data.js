// js/data.js
// --- DATA MODULE ---
// Navegación inteligente - Historial de vistas
window.navigationHistory = [];

// Estado global de Productos
window.sessionProducts = typeof productsData !== 'undefined' ? [...productsData] : [];

// Garantizar que existan las estructuras de siteConfig del servidor
if (!window.siteConfig) {
    window.siteConfig = {
        appConfig: {
            home: { title: "La Tarima", subtitle: "Diseño en madera", icon: "home", visible: true, contentStack: [] },
            search: { title: "Explorar", subtitle: "Encontrá lo que buscás", icon: "search", visible: true, contentStack: [] },
            profile: { title: "Tu Perfil", subtitle: "Gestioná tus datos", icon: "person", visible: true },
            avisos: { title: "Avisos", subtitle: "Novedades del taller", icon: "notifications", visible: true, contentStack: [] },
            nosotros: { title: "Pasión por la madera", subtitle: "Conocé quiénes somos", icon: "info", visible: true }
        },
        contentRegistry: { home: [], search: [], avisos: [] },
        homeConfig: {
            order: ['categorias', 'novedades', 'buscados'],
            sections: {
                categorias: { title: "Categorías", subtitle: "Nuestras líneas de productos", icon: "table_restaurant" },
                novedades: { title: "Nuevos Diseños 2026", subtitle: "Novedades del taller", icon: "auto_awesome" },
                buscados: { title: "Los más buscados", subtitle: "Los preferidos de nuestros clientes", icon: "favorite" }
            }
        },
        sessionNosotros: [],
        sessionAvisos: []
    };
}

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
        if (window.appConfig.home && !window.appConfig.home.contentStack) window.appConfig.home.contentStack = [];
        if (window.appConfig.search && !window.appConfig.search.contentStack) window.appConfig.search.contentStack = [];
        if (window.appConfig.avisos && !window.appConfig.avisos.contentStack) window.appConfig.avisos.contentStack = [];
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
        if (!window.contentRegistry.home.length) window.contentRegistry.home = parsed.home || [];
        if (!window.contentRegistry.search.length) window.contentRegistry.search = parsed.search || [];
        if (!window.contentRegistry.avisos.length) window.contentRegistry.avisos = parsed.avisos || [];
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

// 4. CONFIGURACIÓN DE ORDEN Y CONTROL DE SECCIONES DEL HOME
window.homeConfig = window.siteConfig.homeConfig || {
    order: ['categorias', 'novedades', 'buscados'],
    sections: {
        categorias: { title: "Categorías", subtitle: "Nuestras líneas de productos", icon: "table_restaurant" },
        novedades: { title: "Nuevos Diseños 2026", subtitle: "Novedades del taller", icon: "auto_awesome" },
        buscados: { title: "Los más buscados", subtitle: "Los preferidos de nuestros clientes", icon: "favorite" }
    }
};

try {
    const localHomeConfig = localStorage.getItem('homeConfig');
    if (localHomeConfig && (!window.siteConfig.homeConfig || !window.siteConfig.homeConfig.order)) {
        window.homeConfig = JSON.parse(localHomeConfig);
    }
} catch (e) {
    console.error("Error loading homeConfig fallback:", e);
}

// 5. Motor de Sincronización en Red con Servidor Local (Físico en Disco)
window.syncSiteConfigWithServer = async function() {
    try {
        window.siteConfig = {
            appConfig: window.appConfig,
            contentRegistry: window.contentRegistry,
            homeConfig: window.homeConfig,
            sessionNosotros: window.sessionNosotros,
            sessionAvisos: (window.AvisosModule && window.AvisosModule.getAvisos) 
                ? window.AvisosModule.getAvisos() 
                : (window.siteConfig.sessionAvisos || [])
        };

        const res = await fetch('/api/save-site-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.siteConfig)
        });
        const data = await res.json();
        if (!data.success) {
            console.error('[Data Sync] Error guardando config en el servidor:', data.message);
        } else {
            console.log('[Data Sync] Configuración sincronizada y guardada en disco.');
        }
    } catch (e) {
        console.error('[Data Sync] Error en red sincronizando config:', e);
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

    // Mostrar u ocultar botón de retroceso
    if (navigationHistory.length > 0) {
        btnBack.style.display = 'flex';
    } else {
        btnBack.style.display = 'none';
    }

    if (viewId === 'view-home') {
        dynamicTitle.textContent = appConfig.home.title;
        dynamicSubtitle.textContent = appConfig.home.subtitle;
    } else if (viewId === 'view-product-detail') {
        dynamicTitle.textContent = context?.title || 'Detalle del Producto';
        dynamicSubtitle.textContent = context?.category || appConfig.home.title;
    } else if (viewId === 'view-category-feed') {
        dynamicTitle.textContent = context?.name || 'Categoría';
        dynamicSubtitle.textContent = 'Diseño en madera';
    } else if (viewId === 'view-search') {
        dynamicTitle.textContent = appConfig.search.title;
        dynamicSubtitle.textContent = appConfig.search.subtitle;
    } else if (viewId === 'view-profile') {
        dynamicTitle.textContent = appConfig.profile.title;
        dynamicSubtitle.textContent = appConfig.profile.subtitle;
    } else if (viewId === 'view-notifications') {
        dynamicTitle.textContent = appConfig.avisos.title;
        dynamicSubtitle.textContent = appConfig.avisos.subtitle;
    } else if (viewId === 'view-about') {
        dynamicTitle.textContent = appConfig.nosotros.title;
        dynamicSubtitle.textContent = appConfig.nosotros.subtitle;
    } else if (viewId === 'view-admin') {
        dynamicTitle.textContent = 'Panel de Administración';
        dynamicSubtitle.textContent = 'Gestión de catálogo';
    }
}