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
        if (!desktopBadge) return;
        try {
            const raw = localStorage.getItem('cartItems');
            const list = raw ? JSON.parse(raw) : [];
            const count = Array.isArray(list) ? list.length : 0;
            if (count > 0) {
                desktopBadge.textContent = count;
                desktopBadge.style.display = 'inline-flex';
            } else {
                desktopBadge.style.display = 'none';
            }
        } catch (e) {
            desktopBadge.style.display = 'none';
        }
    }

    function syncNotifBadge() {
        const mobileBadge = document.getElementById('header-nav-badge');
        const desktopBadge = document.getElementById('desktop-notif-badge');
        if (!mobileBadge || !desktopBadge) return;
        desktopBadge.style.display = (mobileBadge.style.display !== 'none') ? 'block' : 'none';
    }

    function renderLocation() {
        const locValEl = document.getElementById('desktop-location-value');
        if (!locValEl) return;
        try {
            const raw = localStorage.getItem('sessionShippingFullData');
            if (raw) {
                const data = JSON.parse(raw);
                if (data && data.cp) {
                    const city = data.localidad || data.provincia || '';
                    locValEl.textContent = city ? `CP ${data.cp} (${city})` : `CP ${data.cp}`;
                    return;
                }
            }
        } catch (e) {}
        locValEl.textContent = 'CP 1686 (Hurlingham)';
    }

    function openLocationModal() {
        const existing = document.getElementById('desktop-cp-modal');
        if (existing) existing.remove();

        let currentCp = '1686';
        try {
            const raw = localStorage.getItem('sessionShippingFullData');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.cp) currentCp = parsed.cp;
            }
        } catch (e) {}

        const overlay = document.createElement('div');
        overlay.id = 'desktop-cp-modal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;';
        overlay.innerHTML = `
            <div style="background:#fff;border-radius:16px;width:100%;max-width:380px;padding:1.5rem;box-shadow:0 20px 40px rgba(0,0,0,0.22);font-family:var(--font-main,'Outfit',sans-serif);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                    <h3 style="margin:0;font-size:1.05rem;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;">
                        <span class="material-symbols-outlined" style="color:var(--primary-color,#A0715B);">location_on</span>
                        Elegí dónde recibir tus compras
                    </h3>
                    <button type="button" id="close-desktop-cp-modal" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b;">&times;</button>
                </div>
                <p style="margin:0 0 1rem 0;font-size:0.84rem;color:#64748b;line-height:1.4;">
                    Ingresá tu Código Postal para recordar tu localidad y cotizar envíos más rápido.
                </p>
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

        document.getElementById('form-desktop-cp')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = (document.getElementById('input-desktop-cp')?.value || '').trim();
            const cleanCp = val.replace(/\D/g, '');
            const feedback = document.getElementById('desktop-cp-feedback');
            if (!cleanCp || cleanCp.length < 4) {
                if (feedback) {
                    feedback.textContent = 'Ingresá un Código Postal numérico válido (4 dígitos).';
                    feedback.style.display = 'block';
                }
                return;
            }

            let shippingObj = { cp: cleanCp, localidad: '', provincia: '' };
            if (typeof window.lookupPostalCode === 'function') {
                const res = window.lookupPostalCode(cleanCp);
                if (res && !res.error) {
                    shippingObj.localidad = res.localidad || res.partido || '';
                    shippingObj.provincia = res.provincia || '';
                }
            }
            try {
                const existingRaw = localStorage.getItem('sessionShippingFullData');
                const existingData = existingRaw ? JSON.parse(existingRaw) : {};
                localStorage.setItem('sessionShippingFullData', JSON.stringify({ ...existingData, ...shippingObj }));
            } catch (err) {}

            renderLocation();
            close();
        });
    }

    function renderCategoriesDropdown() {
        const dropdown = document.getElementById('desktop-categories-dropdown');
        if (!dropdown) return;

        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0)
            ? sessionProducts
            : (typeof productsData !== 'undefined' ? productsData : []);

        if (!sourceData || sourceData.length === 0) {
            dropdown.innerHTML = `<a href="#" class="desktop-cat-item desktop-cat-all" onclick="event.preventDefault(); window.navigateToView('view-categories');">Ver todas las categorías</a>`;
            return;
        }

        const sorted = [...sourceData]
            .filter(c => c && c.visible !== false && Array.isArray(c.products) && c.products.some(p => p.visible !== false))
            .sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'es', { sensitivity: 'base', numeric: true }));

        const itemsHtml = sorted.slice(0, 14).map(cat => {
            const count = cat.products.filter(p => p.visible !== false).length;
            const safeId = String(cat.id || '').replace(/"/g, '&quot;');
            return `
                <a href="#" class="desktop-cat-item" data-cat-id="${safeId}">
                    <span>${cat.name}</span>
                    <span class="desktop-cat-count">${count}</span>
                </a>
            `;
        }).join('');

        dropdown.innerHTML = `
            <div class="desktop-cat-grid">${itemsHtml}</div>
            <div class="desktop-cat-footer">
                <a href="#" class="desktop-cat-view-all" onclick="event.preventDefault(); if(window.navigateToView) window.navigateToView('view-categories');">
                    <span>Ver todas las categorías</span>
                    <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
                </a>
            </div>
        `;

        dropdown.querySelectorAll('.desktop-cat-item[data-cat-id]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const catId = link.getAttribute('data-cat-id');
                if (catId && window.navigateToCategoryFeed) {
                    window.navigateToCategoryFeed(catId);
                }
            });
        });
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
            <div class="desktop-user-menu-wrapper">
                <button type="button" class="desktop-user-trigger" id="desktop-user-trigger">
                    ${avatarHtml}
                    <span class="desktop-user-greeting">Hola, <strong>${firstName}</strong></span>
                    <span class="material-symbols-outlined" style="font-size: 16px;">expand_more</span>
                </button>
                <div class="desktop-user-dropdown">
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
                        <a href="#" onclick="event.preventDefault(); if(window.navigateToView) window.navigateToView('view-profile');">
                            <span class="material-symbols-outlined">shopping_cart</span> Mi Carrito y Datos
                        </a>
                        <a href="#" onclick="event.preventDefault(); if(window.navigateToView) window.navigateToView('view-my-orders');">
                            <span class="material-symbols-outlined">shopping_bag</span> Mis Compras / Pedidos
                        </a>
                        ${isStaff ? `
                            <a href="#" class="desktop-admin-shortcut" onclick="event.preventDefault(); if(window.navigateToView) window.navigateToView('view-admin');">
                                <span class="material-symbols-outlined">shield_person</span> Panel de Administración
                            </a>
                        ` : ''}
                        <a href="#" class="desktop-logout-link" onclick="event.preventDefault(); window.DesktopHeader.logout();">
                            <span class="material-symbols-outlined">logout</span> Cerrar sesión
                        </a>
                    </div>
                </div>
            </div>
        `;
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
        renderCategoriesDropdown();
        renderAccount();
        syncCartBadge();
        syncNotifBadge();

        document.getElementById('desktop-location-btn')?.addEventListener('click', openLocationModal);

        // Observar cambios de clase/estilo en el badge de notificaciones móvil para replicarlo en Desktop
        const mobileBadge = document.getElementById('header-nav-badge');
        if (mobileBadge && typeof MutationObserver !== 'undefined') {
            const obs = new MutationObserver(syncNotifBadge);
            obs.observe(mobileBadge, { attributes: true, attributeFilter: ['style'] });
        }

        // Reintentar poblar categorías si productsData carga diferido
        setTimeout(renderCategoriesDropdown, 900);
    }

    window.DesktopHeader = {
        syncActive,
        syncCartBadge,
        syncNotifBadge,
        renderLocation,
        renderCategoriesDropdown,
        renderAccount,
        triggerClientLogin,
        logout
    };

    document.addEventListener('DOMContentLoaded', init);
})();
