// js/carrito.js
// --- DECOUPLED INTEGRATED PERFIL-CARRITO MODULE ---
// Built in absolute isolation, respecting the user's workspace constraints.

(function() {
    // 1. Configuración de Presets de Avatar Temáticos (Carpintería Premium)
    const avatarPresets = [
        { id: 'av-1', gradient: 'linear-gradient(135deg, #e99f57, #c0510a)', icon: 'forest', label: 'Veta Natural' },
        { id: 'av-2', gradient: 'linear-gradient(135deg, #f3c27e, #d6833b)', icon: 'carpenter', label: 'Taller Fresco' },
        { id: 'av-3', gradient: 'linear-gradient(135deg, #8a9a86, #4d604a)', icon: 'architecture', label: 'Diseño Premium' },
        { id: 'av-4', gradient: 'linear-gradient(135deg, #e76f51, #f4a261)', icon: 'handyman', label: 'Artesano Libre' }
    ];

    // Claves de localStorage independientes
    let userData = {
        name: '',
        dni: '',
        phone: '',
        tel: '',
        email: '',
        address: '',
        locality: '',
        province: '',
        zipCode: '',
        avatarId: 'av-1',
        photo: '' // Base64 de la foto de perfil
    };

    let cartItems = [];

    // 2. Persistencia Aislada
    function loadUserData() {
        try {
            const data = localStorage.getItem('userData');
            if (data) {
                const parsed = JSON.parse(data);
                userData = {
                    name: parsed.name || '',
                    dni: parsed.dni || '',
                    phone: parsed.phone || '',
                    tel: parsed.tel || '',
                    email: parsed.email || '',
                    address: parsed.address || '',
                    locality: parsed.locality || '',
                    province: parsed.province || '',
                    zipCode: parsed.zipCode || '',
                    avatarId: parsed.avatarId || 'av-1',
                    photo: parsed.photo || ''
                };
            }
        } catch (e) {
            console.error('[Carrito Module] Error cargando userData:', e);
        }
    }

    function saveUserData() {
        try {
            localStorage.setItem('userData', JSON.stringify(userData));
        } catch (e) {
            console.error('[Carrito Module] Error guardando userData:', e);
        }
    }

    // Cargar y guardar favoritos
    function loadCartItems() {
        try {
            const data = localStorage.getItem('cartItems');
            if (data) {
                cartItems = JSON.parse(data);
            }
        } catch (e) {
            console.error('[Carrito Module] Error cargando favoritos:', e);
        }
    }

    function saveCartItems() {
        try {
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            if (window.updateFavoritesBadge) {
                window.updateFavoritesBadge();
            }
        } catch (e) {
            console.error('[Carrito Module] Error guardando favoritos:', e);
        }
    }

    // Funciones Auxiliares
    function isProductInCart(productId, acabado, medida = '', opcion = '') {
        try {
            return cartItems.some(item => 
                item.id === productId && 
                (item.acabado || '').trim().toLowerCase() === (acabado || '').trim().toLowerCase() &&
                (item.medida || '').trim().toLowerCase() === (medida || '').trim().toLowerCase() &&
                (item.opcion || '').trim().toLowerCase() === (opcion || '').trim().toLowerCase()
            );
        } catch (e) {
            console.error('[Carrito Module] Error checking if in cart:', e);
            return false;
        }
    }

    function toggleProductInCart(product, acabado, catName = 'Catálogo', medida = '', opcion = '', opcionLabel = '', price = null, qty = 1) {
        try {
            const parsedQty = parseInt(qty) > 0 ? parseInt(qty) : 1;
            const idx = cartItems.findIndex(item => 
                item.id === product.id && 
                (item.acabado || '').trim().toLowerCase() === (acabado || '').trim().toLowerCase() &&
                (item.medida || '').trim().toLowerCase() === (medida || '').trim().toLowerCase() &&
                (item.opcion || '').trim().toLowerCase() === (opcion || '').trim().toLowerCase()
            );
            
            if (idx !== -1) {
                if (parsedQty > 1 && cartItems[idx].qty !== parsedQty) {
                    cartItems[idx].qty = parsedQty;
                    if (price) cartItems[idx].price = price;
                    console.log(`[Carrito] Cantidad actualizada: ${product.title} (${acabado}) x${parsedQty}`);
                } else {
                    cartItems.splice(idx, 1);
                    console.log(`[Carrito] Quitado de favoritos: ${product.title} (${acabado})`);
                }
            } else {
                // Resolver imagen de la variante o fallback
                let img = product.image;
                if (product.acabados_groups) {
                    const ac = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === (acabado || '').trim().toLowerCase());
                    if (ac && ac.cover_image) img = ac.cover_image;
                }
                const productCover = Array.isArray(img) ? img[0] : (img || 'img/logo_provisional.png');

                cartItems.push({
                    id: product.id,
                    title: product.title,
                    acabado: acabado || 'Único',
                    medida: medida || '',
                    opcion: opcion || '',
                    opcionLabel: opcionLabel || '',
                    image: productCover,
                    catName: catName,
                    qty: parsedQty,
                    price: price || null
                });
                console.log(`[Carrito] Agregado a favoritos: ${product.title} (${acabado}) x${parsedQty}`);
                const navCartIcon = document.getElementById('nav-cart-icon');
                if (navCartIcon) {
                    navCartIcon.classList.remove('cart-bounce-anim');
                    // Forzar reflow para reiniciar la animación
                    void navCartIcon.offsetWidth;
                    navCartIcon.classList.add('cart-bounce-anim');
                }
            }
            saveCartItems();
            
            // Disparar redibujado de la vista si es que está activa
            renderPerfilCarritoView();
        } catch (e) {
            console.error('[Carrito Module] Error toggling product:', e);
        }
    }


    // 3. Estilos Inyectados en Caliente (CSS Limpio y Premium)
    function injectModuleStyles() {
        try {
            if (document.getElementById('carrito-module-styles')) return;
            const style = document.createElement('style');
            style.id = 'carrito-module-styles';
            style.textContent = `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.97); opacity: 0; }
                    to   { transform: scale(1);    opacity: 1; }
                }

                #view-profile .view-content {
                    display: block !important;
                    padding: 1rem !important;
                }

                /* ── Encabezado de Perfil ── */
                .profile-card-header {
                    background: white;
                    border-radius: 16px;
                    padding: 1rem 1.25rem;
                    box-shadow: 0 2px 16px rgba(0,0,0,0.04);
                    border: 1px solid #F0EDE8;
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    position: relative;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .profile-card-header:hover {
                    border-color: rgba(192,81,10,0.25);
                    box-shadow: 0 6px 24px rgba(192,81,10,0.07);
                }
                .profile-header-left {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    text-align: left;
                }
                .profile-settings-btn {
                    background: #f7f5f2;
                    border: none;
                    border-radius: 10px;
                    width: 38px; height: 38px;
                    cursor: pointer;
                    color: #8c857b;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .profile-settings-btn:hover {
                    background: var(--primary-color, #c0510a);
                    color: white;
                    transform: rotate(45deg);
                }
                .profile-avatar-circle {
                    width: 48px; height: 48px;
                    border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-size: 22px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    flex-shrink: 0;
                    background-size: cover; background-position: center;
                }
                .profile-info h3 {
                    margin: 0;
                    font-size: 1rem; font-weight: 700; color: #2c2520;
                }
                .profile-info p {
                    margin: 2px 0 0 0;
                    font-size: 0.78rem; color: #8c857b;
                }
                .profile-edit-form {
                    background: white;
                    border-radius: 16px;
                    padding: 1.5rem;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.04);
                    border: 1px solid #F0EDE8;
                    margin-top: 1rem;
                    display: flex; flex-direction: column; gap: 1rem;
                    animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .profile-form-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem 1.5rem;
                }
                @media (min-width: 768px) {
                    .profile-form-grid { grid-template-columns: 1fr 1fr; }
                }
                .avatar-selector-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.5rem; margin-top: 4px;
                }
                .avatar-option {
                    height: 40px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; border: 2.5px solid transparent;
                    transition: all 0.2s ease; color: white;
                }
                .avatar-option.selected {
                    border-color: var(--primary-color, #c0510a);
                    transform: scale(1.06);
                    box-shadow: 0 4px 12px rgba(192,81,10,0.25);
                }
                .cart-section { margin-top: 1.75rem; }
                .cart-section h4 {
                    font-size: 0.78rem;
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    color: #8c857b;
                    margin-bottom: 0.85rem;
                    font-weight: 800;
                    display: flex; align-items: center; gap: 8px;
                }

                /* ── Tarjeta de Producto ── */
                .cart-item-row {
                    background: white;
                    border-radius: 16px;
                    padding: 0.9rem 1rem;
                    border: 1px solid #F0EDE8;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    margin-bottom: 0.7rem;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
                    transition: all 0.25s ease;
                    animation: fadeInUp 0.3s ease both;
                    overflow: hidden;
                }
                .cart-item-row:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 28px rgba(0,0,0,0.07);
                    border-color: rgba(192,81,10,0.2);
                }
                /* ── Estilos Mercado Libre Style ── */
                .cart-section {
                    margin-top: 0.5rem;
                }
                .cart-section-title {
                    font-size: 0.95rem; font-weight: 800; color: #1e293b;
                    margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between;
                }
                .cart-item-row {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 0.9rem 1rem;
                    margin-bottom: 0.6rem;
                    box-shadow: 0 2px 6px rgba(15,23,42,0.03);
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .cart-item-row:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 4px 12px rgba(15,23,42,0.06);
                }
                /* Fila superior: imagen + datos + borrar */
                .cart-item-top {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.85rem;
                }
                .cart-item-clickable-area {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.85rem;
                    flex: 1;
                    cursor: pointer;
                    overflow: hidden;
                }
                .cart-item-thumb {
                    width: 76px; height: 76px;
                    border-radius: 10px;
                    background-size: cover;
                    background-position: center;
                    border: 1px solid #f1f5f9;
                    flex-shrink: 0;
                    transition: transform 0.25s ease;
                    background-color: #f8fafc;
                }
                .cart-item-row:hover .cart-item-thumb {
                    transform: scale(1.03);
                }
                .cart-item-details {
                    flex: 1;
                    overflow: hidden;
                    text-align: left;
                }
                .cart-item-details h5 {
                    margin: 0 0 4px 0;
                    font-size: 0.92rem; font-weight: 700; color: #0f172a;
                    line-height: 1.3;
                }
                .cart-item-details p {
                    margin: 0 0 4px 0;
                    font-size: 0.78rem; color: #64748b; line-height: 1.4;
                }
                .cart-item-details .item-tag {
                    display: inline-block;
                    font-size: 0.68rem; color: #475569;
                    background: #f1f5f9; padding: 2px 8px;
                    border-radius: 6px; margin-top: 4px;
                    font-weight: 700; letter-spacing: 0.3px;
                    border: 1px solid #e2e8f0;
                }
                .cart-item-del-btn {
                    background: #fef2f2; border: none;
                    border-radius: 8px;
                    width: 34px; height: 34px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: #ef4444;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .cart-item-del-btn:hover {
                    background: #fee2e2; color: #dc2626;
                    transform: scale(1.05);
                }

                /* Fila inferior: precio unitario + qty + subtotal */
                .cart-item-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 0.6rem;
                    padding-top: 0.6rem;
                    border-top: 1px solid #f1f5f9;
                    gap: 0.5rem;
                }
                .cart-item-unit-price {
                    font-size: 0.8rem; color: #64748b; font-weight: 600;
                }
                .cart-item-qty-control {
                    display: flex; align-items: center; gap: 4px;
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 2px 4px;
                    border: 1.5px solid #cbd5e1;
                }
                .qty-btn {
                    background: #f8fafc; border: 1px solid #e2e8f0;
                    width: 26px; height: 26px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: #0f172a;
                    font-weight: 800; font-size: 14px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                }
                .qty-btn:hover {
                    background: #0f172a; color: white; border-color: #0f172a;
                }
                .qty-val {
                    font-size: 0.88rem; font-weight: 800;
                    min-width: 24px; text-align: center; color: #0f172a;
                }
                .cart-item-subtotal {
                    font-size: 0.98rem; font-weight: 800; color: #0f172a;
                    white-space: nowrap;
                }
                .cart-item-no-price {
                    font-size: 0.75rem; color: #94A3B8; font-style: italic;
                }

                /* Notice & Limit Warnings */
                .cart-unit-warning {
                    background: #fffbe6;
                    border: 1px solid #ffe58f;
                    border-radius: 8px;
                    padding: 6px 10px;
                    font-size: 0.72rem;
                    color: #d46b08;
                    margin-top: 6px;
                    display: flex; align-items: center; gap: 6px;
                    font-weight: 600;
                }

                /* ── Mercado Libre Style Summary Breakdown ── */
                .ml-cart-summary-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.1rem 1.2rem;
                    margin-top: 1rem;
                    box-shadow: 0 4px 14px rgba(15,23,42,0.05);
                }
                .ml-summary-header {
                    font-size: 0.9rem; font-weight: 800; color: #0f172a;
                    margin-bottom: 0.85rem; padding-bottom: 0.5rem;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex; align-items: center; justify-content: space-between;
                }
                .ml-summary-row {
                    display: flex; align-items: center; justify-content: space-between;
                    font-size: 0.85rem; color: #475569; margin-bottom: 0.6rem;
                }
                .ml-summary-row.total-row {
                    border-top: 1.5px dashed #cbd5e1;
                    padding-top: 0.75rem;
                    margin-top: 0.75rem;
                    margin-bottom: 0;
                    font-size: 1.15rem; font-weight: 900; color: #0f172a;
                }

                /* Shipping Option Selector Cards */
                .ml-shipping-options-group {
                    display: flex; flex-direction: column; gap: 0.5rem;
                    margin: 0.85rem 0;
                }
                .ml-shipping-card {
                    border: 1.5px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 0.75rem 0.9rem;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex; align-items: center; justify-content: space-between; gap: 10px;
                }
                .ml-shipping-card:hover {
                    border-color: #cbd5e1;
                    background: #ffffff;
                }
                .ml-shipping-card.selected {
                    border-color: #2563eb;
                    background: #eff6ff;
                    box-shadow: 0 2px 8px rgba(37,99,235,0.12);
                }
                .ml-shipping-card.disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background: #f1f5f9;
                    border-color: #e2e8f0;
                }
                .ml-shipping-left {
                    display: flex; align-items: center; gap: 10px; min-width: 0;
                }
                .ml-shipping-radio {
                    accent-color: #2563eb; width: 16px; height: 16px; flex-shrink: 0;
                }
                .ml-shipping-title {
                    font-size: 0.83rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px;
                }
                .ml-shipping-sub {
                    font-size: 0.72rem; color: #64748b; margin-top: 2px;
                }
                .ml-shipping-badge-free {
                    background: #dcfce7; color: #166534; font-size: 0.68rem; font-weight: 800;
                    padding: 2px 6px; border-radius: 4px; display: inline-block;
                }
                .ml-shipping-price {
                    font-size: 0.9rem; font-weight: 800; color: #0f172a; white-space: nowrap;
                }
                .ml-shipping-price.free {
                    color: #16a34a;
                }

                /* ── Barra de Acciones Mercado Libre ── */
                .cart-actions-bar {
                    display: flex;
                    flex-direction: column;
                    gap: 0.65rem;
                    margin-top: 1rem;
                }
                .cart-btn-buy {
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    background: #3483fa;
                    color: white; border: none;
                    border-radius: 12px;
                    padding: 0.9rem 1.2rem;
                    font-weight: 800; font-size: 0.98rem;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(52,131,250,0.3);
                    transition: all 0.2s ease;
                    width: 100%;
                }
                .cart-btn-buy:hover {
                    background: #2968c8;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(52,131,250,0.4);
                }
                .cart-btn-consult {
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    background: #fff8f0;
                    color: #c0510a; border: 1.5px solid rgba(192,81,10,0.3);
                    border-radius: 12px;
                    padding: 0.8rem 1rem;
                    font-weight: 800; font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    width: 100%;
                }
                .cart-btn-consult:hover {
                    background: #fff1e5;
                    border-color: #c0510a;
                }

                /* Responsive */
                @media (max-width: 600px) {
                    .profile-card-header { padding: 0.85rem 1rem; }
                    .cart-item-top { gap: 0.7rem; }
                    .cart-item-thumb { width: 66px; height: 66px; }
                }
            `;
            document.head.appendChild(style);
        } catch (e) {
            console.error('[Carrito Module] Error injecting styles:', e);
        }
    }

    // Helper para buscar producto original en sessionProducts, sessionOffers o globales
    function findCartProductDetails(item) {
        if (!item || !item.id) return null;
        if (window.sessionProducts) {
            for (const cat of window.sessionProducts) {
                if (cat.products) {
                    const found = cat.products.find(p => p && String(p.id) === String(item.id));
                    if (found) return found;
                }
            }
        }
        if (window.sessionOffers) {
            const foundOffer = window.sessionOffers.find(o => o && String(o.id) === String(item.id));
            if (foundOffer) return foundOffer;
        }
        if (window.products) {
            const found = window.products.find(p => p && String(p.id) === String(item.id));
            if (found) return found;
        }
        if (window.offers) {
            const foundOffer = window.offers.find(o => o && String(o.id) === String(item.id));
            if (foundOffer) return foundOffer;
        }
        return item;
    }

    // 4. Renderizado Dinámico de la Vista Integrada Perfil-Carrito
    function renderPerfilCarritoView() {
        try {
            const viewContainer = document.querySelector('#view-profile .view-content');
            if (!viewContainer) return;

            loadUserData();
            loadCartItems();

            const curPreset = avatarPresets.find(p => p.id === userData.avatarId) || avatarPresets[0];
            const displayName = userData.name.trim() || 'Viruta Lover';

            let cartListHTML = '';
            if (cartItems.length === 0) {
                cartListHTML = `
                    <div class="cart-empty-motivator" style="padding: 2.5rem 1.5rem; text-align: center; border-radius: 20px; background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.04); margin-top:1.5rem;">
                        <div style="width: 80px; height: 80px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
                            <span class="material-symbols-outlined" style="font-size: 42px; color:#3483fa;">shopping_bag</span>
                        </div>
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin:0 0 0.5rem 0;">¡Tu carrito está vacío!</h3>
                        <p style="font-size: 0.9rem; color: #64748b; margin:0 0 1.5rem 0; line-height:1.5;">Explorá nuestros productos de madera maciza y sumalos a tu pedido.</p>
                        
                        <div style="display:flex; flex-direction:column; gap:0.75rem; max-width: 280px; margin: 0 auto;">
                            <button type="button" class="cart-btn-buy" onclick="if(window.navigateToView) window.navigateToView('view-catalogo')" style="border-radius: 50px;">
                                <span class="material-symbols-outlined" style="font-size: 1.2rem;">category</span>
                                Explorar Catálogo
                            </button>
                        </div>
                    </div>
                `;
            } else {
                const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

                // Realizar cálculo de costos de envío y promociones de Flete Gratis
                let productsSubtotal = 0;
                let hasAnyPrice = false;

                let logisticaAvailable = true;
                let fleteAvailable = true;

                let totalLogisticaPackages = 0;
                let totalFletePackages = 0;
                let isFleteFreeByQty = false;
                let isFlexFreeByQty = false;

                cartItems.forEach(item => {
                    const qty = item.qty || 1;
                    if (item.price) {
                        productsSubtotal += item.price * qty;
                        hasAnyPrice = true;
                    }

                    // Verificar promos y bultos del producto original
                    const origProd = findCartProductDetails(item);
                    const shipConf = origProd?.shippingConfig || item.shippingConfig || {};

                    const logMax = parseInt(shipConf.logisticaMaxUnits) || 0;
                    const fleteMax = parseInt(shipConf.fleteMaxUnits) || 0;

                    // Verificar si la variante específica del item deshabilita Logística Flex
                    if (origProd && origProd.acabados_groups) {
                        const itemAcabadoStr = (item.acabado || '').trim();
                        const itemMedidaStr = (item.medida || '').trim();
                        let matchingGrp = origProd.acabados_groups.find(g => (g.acabado_name || '').trim() === itemAcabadoStr) || origProd.acabados_groups[0];
                        if (matchingGrp && matchingGrp.medidas_variants) {
                            let matchingVar = matchingGrp.medidas_variants.find(m => (m.medida || '').trim() === itemMedidaStr);
                            if (matchingVar && (matchingVar.logisticaEnabled === false || matchingVar.noFlex === true || matchingVar.disableFlex === true)) {
                                logisticaAvailable = false;
                            }
                        }
                    }

                    const isGlobalFree = !!(shipConf.isFreeShipping || shipConf.isFree || origProd?.shippingType === 'free' || item.shippingType === 'free');

                    const logFreeMin = parseInt(shipConf.logisticaFreeMinUnits) || 0;
                    if (isGlobalFree || (logFreeMin > 0 && qty >= logFreeMin)) {
                        isFlexFreeByQty = true;
                    }

                    const fleteFreeMin = parseInt(shipConf.fleteFreeMinUnits) || 0;
                    if (isGlobalFree || (fleteFreeMin > 0 && qty >= fleteFreeMin)) {
                        isFleteFreeByQty = true;
                    }

                    // Calcular bultos estimados
                    totalLogisticaPackages += logMax > 0 ? Math.ceil(qty / logMax) : 1;
                    totalFletePackages += fleteMax > 0 ? Math.ceil(qty / fleteMax) : 1;
                });

                // Cotizar envío según CP guardado
                const userZip = (userData.zipCode || '').trim();
                let cpLookupRes = null;
                if (userZip && window.lookupPostalCode) {
                    cpLookupRes = window.lookupPostalCode(userZip);
                }

                const hasValidCp = !!(cpLookupRes && cpLookupRes.hasLocalMatch !== false);

                let flexRate = hasValidCp ? (cpLookupRes?.logistica?.cost !== undefined ? cpLookupRes.logistica.cost : null) : null;
                let fleteRate = hasValidCp ? (cpLookupRes?.flete?.cost !== undefined ? cpLookupRes.flete.cost : null) : null;

                if (cpLookupRes) {
                    if (cpLookupRes.logistica?.active === false || flexRate === null) logisticaAvailable = false;
                    if (cpLookupRes.flete?.active === false || fleteRate === null) fleteAvailable = false;
                } else {
                    logisticaAvailable = false;
                    fleteAvailable = false;
                }

                const totalFlexCost = isFlexFreeByQty ? 0 : ((hasValidCp && logisticaAvailable) ? flexRate * Math.max(1, totalLogisticaPackages) : null);
                const totalFleteCost = isFleteFreeByQty ? 0 : ((hasValidCp && fleteAvailable) ? fleteRate * Math.max(1, totalFletePackages) : null);

                // Determinar opción seleccionada por defecto
                let defaultSelMode = 'externa';
                if (hasValidCp) {
                    if (isFlexFreeByQty && logisticaAvailable) {
                        defaultSelMode = 'flex';
                    } else if (isFleteFreeByQty && fleteAvailable) {
                        defaultSelMode = 'flete';
                    } else if (logisticaAvailable) {
                        defaultSelMode = 'flex';
                    } else if (fleteAvailable) {
                        defaultSelMode = 'flete';
                    }
                }

                const totalItemsQty = cartItems.reduce((acc, item) => acc + (item.qty || 1), 0);

                cartListHTML = `
                    <div style="display:flex; flex-direction:column; gap:0; margin-top:0.5rem;">
                        <div class="cart-section-title">
                            <span>Productos en tu carrito (${cartItems.length})</span>
                            <span style="font-size:0.78rem; color:#64748b; font-weight:600;">${totalItemsQty} ${totalItemsQty === 1 ? 'unidad' : 'unidades'}</span>
                        </div>

                        ${cartItems.map((item, idx) => {
                            const unitPrice = item.price || null;
                            const subtotal  = unitPrice ? unitPrice * (item.qty || 1) : null;
                            const variantDetails = [
                                item.acabado && item.acabado !== 'Único' ? `Acabado: <strong>${item.acabado}</strong>` : '',
                                item.medida ? `Medida: <strong>${item.medida}</strong>` : '',
                                item.opcion ? `${item.opcionLabel || 'Opción'}: <strong>${item.opcion}</strong>` : ''
                            ].filter(Boolean).join(' · ');

                            return `
                            <div class="cart-item-row">
                                <!-- Fila superior: thumb + datos + borrar -->
                                <div class="cart-item-top">
                                    <div class="cart-item-clickable-area" data-id="${item.id}" data-acabado="${item.acabado}" data-medida="${item.medida || ''}" data-opcion="${item.opcion || ''}" title="Ver producto">
                                        <div class="cart-item-thumb" style="background-image: url('${item.image}');"></div>
                                        <div class="cart-item-details">
                                            <h5>${item.title}</h5>
                                            ${variantDetails ? `<p>${variantDetails}</p>` : ''}
                                            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                                <span class="item-tag">${item.catName}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="cart-item-del-btn" data-index="${idx}" title="Quitar del carrito">
                                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                                    </button>
                                </div>
                                <!-- Fila inferior: precio + qty + subtotal -->
                                <div class="cart-item-bottom">
                                    ${unitPrice
                                        ? `<span class="cart-item-unit-price">${formatter.format(unitPrice)} c/u</span>`
                                        : `<span class="cart-item-no-price">Precio a consultar</span>`
                                    }
                                    <div class="cart-item-qty-control">
                                        <button type="button" class="qty-btn qty-minus" data-index="${idx}">−</button>
                                        <span class="qty-val">${item.qty || 1}</span>
                                        <button type="button" class="qty-btn qty-plus" data-index="${idx}">+</button>
                                    </div>
                                    ${subtotal
                                        ? `<span class="cart-item-subtotal">${formatter.format(subtotal)}</span>`
                                        : `<span class="cart-item-no-price">${item.qty || 1} ${(item.qty || 1) === 1 ? 'unidad' : 'unidades'}</span>`
                                    }
                                </div>
                            </div>
                            `;
                        }).join('')}

                        <!-- Resumen Estilo Mercado Libre -->
                        <div class="ml-cart-summary-card">
                            <div class="ml-summary-header">
                                <span>Resumen de compra</span>
                                <button type="button" id="btn-edit-cart-shipping" style="background:none; border:none; color:#2563eb; font-weight:700; font-size:0.78rem; cursor:pointer; padding:0; display:flex; align-items:center; gap:3px;">
                                    <span class="material-symbols-outlined" style="font-size:16px;">edit_location</span>
                                    ${hasValidCp ? `${cpLookupRes.localidad || ('CP ' + cpLookupRes.cp)}` : '📍 Ingresar CP para cotizar envío'}
                                </button>
                            </div>

                            <div class="ml-summary-row">
                                <span>Productos (${totalItemsQty})</span>
                                <span style="font-weight:700;">${hasAnyPrice ? formatter.format(productsSubtotal) : 'A consultar'}</span>
                            </div>

                            <div style="margin: 0.75rem 0 0.5rem 0;">
                                <div style="font-size: 0.78rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;">
                                    Seleccionar forma de envío:
                                </div>
                                <div class="ml-shipping-options-group">
                                    <!-- Opción Flex -->
                                    <label class="ml-shipping-card ${defaultSelMode === 'flex' ? 'selected' : ''} ${hasValidCp && logisticaAvailable ? '' : 'disabled'}" id="lbl-ship-flex">
                                        <div class="ml-shipping-left">
                                            <input type="radio" name="cart-selected-shipping" value="flex" class="ml-shipping-radio" ${defaultSelMode === 'flex' ? 'checked' : ''} ${hasValidCp && logisticaAvailable ? '' : 'disabled'}>
                                            <div>
                                                <div class="ml-shipping-title">
                                                    📦 Logística Flex / Express
                                                    ${isFlexFreeByQty ? '<span class="ml-shipping-badge-free" style="background:#dcfce7; color:#166534;">¡Envío GRATIS!</span>' : '<span class="ml-shipping-badge-free">Rápido</span>'}
                                                </div>
                                                <div class="ml-shipping-sub">
                                                    ${hasValidCp ? (logisticaAvailable ? (isFlexFreeByQty ? '¡Entrega bonificada por cantidad!' : `Entrega a domicilio (${totalLogisticaPackages > 1 ? totalLogisticaPackages + ' bultos' : 'bulto estándar'})`) : 'No disponible para tu zona') : 'Ingresá tu CP para cotizar'}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="ml-shipping-price ${isFlexFreeByQty ? 'free' : ''}">
                                            ${hasValidCp ? (logisticaAvailable ? (isFlexFreeByQty ? 'Gratis' : formatter.format(totalFlexCost)) : 'N/D') : 'Ingresar CP'}
                                        </div>
                                    </label>

                                    <!-- Opción Flete Propio -->
                                    <label class="ml-shipping-card ${defaultSelMode === 'flete' ? 'selected' : ''} ${hasValidCp && fleteAvailable ? '' : 'disabled'}" id="lbl-ship-flete">
                                        <div class="ml-shipping-left">
                                            <input type="radio" name="cart-selected-shipping" value="flete" class="ml-shipping-radio" ${defaultSelMode === 'flete' ? 'checked' : ''} ${hasValidCp && fleteAvailable ? '' : 'disabled'}>
                                            <div>
                                                <div class="ml-shipping-title">
                                                    🚛 Flete Propio
                                                    ${isFleteFreeByQty ? '<span class="ml-shipping-badge-free" style="background:#dcfce7; color:#166534;">¡Envío GRATIS por volumen!</span>' : ''}
                                                </div>
                                                <div class="ml-shipping-sub">
                                                    ${hasValidCp ? (fleteAvailable ? (isFleteFreeByQty ? '¡Flete bonificado por cantidad!' : `Transporte directo (${totalFletePackages > 1 ? totalFletePackages + ' bultos/fletes' : 'flete directo'})`) : 'No disponible para tu zona') : 'Ingresá tu CP para cotizar'}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="ml-shipping-price ${isFleteFreeByQty ? 'free' : ''}">
                                            ${hasValidCp ? (fleteAvailable ? (isFleteFreeByQty ? 'Gratis' : formatter.format(totalFleteCost)) : 'N/D') : 'Ingresar CP'}
                                        </div>
                                    </label>

                                    <!-- Opción Logística Externa / Consultar -->
                                    <label class="ml-shipping-card ${defaultSelMode === 'externa' ? 'selected' : ''}" id="lbl-ship-externa">
                                        <div class="ml-shipping-left">
                                            <input type="radio" name="cart-selected-shipping" value="externa" class="ml-shipping-radio" ${defaultSelMode === 'externa' ? 'checked' : ''}>
                                            <div>
                                                <div class="ml-shipping-title">
                                                    🚚 Logística Externa / Expreso (Interior)
                                                </div>
                                                <div class="ml-shipping-sub">
                                                    Vía Cargo, Andreani o Expreso a convenir por WhatsApp
                                                </div>
                                            </div>
                                        </div>
                                        <div class="ml-shipping-price free">
                                            A consultar
                                        </div>
                                    </label>

                                    <!-- Opción Retiro en Taller -->
                                    <label class="ml-shipping-card" id="lbl-ship-pickup">
                                        <div class="ml-shipping-left">
                                            <input type="radio" name="cart-selected-shipping" value="pickup" class="ml-shipping-radio">
                                            <div>
                                                <div class="ml-shipping-title">
                                                    🏪 Retiro Gratis en Taller (Hurlingham)
                                                </div>
                                                <div class="ml-shipping-sub">
                                                    Coordinamos horario de retiro sin costo adicional
                                                </div>
                                            </div>
                                        </div>
                                        <div class="ml-shipping-price free">
                                            Gratis
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div class="ml-summary-row total-row">
                                <span>Total a pagar</span>
                                <span id="cart-grand-total-val" style="color:#0f172a;">
                                    ${hasAnyPrice ? formatter.format(productsSubtotal + (defaultSelMode === 'flex' ? totalFlexCost : (defaultSelMode === 'flete' ? totalFleteCost : 0))) : 'A consultar'}
                                </span>
                            </div>
                        </div>

                        <!-- Acciones Principales -->
                        <div class="cart-actions-bar">
                            <button type="button" id="btn-cart-buy-now" class="cart-btn-buy">
                                <span class="material-symbols-outlined" style="font-size:22px;">shopping_cart_checkout</span>
                                COMPRAR YA
                            </button>
                            <button type="button" id="btn-cart-consult-wa" class="cart-btn-consult">
                                <span class="material-symbols-outlined" style="font-size:20px; color:#c0510a;">chat</span>
                                Consultar por WhatsApp
                            </button>
                        </div>
                    </div>
                `;
            }



            let wholesaleBannerHTML = '';
            try {
                const savedWholesaleStr = localStorage.getItem('savedMayoristaCart');
                if (savedWholesaleStr) {
                    const savedWholesale = JSON.parse(savedWholesaleStr);
                    const wholesaleKeys = Object.keys(savedWholesale);
                    if (wholesaleKeys.length > 0) {
                        wholesaleBannerHTML = `
                            <div style="background: linear-gradient(135deg, #0F172A, #1E293B); padding: 1rem; border-radius: 12px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.1);">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(16, 185, 129, 0.3);">
                                        <span class="material-symbols-outlined" style="color: #10B981; font-size: 20px;">local_mall</span>
                                    </div>
                                    <div>
                                        <h4 style="margin: 0; color: #F8FAFC; font-size: 0.85rem; font-weight: 600;">Pedido Mayorista Guardado</h4>
                                        <p style="margin: 2px 0 0 0; color: #94A3B8; font-size: 0.75rem;">${wholesaleKeys.length} items listos.</p>
                                    </div>
                                </div>
                                <button type="button" onclick="window.location.href='mayorista.html'" style="background: #10B981; color: #ffffff; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 700; font-family: var(--font-main);">
                                    Retomar
                                </button>
                            </div>
                        `;
                    }
                }
            } catch(e) {}

            // Estructura de cabecera de perfil centrado + engranaje en esquina superior derecha
            viewContainer.innerHTML = `
                ${wholesaleBannerHTML}
                <!-- Cabecera de Perfil Compacta (Avatar y datos a la izq, config a la derecha) -->
                <div class="profile-card-header">
                    <div class="profile-header-left">
                        <!-- Avatar Compacto -->
                        ${userData.photo ? `
                            <div class="profile-avatar-circle" style="background-image: url('${userData.photo}'); border: 2px solid var(--primary-color, #c0510a);"></div>
                        ` : `
                            <div class="profile-avatar-circle" style="background: ${curPreset.gradient};">
                                <span class="material-symbols-outlined" style="font-size: 24px;">${curPreset.icon}</span>
                            </div>
                        `}
                        <!-- Datos del Perfil -->
                        <div class="profile-info">
                            <h3>${displayName}</h3>
                            <p>${userData.phone.trim() ? `📞 ${userData.phone.trim()}` : 'Sin celular configurado'}</p>
                        </div>
                    </div>
                    <!-- Botón de Engranaje de Configuración a la Derecha -->
                    <button type="button" class="profile-settings-btn" id="btn-toggle-profile-settings" title="Configurar Perfil">
                        <span class="material-symbols-outlined" style="font-size: 20px;">settings</span>
                    </button>
                </div>

                <!-- Formulario de Configuración de Datos (Oculto por defecto, campos ordenados por despacho) -->
                <div class="profile-edit-form" id="profile-expandable-form" style="display:none;">
                    <h4 style="font-size:0.85rem; margin:0; color:var(--text-main, #334155); font-weight:700; display:flex; align-items:center; gap:4px;">
                        <span class="material-symbols-outlined" style="font-size:16px;">person_outline</span>
                        Tus Datos Locales
                    </h4>
                    <!-- Aviso de Privacidad Estricto y Crítico -->
                    <p style="font-size: 0.7rem; color: #64748b; margin: 0 0 0.2rem 0; line-height: 1.35;">
                        Tu información se almacena 100% local en tu dispositivo y no se comparte con nadie. La usamos solo para agilizar tu pedido.
                    </p>

                    <!-- Selector de Foto Custom -->
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Foto de Perfil</label>
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom: 4px;">
                            <div id="photo-preview-circle" style="width: 54px; height: 54px; border-radius: 50%; background-size: cover; background-position: center; background-image: ${userData.photo ? `url('${userData.photo}')` : 'none'}; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1.5px solid #E8ECF0; flex-shrink:0;">
                                ${!userData.photo ? `<span class="material-symbols-outlined" style="color: #94a3b8; font-size: 20px;">add_a_photo</span>` : ''}
                            </div>
                            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                                <input type="file" id="edit-user-photo" accept="image/*" style="font-size:0.78rem; font-family:var(--font-main); color:var(--text-muted); width: 100%;">
                                ${userData.photo ? `
                                    <button type="button" id="btn-remove-user-photo" style="background:none; border:none; color:#e11d48; font-size:0.72rem; cursor:pointer; text-align:left; padding:0; font-weight:600; width: fit-content; display:flex; align-items:center; gap:2px; margin-top:2px;">
                                        <span class="material-symbols-outlined" style="font-size:12px;">delete</span> Eliminar Foto
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Campos del Formulario ordenados por despacho -->
                    <div class="profile-form-grid">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Nombre y Apellido / Apodo</label>
                            <input type="text" id="edit-user-name" value="${userData.name}" placeholder="ej: Juan Pérez" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">DNI (Despacho / Facturación)</label>
                            <input type="text" id="edit-user-dni" value="${userData.dni}" placeholder="ej: 34.567.890" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Celular (WhatsApp)</label>
                            <input type="tel" id="edit-user-phone" value="${userData.phone}" placeholder="ej: 11 6700 7723" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Teléfono Alternativo / Fijo</label>
                            <input type="tel" id="edit-user-tel" value="${userData.tel}" placeholder="ej: 011 4452-1234" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; grid-column: 1 / -1;">
                            <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Correo Electrónico</label>
                            <input type="email" id="edit-user-email" value="${userData.email}" placeholder="ej: juan@mail.com" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; grid-column: 1 / -1;">
                            <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Domicilio Particular Completo y entre calles</label>
                            <input type="text" id="edit-user-address" value="${userData.address}" placeholder="ej: Av. Vergara 1234, e/ Paso y Arenales" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Localidad</label>
                            <input type="text" id="edit-user-locality" value="${userData.locality}" placeholder="ej: Hurlingham" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Provincia</label>
                            <input type="text" id="edit-user-province" value="${userData.province}" placeholder="ej: Buenos Aires" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; grid-column: 1 / -1;">
                            <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Código Postal</label>
                            <input type="text" id="edit-user-zipCode" value="${userData.zipCode}" placeholder="ej: 1686" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                        </div>
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">O elegí un Avatar temático</label>
                        <div class="avatar-selector-grid">
                            ${avatarPresets.map(preset => `
                                <div class="avatar-option ${userData.avatarId === preset.id ? 'selected' : ''}" 
                                     data-id="${preset.id}" 
                                     style="background: ${preset.gradient};" 
                                     title="${preset.label}">
                                    <span class="material-symbols-outlined">${preset.icon}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <hr style="margin: 2rem 0; border:none; border-top: 1.5px solid #EEF0F3; width: 100%;">

                    <button type="button" id="btn-save-profile-local" class="btn-primary" style="margin-top:0.4rem; padding:0.6rem; font-size:0.85rem; font-weight:bold;">Guardar Datos</button>
                </div>

                <!-- Sección de Favoritos (Carrito Integrado) -->
                <div class="cart-section">
                    <h4>
                        <span class="material-symbols-outlined" style="font-size:16px; color:var(--primary-color, #c0510a);">favorite</span>
                        MI LISTA DE DESEOS (${cartItems.length})
                    </h4>
                    ${cartListHTML}
                </div>
            `;

            // --- Registrar Eventos del Perfil ---
            const gearTrigger = document.getElementById('btn-toggle-profile-settings');
            const formExpand = document.getElementById('profile-expandable-form');
            if (gearTrigger && formExpand) {
                gearTrigger.addEventListener('click', (e) => {
                    try {
                        e.stopPropagation();
                        const isHidden = formExpand.style.display === 'none';
                        formExpand.style.display = isHidden ? 'flex' : 'none';
                        if (isHidden) {
                            formExpand.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    } catch (err) {
                        console.error('[Carrito Module] Error toggling gear panel:', err);
                    }
                });
            }

            // Subida y Procesamiento de Foto (FileReader)
            const photoInput = document.getElementById('edit-user-photo');
            const previewCircle = document.getElementById('photo-preview-circle');
            let tempPhotoBase64 = userData.photo || '';

            if (photoInput) {
                photoInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > 1.5 * 1024 * 1024) {
                            alert('La imagen seleccionada supera el tamaño máximo recomendado (1.5 MB). Elegí otra.');
                            photoInput.value = '';
                            return;
                        }
                        const reader = new FileReader();
                        reader.onload = function(evt) {
                            tempPhotoBase64 = evt.target.result;
                            if (previewCircle) {
                                previewCircle.style.backgroundImage = `url('${tempPhotoBase64}')`;
                                previewCircle.innerHTML = '';
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }

            const removePhotoBtn = document.getElementById('btn-remove-user-photo');
            if (removePhotoBtn) {
                removePhotoBtn.addEventListener('click', () => {
                    tempPhotoBase64 = '';
                    if (previewCircle) {
                        previewCircle.style.backgroundImage = 'none';
                        previewCircle.innerHTML = `<span class="material-symbols-outlined" style="color: #94a3b8; font-size: 20px;">add_a_photo</span>`;
                    }
                    if (photoInput) photoInput.value = '';
                    removePhotoBtn.style.display = 'none';
                });
            }

            // Selección de Avatar Preset
            const presetsOptions = viewContainer.querySelectorAll('.avatar-option');
            let selectedAvatarId = userData.avatarId;
            presetsOptions.forEach(opt => {
                opt.addEventListener('click', () => {
                    presetsOptions.forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    selectedAvatarId = opt.dataset.id;
                });
            });

            // Guardado del Perfil
            const saveProfileBtn = document.getElementById('btn-save-profile-local');
            if (saveProfileBtn) {
                saveProfileBtn.addEventListener('click', () => {
                    const name = document.getElementById('edit-user-name').value.trim();
                    const dni = document.getElementById('edit-user-dni').value.trim();
                    const phone = document.getElementById('edit-user-phone').value.trim();
                    const tel = document.getElementById('edit-user-tel').value.trim();
                    const email = document.getElementById('edit-user-email').value.trim();
                    const address = document.getElementById('edit-user-address').value.trim();
                    const locality = document.getElementById('edit-user-locality').value.trim();
                    const province = document.getElementById('edit-user-province').value.trim();
                    const zipCode = document.getElementById('edit-user-zipCode').value.trim();

                    userData = {
                        name,
                        dni,
                        phone,
                        tel,
                        email,
                        address,
                        locality,
                        province,
                        zipCode,
                        avatarId: selectedAvatarId,
                        photo: tempPhotoBase64
                    };

                    saveUserData();
                    renderPerfilCarritoView();
                    
                    const toast = document.getElementById('admin-toast');
                    if (toast) {
                        toast.textContent = "¡Perfil actualizado localmente!";
                        toast.classList.add('show');
                        setTimeout(() => toast.classList.remove('show'), 2000);
                    }
                });
            }

            // --- Registrar Eventos del Carrito ---
            
            // Navegación al hacer clic en el área del producto (Variants Aware)
            viewContainer.querySelectorAll('.cart-item-clickable-area').forEach(el => {
                el.addEventListener('click', () => {
                    try {
                        const prodId = el.dataset.id;
                        const acabado = el.dataset.acabado;
                        const medida = el.dataset.medida || '';
                        const opcion = el.dataset.opcion || '';
                        if (window.findProductById && window.showProductDetail) {
                            const found = window.findProductById(prodId);
                            if (found) {
                                window.showProductDetail(found.product, found.catName, acabado, medida, opcion);
                            }
                        }
                    } catch (err) {
                        console.error('[Carrito Module] Error navigating to product:', err);
                    }
                });
            });

            // Controles de cantidad (Mínimo 1, Máximo 50)
            viewContainer.querySelectorAll('.qty-minus').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    try {
                        e.stopPropagation();
                        const index = parseInt(btn.dataset.index);
                        if (index >= 0 && index < cartItems.length) {
                            let currentQty = cartItems[index].qty || 1;
                            if (currentQty > 1) {
                                cartItems[index].qty = currentQty - 1;
                                saveCartItems();
                                renderPerfilCarritoView();
                            }
                        }
                    } catch (err) {
                        console.error('[Carrito Module] Error decrementing quantity:', err);
                    }
                });
            });

            viewContainer.querySelectorAll('.qty-plus').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    try {
                        e.stopPropagation();
                        const index = parseInt(btn.dataset.index);
                        if (index >= 0 && index < cartItems.length) {
                            let currentQty = cartItems[index].qty || 1;
                            if (currentQty < 50) {
                                cartItems[index].qty = currentQty + 1;
                                saveCartItems();
                                renderPerfilCarritoView();
                            }
                        }
                    } catch (err) {
                        console.error('[Carrito Module] Error incrementing quantity:', err);
                    }
                });
            });

            // Quitar de la lista de deseos
            viewContainer.querySelectorAll('.cart-item-del-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    try {
                        e.stopPropagation();
                        const index = parseInt(btn.dataset.index);
                        if (index >= 0 && index < cartItems.length) {
                            cartItems.splice(index, 1);
                            saveCartItems();
                            renderPerfilCarritoView();
                        }
                    } catch (err) {
                        console.error('[Carrito Module] Error removing item:', err);
                    }
                });
            });

            // --- MEJORAS UX/UI (Propuesta 14) ---
            // Formulario de Envío rápido en Carrito
            const btnEditShipping = document.getElementById('btn-edit-cart-shipping');
            if (btnEditShipping) {
                btnEditShipping.addEventListener('click', () => {
                    let formOverlay = document.getElementById('cart-shipping-modal');
                    if (!formOverlay) {
                        formOverlay = document.createElement('div');
                        formOverlay.id = 'cart-shipping-modal';
                        formOverlay.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100vw;
                            height: 100vh;
                            background: rgba(15, 23, 42, 0.6);
                            z-index: 99999;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            backdrop-filter: blur(4px);
                        `;
                        formOverlay.innerHTML = `
                            <div style="background: white; width: 90%; max-width: 400px; padding: 1.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); display: flex; flex-direction: column; gap: 1rem; box-sizing: border-box; font-family: var(--font-main);">
                                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="color: var(--primary-color, #c0510a);">local_shipping</span>
                                    Datos de Envío
                                </h3>
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-size:0.75rem; font-weight:600; color:#475569;">Nombre y Apellido</label>
                                    <input type="text" id="cart-ship-name" placeholder="ej: Juan Pérez" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; width:100%; box-sizing:border-box;">
                                </div>
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-size:0.75rem; font-weight:600; color:#475569;">Domicilio Particular Completo</label>
                                    <input type="text" id="cart-ship-address" placeholder="ej: Av. Vergara 1234, e/ Paso y Arenales" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; width:100%; box-sizing:border-box;">
                                </div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                    <div style="display:flex; flex-direction:column; gap:4px;">
                                        <label style="font-size:0.75rem; font-weight:600; color:#475569;">Código Postal</label>
                                        <input type="text" id="cart-ship-cp" placeholder="ej: 1712" value="${userData.zipCode || ''}" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; width:100%; box-sizing:border-box;">
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:4px;">
                                        <label style="font-size:0.75rem; font-weight:600; color:#475569;">Localidad</label>
                                        <input type="text" id="cart-ship-locality" placeholder="ej: Hurlingham" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; width:100%; box-sizing:border-box;">
                                    </div>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-size:0.75rem; font-weight:600; color:#475569;">Provincia</label>
                                    <input type="text" id="cart-ship-province" placeholder="ej: Buenos Aires" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; width:100%; box-sizing:border-box;">
                                </div>
                                <div style="display:flex; gap: 8px; justify-content: flex-end; margin-top: 0.5rem;">
                                    <button type="button" id="btn-cancel-cart-ship" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: #e2e8f0; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: #475569; font-family: var(--font-main);">Cancelar</button>
                                    <button type="button" id="btn-save-cart-ship" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: var(--primary-color, #c0510a); border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: white; font-family: var(--font-main);">Guardar</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(formOverlay);

                        const cpInput = formOverlay.querySelector('#cart-ship-cp');
                        const locInput = formOverlay.querySelector('#cart-ship-locality');
                        const provInput = formOverlay.querySelector('#cart-ship-province');

                        let timer = null;
                        cpInput?.addEventListener('input', () => {
                            clearTimeout(timer);
                            timer = setTimeout(() => {
                                const val = cpInput.value.trim();
                                if (val.length >= 3 && window.lookupPostalCode) {
                                    const res = window.lookupPostalCode(val);
                                    if (res) {
                                        if (res.localidad) locInput.value = res.localidad;
                                        if (res.provincia) provInput.value = res.provincia;
                                    }
                                }
                            }, 300);
                        });
                        
                        formOverlay.querySelector('#btn-cancel-cart-ship').addEventListener('click', () => {
                            formOverlay.style.display = 'none';
                        });
                        
                        formOverlay.querySelector('#btn-save-cart-ship').addEventListener('click', () => {
                            const nameVal = formOverlay.querySelector('#cart-ship-name').value.trim();
                            const addrVal = formOverlay.querySelector('#cart-ship-address').value.trim();
                            const cpVal = formOverlay.querySelector('#cart-ship-cp').value.trim();
                            const locVal = formOverlay.querySelector('#cart-ship-locality').value.trim();
                            const provVal = formOverlay.querySelector('#cart-ship-province').value.trim();
                            
                            // Guardar datos
                            userData.name = nameVal;
                            userData.address = addrVal;
                            userData.zipCode = cpVal;
                            userData.locality = locVal;
                            userData.province = provVal;
                            saveUserData();
                            
                            formOverlay.style.display = 'none';
                            renderPerfilCarritoView();
                        });
                    }
                    
                    formOverlay.querySelector('#cart-ship-name').value = userData.name || '';
                    formOverlay.querySelector('#cart-ship-address').value = userData.address || '';
                    formOverlay.querySelector('#cart-ship-cp').value = userData.zipCode || '';
                    formOverlay.querySelector('#cart-ship-locality').value = userData.locality || '';
                    formOverlay.querySelector('#cart-ship-province').value = userData.province || '';
                    formOverlay.style.display = 'flex';
                });
            }

            // --- Manejo de la Selección de Envío en Resumen ML ---
            const shipCards = viewContainer.querySelectorAll('.ml-shipping-card');
            const totalValEl = viewContainer.querySelector('#cart-grand-total-val');
            const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

            function recalculateMLTotal() {
                if (!totalValEl) return;
                let productsSubtotal = 0;
                let hasAnyPrice = false;
                cartItems.forEach(item => {
                    if (item.price) {
                        productsSubtotal += item.price * (item.qty || 1);
                        hasAnyPrice = true;
                    }
                });

                const checkedRadio = viewContainer.querySelector('input[name="cart-selected-shipping"]:checked');
                const shipMode = checkedRadio ? checkedRadio.value : 'flex';

                let shipCost = 0;
                const userZip = (userData.zipCode || '').trim();
                let cpLookupRes = null;
                if (userZip && window.lookupPostalCode) {
                    cpLookupRes = window.lookupPostalCode(userZip);
                }

                const hasValidCp = !!(cpLookupRes && cpLookupRes.hasLocalMatch !== false);

                let flexRate = hasValidCp ? (cpLookupRes?.logistica?.cost || 0) : 0;
                let fleteRate = hasValidCp ? (cpLookupRes?.flete?.cost || 0) : 0;

                let totalLogisticaPackages = 0;
                let totalFletePackages = 0;
                let isFleteFreeByQty = false;
                let isFlexFreeByQty = false;

                cartItems.forEach(item => {
                    const qty = item.qty || 1;
                    const origProd = findCartProductDetails(item);
                    const shipConf = origProd?.shippingConfig || item.shippingConfig || {};
                    const logMax = parseInt(shipConf.logisticaMaxUnits) || 0;
                    const fleteMax = parseInt(shipConf.fleteMaxUnits) || 0;

                    const isGlobalFree = !!(shipConf.isFreeShipping || shipConf.isFree || origProd?.shippingType === 'free' || item.shippingType === 'free');

                    const logFreeMin = parseInt(shipConf.logisticaFreeMinUnits) || 0;
                    if (isGlobalFree || (logFreeMin > 0 && qty >= logFreeMin)) {
                        isFlexFreeByQty = true;
                    }

                    const fleteFreeMin = parseInt(shipConf.fleteFreeMinUnits) || 0;
                    if (isGlobalFree || (fleteFreeMin > 0 && qty >= fleteFreeMin)) {
                        isFleteFreeByQty = true;
                    }

                    totalLogisticaPackages += logMax > 0 ? Math.ceil(qty / logMax) : 1;
                    totalFletePackages += fleteMax > 0 ? Math.ceil(qty / fleteMax) : 1;
                });

                if (hasValidCp && shipMode === 'flex') {
                    shipCost = isFlexFreeByQty ? 0 : (flexRate * Math.max(1, totalLogisticaPackages));
                } else if (hasValidCp && shipMode === 'flete') {
                    shipCost = isFleteFreeByQty ? 0 : (fleteRate * Math.max(1, totalFletePackages));
                } else {
                    shipCost = 0;
                }

                if (hasAnyPrice) {
                    totalValEl.textContent = formatter.format(productsSubtotal + shipCost);
                } else {
                    totalValEl.textContent = 'A consultar';
                }
            }

            shipCards.forEach(card => {
                card.addEventListener('click', (e) => {
                    if (card.classList.contains('disabled')) return;
                    const radio = card.querySelector('input[type="radio"]');
                    if (radio && !radio.disabled) {
                        radio.checked = true;
                        shipCards.forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        recalculateMLTotal();
                    }
                });
            });

            // --- Botón COMPRAR YA (Dispara Wizard showProductPaymentModal) ---
            const btnCartBuyNow = document.getElementById('btn-cart-buy-now');
            if (btnCartBuyNow) {
                btnCartBuyNow.addEventListener('click', () => {
                    if (cartItems.length === 0) return;
                    
                    const firstItem = cartItems[0];
                    const origProd = findCartProductDetails(firstItem);
                    const prodToUse = origProd || {
                        id: firstItem.id,
                        title: firstItem.title,
                        price: firstItem.price,
                        image: firstItem.image
                    };

                    const totalCartQty = cartItems.reduce((acc, i) => acc + (i.qty || 1), 0);
                    let cartPriceSum = 0;
                    cartItems.forEach(i => { if (i.price) cartPriceSum += i.price * (i.qty || 1); });

                    const comboTitles = cartItems.map(i => `${i.qty || 1}x ${i.title}${i.acabado ? ` (${i.acabado})` : ''}`).join(' + ');

                    const syntheticGrupo = {
                        acabado_name: `Carrito (${cartItems.length} ítems)`,
                        cover_image: firstItem.image
                    };

                    // Sincronizar selección de envío y CP ingresado con la persistencia del Modal Checkout
                    const checkedRadio = viewContainer.querySelector('input[name="cart-selected-shipping"]:checked');
                    const selectedShipVal = checkedRadio ? checkedRadio.value : 'flex';
                    const isPickup = selectedShipVal === 'pickup';

                    try {
                        const currentCheckoutData = JSON.parse(localStorage.getItem('latarima_checkout_user_data') || '{}');
                        currentCheckoutData.name = userData.name || currentCheckoutData.name || '';
                        currentCheckoutData.phone = userData.phone || currentCheckoutData.phone || '';
                        currentCheckoutData.dir = userData.address || currentCheckoutData.dir || '';
                        currentCheckoutData.cp = userData.zipCode || currentCheckoutData.cp || '';
                        currentCheckoutData.ciudad = userData.locality || currentCheckoutData.ciudad || '';
                        currentCheckoutData.provincia = userData.province || currentCheckoutData.provincia || '';
                        currentCheckoutData.deliveryMode = isPickup ? 'pickup' : 'shipping';
                        localStorage.setItem('latarima_checkout_user_data', JSON.stringify(currentCheckoutData));
                    } catch(e) {}

                    if (window.showProductPaymentModal) {
                        window.showProductPaymentModal(prodToUse, syntheticGrupo, comboTitles, cartPriceSum, 1);
                    } else if (window.showOfferPaymentModal) {
                        window.showOfferPaymentModal(prodToUse, 1, { grupo: syntheticGrupo, medida: comboTitles, price: cartPriceSum });
                    }
                });
            }

            // --- Botón Consultar por WhatsApp ---
            const btnCartConsultWa = document.getElementById('btn-cart-consult-wa');
            if (btnCartConsultWa) {
                btnCartConsultWa.addEventListener('click', () => {
                    loadUserData();
                    if (cartItems.length === 0) return;

                    const phone = '5491167007723';
                    const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

                    let lines = [];
                    lines.push("*CONSULTA Y PRESUPUESTO DE CARRITO*");
                    lines.push("--------------------------------------");

                    // 1. Detalle de productos
                    let productsSubtotal = 0;
                    let hasAnyPrice = false;

                    lines.push("*Productos:*");
                    cartItems.forEach(item => {
                        const qty = item.qty || 1;
                        const unitPrice = item.price || null;
                        let subtotalText = "";

                        if (unitPrice) {
                            const subtotal = unitPrice * qty;
                            productsSubtotal += subtotal;
                            hasAnyPrice = true;
                            subtotalText = ` -> *${formatter.format(subtotal)}*`;
                        } else {
                            subtotalText = " _(Precio a consultar)_";
                        }

                        let variantDetails = [];
                        if (item.acabado && item.acabado !== 'Único') variantDetails.push(`Acabado: ${item.acabado}`);
                        if (item.medida) variantDetails.push(`Medida: ${item.medida}`);
                        if (item.opcion) variantDetails.push(`${item.opcionLabel || 'Opción'}: ${item.opcion}`);

                        const variantStr = variantDetails.length > 0 ? `\n   └ _${variantDetails.join(' · ')}_` : '';

                        lines.push(`• *${qty}x* ${item.title}${subtotalText}${variantStr}`);
                    });

                    lines.push("--------------------------------------");

                    // 2. Subtotal productos
                    if (hasAnyPrice) {
                        lines.push(`*Subtotal Productos:* ${formatter.format(productsSubtotal)}`);
                    }

                    // 3. Envío seleccionado
                    const checkedRadio = viewContainer.querySelector('input[name="cart-selected-shipping"]:checked');
                    const selectedShipVal = checkedRadio ? checkedRadio.value : 'flex';

                    const userZip = (userData.zipCode || '').trim();
                    let cpLookupRes = null;
                    if (userZip && window.lookupPostalCode) {
                        cpLookupRes = window.lookupPostalCode(userZip);
                    }
                    const hasValidCp = !!(cpLookupRes && cpLookupRes.hasLocalMatch !== false);

                    let totalLogisticaPackages = 0;
                    let totalFletePackages = 0;
                    let isFleteFreeByQty = false;
                    let isFlexFreeByQty = false;

                    cartItems.forEach(item => {
                        const qty = item.qty || 1;
                        const origProd = findCartProductDetails(item);
                        const shipConf = origProd?.shippingConfig || item.shippingConfig || {};
                        const logMax = parseInt(shipConf.logisticaMaxUnits) || 0;
                        const fleteMax = parseInt(shipConf.fleteMaxUnits) || 0;

                        const isGlobalFree = !!(shipConf.isFreeShipping || shipConf.isFree || origProd?.shippingType === 'free' || item.shippingType === 'free');
                        const logFreeMin = parseInt(shipConf.logisticaFreeMinUnits) || 0;
                        if (isGlobalFree || (logFreeMin > 0 && qty >= logFreeMin)) isFlexFreeByQty = true;

                        const fleteFreeMin = parseInt(shipConf.fleteFreeMinUnits) || 0;
                        if (isGlobalFree || (fleteFreeMin > 0 && qty >= fleteFreeMin)) isFleteFreeByQty = true;

                        totalLogisticaPackages += logMax > 0 ? Math.ceil(qty / logMax) : 1;
                        totalFletePackages += fleteMax > 0 ? Math.ceil(qty / fleteMax) : 1;
                    });

                    let flexRate = hasValidCp ? (cpLookupRes?.logistica?.cost || 0) : 0;
                    let fleteRate = hasValidCp ? (cpLookupRes?.flete?.cost || 0) : 0;

                    let shipText = "";
                    let shipCost = 0;

                    if (selectedShipVal === 'flex') {
                        if (isFlexFreeByQty) {
                            shipText = "Logística Flex / Express: *¡GRATIS!*";
                            shipCost = 0;
                        } else if (hasValidCp) {
                            shipCost = flexRate * Math.max(1, totalLogisticaPackages);
                            shipText = `Logística Flex / Express: *${formatter.format(shipCost)}*`;
                        } else {
                            shipText = "Logística Flex / Express _(A cotizar por CP)_";
                        }
                    } else if (selectedShipVal === 'flete') {
                        if (isFleteFreeByQty) {
                            shipText = "Flete Propio: *¡GRATIS!*";
                            shipCost = 0;
                        } else if (hasValidCp) {
                            shipCost = fleteRate * Math.max(1, totalFletePackages);
                            shipText = `Flete Propio: *${formatter.format(shipCost)}*`;
                        } else {
                            shipText = "Flete Propio _(A cotizar por CP)_";
                        }
                    } else if (selectedShipVal === 'externa') {
                        shipText = "Logística Externa / Expreso _(A convenir por WhatsApp)_";
                    } else if (selectedShipVal === 'pickup') {
                        shipText = "Retiro Gratis en Taller (Hurlingham)";
                        shipCost = 0;
                    }

                    lines.push(`*Opción de Envío:* ${shipText}`);

                    // 4. Total Estimado
                    if (hasAnyPrice) {
                        const grandTotal = productsSubtotal + shipCost;
                        lines.push(`*TOTAL ESTIMADO:* *${formatter.format(grandTotal)}*`);
                    } else {
                        lines.push(`*TOTAL ESTIMADO:* A consultar`);
                    }

                    // 5. Datos del cliente (si existen)
                    let clientData = [];
                    if (userData.name) clientData.push(`• Nombre: ${userData.name}`);
                    if (userData.phone) clientData.push(`• Teléfono: ${userData.phone}`);
                    if (userData.zipCode) clientData.push(`• CP: ${userData.zipCode}`);
                    if (userData.locality) clientData.push(`• Localidad: ${userData.locality}`);
                    if (userData.address) clientData.push(`• Dirección: ${userData.address}`);

                    if (clientData.length > 0) {
                        lines.push("--------------------------------------");
                        lines.push("*Datos del Cliente:*");
                        lines.push(clientData.join('\n'));
                    }

                    // 6. Vacaciones si aplica
                    if (window.vacationConfig && window.vacationConfig.active) {
                        const start = window.vacationConfig.startDate || "receso";
                        const deliv = window.vacationConfig.deliveriesDate || "el regreso";
                        lines.push(`\n_(Nota: Entendido receso del ${start}, entregas desde el ${deliv})_`);
                    }

                    lines.push("\n¡Hola! Les comparto mi presupuesto del carrito. ¿Me confirman disponibilidad y los pasos a seguir?");

                    const waMsg = lines.join('\n');
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
                });
            }

            // C. Botón "Compartir Carrito"
            const btnShareCart = document.getElementById('btn-cart-share');
            if (btnShareCart) {
                btnShareCart.addEventListener('click', () => {
                    const encodedCart = cartItems.map(item => {
                        return [
                            item.id,
                            item.qty || 1,
                            encodeURIComponent(item.acabado || 'Único'),
                            encodeURIComponent(item.medida || ''),
                            encodeURIComponent(item.opcion || '')
                        ].join(':');
                    }).join(';');

                    const shareUrl = `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '')}/p/carrito.html?cart=${encodedCart}`;
                    const shareText = `¡Hola! Te comparto mi lista de deseos de La Tarima 🛒\nTotal de productos: ${cartItems.length}`;

                    const copyTextToClipboard = (textToCopy) => {
                        const showToast = () => {
                            const toast = document.getElementById('admin-toast');
                            if (toast) {
                                toast.textContent = "🔗 ¡Enlace de carrito copiado!";
                                toast.classList.add('show');
                                setTimeout(() => toast.classList.remove('show'), 2000);
                            } else {
                                alert("¡Enlace copiado al portapapeles!");
                            }
                        };

                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(textToCopy)
                                .then(showToast)
                                .catch(err => {
                                    console.warn('Clipboard fallback:', err);
                                    fallbackCopy(textToCopy);
                                });
                        } else {
                            fallbackCopy(textToCopy);
                        }

                        function fallbackCopy(text) {
                            try {
                                const textArea = document.createElement("textarea");
                                textArea.value = text;
                                textArea.style.position = "fixed";
                                textArea.style.top = "0";
                                textArea.style.left = "0";
                                textArea.style.width = "2em";
                                textArea.style.height = "2em";
                                textArea.style.padding = "0";
                                textArea.style.border = "none";
                                textArea.style.outline = "none";
                                textArea.style.boxShadow = "none";
                                textArea.style.background = "transparent";
                                document.body.appendChild(textArea);
                                textArea.focus();
                                textArea.select();
                                const successful = document.execCommand('copy');
                                document.body.removeChild(textArea);
                                if (successful) {
                                    showToast();
                                } else {
                                    alert("No se pudo copiar automáticamente.");
                                }
                            } catch (err) {
                                console.error('Fallback copy failed:', err);
                            }
                        }
                    };

                    if (navigator.share) {
                        navigator.share({
                            title: 'Lista de Deseos La Tarima',
                            text: shareText,
                            url: shareUrl
                        }).catch(err => {
                            console.log('Error sharing:', err);
                            copyTextToClipboard(`${shareText}\n${shareUrl}`);
                        });
                    } else {
                        copyTextToClipboard(`${shareText}\n${shareUrl}`);
                    }
                });
            }


        } catch (e) {
            console.error('[Carrito Module] Error rendering Perfil-Carrito view:', e);
        }
    }

    function importCartFromString(cartParam) {
        if (!cartParam) return;
        try {
            const items = cartParam.split(';').map(itemStr => {
                const parts = itemStr.split(':');
                if (!parts[0]) return null;
                return {
                    id: parts[0],
                    qty: parseInt(parts[1]) || 1,
                    acabado: parts[2] ? decodeURIComponent(parts[2]) : 'Único',
                    medida: parts[3] ? decodeURIComponent(parts[3]) : '',
                    opcion: parts[4] ? decodeURIComponent(parts[4]) : ''
                };
            }).filter(Boolean);

            if (items.length === 0) return;

            // Cargar favoritos actuales
            loadCartItems();

            items.forEach(item => {
                const existingIdx = cartItems.findIndex(localItem => 
                    localItem.id === item.id && 
                    (localItem.acabado || '').trim().toLowerCase() === (item.acabado || '').trim().toLowerCase() &&
                    (localItem.medida || '').trim().toLowerCase() === (item.medida || '').trim().toLowerCase() &&
                    (localItem.opcion || '').trim().toLowerCase() === (item.opcion || '').trim().toLowerCase()
                );

                if (existingIdx !== -1) {
                    cartItems[existingIdx].qty = item.qty;
                } else {
                    if (window.findProductById) {
                        const found = window.findProductById(item.id);
                        if (found) {
                            const product = found.product;
                            let img = product.image;
                            if (product.acabados_groups) {
                                const ac = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === (item.acabado || '').trim().toLowerCase());
                                if (ac && ac.cover_image) img = ac.cover_image;
                            }
                            const productCover = Array.isArray(img) ? img[0] : (img || 'img/logo_provisional.png');

                            cartItems.push({
                                id: item.id,
                                title: product.title,
                                acabado: item.acabado,
                                medida: item.medida,
                                opcion: item.opcion,
                                opcionLabel: product.optional_variant?.label || 'Opción',
                                image: productCover,
                                catName: found.catName,
                                qty: item.qty
                            });
                        }
                    }
                }
            });

            saveCartItems();
            
            const toast = document.getElementById('admin-toast');
            if (toast) {
                toast.textContent = `🛒 ¡Se cargaron ${items.length} productos en tu lista!`;
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3000);
            }
            
            if (window.navigateToView) {
                window.navigateToView('view-profile');
            }

            // Limpiar parámetro de la URL
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.delete('cart');
            const newQuery = urlParams.toString();
            const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + (newQuery ? `?${newQuery}` : '');
            window.history.replaceState({ viewId: 'view-profile' }, document.title, cleanUrl);

            // Redibujar vista
            renderPerfilCarritoView();
        } catch (e) {
            console.error('[Carrito Module] Error importing cart:', e);
        }
    }
    window.importCartFromString = importCartFromString;
    window.renderPerfilCarritoView = renderPerfilCarritoView;

    // 7. Mapeado de Inicialización y Namespace Global
    window.CarritoModule = {
        init: function() {
            try {
                injectModuleStyles();
                loadUserData();
                loadCartItems();

                // Reemplazar comportamiento de click en la barra de navegación del Perfil
                const profileNavBtn = document.querySelector('.nav-item[data-target="view-profile"]');
                if (profileNavBtn) {
                    profileNavBtn.addEventListener('click', () => {
                        renderPerfilCarritoView();
                    });
                }

                // Escuchar carga de main.js/delegados en caso de que se navegue dinámicamente
                const origNavigate = window.navigateToView;
                if (origNavigate) {
                    window.navigateToView = function(viewId, context, isBack) {
                        try {
                            origNavigate(viewId, context, isBack);
                            if (viewId === 'view-profile') {
                                renderPerfilCarritoView();
                            }
                        } catch (err) {
                            console.error('[Carrito Module] Error in navigated view override:', err);
                        }
                    };
                }

                // Dibujar si ya estamos cargados en la pestaña de perfil
                renderPerfilCarritoView();
                console.log('[CarritoModule] Inicializado e inyectado con éxito en completo aislamiento.');
            } catch (e) {
                console.error('[Carrito Module] Error durante la inicialización:', e);
            }
        },
        render: renderPerfilCarritoView,
        toggle: toggleProductInCart
    };

    // Inicializador global independiente
    window.initCarritoModule = function() {
        try {
            if (window.CarritoModule && window.CarritoModule.init) {
                window.CarritoModule.init();
            }


        } catch (e) {
            console.error('[Carrito Module] Error en initCarritoModule:', e);
        }
    };

    // Autoinicialización cuando el DOM esté listo
    try {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(window.initCarritoModule, 50);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(window.initCarritoModule, 50);
            });
        }
    } catch (e) {
        console.error('[Carrito Module] Error configurando auto-inicialización:', e);
    }
})();
