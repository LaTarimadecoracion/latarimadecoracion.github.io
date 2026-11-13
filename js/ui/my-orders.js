/* =============================================================================
   js/ui/my-orders.js
   Módulo "Mis Compras" — Historial real de pedidos + Invitación de registro gratis
   + Carrusel "Los más buscados" + Desplegable "Ver Catálogo Completo" (igual al Inicio)
   ============================================================================= */

(function () {
    const LOCAL_ORDERS_KEY = 'latarima_my_orders';
    const WORKER_URL = 'https://super-shadow-4ad9.latarimadecoracion.workers.dev';
    const externalGetLocalOrders = (typeof window.getMyLocalOrders === 'function') ? window.getMyLocalOrders : null;
    const externalSaveMyLocalOrder = (typeof window.saveMyLocalOrder === 'function') ? window.saveMyLocalOrder : null;
    let pendingInlineOrderId = null;
    let inlineTrackingSeq = 0;

    function getLocalOrdersFallback() {
        try {
            const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
            if (!raw) return [];
            const list = JSON.parse(raw);
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function saveMyLocalOrderFallback(order) {
        if (!order || !order.id) return;
        try {
            const list = getLocalOrdersFallback();
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

    function getLocalOrders() {
        if (externalGetLocalOrders) {
            try {
                const res = externalGetLocalOrders();
                if (Array.isArray(res)) return res;
            } catch (e) {}
        }
        return getLocalOrdersFallback();
    }

    function saveMyLocalOrder(order) {
        if (externalSaveMyLocalOrder) {
            try {
                return externalSaveMyLocalOrder(order);
            } catch (e) {}
        }
        return saveMyLocalOrderFallback(order);
    }

    function removeLocalOrder(orderId) {
        if (!orderId) return;
        const target = String(orderId).trim().toUpperCase();
        try {
            const list = getLocalOrdersFallback();
            const next = list.filter(o => String(o && o.id || '').trim().toUpperCase() !== target);
            if (next.length !== list.length) {
                localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next));
            }
        } catch (e) {}
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

        // Si no hay usuario logueado con Google, mostramos los pedidos guardados en este celular / dispositivo
        if (!user || !userEmail) {
            const localList = getLocalOrders();
            const idsToRefresh = localList.map(o => o.id).filter(Boolean).slice(0, 10);
            await Promise.all(idsToRefresh.map(async (id) => {
                try {
                    const res = await fetch(`${WORKER_URL}/pedidos?id=${encodeURIComponent(id)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.success && data.order) {
                            const idx = localList.findIndex(o => String(o.id) === String(id));
                            if (idx !== -1) localList[idx] = { ...localList[idx], ...data.order };
                        }
                    }
                } catch(e) {}
            }));
            localList.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
            return { user: null, orders: localList };
        }

        // Si el usuario acaba de iniciar sesión, vinculamos automáticamente los pedidos de invitado de este dispositivo
        const rawLocal = getLocalOrders();
        let changedLocal = false;
        rawLocal.forEach(o => {
            if (!o.clientEmail || o.isGuestOrder) {
                o.clientEmail = userEmail;
                o.isGuestOrder = false;
                changedLocal = true;
            }
        });
        if (changedLocal) {
            try {
                localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(rawLocal));
            } catch(e) {}
        }

        const ordersMap = new Map();
        const addOrder = (ord) => {
            if (!ord || !ord.id) return;
            const prev = ordersMap.get(String(ord.id)) || {};
            ordersMap.set(String(ord.id), { ...prev, ...ord });
        };

        // 1. Pedidos locales guardados que pertenezcan al correo logueado
        const localList = getLocalOrders();
        localList.forEach(o => {
            const oEmail = (o.clientEmail || '').trim().toLowerCase();
            if (oEmail && oEmail === userEmail) {
                addOrder(o);
            }
        });

        // 2. Pedidos estáticos en ordersData que coincidan con el correo logueado
        if (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) {
            ordersData.forEach(o => {
                const oEmail = (o.clientEmail || '').trim().toLowerCase();
                if (oEmail && oEmail === userEmail) {
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

        // 4. Refrescar estado puntual y purgar pedidos eliminados desde Admin/Cloudflare
        const staticIds = new Set(
            (typeof ordersData !== 'undefined' && Array.isArray(ordersData))
                ? ordersData.map(o => String(o && o.id || '').trim().toUpperCase()).filter(Boolean)
                : []
        );
        const idsToRefresh = Array.from(ordersMap.keys()).slice(0, 20);
        await Promise.all(idsToRefresh.map(async (id) => {
            try {
                const res = await fetch(`${WORKER_URL}/pedidos?id=${encodeURIComponent(id)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success && data.order) {
                        addOrder(data.order);
                    } else if (data && data.success === false && !staticIds.has(String(id).toUpperCase())) {
                        ordersMap.delete(String(id));
                        removeLocalOrder(id);
                    }
                } else if (res.status === 404 && !staticIds.has(String(id).toUpperCase())) {
                    ordersMap.delete(String(id));
                    removeLocalOrder(id);
                }
            } catch (e) {}
        }));

        const merged = Array.from(ordersMap.values());
        merged.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        return { user, orders: merged };
    }

    function normalizeOrderCandidates(orderId) {
        const clean = String(orderId || '').trim().replace(/^#/, '');
        if (!clean) return [];
        const upper = clean.toUpperCase();
        const candidates = [];
        if (/^LT-/i.test(clean)) {
            candidates.push(upper);
            if (clean !== upper) candidates.push(clean);
            const stripped = upper.slice(3);
            if (stripped) candidates.push(stripped);
        } else {
            candidates.push(clean);
            if (upper !== clean) candidates.push(upper);
            if (/^[0-9]+$/.test(clean)) {
                candidates.push('LT-' + clean);
            }
        }
        return Array.from(new Set(candidates));
    }

    function getTrackingProgress(order) {
        const cfg = (typeof ordersConfig !== 'undefined' && ordersConfig) ? ordersConfig : {};
        const milestones = cfg.milestones || {};
        const st = String(order?.status || 'pendiente').toLowerCase();
        const isEnvio = (order?.deliveryMethod === 'envio' || order?.shippingMethod === 'envio');

        if (st.includes('cancelado')) {
            return {
                isCancelled: true,
                stepIndex: -1,
                percent: 0,
                steps: [],
                currentTitle: 'Pedido Cancelado',
                currentDesc: 'Este pedido fue cancelado. Si tenés dudas, escribinos por WhatsApp.'
            };
        }

        let stepIndex = 0;
        if (st.includes('entregado') || st.includes('completado')) {
            stepIndex = 3;
        } else if (st.includes('listo')) {
            stepIndex = 2;
        } else if (st.includes('proceso') || st.includes('produccion') || st.includes('carpinteria') || st.includes('armado') || st.includes('fabricacion') || st.includes('taller')) {
            stepIndex = 1;
        } else {
            stepIndex = 0;
        }

        const steps = [
            { label: 'Pendiente', icon: 'schedule' },
            { label: 'En producción', icon: 'carpenter' },
            { label: 'Listo', icon: 'inventory_2' },
            { label: 'Entregado', icon: 'check_circle' }
        ];

        const readyDesc = milestones.readyDesc || '¡Tu pedido ya está listo!';
        const deliveryDesc = isEnvio
            ? (milestones.envioDesc || 'Tu pedido se encuentra en proceso de despacho o en camino.')
            : (milestones.retiraDesc || 'Ya podés coordinar el retiro por nuestro taller.');

        const stepDescriptions = [
            'Tu orden está registrada y en cola de confirmación / preparación.',
            'Nuestro equipo está fabricando tu pedido en el taller.',
            `${readyDesc} ${deliveryDesc}`,
            isEnvio ? 'Pedido despachado y entregado al cliente.' : 'Pedido retirado y entregado. ¡Gracias por tu compra!'
        ];

        return {
            isCancelled: false,
            stepIndex,
            percent: ((stepIndex + 1) / steps.length) * 100,
            steps,
            currentTitle: steps[stepIndex].label,
            currentDesc: stepDescriptions[stepIndex]
        };
    }

    async function findOrderForTracking(orderId) {
        const candidates = normalizeOrderCandidates(orderId);
        if (candidates.length === 0) return null;

        // 1. Buscar primero en ordersData local
        if (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) {
            for (const cand of candidates) {
                const match = ordersData.find(o => String(o.id).toUpperCase() === cand.toUpperCase());
                if (match) return match;
            }
        }

        // 2. Consultar Cloudflare KV en vivo
        for (const cand of candidates) {
            try {
                const res = await fetch(`${WORKER_URL}/pedidos?id=${encodeURIComponent(cand)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success && data.order) {
                        return data.order;
                    }
                }
            } catch (e) {}
        }

        // 3. Fallback a pedidos guardados localmente en este dispositivo
        const localOrders = getLocalOrders();
        for (const cand of candidates) {
            const match = localOrders.find(o => String(o.id).toUpperCase() === cand.toUpperCase());
            if (match) return match;
        }

        // 4. Fallback en servidor local de desarrollo (/api/orders)
        if (window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            try {
                const resLocal = await fetch('/api/orders');
                if (resLocal.ok) {
                    const dataLocal = await resLocal.json();
                    const list = Array.isArray(dataLocal) ? dataLocal : (Array.isArray(dataLocal?.orders) ? dataLocal.orders : []);
                    for (const cand of candidates) {
                        const match = list.find(o => String(o.id).toUpperCase() === cand.toUpperCase());
                        if (match) return match;
                    }
                }
            } catch (e) {}
        }

        return null;
    }

    function goBackToOrdersList() {
        if (typeof window.navigateToView === 'function') {
            window.navigateToView('view-my-orders');
        } else {
            render({});
        }
    }

    async function renderTrackingScreen(orderId) {
        const container = document.getElementById('my-orders-view-content');
        if (!container) return;

        const cleanId = String(orderId || '').trim().replace(/^#/, '');
        if (!cleanId) {
            render({});
            return;
        }

        const reqSeq = ++inlineTrackingSeq;
        container.innerHTML = `
            <div style="max-width: 920px; margin: 0 auto; padding: 1.5rem 1rem 3rem;">
                <div style="margin-bottom: 1.25rem;">
                    <button type="button" id="btn-back-to-myorders" style="background: #ffffff; color: #0f172a; border: 1.5px solid #e2e8f0; border-radius: 50px; padding: 0.5rem 1.05rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(15,23,42,0.04);">
                        <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                        <span>Volver a Mis Compras</span>
                    </button>
                </div>
                <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 2.5rem 1.5rem; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05); display: flex; align-items: center; justify-content: center; gap: 10px; color: #0f172a; font-weight: 700;">
                    <span class="material-symbols-outlined" style="animation: spin 1s linear infinite; color: var(--primary-color, #A0715B);">sync</span>
                    <span>Consultando seguimiento de orden #${escapeHtml(cleanId)}...</span>
                </div>
            </div>
        `;
        container.querySelector('#btn-back-to-myorders')?.addEventListener('click', goBackToOrdersList);

        const order = await findOrderForTracking(cleanId);
        if (reqSeq !== inlineTrackingSeq) return;

        if (!order) {
            const helpWa = encodeURIComponent(`¡Hola La Tarima! Busqué mi orden #${cleanId} en la web y no apareció. ¿Me ayudan a revisarla?`);
            container.innerHTML = `
                <div style="max-width: 920px; margin: 0 auto; padding: 1.5rem 1rem 3rem;">
                    <div style="margin-bottom: 1.25rem;">
                        <button type="button" id="btn-back-to-myorders" style="background: #ffffff; color: #0f172a; border: 1.5px solid #e2e8f0; border-radius: 50px; padding: 0.5rem 1.05rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                            <span>Volver a Mis Compras</span>
                        </button>
                    </div>
                    <div style="background: #ffffff; border: 1.5px solid #fecaca; border-radius: 20px; padding: 2rem; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05); text-align: center;">
                        <div style="width: 54px; height: 54px; border-radius: 16px; background: #fee2e2; color: #b91c1c; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.9rem;">
                            <span class="material-symbols-outlined" style="font-size: 28px;">search_off</span>
                        </div>
                        <h3 style="margin: 0 0 6px 0; font-size: 1.15rem; font-weight: 800; color: #0f172a;">No encontramos la orden #${escapeHtml(cleanId)}</h3>
                        <p style="margin: 0 auto 1.35rem; max-width: 460px; font-size: 0.88rem; color: #64748b; line-height: 1.5;">
                            Verificá que el número o código (ej. <strong>500102800</strong> o <strong>LT-...</strong>) sea correcto. Si el problema persiste, consultanos directo por WhatsApp.
                        </p>
                        <div style="display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center;">
                            <a href="https://wa.me/5491167007723?text=${helpWa}" target="_blank" rel="noopener" style="background: #16a34a; color: #ffffff; border-radius: 50px; padding: 0.65rem 1.2rem; font-weight: 700; font-size: 0.86rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">chat</span>
                                <span>Consultar por WhatsApp</span>
                            </a>
                            <button type="button" id="btn-back-to-myorders-2" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 50px; padding: 0.65rem 1.2rem; font-weight: 700; font-size: 0.86rem; cursor: pointer;">
                                Volver a Mis Compras
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.querySelector('#btn-back-to-myorders')?.addEventListener('click', goBackToOrdersList);
            container.querySelector('#btn-back-to-myorders-2')?.addEventListener('click', goBackToOrdersList);
            return;
        }

        const st = getStatusMeta(order.status);
        const progress = getTrackingProgress(order);
        const displayId = order.id || cleanId;
        const dateStr = formatDate(order.createdAt || order.creationDate || order.startDate);
        const productTitle = order.productName || order.title || (Array.isArray(order.cartItems) && order.cartItems[0]?.title) || 'Pedido La Tarima';
        const imgSrc = order.image || (Array.isArray(order.cartItems) && order.cartItems[0]?.image) || 'img/logo_provisional.png';
        const finish = order.selectedFinish || (Array.isArray(order.cartItems) && order.cartItems[0]?.finish) || '';
        const measure = order.selectedMeasure || (Array.isArray(order.cartItems) && order.cartItems[0]?.measure) || '';
        const detailLine = [finish, measure].filter(Boolean).join(' • ');
        const totalAmount = (order.totalAmount !== undefined) ? order.totalAmount : order.amount;
        const deliveryMethod = String(order.deliveryMethod || order.shippingMethod || 'retira').toLowerCase();
        const isEnvio = deliveryMethod === 'envio';
        const cfg = (typeof ordersConfig !== 'undefined' && ordersConfig) ? ordersConfig : {};
        const milestones = cfg.milestones || {};
        const deliveryLabel = isEnvio
            ? (order.shippingLabel || milestones.envioTitle || 'Envío a domicilio')
            : (milestones.retiraTitle || 'Retiro por taller (Hurlingham)');

        let dispatchHtml = '';
        if (isEnvio && order.dispatchInfo) {
            const info = order.dispatchInfo;
            const courierLabel = info.courierName || info.courier || 'Transporte asignado';
            const trackingCode = info.trackingNumber ? String(info.trackingNumber).trim() : '';
            const trackingUrl = info.trackingUrl || info.url || '';
            dispatchHtml = `
                <div style="margin-top: 1rem; padding: 0.9rem 1rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div style="font-size: 0.86rem; color: #1e40af; font-weight: 600;">
                        <strong>${escapeHtml(courierLabel)}</strong>${trackingCode ? ` • Guía: <code style="background:#fff;padding:2px 7px;border-radius:6px;border:1px solid #bfdbfe;font-weight:800;">${escapeHtml(trackingCode)}</code>` : ''}
                    </div>
                    ${trackingUrl ? `<a href="${escapeHtml(trackingUrl)}" target="_blank" rel="noopener" style="background: #2563eb; color: #fff; text-decoration: none; padding: 6px 14px; border-radius: 50px; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">Seguir envío <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span></a>` : ''}
                </div>
            `;
        }

        let itemsHtml = '';
        if (Array.isArray(order.cartItems) && order.cartItems.length > 0) {
            itemsHtml = `
                <div style="margin-top: 1rem; padding-top: 0.9rem; border-top: 1px dashed #e2e8f0;">
                    <div style="font-size: 0.76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px;">Detalle de ítems</div>
                    <ul style="margin: 0; padding-left: 1.15rem; font-size: 0.86rem; color: #334155; display: grid; gap: 5px;">
                        ${order.cartItems.map(it => {
                            const qty = Number(it.quantity || it.qty || 1);
                            const meta = [it.finish || it.selectedFinish, it.measure || it.selectedMeasure].filter(Boolean).join(' • ');
                            return `<li><strong>${qty}x</strong> ${escapeHtml(it.title || it.name || 'Producto')}${meta ? ` <span style="color:#64748b;">(${escapeHtml(meta)})</span>` : ''}</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        }

        const progressHtml = progress.isCancelled
            ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 14px; padding: 1rem 1.15rem; display: flex; align-items: center; gap: 12px; color: #b91c1c;">
                    <span class="material-symbols-outlined" style="font-size: 24px;">cancel</span>
                    <div style="font-size: 0.88rem; line-height: 1.45;">
                        <strong>${escapeHtml(progress.currentTitle)}:</strong> ${escapeHtml(progress.currentDesc)}
                    </div>
                </div>
            `
            : `
                <div style="padding: 1.15rem 1.25rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 0.75rem; flex-wrap: wrap;">
                        <span style="font-size: 0.9rem; font-weight: 800; color: #0f172a;">Paso actual: ${escapeHtml(progress.currentTitle)}</span>
                        <span style="font-size: 0.82rem; color: #475569;">${escapeHtml(progress.currentDesc)}</span>
                    </div>
                    <div style="height: 9px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 1rem;">
                        <div style="height: 100%; width: ${progress.percent}%; background: var(--primary-color, #A0715B); border-radius: 999px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px;">
                        ${progress.steps.map((step, idx) => {
                            const done = idx <= progress.stepIndex;
                            const isCurrent = idx === progress.stepIndex;
                            return `
                                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 11px; background: ${isCurrent ? '#ffffff' : 'transparent'}; border: 1px solid ${isCurrent ? 'rgba(160,113,91,0.35)' : 'transparent'}; opacity: ${done ? '1' : '0.5'}; box-shadow: ${isCurrent ? '0 2px 8px rgba(15,23,42,0.05)' : 'none'};">
                                    <span class="material-symbols-outlined" style="font-size: 19px; color: ${done ? 'var(--primary-color, #A0715B)' : '#94a3b8'};">${step.icon}</span>
                                    <span style="font-size: 0.8rem; font-weight: ${isCurrent ? '800' : '600'}; color: ${done ? '#0f172a' : '#64748b'};">${escapeHtml(step.label)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

        const waMsg = encodeURIComponent(`¡Hola La Tarima! Consulto por el seguimiento de mi pedido #${displayId} (${productTitle}).`);

        container.innerHTML = `
            <div style="max-width: 920px; margin: 0 auto; padding: 1.25rem 1rem 3rem;">
                <!-- Barra superior de navegación de vuelta -->
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 1.25rem;">
                    <button type="button" id="btn-back-to-myorders" style="background: #ffffff; color: #0f172a; border: 1.5px solid #e2e8f0; border-radius: 50px; padding: 0.5rem 1.1rem; font-size: 0.86rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(15,23,42,0.04);">
                        <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                        <span>Volver a Mis Compras</span>
                    </button>
                    <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 800; color: ${st.color}; background: ${st.bg}; padding: 6px 14px; border-radius: 50px;">
                        <span class="material-symbols-outlined" style="font-size: 17px;">${st.icon}</span>
                        <span>${escapeHtml(st.label)}</span>
                    </span>
                </div>

                <!-- Tarjeta dedicada de seguimiento -->
                <section aria-label="Seguimiento de pedido" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 22px; overflow: hidden; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);">
                    <div style="background: linear-gradient(135deg, #faf8f5 0%, #f8fafc 100%); padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--primary-color, #A0715B); margin-bottom: 3px;">
                                Seguimiento en tiempo real
                            </div>
                            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 900; color: #0f172a;">
                                Orden #${escapeHtml(displayId)}
                            </h2>
                        </div>
                        <div style="font-size: 0.84rem; color: #475569; font-weight: 600;">
                            Fecha del pedido: <strong style="color: #0f172a;">${escapeHtml(dateStr)}</strong>
                        </div>
                    </div>

                    <div style="padding: 1.5rem; display: grid; gap: 1.35rem;">
                        ${progressHtml}

                        <div style="display: flex; align-items: flex-start; gap: 1.15rem; flex-wrap: wrap; padding: 1.15rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
                            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(productTitle)}" onerror="this.src='img/logo_provisional.png'" style="width: 96px; height: 96px; border-radius: 14px; object-fit: cover; border: 1px solid #e2e8f0; background: #faf9f6; flex-shrink: 0;">
                            <div style="min-width: 220px; flex: 1;">
                                <h3 style="margin: 0 0 4px 0; font-size: 1.12rem; font-weight: 800; color: #0f172a;">${escapeHtml(productTitle)}</h3>
                                ${detailLine ? `<div style="font-size: 0.86rem; color: #475569; margin-bottom: 5px;">${escapeHtml(detailLine)}</div>` : ''}
                                ${order.description ? `<p style="margin: 0 0 8px 0; font-size: 0.85rem; color: #64748b; line-height: 1.45;">${escapeHtml(order.description)}</p>` : ''}
                                <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.86rem; color: #334155; margin-top: 8px;">
                                    ${totalAmount !== undefined ? `<span style="font-weight: 900; color: #0f172a; font-size: 1.05rem;">${formatPrice(totalAmount)}</span><span style="color: #cbd5e1;">•</span>` : ''}
                                    ${order.paymentMethod ? `<span style="font-weight: 600;">${escapeHtml(order.paymentMethod)}</span><span style="color: #cbd5e1;">•</span>` : ''}
                                    <span style="display: inline-flex; align-items: center; gap: 5px; font-weight: 600;">
                                        <span class="material-symbols-outlined" style="font-size: 17px; color: var(--primary-color, #A0715B);">${isEnvio ? 'local_shipping' : 'storefront'}</span>
                                        ${escapeHtml(deliveryLabel)}
                                    </span>
                                </div>
                                ${itemsHtml}
                                ${dispatchHtml}
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding-top: 0.25rem;">
                            <span style="font-size: 0.82rem; color: #64748b;">¿Tenés alguna duda o querés coordinar el retiro/envío?</span>
                            <a href="https://wa.me/5491167007723?text=${waMsg}" target="_blank" rel="noopener" style="background: #16a34a; color: #ffffff; border: none; border-radius: 50px; padding: 0.7rem 1.35rem; font-weight: 700; font-size: 0.88rem; text-decoration: none; display: inline-flex; align-items: center; gap: 7px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.22);">
                                <span class="material-symbols-outlined" style="font-size: 19px;">chat</span>
                                <span>Consultar por WhatsApp</span>
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        `;

        container.querySelector('#btn-back-to-myorders')?.addEventListener('click', goBackToOrdersList);
    }

    function openTrackingForOrder(orderId) {
        if (!orderId) return;
        const cleanId = String(orderId).trim().replace(/^#/, '');
        if (!cleanId) return;
        if (typeof window.navigateToView === 'function') {
            window.navigateToView('view-pedidos', { orderId: cleanId });
            return;
        }
        window.open(`pedidos/index.html?id=${encodeURIComponent(cleanId)}`, '_blank');
    }

    function renderDiscoverySections(hostEl) {
        if (typeof window.renderProductDiscoverySections === 'function') {
            window.renderProductDiscoverySections(hostEl, { idSuffix: 'myorders' });
        }
    }

    async function render(options = {}) {
        const viewEl = document.getElementById('view-my-orders');
        if (options && options.orderId && viewEl && !viewEl.classList.contains('active') && typeof window.navigateToView === 'function') {
            pendingInlineOrderId = options.orderId;
            window.navigateToView('view-my-orders');
            return;
        }

        const urlParams = (typeof window !== 'undefined' && window.location)
            ? new URLSearchParams(window.location.search)
            : null;
        const urlOrderId = urlParams ? (urlParams.get('id') || urlParams.get('order') || '') : '';
        const targetOrderId = (options && options.orderId !== undefined)
            ? options.orderId
            : (pendingInlineOrderId || urlOrderId || '');
        pendingInlineOrderId = null;

        if (targetOrderId) {
            await renderTrackingScreen(targetOrderId);
            return;
        }
        ++inlineTrackingSeq;

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

        let loginInvitationHtml = '';
        if (!user) {
            const hasLocalOrders = orders.length > 0;
            loginInvitationHtml = `
            <div style="background: ${hasLocalOrders ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)'}; border: 1.5px solid ${hasLocalOrders ? '#86efac' : '#fde68a'}; border-radius: 20px; padding: ${hasLocalOrders ? '1.35rem 1.5rem' : '2rem 1.75rem'}; margin-bottom: 1.5rem; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.05); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1.25rem;">
                <div style="display: flex; align-items: flex-start; gap: 1.15rem; flex: 1; min-width: 260px;">
                    <div style="width: 54px; height: 54px; border-radius: 16px; background: ${hasLocalOrders ? '#dcfce7' : '#fef3c7'}; color: ${hasLocalOrders ? '#16a34a' : '#d97706'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <span class="material-symbols-outlined" style="font-size: 30px;">${hasLocalOrders ? 'phonelink_setup' : 'person_add'}</span>
                    </div>
                    <div>
                        <span style="display: inline-block; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; color: ${hasLocalOrders ? '#15803d' : '#b45309'}; background: ${hasLocalOrders ? '#dcfce7' : '#fef3c7'}; padding: 2px 10px; border-radius: 50px; margin-bottom: 6px;">
                            ${hasLocalOrders ? '📱 Pedidos guardados en este celular' : '100% Gratis con Google'}
                        </span>
                        <h3 style="margin: 0 0 4px 0; font-size: 1.22rem; font-weight: 900; color: #0f172a;">
                            ${hasLocalOrders ? '¿Querés vincular tus pedidos para no perderlos nunca?' : '¡Registrate gratis para ver todas tus compras!'}
                        </h3>
                        <p style="margin: 0; font-size: 0.88rem; color: #475569; line-height: 1.5;">
                            ${hasLocalOrders 
                                ? 'Hiciste tu compra como invitado. Si iniciás sesión con Google en 1 clic, tus pedidos se sincronizan en la nube para consultarlos desde cualquier PC o celular y no perder tus comprobantes.' 
                                : 'Con tu cuenta podés seguir la fabricación de tus muebles en vivo, ver tus comprobantes desde cualquier dispositivo y agilizar tus próximos envíos.'}
                        </p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <button type="button" class="btn-myorders-auth-trigger" style="background: ${hasLocalOrders ? '#16a34a' : 'var(--primary-color, #A0715B)'}; color: #ffffff; border: none; border-radius: 50px; padding: 0.8rem 1.45rem; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px ${hasLocalOrders ? 'rgba(22, 163, 74, 0.28)' : 'rgba(160, 113, 91, 0.3)'};">
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="flex-shrink:0;"><path fill="#ffffff" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/><path fill="#ffffff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"/><path fill="#ffffff" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"/><path fill="#ffffff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"/></svg>
                        <span>${hasLocalOrders ? 'Vincular pedidos con Google' : 'Ingresar con Google'}</span>
                    </button>
                </div>
            </div>
            `;
        }

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
        } else {
            ordersHtml = `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 2.25rem 1.5rem; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.03); margin-bottom: 1rem;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: #f1f5f9; color: #64748b; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.85rem;">
                        <span class="material-symbols-outlined" style="font-size: 30px;">receipt_long</span>
                    </div>
                    <h3 style="margin: 0 0 6px 0; font-size: 1.12rem; font-weight: 800; color: #0f172a;">
                        ${user ? `Todavía no tenés compras registradas con ${user.email}` : 'No tenés compras guardadas en este dispositivo'}
                    </h3>
                    <p style="margin: 0; font-size: 0.86rem; color: #64748b; max-width: 460px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                        ${user ? 'Cuando hagas un pedido verás acá el estado en vivo. Si ya compraste antes con otro código o como invitado, podés buscarlo arriba.' : 'Si compraste como invitado o desde otro dispositivo, podés ingresar tu código <strong>#LT-...</strong> en el buscador de arriba.'}
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
                        <input type="text" id="input-myorders-lookup" placeholder="Orden o código #LT-..." style="border: none; outline: none; font-size: 0.85rem; width: 185px; background: transparent;">
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
            let val = (document.getElementById('input-myorders-lookup')?.value || '').trim().replace(/^#/, '');
            if (!val) return;
            if (/^lt-/i.test(val)) {
                val = 'LT-' + val.slice(3).toUpperCase();
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

    if (typeof window.saveMyLocalOrder !== 'function') {
        window.saveMyLocalOrder = saveMyLocalOrder;
    }
    if (typeof window.getMyLocalOrders !== 'function') {
        window.getMyLocalOrders = getLocalOrders;
    }
    window.MyOrders = {
        render,
        trackOrder: openTrackingForOrder,
        saveLocalOrder: saveMyLocalOrder,
        getLocalOrders,
        removeLocalOrder
    };
})();
