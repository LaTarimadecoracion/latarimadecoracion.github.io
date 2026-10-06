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
    await Promise.all([
        loadPartial('partials/admin/modal-offer.html', '#view-admin'),
        loadPartial('partials/admin/modal-stock-edit.html', '#view-admin'),
        loadPartial('partials/admin/modal-stock-draft.html', '#view-admin'),
        loadPartial('partials/admin/modals-forms.html', 'body')
    ]);

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
