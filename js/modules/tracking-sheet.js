// =============================================================================
// tracking-sheet.js — Lógica del Bottom Sheet de Seguimiento de Pedidos
// Extraído de index.html (era un bloque <script> inline antes del cierre del </body>)
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const trackingOverlay = document.getElementById('tracking-modal-overlay');
    const trackingIframe = document.getElementById('tracking-sheet-iframe');
    const searchView = document.getElementById('tracking-search-view');
    const container = document.getElementById('tracking-sheet-container');
    const errorBox = document.getElementById('native-tracking-error');
    const orderInput = document.getElementById('native-order-id-input');
    const errorView = document.getElementById('tracking-error-view');

    window.resetTrackingSearch = () => {
        if (trackingIframe) trackingIframe.src = 'about:blank';
        if (searchView) searchView.style.display = 'block';
        if (trackingIframe) trackingIframe.style.display = 'none';
        if (errorView) errorView.style.setProperty('display', 'none', 'important');
        if (container) container.classList.remove('has-results');
        if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
        }
        if (orderInput) orderInput.value = '';
    };

    window.openTrackingSheet = () => {
        window.resetTrackingSearch();
        if (trackingOverlay) {
            trackingOverlay.classList.add('open');
        }
        if (orderInput) {
            setTimeout(() => orderInput.focus(), 250);
        }
    };

    window.closeTrackingSheet = () => {
        if (trackingOverlay) {
            trackingOverlay.classList.remove('open');
        }
        setTimeout(() => {
            if (trackingOverlay && !trackingOverlay.classList.contains('open')) {
                window.resetTrackingSearch();
            }
        }, 300);
    };

    window.showOrderInIframe = (orderId) => {
        if (!trackingIframe || !searchView || !container || !errorView || !trackingOverlay) return;
        trackingIframe.src = `pedidos/index.html?id=${encodeURIComponent(orderId)}`;
        searchView.style.display = 'none';
        trackingIframe.style.display = 'block';
        errorView.style.setProperty('display', 'none', 'important');
        container.classList.add('has-results');
        trackingOverlay.classList.add('open');
    };

    window.showAdminInIframe = () => {
        if (!trackingIframe || !searchView || !container || !errorView || !trackingOverlay) return;
        trackingIframe.src = `pedidos/admin.html`;
        searchView.style.display = 'none';
        trackingIframe.style.display = 'block';
        errorView.style.setProperty('display', 'none', 'important');
        container.classList.add('has-results');
        trackingOverlay.classList.add('open');
    };

    window.handleNativeTrackingSearch = async (e) => {
        if (e) e.preventDefault();
        if (!orderInput || !errorBox || !trackingIframe || !searchView || !container || !errorView) return;
        
        const orderId = orderInput.value.trim();
        errorBox.style.display = 'none';
        
        if (!/^[0-9]+$/.test(orderId)) {
            errorBox.textContent = 'Ingrese un número de orden válido.';
            errorBox.style.display = 'block';
            return;
        }

        // Verificar si existe en ordersData o probar cargar
        const orders = (typeof ordersData !== 'undefined') ? ordersData : [];
        const found = orders.some(o => String(o.id) === String(orderId));

        if (found) {
            window.showOrderInIframe(orderId);
        } else {
            try {
                const res = await fetch(`pedidos/${orderId}.html`, { method: 'HEAD' });
                if (res.ok) {
                    window.showOrderInIframe(orderId);
                    return;
                }
            } catch(err) {}
            
            searchView.style.display = 'none';
            trackingIframe.style.display = 'none';
            errorView.style.setProperty('display', 'flex', 'important');
            container.classList.add('has-results');
        }
    };

    if (trackingOverlay) {
        trackingOverlay.addEventListener('click', (e) => {
            if (e.target === trackingOverlay) {
                window.closeTrackingSheet();
            }
        });
    }
});
