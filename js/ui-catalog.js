
    function findProductById(prodId) {
        if (!window.sessionProducts || !prodId) return null;
        const searchClean = decodeURIComponent(prodId).trim().toLowerCase();
        const normSearch = searchClean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

        let fallback = null;
        for (const cat of window.sessionProducts) {
            if (cat.products) {
                const found = cat.products.find(p => {
                    if (!p) return false;
                    const pId = (p.id || '').trim().toLowerCase();
                    const pTitle = (p.title || '').trim().toLowerCase();
                    const normTitle = pTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                    const normId = pId.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                    return pId === searchClean || pTitle === searchClean || normId === normSearch || normTitle === normSearch || (normSearch.length > 5 && normTitle.includes(normSearch));
                });
                if (found) {
                    if (found.primaryCatId === cat.id) {
                        return { product: found, catName: cat.name };
                    }
                    if (!fallback) {
                        fallback = { product: found, catName: cat.name };
                    }
                }
            }
        }
        return fallback;
    }



    function getProductTimestamp(product) {
        if (product.last_modified) {
            const ts = Number(product.last_modified);
            if (!isNaN(ts)) return ts;
        }

        // Parse timestamp from image path if exists
        let maxTimestamp = 0;
        const checkPath = (path) => {
            if (path && typeof path === 'string') {
                const match = path.match(/(\d{13})/);
                if (match) {
                    const ts = parseInt(match[1]);
                    if (ts > 1577836800000 && ts < 4102444800000) { // between 2020 and 2100
                        if (ts > maxTimestamp) {
                            maxTimestamp = ts;
                        }
                    }
                }
            }
        };

        if (typeof product.image === 'string') {
            checkPath(product.image);
        } else if (Array.isArray(product.image)) {
            product.image.forEach(checkPath);
        }

        if (product.acabados_groups) {
            product.acabados_groups.forEach(g => {
                checkPath(g.cover_image);
                if (g.images_list) {
                    g.images_list.forEach(checkPath);
                }
            });
        }
        return maxTimestamp;
    }



    function getLatestModificationYear() {
        let latestYear = new Date().getFullYear();
        let maxTimestamp = 0;

        const sourceProducts = (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (typeof productsData !== 'undefined' ? productsData : []);

        sourceProducts.forEach(cat => {
            if (cat.products) {
                cat.products.forEach(product => {
                    const ts = getProductTimestamp(product);
                    if (ts > maxTimestamp) {
                        maxTimestamp = ts;
                    }
                });
            }
        });

        if (maxTimestamp > 0) {
            latestYear = new Date(maxTimestamp).getFullYear();
        }
        return latestYear;
    }




    function updateActionLinks(linkMercadoLibre, whatsappMessage) {
        btnBuyShipping.href = linkMercadoLibre || '#';
        const phone = "5491167007723"; 
        const text = encodeURIComponent(whatsappMessage);
        btnBuyPickup.href = `https://wa.me/${phone}?text=${text}`;
    }



    function updateMetaTags(title, desc, imageUrl) {
        document.title = title ? `${title} | LA TARIMA - Decoración` : 'LA TARIMA - Decoración';
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        
        if (ogTitle && title) ogTitle.setAttribute('content', `${title} - LA TARIMA`);
        if (ogDesc && desc) ogDesc.setAttribute('content', desc.substring(0, 150));
        if (ogImage && imageUrl) {
            const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}/${imageUrl.replace(/^[\/\\]/, '')}`;
            ogImage.setAttribute('content', absoluteImageUrl);
        }
    }



    function showProductDetail(product, categoryName, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '', isBack = false) {
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
        updateMetaTags(product.title, safeDesc, imageUrl);

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
        const phone = '5491167007723';

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

        if (btnPickup) {
            btnPickup.onclick = (e) => {
                if (e) e.preventDefault();
                try {
                    if (typeof gtag === 'function') {
                        gtag('event', 'contact', {
                            method: 'WhatsApp',
                            event_category: 'Engagement',
                            event_label: 'Consultar WhatsApp Producto',
                            item_id: product.id,
                            item_name: product.title,
                            item_category: categoryName
                        });
                    }
                } catch (err) { /* Ignore adblocker errors */ }

                const grupo = grupos[currentGroupIndex] || grupos[0];
                const selMedida = divMedida ? divMedida.querySelector('select') : null;
                const mName = selMedida ? selMedida.value : '';
                const activeMlVariant = (grupo && grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === mName);
                const currentMlLink = (activeMlVariant && activeMlVariant.link) ? activeMlVariant.link.trim() : '';

                showDeliveryModal(grupo, mName, currentMlLink);
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
        
        detailDescription.textContent = product.description;
        // El precio se actualizará dinámicamente en updateBuyButton según la variante seleccionada

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

        // Configurar los botones de cantidad
        const btnMinus = document.getElementById('btn-qty-minus');
        const btnPlus = document.getElementById('btn-qty-plus');
        if (btnMinus && btnPlus && qtyValEl) {
            btnMinus.onclick = (e) => {
                e.preventDefault();
                let qty = parseInt(qtyValEl.textContent || '1');
                if (qty > 1) {
                    qty--;
                    qtyValEl.textContent = qty;
                    // Actualizar precio y link de WhatsApp
                    const selMedida = divMedida.querySelector('select');
                    const mName = selMedida ? selMedida.value : '';
                    updateBuyButton(grupos[currentGroupIndex], mName);
                }
            };
            btnPlus.onclick = (e) => {
                e.preventDefault();
                let qty = parseInt(qtyValEl.textContent || '1');
                qty++;
                qtyValEl.textContent = qty;
                // Actualizar precio y link de WhatsApp
                const selMedida = divMedida.querySelector('select');
                const mName = selMedida ? selMedida.value : '';
                updateBuyButton(grupos[currentGroupIndex], mName);
            };
        }


        function buildWA(grupo, medidaName) {
            const selOpt = divOpt.querySelector('select');
            const optText = selOpt ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
            const optLabel = product.optional_variant?.label || '';

            const qtyValEl = document.getElementById('qty-value');
            const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1') : 1;

            let details = [];
            if (grupo && grupo.acabado_name && grupo.acabado_name !== 'Único') {
                details.push(`• Acabado: ${grupo.acabado_name}`);
            }
            if (medidaName) {
                details.push(`• Medida: ${medidaName}`);
            }
            if (optText && optLabel) {
                details.push(`• ${optLabel}: ${optText}`);
            }
            if (qtyVal > 1) {
                details.push(`• Cantidad: ${qtyVal}`);
            }

            const detailsStr = details.length > 0 ? ` (${details.map(d => d.replace('• ', '')).join(', ')})` : '';

            // Obtener link corto del producto usando el acortador nativo (TarimaShortener)
            let productUrl = window.location.href;
            if (window.TarimaShortener && typeof window.TarimaShortener.encodeShortCode === 'function') {
                const acabName = (grupo && grupo.acabado_name) ? grupo.acabado_name : '';
                const shortCode = window.TarimaShortener.encodeShortCode(product.id, acabName, medidaName, optText, false);
                if (shortCode) {
                    const origin = window.location.origin;
                    const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
                    productUrl = `${origin}${path}/p/${shortCode}.html`;
                }
            }

            let vacationNote = "";
            if (window.vacationConfig && window.vacationConfig.active) {
                const start = window.vacationConfig.startDate || "receso";
                const deliv = window.vacationConfig.deliveriesDate || "el regreso";
                vacationNote = `\n\n(Nota: Sé que están de vacaciones del ${start} y las entregas se retoman a partir del ${deliv}).`;
            }

            return `¡Hola! Quisiera consultar más información sobre el producto *${product.title}*${detailsStr}.\n\nLink al producto: ${productUrl}${vacationNote}`;
        }

        // ── Direct WhatsApp Consultation (Bypassing Modal) ──────────────────────────────
        function showDeliveryModal(grupo, medidaName, mlLink) {
            const waMsg = buildWA(grupo, medidaName);
            try {
                if (typeof gtag === 'function') gtag('event', 'contact', { method: 'WhatsApp', event_category: 'Engagement', event_label: 'Consultar WhatsApp Producto' });
            } catch(e) {}
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
        }

        function updateBuyButton(grupo, medidaName) {
            const container = document.getElementById('dynamic-shipping-links-container');
            if (container) {
                container.innerHTML = '';
                
                let linksToRender = [];
                if (grupo.medidas_variants && grupo.medidas_variants.length > 0) {
                    linksToRender = grupo.medidas_variants.filter(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
                }
                
                if (linksToRender.length > 0) {
                    linksToRender.forEach(variant => {
                        const link = (variant.link || '').trim();
                        if (link) {
                            let linkLabel = variant.linkLabel || "Comprar con envío";
                            let iconType = variant.iconType || "local_shipping";

                            const wrapper = document.createElement('div');
                            wrapper.style.display = "flex";
                            wrapper.style.flexDirection = "column";
                            wrapper.style.gap = "4px";
                            wrapper.style.width = "100%";

                            const btn = document.createElement('a');
                            btn.href = link;
                            btn.target = "_blank";
                            btn.className = "btn-primary giant-btn" + (variant.highlight ? " btn-highlight-pulse" : "");
                            btn.style.display = "flex";
                            btn.innerHTML = `<span class="material-symbols-outlined">${iconType}</span><span>${linkLabel}</span>`;
                            
                            // Re-bind Google Analytics event
                            btn.onclick = () => {
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
                                } catch (e) { /* Ignore */ }
                            };
                            
                            // Leyenda por defecto según URL
                            let legendText = (variant.legend || '').trim();
                            if (!legendText) {
                                const lLower = link.toLowerCase();
                                if (lLower.includes('mercadolibre.com') || lLower.includes('ml.com') || lLower.includes('mpago.')) {
                                    legendText = "Redirige a Mercado Libre (tarjeta, cuotas y envíos a todo el país)";
                                } else if (lLower.includes('wa.me') || lLower.includes('whatsapp.com')) {
                                    legendText = "Chateá con nosotros directamente por WhatsApp";
                                } else {
                                    legendText = "Redirige a plataforma de pago externa segura";
                                }
                            }

                            const legendEl = document.createElement('span');
                            legendEl.style.fontSize = "0.75rem";
                            legendEl.style.color = "#64748B";
                            legendEl.style.textAlign = "center";
                            legendEl.style.marginTop = "2px";
                            legendEl.style.fontStyle = "italic";
                            legendEl.innerText = legendText;

                            wrapper.appendChild(btn);
                            wrapper.appendChild(legendEl);
                            container.appendChild(wrapper);
                        }
                    });
                }
                
                if (container.children.length === 0) {
                    container.style.display = 'none';
                } else {
                    container.style.display = 'flex';
                }
            }

            // Actualizar visualización de precio
            if (priceDisplay) {
                const isRental = categoryName === 'Alquileres' || product.primaryCatId === 'alquileres';
                const rowEl = priceDisplay.closest('.price-quantity-row');
                
                if (isRental) {
                    if (product.price) {
                        priceDisplay.style.display = 'block';
                        priceDisplay.style.textAlign = 'right';
                        priceDisplay.innerHTML = `<span style="font-size:0.9rem; color:#64748B; font-weight:500;">Precio de Alquiler:</span> <span style="font-size:1.6rem; font-weight:800; color:var(--primary-color);">${product.price}</span>`;
                        if (rowEl) rowEl.style.display = 'flex';
                    } else {
                        priceDisplay.style.display = 'none';
                        if (rowEl) rowEl.style.display = 'none';
                    }
                } else {
                    const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
                    if (activeVariant && activeVariant.showPrice === true && activeVariant.price !== undefined && activeVariant.price !== '') {
                        priceDisplay.style.display = 'flex';
                        priceDisplay.style.justifyContent = 'flex-end';
                        priceDisplay.style.alignItems = 'center';
                        priceDisplay.style.gap = '8px';
                        priceDisplay.style.position = 'relative';
                        if (rowEl) rowEl.style.display = 'flex';

                        const formatter = new Intl.NumberFormat('es-AR', {
                            style: 'currency',
                            currency: 'ARS',
                            minimumFractionDigits: 0
                        });
                        
                        const qtyValEl = document.getElementById('qty-value');
                        const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1') : 1;
                        
                        // Buscar descuento por volumen aplicable (a nivel variante o nivel producto)
                        let discountPercent = 0;
                        let discountValue = 0;
                        let totalDiscountAmount = 0;
                        let discountRule = null;
                        
                        const discountsList = (activeVariant.volumeDiscounts && Array.isArray(activeVariant.volumeDiscounts) && activeVariant.volumeDiscounts.length > 0)
                            ? activeVariant.volumeDiscounts
                            : (product.quantityDiscounts || []);
                        
                        if (discountsList && Array.isArray(discountsList) && discountsList.length > 0) {
                            const sortedRules = [...discountsList].sort((a, b) => {
                                const minA = a.minQty !== undefined ? a.minQty : a.minUnits;
                                const minB = b.minQty !== undefined ? b.minQty : b.minUnits;
                                return minB - minA;
                            });
                            for (const rule of sortedRules) {
                                const minUnits = rule.minQty !== undefined ? rule.minQty : rule.minUnits;
                                if (qtyVal >= minUnits) {
                                    discountRule = rule;
                                    if (rule.discountPercent !== undefined && rule.discountPercent > 0) {
                                        discountPercent = rule.discountPercent;
                                        totalDiscountAmount = (activeVariant.price * qtyVal) * (discountPercent / 100);
                                    } else if (rule.discountValue !== undefined && rule.discountValue > 0) {
                                        discountValue = rule.discountValue;
                                        totalDiscountAmount = Math.floor(qtyVal / minUnits) * discountValue;
                                    }
                                    break;
                                }
                            }
                        }

                        if (totalDiscountAmount > 0) {
                            const originalTotalPrice = activeVariant.price * qtyVal;
                            const totalPrice = originalTotalPrice - totalDiscountAmount;
                            
                            const formattedOriginalPrice = formatter.format(originalTotalPrice);
                            const formattedTotalPrice = formatter.format(totalPrice);
                            const badgeText = discountPercent > 0 ? `${discountPercent}% OFF` : `-$${formatter.format(totalDiscountAmount).replace('$', '').trim()}`;
                            
                            priceDisplay.innerHTML = `
                                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span style="text-decoration: line-through; color: #94A3B8; font-size: 0.95rem; font-weight: 500;">${formattedOriginalPrice}</span>
                                        <span style="background-color: #10B981; color: white; font-size: 0.72rem; font-weight: 700; padding: 2px 6px; border-radius: 12px; font-family: var(--font-main);">${badgeText}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <span style="font-size:1.65rem; font-weight:900; color:#c0510a; line-height: 1.2;">${formattedTotalPrice}</span>
                                        <div class="price-info-wrapper" style="position: relative; display: inline-flex; align-items: center;">
                                            <span class="material-symbols-outlined price-info-icon" style="font-size: 20px; color: #94A3B8; cursor: pointer; user-select: none; transition: color 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px;">help_outline</span>
                                            <div class="price-tooltip" style="display: none; position: absolute; bottom: 125%; right: 0; width: 250px; background: #1E293B; color: #FFFFFF; padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.78rem; line-height: 1.4; font-weight: 500; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; pointer-events: none; opacity: 0; transition: opacity 0.2s ease; box-sizing: border-box;">
                                                Precio en efectivo/transferencia para retirar por el taller (no incluye impuestos ni envío).
                                                <div style="position: absolute; top: 100%; right: 8px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #1E293B;"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else {
                            const totalPrice = activeVariant.price * qtyVal;
                            const formattedPrice = formatter.format(totalPrice);
                            
                            priceDisplay.innerHTML = `
                                <span style="font-size:1.65rem; font-weight:900; color:#c0510a; line-height: 1.2;">${formattedPrice}</span>
                                <div class="price-info-wrapper" style="position: relative; display: inline-flex; align-items: center;">
                                    <span class="material-symbols-outlined price-info-icon" style="font-size: 20px; color: #94A3B8; cursor: pointer; user-select: none; transition: color 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px;">help_outline</span>
                                    <div class="price-tooltip" style="display: none; position: absolute; bottom: 125%; right: 0; width: 250px; background: #1E293B; color: #FFFFFF; padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.78rem; line-height: 1.4; font-weight: 500; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; pointer-events: none; opacity: 0; transition: opacity 0.2s ease; box-sizing: border-box;">
                                        Precio en efectivo/transferencia para retirar por el taller (no incluye impuestos ni envío).
                                        <div style="position: absolute; top: 100%; right: 8px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #1E293B;"></div>
                                    </div>
                                </div>
                            `;
                        }

                        // Actualizar banner informativo de descuentos por cantidad
                        const discountBanner = document.getElementById('detail-qty-discount-banner');
                        if (discountBanner) {
                            if (discountsList && discountsList.length > 0) {
                                const tiersText = [...discountsList]
                                    .sort((a, b) => (a.minQty !== undefined ? a.minQty : a.minUnits) - (b.minQty !== undefined ? b.minQty : b.minUnits))
                                    .map(d => {
                                        const minU = d.minQty !== undefined ? d.minQty : d.minUnits;
                                        const parts = [];
                                        if (d.discountPercent > 0) parts.push(`${d.discountPercent}% OFF prod.`);
                                        if (d.shippingDiscountPercent > 0) parts.push(d.shippingDiscountPercent >= 100 ? 'Envío GRATIS' : `${d.shippingDiscountPercent}% OFF envío`);
                                        return `${minU}+ uds: ${parts.join(' + ') || (d.discountPercent + '% OFF')}`;
                                    })
                                    .join(' | ');

                                if (discountRule) {
                                    discountBanner.style.display = 'block';
                                    discountBanner.style.color = '#15803d';
                                    const activeParts = [];
                                    if (discountRule.discountPercent > 0) activeParts.push(`<strong>${discountRule.discountPercent}% OFF en producto</strong>`);
                                    if (discountRule.shippingDiscountPercent > 0) {
                                        activeParts.push(discountRule.shippingDiscountPercent >= 100 ? '<strong>ENVÍO GRATIS</strong>' : `<strong>${discountRule.shippingDiscountPercent}% OFF en envío</strong>`);
                                    }
                                    discountBanner.innerHTML = `🎉 ¡Llevando ${qtyVal} uds tenés ${activeParts.join(' + ') || 'descuento especial'}!`;
                                } else {
                                    discountBanner.style.display = 'block';
                                    discountBanner.style.color = '#0284c7';
                                    discountBanner.innerHTML = `🏷️ Descuentos por cantidad: <strong>${tiersText}</strong>`;
                                }
                            } else {
                                discountBanner.style.display = 'none';
                            }
                        }

                        // Funcionalidad interactiva del tooltip (hover + click en móviles)
                        const wrapper = priceDisplay.querySelector('.price-info-wrapper');
                        const tooltip = priceDisplay.querySelector('.price-tooltip');
                        const icon = priceDisplay.querySelector('.price-info-icon');

                        if (wrapper && tooltip && icon) {
                            const showTooltip = () => {
                                icon.style.color = 'var(--primary-color)';
                                tooltip.style.display = 'block';
                                setTimeout(() => { tooltip.style.opacity = '1'; }, 10);
                            };
                            const hideTooltip = () => {
                                icon.style.color = '#94A3B8';
                                tooltip.style.opacity = '0';
                                setTimeout(() => { tooltip.style.display = 'none'; }, 200);
                            };

                            wrapper.addEventListener('mouseenter', showTooltip);
                            wrapper.addEventListener('mouseleave', hideTooltip);

                            icon.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const isVisible = tooltip.style.display === 'block' && tooltip.style.opacity === '1';
                                if (isVisible) {
                                    hideTooltip();
                                } else {
                                    showTooltip();
                                }
                            });

                            document.addEventListener('click', () => {
                                hideTooltip();
                            });
                        }
                    } else {
                        priceDisplay.style.display = 'flex';
                        priceDisplay.style.justifyContent = 'flex-end';
                        priceDisplay.style.alignItems = 'center';
                        priceDisplay.style.position = 'relative';
                        if (rowEl) rowEl.style.display = 'flex';
                        
                        priceDisplay.innerHTML = `
                            <span style="font-size:1.1rem; font-weight:800; color:#c0510a; background: #FFF4E6; border: 1px solid #FFE8CC; padding: 4px 10px; border-radius: 8px; line-height: 1.2; display: inline-flex; align-items: center; gap: 4px;">
                                💬 Consultar precio
                            </span>
                        `;
                    }
                }
            }

            // ── Render de Mejor Costo de Envío Inteligente debajo del precio ──────
            const shipBadgeContainer = document.getElementById('detail-shipping-best-price-badge');
            if (shipBadgeContainer) {
                const isRental = categoryName === 'Alquileres' || product.primaryCatId === 'alquileres';
                if (isRental) {
                    shipBadgeContainer.style.display = 'none';
                } else {
                    shipBadgeContainer.style.display = 'block';
                    const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName) || (grupo.medidas_variants || [])[0];
                    const shipConf = product.shippingConfig || {};
                    const isFlexDisabled = activeVariant && (activeVariant.logisticaEnabled === false || activeVariant.noFlex === true || activeVariant.disableFlex === true);

                    // Obtener CP guardado del usuario (del carrito/userData/localStorage)
                    let userZip = '';
                    try {
                        const savedData = localStorage.getItem('userData');
                        if (savedData) {
                            const parsed = JSON.parse(savedData);
                            userZip = (parsed.zipCode || '').trim();
                        }
                    } catch(e) {}

                    let cpRes = null;
                    if (userZip && window.lookupPostalCode) {
                        cpRes = window.lookupPostalCode(userZip);
                    }

                    const triggerCheckoutModal = () => {
                        const selMedida = divMedida ? divMedida.querySelector('select') : null;
                        const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : medidaName;
                        const selOpt = divOpt ? divOpt.querySelector('select') : null;
                        const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
                        const optLabel = product.optional_variant?.label || '';
                        const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaText);
                        const variantPrice = (activeVariant && activeVariant.price !== undefined && activeVariant.price !== '') ? activeVariant.price : (parseFloat(product.price) || 0);
                        const qtyValEl = document.getElementById('qty-value');
                        const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1') : 1;

                        if (window.showProductPaymentModal) {
                            window.showProductPaymentModal(product, grupo, medidaText, variantPrice, qtyVal, optText, optLabel);
                        } else if (window.showOfferPaymentModal) {
                            window.showOfferPaymentModal(product, qtyVal, { grupo, medida: medidaText, price: variantPrice, opcion: optText, opcionLabel: optLabel });
                        }
                    };

                    if (!userZip || !cpRes || cpRes.hasLocalMatch === false) {
                        // Solicitud de CP abriendo el mismo modal de COMPRAR YA
                        shipBadgeContainer.innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                                <div style="display: flex; align-items: center; gap: 6px; color: #475569; font-weight: 700;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; color: #0284c7;">local_shipping</span>
                                    <span>Medios de envío y costos</span>
                                </div>
                                <button type="button" id="btn-detail-cp-trigger" style="background: #e0f2fe; color: #0284c7; border: 1.5px solid #bae6fd; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">location_on</span>
                                    <span>Calcular costo de envío</span>
                                </button>
                            </div>
                        `;

                        document.getElementById('btn-detail-cp-trigger')?.addEventListener('click', triggerCheckoutModal);
                    } else {
                        // Usuario tiene un CP cargado -> Evaluar mejores opciones de envío
                        const qtyValEl = document.getElementById('qty-value');
                        const qty = qtyValEl ? (parseInt(qtyValEl.textContent, 10) || 1) : 1;
                        let validOptions = [];

                        // 1. Envío global gratis
                        if (shipConf.isFreeShipping || shipConf.isFree || product.shippingType === 'free') {
                            validOptions.push({ label: 'Envío gratis a domicilio', cost: 0, icon: 'local_shipping' });
                        }

                        // 2. Logística Flex (si no está deshabilitada para la variante)
                        if (!isFlexDisabled && shipConf.logisticaEnabled !== false && cpRes.logistica && cpRes.logistica.active !== false) {
                            const manualCost = parseFloat(shipConf.logisticaCost) || 0;
                            const sysCost = cpRes.logistica.cost || 0;
                            const baseCost = manualCost > 0 ? manualCost : sysCost;
                            const freeMin = parseInt(shipConf.logisticaFreeMinUnits) || 0;
                            const maxUnits = parseInt(shipConf.logisticaMaxUnits) || 0;
                            const isFreeByQty = (freeMin > 0 && qty >= freeMin);
                            const packages = maxUnits > 0 ? Math.ceil(qty / maxUnits) : 1;
                            const cost = isFreeByQty ? 0 : (baseCost * packages);
                            validOptions.push({ label: isFreeByQty ? 'Logística Flex (Gratis por cantidad)' : 'Logística Flex / Courier', cost: cost, icon: 'local_shipping' });
                        }

                        // 3. Flete particular
                        if (shipConf.fleteEnabled !== false && cpRes.flete && cpRes.flete.active !== false) {
                            const manualCost = parseFloat(shipConf.fleteCost) || 0;
                            const sysCost = cpRes.flete.cost || 0;
                            const baseCost = manualCost > 0 ? manualCost : sysCost;
                            const freeMin = parseInt(shipConf.fleteFreeMinUnits) || 0;
                            const maxUnits = parseInt(shipConf.fleteMaxUnits) || 0;
                            const isFreeByQty = (freeMin > 0 && qty >= freeMin);
                            const packages = maxUnits > 0 ? Math.ceil(qty / maxUnits) : 1;
                            const cost = isFreeByQty ? 0 : (baseCost * packages);
                            validOptions.push({ label: isFreeByQty ? 'Flete Particular (Gratis por cantidad)' : 'Flete Particular', cost: cost, icon: 'fire_truck' });
                        }

                        const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

                        if (validOptions.length > 0) {
                            // Encontrar la opción con menor costo
                            validOptions.sort((a, b) => a.cost - b.cost);
                            const best = validOptions[0];
                            const costStr = best.cost === 0 ? '<b style="color:#15803d; text-transform:uppercase;">¡GRATIS!</b>' : `<b style="color:#0284c7; font-size: 0.95rem;">${formatter.format(best.cost)}</b>`;

                            shipBadgeContainer.innerHTML = `
                                <div id="btn-detail-cp-trigger-card" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; cursor: pointer;" title="Tocar para cambiar Código Postal o método de envío">
                                    <div style="display: flex; align-items: center; gap: 4px; font-size: 0.82rem; color: #1e293b;">
                                        <span class="material-symbols-outlined" style="font-size: 20px; color: #0284c7; flex-shrink: 0; margin-right: 2px;">${best.icon || 'local_shipping'}</span>
                                        <span>Envío a <strong>${cpRes.localidad}</strong> (CP ${cpRes.cp})</span>
                                        <span class="material-symbols-outlined" style="font-size: 16px; color: #0284c7; flex-shrink: 0; margin-left: 2px;" title="Modificar ubicación">edit</span>
                                    </div>
                                    <div style="text-align: right; font-size: 0.82rem; white-space: nowrap;">
                                        ${costStr}
                                    </div>
                                </div>
                            `;

                            document.getElementById('btn-detail-cp-trigger-card')?.addEventListener('click', triggerCheckoutModal);
                        } else {
                            // No hay envío directo para este CP
                            shipBadgeContainer.innerHTML = `
                                <div id="btn-detail-cp-trigger-card" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; cursor: pointer;" title="Tocar para cambiar Código Postal">
                                    <div style="display: flex; align-items: center; gap: 4px; font-size: 0.82rem; color: #9a3412;">
                                        <span class="material-symbols-outlined" style="font-size: 20px; color: #ea580c; flex-shrink: 0; margin-right: 2px;">info</span>
                                        <span>Envío a <strong>${cpRes.localidad}</strong> (CP ${cpRes.cp})</span>
                                        <span class="material-symbols-outlined" style="font-size: 16px; color: #ea580c; flex-shrink: 0; margin-left: 2px;" title="Modificar ubicación">edit</span>
                                    </div>
                                    <div style="text-align: right; font-size: 0.82rem; color: #9a3412; font-weight: 700; white-space: nowrap;">
                                        A convenir por WhatsApp
                                    </div>
                                </div>
                            `;

                            document.getElementById('btn-detail-cp-trigger-card')?.addEventListener('click', triggerCheckoutModal);
                        }
                    }
                }
            }

            // Capturar el link de ML de la variante activa para pasarlo al modal
            const activeMlVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
            const currentMlLink = (activeMlVariant && activeMlVariant.link) ? activeMlVariant.link.trim() : '';

            if (btnPickup) {
                btnPickup.href = `https://wa.me/${phone}?text=${encodeURIComponent(buildWA(grupo, medidaName))}`;
            }

            if (!window._cpUpdateListenerBound) {
                window._cpUpdateListenerBound = true;
                window.addEventListener('latarima:cp-updated', () => {
                    const activeGrupo = grupos[currentGroupIndex] || grupos[0];
                    const selMedida = divMedida ? divMedida.querySelector('select') : null;
                    const mName = selMedida ? selMedida.value : '';
                    updateBuyButton(activeGrupo, mName);
                });
            }
        }

        function setupGalleryActions(acabado) {
            const btnFav = document.getElementById('btn-gallery-fav-dynamic');
            const btnShare = document.getElementById('btn-gallery-share-dynamic');
            if (!btnFav || !btnShare) return;

            updateFavState();

            // Clic en Favoritos
            btnFav.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.CarritoModule && window.CarritoModule.toggle) {
                    const grupo = (grupos && grupos[currentGroupIndex]) ? grupos[currentGroupIndex] : {};
                    const acabadoName = grupo.acabado_name || acabado || 'Único';
                    const selMedida = divMedida ? divMedida.querySelector('select') : null;
                    const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

                    const selOpt = divOpt ? divOpt.querySelector('select') : null;
                    const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
                    const optLabel = product.optional_variant?.label || '';

                    // Capturar precio numérico de la variante activa para guardarlo en el carrito
                    const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaText);
                    const itemPrice = (activeVariant && activeVariant.showPrice === true && activeVariant.price) ? activeVariant.price : null;

                    window.CarritoModule.toggle(product, acabadoName, categoryName, medidaText, optText, optLabel, itemPrice);
                    
                    const inFav = isProductInFavorites(product.id, acabadoName, medidaText, optText);
                    if (inFav) {
                        btnFav.classList.add('pulse-heart');
                        setTimeout(() => btnFav.classList.remove('pulse-heart'), 500);
                    }
                    
                    updateFavState();
                }
            });

            // Clic en Compartir
            btnShare.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Construir la URL completa apuntando al archivo SEO estático
                const grupo = grupos[currentGroupIndex];
                const acabadoName = grupo ? (grupo.acabado_name || 'Único') : 'Único';
                
                const selMedida = divMedida.querySelector('select');
                const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';
                
                const selOpt = divOpt.querySelector('select');
                const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
                
                let selectedDetails = acabadoName;
                if (acabadoName === 'Único' && (medidaText || optText)) {
                    selectedDetails = medidaText || optText;
                } else {
                    if (medidaText) selectedDetails += ` - ${medidaText}`;
                    if (optText) selectedDetails += ` - ${optText}`;
                }

                // Generar URL ultra corta mediante el acortador nativo
                const shareUrl = window.getShortProductUrl
                    ? window.getShortProductUrl(product.id, acabadoName !== 'Único' ? acabadoName : '', medidaText, optText)
                    : window.location.href;
                
                const shareText = `Mira lo que encontré en La Tarima 😊\n*${product.title}* (${selectedDetails})`;
                
                const copyTextToClipboard = (textToCopy) => {
                    const showToast = () => {
                        const toast = document.getElementById('admin-toast');
                        if (toast) {
                            toast.textContent = "🔗 ¡Enlace copiado al portapapeles!";
                            toast.classList.add('show');
                            setTimeout(() => toast.classList.remove('show'), 2000);
                        } else {
                            alert("¡Enlace copiado al portapapeles!");
                        }
                    };

                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(textToCopy)
                            .then(showToast)
                            .catch(err => {
                                console.warn('Navigator clipboard failed, trying fallback:', err);
                                fallbackCopy(textToCopy);
                            });
                    } else {
                        fallbackCopy(textToCopy);
                    }

                    function fallbackCopy(text) {
                        try {
                            const textArea = document.createElement("textarea");
                            textArea.value = text;
                            textArea.style.position = "fixed";
                            textArea.style.top = "0";
                            textArea.style.left = "0";
                            textArea.style.width = "2em";
                            textArea.style.height = "2em";
                            textArea.style.padding = "0";
                            textArea.style.border = "none";
                            textArea.style.outline = "none";
                            textArea.style.boxShadow = "none";
                            textArea.style.background = "transparent";
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            const successful = document.execCommand('copy');
                            document.body.removeChild(textArea);
                            if (successful) {
                                showToast();
                            } else {
                                alert("No se pudo copiar el enlace automáticamente. Por favor copialo manualmente.");
                            }
                        } catch (err) {
                            console.error('Fallback copy failed:', err);
                            alert("No se pudo copiar el enlace.");
                        }
                    }
                };

                const fullMessage = `${shareText}\n${shareUrl}`;

                if (navigator.share) {
                    navigator.share({
                        title: product.title,
                        text: fullMessage
                    }).catch(err => {
                        console.log('Error sharing:', err);
                        copyTextToClipboard(fullMessage);
                    });
                } else {
                    copyTextToClipboard(fullMessage);
                }
            });
        }

        function renderGallery(grupo) {
            const images = grupo.images_list && grupo.images_list.length > 0 ? grupo.images_list : [grupo.cover_image];
            let galleryHTML = `<div class="product-detail-carousel">`;
             images.forEach((imgUrl, index) => {
                 if(!imgUrl) return;
                 galleryHTML += `
                     <div class="product-detail-slide">
                         <div class="product-gallery-img-wrapper" style="position:relative; width:100%; height:100%;">
                             <img src="${imgUrl}" class="product-detail-img lazy-img" alt="${product.title}" loading="lazy" onload="this.classList.add('loaded')">
                         </div>
                         <span class="slide-indicator">${index + 1} / ${images.length}</span>
                     </div>
                 `;
             });
             galleryHTML += `</div>`;
            
            // Inyectar el contenedor flotante de acciones (Instagram-Style)
            galleryHTML += `
                <div class="gallery-floating-actions" onclick="event.stopPropagation();">
                    <button type="button" class="btn-gallery-action btn-gallery-fav" id="btn-gallery-fav-dynamic" title="Guardar en Favoritos">
                        <span class="material-symbols-outlined">favorite_border</span>
                    </button>
                    <button type="button" class="btn-gallery-action btn-gallery-share" id="btn-gallery-share-dynamic" title="Compartir Producto">
                        <span class="material-symbols-outlined">share</span>
                    </button>
                </div>
            `;

            // Inyectar Botones de Acabado Semitransparentes sobre el pie de la imagen
            if (grupos.length > 1 || (grupos.length === 1 && grupos[0].acabado_name !== 'Único')) {
                const count = grupos.length;
                let btnWidthPct = '100%';
                if (count === 2) btnWidthPct = '50%';
                else if (count >= 3) btnWidthPct = `${(100 / count).toFixed(3)}%`;

                galleryHTML += `
                    <div class="gallery-acabados-overlay" onclick="event.stopPropagation();">
                        ${grupos.map((g, i) => {
                            const imgUrl = g.cover_image || (g.images_list && g.images_list.length > 0 ? g.images_list[0] : null);
                            return `
                                <button type="button" class="gallery-acabado-btn ${i === currentGroupIndex ? 'active' : ''}" data-index="${i}" style="width: ${btnWidthPct} !important; min-width: ${btnWidthPct} !important; flex: 1 1 ${btnWidthPct} !important;" title="Ver acabado ${g.acabado_name}">
                                    ${imgUrl ? `<img src="${imgUrl}" class="gallery-acabado-thumb" alt="${g.acabado_name}">` : ''}
                                    <span class="gallery-acabado-label">${g.acabado_name}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                `;
            }
            
            detailImgContainer.innerHTML = galleryHTML;

            // Escuchar clics en los botones de acabado de la galería
            const acabadosOverlay = detailImgContainer.querySelector('.gallery-acabados-overlay');
            if (acabadosOverlay) {
                acabadosOverlay.addEventListener('click', (e) => {
                    const btn = e.target.closest('.gallery-acabado-btn');
                    if (!btn) return;
                    
                    acabadosOverlay.querySelectorAll('.gallery-acabado-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    updateGroupView(parseInt(btn.dataset.index));
                });
            }
            
            const acabado = grupo.acabado_name || 'Único';
            setupGalleryActions(acabado);

            // Auto-scroll logic for the gallery
            const carousel = detailImgContainer.querySelector('.product-detail-carousel');
            if (carousel && images.length > 1) {
                if (window.productGalleryAutoScrollInterval) {
                    clearInterval(window.productGalleryAutoScrollInterval);
                }
                
                window.productGalleryAutoScrollInterval = setInterval(() => {
                    // Check if carousel is still visible. If hidden (modal closed), clear it!
                    if (!document.body.contains(carousel) || !carousel.offsetParent) {
                        clearInterval(window.productGalleryAutoScrollInterval);
                        window.productGalleryAutoScrollInterval = null;
                        return;
                    }
                    
                    const slideWidth = carousel.clientWidth;
                    if (slideWidth === 0) return; // View might be hidden
                    
                    const currentSlide = Math.round(carousel.scrollLeft / slideWidth);
                    let nextSlide = currentSlide + 1;
                    if (nextSlide >= images.length) {
                        nextSlide = 0; // Loop back to start
                    }
                    
                    carousel.scrollTo({
                        left: slideWidth * nextSlide,
                        behavior: 'smooth'
                    });
                }, 3500);

                // Stop auto-scroll instantly if user interacts anywhere in the view
                const stopAutoScroll = () => {
                    if (window.productGalleryAutoScrollInterval) {
                        clearInterval(window.productGalleryAutoScrollInterval);
                        window.productGalleryAutoScrollInterval = null;
                    }
                };
                const detailView = document.getElementById('view-product-detail');
                if (detailView) {
                    detailView.addEventListener('touchstart', stopAutoScroll, {passive: true, once: true});
                    detailView.addEventListener('mousedown', stopAutoScroll, {passive: true, once: true});
                    detailView.addEventListener('wheel', stopAutoScroll, {passive: true, once: true});
                }
            }
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

            // 1. Re-render Gallery
            renderGallery(grupo);

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
            } else {
                divMedida.style.display = 'none';
            }

            // Initial button update for this group
            updateBuyButton(grupo, defaultMedidaName);

            // Update Favorites button state
            updateFavState();

            // Update URL parameters
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

        // Initialize view with preselected group index
        updateGroupView(currentGroupIndex);

        // Clear pre-selections so subsequent manual interaction doesn't carry stale values
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
                const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';
                
                const selOpt = divOpt.querySelector('select');
                const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
                const optLabel = product.optional_variant?.label || '';

                const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaText);
                const variantPrice = (activeVariant && activeVariant.price !== undefined && activeVariant.price !== '') ? activeVariant.price : (parseFloat(product.price) || 0);
                
                const qtyValEl = document.getElementById('qty-value');
                const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1') : 1;

                if (window.showProductPaymentModal) {
                    window.showProductPaymentModal(product, grupo, medidaText, variantPrice, qtyVal, optText, optLabel);
                } else if (window.showOfferPaymentModal) {
                    window.showOfferPaymentModal(product, qtyVal, { grupo, medida: medidaText, price: variantPrice, opcion: optText, opcionLabel: optLabel });
                }
            };
        }

        // Conectar botón AGREGAR AL CARRITO (mismo comportamiento que el corazón)
        const btnAddCart = document.getElementById('btn-add-cart-product');
        if (btnAddCart) {
            btnAddCart.onclick = (e) => {
                e.preventDefault();
                if (window.CarritoModule && window.CarritoModule.toggle) {
                    const grupo = (grupos && grupos[currentGroupIndex]) ? grupos[currentGroupIndex] : {};
                    const acabadoName = grupo.acabado_name || 'Único';
                    const selMedida = divMedida ? divMedida.querySelector('select') : null;
                    const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

                    const selOpt = divOpt ? divOpt.querySelector('select') : null;
                    const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
                    const optLabel = product.optional_variant?.label || '';

                    const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaText);
                    const itemPrice = (activeVariant && activeVariant.showPrice === true && activeVariant.price) ? activeVariant.price : null;

                    const qtyValEl = document.getElementById('qty-value');
                    const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1') : 1;

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
                            if (!seenIds.has(p.id) && p.id !== product.id) { // Excluir producto actual
                                seenIds.add(p.id);
                                const res = findProductById(p.id);
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
                        // Navegar al detalle del producto recomendado y desplazarse arriba suavemente
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


    async function saveProductsToServer() {
        try {
            const response = await fetch('/api/save-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.sessionProducts)
            });
            const data = await response.json();
            if (!data.success) {
                console.error('Hubo un error al guardar en el servidor: ' + data.message);
            }
        } catch (error) {
            console.error('Error de conexión con el servidor local:', error);
            // Guardar localmente para evitar pérdida de datos ante recargas (ej: Live Server)
            try {
                localStorage.setItem('sessionProductsAutonomo', JSON.stringify(window.sessionProducts));
                console.log('Productos guardados en localStorage como respaldo.');
            } catch (lsError) {
                console.error('No se pudo guardar el respaldo en localStorage', lsError);
            }
        }
    }


window.saveProductsToServer = saveProductsToServer;
window.showProductDetail = safeRender(showProductDetail, 'showProductDetail');


window.updateActionLinks = updateActionLinks;


window.findProductById = findProductById;
window.getProductTimestamp = getProductTimestamp;