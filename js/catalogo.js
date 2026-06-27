// js/catalogo.js
// --- LÓGICA DEL CATÁLOGO DE PRODUCTOS A-Z ---

document.addEventListener('DOMContentLoaded', () => {
    const catalogListContainer = document.getElementById('catalog-list');
    const emptyState = document.getElementById('catalog-empty-state');

    const WHATSAPP_PHONE = "5491167007723";
    let allProducts = [];

    // 1. Cargar y procesar los productos
    function loadProducts() {
        let parentProducts = null;
        try {
            if (window.parent && window.parent !== window && window.parent.sessionProducts) {
                parentProducts = window.parent.sessionProducts;
            }
        } catch (e) {
            console.warn('[Catalogo] No se pudo acceder a window.parent.sessionProducts:', e);
        }

        const sourceProducts = (parentProducts && parentProducts.length > 0)
            ? parentProducts
            : ((typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0)
                ? window.sessionProducts
                : (typeof window.productsData !== 'undefined' ? window.productsData : []));

        const seenIds = new Set();
        allProducts = [];

        sourceProducts.forEach(category => {
            if (category.visible === false) return;
            if (category.products) {
                category.products.forEach(product => {
                    if (product.visible === false) return;
                    if (!seenIds.has(product.id)) {
                        seenIds.add(product.id);
                        
                        // Determinar la categoría principal o de origen
                        const primaryCatId = product.primaryCatId || category.id;
                        const catObj = sourceProducts.find(c => c.id === primaryCatId) || category;
                        
                        allProducts.push({
                            id: product.id,
                            title: product.title,
                            description: product.description || '',
                            image: Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png'),
                            categoryName: catObj.name,
                            acabados_groups: product.acabados_groups || [],
                            medidas_variants: product.medidas_variants || [],
                            optional_variant: product.optional_variant || null,
                            tags: product.tags || []
                        });
                    }
                });
            }
        });

        // Ordenar alfabéticamente A-Z
        allProducts.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
    }

    // 2. Extraer variantes de envío disponibles
    function getShippingVariants(product) {
        const variants = [];
        
        if (product.acabados_groups && product.acabados_groups.length > 0) {
            product.acabados_groups.filter(g => !g.hidden).forEach(group => {
                const acabadoName = group.acabado_name || '';
                if (group.medidas_variants) {
                    group.medidas_variants.forEach(v => {
                        if (v.link && v.link.trim() !== '') {
                            const label = acabadoName && acabadoName.toLowerCase() !== 'único'
                                ? `${acabadoName} - ${v.medida}`
                                : v.medida;
                            variants.push({
                                label: label,
                                link: v.link.trim(),
                                isDefault: v.default === true
                            });
                        }
                    });
                }
            });
        } else if (product.medidas_variants) {
            // Compatibilidad legacy
            product.medidas_variants.forEach(v => {
                if (v.link && v.link.trim() !== '') {
                    variants.push({
                        label: v.medida,
                        link: v.link.trim(),
                        isDefault: v.default === true
                    });
                }
            });
        }

        return variants;
    }

    // 3. Generar mensaje de WhatsApp prellenado
    function getWhatsAppUrl(productTitle, variantLabel = '') {
        let msg = `¡Hola La Tarima! Quiero consultar por el producto: *${productTitle}*`;
        if (variantLabel) {
            msg += ` (Variante: ${variantLabel})`;
        }
        msg += `. ¿Me podés pasar más info y disponibilidad?`;
        return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
    }

    // 3.5 Calcular total de variantes/opciones del producto
    function countProductVariants(product) {
        let count = 0;
        if (product.acabados_groups && product.acabados_groups.length > 0) {
            product.acabados_groups.filter(g => !g.hidden).forEach(group => {
                if (group.medidas_variants && group.medidas_variants.length > 0) {
                    count += group.medidas_variants.length;
                } else {
                    count += 1;
                }
            });
        } else if (product.medidas_variants && product.medidas_variants.length > 0) {
            count += product.medidas_variants.length;
        } else {
            count = 1;
        }
        return count;
    }

    let itemsToShow = 30;
    let currentFilteredProducts = [];

    // 4. Renderizar la lista en el DOM con soporte de paginación (scroll infinito)
    function renderCatalogList(productsToRender, append = false) {
        if (!catalogListContainer) return;
        
        if (!append) {
            catalogListContainer.innerHTML = '';
            itemsToShow = 8;
            currentFilteredProducts = productsToRender;
        }

        if (currentFilteredProducts.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const startIdx = catalogListContainer.childElementCount;
        const batch = currentFilteredProducts.slice(startIdx, itemsToShow);

        batch.forEach((product, idx) => {
            const row = document.createElement('div');
            row.className = 'catalog-row';
            row.dataset.productId = product.id;
            
            // Retardo de animación en cascada para carga premium (basado en índice absoluto)
            row.style.animationDelay = `${((startIdx + idx) % 15) * 0.05}s`;

            // Obtener variantes de envío
            const shippingVariants = getShippingVariants(product);
            const hasShipping = shippingVariants.length > 0;

            // Crear columnas
            // Columna 1: Info Producto (Miniatura, Título, Categoría)
            // ====== NUEVO LAYOUT LISTA COMPACTA ======
            // 1. Imagen (Thumbnail)
            const detailUrl = `./?prod=${product.id}`;

            const handleProductClick = (e) => {
                e.preventDefault();
                try {
                    if (window.parent && typeof window.parent.showProductDetail === 'function' && typeof window.parent.findProductById === 'function') {
                        const foundData = window.parent.findProductById(product.id);
                        if (foundData) {
                            window.parent.showProductDetail(foundData.product, foundData.catName);
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Error opening product detail via parent:', err);
                }
                window.parent.location.href = detailUrl;
            };

            const thumbLink = document.createElement('a');
            thumbLink.href = detailUrl;
            thumbLink.className = 'catalog-thumb-link';
            thumbLink.target = '_parent';
            thumbLink.innerHTML = `<img src="${product.image}" class="catalog-thumb" alt="${product.title}" loading="lazy" onerror="this.onerror=null; this.src='img/logo_provisional.png';">`;
            thumbLink.addEventListener('click', handleProductClick);
            row.appendChild(thumbLink);

            // 2. Textos (Titulo + Opciones) -> flex: 1
            const textCol = document.createElement('div');
            textCol.style.display = 'flex';
            textCol.style.flexDirection = 'column';
            textCol.style.flex = '1';
            textCol.style.minWidth = '0';
            textCol.style.justifyContent = 'center';

            // 2.1 Título
            const titleRow = document.createElement('div');
            const titleLink = document.createElement('a');
            titleLink.href = detailUrl;
            titleLink.className = 'catalog-title-link';
            titleLink.target = '_parent';
            titleLink.style.whiteSpace = 'normal';
            titleLink.innerHTML = `<h3 class="catalog-title" style="white-space: normal; overflow: visible; font-size: 1.05rem; margin-bottom: 2px;">${product.title}</h3>`;
            titleLink.addEventListener('click', handleProductClick);
            titleRow.appendChild(titleLink);
            textCol.appendChild(titleRow);

            // Variables de enlaces
            let currentShippingLink = '';
            let currentWhatsAppLink = getWhatsAppUrl(product.title);

            // 2.2 Variante
            const variantCol = document.createElement('div');
            variantCol.className = 'catalog-variant-col';

            if (hasShipping) {
                if (shippingVariants.length > 1) {
                    const selectWrapper = document.createElement('div');
                    selectWrapper.className = 'catalog-select-wrapper';
                    selectWrapper.style.marginTop = '0.1rem';
                    selectWrapper.style.maxWidth = '200px';

                    const select = document.createElement('select');
                    select.className = 'catalog-select';
                    select.style.padding = '0.2rem 1.2rem 0.2rem 0.5rem';
                    
                    let defaultIdx = shippingVariants.findIndex(v => v.isDefault);
                    if (defaultIdx === -1) defaultIdx = 0;

                    shippingVariants.forEach((v, idx) => {
                        const opt = document.createElement('option');
                        opt.value = idx;
                        opt.textContent = v.label;
                        if (idx === defaultIdx) opt.selected = true;
                        select.appendChild(opt);
                    });

                    currentShippingLink = shippingVariants[defaultIdx].link;
                    currentWhatsAppLink = getWhatsAppUrl(product.title, shippingVariants[defaultIdx].label);

                    selectWrapper.appendChild(select);
                    variantCol.appendChild(selectWrapper);
                } else {
                    currentShippingLink = shippingVariants[0].link;
                    currentWhatsAppLink = getWhatsAppUrl(product.title, shippingVariants[0].label);
                    variantCol.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted); font-weight:500;">${shippingVariants[0].label}</span>`;
                }
            } else {
                variantCol.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Consultar envío</span>`;
            }
            textCol.appendChild(variantCol);
            row.appendChild(textCol);

            // 3. Columna de Botones de Acción (Stackeados en PC)
            const actionsCol = document.createElement('div');
            actionsCol.className = 'catalog-actions-col';

            const btnShipping = document.createElement('a');
            btnShipping.className = 'catalog-btn catalog-btn-shipping';
            btnShipping.target = '_blank';
            btnShipping.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">local_shipping</span> Envío`;
            if (hasShipping) {
                btnShipping.href = currentShippingLink;
            } else {
                btnShipping.style.display = 'none';
            }
            btnShipping.addEventListener('click', () => {
                try {
                    if (typeof gtag === 'function') {
                        gtag('event', 'begin_checkout', {
                            currency: 'ARS',
                            items: [{
                                item_id: product.id,
                                item_name: product.title,
                                item_category: product.categoryName
                            }]
                        });
                    }
                } catch (e) { }
            });
            actionsCol.appendChild(btnShipping);

            const btnWpp = document.createElement('a');
            btnWpp.className = 'catalog-btn catalog-btn-wpp';
            btnWpp.href = currentWhatsAppLink;
            btnWpp.target = '_blank';
            btnWpp.innerHTML = `<img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png" alt="WhatsApp" style="width: 14px; height: 14px; object-fit: cover; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"> Consultar`;
            actionsCol.appendChild(btnWpp);

            // Manejo de eventos del selector
            if (variantCol.querySelector('select')) {
                variantCol.querySelector('select').addEventListener('change', (e) => {
                    const selIdx = e.target.value;
                    const selectedVar = shippingVariants[selIdx];
                    btnShipping.href = selectedVar.link;
                    btnWpp.href = getWhatsAppUrl(product.title, selectedVar.label);
                });
            }

            row.appendChild(actionsCol);

            // Vincular listener de cambio al select si existe para actualizar links en caliente
            const selectEl = variantCol.querySelector('.catalog-select');
            if (selectEl) {
                selectEl.addEventListener('change', (e) => {
                    const selectedIdx = parseInt(e.target.value);
                    const selectedVariant = shippingVariants[selectedIdx];
                    if (selectedVariant) {
                        btnShipping.href = selectedVariant.link;
                        btnWpp.href = getWhatsAppUrl(product.title, selectedVariant.label);
                    }
                });
            }

            catalogListContainer.appendChild(row);
        });
    }

    // Función para refrescar el catálogo con la data actualizada
    window.refreshCatalog = function() {
        loadProducts();
        renderCatalogList(allProducts);
    };

    // 5. Filtrar por término de búsqueda (Llamado desde el main window)
    window.filterCatalogAZ = function(query) {
        if (!query) {
            renderCatalogList(allProducts);
            return;
        }
        
        const q = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        
        const filtered = allProducts.filter(p => {
            const t = (p.title || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const d = (p.description || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const c = (p.categoryName || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            
            return t.includes(q) || d.includes(q) || c.includes(q);
        });

        renderCatalogList(filtered);
    };

    // 6. Configurar Scroll Infinito sobre el scroll de la propia ventana del iframe
    window.addEventListener('scroll', () => {
        const threshold = 400; // Pixeles antes de llegar al final para gatillar
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const clientHeight = window.innerHeight;

        const position = scrollHeight - scrollTop - clientHeight;
        if (position < threshold) {
            if (itemsToShow < currentFilteredProducts.length) {
                itemsToShow += 30;
                renderCatalogList(currentFilteredProducts, true);
            }
        }
    });

    // Inicializar
    loadProducts();
    renderCatalogList(allProducts);
});
