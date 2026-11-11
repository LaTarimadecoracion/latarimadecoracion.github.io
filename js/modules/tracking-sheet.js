// =============================================================================
// tracking-sheet.js — Lógica del Bottom Sheet de Seguimiento de Pedidos
// Extraído de index.html (era un bloque <script> inline antes del cierre del </body>)
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const WORKER_URL = 'https://super-shadow-4ad9.latarimadecoracion.workers.dev';
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
        if (window.innerWidth >= 900 && typeof window.navigateToView === 'function') {
            window.navigateToView('view-my-orders');
            setTimeout(() => {
                const lookupInput = document.getElementById('input-myorders-lookup');
                if (lookupInput) lookupInput.focus();
            }, 250);
            return;
        }
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

        const rawId = orderInput.value.trim().replace(/^#/, '');
        const cleanId = /^lt-/i.test(rawId) ? rawId.toUpperCase() : rawId;
        errorBox.style.display = 'none';

        if (!cleanId || !/^((LT-)?[A-Z0-9-]+)$/i.test(cleanId)) {
            errorBox.textContent = 'Ingrese un número o código de orden válido (ej: 500102800 o LT-1234).';
            errorBox.style.display = 'block';
            return;
        }

        const candidates = [cleanId];
        if (/^[0-9]+$/.test(cleanId)) {
            candidates.push(`LT-${cleanId}`);
        } else if (/^LT-/i.test(cleanId)) {
            const stripped = cleanId.replace(/^LT-/i, '');
            if (stripped) candidates.push(stripped);
        }
        const uniqueCandidates = Array.from(new Set(candidates));

        // 1. Verificar si existe en ordersData local
        const orders = (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) ? ordersData : [];
        const localMatch = uniqueCandidates.find(cand =>
            orders.some(o => String(o.id).toUpperCase() === cand.toUpperCase())
        );

        if (localMatch) {
            window.showOrderInIframe(localMatch);
            return;
        }

        // 2. Consultar en Cloudflare KV
        for (const cand of uniqueCandidates) {
            try {
                const kvRes = await fetch(`${WORKER_URL}/pedidos?id=${encodeURIComponent(cand)}`);
                if (kvRes.ok) {
                    const kvData = await kvRes.json();
                    if (kvData && kvData.success && kvData.order) {
                        window.showOrderInIframe(kvData.order.id || cand);
                        return;
                    }
                }
            } catch (err) {}
        }

        // 3. Fallback a archivo estático pedidos/${cleanId}.html
        try {
            const res = await fetch(`pedidos/${encodeURIComponent(cleanId)}.html`, { method: 'HEAD' });
            if (res.ok) {
                window.showOrderInIframe(cleanId);
                return;
            }
        } catch (err) {}

        searchView.style.display = 'none';
        trackingIframe.style.display = 'none';
        errorView.style.setProperty('display', 'flex', 'important');
        container.classList.add('has-results');
    };

    if (trackingOverlay) {
        trackingOverlay.addEventListener('click', (e) => {
            if (e.target === trackingOverlay) {
                window.closeTrackingSheet();
            }
        });
    }
});
