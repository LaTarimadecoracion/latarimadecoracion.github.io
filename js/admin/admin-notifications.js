/* =============================================================================
   js/admin/admin-notifications.js
   Módulo Admin: Configuración de Reglas Automáticas y Notificaciones Personalizadas
   ============================================================================= */

(function () {
    'use strict';

    const STYLE_PRESETS = {
        promo: { label: 'Promo / Oferta', icon: 'local_offer', accent: '#ea580c', bg: '#fff7ed', defaultBadge: 'Oferta' },
        new: { label: 'Nuevo Ingreso', icon: 'new_releases', accent: '#0f766e', bg: '#f0fdfa', defaultBadge: 'Nuevo' },
        price: { label: 'Rebaja / Cuotas', icon: 'trending_down', accent: '#7c3aed', bg: '#f5f3ff', defaultBadge: 'Promo' },
        alert: { label: 'Aviso Urgente', icon: 'bolt', accent: '#dc2626', bg: '#fef2f2', defaultBadge: 'Hoy' },
        brand: { label: 'Marca La Tarima', icon: 'campaign', accent: '#A0715B', bg: '#fdf8f6', defaultBadge: 'Aviso' }
    };

    const ASSOC_BOX_MAP = {
        product: 'notif-assoc-product-box',
        offer: 'notif-assoc-offer-box',
        view: 'notif-assoc-view-box',
        url: 'notif-assoc-url-box'
    };

    const VIEW_LABELS = {
        'view-home': 'Inicio',
        'view-catalogo': 'Catálogo Completo',
        'view-offers': 'Ofertas & Combos',
        'view-categories': 'Categorías',
        'view-cortes': 'Cortes de Madera a Medida',
        'view-my-orders': 'Mis Compras / Pedidos',
        'view-profile': 'Mi Carrito & Favoritos',
        'view-nosotros': 'Nosotros & Taller'
    };

    let draftConfig = null;
    let listenersBound = false;

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function cloneObj(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function getCenterApi() {
        return window.NotificationsCenter || null;
    }

    function ensureDraftConfig() {
        if (draftConfig) return draftConfig;
        const api = getCenterApi();
        if (api && typeof api.getNotificationsConfig === 'function') {
            draftConfig = cloneObj(api.getNotificationsConfig());
        } else {
            draftConfig = { rules: {}, customNotifications: [] };
        }
        return draftConfig;
    }

    function showStatusBanner(message, type = 'success') {
        const el = document.getElementById('admin-notif-status-banner');
        if (!el) return;
        const palette = type === 'error'
            ? { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' }
            : type === 'warning'
                ? { bg: '#fffbeb', border: '#fde68a', color: '#92400e' }
                : { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' };
        el.style.background = palette.bg;
        el.style.border = `1px solid ${palette.border}`;
        el.style.color = palette.color;
        el.textContent = message;
        el.style.display = 'block';
    }

    function applyDraftInMemory(saveLocalOverride = true) {
        const cfg = ensureDraftConfig();
        window.notificationsConfig = cloneObj(cfg);
        if (!window.siteConfig || typeof window.siteConfig !== 'object') window.siteConfig = {};
        window.siteConfig.notificationsConfig = cloneObj(cfg);
        if (saveLocalOverride) {
            try {
                const key = getCenterApi()?.CONFIG_OVERRIDE_KEY || 'latarima_notifications_config_override';
                localStorage.setItem(key, JSON.stringify(cfg));
            } catch (e) {}
        }
    }

    function getAllProductsList() {
        const source = (window.sessionProducts && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (typeof productsData !== 'undefined' && Array.isArray(productsData) ? productsData : []);
        const items = [];
        source.forEach(cat => {
            if (!cat || !Array.isArray(cat.products)) return;
            cat.products.forEach(p => {
                if (p && p.id && p.hidden !== true) {
                    const img = Array.isArray(p.image) ? p.image[0] : (p.image || '');
                    items.push({ id: String(p.id), title: p.title || p.id, catName: cat.name || '', image: img });
                }
            });
        });
        return items.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    }

    function getAllOffersList() {
        const source = (window.offersData && Array.isArray(window.offersData))
            ? window.offersData
            : (typeof offersData !== 'undefined' && Array.isArray(offersData) ? offersData : []);
        return source.filter(o => o && o.id).map(o => ({
            id: String(o.id),
            title: o.title || `Oferta ${o.id}`,
            active: o.active !== false,
            image: o.customCoverImage || (o.product_items && o.product_items[0] && o.product_items[0].image) || ''
        }));
    }

    function updateCounters() {
        const cfg = ensureDraftConfig();
        const defs = getCenterApi()?.getRuleDefinitions() || [];
        const enabledCount = defs.filter(d => !cfg.rules[d.key] || cfg.rules[d.key].enabled !== false).length;
        const rulesBadge = document.getElementById('admin-notif-rules-count');
        if (rulesBadge) rulesBadge.textContent = `${enabledCount}/${defs.length}`;

        const customList = Array.isArray(cfg.customNotifications) ? cfg.customNotifications : [];
        const activeCustom = customList.filter(c => c && c.active !== false).length;
        const customBadge = document.getElementById('admin-notif-custom-count');
        if (customBadge) customBadge.textContent = String(activeCustom);
    }

    function buildRuleCardHtml(def, ruleState) {
        const enabled = ruleState ? ruleState.enabled !== false : true;
        const title = ruleState && ruleState.title ? ruleState.title : def.defaultTitle;
        const cta = ruleState && ruleState.cta ? ruleState.cta : def.defaultCta;

        return `
            <div class="admin-notif-rule-card" data-rule-key="${escapeHtml(def.key)}" style="border: 1px solid ${enabled ? '#e2e8f0' : '#f1f5f9'}; background: ${enabled ? '#ffffff' : '#f8fafc'}; border-radius: 12px; padding: 0.85rem; opacity: ${enabled ? '1' : '0.72'}; transition: all 0.15s ease;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 0.65rem;">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                        <span style="width: 32px; height: 32px; border-radius: 9px; background: ${def.bg}; color: ${def.accent}; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">${escapeHtml(def.icon)}</span>
                        </span>
                        <div style="min-width: 0;">
                            <div style="font-size: 0.84rem; font-weight: 800; color: #0f172a;">${escapeHtml(def.label)}</div>
                            <div style="font-size: 0.72rem; color: #64748b;">${escapeHtml(def.targetHint)}</div>
                        </div>
                    </div>
                    <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; flex-shrink: 0; font-size: 0.76rem; font-weight: 800; color: ${enabled ? '#15803d' : '#64748b'};">
                        <input type="checkbox" class="notif-rule-toggle" data-rule-key="${escapeHtml(def.key)}" ${enabled ? 'checked' : ''} style="width: 17px; height: 17px; accent-color: var(--admin-accent); cursor: pointer;">
                        <span>${enabled ? 'Activa' : 'Pausada'}</span>
                    </label>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                        <label style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 2px;">Título corto</label>
                        <input type="text" class="premium-input notif-rule-title" data-rule-key="${escapeHtml(def.key)}" maxlength="42" value="${escapeHtml(title)}" style="width: 100%; padding: 0.4rem 0.6rem; font-size: 0.8rem; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 2px;">Frase corta / CTA</label>
                        <input type="text" class="premium-input notif-rule-cta" data-rule-key="${escapeHtml(def.key)}" maxlength="42" value="${escapeHtml(cta)}" style="width: 100%; padding: 0.4rem 0.6rem; font-size: 0.8rem; box-sizing: border-box;">
                    </div>
                </div>
            </div>
        `;
    }

    function renderRulesSection() {
        const cfg = ensureDraftConfig();
        const defs = getCenterApi()?.getRuleDefinitions() || [];
        const ordersContainer = document.getElementById('admin-notif-rules-orders');
        const catalogContainer = document.getElementById('admin-notif-rules-catalog');
        if (!ordersContainer || !catalogContainer) return;

        ordersContainer.innerHTML = defs
            .filter(d => d.group === 'orders')
            .map(d => buildRuleCardHtml(d, cfg.rules[d.key]))
            .join('');

        catalogContainer.innerHTML = defs
            .filter(d => d.group !== 'orders')
            .map(d => buildRuleCardHtml(d, cfg.rules[d.key]))
            .join('');

        updateCounters();
    }

    function populateProductSelect(filterText = '', selectedId = '') {
        const select = document.getElementById('notif-assoc-product-select');
        if (!select) return;
        const term = String(filterText || '').trim().toLowerCase();
        const all = getAllProductsList();
        const filtered = term
            ? all.filter(p => p.title.toLowerCase().includes(term) || p.catName.toLowerCase().includes(term))
            : all;

        if (filtered.length === 0) {
            select.innerHTML = '<option value="">Sin productos coincidentes</option>';
            return;
        }
        select.innerHTML = filtered
            .slice(0, 200)
            .map(p => `<option value="${escapeHtml(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.title)} (${escapeHtml(p.catName)})</option>`)
            .join('');
    }

    function populateOfferSelect(selectedId = '') {
        const select = document.getElementById('notif-assoc-offer-select');
        if (!select) return;
        const offers = getAllOffersList();
        if (offers.length === 0) {
            select.innerHTML = '<option value="">No hay ofertas cargadas</option>';
            return;
        }
        select.innerHTML = offers
            .map(o => `<option value="${escapeHtml(o.id)}" ${o.id === selectedId ? 'selected' : ''}>${escapeHtml(o.title)}${o.active ? '' : ' (Inactiva)'}</option>`)
            .join('');
    }

    function syncAssociationBoxes() {
        const type = document.getElementById('notif-custom-assoc-type')?.value || 'none';
        Object.entries(ASSOC_BOX_MAP).forEach(([key, boxId]) => {
            const box = document.getElementById(boxId);
            if (box) box.style.display = (key === type) ? 'block' : 'none';
        });
    }

    function readAssociationFromForm() {
        const type = document.getElementById('notif-custom-assoc-type')?.value || 'none';
        if (type === 'product') {
            const sel = document.getElementById('notif-assoc-product-select');
            const val = sel?.value || '';
            const prod = getAllProductsList().find(p => p.id === val);
            return {
                associationType: 'product',
                associationValue: val,
                associationLabel: prod ? prod.title : (sel?.options[sel.selectedIndex]?.textContent || 'Producto'),
                image: prod ? prod.image : ''
            };
        }
        if (type === 'offer') {
            const sel = document.getElementById('notif-assoc-offer-select');
            const val = sel?.value || '';
            const offer = getAllOffersList().find(o => o.id === val);
            return {
                associationType: 'offer',
                associationValue: val,
                associationLabel: offer ? offer.title : 'Oferta',
                image: offer ? offer.image : ''
            };
        }
        if (type === 'view') {
            const sel = document.getElementById('notif-assoc-view-select');
            const val = sel?.value || 'view-home';
            return {
                associationType: 'view',
                associationValue: val,
                associationLabel: VIEW_LABELS[val] || val,
                image: ''
            };
        }
        if (type === 'url') {
            const val = (document.getElementById('notif-assoc-url-input')?.value || '').trim();
            return {
                associationType: 'url',
                associationValue: val,
                associationLabel: val || 'Enlace externo',
                image: ''
            };
        }
        return { associationType: 'none', associationValue: '', associationLabel: 'Informativa', image: '' };
    }

    function detectStyleKey(item) {
        const match = Object.entries(STYLE_PRESETS).find(([, p]) => p.accent === item.accent && p.icon === item.icon);
        return match ? match[0] : 'brand';
    }

    function updateCustomFormPreview() {
        const titleInput = document.getElementById('notif-custom-title');
        const bodyInput = document.getElementById('notif-custom-body');
        const styleSelect = document.getElementById('notif-custom-style');
        const badgeInput = document.getElementById('notif-custom-badge');
        const previewEl = document.getElementById('admin-notif-live-preview');
        if (!titleInput || !bodyInput || !previewEl) return;

        const titleCounter = document.getElementById('notif-custom-title-count');
        const bodyCounter = document.getElementById('notif-custom-body-count');
        if (titleCounter) titleCounter.textContent = `${titleInput.value.length}/42`;
        if (bodyCounter) bodyCounter.textContent = `${bodyInput.value.length}/65`;

        const preset = STYLE_PRESETS[styleSelect?.value || 'promo'] || STYLE_PRESETS.promo;
        const assoc = readAssociationFromForm();
        const title = titleInput.value.trim() || '¡Novedad en La Tarima!';
        const body = bodyInput.value.trim() || 'Tocá para descubrirlo';
        const badge = badgeInput?.value.trim() || '';

        const thumbHtml = assoc.image
            ? `<div style="width:42px; height:42px; border-radius:10px; overflow:hidden; flex-shrink:0; background:#f8fafc; border:1px solid #e2e8f0;"><img src="${escapeHtml(assoc.image)}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;"></div>`
            : `<div style="width:42px; height:42px; border-radius:10px; flex-shrink:0; background:${preset.bg}; color:${preset.accent}; display:flex; align-items:center; justify-content:center;"><span class="material-symbols-outlined" style="font-size:20px;">${escapeHtml(preset.icon)}</span></div>`;

        previewEl.innerHTML = `
            <div style="display:flex; gap:10px; align-items:flex-start; padding:10px 12px; background:#f8fbff;">
                ${thumbHtml}
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:2px;">
                        <span style="font-size:0.8rem; font-weight:800; color:#0f172a; line-height:1.25;">${escapeHtml(title)}</span>
                        <span style="width:7px; height:7px; border-radius:50%; background:${preset.accent}; flex-shrink:0;"></span>
                    </div>
                    <div style="font-size:0.75rem; color:#475569; line-height:1.3;">${escapeHtml(body)}</div>
                    <div style="display:flex; align-items:center; gap:6px; margin-top:4px; flex-wrap:wrap;">
                        ${badge ? `<span style="font-size:0.65rem; font-weight:800; color:${preset.accent}; background:${preset.bg}; padding:1px 6px; border-radius:999px;">${escapeHtml(badge)}</span>` : ''}
                        <span style="font-size:0.68rem; color:#94a3b8;">Recién · ${escapeHtml(assoc.associationLabel)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function resetCustomForm() {
        document.getElementById('notif-custom-id').value = '';
        document.getElementById('notif-custom-title').value = '';
        document.getElementById('notif-custom-body').value = '';
        document.getElementById('notif-custom-style').value = 'promo';
        document.getElementById('notif-custom-badge').value = '';
        document.getElementById('notif-custom-assoc-type').value = 'none';
        document.getElementById('notif-custom-expires').value = '';
        document.getElementById('notif-custom-active').checked = true;
        document.getElementById('notif-assoc-url-input').value = '';
        document.getElementById('notif-assoc-product-filter').value = '';
        populateProductSelect('');
        populateOfferSelect('');
        syncAssociationBoxes();

        document.getElementById('admin-notif-form-heading').textContent = 'Nueva Notificación';
        document.getElementById('admin-notif-editing-badge').style.display = 'none';
        document.getElementById('admin-notif-custom-submit-label').textContent = 'Agregar Notificación';
        document.getElementById('admin-notif-custom-cancel-btn').style.display = 'none';
        updateCustomFormPreview();
    }

    function loadCustomItemToForm(item) {
        document.getElementById('notif-custom-id').value = item.id;
        document.getElementById('notif-custom-title').value = item.title || '';
        document.getElementById('notif-custom-body').value = item.body || '';
        document.getElementById('notif-custom-style').value = item.styleKey || detectStyleKey(item);
        document.getElementById('notif-custom-badge').value = item.badgeText || '';
        document.getElementById('notif-custom-assoc-type').value = item.associationType || 'none';
        document.getElementById('notif-custom-expires').value = item.expiresAt || '';
        document.getElementById('notif-custom-active').checked = item.active !== false;

        syncAssociationBoxes();
        if (item.associationType === 'product') {
            document.getElementById('notif-assoc-product-filter').value = '';
            populateProductSelect('', item.associationValue || '');
        } else if (item.associationType === 'offer') {
            populateOfferSelect(item.associationValue || '');
        } else if (item.associationType === 'view') {
            document.getElementById('notif-assoc-view-select').value = item.associationValue || 'view-home';
        } else if (item.associationType === 'url') {
            document.getElementById('notif-assoc-url-input').value = item.associationValue || '';
        }

        document.getElementById('admin-notif-form-heading').textContent = 'Editar Notificación';
        document.getElementById('admin-notif-editing-badge').style.display = 'inline-block';
        document.getElementById('admin-notif-custom-submit-label').textContent = 'Actualizar Notificación';
        document.getElementById('admin-notif-custom-cancel-btn').style.display = 'inline-flex';
        updateCustomFormPreview();
    }

    function submitCustomForm() {
        const cfg = ensureDraftConfig();
        const title = (document.getElementById('notif-custom-title')?.value || '').trim();
        const body = (document.getElementById('notif-custom-body')?.value || '').trim();
        if (!title) {
            showStatusBanner('Escribí un título corto para la notificación.', 'error');
            document.getElementById('notif-custom-title')?.focus();
            return;
        }

        const styleKey = document.getElementById('notif-custom-style')?.value || 'promo';
        const preset = STYLE_PRESETS[styleKey] || STYLE_PRESETS.promo;
        const badgeText = (document.getElementById('notif-custom-badge')?.value || '').trim();
        const expiresAt = (document.getElementById('notif-custom-expires')?.value || '').trim();
        const active = Boolean(document.getElementById('notif-custom-active')?.checked);
        const assoc = readAssociationFromForm();

        if (assoc.associationType === 'product' && !assoc.associationValue) {
            showStatusBanner('Seleccioná un producto para asociar la notificación.', 'error');
            return;
        }
        if (assoc.associationType === 'offer' && !assoc.associationValue) {
            showStatusBanner('Seleccioná una oferta para asociar la notificación.', 'error');
            return;
        }
        if (assoc.associationType === 'url' && !/^(https?:\/\/|mailto:|tel:|\?)/i.test(assoc.associationValue)) {
            showStatusBanner('Ingresá una URL válida que empiece con https:// o ?view=...', 'error');
            return;
        }

        const existingId = (document.getElementById('notif-custom-id')?.value || '').trim();
        const now = Date.now();
        if (!Array.isArray(cfg.customNotifications)) cfg.customNotifications = [];

        if (existingId) {
            const idx = cfg.customNotifications.findIndex(c => c.id === existingId);
            if (idx !== -1) {
                cfg.customNotifications[idx] = {
                    ...cfg.customNotifications[idx],
                    active,
                    title,
                    body,
                    styleKey,
                    badgeText,
                    icon: preset.icon,
                    accent: preset.accent,
                    bg: preset.bg,
                    image: assoc.image || '',
                    associationType: assoc.associationType,
                    associationValue: assoc.associationValue,
                    associationLabel: assoc.associationLabel,
                    expiresAt,
                    updatedAt: now
                };
            }
        } else {
            cfg.customNotifications.unshift({
                id: 'notif_' + now + '_' + Math.random().toString(36).slice(2, 6),
                active,
                title,
                body,
                styleKey,
                badgeText,
                icon: preset.icon,
                accent: preset.accent,
                bg: preset.bg,
                image: assoc.image || '',
                associationType: assoc.associationType,
                associationValue: assoc.associationValue,
                associationLabel: assoc.associationLabel,
                expiresAt,
                createdAt: now,
                updatedAt: now
            });
        }

        applyDraftInMemory(true);
        resetCustomForm();
        renderCustomList();
        showStatusBanner('Notificación lista en el borrador. Tocá "Guardar Configuración" para persistirla en el sitio.', 'success');
    }

    function isExpired(item) {
        if (!item || !item.expiresAt) return false;
        const ts = new Date(`${item.expiresAt}T23:59:59`).getTime();
        return !isNaN(ts) && ts < Date.now();
    }

    function renderCustomList() {
        const container = document.getElementById('admin-notif-custom-list');
        if (!container) return;
        const cfg = ensureDraftConfig();
        const list = Array.isArray(cfg.customNotifications) ? cfg.customNotifications : [];
        updateCounters();

        if (list.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: #64748b; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <span class="material-symbols-outlined" style="font-size: 36px; color: #94a3b8; display: block; margin-bottom: 6px;">notifications_off</span>
                    <div style="font-size: 0.86rem; font-weight: 700; color: #334155;">Todavía no creaste notificaciones personalizadas</div>
                    <div style="font-size: 0.78rem; margin-top: 4px;">Usá el formulario para lanzar avisos asociados a un producto, oferta o sección.</div>
                </div>
            `;
            return;
        }

        const assocPrefix = {
            product: 'Producto',
            offer: 'Oferta',
            view: 'Sección',
            url: 'Link',
            none: 'Informativa'
        };

        container.innerHTML = list.map(item => {
            const expired = isExpired(item);
            const isActive = item.active !== false && !expired;
            const statusPill = expired
                ? '<span style="font-size:0.68rem; font-weight:800; background:#fef2f2; color:#dc2626; padding:2px 7px; border-radius:999px;">Vencida</span>'
                : (isActive
                    ? '<span style="font-size:0.68rem; font-weight:800; background:#dcfce7; color:#15803d; padding:2px 7px; border-radius:999px;">Activa</span>'
                    : '<span style="font-size:0.68rem; font-weight:800; background:#f1f5f9; color:#64748b; padding:2px 7px; border-radius:999px;">Pausada</span>');

            const assocText = `${assocPrefix[item.associationType || 'none'] || 'Destino'}: ${item.associationLabel || item.associationValue || 'General'}`;

            return `
                <div class="admin-notif-custom-row" data-custom-id="${escapeHtml(item.id)}" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.85rem; background: ${isActive ? '#fff' : '#f8fafc'};">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: ${escapeHtml(item.bg || '#fdf8f6')}; color: ${escapeHtml(item.accent || '#A0715B')}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="material-symbols-outlined" style="font-size: 19px;">${escapeHtml(item.icon || 'campaign')}</span>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <strong style="font-size: 0.86rem; color: #0f172a;">${escapeHtml(item.title)}</strong>
                                ${statusPill}
                                ${item.badgeText ? `<span style="font-size:0.68rem; font-weight:800; color:${escapeHtml(item.accent || '#A0715B')}; background:${escapeHtml(item.bg || '#f8fafc')}; padding:2px 7px; border-radius:999px;">${escapeHtml(item.badgeText)}</span>` : ''}
                            </div>
                            ${item.body ? `<div style="font-size: 0.78rem; color: #475569; margin-top: 2px;">${escapeHtml(item.body)}</div>` : ''}
                            <div style="font-size: 0.72rem; color: #64748b; margin-top: 5px; display: flex; gap: 10px; flex-wrap: wrap;">
                                <span>🔗 ${escapeHtml(assocText)}</span>
                                ${item.expiresAt ? `<span>📅 Vence: ${escapeHtml(item.expiresAt)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 0.7rem; padding-top: 0.55rem; border-top: 1px solid #f1f5f9;">
                        <button type="button" class="admin-action-btn notif-custom-action" data-action="toggle" data-id="${escapeHtml(item.id)}">
                            <span class="material-symbols-outlined" style="font-size: 15px;">${item.active !== false ? 'pause_circle' : 'play_circle'}</span>
                            <span>${item.active !== false ? 'Pausar' : 'Activar'}</span>
                        </button>
                        <button type="button" class="admin-action-btn notif-custom-action" data-action="edit" data-id="${escapeHtml(item.id)}">
                            <span class="material-symbols-outlined" style="font-size: 15px;">edit</span>
                            <span>Editar</span>
                        </button>
                        <button type="button" class="admin-action-btn notif-custom-action" data-action="delete" data-id="${escapeHtml(item.id)}" style="color: #dc2626;">
                            <span class="material-symbols-outlined" style="font-size: 15px;">delete</span>
                            <span>Eliminar</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function switchNotifSubtab(tabKey) {
        document.querySelectorAll('.notif-admin-tab').forEach(btn => {
            const active = btn.getAttribute('data-notif-tab') === tabKey;
            btn.classList.toggle('active', active);
            btn.style.borderBottomColor = active ? 'var(--admin-accent)' : 'transparent';
            btn.style.color = active ? 'var(--admin-text-main)' : 'var(--admin-text-muted)';
            btn.style.fontWeight = active ? '800' : '700';
        });

        const rulesPanel = document.getElementById('admin-notif-panel-rules');
        const customPanel = document.getElementById('admin-notif-panel-custom');
        if (rulesPanel) rulesPanel.style.display = (tabKey === 'rules') ? 'block' : 'none';
        if (customPanel) customPanel.style.display = (tabKey === 'custom') ? 'block' : 'none';
    }

    async function saveConfigToServer() {
        const btn = document.getElementById('admin-notif-save-btn');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined spin">autorenew</span> Guardando...';
        }

        try {
            applyDraftInMemory(true);
            if (typeof window.syncSiteConfigWithServer === 'function') {
                await window.syncSiteConfigWithServer();
            }
            if (window.NotificationsCenter && typeof window.NotificationsCenter.scanAll === 'function') {
                await window.NotificationsCenter.scanAll();
            }
            showStatusBanner('¡Configuración de notificaciones guardada en site-config.js y aplicada en la campanita!', 'success');
        } catch (err) {
            if (window.NotificationsCenter && typeof window.NotificationsCenter.scanAll === 'function') {
                await window.NotificationsCenter.scanAll();
            }
            showStatusBanner('Guardado como vista previa local en este navegador (el servidor local /api/save-site-config no respondió).', 'warning');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
            }
        }
    }

    function bindEventsOnce() {
        if (listenersBound) return;
        listenersBound = true;

        const root = document.getElementById('admin-notifications-view');
        if (!root) return;

        root.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.notif-admin-tab');
            if (tabBtn) {
                switchNotifSubtab(tabBtn.getAttribute('data-notif-tab') || 'rules');
                return;
            }

            const actionBtn = e.target.closest('.notif-custom-action');
            if (actionBtn) {
                const cfg = ensureDraftConfig();
                const id = actionBtn.getAttribute('data-id');
                const action = actionBtn.getAttribute('data-action');
                const idx = (cfg.customNotifications || []).findIndex(c => c.id === id);
                if (idx === -1) return;

                if (action === 'toggle') {
                    cfg.customNotifications[idx].active = cfg.customNotifications[idx].active === false;
                    cfg.customNotifications[idx].updatedAt = Date.now();
                    applyDraftInMemory(true);
                    renderCustomList();
                } else if (action === 'edit') {
                    loadCustomItemToForm(cfg.customNotifications[idx]);
                } else if (action === 'delete') {
                    cfg.customNotifications.splice(idx, 1);
                    applyDraftInMemory(true);
                    renderCustomList();
                }
            }
        });

        root.addEventListener('change', (e) => {
            const cfg = ensureDraftConfig();
            if (e.target.classList.contains('notif-rule-toggle')) {
                const key = e.target.getAttribute('data-rule-key');
                if (!cfg.rules[key]) cfg.rules[key] = {};
                cfg.rules[key].enabled = e.target.checked;
                renderRulesSection();
                return;
            }
            if (e.target.id === 'notif-custom-assoc-type') {
                syncAssociationBoxes();
                updateCustomFormPreview();
                return;
            }
            if (['notif-custom-style', 'notif-assoc-product-select', 'notif-assoc-offer-select', 'notif-assoc-view-select'].includes(e.target.id)) {
                updateCustomFormPreview();
            }
        });

        root.addEventListener('input', (e) => {
            const cfg = ensureDraftConfig();
            if (e.target.classList.contains('notif-rule-title')) {
                const key = e.target.getAttribute('data-rule-key');
                if (!cfg.rules[key]) cfg.rules[key] = {};
                cfg.rules[key].title = e.target.value;
                return;
            }
            if (e.target.classList.contains('notif-rule-cta')) {
                const key = e.target.getAttribute('data-rule-key');
                if (!cfg.rules[key]) cfg.rules[key] = {};
                cfg.rules[key].cta = e.target.value;
                return;
            }
            if (e.target.id === 'notif-assoc-product-filter') {
                populateProductSelect(e.target.value);
                updateCustomFormPreview();
                return;
            }
            if (['notif-custom-title', 'notif-custom-body', 'notif-custom-badge', 'notif-assoc-url-input'].includes(e.target.id)) {
                updateCustomFormPreview();
            }
        });

        document.getElementById('admin-notif-save-btn')?.addEventListener('click', saveConfigToServer);
        document.getElementById('admin-notif-sync-preview-btn')?.addEventListener('click', async () => {
            applyDraftInMemory(true);
            if (window.NotificationsCenter?.scanAll) {
                await window.NotificationsCenter.scanAll();
            }
            showStatusBanner('Campanita actualizada con la configuración actual.', 'success');
        });
        document.getElementById('admin-notif-reset-rules-btn')?.addEventListener('click', () => {
            const cfg = ensureDraftConfig();
            const def = getCenterApi()?.getDefaultConfig();
            if (def && def.rules) {
                Object.keys(def.rules).forEach(k => {
                    const prevEnabled = cfg.rules[k] ? cfg.rules[k].enabled !== false : true;
                    cfg.rules[k] = { ...def.rules[k], enabled: prevEnabled };
                });
                renderRulesSection();
                showStatusBanner('Textos sugeridos restaurados (mantenidos tus encendidos/apagados).', 'success');
            }
        });
        document.getElementById('admin-notif-custom-submit-btn')?.addEventListener('click', submitCustomForm);
        document.getElementById('admin-notif-custom-cancel-btn')?.addEventListener('click', resetCustomForm);
    }

    window.renderNotificationsAdminTab = function () {
        draftConfig = null;
        ensureDraftConfig();
        bindEventsOnce();
        populateProductSelect(document.getElementById('notif-assoc-product-filter')?.value || '');
        populateOfferSelect('');
        renderRulesSection();
        renderCustomList();
        updateCustomFormPreview();
    };

    window.initNotificationsAdmin = function () {
        ensureDraftConfig();
        bindEventsOnce();
    };
})();
