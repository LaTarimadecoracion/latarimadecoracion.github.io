// js/ui/user-profile-modal.js
// --- USER PROFILE DRAWER LATERAL (LAZY-LOADED) ---
// Abre un panel lateral deslizante (Side Drawer) para gestionar el perfil de usuario,
// datos de envío y facturación con sincronización automática en la nube vía Google Auth.

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
                background: rgba(15, 23, 42, 0.5);
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

        const publicUser = (window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function')
            ? window.AdminAuth.getPublicUser()
            : null;

        const currentData = (window.UserDataManager && typeof window.UserDataManager.get === 'function')
            ? window.UserDataManager.get()
            : {};

        const headerHTML = isModal ? `
            <div class="user-profile-drawer-header">
                <div class="user-profile-drawer-title-wrap">
                    <span class="material-symbols-outlined user-profile-drawer-icon">account_circle</span>
                    <div style="min-width: 0;">
                        <div class="user-profile-drawer-badge">La Tarima · Mi Cuenta</div>
                        <h3 class="user-profile-drawer-title">Mi Perfil de Entrega</h3>
                    </div>
                </div>
                <button type="button" id="btn-close-user-profile" class="user-profile-drawer-close-btn" title="Cerrar perfil">
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
                            <div style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase;">LA TARIMA - PERFIL DE USUARIO</div>
                            <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">Mi Perfil de Entrega</h3>
                        </div>
                    </div>
                </div>
                <div style="height: 4px; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 4px; margin-top: 8px;"></div>
            </div>
        `;

        // CASO A: Usuario NO autenticado -> Pantalla limpia de acceso con Google
        if (!publicUser) {
            const hasDesktopHeader = Boolean(window.DesktopHeader);
            card.innerHTML = `
                ${headerHTML}

                <div style="flex: 1; overflow-y: auto; padding: ${isModal ? '1.5rem 1.25rem' : '1.5rem 0'}; box-sizing: border-box; width: 100%; max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1.25rem; -webkit-overflow-scrolling: touch;">
                    <div style="width: 72px; height: 72px; border-radius: 50%; background: #f0fdf4; border: 2px solid #bbf7d0; color: #16a34a; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(22, 163, 74, 0.12);">
                        <span class="material-symbols-outlined" style="font-size: 36px;">verified_user</span>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <h2 style="margin: 0; font-size: 1.35rem; font-weight: 900; color: #0f172a; line-height: 1.25;">
                            Iniciá sesión gratis para gestionar tu Perfil de Entrega
                        </h2>
                        <p style="margin: 0; font-size: 0.9rem; color: #475569; line-height: 1.5;">
                            Tus datos (dirección, WhatsApp y facturación) quedan guardados de forma segura en tu cuenta entre PC y celular para comprar en 1 clic.
                        </p>
                    </div>

                    <button type="button" id="btn-profile-google-login" style="width: 100%; max-width: 340px; background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.9rem 1.25rem; font-size: 0.95rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08); transition: all 0.2s; font-family: inherit;" onmouseenter="if(!this.disabled){this.style.borderColor='#0f172a';this.style.transform='translateY(-1px)';}" onmouseleave="this.style.borderColor='#cbd5e1';this.style.transform='translateY(0)';">
                        ${GOOGLE_SVG}
                        <span>Continuar con Google</span>
                    </button>

                    <div id="prof-google-auth-error" style="display: none; width: 100%; max-width: 380px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 10px; padding: 0.65rem 0.9rem; font-size: 0.8rem; font-weight: 700;"></div>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.78rem; color: #64748b; line-height: 1.45; max-width: 440px;">
                        💡 <em>Si solo querés calcular costos de envío, podés ingresar tu Código Postal directamente en la barra superior o en el producto sin registrarte.</em>
                    </div>

                    ${(isModal && hasDesktopHeader) ? `
                        <button type="button" id="btn-close-user-profile-secondary" style="background: transparent; border: 1px solid #e2e8f0; color: #64748b; border-radius: 10px; padding: 0.55rem 1.15rem; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s;" onmouseenter="this.style.color='#0f172a';this.style.borderColor='#94a3b8';" onmouseleave="this.style.color='#64748b';this.style.borderColor='#e2e8f0';">
                            Cerrar y seguir navegando
                        </button>
                    ` : ''}
                </div>
            `;

            const closeBtn = card.querySelector('#btn-close-user-profile');
            if (closeBtn) closeBtn.onclick = onClose;
            const secCloseBtn = card.querySelector('#btn-close-user-profile-secondary');
            if (secCloseBtn) secCloseBtn.onclick = onClose;

            const googleLoginBtn = card.querySelector('#btn-profile-google-login');
            const authErrorEl = card.querySelector('#prof-google-auth-error');
            if (googleLoginBtn) {
                const defaultBtnHTML = googleLoginBtn.innerHTML;
                googleLoginBtn.onclick = async () => {
                    if (!window.AdminAuth || typeof window.AdminAuth.loginPublicStoreWithGoogle !== 'function') {
                        if (authErrorEl) {
                            authErrorEl.textContent = 'El servicio de acceso con Google aún está cargando. Intentá nuevamente en un segundo.';
                            authErrorEl.style.display = 'block';
                        }
                        return;
                    }
                    if (authErrorEl) authErrorEl.style.display = 'none';
                    googleLoginBtn.disabled = true;
                    googleLoginBtn.style.opacity = '0.7';
                    googleLoginBtn.style.cursor = 'wait';
                    googleLoginBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span><span>Conectando con Google...</span>`;

                    try {
                        const loggedUser = await window.AdminAuth.loginPublicStoreWithGoogle();
                        if (!loggedUser) {
                            return;
                        }
                        if (window.AdminAuth && typeof window.AdminAuth.syncClientProfileFromCloud === 'function') {
                            await window.AdminAuth.syncClientProfileFromCloud();
                        }
                        if (typeof window.renderPerfilCarritoView === 'function') {
                            window.renderPerfilCarritoView();
                        }
                        onReopen();
                    } catch (err) {
                        googleLoginBtn.disabled = false;
                        googleLoginBtn.style.opacity = '1';
                        googleLoginBtn.style.cursor = 'pointer';
                        googleLoginBtn.innerHTML = defaultBtnHTML;
                        if (err && err.code !== 'auth/popup-closed-by-user' && authErrorEl) {
                            authErrorEl.textContent = err.message || 'No se pudo iniciar sesión con Google. Intentá nuevamente.';
                            authErrorEl.style.display = 'block';
                        }
                    }
                };
            }
            return;
        }

        // CASO B: Usuario SÍ autenticado con Google
        const rawAvatar = (currentData.avatar || '').trim();
        const hasCustomAvatar = Boolean(rawAvatar && rawAvatar !== '👤' && rawAvatar !== 'face');
        const initialAvatar = hasCustomAvatar
            ? rawAvatar
            : (publicUser.picture || 'face');

        const isImageAvatar = (val) => Boolean(val && (val.startsWith('data:image') || val.startsWith('http')));
        const googleInitial = ((publicUser.nombre || publicUser.email || 'U').trim().charAt(0) || 'U').toUpperCase();
        const googleCardAvatarHTML = publicUser.picture
            ? `<img src="${esc(publicUser.picture)}" referrerpolicy="no-referrer" alt="${esc(publicUser.nombre || 'Google')}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1.5px solid #86efac; flex-shrink: 0;">`
            : `<div style="width: 42px; height: 42px; border-radius: 50%; background: #16a34a; color: #ffffff; font-weight: 900; font-size: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${esc(googleInitial)}</div>`;

        const prefilledName = currentData.name || publicUser.nombre || '';
        const prefilledEmail = publicUser.email || currentData.email || '';

        card.innerHTML = `
            ${headerHTML}

            <!-- Contenido Principal Desplazable -->
            <div style="flex: 1; overflow-y: auto; padding: ${isModal ? '1rem 1.25rem' : '1rem 0'}; box-sizing: border-box; width: 100%; max-width: ${isModal ? '100%' : '650px'}; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; -webkit-overflow-scrolling: touch;">

                <!-- Tarjeta de Cuenta Google Conectada -->
                <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 14px; padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        ${googleCardAvatarHTML}
                        <div style="min-width: 0; flex: 1;">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span style="font-size: 0.88rem; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(publicUser.nombre || 'Usuario Google')}</span>
                                <span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.3px;">Cuenta Google</span>
                            </div>
                            <div style="font-size: 0.75rem; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(publicUser.email || '')}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <button type="button" id="btn-clear-user-profile" style="background: #ffffff; border: 1px solid #fecaca; color: #dc2626; border-radius: 8px; padding: 0.4rem 0.65rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 3px; transition: all 0.2s;" title="Limpiar formulario" onmouseenter="this.style.background='#fef2f2';" onmouseleave="this.style.background='#ffffff';">
                            <span class="material-symbols-outlined" style="font-size: 15px;">delete</span>
                            <span>Limpiar</span>
                        </button>
                        <button type="button" id="btn-profile-google-logout" style="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; border-radius: 8px; padding: 0.4rem 0.75rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s;" onmouseenter="this.style.borderColor='#ef4444';this.style.color='#dc2626';" onmouseleave="this.style.borderColor='#cbd5e1';this.style.color='#475569';">
                            Cerrar sesión
                        </button>
                    </div>
                </div>

                <!-- 1. Datos de Contacto -->
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                    <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                        👤 1. Datos de Contacto:
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Nombre y Apellido *
                            </label>
                            <input type="text" id="prof-name" value="${esc(prefilledName)}" placeholder="Ej: María González" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Teléfono / WhatsApp *
                            </label>
                            <input type="tel" id="prof-phone" value="${esc(currentData.phone || '')}" placeholder="Ej: 11 1234 5678" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>
                        <div style="grid-column: 1 / -1; width: 100%;">
                            <label style="display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                <span>Correo Electrónico (Email) *</span>
                                <span style="font-size: 0.66rem; color: #16a34a; font-weight: 700; text-transform: none;">Email de tu cuenta Google</span>
                            </label>
                            <input type="email" id="prof-email" value="${esc(prefilledEmail)}" readonly style="width: 100%; box-sizing: border-box; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #475569; background: #f8fafc; font-family: inherit; outline: none; cursor: not-allowed;">
                        </div>
                    </div>
                </div>

                <!-- 2. Ubicación y Código Postal para Beneficios -->
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                    <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                        📍 2. Ubicación y Beneficios de Envío:
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Dirección de Entrega (Calle y Altura):
                            </label>
                            <input type="text" id="prof-address" value="${currentData.address || ''}" placeholder="Ej: Av. Corrientes 1234, 4to B" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Código Postal *
                                </label>
                                <input type="text" id="prof-zip" value="${currentData.zipCode || ''}" placeholder="Ej: 1712" maxlength="5" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.82rem; font-weight: 800; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Ciudad / Localidad:
                                </label>
                                <input type="text" id="prof-locality" value="${currentData.locality || ''}" placeholder="Ej: Castelar / CABA" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Provincia:
                                </label>
                                <input type="text" id="prof-province" value="${currentData.province || ''}" placeholder="Ej: Buenos Aires" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Indicaciones / Notas de Entrega (Opcional):
                            </label>
                            <input type="text" id="prof-delivery-notes" value="${currentData.deliveryNotes || ''}" placeholder="Ej: Timbre no funciona / Entregar en portería" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>

                        <!-- Feedback de Cobertura -->
                        <div id="prof-cp-feedback" style="font-size: 0.78rem; font-weight: 700; padding: 8px 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; display: none; margin-top: 4px;"></div>
                    </div>
                </div>

                <!-- 3. Datos Fiscales y Facturación (Opcional) -->
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                            📄 3. Datos de Facturación / Factura A (Opcional):
                        </div>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 700; color: #0f172a;">
                            <input type="checkbox" id="prof-factura-a-toggle" ${(currentData.cuit || currentData.razonSocial) ? 'checked' : ''} style="accent-color: #0f172a; cursor: pointer;">
                            <span>Datos para Factura</span>
                        </label>
                    </div>

                    <div id="prof-factura-a-menu" style="display: ${(currentData.cuit || currentData.razonSocial) ? 'flex' : 'none'}; flex-direction: column; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    1. Razón Social / Persona / Entidad
                                </label>
                                <input type="text" id="prof-razon-social" value="${esc(currentData.razonSocial || '')}" placeholder="Ej: La Tarima SRL o Tu Nombre" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    2. CUIT / CUIL / DNI
                                </label>
                                <input type="text" id="prof-cuit" value="${esc(currentData.cuit || '')}" placeholder="Ej: 30-12345678-9" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div style="grid-column: 1 / -1; width: 100%;">
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    3. Domicilio / Dirección Fiscal
                                </label>
                                <input type="text" id="prof-dir-fiscal" value="${esc(currentData.dirFiscal || currentData.fiscalAddress || '')}" placeholder="Av. Rivadavia 1234, Ciudad/Localidad, Provincia" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    4. Provincia / Jurisdicción Fiscal
                                </label>
                                <input type="text" id="prof-provincia-fiscal" value="${esc(currentData.provinciaFiscal || '')}" placeholder="Ej: Buenos Aires / CABA" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    5. Condición frente al IVA
                                </label>
                                <select id="prof-condicion-iva" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none; background: #ffffff; cursor: pointer;">
                                    <option value="Consumidor Final" ${(currentData.condIva === 'Consumidor Final' || !currentData.condIva) ? 'selected' : ''}>Consumidor Final</option>
                                    <option value="Responsable Inscripto" ${currentData.condIva === 'Responsable Inscripto' ? 'selected' : ''}>IVA Responsable Inscripto (Factura A)</option>
                                    <option value="Responsable Monotributo" ${currentData.condIva === 'Responsable Monotributo' ? 'selected' : ''}>Responsable Monotributo</option>
                                    <option value="IVA Exento" ${currentData.condIva === 'IVA Exento' ? 'selected' : ''}>IVA Exento / No Gravado</option>
                                    <option value="Sujeto No Categorizado" ${currentData.condIva === 'Sujeto No Categorizado' ? 'selected' : ''}>Sujeto No Categorizado</option>
                                </select>
                            </div>

                            <div style="grid-column: 1 / -1; width: 100%;">
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    6. Correo para Envío de Factura (Opcional)
                                </label>
                                <input type="email" id="prof-email-fiscal" value="${esc(currentData.emailFiscal || '')}" placeholder="Ej: facturacion@empresa.com (si dejás vacío se usa tu email principal)" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer con Botones estilo Checkout / Drawer -->
            <div style="width: 100%; border-top: 1px solid #f1f5f9; padding: ${isModal ? '0.85rem 1.25rem' : '0.75rem 0'}; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; max-width: ${isModal ? '100%' : '650px'}; margin: 0 auto; box-sizing: border-box; background: #ffffff;">
                <div id="prof-validation-error" style="display: none; background: #fef2f2; border: 1.5px solid #fca5a5; color: #991b1b; padding: 0.65rem 0.9rem; border-radius: 10px; font-size: 0.78rem; font-weight: 700; text-align: center;">
                    ⚠️ Por favor completá todos los campos obligatorios de Contacto y Ubicación antes de guardar.
                </div>
                <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; width: 100%;">
                    <button type="button" id="btn-save-user-profile" style="width: ${isModal ? '100%' : 'auto'}; background: #16a34a; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.6rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3); transition: all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">save</span>
                        <span>Guardar Mi Perfil</span>
                    </button>
                </div>
            </div>
        `;

        const closeBtn = card.querySelector('#btn-close-user-profile');
        if (closeBtn) closeBtn.onclick = onClose;

        const googleLogoutBtn = card.querySelector('#btn-profile-google-logout');
        if (googleLogoutBtn) {
            googleLogoutBtn.onclick = async () => {
                googleLogoutBtn.disabled = true;
                googleLogoutBtn.textContent = 'Cerrando...';
                try {
                    if (window.AdminAuth && typeof window.AdminAuth.logoutPublic === 'function') {
                        await window.AdminAuth.logoutPublic();
                    }
                } catch (e) {}
                if (typeof window.renderPerfilCarritoView === 'function') {
                    window.renderPerfilCarritoView();
                }
                if (isModal) {
                    onClose();
                } else {
                    onReopen();
                }
            };
        }

        // Toggle desplegable de Factura A
        const facturaAToggle = card.querySelector('#prof-factura-a-toggle');
        const facturaAMenu = card.querySelector('#prof-factura-a-menu');
        if (facturaAToggle && facturaAMenu) {
            facturaAToggle.addEventListener('change', () => {
                facturaAMenu.style.display = facturaAToggle.checked ? 'flex' : 'none';
            });
        }

        // Avatar del perfil (hereda automáticamente la foto de la cuenta Google conectada)
        let selectedAvatar = publicUser.picture || currentData.avatar || initialAvatar || 'face';

        // Evento de Limpieza Total de Datos (Tacho de Basura)
        const clearBtn = card.querySelector('#btn-clear-user-profile');
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (confirm('¿Querés borrar todos tus datos de perfil guardados?')) {
                    if (window.UserDataManager && typeof window.UserDataManager.clear === 'function') {
                        window.UserDataManager.clear();
                    }
                    
                    // Resetear inputs del modal (manteniendo el email readonly de la cuenta Google)
                    ['#prof-name', '#prof-phone', '#prof-address', '#prof-zip', '#prof-locality', '#prof-province', '#prof-delivery-notes', '#prof-razon-social', '#prof-cuit', '#prof-dir-fiscal', '#prof-provincia-fiscal', '#prof-email-fiscal'].forEach(id => {
                        const input = card.querySelector(id);
                        if (input) {
                            input.value = '';
                            input.style.borderColor = '#cbd5e1';
                            input.style.boxShadow = 'none';
                        }
                    });
                    const emailEl = card.querySelector('#prof-email');
                    if (emailEl) {
                        emailEl.value = publicUser.email || '';
                    }

                    // Desmarcar Factura A
                    if (facturaAToggle) facturaAToggle.checked = false;
                    if (facturaAMenu) facturaAMenu.style.display = 'none';

                    // Ocultar banner de error
                    const errBanner = card.querySelector('#prof-validation-error');
                    if (errBanner) errBanner.style.display = 'none';

                    // Resetear avatar UI
                    selectedAvatar = publicUser?.picture || 'face';

                    // Actualizar vista del carrito si corresponde
                    if (typeof window.renderPerfilCarritoView === 'function') {
                        window.renderPerfilCarritoView();
                    }
                }
            };
        }

        // Auto evaluar CP en el modal al escribir
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
        cpField.oninput = () => {
            evalCP();
            cpField.style.borderColor = '#cbd5e1';
            cpField.style.boxShadow = 'none';
        };
        evalCP();

        ['#prof-name', '#prof-phone', '#prof-email', '#prof-address', '#prof-locality', '#prof-province'].forEach(id => {
            const inputEl = card.querySelector(id);
            if (inputEl) {
                inputEl.oninput = () => {
                    inputEl.style.borderColor = '#cbd5e1';
                    inputEl.style.boxShadow = 'none';
                };
            }
        });

        card.querySelector('#btn-save-user-profile').onclick = () => {
            const zipVal = (cpField.value || '').trim();
            const nameVal = (card.querySelector('#prof-name').value || '').trim();
            const phoneVal = (card.querySelector('#prof-phone').value || '').trim();
            const emailVal = (card.querySelector('#prof-email').value || '').trim();
            const addrVal = (card.querySelector('#prof-address').value || '').trim();
            const locVal = (localityField ? localityField.value : '').trim();
            const provVal = (provinceField ? provinceField.value : '').trim();
            const notesVal = (card.querySelector('#prof-delivery-notes').value || '').trim();

            const isFacturaA = card.querySelector('#prof-factura-a-toggle')?.checked || false;
            const razonVal = isFacturaA ? (card.querySelector('#prof-razon-social')?.value || '').trim() : '';
            const cuitVal = isFacturaA ? (card.querySelector('#prof-cuit')?.value || '').trim() : '';
            const dirFiscalVal = isFacturaA ? (card.querySelector('#prof-dir-fiscal')?.value || '').trim() : '';
            const provFiscalVal = isFacturaA ? (card.querySelector('#prof-provincia-fiscal')?.value || '').trim() : '';
            const condIvaVal = isFacturaA ? (card.querySelector('#prof-condicion-iva')?.value || 'Consumidor Final') : '';
            const emailFiscalVal = isFacturaA ? (card.querySelector('#prof-email-fiscal')?.value || '').trim() : '';

            const profilePayload = {
                avatar: selectedAvatar,
                zipCode: zipVal,
                name: nameVal,
                phone: phoneVal,
                email: emailVal,
                address: addrVal,
                locality: locVal,
                province: provVal,
                deliveryNotes: notesVal,
                razonSocial: razonVal,
                cuit: cuitVal,
                dirFiscal: dirFiscalVal,
                provinciaFiscal: provFiscalVal,
                condIva: condIvaVal,
                emailFiscal: emailFiscalVal
            };

            let savedData = profilePayload;
            if (window.UserDataManager && typeof window.UserDataManager.save === 'function') {
                savedData = window.UserDataManager.save(profilePayload) || profilePayload;
            }

            if (window.AdminAuth && typeof window.AdminAuth.saveClientProfileToCloud === 'function') {
                window.AdminAuth.saveClientProfileToCloud(savedData);
            }

            if (typeof window.renderPerfilCarritoView === 'function') {
                window.renderPerfilCarritoView();
            }

            if (typeof window.showToast === 'function') {
                window.showToast('Perfil guardado y sincronizado en tu cuenta');
            }

            if (isModal) {
                onClose();
            }
        };
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
        drawer.setAttribute('aria-label', 'Mi Perfil de Entrega');

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
        wrapper.style.cssText = 'max-width: 760px; margin: 1.25rem auto 2.5rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 1.35rem 1.5rem; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.05); font-family: var(--font-main); display: flex; flex-direction: column; gap: 0.75rem; box-sizing: border-box;';

        mountUserProfileUI(wrapper, {
            isModal: false,
            onClose: () => {},
            onReopen: () => window.renderUserProfileView()
        });

        container.appendChild(wrapper);
    };
})();
