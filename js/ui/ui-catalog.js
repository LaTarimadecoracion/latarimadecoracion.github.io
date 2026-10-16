// js/ui/ui-catalog.js
// --- ORQUESTADOR PRINCIPAL DEL DETALLE DE PRODUCTOS ---
// Modularizado limpiamente:
// - js/ui/catalog/catalog-utils.js: findProductById, openProductLightbox, updateMetaTags, saveProductsToServer, etc.
// - js/ui/catalog/catalog-shipping-calc.js: Cotización de envíos, Flex, correo y fletes particulares.
// - js/ui/catalog/catalog-actions.js: Botones de compra, WhatsApp, descuentos por volumen y precios.
// - js/ui/catalog/catalog-gallery.js: Carrusel de fotos, overlay de acabados, favoritos y compartir.
// - js/modules/cortes-widget.js: Configurador interactivo y despiece de cortes de madera a medida.
// - js/modules/cajones-widget.js: Configurador de cajones crossfit y pliométricos.

(function() {
    'use strict';

    async function showProductDetail(product, categoryName, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '', isBack = false) {
        if (!product) return;

        // Resetear contenedor de configuración inferior de cortes a medida si existiera
        const bottomCuttingContainer = document.getElementById('detail-custom-cutting-bottom-container');
        if (bottomCuttingContainer) {
            bottomCuttingContainer.innerHTML = '';
            bottomCuttingContainer.style.display = 'none';
        }

        // Si el producto viene desde el índice liviano y le faltan acabados_groups, cargar ficha completa bajo demanda
        if ((!product.acabados_groups || product.acabados_groups.length === 0) && window.fetchProductDetailAsync) {
            try {
                const fullP = await window.fetchProductDetailAsync(product.id);
                if (fullP) {
                    product = Object.assign(product, fullP);
                }
            } catch (loadErr) {
                console.warn('[showProductDetail] Error cargando detalle completo:', loadErr);
            }
        }

        if (isBack) {
            const viewDetail = document.getElementById('view-product-detail');
            if (viewDetail) viewDetail.dataset.productId = product.id;
        }

        if (window.navigateToView) {
            window.navigateToView('view-product-detail', {
                title: product.title,
                category: categoryName,
                productId: product.id
            }, isBack);
        }
        
        // Asignar título y categoría principal en el cuerpo
        if (detailTitle) {
            detailTitle.textContent = product.title;
        }
        if (detailCategory) {
            let displayCategory = categoryName || '';
            let targetCatId = null;
            if (product.primaryCatId && typeof window.sessionProducts !== 'undefined') {
                const primaryCat = window.sessionProducts.find(c => c.id === product.primaryCatId);
                if (primaryCat) {
                    displayCategory = primaryCat.name;
                    targetCatId = primaryCat.id;
                }
            }
            if (!targetCatId && typeof window.sessionProducts !== 'undefined' && displayCategory) {
                const foundCat = window.sessionProducts.find(c => c.name.toLowerCase() === displayCategory.toLowerCase());
                if (foundCat) targetCatId = foundCat.id;
            }
            if (!targetCatId && typeof window.sessionProducts !== 'undefined' && product) {
                const foundCat = window.sessionProducts.find(c => c.products && c.products.some(p => p.id === product.id));
                if (foundCat) {
                    targetCatId = foundCat.id;
                    if (!displayCategory) displayCategory = foundCat.name;
                }
            }

            if (displayCategory) {
                detailCategory.textContent = displayCategory;
                if (targetCatId) {
                    detailCategory.dataset.categoryId = targetCatId;
                    detailCategory.style.cursor = 'pointer';
                } else {
                    delete detailCategory.dataset.categoryId;
                    detailCategory.style.cursor = 'default';
                }
            } else {
                detailCategory.textContent = '';
            }
        }

        // Helper para crear slug amigable del título del producto
        const cleanTitleSlug = (product.title || '')
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
            
        const prodParamVal = cleanTitleSlug ? cleanTitleSlug : product.id;

        // Actualizar URL en el historial si es necesario
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('prod') !== prodParamVal && urlParams.get('prod') !== product.id) {
            const initialParams = new URLSearchParams();
            initialParams.set('prod', prodParamVal);
            if (preselectedAcabado && preselectedAcabado !== 'Único') initialParams.set(preselectedAcabado, '');
            if (preselectedMedida) initialParams.set(preselectedMedida, '');
            if (preselectedOpcion) initialParams.set(preselectedOpcion, '');
            
            let queryStr = initialParams.toString().replace(/=(?=&|$)/g, '');
            const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + (queryStr ? `?${queryStr}` : '');
            const comesFromLegacy = (urlParams.get('p') === product.id || urlParams.get('product') === product.id);
            if (comesFromLegacy || isBack) {
                window.history.replaceState({ viewId: 'view-product-detail', productId: product.id }, document.title, cleanUrl);
            } else {
                window.history.pushState({ viewId: 'view-product-detail', productId: product.id }, document.title, cleanUrl);
            }
        }

        // Actualizar SEO tags dinámicamente
        let imageUrl = '';
        if (Array.isArray(product.image) && product.image.length > 0) imageUrl = product.image[0];
        else if (typeof product.image === 'string') imageUrl = product.image;
        else if (product.acabados_groups && product.acabados_groups.length > 0) imageUrl = product.acabados_groups[0].cover_image;
        
        const safeDesc = (product.description || '').replace(/<[^>]*>?/gm, '');
        if (typeof window.updateMetaTags === 'function') {
            window.updateMetaTags(product.title, safeDesc, imageUrl, product);
        }

        const detailImgContainer = document.querySelector('.detail-img-container');
        const detailDescription = document.getElementById('detail-description');
        
        function isProductInFavorites(productId, acabado, medida = '', opcion = '') {
            try {
                const data = localStorage.getItem('cartItems');
                if (data) {
                    const arr = JSON.parse(data);
                    return arr.some(item => 
                        String(item.id) === String(productId) && 
                        (item.acabado || '').trim().toLowerCase() === (acabado || '').trim().toLowerCase() &&
                        (item.medida || '').trim().toLowerCase() === (medida || '').trim().toLowerCase() &&
                        (item.opcion || '').trim().toLowerCase() === (opcion || '').trim().toLowerCase()
                    );
                }
            } catch (e) {}
            return false;
        }

        const updateFavState = () => {
            const btnFav = document.getElementById('btn-gallery-fav-dynamic');
            const btnAddCart = document.getElementById('btn-add-cart-product');
            const btnCartText = document.getElementById('btn-add-cart-text');

            const grupo = grupos[currentGroupIndex] || {};
            const acabado = grupo.acabado_name || 'Único';
            
            const selMedida = divMedida ? divMedida.querySelector('select') : null;
            const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

            const selOpt = divOpt ? divOpt.querySelector('select') : null;
            const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';

            const inFav = isProductInFavorites(product.id, acabado, medidaText, optText);

            if (btnFav) {
                if (inFav) {
                    btnFav.classList.add('is-fav');
                    btnFav.innerHTML = `<span class="material-symbols-outlined">favorite</span>`;
                } else {
                    btnFav.classList.remove('is-fav');
                    btnFav.innerHTML = `<span class="material-symbols-outlined">favorite_border</span>`;
                }
            }

            if (btnAddCart && btnCartText) {
                if (inFav) {
                    btnAddCart.style.background = '#e2e8f0';
                    btnAddCart.style.borderColor = '#cbd5e1';
                    btnAddCart.style.color = '#334155';
                    btnCartText.textContent = 'En tu carrito ✓';
                } else {
                    btnAddCart.style.background = '#f0fdf4';
                    btnAddCart.style.borderColor = '#86efac';
                    btnAddCart.style.color = '#166534';
                    btnCartText.textContent = 'Agregar al Carrito';
                }
            }
        };

        const updateUrlWithVariants = () => {
            const currentParams = new URLSearchParams(window.location.search);
            const newParams = new URLSearchParams();
            
            // Conservar solo parámetros de enrutamiento del sistema
            const systemKeys = ['prod', 'product', 'p', 'view', 'cat', 'category'];
            systemKeys.forEach(key => {
                if (currentParams.has(key)) {
                    newParams.set(key, currentParams.get(key));
                }
            });
            
            // Asegurar el prod con slug amigable si existe
            const cleanTitleSlug = (product.title || '')
                .trim()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9\s-]/g, "")
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
            newParams.set('prod', cleanTitleSlug || product.id);
            
            // Añadir variantes como claves vacías
            const grupo = grupos[currentGroupIndex];
            if (grupo && grupo.acabado_name && grupo.acabado_name !== 'Único') {
                newParams.set(grupo.acabado_name, '');
            }
            
            const selMedida = divMedida.querySelector('select');
            const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';
            if (medidaText) {
                newParams.set(medidaText, '');
            }
            
            const selOpt = divOpt.querySelector('select');
            const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
            if (optText) {
                newParams.set(optText, '');
            }
            
            // Limpiar los signos "=" vacíos
            let queryStr = newParams.toString().replace(/=(?=&|$)/g, '');
            const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + (queryStr ? `?${queryStr}` : '');
            window.history.replaceState({ viewId: 'view-product-detail', productId: product.id }, document.title, cleanUrl);
        };

        const attrContainer = document.getElementById('detail-attributes-container');
        const priceDisplay = document.getElementById('detail-price-display');
        const btnShipping = document.getElementById('btn-buy-shipping');
        const btnPickup = document.getElementById('btn-buy-pickup');
        const phone = (() => {
            const waUrl = window.siteConfig?.socialLinks?.whatsapp || 'https://wa.me/5491167007723';
            return waUrl.replace('https://wa.me/', '');
        })();

        // Vincular eventos de conversión de Google Analytics
        if (btnShipping) {
            btnShipping.onclick = () => {
                try {
                    if (typeof gtag === 'function') {
                        gtag('event', 'begin_checkout', {
                            currency: 'ARS',
                            items: [{
                                item_id: product.id,
                                item_name: product.title,
                                item_category: categoryName
                            }]
                        });
                    }
                } catch (e) { /* Ignore adblocker errors */ }
            };
        }

        // 1. Identificar grupos de acabado
        let grupos = (product.acabados_groups || []).filter(g => !g.hidden);
        
        // --- COMPATIBILITY FALLBACK ---
        if (grupos.length === 0) {
            grupos = [{
                acabado_name: product.acabado || 'Único',
                cover_image: typeof product.image === 'string' ? product.image : (product.image?.[0] || ''),
                images_list: product.images_list && product.images_list.length > 0 ? product.images_list : (Array.isArray(product.image) ? product.image : [product.image]),
                medidas_variants: product.medidas_variants || []
            }];
        }
        
        if (detailDescription) {
            detailDescription.textContent = product.description;
        }

        attrContainer.innerHTML = '';

        // Contenedores internos para selectores
        const divAcabado = document.createElement('div');
        const divSelectorsRow = document.createElement('div');
        divSelectorsRow.className = 'selectors-row';
        const divMedida = document.createElement('div');
        const divOpt = document.createElement('div');
        
        attrContainer.appendChild(divAcabado);
        attrContainer.appendChild(divSelectorsRow);
        divSelectorsRow.appendChild(divMedida);
        divSelectorsRow.appendChild(divOpt);

        // Resetear la cantidad a 1
        const qtyValEl = document.getElementById('qty-value');
        if (qtyValEl) {
            qtyValEl.textContent = '1';
        }

        let initialGroupIndex = 0;
        if (preselectedAcabado && grupos.length > 0) {
            const matchedIdx = grupos.findIndex(g => (g.acabado_name || '').trim().toLowerCase() === (preselectedAcabado || '').trim().toLowerCase());
            if (matchedIdx !== -1) {
                initialGroupIndex = matchedIdx;
            }
        }
        let currentGroupIndex = initialGroupIndex;

        // Estado dinámico para Despiece / Múltiples Cortes a Medida
        let customCutsList = [];
        window._activeCustomCutsList = customCutsList;

        // Helper para actualizar compra y precios usando el módulo catalog-actions.js
        const updateBuyButton = (grupoParam, medidaNameParam) => {
            if (typeof window.updateProductBuyButton === 'function') {
                window.updateProductBuyButton({
                    product,
                    grupo: grupoParam,
                    medidaName: medidaNameParam,
                    categoryName,
                    customCutsList: window._activeCustomCutsList || customCutsList,
                    cajonesList: window._activeCajonesList || [],
                    phone,
                    divMedida,
                    divOpt
                });
            }
        };

        // Configurar los botones de cantidad
        const btnMinus = document.getElementById('btn-qty-minus');
        const btnPlus = document.getElementById('btn-qty-plus');
        if (btnMinus && btnPlus && qtyValEl) {
            const triggerQtyUpdate = (newQty) => {
                qtyValEl.textContent = newQty;
                const curGroup = grupos[currentGroupIndex] || grupos[0];
                let mName = '';
                if (product.isCustomCutting === true || product.id === '69') {
                    mName = curGroup?.medidas_variants?.[0]?.medida || '';
                } else {
                    const selMedida = divMedida.querySelector('select');
                    mName = selMedida ? selMedida.value : '';
                }
                updateBuyButton(curGroup, mName);
            };

            btnMinus.onclick = (e) => {
                e.preventDefault();
                let qty = parseInt(qtyValEl.textContent || '1', 10);
                if (qty > 1) {
                    qty--;
                    triggerQtyUpdate(qty);
                }
            };
            btnPlus.onclick = (e) => {
                e.preventDefault();
                let qty = parseInt(qtyValEl.textContent || '1', 10);
                qty++;
                triggerQtyUpdate(qty);
            };
        }

        // Listener para recalcular si el usuario actualiza su código postal
        if (!window._cpUpdateListenerBound) {
            window._cpUpdateListenerBound = true;
            window.addEventListener('latarima:cp-updated', () => {
                const activeGrupo = grupos[currentGroupIndex] || grupos[0];
                const selMedida = divMedida ? divMedida.querySelector('select') : null;
                const mName = selMedida ? selMedida.value : '';
                updateBuyButton(activeGrupo, mName);
            });
        }

        function updateGroupView(index) {
            currentGroupIndex = index;
            const grupo = grupos[index];

            // Actualizar subtítulo en la barra superior con el acabado si aplica
            const sub = document.getElementById('dynamic-subtitle');
            if (sub) {
                if (grupo.acabado_name && grupo.acabado_name !== 'Único') {
                    sub.textContent = `${categoryName}  ·  ${grupo.acabado_name}`;
                } else {
                    sub.textContent = categoryName;
                }
            }

            // Actualizar descripción dinámica
            if (detailDescription) {
                const targetDesc = (grupo.description && grupo.description.trim()) ? grupo.description.trim() : (product.description || '');
                if (detailDescription.textContent !== targetDesc) {
                    detailDescription.style.transition = 'opacity 0.15s ease';
                    detailDescription.style.opacity = '0.3';
                    setTimeout(() => {
                        detailDescription.textContent = targetDesc;
                        detailDescription.style.opacity = '1';
                    }, 150);
                }
            }

            // 1. Re-render Gallery vía catalog-gallery.js
            if (typeof window.renderProductGallery === 'function') {
                window.renderProductGallery({
                    product,
                    grupo,
                    grupos,
                    currentGroupIndex,
                    categoryName,
                    detailImgContainer,
                    divMedida,
                    divOpt,
                    isProductInFavorites,
                    updateFavState,
                    onSelectGroup: (idx) => updateGroupView(idx)
                });
            }

            // 2. Re-render Medidas Select (Cascade)
            divMedida.innerHTML = '';
            let defaultMedidaName = '';
            if (grupo.medidas_variants && grupo.medidas_variants.length > 0) {
                const uniqueMedidas = [];
                grupo.medidas_variants.forEach(m => {
                    if (m.hidden === true) return;
                    const name = (m.medida || '').trim();
                    if (!uniqueMedidas.includes(name)) uniqueMedidas.push(name);
                });

                if (preselectedMedida) {
                    const matchedName = uniqueMedidas.find(n => n.toLowerCase() === (preselectedMedida || '').trim().toLowerCase());
                    if (matchedName) defaultMedidaName = matchedName;
                }
                
                if (!defaultMedidaName) {
                    const defIndex = grupo.medidas_variants.findIndex(m => m.default === true && m.hidden !== true);
                    if (defIndex !== -1) {
                        defaultMedidaName = (grupo.medidas_variants[defIndex].medida || '').trim();
                    } else {
                        defaultMedidaName = uniqueMedidas[0] || '';
                    }
                }

                if ((product.isCajonProduct === true || product.id === '95') && typeof window.initCajonesWidget === 'function') {
                    // MODO CAJÓN CROSSFIT & PLIOMÉTRICO
                    const bottomContainer = document.getElementById('detail-custom-cutting-bottom-container');
                    window.initCajonesWidget(product, grupo, {
                        divMedida,
                        bottomContainer,
                        updateBuyButton,
                        updateFavState,
                        updateUrlWithVariants,
                        getBestDiscountRule: (qty, v) => window.getBestDiscountRule ? window.getBestDiscountRule(product, qty, v) : null
                    });
                } else if ((product.isCustomCutting === true || product.id === '69') && typeof window.initCortesWidget === 'function') {
                    // MODO CORTE INTERACTIVO A MEDIDA
                    const bottomContainer = document.getElementById('detail-custom-cutting-bottom-container');
                    window.initCortesWidget(product, grupo, {
                        divMedida,
                        bottomContainer,
                        updateBuyButton,
                        updateFavState,
                        updateUrlWithVariants,
                        getBestDiscountRule: (qty, v) => window.getBestDiscountRule ? window.getBestDiscountRule(product, qty, v) : null,
                        getProductVolumeDiscounts: (v) => window.getProductVolumeDiscounts ? window.getProductVolumeDiscounts(product, v) : [],
                        preselectedMedida
                    });
                } else {
                    divMedida.className = 'variant-selector-wrapper mt-1';
                    divMedida.innerHTML = `
                        <label class="variant-label">📏 Medida / Variantes</label>
                        <select class="variant-select-cascade">
                            ${uniqueMedidas.map(name => `
                                <option value="${name}" ${name === defaultMedidaName ? 'selected' : ''}>${name}</option>
                            `).join('')}
                        </select>
                    `;
                    divMedida.style.display = 'block';
                    divMedida.querySelector('select').addEventListener('change', (e) => {
                        updateBuyButton(grupo, e.target.value);
                        updateFavState();
                        updateUrlWithVariants();
                    });
                }
            } else {
                divMedida.style.display = 'none';
            }

            // Actualización inicial de botones y precios para este grupo
            const initialMedida = (product.isCustomCutting === true || product.id === '69' || product.isCajonProduct === true || product.id === '95')
                ? (grupo.medidas_variants && grupo.medidas_variants[0] ? grupo.medidas_variants[0].medida : defaultMedidaName)
                : defaultMedidaName;
            updateBuyButton(grupo, initialMedida);
            updateFavState();
            updateUrlWithVariants();
        }

        // Acabado Selector (Integrado directamente sobre la foto del producto)
        divAcabado.style.display = 'none';

        // Optional Variant Selector (Cascade)
        const optVariant = product.optional_variant;
        if (optVariant && optVariant.options && optVariant.options.length > 0) {
            let defaultOptIdx = 0;
            if (preselectedOpcion) {
                const matchedOptIdx = optVariant.options.findIndex(o => (o || '').trim().toLowerCase() === (preselectedOpcion || '').trim().toLowerCase());
                if (matchedOptIdx !== -1) defaultOptIdx = matchedOptIdx;
            }

            const cleanLabel = (optVariant.label || 'Opción')
                .replace(/\(OPCIONAL\)/gi, '')
                .trim();
            const displayLabel = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1).toLowerCase();

            divOpt.className = 'variant-selector-wrapper mt-1';
            divOpt.innerHTML = `
                <label class="variant-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">✨ ${displayLabel} <span style="font-size: 0.7rem; color: #94a3b8; font-weight: 500;">(Opcional)</span></label>
                <select class="variant-select-cascade">
                    ${optVariant.options.map((o, i) => `
                        <option value="${i}" ${i === defaultOptIdx ? 'selected' : ''}>${o}</option>
                    `).join('')}
                </select>
            `;
            divOpt.style.display = 'block';
            divOpt.querySelector('select').addEventListener('change', () => {
                const selMedida = divMedida.querySelector('select');
                const sName = selMedida ? selMedida.value : '';
                updateBuyButton(grupos[currentGroupIndex], sName);
                updateFavState();
                updateUrlWithVariants();
            });
        } else {
            divOpt.innerHTML = '';
            divOpt.style.display = 'none';
        }

        // Inicializar la vista con el grupo seleccionado
        updateGroupView(currentGroupIndex);

        preselectedAcabado = '';
        preselectedMedida = '';
        preselectedOpcion = '';

        // Conectar botón COMPRAR YA al Wizard de Pago / Checkout
        const btnBuyNow = document.getElementById('btn-buy-now-product');
        if (btnBuyNow) {
            btnBuyNow.onclick = (e) => {
                e.preventDefault();
                const grupo = (grupos && grupos[currentGroupIndex]) ? grupos[currentGroupIndex] : {};
                const selMedida = divMedida.querySelector('select');
                let medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';
                
                const selOpt = divOpt.querySelector('select');
                const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
                const optLabel = product.optional_variant?.label || '';

                const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaText);
                let variantPrice = (activeVariant && activeVariant.price !== undefined && activeVariant.price !== '') ? activeVariant.price : (parseFloat(product.price) || 0);
                
                const qtyValEl = document.getElementById('qty-value');
                let qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1', 10) : 1;

                const activeCuts = window._activeCustomCutsList || customCutsList;
                if ((product.isCustomCutting === true || product.id === '69') && Array.isArray(activeCuts) && activeCuts.length > 0) {
                    const totalPieces = activeCuts.reduce((acc, c) => acc + (c.qty || 1), 0);
                    let netSubtotal = 0;
                    activeCuts.forEach(c => {
                        let cSub = c.subtotal || 0;
                        const rule = window.getBestDiscountRule ? window.getBestDiscountRule(product, c.qty || 1, activeVariant) : null;
                        if (rule) {
                            if (rule.discountPercent !== undefined && rule.discountPercent > 0) {
                                cSub = cSub * (1 - rule.discountPercent / 100);
                            } else if (rule.discountValue !== undefined && rule.discountValue > 0) {
                                const minU = rule.minQty !== undefined ? rule.minQty : rule.minUnits;
                                cSub = Math.max(0, cSub - (Math.floor((c.qty || 1) / minU) * rule.discountValue));
                            }
                        }
                        netSubtotal += cSub;
                    });
                    const cutsSummary = activeCuts.map(c => `${c.qty}x ${c.largo}x${c.ancho}cm (${c.material} ${c.espesor})`).join(' | ');
                    medidaText = `Despiece (${totalPieces} piezas: ${cutsSummary})`;
                    variantPrice = Math.round(netSubtotal / totalPieces);
                    qtyVal = totalPieces;
                }

                if (window.showProductPaymentModal) {
                    window.showProductPaymentModal(product, grupo, medidaText, variantPrice, qtyVal, optText, optLabel);
                } else if (window.showOfferPaymentModal) {
                    window.showOfferPaymentModal(product, qtyVal, { grupo, medida: medidaText, price: variantPrice, opcion: optText, opcionLabel: optLabel });
                }
            };
        }

        // Conectar botón AGREGAR AL CARRITO
        const btnAddCart = document.getElementById('btn-add-cart-product');
        if (btnAddCart) {
            btnAddCart.onclick = (e) => {
                e.preventDefault();
                if (window.CarritoModule && window.CarritoModule.toggle) {
                    const grupo = (grupos && grupos[currentGroupIndex]) ? grupos[currentGroupIndex] : {};
                    const acabadoName = grupo.acabado_name || 'Único';
                    const selMedida = divMedida ? divMedida.querySelector('select') : null;
                    let medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

                    const selOpt = divOpt ? divOpt.querySelector('select') : null;
                    const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
                    const optLabel = product.optional_variant?.label || '';

                    const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaText);
                    let itemPrice = (activeVariant && activeVariant.showPrice === true && activeVariant.price) ? activeVariant.price : null;

                    const qtyValEl = document.getElementById('qty-value');
                    let qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1', 10) : 1;

                    const activeCuts = window._activeCustomCutsList || customCutsList;
                    if ((product.isCustomCutting === true || product.id === '69') && Array.isArray(activeCuts) && activeCuts.length > 0) {
                        const totalPieces = activeCuts.reduce((acc, c) => acc + (c.qty || 1), 0);
                        let netSubtotal = 0;
                        activeCuts.forEach(c => {
                            let cSub = c.subtotal || 0;
                            const rule = window.getBestDiscountRule ? window.getBestDiscountRule(product, c.qty || 1, activeVariant) : null;
                            if (rule) {
                                if (rule.discountPercent !== undefined && rule.discountPercent > 0) {
                                    cSub = cSub * (1 - rule.discountPercent / 100);
                                } else if (rule.discountValue !== undefined && rule.discountValue > 0) {
                                    const minU = rule.minQty !== undefined ? rule.minQty : rule.minUnits;
                                    cSub = Math.max(0, cSub - (Math.floor((c.qty || 1) / minU) * rule.discountValue));
                                }
                            }
                            netSubtotal += cSub;
                        });
                        const cutsSummary = activeCuts.map(c => `${c.qty}x ${c.largo}x${c.ancho}cm (${c.material} ${c.espesor})`).join(' | ');
                        medidaText = `Despiece (${totalPieces} piezas: ${cutsSummary})`;
                        itemPrice = Math.round(netSubtotal / totalPieces);
                        qtyVal = totalPieces;
                    }

                    window.CarritoModule.toggle(product, acabadoName, categoryName, medidaText, optText, optLabel, itemPrice, qtyVal);
                    updateFavState();
                }
            };
        }

        // Conectar botones informativos (Formas de Pago, Envíos y Calidad)
        const btnModalPay = document.getElementById('btn-product-modal-payments');
        if (btnModalPay) {
            btnModalPay.onclick = (e) => {
                e.preventDefault();
                if (window.showItemInfoModal) window.showItemInfoModal('payments', product);
            };
        }

        const btnModalShip = document.getElementById('btn-product-modal-shipping');
        if (btnModalShip) {
            btnModalShip.onclick = (e) => {
                e.preventDefault();
                if (window.showItemInfoModal) window.showItemInfoModal('shipping', product);
            };
        }

        const btnModalWar = document.getElementById('btn-product-modal-warranty');
        if (btnModalWar) {
            btnModalWar.onclick = (e) => {
                e.preventDefault();
                if (window.showItemInfoModal) window.showItemInfoModal('warranty', product);
            };
        }

        // Registrar visita
        if (window.trackProductView) {
            window.trackProductView(product.id);
        }

        // Rellenar carrusel de recomendados ("Los más buscados")
        const relatedList = document.getElementById('detail-related-product-list');
        if (relatedList) {
            relatedList.className = 'carousel-categories';
            relatedList.innerHTML = '';
            
            const sourceData = (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0) ? window.sessionProducts : productsData;
            if (typeof sourceData !== 'undefined' && sourceData.length > 0) {
                let allProductsList = [];
                const seenIds = new Set();
                sourceData.forEach(cat => {
                    if (cat.visible === false) return;
                    if (cat.products) {
                        cat.products.forEach(p => {
                            if (p.visible === false) return;
                            if (!seenIds.has(p.id) && p.id !== product.id) {
                                seenIds.add(p.id);
                                const res = window.findProductById ? window.findProductById(p.id) : null;
                                allProductsList.push({ product: p, catName: res ? res.catName : cat.name });
                            }
                        });
                    }
                });

                // Selección aleatoria de 8 productos recomendados
                const randomSelections = [...allProductsList]
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 8);

                const renderCarousel = (window.setupInfiniteCarousel && typeof window.setupInfiniteCarousel === 'function')
                    ? window.setupInfiniteCarousel
                    : (container, items, renderFn) => {
                        container.innerHTML = '';
                        items.forEach((it, i) => container.appendChild(renderFn(it, i)));
                    };

                renderCarousel(relatedList, randomSelections, ({ product: p, catName }, idx) => {
                    const pCard = document.createElement('div');
                    pCard.className = 'category-card';
                    const productCover = Array.isArray(p.image) ? p.image[0] : (p.image || 'img/logo_provisional.png');
                    const isEager = idx < 3;
                    pCard.innerHTML = `
                        <div class="category-card-img-wrapper" style="position:relative;">
                            <img src="${productCover}" class="category-card-img ${isEager ? 'loaded' : 'lazy-img'}" alt="${p.title}" loading="${isEager ? 'eager' : 'lazy'}" ${isEager ? '' : 'onload="this.classList.add(\'loaded\')"'}>
                        </div>
                        <div class="category-overlay">
                            <span>${p.title}</span>
                        </div>
                    `;
                    pCard.addEventListener('click', () => {
                        if (window.showProductDetail) {
                            window.showProductDetail(p, catName);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            const appContainer = document.getElementById('app-container');
                            if (appContainer) appContainer.scrollTop = 0;
                        }
                    });
                    return pCard;
                });

                if (typeof window.enableDragToScroll === 'function') {
                    window.enableDragToScroll(relatedList);
                }
            } else {
                relatedList.innerHTML = '<p class="text-muted">No hay productos recomendados disponibles.</p>';
            }
        }
    }

    // Exponer públicamente manteniendo compatibilidad total
    window.showProductDetail = window.safeRender ? window.safeRender(showProductDetail, 'showProductDetail') : showProductDetail;
})();