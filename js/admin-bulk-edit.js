// js/admin-bulk-edit.js
// --- ADMIN BULK EDIT MODULE ---

(function() {
    let bulkFilterCategory = 'all';
    let bulkSearchQuery = '';
    let bulkOnlyMissingPrice = false;
    let bulkSelectedItems = new Set(); // Set of "rowKey"

    window.toggleBulkFullWidth = function() {
        const viewEl = document.getElementById('admin-bulk-edit-view');
        const btnText = document.getElementById('bulk-width-btn-text');
        const btnIcon = document.querySelector('#btn-toggle-bulk-fullwidth .material-symbols-outlined');
        
        if (!viewEl) return;

        const isFull = viewEl.classList.contains('fullwidth-active');
        if (isFull) {
            viewEl.classList.remove('fullwidth-active');
            if (btnText) btnText.textContent = 'Ancho Completo';
            if (btnIcon) btnIcon.textContent = 'fullscreen';
        } else {
            viewEl.classList.add('fullwidth-active');
            if (btnText) btnText.textContent = 'Ancho Normal';
            if (btnIcon) btnIcon.textContent = 'fullscreen_exit';
        }
    };

    window.initBulkEditAdmin = function() {
        // Asignar listeners del panel de edición masiva
        const searchInput = document.getElementById('admin-bulk-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                bulkSearchQuery = e.target.value;
                renderBulkEditTable();
            });
        }

        const catSelect = document.getElementById('admin-bulk-cat-filter');
        if (catSelect) {
            catSelect.addEventListener('change', (e) => {
                bulkFilterCategory = e.target.value;
                renderBulkEditTable();
            });
        }

        const missingCheckbox = document.getElementById('admin-bulk-missing-check');
        if (missingCheckbox) {
            missingCheckbox.addEventListener('change', (e) => {
                bulkOnlyMissingPrice = e.target.checked;
                renderBulkEditTable();
            });
        }

        // Cargar categorías en el select del filtro
        populateBulkCategorySelect();
        renderBulkEditTable();
    };

    function populateBulkCategorySelect() {
        const select = document.getElementById('admin-bulk-cat-filter');
        if (!select) return;
        
        const currentValue = select.value || bulkFilterCategory || 'all';
        select.innerHTML = '<option value="all">Todas las Categorías</option>';
        
        const sourceData = (window.sessionProducts && Array.isArray(window.sessionProducts) && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : ((typeof window.productsData !== 'undefined' && Array.isArray(window.productsData)) ? window.productsData : (typeof productsData !== 'undefined' ? productsData : []));

        if (sourceData && Array.isArray(sourceData)) {
            sourceData.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = `${cat.name} (${(cat.products || []).length})`;
                if (cat.id === currentValue) opt.selected = true;
                select.appendChild(opt);
            });
        }
        select.value = currentValue;
    }

    // Aplanar productos y variantes en filas para la tabla tipo Excel
    function getBulkRowsData() {
        const rows = [];
        const sourceData = (window.sessionProducts && Array.isArray(window.sessionProducts) && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : ((typeof window.productsData !== 'undefined' && Array.isArray(window.productsData)) ? window.productsData : (typeof productsData !== 'undefined' ? productsData : []));

        if (!sourceData || !Array.isArray(sourceData)) return rows;

        const seenProductIds = new Set();

        sourceData.forEach((cat) => {
            // Ignorar categoría "carpinteria-todos" para evitar duplicados masivos
            if (cat.id && cat.id.endsWith('-todos')) return;

            (cat.products || []).forEach((prod) => {
                if (!prod) return;

                // Filtrar por categoría seleccionada en el combo (si aplica)
                if (bulkFilterCategory !== 'all') {
                    const matchCatId = (cat.id === bulkFilterCategory) || (prod.primaryCatId === bulkFilterCategory);
                    if (!matchCatId) return;
                } else {
                    // Si estamos en "Todas las categorías", deduplicar por ID de producto
                    if (seenProductIds.has(prod.id)) return;
                    seenProductIds.add(prod.id);
                }

                // Filtro de búsqueda por texto
                if (bulkSearchQuery.trim()) {
                    const q = bulkSearchQuery.toLowerCase().trim();
                    const matchTitle = (prod.title || '').toLowerCase().includes(q);
                    const matchId = (prod.id || '').toLowerCase().includes(q);
                    if (!matchTitle && !matchId) return;
                }

                // Extraer variantes o usar producto base
                if (prod.acabados_groups && prod.acabados_groups.length > 0) {
                    prod.acabados_groups.forEach((group, gIdx) => {
                        if (group.hidden) return;
                        const acabName = group.acabado_name || 'Único';

                        if (group.medidas_variants && group.medidas_variants.length > 0) {
                            group.medidas_variants.forEach((v, vIdx) => {
                                if (v.hidden) return;

                                const currentPrice = (v.price !== undefined && v.price !== null && v.price !== '') ? Number(v.price) : 0;
                                const isMissing = currentPrice === 0;

                                if (bulkOnlyMissingPrice && !isMissing) return;

                                rows.push({
                                    rowKey: `${prod.id}_g${gIdx}_v${vIdx}`,
                                    catId: cat.id,
                                    catName: cat.name,
                                    prodId: prod.id,
                                    prodTitle: prod.title,
                                    image: group.cover_image || (group.images_list && group.images_list[0]) || prod.image || 'img/logo_provisional.png',
                                    acabado: acabName,
                                    medida: v.medida || 'Única',
                                    price: currentPrice,
                                    weight: (v.weight !== undefined && v.weight !== null) ? v.weight : ((prod.weight !== undefined && prod.weight !== null) ? prod.weight : ''),
                                    showPrice: v.showPrice !== false,
                                    link: v.link || '',
                                    targetObj: v,
                                    parentProd: prod
                                });
                            });
                        }
                    });
                } else {
                    const currentPrice = prod.price ? Number(prod.price) : 0;
                    const isMissing = currentPrice === 0;

                    if (bulkOnlyMissingPrice && !isMissing) return;

                    rows.push({
                        rowKey: `${prod.id}_base`,
                        catId: cat.id,
                        catName: cat.name,
                        prodId: prod.id,
                        prodTitle: prod.title,
                        image: prod.image || 'img/logo_provisional.png',
                        acabado: 'Único',
                        medida: 'Única',
                        price: currentPrice,
                        weight: (prod.weight !== undefined && prod.weight !== null) ? prod.weight : '',
                        showPrice: true,
                        link: '',
                        targetObj: prod,
                        parentProd: prod
                    });
                }
            });
        });

        return rows;
    }

    window.renderBulkEditTable = function() {
        const tbody = document.getElementById('admin-bulk-edit-tbody');
        const countSpan = document.getElementById('admin-bulk-total-count');
        const missingSpan = document.getElementById('admin-bulk-missing-count');
        if (!tbody) return;

        populateBulkCategorySelect();
        const rows = getBulkRowsData();

        if (countSpan) countSpan.textContent = rows.length;
        const missingCount = rows.filter(r => r.price === 0).length;
        if (missingSpan) missingSpan.textContent = missingCount;

        if (rows.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--admin-text-subtle); font-style: italic;">
                        No se encontraron productos con los filtros aplicados.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        rows.forEach((row) => {
            const tr = document.createElement('tr');
            tr.style.background = (row.price === 0) ? '#FFF9DB' : 'transparent';

            const isChecked = bulkSelectedItems.has(row.rowKey);

            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="bulk-row-check" data-key="${row.rowKey}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
                </td>
                <td style="text-align: center;">
                    <img src="${row.image}" alt="" style="width: 38px; height: 38px; object-fit: cover; border-radius: 6px; border: 1px solid var(--admin-border-color);" onerror="this.src='img/logo_provisional.png';">
                </td>
                <td>
                    <div style="font-weight: 700; font-size: 0.85rem; color: var(--admin-text-main);">${row.prodTitle}</div>
                    <div style="font-size: 0.72rem; color: var(--admin-text-muted);">Cat: ${row.catName} | ID: ${row.prodId}</div>
                </td>
                <td>
                    <span style="display: inline-block; font-size: 0.75rem; background: var(--admin-surface-hover); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--admin-border-color);">
                        ${row.acabado} / ${row.medida}
                    </span>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-weight: 700; color: var(--admin-text-muted);">$</span>
                        <input type="number" class="bulk-price-input" data-key="${row.rowKey}" value="${row.price || ''}" placeholder="0" style="width: 95px; padding: 6px 8px; border: 1.5px solid ${row.price === 0 ? '#E67700' : 'var(--admin-border-strong)'}; border-radius: 6px; font-weight: 800; font-size: 0.9rem; color: #c0510a; background: #fff;">
                        <button type="button" class="bulk-price-vis-btn" data-key="${row.rowKey}" title="${row.showPrice ? 'Precio Visible en Web (Clic para Ocultar)' : 'Precio Oculto en Web (Clic para Mostrar)'}" style="background: transparent; border: none; cursor: pointer; padding: 2px; color: ${row.showPrice ? '#A0715B' : '#94A3B8'}; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">${row.showPrice ? 'visibility' : 'visibility_off'}</span>
                        </button>
                    </div>
                </td>
                <td style="text-align: center;">
                    <input type="number" step="any" min="0" class="bulk-weight-input" data-key="${row.rowKey}" value="${row.weight !== undefined && row.weight !== null ? row.weight : ''}" placeholder="kg" style="width: 70px; padding: 6px 6px; border: 1px solid var(--admin-border-strong); border-radius: 6px; font-weight: 700; font-size: 0.85rem; text-align: center; background: #fff;">
                </td>
                <td>
                    <input type="text" class="bulk-link-input" data-key="${row.rowKey}" value="${row.link}" placeholder="https://articulo.mercadolibre.com.ar/..." style="width: 100%; padding: 4px 8px; border: 1px solid var(--admin-border-color); border-radius: 6px; font-size: 0.75rem; box-sizing: border-box;">
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Re-vincular eventos de inputs en la tabla
        tbody.querySelectorAll('.bulk-row-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const key = e.target.getAttribute('data-key');
                if (e.target.checked) bulkSelectedItems.add(key);
                else bulkSelectedItems.delete(key);
            });
        });

        tbody.querySelectorAll('.bulk-price-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const key = e.target.getAttribute('data-key');
                const val = Number(e.target.value) || 0;
                updateRowObject(key, 'price', val);
            });
        });

        tbody.querySelectorAll('.bulk-weight-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const key = e.target.getAttribute('data-key');
                const val = e.target.value !== '' ? Number(e.target.value) : '';
                updateRowObject(key, 'weight', val);
            });
        });

        tbody.querySelectorAll('.bulk-price-vis-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = btn.getAttribute('data-key');
                const rows = getBulkRowsData();
                const matched = rows.find(r => r.rowKey === key);
                if (matched && matched.targetObj) {
                    const currentShow = matched.targetObj.showPrice !== false;
                    matched.targetObj.showPrice = !currentShow;
                    if (matched.parentProd) matched.parentProd.last_modified = Date.now();
                    renderBulkEditTable();
                }
            });
        });

        tbody.querySelectorAll('.bulk-link-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const key = e.target.getAttribute('data-key');
                updateRowObject(key, 'link', e.target.value.trim());
            });
        });
    };

    function updateRowObject(key, prop, value) {
        const rows = getBulkRowsData();
        const matched = rows.find(r => r.rowKey === key);
        if (matched && matched.targetObj) {
            matched.targetObj[prop] = value;
            if (prop === 'price' && value > 0) {
                matched.targetObj.showPrice = true;
            }
            if (matched.parentProd) {
                matched.parentProd.last_modified = Date.now();
            }
        }
    }

    // Seleccionar/Deseleccionar todos los filtrados
    window.toggleBulkSelectAll = function(isChecked) {
        const rows = getBulkRowsData();
        if (isChecked) {
            rows.forEach(r => bulkSelectedItems.add(r.rowKey));
        } else {
            bulkSelectedItems.clear();
        }
        renderBulkEditTable();
    };

    // Aplicar modificación masiva (Aumento % o Valor Fijo)
    window.applyBulkMassiveChange = function() {
        const type = document.getElementById('admin-bulk-mass-type')?.value;
        const valInput = document.getElementById('admin-bulk-mass-val');
        const amount = Number(valInput?.value) || 0;

        if (amount <= 0) {
            alert('Por favor, ingresá un valor mayor a 0.');
            return;
        }

        const rows = getBulkRowsData();
        const targetRows = rows.filter(r => bulkSelectedItems.size === 0 || bulkSelectedItems.has(r.rowKey));

        if (targetRows.length === 0) {
            alert('No hay productos seleccionados ni visibles para modificar.');
            return;
        }

        let updatedCount = 0;
        targetRows.forEach(r => {
            let currentP = r.price || 0;
            let newP = currentP;

            if (type === 'percent_up') {
                newP = Math.round(currentP * (1 + amount / 100));
            } else if (type === 'percent_down') {
                newP = Math.max(0, Math.round(currentP * (1 - amount / 100)));
            } else if (type === 'fixed_set') {
                newP = amount;
            } else if (type === 'fixed_add') {
                newP = currentP + amount;
            }

            r.targetObj.price = newP;
            r.targetObj.showPrice = newP > 0;
            updatedCount++;
        });

        if (valInput) valInput.value = '';
        renderBulkEditTable();
        alert(`✅ Se actualizaron los precios de ${updatedCount} productos en memoria. No olvides presionar "Guardar Todos los Cambios".`);
    };

    // Edición masiva por Encabezado de Columna
    window.promptBulkHeaderEdit = function(fieldKey) {
        const rows = getBulkRowsData();
        const targetRows = rows.filter(r => bulkSelectedItems.size === 0 || bulkSelectedItems.has(r.rowKey));

        if (targetRows.length === 0) {
            alert('No hay productos seleccionados ni visibles para modificar.');
            return;
        }

        let promptMsg = '';
        let exampleVal = '';

        if (fieldKey === 'price') {
            promptMsg = `Ingresá el nuevo PRECIO ($) que querés aplicar a las ${targetRows.length} filas seleccionadas/visibles:`;
            exampleVal = '15000';
        } else if (fieldKey === 'weight') {
            promptMsg = `Ingresá el nuevo PESO (kg) que querés aplicar a las ${targetRows.length} filas seleccionadas/visibles:`;
            exampleVal = '12.5';
        } else if (fieldKey === 'link') {
            promptMsg = `Ingresá el nuevo LINK Mercado Libre/Cobro que querés aplicar a las ${targetRows.length} filas seleccionadas/visibles:`;
            exampleVal = 'https://mpago.la/...';
        }

        const inputVal = prompt(promptMsg, exampleVal);
        if (inputVal === null) return; // Cancelado por el usuario

        const trimmed = inputVal.trim();
        let count = 0;

        targetRows.forEach(r => {
            if (!r.targetObj) return;

            if (fieldKey === 'price') {
                const numVal = Number(trimmed) || 0;
                r.targetObj.price = numVal;
                r.targetObj.showPrice = numVal > 0;
            } else if (fieldKey === 'weight') {
                r.targetObj.weight = trimmed !== '' ? Number(trimmed) : '';
            } else if (fieldKey === 'link') {
                r.targetObj.link = trimmed;
            }
            if (r.parentProd) r.parentProd.last_modified = Date.now();
            count++;
        });

        renderBulkEditTable();
        alert(`✅ Se actualizó la columna "${fieldKey}" en ${count} productos. No olvides presionar "Guardar Todos los Cambios".`);
    };

    // Conmutar Visibilidad Masiva (Ojo en encabezado de Precios)
    window.toggleBulkHeaderVisibility = function() {
        const rows = getBulkRowsData();
        const targetRows = rows.filter(r => bulkSelectedItems.size === 0 || bulkSelectedItems.has(r.rowKey));

        if (targetRows.length === 0) {
            alert('No hay productos seleccionados ni visibles para modificar.');
            return;
        }

        // Si la mayoría está visible, la opción rápida es ocultarlos todos, o viceversa.
        const visibleCount = targetRows.filter(r => r.showPrice !== false).length;
        const newVisState = visibleCount < (targetRows.length / 2); // Si menos de la mitad están visibles, hacer visibes a todos. Si más de la mitad están visibles, ocultar todos.

        const actionText = newVisState ? 'MOSTRAR (Hacer Visibles)' : 'OCULTAR';
        const confirmToggle = confirm(`¿Deseás ${actionText} el precio de los ${targetRows.length} productos seleccionados/visibles en la Web?`);

        if (!confirmToggle) return;

        let count = 0;
        targetRows.forEach(r => {
            if (r.targetObj) {
                r.targetObj.showPrice = newVisState;
                if (r.parentProd) r.parentProd.last_modified = Date.now();
                count++;
            }
        });

        renderBulkEditTable();
        alert(`✅ Se ${newVisState ? 'mostró' : 'ocultó'} el precio en ${count} productos. No olvides presionar "Guardar Todos los Cambios".`);
    };

    // Guardar cambios a localStorage y servidor
    window.saveBulkEditChanges = async function() {
        const btn = document.getElementById('btn-save-bulk-edit');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Guardando...';
        }

        try {
            // 1. Guardar localmente
            localStorage.setItem('sessionProducts', JSON.stringify(window.sessionProducts));

            // 2. Intentar guardar en backend / API local si está disponible
            try {
                await fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(window.sessionProducts)
                });
            } catch (e) {
                console.warn('[BulkEdit] Servidor estático o sin endpoint /api/save-products. Guardado en localStorage OK.');
            }

            alert('🎉 ¡Todos los precios y cambios fueron guardados exitosamente!');
        } catch (err) {
            console.error('Error al guardar cambios masivos:', err);
            alert('⚠️ Error al guardar los cambios. Revisa la consola.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined">save</span><span>Guardar Todos los Cambios</span>';
            }
        }
    };
})();
