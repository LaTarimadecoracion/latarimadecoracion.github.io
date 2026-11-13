// js/ui/cart-drawer.js
// --- MINI-CART DRAWER LATERAL (SIDE DRAWER) ---
// Abre un panel deslizante lateral con el resumen del carrito permitiendo elegir
// entre "Pagar ahora" (checkout express) o "Seguir explorando el catálogo".

(function() {
    'use strict';

    let isDrawerOpen = false;

    function formatPrice(val) {
        if (!val || isNaN(val)) return '$0';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val);
    }

    function injectStyles() {
        if (document.getElementById('cart-drawer-styles')) return;
        const style = document.createElement('style');
        style.id = 'cart-drawer-styles';
        style.textContent = `
            /* Drawer Lateral & Overlay */
            #cart-drawer-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.5);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                z-index: 99998;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s;
            }
            #cart-drawer-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            #cart-drawer {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                max-width: 440px;
                background: #ffffff;
                z-index: 99999;
                box-shadow: -10px 0 35px rgba(0, 0, 0, 0.22);
                transform: translateX(100%);
                transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                font-family: inherit;
            }
            #cart-drawer.active {
                transform: translateX(0);
            }

            /* Header */
            .cart-drawer-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem 1.25rem;
                border-bottom: 1px solid #f1f5f9;
                background: #ffffff;
                flex-shrink: 0;
            }
            .cart-drawer-title-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .cart-drawer-title {
                font-size: 1.15rem;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .cart-drawer-count-badge {
                background: #f1f5f9;
                color: #475569;
                font-size: 0.75rem;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 12px;
            }
            .cart-drawer-close-btn {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                color: #64748b;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            .cart-drawer-close-btn:hover {
                background: #f1f5f9;
                color: #0f172a;
                transform: rotate(90deg);
            }

            /* Promo Banner */
            .cart-drawer-promo-banner {
                background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
                border-bottom: 1px solid #bbf7d0;
                padding: 0.65rem 1.25rem;
                font-size: 0.78rem;
                font-weight: 700;
                color: #15803d;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                text-align: center;
                flex-shrink: 0;
            }

            /* Scrollable Items Container */
            .cart-drawer-body {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
                -webkit-overflow-scrolling: touch;
            }

            /* Item Card */
            .cart-drawer-item {
                display: flex;
                gap: 12px;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 14px;
                padding: 10px;
                position: relative;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .cart-drawer-item:hover {
                border-color: #cbd5e1;
                box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            }
            .cart-drawer-item-thumb {
                width: 68px;
                height: 68px;
                border-radius: 10px;
                object-fit: cover;
                background: #f1f5f9;
                flex-shrink: 0;
                border: 1px solid #e2e8f0;
            }
            .cart-drawer-item-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .cart-drawer-item-title {
                font-size: 0.86rem;
                font-weight: 700;
                color: #0f172a;
                margin: 0 0 2px 0;
                line-height: 1.25;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .cart-drawer-item-variants {
                font-size: 0.72rem;
                color: #64748b;
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                margin-bottom: 6px;
            }
            .cart-drawer-item-chip {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 1px 6px;
                border-radius: 6px;
            }
            .cart-drawer-item-bottom {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .cart-drawer-stepper {
                display: flex;
                align-items: center;
                border: 1.5px solid #cbd5e1;
                border-radius: 8px;
                overflow: hidden;
                background: #ffffff;
            }
            .cart-drawer-stepper-btn {
                background: #f8fafc;
                border: none;
                width: 26px;
                height: 26px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #334155;
                font-weight: 800;
                font-size: 0.95rem;
                transition: background 0.15s;
                user-select: none;
            }
            .cart-drawer-stepper-btn:hover {
                background: #e2e8f0;
                color: #0f172a;
            }
            .cart-drawer-stepper-val {
                width: 28px;
                text-align: center;
                font-size: 0.82rem;
                font-weight: 700;
                color: #0f172a;
            }
            .cart-drawer-item-price {
                font-size: 0.9rem;
                font-weight: 800;
                color: #0f172a;
                text-align: right;
            }
            .cart-drawer-item-remove {
                background: transparent;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                padding: 4px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.15s;
            }
            .cart-drawer-item-remove:hover {
                color: #ef4444;
                background: #fef2f2;
            }

            /* Empty state */
            .cart-drawer-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 3rem 1.5rem;
                flex: 1;
            }
            .cart-drawer-empty-icon {
                font-size: 56px;
                color: #cbd5e1;
                margin-bottom: 1rem;
            }
            .cart-drawer-empty-title {
                font-size: 1.05rem;
                font-weight: 800;
                color: #1e293b;
                margin: 0 0 6px 0;
            }
            .cart-drawer-empty-desc {
                font-size: 0.82rem;
                color: #64748b;
                margin: 0 0 1.5rem 0;
                max-width: 260px;
                line-height: 1.4;
            }

            /* Sticky Footer */
            .cart-drawer-footer {
                border-top: 1px solid #e2e8f0;
                background: #f8fafc;
                padding: 1.15rem 1.25rem;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .cart-drawer-totals {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .cart-drawer-total-row {
                display: flex;
                justify-content: space-between;
                font-size: 0.82rem;
                color: #64748b;
            }
            .cart-drawer-discount-row {
                display: flex;
                justify-content: space-between;
                font-size: 0.84rem;
                color: #15803d;
                font-weight: 700;
            }
            .cart-drawer-final-row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                font-size: 1.15rem;
                font-weight: 900;
                color: #0f172a;
                margin-top: 4px;
                padding-top: 6px;
                border-top: 1px dashed #cbd5e1;
            }
            .cart-drawer-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 6px;
            }
            .btn-cart-drawer-checkout {
                background: #0f172a;
                color: #ffffff;
                border: none;
                border-radius: 12px;
                padding: 0.88rem 1rem;
                font-size: 0.92rem;
                font-weight: 800;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-shadow: 0 4px 14px rgba(15,23,42,0.22);
                transition: transform 0.15s, background 0.15s;
                text-decoration: none;
            }
            .btn-cart-drawer-checkout:hover {
                background: #1e293b;
                transform: translateY(-1px);
            }
            .btn-cart-drawer-checkout:active {
                transform: translateY(0);
            }
            .btn-cart-drawer-continue {
                background: #ffffff;
                color: #334155;
                border: 1.5px solid #cbd5e1;
                border-radius: 12px;
                padding: 0.72rem 1rem;
                font-size: 0.85rem;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.15s;
            }
            .btn-cart-drawer-continue:hover {
                background: #f1f5f9;
                color: #0f172a;
                border-color: #94a3b8;
            }
            .cart-drawer-detail-link {
                text-align: center;
                font-size: 0.75rem;
                color: #0284c7;
                font-weight: 700;
                cursor: pointer;
                text-decoration: none;
                margin-top: 2px;
            }
            .cart-drawer-detail-link:hover {
                text-decoration: underline;
            }

            @media (max-width: 480px) {
                #cart-drawer {
                    max-width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createDrawerDOM() {
        if (document.getElementById('cart-drawer')) return;
        injectStyles();

        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'cart-drawer-overlay';
        overlay.addEventListener('click', closeDrawer);

        // Drawer
        const drawer = document.createElement('aside');
        drawer.id = 'cart-drawer';
        drawer.setAttribute('aria-label', 'Carrito de compras');
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');

        drawer.innerHTML = `
            <div class="cart-drawer-header">
                <div class="cart-drawer-title-wrap">
                    <h2 class="cart-drawer-title">
                        <span class="material-symbols-outlined" style="color: #c0510a; font-size: 22px;">shopping_bag</span>
                        <span>Tu Carrito</span>
                    </h2>
                    <span class="cart-drawer-count-badge" id="cart-drawer-badge">0</span>
                </div>
                <button type="button" class="cart-drawer-close-btn" id="cart-drawer-close-btn" aria-label="Cerrar carrito">
                    <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
                </button>
            </div>

            <div class="cart-drawer-promo-banner">
                <span class="material-symbols-outlined" style="font-size: 18px; color: #16a34a;">percent</span>
                <span>¡10% DE DESCUENTO pagando por Transferencia Directa!</span>
            </div>

            <div class="cart-drawer-body" id="cart-drawer-items">
                <!-- Se inyecta dinámicamente con renderDrawerItems -->
            </div>

            <div class="cart-drawer-footer" id="cart-drawer-footer">
                <div class="cart-drawer-totals">
                    <div class="cart-drawer-total-row">
                        <span>Subtotal de Lista:</span>
                        <span id="cart-drawer-subtotal" style="font-weight: 700; color: #0f172a;">$0</span>
                    </div>
                    <div class="cart-drawer-discount-row">
                        <span>🎉 Descuento Transferencia (-10%):</span>
                        <span id="cart-drawer-discount">-$0</span>
                    </div>
                    <div class="cart-drawer-final-row">
                        <span>Total estimado:</span>
                        <span id="cart-drawer-total" style="color: #15803d;">$0</span>
                    </div>
                </div>

                <div class="cart-drawer-actions">
                    <button type="button" class="btn-cart-drawer-checkout" id="btn-cart-drawer-checkout">
                        <span class="material-symbols-outlined" style="font-size: 20px;">bolt</span>
                        <span>PAGAR AHORA (Ir al Checkout)</span>
                    </button>
                    <button type="button" class="btn-cart-drawer-continue" id="btn-cart-drawer-continue">
                        <span class="material-symbols-outlined" style="font-size: 18px;">storefront</span>
                        <span>Seguir explorando el catálogo</span>
                    </button>
                    <a href="#" class="cart-drawer-detail-link" id="cart-drawer-detail-link">
                        Ver carrito completo y cotizar envíos →
                    </a>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(drawer);

        // Bind events
        document.getElementById('cart-drawer-close-btn')?.addEventListener('click', closeDrawer);
        document.getElementById('btn-cart-drawer-continue')?.addEventListener('click', closeDrawer);

        document.getElementById('btn-cart-drawer-checkout')?.addEventListener('click', () => {
            closeDrawer();
            if (typeof window.triggerCartCheckout === 'function') {
                window.triggerCartCheckout();
            } else if (window.CarritoModule && typeof window.CarritoModule.triggerCheckout === 'function') {
                window.CarritoModule.triggerCheckout();
            } else if (window.navigateToView) {
                window.navigateToView('view-profile');
            }
        });

        document.getElementById('cart-drawer-detail-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            closeDrawer();
            if (window.navigateToView) {
                window.navigateToView('view-profile');
            }
        });

        // Cerrar con Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isDrawerOpen) {
                closeDrawer();
            }
        });
    }

    function getCartItems() {
        try {
            if (window.CarritoModule && typeof window.CarritoModule.getItems === 'function') {
                return window.CarritoModule.getItems();
            }
            const raw = localStorage.getItem('cartItems');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function renderDrawerItems() {
        const container = document.getElementById('cart-drawer-items');
        const footer = document.getElementById('cart-drawer-footer');
        const badge = document.getElementById('cart-drawer-badge');
        if (!container) return;

        const items = getCartItems();
        const totalItemsCount = items.reduce((acc, i) => acc + (i.qty || 1), 0);

        if (badge) {
            badge.textContent = `${totalItemsCount} ${totalItemsCount === 1 ? 'producto' : 'productos'}`;
        }

        if (items.length === 0) {
            container.innerHTML = `
                <div class="cart-drawer-empty">
                    <span class="material-symbols-outlined cart-drawer-empty-icon">remove_shopping_cart</span>
                    <h3 class="cart-drawer-empty-title">Tu carrito está vacío</h3>
                    <p class="cart-drawer-empty-desc">Explorá nuestro catálogo de madera maciza y agregá lo que más te guste.</p>
                    <button type="button" class="btn-cart-drawer-checkout" style="padding: 0.75rem 1.25rem; font-size: 0.85rem;" onclick="window.CartDrawer.close(); if(window.navigateToView) window.navigateToView('view-catalog');">
                        <span class="material-symbols-outlined" style="font-size: 18px;">grid_view</span>
                        <span>Explorar el Catálogo</span>
                    </button>
                </div>
            `;
            if (footer) footer.style.display = 'none';
            return;
        }

        if (footer) footer.style.display = 'flex';

        let subtotal = 0;
        let html = '';

        items.forEach((item, index) => {
            const qty = item.qty || 1;
            const price = Number(item.price) || 0;
            const itemTotal = price * qty;
            subtotal += itemTotal;

            const chips = [];
            if (item.acabado && item.acabado !== 'Único') chips.push(`Acabado: ${item.acabado}`);
            if (item.medida) chips.push(`Medida: ${item.medida}`);
            if (item.opcion) chips.push(item.opcion);

            const img = item.image || 'img/logo_provisional.png';

            html += `
                <div class="cart-drawer-item" data-index="${index}">
                    <img src="${img}" alt="${item.title || 'Producto'}" class="cart-drawer-item-thumb" loading="lazy" onerror="this.src='img/logo_provisional.png'">
                    <div class="cart-drawer-item-info">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                                <h4 class="cart-drawer-item-title" title="${item.title}">${item.title}</h4>
                                <button type="button" class="cart-drawer-item-remove" onclick="window.CartDrawer.removeItem(${index})" title="Eliminar ítem">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                                </button>
                            </div>
                            <div class="cart-drawer-item-variants">
                                ${chips.map(c => `<span class="cart-drawer-item-chip">${c}</span>`).join('')}
                            </div>
                        </div>

                        <div class="cart-drawer-item-bottom">
                            <div class="cart-drawer-stepper">
                                <button type="button" class="cart-drawer-stepper-btn" onclick="window.CartDrawer.changeQty(${index}, -1)" title="Restar">-</button>
                                <span class="cart-drawer-stepper-val">${qty}</span>
                                <button type="button" class="cart-drawer-stepper-btn" onclick="window.CartDrawer.changeQty(${index}, 1)" title="Sumar">+</button>
                            </div>
                            <div class="cart-drawer-item-price">
                                ${price > 0 ? formatPrice(itemTotal) : '<span style="font-size:0.75rem; color:#64748b;">A consultar</span>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Actualizar totales en el footer
        const discountVal = Math.round((subtotal * 0.10) / 100) * 100;
        const finalVal = Math.max(0, subtotal - discountVal);

        const elSubtotal = document.getElementById('cart-drawer-subtotal');
        const elDiscount = document.getElementById('cart-drawer-discount');
        const elTotal = document.getElementById('cart-drawer-total');

        if (elSubtotal) elSubtotal.textContent = formatPrice(subtotal);
        if (elDiscount) elDiscount.textContent = `-${formatPrice(discountVal)}`;
        if (elTotal) elTotal.textContent = formatPrice(finalVal);
    }

    function openDrawer() {
        createDrawerDOM();
        renderDrawerItems();

        const overlay = document.getElementById('cart-drawer-overlay');
        const drawer = document.getElementById('cart-drawer');
        if (!overlay || !drawer) return;

        overlay.classList.add('active');
        drawer.classList.add('active');
        isDrawerOpen = true;

        // Evitar scroll en el fondo
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        const overlay = document.getElementById('cart-drawer-overlay');
        const drawer = document.getElementById('cart-drawer');
        if (!overlay || !drawer) return;

        overlay.classList.remove('active');
        drawer.classList.remove('active');
        isDrawerOpen = false;

        document.body.style.overflow = '';
    }

    function toggleDrawer() {
        if (isDrawerOpen) {
            closeDrawer();
        } else {
            openDrawer();
        }
    }

    function changeQty(index, delta) {
        if (window.CarritoModule && typeof window.CarritoModule.updateQty === 'function') {
            const items = getCartItems();
            if (items[index]) {
                const newQty = (items[index].qty || 1) + delta;
                if (newQty <= 0) {
                    window.CarritoModule.removeItem(index);
                } else {
                    window.CarritoModule.updateQty(index, newQty);
                }
                renderDrawerItems();
            }
        }
    }

    function removeItem(index) {
        if (window.CarritoModule && typeof window.CarritoModule.removeItem === 'function') {
            window.CarritoModule.removeItem(index);
            renderDrawerItems();
        }
    }

    // Inicializar listener para sincronización reactiva
    window.addEventListener('latarima:cart-updated', () => {
        if (isDrawerOpen) {
            renderDrawerItems();
        }
    });

    // API Global
    window.CartDrawer = {
        init: createDrawerDOM,
        open: openDrawer,
        close: closeDrawer,
        toggle: toggleDrawer,
        render: renderDrawerItems,
        changeQty: changeQty,
        removeItem: removeItem,
        isOpen: () => isDrawerOpen
    };

    // Auto-crear DOM al cargar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createDrawerDOM);
    } else {
        createDrawerDOM();
    }
})();
