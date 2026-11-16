/* =============================================================================
   js/admin/god-mode.js
   Modo Dios — Live Visual In-Place Editor
   La Tarima 2.0 - Arquitectura 100% aislada, no invasiva y segura
   Soporte completo: Títulos, Precios, Descripciones, Fotos, Características y Variantes
   ============================================================================= */

(function () {
    'use strict';

    // Estado Interno
    let isEnabled = false;
    const pendingChanges = new Map(); // key -> { key, type, id, field, section, originalValue, newValue, element, ... }
    let domObserver = null;
    let hoverBadgeEl = null;
    let dockEl = null;
    let pricePopoverEl = null;
    let currentPopoverTarget = null;
    let currentPopoverData = null;

    let photoModalEl = null;
    let currentPhotoData = null;

    let variantsModalEl = null;
    let currentVariantsData = null;

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
                    <span class="god-dock-hint">Edición total activa • Hacé clic en títulos, fotos, specs o variantes</span>
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
            else if (type === 'product-image') badgeText.textContent = 'Foto';
            else if (type === 'product-spec-title') badgeText.textContent = 'Título Spec';
            else if (type === 'product-spec-val') badgeText.textContent = 'Valor Spec';
            else if (type === 'variant-acabado-name') badgeText.textContent = 'Acabado';
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
        if (pricePopoverEl && document.body.contains(pricePopoverEl)) return pricePopoverEl;

        const existing = document.getElementById('god-price-popover');
        if (existing) {
            pricePopoverEl = existing;
            return pricePopoverEl;
        }

        pricePopoverEl = document.createElement('div');
        pricePopoverEl.id = 'god-price-popover';
        pricePopoverEl.className = 'god-popover';
        pricePopoverEl.style.display = 'none';
        pricePopoverEl.innerHTML = `
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
        document.body.appendChild(pricePopoverEl);

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

        pricePopoverEl.querySelectorAll('.god-quick-btn').forEach(btn => {
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

        document.addEventListener('mousedown', (e) => {
            if (pricePopoverEl && pricePopoverEl.style.display !== 'none') {
                if (!pricePopoverEl.contains(e.target) && currentPopoverTarget && !currentPopoverTarget.contains(e.target)) {
                    closePricePopover();
                }
            }
        });

        return pricePopoverEl;
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

        pricePopoverEl.style.top = `${top}px`;
        pricePopoverEl.style.left = `${left}px`;
        pricePopoverEl.style.display = 'block';
    }

    function closePricePopover() {
        if (pricePopoverEl) pricePopoverEl.style.display = 'none';
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

        element.textContent = formatCurrencyNumber(newPrice);
        updateDockCounter();
        closePricePopover();
    }

    // =============================================================================
    // 5. Modal de Cambio de Foto (#god-photo-modal)
    // =============================================================================
    function ensurePhotoModal() {
        if (photoModalEl && document.body.contains(photoModalEl)) return photoModalEl;

        const existing = document.getElementById('god-photo-modal');
        if (existing) {
            photoModalEl = existing;
            return photoModalEl;
        }

        photoModalEl = document.createElement('div');
        photoModalEl.id = 'god-photo-modal';
        photoModalEl.className = 'god-modal-overlay';
        photoModalEl.style.display = 'none';
        photoModalEl.innerHTML = `
            <div class="god-modal-card god-photo-modal-card" role="dialog" aria-modal="true" aria-labelledby="god-photo-modal-title">
                <div class="god-modal-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="color: #c25e3e; font-size: 1.35rem;">add_a_photo</span>
                        <h3 id="god-photo-modal-title" class="god-modal-title">Cambiar Foto del Producto</h3>
                    </div>
                    <button type="button" class="god-modal-close" id="god-photo-close" aria-label="Cerrar">&times;</button>
                </div>
                <div class="god-modal-body">
                    <div id="god-photo-prod-info" class="god-modal-prod-info"></div>

                    <!-- Vista previa -->
                    <div class="god-photo-preview-wrap">
                        <img id="god-photo-preview" src="" alt="Vista previa">
                        <div id="god-photo-upload-loading" class="god-upload-loading" style="display: none;">
                            <span class="material-symbols-outlined spin">sync</span>
                            <span>Subiendo imagen...</span>
                        </div>
                    </div>

                    <!-- Opción 1: Archivo local -->
                    <div class="god-form-group">
                        <label class="god-label">Subir imagen desde tu equipo o celular:</label>
                        <label class="god-file-dropzone" for="god-photo-file-input">
                            <input type="file" id="god-photo-file-input" accept="image/*" style="display: none;">
                            <span class="material-symbols-outlined god-drop-icon">cloud_upload</span>
                            <span class="god-drop-text">Hacé clic o arrastrá una imagen aquí</span>
                            <span class="god-drop-sub">Formatos recomendados: WebP, JPG, PNG</span>
                        </label>
                    </div>

                    <!-- Opción 2: URL directa -->
                    <div class="god-form-group">
                        <label class="god-label" for="god-photo-url-input">O pegar URL / ruta de imagen:</label>
                        <input type="text" id="god-photo-url-input" class="god-input-text" placeholder="img/productos/... o https://...">
                    </div>
                </div>
                <div class="god-modal-footer">
                    <button type="button" class="god-btn-cancel" id="god-photo-cancel">Cancelar</button>
                    <button type="button" class="god-btn-primary" id="god-photo-apply">
                        <span class="material-symbols-outlined" style="font-size: 17px;">check</span>
                        <span>Aplicar Foto</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(photoModalEl);

        // Bind events
        document.getElementById('god-photo-close')?.addEventListener('click', closePhotoModal);
        document.getElementById('god-photo-cancel')?.addEventListener('click', closePhotoModal);
        document.getElementById('god-photo-apply')?.addEventListener('click', applyPhotoModal);

        // File upload handler
        const fileInput = document.getElementById('god-photo-file-input');
        fileInput?.addEventListener('change', handlePhotoFileSelected);

        const urlInput = document.getElementById('god-photo-url-input');
        urlInput?.addEventListener('input', (e) => {
            const preview = document.getElementById('god-photo-preview');
            if (preview && e.target.value.trim()) {
                preview.src = e.target.value.trim();
            }
        });

        // Close on background click
        photoModalEl.addEventListener('click', (e) => {
            if (e.target === photoModalEl) closePhotoModal();
        });

        return photoModalEl;
    }

    function openPhotoModal(options) {
        if (!isEnabled || !options) return;
        ensurePhotoModal();

        const { productId, groupIndex, slideIndex, currentUrl, imgElement, productTitle } = options;
        const prod = findProductById(productId);

        currentPhotoData = {
            productId: productId,
            product: prod,
            groupIndex: typeof groupIndex !== 'undefined' ? groupIndex : 0,
            slideIndex: typeof slideIndex !== 'undefined' ? slideIndex : 0,
            originalUrl: currentUrl || (prod ? prod.image : ''),
            currentUrl: currentUrl || (prod ? prod.image : ''),
            imgElement: imgElement,
            uploadedUrl: null
        };

        const infoEl = document.getElementById('god-photo-prod-info');
        if (infoEl) {
            const title = productTitle || (prod ? (prod.title || prod.name) : `ID: ${productId}`);
            infoEl.textContent = `${title} (Slide: ${(currentPhotoData.slideIndex || 0) + 1})`;
        }

        const preview = document.getElementById('god-photo-preview');
        if (preview) {
            preview.src = currentPhotoData.originalUrl || '';
        }

        const urlInput = document.getElementById('god-photo-url-input');
        if (urlInput) {
            urlInput.value = currentPhotoData.originalUrl || '';
        }

        const fileInput = document.getElementById('god-photo-file-input');
        if (fileInput) fileInput.value = '';

        const loader = document.getElementById('god-photo-upload-loading');
        if (loader) loader.style.display = 'none';

        photoModalEl.style.display = 'flex';
    }

    function closePhotoModal() {
        if (photoModalEl) photoModalEl.style.display = 'none';
        currentPhotoData = null;
    }

    async function handlePhotoFileSelected(e) {
        const file = e.target.files?.[0];
        if (!file || !currentPhotoData) return;

        const preview = document.getElementById('god-photo-preview');
        const loader = document.getElementById('god-photo-upload-loading');
        const urlInput = document.getElementById('god-photo-url-input');

        // Mostrar preview local inmediato
        const objectUrl = URL.createObjectURL(file);
        if (preview) preview.src = objectUrl;

        if (loader) loader.style.display = 'flex';

        try {
            const fd = new FormData();
            fd.append('image', file);
            const category = currentPhotoData.product?.category || 'productos';
            fd.append('category', category);

            const res = await fetch('/api/upload-image', {
                method: 'POST',
                body: fd
            });

            if (res.ok) {
                const data = await res.json();
                if (data && (data.url || data.imagePath)) {
                    const finalPath = data.url || data.imagePath;
                    currentPhotoData.uploadedUrl = finalPath;
                    if (urlInput) urlInput.value = finalPath;
                    if (preview) preview.src = finalPath;
                    showToast('📸 Foto subida al servidor con éxito.');
                }
            } else {
                throw new Error('Servidor retornó código ' + res.status);
            }
        } catch (err) {
            console.warn('[Modo Dios] Upload falló o en modo estático, usando Base64 DataURL fallback:', err);
            const reader = new FileReader();
            reader.onload = (re) => {
                const b64 = re.target.result;
                currentPhotoData.uploadedUrl = b64;
                if (urlInput) urlInput.value = b64;
                if (preview) preview.src = b64;
                showToast('Foto cargada en memoria local.');
            };
            reader.readAsDataURL(file);
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    function applyPhotoModal() {
        if (!currentPhotoData) return;

        const urlInput = document.getElementById('god-photo-url-input');
        const finalUrl = (urlInput?.value || currentPhotoData.uploadedUrl || '').trim();

        if (!finalUrl) {
            showToast('Por favor seleccioná o ingresá una imagen.', 'warning');
            return;
        }

        const { productId, groupIndex, slideIndex, originalUrl, imgElement } = currentPhotoData;
        const changeKey = `product_${productId}_image_${groupIndex}_${slideIndex}`;

        // 1. Actualizar elemento de imagen en pantalla
        if (imgElement) {
            imgElement.src = finalUrl;
            imgElement.classList.add('god-element-modified');
        }

        // 2. Actualizar en memoria inmediata del producto activo
        const prod = findProductById(productId);
        if (prod) {
            if (prod.acabados_groups && prod.acabados_groups[groupIndex]) {
                const grp = prod.acabados_groups[groupIndex];
                if (Array.isArray(grp.images_list) && grp.images_list.length > slideIndex) {
                    grp.images_list[slideIndex] = finalUrl;
                } else {
                    grp.images_list = [finalUrl];
                }
                if (slideIndex === 0) {
                    grp.cover_image = finalUrl;
                    prod.image = finalUrl;
                }
            } else {
                prod.image = finalUrl;
            }
        }

        // 3. Registrar en pendingChanges
        if (finalUrl !== originalUrl) {
            pendingChanges.set(changeKey, {
                key: changeKey,
                type: 'product-image',
                id: productId,
                groupIndex: groupIndex,
                slideIndex: slideIndex,
                originalValue: originalUrl,
                newValue: finalUrl,
                element: imgElement
            });
        } else {
            pendingChanges.delete(changeKey);
            if (imgElement) imgElement.classList.remove('god-element-modified');
        }

        updateDockCounter();
        closePhotoModal();
        showToast('📸 Foto actualizada en vista. Hacé clic en "Guardar Cambios" para confirmar.');
    }

    function setupImageEditable(imgEl) {
        if (imgEl._godImgBound) return;
        imgEl._godImgBound = true;

        imgEl.addEventListener('click', (e) => {
            if (!isEnabled) return;
            e.stopPropagation();
            e.preventDefault();

            const prodId = imgEl.dataset.godId || '';
            const sIdx = parseInt(imgEl.dataset.slideIndex || '0', 10);
            const gIdx = parseInt(imgEl.dataset.groupIndex || '0', 10);

            openPhotoModal({
                productId: prodId,
                groupIndex: gIdx,
                slideIndex: sIdx,
                currentUrl: imgEl.src,
                imgElement: imgEl
            });
        });

        imgEl.addEventListener('mouseenter', () => {
            if (!isEnabled) return;
            positionHoverBadge(imgEl);
        });

        imgEl.addEventListener('mouseleave', () => {
            if (!isEnabled) return;
            hideHoverBadge();
        });
    }

    // =============================================================================
    // 6. Modal de Variantes (#god-variants-modal)
    // =============================================================================
    function ensureVariantsModal() {
        if (variantsModalEl && document.body.contains(variantsModalEl)) return variantsModalEl;

        const existing = document.getElementById('god-variants-modal');
        if (existing) {
            variantsModalEl = existing;
            return variantsModalEl;
        }

        variantsModalEl = document.createElement('div');
        variantsModalEl.id = 'god-variants-modal';
        variantsModalEl.className = 'god-modal-overlay';
        variantsModalEl.style.display = 'none';
        variantsModalEl.innerHTML = `
            <div class="god-modal-card god-variants-modal-card" role="dialog" aria-modal="true" aria-labelledby="god-variants-modal-title">
                <div class="god-modal-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="color: #c25e3e; font-size: 1.35rem;">tune</span>
                        <h3 id="god-variants-modal-title" class="god-modal-title">Editar y Renombrar Variantes</h3>
                    </div>
                    <button type="button" class="god-modal-close" id="god-variants-close" aria-label="Cerrar">&times;</button>
                </div>
                <div class="god-modal-body">
                    <div id="god-variants-prod-info" class="god-modal-prod-info"></div>
                    <p class="god-help-text">Modificá los nombres de las medidas, ajustá sus precios o agregá nuevas opciones para los clientes:</p>

                    <!-- Lista de variantes -->
                    <div id="god-variants-rows-container" class="god-variants-rows-container"></div>

                    <button type="button" id="god-btn-add-variant-row" class="god-btn-secondary" style="margin-top: 12px;">
                        <span class="material-symbols-outlined">add_circle</span>
                        <span>Agregar Otra Variante</span>
                    </button>
                </div>
                <div class="god-modal-footer">
                    <button type="button" class="god-btn-cancel" id="god-variants-cancel">Cancelar</button>
                    <button type="button" class="god-btn-primary" id="god-variants-apply">
                        <span class="material-symbols-outlined" style="font-size: 17px;">check</span>
                        <span>Aplicar Variantes</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(variantsModalEl);

        // Bind events
        document.getElementById('god-variants-close')?.addEventListener('click', closeVariantsModal);
        document.getElementById('god-variants-cancel')?.addEventListener('click', closeVariantsModal);
        document.getElementById('god-variants-apply')?.addEventListener('click', applyVariantsModal);

        document.getElementById('god-btn-add-variant-row')?.addEventListener('click', () => {
            addVariantRowToModal({ medida: 'Nueva Variante', price: 0, espesor: '', default: false });
        });

        variantsModalEl.addEventListener('click', (e) => {
            if (e.target === variantsModalEl) closeVariantsModal();
        });

        return variantsModalEl;
    }

    function addVariantRowToModal(v = {}) {
        const container = document.getElementById('god-variants-rows-container');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'god-variant-row-item';
        row.innerHTML = `
            <div class="god-var-col-name">
                <label class="god-var-sublabel">Nombre / Medida:</label>
                <input type="text" class="god-input-text god-var-name" value="${v.medida || ''}" placeholder="Ej: 60x40 cm">
            </div>
            <div class="god-var-col-price">
                <label class="god-var-sublabel">Precio ($):</label>
                <input type="number" class="god-input-text god-var-price" value="${v.price || 0}" min="0" step="50">
            </div>
            <div class="god-var-col-espesor">
                <label class="god-var-sublabel">Espesor / Detalle:</label>
                <input type="text" class="god-input-text god-var-espesor" value="${v.espesor || ''}" placeholder="Ej: 18 mm">
            </div>
            <div class="god-var-col-actions">
                <button type="button" class="god-var-del-btn" title="Eliminar variante">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;

        row.querySelector('.god-var-del-btn')?.addEventListener('click', () => {
            const allRows = container.querySelectorAll('.god-variant-row-item');
            if (allRows.length <= 1) {
                showToast('El producto debe tener al menos una variante activa.', 'warning');
                return;
            }
            row.remove();
        });

        container.appendChild(row);
    }

    function openVariantsModal(options) {
        if (!isEnabled || !options) return;
        ensureVariantsModal();

        const { product, grupo, currentGroupIndex, onApplied } = options;
        currentVariantsData = {
            product: product,
            grupo: grupo,
            currentGroupIndex: currentGroupIndex || 0,
            originalVariants: JSON.parse(JSON.stringify(grupo?.medidas_variants || product?.medidas_variants || [])),
            onApplied: onApplied
        };

        const infoEl = document.getElementById('god-variants-prod-info');
        if (infoEl) {
            infoEl.textContent = `${product.title || ''} · Acabado: ${grupo.acabado_name || 'Estándar'}`;
        }

        const container = document.getElementById('god-variants-rows-container');
        if (container) {
            container.innerHTML = '';
            const list = currentVariantsData.originalVariants;
            if (list.length > 0) {
                list.forEach(v => addVariantRowToModal(v));
            } else {
                addVariantRowToModal({ medida: 'Estándar', price: product.price || 0, default: true });
            }
        }

        variantsModalEl.style.display = 'flex';
    }

    function closeVariantsModal() {
        if (variantsModalEl) variantsModalEl.style.display = 'none';
        currentVariantsData = null;
    }

    function applyVariantsModal() {
        if (!currentVariantsData) return;

        const container = document.getElementById('god-variants-rows-container');
        if (!container) return;

        const rowEls = container.querySelectorAll('.god-variant-row-item');
        const newVariants = [];

        rowEls.forEach((row, idx) => {
            const name = row.querySelector('.god-var-name')?.value.trim() || `Variante ${idx + 1}`;
            const price = Math.max(0, parseFloat(row.querySelector('.god-var-price')?.value) || 0);
            const espesor = row.querySelector('.god-var-espesor')?.value.trim() || '';

            // Conservar estructura existente o plantilla
            const existing = currentVariantsData.originalVariants[idx] || {};
            newVariants.push({
                ...existing,
                medida: name,
                price: price,
                espesor: espesor,
                default: idx === 0,
                hidden: false
            });
        });

        if (newVariants.length === 0) {
            showToast('Debe haber al menos 1 variante.', 'warning');
            return;
        }

        const { product, grupo, currentGroupIndex, onApplied } = currentVariantsData;
        const changeKey = `product_${product.id}_variants_${currentGroupIndex}`;

        // 1. Aplicar en memoria inmediata
        if (grupo) {
            grupo.medidas_variants = newVariants;
        }
        if (product.medidas_variants) {
            product.medidas_variants = newVariants;
        }

        // Si la primera variante tiene precio, actualizar precio general del producto si aplica
        if (newVariants[0] && newVariants[0].price > 0) {
            product.price = newVariants[0].price;
        }

        // 2. Registrar en pendingChanges
        pendingChanges.set(changeKey, {
            key: changeKey,
            type: 'product-variants',
            id: product.id,
            groupIndex: currentGroupIndex,
            originalValue: currentVariantsData.originalVariants,
            newValue: newVariants,
            element: null
        });

        updateDockCounter();

        // 3. Re-renderizar la vista de catálogo
        if (typeof onApplied === 'function') {
            onApplied();
        }

        closeVariantsModal();
        showToast('📏 Variantes actualizadas con éxito. Hacé clic en "Guardar Cambios" para persistirlas.');
    }

    // =============================================================================
    // 7. Gestión de Características del Producto (Specs)
    // =============================================================================
    function addNewProductSpec(product, callback) {
        if (!product) return;
        product.custom_specs = product.custom_specs || [];

        const newSpec = {
            icon: 'tune',
            label: 'Nueva Característica',
            val: 'Detalle técnico'
        };

        product.custom_specs.push(newSpec);

        const changeKey = `product_${product.id}_spec_add_${Date.now()}`;
        pendingChanges.set(changeKey, {
            key: changeKey,
            type: 'product-spec-custom',
            id: product.id,
            originalValue: null,
            newValue: product.custom_specs,
            element: null
        });

        updateDockCounter();

        if (typeof callback === 'function') {
            callback();
        }

        // Enfocar el título recién creado
        setTimeout(() => {
            const titles = document.querySelectorAll('.product-spec-title');
            if (titles.length > 0) {
                const last = titles[titles.length - 1];
                last.focus();
                // Seleccionar todo el texto
                const range = document.createRange();
                range.selectNodeContents(last);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 100);

        showToast('✨ Característica agregada. Hacé clic en el título o valor para editarlo.');
    }

    function removeProductSpec(product, specKey, customIndex, callback) {
        if (!product) return;

        if (confirm(`¿Eliminar la característica "${specKey}"?`)) {
            const cIdx = parseInt(customIndex, 10);
            if (!isNaN(cIdx) && Array.isArray(product.custom_specs) && product.custom_specs[cIdx]) {
                product.custom_specs.splice(cIdx, 1);
            } else {
                // Si es un campo base, vaciarlo
                const lower = (specKey || '').toLowerCase();
                if (lower.includes('material')) product.material = '';
                else if (lower.includes('espesor') || lower.includes('grosor')) product.espesor = '';
                else if (lower.includes('armado') || lower.includes('estructura')) product.armado = '';
                else if (lower.includes('medida') || lower.includes('dimension')) product.medidas_texto = '';
            }

            const changeKey = `product_${product.id}_spec_del_${specKey}`;
            pendingChanges.set(changeKey, {
                key: changeKey,
                type: 'product-spec-custom',
                id: product.id,
                specKey: specKey,
                newValue: product.custom_specs || [],
                element: null
            });

            updateDockCounter();

            if (typeof callback === 'function') {
                callback();
            }

            showToast('🗑️ Característica eliminada.');
        }
    }

    // =============================================================================
    // 8. Utilidades para Búsqueda y Mapeo de Datos
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
    // 9. Escaneo y Marcado Dinámico del DOM (data-god-type)
    // =============================================================================
    function markProductCard(card) {
        if (!card) return;

        const titleEl = card.querySelector('.feed-card-title, h3, h2, .category-overlay span');
        const priceEl = card.querySelector('.feed-card-price-row, .feed-card-price, .product-price');
        const imgEl = card.querySelector('.feed-card-photo-container img, .feed-card-img, img');

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
                if (!titleEl.dataset.godOriginal) titleEl.dataset.godOriginal = titleEl.innerText.trim();
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

            if (imgEl && !imgEl.dataset.godType) {
                imgEl.dataset.godType = 'product-image';
                imgEl.dataset.godId = prodId;
                setupImageEditable(imgEl);
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

        // Fotos de galería
        const detailImages = detailView.querySelectorAll('.product-gallery-img-wrapper img');
        detailImages.forEach((img, sIdx) => {
            img.dataset.godType = 'product-image';
            img.dataset.godId = prodId;
            img.dataset.slideIndex = sIdx;
            setupImageEditable(img);
        });

        // Títulos de características de producto (.product-spec-title)
        detailView.querySelectorAll('.product-spec-title').forEach(st => {
            st.dataset.godType = 'product-spec-title';
            st.dataset.godId = prodId;
            if (!st.dataset.godOriginal) st.dataset.godOriginal = st.innerText.trim();
            setupInlineEditable(st);
        });

        // Valores de características de producto (.product-spec-val)
        detailView.querySelectorAll('.product-spec-val').forEach(sv => {
            sv.dataset.godType = 'product-spec-val';
            sv.dataset.godId = prodId;
            if (!sv.dataset.godOriginal) sv.dataset.godOriginal = sv.innerText.trim();
            setupInlineEditable(sv);
        });

        // Etiquetas de acabado (.gallery-acabado-label)
        detailView.querySelectorAll('.gallery-acabado-label').forEach(lbl => {
            lbl.dataset.godType = 'variant-acabado-name';
            lbl.dataset.godId = prodId;
            if (!lbl.dataset.godOriginal) lbl.dataset.godOriginal = lbl.innerText.trim();
            setupInlineEditable(lbl);
        });

        // Controlar visibilidad de botones auxiliares
        const isGod = isEnabled;
        const addSpecBtn = detailView.querySelector('#btn-god-add-spec');
        if (addSpecBtn) addSpecBtn.style.display = isGod ? 'inline-flex' : 'none';

        const editVarBtn = detailView.querySelector('#btn-god-edit-variants');
        if (editVarBtn) editVarBtn.style.display = isGod ? 'inline-flex' : 'none';

        detailView.querySelectorAll('.god-delete-spec-btn').forEach(btn => {
            btn.style.display = isGod ? 'inline-flex' : 'none';
        });

        detailView.querySelectorAll('.god-photo-trigger-btn').forEach(btn => {
            btn.style.display = isGod ? 'inline-flex' : 'none';
        });
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

        const cards = root.querySelectorAll('.feed-card, .category-card:not(#carousel-categories .category-card)');
        cards.forEach(markProductCard);

        markDetailView();
        markSectionHeaders(root);
        markCategoryCards(root);
        markNosotrosAndAvisos(root);
    }

    // =============================================================================
    // 10. Configuración de Listeners en Elementos Editables
    // =============================================================================
    function setupInlineEditable(el, allowMultiline = false) {
        if (el._godBound) return;
        el._godBound = true;

        if (isEnabled) {
            el.contentEditable = 'true';
            el.spellcheck = false;
        }

        el.addEventListener('click', (e) => {
            if (!isEnabled) return;
            e.stopPropagation();
            el.focus();
        });

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
            const specKey = el.dataset.specKey || '';
            const changeKey = `${type}_${id}_${field || specKey || 'val'}`;

            if (current !== original) {
                pendingChanges.set(changeKey, {
                    key: changeKey,
                    type: type,
                    id: id,
                    field: field,
                    specKey: specKey,
                    section: el.dataset.godSection || '',
                    groupIndex: parseInt(el.dataset.groupIndex || '0', 10),
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
    // 11. Observer para Inyección Dinámica de Nodos
    // =============================================================================
    function startDOMObserver() {
        if (domObserver) return;

        domObserver = new MutationObserver((mutations) => {
            if (!isEnabled) return;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.id === 'god-mode-dock' || node.id === 'god-mode-hover-badge' || node.id === 'god-price-popover' || node.id === 'god-photo-modal' || node.id === 'god-variants-modal') {
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
    // 12. Métodos Principales del Modo Dios
    // =============================================================================
    function enable() {
        if (!checkIsAdmin()) {
            showToast('Acceso denegado: Se requieren permisos de Administrador.', 'warning');
            return false;
        }

        if (isEnabled) return true;
        isEnabled = true;

        document.body.classList.add('god-mode-active');

        ensureDock();
        ensureHoverBadge();
        ensurePricePopover();
        ensurePhotoModal();
        ensureVariantsModal();

        const triggerBtn = document.getElementById('btn-god-mode-trigger');
        if (triggerBtn) triggerBtn.classList.add('is-active');

        scanAndMark(document.body);
        startDOMObserver();
        updateDockCounter();

        showToast('⚡ Modo Dios ACTIVADO. Podés editar fotos, títulos, precios, características y variantes.');
        try {
            window.dispatchEvent(new CustomEvent('latarima:god-mode-changed', { detail: { isEnabled: true } }));
        } catch (e) {}

        return true;
    }

    function disable(force = false) {
        if (!isEnabled) return;

        if (!force && pendingChanges.size > 0) {
            const confirmed = confirm(`Tenés ${pendingChanges.size} cambio(s) sin guardar. ¿Deseás salir descartando los cambios?`);
            if (!confirmed) return;
            discardChanges();
        }

        isEnabled = false;
        document.body.classList.remove('god-mode-active');

        stopDOMObserver();
        closePricePopover();
        closePhotoModal();
        closeVariantsModal();
        hideHoverBadge();

        document.querySelectorAll('[data-god-type]').forEach(el => {
            el.contentEditable = 'false';
        });

        const triggerBtn = document.getElementById('btn-god-mode-trigger');
        if (triggerBtn) triggerBtn.classList.remove('is-active');

        // Ocultar botones auxiliares
        document.querySelectorAll('#btn-god-add-spec, #btn-god-edit-variants, .god-delete-spec-btn, .god-photo-trigger-btn').forEach(btn => {
            btn.style.display = 'none';
        });

        showToast('Modo Dios DESACTIVADO.');
        try {
            window.dispatchEvent(new CustomEvent('latarima:god-mode-changed', { detail: { isEnabled: false } }));
        } catch (e) {}
    }

    function toggle() {
        if (isEnabled) disable();
        else enable();
    }

    // =============================================================================
    // 13. Persistencia Total (Guardar Cambios en Servidor y LocalStorage)
    // =============================================================================
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
            // Aplicar cambios a las estructuras de datos maestras
            pendingChanges.forEach((change) => {
                const { type, id, field, specKey, section, newValue, element, groupIndex, slideIndex } = change;
                if (element) modifiedElements.push(element);

                // --- 1. PRODUCT TITLE, PRICE, DESCRIPTION ---
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

                // --- 2. PRODUCT IMAGE ---
                else if (type === 'product-image') {
                    hasProductChanges = true;
                    const cleanProdId = String(id).trim();

                    const updateList = (arr) => {
                        if (!Array.isArray(arr)) return;
                        arr.forEach(cat => {
                            if (cat && Array.isArray(cat.products)) {
                                cat.products.forEach(p => {
                                    if (p && String(p.id).trim() === cleanProdId) {
                                        const gIdx = typeof groupIndex !== 'undefined' ? groupIndex : 0;
                                        const sIdx = typeof slideIndex !== 'undefined' ? slideIndex : 0;

                                        if (p.acabados_groups && p.acabados_groups[gIdx]) {
                                            const grp = p.acabados_groups[gIdx];
                                            grp.images_list = grp.images_list || [];
                                            grp.images_list[sIdx] = newValue;
                                            if (sIdx === 0) {
                                                grp.cover_image = newValue;
                                                p.image = newValue;
                                            }
                                        } else {
                                            p.image = newValue;
                                        }
                                    }
                                });
                            }
                        });
                    };

                    if (window.sessionProducts) updateList(window.sessionProducts);
                    if (window.productsData) updateList(window.productsData);
                }

                // --- 3. PRODUCT VARIANTS ---
                else if (type === 'product-variants') {
                    hasProductChanges = true;
                    const cleanProdId = String(id).trim();

                    const updateList = (arr) => {
                        if (!Array.isArray(arr)) return;
                        arr.forEach(cat => {
                            if (cat && Array.isArray(cat.products)) {
                                cat.products.forEach(p => {
                                    if (p && String(p.id).trim() === cleanProdId) {
                                        const gIdx = typeof groupIndex !== 'undefined' ? groupIndex : 0;
                                        if (p.acabados_groups && p.acabados_groups[gIdx]) {
                                            p.acabados_groups[gIdx].medidas_variants = JSON.parse(JSON.stringify(newValue));
                                        }
                                        p.medidas_variants = JSON.parse(JSON.stringify(newValue));
                                    }
                                });
                            }
                        });
                    };

                    if (window.sessionProducts) updateList(window.sessionProducts);
                    if (window.productsData) updateList(window.productsData);
                }

                // --- 4. VARIANT ACABADO NAME ---
                else if (type === 'variant-acabado-name') {
                    hasProductChanges = true;
                    const cleanProdId = String(id).trim();

                    const updateList = (arr) => {
                        if (!Array.isArray(arr)) return;
                        arr.forEach(cat => {
                            if (cat && Array.isArray(cat.products)) {
                                cat.products.forEach(p => {
                                    if (p && String(p.id).trim() === cleanProdId) {
                                        const gIdx = typeof groupIndex !== 'undefined' ? groupIndex : 0;
                                        if (p.acabados_groups && p.acabados_groups[gIdx]) {
                                            p.acabados_groups[gIdx].acabado_name = newValue;
                                        }
                                    }
                                });
                            }
                        });
                    };

                    if (window.sessionProducts) updateList(window.sessionProducts);
                    if (window.productsData) updateList(window.productsData);
                }

                // --- 5. PRODUCT SPECS (TITLES & VALUES) ---
                else if (type === 'product-spec-title' || type === 'product-spec-val' || type === 'product-spec-custom') {
                    hasProductChanges = true;
                    const cleanProdId = String(id).trim();

                    const updateList = (arr) => {
                        if (!Array.isArray(arr)) return;
                        arr.forEach(cat => {
                            if (cat && Array.isArray(cat.products)) {
                                cat.products.forEach(p => {
                                    if (p && String(p.id).trim() === cleanProdId) {
                                        if (type === 'product-spec-custom') {
                                            p.custom_specs = JSON.parse(JSON.stringify(newValue));
                                            return;
                                        }

                                        const lowerKey = (specKey || '').toLowerCase();
                                        if (type === 'product-spec-val') {
                                            if (lowerKey.includes('material')) p.material = newValue;
                                            else if (lowerKey.includes('espesor') || lowerKey.includes('grosor')) p.espesor = newValue;
                                            else if (lowerKey.includes('armado') || lowerKey.includes('estructura')) p.armado = newValue;
                                            else if (lowerKey.includes('medida') || lowerKey.includes('dimension')) p.medidas_texto = newValue;
                                            else {
                                                p.custom_specs = p.custom_specs || [];
                                                const found = p.custom_specs.find(cs => cs.label.toLowerCase() === lowerKey);
                                                if (found) found.val = newValue;
                                                else p.custom_specs.push({ label: specKey || 'Característica', val: newValue, icon: 'tune' });
                                            }
                                        } else if (type === 'product-spec-title') {
                                            p.custom_specs = p.custom_specs || [];
                                            const found = p.custom_specs.find(cs => cs.label === change.originalValue);
                                            if (found) found.label = newValue;
                                        }
                                    }
                                });
                            }
                        });
                    };

                    if (window.sessionProducts) updateList(window.sessionProducts);
                    if (window.productsData) updateList(window.productsData);
                }

                // --- 6. HOME SECTIONS ---
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

                // --- 7. CATEGORY NAMES ---
                else if (type === 'category-name') {
                    hasProductChanges = true;
                    if (window.sessionProducts && Array.isArray(window.sessionProducts)) {
                        const targetCat = window.sessionProducts.find(c => c.id === id);
                        if (targetCat) targetCat.name = newValue;
                    }
                }
            });

            // LocalStorage Respaldo
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

            // Persistencia en Servidor Node (/api/save-products)
            const networkPromises = [];

            if (hasProductChanges && window.sessionProducts) {
                networkPromises.push(
                    fetch('/api/save-products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(window.sessionProducts)
                    }).catch(err => {
                        console.warn('[Modo Dios] Servidor local /api/save-products:', err.message);
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
                        console.warn('[Modo Dios] Servidor local /api/save-site-config:', err.message);
                    })
                );
            }

            if (networkPromises.length > 0) {
                await Promise.all(networkPromises);
            }

            // Efecto de confirmación visual
            modifiedElements.forEach(el => {
                el.classList.remove('god-element-modified');
                el.classList.add('god-saved-pulse');
                el.dataset.godOriginal = el.innerText ? el.innerText.trim() : (el.src || '');
                setTimeout(() => {
                    el.classList.remove('god-saved-pulse');
                }, 1300);
            });

            pendingChanges.clear();
            updateDockCounter();

            showToast('🎉 ¡Todos los cambios fueron guardados exitosamente!');
        } catch (err) {
            console.error('[Modo Dios] Error al guardar cambios:', err);
            showToast('⚠️ Ocurrió un error al guardar. Verificá la consola.', 'error');
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

    function discardChanges() {
        if (pendingChanges.size === 0) return;

        pendingChanges.forEach((change) => {
            const { originalValue, element, type } = change;
            if (element) {
                if (type === 'product-price') {
                    const numVal = parseFloat(originalValue) || 0;
                    element.textContent = formatCurrencyNumber(numVal);
                } else if (type === 'product-image') {
                    element.src = originalValue;
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
        closePhotoModal();
        closeVariantsModal();
        showToast('🔄 Cambios pendientes descartados.');
    }

    // =============================================================================
    // 14. Inicialización Segura y Exportación Global
    // =============================================================================
    window.GodMode = {
        enable,
        disable,
        toggle,
        saveAllChanges,
        discardChanges,
        openPhotoModal,
        openVariantsModal,
        addNewProductSpec,
        removeProductSpec,
        isEnabled: () => isEnabled,
        getPendingCount: () => pendingChanges.size,
        scan: () => scanAndMark(document.body)
    };

    // Auth listeners
    window.addEventListener('latarima:auth-changed', (e) => {
        const isAuth = Boolean(e?.detail?.isAuthenticated);
        if (!isAuth && isEnabled) {
            disable(true);
        }
    });

    window.addEventListener('scroll', () => {
        if (isEnabled && hoverBadgeEl && hoverBadgeEl.style.display !== 'none') {
            hideHoverBadge();
        }
    }, { passive: true });

    console.log('[Modo Dios] Módulo Live Visual In-Place Editor v2.0 cargado (Soporte fotos, specs y variantes).');
})();
