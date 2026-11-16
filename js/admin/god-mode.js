/* =============================================================================
   js/admin/god-mode.js
   Modo Dios — Live Visual In-Place Editor
   La Tarima 2.0 - Arquitectura 100% aislada, no invasiva y segura
   ============================================================================= */

(function () {
    'use strict';

    // Estado Interno
    let isEnabled = false;
    const pendingChanges = new Map(); // key -> { key, type, id, field, section, originalValue, newValue, element }
    let domObserver = null;
    let hoverBadgeEl = null;
    let dockEl = null;
    let popoverEl = null;
    let currentPopoverTarget = null;
    let currentPopoverData = null;

    // =============================================================================
    // 1. Verificación de Permisos RBAC
    // =============================================================================
    function checkIsAdmin() {
        if (!window.AdminAuth || typeof window.AdminAuth.isAuthenticated !== 'function') {
            return false;
        }
        return Boolean(window.AdminAuth.isAuthenticated());
    }

    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
            return;
        }
        // Fallback a toast de admin si existe
        const adminToast = document.getElementById('admin-toast');
        if (adminToast) {
            adminToast.textContent = message;
            adminToast.className = `admin-toast show ${type}`;
            setTimeout(() => {
                adminToast.className = 'admin-toast';
            }, 3000);
            return;
        }
        console.log(`[Modo Dios] ${message}`);
    }

    // =============================================================================
    // 2. Construcción del Dock Flotante (#god-mode-dock)
    // =============================================================================
    function ensureDock() {
        if (dockEl && document.body.contains(dockEl)) return dockEl;

        const existing = document.getElementById('god-mode-dock');
        if (existing) {
            dockEl = existing;
            return dockEl;
        }

        dockEl = document.createElement('div');
        dockEl.id = 'god-mode-dock';
        dockEl.className = 'god-mode-dock';
        dockEl.setAttribute('role', 'region');
        dockEl.setAttribute('aria-label', 'Modo Dios Live Editor');

        dockEl.innerHTML = `
            <div class="god-dock-container">
                <!-- Izquierda: Estado e indicador -->
                <div class="god-dock-left">
                    <div class="god-dock-pill">
                        <span class="material-symbols-outlined god-dock-bolt">bolt</span>
                        <span class="god-dock-status">MODO DIOS</span>
                    </div>
                    <span class="god-dock-hint">Edición en vivo activa • Hacé clic en títulos, precios o textos</span>
                </div>

                <!-- Centro: Contador reactivo de cambios -->
                <div class="god-dock-center">
                    <div id="god-dock-counter" class="god-dock-counter">
                        <span class="god-counter-dot"></span>
                        <span id="god-counter-text" class="god-counter-text">0 cambios pendientes</span>
                    </div>
                </div>

                <!-- Derecha: Acciones -->
                <div class="god-dock-right">
                    <button type="button" id="god-btn-discard" class="god-dock-btn god-dock-btn-ghost" disabled title="Descartar todos los cambios no guardados">
                        <span class="material-symbols-outlined">restart_alt</span>
                        <span>Descartar</span>
                    </button>
                    <button type="button" id="god-btn-save" class="god-dock-btn god-dock-btn-save" disabled title="Guardar todos los cambios en disco y memoria">
                        <span class="material-symbols-outlined">save</span>
                        <span>Guardar Cambios</span>
                        <span id="god-save-badge" class="god-save-badge" style="display: none;">0</span>
                    </button>
                    <button type="button" id="god-btn-close" class="god-dock-btn god-dock-btn-close" title="Salir del Modo Dios">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dockEl);

        // Bind events
        document.getElementById('god-btn-save')?.addEventListener('click', () => {
            saveAllChanges();
        });

        document.getElementById('god-btn-discard')?.addEventListener('click', () => {
            if (confirm('¿Descartar todos los cambios pendientes sin guardar?')) {
                discardChanges();
            }
        });

        document.getElementById('god-btn-close')?.addEventListener('click', () => {
            disable();
        });

        return dockEl;
    }

    function updateDockCounter() {
        const count = pendingChanges.size;
        const counterEl = document.getElementById('god-dock-counter');
        const counterText = document.getElementById('god-counter-text');
        const btnSave = document.getElementById('god-btn-save');
        const btnDiscard = document.getElementById('god-btn-discard');
        const saveBadge = document.getElementById('god-save-badge');

        if (!counterEl || !counterText || !btnSave || !btnDiscard) return;

        if (count === 0) {
            counterEl.classList.remove('has-changes');
            counterText.textContent = '0 cambios pendientes';
            btnSave.disabled = true;
            btnDiscard.disabled = true;
            if (saveBadge) saveBadge.style.display = 'none';
        } else {
            counterEl.classList.add('has-changes');
            counterText.textContent = `${count} cambio${count > 1 ? 's' : ''} pendiente${count > 1 ? 's' : ''}`;
            btnSave.disabled = false;
            btnDiscard.disabled = false;
            if (saveBadge) {
                saveBadge.textContent = count;
                saveBadge.style.display = 'inline-flex';
            }
        }
    }

    // =============================================================================
    // 3. Badge Flotante "✎ Editar"
    // =============================================================================
    function ensureHoverBadge() {
        if (hoverBadgeEl && document.body.contains(hoverBadgeEl)) return hoverBadgeEl;

        const existing = document.getElementById('god-mode-hover-badge');
        if (existing) {
            hoverBadgeEl = existing;
            return hoverBadgeEl;
        }

        hoverBadgeEl = document.createElement('div');
        hoverBadgeEl.id = 'god-mode-hover-badge';
        hoverBadgeEl.className = 'god-mode-hover-badge';
        hoverBadgeEl.style.display = 'none';
        hoverBadgeEl.innerHTML = `
            <span class="material-symbols-outlined">edit</span>
            <span id="god-hover-badge-text">Editar</span>
        `;
        document.body.appendChild(hoverBadgeEl);
        return hoverBadgeEl;
    }

    function positionHoverBadge(targetEl) {
        if (!isEnabled || !targetEl || !hoverBadgeEl) return;
        const rect = targetEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            hoverBadgeEl.style.display = 'none';
            return;
        }

        const type = targetEl.dataset.godType || '';
        const badgeText = hoverBadgeEl.querySelector('#god-hover-badge-text');
        if (badgeText) {
            if (type === 'product-price') badgeText.textContent = 'Precio';
            else if (type === 'product-title') badgeText.textContent = 'Título';
            else if (type.startsWith('section-')) badgeText.textContent = 'Sección';
            else if (type === 'category-name') badgeText.textContent = 'Categoría';
            else badgeText.textContent = 'Editar';
        }

        hoverBadgeEl.style.display = 'inline-flex';
        const badgeWidth = hoverBadgeEl.offsetWidth || 70;
        const top = Math.max(10, rect.top - 24);
        const left = Math.min(window.innerWidth - badgeWidth - 10, Math.max(10, rect.right - badgeWidth));

        hoverBadgeEl.style.top = `${top}px`;
        hoverBadgeEl.style.left = `${left}px`;
        hoverBadgeEl.style.opacity = '1';
    }

    function hideHoverBadge() {
        if (hoverBadgeEl) {
            hoverBadgeEl.style.display = 'none';
            hoverBadgeEl.style.opacity = '0';
        }
    }

    // =============================================================================
    // 4. Popover Rápido de Precio (#god-price-popover)
    // =============================================================================
    function ensurePricePopover() {
        if (popoverEl && document.body.contains(popoverEl)) return popoverEl;

        const existing = document.getElementById('god-price-popover');
        if (existing) {
            popoverEl = existing;
            return popoverEl;
        }

        popoverEl = document.createElement('div');
        popoverEl.id = 'god-price-popover';
        popoverEl.className = 'god-popover';
        popoverEl.style.display = 'none';
        popoverEl.innerHTML = `
            <div class="god-popover-header">
                <span class="material-symbols-outlined" style="color: #c25e3e; font-size: 1.15rem;">payments</span>
                <span class="god-popover-title">Editar Precio</span>
                <button type="button" class="god-popover-close" id="god-popover-close" aria-label="Cerrar">&times;</button>
            </div>
            <div class="god-popover-body">
                <div class="god-popover-prod-name" id="god-popover-prod-name">Producto</div>
                <div class="god-price-input-row">
                    <span class="god-currency-symbol">$</span>
                    <input type="number" id="god-price-input" class="god-price-input" min="0" step="50" placeholder="0">
                </div>
                <div class="god-quick-adjust-row">
                    <button type="button" class="god-quick-btn" data-adjust="-10">-10%</button>
                    <button type="button" class="god-quick-btn" data-adjust="-5">-5%</button>
                    <button type="button" class="god-quick-btn" data-adjust="5">+5%</button>
                    <button type="button" class="god-quick-btn" data-adjust="10">+10%</button>
                </div>
            </div>
            <div class="god-popover-footer">
                <button type="button" class="god-popover-btn-cancel" id="god-popover-cancel">Cancelar</button>
                <button type="button" class="god-popover-btn-apply" id="god-popover-apply">Aplicar</button>
            </div>
        `;
        document.body.appendChild(popoverEl);

        // Bind popover actions
        document.getElementById('god-popover-close')?.addEventListener('click', closePricePopover);
        document.getElementById('god-popover-cancel')?.addEventListener('click', closePricePopover);

        document.getElementById('god-popover-apply')?.addEventListener('click', applyPricePopover);

        const input = document.getElementById('god-price-input');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyPricePopover();
                } else if (e.key === 'Escape') {
                    closePricePopover();
                }
            });
        }

        popoverEl.querySelectorAll('.god-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const pct = parseFloat(btn.dataset.adjust) || 0;
                const inp = document.getElementById('god-price-input');
                if (inp) {
                    let cur = parseFloat(inp.value) || 0;
                    cur = Math.round(cur * (1 + pct / 100));
                    inp.value = Math.max(0, cur);
                }
            });
        });

        // Cerrar si se hace clic fuera del popover
        document.addEventListener('mousedown', (e) => {
            if (popoverEl && popoverEl.style.display !== 'none') {
                if (!popoverEl.contains(e.target) && currentPopoverTarget && !currentPopoverTarget.contains(e.target)) {
                    closePricePopover();
                }
            }
        });

        return popoverEl;
    }

    function openPricePopover(targetEl) {
        if (!isEnabled || !targetEl) return;
        ensurePricePopover();

        currentPopoverTarget = targetEl;
        const prodId = targetEl.dataset.godId || '';
        const prod = findProductById(prodId);

        let currentPrice = 0;
        if (prod && typeof prod.price !== 'undefined') {
            currentPrice = Number(prod.price) || 0;
        } else {
            // Extraer del texto del elemento
            const cleanText = (targetEl.innerText || '').replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
            currentPrice = parseFloat(cleanText) || 0;
        }

        currentPopoverData = {
            productId: prodId,
            product: prod,
            originalPrice: currentPrice,
            element: targetEl
        };

        const prodNameEl = document.getElementById('god-popover-prod-name');
        if (prodNameEl) {
            prodNameEl.textContent = prod ? (prod.title || prod.name || prodId) : `ID: ${prodId}`;
        }

        const input = document.getElementById('god-price-input');
        if (input) {
            input.value = currentPrice;
            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);
        }

        // Posicionar popover
        const rect = targetEl.getBoundingClientRect();
        const popoverWidth = 290;
        const popoverHeight = 180;
        let top = rect.bottom + 8;
        let left = rect.left;

        if (top + popoverHeight > window.innerHeight) {
            top = Math.max(10, rect.top - popoverHeight - 8);
        }
        if (left + popoverWidth > window.innerWidth) {
            left = Math.max(10, window.innerWidth - popoverWidth - 16);
        }

        popoverEl.style.top = `${top}px`;
        popoverEl.style.left = `${left}px`;
        popoverEl.style.display = 'block';
    }

    function closePricePopover() {
        if (popoverEl) popoverEl.style.display = 'none';
        currentPopoverTarget = null;
        currentPopoverData = null;
    }

    function formatCurrencyNumber(val) {
        try {
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
        } catch (e) {
            return `$ ${val.toLocaleString('es-AR')}`;
        }
    }

    function applyPricePopover() {
        if (!currentPopoverData || !currentPopoverTarget) {
            closePricePopover();
            return;
        }

        const input = document.getElementById('god-price-input');
        if (!input) return;

        const newPrice = Math.max(0, parseFloat(input.value) || 0);
        const { productId, originalPrice, element } = currentPopoverData;
        const changeKey = `product_${productId}_price`;

        if (newPrice !== originalPrice) {
            pendingChanges.set(changeKey, {
                key: changeKey,
                type: 'product-price',
                id: productId,
                field: 'price',
                originalValue: originalPrice,
                newValue: newPrice,
                element: element
            });
            element.classList.add('god-element-modified');
        } else {
            pendingChanges.delete(changeKey);
            element.classList.remove('god-element-modified');
        }

        // Actualizar visualmente el precio en el DOM
        element.textContent = formatCurrencyNumber(newPrice);

        updateDockCounter();
        closePricePopover();
    }

    // =============================================================================
    // 5. Utilidades para Búsqueda y Mapeo de Datos
    // =============================================================================
    function getAllProducts() {
        const list = [];
        const seen = new Set();
        const sources = [];

        if (window.sessionProducts && Array.isArray(window.sessionProducts)) {
            sources.push(window.sessionProducts);
        }
        if (window.productsData && Array.isArray(window.productsData)) {
            sources.push(window.productsData);
        }

        sources.forEach(src => {
            src.forEach(cat => {
                if (cat && Array.isArray(cat.products)) {
                    cat.products.forEach(p => {
                        if (p && p.id && !seen.has(String(p.id))) {
                            seen.add(String(p.id));
                            list.push(p);
                        }
                    });
                }
            });
        });

        return list;
    }

    function findProductById(productId) {
        if (!productId) return null;
        const cleanId = String(productId).trim();
        const all = getAllProducts();
        return all.find(p => String(p.id).trim() === cleanId) || null;
    }

    function findProductByTitle(titleText) {
        if (!titleText) return null;
        const clean = titleText.trim().toLowerCase();
        if (!clean) return null;
        const all = getAllProducts();
        return all.find(p => (p.title || p.name || '').trim().toLowerCase() === clean) || null;
    }

    // =============================================================================
    // 6. Escaneo y Marcado Dinámico del DOM (data-god-type)
    // =============================================================================
    function markProductCard(card) {
        if (!card) return;

        // Buscar título del producto dentro de la tarjeta
        const titleEl = card.querySelector('.feed-card-title, h3, h2, .category-overlay span');
        const priceEl = card.querySelector('.feed-card-price-row, .feed-card-price, .product-price');

        // Extraer id si la tarjeta ya lo tiene
        let prodId = card.dataset.godProductId || card.dataset.productId || card.dataset.id;
        let product = null;

        if (prodId) {
            product = findProductById(prodId);
        }

        if (!product && titleEl) {
            const rawTitle = titleEl.innerText.trim();
            product = findProductByTitle(rawTitle);
            if (product) prodId = product.id;
        }

        if (product && prodId) {
            card.dataset.godProductId = prodId;

            if (titleEl && !titleEl.dataset.godType) {
                titleEl.dataset.godType = 'product-title';
                titleEl.dataset.godId = prodId;
                titleEl.dataset.godField = 'title';
                if (!titleEl.dataset.godOriginal) {
                    titleEl.dataset.godOriginal = titleEl.innerText.trim();
                }
                setupInlineEditable(titleEl);
            }

            if (priceEl && !priceEl.dataset.godType) {
                priceEl.dataset.godType = 'product-price';
                priceEl.dataset.godId = prodId;
                priceEl.dataset.godField = 'price';
                if (!priceEl.dataset.godOriginal) {
                    priceEl.dataset.godOriginal = (typeof product.price !== 'undefined') ? product.price : priceEl.innerText.trim();
                }
                setupPriceEditable(priceEl);
            }
        }
    }

    function markDetailView() {
        const detailView = document.getElementById('view-product-detail');
        if (!detailView) return;

        const titleEl = document.getElementById('detail-title');
        const priceEl = document.getElementById('detail-price-display');
        const descEl = document.getElementById('detail-description');

        let prodId = detailView.dataset.productId || '';
        let prod = findProductById(prodId);

        if (!prod && titleEl) {
            prod = findProductByTitle(titleEl.innerText.trim());
            if (prod) prodId = prod.id;
        }

        if (titleEl && !titleEl.dataset.godType) {
            titleEl.dataset.godType = 'product-title';
            titleEl.dataset.godId = prodId;
            titleEl.dataset.godField = 'title';
            if (!titleEl.dataset.godOriginal) titleEl.dataset.godOriginal = titleEl.innerText.trim();
            setupInlineEditable(titleEl);
        }

        if (priceEl && !priceEl.dataset.godType) {
            priceEl.dataset.godType = 'product-price';
            priceEl.dataset.godId = prodId;
            priceEl.dataset.godField = 'price';
            if (!priceEl.dataset.godOriginal && prod) priceEl.dataset.godOriginal = prod.price;
            setupPriceEditable(priceEl);
        }

        if (descEl && !descEl.dataset.godType) {
            descEl.dataset.godType = 'product-description';
            descEl.dataset.godId = prodId;
            descEl.dataset.godField = 'description';
            if (!descEl.dataset.godOriginal) descEl.dataset.godOriginal = descEl.innerText.trim();
            setupInlineEditable(descEl, true);
        }
    }

    function markSectionHeaders(root) {
        const headers = root.querySelectorAll('.section-header-premium, .home-section');
        headers.forEach(header => {
            const sectionEl = header.closest('.home-section') || header;
            let sectionId = '';
            sectionEl.classList.forEach(cls => {
                if (cls.startsWith('section-')) sectionId = cls.replace('section-', '');
            });

            const titleEl = header.querySelector('.section-title');
            const subtitleEl = header.querySelector('.section-subtitle');

            if (titleEl && !titleEl.dataset.godType) {
                titleEl.dataset.godType = 'section-title';
                titleEl.dataset.godSection = sectionId || 'general';
                titleEl.dataset.godField = 'title';
                if (!titleEl.dataset.godOriginal) titleEl.dataset.godOriginal = titleEl.innerText.trim();
                setupInlineEditable(titleEl);
            }

            if (subtitleEl && !subtitleEl.dataset.godType) {
                subtitleEl.dataset.godType = 'section-subtitle';
                subtitleEl.dataset.godSection = sectionId || 'general';
                subtitleEl.dataset.godField = 'subtitle';
                if (!subtitleEl.dataset.godOriginal) subtitleEl.dataset.godOriginal = subtitleEl.innerText.trim();
                setupInlineEditable(subtitleEl);
            }
        });
    }

    function markCategoryCards(root) {
        const catCarousel = root.querySelector('#carousel-categories');
        if (!catCarousel) return;

        const catCards = catCarousel.querySelectorAll('.category-card');
        catCards.forEach(card => {
            const textEl = card.querySelector('.category-overlay span');
            if (!textEl || textEl.dataset.godType) return;

            const catName = textEl.innerText.trim();
            let catId = '';
            if (window.sessionProducts && Array.isArray(window.sessionProducts)) {
                const found = window.sessionProducts.find(c => (c.name || '').trim().toLowerCase() === catName.toLowerCase());
                if (found) catId = found.id;
            }

            textEl.dataset.godType = 'category-name';
            textEl.dataset.godId = catId || catName;
            textEl.dataset.godField = 'name';
            if (!textEl.dataset.godOriginal) textEl.dataset.godOriginal = catName;
            setupInlineEditable(textEl);
        });
    }

    function markNosotrosAndAvisos(root) {
        // Nosotros Hero & Blocks
        const nosotrosTexts = root.querySelectorAll('.nosotros-hero-title, .nosotros-hero-desc, .nosotros-pillar-title, .nosotros-pillar-sub');
        nosotrosTexts.forEach(el => {
            if (el.dataset.godType) return;
            el.dataset.godType = 'nosotros-text';
            el.dataset.godField = el.className.split(' ')[0] || 'text';
            if (!el.dataset.godOriginal) el.dataset.godOriginal = el.innerText.trim();
            setupInlineEditable(el);
        });
    }

    function scanAndMark(root = document.body) {
        if (!isEnabled || !root) return;

        // 1. Tarjetas de producto en home, carruseles, catálogo y ofertas
        const cards = root.querySelectorAll('.feed-card, .category-card:not(#carousel-categories .category-card)');
        cards.forEach(markProductCard);

        // 2. Ficha de detalle de producto
        markDetailView();

        // 3. Cabeceras de sección del home
        markSectionHeaders(root);

        // 4. Tarjetas del carrusel de categorías
        markCategoryCards(root);

        // 5. Textos de vista Nosotros y Avisos
        markNosotrosAndAvisos(root);
    }

    // =============================================================================
    // 7. Configuración de Listeners en Elementos Editables
    // =============================================================================
    function setupInlineEditable(el, allowMultiline = false) {
        if (el._godBound) return;
        el._godBound = true;

        if (isEnabled) {
            el.contentEditable = 'true';
            el.spellcheck = false;
        }

        // Detener navegación si el elemento está dentro de un botón o enlace con click handler
        el.addEventListener('click', (e) => {
            if (!isEnabled) return;
            e.stopPropagation();
            e.preventDefault();
            el.focus();
        });

        // Hover badge
        el.addEventListener('mouseenter', () => {
            if (!isEnabled) return;
            positionHoverBadge(el);
        });

        el.addEventListener('mouseleave', () => {
            if (!isEnabled) return;
            hideHoverBadge();
        });

        el.addEventListener('focus', () => {
            if (!isEnabled) return;
            if (!el.dataset.godOriginal) {
                el.dataset.godOriginal = el.innerText.trim();
            }
            hideHoverBadge();
        });

        el.addEventListener('keydown', (e) => {
            if (!isEnabled) return;
            if (e.key === 'Enter' && !allowMultiline && !e.shiftKey) {
                e.preventDefault();
                el.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                // Restaurar valor original
                if (el.dataset.godOriginal) {
                    el.innerText = el.dataset.godOriginal;
                }
                el.blur();
            }
        });

        const handleInput = () => {
            if (!isEnabled) return;
            const original = el.dataset.godOriginal || '';
            const current = el.innerText.trim();
            const type = el.dataset.godType || 'text';
            const id = el.dataset.godId || el.dataset.godSection || '';
            const field = el.dataset.godField || '';
            const changeKey = `${type}_${id}_${field}`;

            if (current !== original) {
                pendingChanges.set(changeKey, {
                    key: changeKey,
                    type: type,
                    id: id,
                    field: field,
                    section: el.dataset.godSection || '',
                    originalValue: original,
                    newValue: current,
                    element: el
                });
                el.classList.add('god-element-modified');
            } else {
                pendingChanges.delete(changeKey);
                el.classList.remove('god-element-modified');
            }

            updateDockCounter();
        };

        el.addEventListener('input', handleInput);
        el.addEventListener('blur', handleInput);
    }

    function setupPriceEditable(el) {
        if (el._godPriceBound) return;
        el._godPriceBound = true;

        el.addEventListener('click', (e) => {
            if (!isEnabled) return;
            e.stopPropagation();
            e.preventDefault();
            openPricePopover(el);
        });

        el.addEventListener('mouseenter', () => {
            if (!isEnabled) return;
            positionHoverBadge(el);
        });

        el.addEventListener('mouseleave', () => {
            if (!isEnabled) return;
            hideHoverBadge();
        });
    }

    // =============================================================================
    // 8. Observer para Inyección Dinámica de Nodos (Infinite Scroll, Views)
    // =============================================================================
    function startDOMObserver() {
        if (domObserver) return;

        domObserver = new MutationObserver((mutations) => {
            if (!isEnabled) return;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // ELEMENT_NODE
                            if (node.id === 'god-mode-dock' || node.id === 'god-mode-hover-badge' || node.id === 'god-price-popover') {
                                return;
                            }
                            scanAndMark(node);
                        }
                    });
                }
            }
        });

        domObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function stopDOMObserver() {
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
    }

    // =============================================================================
    // 9. Métodos Principales del Modo Dios
    // =============================================================================

    /**
     * Activa el Modo Dios en toda la aplicación
     */
    function enable() {
        if (!checkIsAdmin()) {
            showToast('Acceso denegado: Se requieren permisos de Administrador.', 'warning');
            return false;
        }

        if (isEnabled) return true;
        isEnabled = true;

        document.body.classList.add('god-mode-active');

        // Renderizar o mostrar dock
        ensureDock();
        ensureHoverBadge();
        ensurePricePopover();

        // Marcar botón disparador en header
        const triggerBtn = document.getElementById('btn-god-mode-trigger');
        if (triggerBtn) triggerBtn.classList.add('is-active');

        // Escanear elementos existentes y configurar observer
        scanAndMark(document.body);
        startDOMObserver();

        // Actualizar contador inicial
        updateDockCounter();

        showToast('⚡ Modo Dios ACTIVADO. Hacé clic en cualquier texto o precio para editar.');
        try {
            window.dispatchEvent(new CustomEvent('latarima:god-mode-changed', { detail: { isEnabled: true } }));
        } catch (e) {}

        return true;
    }

    /**
     * Desactiva el Modo Dios y restaura la experiencia de usuario normal
     */
    function disable(force = false) {
        if (!isEnabled) return;

        if (!force && pendingChanges.size > 0) {
            const confirmed = confirm(`Tenés ${pendingChanges.size} cambio(s) sin guardar. ¿Deseás salir descartando los cambios?`);
            if (!confirmed) return;
            discardChanges();
        }

        isEnabled = false;
        document.body.classList.remove('god-mode-active');

        // Detener observer
        stopDOMObserver();

        // Cerrar popover y badge
        closePricePopover();
        hideHoverBadge();

        // Desactivar contentEditable en todos los elementos marcados
        document.querySelectorAll('[data-god-type]').forEach(el => {
            el.contentEditable = 'false';
        });

        // Actualizar botón de la cabecera
        const triggerBtn = document.getElementById('btn-god-mode-trigger');
        if (triggerBtn) triggerBtn.classList.remove('is-active');

        showToast('Modo Dios DESACTIVADO.');
        try {
            window.dispatchEvent(new CustomEvent('latarima:god-mode-changed', { detail: { isEnabled: false } }));
        } catch (e) {}
    }

    /**
     * Alterna encendido / apagado
     */
    function toggle() {
        if (isEnabled) {
            disable();
        } else {
            enable();
        }
    }

    /**
     * Guarda todos los cambios pendientes en memoria, localStorage y backend
     */
    async function saveAllChanges() {
        if (pendingChanges.size === 0) {
            showToast('No hay cambios pendientes de guardar.');
            return;
        }

        const btnSave = document.getElementById('god-btn-save');
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<span class="material-symbols-outlined spin">sync</span><span>Guardando...</span>';
        }

        const modifiedElements = [];
        let hasProductChanges = false;
        let hasSiteConfigChanges = false;

        try {
            // 1. Aplicar cambios a las estructuras de datos maestras
            pendingChanges.forEach((change) => {
                const { type, id, field, section, newValue, element } = change;
                if (element) modifiedElements.push(element);

                // --- CAMBIOS EN PRODUCTOS ---
                if (type === 'product-title' || type === 'product-price' || type === 'product-description') {
                    hasProductChanges = true;
                    const cleanProdId = String(id).trim();

                    const updateList = (arr) => {
                        if (!Array.isArray(arr)) return;
                        arr.forEach(cat => {
                            if (cat && Array.isArray(cat.products)) {
                                cat.products.forEach(p => {
                                    if (p && String(p.id).trim() === cleanProdId) {
                                        if (field === 'title') p.title = newValue;
                                        else if (field === 'price') p.price = parseFloat(newValue) || 0;
                                        else if (field === 'description') p.description = newValue;
                                    }
                                });
                            }
                        });
                    };

                    if (window.sessionProducts) updateList(window.sessionProducts);
                    if (window.productsData) updateList(window.productsData);
                }

                // --- CAMBIOS EN SECCIONES DE LA HOME ---
                else if (type === 'section-title' || type === 'section-subtitle') {
                    hasSiteConfigChanges = true;
                    const secId = section || id;
                    if (window.homeConfig && window.homeConfig.sections && window.homeConfig.sections[secId]) {
                        window.homeConfig.sections[secId][field] = newValue;
                    }
                    if (window.siteConfig && window.siteConfig.homeConfig && window.siteConfig.homeConfig.sections && window.siteConfig.homeConfig.sections[secId]) {
                        window.siteConfig.homeConfig.sections[secId][field] = newValue;
                    }
                }

                // --- CAMBIOS EN CATEGORÍAS ---
                else if (type === 'category-name') {
                    hasProductChanges = true;
                    if (window.sessionProducts && Array.isArray(window.sessionProducts)) {
                        const targetCat = window.sessionProducts.find(c => c.id === id);
                        if (targetCat) targetCat.name = newValue;
                    }
                }

                // --- CAMBIOS EN NOSOTROS / AVISOS ---
                else if (type === 'nosotros-text' || type === 'aviso-text') {
                    hasSiteConfigChanges = true;
                }
            });

            // 2. Persistencia en LocalStorage como respaldo inmediato local
            if (hasProductChanges && window.sessionProducts) {
                try {
                    localStorage.setItem('sessionProducts', JSON.stringify(window.sessionProducts));
                } catch (e) {}
            }

            if (hasSiteConfigChanges) {
                try {
                    if (window.siteConfig) localStorage.setItem('siteConfig', JSON.stringify(window.siteConfig));
                    if (window.homeConfig) localStorage.setItem('homeConfig', JSON.stringify(window.homeConfig));
                } catch (e) {}
            }

            // 3. Persistencia en Servidor / Disco Físico (Endpoints API)
            const networkPromises = [];

            if (hasProductChanges && window.sessionProducts) {
                networkPromises.push(
                    fetch('/api/save-products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(window.sessionProducts)
                    }).catch(err => {
                        console.warn('[Modo Dios] Servidor local /api/save-products no disponible o estático:', err.message);
                    })
                );
            }

            if (hasSiteConfigChanges && (window.siteConfig || window.homeConfig)) {
                const configPayload = window.siteConfig || { homeConfig: window.homeConfig };
                networkPromises.push(
                    fetch('/api/save-site-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(configPayload)
                    }).catch(err => {
                        console.warn('[Modo Dios] Servidor local /api/save-site-config no disponible o estático:', err.message);
                    })
                );
            }

            if (networkPromises.length > 0) {
                await Promise.all(networkPromises);
            }

            // 4. Efecto visual de confirmación en los elementos guardados
            modifiedElements.forEach(el => {
                el.classList.remove('god-element-modified');
                el.classList.add('god-saved-pulse');
                // Actualizar nuevo valor como base original
                el.dataset.godOriginal = el.innerText.trim();
                setTimeout(() => {
                    el.classList.remove('god-saved-pulse');
                }, 1300);
            });

            // 5. Limpiar cambios pendientes y resetear estado
            pendingChanges.clear();
            updateDockCounter();

            showToast('🎉 ¡Todos los cambios fueron guardados exitosamente!');
        } catch (err) {
            console.error('[Modo Dios] Error al guardar cambios:', err);
            showToast('⚠️ Ocurrió un error al guardar. Revisa la consola.', 'error');
        } finally {
            if (btnSave) {
                btnSave.disabled = pendingChanges.size === 0;
                btnSave.innerHTML = `
                    <span class="material-symbols-outlined">save</span>
                    <span>Guardar Cambios</span>
                    <span id="god-save-badge" class="god-save-badge" style="display: none;">0</span>
                `;
            }
        }
    }

    /**
     * Descarta todos los cambios pendientes y restaura el texto original
     */
    function discardChanges() {
        if (pendingChanges.size === 0) return;

        pendingChanges.forEach((change) => {
            const { originalValue, element, type } = change;
            if (element) {
                if (type === 'product-price') {
                    const numVal = parseFloat(originalValue) || 0;
                    element.textContent = formatCurrencyNumber(numVal);
                } else {
                    element.innerText = originalValue;
                }
                element.classList.remove('god-element-modified');
                element.dataset.godOriginal = originalValue;
            }
        });

        pendingChanges.clear();
        updateDockCounter();
        closePricePopover();
        showToast('🔄 Cambios pendientes descartados.');
    }

    // =============================================================================
    // 10. Inicialización Segura y Exportación Global
    // =============================================================================
    window.GodMode = {
        enable,
        disable,
        toggle,
        saveAllChanges,
        discardChanges,
        isEnabled: () => isEnabled,
        getPendingCount: () => pendingChanges.size,
        scan: () => scanAndMark(document.body)
    };

    // Escuchar cambios de autenticación
    window.addEventListener('latarima:auth-changed', (e) => {
        const isAuth = Boolean(e?.detail?.isAuthenticated);
        if (!isAuth && isEnabled) {
            disable(true);
        }
    });

    // Escuchar scroll para ocultar badge flotante
    window.addEventListener('scroll', () => {
        if (isEnabled && hoverBadgeEl && hoverBadgeEl.style.display !== 'none') {
            hideHoverBadge();
        }
    }, { passive: true });

    console.log('[Modo Dios] Módulo Live Visual In-Place Editor inicializado.');
})();
