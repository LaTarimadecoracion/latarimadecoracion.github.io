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

    function toggleProductInCart(product, acabado, catName = 'Catálogo', medida = '', opcion = '', opcionLabel = '', price = null) {
        try {
            const idx = cartItems.findIndex(item => 
                item.id === product.id && 
                (item.acabado || '').trim().toLowerCase() === (acabado || '').trim().toLowerCase() &&
                (item.medida || '').trim().toLowerCase() === (medida || '').trim().toLowerCase() &&
                (item.opcion || '').trim().toLowerCase() === (opcion || '').trim().toLowerCase()
            );
            
            if (idx !== -1) {
                cartItems.splice(idx, 1);
                console.log(`[Carrito] Quitado de favoritos: ${product.title} (${acabado})`);
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
                    qty: 1,
                    price: price || null
                });
                console.log(`[Carrito] Agregado a favoritos: ${product.title} (${acabado})`);
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
                /* Fila superior: imagen + datos + borrar */
                .cart-item-top {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                }
                .cart-item-clickable-area {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    flex: 1;
                    cursor: pointer;
                    overflow: hidden;
                }
                .cart-item-thumb {
                    width: 72px; height: 72px;
                    border-radius: 12px;
                    background-size: cover;
                    background-position: center;
                    border: 1px solid #F0EDE8;
                    flex-shrink: 0;
                    transition: transform 0.25s ease;
                    background-color: #fdf9f6;
                }
                .cart-item-row:hover .cart-item-thumb {
                    transform: scale(1.05);
                }
                .cart-item-details {
                    flex: 1;
                    overflow: hidden;
                    text-align: left;
                }
                .cart-item-details h5 {
                    margin: 0 0 3px 0;
                    font-size: 0.93rem; font-weight: 700; color: #2c2520;
                    line-height: 1.3;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .cart-item-details p {
                    margin: 0;
                    font-size: 0.76rem; color: #8c857b; line-height: 1.5;
                }
                .cart-item-details .item-tag {
                    display: inline-block;
                    font-size: 0.68rem; color: #c0510a;
                    background: #fff4ed; padding: 2px 7px;
                    border-radius: 20px; margin-top: 4px;
                    font-weight: 700; letter-spacing: 0.3px;
                    border: 1px solid rgba(192,81,10,0.15);
                }
                .cart-item-del-btn {
                    background: #fff1f2; border: none;
                    border-radius: 10px;
                    width: 36px; height: 36px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: #e11d48;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .cart-item-del-btn:hover {
                    background: #ffe4e6; color: #be123c;
                    transform: scale(1.08);
                }

                /* Fila inferior: precio unitario + qty + subtotal */
                .cart-item-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 0.6rem;
                    padding-top: 0.6rem;
                    border-top: 1px solid #F5F3EF;
                    gap: 0.5rem;
                }
                .cart-item-price-label {
                    font-size: 0.72rem; color: #94A3B8; font-weight: 500;
                    white-space: nowrap;
                }
                .cart-item-unit-price {
                    font-size: 0.82rem; color: #64748B; font-weight: 600;
                }
                .cart-item-qty-control {
                    display: flex; align-items: center; gap: 4px;
                    background: #F7F5F2;
                    border-radius: 30px;
                    padding: 3px 6px;
                    border: 1px solid #EAEBE9;
                }
                .qty-btn {
                    background: white; border: none;
                    width: 26px; height: 26px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: #6d675b;
                    font-weight: 800; font-size: 14px;
                    border-radius: 50%;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
                    transition: all 0.2s ease;
                }
                .qty-btn:hover {
                    background: #c0510a; color: white;
                    box-shadow: 0 3px 8px rgba(192,81,10,0.3);
                }
                .qty-val {
                    font-size: 0.85rem; font-weight: 800;
                    min-width: 22px; text-align: center; color: #2c2520;
                }
                .cart-item-subtotal {
                    font-size: 0.95rem; font-weight: 800; color: #c0510a;
                    white-space: nowrap;
                }
                .cart-item-no-price {
                    font-size: 0.72rem; color: #94A3B8; font-style: italic;
                }

                /* Badge de disponibilidad */
                .availability-badge {
                    display: inline-flex; align-items: center; gap: 3px;
                    font-size: 0.68rem; font-weight: 700;
                    padding: 2px 7px; border-radius: 20px;
                    letter-spacing: 0.2px;
                }
                .availability-badge.a-pedido {
                    background: #FEF3C7; color: #92400E;
                    border: 1px solid rgba(146,64,14,0.18);
                }

                /* ── Panel de Total ── */
                .cart-total-panel {
                    background: linear-gradient(135deg, #2c2520 0%, #3d3028 100%);
                    border-radius: 18px;
                    padding: 1.1rem 1.25rem;
                    margin-top: 0.25rem;
                    margin-bottom: 0.75rem;
                    box-shadow: 0 8px 32px rgba(44,37,32,0.18);
                    animation: scaleIn 0.3s ease;
                }
                .cart-total-row {
                    display: flex; align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                }
                .cart-total-label {
                    font-size: 0.8rem; color: rgba(255,255,255,0.55);
                    font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
                }
                .cart-total-amount {
                    font-size: 1.65rem; font-weight: 900;
                    color: white; letter-spacing: -0.5px;
                }
                .cart-total-note {
                    font-size: 0.7rem; color: rgba(255,255,255,0.4);
                    margin-top: 0.3rem; font-style: italic;
                }
                .cart-total-items-count {
                    background: rgba(255,255,255,0.1);
                    border-radius: 20px;
                    padding: 2px 10px;
                    font-size: 0.75rem; color: rgba(255,255,255,0.7);
                    font-weight: 600;
                }
                .cart-total-no-price {
                    font-size: 0.8rem; color: rgba(255,255,255,0.5); font-style: italic;
                }

                /* ── Barra de Acciones ── */
                .cart-actions-bar {
                    display: flex;
                    flex-direction: column;
                    gap: 0.65rem;
                    margin-top: 0.25rem;
                }
                .cart-btn-main {
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    background: linear-gradient(135deg, #c0510a, #d4621c);
                    color: white; border: none;
                    border-radius: 14px;
                    padding: 0.9rem 1.2rem;
                    font-weight: 700; font-size: 0.95rem;
                    cursor: pointer;
                    box-shadow: 0 4px 16px rgba(192,81,10,0.3);
                    transition: all 0.25s ease;
                    width: 100%;
                }
                .cart-btn-main:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(192,81,10,0.4);
                }
                .cart-btn-secondary {
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    background: white;
                    color: #6d675b; border: 1.5px solid #E8E5DF;
                    border-radius: 14px;
                    padding: 0.75rem 1rem;
                    font-weight: 600; font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    width: 100%;
                }
                .cart-btn-secondary:hover {
                    background: #faf8f5;
                    border-color: #c0510a;
                    color: #c0510a;
                }

                /* ── Datos de envío ── */
                .cart-shipping-preview-card {
                    padding: 0.9rem 1rem;
                    background: #fafaf8;
                    border-radius: 12px;
                    border: 1.5px solid #EAEBE9;
                    margin-bottom: 0.75rem;
                    margin-top: 0.25rem;
                    text-align: left;
                }

                /* ── Responsive ── */
                @media (max-width: 600px) {
                    .profile-card-header { padding: 0.85rem 1rem; }
                    .cart-item-top { gap: 0.7rem; }
                    .cart-item-thumb { width: 62px; height: 62px; }
                    .cart-total-amount { font-size: 1.4rem; }
                }

                .giant-btn {
                    border-radius: 14px;
                    padding: 0.9rem 1.5rem;
                    font-weight: 700; font-size: 0.9rem;
                    letter-spacing: 0.3px;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .giant-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                }
            `;
            document.head.appendChild(style);
        } catch (e) {
            console.error('[Carrito Module] Error injecting styles:', e);
        }
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
                    <div class="cart-empty-motivator" style="padding: 2.5rem 1.5rem; text-align: center; border-radius: 20px; background: linear-gradient(145deg, var(--surface-color, #fff), var(--surface-raised, #fdfbf9)); border: 1px solid rgba(180,132,108,0.2); box-shadow: 0 10px 30px rgba(180,132,108,0.06); margin-top:1.5rem;">
                        <div style="width: 80px; height: 80px; background: var(--secondary-color, #fff5ed); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
                            <span class="material-symbols-outlined" style="font-size: 42px; color:var(--primary-color, #c0510a);">shopping_bag</span>
                        </div>
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin:0 0 0.5rem 0;">¡Tu carrito está esperando!</h3>
                        <p style="font-size: 0.9rem; color: var(--text-muted); margin:0 0 1.5rem 0; line-height:1.5;">Descubrí muebles únicos diseñados en madera maciza que transformarán tu hogar.</p>
                        
                        <div style="display:flex; flex-direction:column; gap:0.75rem; max-width: 280px; margin: 0 auto;">
                            <button type="button" class="btn-primary" onclick="if(window.navigateToView) window.navigateToView('view-catalogo')" style="display:flex; align-items:center; justify-content:center; gap:8px; border-radius: 50px; padding: 0.8rem 1rem; font-size:0.95rem; font-weight: 700; width: 100%;">
                                <span class="material-symbols-outlined" style="font-size: 1.2rem;">category</span>
                                Explorar Catálogo
                            </button>
                            <button type="button" class="btn-outline" onclick="document.querySelector('.nav-item[data-target=\\'view-videos\\']').click()" style="display:flex; align-items:center; justify-content:center; gap:8px; border-radius: 50px; padding: 0.8rem 1rem; font-size:0.95rem; font-weight: 700; width: 100%; border-color: rgba(180,132,108,0.3); color: var(--primary-color, #c0510a);">
                                <span class="material-symbols-outlined" style="font-size: 1.2rem;">play_circle</span>
                                Ver Videos Inspiradores
                            </button>
                        </div>
                    </div>
                `;
            } else {
                const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

                // Calcular total acumulado
                let grandTotal = 0;
                let hasAnyPrice = false;
                cartItems.forEach(item => {
                    if (item.price) {
                        grandTotal += item.price * (item.qty || 1);
                        hasAnyPrice = true;
                    }
                });

                const totalItemsQty = cartItems.reduce((acc, item) => acc + (item.qty || 1), 0);

                cartListHTML = `
                    <div style="display:flex; flex-direction:column; gap:0; margin-top:0.5rem;">
                        ${cartItems.map((item, idx) => {
                            const unitPrice = item.price || null;
                            const subtotal  = unitPrice ? unitPrice * (item.qty || 1) : null;
                            const variantDetails = [
                                item.acabado && item.acabado !== 'Único' ? `Acabado: <strong>${item.acabado}</strong>` : '',
                                item.medida ? `Medida: <strong>${item.medida}</strong>` : '',
                                item.opcion ? `${item.opcionLabel || 'Opción'}: <strong>${item.opcion}</strong>` : ''
                            ].filter(Boolean).join(' · ');

                            return `
                            <div class="cart-item-row" style="animation-delay: ${idx * 0.05}s;">
                                <!-- Fila superior: thumb + datos + borrar -->
                                <div class="cart-item-top">
                                    <div class="cart-item-clickable-area" data-id="${item.id}" data-acabado="${item.acabado}" data-medida="${item.medida || ''}" data-opcion="${item.opcion || ''}" title="Ver producto">
                                        <div class="cart-item-thumb" style="background-image: url('${item.image}');"></div>
                                        <div class="cart-item-details">
                                            <h5>${item.title}</h5>
                                            ${variantDetails ? `<p style="margin:0 0 4px 0;">${variantDetails}</p>` : ''}
                                            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                                <span class="item-tag">${item.catName}</span>
                                                <span class="availability-badge a-pedido">🛠️ A pedido</span>
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

                        ${window.vacationConfig && window.vacationConfig.active ? `
                            <div class="vacation-cart-warning">
                                <span class="material-symbols-outlined vacation-icon">info</span>
                                <div>
                                    <strong>¡Taller de vacaciones!</strong><br>
                                    Nuestras vacaciones son del <strong>${window.vacationConfig.startDate || 'receso'}</strong>. Retomamos las entregas/retiros a partir del <strong>${window.vacationConfig.deliveriesDate || 'regreso'}</strong>.<br>
                                    <span style="color:#097969; font-weight:700;">✨ ¡Tu precio queda congelado!</span> Reservando hoy, te garantizamos el precio de lista actual sin aumentos futuros a nuestro regreso.
                                </div>
                            </div>
                        ` : ''}

                        <!-- Panel Total -->
                        <div class="cart-total-panel">
                            <div class="cart-total-row">
                                <div>
                                    <div class="cart-total-label">Total estimado</div>
                                    ${hasAnyPrice
                                        ? `<div class="cart-total-amount">${formatter.format(grandTotal)}</div>`
                                        : `<div class="cart-total-no-price">Consultá precios por WhatsApp</div>`
                                    }
                                    <div class="cart-total-note">Efectivo / Transferencia · Sin impuestos ni envío</div>
                                </div>
                                <div style="text-align:right;">
                                    <span class="cart-total-items-count">${totalItemsQty} ${totalItemsQty === 1 ? 'producto' : 'productos'}</span>
                                    ${hasAnyPrice && cartItems.some(i => !i.price)
                                        ? `<div style="font-size:0.65rem; color:rgba(255,255,255,0.35); margin-top:4px;">*Algunos ítems<br>no tienen precio</div>`
                                        : ''
                                    }
                                </div>
                            </div>
                        </div>

                        <!-- Acciones -->
                        <div class="cart-actions-bar">
                            <button type="button" id="btn-cart-checkout-main" class="cart-btn-main">
                                <span class="material-symbols-outlined" style="font-size:20px;">chat</span>
                                Consultar por WhatsApp 💬
                            </button>
                            <button type="button" id="btn-cart-share" class="cart-btn-secondary">
                                <span class="material-symbols-outlined" style="font-size:18px;">share</span>
                                Compartir esta lista
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
                                        <label style="font-size:0.75rem; font-weight:600; color:#475569;">Localidad</label>
                                        <input type="text" id="cart-ship-locality" placeholder="ej: Hurlingham" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; width:100%; box-sizing:border-box;">
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:4px;">
                                        <label style="font-size:0.75rem; font-weight:600; color:#475569;">Provincia</label>
                                        <input type="text" id="cart-ship-province" placeholder="ej: Buenos Aires" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; width:100%; box-sizing:border-box;">
                                    </div>
                                </div>
                                <div style="display:flex; gap: 8px; justify-content: flex-end; margin-top: 0.5rem;">
                                    <button type="button" id="btn-cancel-cart-ship" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: #e2e8f0; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: #475569; font-family: var(--font-main);">Cancelar</button>
                                    <button type="button" id="btn-save-cart-ship" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: var(--primary-color, #c0510a); border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: white; font-family: var(--font-main);">Guardar</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(formOverlay);
                        
                        formOverlay.querySelector('#btn-cancel-cart-ship').addEventListener('click', () => {
                            formOverlay.style.display = 'none';
                        });
                        
                        formOverlay.querySelector('#btn-save-cart-ship').addEventListener('click', () => {
                            const nameVal = formOverlay.querySelector('#cart-ship-name').value.trim();
                            const addrVal = formOverlay.querySelector('#cart-ship-address').value.trim();
                            const locVal = formOverlay.querySelector('#cart-ship-locality').value.trim();
                            const provVal = formOverlay.querySelector('#cart-ship-province').value.trim();
                            
                            // Guardar datos
                            userData.name = nameVal;
                            userData.address = addrVal;
                            userData.locality = locVal;
                            userData.province = provVal;
                            saveUserData();
                            
                            // Actualizar resumen en DOM
                            const summaryEl = document.getElementById('cart-shipping-summary');
                            if (summaryEl) {
                                summaryEl.innerHTML = `
                                    ${nameVal ? `<strong>Destinatario:</strong> ${nameVal}<br>` : ''}
                                    ${addrVal ? `<strong>Domicilio:</strong> ${addrVal}, ${locVal} (${provVal})` : '<span style="color:#e11d48; font-weight:600; display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:16px;">warning</span> Falta completar dirección de envío</span>'}
                                `;
                            }
                            
                            formOverlay.style.display = 'none';
                        });
                    }
                    
                    formOverlay.querySelector('#cart-ship-name').value = userData.name || '';
                    formOverlay.querySelector('#cart-ship-address').value = userData.address || '';
                    formOverlay.querySelector('#cart-ship-locality').value = userData.locality || '';
                    formOverlay.querySelector('#cart-ship-province').value = userData.province || '';
                    formOverlay.style.display = 'flex';
                });
            }

            // --- Flujo de WhatsApp Unificado con Modal de Pre-calificación ---
            const btnCartCheckoutMain = document.getElementById('btn-cart-checkout-main');
            if (btnCartCheckoutMain) {
                btnCartCheckoutMain.addEventListener('click', () => {
                    loadUserData();
                    
                    // Función constructora del mensaje de WhatsApp para el carrito completo
                    function buildCartWA(tipoEntrega, shippingData = {}) {
                        const itemsText = cartItems.map(item => {
                            let details = [];
                            if (item.acabado && item.acabado !== 'Único') details.push(`Acabado: ${item.acabado}`);
                            if (item.medida) details.push(`Medida: ${item.medida}`);
                            if (item.opcion) details.push(`Opción: ${item.opcion}`);
                            const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
                            return `• ${item.qty || 1}x *${item.title}*${detailStr}`;
                        }).join('\n');

                        let parts = [itemsText];

                        if (tipoEntrega === 'pickup') {
                            parts.push('• Entrega: 🏪 Retiro por el taller');
                        } else if (tipoEntrega === 'shipping') {
                            parts.push('• Entrega: 🚚 Necesito envío a domicilio');
                            const loc = shippingData.localidad || userData.locality || userData.zipCode || '';
                            const dir = shippingData.direccion || userData.address || '';
                            if (loc) parts.push(`• Destino/CP: ${loc}`);
                            if (dir) parts.push(`• Dirección: ${dir}`);
                        }

                        let vacationNote = "";
                        if (window.vacationConfig && window.vacationConfig.active) {
                            const start = window.vacationConfig.startDate || "receso";
                            const deliv = window.vacationConfig.deliveriesDate || "el regreso";
                            vacationNote = `\n\n(Nota: Sé que están de vacaciones del ${start} y las entregas se retoman a partir del ${deliv}. El precio actual pactado queda congelado y mantenido).`;
                        }

                        return `¡Hola La Tarima! Quiero consultar por los siguientes productos de mi carrito:\n\n${parts.join('\n')}\n\n¿Me podés confirmar disponibilidad?${vacationNote}`;
                    }

                    // Crear overlay del modal
                    const existing = document.getElementById('delivery-modal-overlay');
                    if (existing) existing.remove();

                    const overlay = document.createElement('div');
                    overlay.id = 'delivery-modal-overlay';
                    overlay.className = 'delivery-modal-overlay';

                    const sheet = document.createElement('div');
                    sheet.className = 'delivery-modal-sheet';
                    sheet.style.position = 'relative';
                    sheet.innerHTML = `
                        <button class="delivery-modal-back-arrow" id="dopt-back-arrow" title="Volver" style="display:none;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <button class="delivery-modal-close-x" id="dopt-close-x" title="Cerrar">&times;</button>
                        <div class="delivery-modal-handle"></div>
                        <p class="delivery-modal-eyebrow">Antes de continuar</p>
                        <h3 class="delivery-modal-title">¿Necesitás envío?</h3>
                        <p class="delivery-modal-subtitle">Elegí una de las opciones para poder continuar</p>
                        <div class="delivery-modal-options">
                            <button class="delivery-opt-btn delivery-opt-pickup" id="dopt-pickup">
                                <span class="delivery-opt-icon">🏪</span>
                                <span class="delivery-opt-label">Retirar por el taller</span>
                                <span class="delivery-opt-desc">Mismo precio publicado en la web (Efectivo / Transferencia)</span>
                            </button>
                            <button class="delivery-opt-btn delivery-opt-shipping" id="dopt-shipping">
                                <span class="delivery-opt-icon">🚚</span>
                                <span class="delivery-opt-label">Necesito envío</span>
                                <span class="delivery-opt-desc">Te cotizamos el envío por WhatsApp</span>
                            </button>
                        </div>

                        <!-- Formulario desplegable opcional para datos de envío -->
                        <div id="delivery-shipping-form" style="display:none; width:100%; flex-direction:column; gap:10px; margin-top:12px; text-align:left;">
                            ${window.vacationConfig && window.vacationConfig.active ? `
                                <div style="background:#FFF9DB; border:1.5px dashed #FCC419; padding:10px; border-radius:8px; margin-bottom:4px; color:#E67700; font-size:0.8rem; line-height:1.4;">
                                    <strong>⚠️ Envíos reprogramados:</strong> Estamos de vacaciones del <strong>${window.vacationConfig.startDate || 'receso'}</strong>. Los envíos se cotizarán y realizarán a partir del <strong>${window.vacationConfig.deliveriesDate || 'regreso'}</strong>. ¡Mantenemos tu precio actual congelado!
                                </div>
                            ` : ''}
                            <p style="font-size:0.82rem; color:#64748B; margin:0 0 2px 0;">📍 Datos para cotizar el envío <span style="color:#94A3B8;">(opcionales)</span>:</p>
                            <input type="text" id="ship-loc" placeholder="Localidad o Código Postal (ej: Ramos Mejía / 1704)" value="${userData.locality || userData.zipCode || ''}" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid #CBD5E1; font-size:0.88rem; box-sizing:border-box;">
                            <input type="text" id="ship-dir" placeholder="Dirección de entrega (ej: Av. de Mayo 123)" value="${userData.address || ''}" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid #CBD5E1; font-size:0.88rem; box-sizing:border-box;">
                            <button id="btn-submit-shipping-wa" class="btn-primary giant-btn" style="width:100%; justify-content:center; margin-top:4px; font-size:0.92rem;">
                                <span>Enviar consulta por WhatsApp</span>
                            </button>
                        </div>

                        <!-- Panel desplegable con información de Retiro por Taller -->
                        <div id="delivery-pickup-info" style="display:none; width:100%; flex-direction:column; gap:12px; margin-top:10px; text-align:left;">
                            <div style="background:#FFF8F5; border:1.5px solid rgba(160,113,91,0.25); padding:14px; border-radius:14px; font-size:0.85rem; color:#2D3748; line-height:1.5;">
                                ${window.vacationConfig && window.vacationConfig.active ? `
                                    <div style="background:#FFF9DB; border:1.5px dashed #FCC419; padding:10px; border-radius:8px; margin-bottom:12px; color:#E67700; font-size:0.8rem; line-height:1.4;">
                                        <strong>⚠️ Aviso de vacaciones:</strong> Taller cerrado del <strong>${window.vacationConfig.startDate || 'receso'}</strong>. Los retiros se coordinan a partir del <strong>${window.vacationConfig.deliveriesDate || 'regreso'}</strong>. ¡Tu precio queda congelado sin aumentos!
                                    </div>
                                ` : ''}
                                <p style="margin:0 0 6px 0; font-weight:700; color:#A0715B; display:flex; align-items:center; gap:6px;">
                                    <span>💡 Aclaraciones sobre el precio:</span>
                                </p>
                                <p style="margin:0 0 12px 0;">El precio publicado en la web se mantiene pagando en <strong>efectivo o transferencia</strong> <em>(no incluye impuestos ni costo de envío)</em>.</p>
                                
                                <p style="margin:0 0 6px 0; font-weight:700; color:#A0715B; display:flex; align-items:center; gap:6px;">
                                    <span>📍 Ubicación del taller:</span>
                                </p>
                                <p style="margin:0;">Hurlingham, Buenos Aires, Argentina<br><span style="color:#718096; font-size:0.8rem;">(Zona céntrica: cerca de Av. Vergara y Av. Jauretche)</span></p>
                            </div>

                            <button id="btn-submit-pickup-wa" class="btn-primary giant-btn" style="width:100%; justify-content:center; font-size:0.92rem;">
                                <span>Continuar a WhatsApp 💬</span>
                            </button>
                        </div>
                    `;

                    overlay.appendChild(sheet);
                    document.body.appendChild(overlay);
                    requestAnimationFrame(() => overlay.classList.add('open'));

                    const closeModal = () => {
                        overlay.classList.remove('open');
                        setTimeout(() => overlay.remove(), 300);
                    };

                    const resetToInitialView = () => {
                        const pickupInfo = document.getElementById('delivery-pickup-info');
                        const shippingForm = document.getElementById('delivery-shipping-form');
                        const optionsContainer = sheet.querySelector('.delivery-modal-options');
                        const titleEl = sheet.querySelector('.delivery-modal-title');
                        const subtitleEl = sheet.querySelector('.delivery-modal-subtitle');
                        const eyebrowEl = sheet.querySelector('.delivery-modal-eyebrow');
                        const backArrow = document.getElementById('dopt-back-arrow');

                        if (pickupInfo) pickupInfo.style.display = 'none';
                        if (shippingForm) shippingForm.style.display = 'none';
                        if (optionsContainer) optionsContainer.style.display = 'flex';
                        if (backArrow) backArrow.style.display = 'none';

                        if (eyebrowEl) eyebrowEl.textContent = 'Antes de continuar';
                        if (titleEl) titleEl.textContent = '¿Necesitás envío?';
                        if (subtitleEl) subtitleEl.textContent = 'Elegí una de las opciones para poder continuar';
                    };

                    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeModal(); });
                    document.getElementById('dopt-close-x')?.addEventListener('click', closeModal);
                    document.getElementById('dopt-back-arrow')?.addEventListener('click', resetToInitialView);

                    // Opción: Retirar por taller
                    document.getElementById('dopt-pickup').addEventListener('click', () => {
                        const pickupInfo = document.getElementById('delivery-pickup-info');
                        const optionsContainer = sheet.querySelector('.delivery-modal-options');
                        const titleEl = sheet.querySelector('.delivery-modal-title');
                        const subtitleEl = sheet.querySelector('.delivery-modal-subtitle');
                        const eyebrowEl = sheet.querySelector('.delivery-modal-eyebrow');
                        const backArrow = document.getElementById('dopt-back-arrow');

                        if (pickupInfo && optionsContainer) {
                            if (eyebrowEl) eyebrowEl.textContent = 'Retiro por taller';
                            if (titleEl) titleEl.textContent = 'Retiro en Hurlingham';
                            if (subtitleEl) subtitleEl.textContent = 'Ubicación y modalidad de entrega en el taller:';
                            if (backArrow) backArrow.style.display = 'flex';

                            optionsContainer.style.display = 'none';
                            pickupInfo.style.display = 'flex';

                            document.getElementById('btn-submit-pickup-wa')?.addEventListener('click', () => {
                                closeModal();
                                try {
                                    if (typeof gtag === 'function') gtag('event', 'contact', { method: 'WhatsApp', event_category: 'Engagement', event_label: 'Consultar WA Carrito - Retiro Taller' });
                                } catch (err) {}
                                window.open(`https://wa.me/5491167007723?text=${encodeURIComponent(buildCartWA('pickup'))}`, '_blank');
                            });
                        }
                    });

                    // Opción: Necesito envío
                    document.getElementById('dopt-shipping').addEventListener('click', () => {
                        const formContainer = document.getElementById('delivery-shipping-form');
                        const optionsContainer = sheet.querySelector('.delivery-modal-options');
                        const titleEl = sheet.querySelector('.delivery-modal-title');
                        const subtitleEl = sheet.querySelector('.delivery-modal-subtitle');
                        const eyebrowEl = sheet.querySelector('.delivery-modal-eyebrow');
                        const backArrow = document.getElementById('dopt-back-arrow');

                        if (formContainer) {
                            if (eyebrowEl) eyebrowEl.textContent = 'Cotizá tu envío';
                            if (titleEl) titleEl.textContent = 'Datos para el envío';
                            if (subtitleEl) subtitleEl.textContent = 'Completá estos datos básicos (opcionales) para cotizar el costo de envío. Te lo recomendamos para agilizar tu compra 👌';
                            if (backArrow) backArrow.style.display = 'flex';

                            optionsContainer.style.display = 'none';
                            formContainer.style.display = 'flex';
                            document.getElementById('ship-loc')?.focus();

                            document.getElementById('btn-submit-shipping-wa').addEventListener('click', () => {
                                const localidad = document.getElementById('ship-loc')?.value.trim() || '';
                                const direccion = document.getElementById('ship-dir')?.value.trim() || '';
                                closeModal();
                                try {
                                    if (typeof gtag === 'function') gtag('event', 'contact', { method: 'WhatsApp', event_category: 'Engagement', event_label: 'Consultar WA Carrito - Necesita Envio' });
                                } catch (err) {}
                                window.open(`https://wa.me/5491167007723?text=${encodeURIComponent(buildCartWA('shipping', { localidad, direccion }))}`, '_blank');
                            });
                        }
                    });
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
