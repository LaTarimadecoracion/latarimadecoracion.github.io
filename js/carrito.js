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

    function toggleProductInCart(product, acabado, catName = 'Catálogo', medida = '', opcion = '', opcionLabel = '') {
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
                    qty: 1
                });
                console.log(`[Carrito] Agregado a favoritos: ${product.title} (${acabado})`);
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
                #view-profile .view-content {
                    display: block !important;
                    padding: 1.5rem !important;
                    overflow-y: auto;
                    height: 100%;
                    background: #fdfdfd;
                }
                .profile-card-header {
                    background: white;
                    border-radius: var(--radius-md, 12px);
                    padding: 1.5rem 1.25rem;
                    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
                    border: 1.5px solid #E8ECF0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    position: relative;
                    transition: all 0.2s ease;
                }
                .profile-card-header:hover {
                    border-color: var(--primary-color, #c0510a);
                }
                .profile-settings-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--text-muted, #64748b);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s, transform 0.2s;
                }
                .profile-settings-btn:hover {
                    color: var(--primary-color, #c0510a);
                    transform: rotate(45deg);
                }
                .profile-avatar-circle {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 32px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.08);
                    flex-shrink: 0;
                    background-size: cover;
                    background-position: center;
                    margin-bottom: 0.8rem;
                }
                .profile-info h3 {
                    margin: 0;
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: var(--text-main, #334155);
                }
                .profile-info p {
                    margin: 4px 0 0 0;
                    font-size: 0.8rem;
                    color: var(--text-muted, #64748b);
                }
                .profile-edit-form {
                    background: white;
                    border-radius: var(--radius-md, 12px);
                    padding: 1.25rem;
                    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
                    border: 1.5px solid #E8ECF0;
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    animation: slideDown 0.2s ease-out;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .avatar-selector-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.5rem;
                    margin-top: 4px;
                }
                .avatar-option {
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    border: 2.5px solid transparent;
                    transition: all 0.2s ease;
                    color: white;
                }
                .avatar-option.selected {
                    border-color: var(--primary-color, #c0510a);
                    transform: scale(1.06);
                }
                .cart-section {
                    margin-top: 1.75rem;
                    margin-bottom: 5.5rem;
                }
                .cart-section h4 {
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    color: var(--text-muted, #64748b);
                    margin-bottom: 0.85rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .cart-item-row {
                    background: white;
                    border-radius: 12px;
                    padding: 0.9rem;
                    border: 1.5px solid #E8ECF0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    margin-bottom: 0.8rem;
                    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
                    animation: fadeIn 0.2s ease;
                }
                .cart-item-clickable-area {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    width: 100%;
                    cursor: pointer;
                    overflow: hidden;
                }
                .cart-item-thumb {
                    width: 56px;
                    height: 56px;
                    border-radius: 8px;
                    background-size: cover;
                    background-position: center;
                    border: 1px solid #E2E8F0;
                    flex-shrink: 0;
                }
                .cart-item-details {
                    flex: 1;
                    overflow: hidden;
                }
                .cart-item-details h5 {
                    margin: 0 0 4px 0;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--text-main, #334155);
                    line-height: 1.3;
                }
                .cart-item-details p {
                    margin: 2px 0 0 0;
                    font-size: 0.78rem;
                    color: var(--text-muted, #64748b);
                    line-height: 1.5;
                }
                .cart-item-qty-control {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: #f8fafc;
                    border-radius: 20px;
                    padding: 3px 6px;
                    border: 1.5px solid #e2e8f0;
                    transition: all 0.2s ease;
                }
                .cart-item-qty-control:hover {
                    border-color: #cbd5e1;
                }
                .qty-btn {
                    background: none;
                    border: none;
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #64748b;
                    font-weight: 700;
                    font-size: 16px;
                    padding: 0;
                    border-radius: 50%;
                    transition: background 0.2s, color 0.2s, transform 0.1s;
                }
                .qty-btn:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }
                .qty-btn:active {
                    transform: scale(0.9);
                }
                .qty-val {
                    font-size: 0.85rem;
                    font-weight: 700;
                    min-width: 20px;
                    text-align: center;
                    color: #1e293b;
                }
                .cart-item-del-btn {
                    background: none;
                    border: none;
                    padding: 0.4rem;
                    cursor: pointer;
                    color: #e11d48;
                    opacity: 0.7;
                    display: flex;
                    align-items: center;
                    transition: opacity 0.2s;
                }
                .cart-item-del-btn:hover {
                    opacity: 1;
                }
                .cart-actions-bar {
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                    margin-top: 1.5rem;
                }
            \`;
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
                    <div style="padding: 3rem 1rem; text-align: center; color: var(--text-muted, #64748b); border: 1.5px dashed #E8ECF0; border-radius: 12px; background: white; margin-top:0.5rem;">
                        <span class="material-symbols-outlined" style="font-size: 38px; opacity:0.4; display:block; margin-bottom:0.5rem; color:var(--primary-color, #c0510a);">favorite_border</span>
                        <p style="font-size:0.85rem; margin:0; font-weight: 600;">Tu lista de deseos está vacía.</p>
                        <p style="font-size:0.75rem; color:#94a3b8; margin:4px 0 0 0;">¡Explorá el catálogo y agregá viruta fresca!</p>
                    </div>
                `;
            } else {
                cartListHTML = `
                    <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:0.5rem;">
                        ${cartItems.map((item, idx) => `
                            <div class="cart-item-row">
                                <!-- Clickable Product Area -->
                                <div class="cart-item-clickable-area" data-id="${item.id}" data-acabado="${item.acabado}" data-medida="${item.medida || ''}" data-opcion="${item.opcion || ''}" title="Ver producto">
                                    <div class="cart-item-thumb" style="background-image: url('${item.image}');"></div>
                                    <div class="cart-item-details">
                                        <h5>${item.title}</h5>
                                        <p style="margin: 0;">
                                            <span style="display:block; margin-bottom: 2px;">Acabado: <strong>${item.acabado}</strong></span>
                                            ${item.medida ? `<span style="display:block; margin-bottom: 2px;">Medida: <strong>${item.medida}</strong></span>` : ''}
                                            ${item.opcion ? `<span style="display:block; margin-bottom: 2px;">${item.opcionLabel || 'Opción'}: <strong>${item.opcion}</strong></span>` : ''}
                                        </p>
                                        <p style="font-size:0.72rem; color:#94a3b8; margin: 4px 0 0 0;">${item.catName}</p>
                                    </div>
                                </div>
                                <!-- Quantity & Delete Right Actions Group -->
                                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-top: 1px solid #f1f5f9; padding-top: 0.8rem; margin-top: 0.2rem;">
                                    <!-- Qty Control -->
                                    <div class="cart-item-qty-control">
                                        <button type="button" class="qty-btn qty-minus" data-index="${idx}">-</button>
                                        <span class="qty-val">${item.qty || 1}</span>
                                        <button type="button" class="qty-btn qty-plus" data-index="${idx}">+</button>
                                    </div>
                                    <!-- Delete Button -->
                                    <button type="button" class="cart-item-del-btn" data-index="${idx}" title="Quitar de la lista de deseos" style="background: #fff1f2; border-radius: 8px; padding: 6px; color: #e11d48;">
                                        <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                        
                        <!-- Acciones Directas Doble Camino (Sin formularios intermedios) -->
                        <div class="cart-actions-bar">
                            <button type="button" id="btn-cart-checkout-shipping" class="btn-primary giant-btn" style="display:flex; align-items:center; justify-content:center; gap:8px;">
                                <span class="material-symbols-outlined">local_shipping</span>
                                Solicitar Envío
                            </button>
                            <button type="button" id="btn-cart-checkout-pickup" class="btn-outline giant-btn" style="display:flex; align-items:center; justify-content:center; gap:8px; border-color:#f5c299; background:white; color:#c0510a;">
                                <span class="material-symbols-outlined">storefront</span>
                                Retirar por Taller (Hurlingham)
                            </button>
                            <button type="button" id="btn-cart-share" class="btn-outline giant-btn" style="display:flex; align-items:center; justify-content:center; gap:8px; border-color:#cbd5e1; background:white; color:#475569; margin-top: 4px;">
                                <span class="material-symbols-outlined">share</span>
                                Compartir esta Lista / Carrito
                            </button>
                        </div>
                    </div>
                `;
            }

            // Estructura de cabecera de perfil centrado + engranaje en esquina superior derecha
            viewContainer.innerHTML = `
                <!-- Cabecera de Perfil (Centrada + Engranaje Config) -->
                <div class="profile-card-header">
                    <!-- Botón de Engranaje de Configuración en Esquina Superior Derecha -->
                    <button type="button" class="profile-settings-btn" id="btn-toggle-profile-settings" title="Configurar Perfil">
                        <span class="material-symbols-outlined" style="font-size: 24px;">settings</span>
                    </button>

                    <!-- Avatar Centrado -->
                    ${userData.photo ? `
                        <div class="profile-avatar-circle" style="background-image: url('${userData.photo}'); border: 2.5px solid var(--primary-color, #c0510a);"></div>
                    ` : `
                        <div class="profile-avatar-circle" style="background: ${curPreset.gradient};">
                            <span class="material-symbols-outlined" style="font-size: 32px;">${curPreset.icon}</span>
                        </div>
                    `}

                    <!-- Datos del Perfil Centrados Abajo -->
                    <div class="profile-info">
                        <h3>${displayName}</h3>
                        <p>${userData.phone.trim() ? `📞 ${userData.phone.trim()}` : 'Sin celular configurado'}</p>
                    </div>
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
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Correo Electrónico</label>
                        <input type="email" id="edit-user-email" value="${userData.email}" placeholder="ej: juan@mail.com" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
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
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:0.75rem; font-weight:600; color:var(--text-main, #334155);">Código Postal</label>
                        <input type="text" id="edit-user-zipCode" value="${userData.zipCode}" placeholder="ej: 1686" style="padding:0.5rem 0.7rem; font-size:0.85rem; border:1.5px solid #cbd5e1; border-radius:8px; font-family:var(--font-main);">
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

            // --- Doble Flujo de Acciones de WhatsApp Simplificado ---
            // A. Botón "Solicitar Envío" (Directo, sin formulario intermedio)
            const btnShipping = document.getElementById('btn-cart-checkout-shipping');
            if (btnShipping) {
                btnShipping.addEventListener('click', () => {
                    loadUserData();
                    
                    // Detalle de productos favoritos con cantidad dinámica
                    const itemsText = cartItems.map(item => `- ${item.qty || 1}x ${item.title} (Acabado: ${item.acabado}) [${item.catName}]`).join('\n');
                    
                    // Compilar datos de perfil si existen
                    let dataLines = [];
                    if (userData.name.trim()) dataLines.push(`- *Nombre:* ${userData.name.trim()}`);
                    if (userData.dni.trim()) dataLines.push(`- *DNI:* ${userData.dni.trim()}`);
                    if (userData.phone.trim()) dataLines.push(`- *Celular:* ${userData.phone.trim()}`);
                    if (userData.tel.trim()) dataLines.push(`- *Teléfono:* ${userData.tel.trim()}`);
                    if (userData.address.trim()) dataLines.push(`- *Domicilio:* ${userData.address.trim()}`);
                    if (userData.locality.trim()) dataLines.push(`- *Localidad:* ${userData.locality.trim()}`);
                    if (userData.province.trim()) dataLines.push(`- *Provincia:* ${userData.province.trim()}`);
                    if (userData.zipCode.trim()) dataLines.push(`- *CP:* ${userData.zipCode.trim()}`);
                    if (userData.email.trim()) dataLines.push(`- *Correo:* ${userData.email.trim()}`);

                    let detailsSection = '';
                    if (dataLines.length > 0) {
                        detailsSection = `\n\n*Mis Datos de Entrega:*\n${dataLines.join('\n')}`;
                    }

                    // Leyenda obligatoria de coordinación si faltan datos clave de envío
                    let leyend = '';
                    if (!userData.address.trim() || !userData.name.trim()) {
                        leyend = `\n\n_Atención: El cliente requiere envío, coordinar datos de entrega en el chat._`;
                    }

                    const text = `¡Hola La Tarima! Quiero solicitar cotización de envío a domicilio para los siguientes productos:\n\n${itemsText}${detailsSection}${leyend}`;
                    
                    const url = `https://wa.me/5491167007723?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                });
            }

            // B. Botón "Retirar por Taller" (Productos + Nombre únicamente)
            const btnPickup = document.getElementById('btn-cart-checkout-pickup');
            if (btnPickup) {
                btnPickup.addEventListener('click', () => {
                    loadUserData();
                    const name = userData.name.trim() || 'Cliente';
                    const itemsText = cartItems.map(item => `- ${item.qty || 1}x ${item.title} (Acabado: ${item.acabado}) [${item.catName}]`).join('\n');
                    
                    const text = `¡Hola La Tarima! Soy ${name}. Quiero consultar para retirar por el taller en Hurlingham los siguientes productos:\n\n${itemsText}`;
                    
                    const url = `https://wa.me/5491167007723?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
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

                    const shareUrl = `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '/')}?cart=${encodedCart}`;
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
