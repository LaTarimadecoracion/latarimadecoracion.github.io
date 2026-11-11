/* =============================================================================
   js/ui/my-orders.js
   Módulo "Mis Compras" — Historial real de pedidos + Invitación de registro gratis
   + Carrusel "Los más buscados" + Desplegable "Ver Catálogo Completo" (igual al Inicio)
   ============================================================================= */

(function () {
    const LOCAL_ORDERS_KEY = 'latarima_my_orders';
    const WORKER_URL = 'https://super-shadow-4ad9.latarimadecoracion.workers.dev';

    function getLocalOrders() {
        try {
            const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
            if (!raw) return [];
            const list = JSON.parse(raw);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function saveMyLocalOrder(order) {
        if (!order || !order.id) return;
        try {
            const list = getLocalOrders();
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
    }

    function formatPrice(val) {
        const num = Number(val) || 0;
        return '$ ' + num.toLocaleString('es-AR');
    }

    function formatDate(ts) {
        if (!ts) return 'Reciente';
        try {
            const d = new Date(ts);
            return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return 'Reciente';
        }
    }

    function getStatusMeta(statusRaw) {
        const st = (statusRaw || 'pendiente').toLowerCase();
        if (st.includes('entregado') || st.includes('completado')) {
            return { label: 'Entregado', color: '#15803d', bg: '#dcfce7', icon: 'check_circle' };
        }
        if (st.includes('listo')) {
            return { label: 'Listo para retirar / despachar', color: '#0369a1', bg: '#e0f2fe', icon: 'inventory_2' };
        }
        if (st.includes('proceso') || st.includes('produccion') || st.includes('carpinteria') || st.includes('armado')) {
            return { label: 'En fabricación en taller', color: '#1d4ed8', bg: '#dbeafe', icon: 'carpenter' };
        }
        if (st.includes('cancelado')) {
            return { label: 'Cancelado', color: '#b91c1c', bg: '#fee2e2', icon: 'cancel' };
        }
        if (st.includes('confirmacion') || st.includes('pendiente')) {
            return { label: 'Esperando confirmación', color: '#b45309', bg: '#fef3c7', icon: 'schedule' };
        }
        return { label: statusRaw || 'Registrado', color: '#475569', bg: '#f1f5f9', icon: 'receipt_long' };
    }

    async function fetchOrdersForCurrentUser() {
        const user = (window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function')
            ? window.AdminAuth.getPublicUser()
            : null;
        const userEmail = (user && user.email) ? user.email.trim().toLowerCase() : '';

        const ordersMap = new Map();
        const addOrder = (ord) => {
            if (!ord || !ord.id) return;
            const prev = ordersMap.get(String(ord.id)) || {};
            ordersMap.set(String(ord.id), { ...prev, ...ord });
        };

        // 1. Pedidos locales guardados en este dispositivo
        const localList = getLocalOrders();
        localList.forEach(addOrder);

        // 2. Pedidos estáticos en ordersData que coincidan por email o por ID local
        if (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) {
            ordersData.forEach(o => {
                const oEmail = (o.clientEmail || '').trim().toLowerCase();
                if ((userEmail && oEmail === userEmail) || localList.some(l => String(l.id) === String(o.id))) {
                    addOrder(o);
                }
            });
        }

        // 3. Consultar Cloudflare KV en tiempo real si el usuario está logueado con email
        if (userEmail) {
            let loadedFromDedicated = false;
            try {
                const res = await fetch(`${WORKER_URL}/mis-pedidos?email=${encodeURIComponent(userEmail)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.orders)) {
                        data.orders.forEach(addOrder);
                        loadedFromDedicated = true;
                    }
                }
            } catch (e) {}

            // Fallback si el worker en línea aún no tiene /mis-pedidos desplegado
            if (!loadedFromDedicated) {
                try {
                    const resAll = await fetch(`${WORKER_URL}/admin/pedidos`);
                    if (resAll.ok) {
                        const dataAll = await resAll.json();
                        if (dataAll && Array.isArray(dataAll.orders)) {
                            dataAll.orders.forEach(ord => {
                                const ordEmail = (ord.clientEmail || '').trim().toLowerCase();
                                if (ordEmail === userEmail) addOrder(ord);
                            });
                        }
                    }
                } catch (e) {}
            }
        }

        // 4. Refrescar estado puntual de pedidos locales guardados
        const idsToRefresh = Array.from(ordersMap.keys()).slice(0, 6);
        await Promise.all(idsToRefresh.map(async (id) => {
            try {
                const res = await fetch(`${WORKER_URL}/pedidos?id=${encodeURIComponent(id)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success && data.order) {
                        addOrder(data.order);
                    }
                }
            } catch (e) {}
        }));

        const merged = Array.from(ordersMap.values());
        merged.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        return { user, orders: merged };
    }

    function openTrackingForOrder(orderId) {
        if (typeof window.showOrderInIframe === 'function') {
            window.showOrderInIframe(orderId);
        } else {
            window.open(`pedidos/index.html?id=${encodeURIComponent(orderId)}`, '_blank');
        }
    }

    function renderDiscoverySections(hostEl) {
        if (!hostEl) return;
        hostEl.innerHTML = '';

        // 1. Sección Carrusel "Los más buscados" (idéntico al Inicio)
        const buscadosSection = document.createElement('section');
        buscadosSection.className = 'home-section full-width';
        buscadosSection.style.marginTop = '1.75rem';
        buscadosSection.innerHTML = `
            <div class="section-header-premium" style="padding: 0 0 0.65rem 0; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(160, 113, 91, 0.12); color: var(--primary-color, #A0715B); display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">star</span>
                    </div>
                    <div>
                        <h2 class="section-title" style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin: 0; padding: 0;">Los más buscados</h2>
                        <p class="section-subtitle" style="font-size: 0.78rem; color: var(--text-muted); margin: 2px 0 0 0; padding: 0;">Los preferidos de nuestros clientes</p>
                    </div>
                </div>
            </div>
        `;

        const carouselEl = document.createElement('div');
        carouselEl.className = 'carousel-categories';
        buscadosSection.appendChild(carouselEl);
        hostEl.appendChild(buscadosSection);

        try {
            const sourceData = (typeof window.sessionProducts !== 'undefined' && Array.isArray(window.sessionProducts) && window.sessionProducts.length > 0)
                ? window.sessionProducts
                : ((typeof productsData !== 'undefined' && Array.isArray(productsData)) ? productsData : []);

            const allProducts = [];
            const seenIds = new Set();
            sourceData.forEach(cat => {
                if (!cat || cat.visible === false || cat.id === 'Borrador') return;
                if (Array.isArray(cat.products)) {
                    cat.products.forEach(product => {
                        if (!product || product.visible === false || product.primaryCatId === 'Borrador') return;
                        if (!seenIds.has(product.id)) {
                            seenIds.add(product.id);
                            allProducts.push({ product, catName: cat.name || 'Carpintería' });
                        }
                    });
                }
            });

            const selections = [...allProducts].sort(() => 0.5 - Math.random()).slice(0, 10);

            if (selections.length > 0 && typeof window.setupInfiniteCarousel === 'function') {
                window.setupInfiniteCarousel(carouselEl, selections, ({ product, catName }, idx) => {
                    if (typeof window.createFeedProductCard === 'function') {
                        return window.createFeedProductCard(product, {
                            catName: catName || '',
                            extraClass: 'carousel-feed-item',
                            isCarousel: true
                        });
                    }
                    const pCard = document.createElement('div');
                    pCard.className = 'feed-card carousel-feed-item';
                    const rawCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                    const img = window.getThumbUrl ? window.getThumbUrl(rawCover) : rawCover;
                    pCard.innerHTML = `
                        <div class="feed-card-photo-container">
                            <img src="${img}" class="feed-card-img loaded" alt="${(product.title || '').replace(/"/g, '&quot;')}">
                        </div>
                        <div class="feed-card-info"><h3 class="feed-card-title">${product.title}</h3></div>
                    `;
                    pCard.addEventListener('click', () => {
                        if (window.showProductDetail) window.showProductDetail(product, catName);
                    });
                    return pCard;
                });

                if (typeof window.enableDragToScroll === 'function') {
                    window.enableDragToScroll(carouselEl);
                }
            }
        } catch (err) {
            console.warn('[MyOrders] Error renderizando Los más buscados:', err);
        }

        // 2. Pestaña / Bloque "Ver Catálogo Completo" (idéntico al Inicio)
        const fullCatHost = document.createElement('div');
        fullCatHost.style.marginTop = '1.25rem';
        hostEl.appendChild(fullCatHost);

        if (typeof window.initHomeInfiniteCatalog === 'function') {
            window.initHomeInfiniteCatalog(fullCatHost, {
                allowOutsideHome: true,
                idSuffix: 'myorders'
            });
        }
    }

    async function render() {
        const container = document.getElementById('my-orders-view-content');
        if (!container) return;

        container.innerHTML = `
            <div style="max-width: 1120px; margin: 0 auto; padding: 1.5rem 1rem;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 3rem; color: var(--text-muted, #64748b); font-weight: 600;">
                    <span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span>
                    <span>Cargando tus compras en tiempo real...</span>
                </div>
            </div>
        `;

        const { user, orders } = await fetchOrdersForCurrentUser();

        const loginInvitationHtml = !user ? `
            <div style="background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%); border: 1.5px solid #fde68a; border-radius: 20px; padding: 2rem 1.75rem; margin-bottom: 1.5rem; box-shadow: 0 8px 28px rgba(217, 119, 6, 0.08); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem;">
                <div style="display: flex; align-items: flex-start; gap: 1.15rem; flex: 1; min-width: 260px;">
                    <div style="width: 56px; height: 56px; border-radius: 16px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <span class="material-symbols-outlined" style="font-size: 32px;">person_add</span>
                    </div>
                    <div>
                        <span style="display: inline-block; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; color: #b45309; background: #fef3c7; padding: 2px 10px; border-radius: 50px; margin-bottom: 6px;">100% Gratis con Google</span>
                        <h3 style="margin: 0 0 6px 0; font-size: 1.25rem; font-weight: 900; color: #0f172a;">¡Registrate gratis para ver todas tus compras!</h3>
                        <p style="margin: 0; font-size: 0.88rem; color: #475569; line-height: 1.5;">
                            Con tu cuenta podés seguir la fabricación de tus muebles en vivo, ver tus comprobantes desde cualquier dispositivo y agilizar tus próximos envíos.
                        </p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <button type="button" class="btn-myorders-auth-trigger" style="background: var(--primary-color, #A0715B); color: #ffffff; border: none; border-radius: 50px; padding: 0.75rem 1.45rem; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(160, 113, 91, 0.3);">
                        <span class="material-symbols-outlined" style="font-size: 19px;">how_to_reg</span>
                        <span>Crear cuenta gratis</span>
                    </button>
                    <button type="button" class="btn-myorders-auth-trigger" style="background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; border-radius: 50px; padding: 0.75rem 1.25rem; font-weight: 700; font-size: 0.88rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
                        <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                        <span>Ingresar</span>
                    </button>
                </div>
            </div>
        ` : '';

        let ordersHtml = '';
        if (orders.length > 0) {
            ordersHtml = orders.map(o => {
                const st = getStatusMeta(o.status);
                const imgSrc = o.image || 'img/logo_provisional.png';
                const dateStr = formatDate(o.createdAt);
                const payLabel = o.paymentMethod === 'mercadopago' ? 'Mercado Pago' : 'Transferencia Bancaria';
                const shipText = o.shippingMethod === 'envio'
                    ? (o.shippingLabel || 'Envío a domicilio')
                    : 'Retiro por taller (Hurlingham)';
                const detailsParts = [o.selectedFinish, o.selectedMeasure].filter(Boolean);
                const detailsText = detailsParts.length > 0 ? detailsParts.join(' • ') : '';
                const waMsg = encodeURIComponent(`¡Hola La Tarima! Consulto por mi pedido #${o.id} (${o.title || 'Compra web'}).`);

                return `
                    <article class="my-order-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04); margin-bottom: 1rem;">
                        <div style="background: #f8fafc; padding: 0.7rem 1.15rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.82rem; color: #475569;">
                                <span style="font-weight: 700; color: #0f172a;">${dateStr}</span>
                                <span style="color: #cbd5e1;">|</span>
                                <span style="font-family: monospace; font-weight: 800; color: var(--primary-color, #A0715B);">Orden #${o.id}</span>
                            </div>
                            <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.76rem; font-weight: 800; color: ${st.color}; background: ${st.bg}; padding: 3px 10px; border-radius: 50px;">
                                <span class="material-symbols-outlined" style="font-size: 15px;">${st.icon}</span>
                                <span>${st.label}</span>
                            </span>
                        </div>

                        <div style="padding: 1.15rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                            <div style="display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 240px;">
                                <img src="${imgSrc}" alt="${o.title || 'Producto'}" onerror="this.src='img/logo_provisional.png'" style="width: 72px; height: 72px; border-radius: 12px; object-fit: cover; border: 1px solid #e2e8f0; background: #faf9f6; flex-shrink: 0;">
                                <div style="min-width: 0;">
                                    <h4 style="margin: 0 0 4px 0; font-size: 1rem; font-weight: 800; color: #0f172a;">${o.title || 'Pedido La Tarima'}</h4>
                                    ${detailsText ? `<div style="font-size: 0.8rem; color: #64748b; margin-bottom: 4px;">${detailsText}</div>` : ''}
                                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.78rem; color: #475569;">
                                        <span style="font-weight: 800; color: #0f172a; font-size: 0.92rem;">${formatPrice(o.amount)}</span>
                                        <span style="color: #cbd5e1;">•</span>
                                        <span>${payLabel}</span>
                                        <span style="color: #cbd5e1;">•</span>
                                        <span>${shipText}</span>
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <button type="button" class="btn-track-myorder" data-order-id="${o.id}" style="background: var(--primary-color, #A0715B); color: #ffffff; border: none; border-radius: 10px; padding: 0.6rem 1.05rem; font-weight: 700; font-size: 0.84rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 17px;">local_shipping</span>
                                    <span>Ver seguimiento</span>
                                </button>
                                <a href="https://wa.me/5491167007723?text=${waMsg}" target="_blank" rel="noopener" style="background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 10px; padding: 0.6rem 0.95rem; font-weight: 700; font-size: 0.84rem; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
                                    <span class="material-symbols-outlined" style="font-size: 17px;">chat</span>
                                    <span>Consultar</span>
                                </a>
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        } else if (user) {
            ordersHtml = `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 2.25rem 1.5rem; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.03); margin-bottom: 1rem;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: #f1f5f9; color: #64748b; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.85rem;">
                        <span class="material-symbols-outlined" style="font-size: 30px;">shopping_bag</span>
                    </div>
                    <h3 style="margin: 0 0 6px 0; font-size: 1.12rem; font-weight: 800; color: #0f172a;">Todavía no tenés compras registradas con ${user.email}</h3>
                    <p style="margin: 0; font-size: 0.86rem; color: #64748b; max-width: 460px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                        Cuando hagas un pedido verás acá el estado en vivo. Si ya compraste antes y tenés un código <strong>#LT-...</strong>, podés buscarlo arriba.
                    </p>
                </div>
            `;
        }

        container.innerHTML = `
            <div style="max-width: 1120px; margin: 0 auto; padding: 1.25rem 1rem 2.5rem;">
                <!-- Header de Mis Compras + Buscador rápido de código -->
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.35rem;">
                    <div>
                        <h2 style="margin: 0; font-size: 1.45rem; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: var(--primary-color, #A0715B); font-size: 28px;">shopping_bag</span>
                            <span>Mis Compras</span>
                        </h2>
                        <p style="margin: 3px 0 0 0; font-size: 0.85rem; color: #64748b;">
                            Historial de pedidos, comprobantes y seguimiento en tiempo real
                        </p>
                    </div>

                    <form id="form-myorders-lookup" style="display: flex; gap: 6px; align-items: center; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 50px; padding: 4px 6px 4px 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #64748b;">search</span>
                        <input type="text" id="input-myorders-lookup" placeholder="Buscar orden #LT-..." style="border: none; outline: none; font-size: 0.85rem; width: 170px; background: transparent;">
                        <button type="submit" style="background: #0f172a; color: #ffffff; border: none; border-radius: 50px; padding: 6px 14px; font-size: 0.8rem; font-weight: 700; cursor: pointer;">Rastrear</button>
                    </form>
                </div>

                ${loginInvitationHtml}

                <div id="my-orders-list-wrapper">
                    ${ordersHtml}
                </div>

                <!-- Descubrimiento de productos: Carrusel Los Más Buscados + Pestaña Ver Catálogo Completo -->
                <div id="my-orders-discovery-host"></div>
            </div>
        `;

        // Renderizar Carrusel "Los más buscados" + Pestaña "Ver Catálogo Completo" debajo
        const discoveryHost = document.getElementById('my-orders-discovery-host');
        renderDiscoverySections(discoveryHost);

        // Eventos
        container.querySelectorAll('.btn-myorders-auth-trigger').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (window.DesktopHeader && typeof window.DesktopHeader.triggerClientLogin === 'function') {
                    await window.DesktopHeader.triggerClientLogin();
                    render();
                } else if (window.AdminAuth && typeof window.AdminAuth.loginPublicStoreWithGoogle === 'function') {
                    await window.AdminAuth.loginPublicStoreWithGoogle();
                    render();
                }
            });
        });

        document.getElementById('form-myorders-lookup')?.addEventListener('submit', (e) => {
            e.preventDefault();
            let val = (document.getElementById('input-myorders-lookup')?.value || '').trim().toUpperCase();
            if (!val) return;
            if (!val.startsWith('LT-') && /^[0-9]+$/.test(val)) {
                val = 'LT-' + val;
            }
            openTrackingForOrder(val);
        });

        container.querySelectorAll('.btn-track-myorder').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-order-id');
                if (id) openTrackingForOrder(id);
            });
        });
    }

    window.saveMyLocalOrder = saveMyLocalOrder;
    window.MyOrders = {
        render,
        saveLocalOrder: saveMyLocalOrder,
        getLocalOrders
    };
})();
