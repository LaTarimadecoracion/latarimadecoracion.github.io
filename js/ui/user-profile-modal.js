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
                max-width: 360px;
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
                padding: 0.85rem 1.15rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                cursor: pointer;
                text-align: left;
                box-sizing: border-box;
                font-family: inherit;
            }
            .profile-menu-btn:hover {
                background: #f8fafc;
            }
            .profile-menu-btn:active {
                background: #f1f5f9;
            }
            .profile-menu-btn-content {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 0;
                flex: 1;
            }
            .profile-menu-icon {
                color: #475569;
                font-size: 20px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .profile-menu-btn:hover .profile-menu-icon {
                color: #0f172a;
            }
            .profile-menu-title {
                font-size: 0.88rem;
                font-weight: 700;
                color: #1e293b;
                letter-spacing: -0.15px;
            }
            .profile-menu-chevron {
                font-size: 18px;
                color: #94a3b8;
                flex-shrink: 0;
            }
            .profile-menu-btn:hover .profile-menu-chevron {
                color: #0f172a;
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
            .lt-drawer-notif-item:hover {
                background: #f1f5f9 !important;
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

        // Estado interno de subvista: 'menu' | 'personal' | 'notifications'
        let currentSubView = options.initialSubView || 'menu';
        let editingAddressId = null;
        let isAddingAddress = false;

        function renderCurrentState() {
            const publicUser = (window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function')
                ? window.AdminAuth.getPublicUser()
                : null;

            const currentData = (window.UserDataManager && typeof window.UserDataManager.get === 'function')
                ? window.UserDataManager.get()
                : {};

            const savedAddresses = (window.UserDataManager && typeof window.UserDataManager.getAddresses === 'function')
                ? window.UserDataManager.getAddresses()
                : (Array.isArray(currentData.addresses) ? currentData.addresses : []);
            const addressesCount = savedAddresses.length;
            const addressesCountText = addressesCount > 0 ? `${addressesCount} ${addressesCount === 1 ? 'dirección' : 'direcciones'}` : '';

            const ordersList = (typeof window.getMyLocalOrders === 'function') ? window.getMyLocalOrders() : [];
            const ordersCount = ordersList.length;
            const ordersCountText = ordersCount > 0 ? `${ordersCount} ${ordersCount === 1 ? 'compra' : 'compras'}` : 'Sin compras';

            let cartCount = 0;
            try {
                const rawCart = localStorage.getItem('cartItems');
                if (rawCart) {
                    const parsed = JSON.parse(rawCart);
                    cartCount = Array.isArray(parsed) ? parsed.length : 0;
                }
            } catch (e) {}
            const cartCountText = cartCount > 0 ? `${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}` : 'Vacío';

            const isStaff = (publicUser && (publicUser.role === 'superadmin' || publicUser.role === 'colaborador')) || !!(window.AdminAuth && typeof window.AdminAuth.isAuthenticated === 'function' && window.AdminAuth.isAuthenticated());
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

            let unreadNotifCount = 0;
            let adminNewOrdersCount = 0;
            try {
                let allNotifs = [];
                if (window.NotificationsCenter && typeof window.NotificationsCenter.loadState === 'function') {
                    const nState = window.NotificationsCenter.loadState();
                    if (nState && Array.isArray(nState.notifications)) {
                        allNotifs = nState.notifications;
                    }
                } else {
                    const userKey = (publicUser && publicUser.email) ? String(publicUser.email).trim().toLowerCase() : 'guest';
                    const raw = localStorage.getItem('latarima_notif_state_v2:' + userKey);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && Array.isArray(parsed.notifications)) {
                            allNotifs = parsed.notifications;
                        }
                    }
                }
                unreadNotifCount = allNotifs.filter(n => !n.read).length;
                if (isStaff) {
                    adminNewOrdersCount = allNotifs.filter(n => !n.read && (
                        n.type === 'order' ||
                        n.actionType === 'order' ||
                        (n.actionPayload && n.actionPayload.orderId) ||
                        (n.ruleKey && n.ruleKey.startsWith('order'))
                    )).length;
                }
            } catch (e) {}

            const subViewTitles = {
                menu: 'Mi Cuenta y Perfil',
                personal: 'Mis Datos Personales',
                contact: 'Mis Datos Personales',
                addresses: 'Mis Direcciones',
                notifications: 'Notificaciones y Avisos'
            };

            const subViewIcons = {
                menu: 'account_circle',
                personal: 'person',
                contact: 'person',
                addresses: 'location_on',
                notifications: 'notifications'
            };

            // Cabecera superior del Drawer
            const headerHTML = isModal ? `
                <div class="user-profile-drawer-header">
                    <div class="user-profile-drawer-title-wrap">
                        <span class="material-symbols-outlined user-profile-drawer-icon">
                            ${subViewIcons[currentSubView] || 'account_circle'}
                        </span>
                        <div style="min-width: 0;">
                            <div class="user-profile-drawer-badge">La Tarima · Mi Cuenta</div>
                            <h3 class="user-profile-drawer-title">
                                ${subViewTitles[currentSubView] || 'Mi Cuenta y Perfil'}
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
                                    ${subViewTitles[currentSubView] || 'Mi Cuenta y Perfil'}
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
                        <div style="padding: 0.95rem 1.15rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #ffffff;">
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

                            <!-- Botones de Acción en Cabecera (Login cuando no autenticado) -->
                            ${!publicUser ? `
                                <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                                    <button type="button" id="btn-menu-google-login" style="background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; transition: all 0.2s;" onmouseenter="this.style.borderColor='#0f172a';" onmouseleave="this.style.borderColor='#cbd5e1';">
                                        ${GOOGLE_SVG}
                                        <span>Acceder</span>
                                    </button>
                                </div>
                            ` : ''}
                        </div>

                        <!-- COLUMNA DE OPCIONES SOBRIA Y FULL-WIDTH -->
                        <div class="profile-menu-list">

                            <!-- 1. Mis Compras / Pedidos -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-my-orders">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon">shopping_bag</span>
                                    <span class="profile-menu-title">Mis Compras</span>
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

                            <!-- 2.5 Mis Direcciones -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-addresses">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon" style="color: #16a34a;">location_on</span>
                                    <span class="profile-menu-title">Mis Direcciones</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    ${addressesCount > 0 ? `
                                        <span style="background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 6px;">
                                            ${addressesCountText}
                                        </span>
                                    ` : ''}
                                    <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                                </div>
                            </button>

                            <!-- 3. Mis Datos Personales (Contacto, Entrega y Facturación) -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-personal">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon">person</span>
                                    <span class="profile-menu-title">Mis Datos Personales</span>
                                </div>
                                <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                            </button>

                            <!-- 6. Centro de Notificaciones -->
                            <button type="button" class="profile-menu-btn" id="btn-opt-notif">
                                <div class="profile-menu-btn-content">
                                    <span class="material-symbols-outlined profile-menu-icon">notifications</span>
                                    <span class="profile-menu-title">Notificaciones y Avisos</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    ${unreadNotifCount > 0 ? `
                                        <span style="background: #2563eb; color: #ffffff; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 999px;">
                                            ${unreadNotifCount} ${unreadNotifCount === 1 ? 'nueva' : 'nuevas'}
                                        </span>
                                    ` : ''}
                                    <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                                </div>
                            </button>

                            <!-- 7. Pedidos de Ventas para Admin / Staff -->
                            ${isStaff ? `
                                <button type="button" class="profile-menu-btn" id="btn-opt-admin-orders">
                                    <div class="profile-menu-btn-content">
                                        <span class="material-symbols-outlined profile-menu-icon" style="color: #0f172a;">receipt_long</span>
                                        <span class="profile-menu-title" style="color: #0f172a;">Pedidos</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        ${adminNewOrdersCount > 0 ? `
                                            <span style="background: #ef4444; color: #ffffff; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(239, 68, 68, 0.25);">
                                                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></span>
                                                <span>${adminNewOrdersCount} ${adminNewOrdersCount === 1 ? 'nuevo' : 'nuevos'}</span>
                                            </span>
                                        ` : ''}
                                        <span class="material-symbols-outlined profile-menu-chevron">chevron_right</span>
                                    </div>
                                </button>
                            ` : ''}

                            <!-- 8. Panel de Administración (Staff / SuperAdmin) -->
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

                // 2.5 Ir a la página dedicada de Mis Direcciones
                card.querySelector('#btn-opt-addresses')?.addEventListener('click', () => {
                    onClose();
                    if (window.navigateToView) window.navigateToView('view-addresses');
                });

                // 3. Entrar a Mis Datos Personales (Contacto, Entrega y Facturación)
                card.querySelector('#btn-opt-personal')?.addEventListener('click', () => {
                    currentSubView = 'personal';
                    renderCurrentState();
                });

                // 6. Notificaciones (Dentro del mismo Drawer lateral)
                card.querySelector('#btn-opt-notif')?.addEventListener('click', () => {
                    currentSubView = 'notifications';
                    renderCurrentState();
                });

                // 7. Pedidos para Administrador / Staff (Ventas de Clientes)
                card.querySelector('#btn-opt-admin-orders')?.addEventListener('click', () => {
                    onClose();

                    // Marcar notificaciones de pedidos como leídas
                    try {
                        if (window.NotificationsCenter && typeof window.NotificationsCenter.loadState === 'function') {
                            const nState = window.NotificationsCenter.loadState();
                            if (nState && Array.isArray(nState.notifications)) {
                                let changed = false;
                                nState.notifications.forEach(n => {
                                    if (!n.read && (n.type === 'order' || n.actionType === 'order' || (n.actionPayload && n.actionPayload.orderId) || (n.ruleKey && n.ruleKey.startsWith('order')))) {
                                        n.read = true;
                                        changed = true;
                                    }
                                });
                                if (changed && typeof window.NotificationsCenter.saveState === 'function') {
                                    window.NotificationsCenter.saveState(nState);
                                    if (typeof window.NotificationsCenter.syncBadges === 'function') {
                                        window.NotificationsCenter.syncBadges();
                                    }
                                }
                            }
                        }
                    } catch (e) {}

                    window.currentAdminTab = 'orders';
                    try {
                        const url = new URL(window.location.href);
                        url.searchParams.set('tab', 'orders');
                        window.history.replaceState({ tab: 'orders' }, '', url.toString());
                    } catch (e) {}

                    if (window.navigateToView) {
                        window.navigateToView('view-admin', { tab: 'orders' });
                    }

                    const tabBtnOrders = document.getElementById('tab-btn-orders');
                    if (tabBtnOrders && document.getElementById('view-admin')?.classList.contains('active')) {
                        tabBtnOrders.click();
                    }
                });

                // 8. Panel Admin
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
            // VISTA 2: MIS DATOS PERSONALES (CONTACTO, ENTREGA Y FACTURACIÓN UNIFICADOS)
            // =========================================================================
            if (currentSubView === 'personal' || currentSubView === 'contact') {
                const prefilledName = currentData.name || (publicUser && publicUser.nombre) || '';
                const prefilledEmail = (publicUser && publicUser.email) || currentData.email || '';
                const hasBilling = Boolean(currentData.cuit || currentData.razonSocial);

                card.innerHTML = `
                    ${headerHTML}

                    <div style="flex: 1; overflow-y: auto; padding: ${isModal ? '1rem 1.25rem' : '1rem 0'}; box-sizing: border-box; width: 100%; max-width: ${isModal ? '100%' : '650px'}; margin: 0 auto; display: flex; flex-direction: column; gap: 1.1rem; -webkit-overflow-scrolling: touch;">
                        
                        <!-- Barra para volver al Menú Principal -->
                        <button type="button" id="btn-back-to-menu" class="profile-subview-back-bar">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">arrow_back</span>
                            <span style="font-size: 0.82rem; font-weight: 800; color: #0f172a;">Volver al Menú Principal</span>
                        </button>

                        <!-- SECCIÓN 1: DATOS PERSONALES Y CONTACTO -->
                        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 1.15rem; display: flex; flex-direction: column; gap: 13px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">person</span>
                                <span style="font-size: 0.88rem; font-weight: 800; color: #0f172a;">Datos de Contacto</span>
                                </div>
                            </div>

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
                                <span style="font-size: 0.68rem; color: #64748b; margin-top: 3px; display: block;">Te avisaremos por WhatsApp el estado de tu pedido.</span>
                            </div>

                            <div>
                                <label style="display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                    <span>Correo Electrónico (Email)</span>
                                    ${publicUser ? `<span style="font-size: 0.66rem; color: #16a34a; font-weight: 700; text-transform: none;">Google Verificado</span>` : ''}
                                </label>
                                <input type="email" id="prof-email" value="${esc(prefilledEmail)}" ${publicUser ? 'readonly' : ''} placeholder="tuemail@ejemplo.com" style="width: 100%; box-sizing: border-box; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: ${publicUser ? '#64748b' : '#0f172a'}; background: ${publicUser ? '#f8fafc' : '#ffffff'}; font-family: inherit; outline: none; ${publicUser ? 'cursor: not-allowed;' : ''}">
                            </div>
                        </div>

                        <!-- SECCIÓN 2: DIRECCIÓN DE ENTREGA Y ENVÍOS -->
                        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 1.15rem; display: flex; flex-direction: column; gap: 13px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">location_on</span>
                                <span style="font-size: 0.88rem; font-weight: 800; color: #0f172a;">Dirección Principal de Entrega</span>
                                </div>
                                <button type="button" id="btn-goto-addresses" style="background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                                    <span>Mis Direcciones (${savedAddresses.length}/5)</span>
                                    <span class="material-symbols-outlined" style="font-size: 14px;">arrow_forward</span>
                                </button>
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                    Dirección (Calle, Altura, Piso / Dpto)
                                </label>
                                <input type="text" id="prof-address" value="${esc(currentData.address || '')}" placeholder="Ej: Av. Corrientes 1234, 4to B" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;">
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
                                <input type="text" id="prof-delivery-notes" value="${esc(currentData.deliveryNotes || '')}" placeholder="Ej: Timbre 4B, entre Lavalle y Corrientes" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                        </div>

                        <!-- SECCIÓN 3: DATOS DE FACTURACIÓN -->
                        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 1.15rem; display: flex; flex-direction: column; gap: 13px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">receipt_long</span>
                                    <div>
                                        <span style="font-size: 0.88rem; font-weight: 800; color: #0f172a; display: block;">Datos de Facturación</span>
                                        <span style="font-size: 0.7rem; color: #64748b; display: block;">Factura con CUIT / Factura A</span>
                                    </div>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer" style="margin: 0;">
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

                            <div id="prof-consumidor-final-note" style="display: ${hasBilling ? 'none' : 'block'}; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.75rem 0.9rem; font-size: 0.76rem; color: #64748b; line-height: 1.45;">
                                ℹ️ Por defecto emitimos <strong>Factura B a Consumidor Final</strong> con los datos de tu pedido. Si requerís Factura A, activá la opción arriba.
                            </div>
                        </div>

                    </div>

                    <!-- Footer con Botón Guardar Unificado -->
                    <div style="width: 100%; border-top: 1px solid #f1f5f9; padding: 0.85rem 1.25rem; flex-shrink: 0; background: #ffffff; display: flex; gap: 8px;">
                        <button type="button" id="btn-save-personal" style="flex: 1; background: #16a34a; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.4rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3); transition: all 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">save</span>
                            <span>Guardar Mis Datos</span>
                        </button>
                    </div>
                `;

                const closeBtn = card.querySelector('#btn-close-user-profile');
                if (closeBtn) closeBtn.onclick = onClose;

                card.querySelector('#btn-back-to-menu')?.addEventListener('click', () => {
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                card.querySelector('#btn-goto-addresses')?.addEventListener('click', () => {
                    onClose();
                    if (window.navigateToView) window.navigateToView('view-addresses');
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

                if (cpField) {
                    cpField.oninput = evalCP;
                    if (cpField.value) evalCP();
                }

                // Factura A toggle
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

                // Guardar Todo Junto
                card.querySelector('#btn-save-personal')?.addEventListener('click', () => {
                    const nameVal = (card.querySelector('#prof-name').value || '').trim();
                    const phoneVal = (card.querySelector('#prof-phone').value || '').trim();
                    const emailVal = (card.querySelector('#prof-email').value || '').trim();

                    if (!nameVal) {
                        alert('Por favor ingresá tu Nombre y Apellido.');
                        card.querySelector('#prof-name').focus();
                        return;
                    }

                    const addrVal = (card.querySelector('#prof-address')?.value || '').trim();
                    const zipVal = (card.querySelector('#prof-zip')?.value || '').trim();
                    const locVal = (card.querySelector('#prof-locality')?.value || '').trim();
                    const provVal = (card.querySelector('#prof-province')?.value || '').trim();
                    const notesVal = (card.querySelector('#prof-delivery-notes')?.value || '').trim();

                    const isChecked = billingToggle?.checked || false;
                    const razonVal = isChecked ? (card.querySelector('#prof-razon-social')?.value || '').trim() : '';
                    const cuitVal = isChecked ? (card.querySelector('#prof-cuit')?.value || '').trim() : '';
                    const dirFiscalVal = isChecked ? (card.querySelector('#prof-dir-fiscal')?.value || '').trim() : '';
                    const condIvaVal = isChecked ? (card.querySelector('#prof-condicion-iva')?.value || 'Consumidor Final') : 'Consumidor Final';
                    const emailFiscalVal = isChecked ? (card.querySelector('#prof-email-fiscal')?.value || '').trim() : '';

                    const payload = {
                        ...currentData,
                        name: nameVal,
                        phone: phoneVal,
                        email: emailVal,
                        address: addrVal,
                        zipCode: zipVal,
                        locality: locVal,
                        province: provVal,
                        deliveryNotes: notesVal,
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
                        window.showToast('✅ Datos guardados con éxito');
                    }
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                return;
            }


            // =========================================================================
            // VISTA 4: MIS DIRECCIONES DE ENTREGA (MÚLTIPLES HASTA 5 - PRIORIDAD DE ENVÍO)
            // =========================================================================
            if (currentSubView === 'addresses') {
                const addrs = (window.UserDataManager && typeof window.UserDataManager.getAddresses === 'function')
                    ? window.UserDataManager.getAddresses()
                    : (Array.isArray(currentData.addresses) ? currentData.addresses : []);
                
                const editingAddr = editingAddressId ? addrs.find(a => String(a.id) === String(editingAddressId)) : null;
                const isFormActive = isAddingAddress || Boolean(editingAddr);

                card.innerHTML = `
                    ${headerHTML}

                    <div style="flex: 1; overflow-y: auto; padding: ${isModal ? '1rem 1.25rem' : '1rem 0'}; box-sizing: border-box; width: 100%; max-width: ${isModal ? '100%' : '650px'}; margin: 0 auto; display: flex; flex-direction: column; gap: 1.1rem; -webkit-overflow-scrolling: touch;">
                        
                        <!-- Barra para volver al Menú Principal -->
                        <button type="button" id="btn-back-to-menu" class="profile-subview-back-bar">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">arrow_back</span>
                            <span style="font-size: 0.82rem; font-weight: 800; color: #0f172a;">Volver al Menú Principal</span>
                        </button>

                        <!-- Banner explicativo de prioridad de entrega -->
                        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #86efac; border-radius: 14px; padding: 0.95rem 1.15rem; display: flex; align-items: flex-start; gap: 12px;">
                            <div style="width: 38px; height: 38px; border-radius: 10px; background: #16a34a; color: #ffffff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.25);">
                                <span class="material-symbols-outlined" style="font-size: 22px;">local_shipping</span>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                                    <span style="font-size: 0.88rem; font-weight: 900; color: #0f172a;">Tus Lugares de Entrega</span>
                                    <span style="background: #ffffff; color: #15803d; border: 1px solid #bbf7d0; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 999px;">
                                        ${addrs.length} / 5 guardadas
                                    </span>
                                </div>
                                <div style="font-size: 0.76rem; color: #334155; margin-top: 4px; line-height: 1.45;">
                                    Guardá tus domicilios habituales (casa, trabajo u obra). La dirección <strong>predeterminada</strong> se usa con prioridad absoluta para calcular tus envíos en toda la tienda.
                                </div>
                            </div>
                        </div>

                        ${!isFormActive ? `
                            <!-- LISTADO DE DIRECCIONES GUARDADAS -->
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${addrs.length === 0 ? `
                                    <div style="background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 16px; padding: 2.5rem 1.5rem; text-align: center; color: #64748b;">
                                        <span class="material-symbols-outlined" style="font-size: 44px; color: #cbd5e1; display: block; margin-bottom: 8px;">home_pin</span>
                                        <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">No tenés direcciones cargadas</div>
                                        <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px; max-width: 320px; margin-left: auto; margin-right: auto;">
                                            Agregá tu dirección para calcular envíos más rápido y no tener que ingresarla en cada compra.
                                        </div>
                                    </div>
                                ` : `
                                    ${addrs.map((a, index) => {
                                        const isDef = Boolean(a.isDefault);
                                        const aliasEmoji = a.alias.toLowerCase().includes('casa') ? '🏠' :
                                                           a.alias.toLowerCase().includes('trabajo') || a.alias.toLowerCase().includes('oficina') ? '💼' :
                                                           a.alias.toLowerCase().includes('obra') ? '🏗️' :
                                                           a.alias.toLowerCase().includes('taller') ? '🔨' : '📍';

                                        return `
                                            <div style="background: #ffffff; border: 1.5px solid ${isDef ? '#86efac' : '#e2e8f0'}; border-radius: 14px; padding: 1rem 1.15rem; box-shadow: ${isDef ? '0 4px 14px rgba(22, 163, 74, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)'}; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s;">
                                                <!-- Cabecera de la tarjeta con Alias y Badge Predeterminada -->
                                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                                                    <div style="display: flex; align-items: center; gap: 6px;">
                                                        <span style="font-size: 1.05rem;">${aliasEmoji}</span>
                                                        <span style="font-size: 0.9rem; font-weight: 800; color: #0f172a;">${esc(a.alias || 'Dirección ' + (index + 1))}</span>
                                                    </div>
                                                    <div>
                                                        ${isDef ? `
                                                            <span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px;">
                                                                <span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span>
                                                                <span>Principal / Prioritaria</span>
                                                            </span>
                                                        ` : `
                                                            <button type="button" class="btn-set-default-addr" data-id="${esc(a.id)}" style="background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; cursor: pointer; transition: all 0.15s;" onmouseenter="this.style.borderColor='#16a34a'; this.style.color='#16a34a';" onmouseleave="this.style.borderColor='#cbd5e1'; this.style.color='#475569';">
                                                                ⭐ Usar como principal
                                                            </button>
                                                        `}
                                                    </div>
                                                </div>

                                                <!-- Datos de la Dirección -->
                                                <div style="font-size: 0.92rem; font-weight: 800; color: #0f172a;">
                                                    ${esc(a.street)} ${a.depto ? `<span style="font-weight: 600; color: #64748b;">(${esc(a.depto)})</span>` : ''}
                                                </div>
                                                <div style="font-size: 0.8rem; color: #475569;">
                                                    ${esc(a.city || '')}${a.province ? ', ' + esc(a.province) : ''} · <strong style="color: #0f172a;">CP ${esc(a.cp || '')}</strong>
                                                </div>
                                                ${a.notes ? `
                                                    <div style="font-size: 0.74rem; color: #64748b; background: #f8fafc; padding: 4px 8px; border-radius: 6px; border: 1px solid #f1f5f9; display: flex; align-items: center; gap: 6px;">
                                                        <span class="material-symbols-outlined" style="font-size: 15px; color: #94a3b8;">notes</span>
                                                        <span>${esc(a.notes)}</span>
                                                    </div>
                                                ` : ''}

                                                <!-- Acciones de edición y eliminación -->
                                                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 4px; padding-top: 6px; border-top: 1px dashed #f1f5f9;">
                                                    <button type="button" class="btn-edit-addr" data-id="${esc(a.id)}" style="background: transparent; border: 1px solid #e2e8f0; color: #334155; font-size: 0.74rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s;" onmouseenter="this.style.borderColor='#94a3b8';" onmouseleave="this.style.borderColor='#e2e8f0';">
                                                        <span class="material-symbols-outlined" style="font-size: 15px;">edit</span>
                                                        <span>Editar</span>
                                                    </button>
                                                    <button type="button" class="btn-del-addr" data-id="${esc(a.id)}" style="background: transparent; border: 1px solid #fee2e2; color: #dc2626; font-size: 0.74rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s;" onmouseenter="this.style.background='#fef2f2';" onmouseleave="this.style.background='transparent';">
                                                        <span class="material-symbols-outlined" style="font-size: 15px;">delete</span>
                                                        <span>Eliminar</span>
                                                    </button>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                `}
                            </div>

                            <!-- Botón o aviso para Agregar Nueva Dirección -->
                            ${addrs.length < 5 ? `
                                <button type="button" id="btn-open-add-addr" style="width: 100%; background: #ffffff; color: #16a34a; border: 2px dashed #86efac; border-radius: 14px; padding: 0.9rem; font-weight: 800; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;" onmouseenter="this.style.background='#f0fdf4';" onmouseleave="this.style.background='#ffffff';">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">add_location_alt</span>
                                    <span>+ Agregar otra dirección (${addrs.length}/5)</span>
                                </button>
                            ` : `
                                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.76rem; color: #92400e; text-align: center; font-weight: 700;">
                                    ℹ️ Tenés guardado el máximo de 5 direcciones. Si querés agregar una nueva, editá o eliminá alguna existente.
                                </div>
                            `}
                        ` : `
                            <!-- FORMULARIO DE AGREGAR / EDITAR DIRECCIÓN -->
                            <div style="background: #ffffff; border: 1.5px solid #86efac; border-radius: 16px; padding: 1.25rem; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 16px rgba(22, 163, 74, 0.08);">
                                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">${editingAddr ? 'edit_location' : 'add_location'}</span>
                                        <span style="font-size: 0.92rem; font-weight: 900; color: #0f172a;">${editingAddr ? 'Editar Dirección' : 'Nueva Dirección'}</span>
                                    </div>
                                    <button type="button" id="btn-cancel-addr-top" style="background: transparent; border: none; font-size: 0.76rem; font-weight: 800; color: #64748b; cursor: pointer;">Cancelar</button>
                                </div>

                                <!-- Alias / Identificador -->
                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Nombre / Alias de la dirección *
                                    </label>
                                    <div style="display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
                                        ${['Casa', 'Trabajo', 'Obra', 'Taller', 'Otro'].map(tag => `
                                            <button type="button" class="btn-addr-quick-tag" data-tag="${tag}" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 999px; padding: 2px 9px; font-size: 0.72rem; font-weight: 700; color: #334155; cursor: pointer;">
                                                ${tag}
                                            </button>
                                        `).join('')}
                                    </div>
                                    <input type="text" id="addr-input-alias" value="${esc(editingAddr ? editingAddr.alias : (addrs.length === 0 ? 'Casa' : ''))}" placeholder="Ej: Casa, Trabajo, Obra Hurlingham" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 0.8rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>

                                <!-- Calle y Altura -->
                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Calle y Altura (Número) *
                                    </label>
                                    <input type="text" id="addr-input-street" value="${esc(editingAddr ? editingAddr.street : '')}" placeholder="Ej: Av. Vergara 1234" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 0.8rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>

                                <!-- Piso / Dpto / Timbre -->
                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Piso / Dpto / Timbre / Lote (Opcional)
                                    </label>
                                    <input type="text" id="addr-input-depto" value="${esc(editingAddr ? (editingAddr.depto || '') : '')}" placeholder="Ej: 2do B / Timbre blanco" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 0.8rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>

                                <!-- CP, Ciudad y Provincia -->
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px;">
                                    <div>
                                        <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                            Código Postal *
                                        </label>
                                        <input type="text" id="addr-input-cp" value="${esc(editingAddr ? editingAddr.cp : '')}" placeholder="Ej: 1686" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 0.8rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                            Ciudad / Localidad *
                                        </label>
                                        <input type="text" id="addr-input-city" value="${esc(editingAddr ? editingAddr.city : '')}" placeholder="Ej: Hurlingham" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 0.8rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                            Provincia *
                                        </label>
                                        <input type="text" id="addr-input-province" value="${esc(editingAddr ? editingAddr.province : '')}" placeholder="Ej: Buenos Aires" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 0.8rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>
                                </div>

                                <!-- Feedback CP -->
                                <div id="addr-cp-feedback" style="display: none; font-size: 0.76rem; font-weight: 700; padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid transparent;"></div>

                                <!-- Indicaciones adicionales -->
                                <div>
                                    <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                        Indicaciones para el repartidor (Opcional)
                                    </label>
                                    <input type="text" id="addr-input-notes" value="${esc(editingAddr ? (editingAddr.notes || '') : '')}" placeholder="Ej: Casa de rejas negras, avisar por WhatsApp" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 0.8rem; font-size: 0.88rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>

                                <!-- Checkbox de Dirección Predeterminada -->
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 0; user-select: none;">
                                    <input type="checkbox" id="addr-input-is-default" ${(editingAddr ? editingAddr.isDefault : (addrs.length === 0)) ? 'checked' : ''} style="accent-color: #16a34a; width: 18px; height: 18px; cursor: pointer;">
                                    <span style="font-size: 0.82rem; font-weight: 800; color: #0f172a;">Establecer como dirección principal de entrega</span>
                                </label>

                                <!-- Botones de Guardar / Cancelar Formulario -->
                                <div style="display: flex; gap: 8px; margin-top: 6px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
                                    <button type="button" id="btn-save-addr-item" style="flex: 1; background: #16a34a; color: #ffffff; border: none; border-radius: 10px; padding: 0.75rem; font-size: 0.88rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);">
                                        <span class="material-symbols-outlined" style="font-size: 18px;">save</span>
                                        <span>${editingAddr ? 'Actualizar Dirección' : 'Guardar Dirección'}</span>
                                    </button>
                                    <button type="button" id="btn-cancel-addr-bottom" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        `}

                    </div>
                `;

                // Eventos de la Vista de Direcciones
                const closeBtn = card.querySelector('#btn-close-user-profile');
                if (closeBtn) closeBtn.onclick = onClose;

                card.querySelector('#btn-back-to-menu')?.addEventListener('click', () => {
                    isAddingAddress = false;
                    editingAddressId = null;
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                if (!isFormActive) {
                    card.querySelector('#btn-open-add-addr')?.addEventListener('click', () => {
                        isAddingAddress = true;
                        editingAddressId = null;
                        renderCurrentState();
                    });

                    card.querySelectorAll('.btn-set-default-addr').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const id = btn.getAttribute('data-id');
                            if (window.UserDataManager && typeof window.UserDataManager.setDefaultAddress === 'function') {
                                window.UserDataManager.setDefaultAddress(id);
                                if (typeof window.showToast === 'function') window.showToast('⭐ Dirección principal actualizada');
                                renderCurrentState();
                            }
                        });
                    });

                    card.querySelectorAll('.btn-edit-addr').forEach(btn => {
                        btn.addEventListener('click', () => {
                            editingAddressId = btn.getAttribute('data-id');
                            isAddingAddress = false;
                            renderCurrentState();
                        });
                    });

                    card.querySelectorAll('.btn-del-addr').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const id = btn.getAttribute('data-id');
                            if (confirm('¿Eliminar esta dirección de entrega?')) {
                                if (window.UserDataManager && typeof window.UserDataManager.deleteAddress === 'function') {
                                    window.UserDataManager.deleteAddress(id);
                                    if (typeof window.showToast === 'function') window.showToast('🗑️ Dirección eliminada');
                                    renderCurrentState();
                                }
                            }
                        });
                    });
                } else {
                    // Acciones del formulario de edición/creación
                    const cancelHandler = () => {
                        isAddingAddress = false;
                        editingAddressId = null;
                        renderCurrentState();
                    };
                    card.querySelector('#btn-cancel-addr-top')?.addEventListener('click', cancelHandler);
                    card.querySelector('#btn-cancel-addr-bottom')?.addEventListener('click', cancelHandler);

                    card.querySelectorAll('.btn-addr-quick-tag').forEach(tagBtn => {
                        tagBtn.addEventListener('click', () => {
                            const tagVal = tagBtn.getAttribute('data-tag');
                            const aliasInput = card.querySelector('#addr-input-alias');
                            if (aliasInput) aliasInput.value = tagVal;
                        });
                    });

                    const cpInput = card.querySelector('#addr-input-cp');
                    const feedbackEl = card.querySelector('#addr-cp-feedback');
                    const cityInput = card.querySelector('#addr-input-city');
                    const provInput = card.querySelector('#addr-input-province');

                    const evalAddrCP = () => {
                        const val = (cpInput?.value || '').trim();
                        if (!val || !feedbackEl) {
                            if (feedbackEl) feedbackEl.style.display = 'none';
                            return;
                        }
                        if (typeof window.lookupPostalCode === 'function') {
                            const res = window.lookupPostalCode(val);
                            feedbackEl.style.display = 'block';
                            if (res && res.hasLocalMatch !== false) {
                                feedbackEl.innerHTML = `✅ Cobertura local: <strong>${res.localidad} (${res.provincia})</strong>`;
                                feedbackEl.style.color = '#15803d';
                                feedbackEl.style.background = '#f0fdf4';
                                feedbackEl.style.borderColor = '#86efac';
                                if (res.localidad && cityInput && !cityInput.value) cityInput.value = res.localidad;
                                if (res.provincia && provInput && !provInput.value) provInput.value = res.provincia;
                            } else {
                                feedbackEl.innerHTML = `📦 Envíos al interior vía Encomienda / Transporte`;
                                feedbackEl.style.color = '#b45309';
                                feedbackEl.style.background = '#fffbeb';
                                feedbackEl.style.borderColor = '#fcd34d';
                            }
                        }
                    };

                    if (cpInput) {
                        cpInput.oninput = evalAddrCP;
                        if (cpInput.value) evalAddrCP();
                    }

                    // Guardar dirección
                    card.querySelector('#btn-save-addr-item')?.addEventListener('click', () => {
                        const aliasVal = (card.querySelector('#addr-input-alias')?.value || '').trim() || 'Mi Dirección';
                        const streetVal = (card.querySelector('#addr-input-street')?.value || '').trim();
                        const deptoVal = (card.querySelector('#addr-input-depto')?.value || '').trim();
                        const cpVal = (card.querySelector('#addr-input-cp')?.value || '').trim();
                        const cityVal = (card.querySelector('#addr-input-city')?.value || '').trim();
                        const provVal = (card.querySelector('#addr-input-province')?.value || '').trim();
                        const notesVal = (card.querySelector('#addr-input-notes')?.value || '').trim();
                        const isDefVal = card.querySelector('#addr-input-is-default')?.checked || false;

                        if (!streetVal) {
                            alert('Por favor ingresá la Calle y Número de la dirección.');
                            card.querySelector('#addr-input-street')?.focus();
                            return;
                        }
                        if (!cpVal) {
                            alert('Por favor ingresá el Código Postal.');
                            card.querySelector('#addr-input-cp')?.focus();
                            return;
                        }
                        if (!cityVal) {
                            alert('Por favor ingresá la Ciudad o Localidad.');
                            card.querySelector('#addr-input-city')?.focus();
                            return;
                        }

                        if (window.UserDataManager && typeof window.UserDataManager.saveAddress === 'function') {
                            const res = window.UserDataManager.saveAddress({
                                id: editingAddressId || undefined,
                                alias: aliasVal,
                                street: streetVal,
                                depto: deptoVal,
                                cp: cpVal,
                                city: cityVal,
                                province: provVal,
                                notes: notesVal,
                                isDefault: isDefVal
                            });

                            if (res && res.success === false) {
                                alert(res.message || 'No se pudo guardar la dirección');
                                return;
                            }
                        }

                        if (typeof window.showToast === 'function') {
                            window.showToast(editingAddressId ? '✅ Dirección actualizada' : '✅ Dirección guardada');
                        }
                        isAddingAddress = false;
                        editingAddressId = null;
                        renderCurrentState();
                    });
                }

                return;
            }

            // =========================================================================
            // VISTA 5: NOTIFICACIONES Y AVISOS (INTEGRADO EN EL DRAWER LATERAL)
            // =========================================================================
            if (currentSubView === 'notifications') {
                const notifState = (window.NotificationsCenter && typeof window.NotificationsCenter.loadState === 'function')
                    ? window.NotificationsCenter.loadState()
                    : { notifications: [] };
                const items = Array.isArray(notifState.notifications) ? notifState.notifications : [];
                const unreadCount = items.filter(n => !n.read).length;
                const readCount = items.length - unreadCount;

                const formatTime = (ts) => {
                    if (window.NotificationsCenter && typeof window.NotificationsCenter.formatRelativeTime === 'function') {
                        return window.NotificationsCenter.formatRelativeTime(ts);
                    }
                    return 'Reciente';
                };

                let notifListHtml = '';
                if (items.length === 0) {
                    notifListHtml = `
                        <div style="padding: 3.5rem 1.5rem; text-align: center; color: #64748b; background: #ffffff;">
                            <span class="material-symbols-outlined" style="font-size: 44px; color: #cbd5e1; display: block; margin-bottom: 10px;">notifications_none</span>
                            <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">Estás al día</div>
                            <div style="font-size: 0.78rem; color: #64748b; margin-top: 6px; line-height: 1.45; max-width: 320px; margin-left: auto; margin-right: auto;">
                                Acá vas a ver los avisos sobre tus pedidos, cambios de estado en taller, ofertas y novedades de La Tarima.
                            </div>
                        </div>
                    `;
                } else {
                    notifListHtml = `
                        <div style="display: flex; flex-direction: column; width: 100%;">
                            ${items.map(item => {
                                const isUnread = !item.read;
                                const thumbHtml = item.image
                                    ? `<img src="${esc(item.image)}" alt="" style="width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1px solid #e2e8f0;" onerror="this.style.display='none'">`
                                    : `<div style="width: 38px; height: 38px; border-radius: 10px; background: ${esc(item.bg || '#f1f5f9')}; color: ${esc(item.accent || '#334155')}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                            <span class="material-symbols-outlined" style="font-size: 20px;">${esc(item.icon || 'notifications')}</span>
                                       </div>`;

                                return `
                                    <button type="button" class="lt-drawer-notif-item" data-notif-id="${esc(item.id)}" style="width: 100%; text-align: left; background: ${isUnread ? '#f8fafc' : '#ffffff'}; border: none; border-bottom: 1px solid #f1f5f9; padding: 0.95rem 1.25rem; display: flex; align-items: flex-start; gap: 12px; cursor: pointer; font-family: inherit; transition: background-color 0.15s ease; box-sizing: border-box;">
                                        ${thumbHtml}
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                                <span style="font-size: 0.86rem; font-weight: 700; color: #0f172a; line-height: 1.3;">${esc(item.title)}</span>
                                                ${isUnread ? '<span style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb; flex-shrink: 0;" title="No leída"></span>' : ''}
                                            </div>
                                            <p style="margin: 3px 0 6px; font-size: 0.78rem; color: #475569; line-height: 1.4; white-space: normal;">${esc(item.body)}</p>
                                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                                ${item.badgeText ? `<span style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; background: ${esc(item.bg || '#f1f5f9')}; color: ${esc(item.accent || '#475569')};">${esc(item.badgeText)}</span>` : ''}
                                                <span style="font-size: 0.7rem; color: #94a3b8; font-weight: 600;">${esc(formatTime(item.timestamp))}</span>
                                            </div>
                                        </div>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    `;
                }

                card.innerHTML = `
                    ${headerHTML}

                    <div style="flex: 1; overflow-y: auto; padding: 0; box-sizing: border-box; width: 100%; display: flex; flex-direction: column; -webkit-overflow-scrolling: touch;">
                        
                        <!-- Barra para volver al Menú -->
                        <div style="padding: 0.85rem 1.25rem 0.5rem; flex-shrink: 0;">
                            <button type="button" id="btn-back-to-menu" class="profile-subview-back-bar">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #16a34a;">arrow_back</span>
                                <span style="font-size: 0.82rem; font-weight: 800; color: #0f172a;">Volver al Menú Principal</span>
                            </button>
                        </div>

                        <!-- Barra de Herramientas de Notificaciones -->
                        <div style="padding: 0.6rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #f1f5f9; background: #ffffff; flex-shrink: 0;">
                            <div style="font-size: 0.78rem; font-weight: 700; color: #64748b;">
                                ${unreadCount > 0 ? `<span style="color: #2563eb; font-weight: 800;">${unreadCount} sin leer</span>` : 'Todas leídas'}
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                ${unreadCount > 0 ? `
                                    <button type="button" id="btn-drawer-notif-mark-read" style="background: transparent; border: 1px solid #cbd5e1; color: #0f172a; border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.72rem; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 4px;">
                                        <span class="material-symbols-outlined" style="font-size: 14px;">done_all</span>
                                        <span>Marcar leídas</span>
                                    </button>
                                ` : ''}
                                ${readCount > 0 ? `
                                    <button type="button" id="btn-drawer-notif-clear-read" style="background: transparent; border: 1px solid #e2e8f0; color: #94a3b8; border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.72rem; font-weight: 700; cursor: pointer; font-family: inherit;">
                                        Limpiar leídas
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Lista de Alertas -->
                        <div style="flex: 1; overflow-y: auto;">
                            ${notifListHtml}
                        </div>

                    </div>
                `;

                const closeBtn = card.querySelector('#btn-close-user-profile');
                if (closeBtn) closeBtn.onclick = onClose;

                card.querySelector('#btn-back-to-menu')?.addEventListener('click', () => {
                    currentSubView = 'menu';
                    renderCurrentState();
                });

                card.querySelector('#btn-drawer-notif-mark-read')?.addEventListener('click', () => {
                    if (window.NotificationsCenter && typeof window.NotificationsCenter.markAllAsRead === 'function') {
                        window.NotificationsCenter.markAllAsRead();
                    }
                    renderCurrentState();
                });

                card.querySelector('#btn-drawer-notif-clear-read')?.addEventListener('click', () => {
                    if (window.NotificationsCenter && typeof window.NotificationsCenter.clearReadNotifications === 'function') {
                        window.NotificationsCenter.clearReadNotifications();
                    }
                    renderCurrentState();
                });

                // Clic en tarjeta de notificación
                card.querySelectorAll('.lt-drawer-notif-item[data-notif-id]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const notifId = btn.getAttribute('data-notif-id');
                        if (!notifId) return;

                        const item = items.find(n => n.id === notifId);
                        const hasTargetView = item && (item.actionType === 'order' || item.actionType === 'product' || item.actionType === 'offers' || item.actionType === 'view' || item.actionType === 'url');

                        if (window.NotificationsCenter && typeof window.NotificationsCenter.handleNotificationClick === 'function') {
                            if (hasTargetView) {
                                onClose();
                            }
                            window.NotificationsCenter.handleNotificationClick(notifId);
                            if (!hasTargetView) {
                                renderCurrentState();
                            }
                        } else {
                            if (item) item.read = true;
                            renderCurrentState();
                        }
                    });
                });

                return;
            }
        }

        renderCurrentState();
    }

    window.openUserProfileModal = function(arg = 'menu') {
        const initialSubView = (typeof arg === 'string' && arg) ? arg : (arg && arg.subView ? arg.subView : 'menu');
        if (window.NotificationsCenter && typeof window.NotificationsCenter.scanAll === 'function') {
            try { window.NotificationsCenter.scanAll(); } catch (e) {}
        }
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
            initialSubView: initialSubView,
            onClose: closeDrawer,
            onReopen: () => {
                if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
                overlay.remove();
                drawer.remove();
                window.openUserProfileModal(initialSubView);
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

    window.openUserProfileDrawer = function(subView = 'menu') {
        window.openUserProfileModal(subView);
    };
    window.openNotificationsDrawer = function() {
        window.openUserProfileModal('notifications');
    };
    window.closeUserProfileDrawer = window.closeUserProfileModal;
    window.UserProfileDrawer = {
        open: function(subView = 'menu') {
            window.openUserProfileModal(subView);
        },
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

    // =========================================================================
    // PÁGINA DEDICADA: MIS DIRECCIONES (#view-addresses / ?view=mis-direcciones)
    // =========================================================================
    let pageEditingAddrId = null;

    window.renderUserAddressesView = function(options = {}) {
        const container = document.getElementById('addresses-view-content');
        if (!container) return;

        if (options && options.editId !== undefined) {
            pageEditingAddrId = options.editId;
        }

        const addrs = (window.UserDataManager && typeof window.UserDataManager.getAddresses === 'function')
            ? window.UserDataManager.getAddresses()
            : [];

        const editingAddr = pageEditingAddrId
            ? addrs.find(a => String(a.id) === String(pageEditingAddrId))
            : null;
        if (pageEditingAddrId && !editingAddr) {
            pageEditingAddrId = null;
        }

        const canShowForm = Boolean(editingAddr || addrs.length < 5);

        container.innerHTML = `
            <style>
                .lt-addresses-page-wrap {
                    max-width: 1120px;
                    margin: 0 auto;
                    padding: 1.35rem 1rem 3.5rem;
                    box-sizing: border-box;
                    font-family: var(--font-main, inherit);
                }
                .lt-addresses-page-grid {
                    display: grid;
                    grid-template-columns: 1.12fr 1fr;
                    gap: 1.5rem;
                    align-items: start;
                }
                .lt-addr-form-row-2 {
                    display: grid;
                    grid-template-columns: 1.6fr 1fr;
                    gap: 12px;
                }
                .lt-addr-form-row-3 {
                    display: grid;
                    grid-template-columns: 0.9fr 1.2fr 1.1fr;
                    gap: 12px;
                }
                .lt-addr-input {
                    width: 100%;
                    box-sizing: border-box;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 12px;
                    padding: 0.75rem 0.95rem;
                    font-size: 0.94rem;
                    color: #0f172a;
                    background: #ffffff;
                    font-family: inherit;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .lt-addr-input:focus {
                    border-color: #16a34a;
                    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.14);
                }
                @media (max-width: 899px) {
                    .lt-addresses-page-grid {
                        grid-template-columns: 1fr;
                    }
                    .lt-addr-form-row-2,
                    .lt-addr-form-row-3 {
                        grid-template-columns: 1fr;
                    }
                }
            </style>

            <div class="lt-addresses-page-wrap">
                <!-- Barra Superior de Navegación y Título -->
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 1.15rem 1.35rem; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);">
                    <div style="display: flex; align-items: center; gap: 14px; min-width: 240px; flex: 1;">
                        <div style="width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);">
                            <span class="material-symbols-outlined" style="font-size: 26px;">location_on</span>
                        </div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <h2 style="margin: 0; font-size: 1.4rem; font-weight: 900; color: #0f172a;">Mis Direcciones</h2>
                                <span style="background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; font-size: 0.75rem; font-weight: 800; padding: 3px 10px; border-radius: 999px;">
                                    ${addrs.length} de 5 guardadas
                                </span>
                            </div>
                            <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #64748b; line-height: 1.45;">
                                Cargá hasta 5 domicilios de entrega. Tu dirección <strong>principal</strong> tiene prioridad para calcular el costo de envío en toda la tienda.
                            </p>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <button type="button" id="btn-page-addr-open-drawer" style="background: #f8fafc; color: #0f172a; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 1rem; font-size: 0.82rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">account_circle</span>
                            <span>Mi Cuenta</span>
                        </button>
                        <button type="button" id="btn-page-addr-back-store" style="background: #0f172a; color: #ffffff; border: none; border-radius: 10px; padding: 0.6rem 1.05rem; font-size: 0.82rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">storefront</span>
                            <span>Ir a la Tienda</span>
                        </button>
                    </div>
                </div>

                <!-- Grilla Principal de 2 Columnas (Formulario Amplio + Tarjetas Guardadas) -->
                <div class="lt-addresses-page-grid">

                    <!-- COLUMNA 1: FORMULARIO CÓMODO DE CARGA / EDICIÓN -->
                    <div id="lt-page-addr-form-card" style="background: #ffffff; border: 1.5px solid ${editingAddr ? '#16a34a' : '#e2e8f0'}; border-radius: 20px; padding: 1.5rem; box-shadow: ${editingAddr ? '0 10px 28px rgba(22, 163, 74, 0.12)' : '0 6px 20px rgba(15, 23, 42, 0.04)'}; display: flex; flex-direction: column; gap: 1.15rem;">
                        ${canShowForm ? `
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.85rem; flex-wrap: wrap;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span class="material-symbols-outlined" style="font-size: 24px; color: #16a34a; background: #f0fdf4; padding: 8px; border-radius: 12px;">
                                        ${editingAddr ? 'edit_location' : 'add_location_alt'}
                                    </span>
                                    <div>
                                        <h3 style="margin: 0; font-size: 1.12rem; font-weight: 900; color: #0f172a;">
                                            ${editingAddr ? `Editando: ${esc(editingAddr.alias || 'Dirección')}` : 'Agregar Nueva Dirección'}
                                        </h3>
                                        <span style="font-size: 0.78rem; color: #64748b;">
                                            ${editingAddr ? 'Modificá los datos y guardá los cambios' : 'Completá los datos del domicilio donde querés recibir tu pedido'}
                                        </span>
                                    </div>
                                </div>
                                ${editingAddr ? `
                                    <button type="button" id="btn-page-cancel-edit-top" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 12px; font-size: 0.76rem; font-weight: 800; cursor: pointer;">
                                        Cancelar edición
                                    </button>
                                ` : ''}
                            </div>

                            <!-- 1. Alias / Identificador -->
                            <div>
                                <label style="display: block; font-size: 0.76rem; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">
                                    1. Nombre o Alias para identificarla *
                                </label>
                                <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
                                    ${[
                                        { label: 'Casa', icon: '🏠' },
                                        { label: 'Trabajo', icon: '💼' },
                                        { label: 'Obra', icon: '🏗️' },
                                        { label: 'Taller', icon: '🔨' },
                                        { label: 'Otro', icon: '📍' }
                                    ].map(t => `
                                        <button type="button" class="btn-page-addr-tag" data-tag="${t.label}" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 999px; padding: 6px 14px; font-size: 0.8rem; font-weight: 800; color: #0f172a; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s; font-family: inherit;">
                                            <span>${t.icon}</span>
                                            <span>${t.label}</span>
                                        </button>
                                    `).join('')}
                                </div>
                                <input type="text" id="page-addr-alias" class="lt-addr-input" value="${esc(editingAddr ? editingAddr.alias : (addrs.length === 0 ? 'Casa' : ''))}" placeholder="Ej: Casa, Trabajo, Obra Hurlingham, Depósito...">
                            </div>

                            <!-- 2. Calle y Altura + Piso / Dpto -->
                            <div class="lt-addr-form-row-2">
                                <div>
                                    <label style="display: block; font-size: 0.76rem; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">
                                        2. Calle y Altura (Número) *
                                    </label>
                                    <input type="text" id="page-addr-street" class="lt-addr-input" value="${esc(editingAddr ? editingAddr.street : '')}" placeholder="Ej: Av. Vergara 1234">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.76rem; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">
                                        Piso / Dpto / Timbre / Lote
                                    </label>
                                    <input type="text" id="page-addr-depto" class="lt-addr-input" value="${esc(editingAddr ? (editingAddr.depto || '') : '')}" placeholder="Ej: Piso 2 B / Timbre blanco">
                                </div>
                            </div>

                            <!-- 3. Código Postal, Ciudad y Provincia -->
                            <div class="lt-addr-form-row-3">
                                <div>
                                    <label style="display: block; font-size: 0.76rem; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">
                                        3. Código Postal *
                                    </label>
                                    <input type="text" id="page-addr-cp" class="lt-addr-input" inputmode="numeric" maxlength="8" value="${esc(editingAddr ? editingAddr.cp : '')}" placeholder="Ej: 1686">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.76rem; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">
                                        Ciudad / Localidad *
                                    </label>
                                    <input type="text" id="page-addr-city" class="lt-addr-input" value="${esc(editingAddr ? editingAddr.city : '')}" placeholder="Ej: Hurlingham">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.76rem; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">
                                        Provincia *
                                    </label>
                                    <input type="text" id="page-addr-province" class="lt-addr-input" value="${esc(editingAddr ? editingAddr.province : '')}" placeholder="Ej: Buenos Aires">
                                </div>
                            </div>

                            <!-- Feedback en vivo del Código Postal -->
                            <div id="page-addr-cp-feedback" style="display: none; font-size: 0.82rem; font-weight: 700; padding: 0.65rem 0.9rem; border-radius: 12px; border: 1px solid transparent;"></div>

                            <!-- 4. Indicaciones para el repartidor -->
                            <div>
                                <label style="display: block; font-size: 0.76rem; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">
                                    4. Entre calles / Indicaciones para el repartidor (Opcional)
                                </label>
                                <input type="text" id="page-addr-notes" class="lt-addr-input" value="${esc(editingAddr ? (editingAddr.notes || '') : '')}" placeholder="Ej: Entre Lavalle y Corrientes, casa de rejas negras, avisar por WhatsApp al llegar">
                            </div>

                            <!-- 5. Prioridad de Entrega -->
                            <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 14px; padding: 0.9rem 1rem; user-select: none;">
                                <input type="checkbox" id="page-addr-is-default" ${(editingAddr ? editingAddr.isDefault : (addrs.length === 0 || !addrs.some(a => a.isDefault))) ? 'checked' : ''} style="accent-color: #16a34a; width: 20px; height: 20px; margin-top: 2px; cursor: pointer; flex-shrink: 0;">
                                <div>
                                    <div style="font-size: 0.88rem; font-weight: 900; color: #14532d;">
                                        ⭐ Establecer como mi dirección principal de entrega
                                    </div>
                                    <div style="font-size: 0.76rem; color: #166534; margin-top: 2px; line-height: 1.4;">
                                        El sistema usará esta dirección con prioridad absoluta para calcular costos de envío en productos, carrito y checkout.
                                    </div>
                                </div>
                            </label>

                            <!-- Botones de Guardar -->
                            <div style="display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap;">
                                <button type="button" id="btn-page-save-address" style="flex: 1; min-width: 200px; background: #16a34a; color: #ffffff; border: none; border-radius: 12px; padding: 0.9rem 1.4rem; font-size: 0.95rem; font-weight: 900; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 6px 18px rgba(22, 163, 74, 0.28); font-family: inherit; transition: all 0.2s;">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">save</span>
                                    <span>${editingAddr ? 'Guardar Cambios de la Dirección' : 'Guardar Dirección'}</span>
                                </button>
                                ${editingAddr ? `
                                    <button type="button" id="btn-page-cancel-edit-bottom" style="background: #f1f5f9; color: #475569; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0.9rem 1.25rem; font-size: 0.88rem; font-weight: 800; cursor: pointer; font-family: inherit;">
                                        Cancelar
                                    </button>
                                ` : ''}
                            </div>
                        ` : `
                            <div style="padding: 1.5rem 0.5rem; text-align: center;">
                                <div style="width: 56px; height: 56px; border-radius: 50%; background: #fef3c7; color: #d97706; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                    <span class="material-symbols-outlined" style="font-size: 28px;">where_to_vote</span>
                                </div>
                                <h3 style="margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 900; color: #0f172a;">
                                    Tenés el máximo de 5 direcciones cargadas
                                </h3>
                                <p style="margin: 0; font-size: 0.86rem; color: #64748b; line-height: 1.5; max-width: 420px; margin-left: auto; margin-right: auto;">
                                    Si necesitás modificar algún dato, presioná <strong>"Editar"</strong> en cualquiera de tus direcciones guardadas, o eliminá una para cargar otra nueva.
                                </p>
                            </div>
                        `}
                    </div>

                    <!-- COLUMNA 2: LISTADO DE DIRECCIONES GUARDADAS -->
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px;">
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-outlined" style="color: #16a34a; font-size: 22px;">bookmark_manager</span>
                                <span>Tus Direcciones Guardadas (${addrs.length}/5)</span>
                            </h3>
                        </div>

                        ${addrs.length === 0 ? `
                            <div style="background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 20px; padding: 3rem 1.5rem; text-align: center; color: #64748b;">
                                <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1; display: block; margin-bottom: 10px;">home_pin</span>
                                <div style="font-size: 1rem; font-weight: 800; color: #0f172a;">Todavía no tenés direcciones guardadas</div>
                                <div style="font-size: 0.84rem; color: #64748b; margin-top: 6px; max-width: 340px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                                    Completá el formulario para guardar tu primera dirección. Quedará marcada automáticamente como prioritaria para calcular tus envíos.
                                </div>
                            </div>
                        ` : addrs.map((a, index) => {
                            const isDef = Boolean(a.isDefault);
                            const isBeingEdited = Boolean(editingAddr && String(editingAddr.id) === String(a.id));
                            const aliasLower = (a.alias || '').toLowerCase();
                            const aliasEmoji = aliasLower.includes('casa') ? '🏠' :
                                               aliasLower.includes('trabajo') || aliasLower.includes('oficina') ? '💼' :
                                               aliasLower.includes('obra') ? '🏗️' :
                                               aliasLower.includes('taller') ? '🔨' : '📍';

                            return `
                                <div style="background: #ffffff; border: 2px solid ${isBeingEdited ? '#2563eb' : (isDef ? '#16a34a' : '#e2e8f0')}; border-radius: 18px; padding: 1.25rem; box-shadow: ${isDef ? '0 8px 24px rgba(22, 163, 74, 0.1)' : '0 2px 8px rgba(15, 23, 42, 0.03)'}; display: flex; flex-direction: column; gap: 10px; transition: all 0.2s;">
                                    <!-- Cabecera de la tarjeta -->
                                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="font-size: 1.2rem;">${aliasEmoji}</span>
                                            <span style="font-size: 1.02rem; font-weight: 900; color: #0f172a;">${esc(a.alias || 'Dirección ' + (index + 1))}</span>
                                        </div>
                                        <div>
                                            ${isDef ? `
                                                <span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-size: 0.74rem; font-weight: 900; padding: 4px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px;">
                                                    <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span>
                                                    <span>Principal / Prioritaria</span>
                                                </span>
                                            ` : `
                                                <button type="button" class="btn-page-set-default-addr" data-id="${esc(a.id)}" style="background: #f8fafc; color: #334155; border: 1.5px solid #cbd5e1; font-size: 0.76rem; font-weight: 800; padding: 5px 10px; border-radius: 8px; cursor: pointer; transition: all 0.15s; font-family: inherit;" onmouseenter="this.style.borderColor='#16a34a'; this.style.color='#16a34a';" onmouseleave="this.style.borderColor='#cbd5e1'; this.style.color='#334155';">
                                                    ⭐ Usar como principal
                                                </button>
                                            `}
                                        </div>
                                    </div>

                                    <!-- Detalle de Calle y Localidad -->
                                    <div style="font-size: 1.02rem; font-weight: 800; color: #0f172a;">
                                        ${esc(a.street)} ${a.depto ? `<span style="font-weight: 600; color: #64748b;">(${esc(a.depto)})</span>` : ''}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.86rem; color: #475569;">
                                        <span>${esc(a.city || '')}${a.province ? ', ' + esc(a.province) : ''}</span>
                                        <span style="background: #f1f5f9; color: #0f172a; font-weight: 800; font-size: 0.78rem; padding: 2px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                            CP ${esc(a.cp || '')}
                                        </span>
                                    </div>

                                    ${a.notes ? `
                                        <div style="font-size: 0.8rem; color: #475569; background: #f8fafc; padding: 8px 10px; border-radius: 10px; border: 1px solid #f1f5f9; display: flex; align-items: flex-start; gap: 6px;">
                                            <span class="material-symbols-outlined" style="font-size: 16px; color: #64748b; margin-top: 1px;">notes</span>
                                            <span>${esc(a.notes)}</span>
                                        </div>
                                    ` : ''}

                                    <!-- Botones de Acción de la Tarjeta -->
                                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 4px; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
                                        <button type="button" class="btn-page-edit-addr" data-id="${esc(a.id)}" style="background: ${isBeingEdited ? '#eff6ff' : '#ffffff'}; border: 1.5px solid ${isBeingEdited ? '#3b82f6' : '#cbd5e1'}; color: ${isBeingEdited ? '#1d4ed8' : '#0f172a'}; font-size: 0.78rem; font-weight: 800; padding: 6px 12px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-family: inherit;">
                                            <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                            <span>${isBeingEdited ? 'Editando...' : 'Editar'}</span>
                                        </button>
                                        <button type="button" class="btn-page-del-addr" data-id="${esc(a.id)}" style="background: #ffffff; border: 1.5px solid #fecaca; color: #dc2626; font-size: 0.78rem; font-weight: 800; padding: 6px 12px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-family: inherit;">
                                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                            <span>Eliminar</span>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                </div>
            </div>
        `;

        // Eventos de navegación superior
        container.querySelector('#btn-page-addr-open-drawer')?.addEventListener('click', () => {
            window.openUserProfileModal('menu');
        });
        container.querySelector('#btn-page-addr-back-store')?.addEventListener('click', () => {
            if (window.navigateToView) window.navigateToView('view-home');
        });

        // Eventos del listado de tarjetas
        container.querySelectorAll('.btn-page-set-default-addr').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (window.UserDataManager && typeof window.UserDataManager.setDefaultAddress === 'function') {
                    window.UserDataManager.setDefaultAddress(id);
                    if (typeof window.showToast === 'function') window.showToast('⭐ Dirección principal actualizada para tus envíos');
                    window.renderUserAddressesView();
                }
            });
        });

        container.querySelectorAll('.btn-page-edit-addr').forEach(btn => {
            btn.addEventListener('click', () => {
                pageEditingAddrId = btn.getAttribute('data-id');
                window.renderUserAddressesView();
                const formCard = document.getElementById('lt-page-addr-form-card');
                if (formCard) {
                    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        container.querySelectorAll('.btn-page-del-addr').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm('¿Querés eliminar esta dirección de entrega?')) {
                    if (window.UserDataManager && typeof window.UserDataManager.deleteAddress === 'function') {
                        window.UserDataManager.deleteAddress(id);
                        if (String(pageEditingAddrId) === String(id)) pageEditingAddrId = null;
                        if (typeof window.showToast === 'function') window.showToast('🗑️ Dirección eliminada');
                        window.renderUserAddressesView();
                    }
                }
            });
        });

        // Eventos del formulario
        const cancelEdit = () => {
            pageEditingAddrId = null;
            window.renderUserAddressesView();
        };
        container.querySelector('#btn-page-cancel-edit-top')?.addEventListener('click', cancelEdit);
        container.querySelector('#btn-page-cancel-edit-bottom')?.addEventListener('click', cancelEdit);

        container.querySelectorAll('.btn-page-addr-tag').forEach(tagBtn => {
            tagBtn.addEventListener('click', () => {
                const tagVal = tagBtn.getAttribute('data-tag');
                const aliasInput = container.querySelector('#page-addr-alias');
                if (aliasInput) {
                    aliasInput.value = tagVal;
                    aliasInput.focus();
                }
            });
        });

        const cpInput = container.querySelector('#page-addr-cp');
        const feedbackEl = container.querySelector('#page-addr-cp-feedback');
        const cityInput = container.querySelector('#page-addr-city');
        const provInput = container.querySelector('#page-addr-province');

        const evalPageCP = () => {
            const val = (cpInput?.value || '').trim();
            if (!val || !feedbackEl) {
                if (feedbackEl) feedbackEl.style.display = 'none';
                return;
            }
            if (typeof window.lookupPostalCode === 'function') {
                const res = window.lookupPostalCode(val);
                feedbackEl.style.display = 'block';
                if (res && res.hasLocalMatch !== false) {
                    feedbackEl.innerHTML = `✅ Cobertura local confirmada: <strong>${res.localidad} (${res.provincia})</strong>`;
                    feedbackEl.style.color = '#15803d';
                    feedbackEl.style.background = '#f0fdf4';
                    feedbackEl.style.borderColor = '#86efac';
                    if (res.localidad && cityInput && !cityInput.value) cityInput.value = res.localidad;
                    if (res.provincia && provInput && !provInput.value) provInput.value = res.provincia;
                } else {
                    feedbackEl.innerHTML = `📦 Envíos al interior vía Encomienda / Transporte`;
                    feedbackEl.style.color = '#b45309';
                    feedbackEl.style.background = '#fffbeb';
                    feedbackEl.style.borderColor = '#fcd34d';
                }
            }
        };

        if (cpInput) {
            cpInput.oninput = evalPageCP;
            if (cpInput.value) evalPageCP();
        }

        container.querySelector('#btn-page-save-address')?.addEventListener('click', () => {
            const aliasVal = (container.querySelector('#page-addr-alias')?.value || '').trim() || 'Mi Dirección';
            const streetVal = (container.querySelector('#page-addr-street')?.value || '').trim();
            const deptoVal = (container.querySelector('#page-addr-depto')?.value || '').trim();
            const cpVal = (container.querySelector('#page-addr-cp')?.value || '').trim();
            const cityVal = (container.querySelector('#page-addr-city')?.value || '').trim();
            const provVal = (container.querySelector('#page-addr-province')?.value || '').trim();
            const notesVal = (container.querySelector('#page-addr-notes')?.value || '').trim();
            const isDefVal = container.querySelector('#page-addr-is-default')?.checked || false;

            if (!streetVal) {
                alert('Por favor ingresá la Calle y Altura (Número).');
                container.querySelector('#page-addr-street')?.focus();
                return;
            }
            if (!cpVal) {
                alert('Por favor ingresá el Código Postal.');
                container.querySelector('#page-addr-cp')?.focus();
                return;
            }
            if (!cityVal) {
                alert('Por favor ingresá la Ciudad o Localidad.');
                container.querySelector('#page-addr-city')?.focus();
                return;
            }

            if (window.UserDataManager && typeof window.UserDataManager.saveAddress === 'function') {
                const res = window.UserDataManager.saveAddress({
                    id: pageEditingAddrId || undefined,
                    alias: aliasVal,
                    street: streetVal,
                    depto: deptoVal,
                    cp: cpVal,
                    city: cityVal,
                    province: provVal,
                    notes: notesVal,
                    isDefault: isDefVal
                });

                if (res && res.success === false) {
                    alert(res.message || 'No se pudo guardar la dirección');
                    return;
                }
            }

            const wasEdit = Boolean(pageEditingAddrId);
            pageEditingAddrId = null;
            if (typeof window.showToast === 'function') {
                window.showToast(wasEdit ? '✅ Dirección actualizada con éxito' : '✅ Dirección guardada con éxito');
            }
            window.renderUserAddressesView();
        });
    };

    if (false) {
        container.appendChild(wrapper);
    };
})();
