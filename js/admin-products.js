// js/admin-products.js
// --- ADMIN PRODUCTS MODULE ---

window.initProductsAdmin = function() {
    // --- LISTENERS DE PRODUCTOS (FILTROS Y PAGINACIÓN) ---
        const adminSearchInput = document.getElementById('admin-search');
        if (adminSearchInput) {
            adminSearchInput.addEventListener('input', (e) => {
                adminSearchQuery = e.target.value;
                adminCurrentPage = 1;
                renderAdminProducts();
            });
        }

        const filterSelect = document.getElementById('admin-category-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                selectedCategoryIdForProducts = e.target.value;
                adminCurrentPage = 1;
                renderAdminProducts();
            });
        }

        const statusSelect = document.getElementById('admin-status-filter');
        if (statusSelect) {
            statusSelect.addEventListener('change', () => {
                adminCurrentPage = 1;
                renderAdminProducts();
            });
        }

        const btnAdminPrev = document.getElementById('btn-admin-prev');
        if (btnAdminPrev) {
            btnAdminPrev.addEventListener('click', () => {
                if (adminCurrentPage > 1) {
                    adminCurrentPage--;
                    renderAdminProducts();
                }
            });
        }

        const btnAdminNext = document.getElementById('btn-admin-next');
        if (btnAdminNext) {
            btnAdminNext.addEventListener('click', () => {
                adminCurrentPage++;
                renderAdminProducts();
            });
        }

        const btnAddProductMain = document.getElementById('btn-add-product-main');
        if (btnAddProductMain) {
            btnAddProductMain.addEventListener('click', () => {
                let catIdx = 0;
                if (selectedCategoryIdForProducts && selectedCategoryIdForProducts !== 'all') {
                    const idx = sessionProducts.findIndex(c => c.id === selectedCategoryIdForProducts);
                    if (idx !== -1) catIdx = idx;
                }
                if (typeof window.openProductForm === 'function') {
                    window.openProductForm(catIdx, null);
                } else if (typeof openProductForm === 'function') {
                    openProductForm(catIdx, null);
                }
            });
        }


    // --- LISTENERS DE BÚSQUEDA GLOBAL ---

        // Buscador global de productos desde la vista de Estanterías/Categorías
        const categoryTreeSearch = document.getElementById('admin-category-tree-search');
        if (categoryTreeSearch) {
            categoryTreeSearch.addEventListener('input', (e) => {
                const query = e.target.value;
                if (query.trim()) {
                    selectedCategoryIdForProducts = 'all';
                    currentAdminPhase = 'products';
                    adminCurrentPage = 1;
                    adminSearchQuery = query;

                    // Limpiar el buscador inicial para que no quede retenido
                    categoryTreeSearch.value = '';

                    // Sincronizar el input de la vista de productos
                    const mainSearch = document.getElementById('admin-search');
                    if (mainSearch) {
                        mainSearch.value = query;
                        renderAdminUX();
                        mainSearch.focus();
                        const len = mainSearch.value.length;
                        mainSearch.setSelectionRange(len, len);
                    } else {
                        renderAdminUX();
                    }
                }
            });
        }

        // Botón "Ver Todos los Productos" en la vista de Estanterías/Categorías
        const btnShowAllProducts = document.getElementById('btn-admin-show-all-products');
        if (btnShowAllProducts) {
            btnShowAllProducts.addEventListener('click', () => {
                selectedCategoryIdForProducts = 'all';
                currentAdminPhase = 'products';
                adminCurrentPage = 1;
                adminSearchQuery = '';

                const mainSearch = document.getElementById('admin-search');
                if (mainSearch) mainSearch.value = '';

                renderAdminUX();
            });
        }

};

    // Helper para obtener la variante principal/representativa de un producto
    function getProductMainVariantInfo(prod) {
        if (!prod) return null;
        if (prod.acabados_groups && Array.isArray(prod.acabados_groups)) {
            for (let gIdx = 0; gIdx < prod.acabados_groups.length; gIdx++) {
                const g = prod.acabados_groups[gIdx];
                if (g && Array.isArray(g.medidas_variants)) {
                    const mIdx = g.medidas_variants.findIndex(m => m && m.default);
                    if (mIdx !== -1) {
                        return { variant: g.medidas_variants[mIdx], groupIndex: gIdx, variantIndex: mIdx, hasMedidas: true };
                    }
                }
            }
            for (let gIdx = 0; gIdx < prod.acabados_groups.length; gIdx++) {
                const g = prod.acabados_groups[gIdx];
                if (g && Array.isArray(g.medidas_variants) && g.medidas_variants.length > 0) {
                    return { variant: g.medidas_variants[0], groupIndex: gIdx, variantIndex: 0, hasMedidas: true };
                }
            }
            if (prod.acabados_groups.length > 0) {
                return { variant: null, groupIndex: 0, variantIndex: -1, hasMedidas: false };
            }
        }
        return null;
    }

    // Helper para actualizar precio o visibilidad en TODAS las copias de sessionProducts por ID
    function updateProductPriceAndVisibility(productId, newPrice, newShowPrice) {
        if (!Array.isArray(sessionProducts)) return;
        sessionProducts.forEach(cat => {
            if (cat && Array.isArray(cat.products)) {
                cat.products.forEach(p => {
                    if (p && p.id === productId) {
                        if (newPrice !== null && newPrice !== undefined) {
                            p.price = newPrice !== '' ? parseFloat(newPrice) : '';
                        }
                        const vInfo = getProductMainVariantInfo(p);
                        if (vInfo && vInfo.variant) {
                            if (newPrice !== null && newPrice !== undefined) {
                                vInfo.variant.price = newPrice !== '' ? parseFloat(newPrice) : '';
                            }
                            if (newShowPrice !== null && newShowPrice !== undefined) {
                                vInfo.variant.showPrice = newShowPrice;
                            }
                        } else if (vInfo && vInfo.groupIndex !== undefined) {
                            const g = p.acabados_groups[vInfo.groupIndex];
                            if (!g.medidas_variants) g.medidas_variants = [];
                            const newVar = {
                                medida: 'Estándar',
                                price: (newPrice !== null && newPrice !== undefined && newPrice !== '') ? parseFloat(newPrice) : '',
                                showPrice: (newShowPrice !== null && newShowPrice !== undefined) ? newShowPrice : true,
                                default: true,
                                hidden: false
                            };
                            g.medidas_variants.push(newVar);
                        }
                    }
                });
            }
        });
    }

    function renderAdminProducts() {
        const oldTableBody = document.getElementById('admin-products-table-body');
        if (!oldTableBody) return;
        const tableBody = oldTableBody.cloneNode(false);
        oldTableBody.parentNode.replaceChild(tableBody, oldTableBody);

        // Aggregate matching products
        let prods = [];
        const isFilteringTodos = selectedCategoryIdForProducts && selectedCategoryIdForProducts.endsWith('-todos');
        const targetRubroId = isFilteringTodos ? selectedCategoryIdForProducts.replace('-todos', '') : '';

        sessionProducts.forEach((cat, catIdx) => {
            if (cat.id && String(cat.id).endsWith('-todos')) return;

            let matches = false;
            if (selectedCategoryIdForProducts === 'all' || !selectedCategoryIdForProducts) {
                matches = true;
            } else if (isFilteringTodos) {
                // Si filtramos por la categoría general del rubro, incluimos todas las categorías de ese rubro
                const catRubro = cat.rubro || 'carpinteria';
                matches = (catRubro === targetRubroId);
            } else {
                matches = (cat.id === selectedCategoryIdForProducts);
            }

            if (matches && cat.products) {
                cat.products.forEach((prod, pIdx) => {
                    if (!prod || !prod.id) return;
                    const existingIdx = prods.findIndex(p => p.id === prod.id);
                    const isPrimary = prod.primaryCatId ? prod.primaryCatId === cat.id : true;

                    if (existingIdx === -1) {
                        prods.push({
                            ...prod,
                            catIndex: catIdx,
                            prodIndex: pIdx,
                            categoryName: cat.name,
                            categoryId: cat.id
                        });
                    } else if (isPrimary) {
                        // Reemplazar con la categoría primaria para mantener los índices de edición correctos
                        prods[existingIdx] = {
                            ...prod,
                            catIndex: catIdx,
                            prodIndex: pIdx,
                            categoryName: cat.name,
                            categoryId: cat.id
                        };
                    }
                });
            }
        });

        // Status filter
        const statusSelect = document.getElementById('admin-status-filter');
        const statusFilter = statusSelect ? statusSelect.value : 'all';
        
        const isGhostProduct = (p) => {
            return !p.image || p.image === 'img/logo_provisional.png';
        };

        if (statusFilter === 'visibles') {
            prods = prods.filter(p => p.visible !== false);
        } else if (statusFilter === 'ocultos') {
            prods = prods.filter(p => p.visible === false);
        } else if (statusFilter === 'borradores') {
            prods = prods.filter(p => isGhostProduct(p));
        }

        // Search filter
        if (adminSearchQuery) {
            const q = adminSearchQuery.toLowerCase();
            prods = prods.filter(p => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
        }

        // Pagination clamping
        const totalProds = prods.length;
        const totalPages = Math.ceil(totalProds / adminItemsPerPage) || 1;
        if (adminCurrentPage > totalPages) adminCurrentPage = totalPages;
        if (adminCurrentPage < 1) adminCurrentPage = 1;

        const start = (adminCurrentPage - 1) * adminItemsPerPage;
        const paginated = prods.slice(start, start + adminItemsPerPage);

        // Update indicators
        const indicator = document.getElementById('admin-page-indicator');
        if (indicator) {
            indicator.textContent = `Página ${adminCurrentPage} de ${totalPages} (Total: ${totalProds})`;
        }

        const prevBtn = document.getElementById('btn-admin-prev');
        const nextBtn = document.getElementById('btn-admin-next');
        if (prevBtn) prevBtn.disabled = (adminCurrentPage === 1);
        if (nextBtn) nextBtn.disabled = (adminCurrentPage === totalPages);

        if (paginated.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.3; display: block; margin-bottom: 0.5rem;">search_off</span>
                        No se encontraron productos.
                    </td>
                </tr>
            `;
            return;
        }

        const showDragHandle = selectedCategoryIdForProducts !== 'all' && selectedCategoryIdForProducts;
        const dragHandleHtml = showDragHandle 
            ? `<div class="product-drag-handle" title="Mantén presionado para arrastrar y reordenar" style="padding: 0.35rem; background: #e2e8f0; color: #4a5568; border: none; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: grab;"><span class="material-symbols-outlined" style="font-size: 16px;">drag_indicator</span></div>`
            : '';

        paginated.forEach(p => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--admin-border-color)';
            
            const isGhost = isGhostProduct(p);

            const vInfo = getProductMainVariantInfo(p);
            const rawPrice = (vInfo && vInfo.variant && vInfo.variant.price !== undefined && vInfo.variant.price !== '')
                ? vInfo.variant.price
                : (p.price !== undefined && p.price !== '' ? p.price : '');
            const currentPriceVal = rawPrice !== '' ? rawPrice : '';
            const isPriceVisible = (vInfo && vInfo.variant && vInfo.variant.showPrice !== undefined)
                ? (vInfo.variant.showPrice !== false)
                : true;

            row.innerHTML = `
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <div class="product-thumb-drag" title="${showDragHandle ? 'Mantén presionado para arrastrar y reordenar' : ''}" style="width: 44px; height: 44px; border-radius: var(--admin-radius-sm); background-image: url('${p.image}'); background-size: cover; background-position: center; border: 1px solid var(--admin-border-color); flex-shrink: 0; cursor: ${showDragHandle ? 'grab' : 'default'};"></div>
                    </div>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <strong style="color: var(--admin-text-main); font-size: 0.9rem; display: block;">${p.title}</strong>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px; flex-wrap: wrap;">
                        <small style="color: var(--admin-text-muted); font-size: 0.75rem; font-family: monospace;">SKU: ${p.id}</small>
                        ${isGhost ? `<span class="ghost-badge" style="background: var(--admin-warning-light); color: var(--admin-warning); border: 1px solid var(--admin-warning); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; line-height: 1;"><span class="material-symbols-outlined" style="font-size: 13px;">hide_image</span> Borrador (Sin fotos)</span>` : ''}
                    </div>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <span style="background: var(--admin-surface-hover); color: var(--admin-text-secondary); padding: 0.25rem 0.6rem; border-radius: var(--admin-radius-sm); font-size: 0.78rem; font-weight: 600;">
                        ${p.categoryName}
                    </span>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle; text-align: center;">
                    <span style="font-weight: 700; color: var(--admin-accent); font-size: 0.88rem;">
                        ${p.acabados_groups ? p.acabados_groups.length : 1}
                    </span>
                </td>
                <td style="padding: 0.75rem 0.75rem; vertical-align: middle;">
                    <div class="admin-quick-price-container" style="display: inline-flex; align-items: center; gap: 4px; background: var(--admin-surface-hover); padding: 3px 6px; border-radius: 6px; border: 1px solid var(--admin-border-color);">
                        <span style="font-weight: 700; color: var(--admin-text-muted); font-size: 0.82rem; user-select: none;">$</span>
                        <input type="number"
                               class="admin-quick-price-input"
                               data-prod-id="${p.id}"
                               value="${currentPriceVal}"
                               placeholder="Sin precio"
                               title="Editar precio de venta (Enter o desenfocar para guardar)"
                               style="width: 85px; padding: 3px 5px; font-size: 0.85rem; font-weight: 700; border: 1px solid transparent; border-radius: 4px; background: transparent; color: var(--admin-text-main); outline: none; transition: all 0.2s ease;"
                               onfocus="this.style.background='var(--admin-surface)'; this.style.borderColor='var(--admin-accent)';"
                               onblur="this.style.background='transparent'; this.style.borderColor='transparent';"
                               min="0" step="any">
                        <button type="button"
                                class="btn-toggle-quick-price-vis"
                                data-prod-id="${p.id}"
                                data-visible="${isPriceVisible ? 'true' : 'false'}"
                                title="${isPriceVisible ? 'Precio visible al cliente (Clic para ocultar)' : 'Precio oculto al cliente (Clic para mostrar)'}"
                                style="background: none; border: none; cursor: pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center; color: ${isPriceVisible ? 'var(--admin-accent)' : 'var(--admin-text-muted)'}; border-radius: 4px; transition: color 0.15s ease;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">${isPriceVisible ? 'visibility' : 'visibility_off'}</span>
                        </button>
                    </div>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle; text-align: center;">
                    <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
                        <button class="admin-action-btn view btn-toggle-prod-visibility ${p.visible !== false ? '' : 'hidden-mode'}" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="${p.visible !== false ? 'Ocultar producto' : 'Mostrar producto'}" style="padding: 0.35rem; font-size: 0.85rem;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">${p.visible !== false ? 'visibility' : 'visibility_off'}</span>
                        </button>
                        <button class="admin-action-btn edit btn-edit-prod-new" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="Editar" style="padding: 0.35rem; font-size: 0.85rem;"><span class="material-symbols-outlined" style="font-size: 16px;">edit</span></button>
                        <button class="admin-action-btn edit btn-clone-prod-new" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="Clonar" style="padding: 0.35rem; font-size: 0.85rem;"><span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span></button>
                        <button class="admin-action-btn delete btn-del-prod-new" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="Eliminar" style="padding: 0.35rem; font-size: 0.85rem;"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
                    </div>
                </td>
            `;

            if (showDragHandle) {
                row.setAttribute('draggable', 'false');
                row.className = 'product-admin-row';
                row.setAttribute('data-index', p.prodIndex);
                
                const thumb = row.querySelector('.product-thumb-drag');
                if (thumb) {
                    thumb.addEventListener('mousedown', () => row.setAttribute('draggable', 'true'));
                    thumb.addEventListener('touchstart', () => row.setAttribute('draggable', 'true'));
                    thumb.addEventListener('mouseup', () => row.setAttribute('draggable', 'false'));
                    thumb.addEventListener('touchend', () => row.setAttribute('draggable', 'false'));
                }
                
                row.addEventListener('dragstart', (e) => {
                    row.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', p.prodIndex);
                });
                
                row.addEventListener('dragend', () => {
                    row.classList.remove('dragging');
                    row.setAttribute('draggable', 'false');
                });
            }

            // Listener para alternar visibilidad de precio (ojito)
            const btnPriceVis = row.querySelector('.btn-toggle-quick-price-vis');
            if (btnPriceVis) {
                btnPriceVis.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const prodId = btnPriceVis.getAttribute('data-prod-id');
                    const currentlyVis = btnPriceVis.getAttribute('data-visible') === 'true';
                    const nextVis = !currentlyVis;
                    
                    updateProductPriceAndVisibility(prodId, null, nextVis);
                    btnPriceVis.setAttribute('data-visible', nextVis ? 'true' : 'false');
                    const icon = btnPriceVis.querySelector('.material-symbols-outlined');
                    if (icon) icon.textContent = nextVis ? 'visibility' : 'visibility_off';
                    btnPriceVis.style.color = nextVis ? 'var(--admin-accent)' : 'var(--admin-text-muted)';
                    btnPriceVis.title = nextVis ? 'Precio visible al cliente (Clic para ocultar)' : 'Precio oculto al cliente (Clic para mostrar)';
                    
                    showAdminToast(nextVis ? '👁️ Precio visible en la tienda' : '👁️‍🗨️ Precio oculto en la tienda');
                    await saveProductsToServer();
                });
            }

            // Listener para editar precio ultra-rápido (input numérico)
            const priceInput = row.querySelector('.admin-quick-price-input');
            if (priceInput) {
                let initialVal = priceInput.value.trim();
                const saveQuickPrice = async () => {
                    const newVal = priceInput.value.trim();
                    if (newVal === initialVal) return;
                    initialVal = newVal;
                    
                    const prodId = priceInput.getAttribute('data-prod-id');
                    updateProductPriceAndVisibility(prodId, newVal, null);
                    
                    priceInput.style.borderColor = '#10b981';
                    priceInput.style.background = '#ecfdf5';
                    setTimeout(() => {
                        priceInput.style.borderColor = 'transparent';
                        priceInput.style.background = 'transparent';
                    }, 1200);
                    
                    showAdminToast('⚡ Precio actualizado: $' + (newVal || '0'));
                    await saveProductsToServer();
                };

                priceInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        priceInput.blur();
                    }
                });
                priceInput.addEventListener('change', saveQuickPrice);
                priceInput.addEventListener('blur', saveQuickPrice);
            }

            row.querySelector('.btn-toggle-prod-visibility').addEventListener('click', async (e) => {
                const btn = e.target.closest('.btn-toggle-prod-visibility');
                const cIdx = parseInt(btn.getAttribute('data-cat'));
                const pIdx = parseInt(btn.getAttribute('data-prod'));
                const targetProd = sessionProducts[cIdx].products[pIdx];
                const newVisibleState = (targetProd.visible !== false) ? false : true;
                
                // Cambiar la visibilidad globalmente en todas las categorías para mantener consistencia
                sessionProducts.forEach(cat => {
                    if (cat.products) {
                        cat.products.forEach(p => {
                            if (p.id === targetProd.id) {
                                p.visible = newVisibleState;
                            }
                        });
                    }
                });
                
                showAdminToast(newVisibleState ? '👁️ Producto visible' : '👁️ Producto oculto');
                await saveProductsToServer();
                renderAdminProducts();
            });

            row.querySelector('.btn-edit-prod-new').addEventListener('click', (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const pIdx = parseInt(e.currentTarget.getAttribute('data-prod'));
                const targetId = p.id;
                
                // Buscar el objeto vivo actualizado en sessionProducts por ID
                let updatedProd = null;
                if (Array.isArray(sessionProducts)) {
                    for (const cat of sessionProducts) {
                        if (cat.products) {
                            const found = cat.products.find(item => item.id === targetId);
                            if (found) {
                                updatedProd = found;
                                break;
                            }
                        }
                    }
                }
                
                if (typeof window.openProductForm === 'function') {
                    window.openProductForm(cIdx, updatedProd || sessionProducts[cIdx].products[pIdx]);
                } else if (typeof openProductForm === 'function') {
                    openProductForm(cIdx, updatedProd || sessionProducts[cIdx].products[pIdx]);
                }
            });

            row.querySelector('.btn-clone-prod-new').addEventListener('click', (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const pIdx = parseInt(e.currentTarget.getAttribute('data-prod'));
                cloneProduct(cIdx, pIdx);
            });

            row.querySelector('.btn-del-prod-new').addEventListener('click', async (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const pIdx = parseInt(e.currentTarget.getAttribute('data-prod'));
                const catObj = sessionProducts[cIdx];
                if (!catObj || !catObj.products || !catObj.products[pIdx]) return;

                const targetProd = catObj.products[pIdx];
                const prodTitle = targetProd.title;
                const prodId = targetProd.id;
                const catName = catObj.name;
                const catRubro = catObj.rubro || 'carpinteria';

                if (confirm(`¿Eliminar "${prodTitle}"?`)) {
                    try {
                        await fetch('/api/products/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: prodTitle, category: catName, rubro: catRubro })
                        });
                    } catch (error) {
                        console.error('Error al limpiar archivos de producto', error);
                    }

                    // Eliminar el producto de TODAS las categorías donde esté presente (por ID)
                    sessionProducts.forEach(cat => {
                        if (cat.products && Array.isArray(cat.products)) {
                            cat.products = cat.products.filter(p => p.id !== prodId);
                        }
                    });

                    // Eliminar avisos vinculados a este producto de sessionAvisos
                    if (window.sessionAvisos && Array.isArray(window.sessionAvisos)) {
                        const normProdTitle = (prodTitle || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                        window.sessionAvisos = window.sessionAvisos.filter(a => {
                            if (!a) return false;
                            let targetUrl = a.linkUrl || (a.links && a.links[0] ? a.links[0].url : '');
                            let pParam = null;
                            if (targetUrl) {
                                const m = targetUrl.match(/(?:prod|product|p|s)=([^&]+)/);
                                if (m) pParam = decodeURIComponent(m[1]).trim();
                            }
                            const isIdMatch = pParam && (pParam === prodId || pParam.toLowerCase() === prodId.toLowerCase());
                            const normATitle = (a.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^¡?nuevo\s+(ingreso|alquiler):\s*/i, '').replace(/[^a-z0-9]/g, '');
                            const isTitleMatch = normProdTitle && (normATitle === normProdTitle || (normProdTitle.length > 5 && normATitle.includes(normProdTitle)));
                            return !(isIdMatch || isTitleMatch);
                        });
                        try {
                            localStorage.setItem('sessionAvisosAutonomo', JSON.stringify(window.sessionAvisos));
                        } catch (e) {}
                        if (window.syncSiteConfigWithServer) {
                            window.syncSiteConfigWithServer();
                        }
                    }

                    showAdminToast('Producto eliminado');
                    await saveProductsToServer();
                    renderAdminProducts();
                }
            });

            tableBody.appendChild(row);
        });

        // Habilitar dragover y drop en el tbody clonado
        if (showDragHandle) {
            tableBody.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingRow = tableBody.querySelector('.dragging');
                if (!draggingRow) return;
                
                const afterElement = getDragAfterElement(tableBody, e.clientY, '.product-admin-row');
                if (afterElement == null) {
                    tableBody.appendChild(draggingRow);
                } else {
                    tableBody.insertBefore(draggingRow, afterElement);
                }
            });
            
            tableBody.addEventListener('drop', async (e) => {
                e.preventDefault();
                const draggingRow = tableBody.querySelector('.dragging');
                if (!draggingRow) return;
                
                const rows = [...tableBody.querySelectorAll('.product-admin-row')];
                const catIdx = sessionProducts.findIndex(c => c.id === selectedCategoryIdForProducts);
                if (catIdx === -1) return;
                
                const oldProductsList = [...sessionProducts[catIdx].products];
                const newProductsList = [];
                const start = (adminCurrentPage - 1) * adminItemsPerPage;
                
                rows.forEach(r => {
                    const originalIdx = parseInt(r.getAttribute('data-index'));
                    if (!isNaN(originalIdx) && oldProductsList[originalIdx]) {
                        newProductsList.push(oldProductsList[originalIdx]);
                    }
                });
                
                const fullProductsList = [...sessionProducts[catIdx].products];
                for (let i = 0; i < newProductsList.length; i++) {
                    fullProductsList[start + i] = newProductsList[i];
                }

                // Asignar timestamps actualizados para forzar sincronización y no ser pisado por localStorage
                const now = Date.now();
                fullProductsList.forEach((prod, idx) => {
                    prod.order = idx;
                    prod.last_modified = now;
                });
                
                sessionProducts[catIdx].products = fullProductsList;

                // Sincronizar localStorage explícitamente para persistencia inmediata en el cliente
                try {
                    localStorage.setItem('sessionProducts', JSON.stringify(sessionProducts));
                } catch(e) {}
                
                await saveProductsToServer();
                renderAdminProducts();
                showAdminToast('✅ Productos reordenados y guardados físicamente');
            });
        }
    }


    function cloneProduct(cIdx, pIdx) {
        const original = sessionProducts[cIdx].products[pIdx];
        if (!original) return;

        // Deep clone para no arrastrar referencias en memoria
        const cloned = JSON.parse(JSON.stringify(original));

        // Modificar datos clave para evitar colisiones de IDs
        cloned.id      = `${cloned.id}-copia`;
        cloned.title   = `${cloned.title} (Copia)`;
        cloned.isClone = true; // Marcar para que openProductForm sepa que es un clon

        // Abrir el formulario con los datos clonados pre-cargados
        if (typeof window.openProductForm === 'function') {
            window.openProductForm(cIdx, cloned);
        } else if (typeof openProductForm === 'function') {
            openProductForm(cIdx, cloned);
        }

        // Forzar modo "nuevo producto" para que al guardar se inserte, no se sobreescriba
        editingProductId = null;

        // Asegurar que el modal sea visible
        const modal = document.getElementById('admin-product-modal');
        if (modal) modal.style.display = 'flex';

        showAdminToast('📋 Editá el clon y guardalo para añadirlo al catálogo');
    }

    // ── Clonar Categoría ──

    function getIndexedProducts() {
        if (typeof window.getNormalizedCatalogProducts === 'function') {
            return window.getNormalizedCatalogProducts();
        }
        return [];
    }

    // Registrar clicks de búsqueda para rankear acabados en "Más Buscados"
    window.trackSearchClick = function(productId, acabado) {
        try {
            const rankingRaw = localStorage.getItem('searchPopularityRanking') || '{}';
            const ranking = JSON.parse(rankingRaw);
            
            // Incrementar popularidad del producto base
            ranking[productId] = (ranking[productId] || 0) + 1;
            
            // Incrementar popularidad del acabado específico si aplica
            if (acabado) {
                const key = `${productId}::${acabado}`;
                ranking[key] = (ranking[key] || 0) + 1;
            }
            
            localStorage.setItem('searchPopularityRanking', JSON.stringify(ranking));
            console.log(`[Search Tracking] Click registrado. Prod: ${productId}, Acabado: ${acabado || 'Ninguno'}`);
        } catch (e) {
            console.error('[Search Tracking] Error al guardar popularidad:', e);
        }
    };

    // 6. Search View — Real-time search
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchEmptyState = document.getElementById('search-empty-state');

    const normalizeForSearch = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    // Fonetización en español para tolerar tipeo informal/errores (c/k/q, z/s, b/v, y/ll, h muda)
    const phoneticNormalize = (str) => {
        if (!str || typeof str !== 'string') return '';
        let s = normalizeForSearch(str);
        s = s.replace(/qu/g, 'k').replace(/q/g, 'k')
             .replace(/c(?=[eiy])/g, 's').replace(/c(?=[aou])/g, 'k').replace(/c$/g, 'k')
             .replace(/z/g, 's')
             .replace(/v/g, 'b')
             .replace(/h/g, '')
             .replace(/y(?=[aeiou])/g, 'll')
             .replace(/([a-z])\1+/g, '$1');
        return s;
    };

    // Stemming morfológico en español para unificar singular/plural y diminutivos de compra sin cortar raíces
    const stemWord = (word) => {
        if (!word || word.length < 3) return word;
        let w = word;
        if (w.length > 5 && (w.endsWith('quitos') || w.endsWith('quitas'))) w = w.slice(0, -6) + 'co';
        else if (w.length > 4 && (w.endsWith('quito') || w.endsWith('quita'))) w = w.slice(0, -5) + 'co';
        else if (w.length > 5 && (w.endsWith('citos') || w.endsWith('citas'))) w = w.slice(0, -5);
        else if (w.length > 4 && (w.endsWith('cito') || w.endsWith('cita'))) w = w.slice(0, -4);
        else if (w.length > 5 && (w.endsWith('itos') || w.endsWith('itas'))) w = w.slice(0, -4);
        else if (w.length > 4 && (w.endsWith('ito') || w.endsWith('ita'))) w = w.slice(0, -3);

        if (w.length > 4 && w.endsWith('ces')) w = w.slice(0, -3) + 'z';
        else if (w.length > 4 && w.endsWith('es') && /[rlndzj]es$/.test(w)) w = w.slice(0, -2);
        else if (w.length > 3 && w.endsWith('s')) w = w.slice(0, -1);

        if (w.length >= 4 && /[oae]$/.test(w)) w = w.slice(0, -1);
        return w;
    };

    const tokenizeWords = (str) => {
        if (!str || typeof str !== 'string') return [];
        return normalizeForSearch(str)
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 2);
    };

    const matchTermInWords = (term, words, allowFuzzy = false) => {
        const termStem = stemWord(term);
        const termPhon = phoneticNormalize(term);
        const termPhonStem = stemWord(termPhon);

        for (const word of words) {
            if (word === term) return 100;

            const wStem = stemWord(word);
            if (wStem.length >= 3 && termStem.length >= 3) {
                if (wStem === termStem) return 95;
                if (word.startsWith(term) && term.length >= 3) return 85;
                if (wStem.startsWith(termStem) && termStem.length >= 4) return 85;
            } else if (word.startsWith(term) && term.length >= 2) {
                return 80;
            }

            if (allowFuzzy && term.length >= 4 && word.length >= 4) {
                const wPhon = phoneticNormalize(word);
                const wPhonStem = stemWord(wPhon);
                if (wPhon === termPhon || (wPhonStem.length >= 3 && wPhonStem === termPhonStem)) return 75;
                if (Math.abs(term.length - word.length) <= 2) {
                    if (getSimilarityRatio(term, word) >= 0.82) return 70;
                    if (getSimilarityRatio(termPhon, wPhon) >= 0.85) return 68;
                }
            }
        }
        return 0;
    };

    // Levenshtein distance string similarity ratio
    const getSimilarityRatio = (str1, str2) => {
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        if (s1 === s2) return 1.0;
        if (s1.length === 0 || s2.length === 0) return 0.0;
        
        const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
        for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
        for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
        
        for (let j = 1; j <= s2.length; j += 1) {
            for (let i = 1; i <= s1.length; i += 1) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j - 1][i] + 1, // deletion
                    track[j][i - 1] + 1, // insertion
                    track[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        
        const distance = track[s2.length][s1.length];
        const maxLength = Math.max(s1.length, s2.length);
        return (maxLength - distance) / maxLength;
    };

    // Filters out conversational stop words and Spanish punctuation to enable conversational searches
    const getCleanSearchTerms = (text) => {
        const stopWords = new Set([
            "necesito", "quiero", "busco", "comprar", "tenes", "tienen", "hola", "por", "favor", 
            "gracias", "para", "de", "con", "un", "una", "unos", "unas", "el", "la", "los", "las",
            "y", "o", "en", "al", "del", "lo"
        ]);
        const clean = normalizeForSearch(text)
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
            .split(/\s+/)
            .filter(word => word.length > 1 && !stopWords.has(word));
        return clean;
    };

    // Estado del rubro activo en la vista de búsqueda
    window.activeSearchRubro = 'carpinteria';

    function renderSearchRubrosTabs() {
        const container = document.getElementById('search-rubros-tabs-container');
        if (!container) return;

        const rubrosList = (window.siteConfig && window.siteConfig.rubros) || [
            { id: "carpinteria", name: "Carpintería", icon: "🪵" }
        ];

        // Solo mostrar rubros visibles
        const visibleRubros = rubrosList.filter(r => r.visible !== false);

        if (visibleRubros.length <= 1) {
            container.classList.add('single-rubro');
            container.innerHTML = '';
            // Si solo hay uno, asegurar que sea el activo para el filtrado lógico
            if (visibleRubros.length === 1) {
                window.activeSearchRubro = visibleRubros[0].id;
            }
            return;
        } else {
            container.classList.remove('single-rubro');
        }

        container.innerHTML = '';
        visibleRubros.forEach(r => {
            const isActive = r.id === window.activeSearchRubro;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = isActive ? 'rubros-tab active' : 'rubros-tab';
            
            // Forzar ancho geométrico exacto por JS inline
            const pct = (100 / visibleRubros.length).toFixed(4);
            btn.style.width = pct + '%';
            btn.style.flex = `0 0 ${pct}%`;

            btn.innerHTML = r.name;
            btn.addEventListener('click', () => {
                window.activeSearchRubro = r.id;
                renderSearchRubrosTabs();
                runSearch();
            });
            container.appendChild(btn);
        });
    }

    
    // Helper Central: Formateador de Precio y Helper de Rango de Precios
    const feedCurrencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

    function getProductPriceDisplay(product, specificAcabadoName = null) {
        if (!product) return '<span class="feed-card-price-custom">Consultar precio</span>';
        
        let allPrices = [];
        
        // Si hay un acabado específico seleccionado
        if (specificAcabadoName && product.acabados_groups && Array.isArray(product.acabados_groups)) {
            const grp = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === specificAcabadoName.trim().toLowerCase());
            if (grp && grp.medidas_variants) {
                grp.medidas_variants.forEach(m => {
                    if (m && m.hidden !== true && m.showPrice !== false && m.price !== undefined && m.price !== '' && !isNaN(parseFloat(m.price))) {
                        allPrices.push(parseFloat(m.price));
                    }
                });
            }
        }
        
        // Si no se encontraron o es general para toda la tarjeta de categoría
        if (allPrices.length === 0) {
            if (product.acabados_groups && Array.isArray(product.acabados_groups)) {
                product.acabados_groups.forEach(g => {
                    if (g && g.hidden !== true && g.medidas_variants) {
                        g.medidas_variants.forEach(m => {
                            if (m && m.hidden !== true && m.showPrice !== false && m.price !== undefined && m.price !== '' && !isNaN(parseFloat(m.price))) {
                                allPrices.push(parseFloat(m.price));
                            }
                        });
                    }
                });
            }
            if (product.medidas_variants && Array.isArray(product.medidas_variants)) {
                product.medidas_variants.forEach(m => {
                    if (m && m.hidden !== true && m.showPrice !== false && m.price !== undefined && m.price !== '' && !isNaN(parseFloat(m.price))) {
                        allPrices.push(parseFloat(m.price));
                    }
                });
            }
        }

        if (allPrices.length === 0) {
            return '<span class="feed-card-price-custom">Consultar precio</span>';
        }

        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);

        if (minPrice === maxPrice) {
            return `<span class="feed-card-price-current">${feedCurrencyFormatter.format(minPrice)}</span>`;
        } else {
            return `<span class="feed-card-price-prefix">Desde</span><span class="feed-card-price-current">${feedCurrencyFormatter.format(minPrice)}</span>`;
        }
    }

    // Helper para verificar si un producto o variante está en el carrito
    function checkProductCartStatus(productId, acabadoName = '') {
        try {
            const raw = localStorage.getItem('cartItems');
            if (!raw) return false;
            const items = JSON.parse(raw);
            return items.some(item => 
                String(item.id) === String(productId) &&
                (!acabadoName || (item.acabado || '').trim().toLowerCase() === acabadoName.trim().toLowerCase())
            );
        } catch(e) { return false; }
    }

    // Helper para verificar si está en favoritos
    
    // Helper de Compartir Producto desde Feed
    
    // Helper Central Reutilizable: Crea una tarjeta feed-card completa e interactiva con el nuevo diseño
    function createFeedProductCard(product, options = {}) {
        const catName = options.catName || '';
        const acabado = options.acabado || (product.acabados_groups && product.acabados_groups[0]?.acabado_name) || '';
        const imageOverride = options.imageOverride || null;
        const extraClass = options.extraClass || '';

        const card = document.createElement('div');
        card.className = ('feed-card ' + extraClass).trim();
        
        const isFav = checkProductFavStatus(product.id, acabado);
        const inCart = checkProductCartStatus(product.id, acabado);
        const priceHtml = getProductPriceDisplay(product, acabado);
        const coverImg = imageOverride || (Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png'));

        // Badge flotante superior izquierdo
        const variantsCount = (product.acabados_groups && product.acabados_groups.length) || 0;
        let badgeHtml = '';
        if (variantsCount > 1) {
            badgeHtml = `<div class="feed-card-floating-badge" title="${variantsCount} acabados disponibles">
                <span class="material-symbols-outlined" style="font-size: 14px; color: #f59e0b;">palette</span>
                <span>${variantsCount} acabados</span>
            </div>`;
        } else if (acabado && acabado.toLowerCase() !== 'único' && acabado.toLowerCase() !== 'unico' && acabado.toLowerCase() !== 'estándar') {
            badgeHtml = `<div class="feed-card-floating-badge" title="Acabado: ${acabado}">
                <span class="material-symbols-outlined" style="font-size: 14px; color: #f59e0b;">palette</span>
                <span>${acabado}</span>
            </div>`;
        }

        const safeTitle = (product.title || '').replace(/"/g, '&quot;');

        card.innerHTML = `
            <div class="feed-card-photo-container">
                <img src="${coverImg}" class="feed-card-img lazy-img" alt="${safeTitle}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded'); if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                ${badgeHtml}
                <!-- Botones Flotantes: 1. Corazón, 2. Carrito, 3. Compartir -->
                <div class="feed-card-actions-float">
                    <button type="button" class="feed-action-btn btn-feed-fav ${isFav ? 'is-fav' : ''}" title="${isFav ? 'Guardado en favoritos' : 'Guardar en favoritos'}">
                        <span class="material-symbols-outlined" style="font-size: 18px;">${isFav ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <button type="button" class="feed-action-btn btn-feed-cart ${inCart ? 'in-cart' : ''}" title="${inCart ? 'Ya está en el carrito' : 'Agregar al carrito'}">
                        <span class="material-symbols-outlined" style="font-size: 18px;">${inCart ? 'shopping_bag' : 'add_shopping_cart'}</span>
                    </button>
                    <button type="button" class="feed-action-btn btn-feed-share" title="Compartir producto">
                        <span class="material-symbols-outlined" style="font-size: 18px;">share</span>
                    </button>
                </div>
            </div>
            <div class="feed-card-info">
                <div class="feed-card-title-container">
                    <h3 class="feed-card-title" title="${safeTitle}">${product.title}</h3>
                </div>
                <div class="feed-card-price-row">
                    ${priceHtml}
                </div>
            </div>
        `;

        // Marquee al desbordar
        setTimeout(() => {
            const titleEl = card.querySelector('.feed-card-title');
            if (titleEl && titleEl.scrollWidth > titleEl.clientWidth + 2) {
                titleEl.classList.add('has-overflow');
            }
        }, 80);

        // Soporte táctil en mobile
        let touchTimer = null;
        card.addEventListener('touchstart', () => {
            touchTimer = setTimeout(() => card.classList.add('is-active-marquee'), 250);
        }, { passive: true });
        card.addEventListener('touchend', () => {
            clearTimeout(touchTimer);
            setTimeout(() => card.classList.remove('is-active-marquee'), 2000);
        }, { passive: true });

        // Click en Corazón
        const favBtn = card.querySelector('.btn-feed-fav');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.CarritoModule && window.CarritoModule.toggle) {
                    window.CarritoModule.toggle(product, acabado || 'Único', catName || '');
                    const isNowFav = checkProductFavStatus(product.id, acabado);
                    favBtn.classList.toggle('is-fav', isNowFav);
                    favBtn.querySelector('.material-symbols-outlined').textContent = isNowFav ? 'favorite' : 'favorite_border';
                    const cartBtn = card.querySelector('.btn-feed-cart');
                    if (cartBtn) {
                        cartBtn.classList.toggle('in-cart', isNowFav);
                        cartBtn.querySelector('.material-symbols-outlined').textContent = isNowFav ? 'shopping_bag' : 'add_shopping_cart';
                    }
                }
            });
        }

        // Click en Carrito
        const cartBtn = card.querySelector('.btn-feed-cart');
        if (cartBtn) {
            cartBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.CarritoModule && window.CarritoModule.toggle) {
                    window.CarritoModule.toggle(product, acabado || 'Único', catName || '');
                    const isNowCart = checkProductCartStatus(product.id, acabado);
                    cartBtn.classList.toggle('in-cart', isNowCart);
                    cartBtn.querySelector('.material-symbols-outlined').textContent = isNowCart ? 'shopping_bag' : 'add_shopping_cart';
                    if (favBtn) {
                        favBtn.classList.toggle('is-fav', isNowCart);
                        favBtn.querySelector('.material-symbols-outlined').textContent = isNowCart ? 'favorite' : 'favorite_border';
                    }
                }
            });
        }

        // Click en Compartir
        const shareBtn = card.querySelector('.btn-feed-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleShareProduct(product, acabado || '');
            });
        }

        // Click en Tarjeta
        card.addEventListener('click', () => {
            if (window.trackSearchClick) window.trackSearchClick(product.id, acabado);
            if (window.showProductDetail) {
                window.showProductDetail(product, catName || '', acabado || '');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                const appContainer = document.getElementById('app-container');
                if (appContainer) appContainer.scrollTop = 0;
            }
        });

        return card;
    }

    function handleShareProduct(product, acabadoName = '') {
        try {
            const origin = window.location.origin;
            const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
            let shareUrl = `${origin}${path}/?prod=${encodeURIComponent(product.id)}`;
            
            if (acabadoName) {
                shareUrl += `&acabado=${encodeURIComponent(acabadoName)}`;
            }

            // Si hay acortador disponible para ficha técnica corta
            if (window.TarimaShortener && typeof window.TarimaShortener.encodeShortCode === 'function') {
                const shortCode = window.TarimaShortener.encodeShortCode(product.id, acabadoName, '', '', false);
                if (shortCode) {
                    shareUrl = `${origin}${path}/p/${shortCode}.html`;
                }
            }

            const title = product.title + (acabadoName ? ` (${acabadoName})` : '');
            const shareText = `🪵 ¡Mirá este mueble en La Tarima!: ${title}`;

            const showToast = (msg) => {
                const toast = document.getElementById('admin-toast');
                if (toast) {
                    toast.textContent = msg;
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 2200);
                } else {
                    alert(msg);
                }
            };

            if (navigator.share) {
                navigator.share({
                    title: title,
                    text: shareText,
                    url: shareUrl
                }).catch(err => {
                    if (err && err.name !== 'AbortError') {
                        copyToClipboard(`${shareText} ${shareUrl}`, showToast);
                    }
                });
            } else {
                copyToClipboard(shareUrl, showToast);
            }
        } catch(e) {
            console.error('Error sharing product:', e);
        }
    }

    function copyToClipboard(text, callback) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => callback("🔗 ¡Enlace del producto copiado!"));
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            callback("🔗 ¡Enlace del producto copiado!");
        }
    }

    function checkProductFavStatus(productId, acabadoName = '') {
        return checkProductCartStatus(productId, acabadoName);
    }

    
    // ══════════════════════════════════════════════════════════════════════════
    // 🔍 Desplegable de Últimas 3 Búsquedas estilo Mercado Libre (en el mismo buscador)
    // ══════════════════════════════════════════════════════════════════════════
    const SEARCH_HISTORY_KEY = 'tarima_recent_searches';

    function getSearchHistory() {
        try {
            const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.slice(0, 3) : [];
        } catch(e) { return []; }
    }

    function saveSearchTerm(term) {
        if (!term || typeof term !== 'string') return;
        const clean = term.trim();
        if (clean.length < 2) return;
        try {
            let history = getSearchHistory();
            history = history.filter(item => item.toLowerCase() !== clean.toLowerCase());
            history.unshift(clean);
            if (history.length > 3) history = history.slice(0, 3);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
        } catch(e) {}
    }

    function removeSearchHistoryItem(termToRemove) {
        try {
            let history = getSearchHistory();
            history = history.filter(item => item.toLowerCase() !== termToRemove.toLowerCase());
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
            renderRecentSearchesDropdown();
        } catch(e) {}
    }

    function hideRecentSearchesDropdown() {
        const dropdown = document.getElementById('search-recent-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }

    function renderRecentSearchesDropdown() {
        const dropdown = document.getElementById('search-recent-dropdown');
        if (!dropdown || !searchInput) return;

        const currentVal = searchInput.value.trim();
        const history = getSearchHistory();

        // Solo mostrar cuando el buscador está enfocado, vacío y hay búsquedas recientes (hasta 3)
        if (currentVal.length > 0 || history.length === 0 || document.activeElement !== searchInput) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = '';
        history.slice(0, 3).forEach(term => {
            const row = document.createElement('div');
            row.className = 'search-recent-item';
            row.innerHTML = `
                <div class="search-recent-item-left">
                    <span class="material-symbols-outlined search-recent-icon">schedule</span>
                    <span class="search-recent-text"></span>
                </div>
                <span class="material-symbols-outlined search-recent-remove" title="Quitar del historial" role="button" aria-label="Quitar">close</span>
            `;
            row.querySelector('.search-recent-text').textContent = term;

            // Usar mousedown para que ejecute antes de que el input pierda foco
            row.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (e.target.closest('.search-recent-remove')) {
                    removeSearchHistoryItem(term);
                    return;
                }
                searchInput.value = term;
                if (btnClearSearch) btnClearSearch.style.display = 'flex';
                hideRecentSearchesDropdown();
                saveSearchTerm(term);
                window.runSearch();
            });

            dropdown.appendChild(row);
        });

        dropdown.style.display = 'block';
    }

    window.showRecentSearchesDropdown = renderRecentSearchesDropdown;
    window.hideRecentSearchesDropdown = hideRecentSearchesDropdown;

    function runSearch() {
        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
        if (!searchResultsContainer || typeof sourceData === 'undefined') return;
        
        // Dibujar los tabs del buscador si no se han dibujado
        renderSearchRubrosTabs();

        const rawQuery = searchInput ? searchInput.value : '';
        const query = normalizeForSearch(rawQuery).trim();

        // 🔍 Detector Inteligente de Número de Orden / Seguimiento de Pedidos
        const cleanDigits = rawQuery.replace(/[^0-9]/g, '').trim();
        if (cleanDigits.length >= 6) {
            const allOrders = (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) ? ordersData : [];
            const matchedOrder = allOrders.find(o => String(o.id).trim() === cleanDigits);
            if (matchedOrder) {
                if (window.navigateToView) {
                    window.navigateToView('view-pedidos', { orderId: matchedOrder.id });
                }
                return;
            }
        }

        const activeView = document.querySelector('.view.active');
        if (activeView && activeView.id === 'view-catalogo') {
            const iframe = document.querySelector('#view-catalogo iframe');
            if (iframe && iframe.contentWindow && iframe.contentWindow.filterCatalogAZ) {
                iframe.contentWindow.filterCatalogAZ(query);
            }
            return;
        } else if (activeView && activeView.id === 'view-mayorista') {
            const iframe = document.querySelector('#view-mayorista iframe');
            if (iframe && iframe.contentWindow && iframe.contentWindow.filterWholesaleCatalog) {
                iframe.contentWindow.filterWholesaleCatalog(query);
            }
            return;
        }

        const indexed = getIndexedProducts();
        
        // 1. Filtrar por rubro del producto
        const rubroFiltered = indexed.filter(item => {
            const itemRubro = item.cat ? (item.cat.rubro || 'carpinteria') : 'carpinteria';
            return itemRubro === window.activeSearchRubro;
        });

        // Dividir la consulta en términos limpios (ej: "necesito mesa y baranda" -> ["mesa", "baranda"])
        const queryTerms = getCleanSearchTerms(rawQuery);
        
        if (queryTerms.length === 0 && rawQuery.trim() !== '') {
            searchResultsContainer.innerHTML = '';
            if (searchEmptyState) searchEmptyState.style.display = 'flex';
            return;
        }

        // Evaluación por niveles de relevancia (Tiers) para evitar que tags secundarios o descripciones contaminen búsquedas específicas
        const evaluateItemForTerm = (item, term) => {
            const titleWords = tokenizeWords(item.nombre || '');
            const catWords = tokenizeWords(item.cat && item.cat.name ? item.cat.name : '');
            const acabadoWords = tokenizeWords((item.acabado || '') + ' ' + (item.acabadosSearch || ''));

            // Nivel 1: Coincidencia directa o morfológica en el Título del producto
            const titleExact = matchTermInWords(term, titleWords, false);
            if (titleExact > 0) return { tier: 1, score: titleExact + 200 };

            // Nivel 1B: Coincidencia en Medidas (si contiene números) o Acabado específico
            if (/\d/.test(term) && Array.isArray(item.medidas)) {
                const normTermNoSpaces = term.replace(/[\s\-\_cmx]/g, '');
                const hasMedida = item.medidas.some(medida => {
                    const normMedida = normalizeForSearch(medida);
                    if (normMedida.includes(term)) return true;
                    const normMedidaClean = normMedida.replace(/[\s\-\_cmx]/g, '');
                    return normTermNoSpaces.length >= 2 && normMedidaClean.includes(normTermNoSpaces);
                });
                if (hasMedida) return { tier: 1, score: 250 };
            }
            const acabExact = matchTermInWords(term, acabadoWords, false);
            if (acabExact > 0) return { tier: 1, score: acabExact + 180 };

            // Nivel 2: Coincidencia exacta/morfológica en el Nombre de Categoría
            const catExact = matchTermInWords(term, catWords, false);
            if (catExact > 0) return { tier: 2, score: catExact + 100 };

            // Nivel 3: Tolerancia a errores de tipeo (fonética / Levenshtein estricto) en Título o Categoría
            const titleFuzzy = matchTermInWords(term, titleWords, true);
            if (titleFuzzy > 0) return { tier: 3, score: titleFuzzy + 50 };
            const catFuzzy = matchTermInWords(term, catWords, true);
            if (catFuzzy > 0) return { tier: 3, score: catFuzzy + 40 };

            // Nivel 4: Coincidencia en Tags (tokenizados por palabra, solo actúa como respaldo si no hay Nivel 1..3)
            const tagWords = [];
            if (Array.isArray(item.tags)) {
                item.tags.forEach(t => tagWords.push(...tokenizeWords(t)));
            }
            const tagMatch = matchTermInWords(term, tagWords, false);
            if (tagMatch > 0) return { tier: 4, score: tagMatch };

            // Nivel 5: Coincidencia exacta/raíz en Descripción (último respaldo)
            const descText = (item.product && item.product.description) || item.description || '';
            const descWords = tokenizeWords(descText).filter(w => w.length >= 4);
            const descMatch = matchTermInWords(term, descWords, false);
            if (descMatch >= 95) return { tier: 5, score: 30 };

            return null;
        };

        let results = [];

        if (queryTerms.length === 0) {
            results = [...rubroFiltered];
            results.sort((a, b) => {
                const nameA = (a.nombre || '').toLowerCase();
                const nameB = (b.nombre || '').toLowerCase();
                return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
            });
        } else {
            // Evaluar cada producto con lógica AND primero
            let scoredItems = [];
            rubroFiltered.forEach(item => {
                const termEvals = queryTerms.map(t => evaluateItemForTerm(item, t));
                if (termEvals.every(Boolean)) {
                    const worstTier = Math.max(...termEvals.map(e => e.tier));
                    const totalScore = termEvals.reduce((acc, e) => acc + e.score, 0);
                    scoredItems.push({ item, tier: worstTier, score: totalScore, matchedCount: queryTerms.length });
                }
            });

            // Si hay varios términos y la búsqueda AND dio solo coincidencias débiles (Tier >= 4) o ninguna,
            // verificar si todos los términos tienen coincidencias fuertes (Tier 1..2) por separado (ej. "mesa y escalera")
            const hasStrongAnd = scoredItems.some(s => s.tier <= 3);
            if (!hasStrongAnd && queryTerms.length > 1) {
                const orScored = [];
                rubroFiltered.forEach(item => {
                    const termEvals = queryTerms.map(t => evaluateItemForTerm(item, t)).filter(Boolean);
                    if (termEvals.length > 0) {
                        const bestTier = Math.min(...termEvals.map(e => e.tier));
                        const totalScore = termEvals.reduce((acc, e) => acc + e.score, 0);
                        if (bestTier <= 2 || scoredItems.length === 0) {
                            orScored.push({ item, tier: bestTier, score: totalScore, matchedCount: termEvals.length });
                        }
                    }
                });
                if (orScored.length > 0) {
                    scoredItems = orScored;
                }
            }

            if (scoredItems.length > 0) {
                // Filtrar por el mejor nivel de relevancia encontrado (si hay coincidencias en Título [Tier 1], descartar ruido de Tags/Descripción)
                const bestTierFound = Math.min(...scoredItems.map(s => s.tier));
                const filteredScored = scoredItems.filter(s => s.tier <= bestTierFound);

                filteredScored.sort((a, b) => {
                    if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
                    if (a.tier !== b.tier) return a.tier - b.tier;
                    if (b.score !== a.score) return b.score - a.score;
                    const nameA = (a.item.nombre || '').toLowerCase();
                    const nameB = (b.item.nombre || '').toLowerCase();
                    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
                });

                results = filteredScored.map(s => s.item);
            }
        }

        searchResultsContainer.innerHTML = '';

        if (results.length === 0) {
            if (searchEmptyState) searchEmptyState.style.display = 'flex';
            return;
        }
        if (searchEmptyState) searchEmptyState.style.display = 'none';

        results.forEach(item => {
            const { product, cat, nombre, acabado, image } = item;
            const card = document.createElement('div');
            card.className = 'feed-card';
            
            const isFav = checkProductFavStatus(product.id, acabado);
            const inCart = checkProductCartStatus(product.id, acabado);
            const priceHtml = getProductPriceDisplay(product, acabado);
            const productCover = Array.isArray(image) ? image[0] : (image || 'img/logo_provisional.png');

            // 1. Badge flotante de variante / color (Icono 3)
            const acabadoBadge = acabado 
                ? `<div class="feed-card-floating-badge" title="Acabado: ${acabado}">
                    <span class="material-symbols-outlined" style="font-size: 14px; color: #f59e0b;">palette</span>
                    <span>${acabado}</span>
                   </div>`
                : '';

            card.innerHTML = `
                <div class="feed-card-photo-container">
                    <img src="${productCover}" class="feed-card-img lazy-img" alt="${nombre}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded'); if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                    ${acabadoBadge}
                    <!-- Iconos Flotantes: Corazón (1) y Carrito (2) -->
                    <div class="feed-card-actions-float">
                        <button type="button" class="feed-action-btn btn-feed-fav ${isFav ? 'is-fav' : ''}" title="${isFav ? 'Guardado en favoritos' : 'Guardar en favoritos'}">
                            <span class="material-symbols-outlined" style="font-size: 18px;">${isFav ? 'favorite' : 'favorite_border'}</span>
                        </button>
                        <button type="button" class="feed-action-btn btn-feed-cart ${inCart ? 'in-cart' : ''}" title="${inCart ? 'Ya está en el carrito' : 'Agregar al carrito'}">
                            <span class="material-symbols-outlined" style="font-size: 18px;">${inCart ? 'shopping_bag' : 'add_shopping_cart'}</span>
                        </button>
                        <button type="button" class="feed-action-btn btn-feed-share" title="Compartir producto">
                            <span class="material-symbols-outlined" style="font-size: 18px;">share</span>
                        </button>
                    </div>
                </div>
                <div class="feed-card-info">
                    <div class="feed-card-title-container">
                        <h3 class="feed-card-title" title="${nombre}">${nombre}</h3>
                    </div>
                    <div class="feed-card-price-row">
                        ${priceHtml}
                    </div>
                </div>
            `;

            // Detectar si el título desborda para activar el marquee
            setTimeout(() => {
                const titleEl = card.querySelector('.feed-card-title');
                if (titleEl && titleEl.scrollWidth > titleEl.clientWidth + 2) {
                    titleEl.classList.add('has-overflow');
                }
            }, 60);

            // Soporte táctil en mobile para activar animación al mantener presionado
            let touchTimer = null;
            card.addEventListener('touchstart', () => {
                touchTimer = setTimeout(() => card.classList.add('is-active-marquee'), 250);
            }, { passive: true });
            card.addEventListener('touchend', () => {
                clearTimeout(touchTimer);
                setTimeout(() => card.classList.remove('is-active-marquee'), 2000);
            }, { passive: true });

            // Click en Corazón
            const favBtn = card.querySelector('.btn-feed-fav');
            if (favBtn) {
                favBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.CarritoModule && window.CarritoModule.toggle) {
                        window.CarritoModule.toggle(product, acabado || 'Único', cat.name);
                        const isNowFav = checkProductFavStatus(product.id, acabado);
                        favBtn.classList.toggle('is-fav', isNowFav);
                        favBtn.querySelector('.material-symbols-outlined').textContent = isNowFav ? 'favorite' : 'favorite_border';
                        const cartBtn = card.querySelector('.btn-feed-cart');
                        if (cartBtn) {
                            cartBtn.classList.toggle('in-cart', isNowFav);
                            cartBtn.querySelector('.material-symbols-outlined').textContent = isNowFav ? 'shopping_bag' : 'add_shopping_cart';
                        }
                    }
                });
            }

            // Click en Carrito Rápido
            const cartBtn = card.querySelector('.btn-feed-cart');
            if (cartBtn) {
                cartBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.CarritoModule && window.CarritoModule.toggle) {
                        window.CarritoModule.toggle(product, acabado || 'Único', cat.name);
                        const isNowCart = checkProductCartStatus(product.id, acabado);
                        cartBtn.classList.toggle('in-cart', isNowCart);
                        cartBtn.querySelector('.material-symbols-outlined').textContent = isNowCart ? 'shopping_bag' : 'add_shopping_cart';
                        if (favBtn) {
                            favBtn.classList.toggle('is-fav', isNowCart);
                            favBtn.querySelector('.material-symbols-outlined').textContent = isNowCart ? 'favorite' : 'favorite_border';
                        }
                    }
                });
            }

            // Click en Compartir
            const shareBtn = card.querySelector('.btn-feed-share');
            if (shareBtn) {
                shareBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleShareProduct(product, acabado || '');
                });
            }
            
            // Click en la tarjeta abre el detalle (guarda el término buscado en el historial antes de limpiar el buscador)
            card.addEventListener('click', () => {
                if (searchInput && searchInput.value.trim()) {
                    saveSearchTerm(searchInput.value.trim());
                }
                if (window.trackSearchClick) window.trackSearchClick(product.id, acabado);
                if (window.showProductDetail) window.showProductDetail(product, cat.name, acabado);
            });
            
            searchResultsContainer.appendChild(card);
        });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CATEGORY FEED — Vista exclusiva por categoría
    // Solo se accede desde las tarjetas de la Home.
    // Sin header, sin botón volver, sin título: solo fotos.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const categoryFeedView = document.getElementById('view-category-feed');
    const categoryFeedList = document.getElementById('category-feed-container');
    const categoryFeedEmpty = document.getElementById('category-feed-empty');

    function navigateToCategoryFeed(categoryId, isBack = false) {
        

        const urlParams = new URLSearchParams(window.location.search);
        const currentCat = urlParams.get('cat') || urlParams.get('category');
        const hasOtherParams = urlParams.has('prod') || urlParams.has('product') || urlParams.has('p') || urlParams.has('view');
        if (currentCat !== categoryId || hasOtherParams) {
            const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + `?cat=${encodeURIComponent(categoryId)}`;
            if (isBack) {
                window.history.replaceState({ viewId: 'view-category-feed', categoryId }, document.title, cleanUrl);
            } else {
                window.history.pushState({ viewId: 'view-category-feed', categoryId }, document.title, cleanUrl);
            }
        }

        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
        if (typeof sourceData === 'undefined') return;

        let cat = sourceData.find(c => c.id === categoryId);
        // Fallback dinámico si sessionProducts en localStorage quedó viejo
        if (!cat && typeof productsData !== 'undefined') {
            cat = productsData.find(c => c.id === categoryId);
            if (cat && window.sessionProducts) {
                window.sessionProducts.push(cat);
            }
        }
        if (!cat) return;

        if (isBack) {
            const categoryFeedView = document.getElementById('view-category-feed');
            if (categoryFeedView) categoryFeedView.dataset.categoryId = categoryId;
        }

        if (window.navigateToView) {
            window.navigateToView('view-category-feed', { categoryId: categoryId, name: cat.name }, isBack);
        }

        // Configurar atributos para compartir categoría
        if (window.btnShareHeader) {
            window.btnShareHeader.setAttribute('data-category-id', categoryId);
            window.btnShareHeader.setAttribute('data-category-name', cat.name);
        }

        // Configurar e inicializar barra de subcategorías
        const subcategoriesBar = document.getElementById('category-feed-subcategories-bar');
        if (subcategoriesBar) {
            subcategoriesBar.innerHTML = '';
            subcategoriesBar.style.display = 'none';
        }

        // Limpiar el feed anterior
        if (categoryFeedList) categoryFeedList.innerHTML = '';

        // Obtener productos (si es categoría general de resguardo, unificar dinámicamente)
        let categoryProducts = [];
        if (categoryId.endsWith('-todos')) {
            const rubroId = categoryId.replace('-todos', '');
            const otherCategories = sourceData.filter(c => (c.rubro || 'carpinteria') === rubroId && !c.id.endsWith('-todos') && c.visible !== false);
            
            const seenIds = new Set();
            otherCategories.forEach(c => {
                if (c.products) {
                    c.products.forEach(p => {
                        if (!seenIds.has(p.id) && p.visible !== false) {
                            seenIds.add(p.id);
                            categoryProducts.push(p);
                        }
                    });
                }
            });
            // Añadir los que estén guardados físicamente aquí
            if (cat.products) {
                cat.products.forEach(p => {
                    if (!seenIds.has(p.id) && p.visible !== false) {
                        seenIds.add(p.id);
                        categoryProducts.push(p);
                    }
                });
            }
        } else {
            categoryProducts = (cat.products || []).filter(p => p.visible !== false);
        }

        function renderFeedCards(prodsToRender) {
            if (!categoryFeedList) return;
            categoryFeedList.innerHTML = '';
            if (prodsToRender.length === 0) {
                if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'flex';
                return;
            }
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'none';

            prodsToRender.forEach(product => {
                const card = document.createElement('div');
                card.className = 'feed-card';
                
                const defaultAcabado = (product.acabados_groups && product.acabados_groups[0]?.acabado_name) || '';
                const isFav = checkProductFavStatus(product.id, defaultAcabado);
                const inCart = checkProductCartStatus(product.id, defaultAcabado);
                const priceHtml = getProductPriceDisplay(product);
                const productCover = Array.isArray(product.image) ? product.image[0] : product.image;

                // Badge de variantes si tiene más de 1 acabado
                const variantsCount = (product.acabados_groups && product.acabados_groups.length) || 0;
                const variantsBadge = variantsCount > 1 
                    ? `<div class="feed-card-floating-badge" title="${variantsCount} acabados disponibles">
                        <span class="material-symbols-outlined" style="font-size: 14px; color: #f59e0b;">palette</span>
                        <span>${variantsCount} acabados</span>
                       </div>`
                    : (defaultAcabado && defaultAcabado.toLowerCase() !== 'único' ? `<div class="feed-card-floating-badge"><span class="material-symbols-outlined" style="font-size: 14px; color: #f59e0b;">palette</span><span>${defaultAcabado}</span></div>` : '');

                card.innerHTML = `
                    <div class="feed-card-photo-container">
                        <img src="${productCover}" class="feed-card-img lazy-img" alt="${product.title}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded'); if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                        ${variantsBadge}
                        <!-- Iconos Flotantes: Corazón (1) y Carrito (2) -->
                        <div class="feed-card-actions-float">
                            <button type="button" class="feed-action-btn btn-feed-fav ${isFav ? 'is-fav' : ''}" title="${isFav ? 'Guardado en favoritos' : 'Guardar en favoritos'}">
                                <span class="material-symbols-outlined" style="font-size: 18px;">${isFav ? 'favorite' : 'favorite_border'}</span>
                            </button>
                            <button type="button" class="feed-action-btn btn-feed-cart ${inCart ? 'in-cart' : ''}" title="${inCart ? 'Ya está en el carrito' : 'Agregar al carrito'}">
                                <span class="material-symbols-outlined" style="font-size: 18px;">${inCart ? 'shopping_bag' : 'add_shopping_cart'}</span>
                            </button>
                            <button type="button" class="feed-action-btn btn-feed-share" title="Compartir producto">
                                <span class="material-symbols-outlined" style="font-size: 18px;">share</span>
                            </button>
                        </div>
                    </div>
                    <div class="feed-card-info">
                        <div class="feed-card-title-container">
                            <h3 class="feed-card-title" title="${product.title}">${product.title}</h3>
                        </div>
                        <div class="feed-card-price-row">
                            ${priceHtml}
                        </div>
                    </div>
                `;

                // Detectar desborde de título para marquee
                setTimeout(() => {
                    const titleEl = card.querySelector('.feed-card-title');
                    if (titleEl && titleEl.scrollWidth > titleEl.clientWidth + 2) {
                        titleEl.classList.add('has-overflow');
                    }
                }, 60);

                // Soporte táctil mobile
                let touchTimer = null;
                card.addEventListener('touchstart', () => {
                    touchTimer = setTimeout(() => card.classList.add('is-active-marquee'), 250);
                }, { passive: true });
                card.addEventListener('touchend', () => {
                    clearTimeout(touchTimer);
                    setTimeout(() => card.classList.remove('is-active-marquee'), 2000);
                }, { passive: true });

                // Click en Corazón
                const favBtn = card.querySelector('.btn-feed-fav');
                if (favBtn) {
                    favBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (window.CarritoModule && window.CarritoModule.toggle) {
                            window.CarritoModule.toggle(product, defaultAcabado || 'Único', cat.name);
                            const isNowFav = checkProductFavStatus(product.id, defaultAcabado);
                            favBtn.classList.toggle('is-fav', isNowFav);
                            favBtn.querySelector('.material-symbols-outlined').textContent = isNowFav ? 'favorite' : 'favorite_border';
                            const cartBtn = card.querySelector('.btn-feed-cart');
                            if (cartBtn) {
                                cartBtn.classList.toggle('in-cart', isNowFav);
                                cartBtn.querySelector('.material-symbols-outlined').textContent = isNowFav ? 'shopping_bag' : 'add_shopping_cart';
                            }
                        }
                    });
                }

                // Click en Carrito Rápido
                const cartBtn = card.querySelector('.btn-feed-cart');
                if (cartBtn) {
                    cartBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (window.CarritoModule && window.CarritoModule.toggle) {
                            window.CarritoModule.toggle(product, defaultAcabado || 'Único', cat.name);
                            const isNowCart = checkProductCartStatus(product.id, defaultAcabado);
                            cartBtn.classList.toggle('in-cart', isNowCart);
                            cartBtn.querySelector('.material-symbols-outlined').textContent = isNowCart ? 'shopping_bag' : 'add_shopping_cart';
                            if (favBtn) {
                                favBtn.classList.toggle('is-fav', isNowCart);
                                favBtn.querySelector('.material-symbols-outlined').textContent = isNowCart ? 'favorite' : 'favorite_border';
                            }
                        }
                    });
                }

                // Click en Compartir
                const shareBtn = card.querySelector('.btn-feed-share');
                if (shareBtn) {
                    shareBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        handleShareProduct(product, defaultAcabado || '');
                    });
                }

                card.addEventListener('click', () => {
                    showProductDetail(product, cat.name);
                });
                categoryFeedList.appendChild(card);
            });
        }

        if (categoryProducts.length === 0) {
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'flex';
        } else {
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'none';

            // Detectar subcategorías presentes en los productos
            const subcatMap = new Map();
            categoryProducts.forEach(p => {
                if (p.subcategoria && p.subcategoria_label) {
                    subcatMap.set(p.subcategoria, p.subcategoria_label);
                }
            });

            // Si hay 2 o más subcategorías, armar la barra de chips
            if (subcategoriesBar && subcatMap.size >= 2) {
                subcategoriesBar.innerHTML = '';
                subcategoriesBar.style.display = 'flex';

                // Botón "Todos"
                const btnAll = document.createElement('button');
                btnAll.type = 'button';
                btnAll.className = 'chip active';
                btnAll.textContent = `Todos (${categoryProducts.length})`;
                btnAll.addEventListener('click', () => {
                    subcategoriesBar.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    btnAll.classList.add('active');
                    renderFeedCards(categoryProducts);
                });
                subcategoriesBar.appendChild(btnAll);

                // Botón por cada subcategoría
                subcatMap.forEach((label, subId) => {
                    const count = categoryProducts.filter(p => p.subcategoria === subId).length;
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'chip';
                    btn.textContent = `${label} (${count})`;
                    btn.addEventListener('click', () => {
                        subcategoriesBar.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                        btn.classList.add('active');
                        const filtered = categoryProducts.filter(p => p.subcategoria === subId);
                        renderFeedCards(filtered);
                    });
                    subcategoriesBar.appendChild(btn);
                });

                if (window.enableDragToScroll) {
                    window.enableDragToScroll(subcategoriesBar);
                }
            }

            renderFeedCards(categoryProducts);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SEARCH — Vista del buscador general
    // Solo se accede tocando el ícono de lupa en el nav.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function navigateToSearch() {
        navigateToView('view-search');
        document.getElementById('app-container').scrollTop = 0;
        if (searchInput) searchInput.value = '';
        runSearch();
    }

    // Attach search input listener, desplegable de últimas 3 búsquedas y botón de limpieza rápida
    const btnClearSearch = document.getElementById('btn-clear-search');
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            renderRecentSearchesDropdown();
        });

        searchInput.addEventListener('click', () => {
            renderRecentSearchesDropdown();
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                hideRecentSearchesDropdown();
            }, 150);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = searchInput.value.trim();
                if (val.length >= 2) saveSearchTerm(val);
                hideRecentSearchesDropdown();
                searchInput.blur();
            } else if (e.key === 'Escape') {
                hideRecentSearchesDropdown();
            }
        });

        searchInput.addEventListener('input', () => {
            const hasText = !!searchInput.value.trim();
            if (btnClearSearch) {
                btnClearSearch.style.display = hasText ? 'flex' : 'none';
            }
            if (hasText) {
                hideRecentSearchesDropdown();
            } else {
                renderRecentSearchesDropdown();
            }
            window.runSearch();
        });

        if (btnClearSearch) {
            btnClearSearch.addEventListener('click', (e) => {
                e.preventDefault();
                searchInput.value = '';
                btnClearSearch.style.display = 'none';
                searchInput.focus();
                renderRecentSearchesDropdown();
                window.runSearch();
            });
        }
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar-container')) {
            hideRecentSearchesDropdown();
        }
    });

    // Initialize search when tab is clicked (reset to "all" on direct nav tab click)
    const searchNavItem = document.querySelector('.nav-item[data-target="view-search"]');
    if (searchNavItem) {
        searchNavItem.addEventListener('click', () => {
            setTimeout(() => {
                window.runSearch();
            }, 0);
        });
    }

    // Exponer al scope global
    
    window.createFeedProductCard = createFeedProductCard;
    window.getProductPriceDisplay = getProductPriceDisplay;
    window.checkProductFavStatus = checkProductFavStatus;
    window.checkProductCartStatus = checkProductCartStatus;
    window.handleShareProduct = handleShareProduct;
    window.runSearch = runSearch;
    window.renderSearchRubrosTabs = renderSearchRubrosTabs;
    window.navigateToCategoryFeed = navigateToCategoryFeed;

    // Initialize search view on first load so it's ready
    window.runSearch();

