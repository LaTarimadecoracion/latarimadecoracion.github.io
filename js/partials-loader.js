// =============================================================================
// partials-loader.js — Cargador dinámico de fragmentos HTML (Partials)
// =============================================================================

async function loadPartial(url, targetSelector, position = 'beforeend') {
    try {
        const finalUrl = url.includes('?') ? url : `${url}?v=18`;
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

window.adminPartialsLoaded = false;

window.loadAdminPartialsOnDemand = async function() {
    if (window.adminPartialsLoaded) return;
    window.adminPartialsLoaded = true;

    await loadPartial('partials/view-admin.html', '#view-admin', 'innerHTML');
    
    // Carga paralela de todas las vistas modulares del panel admin
    const adminViews = [
        'partials/admin/view-dashboard.html',
        'partials/admin/view-offers.html',
        'partials/admin/view-shipping.html',
        'partials/admin/view-cortes.html',
        'partials/admin/view-payments.html',
        'partials/admin/view-stock.html',
        'partials/admin/view-pc-stock.html',
        'partials/admin/view-bulk-edit.html',
        'partials/admin/view-catalog.html',
        'partials/admin/view-pages.html',
        'partials/admin/view-settings.html',
        'partials/admin/view-orders.html',
        'partials/admin/view-quotes.html',
        'partials/admin/view-users.html',
        'partials/admin/modal-label-print.html'
    ];

    const adminModals = [
        'partials/admin/modal-offer.html',
        'partials/admin/modal-stock-edit.html',
        'partials/admin/modal-stock-draft.html',
        'partials/admin/modals-forms.html'
    ];

    await Promise.all([
        ...adminViews.map(url => loadPartial(url, '#admin-main-container', 'beforeend')),
        loadPartial('partials/admin/modal-offer.html', '#view-admin'),
        loadPartial('partials/admin/modal-stock-edit.html', '#view-admin'),
        loadPartial('partials/admin/modal-stock-draft.html', '#view-admin'),
        loadPartial('partials/admin/modals-forms.html', 'body')
    ]);

    // Carga paralela de los subpaneles del módulo de Cortes de Madera
    const cortesPanels = [
        'partials/admin/cortes/panel-materiales.html',
        'partials/admin/cortes/panel-usos.html',
        'partials/admin/cortes/panel-logistica.html',
        'partials/admin/cortes/panel-descuentos.html',
        'partials/admin/cortes/panel-simulador.html'
    ];
    await Promise.all(
        cortesPanels.map(url => loadPartial(url, '#cortes-subpanels-container', 'beforeend'))
    );

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
};

// Carga asíncrona de partials al iniciar la aplicación (Solo lo necesario para clientes)
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar únicamente fragmentos necesarios para la vista cliente
    await Promise.all([
        loadPartial('partials/view-offer-detail.html', '#view-offer-detail', 'innerHTML'),
        loadPartial('partials/modal-offer-detail.html', 'body'),
        loadPartial('partials/modal-media-rentals.html', 'body'),
        loadPartial('partials/modal-globals.html', 'body')
    ]);

    // Si la URL inicial es directamente la vista de Admin, cargamos el Admin de inmediato
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') || '';
    if (view === 'admin' || window.location.pathname.endsWith('/admin')) {
        await window.loadAdminPartialsOnDemand();
    }
});
