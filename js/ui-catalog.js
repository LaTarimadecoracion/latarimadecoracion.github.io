
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

        // Actualizar URL en el historial si es necesario
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('prod') !== product.id) {
            const initialParams = new URLSearchParams();
            initialParams.set('prod', product.id);
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
                        item.id === productId && 
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
            
            const selMedida = divMedida.querySelector('select');
            const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

            const selOpt = divOpt.querySelector('select');
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
            
            // Asegurar el prod
            newParams.set('prod', product.id);
            
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


        function buildWA(grupo, medidaName, tipoEntrega = '', shippingData = {}) {
            const selOpt = divOpt.querySelector('select');
            const optText = selOpt ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
            const optLabel = product.optional_variant?.label || '';

            const qtyValEl = document.getElementById('qty-value');
            const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1') : 1;

            // Si es un alquiler
            if (categoryName === 'Alquileres' || product.primaryCatId === 'alquileres') {
                const price = product.price || 'Consultar';
                let parts = [`• Producto: *${product.title}*`];
                if (grupo.acabado_name && grupo.acabado_name !== 'Único') parts.push(`• Acabado: ${grupo.acabado_name}`);
                if (medidaName) parts.push(`• Medida: ${medidaName}`);
                if (optText && optLabel) parts.push(`• ${optLabel}: ${optText}`);
                if (qtyVal > 1) parts.push(`• Cantidad: ${qtyVal}`);
                parts.push(`• Precio: ${price}`);

                return `¡Hola La Tarima! Quiero consultar para alquilar:\n\n${parts.join('\n')}\n\n¿Está disponible?`;
            }

            // Si es un producto de venta
            let parts = [`• Producto: *${product.title}*`];
            if (grupo.acabado_name && grupo.acabado_name !== 'Único') {
                parts.push(`• Acabado: ${grupo.acabado_name}`);
            }
            if (medidaName) {
                parts.push(`• Medida: ${medidaName}`);
            }
            if (optText && optLabel) {
                parts.push(`• ${optLabel}: ${optText}`);
            }
            if (qtyVal > 1) {
                parts.push(`• Cantidad: ${qtyVal}`);
            }

            // Buscar si la variante tiene un precio visible configurado
            const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
            if (activeVariant && activeVariant.showPrice === true && activeVariant.price !== undefined && activeVariant.price !== '') {
                const formatter = new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    minimumFractionDigits: 0
                });
                
                const unitPrice = activeVariant.price;
                
                // Buscar descuento por volumen aplicable
                let discountPercent = 0;
                let discountRule = null;
                if (activeVariant.volumeDiscounts && Array.isArray(activeVariant.volumeDiscounts) && activeVariant.volumeDiscounts.length > 0) {
                    const sortedRules = [...activeVariant.volumeDiscounts].sort((a, b) => b.minQty - a.minQty);
                    for (const rule of sortedRules) {
                        if (qtyVal >= rule.minQty) {
                            discountRule = rule;
                            discountPercent = rule.discountPercent;
                            break;
                        }
                    }
                }
                
                if (discountPercent > 0) {
                    const discountedUnitPrice = unitPrice * (1 - discountPercent / 100);
                    const totalPrice = discountedUnitPrice * qtyVal;
                    const originalTotalPrice = unitPrice * qtyVal;
                    
                    parts.push(`• Precio Unitario (Lista): ${formatter.format(unitPrice)}`);
                    parts.push(`• Descuento aplicado: ${discountPercent}% OFF (a partir de ${discountRule.minQty} un.)`);
                    parts.push(`• Precio Unitario (c/desc): ${formatter.format(discountedUnitPrice)}`);
                    parts.push(`• Precio Total: ${formatter.format(totalPrice)} (antes: ${formatter.format(originalTotalPrice)})`);
                } else {
                    const totalPrice = unitPrice * qtyVal;
                    if (qtyVal > 1) {
                        parts.push(`• Precio Unitario: ${formatter.format(unitPrice)}`);
                        parts.push(`• Precio Total: ${formatter.format(totalPrice)}`);
                    } else {
                        parts.push(`• Precio: ${formatter.format(unitPrice)}`);
                    }
                }
            }

            // Línea de tipo de entrega (solo para productos de venta)
            if (tipoEntrega === 'pickup') {
                parts.push('• Entrega: 🏪 Retiro por el taller');
            } else if (tipoEntrega === 'shipping') {
                parts.push('• Entrega: 🚚 Necesito envío a domicilio');
                if (shippingData.localidad) {
                    parts.push(`• Destino/CP: ${shippingData.localidad}`);
                }
                if (shippingData.direccion) {
                    parts.push(`• Dirección: ${shippingData.direccion}`);
                }
            }

            let vacationNote = "";
            if (window.vacationConfig && window.vacationConfig.active) {
                const start = window.vacationConfig.startDate || "receso";
                const deliv = window.vacationConfig.deliveriesDate || "el regreso";
                vacationNote = `\n\n(Nota: Sé que están de vacaciones del ${start} y las entregas se retoman a partir del ${deliv}. El precio actual pactado queda congelado y mantenido).`;
            }

            return `¡Hola La Tarima! Quiero consultar por el siguiente producto:\n\n${parts.join('\n')}\n\n¿Me podés pasar más info y disponibilidad?${vacationNote}`;
        }

        // ── Modal de pre-calificación de entrega ──────────────────────────────
        function showDeliveryModal(grupo, medidaName, mlLink) {
            // Eliminar modal previo si existe
            const existing = document.getElementById('delivery-modal-overlay');
            if (existing) existing.remove();

            const isRental = categoryName === 'Alquileres' || product.primaryCatId === 'alquileres';

            // Los alquileres no tienen este flujo, ir directo a WA
            if (isRental) {
                const waMsg = buildWA(grupo, medidaName);
                try {
                    if (typeof gtag === 'function') gtag('event', 'contact', { method: 'WhatsApp', event_category: 'Engagement', event_label: 'Consultar WhatsApp Producto' });
                } catch(e) {}
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
                return;
            }

            // Crear overlay
            const overlay = document.createElement('div');
            overlay.id = 'delivery-modal-overlay';
            overlay.className = 'delivery-modal-overlay';

            const sheet = document.createElement('div');
            sheet.className = 'delivery-modal-sheet';
            sheet.style.position = 'relative';
            sheet.innerHTML = `
                <button class="delivery-modal-back-arrow" id="dopt-back-arrow" title="Volver" style="display:none;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button class="delivery-modal-close-x" id="dopt-close-x" title="Cerrar">&times;</button>
                <div class="delivery-modal-handle"></div>
                <p class="delivery-modal-eyebrow">Antes de continuar</p>
                <h3 class="delivery-modal-title">¿Necesitás envío?</h3>
                <p class="delivery-modal-subtitle">Elegí una de las opciones para poder continuar</p>
                ${window.vacationConfig && window.vacationConfig.active ? `
                    <div style="background:#FFF9DB; border:1.5px dashed #FCC419; padding:10px 12px; border-radius:10px; margin-bottom:12px; color:#E67700; font-size:0.8rem; line-height:1.4; text-align:left;">
                        <strong>🌴 ¡Taller de vacaciones!</strong> Retomamos las entregas a partir del <strong>${window.vacationConfig.deliveriesDate || 'regreso'}</strong>. Reservando hoy por WhatsApp te garantizamos el **precio congelado** sin aumentos.
                    </div>
                ` : ''}
                <div class="delivery-modal-options">
                    <button class="delivery-opt-btn delivery-opt-pickup" id="dopt-pickup">
                        <span class="delivery-opt-icon">🏪</span>
                        <span class="delivery-opt-label">Retirar por el taller</span>
                        <span class="delivery-opt-desc">Mismo precio publicado en la web (Efectivo / Transferencia)</span>
                    </button>
                    <button class="delivery-opt-btn delivery-opt-shipping" id="dopt-shipping">
                        <span class="delivery-opt-icon">🚚</span>
                        <span class="delivery-opt-label">Necesito envío</span>
                        <span class="delivery-opt-desc">${mlLink ? (window.vacationConfig && window.vacationConfig.active ? '⚠️ Envío externo (publicación ML podría estar pausada). Guardar en Favoritos o consultanos por WhatsApp.' : 'Comprar en Mercado Libre (aplica costos de plataforma y envío)') : 'Te cotizamos el envío por WhatsApp'}</span>
                    </button>
                </div>

                <!-- Formulario desplegable opcional para datos de envío -->
                <div id="delivery-shipping-form" style="display:none; width:100%; flex-direction:column; gap:10px; margin-top:12px; text-align:left;">
                    ${window.vacationConfig && window.vacationConfig.active ? `
                        <div style="background:#FFF9DB; border:1.5px dashed #FCC419; padding:10px; border-radius:8px; margin-bottom:4px; color:#E67700; font-size:0.8rem; line-height:1.4;">
                            <strong>⚠️ Envíos reprogramados:</strong> Estamos de vacaciones del <strong>${window.vacationConfig.startDate || 'receso'}</strong>. Los envíos se cotizarán y realizarán a partir del <strong>${window.vacationConfig.deliveriesDate || 'regreso'}</strong>. ¡Tu precio queda congelado sin aumentos!
                        </div>
                    ` : ''}
                    <p style="font-size:0.82rem; color:#64748B; margin:0 0 2px 0;">📍 Datos para cotizar el envío <span style="color:#94A3B8;">(opcionales)</span>:</p>
                    <input type="text" id="ship-loc" placeholder="Localidad o Código Postal (ej: Ramos Mejía / 1704)" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid #CBD5E1; font-size:0.88rem; box-sizing:border-box;">
                    <input type="text" id="ship-dir" placeholder="Dirección de entrega (ej: Av. de Mayo 123)" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid #CBD5E1; font-size:0.88rem; box-sizing:border-box;">
                    <button id="btn-submit-shipping-wa" class="btn-primary giant-btn" style="width:100%; justify-content:center; margin-top:4px; font-size:0.92rem;">
                        <span>Enviar consulta por WhatsApp</span>
                    </button>
                </div>

                <!-- Panel desplegable con información de Retiro por Taller -->
                <div id="delivery-pickup-info" style="display:none; width:100%; flex-direction:column; gap:12px; margin-top:10px; text-align:left;">
                    <div style="background:#FFF8F5; border:1.5px solid rgba(160,113,91,0.25); padding:14px; border-radius:14px; font-size:0.85rem; color:#2D3748; line-height:1.5;">
                        ${window.vacationConfig && window.vacationConfig.active ? `
                            <div style="background:#FFF9DB; border:1.5px dashed #FCC419; padding:10px; border-radius:8px; margin-bottom:12px; color:#E67700; font-size:0.8rem; line-height:1.4;">
                                <strong>⚠️ Aviso de vacaciones:</strong> Taller cerrado del <strong>${window.vacationConfig.startDate || 'receso'}</strong>. Los retiros se coordinan a partir del <strong>${window.vacationConfig.deliveriesDate || 'regreso'}</strong>. ¡Tu precio queda congelado sin aumentos!
                            </div>
                        ` : ''}
                        <p style="margin:0 0 6px 0; font-weight:700; color:#A0715B; display:flex; align-items:center; gap:6px;">
                            <span>💡 Aclaraciones sobre el precio:</span>
                        </p>
                        <p style="margin:0 0 12px 0;">El precio publicado en la web se mantiene pagando en <strong>efectivo o transferencia</strong> <em>(no incluye impuestos ni costo de envío)</em>.</p>
                        
                        <p style="margin:0 0 6px 0; font-weight:700; color:#A0715B; display:flex; align-items:center; gap:6px;">
                            <span>📍 Ubicación del taller:</span>
                        </p>
                        <p style="margin:0;">Hurlingham, Buenos Aires, Argentina<br><span style="color:#718096; font-size:0.8rem;">(Zona céntrica: cerca de Av. Vergara y Av. Jauretche)</span></p>
                    </div>

                    <button id="btn-submit-pickup-wa" class="btn-primary giant-btn" style="width:100%; justify-content:center; font-size:0.92rem;">
                        <span>Continuar a WhatsApp 💬</span>
                    </button>
                </div>
            `;

            overlay.appendChild(sheet);
            document.body.appendChild(overlay);

            // Animar entrada
            requestAnimationFrame(() => overlay.classList.add('open'));

            const closeModal = () => {
                overlay.classList.remove('open');
                setTimeout(() => overlay.remove(), 300);
            };

            const resetToInitialView = () => {
                const pickupInfo = document.getElementById('delivery-pickup-info');
                const shippingForm = document.getElementById('delivery-shipping-form');
                const optionsContainer = sheet.querySelector('.delivery-modal-options');
                const titleEl = sheet.querySelector('.delivery-modal-title');
                const subtitleEl = sheet.querySelector('.delivery-modal-subtitle');
                const eyebrowEl = sheet.querySelector('.delivery-modal-eyebrow');
                const backArrow = document.getElementById('dopt-back-arrow');

                if (pickupInfo) pickupInfo.style.display = 'none';
                if (shippingForm) shippingForm.style.display = 'none';
                if (optionsContainer) optionsContainer.style.display = 'flex';
                if (backArrow) backArrow.style.display = 'none';

                if (eyebrowEl) eyebrowEl.textContent = 'Antes de continuar';
                if (titleEl) titleEl.textContent = '¿Necesitás envío?';
                if (subtitleEl) subtitleEl.textContent = 'Elegí una de las opciones para poder continuar';
            };

            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
            document.getElementById('dopt-close-x')?.addEventListener('click', closeModal);
            document.getElementById('dopt-back-arrow')?.addEventListener('click', resetToInitialView);

            // Opción: Retirar por taller → desplegar panel de información de retiro
            document.getElementById('dopt-pickup').addEventListener('click', () => {
                const pickupInfo = document.getElementById('delivery-pickup-info');
                const optionsContainer = sheet.querySelector('.delivery-modal-options');
                const titleEl = sheet.querySelector('.delivery-modal-title');
                const subtitleEl = sheet.querySelector('.delivery-modal-subtitle');
                const eyebrowEl = sheet.querySelector('.delivery-modal-eyebrow');
                const backArrow = document.getElementById('dopt-back-arrow');

                if (pickupInfo && optionsContainer) {
                    if (eyebrowEl) eyebrowEl.textContent = 'Retiro por taller';
                    if (titleEl) titleEl.textContent = 'Retiro en Hurlingham';
                    if (subtitleEl) subtitleEl.textContent = 'Ubicación y modalidad de entrega en el taller:';
                    if (backArrow) backArrow.style.display = 'flex';

                    optionsContainer.style.display = 'none';
                    pickupInfo.style.display = 'flex';

                    document.getElementById('btn-submit-pickup-wa')?.addEventListener('click', () => {
                        closeModal();
                        const waMsg = buildWA(grupo, medidaName, 'pickup');
                        try {
                            if (typeof gtag === 'function') gtag('event', 'contact', { method: 'WhatsApp', event_category: 'Engagement', event_label: 'Consultar WA - Retiro Taller' });
                        } catch(e) {}
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
                    });
                }
            });

            // Opción: Necesito envío
            document.getElementById('dopt-shipping').addEventListener('click', () => {
                if (mlLink) {
                    closeModal();
                    // Producto con link ML → ir directo, sin pasar por WA
                    try {
                        if (typeof gtag === 'function') gtag('event', 'begin_checkout', { currency: 'ARS', items: [{ item_id: product.id, item_name: product.title, item_category: categoryName }] });
                    } catch(e) {}
                    window.open(mlLink, '_blank');
                } else {
                    // Sin link ML → mostrar inputs opcionales de envío dentro del modal
                    const formContainer = document.getElementById('delivery-shipping-form');
                    const optionsContainer = sheet.querySelector('.delivery-modal-options');
                    const titleEl = sheet.querySelector('.delivery-modal-title');
                    const subtitleEl = sheet.querySelector('.delivery-modal-subtitle');
                    const eyebrowEl = sheet.querySelector('.delivery-modal-eyebrow');
                    const backArrow = document.getElementById('dopt-back-arrow');

                    if (formContainer) {
                        if (eyebrowEl) eyebrowEl.textContent = 'Cotizá tu envío';
                        if (titleEl) titleEl.textContent = 'Datos para el envío';
                        if (subtitleEl) subtitleEl.textContent = 'Completá estos datos básicos (opcionales) para cotizar el costo de envío. Te lo recomendamos para agilizar tu compra 👌';
                        if (backArrow) backArrow.style.display = 'flex';

                        optionsContainer.style.display = 'none';
                        formContainer.style.display = 'flex';
                        document.getElementById('ship-loc')?.focus();

                        document.getElementById('btn-submit-shipping-wa').addEventListener('click', () => {
                            const localidad = document.getElementById('ship-loc')?.value.trim() || '';
                            const direccion = document.getElementById('ship-dir')?.value.trim() || '';
                            closeModal();
                            const waMsg = buildWA(grupo, medidaName, 'shipping', { localidad, direccion });
                            try {
                                if (typeof gtag === 'function') gtag('event', 'contact', { method: 'WhatsApp', event_category: 'Engagement', event_label: 'Consultar WA - Necesita Envio' });
                            } catch(e) {}
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
                        });
                    }
                }
            });
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
                        
                        // Buscar descuento por volumen aplicable
                        let discountPercent = 0;
                        let discountValue = 0;
                        let totalDiscountAmount = 0;
                        let discountRule = null;
                        
                        if (activeVariant.volumeDiscounts && Array.isArray(activeVariant.volumeDiscounts) && activeVariant.volumeDiscounts.length > 0) {
                            const sortedRules = [...activeVariant.volumeDiscounts].sort((a, b) => b.minQty - a.minQty);
                            for (const rule of sortedRules) {
                                if (qtyVal >= rule.minQty) {
                                    discountRule = rule;
                                    if (rule.discountPercent !== undefined) {
                                        discountPercent = rule.discountPercent;
                                        totalDiscountAmount = (activeVariant.price * qtyVal) * (discountPercent / 100);
                                    } else if (rule.discountValue !== undefined) {
                                        discountValue = rule.discountValue;
                                        totalDiscountAmount = Math.floor(qtyVal / rule.minQty) * discountValue;
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
                        priceDisplay.style.display = 'none';
                        if (rowEl) rowEl.style.display = 'none';
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
                btnPickup.href = `https://wa.me/${phone}?text=${encodeURIComponent(buildWA(grupo, medidaName, 'pickup'))}`;
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
                    const selMedida = divMedida.querySelector('select');
                    const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

                    const selOpt = divOpt.querySelector('select');
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

            divOpt.className = 'variant-selector-wrapper mt-1';
            divOpt.innerHTML = `
                <label class="variant-label">✨ ${optVariant.label || 'Opción'}</label>
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
                    const selMedida = divMedida.querySelector('select');
                    const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

                    const selOpt = divOpt.querySelector('select');
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