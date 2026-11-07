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
                        <div class="product-thumb-drag" title="${showDragHandle ? 'Mantén presionado para arrastrar y reordenar' : ''}" style="width: 44px; height: 44px; border-radius: var(--admin-radius-sm); background-image: url('${window.getThumbUrl ? window.getThumbUrl(Array.isArray(p.image) ? p.image[0] : p.image) : p.image}'); background-size: cover; background-position: center; border: 1px solid var(--admin-border-color); flex-shrink: 0; cursor: ${showDragHandle ? 'grab' : 'default'};"></div>
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

window.getProductMainVariantInfo = getProductMainVariantInfo;
window.updateProductPriceAndVisibility = updateProductPriceAndVisibility;
window.renderAdminProducts = renderAdminProducts;
window.cloneProduct = cloneProduct;
