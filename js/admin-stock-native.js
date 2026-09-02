// js/admin-stock-native.js
// --- ADMIN NATIVE STOCK CONTROL MODULE ---

(function() {
    window.adminStockExpandedCategories = new Set();
    window.adminStockSearchQuery = '';

    window.toggleAdminCategoryCollapse = function(catSlug) {
        if (window.adminStockExpandedCategories.has(catSlug)) {
            window.adminStockExpandedCategories.delete(catSlug);
        } else {
            window.adminStockExpandedCategories.add(catSlug);
        }
        window.renderAdminStockModule();
    };

    window.updateAdminStockQty = function(prodId, newVal) {
        const qty = Math.max(0, parseInt(newVal) || 0);
        let found = false;

        if (Array.isArray(window.sessionProducts)) {
            window.sessionProducts.forEach(cat => {
                if (cat.products && Array.isArray(cat.products)) {
                    const prod = cat.products.find(p => p.id === prodId);
                    if (prod) {
                        prod.stock = qty;
                        found = true;
                    }
                }
            });
        }

        if (found) {
            if (typeof window.productsData !== 'undefined') window.productsData = window.sessionProducts;
            try {
                localStorage.setItem('sessionProductsAutonomo', JSON.stringify(window.sessionProducts));
            } catch(e) {}

            // Guardar cambios en servidor local si está activo
            try {
                fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(window.sessionProducts)
                });
            } catch(e) {}
            if (typeof window.showAdminToast === 'function') {
                window.showAdminToast('✅ Stock actualizado');
            }
        }
    };

    window.renderAdminStockModule = function() {
        const container = document.getElementById('admin-stock-table-body');
        if (!container) return;
        container.innerHTML = '';

        const searchInput = document.getElementById('admin-stock-search-input');
        const query = searchInput ? (searchInput.value || '').toLowerCase().trim() : '';

        const catalogSource = window.sessionProducts || window.productsData || [];

        // Agrupar por Categorías
        const grouped = {};
        let totalItemsCount = 0;

        catalogSource.forEach(cat => {
            if (cat.visible === false || (cat.id && cat.id.endsWith('-todos'))) return;
            if (!cat.products || !Array.isArray(cat.products)) return;

            const catName = cat.name ? cat.name.trim() : 'Sin Categoría';
            cat.products.forEach(p => {
                const titleMatch = (p.title || '').toLowerCase().includes(query);
                const catMatch = catName.toLowerCase().includes(query);
                const idMatch = (p.id || '').toLowerCase().includes(query);

                if (!query || titleMatch || catMatch || idMatch) {
                    if (!grouped[catName]) grouped[catName] = [];

                    let mainCost = 0;
                    if (p.acabados_groups && Array.isArray(p.acabados_groups)) {
                        for (const g of p.acabados_groups) {
                            if (g.medidas_variants && Array.isArray(g.medidas_variants)) {
                                for (const m of g.medidas_variants) {
                                    const val = parseFloat(m.cost_price);
                                    if (!isNaN(val) && val > 0) {
                                        mainCost = val;
                                        break;
                                    }
                                }
                            }
                            if (mainCost > 0) break;
                        }
                    }

                    grouped[catName].push({
                        id: p.id,
                        title: p.title,
                        category: catName,
                        qty: p.stock !== undefined ? p.stock : 1,
                        cost: mainCost,
                        visible: p.visible,
                        img: p.image || 'img/logo_provisional.png'
                    });
                    totalItemsCount++;
                }
            });
        });

        // Actualizar métricas nativas del admin
        const totalItemsEl = document.getElementById('admin-stock-total-items');
        if (totalItemsEl) totalItemsEl.textContent = totalItemsCount;

        if (Object.keys(grouped).length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 3rem 1rem;">
                        <div class="empty-state">
                            <span class="material-symbols-outlined" style="font-size: 2.5rem; color: var(--admin-border-color);">inventory</span>
                            <p style="color: #64748B; font-weight: 500; margin-top: 0.5rem;">No se encontraron productos en el stock.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const fallbackImg = 'img/logo_provisional.png';

        Object.keys(grouped).forEach(catName => {
            const items = grouped[catName];
            const catSlug = 'cat-' + catName;
            const isCollapsed = query ? false : !window.adminStockExpandedCategories.has(catSlug);
            const catTotalStock = items.reduce((sum, i) => sum + (parseInt(i.qty) || 0), 0);

            // Fila de Encabezado de Categoría
            const headerTr = document.createElement('tr');
            headerTr.className = `admin-stock-cat-header ${isCollapsed ? 'collapsed' : ''}`;
            headerTr.style.background = 'var(--admin-surface-hover)';
            headerTr.style.cursor = 'pointer';
            headerTr.style.userSelect = 'none';

            headerTr.onclick = (e) => {
                // Si el clic fue en el botón +, no colapsar la categoría
                if (e.target.closest('[title*="Agregar producto"]')) return;
                window.toggleAdminCategoryCollapse(catSlug);
            };

            headerTr.innerHTML = `
                <td colspan="4" style="padding: 0.65rem 1rem; border-top: 1px solid var(--admin-border-color); border-bottom: 2px solid var(--admin-border-color);">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.92rem; color: var(--admin-text-main);">
                            <span class="material-symbols-outlined" style="transition: transform 0.2s ease; color: var(--admin-accent); ${isCollapsed ? 'transform: rotate(-90deg);' : ''}">expand_more</span>
                            <span>${catName}</span>
                            <span class="col-status-desktop admin-count-badge" style="padding: 2px 8px; font-size: 0.73rem;">${items.length} ${items.length === 1 ? 'producto' : 'productos'}</span>
                        </div>

                        <!-- Botón + Verde Integrado en la Franja de Categoría -->
                        <span class="material-symbols-outlined" onclick="event.stopPropagation(); window.openAdminStockCreateModalForCategory('${catName}')" title="Agregar producto en ${catName}" style="color: var(--admin-success); font-weight: 800; font-size: 22px; cursor: pointer; user-select: none; transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">add</span>

                        <div class="col-status-desktop" style="font-size: 0.8rem; font-weight: 600; color: var(--admin-text-muted);">
                            Total Unidades: <span class="admin-count-badge" style="padding: 2px 8px;">${catTotalStock}</span>
                        </div>
                    </div>
                </td>
            `;
            container.appendChild(headerTr);

            // Filas de Productos
            if (!isCollapsed) {
                items.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--admin-border-color)';

                    const formattedCost = item.cost ? '$' + Number(item.cost).toLocaleString('es-AR') : '-';

                    const isVisible = item.visible !== false;
                    const statusBadge = isVisible 
                        ? `<span onclick="window.openAdminStockLinksModal('${item.id}')" title="Ver producto en la web y enlaces disponibles" style="color: var(--admin-success); font-weight: 700; font-size: 0.75rem; background: var(--admin-success-light); border: 1px solid var(--admin-success); padding: 4px 10px; border-radius: var(--admin-radius-sm); cursor: pointer; user-select: none; display: inline-flex; align-items: center; gap: 4px;">Sincronizado <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span></span>`
                        : `<span onclick="window.openAdminStockLinksModal('${item.id}')" title="Ver previsualización y enlaces del producto" style="color: var(--admin-warning); font-weight: 700; font-size: 0.75rem; background: var(--admin-warning-light); border: 1px solid var(--admin-warning); padding: 4px 10px; border-radius: var(--admin-radius-sm); display: inline-flex; align-items: center; gap: 4px; cursor: pointer; user-select: none;">🔒 Borrador <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span></span>`;

                    tr.innerHTML = `
                        <td style="padding: 0.65rem 0.85rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <img src="${item.img}" alt="Foto" style="width: 44px; height: 44px; border-radius: var(--admin-radius-sm); object-fit: cover; border: 1px solid var(--admin-border-color); cursor: pointer; flex-shrink: 0;" onclick="window.openAdminStockPhotoModal('${item.id}')" title="Toca para ver foto y editar stock/costo" onerror="this.src='${fallbackImg}'">
                                <div style="display: flex; flex-direction: column;">
                                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                        <span style="font-weight: 700; color: var(--admin-text-main); font-size: 0.88rem;">${item.title}</span>
                                        <span class="col-status-mobile" style="display: none;">${statusBadge}</span>
                                    </div>
                                    <span style="font-family: monospace; font-weight: 700; color: var(--admin-accent); background: var(--admin-accent-light); padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; margin-top: 2px; font-size: 0.75rem;">Código: ${item.id}</span>
                                </div>
                            </div>
                        </td>
                        <td class="col-stock-desktop" style="text-align: center; padding: 0.65rem;">
                            <input type="number" min="0" value="${item.qty || 0}" onchange="window.updateAdminStockQty('${item.id}', this.value)" class="premium-input" style="width: 70px; padding: 0.3rem 0.5rem; text-align: center; font-weight: 700;">
                        </td>
                        <td style="font-weight: 700; color: var(--admin-text-main); padding: 0.65rem; cursor: pointer;" onclick="window.openAdminStockPhotoModal('${item.id}')" title="Toca para editar stock y costo">${formattedCost}</td>
                        <td class="col-status-desktop" style="text-align: center; padding: 0.65rem;">
                            ${statusBadge}
                        </td>
                    `;
                    container.appendChild(tr);
                });
            }
        });
    };

    window.editingAdminStockModalProdId = null;

    window.openAdminStockPhotoModal = function(prodId) {
        let targetProd = null;
        let catName = '';

        if (Array.isArray(window.sessionProducts)) {
            for (const cat of window.sessionProducts) {
                if (cat.products && Array.isArray(cat.products)) {
                    const found = cat.products.find(p => p.id === prodId);
                    if (found) {
                        targetProd = found;
                        catName = cat.name;
                        break;
                    }
                }
            }
        }

        if (!targetProd) return;

        window.editingAdminStockModalProdId = prodId;

        // Construir lista plana de variantes de medidas y acabados
        const variantsList = [];
        if (targetProd.acabados_groups && Array.isArray(targetProd.acabados_groups)) {
            targetProd.acabados_groups.forEach((g, gIdx) => {
                if (g.medidas_variants && Array.isArray(g.medidas_variants)) {
                    g.medidas_variants.forEach((m, mIdx) => {
                        const nameLabel = `${g.acabado_name || 'Estándar'} - ${m.medida || 'Única'}`;
                        variantsList.push({
                            gIdx: gIdx,
                            mIdx: mIdx,
                            label: nameLabel,
                            cost: parseFloat(m.cost_price) || 0,
                            price: parseFloat(m.price) || 0,
                            variantObj: m
                        });
                    });
                }
            });
        }

        window.editingAdminStockVariantsList = variantsList;
        window.selectedStockVariantIndex = 0;

        const modal = document.getElementById('admin-stock-photo-modal');
        const img = document.getElementById('admin-stock-modal-img');
        const title = document.getElementById('admin-stock-modal-title');
        const code = document.getElementById('admin-stock-modal-code');
        const qty = document.getElementById('admin-stock-modal-qty');
        const cost = document.getElementById('admin-stock-modal-cost');
        const priceInp = document.getElementById('admin-stock-modal-price');
        const marginInp = document.getElementById('admin-stock-modal-margin');
        const variantsContainer = document.getElementById('admin-stock-modal-variants-container');
        const historyContainer = document.getElementById('admin-stock-modal-history-list');
        const historySection = document.getElementById('admin-stock-modal-history-section');

        if (img) img.src = targetProd.image || 'img/logo_provisional.png';
        if (title) title.textContent = targetProd.title || 'Sin título';
        if (code) code.textContent = `Código: ${targetProd.id}`;
        if (qty) qty.value = targetProd.stock !== undefined ? targetProd.stock : 1;

        // Renderizar selector de variantes si el producto tiene más de 1 medida/acabado
        if (variantsContainer) {
            variantsContainer.innerHTML = '';
            if (variantsList.length > 1) {
                let optionsHtml = variantsList.map((v, idx) => `<option value="${idx}">${v.label} ($${(v.price||0).toLocaleString()})</option>`).join('');
                variantsContainer.innerHTML = `
                    <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">📐 Seleccionar Medida / Acabado:</label>
                    <select id="admin-stock-modal-variant-select" onchange="window.selectAdminStockModalVariant(this.value)" style="width: 100%; padding: 0.55rem; background: #1E293B; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 10px; color: white; font-weight: 800; font-size: 0.85rem; outline: none;">
                        ${optionsHtml}
                    </select>
                `;
            }
        }

        window.selectAdminStockModalVariant = function(idx) {
            const vIdx = parseInt(idx) || 0;
            window.selectedStockVariantIndex = vIdx;
            const selected = window.editingAdminStockVariantsList[vIdx];
            if (selected) {
                if (cost) cost.value = selected.cost;
                if (priceInp) priceInp.value = selected.price;
                if (marginInp && selected.price > 0 && selected.cost > 0) {
                    marginInp.value = Math.round(((selected.price - selected.cost) / selected.price) * 100);
                } else if (marginInp) {
                    marginInp.value = '';
                }
            }
        };

        window.selectAdminStockModalVariant(0);

        // Ocultar historial al abrir
        if (historySection) historySection.style.display = 'none';

        // Configurar listeners para actualizar el % de ganancia visual sin sobrescribir la Venta automáticamente salvo que cambies %
        if (cost && priceInp && marginInp) {
            cost.oninput = function() {
                const c = parseFloat(cost.value) || 0;
                const p = parseFloat(priceInp.value) || 0;
                if (p > 0 && c > 0) {
                    marginInp.value = Math.round(((p - c) / p) * 100);
                }
            };
            priceInp.oninput = function() {
                const p = parseFloat(priceInp.value) || 0;
                const c = parseFloat(cost.value) || 0;
                if (p > 0 && c > 0) {
                    marginInp.value = Math.round(((p - c) / p) * 100);
                }
            };
            marginInp.oninput = function() {
                const c = parseFloat(cost.value) || 0;
                const m = parseFloat(marginInp.value) || 0;
                if (c > 0 && m < 100 && m > 0) {
                    priceInp.value = Math.round(c / (1 - (m / 100)));
                }
            };
        }

        // Renderizar Historial de Cambios (Hasta 20 registros)
        if (historyContainer) {
            historyContainer.innerHTML = '';
            const history = targetProd.history || [];
            if (history.length === 0) {
                historyContainer.innerHTML = '<div style="font-size: 0.72rem; color: #64748B; font-style: italic; text-align: center; padding: 6px;">Sin cambios registrados aún.</div>';
            } else {
                history.slice(0, 20).forEach(h => {
                    const item = document.createElement('div');
                    item.style.cssText = 'font-size: 0.72rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;';
                    
                    let tagColor = '#38BDF8';
                    if (h.type.includes('Aumentó') || h.type.includes('Ajustado') || h.type.includes('Subió')) tagColor = '#F97316';
                    if (h.type.includes('Bajó')) tagColor = '#10B981';

                    item.innerHTML = `
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 700; color: ${tagColor};">${h.type}</span>
                            <span style="color: #94A3B8; font-size: 0.68rem;">${h.detail}</span>
                        </div>
                        <span style="font-size: 0.65rem; color: #64748B; font-weight: 600;">${h.date}</span>
                    `;
                    historyContainer.appendChild(item);
                });
            }
        }

        if (modal) modal.style.display = 'flex';
    };

    window.toggleAdminStockHistoryView = function() {
        const historySection = document.getElementById('admin-stock-modal-history-section');
        const btnText = document.getElementById('admin-stock-history-toggle-btn-text');
        if (historySection) {
            const isHidden = historySection.style.display === 'none';
            historySection.style.display = isHidden ? 'block' : 'none';
            if (btnText) {
                btnText.textContent = isHidden ? 'Ocultar Historial' : 'Ver Historial Completo';
            }
        }
    };

    window.closeAdminStockPhotoModal = function() {
        const modal = document.getElementById('admin-stock-photo-modal');
        if (modal) modal.style.display = 'none';
        window.editingAdminStockModalProdId = null;
        window.editingAdminStockVariantsList = null;
    };

    window.saveAdminStockModalEdit = function() {
        const prodId = window.editingAdminStockModalProdId;
        if (!prodId) return;

        const newQty = parseInt(document.getElementById('admin-stock-modal-qty').value) || 0;
        const newCost = parseFloat(document.getElementById('admin-stock-modal-cost').value) || 0;
        const userEnteredPrice = parseFloat(document.getElementById('admin-stock-modal-price').value) || 0;
        const activeVariantIndex = window.selectedStockVariantIndex || 0;

        let forcedPriceIncrease = false;
        const nowStr = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        if (Array.isArray(window.sessionProducts)) {
            for (const cat of window.sessionProducts) {
                if (cat.products && Array.isArray(cat.products)) {
                    const prod = cat.products.find(p => p.id === prodId);
                    if (prod) {
                        const oldStock = prod.stock !== undefined ? prod.stock : 1;
                        prod.stock = Math.max(0, newQty);
                        
                        if (!prod.history) prod.history = [];

                        // 1. Registrar cambio de stock si ocurrió
                        if (oldStock !== newQty && !prod.history.some(h => h.date === nowStr && h.type === 'Stock Actualizado')) {
                            prod.history.unshift({
                                date: nowStr,
                                type: 'Stock Actualizado',
                                detail: `De ${oldStock} a ${newQty} u.`
                            });
                        }
                        
                        // 2. Aplicar cambio a la variante seleccionada (o a todas si solo hay 1)
                        const variants = window.editingAdminStockVariantsList || [];
                        const targetVariantInfo = variants[activeVariantIndex];

                        if (prod.acabados_groups && Array.isArray(prod.acabados_groups)) {
                            prod.acabados_groups.forEach((g, gIdx) => {
                                if (g.medidas_variants && Array.isArray(g.medidas_variants)) {
                                    g.medidas_variants.forEach((m, mIdx) => {
                                        // Si hay lista de variantes, modificar la seleccionada; si no, modificar todas
                                        const isTarget = targetVariantInfo ? (targetVariantInfo.gIdx === gIdx && targetVariantInfo.mIdx === mIdx) : true;
                                        if (!isTarget) return;

                                        const oldCost = parseFloat(m.cost_price) || 0;
                                        const oldPrice = parseFloat(m.price) || 0;
                                        const targetMult = parseFloat(m.multiplier) || 2.0;

                                        // Registrar cambio de costo en historial
                                        if (newCost > 0 && oldCost !== newCost && !prod.history.some(h => h.date === nowStr && h.type.includes('Costo'))) {
                                            const costType = newCost > oldCost ? 'Costo Aumentó' : 'Costo Bajó';
                                            prod.history.unshift({
                                                date: nowStr,
                                                type: costType,
                                                detail: `[${g.acabado_name || 'Estándar'} - ${m.medida}] Costo: $${oldCost.toLocaleString()} ➔ $${newCost.toLocaleString()}`
                                            });
                                        }

                                        if (newCost > 0) m.cost_price = newCost;

                                        // ASIGNACIÓN DE PRECIO DE VENTA Y PROTECCIÓN
                                        let finalPrice = userEnteredPrice > 0 ? userEnteredPrice : oldPrice;

                                        if (newCost > 0 && userEnteredPrice === oldPrice) {
                                            // Si el usuario NO tocó la Venta manualmente y solo cambió el Costo:
                                            if (newCost < oldCost && oldPrice > 0) {
                                                finalPrice = oldPrice; 
                                            }

                                            if (finalPrice > 0) {
                                                const marginPercent = ((finalPrice - newCost) / finalPrice) * 100;
                                                const minMarginFloor = 35;

                                                if (marginPercent < minMarginFloor) {
                                                    const recalculatedPrice = Math.round(newCost * targetMult);
                                                    if (recalculatedPrice > finalPrice) {
                                                        finalPrice = recalculatedPrice;
                                                        forcedPriceIncrease = true;
                                                    }
                                                }
                                            } else {
                                                finalPrice = Math.round(newCost * targetMult);
                                            }
                                        }

                                        // Registrar cambio de precio en historial
                                        if (finalPrice > 0 && oldPrice !== finalPrice && !prod.history.some(h => h.date === nowStr && h.type.includes('Precio'))) {
                                            const priceType = finalPrice > oldPrice ? (forcedPriceIncrease ? 'Protección: Precio Ajustado' : 'Precio Venta Subió') : 'Precio Venta Bajó';
                                            prod.history.unshift({
                                                date: nowStr,
                                                type: priceType,
                                                detail: `[${g.acabado_name || 'Estándar'} - ${m.medida}] Venta: $${oldPrice.toLocaleString()} ➔ $${finalPrice.toLocaleString()}`
                                            });
                                        }

                                        if (finalPrice > 0) m.price = finalPrice;
                                    });
                                }
                            });
                        }

                        // Mantener historial recortado a 20 entradas máximo
                        if (prod.history.length > 20) {
                            prod.history = prod.history.slice(0, 20);
                        }
                    }
                }
            }
        }

        // Sincronizar memoria viva global y localStorage del navegador
        if (typeof window.productsData !== 'undefined') {
            window.productsData = window.sessionProducts;
        }
        try {
            localStorage.setItem('sessionProductsAutonomo', JSON.stringify(window.sessionProducts));
        } catch(e) {}

        try {
            fetch('/api/save-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.sessionProducts)
            });
        } catch(e) {}

        if (typeof window.showAdminToast === 'function') {
            if (forcedPriceIncrease) {
                window.showAdminToast('📈 Se ajustó el precio de venta público para proteger tu piso de ganancia');
            } else {
                window.showAdminToast('✅ Stock y costo actualizados');
            }
        }

        window.closeAdminStockPhotoModal();
        window.renderAdminStockModule();
        if (typeof window.renderAdminProducts === 'function') window.renderAdminProducts();
    };

    // ── NUEVO: CREACIÓN RÁPIDA DE PRODUCTO (BORRADOR NO VISIBLE AL PÚBLICO) ──

    let pendingStockPhotoDataUrl = null;

    window.openAdminStockCreateModalForCategory = function(targetCatName) {
        window.openAdminStockCreateModal();
        const catSelect = document.getElementById('admin-stock-new-cat');
        if (catSelect && targetCatName) {
            for (let i = 0; i < catSelect.options.length; i++) {
                if (catSelect.options[i].textContent.trim().toLowerCase() === targetCatName.trim().toLowerCase()) {
                    catSelect.selectedIndex = i;
                    window.updateAdminStockNewProdAutoId();
                    break;
                }
            }
        }
    };

    window.openAdminStockCreateModal = function() {
        const modal = document.getElementById('admin-stock-create-modal');
        const catSelect = document.getElementById('admin-stock-new-cat');
        const form = document.getElementById('admin-stock-create-form');

        if (!modal || !catSelect || !form) return;
        form.reset();
        pendingStockPhotoDataUrl = null;

        const previewImg = document.getElementById('admin-stock-new-photo-preview');
        const btnText = document.getElementById('admin-stock-new-photo-btn-text');
        if (previewImg) previewImg.src = 'img/logo_provisional.png';
        if (btnText) btnText.textContent = '📷 Tomar Foto / Elegir';

        // Poblar selector de categorías
        catSelect.innerHTML = '';
        if (Array.isArray(window.sessionProducts)) {
            window.sessionProducts.forEach((cat, idx) => {
                if (cat.visible === false || (cat.id && cat.id.endsWith('-todos'))) return;
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                opt.setAttribute('data-idx', idx);
                catSelect.appendChild(opt);
            });
        }

        window.updateAdminStockNewProdAutoId();
        modal.style.display = 'flex';
    };

    window.updateAdminStockNewProdAutoId = function() {
        const catSelect = document.getElementById('admin-stock-new-cat');
        const idInput = document.getElementById('admin-stock-new-id');
        if (!catSelect || !idInput) return;

        const selectedOpt = catSelect.options[catSelect.selectedIndex];
        if (!selectedOpt) return;

        const cIdx = parseInt(selectedOpt.getAttribute('data-idx'));
        if (!isNaN(cIdx) && Array.isArray(window.sessionProducts) && window.sessionProducts[cIdx]) {
            const catNum = (cIdx + 1).toString(36).toUpperCase();
            const prodCount = (window.sessionProducts[cIdx].products || []).length + 1;
            const prodNum = prodCount.toString(36).toUpperCase();
            idInput.value = `${catNum}${prodNum}`;
        }
    };

    window.handleAdminStockCameraPhotoSelect = function(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            pendingStockPhotoDataUrl = e.target.result;
            const previewImg = document.getElementById('admin-stock-new-photo-preview');
            const btnText = document.getElementById('admin-stock-new-photo-btn-text');

            if (previewImg) previewImg.src = pendingStockPhotoDataUrl;
            if (btnText) btnText.textContent = '📸 Foto Capturada';
        };

        reader.readAsDataURL(file);
    };

    window.closeAdminStockCreateModal = function() {
        const modal = document.getElementById('admin-stock-create-modal');
        if (modal) modal.style.display = 'none';
        pendingStockPhotoDataUrl = null;
    };

    window.saveAdminStockCreateProduct = async function(e) {
        if (e) e.preventDefault();

        const catSelect = document.getElementById('admin-stock-new-cat');
        const prodId = document.getElementById('admin-stock-new-id').value.trim();
        const title = document.getElementById('admin-stock-new-title').value.trim();
        const costVal = parseFloat(document.getElementById('admin-stock-new-cost').value) || 0;
        const qtyVal = Math.max(0, parseInt(document.getElementById('admin-stock-new-qty').value) || 0);

        if (!prodId || !title) {
            if (typeof window.showAdminToast === 'function') window.showAdminToast('⚠️ Completá el nombre del producto');
            return;
        }

        const selectedOpt = catSelect.options[catSelect.selectedIndex];
        const targetCatId = selectedOpt ? selectedOpt.value : null;

        const nowStr = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        let finalImage = pendingStockPhotoDataUrl || 'img/logo_provisional.png';

        // Si es DataURL base64, subirla si hay API backend activa
        if (pendingStockPhotoDataUrl && pendingStockPhotoDataUrl.startsWith('data:image/')) {
            try {
                const resp = await fetch('/api/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: pendingStockPhotoDataUrl,
                        fileName: `quick_${prodId}_${Date.now()}.webp`,
                        folder: 'general'
                    })
                });
                if (resp.ok) {
                    const resData = await resp.json();
                    if (resData && resData.imageUrl) finalImage = resData.imageUrl;
                }
            } catch(err) {
                console.log('Guardando con DataURL local fallback:', err);
            }
        }

        // Crear Objeto Nuevo Producto (MODO BORRADOR: visible = false)
        const newProductObj = {
            id: prodId,
            title: title,
            description: "Producto cargado rápidamente desde el taller.",
            image: finalImage,
            visible: false, // 🔒 PRIVADO / BORRADOR NO VISIBLE AL PÚBLICO
            stock: qtyVal,
            primaryCatId: targetCatId,
            last_modified: Date.now(),
            history: [
                {
                    date: nowStr,
                    type: 'Producto Creado',
                    detail: `Cargado como Borrador en taller. Costo inicial: $${costVal.toLocaleString()}`
                }
            ],
            acabados_groups: [
                {
                    acabado_name: "Estándar",
                    cover_image: finalImage,
                    images_list: [finalImage],
                    medidas_variants: [
                        {
                            medida: "Única",
                            default: true,
                            hidden: false,
                            price: costVal > 0 ? Math.round(costVal * 2.0) : 0,
                            cost_price: costVal,
                            multiplier: 2.0,
                            showPrice: true
                        }
                    ]
                }
            ]
        };

        // Insertar en sessionProducts en la categoría seleccionada
        if (Array.isArray(window.sessionProducts)) {
            const catObj = window.sessionProducts.find(c => c.id === targetCatId || (c.name && c.name.trim().toLowerCase() === targetCatId?.trim().toLowerCase()));
            if (catObj) {
                if (!catObj.products) catObj.products = [];
                catObj.products.unshift(newProductObj);

                // Auto-expandir la categoría creada para que sea visible de inmediato
                const catSlug = 'cat-' + (catObj.name ? catObj.name.trim() : targetCatId);
                window.adminStockExpandedCategories.add(catSlug);
            }
        }

        // Sincronizar memorias viva y local
        if (typeof window.productsData !== 'undefined') window.productsData = window.sessionProducts;
        try {
            localStorage.setItem('sessionProductsAutonomo', JSON.stringify(window.sessionProducts));
        } catch(err) {}

        try {
            fetch('/api/save-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.sessionProducts)
            });
        } catch(err) {}

        if (typeof window.showAdminToast === 'function') {
            window.showAdminToast('🔒 Producto guardado como Borrador Privado');
        }

        window.closeAdminStockCreateModal();
        window.renderAdminStockModule();
        if (typeof window.renderAdminProducts === 'function') window.renderAdminProducts();
    };

    window.closeAdminStockLinksModal = function() {
        const modal = document.getElementById('admin-stock-links-modal');
        if (modal) modal.style.display = 'none';
    };

    window.openAdminStockLinksModal = function(prodId) {
        let targetProd = null;
        let catName = '';

        if (Array.isArray(window.sessionProducts)) {
            for (const cat of window.sessionProducts) {
                if (cat.products && Array.isArray(cat.products)) {
                    const found = cat.products.find(p => p.id === prodId);
                    if (found) {
                        targetProd = found;
                        catName = cat.name;
                        break;
                    }
                }
            }
        }

        if (!targetProd) return;

        const modal = document.getElementById('admin-stock-links-modal');
        const modalTitle = document.getElementById('admin-stock-links-modal-title');
        const linksList = document.getElementById('admin-stock-links-list');

        if (modalTitle) modalTitle.textContent = `${targetProd.title} (Cod: ${targetProd.id})`;

        // Construir URLs de acceso directo
        const directPublicUrl = `apps/catalogo.html?id=${targetProd.id}`;
        const seoShortUrl = `p/${targetProd.id}.html`;

        if (linksList) {
            linksList.innerHTML = `
                <!-- 1. Enlace a Catálogo Público -->
                <a href="${directPublicUrl}" target="_blank" style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; color: white; text-decoration: none; font-weight: 700; font-size: 0.88rem; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(56, 189, 248, 0.16)'" onmouseout="this.style.background='rgba(56, 189, 248, 0.08)'">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-symbols-outlined" style="color: #38BDF8; font-size: 22px;">storefront</span>
                        <div>
                            <div style="color: #FFFFFF; font-weight: 800;">Ver en Catálogo Público</div>
                            <div style="font-size: 0.72rem; color: #94A3B8; font-weight: 600;">Abre la vista completa en apps/catalogo.html</div>
                        </div>
                    </div>
                    <span class="material-symbols-outlined" style="color: #38BDF8; font-size: 20px;">open_in_new</span>
                </a>

                <!-- 2. Enlace Corto SEO / WhatsApp -->
                <a href="${seoShortUrl}" target="_blank" style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; color: white; text-decoration: none; font-weight: 700; font-size: 0.88rem; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(16, 185, 129, 0.16)'" onmouseout="this.style.background='rgba(16, 185, 129, 0.08)'">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-symbols-outlined" style="color: #10B981; font-size: 22px;">share</span>
                        <div>
                            <div style="color: #FFFFFF; font-weight: 800;">Link Corto SEO / Redes</div>
                            <div style="font-size: 0.72rem; color: #94A3B8; font-weight: 600;">Tarjeta para WhatsApp / Meta (p/${targetProd.id}.html)</div>
                        </div>
                    </div>
                    <span class="material-symbols-outlined" style="color: #10B981; font-size: 20px;">open_in_new</span>
                </a>

                <!-- 3. Previsualización Directa de Foto -->
                <a href="${targetProd.image || 'img/logo_provisional.png'}" target="_blank" style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; color: white; text-decoration: none; font-weight: 700; font-size: 0.88rem; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(249, 115, 22, 0.16)'" onmouseout="this.style.background='rgba(249, 115, 22, 0.08)'">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-symbols-outlined" style="color: #F97316; font-size: 22px;">image</span>
                        <div>
                            <div style="color: #FFFFFF; font-weight: 800;">Ver Imagen HD en Tamaño Real</div>
                            <div style="font-size: 0.72rem; color: #94A3B8; font-weight: 600;">Abre el archivo original cargado</div>
                        </div>
                    </div>
                    <span class="material-symbols-outlined" style="color: #F97316; font-size: 20px;">open_in_new</span>
                </a>
            `;
        }

        if (modal) modal.style.display = 'flex';
    };

    window.initAdminStockNative = function() {
        const searchInput = document.getElementById('admin-stock-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                window.renderAdminStockModule();
            });
        }
        window.renderAdminStockModule();
    };
})();
