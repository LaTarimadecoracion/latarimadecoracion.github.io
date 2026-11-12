/* =============================================================================
   js/modules/notifications.js
   Centro de Notificaciones Reales (Pedidos, Favoritos, Ofertas y Lanzamientos)
   - Desktop: Desplegable en la campanita + sincronización de badges
   - Móvil / Completa: Vista dedicada #view-notifications
   ============================================================================= */

(function () {
    'use strict';

    const WORKER_URL = 'https://super-shadow-4ad9.latarimadecoracion.workers.dev';
    const STORAGE_PREFIX = 'latarima_notif_state_v1:';
    const LOCAL_ORDERS_KEY = 'latarima_my_orders';
    const MAX_NOTIFICATIONS = 40;
    const RECENT_AVISO_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

    let isScanning = false;
    let listenersBound = false;

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatMoney(val) {
        const num = Number(val) || 0;
        return '$ ' + num.toLocaleString('es-AR');
    }

    function formatRelativeTime(ts) {
        const diff = Math.max(0, Date.now() - (Number(ts) || Date.now()));
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Recién';
        if (mins < 60) return `Hace ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Hace ${hours} h`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Ayer';
        if (days < 7) return `Hace ${days} días`;
        try {
            return new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
        } catch (e) {
            return 'Reciente';
        }
    }

    function getCurrentUser() {
        try {
            if (window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function') {
                return window.AdminAuth.getPublicUser();
            }
        } catch (e) {}
        return null;
    }

    function getUserKey() {
        const user = getCurrentUser();
        const email = user && user.email ? String(user.email).trim().toLowerCase() : '';
        return email || 'guest';
    }

    function loadState() {
        const key = STORAGE_PREFIX + getUserKey();
        const empty = {
            notifications: [],
            orderSnapshots: {},
            seenProductIds: null,
            seenOfferIds: null
        };
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return empty;
            const parsed = JSON.parse(raw);
            return {
                notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
                orderSnapshots: (parsed.orderSnapshots && typeof parsed.orderSnapshots === 'object') ? parsed.orderSnapshots : {},
                seenProductIds: Array.isArray(parsed.seenProductIds) ? parsed.seenProductIds : null,
                seenOfferIds: Array.isArray(parsed.seenOfferIds) ? parsed.seenOfferIds : null
            };
        } catch (e) {
            return empty;
        }
    }

    function saveState(state) {
        try {
            state.notifications = (state.notifications || [])
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, MAX_NOTIFICATIONS);
            localStorage.setItem(STORAGE_PREFIX + getUserKey(), JSON.stringify(state));
        } catch (e) {
            console.warn('[NotificationsCenter] Error guardando estado:', e);
        }
    }

    function upsertNotification(state, entry) {
        if (!entry || !entry.id) return false;
        const idx = state.notifications.findIndex(n => n.id === entry.id);
        if (idx !== -1) {
            // Ya existe esta alerta puntual: mantener estado read/unread previo sin duplicar
            return false;
        }
        state.notifications.unshift({
            ...entry,
            timestamp: entry.timestamp || Date.now(),
            read: false
        });
        return true;
    }

    /**
     * Resuelve el precio vigente de una variante del producto en el catálogo actual.
     */
    function resolveProductPrice(product, acabado = '', medida = '', opcion = '') {
        if (!product) return 0;
        const norm = (s) => String(s || '').trim().toLowerCase();
        const acTarget = norm(acabado);
        const medTarget = norm(medida);
        const optTarget = norm(opcion);

        let variant = null;
        if (Array.isArray(product.acabados_groups) && product.acabados_groups.length > 0) {
            const group = (acTarget && product.acabados_groups.find(g => norm(g.acabado_name) === acTarget))
                || product.acabados_groups.find(g => !g.hidden)
                || product.acabados_groups[0];

            if (group && Array.isArray(group.medidas_variants) && group.medidas_variants.length > 0) {
                variant = (medTarget && group.medidas_variants.find(m => norm(m.medida) === medTarget && !m.hidden))
                    || group.medidas_variants.find(m => m.default && !m.hidden)
                    || group.medidas_variants.find(m => !m.hidden && Number(m.price) > 0)
                    || group.medidas_variants[0];
            }
        }

        if (!variant && Array.isArray(product.medidas_variants) && product.medidas_variants.length > 0) {
            variant = (medTarget && product.medidas_variants.find(m => norm(m.medida) === medTarget))
                || product.medidas_variants.find(m => m.default)
                || product.medidas_variants[0];
        }

        if (variant && optTarget && Array.isArray(variant.options)) {
            const opt = variant.options.find(o => norm(o.label || o.name) === optTarget);
            if (opt && Number(opt.price) > 0) return Number(opt.price);
        }

        if (variant && Number(variant.price) > 0) return Number(variant.price);
        if (Number(product.price) > 0) return Number(product.price);
        return 0;
    }

    function findCatalogProduct(prodId) {
        if (!prodId) return null;
        if (typeof window.findProductById === 'function') {
            return window.findProductById(prodId);
        }
        const source = (window.sessionProducts && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (typeof productsData !== 'undefined' ? productsData : []);
        const target = String(prodId).trim().toLowerCase();
        for (const cat of (source || [])) {
            if (!cat || !Array.isArray(cat.products)) continue;
            const found = cat.products.find(p => p && String(p.id).trim().toLowerCase() === target);
            if (found) return { product: found, catName: cat.name || '' };
        }
        return null;
    }

    function getActiveOffersList() {
        const raw = (window.offersData && Array.isArray(window.offersData))
            ? window.offersData
            : (typeof offersData !== 'undefined' && Array.isArray(offersData) ? offersData : []);
        const now = Date.now();
        return raw.filter(o => {
            if (!o || o.active === false) return false;
            if (o.hasTimer && o.expirationDate) {
                const exp = new Date(o.expirationDate).getTime();
                if (!isNaN(exp) && exp <= now) return false;
            }
            return true;
        });
    }

    const ORDER_STATUS_META = [
        {
            match: (st, pay) => st.includes('cancelad') || st.includes('rechazad') || pay === 'cancelled' || pay === 'refunded',
            key: 'cancelled',
            title: 'Pedido cancelado',
            icon: 'cancel',
            accent: '#dc2626',
            bg: '#fef2f2',
            badge: 'Cancelado'
        },
        {
            match: (_st, pay) => pay === 'rejected',
            key: 'payment_rejected',
            title: 'Pago rechazado — Revisá tu pedido',
            icon: 'error',
            accent: '#dc2626',
            bg: '#fef2f2',
            badge: 'Pago rechazado'
        },
        {
            match: (st, pay) => st.includes('entregad') || st.includes('completad') || pay === 'delivered',
            key: 'delivered',
            title: 'Pedido entregado',
            icon: 'verified',
            accent: '#15803d',
            bg: '#dcfce7',
            badge: 'Entregado'
        },
        {
            match: (st) => st.includes('listo'),
            key: 'ready',
            title: 'Pedido listo para retirar o despachar',
            icon: 'inventory_2',
            accent: '#0284c7',
            bg: '#f0f9ff',
            badge: 'Listo'
        },
        {
            match: (st) => st.includes('proceso') || st.includes('produccion') || st.includes('carpinteria') || st.includes('armado'),
            key: 'in_progress',
            title: 'Pedido confirmado en fabricación',
            icon: 'carpenter',
            accent: '#2563eb',
            bg: '#eff6ff',
            badge: 'En taller'
        },
        {
            match: (st, pay) => st === 'pago_confirmado' || st.includes('confirmado') || st.includes('aprobado') || pay === 'approved',
            key: 'confirmed',
            title: 'Pedido confirmado',
            icon: 'check_circle',
            accent: '#16a34a',
            bg: '#f0fdf4',
            badge: 'Confirmado'
        },
        {
            match: (st, pay) => st.includes('pendiente') || st.includes('falta') || pay === 'pending' || pay === 'in_process',
            key: 'payment_pending',
            title: 'Falta completar el pago',
            icon: 'payments',
            accent: '#d97706',
            bg: '#fffbeb',
            badge: 'Pago pendiente'
        }
    ];

    function classifyOrder(order) {
        const st = String(order.status || '').trim().toLowerCase();
        const pay = String(order.paymentStatus || '').trim().toLowerCase();
        const found = ORDER_STATUS_META.find(rule => rule.match(st, pay));
        return found || {
            key: 'updated',
            title: 'Actualización de tu pedido',
            icon: 'receipt_long',
            accent: '#475569',
            bg: '#f1f5f9',
            badge: order.status || 'Pedido'
        };
    }

    async function fetchOrdersForNotifications() {
        const user = getCurrentUser();
        const userEmail = user && user.email ? String(user.email).trim().toLowerCase() : '';
        const ordersMap = new Map();

        const mergeOrder = (ord) => {
            if (!ord || !ord.id) return;
            const prev = ordersMap.get(String(ord.id)) || {};
            ordersMap.set(String(ord.id), { ...prev, ...ord });
        };

        // 1. LocalStorage (pedidos hechos desde este navegador)
        try {
            const rawLocal = localStorage.getItem(LOCAL_ORDERS_KEY);
            const list = rawLocal ? JSON.parse(rawLocal) : [];
            if (Array.isArray(list)) {
                list.forEach(o => {
                    const oEmail = (o.clientEmail || '').trim().toLowerCase();
                    if (!userEmail || !oEmail || oEmail === userEmail) {
                        mergeOrder(o);
                    }
                });
            }
        } catch (e) {}

        // 2. Worker remoto en vivo si hay usuario autenticado
        if (userEmail) {
            try {
                const res = await fetch(`${WORKER_URL}/mis-pedidos?email=${encodeURIComponent(userEmail)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.orders)) {
                        data.orders.forEach(mergeOrder);
                    }
                }
            } catch (e) {}
        }

        return Array.from(ordersMap.values());
    }

    async function scanOrders(state) {
        const orders = await fetchOrdersForNotifications();
        let changed = false;

        orders.forEach(ord => {
            const ordId = String(ord.id);
            const st = String(ord.status || '').trim().toLowerCase();
            const pay = String(ord.paymentStatus || '').trim().toLowerCase();
            const notesLen = Array.isArray(ord.notes) ? ord.notes.length : 0;
            const snapshot = `${st}|${pay}|${notesLen}`;
            const prevSnapshot = state.orderSnapshots[ordId];

            const meta = classifyOrder(ord);
            const shortRef = ord.shortCode || ordId;
            const itemTitle = ord.title || (Array.isArray(ord.cartItems) && ord.cartItems[0] ? ord.cartItems[0].title : 'Tu compra');

            if (prevSnapshot !== snapshot) {
                const bodyText = meta.key === 'payment_pending'
                    ? `Pedido #${shortRef} (${itemTitle}): está aguardando acreditación o comprobante de pago.`
                    : `Pedido #${shortRef} (${itemTitle})${ord.amount ? ` · ${formatMoney(ord.amount)}` : ''}.`;

                const added = upsertNotification(state, {
                    id: `ord_${ordId}_${snapshot}`,
                    type: 'order',
                    title: meta.title,
                    body: bodyText,
                    timestamp: Number(ord.updatedAt || ord.createdAt) || Date.now(),
                    image: ord.image || '',
                    icon: meta.icon,
                    accent: meta.accent,
                    bg: meta.bg,
                    badgeText: meta.badge,
                    actionType: 'order',
                    actionPayload: { orderId: ordId }
                });
                if (added) changed = true;
                state.orderSnapshots[ordId] = snapshot;
            }
        });

        return changed;
    }

    function scanFavorites(state) {
        let changed = false;
        let cartList = [];
        try {
            const raw = localStorage.getItem('cartItems');
            cartList = raw ? JSON.parse(raw) : [];
        } catch (e) {}
        if (!Array.isArray(cartList) || cartList.length === 0) return false;

        const activeOffers = getActiveOffersList();

        cartList.forEach(item => {
            if (!item || !item.id) return;
            const found = findCatalogProduct(item.id);
            const product = found && found.product ? found.product : null;
            const catName = found && found.catName ? found.catName : (item.catName || '');

            // 1. Tu favorito bajó de precio
            const savedPrice = Number(item.price) || 0;
            if (product && savedPrice > 0) {
                const livePrice = resolveProductPrice(product, item.acabado, item.medida, item.opcion);
                if (livePrice > 0 && livePrice < savedPrice) {
                    const dropPct = Math.round(((savedPrice - livePrice) / savedPrice) * 100);
                    const cover = Array.isArray(product.image) ? product.image[0] : (product.image || item.image || '');
                    const added = upsertNotification(state, {
                        id: `fav_drop_${item.id}_${livePrice}`,
                        type: 'price_drop',
                        title: '¡Tu favorito bajó de precio!',
                        body: `${product.title || item.title}: ahora ${formatMoney(livePrice)} (antes ${formatMoney(savedPrice)}${dropPct > 0 ? ` · -${dropPct}%` : ''}).`,
                        timestamp: Date.now(),
                        image: cover,
                        icon: 'trending_down',
                        accent: '#7c3aed',
                        bg: '#f5f3ff',
                        badgeText: dropPct > 0 ? `-${dropPct}%` : 'Bajó',
                        actionType: 'product',
                        actionPayload: {
                            productId: String(product.id),
                            catName,
                            acabado: item.acabado || '',
                            medida: item.medida || '',
                            opcion: item.opcion || ''
                        }
                    });
                    if (added) changed = true;
                }
            }

            // 2. Tu favorito está de oferta
            const itemIdNorm = String(item.id).trim().toLowerCase();
            activeOffers.forEach(offer => {
                const offerItems = Array.isArray(offer.product_items) ? offer.product_items : [];
                const isInOffer = offerItems.some(pi => {
                    const pid = String(pi.productId || pi.id || '').trim().toLowerCase();
                    return pid && pid === itemIdNorm;
                });
                if (isInOffer) {
                    const discLabel = offer.discountPercent ? ` (${offer.discountPercent}% OFF)` : '';
                    const offerPriceLabel = offer.offerPrice ? ` por ${formatMoney(offer.offerPrice)}` : '';
                    const cover = offer.customCoverImage || item.image || (offerItems[0] && offerItems[0].image) || '';
                    const added = upsertNotification(state, {
                        id: `fav_offer_${offer.id}_${item.id}`,
                        type: 'favorite_offer',
                        title: '¡Tu favorito está de oferta!',
                        body: `${item.title} participa en "${offer.title}"${discLabel}${offerPriceLabel}.`,
                        timestamp: Number(offer.created_at) || Date.now(),
                        image: cover,
                        icon: 'local_offer',
                        accent: '#ea580c',
                        bg: '#fff7ed',
                        badgeText: offer.discountPercent ? `${offer.discountPercent}% OFF` : 'Oferta',
                        actionType: 'offers',
                        actionPayload: { offerId: offer.id }
                    });
                    if (added) changed = true;
                }
            });
        });

        return changed;
    }

    function scanCatalogUpdates(state) {
        let changed = false;
        const catalogSource = (window.sessionProducts && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (typeof productsData !== 'undefined' && Array.isArray(productsData) ? productsData : []);

        // Recolectar productos visibles del catálogo
        const productMap = new Map();
        catalogSource.forEach(cat => {
            if (!cat || !Array.isArray(cat.products)) return;
            cat.products.forEach(p => {
                if (p && p.id && p.hidden !== true) {
                    productMap.set(String(p.id), { product: p, catName: cat.name || '' });
                }
            });
        });

        const currentProductIds = Array.from(productMap.keys());
        if (state.seenProductIds === null) {
            // Primera visita: sembrar catálogo actual para notificar únicamente los ingresos futuros
            state.seenProductIds = currentProductIds;
            changed = true;
        } else if (currentProductIds.length > 0) {
            const seenSet = new Set(state.seenProductIds.map(String));
            currentProductIds.forEach(pid => {
                if (!seenSet.has(pid)) {
                    const entry = productMap.get(pid);
                    if (entry && entry.product) {
                        const cover = Array.isArray(entry.product.image) ? entry.product.image[0] : (entry.product.image || '');
                        const added = upsertNotification(state, {
                            id: `new_prod_${pid}`,
                            type: 'new_product',
                            title: '¡Nuevo producto en La Tarima!',
                            body: `Recién ingresado: ${entry.product.title}${entry.catName ? ` (${entry.catName})` : ''}.`,
                            timestamp: Date.now(),
                            image: cover,
                            icon: 'new_releases',
                            accent: '#0f766e',
                            bg: '#f0fdfa',
                            badgeText: 'Nuevo',
                            actionType: 'product',
                            actionPayload: { productId: pid, catName: entry.catName }
                        });
                        if (added) changed = true;
                    }
                    seenSet.add(pid);
                }
            });
            state.seenProductIds = Array.from(seenSet);
        }

        // Incorporar lanzamientos recientes publicados explícitamente vía sessionAvisos (últimos 14 días)
        if (Array.isArray(window.sessionAvisos)) {
            const minTs = Date.now() - RECENT_AVISO_MAX_AGE_MS;
            window.sessionAvisos.forEach(aviso => {
                if (!aviso || aviso.type !== 'product' || !aviso.timestamp || aviso.timestamp < minTs) return;
                const cleanTitle = String(aviso.title || '').replace(/^¡?Nuevo (Ingreso|Alquiler):\s*/i, '').trim() || 'Nuevo lanzamiento';
                const prodId = aviso.productId ? String(aviso.productId) : '';
                const matched = prodId ? findCatalogProduct(prodId) : null;
                if (prodId && !matched) return;
                const cover = matched && matched.product
                    ? (Array.isArray(matched.product.image) ? matched.product.image[0] : (matched.product.image || ''))
                    : '';
                const added = upsertNotification(state, {
                    id: `aviso_prod_${aviso.id || prodId || cleanTitle}`,
                    type: 'new_product',
                    title: '¡Nuevo producto disponible!',
                    body: cleanTitle,
                    timestamp: Number(aviso.timestamp) || Date.now(),
                    image: cover,
                    icon: 'new_releases',
                    accent: '#0f766e',
                    bg: '#f0fdfa',
                    badgeText: 'Nuevo',
                    actionType: matched ? 'product' : 'view',
                    actionPayload: matched
                        ? { productId: String(matched.product.id), catName: matched.catName || '' }
                        : { viewId: 'view-catalogo' }
                });
                if (added) changed = true;
            });
        }

        // Detectar nuevas ofertas activas desde la visita anterior
        const activeOffers = getActiveOffersList();
        const currentOfferIds = activeOffers.map(o => String(o.id));
        if (state.seenOfferIds === null) {
            state.seenOfferIds = currentOfferIds;
            changed = true;
        } else if (currentOfferIds.length > 0) {
            const seenOffersSet = new Set(state.seenOfferIds.map(String));
            activeOffers.forEach(offer => {
                const oid = String(offer.id);
                if (!seenOffersSet.has(oid)) {
                    const discLabel = offer.discountPercent ? ` (${offer.discountPercent}% OFF)` : '';
                    const added = upsertNotification(state, {
                        id: `new_offer_${oid}`,
                        type: 'new_offer',
                        title: '¡Nueva oferta disponible!',
                        body: `${offer.title}${discLabel}.`,
                        timestamp: Number(offer.created_at) || Date.now(),
                        image: offer.customCoverImage || '',
                        icon: 'local_offer',
                        accent: '#ea580c',
                        bg: '#fff7ed',
                        badgeText: 'Oferta',
                        actionType: 'offers',
                        actionPayload: { offerId: oid }
                    });
                    if (added) changed = true;
                    seenOffersSet.add(oid);
                }
            });
            state.seenOfferIds = Array.from(seenOffersSet);
        }

        return changed;
    }

    function syncBadges(stateOverride = null) {
        const state = stateOverride || loadState();
        const unreadCount = (state.notifications || []).filter(n => !n.read).length;

        const mobileBadge = document.getElementById('header-nav-badge');
        const mobileBtn = document.getElementById('nav-notif-btn-header');
        if (mobileBadge) mobileBadge.style.display = unreadCount > 0 ? 'block' : 'none';
        if (mobileBtn) mobileBtn.classList.toggle('pulse-notif', unreadCount > 0);

        const desktopBadge = document.getElementById('desktop-notif-badge');
        const menuDot = document.getElementById('desktop-menu-notif-badge');
        if (desktopBadge) {
            if (unreadCount > 0) {
                desktopBadge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
                desktopBadge.style.display = 'inline-flex';
            } else {
                desktopBadge.style.display = 'none';
            }
        }
        if (menuDot) menuDot.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    function handleNotificationClick(notifId) {
        const state = loadState();
        const item = state.notifications.find(n => n.id === notifId);
        if (!item) return;

        if (!item.read) {
            item.read = true;
            saveState(state);
        }
        syncBadges(state);
        renderDesktopDropdown();
        renderFullView();

        // Cerrar dropdown si estaba abierto en desktop
        document.getElementById('desktop-notif-wrapper')?.classList.remove('open');
        document.getElementById('desktop-notif-btn')?.setAttribute('aria-expanded', 'false');

        const payload = item.actionPayload || {};
        if (item.actionType === 'order') {
            if (window.navigateToView) {
                window.navigateToView('view-my-orders', payload.orderId ? { orderId: payload.orderId } : {});
            }
            return;
        }
        if (item.actionType === 'product' && payload.productId) {
            const found = findCatalogProduct(payload.productId);
            if (found && found.product && typeof window.showProductDetail === 'function') {
                window.showProductDetail(found.product, found.catName || payload.catName || '', payload.acabado || '', payload.medida || '', payload.opcion || '');
                return;
            }
            if (window.navigateToView) window.navigateToView('view-catalogo');
            return;
        }
        if (item.actionType === 'offers') {
            if (window.navigateToView) window.navigateToView('view-offers');
            return;
        }
        if (item.actionType === 'view' && payload.viewId && window.navigateToView) {
            window.navigateToView(payload.viewId);
        }
    }

    function markAllAsRead() {
        const state = loadState();
        state.notifications.forEach(n => { n.read = true; });
        saveState(state);
        syncBadges(state);
        renderDesktopDropdown();
        renderFullView();
    }

    function clearReadNotifications() {
        const state = loadState();
        state.notifications = state.notifications.filter(n => !n.read);
        saveState(state);
        syncBadges(state);
        renderDesktopDropdown();
        renderFullView();
    }

    function buildNotificationItemHtml(item, compact = false) {
        const thumbHtml = item.image
            ? `<img src="${escapeHtml(item.image)}" alt="" style="width:${compact ? '42px' : '50px'}; height:${compact ? '42px' : '50px'}; border-radius:10px; object-fit:cover; flex-shrink:0; border:1px solid #e2e8f0;" onerror="this.style.display='none'">`
            : `<div style="width:${compact ? '40px' : '46px'}; height:${compact ? '40px' : '46px'}; border-radius:12px; background:${escapeHtml(item.bg || '#f1f5f9')}; color:${escapeHtml(item.accent || '#334155')}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <span class="material-symbols-outlined" style="font-size:${compact ? '20px' : '22px'};">${escapeHtml(item.icon || 'notifications')}</span>
               </div>`;

        return `
            <button type="button" class="lt-notif-card ${item.read ? 'is-read' : 'is-unread'}" data-notif-id="${escapeHtml(item.id)}" style="width:100%; text-align:left; background:${item.read ? '#ffffff' : '#f8fafc'}; border:none; border-bottom:1px solid #f1f5f9; padding:${compact ? '10px 14px' : '14px 16px'}; display:flex; align-items:flex-start; gap:12px; cursor:pointer; font-family:inherit; transition:background 0.15s;">
                ${thumbHtml}
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <span style="font-size:${compact ? '0.8rem' : '0.9rem'}; font-weight:800; color:#0f172a; line-height:1.25;">${escapeHtml(item.title)}</span>
                        ${!item.read ? '<span style="width:8px; height:8px; border-radius:50%; background:#2563eb; flex-shrink:0;" title="No leída"></span>' : ''}
                    </div>
                    <p style="margin:3px 0 6px; font-size:${compact ? '0.75rem' : '0.82rem'}; color:#475569; line-height:1.4; white-space:normal;">${escapeHtml(item.body)}</p>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        ${item.badgeText ? `<span style="font-size:0.65rem; font-weight:800; text-transform:uppercase; padding:2px 7px; border-radius:50px; background:${escapeHtml(item.bg || '#f1f5f9')}; color:${escapeHtml(item.accent || '#475569')};">${escapeHtml(item.badgeText)}</span>` : ''}
                        <span style="font-size:0.7rem; color:#94a3b8; font-weight:600;">${escapeHtml(formatRelativeTime(item.timestamp))}</span>
                    </div>
                </div>
            </button>
        `;
    }

    function bindNotificationCardClicks(container) {
        if (!container) return;
        container.querySelectorAll('.lt-notif-card[data-notif-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-notif-id');
                if (id) handleNotificationClick(id);
            });
        });
    }

    function renderDesktopDropdown() {
        const host = document.getElementById('desktop-notif-dropdown');
        if (!host) return;

        const state = loadState();
        const items = state.notifications || [];
        const unreadCount = items.filter(n => !n.read).length;

        const bodyHtml = items.length > 0
            ? items.slice(0, 12).map(item => buildNotificationItemHtml(item, true)).join('')
            : `
                <div style="padding: 1.75rem 1.25rem; text-align: center; color: #64748b;">
                    <span class="material-symbols-outlined" style="font-size: 34px; color: #cbd5e1; display: block; margin-bottom: 6px;">notifications_paused</span>
                    <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a;">Sin notificaciones nuevas</div>
                    <div style="font-size: 0.75rem; margin-top: 4px; line-height: 1.4;">Acá vas a ver el estado de tus pedidos, bajas de precio en favoritos, ofertas y nuevos ingresos.</div>
                </div>
            `;

        host.innerHTML = `
            <div class="desktop-user-dropdown-header" style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-weight:800; font-size:0.9rem; color:#0f172a;">Notificaciones</span>
                    ${unreadCount > 0 ? `<span style="background:#ef4444; color:#fff; font-size:0.68rem; font-weight:800; padding:1px 7px; border-radius:50px;">${unreadCount}</span>` : ''}
                </div>
                ${unreadCount > 0 ? `
                    <button type="button" id="btn-desktop-notif-read-all" style="background:none; border:none; color:var(--primary-color, #A0715B); font-size:0.74rem; font-weight:700; cursor:pointer; padding:2px 4px;">
                        Marcar leídas
                    </button>
                ` : ''}
            </div>
            <div style="max-height: 360px; overflow-y: auto;">
                ${bodyHtml}
            </div>
            <div style="padding: 8px 12px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                <a href="#" id="btn-desktop-notif-view-all" style="font-size: 0.78rem; font-weight: 700; color: var(--primary-color, #A0715B); text-decoration: none; display: block; padding: 4px 0;">
                    Ver todas las notificaciones
                </a>
            </div>
        `;

        bindNotificationCardClicks(host);

        document.getElementById('btn-desktop-notif-read-all')?.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllAsRead();
        });

        document.getElementById('btn-desktop-notif-view-all')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('desktop-notif-wrapper')?.classList.remove('open');
            document.getElementById('desktop-notif-btn')?.setAttribute('aria-expanded', 'false');
            if (window.navigateToView) {
                window.navigationHistory = [];
                window.navigateToView('view-notifications');
            }
        });
    }

    function renderFullView() {
        const root = document.getElementById('notifications-center-root');
        if (!root) return;

        const state = loadState();
        const items = state.notifications || [];
        const unreadCount = items.filter(n => !n.read).length;
        const readCount = items.length - unreadCount;

        const listHtml = items.length > 0
            ? `<div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(15,23,42,0.05);">
                    ${items.map(item => buildNotificationItemHtml(item, false)).join('')}
               </div>`
            : `
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:2.5rem 1.5rem; text-align:center; color:#64748b; box-shadow:0 4px 16px rgba(15,23,42,0.04);">
                    <span class="material-symbols-outlined" style="font-size:44px; color:#cbd5e1; display:block; margin-bottom:10px;">notifications_none</span>
                    <h3 style="margin:0 0 6px; font-size:1.05rem; font-weight:800; color:#0f172a;">Estás al día</h3>
                    <p style="margin:0 auto; max-width:420px; font-size:0.86rem; line-height:1.5;">
                        Cuando cambie el estado de tus pedidos (confirmado, pendiente de pago o cancelado), bajen de precio tus favoritos o lleguen nuevos productos, los vas a ver acá al instante.
                    </p>
                </div>
            `;

        root.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:1rem;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:42px; height:42px; border-radius:12px; background:rgba(160,113,91,0.12); color:var(--primary-color, #A0715B); display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-outlined" style="font-size:22px;">notifications_active</span>
                    </div>
                    <div>
                        <h2 style="margin:0; font-size:1.25rem; font-weight:900; color:#0f172a;">Notificaciones</h2>
                        <p style="margin:0; font-size:0.78rem; color:#64748b;">Pedidos, bajas de precio, ofertas en tus favoritos y novedades</p>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    ${unreadCount > 0 ? `
                        <button type="button" id="btn-full-notif-read-all" style="background:#fff; border:1px solid #cbd5e1; color:#0f172a; border-radius:999px; padding:0.45rem 0.95rem; font-size:0.78rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                            <span class="material-symbols-outlined" style="font-size:16px;">done_all</span>
                            <span>Marcar todas leídas (${unreadCount})</span>
                        </button>
                    ` : ''}
                    ${readCount > 0 ? `
                        <button type="button" id="btn-full-notif-clear-read" style="background:#f8fafc; border:1px solid #e2e8f0; color:#64748b; border-radius:999px; padding:0.45rem 0.95rem; font-size:0.78rem; font-weight:700; cursor:pointer;">
                            Limpiar leídas
                        </button>
                    ` : ''}
                </div>
            </div>
            ${listHtml}
        `;

        bindNotificationCardClicks(root);
        document.getElementById('btn-full-notif-read-all')?.addEventListener('click', markAllAsRead);
        document.getElementById('btn-full-notif-clear-read')?.addEventListener('click', clearReadNotifications);
    }

    async function scanAll() {
        if (isScanning) return;
        isScanning = true;
        try {
            const state = loadState();
            const c1 = await scanOrders(state);
            const c2 = scanFavorites(state);
            const c3 = scanCatalogUpdates(state);
            if (c1 || c2 || c3) {
                saveState(state);
            }
            syncBadges(state);
            renderDesktopDropdown();
            if (document.getElementById('view-notifications')?.classList.contains('active')) {
                renderFullView();
            }
        } catch (err) {
            console.warn('[NotificationsCenter] Error escaneando alertas:', err);
        } finally {
            isScanning = false;
        }
    }

    function init() {
        if (!listenersBound) {
            listenersBound = true;
            window.addEventListener('latarima:cart-updated', () => { scanAll(); });
            window.addEventListener('storage', (e) => {
                if (e.key === 'cartItems' || e.key === LOCAL_ORDERS_KEY) {
                    scanAll();
                }
            });
        }
        syncBadges();
        renderDesktopDropdown();
        setTimeout(() => { scanAll(); }, 600);
    }

    window.NotificationsCenter = {
        init,
        scanAll,
        syncBadges,
        renderDesktopDropdown,
        renderFullView,
        markAllAsRead,
        clearReadNotifications,
        resolveProductPrice
    };

    document.addEventListener('DOMContentLoaded', init);
})();
