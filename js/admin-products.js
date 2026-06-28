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
                openProductForm(catIdx, null);
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

    function renderAdminProducts() {
        const oldTableBody = document.getElementById('admin-products-table-body');
        if (!oldTableBody) return;
        const tableBody = oldTableBody.cloneNode(false);
        oldTableBody.parentNode.replaceChild(tableBody, oldTableBody);

        // Aggregate matching products
        let prods = [];
        sessionProducts.forEach((cat, catIdx) => {
            if (selectedCategoryIdForProducts === 'all' || !selectedCategoryIdForProducts || cat.id === selectedCategoryIdForProducts) {
                cat.products.forEach((prod, pIdx) => {
                    prods.push({
                        ...prod,
                        catIndex: catIdx,
                        prodIndex: pIdx,
                        categoryName: cat.name,
                        categoryId: cat.id
                    });
                });
            }
        });

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
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
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
            row.style.borderBottom = '1px solid #EEF0F3';
            
            row.innerHTML = `
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        ${dragHandleHtml}
                        <div style="width: 44px; height: 44px; border-radius: 8px; background-image: url('${p.image}'); background-size: cover; background-position: center; border: 1px solid #E2E8F0; flex-shrink: 0;"></div>
                    </div>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <strong style="color: var(--text-main); font-size: 0.9rem; display: block;">${p.title}</strong>
                    <small style="color: var(--text-muted); font-size: 0.75rem; font-family: monospace;">SKU: ${p.id}</small>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <span style="background: #edf2f7; color: #4a5568; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.78rem; font-weight: 500;">
                        ${p.categoryName}
                    </span>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle; text-align: center;">
                    <span style="font-weight: 600; color: var(--primary-color); font-size: 0.88rem;">
                        ${p.acabados_groups ? p.acabados_groups.length : 1}
                    </span>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle; text-align: center;">
                    <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
                        <button class="action-btn view btn-toggle-prod-visibility ${p.visible !== false ? '' : 'hidden-mode'}" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="${p.visible !== false ? 'Ocultar producto' : 'Mostrar producto'}" style="padding: 0.35rem; font-size: 0.85rem;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">${p.visible !== false ? 'visibility' : 'visibility_off'}</span>
                        </button>
                        <button class="action-btn edit btn-edit-prod-new" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="Editar" style="padding: 0.35rem; font-size: 0.85rem;"><span class="material-symbols-outlined" style="font-size: 16px;">edit</span></button>
                        <button class="action-btn clone btn-clone-prod-new" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="Clonar" style="padding: 0.35rem; font-size: 0.85rem;"><span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span></button>
                        <button class="action-btn del btn-del-prod-new" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="Eliminar" style="padding: 0.35rem; font-size: 0.85rem;"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
                    </div>
                </td>
            `;

            if (showDragHandle) {
                row.setAttribute('draggable', 'false');
                row.className = 'product-admin-row';
                row.setAttribute('data-index', p.prodIndex);
                
                const handle = row.querySelector('.product-drag-handle');
                handle.addEventListener('mousedown', () => row.setAttribute('draggable', 'true'));
                handle.addEventListener('touchstart', () => row.setAttribute('draggable', 'true'));
                handle.addEventListener('mouseup', () => row.setAttribute('draggable', 'false'));
                handle.addEventListener('touchend', () => row.setAttribute('draggable', 'false'));
                
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
                openProductForm(cIdx, sessionProducts[cIdx].products[pIdx]);
            });

            row.querySelector('.btn-clone-prod-new').addEventListener('click', (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const pIdx = parseInt(e.currentTarget.getAttribute('data-prod'));
                cloneProduct(cIdx, pIdx);
            });

            row.querySelector('.btn-del-prod-new').addEventListener('click', async (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const pIdx = parseInt(e.currentTarget.getAttribute('data-prod'));
                const catName = sessionProducts[cIdx].name;
                const prodTitle = sessionProducts[cIdx].products[pIdx].title;
                if (confirm(`¿Eliminar "${prodTitle}"?`)) {
                    try {
                        await fetch('/api/products/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: prodTitle, category: catName })
                        });
                    } catch (error) {
                        console.error('Error al limpiar archivos de producto', error);
                    }

                    sessionProducts[cIdx].products.splice(pIdx, 1);
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
                
                sessionProducts[catIdx].products = fullProductsList;
                
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
        cloned.id    = `${cloned.id}-copia`;
        cloned.title = `${cloned.title} (Copia)`;

        // Abrir el formulario con los datos clonados pre-cargados
        openProductForm(cIdx, cloned);

        // Forzar modo "nuevo producto" para que al guardar se inserte, no se sobreescriba
        editingProductId = null;

        // Asegurar que el modal sea visible
        const modal = document.getElementById('admin-product-modal');
        if (modal) modal.style.display = 'flex';

        showAdminToast('📋 Editá el clon y guardalo para añadirlo al catálogo');
    }

    // ── Clonar Categoría ──

    function getIndexedProducts() {
        const indexed = [];
        // Usar sessionProducts como fuente de verdad activa si existe (para tener productos creados/editados)
        const sourceProducts = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) 
            ? sessionProducts 
            : (typeof productsData !== 'undefined' ? productsData : []);

        sourceProducts.forEach(cat => {
            if (cat.visible === false) return;
            if (!cat.products) return;
            cat.products.forEach(product => {
                if (product.visible === false) return;
                let indexedAnyVariant = false;

                // 1. Indexar cada variante/acabado virtual por separado
                if (product.acabados_groups && Array.isArray(product.acabados_groups)) {
                    product.acabados_groups.forEach(acabado => {
                        if (acabado.acabado_name) {
                            indexed.push({
                                id: product.id,
                                product: product,
                                cat: cat,
                                nombre: product.title,
                                acabado: acabado.acabado_name,
                                // Guardar la imagen específica de la variante para un resultado visual premium
                                image: acabado.cover_image || product.image,
                                tags: product.tags || [],
                                medidas: acabado.medidas_variants ? acabado.medidas_variants.map(mv => mv.medida || '') : []
                            });
                            indexedAnyVariant = true;
                        }
                    });
                }

                // 2. Indexar el producto base original (solo si no se indexó ninguna variante con acabado)
                if (!indexedAnyVariant) {
                    indexed.push({
                        id: product.id,
                        product: product,
                        cat: cat,
                        nombre: product.title,
                        acabado: '',
                        image: product.image,
                        tags: product.tags || [],
                        medidas: product.medidas_variants ? product.medidas_variants.map(mv => mv.medida || '') : []
                    });
                }
            });
        });
        return indexed;
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

    const normalizeForSearch = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    function runSearch() {
        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
        if (!searchResultsContainer || typeof sourceData === 'undefined') return;
        
        const rawQuery = searchInput ? searchInput.value : '';
        const query = normalizeForSearch(rawQuery).trim();

        const activeView = document.querySelector('.view.active');
        if (activeView && activeView.id === 'view-catalogo') {
            const iframe = document.querySelector('#view-catalogo iframe');
            if (iframe && iframe.contentWindow && iframe.contentWindow.filterCatalogAZ) {
                iframe.contentWindow.filterCatalogAZ(query);
            }
            return;
        }

        // Si no hay consulta de búsqueda, renderizar la landing inspiradora del constructor
        if (!query) {
            const hasDynamicContent = renderSectionContent('categories', searchResultsContainer);
            if (hasDynamicContent) {
                if (searchEmptyState) searchEmptyState.style.display = 'none';
                return;
            }
        }

        const indexed = getIndexedProducts();
        let results = [];

        indexed.forEach(item => {
            // Dividir la consulta de búsqueda en términos individuales (ej: "blanca 110" -> ["blanca", "110"])
            const queryTerms = query.split(/\s+/).filter(Boolean);

            // Coincidir si cada uno de los términos buscados está en al menos uno de los campos
            const matchesQuery = queryTerms.length === 0 || queryTerms.every(term => {
                return normalizeForSearch(item.nombre).includes(term) ||
                    (item.cat && item.cat.name && normalizeForSearch(item.cat.name).includes(term)) ||
                    (item.acabado && normalizeForSearch(item.acabado).includes(term)) ||
                    (item.product.description && normalizeForSearch(item.product.description).includes(term)) ||
                    (item.tags && item.tags.some(tag => normalizeForSearch(tag).includes(term))) ||
                    (item.medidas && item.medidas.some(medida => {
                        const normMedida = normalizeForSearch(medida).replace(/\s+/g, '');
                        const normTerm = term.replace(/\s+/g, '');
                        return normMedida.includes(normTerm);
                    }));
            });

            if (matchesQuery) {
                const key = `${item.id}::${item.acabado}`;
                const existingIndex = results.findIndex(r => `${r.id}::${r.acabado}` === key);
                if (existingIndex !== -1) {
                    const currentIsPrimary = item.product.primaryCatId === item.cat.id;
                    if (currentIsPrimary) {
                        results[existingIndex] = item;
                    }
                } else {
                    results.push(item);
                }
            }
        });

        // Ordenar resultados de A a Z por nombre
        results.sort((a, b) => {
            const nameA = (a.nombre || '').toLowerCase();
            const nameB = (b.nombre || '').toLowerCase();
            return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        });

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
            
            // Badge premium de variante si aplica
            const acabadoBadge = acabado 
                ? `<span style="position: absolute; top: 12px; right: 12px; z-index: 5; background: var(--primary-color, #c0510a); color: white; border: none; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; font-size: 0.68rem; padding: 0.25rem 0.65rem; border-radius: 50px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">${acabado}</span>`
                : '';

            const productCover = Array.isArray(image) ? image[0] : (image || 'img/logo_provisional.png');

            card.innerHTML = `
                <div class="feed-card-photo-container">
                    <img src="${productCover}" class="feed-card-img" alt="${nombre}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded'); if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                    ${acabadoBadge}
                    <div class="feed-card-gradient"></div>
                    <div class="feed-card-info">
                        <span class="feed-card-cat">${cat.name}</span>
                        <h3 class="feed-card-title">${nombre}</h3>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                // Registrar tracking de popularidad (base + variante)
                if (window.trackSearchClick) window.trackSearchClick(product.id, acabado);
                
                // Mostrar detalle con acabado preseleccionado
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
        if (urlParams.get('cat') !== categoryId) {
            const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + `?cat=${categoryId}`;
            if (isBack) {
                window.history.replaceState({ viewId: 'view-category-feed', categoryId }, document.title, cleanUrl);
            } else {
                window.history.pushState({ viewId: 'view-category-feed', categoryId }, document.title, cleanUrl);
            }
        }

        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
        if (typeof sourceData === 'undefined') return;

        const cat = sourceData.find(c => c.id === categoryId);
        if (!cat || cat.visible === false) return;

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

        // Limpiar el feed anterior
        if (categoryFeedList) categoryFeedList.innerHTML = '';

        if (!cat.products || cat.products.length === 0) {
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'flex';
        } else {
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'none';

            cat.products.forEach(product => {
                if (product.visible === false) return;
                const card = document.createElement('div');
                card.className = 'feed-card';
                const productCover = Array.isArray(product.image) ? product.image[0] : product.image;
                card.innerHTML = `
                    <div class="feed-card-photo-container">
                        <img src="${productCover}" class="feed-card-img" alt="${product.title}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded'); if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                        <div class="feed-card-gradient"></div>
                        <div class="feed-card-info">
                            <h3 class="feed-card-title">${product.title}</h3>
                            ${product.acabados_groups && product.acabados_groups.length > 0
                                ? `<span class="feed-card-variants-badge">${product.acabados_groups.length} acabados</span>`
                                : ''}
                        </div>
                    </div>
                `;
                card.addEventListener('click', () => {
                    showProductDetail(product, cat.name);
                });
                categoryFeedList.appendChild(card);
            });
        }

        // Navegar: ocultar todo y mostrar solo el feed de categoría
        navigateToView('view-category-feed', { name: cat.name, categoryId: categoryId }, isBack);
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

    // Attach search input listener
    if (searchInput) {
        searchInput.addEventListener('input', runSearch);
    }

    // Initialize search when tab is clicked (reset to "all" on direct nav tab click)
    const searchNavItem = document.querySelector('.nav-item[data-target="view-search"]');
    if (searchNavItem) {
        searchNavItem.addEventListener('click', () => {
            // Only reset if NOT navigating from a category card (navigateToSearch sets it first)
            // We reset on next tick so navigateToSearch (if called) has priority
            setTimeout(() => {
                runSearch();
            }, 0);
        });
    }

    // Initialize search view on first load so it's ready
    runSearch();

