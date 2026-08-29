// =============================================================================
// partials-loader.js — Cargador dinámico de fragmentos HTML (Partials)
// =============================================================================

async function loadPartial(url, targetSelector, position = 'beforeend') {
    try {
        const response = await fetch(url);
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

// Carga asíncrona de partials al iniciar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar la estructura de vistas dinámicas primero
    await Promise.all([
        loadPartial('partials/view-admin.html', '#view-admin', 'innerHTML'),
        loadPartial('partials/view-offer-detail.html', '#view-offer-detail', 'innerHTML')
    ]);

    // 2. Cargar modales internos del admin y de la tienda
    await Promise.all([
        loadPartial('partials/admin/modal-offer.html', '#view-admin'),
        loadPartial('partials/admin/modal-stock-edit.html', '#view-admin'),
        loadPartial('partials/admin/modal-stock-draft.html', '#view-admin'),
        loadPartial('partials/admin/modals-forms.html', 'body'),
        loadPartial('partials/modal-offer-detail.html', 'body'),
        loadPartial('partials/modal-media-rentals.html', 'body'),
        loadPartial('partials/modal-globals.html', 'body')
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
});
