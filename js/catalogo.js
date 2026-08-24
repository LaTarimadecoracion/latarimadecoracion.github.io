// js/catalogo.js
// --- LÓGICA DEL CATÁLOGO DE PRODUCTOS A-Z ---

function fixImagePath(path) {
    if (!path) return '../img/logo_provisional.png';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path;
    }
    const isInsideAppsFolder = window.location.pathname.includes('/apps/');
    let clean = path.replace(/^\.\//, '').replace(/^\//, '');
    if (isInsideAppsFolder && !clean.startsWith('../')) {
        return '../' + clean;
    }
    return clean;
}

document.addEventListener('DOMContentLoaded', () => {
    const catalogListContainer = document.getElementById('catalog-list');
    const emptyState = document.getElementById('catalog-empty-state');

    const WHATSAPP_PHONE = "5491167007723";
    let allProducts = [];

    // Rubro activo del catálogo
    let activeCatalogRubro = 'carpinteria';

    function renderCatalogRubrosTabs() {
        const container = document.getElementById('catalog-rubros-tabs-container');
        if (!container) return;

        // Obtener rubros de parent o local
        let rubrosList = [];
        try {
            if (window.parent && window.parent.siteConfig && window.parent.siteConfig.rubros) {
                rubrosList = window.parent.siteConfig.rubros;
            } else if (window.siteConfig && window.siteConfig.rubros) {
                rubrosList = window.siteConfig.rubros;
            }
        } catch (e) {
            if (window.siteConfig && window.siteConfig.rubros) {
                rubrosList = window.siteConfig.rubros;
            }
        }

        if (rubrosList.length === 0) {
            rubrosList = [{ id: 'carpinteria', name: 'Carpintería' }];
        }

        const visibleRubros = rubrosList.filter(r => r.visible !== false);

        if (visibleRubros.length <= 1) {
            container.classList.add('single-rubro');
            container.innerHTML = '';
            if (visibleRubros.length === 1) {
                activeCatalogRubro = visibleRubros[0].id;
            }
            return;
        } else {
            container.classList.remove('single-rubro');
        }

        // Si el rubro seleccionado no está visible, volver al primero disponible
        const activeStillVisible = visibleRubros.some(r => r.id === activeCatalogRubro);
        if (!activeStillVisible && visibleRubros.length > 0) {
            activeCatalogRubro = visibleRubros[0].id;
        }

        container.innerHTML = '';
        visibleRubros.forEach(r => {
            const isActive = r.id === activeCatalogRubro;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = isActive ? 'rubros-tab active' : 'rubros-tab';
            
            // Forzar ancho geométrico exacto por JS inline
            const pct = (100 / visibleRubros.length).toFixed(4);
            btn.style.width = pct + '%';
            btn.style.flex = `0 0 ${pct}%`;

            btn.innerHTML = r.name;
            btn.addEventListener('click', () => {
                activeCatalogRubro = r.id;
                renderCatalogRubrosTabs();
                loadProducts();
                renderCatalogList(allProducts);
            });
            container.appendChild(btn);
        });
    }

    // 1. Cargar y procesar los productos
    function loadProducts() {
        renderCatalogRubrosTabs();

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
            : ((typeof sessionProducts !== 'undefined' && sessionProducts.length > 0)
                ? sessionProducts
                : (typeof productsData !== 'undefined' ? productsData : []));

        // Obtener rubros visibles para saber si filtramos
        let rubrosList = [];
        try {
            if (window.parent && window.parent.siteConfig && window.parent.siteConfig.rubros) {
                rubrosList = window.parent.siteConfig.rubros;
            } else if (window.siteConfig && window.siteConfig.rubros) {
                rubrosList = window.siteConfig.rubros;
            }
        } catch (e) {}

        allProducts = [];
        const visibleRubros = rubrosList.filter(r => r.visible !== false);
        const visibleRubroIds = new Set(visibleRubros.map(r => r.id));

        if (visibleRubros.length > 0 && !visibleRubroIds.has(activeCatalogRubro)) {
            activeCatalogRubro = visibleRubros[0].id;
        }

        const seenKeys = new Set();

        sourceProducts.forEach(catObj => {
            const catRubro = catObj.rubro || 'carpinteria';

            // Descartar si el rubro no está visible en el sitio
            if (visibleRubros.length > 0 && !visibleRubroIds.has(catRubro)) {
                return;
            }

            // Si hay pestañas de rubros visibles, mostrar sólo el seleccionado
            if (visibleRubros.length > 1 && catRubro !== activeCatalogRubro) {
                return;
            }

            if (catObj.products && (catObj.visible !== false || catObj.id.endsWith('-todos'))) {
                catObj.products.forEach(product => {
                    const uniqueKey = product.id ? product.id : (product.title || '').trim().toLowerCase();

                    if (product.visible !== false && !seenKeys.has(uniqueKey)) {
                        seenKeys.add(uniqueKey);
                        const rawImg = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                        allProducts.push({
                            id: product.id,
                            title: product.title,
                            description: product.description || '',
                            image: fixImagePath(rawImg),
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

    // 2. Extraer variantes de envío y precios disponibles
    function getShippingVariants(product) {
        const variants = [];
        
        if (product.acabados_groups && product.acabados_groups.length > 0) {
            product.acabados_groups.filter(g => !g.hidden).forEach(group => {
                const acabadoName = group.acabado_name || '';
                if (group.medidas_variants) {
                    group.medidas_variants.forEach(v => {
                        if (!v.hidden) {
                            const label = acabadoName && acabadoName.toLowerCase() !== 'único'
                                ? `${acabadoName} - ${v.medida}`
                                : v.medida;
                            variants.push({
                                label: label,
                                link: (v.link || '').trim(),
                                price: (v.showPrice && v.price) ? v.price : null,
                                acabado: acabadoName || 'Único',
                                medida: v.medida,
                                isDefault: v.default === true
                            });
                        }
                    });
                }
            });
        } else if (product.medidas_variants) {
            product.medidas_variants.forEach(v => {
                if (!v.hidden) {
                    variants.push({
                        label: v.medida,
                        link: (v.link || '').trim(),
                        price: (v.showPrice && v.price) ? v.price : null,
                        acabado: 'Único',
                        medida: v.medida,
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
            itemsToShow = 30;
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

            // Obtener variantes de envío y precios
            const shippingVariants = getShippingVariants(product);

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

            // 1. Imagen (Thumbnail) con Badge de Carrito en la Esquina
            const checkInCart = () => {
                try {
                    const data = localStorage.getItem('cartItems');
                    if (data) {
                        const items = JSON.parse(data);
                        return items.some(i => i.id === product.id);
                    }
                } catch(e) {}
                return false;
            };

            const thumbContainer = document.createElement('div');
            thumbContainer.className = 'catalog-thumb-container';

            const thumbLink = document.createElement('a');
            thumbLink.href = detailUrl;
            thumbLink.className = 'catalog-thumb-link';
            thumbLink.target = '_parent';
            const fallbackImg = fixImagePath('img/logo_provisional.png');
            thumbLink.innerHTML = `<img src="${product.image}" class="catalog-thumb" alt="${product.title}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImg}';">`;
            thumbLink.addEventListener('click', handleProductClick);
            thumbContainer.appendChild(thumbLink);

            // Botón Icono Flotante en la Esquina del Thumbnail
            const btnCartBadge = document.createElement('button');
            btnCartBadge.type = 'button';
            btnCartBadge.className = `catalog-thumb-cart-btn ${checkInCart() ? 'in-cart' : ''}`;
            btnCartBadge.title = checkInCart() ? 'En Carrito (Clic para quitar)' : 'Agregar al Carrito';
            btnCartBadge.innerHTML = `<span class="material-symbols-outlined">${checkInCart() ? 'check_circle' : 'add_shopping_cart'}</span>`;

            thumbContainer.appendChild(btnCartBadge);
            row.appendChild(thumbContainer);

            // 2. Columna de Textos (Título, Precio + Icono Info, Selector de Variante)
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
            titleLink.innerHTML = `<h3 class="catalog-title" style="white-space: normal; overflow: visible; font-size: 1rem; margin-bottom: 2px;">${product.title}</h3>`;
            titleLink.addEventListener('click', handleProductClick);
            titleRow.appendChild(titleLink);
            textCol.appendChild(titleRow);

            // 2.2 Fila de Precio + Icono Informativo (Tooltip)
            const priceRow = document.createElement('div');
            priceRow.style.display = 'flex';
            priceRow.style.alignItems = 'center';
            priceRow.style.gap = '6px';
            priceRow.style.margin = '1px 0 3px 0';

            const priceTag = document.createElement('span');
            priceTag.className = 'catalog-price-tag';

            const getFormattedPriceText = (v) => {
                if (v && v.price) {
                    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v.price);
                }
                const validPrices = shippingVariants.filter(sv => sv.price).map(sv => sv.price);
                if (validPrices.length > 0) {
                    const minP = Math.min(...validPrices);
                    const maxP = Math.max(...validPrices);
                    const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
                    return minP === maxP ? fmt.format(minP) : `Desde ${fmt.format(minP)}`;
                }
                return '';
            };

            let defaultIdx = shippingVariants.findIndex(v => v.isDefault);
            if (defaultIdx === -1) defaultIdx = 0;

            const initialPriceText = getFormattedPriceText(shippingVariants[defaultIdx]);
            priceTag.textContent = initialPriceText;
            if (!initialPriceText) priceTag.style.display = 'none';

            priceRow.appendChild(priceTag);

            // Icono informativo con tooltip
            const tooltipWrapper = document.createElement('div');
            tooltipWrapper.className = 'catalog-info-tooltip-wrapper';
            tooltipWrapper.innerHTML = `
                <span class="material-symbols-outlined catalog-info-icon">help_outline</span>
                <div class="catalog-tooltip-box">
                    <div style="font-weight:700; margin-bottom:4px; color:#F59E0B;">💡 Guía de Compra y Envíos</div>
                    <div style="margin-bottom:3px;">💵 <b>Precio publicado:</b> Venta directa en efectivo / transferencia al retirar.</div>
                    <div style="margin-bottom:3px;">🚚 <b>Botón Envío:</b> Mercado Libre (cuotas, tarjetas y envío directo).</div>
                    <div>💬 <b>Botón Consultar:</b> Atención o dudas vía WhatsApp.</div>
                </div>
            `;
            tooltipWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                tooltipWrapper.classList.toggle('active');
            });
            priceRow.appendChild(tooltipWrapper);
            textCol.appendChild(priceRow);

            // Variables de enlaces
            let currentShippingLink = shippingVariants[defaultIdx] ? shippingVariants[defaultIdx].link : '';
            let currentWhatsAppLink = getWhatsAppUrl(product.title, shippingVariants[defaultIdx] ? shippingVariants[defaultIdx].label : '');

            // 2.3 Selector de Variantes
            const variantCol = document.createElement('div');
            variantCol.className = 'catalog-variant-col';

            if (shippingVariants.length > 1) {
                const selectWrapper = document.createElement('div');
                selectWrapper.className = 'catalog-select-wrapper';
                selectWrapper.style.marginTop = '0.1rem';
                selectWrapper.style.maxWidth = '200px';

                const select = document.createElement('select');
                select.className = 'catalog-select';
                select.style.padding = '0.2rem 1.2rem 0.2rem 0.5rem';

                shippingVariants.forEach((v, idx) => {
                    const opt = document.createElement('option');
                    opt.value = idx;
                    opt.textContent = v.label;
                    if (idx === defaultIdx) opt.selected = true;
                    select.appendChild(opt);
                });

                selectWrapper.appendChild(select);
                variantCol.appendChild(selectWrapper);
            } else if (shippingVariants.length === 1) {
                variantCol.innerHTML = `<span style="font-size:0.78rem; color:var(--text-muted); font-weight:500;">${shippingVariants[0].label}</span>`;
            } else {
                variantCol.innerHTML = `<span style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">Consultar disponibilidad</span>`;
            }
            textCol.appendChild(variantCol);
            row.appendChild(textCol);

            // Listener de click en el botón flotante del Carrito
            btnCartBadge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const selectEl = variantCol.querySelector('select');
                    const currentIdx = selectEl ? parseInt(selectEl.value) : defaultIdx;
                    const selectedVar = shippingVariants[currentIdx] || shippingVariants[0] || {};

                    const acabado = selectedVar.acabado || 'Único';
                    const medida = selectedVar.medida || '';
                    const price = selectedVar.price || null;

                    const carritoModule = (window.parent && window.parent.CarritoModule) || window.CarritoModule;
                    if (carritoModule && typeof carritoModule.toggle === 'function') {
                        carritoModule.toggle(product, acabado, product.categoryName || 'Catálogo', medida, '', '', price);
                    }

                    if (checkInCart()) {
                        btnCartBadge.classList.add('in-cart');
                        btnCartBadge.title = 'En Carrito (Clic para quitar)';
                        btnCartBadge.innerHTML = `<span class="material-symbols-outlined">check_circle</span>`;
                    } else {
                        btnCartBadge.classList.remove('in-cart');
                        btnCartBadge.title = 'Agregar al Carrito';
                        btnCartBadge.innerHTML = `<span class="material-symbols-outlined">add_shopping_cart</span>`;
                    }
                } catch(err) {
                    console.error('Error toggling cart:', err);
                }
            });

            // 3. Columna de Botones de Acción (Solo Envío y Consultar)
            const actionsCol = document.createElement('div');
            actionsCol.className = 'catalog-actions-col';

            // 3.1 Botón Envío (Mercado Libre)
            const btnShipping = document.createElement('a');
            btnShipping.className = 'catalog-btn catalog-btn-shipping';
            btnShipping.target = '_blank';
            btnShipping.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">local_shipping</span> Envío`;
            if (currentShippingLink) {
                btnShipping.href = currentShippingLink;
                btnShipping.style.display = 'inline-flex';
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

            // 3.2 Botón Consultar (WhatsApp)
            const btnWpp = document.createElement('a');
            btnWpp.className = 'catalog-btn catalog-btn-wpp';
            btnWpp.href = currentWhatsAppLink;
            btnWpp.target = '_blank';
            btnWpp.innerHTML = `<img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png" alt="WhatsApp" style="width: 14px; height: 14px; object-fit: cover; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"> Consultar`;
            actionsCol.appendChild(btnWpp);

            // Event Listener de Cambio de Variante
            const selectEl = variantCol.querySelector('select');
            if (selectEl) {
                selectEl.addEventListener('change', (e) => {
                    const selIdx = parseInt(e.target.value);
                    const selectedVar = shippingVariants[selIdx];
                    if (selectedVar) {
                        if (selectedVar.link) {
                            btnShipping.href = selectedVar.link;
                            btnShipping.style.display = 'inline-flex';
                        } else {
                            btnShipping.style.display = 'none';
                        }
                        btnWpp.href = getWhatsAppUrl(product.title, selectedVar.label);
                        const newPriceText = getFormattedPriceText(selectedVar);
                        if (newPriceText) {
                            priceTag.textContent = newPriceText;
                            priceTag.style.display = 'inline-flex';
                        } else {
                            priceTag.style.display = 'none';
                        }
                    }
                });
            }

            row.appendChild(actionsCol);
            catalogListContainer.appendChild(row);
        });

        // Indicador de fin de catálogo cuando se cargan todos los productos
        const oldIndicator = catalogListContainer.querySelector('.catalog-end-indicator');
        if (oldIndicator) oldIndicator.remove();

        const currentCount = catalogListContainer.querySelectorAll('.catalog-row').length;
        if (currentCount >= currentFilteredProducts.length && currentFilteredProducts.length > 0) {
            const endIndicator = document.createElement('div');
            endIndicator.className = 'catalog-end-indicator';
            endIndicator.style.cssText = 'text-align: center; padding: 1.5rem 0 3rem 0; color: var(--text-muted); font-size: 0.85rem; font-weight: 600; width: 100%; grid-column: 1 / -1;';
            endIndicator.innerHTML = `✨ Llegaste al final del catálogo (${currentFilteredProducts.length} productos)`;
            catalogListContainer.appendChild(endIndicator);
        }
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
    const checkInfiniteScroll = () => {
        const threshold = 800;
        const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight;

        if (scrollHeight - scrollTop - clientHeight < threshold) {
            if (itemsToShow < currentFilteredProducts.length) {
                itemsToShow += 30;
                renderCatalogList(currentFilteredProducts, true);
            }
        }
    };

    window.addEventListener('scroll', checkInfiniteScroll, { passive: true });
    document.addEventListener('scroll', checkInfiniteScroll, { passive: true });

    // Exponer función de refresco para el parent
    window.refreshCatalog = function() {
        loadProducts();
        renderCatalogList(allProducts);
    };

    // Inicializar
    loadProducts();
    renderCatalogList(allProducts);
});
