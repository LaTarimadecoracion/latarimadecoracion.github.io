// js/admin-stock-native.js
// --- ADMIN NATIVE STOCK CONTROL MODULE ---

(function() {
    window.adminStockExpandedCategories = new Set();
    window.adminStockSearchQuery = '';
    window.adminStockAllHidden = true;

    // Inicialización del Carrito de Faltantes / Compras desde localStorage
    // --- SISTEMA UNIFICADO DE COMPRAS Y PENDIENTES EN CADENA (NIVELES CONTINUOS) ---
    // window.adminStockLists: Array de objetos. El índice 0 siempre es la lista visible al frente.
    try {
        window.adminStockLists = JSON.parse(localStorage.getItem('adminStockListsState') || '[]');
        if (!Array.isArray(window.adminStockLists)) window.adminStockLists = [];
    } catch(e) {
        window.adminStockLists = [];
    }

    // Retrocompatibilidad con window.adminStockCart histórico
    if (window.adminStockLists.length === 0) {
        let legacyCart = {};
        try { legacyCart = JSON.parse(localStorage.getItem('adminStockCartState') || '{}'); } catch(e) {}
        if (Object.keys(legacyCart).length > 0) {
            window.adminStockLists.push(legacyCart);
        }
    }

    // Guardar estado unificado
    window.saveAdminStockListsState = function() {
        try {
            // Máximo 5 listas en cadena. Si hay más, las sobrantes más antiguas pasan al historial
            while (window.adminStockLists.length > 5) {
                const overflow = window.adminStockLists.pop();
                window.recordPurchasesToHistory(overflow, 'Lista Archivado Cadena');
            }
            localStorage.setItem('adminStockListsState', JSON.stringify(window.adminStockLists));
            // Sincronizar referencia clásica adminStockCart a la lista que está actualmente al frente (Lista 1)
            window.adminStockCart = window.adminStockLists[0] || {};
            localStorage.setItem('adminStockCartState', JSON.stringify(window.adminStockCart));
        } catch(e) {}
        window.renderAdminStockCart();
    };

    // Operaciones sobre la lista activa que está al frente (adminStockLists[0])
    window.addToAdminStockCart = function(id, title, img, cost) {
        if (window.adminStockLists.length === 0) {
            window.adminStockLists.push({});
        }
        const currentList = window.adminStockLists[0];
        if (!currentList[id]) {
            currentList[id] = {
                id: id,
                title: title,
                img: img || 'img/logo_provisional.png',
                cost: parseFloat(cost) || 0,
                qtyNeeded: 1,
                qtyAcquired: 0,
                checked: false
            };
            if (typeof window.showAdminToast === 'function') {
                window.showAdminToast(`🛒 Se agregó "${title}" a la lista`);
            }
        } else {
            currentList[id].qtyNeeded += 1;
            if (typeof window.showAdminToast === 'function') {
                window.showAdminToast(`🛒 Cantidad aumentada para "${title}"`);
            }
        }
        window.saveAdminStockListsState();
        window.renderAdminStockModule();
    };

    window.removeFromAdminStockCart = function(id) {
        if (window.adminStockLists.length > 0 && window.adminStockLists[0][id]) {
            delete window.adminStockLists[0][id];
            window.saveAdminStockListsState();
            window.renderAdminStockModule();
        }
    };

    window.updateAdminStockCartItemQty = function(id, newQty) {
        const qty = Math.max(1, parseInt(newQty) || 1);
        if (window.adminStockLists[0] && window.adminStockLists[0][id]) {
            window.adminStockLists[0][id].qtyNeeded = qty;
            window.saveAdminStockListsState();
        }
    };

    window.updateAdminStockCartItemAcquired = function(id, newAcquired) {
        const acquired = Math.max(0, parseInt(newAcquired) || 0);
        if (window.adminStockLists[0] && window.adminStockLists[0][id]) {
            window.adminStockLists[0][id].qtyAcquired = acquired;
            window.saveAdminStockListsState();
        }
    };

    window.toggleAdminStockCartItemCheck = function(id) {
        if (window.adminStockLists[0] && window.adminStockLists[0][id]) {
            const item = window.adminStockLists[0][id];
            item.checked = !item.checked;
            window.saveAdminStockListsState();
        }
    };

    // Eliminar la lista actual de la cadena (Pasa la siguiente lista al frente)
    window.clearAdminStockCart = function() {
        if (window.adminStockLists.length === 0) return;
        if (confirm('¿Eliminar la lista actual? La siguiente lista de la cadena tomará su lugar.')) {
            const removed = window.adminStockLists.shift();
            window.recordPurchasesToHistory(removed, 'Lista Eliminada');
            window.saveAdminStockListsState();
            window.renderAdminStockModule();
            if (typeof window.showAdminToast === 'function') {
                if (window.adminStockLists.length > 0) {
                    window.showAdminToast('🗑 Lista eliminada. La siguiente lista de la cadena tomó su lugar.');
                } else {
                    window.showAdminToast('🗑 Lista de compras eliminada por completo.');
                }
            }
        }
    };

    window.clearAdminStockPendingList = function() {
        window.clearAdminStockCart();
    };

    // --- ESTADO DEL HISTORIAL DE COMPRAS ---
    try {
        window.adminStockPurchasesHistory = JSON.parse(localStorage.getItem('adminStockPurchasesHistoryState') || '[]');
    } catch(e) {
        window.adminStockPurchasesHistory = [];
    }

    window.saveAdminStockPurchasesHistoryState = function() {
        try {
            localStorage.setItem('adminStockPurchasesHistoryState', JSON.stringify(window.adminStockPurchasesHistory));
        } catch(e) {}
        window.renderAdminStockPurchasesHistory();
    };

    window.recordPurchasesToHistory = function(sourceListObj, sourceLabel) {
        if (!sourceListObj) return;
        const keys = Object.keys(sourceListObj);
        const acquiredItems = [];
        let totalSpent = 0;

        keys.forEach(id => {
            const item = sourceListObj[id];
            const acquired = parseInt(item.qtyAcquired) || 0;
            if (acquired > 0) {
                const costSpent = acquired * (parseFloat(item.cost) || 0);
                totalSpent += costSpent;
                acquiredItems.push({
                    title: item.title,
                    img: item.img,
                    qtyAcquired: acquired,
                    costUnit: item.cost || 0,
                    costSpent: costSpent
                });
            }
        });

        if (acquiredItems.length > 0) {
            const newRecord = {
                id: 'buy-' + Date.now(),
                date: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
                source: sourceLabel || 'Compras',
                totalSpent: totalSpent,
                items: acquiredItems
            };

            window.adminStockPurchasesHistory.unshift(newRecord);
            window.saveAdminStockPurchasesHistoryState();
        }
    };

    // --- BOTÓN PRINCIPAL: GENERAR LISTA DE PENDIENTES (CADENA CONTINUA) ---
    window.generateAdminStockPendingList = function() {
        if (window.adminStockLists.length === 0) {
            if (typeof window.showAdminToast === 'function') {
                window.showAdminToast('⚠️ La lista está vacía.');
            }
            return;
        }

        const currentList = window.adminStockLists[0];
        const keys = Object.keys(currentList);
        if (keys.length === 0) {
            if (typeof window.showAdminToast === 'function') {
                window.showAdminToast('⚠️ La lista está vacía.');
            }
            return;
        }

        // 1. Registrar las compras efectivamente realizadas en el historial
        window.recordPurchasesToHistory(currentList, 'Comprar/reponer');

        // 2. Extraer ítems que NO se consiguieron (o incompletos) para formar la nueva lista
        const nextPendingObj = {};
        let countNewItems = 0;

        keys.forEach(id => {
            const item = currentList[id];
            const needed = parseInt(item.qtyNeeded) || 1;
            const acquired = parseInt(item.qtyAcquired) || 0;
            const isChecked = Boolean(item.checked);

            if (!isChecked && acquired < needed) {
                const remaining = needed - acquired;
                nextPendingObj[id] = {
                    id: id,
                    title: item.title,
                    img: item.img,
                    cost: item.cost,
                    qtyNeeded: remaining,
                    qtyAcquired: 0,
                    checked: false
                };
                countNewItems++;
            }
        });

        // 3. Quitar la lista actual procesada del frente
        window.adminStockLists.shift();

        // 4. Si quedaron faltantes, colocarlos como la NUEVA lista al frente
        if (countNewItems > 0) {
            window.adminStockLists.unshift(nextPendingObj);
        }

        // 5. Guardar estado y actualizar pantalla al instante
        window.saveAdminStockListsState();
        window.renderAdminStockModule();

        // Asegurar que la tarjeta principal permanezca desplegada
        const cartWrapper = document.getElementById('admin-stock-cart-content-wrapper');
        const cartIcon = document.getElementById('admin-stock-cart-collapse-icon');
        if (cartWrapper) cartWrapper.style.display = 'block';
        if (cartIcon) cartIcon.style.transform = 'rotate(0deg)';

        if (typeof window.showAdminToast === 'function') {
            if (countNewItems > 0) {
                window.showAdminToast(`📋 Se generó la Nueva Lista de Pendientes con ${countNewItems} ítems.`);
            } else {
                window.showAdminToast('🎉 ¡Felicidades! Conseguiste el 100% de los productos de la lista.');
            }
        }
    };

    window.generateAdminStockSubPendingList = function() {
        window.generateAdminStockPendingList();
    };

    window.toggleAdminStockPendingListCollapse = function() {
        const wrapper = document.getElementById('admin-stock-pending-content-wrapper');
        const icon = document.getElementById('admin-stock-pending-collapse-icon');
        if (!wrapper) return;
        const isHidden = wrapper.style.display === 'none';
        wrapper.style.display = isHidden ? 'block' : 'none';
        if (icon) icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
        if (isHidden) window.renderAdminStockPendingList();
    };

    window.renderAdminStockCart = function() {
        const container = document.getElementById('admin-stock-cart-items-container');
        const badge = document.getElementById('admin-stock-cart-badge');
        const totalQtyEl = document.getElementById('admin-stock-cart-total-qty');
        const totalCostEl = document.getElementById('admin-stock-cart-total-cost');
        if (!container) return;

        const cartObj = (window.adminStockLists && window.adminStockLists.length > 0) ? window.adminStockLists[0] : (window.adminStockCart || {});
        const keys = Object.keys(cartObj);

        if (badge) {
            badge.textContent = `${keys.length} ${keys.length === 1 ? 'ítem' : 'ítems'}`;
        }

        if (keys.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--admin-text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 2.2rem; color: var(--admin-border-color);">shopping_cart</span>
                    <p style="margin: 0.4rem 0 0 0; font-size: 0.88rem; font-weight: 600;">La lista de compras está vacía.</p>
                    <p style="margin: 2px 0 0 0; font-size: 0.78rem;">Toca el icono de carrito 🛒 en los productos del stock para agregarlos aquí.</p>
                </div>
            `;
            if (totalQtyEl) totalQtyEl.textContent = '0';
            if (totalCostEl) totalCostEl.textContent = '$0';
            return;
        }

        let totalQty = 0;
        let totalCostSpent = 0;
        let totalCostNeeded = 0;
        let html = '';

        keys.forEach(id => {
            const item = cartObj[id];
            const needed = parseInt(item.qtyNeeded) || 1;
            const acquired = parseInt(item.qtyAcquired) || 0;
            const isChecked = Boolean(item.checked);
            const isFullyDone = isChecked || (acquired >= needed && needed > 0);

            const unitCost = item.cost || 0;
            const itemSpentCost = unitCost * acquired;
            const itemFullCost = unitCost * needed;

            totalQty += needed;
            totalCostSpent += itemSpentCost;
            totalCostNeeded += itemFullCost;

            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.65rem 0.75rem; background: ${isChecked ? 'var(--admin-success-light)' : (acquired > 0 ? '#FEF3C7' : 'var(--admin-surface-hover)')}; border: 1px solid ${isChecked ? 'var(--admin-success)' : (acquired > 0 ? '#D97706' : 'var(--admin-border-color)')}; border-radius: var(--admin-radius-sm); opacity: ${isChecked ? '0.75' : '1'}; transition: all 0.2s ease; flex-wrap: wrap;">
                    
                    <div style="display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 180px;">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.toggleAdminStockCartItemCheck('${item.id}')" title="Marcar ítem" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--admin-success); flex-shrink: 0;">
                        <img src="${item.img}" alt="Foto" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover; border: 1px solid var(--admin-border-color); flex-shrink: 0;">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 700; font-size: 0.85rem; color: var(--admin-text-main); ${isFullyDone ? 'text-decoration: line-through;' : ''}">${item.title}</span>
                            <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                                <span style="font-size: 0.73rem; color: var(--admin-text-muted);">Costo: $${Number(unitCost).toLocaleString('es-AR')}</span>
                                ${acquired > 0 && !isFullyDone ? `<span style="font-size: 0.71rem; font-weight: 700; color: #D97706; background: #FEF3C7; padding: 1px 5px; border-radius: 4px;">Parcial (${acquired}/${needed})</span>` : ''}
                                ${isFullyDone ? `<span style="font-size: 0.71rem; font-weight: 700; color: var(--admin-success); background: var(--admin-success-light); padding: 1px 5px; border-radius: 4px;">Listo</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.6rem; margin-left: auto; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; gap: 3px;" title="Total de unidades necesarias a comprar">
                            <span style="font-size: 0.72rem; font-weight: 700; color: var(--admin-text-muted);">Busco:</span>
                            <input type="number" min="1" value="${needed}" onchange="window.updateAdminStockCartItemQty('${item.id}', this.value)" class="premium-input" style="width: 44px; padding: 0.2rem; text-align: center; font-weight: 700; font-size: 0.82rem;">
                        </div>

                        <div style="display: flex; align-items: center; gap: 3px;" title="Unidades ya compradas o conseguidas">
                            <span style="font-size: 0.72rem; font-weight: 700; color: var(--admin-success);">Conseguí:</span>
                            <input type="number" min="0" max="${needed}" value="${acquired}" onchange="window.updateAdminStockCartItemAcquired('${item.id}', this.value)" class="premium-input" style="width: 44px; padding: 0.2rem; text-align: center; font-weight: 700; font-size: 0.82rem; border-color: var(--admin-success);">
                        </div>

                        <div style="display: flex; flex-direction: column; text-align: right; min-width: 65px;">
                            <span style="font-weight: 800; font-size: 0.85rem; color: var(--admin-success);">$${Number(itemSpentCost).toLocaleString('es-AR')}</span>
                            ${acquired < needed ? `<span style="font-size: 0.68rem; color: var(--admin-text-muted);" title="Costo total si se comprara el 100%">de $${Number(itemFullCost).toLocaleString('es-AR')}</span>` : ''}
                        </div>

                        <span class="material-symbols-outlined" onclick="window.removeFromAdminStockCart('${item.id}')" title="Quitar de la lista" style="font-size: 20px; color: #DC2626; cursor: pointer; user-select: none; flex-shrink: 0;">delete</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        if (totalQtyEl) totalQtyEl.textContent = totalQty;
        if (totalCostEl) totalCostEl.innerHTML = `$${Number(totalCostSpent).toLocaleString('es-AR')} <span style="font-size: 0.75rem; color: var(--admin-text-muted); font-weight: 500;">(de $${Number(totalCostNeeded).toLocaleString('es-AR')})</span>`;
    };

    window.renderAdminStockPendingList = function() {
        const container = document.getElementById('admin-stock-pending-items-container');
        const badge = document.getElementById('admin-stock-pending-badge');
        const totalQtyEl = document.getElementById('admin-stock-pending-total-qty');
        const totalCostEl = document.getElementById('admin-stock-pending-total-cost');
        if (!container) return;

        const pendingObj = window.adminStockPendingList || {};
        const keys = Object.keys(pendingObj);

        if (badge) {
            badge.textContent = `${keys.length} ${keys.length === 1 ? 'pendiente' : 'pendientes'}`;
        }

        if (keys.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--admin-text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 2.2rem; color: var(--admin-border-color);">task_alt</span>
                    <p style="margin: 0.4rem 0 0 0; font-size: 0.88rem; font-weight: 600;">No hay lista de pendientes activa.</p>
                    <p style="margin: 2px 0 0 0; font-size: 0.78rem;">Al presionar "Generar Lista de Pendientes" en la tarjeta Comprar/reponer, los saldos faltantes se cargarán automáticamente aquí.</p>
                </div>
            `;
            if (totalQtyEl) totalQtyEl.textContent = '0';
            if (totalCostEl) totalCostEl.textContent = '$0';
            return;
        }

        let totalQty = 0;
        let totalCostSpent = 0;
        let totalCostNeeded = 0;
        let html = '';

        keys.forEach(id => {
            const item = pendingObj[id];
            const needed = parseInt(item.qtyNeeded) || 1;
            const acquired = parseInt(item.qtyAcquired) || 0;
            const isChecked = Boolean(item.checked);
            const isFullyDone = isChecked || (acquired >= needed && needed > 0);

            const unitCost = item.cost || 0;
            const itemSpentCost = unitCost * acquired;
            const itemFullCost = unitCost * needed;

            totalQty += needed;
            totalCostSpent += itemSpentCost;
            totalCostNeeded += itemFullCost;

            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.65rem 0.75rem; background: ${isChecked ? 'var(--admin-success-light)' : (acquired > 0 ? '#FEF3C7' : 'var(--admin-surface-hover)')}; border: 1px solid ${isChecked ? 'var(--admin-success)' : (acquired > 0 ? '#D97706' : 'var(--admin-border-color)')}; border-radius: var(--admin-radius-sm); opacity: ${isChecked ? '0.75' : '1'}; transition: all 0.2s ease; flex-wrap: wrap;">
                    
                    <div style="display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 180px;">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.toggleAdminStockPendingItemCheck('${item.id}')" title="Marcar ítem" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--admin-success); flex-shrink: 0;">
                        <img src="${item.img}" alt="Foto" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover; border: 1px solid var(--admin-border-color); flex-shrink: 0;">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 700; font-size: 0.85rem; color: var(--admin-text-main); ${isFullyDone ? 'text-decoration: line-through;' : ''}">${item.title}</span>
                            <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                                <span style="font-size: 0.73rem; color: var(--admin-text-muted);">Costo: $${Number(unitCost).toLocaleString('es-AR')}</span>
                                ${acquired > 0 && !isFullyDone ? `<span style="font-size: 0.71rem; font-weight: 700; color: #D97706; background: #FEF3C7; padding: 1px 5px; border-radius: 4px;">Parcial (${acquired}/${needed})</span>` : ''}
                                ${isFullyDone ? `<span style="font-size: 0.71rem; font-weight: 700; color: var(--admin-success); background: var(--admin-success-light); padding: 1px 5px; border-radius: 4px;">Listo</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.6rem; margin-left: auto; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; gap: 3px;" title="Total de unidades necesarias a comprar">
                            <span style="font-size: 0.72rem; font-weight: 700; color: var(--admin-text-muted);">Busco:</span>
                            <input type="number" min="1" value="${needed}" onchange="window.updateAdminStockPendingItemQty('${item.id}', this.value)" class="premium-input" style="width: 44px; padding: 0.2rem; text-align: center; font-weight: 700; font-size: 0.82rem;">
                        </div>

                        <div style="display: flex; align-items: center; gap: 3px;" title="Unidades ya compradas o conseguidas">
                            <span style="font-size: 0.72rem; font-weight: 700; color: var(--admin-success);">Conseguí:</span>
                            <input type="number" min="0" max="${needed}" value="${acquired}" onchange="window.updateAdminStockPendingItemAcquired('${item.id}', this.value)" class="premium-input" style="width: 44px; padding: 0.2rem; text-align: center; font-weight: 700; font-size: 0.82rem; border-color: var(--admin-success);">
                        </div>

                        <div style="display: flex; flex-direction: column; text-align: right; min-width: 65px;">
                            <span style="font-weight: 800; font-size: 0.85rem; color: var(--admin-success);">$${Number(itemSpentCost).toLocaleString('es-AR')}</span>
                            ${acquired < needed ? `<span style="font-size: 0.68rem; color: var(--admin-text-muted);" title="Costo total si se comprara el 100%">de $${Number(itemFullCost).toLocaleString('es-AR')}</span>` : ''}
                        </div>

                        <span class="material-symbols-outlined" onclick="window.removeFromAdminStockPendingList('${item.id}')" title="Quitar de la lista de pendientes" style="font-size: 20px; color: #DC2626; cursor: pointer; user-select: none; flex-shrink: 0;">delete</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        if (totalQtyEl) totalQtyEl.textContent = totalQty;
        if (totalCostEl) totalCostEl.innerHTML = `$${Number(totalCostSpent).toLocaleString('es-AR')} <span style="font-size: 0.75rem; color: var(--admin-text-muted); font-weight: 500;">(de $${Number(totalCostNeeded).toLocaleString('es-AR')})</span>`;
    };

    window.toggleAdminStockPurchasesHistoryCollapse = function() {
        const wrapper = document.getElementById('admin-stock-purchases-history-content-wrapper');
        const icon = document.getElementById('admin-stock-purchases-history-collapse-icon');
        if (!wrapper) return;
        const isHidden = wrapper.style.display === 'none';
        wrapper.style.display = isHidden ? 'block' : 'none';
        if (icon) icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
        if (isHidden) window.renderAdminStockPurchasesHistory();
    };

    window.renderAdminStockPurchasesHistory = function() {
        const container = document.getElementById('admin-stock-purchases-history-container');
        const badge = document.getElementById('admin-stock-purchases-history-badge');
        if (!container) return;

        const history = window.adminStockPurchasesHistory || [];
        if (badge) {
            badge.textContent = `${history.length} ${history.length === 1 ? 'compra' : 'compras'}`;
        }

        if (history.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--admin-text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 2.2rem; color: var(--admin-border-color);">receipt</span>
                    <p style="margin: 0.4rem 0 0 0; font-size: 0.88rem; font-weight: 600;">Historial de compras vacío.</p>
                    <p style="margin: 2px 0 0 0; font-size: 0.78rem;">Cada vez que consigas ítems y generes una lista de pendientes, las compras realizadas quedarán asentadas aquí automáticamente.</p>
                </div>
            `;
            return;
        }

        let html = '';
        history.forEach((rec, idx) => {
            let itemsHtml = '';
            rec.items.forEach(it => {
                itemsHtml += `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; padding: 4px 0; border-bottom: 1px dashed var(--admin-border-color);">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <img src="${it.img}" alt="Foto" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover;">
                            <span style="font-weight: 600; color: var(--admin-text-main);">${it.title}</span>
                            <span style="font-size: 0.73rem; color: var(--admin-text-muted);">x${it.qtyAcquired} u.</span>
                        </div>
                        <span style="font-weight: 700; color: var(--admin-success);">$${Number(it.costSpent).toLocaleString('es-AR')}</span>
                    </div>
                `;
            });

            html += `
                <div style="background: var(--admin-surface-hover); border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-sm); padding: 0.85rem 1rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; border-bottom: 1px solid var(--admin-border-color); padding-bottom: 0.4rem;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 16px; color: var(--admin-success);">event_available</span>
                            <span style="font-weight: 800; font-size: 0.83rem; color: var(--admin-text-main);">${rec.date}</span>
                            <span style="font-size: 0.72rem; color: var(--admin-text-muted); background: white; border: 1px solid var(--admin-border-color); padding: 1px 6px; border-radius: 4px;">Origen: ${rec.source}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-weight: 800; font-size: 0.9rem; color: var(--admin-success);">Total: $${Number(rec.totalSpent).toLocaleString('es-AR')}</span>
                            <span class="material-symbols-outlined" onclick="window.adminStockPurchasesHistory.splice(${idx}, 1); window.saveAdminStockPurchasesHistoryState();" title="Borrar registro del historial" style="font-size: 16px; color: #DC2626; cursor: pointer; user-select: none;">delete</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    };

    window.toggleAdminStockBuyCartCollapse = function() {
        const wrapper = document.getElementById('admin-stock-cart-content-wrapper');
        const icon = document.getElementById('admin-stock-cart-collapse-icon');
        if (!wrapper) return;
        const isHidden = wrapper.style.display === 'none';
        wrapper.style.display = isHidden ? 'block' : 'none';
        if (icon) icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
        if (isHidden) window.renderAdminStockCart();
    };

    window.renderAdminStockCart = function() {
        const container = document.getElementById('admin-stock-cart-items-container');
        const badge = document.getElementById('admin-stock-cart-badge');
        const totalQtyEl = document.getElementById('admin-stock-cart-total-qty');
        const totalCostEl = document.getElementById('admin-stock-cart-total-cost');
        if (!container) return;

        const cartKeys = Object.keys(window.adminStockCart);
        if (badge) {
            badge.textContent = `${cartKeys.length} ${cartKeys.length === 1 ? 'ítem' : 'ítems'}`;
        }

        if (cartKeys.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--admin-text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 2.2rem; color: var(--admin-border-color);">remove_shopping_cart</span>
                    <p style="margin: 0.4rem 0 0 0; font-size: 0.88rem; font-weight: 600;">El carrito de compras está vacío.</p>
                    <p style="margin: 2px 0 0 0; font-size: 0.78rem;">Tocá el icono de carrito <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">add_shopping_cart</span> en cualquier producto del stock para agregarlo a la lista de compras.</p>
                </div>
            `;
            if (totalQtyEl) totalQtyEl.textContent = '0';
            if (totalCostEl) totalCostEl.textContent = '$0';
            return;
        }

        let totalQty = 0;
        let totalCostSpent = 0;
        let totalCostNeeded = 0;
        let html = '';

        cartKeys.forEach(id => {
            const item = window.adminStockCart[id];
            const needed = item.qtyNeeded || 1;
            const acquired = item.qtyAcquired || 0;
            const isChecked = Boolean(item.checked);
            const isFullyDone = isChecked || (acquired >= needed && needed > 0);

            const unitCost = item.cost || 0;
            const itemSpentCost = unitCost * acquired; // Lo gastado en lo que ya se consiguió
            const itemFullCost = unitCost * needed;   // Lo proyectado total

            totalQty += needed;
            totalCostSpent += itemSpentCost;
            totalCostNeeded += itemFullCost;

            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.65rem 0.75rem; background: ${isChecked ? 'var(--admin-success-light)' : (acquired > 0 ? 'var(--admin-warning-light)' : 'var(--admin-surface-hover)')}; border: 1px solid ${isChecked ? 'var(--admin-success)' : (acquired > 0 ? 'var(--admin-warning)' : 'var(--admin-border-color)')}; border-radius: var(--admin-radius-sm); opacity: ${isChecked ? '0.75' : '1'}; transition: all 0.2s ease; flex-wrap: wrap;">
                    
                    <!-- LADO IZQUIERDO: Checkbox, Foto, Titulo e Información -->
                    <div style="display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 180px;">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.toggleAdminStockCartItemCheck('${item.id}')" title="Marcar ítem" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--admin-success); flex-shrink: 0;">
                        <img src="${item.img}" alt="Foto" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover; border: 1px solid var(--admin-border-color); flex-shrink: 0;">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 700; font-size: 0.85rem; color: var(--admin-text-main); ${isFullyDone ? 'text-decoration: line-through;' : ''}">${item.title}</span>
                            <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                                <span style="font-size: 0.73rem; color: var(--admin-text-muted);">Costo: $${Number(unitCost).toLocaleString('es-AR')}</span>
                                ${acquired > 0 && !isFullyDone ? `<span style="font-size: 0.71rem; font-weight: 700; color: #D97706; background: #FEF3C7; padding: 1px 5px; border-radius: 4px;">Parcial (${acquired}/${needed})</span>` : ''}
                                ${isFullyDone ? `<span style="font-size: 0.71rem; font-weight: 700; color: var(--admin-success); background: var(--admin-success-light); padding: 1px 5px; border-radius: 4px;">Listo</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- LADO DERECHO: Busco, Conseguí, Subtotal de Costo y Tacho de basura siempre visible -->
                    <div style="display: flex; align-items: center; gap: 0.6rem; margin-left: auto; flex-shrink: 0;">
                        <!-- Necesitados -->
                        <div style="display: flex; align-items: center; gap: 3px;" title="Total de unidades necesarias a comprar">
                            <span style="font-size: 0.72rem; font-weight: 700; color: var(--admin-text-muted);">Busco:</span>
                            <input type="number" min="1" value="${needed}" onchange="window.updateAdminStockCartItemQty('${item.id}', this.value)" class="premium-input" style="width: 44px; padding: 0.2rem; text-align: center; font-weight: 700; font-size: 0.82rem;">
                        </div>

                        <!-- Conseguidos -->
                        <div style="display: flex; align-items: center; gap: 3px;" title="Unidades ya compradas o conseguidas">
                            <span style="font-size: 0.72rem; font-weight: 700; color: var(--admin-success);">Conseguí:</span>
                            <input type="number" min="0" max="${needed}" value="${acquired}" onchange="window.updateAdminStockCartItemAcquired('${item.id}', this.value)" class="premium-input" style="width: 44px; padding: 0.2rem; text-align: center; font-weight: 700; font-size: 0.82rem; border-color: var(--admin-success);">
                        </div>

                        <!-- Costo real según lo conseguido -->
                        <div style="display: flex; flex-direction: column; text-align: right; min-width: 65px;">
                            <span style="font-weight: 800; font-size: 0.85rem; color: var(--admin-success);">$${Number(itemSpentCost).toLocaleString('es-AR')}</span>
                            ${acquired < needed ? `<span style="font-size: 0.68rem; color: var(--admin-text-muted);" title="Costo total si se comprara el 100%">de $${Number(itemFullCost).toLocaleString('es-AR')}</span>` : ''}
                        </div>

                        <!-- Icono Tacho de Basura Rojo Solo (Sin Contenedor) -->
                        <span class="material-symbols-outlined" onclick="window.removeFromAdminStockCart('${item.id}')" title="Quitar de la lista" style="font-size: 20px; color: #DC2626; cursor: pointer; user-select: none; flex-shrink: 0;">delete</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        if (totalQtyEl) totalQtyEl.textContent = totalQty;
        if (totalCostEl) totalCostEl.innerHTML = `$${Number(totalCostSpent).toLocaleString('es-AR')} <span style="font-size: 0.75rem; color: var(--admin-text-muted); font-weight: 500;">(de $${Number(totalCostNeeded).toLocaleString('es-AR')})</span>`;
    };

    window.toggleAdminCategoryCollapse = function(catSlug) {
        if (window.adminStockExpandedCategories.has(catSlug)) {
            window.adminStockExpandedCategories.delete(catSlug);
        } else {
            window.adminStockExpandedCategories.add(catSlug);
        }
        window.renderAdminStockModule();
    };

    window.toggleAllAdminStockCategoriesCollapse = function() {
        window.adminStockAllHidden = !window.adminStockAllHidden;
        // Al mostrar las categorías, las mantenemos contraídas/plegadas para elegir con cuál trabajar
        window.adminStockExpandedCategories.clear();
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

        // Actualizar métricas nativas del admin y estado del icono global
        const totalItemsEl = document.getElementById('admin-stock-total-items');
        if (totalItemsEl) totalItemsEl.textContent = totalItemsCount;

        const globalIconEl = document.getElementById('admin-stock-global-collapse-icon');
        if (globalIconEl) {
            const isVisible = !window.adminStockAllHidden || Boolean(query);
            globalIconEl.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(-90deg)';
        }

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

        // Si está contraído globalmente y no hay búsqueda escrita, dejar el tbody completamente vacío
        if (window.adminStockAllHidden && !query) {
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

                    const isInCart = Boolean(window.adminStockCart[item.id]);

                    tr.innerHTML = `
                        <td style="padding: 0.65rem 0.85rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <img src="${item.img}" alt="Foto" style="width: 44px; height: 44px; border-radius: var(--admin-radius-sm); object-fit: cover; border: 1px solid var(--admin-border-color); cursor: pointer; flex-shrink: 0;" onclick="window.openAdminStockPhotoModal('${item.id}')" title="Toca para ver foto y editar stock/costo" onerror="this.src='${fallbackImg}'">
                                <div style="display: flex; flex-direction: column; flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                        <span style="font-weight: 700; color: var(--admin-text-main); font-size: 0.88rem;">${item.title}</span>
                                        <span class="col-status-mobile" style="display: none;">${statusBadge}</span>
                                    </div>
                                    <span style="font-family: monospace; font-weight: 700; color: var(--admin-accent); background: var(--admin-accent-light); padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; margin-top: 2px; font-size: 0.75rem;">Código: ${item.id}</span>
                                </div>
                                <button type="button" onclick="window.addToAdminStockCart('${item.id}', '${item.title.replace(/'/g, "\\'")}', '${item.img}', ${item.cost || 0})" title="Agregar al Carrito de Faltantes / Compras" style="border: 1px solid ${isInCart ? 'var(--admin-accent)' : 'var(--admin-border-color)'}; background: ${isInCart ? 'var(--admin-accent-light)' : 'transparent'}; color: ${isInCart ? 'var(--admin-accent)' : 'var(--admin-text-muted)'}; width: 32px; height: 32px; border-radius: var(--admin-radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">add_shopping_cart</span>
                                </button>
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
