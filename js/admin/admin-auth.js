/* =============================================================================
   js/admin/admin-auth.js
   Módulo de Autenticación Oficial con Google y Redes Sociales (Firebase Auth)
   La Tarima 2.0 - Seguridad RBAC para el Panel de Control
   ============================================================================= */

(function () {
    const STORAGE_USERS_KEY = 'latarima_admin_users';
    const STORAGE_SESSION_KEY = 'latarima_admin_session';
    const STORAGE_CLIENT_SESSION_KEY = 'latarima_client_session';
    const WORKER_URL = 'https://super-shadow-4ad9.latarimadecoracion.workers.dev';

    // Configuración oficial de Firebase del proyecto "La Tarima"
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyCi3G5vEe2RIZZfsq5EAV0FAJ6Gapa8P9M",
        authDomain: "la-tarima-87cb2.firebaseapp.com",
        projectId: "la-tarima-87cb2",
        storageBucket: "la-tarima-87cb2.firebasestorage.app",
        messagingSenderId: "864929274424",
        appId: "1:864929274424:web:28444bbe9ebd6bf1c664cd",
        measurementId: "G-01SZKBEKR7"
    };

    // Administradores y cuentas autorizadas por defecto (Equipo + Clientes)
    const DEFAULT_ADMIN_USERS = [
        {
            id: 'usr_superadmin_01',
            nombre: 'Yonatan Orellana',
            email: 'yonatanorellana1990@gmail.com',
            role: 'superadmin',
            provider: 'google',
            status: 'activo',
            telefono: '+54 9 11 6700-7723',
            clientTier: 'mayorista',
            totalOrders: 0,
            totalSpent: 0,
            createdAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'usr_superadmin_02',
            nombre: 'Admin Principal',
            email: 'admin@latarima.com',
            role: 'superadmin',
            provider: 'google',
            status: 'activo',
            telefono: '+54 9 11 6700-7723',
            clientTier: 'mayorista',
            totalOrders: 12,
            totalSpent: 450000,
            createdAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'usr_colab_01',
            nombre: 'Operador de Taller',
            email: 'logistica@latarima.com',
            role: 'colaborador',
            provider: 'google',
            status: 'activo',
            telefono: '+54 9 11 8765-4321',
            clientTier: 'regular',
            totalOrders: 0,
            totalSpent: 0,
            createdAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'usr_cli_01',
            nombre: 'Distribuidora Maderas del Norte',
            email: 'ventas@maderasnorte.com',
            role: 'cliente',
            provider: 'google',
            status: 'activo',
            telefono: '+54 9 11 5555-9999',
            clientTier: 'mayorista',
            totalOrders: 8,
            totalSpent: 1250000,
            createdAt: '2026-02-10T11:20:00Z'
        },
        {
            id: 'usr_cli_02',
            nombre: 'Carolina Gómez',
            email: 'caro.gomez@gmail.com',
            role: 'cliente',
            provider: 'google',
            status: 'activo',
            telefono: '+54 9 11 4444-3333',
            clientTier: 'frecuente',
            totalOrders: 3,
            totalSpent: 185000,
            createdAt: '2026-03-22T18:45:00Z'
        }
    ];

    // Inicializar Firebase Auth de manera segura
    function getFirebaseAuth() {
        if (typeof firebase === 'undefined' || !firebase.initializeApp) {
            return null;
        }
        if (!firebase.apps || !firebase.apps.length) {
            try {
                firebase.initializeApp(FIREBASE_CONFIG);
            } catch (e) {
                console.error('[AdminAuth] Error inicializando Firebase:', e);
            }
        }
        return (firebase.auth && typeof firebase.auth === 'function') ? firebase.auth() : null;
    }

    // Cargar usuarios autorizados locales o sincronizados
    function getStoredUsers() {
        try {
            const raw = localStorage.getItem(STORAGE_USERS_KEY);
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list) && list.length > 0) {
                    const hasYonatan = list.some(u => (u.email || '').toLowerCase() === 'yonatanorellana1990@gmail.com');
                    if (!hasYonatan) {
                        list.unshift(DEFAULT_ADMIN_USERS[0]);
                        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(list));
                    }
                    return list;
                }
            }
        } catch (e) {
            console.error('[AdminAuth] Error cargando usuarios locales:', e);
        }
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_ADMIN_USERS));
        return DEFAULT_ADMIN_USERS;
    }

    async function syncUsersFromCloud() {
        try {
            const res = await fetch(`${WORKER_URL}/admin/users`);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.users) && data.users.length > 0) {
                    const hasYonatan = data.users.some(u => (u.email || '').toLowerCase() === 'yonatanorellana1990@gmail.com');
                    if (!hasYonatan) {
                        data.users.unshift(DEFAULT_ADMIN_USERS[0]);
                    }
                    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(data.users));
                    if (window.AdminUsers && typeof window.AdminUsers.renderTable === 'function') {
                        window.AdminUsers.renderTable();
                    }
                    return data.users;
                }
            }
        } catch (e) {
            console.warn('[AdminAuth] Cloud KV offline o no disponible, usando usuarios locales.');
        }
        return getStoredUsers();
    }

    function saveStoredUsers(users) {
        try {
            localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
            fetch(`${WORKER_URL}/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users }),
                keepalive: true
            }).catch(() => {});
        } catch (e) {
            console.error('[AdminAuth] Error guardando usuarios locales:', e);
        }
    }

    // Manejo de Sesión Local
    function getSession() {
        try {
            const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
            if (!raw) return null;
            const session = JSON.parse(raw);
            if (!session || !session.expiresAt || !session.user) return null;
            if (Date.now() > session.expiresAt) {
                clearSession();
                return null;
            }
            return session;
        } catch (e) {
            clearSession();
            return null;
        }
    }

    function setSession(user, rememberMe = true) {
        const duration = rememberMe ? (30 * 24 * 3600 * 1000) : (12 * 3600 * 1000);
        const session = {
            token: 'ltk_fb_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
            user: {
                id: user.id || 'usr_' + Date.now(),
                nombre: user.nombre || 'Administrador',
                email: (user.email || '').toLowerCase(),
                role: user.role || 'superadmin',
                picture: user.picture || '',
                provider: user.provider || 'google'
            },
            expiresAt: Date.now() + duration,
            createdAt: Date.now()
        };
        try {
            if (rememberMe) {
                localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
            } else {
                sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
            }
        } catch (e) {}
        return session;
    }

    function clearSession() {
        try {
            localStorage.removeItem(STORAGE_SESSION_KEY);
            sessionStorage.removeItem(STORAGE_SESSION_KEY);
        } catch (e) {}
    }

    function isAuthenticated() {
        const session = getSession();
        if (!session || !session.user) return false;
        const role = session.user.role;
        return role === 'superadmin' || role === 'colaborador';
    }

    function getCurrentUser() {
        const session = getSession();
        return session ? session.user : null;
    }

    // Validar autorización de un correo verificado por Firebase
    function verifyAuthorizedUser(email, displayName = '', photoURL = '', rememberMe = true) {
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) {
            return { success: false, message: 'No se recibió un correo electrónico verificado desde Google.' };
        }

        const users = getStoredUsers();
        let user = users.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);

        if (!user) {
            return {
                success: false,
                message: `La cuenta de Google "${cleanEmail}" no está en el equipo administrativo. Si sos cliente, podés iniciar sesión desde la tienda.`
            };
        }

        if (user.status === 'suspendido') {
            return { success: false, message: 'Esta cuenta se encuentra suspendida. Contactá al SuperAdmin.' };
        }

        if (user.role !== 'superadmin' && user.role !== 'colaborador') {
            return {
                success: false,
                message: `La cuenta "${cleanEmail}" está registrada como Cliente. No posee permisos de acceso al Panel de Control.`
            };
        }

        // Actualizar foto y nombre verificados
        if (displayName && (!user.nombre || user.nombre === 'Yonatan Orellana')) {
            user.nombre = displayName;
        }
        if (photoURL) {
            user.picture = photoURL;
        }

        saveStoredUsers(users);
        const session = setSession(user, rememberMe);
        return { success: true, user: session.user };
    }

    // Iniciar Sesión Oficial con Google Popup (Firebase)
    async function loginWithGooglePopup(rememberMe = true) {
        const auth = getFirebaseAuth();
        if (!auth) {
            throw new Error('El servicio de autenticación de Firebase aún no se cargó. Verifica tu conexión a internet.');
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        const persistence = rememberMe
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        await auth.setPersistence(persistence);
        const result = await auth.signInWithPopup(provider);
        const fbUser = result.user;

        if (!fbUser || !fbUser.email) {
            throw new Error('Google no devolvió un correo electrónico verificado.');
        }

        const check = verifyAuthorizedUser(fbUser.email, fbUser.displayName, fbUser.photoURL, rememberMe);
        if (!check.success) {
            // Desloguear de Firebase inmediatamente si no es admin autorizado
            await auth.signOut().catch(() => {});
            throw new Error(check.message);
        }

        return check.user;
    }

    // Cerrar sesión en Firebase y en la app
    async function logout() {
        const auth = getFirebaseAuth();
        if (auth) {
            try { await auth.signOut(); } catch (e) {}
        }
        clearSession();
        try { localStorage.removeItem(STORAGE_CLIENT_SESSION_KEY); } catch (e) {}
        if (window.DesktopHeader && typeof window.DesktopHeader.renderAccount === 'function') {
            window.DesktopHeader.renderAccount();
        }
        if (typeof window.navigateToView === 'function') {
            window.navigateToView('view-home');
        } else if (window.location.pathname.includes('/pedidos/admin.html')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = '/';
        }
    }

    // Modal de Login con Google Oficial (Firebase)
    function showLoginModal(onSuccess, onCancel) {
        const existing = document.getElementById('admin-login-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'admin-login-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.90);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            box-sizing: border-box;
            opacity: 0;
            transition: opacity 0.25s ease-out;
            font-family: var(--font-main, 'Outfit', sans-serif);
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            position: relative;
            background: #ffffff;
            border-radius: 24px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1);
            overflow: hidden;
            transform: scale(0.95);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            flex-direction: column;
        `;

        card.innerHTML = `
            <!-- Encabezado con Identidad de Marca -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 2.25rem 1.5rem 1.75rem 1.5rem; text-align: center; position: relative;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: #ffffff; color: #0f172a; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.85rem; box-shadow: 0 4px 20px rgba(0,0,0,0.35);">
                    <!-- Icono oficial multicolor de Google -->
                    <svg width="32" height="32" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                </div>
                <h2 style="margin: 0 0 6px 0; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.3px;">Panel de Control</h2>
                <p style="margin: 0; font-size: 0.84rem; color: #94a3b8; font-weight: 500;">Autenticación Segura con Cuenta de Google</p>
            </div>

            <!-- Cuerpo del Modal -->
            <div style="padding: 1.75rem 1.5rem; display: flex; flex-direction: column; gap: 1.15rem; box-sizing: border-box;">
                
                <!-- Mensaje de Error (si ocurre) -->
                <div id="admin-login-error" style="display: none; background: #fef2f2; border: 1.5px solid #fca5a5; color: #b91c1c; border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.84rem; font-weight: 600; line-height: 1.4; align-items: flex-start; gap: 8px;">
                    <span class="material-symbols-outlined" style="font-size: 20px; flex-shrink: 0; margin-top: 1px;">error</span>
                    <span id="admin-login-error-text"></span>
                </div>

                <!-- Aviso de Seguridad -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 0.85rem 1rem; font-size: 0.82rem; color: #475569; line-height: 1.45; text-align: left; display: flex; align-items: flex-start; gap: 10px;">
                    <span class="material-symbols-outlined" style="font-size: 20px; color: #0284c7; flex-shrink: 0; margin-top: 1px;">shield</span>
                    <div>
                        <strong>Acceso restringido:</strong> Se abrirá la ventana oficial de Google para verificar tu identidad y contraseña. Solo los administradores autorizados tienen acceso.
                    </div>
                </div>

                <!-- Botón Principal "Iniciar sesión con Google" -->
                <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    <button type="button" id="btn-login-with-google" style="background: #ffffff; color: #1e293b; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.95rem 1.4rem; font-weight: 700; font-size: 0.98rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); transition: all 0.2s;" onmouseenter="this.style.background='#f8fafc'; this.style.borderColor='#94a3b8';" onmouseleave="this.style.background='#ffffff'; this.style.borderColor='#cbd5e1';">
                        <svg width="22" height="22" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span id="btn-login-label">Iniciar sesión con Google</span>
                    </button>
                </div>

                <!-- Recordarme Checkbox -->
                <div style="display: flex; align-items: center; justify-content: center;">
                    <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #64748b; font-weight: 600; cursor: pointer; user-select: none;">
                        <input type="checkbox" id="admin-login-remember" checked style="accent-color: #0f172a; width: 16px; height: 16px;">
                        <span>Mantener mi sesión activa</span>
                    </label>
                </div>

                <!-- Botón Volver a la Tienda -->
                <div style="border-top: 1px solid #f1f5f9; padding-top: 1rem; margin-top: 0.25rem;">
                    <button type="button" id="btn-admin-login-cancel" style="background: transparent; color: #64748b; border: none; border-radius: 10px; padding: 0.65rem 1rem; font-weight: 700; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; transition: color 0.2s;" onmouseenter="this.style.color='#0f172a';" onmouseleave="this.style.color='#64748b';">
                        <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                        <span>Volver a la tienda pública</span>
                    </button>
                </div>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });

        const closeModal = () => {
            overlay.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => overlay.remove(), 250);
        };

        const handleCancel = () => {
            closeModal();
            if (typeof onCancel === 'function') {
                onCancel();
            } else {
                if (typeof window.navigateToView === 'function') {
                    window.navigateToView('view-home');
                } else if (window.location.pathname.includes('/pedidos/admin.html')) {
                    window.location.href = '../index.html';
                }
            }
        };

        document.getElementById('btn-admin-login-cancel')?.addEventListener('click', handleCancel);

        const onEsc = (e) => {
            if (e.key === 'Escape') {
                window.removeEventListener('keydown', onEsc);
                handleCancel();
            }
        };
        window.addEventListener('keydown', onEsc);

        const handleSuccessfulAuth = (user) => {
            const errBox = document.getElementById('admin-login-error');
            if (errBox) errBox.style.display = 'none';

            const btn = document.getElementById('btn-login-with-google');
            if (btn) {
                btn.disabled = true;
                btn.style.background = '#dcfce7';
                btn.style.color = '#15803d';
                btn.style.borderColor = '#86efac';
                btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">check_circle</span><span>Acceso concedido</span>';
            }

            setTimeout(() => {
                closeModal();
                if (typeof onSuccess === 'function') {
                    onSuccess(user);
                }
                renderHeaderUserBadge();
            }, 400);
        };

        const handleFailedAuth = (msg) => {
            const errBox = document.getElementById('admin-login-error');
            const errText = document.getElementById('admin-login-error-text');
            if (errBox && errText) {
                errText.textContent = msg;
                errBox.style.display = 'flex';
            }
            const btn = document.getElementById('btn-login-with-google');
            const label = document.getElementById('btn-login-label');
            if (btn) btn.disabled = false;
            if (label) label.textContent = 'Iniciar sesión con Google';
        };

        // Evento clic: abre el popup oficial de autenticación de Google
        document.getElementById('btn-login-with-google')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-login-with-google');
            const label = document.getElementById('btn-login-label');
            const remember = document.getElementById('admin-login-remember')?.checked || false;

            if (btn) btn.disabled = true;
            if (label) label.textContent = 'Abriendo ventana de Google...';

            try {
                const user = await loginWithGooglePopup(remember);
                handleSuccessfulAuth(user);
            } catch (err) {
                console.error('[AdminAuth] Error en login popup:', err);
                let message = err.message || 'Error al iniciar sesión con Google.';
                if (err.code === 'auth/popup-closed-by-user') {
                    message = 'Se cerró la ventana de Google antes de completar el inicio de sesión.';
                } else if (err.code === 'auth/unauthorized-domain') {
                    message = 'Este dominio no está autorizado en Firebase Authentication. Agrégalo en Firebase Console > Authentication > Ajustes > Dominios autorizados.';
                } else if (err.code === 'auth/operation-not-allowed') {
                    message = 'El proveedor Google aún no está habilitado en Firebase Console > Authentication > Método de acceso.';
                }
                handleFailedAuth(message);
            }
        });
    }

    // Renderizar badge con usuario y botón Salir en la barra de navegación del Admin
    function renderHeaderUserBadge() {
        const user = getCurrentUser();
        const headerActions = document.querySelector('.admin-navbar-actions');
        if (!headerActions) return;

        let badge = document.getElementById('admin-header-user-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'admin-header-user-badge';
            badge.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 12px;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 20px;
                font-size: 0.78rem;
                color: #f8fafc;
                margin-right: 4px;
            `;
            const closeBtn = document.getElementById('btn-close-admin');
            if (closeBtn) {
                headerActions.insertBefore(badge, closeBtn);
            } else {
                headerActions.appendChild(badge);
            }
        }

        if (user) {
            const isSuper = user.role === 'superadmin';
            badge.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 16px; color: ${isSuper ? '#ef4444' : '#38bdf8'};">shield_person</span>
                <span style="font-weight: 700; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.nombre}</span>
                <span style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 4px; background: ${isSuper ? '#ef4444' : '#0284c7'}; color: #fff;">
                    ${isSuper ? 'SuperAdmin' : 'Colaborador'}
                </span>
            `;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }

        // Vincular botón Salir para cerrar sesión
        const closeAdminBtn = document.getElementById('btn-close-admin');
        if (closeAdminBtn && !closeAdminBtn.dataset.authBound) {
            closeAdminBtn.dataset.authBound = 'true';
            closeAdminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('¿Deseás cerrar la sesión de administración?')) {
                    logout();
                }
            });
        }
    }

    // Inicializar listener de Firebase Auth para persistencia automática (Equipo y Clientes)
    function initAuthListener() {
        const auth = getFirebaseAuth();
        if (!auth) return;

        // Procesar resultado si volvió de un redirect
        auth.getRedirectResult().catch(() => {});

        auth.onAuthStateChanged((fbUser) => {
            if (fbUser && fbUser.email) {
                const cleanEmail = fbUser.email.trim().toLowerCase();
                const users = getStoredUsers();
                let userRecord = users.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);

                // Si es usuario nuevo en la tienda pública, se registra como cliente por defecto
                if (!userRecord && !window.location.pathname.includes('/pedidos/admin.html')) {
                    userRecord = registerClientUser(cleanEmail, fbUser.displayName || 'Cliente', '', fbUser.photoURL || '');
                }

                if (userRecord && userRecord.status !== 'suspendido') {
                    // Sincronizar siempre la foto actualizada de Google
                    if (fbUser.photoURL && userRecord.picture !== fbUser.photoURL) {
                        userRecord.picture = fbUser.photoURL;
                        saveStoredUsers(users);
                    }

                    const resolvedPicture = fbUser.photoURL || userRecord.picture || '';
                    const isStaff = userRecord.role === 'superadmin' || userRecord.role === 'colaborador';

                    if (isStaff) {
                        const existingSession = getSession();
                        if (!existingSession || (resolvedPicture && existingSession.user.picture !== resolvedPicture)) {
                            verifyAuthorizedUser(fbUser.email, fbUser.displayName, resolvedPicture, true);
                            renderHeaderUserBadge();
                        }
                    }

                    // Mantener sesión pública de tienda sincronizada
                    const publicSession = {
                        user: {
                            id: userRecord.id,
                            nombre: userRecord.nombre || fbUser.displayName || 'Usuario',
                            email: cleanEmail,
                            role: userRecord.role || 'cliente',
                            clientTier: userRecord.clientTier || 'regular',
                            picture: resolvedPicture,
                            provider: 'google'
                        },
                        expiresAt: Date.now() + (30 * 24 * 3600 * 1000)
                    };
                    try {
                        localStorage.setItem(STORAGE_CLIENT_SESSION_KEY, JSON.stringify(publicSession));
                    } catch (e) {}

                    syncClientProfileFromCloud(publicSession.user);

                    if (window.DesktopHeader && typeof window.DesktopHeader.renderAccount === 'function') {
                        window.DesktopHeader.renderAccount();
                    }
                    const myOrdersEl = document.getElementById('view-my-orders');
                    if (myOrdersEl && myOrdersEl.classList.contains('active') && window.MyOrders) {
                        window.MyOrders.render();
                    }
                } else if (window.location.pathname.includes('/pedidos/admin.html')) {
                    auth.signOut().catch(() => {});
                }
            }
        });
    }

    function registerClientUser(email, nombre = 'Cliente', telefono = '', picture = '') {
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) return null;
        const users = getStoredUsers();
        let existing = users.find(u => (u.email || '').toLowerCase() === cleanEmail);
        if (!existing) {
            existing = {
                id: 'usr_cli_' + Date.now(),
                nombre: nombre,
                email: cleanEmail,
                telefono: telefono,
                picture: picture,
                role: 'cliente',
                clientTier: 'regular',
                status: 'activo',
                provider: 'google',
                totalOrders: 0,
                totalSpent: 0,
                createdAt: new Date().toISOString()
            };
            users.push(existing);
            saveStoredUsers(users);
        } else {
            let changed = false;
            if (nombre && (!existing.nombre || existing.nombre === 'Cliente')) { existing.nombre = nombre; changed = true; }
            if (picture && existing.picture !== picture) { existing.picture = picture; changed = true; }
            if (changed) saveStoredUsers(users);
        }
        return existing;
    }

    function getPublicUser() {
        let clientUser = null;
        try {
            const raw = localStorage.getItem(STORAGE_CLIENT_SESSION_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt && parsed.user) {
                    clientUser = parsed.user;
                } else {
                    localStorage.removeItem(STORAGE_CLIENT_SESSION_KEY);
                }
            }
        } catch (e) {}

        const adminUser = getCurrentUser();
        if (adminUser) {
            if (!adminUser.picture && clientUser && clientUser.picture) {
                adminUser.picture = clientUser.picture;
            }
            return adminUser;
        }
        return clientUser;
    }

    async function loginPublicStoreWithGoogle() {
        const auth = getFirebaseAuth();
        if (!auth) {
            throw new Error('Firebase Auth aún no se cargó. Verificá tu conexión.');
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        let result;
        try {
            result = await auth.signInWithPopup(provider);
        } catch (popErr) {
            if (popErr && (popErr.code === 'auth/popup-blocked' || popErr.code === 'auth/operation-not-supported-in-this-environment')) {
                await auth.signInWithRedirect(provider);
                return null;
            }
            throw popErr;
        }
        const fbUser = result.user;
        if (!fbUser || !fbUser.email) {
            throw new Error('No se recibió un correo electrónico válido.');
        }

        const cleanEmail = fbUser.email.trim().toLowerCase();
        const users = getStoredUsers();
        let userRecord = users.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);

        if (!userRecord) {
            userRecord = registerClientUser(cleanEmail, fbUser.displayName || 'Cliente', '', fbUser.photoURL || '');
        } else {
            if (userRecord.status === 'suspendido') {
                await auth.signOut().catch(() => {});
                throw new Error('Esta cuenta se encuentra suspendida.');
            }
            if (fbUser.photoURL && userRecord.picture !== fbUser.photoURL) {
                userRecord.picture = fbUser.photoURL;
                saveStoredUsers(users);
            }
        }

        // Si es SuperAdmin o Colaborador, también creamos la sesión admin automática
        if (userRecord.role === 'superadmin' || userRecord.role === 'colaborador') {
            setSession(userRecord, true);
        } else {
            clearSession();
        }

        const publicSession = {
            user: {
                id: userRecord.id,
                nombre: userRecord.nombre || fbUser.displayName || 'Usuario',
                email: cleanEmail,
                role: userRecord.role || 'cliente',
                clientTier: userRecord.clientTier || 'regular',
                picture: userRecord.picture || fbUser.photoURL || '',
                provider: 'google'
            },
            expiresAt: Date.now() + (30 * 24 * 3600 * 1000)
        };
        localStorage.setItem(STORAGE_CLIENT_SESSION_KEY, JSON.stringify(publicSession));

        await syncClientProfileFromCloud(publicSession.user);

        if (window.DesktopHeader && typeof window.DesktopHeader.renderAccount === 'function') {
            window.DesktopHeader.renderAccount();
        }
        return publicSession.user;
    }

    async function syncClientProfileFromCloud(userObj = null) {
        const user = userObj || getPublicUser();
        if (!user || !user.email) return null;

        const cleanEmail = user.email.trim().toLowerCase();
        let cloudProfile = null;

        try {
            const res = await fetch(`${WORKER_URL}/perfil-cliente?email=${encodeURIComponent(cleanEmail)}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.success && data.profile && typeof data.profile === 'object') {
                    cloudProfile = data.profile;
                }
            }
        } catch (e) {}

        const current = (window.UserDataManager && typeof window.UserDataManager.get === 'function')
            ? window.UserDataManager.get()
            : {};

        const currentEmail = (current.email || '').trim().toLowerCase();
        const isFreshLogin = !currentEmail || currentEmail !== cleanEmail;
        const isDifferentUser = Boolean(currentEmail && currentEmail !== cleanEmail);
        const locationFields = new Set(['zipCode', 'locality', 'province']);
        const syncFields = ['phone', 'address', 'zipCode', 'locality', 'province', 'deliveryNotes', 'razonSocial', 'cuit', 'dirFiscal', 'name'];
        const merged = { email: cleanEmail };

        if (cloudProfile) {
            syncFields.forEach((field) => {
                const cloudVal = (cloudProfile[field] !== undefined && cloudProfile[field] !== null) ? String(cloudProfile[field]).trim() : '';
                const rawLocalVal = (current[field] !== undefined && current[field] !== null) ? String(current[field]).trim() : '';
                const localVal = (isDifferentUser && !locationFields.has(field)) ? '' : rawLocalVal;
                merged[field] = isFreshLogin ? (cloudVal || localVal) : (localVal || cloudVal);
            });
            if (!merged.name && user.nombre) {
                merged.name = user.nombre;
            }
            const cloudAvatar = (cloudProfile.avatar || '').trim();
            const rawLocalAvatar = isDifferentUser ? '' : (current.avatar || '').trim();
            let resolvedAvatar = isFreshLogin ? (cloudAvatar || rawLocalAvatar) : (rawLocalAvatar || cloudAvatar);
            if (!resolvedAvatar || resolvedAvatar === '👤' || resolvedAvatar === 'face') {
                resolvedAvatar = user.picture || resolvedAvatar || '👤';
            }
            merged.avatar = resolvedAvatar;
        } else {
            if (isDifferentUser) {
                syncFields.forEach((field) => {
                    if (!locationFields.has(field)) {
                        merged[field] = '';
                    }
                });
            }
            const localName = isDifferentUser ? '' : (current.name || '').trim();
            if (!localName && user.nombre) {
                merged.name = user.nombre;
            }
            const curAvatar = isDifferentUser ? '' : (current.avatar || '').trim();
            if (!curAvatar || curAvatar === '👤' || curAvatar === 'face') {
                if (user.picture) {
                    merged.avatar = user.picture;
                } else if (!curAvatar) {
                    merged.avatar = '👤';
                }
            }
        }

        let savedProfile = merged;
        if (window.UserDataManager && typeof window.UserDataManager.save === 'function') {
            savedProfile = window.UserDataManager.save(merged) || merged;
        }
        if (typeof window.renderPerfilCarritoView === 'function') {
            window.renderPerfilCarritoView();
        }
        const userProfEl = document.getElementById('view-user-profile');
        if (userProfEl && userProfEl.classList.contains('active') && typeof window.renderUserProfileView === 'function') {
            window.renderUserProfileView();
        }
        return savedProfile;
    }

    async function saveClientProfileToCloud(profileObj) {
        const user = getPublicUser();
        if (!user || !user.email) {
            return { success: false, reason: 'not_authenticated' };
        }
        const cleanEmail = user.email.trim().toLowerCase();
        try {
            const res = await fetch(`${WORKER_URL}/perfil-cliente`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: cleanEmail,
                    profile: { ...(profileObj || {}), email: cleanEmail }
                })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                return data || { success: false, status: res.status };
            }
            return data || { success: true };
        } catch (e) {
            return { success: false, error: e.message || 'network_error' };
        }
    }

    async function logoutPublic() {
        const auth = getFirebaseAuth();
        if (auth) {
            try { await auth.signOut(); } catch (e) {}
        }
        clearSession();
        try { localStorage.removeItem(STORAGE_CLIENT_SESSION_KEY); } catch (e) {}

        // Limpiar datos de checkout preservando solo ubicación de envío si existía
        try {
            const rawChk = localStorage.getItem('latarima_checkout_user_data');
            if (rawChk) {
                const parsedChk = JSON.parse(rawChk);
                const preservedChk = {};
                if (parsedChk && parsedChk.cp) preservedChk.cp = parsedChk.cp;
                if (parsedChk && parsedChk.ciudad) preservedChk.ciudad = parsedChk.ciudad;
                if (parsedChk && parsedChk.provincia) preservedChk.provincia = parsedChk.provincia;
                if (Object.keys(preservedChk).length > 0) {
                    localStorage.setItem('latarima_checkout_user_data', JSON.stringify(preservedChk));
                } else {
                    localStorage.removeItem('latarima_checkout_user_data');
                }
            }
        } catch (e) {}

        // Limpiar datos personales conservando zipCode, locality y province
        if (window.UserDataManager && typeof window.UserDataManager.save === 'function') {
            window.UserDataManager.save({
                avatar: '👤',
                name: '',
                phone: '',
                email: '',
                address: '',
                deliveryNotes: '',
                razonSocial: '',
                cuit: '',
                dirFiscal: ''
            });
        }

        if (window.DesktopHeader && typeof window.DesktopHeader.renderAccount === 'function') {
            window.DesktopHeader.renderAccount();
        }
        if (typeof window.renderPerfilCarritoView === 'function') {
            window.renderPerfilCarritoView();
        }
        const userProfEl = document.getElementById('view-user-profile');
        if (userProfEl && userProfEl.classList.contains('active') && typeof window.renderUserProfileView === 'function') {
            window.renderUserProfileView();
        }
        const myOrdersEl = document.getElementById('view-my-orders');
        if (myOrdersEl && myOrdersEl.classList.contains('active') && window.MyOrders && typeof window.MyOrders.render === 'function') {
            window.MyOrders.render();
        }
    }

    // Exportar API Global
    window.AdminAuth = {
        isAuthenticated,
        getCurrentUser,
        getPublicUser,
        getSession,
        loginWithGooglePopup,
        loginPublicStoreWithGoogle,
        logout,
        logoutPublic,
        showLoginModal,
        renderHeaderUserBadge,
        getUsers: getStoredUsers,
        saveUsers: saveStoredUsers,
        registerClientUser,
        syncUsersFromCloud,
        syncClientProfileFromCloud,
        saveClientProfileToCloud,
        firebaseConfig: FIREBASE_CONFIG
    };

    document.addEventListener('DOMContentLoaded', () => {
        syncUsersFromCloud();
        initAuthListener();
        if (isAuthenticated()) {
            renderHeaderUserBadge();
        }
        if (getPublicUser()) {
            syncClientProfileFromCloud();
        }
    });
})();
