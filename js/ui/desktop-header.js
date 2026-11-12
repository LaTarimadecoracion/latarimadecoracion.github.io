/* =============================================================================
   js/ui/desktop-header.js
   Lógica de la Cabecera de Escritorio estilo Mercado Libre (>= 900px)
   100% aislada del modo móvil.
   ============================================================================= */

(function () {
    function syncActive(viewId) {
        const links = document.querySelectorAll('.desktop-nav-link[data-target], .desktop-account-link[data-target]');
        links.forEach(link => {
            if (link.getAttribute('data-target') === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    function syncCartBadge() {
        const desktopBadge = document.getElementById('desktop-cart-badge');
        const menuCartBadge = document.getElementById('desktop-menu-cart-badge');
        try {
            const raw = localStorage.getItem('cartItems');
            const list = raw ? JSON.parse(raw) : [];
            const count = Array.isArray(list) ? list.length : 0;
            if (desktopBadge) {
                if (count > 0) {
                    desktopBadge.textContent = count;
                    desktopBadge.style.display = 'inline-flex';
                } else {
                    desktopBadge.style.display = 'none';
                }
            }
            if (menuCartBadge) {
                if (count > 0) {
                    menuCartBadge.textContent = count;
                    menuCartBadge.style.display = 'inline-flex';
                } else {
                    menuCartBadge.style.display = 'none';
                }
            }
        } catch (e) {
            if (desktopBadge) desktopBadge.style.display = 'none';
            if (menuCartBadge) menuCartBadge.style.display = 'none';
        }
    }

    function syncNotifBadge() {
        const mobileBadge = document.getElementById('header-nav-badge');
        const desktopBadge = document.getElementById('desktop-notif-badge');
        const menuNotifDot = document.getElementById('desktop-menu-notif-badge');
        if (!mobileBadge) return;
        const hasUnread = mobileBadge.style.display !== 'none';
        if (desktopBadge) desktopBadge.style.display = hasUnread ? 'block' : 'none';
        if (menuNotifDot) menuNotifDot.style.display = hasUnread ? 'block' : 'none';
    }

    const WORKER_URL = 'https://super-shadow-4ad9.latarimadecoracion.workers.dev';
    const GEO_META_KEY = 'latarima_geo_meta';
    let cpListenerAttached = false;

    function saveDetectedLocation(cp, localidad = '', provincia = '', isAuto = false) {
        try {
            const cleanCp = (cp || '').toString().replace(/\D/g, '').slice(0, 4);
            let finalCity = localidad || '';
            let finalProv = provincia || '';

            if (cleanCp && typeof window.lookupPostalCode === 'function') {
                const res = window.lookupPostalCode(cleanCp);
                if (res && !res.error) {
                    if (!finalCity) finalCity = res.localidad || res.partido || '';
                    if (!finalProv) finalProv = res.provincia || '';
                }
            }

            if (cleanCp || finalCity || finalProv) {
                if (window.UserDataManager && typeof window.UserDataManager.get === 'function' && typeof window.UserDataManager.save === 'function') {
                    const existing = window.UserDataManager.get() || {};
                    window.UserDataManager.save({
                        zipCode: cleanCp || existing.zipCode || '',
                        locality: finalCity || existing.locality || '',
                        province: finalProv || existing.province || ''
                    });
                } else {
                    const uRaw = localStorage.getItem('userData');
                    const existing = uRaw ? JSON.parse(uRaw) : {};
                    const updated = {
                        ...existing,
                        zipCode: cleanCp || existing.zipCode || '',
                        locality: finalCity || existing.locality || '',
                        province: finalProv || existing.province || ''
                    };
                    localStorage.setItem('userData', JSON.stringify(updated));
                    if (updated.zipCode) {
                        localStorage.setItem('user_offers_cp', updated.zipCode);
                    }
                }

                localStorage.setItem(GEO_META_KEY, JSON.stringify({
                    geoSource: isAuto ? 'auto' : 'manual',
                    ipCity: finalCity || ''
                }));
            }
        } catch (err) {}
        renderLocation();
    }

    function renderLocation() {
        const locValEl = document.getElementById('desktop-location-value');
        if (!locValEl) return;
        try {
            let data = {};
            if (window.UserDataManager && typeof window.UserDataManager.get === 'function') {
                data = window.UserDataManager.get() || {};
            } else {
                const raw = localStorage.getItem('userData');
                data = raw ? JSON.parse(raw) : {};
            }
            const zip = (data.zipCode || '').trim();
            let locality = (data.locality || '').trim();

            if (!zip && !locality) {
                try {
                    const metaRaw = localStorage.getItem(GEO_META_KEY);
                    if (metaRaw) {
                        const meta = JSON.parse(metaRaw);
                        if (meta && meta.ipCity) locality = String(meta.ipCity).trim();
                    }
                } catch (e) {}
            }

            if (zip && locality) {
                locValEl.textContent = `CP ${zip} (${locality})`;
                return;
            }
            if (zip) {
                locValEl.textContent = `CP ${zip}`;
                return;
            }
            if (locality) {
                locValEl.textContent = locality;
                return;
            }
        } catch (e) {}
        locValEl.textContent = 'Detectando...';
    }

    async function detectViaBrowserGPS(interactiveFeedback = null) {
        if (!('geolocation' in navigator)) {
            if (interactiveFeedback) {
                interactiveFeedback.textContent = 'Tu navegador no soporta geolocalización. Ingresá tu CP manualmente.';
                interactiveFeedback.style.display = 'block';
            }
            return false;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=16&addressdetails=1`, {
                            headers: { 'Accept-Language': 'es' }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            const addr = (data && data.address) || {};
                            const rawPost = addr.postcode || '';
                            const cleanCp = rawPost.replace(/\D/g, '').slice(0, 4);
                            const city = addr.city || addr.town || addr.suburb || addr.municipality || addr.village || addr.state_district || '';
                            const state = addr.state || '';
                            if (cleanCp || city) {
                                saveDetectedLocation(cleanCp, city, state, true);
                                resolve(true);
                                return;
                            }
                        }
                    } catch (err) {
                        console.warn('[Geo] Error consultando Nominatim:', err);
                    }
                    if (interactiveFeedback) {
                        interactiveFeedback.textContent = 'No pudimos obtener el código postal exacto. Ingresalo abajo.';
                        interactiveFeedback.style.display = 'block';
                    }
                    resolve(false);
                },
                (err) => {
                    if (interactiveFeedback) {
                        interactiveFeedback.textContent = err.code === 1
                            ? 'Permiso de ubicación denegado. Podés ingresar tu CP manualmente.'
                            : 'No pudimos detectar tu GPS. Ingresá tu CP manualmente.';
                        interactiveFeedback.style.display = 'block';
                    }
                    resolve(false);
                },
                { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
            );
        });
    }

    async function autoDetectLocation() {
        // Si ya tenemos ubicación guardada con CP, no molestamos al usuario
        try {
            const existingZip = (window.UserDataManager && typeof window.UserDataManager.get === 'function')
                ? (window.UserDataManager.get().zipCode || '').trim()
                : (JSON.parse(localStorage.getItem('userData') || '{}').zipCode || '').trim();
            if (existingZip) {
                renderLocation();
                return;
            }
        } catch (e) {}

        let ipCity = '';
        let ipRegion = '';
        let ipCp = '';

        // 1. Intentar detección silenciosa por IP vía Cloudflare Worker (/geo)
        try {
            const res = await fetch(`${WORKER_URL}/geo`);
            if (res.ok) {
                const g = await res.json();
                if (g && g.success) {
                    ipCity = g.city || '';
                    ipRegion = g.region || '';
                    ipCp = (g.postalCode || '').replace(/\D/g, '').slice(0, 4);
                }
            }
        } catch (e) {}

        // Fallback silencioso IP público si el Worker aún no tiene /geo
        if (!ipCity && !ipCp) {
            try {
                const resIp = await fetch('https://ipapi.co/json/');
                if (resIp.ok) {
                    const g = await resIp.json();
                    if (g && !g.error) {
                        ipCity = g.city || '';
                        ipRegion = g.region || '';
                        ipCp = (g.postal || '').replace(/\D/g, '').slice(0, 4);
                    }
                }
            } catch (e) {}
        }

        if (ipCp && ipCity) {
            saveDetectedLocation(ipCp, ipCity, ipRegion, true);
            return;
        }

        if (ipCity) {
            saveDetectedLocation('', ipCity, ipRegion, true);
        }

        // 2. Si faltó el CP exacto y no preguntamos todavía en esta sesión, pedir permiso GPS amablemente
        const alreadyPrompted = sessionStorage.getItem('lt_geo_prompted');
        if (!alreadyPrompted && 'geolocation' in navigator) {
            sessionStorage.setItem('lt_geo_prompted', '1');
            const ok = await detectViaBrowserGPS(null);
            if (ok) return;
        }

        // Si ni IP ni GPS resolvieron, mostrar invitación limpia a ingresar CP
        const locValEl = document.getElementById('desktop-location-value');
        if (locValEl && (!locValEl.textContent || locValEl.textContent === 'Detectando...')) {
            locValEl.textContent = ipCity || 'Ingresá tu CP';
        }
    }

    function openLocationModal() {
        const existing = document.getElementById('desktop-cp-modal');
        if (existing) existing.remove();

        let currentCp = '';
        try {
            if (window.UserDataManager && typeof window.UserDataManager.getZipCode === 'function') {
                currentCp = window.UserDataManager.getZipCode();
            } else {
                const raw = localStorage.getItem('userData');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.zipCode) currentCp = String(parsed.zipCode).trim();
                }
            }
        } catch (e) {}

        const overlay = document.createElement('div');
        overlay.id = 'desktop-cp-modal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;';
        overlay.innerHTML = `
            <div style="background:#fff;border-radius:16px;width:100%;max-width:400px;padding:1.5rem;box-shadow:0 20px 40px rgba(0,0,0,0.22);font-family:var(--font-main,'Outfit',sans-serif);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                    <h3 style="margin:0;font-size:1.05rem;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;">
                        <span class="material-symbols-outlined" style="color:var(--primary-color,#A0715B);">location_on</span>
                        Elegí dónde recibir tus compras
                    </h3>
                    <button type="button" id="close-desktop-cp-modal" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b;">&times;</button>
                </div>
                <p style="margin:0 0 1rem 0;font-size:0.84rem;color:#64748b;line-height:1.45;">
                    Detectá tu ubicación automáticamente o ingresá tu Código Postal para ver los costos de envío reales.
                </p>
                <button type="button" id="btn-desktop-detect-gps" style="width:100%;margin-bottom:1rem;background:#f8fafc;color:#0f172a;border:1.5px solid #cbd5e1;border-radius:10px;padding:0.65rem 1rem;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.15s;">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary-color,#A0715B);">my_location</span>
                    <span id="lbl-detect-gps">Detectar mi ubicación exacta (GPS)</span>
                </button>
                <div style="font-size:0.74rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:6px;text-align:center;">o ingresá tu Código Postal</div>
                <form id="form-desktop-cp" style="display:flex;gap:8px;">
                    <input type="text" id="input-desktop-cp" value="${currentCp}" placeholder="Ej: 1686 o 1425" maxlength="8" required style="flex:1;padding:0.65rem 0.85rem;border:1.5px solid #cbd5e1;border-radius:10px;font-size:0.95rem;font-weight:600;outline:none;">
                    <button type="submit" style="background:var(--primary-color,#A0715B);color:#fff;border:none;border-radius:10px;padding:0 1.15rem;font-weight:700;cursor:pointer;">Guardar</button>
                </form>
                <div id="desktop-cp-feedback" style="margin-top:0.65rem;font-size:0.8rem;color:#dc2626;display:none;"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.getElementById('close-desktop-cp-modal')?.addEventListener('click', close);

        if (window.ensurePostalLookupLoaded) {
            window.ensurePostalLookupLoaded();
        }

        const feedback = document.getElementById('desktop-cp-feedback');
        document.getElementById('btn-desktop-detect-gps')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-desktop-detect-gps');
            const lbl = document.getElementById('lbl-detect-gps');
            if (feedback) feedback.style.display = 'none';
            if (btn) btn.disabled = true;
            if (lbl) lbl.textContent = 'Obteniendo ubicación...';
            const ok = await detectViaBrowserGPS(feedback);
            if (btn) btn.disabled = false;
            if (lbl) lbl.textContent = 'Detectar mi ubicación exacta (GPS)';
            if (ok) close();
        });

        document.getElementById('form-desktop-cp')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = (document.getElementById('input-desktop-cp')?.value || '').trim();
            const cleanCp = val.replace(/\D/g, '');
            if (!cleanCp || cleanCp.length < 4) {
                if (feedback) {
                    feedback.textContent = 'Ingresá un Código Postal numérico válido (4 dígitos).';
                    feedback.style.display = 'block';
                }
                return;
            }
            saveDetectedLocation(cleanCp, '', '', false);
            close();
        });
    }

    function closeUserMenu() {
        const wrapper = document.getElementById('desktop-user-menu-wrapper');
        const btn = document.getElementById('desktop-user-trigger');
        if (wrapper) wrapper.classList.remove('open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function toggleUserMenu(forceState) {
        const wrapper = document.getElementById('desktop-user-menu-wrapper');
        const btn = document.getElementById('desktop-user-trigger');
        if (!wrapper) return;
        const shouldOpen = typeof forceState === 'boolean'
            ? forceState
            : !wrapper.classList.contains('open');
        wrapper.classList.toggle('open', shouldOpen);
        if (btn) btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }

    function navigateFromMenu(viewId) {
        closeUserMenu();
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
        if (window.navigateToView) {
            window.navigationHistory = [];
            window.navigateToView(viewId);
        }
    }

    function renderAccount() {
        const container = document.getElementById('desktop-account-area');
        if (!container) return;

        const user = (window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function')
            ? window.AdminAuth.getPublicUser()
            : null;

        if (!user) {
            container.innerHTML = `
                <a href="#" class="desktop-account-link" onclick="event.preventDefault(); window.DesktopHeader.triggerClientLogin();">Creá tu cuenta</a>
                <a href="#" class="desktop-account-link desktop-account-login" onclick="event.preventDefault(); window.DesktopHeader.triggerClientLogin();">Ingresá</a>
            `;
            return;
        }

        const firstName = (user.nombre || 'Usuario').split(' ')[0];
        const initial = firstName.charAt(0).toUpperCase();
        const isStaff = user.role === 'superadmin' || user.role === 'colaborador';
        const avatarHtml = user.picture
            ? `<img src="${user.picture}" alt="${firstName}" class="desktop-user-avatar-img" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=\\'desktop-user-avatar-initial\\'>${initial}</span>'">`
            : `<span class="desktop-user-avatar-initial">${initial}</span>`;

        const dropdownAvatarHtml = user.picture
            ? `<img src="${user.picture}" alt="${firstName}" referrerpolicy="no-referrer" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1.5px solid #e2e8f0;" onerror="this.style.display='none'">`
            : `<span style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color, #A0715B); color: #fff; font-weight: 800; font-size: 1rem; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">${initial}</span>`;

        const roleBadgeText = user.role === 'superadmin'
            ? 'SuperAdmin'
            : (user.role === 'colaborador' ? 'Equipo Taller' : (user.clientTier === 'mayorista' ? 'Mayorista VIP' : 'Cliente'));

        container.innerHTML = `
            <div class="desktop-user-menu-wrapper" id="desktop-user-menu-wrapper">
                <button type="button" class="desktop-user-trigger" id="desktop-user-trigger" aria-haspopup="true" aria-expanded="false">
                    ${avatarHtml}
                    <span class="desktop-user-greeting">Hola, <strong>${firstName}</strong></span>
                    <span class="material-symbols-outlined" style="font-size: 16px;">expand_more</span>
                </button>
                <div class="desktop-user-dropdown" id="desktop-user-dropdown" role="menu">
                    <div class="desktop-user-dropdown-header" style="display: flex; align-items: center; gap: 10px;">
                        ${dropdownAvatarHtml}
                        <div style="min-width: 0;">
                            <div style="font-weight: 800; font-size: 0.88rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.nombre}</div>
                            <div style="font-size: 0.72rem; color: #64748b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.email}</div>
                            <span style="display: inline-block; margin-top: 5px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 50px; background: ${isStaff ? '#fee2e2' : '#dcfce7'}; color: ${isStaff ? '#dc2626' : '#16a34a'};">
                                ${roleBadgeText}
                            </span>
                        </div>
                    </div>
                    <div class="desktop-user-dropdown-links">
                        <a href="#" role="menuitem" onclick="event.preventDefault(); window.DesktopHeader.navigateFromMenu('view-user-profile');">
                            <span class="material-symbols-outlined">account_circle</span> Mi Perfil
                        </a>
                        <a href="#" role="menuitem" onclick="event.preventDefault(); window.DesktopHeader.navigateFromMenu('view-notifications');">
                            <span class="material-symbols-outlined">notifications</span> Notificaciones
                            <span class="desktop-menu-notif-dot" id="desktop-menu-notif-badge" style="display: none;"></span>
                        </a>
                        <a href="#" role="menuitem" onclick="event.preventDefault(); window.DesktopHeader.navigateFromMenu('view-my-orders');">
                            <span class="material-symbols-outlined">shopping_bag</span> Mis compras / Pedidos
                        </a>
                        <a href="#" role="menuitem" onclick="event.preventDefault(); window.DesktopHeader.navigateFromMenu('view-profile');">
                            <span class="material-symbols-outlined">shopping_cart</span> Mi Carrito
                            <span class="desktop-menu-item-badge" id="desktop-menu-cart-badge" style="display: none;">0</span>
                        </a>
                        <a href="#" role="menuitem" onclick="event.preventDefault(); window.DesktopHeader.navigateFromMenu('view-profile');">
                            <span class="material-symbols-outlined">favorite</span> Favoritos
                        </a>
                        ${isStaff ? `
                            <a href="#" role="menuitem" class="desktop-admin-shortcut" onclick="event.preventDefault(); window.DesktopHeader.navigateFromMenu('view-admin');">
                                <span class="material-symbols-outlined">shield_person</span> Panel de Administración
                            </a>
                        ` : ''}
                        <a href="#" role="menuitem" class="desktop-logout-link" onclick="event.preventDefault(); window.DesktopHeader.closeUserMenu(); window.DesktopHeader.logout();">
                            <span class="material-symbols-outlined">logout</span> Cerrar sesión
                        </a>
                    </div>
                </div>
            </div>
        `;

        const triggerBtn = document.getElementById('desktop-user-trigger');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleUserMenu();
            });
        }

        syncCartBadge();
        syncNotifBadge();
    }

    async function triggerClientLogin() {
        if (!window.AdminAuth || typeof window.AdminAuth.loginPublicStoreWithGoogle !== 'function') {
            alert('Cargando servicio de autenticación, intentá nuevamente en un segundo.');
            return;
        }
        try {
            const user = await window.AdminAuth.loginPublicStoreWithGoogle();
            renderAccount();
            const myOrdersEl = document.getElementById('view-my-orders');
            if (myOrdersEl && myOrdersEl.classList.contains('active') && window.MyOrders) {
                window.MyOrders.render();
            }
            if (window.showToast) {
                window.showToast(`¡Bienvenido/a, ${user.nombre}!`);
            }
        } catch (err) {
            if (err && err.code !== 'auth/popup-closed-by-user') {
                alert(err.message || 'No se pudo completar el inicio de sesión con Google.');
            }
        }
    }

    async function logout() {
        if (window.AdminAuth && typeof window.AdminAuth.logoutPublic === 'function') {
            await window.AdminAuth.logoutPublic();
        }
        renderAccount();
        const myOrdersEl = document.getElementById('view-my-orders');
        if (myOrdersEl && myOrdersEl.classList.contains('active') && window.MyOrders) {
            window.MyOrders.render();
        }
    }

    function init() {
        renderLocation();
        renderAccount();
        syncCartBadge();
        syncNotifBadge();

        if (window.innerWidth >= 900) {
            autoDetectLocation();
        }

        if (!cpListenerAttached) {
            cpListenerAttached = true;
            window.addEventListener('latarima:cp-updated', renderLocation);
        }

        document.getElementById('desktop-location-btn')?.addEventListener('click', openLocationModal);

        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('desktop-user-menu-wrapper');
            if (wrapper && wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                closeUserMenu();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeUserMenu();
            }
        });

        // Observar cambios de clase/estilo en el badge de notificaciones móvil para replicarlo en Desktop
        const mobileBadge = document.getElementById('header-nav-badge');
        if (mobileBadge && typeof MutationObserver !== 'undefined') {
            const obs = new MutationObserver(syncNotifBadge);
            obs.observe(mobileBadge, { attributes: true, attributeFilter: ['style'] });
        }
    }

    window.DesktopHeader = {
        syncActive,
        syncCartBadge,
        syncNotifBadge,
        renderLocation,
        openLocationModal,
        renderAccount,
        toggleUserMenu,
        closeUserMenu,
        navigateFromMenu,
        triggerClientLogin,
        logout
    };

    document.addEventListener('DOMContentLoaded', init);
})();
