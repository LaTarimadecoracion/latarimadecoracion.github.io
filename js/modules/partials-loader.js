// =============================================================================
// partials-loader.js — Cargador modular bajo demanda (HTML Partials, CSS y JS)
// =============================================================================

const _loadedScripts = new Map();
const _loadedStyles = new Set();

function loadStyleOnDemand(href) {
    if (_loadedStyles.has(href) || document.querySelector(`link[href="${href}"]`)) {
        _loadedStyles.add(href);
        return Promise.resolve();
    }
    _loadedStyles.add(href);
    return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.appendChild(link);
    });
}

function loadScriptOnDemand(src) {
    const cleanKey = src.split('?')[0];
    if (_loadedScripts.has(cleanKey)) {
        return _loadedScripts.get(cleanKey);
    }
    const existing = document.querySelector(`script[src^="${cleanKey}"]`);
    if (existing) {
        const p = Promise.resolve();
        _loadedScripts.set(cleanKey, p);
        return p;
    }
    const promise = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = (err) => {
            console.warn('[Modular Loader] No se pudo cargar script:', src, err);
            resolve();
        };
        document.body.appendChild(s);
    });
    _loadedScripts.set(cleanKey, promise);
    return promise;
}

async function loadScriptsSequential(srcList) {
    for (const src of srcList) {
        await loadScriptOnDemand(src);
    }
}

async function loadPartial(url, targetSelector, position = 'beforeend') {
    try {
        const finalUrl = url.includes('?') ? url : `${url}?v=19`;
        const response = await fetch(finalUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status} cargando ${url}`);
        const html = await response.text();
        const target = document.querySelector(targetSelector);
        if (target) {
            if (position === 'innerHTML') {
                target.innerHTML = html;
            } else {
                target.insertAdjacentHTML(position, html);
            }
        }
    } catch (err) {
        console.error('Error cargando partial:', err);
    }
}

// --- MÓDULOS DE CLIENTE BAJO DEMANDA ---

let _aboutPartialPromise = null;
window.loadAboutPartialOnDemand = function() {
    if (_aboutPartialPromise) return _aboutPartialPromise;
    const aboutEl = document.getElementById('view-about');
    if (aboutEl && aboutEl.children.length > 0) {
        return Promise.resolve();
    }
    _aboutPartialPromise = loadPartial('partials/view-about.html', '#view-about', 'innerHTML').then(() => {
        if (typeof window.renderNosotrosBlocksCliente === 'function') {
            window.renderNosotrosBlocksCliente();
        }
        if (typeof window.renderGlobalSocialLinks === 'function') {
            window.renderGlobalSocialLinks();
        }
    });
    return _aboutPartialPromise;
};

let _videosModulePromise = null;
window.ensureVideosModuleLoaded = function() {
    if (typeof window.renderVideosView === 'function') return Promise.resolve();
    if (_videosModulePromise) return _videosModulePromise;
    _videosModulePromise = loadScriptOnDemand('js/modules/videos.js?v=2');
    return _videosModulePromise;
};

let _postalModulePromise = null;
window.ensurePostalLookupLoaded = function() {
    if (typeof window.lookupPostalCode === 'function') return Promise.resolve();
    if (_postalModulePromise) return _postalModulePromise;
    _postalModulePromise = loadScriptOnDemand('js/modules/postal-lookup.js?v=1');
    return _postalModulePromise;
};

let _cortesModulePromise = null;
window.ensureCortesModulesLoaded = function() {
    if (typeof window.initCortesWidget === 'function' && window.cortesConfig) return Promise.resolve();
    if (_cortesModulePromise) return _cortesModulePromise;
    _cortesModulePromise = loadScriptsSequential([
        'js/data/cortes-config.js?v=1',
        'js/modules/cortes-widget.js?v=1'
    ]);
    return _cortesModulePromise;
};

let _cajonesModulePromise = null;
window.ensureCajonesModulesLoaded = function() {
    if (typeof window.initCajonesWidget === 'function' && window.cajonesConfig) return Promise.resolve();
    if (_cajonesModulePromise) return _cajonesModulePromise;
    _cajonesModulePromise = loadScriptsSequential([
        'js/data/cajones-config.js?v=2',
        'js/modules/cajones/cajones-calc.js?v=2',
        'js/modules/cajones/cajones-ui.js?v=3',
        'js/modules/cajones-widget.js?v=5'
    ]);
    return _cajonesModulePromise;
};

let _assistantModulePromise = null;
window.ensureAssistantLoaded = function() {
    if (_assistantModulePromise) return _assistantModulePromise;
    _assistantModulePromise = Promise.all([
        loadStyleOnDemand('css/assistant.css?v=2'),
        loadScriptOnDemand('js/apps/assistant.js?v=7')
    ]);
    return _assistantModulePromise;
};

let _userProfileModalPromise = null;
window.ensureUserProfileModalLoaded = function() {
    if (typeof window.openUserProfileModal === 'function' && !window.openUserProfileModal._isStub) {
        return Promise.resolve();
    }
    if (_userProfileModalPromise) return _userProfileModalPromise;
    _userProfileModalPromise = loadScriptOnDemand('js/ui/user-profile-modal.js?v=2');
    return _userProfileModalPromise;
};

let _checkoutModalPromise = null;
window.ensureCheckoutModalLoaded = function() {
    if (typeof window.showOfferPaymentModal === 'function' && !window.showOfferPaymentModal._isStub) {
        return Promise.resolve();
    }
    if (_checkoutModalPromise) return _checkoutModalPromise;
    _checkoutModalPromise = (async () => {
        if (typeof window.ensurePostalLookupLoaded === 'function') {
            await window.ensurePostalLookupLoaded();
        }
        await loadScriptOnDemand('js/ui/checkout-modal.js?v=2');
    })();
    return _checkoutModalPromise;
};

let _myOrdersModulePromise = null;
window.ensureMyOrdersLoaded = function() {
    if (window.MyOrders) return Promise.resolve();
    if (_myOrdersModulePromise) return _myOrdersModulePromise;
    _myOrdersModulePromise = (async () => {
        if (typeof window.ensurePostalLookupLoaded === 'function') {
            await window.ensurePostalLookupLoaded();
        }
        await loadScriptOnDemand('js/ui/my-orders.js?v=3');
    })();
    return _myOrdersModulePromise;
};

let _trackingModulePromise = null;
window.ensureTrackingLoaded = function() {
    if (typeof window.openTrackingSheet === 'function' && typeof window.handleNativeTrackingSearch === 'function') {
        return Promise.resolve();
    }
    if (_trackingModulePromise) return _trackingModulePromise;
    _trackingModulePromise = (async () => {
        await Promise.all([
            loadScriptOnDemand('js/data/orders-config.js?v=26'),
            loadScriptOnDemand('js/data/orders-data.js?v=26')
        ]);
        await loadScriptOnDemand('js/modules/tracking-sheet.js?v=2');
    })();
    return _trackingModulePromise;
};

let _catalogModulePromise = null;
window.ensureCatalogModuleLoaded = function() {
    if (window.CatalogNative) return Promise.resolve();
    if (_catalogModulePromise) return _catalogModulePromise;
    _catalogModulePromise = Promise.all([
        loadStyleOnDemand('css/catalogo.css?v=12'),
        loadScriptOnDemand('js/modules/catalog-view.js?v=2')
    ]);
    return _catalogModulePromise;
};

// --- PANEL DE ADMINISTRACIÓN 100% BAJO DEMANDA ---

window.adminPartialsLoaded = false;
let _adminLoadPromise = null;

window.loadAdminPartialsOnDemand = function() {
    if (_adminLoadPromise) return _adminLoadPromise;
    window.adminPartialsLoaded = true;

    _adminLoadPromise = (async () => {
        // 1. Estilos del Admin y CropperJS
        loadStyleOnDemand('css/admin-styles.css?v=7');
        loadStyleOnDemand('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css');

        // 2. Librerías externas CDN del Admin (en paralelo, sin bloquear)
        const cdnPromises = [
            loadScriptOnDemand('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.min.js'),
            loadScriptOnDemand('https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'),
            loadScriptOnDemand('https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'),
            loadScriptOnDemand('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js')
        ];

        // 3. Asegurar dependencias de configuraciones de envíos/cortes/cajones
        await Promise.all([
            window.ensurePostalLookupLoaded(),
            window.ensureCortesModulesLoaded(),
            window.ensureCajonesModulesLoaded()
        ]);

        // 4. Cargar estructura HTML base del Admin
        await loadPartial('partials/view-admin.html', '#view-admin', 'innerHTML');
        
        const adminViews = [
            'partials/admin/view-offers.html',
            'partials/admin/view-shipping.html',
            'partials/admin/view-cortes.html',
            'partials/admin/view-cajones.html',
            'partials/admin/view-payments.html',
            'partials/admin/view-bulk-edit.html',
            'partials/admin/view-catalog.html',
            'partials/admin/view-ml-importer.html',
            'partials/admin/view-tnube.html',
            'partials/admin/view-pages.html',
            'partials/admin/view-settings.html',
            'partials/admin/view-orders.html',
            'partials/admin/view-quotes.html',
            'partials/admin/view-users.html',
            'partials/admin/modal-label-print.html'
        ];

        await Promise.all([
            ...adminViews.map(url => loadPartial(url, '#admin-main-container', 'beforeend')),
            loadPartial('partials/admin/modal-offer.html', '#view-admin'),
            loadPartial('partials/admin/modals-forms.html', 'body')
        ]);

        const cortesPanels = [
            'partials/admin/cortes/panel-materiales.html',
            'partials/admin/cortes/panel-usos.html',
            'partials/admin/cortes/panel-logistica.html',
            'partials/admin/cortes/panel-descuentos.html',
            'partials/admin/cortes/panel-simulador.html'
        ];
        const cajonesPanels = [
            'partials/admin/cajones/panel-materiales.html',
            'partials/admin/cajones/panel-usos.html',
            'partials/admin/cajones/panel-logistica.html',
            'partials/admin/cajones/panel-descuentos.html',
            'partials/admin/cajones/panel-simulador.html'
        ];
        await Promise.all([
            ...cortesPanels.map(url => loadPartial(url, '#cortes-subpanels-container', 'beforeend')),
            ...cajonesPanels.map(url => loadPartial(url, '#cajones-subpanels-container', 'beforeend'))
        ]);

        // 5. Cargar los 23 módulos JS de Administración en orden exacto
        const adminScripts = [
            'js/admin/admin-utils.js?v=1',
            'js/admin/admin-settings.js?v=1',
            'js/admin/admin-core.js?v=3',
            'js/admin/admin-categories.js?v=1',
            'js/admin/admin-categories-form.js?v=1',
            'js/admin/admin-products.js?v=6',
            'js/admin/admin-products-form.js?v=6',
            'js/admin/importer/admin-ml-importer.js?v=2',
            'js/admin/admin-tnube.js?v=1',
            'js/admin/admin-bulk-edit.js?v=1',
            'js/admin/admin-rentals.js?v=1',
            'js/admin/admin-offers.js?v=1',
            'js/admin/admin-shipping.js?v=1',
            'js/admin/admin-cortes.js?v=1',
            'js/admin/cajones/cajones-drag.js?v=1',
            'js/admin/cajones/cajones-materials.js?v=1',
            'js/admin/cajones/cajones-rules.js?v=1',
            'js/admin/cajones/cajones-discounts.js?v=1',
            'js/admin/cajones/cajones-simulator.js?v=1',
            'js/admin/admin-cajones.js?v=3',
            'js/admin/admin-payments.js?v=5',
            'js/admin/admin-pages.js?v=4',
            'js/admin/admin-quotes.js?v=1',
            'js/admin/admin-users.js?v=1'
        ];

        await loadScriptsSequential(adminScripts);
        await Promise.all(cdnPromises);

        // 6. Inicializar Panel Admin
        if (typeof window.initAdminUX20 === 'function') {
            window.adminUX20Initialized = false;
            window.initAdminUX20();
        }
        if (typeof window.renderAdminUX === 'function') {
            window.renderAdminUX();
        }
        if (typeof window.initGithubPublishAdmin === 'function') {
            window.initGithubPublishAdmin();
        }
        if (typeof window.renderAdminViewBuilderList === 'function') {
            window.renderAdminViewBuilderList();
        }
    })();

    return _adminLoadPromise;
};

// Carga asíncrona al iniciar la aplicación (Ultra liviana para clientes)
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Si la URL inicial pide directamente Admin o Nosotros, priorizar su carga
    const params = new URLSearchParams(window.location.search);
    const view = (params.get('view') || params.get('sec') || '').toLowerCase();
    if (view === 'admin' || window.location.pathname.endsWith('/admin')) {
        window.loadAdminPartialsOnDemand();
    } else if (view === 'nosotros' || view === 'view-about') {
        window.loadAboutPartialOnDemand();
    } else if (view === 'videos' || view === 'video' || view === 'view-videos') {
        window.ensureVideosModuleLoaded().then(() => {
            if (typeof window.renderVideosView === 'function') window.renderVideosView();
        });
    } else if (view === 'catalogo' || view === 'buscar' || params.get('cat') || params.get('category')) {
        if (window.innerWidth >= 900 || view === 'catalogo') {
            window.ensureCatalogModuleLoaded();
        }
    } else if (view === 'perfil' || view === 'mi-perfil') {
        window.ensureUserProfileModalLoaded();
    } else if (view === 'mis-compras' || view === 'pedidos' || params.get('id') || params.get('order')) {
        window.ensureMyOrdersLoaded();
    }

    // 2. Cargar modales globales livianos del cliente
    await Promise.all([
        loadPartial('partials/modal-globals.html', 'body'),
        loadPartial('partials/view-offer-detail.html', '#view-offer-detail', 'innerHTML'),
        loadPartial('partials/modal-offer-detail.html', 'body'),
        loadPartial('partials/modal-media-rentals.html', 'body')
    ]);

    // 3. Post-carga diferida inteligente (cuando la Home ya está 100% pintada e interactiva)
    setTimeout(() => {
        window.ensurePostalLookupLoaded();
        window.ensureAssistantLoaded();
    }, 1800);
});
