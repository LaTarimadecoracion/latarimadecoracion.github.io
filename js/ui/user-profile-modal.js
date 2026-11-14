// js/ui/user-profile-modal.js
// --- USER PROFILE & ACCOUNT MENU (SIDE DRAWER LATERAL) ---
// Transforma el perfil en un Menú y Lista estructurado en columna de opciones:
// El usuario ve todas sus opciones ordenadas en lista (Mis Compras, Carrito, Datos Personales, 
// Dirección de Entrega, Facturación, etc.) y puede entrar a cada una presionando su botón.

(function() {
    'use strict';

    let isProfileDrawerOpen = false;

    function injectProfileDrawerStyles() {
        if (document.getElementById('user-profile-drawer-styles')) return;
        const style = document.createElement('style');
        style.id = 'user-profile-drawer-styles';
        style.textContent = `
            #user-profile-drawer-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.55);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                z-index: 999998;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s;
            }
            #user-profile-drawer-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            #user-profile-drawer {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                max-width: 480px;
                background: #ffffff;
                z-index: 999999;
                box-shadow: -10px 0 35px rgba(0, 0, 0, 0.22);
                transform: translateX(100%);
                transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                font-family: inherit;
                overflow: hidden;
            }
            #user-profile-drawer.active {
                transform: translateX(0);
            }

            .user-profile-drawer-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem 1.25rem;
                border-bottom: 1px solid #f1f5f9;
                background: #ffffff;
                flex-shrink: 0;
            }
            .user-profile-drawer-title-wrap {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
            }
            .user-profile-drawer-icon {
                color: #0f172a;
                font-size: 24px;
                background: #f1f5f9;
                padding: 7px;
                border-radius: 10px;
                flex-shrink: 0;
            }
            .user-profile-drawer-badge {
                font-size: 0.65rem;
                font-weight: 800;
                color: #94a3b8;
                letter-spacing: 0.8px;
                text-transform: uppercase;
            }
            .user-profile-drawer-title {
                font-size: 1.15rem;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                line-height: 1.2;
            }
            .user-profile-drawer-close-btn {
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
                padding: 0;
                font-size: 18px;
                line-height: 1;
            }
            .user-profile-drawer-close-btn:hover {
                background: #f1f5f9;
                color: #0f172a;
                transform: rotate(90deg);
            }

            /* Estilos de la Lista de Opciones (Columna Sobria Full-Width) */
            .profile-menu-list {
                display: flex;
                flex-direction: column;
                width: 100%;
                box-sizing: border-box;
            }
            .profile-menu-btn {
                width: 100%;
                background: transparent;
                border: none;
                border-bottom: 1px solid #f1f5f9;
                border-radius: 0;
                padding: 0.95rem 1.25rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                cursor: pointer;
                text-align: left;
                transition: background-color 0.15s ease, padding-left 0.15s ease;
                box-sizing: border-box;
                font-family: inherit;
            }
            .profile-menu-btn:hover {
                background: #f8fafc;
                padding-left: 1.45rem;
            }
            .profile-menu-btn:active {
                background: #f1f5f9;
            }
            .profile-menu-btn-content {
                display: flex;
                align-items: center;
                gap: 14px;
                min-width: 0;
                flex: 1;
            }
            .profile-menu-icon {
                color: #475569;
                font-size: 22px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.15s ease;
            }
            .profile-menu-btn:hover .profile-menu-icon {
                color: #0f172a;
            }
            .profile-menu-title {
                font-size: 0.92rem;
                font-weight: 700;
                color: #1e293b;
                letter-spacing: -0.15px;
            }
            .profile-menu-chevron {
                font-size: 18px;
                color: #94a3b8;
                flex-shrink: 0;
                transition: transform 0.15s, color 0.15s;
            }
            .profile-menu-btn:hover .profile-menu-chevron {
                color: #0f172a;
                transform: translateX(3px);
            }

            /* Sub-vistas (Formularios enfocados) */
            .profile-subview-back-bar {
                display: flex;
                align-items: center;
                gap: 10px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 0.6rem 0.85rem;
                cursor: pointer;
                width: 100%;
                box-sizing: border-box;
                font-family: inherit;
                transition: all 0.2s;
            }
            .profile-subview-back-bar:hover {
                background: #f1f5f9;
                border-color: #cbd5e1;
            }

            @media (max-width: 640px) {
                #user-profile-drawer {
                    max-width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="flex-shrink:0;"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"/><path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"/></svg>`;

    const esc = (val) => String(val == null ? '' : val)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    function mountUserProfileUI(card, options = {}) {
        const isModal = options.isModal !== false;
        const onClose = typeof options.onClose === 'function' ? options.onClose : () => {};
        const onReopen = typeof options.onReopen === 'function' ? options.onReopen : () => {};

        // Estado interno de subvista: 'menu' | 'contact' | 'address' | 'billing'
        let currentSubView = 'menu';

        function renderCurrentState() {
            const publicUser = (window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function')
                ? window.AdminAuth.getPublicUser()
                : null;

            const currentData = (window.UserDataManager && typeof window.UserDataManager.get === 'function')
                ? window.UserDataManager.get()
                : {};

            const ordersList = (typeof window.getMyLocalOrders === 'function') ? window.getMyLocalOrders() : [];
            const ordersCount = ordersList.length;
            const ordersCountText = ordersCount > 0 ? `${ordersCount} ${ordersCount === 1 ? 'pedido' : 'pedidos'}` : 'Sin pedidos';

            let cartCount = 0;
            try {
                const rawCart = localStorage.getItem('cartItems');
                if (rawCart) {
                    const parsed = JSON.parse(rawCart);
                    cartCount = Array.isArray(parsed) ? parsed.length : 0;
                }
            } catch (e) {}
            const cartCountText = cartCount > 0 ? `${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}` : 'Vacío';

            const isStaff = publicUser && (publicUser.role === 'superadmin' || publicUser.role === 'colaborador');
            const roleBadgeText = publicUser
                ? (publicUser.role === 'superadmin'
                    ? 'SuperAdmin'
                    : (publicUser.role === 'colaborador' ? 'Equipo Taller' : (publicUser.clientTier === 'mayorista' ? 'Mayorista VIP' : 'Cliente Verificado')))
                : 'Invitado';

            const googleInitial = publicUser ? (((publicUser.nombre || publicUser.email || 'U').trim().charAt(0) || 'U').toUpperCase()) : 'I';
            const userAvatarHTML = (publicUser && publicUser.picture)
                ? `<img src="${esc(publicUser.picture)}" referrerpolicy="no-referrer" alt="${esc(publicUser.nombre || 'Google')}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid #86efac; flex-shrink: 0;">`
                : `<div style="width: 46px; height: 46px; border-radius: 50%; background: ${publicUser ? '#16a34a' : '#64748b'}; color: #ffffff; font-weight: 900; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${esc(googleInitial)}</div>`;

            // Subtítulos dinámicos para los botones del menú
            const contactSubtitle = (currentData.name || (publicUser && publicUser.nombre))
                ? `${esc(currentData.name || publicUser.nombre)} ${currentData.phone ? '· ' + esc(currentData.phone) : ''}`
                : 'Nombre, teléfono y WhatsApp';

            const addressSubtitle = currentData.address
                ? `${esc(currentData.address)} ${currentData.zipCode ? '(CP ' + esc(currentData.zipCode) + ')' : ''}`
                : (currentData.zipCode ? `Código Postal: ${esc(currentData.zipCode)}` : 'Configurar domicilio habitual de entrega');

            const billingSubtitle = currentData.cuit
                ? `${esc(currentData.razonSocial || 'Factura')} · CUIT: ${esc(currentData.cuit)}`
                : 'Factura B a Consumidor Final o Factura A (Opcional)';

            // Cabecera superior del Drawer
            const headerHTML = isModal ? `
                <div class="user-profile-drawer-header">
                    <div class="user-profile-drawer-title-wrap">
                        <span class="material-symbols-outlined user-profile-drawer-icon">
                            ${currentSubView === 'menu' ? 'account_circle' : (currentSubView === 'contact' ? 'person' : (currentSubView === 'address' ? 'location_on' : 'receipt_long'))}
                        </span>
                        <div style="min-width: 0;">
                            <div class="user-profile-drawer-badge">La Tarima · Mi Cuenta</div>
                            <h3 class="user-profile-drawer-title">
                                ${currentSubView === 'menu' ? 'Mi Cuenta y Perfil' : (currentSubView === 'contact' ? 'Datos de Contacto' : (currentSubView === 'address' ? 'Dirección de Entrega' : 'Datos de Facturación'))}
                            </h3>
                        </div>
                    </div>
                    <button type="button" id="btn-close-user-profile" class="user-profile-drawer-close-btn" title="Cerrar">
                        ✕
                    </button>
                </div>
                <div style="height: 3px; background: linear-gradient(90deg, #16a34a, #22c55e); flex-shrink: 0;"></div>
            ` : `
                <div style="width: 100%; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; flex-shrink: 0; box-sizing: border-box;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                            <span class="material-symbols-outlined" style="color: #0f172a; font-size: 22px; background: #f1f5f9; padding: 6px; border-radius: 10px; flex-shrink: 0;">account_circle</span>
                            <div style="min-width: 0; flex: 1;">
                                <div style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase;">LA TARIMA - MI CUENTA</div>
                                <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">
                                    ${currentSubView === 'menu' ? 'Mi Cuenta y Perfil' : (currentSubView === 'contact' ? 'Datos de Contacto' : (currentSubView === 'address' ? 'Dirección de Entrega' : 'Datos de Facturación'))}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div style="height: 4px; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 4px; margin-top: 8px;"></div>
                </div>
            `;

            // =========================================================================
            // VISTA 1: MENÚ Y LISTA DE OPCIONES EN COLUMNA (VISTA PRINCIPAL)
            // =========================================================================
            if (currentSubView === 'menu') {
                card.innerHTML = `
                    ${headerHTML}

                    <div style="flex: 1; overflow-y: auto; padding: 0; box-sizing: border-box; width: 100%; display: flex; flex-direction: column; -webkit-overflow-scrolling: touch;">

                        <!-- Tarjeta de Identidad de Cuenta Sobria Full-Width -->
                        <div style="padding: 1.1rem 1.25rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #ffffff;">
                            <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                                ${userAvatarHTML}
                                <div style="min-width: 0; flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                        <span style="font-size: 0.95rem; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            ${esc(publicUser ? (publicUser.nombre || 'Usuario Google') : 'Comprador Invitado')}
                                        </span>
                                        <span style="background: ${isStaff ? '#fee2e2' : '#f1f5f9'}; color: ${isStaff ? '#dc2626' : '#475569'}; border: 1px solid ${isStaff ? '#fecaca' : '#e2e8f0'}; font-size: 0.65rem; font-weight: 800; padding: 2px 7px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.3px;">
                                            ${roleBadgeText}
                                        </span>
                                    </div>
                                    <div style="font-size: 0.76rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
                                        ${esc(publicUser ? (publicUser.email || '') : 'Sin registrar · Podés comprar igual')}
                                    </div>
                                </div>
                            </div>

                            <!-- Botones de Acción en Cabecera (Login / Logout) -->
                            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                                ${!publicUser ? `
                                    <button type="button" id="btn-menu-google-login" style="background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; transition: all 0.2s;" onmouseenter="this.style.borderColor='#0f172a';" onmouseleave="this.style.borderColor='#cbd5e1';">
                                        ${GOOGLE_SVG}
                                        <span>Acceder</span>
                                    </button>
                                ` : `
                                    <button type="button" id="btn-profile-google-logout" style="background: transparent; border: 1px solid #e2e8f0; color: #64748b; border-radius: 8px; padding: 0.4rem 0.65rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px;" title="Cerrar sesión" onmouseenter="this.style.borderColor='#ef4444';this.style.color='#dc2626';" onmouseleave="this.style.borderColor='#e2e8f0';this.style.color='#64748b';">
                                        <span class="material-symbols-outlined" style="font-size: 15px;">logout</span>
                                        <span>Salir</span>
                                    </button>
                                `}
                            </div>
                        </div>

                        <!-- COLUMNA DE OPCIONES SOBRIA Y FULL-WIDTH -->
                        <div class="profile-menu-list">

                            <!-- 1. Mis Compras / Pedidos -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-my-orders">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon">shopping_bag</span>
                                    <span class="profile-menu-title">Mis Pedidos y Compras</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    ${ordersCount > 0 ? `
                                        <span style="background: #f1f5f9; color: #475569; font-size: 0.72rem; font-weight: 700; padding: 2px 7px; border-radius: 6px;">
                                            ${ordersCountText}
                                        </span>
                                    ` : ''}
                                    <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                                </div>
                            </button>

                            <!-- 2. Mi Carrito -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-cart">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon">shopping_cart</span>
                                    <span class="profile-menu-title">Mi Carrito de Compras</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    ${cartCount > 0 ? `
                                        <span style="background: #f1f5f9; color: #475569; font-size: 0.72rem; font-weight: 700; padding: 2px 7px; border-radius: 6px;">
                                            ${cartCountText}
                                        </span>
                                    ` : ''}
                                    <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                                </div>
                            </button>

                            <!-- 3. Datos Personales y Contacto -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-contact">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon">person</span>
                                    <span class="profile-menu-title">Datos Personales y Contacto</span>
                                </div>
                                <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                            </button>

                            <!-- 4. Dirección de Entrega y Envíos -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-address">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon">location_on</span>
                                    <span class="profile-menu-title">Dirección de Entrega y Envíos</span>
                                </div>
                                <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                            </button>

                            <!-- 5. Datos de Facturación (Opcional) -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-billing">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon">receipt_long</span>
                                    <span class="profile-menu-title">Datos de Facturación</span>
                                </div>
                                <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                            </button>

                            <!-- 6. Centro de Notificaciones -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-notif">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon">notifications</span>
                                    <span class="profile-menu-title">Notificaciones y Avisos</span>
                                </div>
                                <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                            </button>

                            <!-- 7. Panel de Administración (Staff / SuperAdmin) -->
                            ${isStaff ? `
                                <button type="button" class="profile-menu-btn" id="btn-opt-admin">
                                    <div class="profile-menu-btn-content">
                                        <span class="material-symbols-outlined profile-menu-icon" style="color: #0f172a;">admin_panel_settings</span>
                                        <span class="profile-menu-title" style="color: #0f172a;">Panel de Administración</span>
                                    </div>
                                    <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                                </button>
                            ` : ''}

                        </div>

                        <!-- Pie del menú con soporte y limpieza -->
                        <div style="margin-top: auto; padding: 1.25rem; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                            <button type="button" id="btn-clear-user-profile" style="background: transparent; border: none; color: #94a3b8; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 4px 6px; border-radius: 6px;" onmouseenter="this.style.color='#dc2626';" onmouseleave="this.style.color='#94a3b8';">
                                <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                <span>Limpiar datos guardados</span>
                            </button>
                            <span style="font-size: 0.72rem; color: #cbd5e1; font-weight: 700;">La Tarima v2.0</span>
                        </div>

                    </div>
                `;

                // Eventos del Menú Principal
                const closeBtn = card.querySelector('#btn-close-user-profile');
                if (closeBtn) closeBtn.onclick = onClose;

                // 1. Mis Compras
                card.querySelector('#btn-opt-my-orders')?.addEventListener('click', () => {
                    onClose();
                    if (window.navigateToView) window.navigateToView('view-my-orders');
                });

                // 2. Mi Carrito
                card.querySelector('#btn-opt-cart')?.addEventListener('click', () => {
                    onClose();
                    setTimeout(() => {
                        if (window.CartDrawer && typeof window.CartDrawer.open === 'function') {
                            window.CartDrawer.open();
                        } else if (window.navigateToView) {
                            window.navigateToView('view-profile');
                        }
                    }, 180);
                });

                // 3. Entrar a Datos de Contacto
                card.querySelector('#btn-opt-contact')?.addEventListener('click', () => {
                    currentSubView = 'contact';
                    renderCurrentState();
                });

                // 4. Entrar a Dirección de Entrega
                card.querySelector('#btn-opt-address')?.addEventListener('click', () => {
                    currentSubView = 'address';
                    renderCurrentState();
                });

                // 5. Entrar a Datos de Facturación
                card.querySelector('#btn-opt-billing')?.addEventListener('click', () => {
                    currentSubView = 'billing';
                    renderCurrentState();
                });

                // 6. Notificaciones
                card.querySelector('#btn-opt-notif')?.addEventListener('click', () => {
                    onClose();
                    if (window.navigateToView) window.navigateToView('view-notifications');
                });

                // 7. Panel Admin
                card.querySelector('#btn-opt-admin')?.addEventListener('click', () => {
                    onClose();
                    if (window.navigateToView) window.navigateToView('view-admin');
                });

                // Login con Google desde cabecera
                card.querySelector('#btn-menu-google-login')?.addEventListener('click', async () => {
                    if (!window.AdminAuth || typeof window.AdminAuth.loginPublicStoreWithGoogle !== 'function') {
                        alert('Cargando servicio de Google, intentá en un segundo.');
                        return;
                    }
                    try {
                        await window.AdminAuth.loginPublicStoreWithGoogle();
                        renderCurrentState();
                    } catch (e) {
                        console.error(e);
                    }
                });

                // Logout de Google
                card.querySelector('#btn-profile-google-logout')?.addEventListener('click', async () => {
                    try {
                        if (window.AdminAuth && typeof window.AdminAuth.logoutPublic === 'function') {
                            await window.AdminAuth.logoutPublic();
                        }
                    } catch (e) {}
                    if (typeof window.renderPerfilCarritoView === 'function') window.renderPerfilCarritoView();
                    renderCurrentState();
                });

                // Limpiar Datos
                card.querySelector('#btn-clear-user-profile')?.addEventListener('click', () => {
                    if (confirm('¿Querés borrar todos los datos de perfil guardados en este dispositivo?')) {
                        if (window.UserDataManager && typeof window.UserDataManager.clear === 'function') {
                            window.UserDataManager.clear();
                        }
                        if (typeof window.showToast === 'function') window.showToast('Datos de perfil eliminados');
                        renderCurrentState();
                    }
                });

                return;
            }

            // =========================================================================
            // VISTA 2: DATOS PERSONALES Y CONTACTO
            // =========================================================================
            if (currentSubView === 'contact') {
                const prefilledName = currentData.name || (publicUser && publicUser.nombre) || '';
                const prefilledEmail = (publicUser && publicUser.email) || currentData.email || '';

                card.innerHTML = `
                    ${headerHTML}

                    <div style="flex: 1; overflow-y: auto; padding: ${isModal ? '1rem 1.25rem' : '1rem 0'}; box-sizing: border-box; width: 100%; max-width: ${isModal ? '100%' : '650px'}; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; -webkit-overflow-scrolling: touch;">
                        
                        <!-- Barra para volver al Menú -->
                        <button type="button" id="btn-back-to-menu" class="profile-subview-back-bar">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">arrow_back</span>
                            <span style="font-size: 0.82rem; font-weight: 800; color: #0f172a;">Volver al Menú Principal</span>
                        </button>

                        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 16px; padding: 1.1rem; display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                    Nombre y Apellido *
                                </label>
                                <input type="text" id="prof-name" value="${esc(prefilledName)}" placeholder="Ej: María González" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                    Teléfono / WhatsApp *
                                </label>
                                <input type="tel" id="prof-phone" value="${esc(currentData.phone || '')}" placeholder="Ej: 11 1234 5678" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                <span style="font-size: 0.68rem; color: #64748b; margin-top: 2px; display: block;">Te avisaremos por WhatsApp el estado de fabricación de tu pedido.</span>
                            </div>

                            <div>
                                <label style="display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                    <span>Correo Electrónico (Email)</span>
                                    ${publicUser ? `<span style="font-size: 0.66rem; color: #16a34a; font-weight: 700; text-transform: none;">Google Verificado</span>` : ''}
                                </label>
                                <input type="email" id="prof-email" value="${esc(prefilledEmail)}" ${publicUser ? 'readonly' : ''} placeholder="tuemail@ejemplo.com" style="width: 100%; box-sizing: border-box; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: ${publicUser ? '#64748b' : '#0f172a'}; background: ${publicUser ? '#f8fafc' : '#ffffff'}; font-family: inherit; outline: none; ${publicUser ? 'cursor: not-allowed;' : ''}">
                            </div>
                        </div>

                    </div>

                    <!-- Footer con Botón Guardar -->
                    <div style="width: 100%; border-top: 1px solid #f1f5f9; padding: 0.85rem 1.25rem; flex-shrink: 0; background: #ffffff; display: flex; gap: 8px;">
                        <button type="button" id="btn-save-contact" style="flex: 1; background: #16a34a; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.4rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3); transition: all 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">save</span>
                            <span>Guardar Datos de Contacto</span>
                        </button>
                    </div>
                `;

                const closeBtn = card.querySelector('#btn-close-user-profile');
                if (closeBtn) closeBtn.onclick = onClose;

                card.querySelector('#btn-back-to-menu')?.addEventListener('click', () => {
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                card.querySelector('#btn-save-contact')?.addEventListener('click', () => {
                    const nameVal = (card.querySelector('#prof-name').value || '').trim();
                    const phoneVal = (card.querySelector('#prof-phone').value || '').trim();
                    const emailVal = (card.querySelector('#prof-email').value || '').trim();

                    if (!nameVal) {
                        alert('Por favor ingresá tu Nombre y Apellido.');
                        card.querySelector('#prof-name').focus();
                        return;
                    }

                    const payload = { ...currentData, name: nameVal, phone: phoneVal, email: emailVal };
                    if (window.UserDataManager && typeof window.UserDataManager.save === 'function') {
                        window.UserDataManager.save(payload);
                    }
                    if (window.AdminAuth && typeof window.AdminAuth.saveClientProfileToCloud === 'function') {
                        window.AdminAuth.saveClientProfileToCloud(payload);
                    }
                    if (typeof window.showToast === 'function') {
                        window.showToast('✅ Datos de contacto guardados');
                    }
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                return;
            }

            // =========================================================================
            // VISTA 3: DIRECCIÓN DE ENTREGA Y ENVÍOS
            // =========================================================================
            if (currentSubView === 'address') {
                card.innerHTML = `
                    ${headerHTML}

                    <div style="flex: 1; overflow-y: auto; padding: ${isModal ? '1rem 1.25rem' : '1rem 0'}; box-sizing: border-box; width: 100%; max-width: ${isModal ? '100%' : '650px'}; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; -webkit-overflow-scrolling: touch;">
                        
                        <!-- Barra para volver al Menú -->
                        <button type="button" id="btn-back-to-menu" class="profile-subview-back-bar">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">arrow_back</span>
                            <span style="font-size: 0.82rem; font-weight: 800; color: #0f172a;">Volver al Menú Principal</span>
                        </button>

                        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 16px; padding: 1.1rem; display: flex; flex-direction: column; gap: 12px;">
                            
                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                    Dirección de Entrega (Calle, Altura, Piso / Dpto)
                                </label>
                                <input type="text" id="prof-address" value="${esc(currentData.address || '')}" placeholder="Ej: Av. Corrientes 1234, 4to B" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Código Postal (CP)
                                    </label>
                                    <input type="text" id="prof-zip" value="${esc(currentData.zipCode || '')}" placeholder="Ej: 1414" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Localidad / Barrio
                                    </label>
                                    <input type="text" id="prof-locality" value="${esc(currentData.locality || '')}" placeholder="Ej: Palermo" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Provincia
                                    </label>
                                    <input type="text" id="prof-province" value="${esc(currentData.province || '')}" placeholder="Ej: CABA / Bs As" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>
                            </div>

                            <!-- Feedback de Cobertura en tiempo real -->
                            <div id="prof-cp-feedback" style="display: none; font-size: 0.78rem; font-weight: 700; padding: 0.55rem 0.8rem; border-radius: 10px; border: 1px solid transparent;"></div>

                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                    Indicaciones para el Repartidor (Opcional)
                                </label>
                                <input type="text" id="prof-delivery-notes" value="${esc(currentData.deliveryNotes || '')}" placeholder="Ej: Tocar timbre 4B, entre calles Lavalle y Corrientes" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                        </div>

                    </div>

                    <!-- Footer con Botón Guardar -->
                    <div style="width: 100%; border-top: 1px solid #f1f5f9; padding: 0.85rem 1.25rem; flex-shrink: 0; background: #ffffff; display: flex; gap: 8px;">
                        <button type="button" id="btn-save-address" style="flex: 1; background: #16a34a; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.4rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3); transition: all 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">save</span>
                            <span>Guardar Dirección de Entrega</span>
                        </button>
                    </div>
                `;

                const closeBtn = card.querySelector('#btn-close-user-profile');
                if (closeBtn) closeBtn.onclick = onClose;

                card.querySelector('#btn-back-to-menu')?.addEventListener('click', () => {
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                // Auto evaluar CP al escribir
                const cpField = card.querySelector('#prof-zip');
                const feedbackEl = card.querySelector('#prof-cp-feedback');
                const localityField = card.querySelector('#prof-locality');
                const provinceField = card.querySelector('#prof-province');

                const evalCP = () => {
                    const val = (cpField.value || '').trim();
                    if (!val) {
                        feedbackEl.style.display = 'none';
                        return;
                    }
                    if (typeof window.lookupPostalCode === 'function') {
                        const res = window.lookupPostalCode(val);
                        feedbackEl.style.display = 'block';
                        if (res && res.hasLocalMatch !== false) {
                            feedbackEl.innerHTML = `✅ Cobertura confirmada: <strong>${res.localidad} (${res.provincia})</strong>`;
                            feedbackEl.style.color = '#15803d';
                            feedbackEl.style.background = '#f0fdf4';
                            feedbackEl.style.borderColor = '#86efac';
                            if (res.localidad && localityField && !localityField.value) localityField.value = res.localidad;
                            if (res.provincia && provinceField && !provinceField.value) provinceField.value = res.provincia;
                        } else {
                            feedbackEl.innerHTML = `📦 Envíos al interior vía Mercado Libre / Transporte`;
                            feedbackEl.style.color = '#b45309';
                            feedbackEl.style.background = '#fffbeb';
                            feedbackEl.style.borderColor = '#fcd34d';
                        }
                    }
                };

                cpField.oninput = evalCP;
                if (cpField.value) evalCP();

                card.querySelector('#btn-save-address')?.addEventListener('click', () => {
                    const addrVal = (card.querySelector('#prof-address').value || '').trim();
                    const zipVal = (card.querySelector('#prof-zip').value || '').trim();
                    const locVal = (card.querySelector('#prof-locality').value || '').trim();
                    const provVal = (card.querySelector('#prof-province').value || '').trim();
                    const notesVal = (card.querySelector('#prof-delivery-notes').value || '').trim();

                    const payload = {
                        ...currentData,
                        address: addrVal,
                        zipCode: zipVal,
                        locality: locVal,
                        province: provVal,
                        deliveryNotes: notesVal
                    };

                    if (window.UserDataManager && typeof window.UserDataManager.save === 'function') {
                        window.UserDataManager.save(payload);
                    }
                    if (window.AdminAuth && typeof window.AdminAuth.saveClientProfileToCloud === 'function') {
                        window.AdminAuth.saveClientProfileToCloud(payload);
                    }
                    if (typeof window.showToast === 'function') {
                        window.showToast('✅ Dirección de entrega guardada');
                    }
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                return;
            }

            // =========================================================================
            // VISTA 4: DATOS FISCALES Y FACTURACIÓN
            // =========================================================================
            if (currentSubView === 'billing') {
                const hasBilling = Boolean(currentData.cuit || currentData.razonSocial);

                card.innerHTML = `
                    ${headerHTML}

                    <div style="flex: 1; overflow-y: auto; padding: ${isModal ? '1rem 1.25rem' : '1rem 0'}; box-sizing: border-box; width: 100%; max-width: ${isModal ? '100%' : '650px'}; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; -webkit-overflow-scrolling: touch;">
                        
                        <!-- Barra para volver al Menú -->
                        <button type="button" id="btn-back-to-menu" class="profile-subview-back-bar">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">arrow_back</span>
                            <span style="font-size: 0.82rem; font-weight: 800; color: #0f172a;">Volver al Menú Principal</span>
                        </button>

                        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 16px; padding: 1.1rem; display: flex; flex-direction: column; gap: 12px;">
                            
                            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
                                <div>
                                    <span style="font-size: 0.85rem; font-weight: 800; color: #0f172a; block">Factura con CUIT / Factura A</span>
                                    <span style="font-size: 0.72rem; color: #64748b; block">Habilitar si necesitas factura a nombre de una empresa o Responsable Inscripto</span>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="prof-factura-a-toggle" ${hasBilling ? 'checked' : ''} class="sr-only peer">
                                    <div class="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>

                            <div id="prof-billing-fields" style="display: ${hasBilling ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
                                
                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Razón Social / Nombre Fiscal
                                    </label>
                                    <input type="text" id="prof-razon-social" value="${esc(currentData.razonSocial || '')}" placeholder="Ej: Constructora del Norte S.A." style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>

                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        CUIT / DNI
                                    </label>
                                    <input type="text" id="prof-cuit" value="${esc(currentData.cuit || '')}" placeholder="Ej: 30-71234567-8" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>

                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Domicilio Fiscal
                                    </label>
                                    <input type="text" id="prof-dir-fiscal" value="${esc(currentData.dirFiscal || '')}" placeholder="Ej: San Martín 500, Piso 2" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>

                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Condición frente al IVA
                                    </label>
                                    <select id="prof-condicion-iva" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.85rem; color: #0f172a; font-family: inherit; outline: none; background: #ffffff;">
                                        <option value="Consumidor Final" ${(currentData.condIva === 'Consumidor Final' || !currentData.condIva) ? 'selected' : ''}>Consumidor Final</option>
                                        <option value="Responsable Inscripto" ${currentData.condIva === 'Responsable Inscripto' ? 'selected' : ''}>IVA Responsable Inscripto (Factura A)</option>
                                        <option value="Responsable Monotributo" ${currentData.condIva === 'Responsable Monotributo' ? 'selected' : ''}>Responsable Monotributo</option>
                                        <option value="IVA Exento" ${currentData.condIva === 'IVA Exento' ? 'selected' : ''}>IVA Exento</option>
                                    </select>
                                </div>

                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Correo para Envío de Factura Electrónica
                                    </label>
                                    <input type="email" id="prof-email-fiscal" value="${esc(currentData.emailFiscal || '')}" placeholder="Ej: facturacion@empresa.com" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>

                            </div>

                            <div id="prof-consumidor-final-note" style="display: ${hasBilling ? 'none' : 'block'}; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.78rem; color: #64748b; line-height: 1.45;">
                                ℹ️ Por defecto emitimos <strong>Factura B a Consumidor Final</strong> con los datos de tu pedido. Si requerís Factura A, activá la opción arriba para ingresar CUIT y Razón Social.
                            </div>

                        </div>

                    </div>

                    <!-- Footer con Botón Guardar -->
                    <div style="width: 100%; border-top: 1px solid #f1f5f9; padding: 0.85rem 1.25rem; flex-shrink: 0; background: #ffffff; display: flex; gap: 8px;">
                        <button type="button" id="btn-save-billing" style="flex: 1; background: #16a34a; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.4rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3); transition: all 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">save</span>
                            <span>Guardar Datos de Facturación</span>
                        </button>
                    </div>
                `;

                const closeBtn = card.querySelector('#btn-close-user-profile');
                if (closeBtn) closeBtn.onclick = onClose;

                card.querySelector('#btn-back-to-menu')?.addEventListener('click', () => {
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                const billingToggle = card.querySelector('#prof-factura-a-toggle');
                const billingFields = card.querySelector('#prof-billing-fields');
                const finalNote = card.querySelector('#prof-consumidor-final-note');

                if (billingToggle) {
                    billingToggle.onchange = () => {
                        const isChecked = billingToggle.checked;
                        if (billingFields) billingFields.style.display = isChecked ? 'flex' : 'none';
                        if (finalNote) finalNote.style.display = isChecked ? 'none' : 'block';
                    };
                }

                card.querySelector('#btn-save-billing')?.addEventListener('click', () => {
                    const isChecked = billingToggle?.checked || false;
                    const razonVal = isChecked ? (card.querySelector('#prof-razon-social')?.value || '').trim() : '';
                    const cuitVal = isChecked ? (card.querySelector('#prof-cuit')?.value || '').trim() : '';
                    const dirFiscalVal = isChecked ? (card.querySelector('#prof-dir-fiscal')?.value || '').trim() : '';
                    const condIvaVal = isChecked ? (card.querySelector('#prof-condicion-iva')?.value || 'Consumidor Final') : 'Consumidor Final';
                    const emailFiscalVal = isChecked ? (card.querySelector('#prof-email-fiscal')?.value || '').trim() : '';

                    const payload = {
                        ...currentData,
                        razonSocial: razonVal,
                        cuit: cuitVal,
                        dirFiscal: dirFiscalVal,
                        condIva: condIvaVal,
                        emailFiscal: emailFiscalVal
                    };

                    if (window.UserDataManager && typeof window.UserDataManager.save === 'function') {
                        window.UserDataManager.save(payload);
                    }
                    if (window.AdminAuth && typeof window.AdminAuth.saveClientProfileToCloud === 'function') {
                        window.AdminAuth.saveClientProfileToCloud(payload);
                    }
                    if (typeof window.showToast === 'function') {
                        window.showToast('✅ Datos de facturación guardados');
                    }
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                return;
            }
        }

        renderCurrentState();
    }

    window.openUserProfileModal = function() {
        injectProfileDrawerStyles();

        // Limpiar overlays o drawers previos si existieran
        const existingDrawer = document.getElementById('user-profile-drawer');
        const existingOverlay = document.getElementById('user-profile-drawer-overlay');
        const oldModalOverlay = document.getElementById('user-profile-modal-overlay');
        if (existingDrawer) existingDrawer.remove();
        if (existingOverlay) existingOverlay.remove();
        if (oldModalOverlay) oldModalOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'user-profile-drawer-overlay';

        const drawer = document.createElement('aside');
        drawer.id = 'user-profile-drawer';
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.setAttribute('aria-label', 'Mi Cuenta y Perfil');

        let isClosing = false;
        const closeDrawer = () => {
            if (isClosing) return;
            isClosing = true;
            isProfileDrawerOpen = false;
            overlay.classList.remove('active');
            drawer.classList.remove('active');
            if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
            setTimeout(() => {
                overlay.remove();
                drawer.remove();
            }, 320);
        };

        overlay.addEventListener('click', closeDrawer);

        mountUserProfileUI(drawer, {
            isModal: true,
            onClose: closeDrawer,
            onReopen: () => {
                if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
                overlay.remove();
                drawer.remove();
                window.openUserProfileModal();
            }
        });

        document.body.appendChild(overlay);
        document.body.appendChild(drawer);

        if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();

        const onEscKey = (e) => {
            if (e.key === 'Escape' && isProfileDrawerOpen) {
                window.removeEventListener('keydown', onEscKey);
                closeDrawer();
            }
        };
        window.addEventListener('keydown', onEscKey);

        requestAnimationFrame(() => {
            isProfileDrawerOpen = true;
            overlay.classList.add('active');
            drawer.classList.add('active');
        });
    };

    window.closeUserProfileModal = function() {
        const overlay = document.getElementById('user-profile-drawer-overlay');
        const drawer = document.getElementById('user-profile-drawer');
        if (overlay) overlay.classList.remove('active');
        if (drawer) drawer.classList.remove('active');
        if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
        setTimeout(() => {
            if (overlay) overlay.remove();
            if (drawer) drawer.remove();
        }, 320);
    };

    window.openUserProfileDrawer = window.openUserProfileModal;
    window.closeUserProfileDrawer = window.closeUserProfileModal;
    window.UserProfileDrawer = {
        open: window.openUserProfileModal,
        close: window.closeUserProfileModal,
        isOpen: () => isProfileDrawerOpen
    };

    window.renderUserProfileView = function() {
        const container = document.getElementById('user-profile-view-content');
        if (!container) return;

        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'max-width: 600px; margin: 1.25rem auto 2.5rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 1.35rem 1.5rem; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.05); font-family: var(--font-main); display: flex; flex-direction: column; gap: 0.75rem; box-sizing: border-box;';

        mountUserProfileUI(wrapper, {
            isModal: false,
            onClose: () => {},
            onReopen: () => window.renderUserProfileView()
        });

        container.appendChild(wrapper);
    };
})();
