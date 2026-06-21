// js/catalogo.js
// --- LÓGICA DEL CATÁLOGO DE PRODUCTOS A-Z ---

document.addEventListener('DOMContentLoaded', () => {
    const catalogListContainer = document.getElementById('catalog-list');
    const emptyState = document.getElementById('catalog-empty-state');

    const WHATSAPP_PHONE = "5491167007723";
    let allProducts = [];

    // 1. Cargar y procesar los productos
    function loadProducts() {
        const sourceProducts = (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (typeof window.productsData !== 'undefined' ? window.productsData : []);

        const seenIds = new Set();
        allProducts = [];

        sourceProducts.forEach(category => {
            if (category.products) {
                category.products.forEach(product => {
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
            product.acabados_groups.forEach(group => {
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
            product.acabados_groups.forEach(group => {
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

    let itemsToShow = 1;
    let currentFilteredProducts = [];

    // 4. Renderizar la lista en el DOM con soporte de paginación (scroll infinito)
    function renderCatalogList(productsToRender, append = false) {
        if (!catalogListContainer) return;
        
        if (!append) {
            catalogListContainer.innerHTML = '';
            itemsToShow = 1;
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
            const infoCol = document.createElement('div');
            infoCol.className = 'catalog-info-col';
            
            const detailUrl = `./?prod=${product.id}`;
            infoCol.innerHTML = `
                <a href="${detailUrl}" class="catalog-thumb-link">
                    <img src="${product.image}" class="catalog-thumb" alt="${product.title}" loading="lazy" onerror="this.onerror=null; this.src='img/logo_provisional.png';">
                </a>
                <div class="catalog-details">
                    <span class="catalog-category-tag">${product.categoryName}</span>
                    <a href="${detailUrl}" class="catalog-title-link">
                        <h3 class="catalog-title">${product.title}</h3>
                    </a>
                </div>
            `;
            row.appendChild(infoCol);

            // Variables de enlaces
            let currentShippingLink = '';
            let currentWhatsAppLink = getWhatsAppUrl(product.title);

            // Columna 2: Selector de Variantes (Solo si hay múltiples links de envío)
            const variantCol = document.createElement('div');
            variantCol.className = 'catalog-variant-col';

            if (hasShipping) {
                if (shippingVariants.length > 1) {
                    const selectWrapper = document.createElement('div');
                    selectWrapper.className = 'catalog-select-wrapper';

                    const select = document.createElement('select');
                    select.className = 'catalog-select';
                    
                    // Buscar variante predeterminada o usar la primera
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
                    // Si tiene un único link de envío, se muestra su descripción estática de variante o queda vacío
                    currentShippingLink = shippingVariants[0].link;
                    currentWhatsAppLink = getWhatsAppUrl(product.title, shippingVariants[0].label);
                    variantCol.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted); font-weight:500; display:block; text-align:center; padding: 0.5rem 0;">${shippingVariants[0].label}</span>`;
                }
            } else {
                // Sin envío: texto descriptivo
                variantCol.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted); font-style:italic; display:block; text-align:center; padding: 0.5rem 0;">Consultar envío</span>`;
            }
            row.appendChild(variantCol);

            // Columna 3: Botones de Acción (Envío, WhatsApp)
            const actionsCol = document.createElement('div');
            actionsCol.className = 'catalog-actions-col';

            // Botón MercadoLibre/Envío
            const btnShipping = document.createElement('a');
            btnShipping.className = 'catalog-btn catalog-btn-shipping';
            btnShipping.target = '_blank';
            btnShipping.innerHTML = `<span class="material-symbols-outlined">local_shipping</span> Envío`;
            if (hasShipping) {
                btnShipping.href = currentShippingLink;
            } else {
                btnShipping.style.display = 'none'; // Se oculta si no tiene link
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
                } catch (e) { /* Ignore adblocker errors */ }
            });
            actionsCol.appendChild(btnShipping);

            // Botón WhatsApp
            const btnWpp = document.createElement('a');
            btnWpp.className = 'catalog-btn catalog-btn-wpp';
            btnWpp.href = currentWhatsAppLink;
            btnWpp.target = '_blank';
            btnWpp.innerHTML = `<span class="material-symbols-outlined">forum</span> Consultar`;
            btnWpp.addEventListener('click', () => {
                try {
                    if (typeof gtag === 'function') {
                        gtag('event', 'contact', {
                            method: 'WhatsApp',
                            event_category: 'Engagement',
                            event_label: 'Consultar WhatsApp Catálogo A-Z',
                            item_id: product.id,
                            item_name: product.title,
                            item_category: product.categoryName
                        });
                    }
                } catch (e) { /* Ignore adblocker errors */ }
            });
            actionsCol.appendChild(btnWpp);

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
                itemsToShow += 1;
                renderCatalogList(currentFilteredProducts, true);
            }
        }
    });

    // Inicializar
    loadProducts();
    renderCatalogList(allProducts);
});
