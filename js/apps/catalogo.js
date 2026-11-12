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
                applyAllFiltersAndSort();
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
        let rawItems = [];
        const getEngine = (window.parent && typeof window.parent.getNormalizedCatalogProducts === 'function')
            ? window.parent.getNormalizedCatalogProducts
            : (typeof window.getNormalizedCatalogProducts === 'function' ? window.getNormalizedCatalogProducts : null);

        if (getEngine) {
            rawItems = getEngine(activeCatalogRubro);
        }

        allProducts = rawItems.map(item => ({
            ...item,
            image: fixImagePath(item.image)
        }));

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
                            window.parent.showProductDetail(foundData.product, foundData.catName, product.selectedAcabado || '');
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Error opening product detail via parent:', err);
                }
                const urlSuffix = product.selectedAcabado ? `&${encodeURIComponent(product.selectedAcabado)}` : '';
                window.parent.location.href = `${detailUrl}${urlSuffix}`;
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
            thumbLink.innerHTML = `<img src="${fixImagePath(product.image).replace(/\.(webp|jpe?g|png)$/i, '_thumb.webp')}" class="catalog-thumb" alt="${product.title}" loading="lazy" onerror="if(this.src.includes('_thumb.webp')&&!this.dataset.triedOrig){this.dataset.triedOrig='1';this.src='${fixImagePath(product.image)}';return;}this.onerror=null;this.src='${fallbackImg}';">`;
            thumbLink.addEventListener('click', handleProductClick);
            thumbContainer.appendChild(thumbLink);

            // Botón Icono Flotante en la Esquina del Thumbnail
            const btnCartBadge = document.createElement('button');
            btnCartBadge.type = 'button';
            btnCartBadge.className = `catalog-thumb-cart-btn ${checkInCart() ? 'in-cart' : ''}`;
            btnCartBadge.title = checkInCart() ? 'En Carrito (Clic para quitar)' : 'Agregar al Carrito';
            btnCartBadge.innerHTML = `<span class="material-symbols-outlined">${checkInCart() ? 'check_circle' : 'add_shopping_cart'}</span>`;

            thumbContainer.appendChild(btnCartBadge);
            const bProd = product.product || product;
            const sConf = product.shippingConfig || bProd.shippingConfig || {};
            if (sConf.isFreeShipping === true || product.isFreeShipping === true || bProd.isFreeShipping === true || parseInt(sConf.logisticaFreeMinUnits) === 1 || parseInt(sConf.fleteFreeMinUnits) === 1) {
                const bCol = document.createElement("div");
                bCol.className = "catalog-thumb-badges";
                bCol.style.cssText = "position:absolute; top:8px; left:8px; z-index:10; display:flex; flex-direction:column; gap:4px; align-items:flex-start; pointer-events:none; line-height:1.2;";
                const bSpan = document.createElement("span");
                bSpan.className = "badge-item badge-shipping";
                bSpan.style.cssText = "background:rgba(16,185,129,0.95); color:#ffffff; font-size:0.65rem; font-weight:800; padding:2.5px 8px; border-radius:50px; display:inline-flex; align-items:center; gap:3px; box-shadow:0 2px 6px rgba(0,0,0,0.25); letter-spacing:0.3px; text-transform:uppercase; line-height:normal;";
                bSpan.innerHTML = '<span class="material-symbols-outlined" style="font-size:12px;">local_shipping</span><span>Envío Gratis</span>';
                bCol.appendChild(bSpan);
                thumbContainer.appendChild(bCol);
            }
            row.appendChild(thumbContainer);

            // 2. Columna de Textos (Título, Precio + Icono Info, Selector de Variante)
            const textCol = document.createElement('div');
            textCol.className = 'catalog-text-col';
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
                return 'Consultar precio';
            };

            let defaultIdx = shippingVariants.findIndex(v => v.isDefault);
            if (defaultIdx === -1) defaultIdx = 0;

            const initialPriceText = getFormattedPriceText(shippingVariants[defaultIdx]);
            priceTag.textContent = initialPriceText;
            if (initialPriceText === 'Consultar precio') {
                priceTag.style.fontSize = '0.85rem';
                priceTag.style.color = '#c0510a';
                priceTag.style.fontWeight = '700';
            }

            priceRow.appendChild(priceTag);

            // Envío Gratis / Descuentos
            const baseProd = product.product || product;
            const shipConf = product.shippingConfig || baseProd.shippingConfig || {};
            const isFree = shipConf.isFreeShipping === true || product.isFreeShipping === true || baseProd.isFreeShipping === true || parseInt(shipConf.logisticaFreeMinUnits) === 1 || parseInt(shipConf.fleteFreeMinUnits) === 1;
            if (isFree) {
                const shipTag = document.createElement('span');
                shipTag.style.cssText = 'color:#059669; font-size:0.75rem; font-weight:800; display:inline-flex; align-items:center; gap:2px; margin-left:3px;';
                shipTag.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px; color:#10b981;">local_shipping</span><span>Envío Gratis</span>';
                priceRow.appendChild(shipTag);
            }
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

            // 3.1 Botón Comprar (Abre Checkout Wizard de Pago o Ficha de Producto)
            const btnBuy = document.createElement('button');
            btnBuy.type = 'button';
            btnBuy.className = 'catalog-btn catalog-btn-shipping';
            btnBuy.style.display = 'inline-flex';
            btnBuy.style.background = 'linear-gradient(135deg, #059669, #10b981)';
            btnBuy.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.25)';
            btnBuy.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">bolt</span> Comprar`;
            btnBuy.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const selectEl = variantCol.querySelector('select');
                const currentIdx = selectEl ? parseInt(selectEl.value) : defaultIdx;
                const selectedVar = shippingVariants[currentIdx] || shippingVariants[0] || {};
                
                const medidaName = selectedVar.medida || '';
                const acabadoName = selectedVar.acabado || product.selectedAcabado || 'Único';

                // Buscar grupo correspondiente de acabados
                const grupo = (product.acabados_groups || []).find(g => (g.acabado_name || '').trim().toLowerCase() === acabadoName.trim().toLowerCase()) 
                    || (product.acabados_groups && product.acabados_groups[0]) 
                    || {};

                const variantPrice = selectedVar.price !== undefined && selectedVar.price !== null ? selectedVar.price : (parseFloat(product.price) || 0);

                try {
                    const pWin = window.parent && window.parent !== window ? window.parent : window;
                    if (typeof pWin.showProductPaymentModal === 'function') {
                        pWin.showProductPaymentModal(product, grupo, medidaName, variantPrice, 1);
                    } else if (typeof pWin.showProductDetail === 'function' && typeof pWin.findProductById === 'function') {
                        const foundData = pWin.findProductById(product.id);
                        if (foundData) {
                            pWin.showProductDetail(foundData.product, foundData.catName, acabadoName);
                        }
                    } else {
                        window.parent.location.href = `./?prod=${product.id}`;
                    }
                } catch (err) {
                    console.error('Error triggering buy modal from catalog:', err);
                    window.parent.location.href = `./?prod=${product.id}`;
                }
            });
            actionsCol.appendChild(btnBuy);

            // 3.2 Botón Consultar (WhatsApp / Crema)
            const btnWpp = document.createElement('a');
            btnWpp.className = 'catalog-btn catalog-btn-wpp';
            btnWpp.href = currentWhatsAppLink;
            btnWpp.target = '_blank';
            btnWpp.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem; color:#c0510a;">chat</span> Consultar`;
            actionsCol.appendChild(btnWpp);

            // Event Listener de Cambio de Variante
            const selectEl = variantCol.querySelector('select');
            if (selectEl) {
                selectEl.addEventListener('change', (e) => {
                    const selIdx = parseInt(e.target.value);
                    const selectedVar = shippingVariants[selIdx];
                    if (selectedVar) {

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

            // En Modo Tarjetas, hacer clic en cualquier parte libre de la tarjeta abre la publicación
            row.addEventListener('click', (e) => {
                if (!catalogListContainer || !catalogListContainer.classList.contains('view-cards')) return;
                if (e.target.closest('button, a, select, .catalog-select-wrapper, .catalog-info-tooltip-wrapper, .catalog-actions-col')) return;
                handleProductClick(e);
            });

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


    // 5. Filtrar por término de búsqueda con prioridad por niveles (Llamado desde el main window)
    const stemCatalogWord = (word) => {
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

    const tokenizeCatalogWords = (str) => {
        if (!str) return [];
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 2);
    };

    const matchCatalogTerm = (term, words) => {
        const termStem = stemCatalogWord(term);
        for (const w of words) {
            if (w === term) return 100;
            const wStem = stemCatalogWord(w);
            if (wStem.length >= 3 && termStem.length >= 3) {
                if (wStem === termStem) return 95;
                if (w.startsWith(term) && term.length >= 3) return 85;
                if (wStem.startsWith(termStem) && termStem.length >= 4) return 85;
            } else if (w.startsWith(term) && term.length >= 2) {
                return 80;
            }
        }
        return 0;
    };

    // --- CONTROLES DE VISTA (LISTA / TARJETAS), ORDENAMIENTO Y RANGO DE PRECIOS ---
    let currentSearchQuery = '';
    let currentSortMode = localStorage.getItem('latarima_catalog_sort_mode') || 'az';
    let currentViewMode = localStorage.getItem('latarima_catalog_view_mode') || (window.innerWidth >= 900 ? 'cards' : 'list');

    function getProductPriceRange(product) {
        const vars = getShippingVariants(product);
        const validPrices = vars.filter(v => v.price && Number(v.price) > 0).map(v => Number(v.price));
        if (validPrices.length > 0) {
            const defVar = vars.find(v => v.isDefault && v.price && Number(v.price) > 0);
            return {
                min: Math.min(...validPrices),
                max: Math.max(...validPrices),
                sortPrice: defVar ? Number(defVar.price) : Math.min(...validPrices)
            };
        }
        const basePrice = parseFloat(product.price);
        if (!isNaN(basePrice) && basePrice > 0) {
            return { min: basePrice, max: basePrice, sortPrice: basePrice };
        }
        return { min: null, max: null, sortPrice: null };
    }

    function setViewMode(mode) {
        currentViewMode = (mode === 'cards') ? 'cards' : 'list';
        try { localStorage.setItem('latarima_catalog_view_mode', currentViewMode); } catch (e) {}
        if (catalogListContainer) {
            catalogListContainer.classList.toggle('view-cards', currentViewMode === 'cards');
        }
        const btnList = document.getElementById('btn-view-list');
        const btnCards = document.getElementById('btn-view-cards');
        if (btnList) btnList.classList.toggle('active', currentViewMode === 'list');
        if (btnCards) btnCards.classList.toggle('active', currentViewMode === 'cards');
    }

    function applyAllFiltersAndSort() {
        let results = [...allProducts];

        // 1. Filtro por búsqueda de texto
        if (currentSearchQuery && currentSearchQuery.trim()) {
            const terms = tokenizeCatalogWords(currentSearchQuery);
            if (terms.length > 0) {
                const scored = [];
                results.forEach(p => {
                    const titleWords = tokenizeCatalogWords((p.title || '') + ' ' + (p.acabado || ''));
                    const catWords = tokenizeCatalogWords(p.categoryName || '');
                    const descWords = tokenizeCatalogWords(p.description || '').filter(w => w.length >= 4);

                    let worstTier = 0;
                    let allMatched = true;
                    for (const term of terms) {
                        const tMatch = matchCatalogTerm(term, titleWords);
                        if (tMatch > 0) { worstTier = Math.max(worstTier, 1); continue; }
                        const cMatch = matchCatalogTerm(term, catWords);
                        if (cMatch > 0) { worstTier = Math.max(worstTier, 2); continue; }
                        const dMatch = matchCatalogTerm(term, descWords);
                        if (dMatch >= 95) { worstTier = Math.max(worstTier, 3); continue; }
                        allMatched = false;
                        break;
                    }
                    if (allMatched) scored.push({ p, tier: worstTier });
                });
                const bestTier = scored.length > 0 ? Math.min(...scored.map(s => s.tier)) : 99;
                results = scored.filter(s => s.tier <= bestTier).map(s => s.p);
            }
        }


        // 3. Ordenamiento (A-Z, Z-A, Menor precio, Mayor precio)
        if (currentSortMode === 'za') {
            results.sort((a, b) => (b.title || '').localeCompare((a.title || ''), 'es', { sensitivity: 'base' }));
        } else if (currentSortMode === 'price-asc') {
            results.sort((a, b) => {
                const pa = getProductPriceRange(a).sortPrice;
                const pb = getProductPriceRange(b).sortPrice;
                if (pa === null && pb === null) return (a.title || '').localeCompare((b.title || ''), 'es');
                if (pa === null) return 1;
                if (pb === null) return -1;
                return pa - pb;
            });
        } else if (currentSortMode === 'price-desc') {
            results.sort((a, b) => {
                const pa = getProductPriceRange(a).sortPrice;
                const pb = getProductPriceRange(b).sortPrice;
                if (pa === null && pb === null) return (a.title || '').localeCompare((b.title || ''), 'es');
                if (pa === null) return 1;
                if (pb === null) return -1;
                return pb - pa;
            });
        } else {
            results.sort((a, b) => (a.title || '').localeCompare((b.title || ''), 'es', { sensitivity: 'base' }));
        }

        // Actualizar contador y botón limpiar
        const countEl = document.getElementById('catalog-results-count');
        if (countEl) {
            countEl.textContent = `${results.length} ${results.length === 1 ? 'producto' : 'productos'}`;
        }

        renderCatalogList(results);
    }

    window.filterCatalogAZ = function(query) {
        currentSearchQuery = query || '';
        applyAllFiltersAndSort();
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

    function syncParentSearchQuery() {
        try {
            const pSearch = window.parent && window.parent.document && window.parent.document.getElementById('search-input');
            currentSearchQuery = (pSearch && pSearch.value) ? pSearch.value.trim() : '';
        } catch (e) {}
    }

    // Exponer función de refresco para el parent
    window.refreshCatalog = function() {
        loadProducts();
        syncParentSearchQuery();
        applyAllFiltersAndSort();
    };

    // Vincular eventos de barra de herramientas
    document.getElementById('btn-view-list')?.addEventListener('click', () => setViewMode('list'));
    document.getElementById('btn-view-cards')?.addEventListener('click', () => setViewMode('cards'));

    const sortSelect = document.getElementById('catalog-sort-select');
    if (sortSelect) {
        sortSelect.value = currentSortMode;
        sortSelect.addEventListener('change', (e) => {
            currentSortMode = e.target.value || 'az';
            try { localStorage.setItem('latarima_catalog_sort_mode', currentSortMode); } catch (err) {}
            applyAllFiltersAndSort();
        });
    }


    // Inicializar
    setViewMode(currentViewMode);
    loadProducts();
    syncParentSearchQuery();
    applyAllFiltersAndSort();
});
