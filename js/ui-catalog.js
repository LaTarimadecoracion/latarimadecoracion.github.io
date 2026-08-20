
    function findProductById(prodId) {
        if (!window.sessionProducts) return null;
        let fallback = null;
        for (const cat of window.sessionProducts) {
            if (cat.products) {
                const found = cat.products.find(p => p.id === prodId);
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
        document.title = title ? `${title} | LA TARIMA` : 'LA TARIMA - Decoración';
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
            if (!btnFav) return;

            const grupo = grupos[currentGroupIndex];
            const acabado = grupo.acabado_name || 'Único';
            
            const selMedida = divMedida.querySelector('select');
            const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

            const selOpt = divOpt.querySelector('select');
            const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';

            const inFav = isProductInFavorites(product.id, acabado, medidaText, optText);
            if (inFav) {
                btnFav.classList.add('is-fav');
                btnFav.innerHTML = `<span class="material-symbols-outlined">favorite</span>`;
            } else {
                btnFav.classList.remove('is-fav');
                btnFav.innerHTML = `<span class="material-symbols-outlined">favorite_border</span>`;
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

        // Vincular botón "Comprar con envío" para desplegar el modal con Mensajería Propia y links externos
        if (btnShipping) {
            btnShipping.onclick = (e) => {
                if (e) e.preventDefault();
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

                const grupo = grupos[currentGroupIndex] || grupos[0];
                const selMedida = divMedida ? divMedida.querySelector('select') : null;
                const mName = selMedida ? selMedida.value : '';
                const activeMlVariant = (grupo && grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === mName);
                const currentMlLink = (activeMlVariant && activeMlVariant.link) ? activeMlVariant.link.trim() : '';

                showDeliveryModal(grupo, mName, currentMlLink);
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

            // Obtener variante activa y precio
            const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
            const qtyValEl = document.getElementById('qty-value');
            const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1') : 1;
            const productPrice = (activeVariant && activeVariant.price) ? (activeVariant.price * qtyVal) : 0;

            // Crear overlay
            const overlay = document.createElement('div');
            overlay.id = 'delivery-modal-overlay';
            overlay.className = 'delivery-modal-overlay';

            const sheet = document.createElement('div');
            sheet.className = 'delivery-modal-sheet';
            sheet.style.position = 'relative';
            sheet.style.maxWidth = '550px';
            sheet.style.width = '100%';

            sheet.innerHTML = `
                <button class="delivery-modal-close-x" id="dopt-close-x" title="Cerrar">&times;</button>
                <div class="delivery-modal-handle"></div>
                <p class="delivery-modal-eyebrow">Opciones de Envío</p>
                <h3 class="delivery-modal-title">¿Cómo querés recibir tu producto?</h3>
                <p class="delivery-modal-subtitle">Elegí la opción de envío que más te convenga</p>

                <!-- Opción Destacada: Mensajería Propia -->
                <div style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border: 2px solid #22C55E; border-radius: 16px; padding: 16px; margin-bottom: 16px; text-align: left; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="background: #15803D; color: white; font-size: 0.72rem; font-weight: 800; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                            🚀 Recomendado (Entrega Rápida 24hs)
                        </span>
                        <span style="font-size: 0.85rem; font-weight: 700; color: #166534;">Mensajería Propia</span>
                    </div>

                    <!-- Contenedor donde se renderiza el calculador -->
                    <div id="modal-shipping-widget-container"></div>

                    <button type="button" id="btn-modal-submit-own-shipping" class="btn-primary giant-btn" style="width: 100%; justify-content: center; background: #16A34A; color: white; margin-top: 10px; font-weight: 800; font-size: 1rem; border: none; box-shadow: 0 4px 10px rgba(22, 163, 74, 0.3);">
                        <span>Comprar por WhatsApp con Envío Particular 💬</span>
                    </button>
                </div>

                <!-- Otras plataformas externas (Mercado Libre / Tiendas futuras) -->
                ${mlLink || (activeVariant && activeVariant.link) ? `
                    <div style="border-top: 1px dashed #CBD5E1; padding-top: 12px; margin-top: 12px; text-align: left;">
                        <p style="font-size: 0.82rem; font-weight: 700; color: #64748B; margin: 0 0 8px 0;">Otras plataformas de envío externas:</p>
                        <a href="${mlLink || activeVariant.link}" target="_blank" class="delivery-opt-btn" style="border: 1.5px solid #CBD5E1; text-decoration: none; display: flex; align-items: center; justify-content: space-between; background: #FFFFFF;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 1.4rem;">🛍️</span>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-weight: 700; font-size: 0.9rem; color: #1E293B;">Comprar en Mercado Libre</span>
                                    <span style="font-size: 0.78rem; color: #64748B;">Aplica comisiones de plataforma y cuotas</span>
                                </div>
                            </div>
                            <span class="material-symbols-outlined" style="color: #64748B;">open_in_new</span>
                        </a>
                    </div>
                ` : ''}
            `;

            overlay.appendChild(sheet);
            document.body.appendChild(overlay);

            // Animar entrada
            requestAnimationFrame(() => overlay.classList.add('open'));

            const closeModal = () => {
                overlay.classList.remove('open');
                setTimeout(() => overlay.remove(), 300);
            };

            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
            document.getElementById('dopt-close-x')?.addEventListener('click', closeModal);

            // Renderizar el widget dentro del modal
            const widgetContainer = document.getElementById('modal-shipping-widget-container');
            let modalWidgetRef = null;
            if (widgetContainer && typeof window.renderShippingWidget === 'function') {
                modalWidgetRef = window.renderShippingWidget(widgetContainer, productPrice);
            }

            // Manejar click del botón WhatsApp con envío particular
            const btnSubmitOwnShipping = document.getElementById('btn-modal-submit-own-shipping');
            if (btnSubmitOwnShipping) {
                btnSubmitOwnShipping.onclick = () => {
                    const selectionData = modalWidgetRef ? modalWidgetRef.getSelection() : null;
                    closeModal();

                    let shippingInfo = {};
                    if (selectionData) {
                        shippingInfo = {
                            localidad: `${selectionData.city || 'AMBA'} (${selectionData.zoneName})`,
                            direccion: `Costo envío: $${selectionData.cost} | TOTAL CON ENVÍO: $${selectionData.total} [${selectionData.promise.text}]`
                        };
                    }

                    const waMsg = buildWA(grupo, medidaName, 'shipping', shippingInfo);
                    try {
                        if (typeof gtag === 'function') gtag('event', 'contact', { method: 'WhatsApp', event_category: 'Engagement', event_label: 'Comprar WA - Mensajeria Propia' });
                    } catch(e) {}
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
                };
            }
        }

        function updateBuyButton(grupo, medidaName) {
            const container = document.getElementById('dynamic-shipping-links-container');
            if (container) {
                container.innerHTML = '';
                
                const wrapper = document.createElement('div');
                wrapper.style.display = "flex";
                wrapper.style.flexDirection = "column";
                wrapper.style.gap = "4px";
                wrapper.style.width = "100%";

                const btn = document.createElement('a');
                btn.href = "#";
                btn.className = "btn-primary giant-btn";
                btn.style.display = "flex";
                btn.innerHTML = `<span class="material-symbols-outlined">local_shipping</span><span>Comprar con envío</span>`;
                
                btn.onclick = (e) => {
                    if (e) e.preventDefault();
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
                    } catch (err) { /* Ignore */ }

                    const activeMlVariant = (grupo && grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
                    const currentMlLink = (activeMlVariant && activeMlVariant.link) ? activeMlVariant.link.trim() : '';

                    showDeliveryModal(grupo, medidaName, currentMlLink);
                };

                const legendEl = document.createElement('span');
                legendEl.style.fontSize = "0.75rem";
                legendEl.style.color = "#64748B";
                legendEl.style.textAlign = "center";
                legendEl.style.marginTop = "2px";
                legendEl.style.fontStyle = "italic";
                legendEl.innerText = "Mensajería propia en 24h o plataformas externas";

                wrapper.appendChild(btn);
                wrapper.appendChild(legendEl);
                container.appendChild(wrapper);
                container.style.display = 'flex';
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
                                        <span style="font-size:1.6rem; font-weight:800; color:#10B981; line-height: 1.2;">${formattedTotalPrice}</span>
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
                                <span style="font-size:1.6rem; font-weight:800; color:var(--primary-color); line-height: 1.2;">${formattedPrice}</span>
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

            // Capturar el link de ML de la variante activa para pasarlo al modal
            const activeMlVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
            const currentMlLink = (activeMlVariant && activeMlVariant.link) ? activeMlVariant.link.trim() : '';

            if (btnPickup) {
                btnPickup.href = `https://wa.me/${phone}?text=${encodeURIComponent(buildWA(grupo, medidaName, 'pickup'))}`;
            }

            // Actualizar Widget Calculador de Envíos
            const activeVariantForWidget = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
            if (activeVariantForWidget && activeVariantForWidget.price !== undefined) {
                const qtyValEl = document.getElementById('qty-value');
                const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1') : 1;
                const activePrice = activeVariantForWidget.price * qtyVal;
                
                const widgetContainer = document.getElementById('product-shipping-calculator-widget');
                if (widgetContainer && typeof window.renderShippingWidget === 'function') {
                    if (!window.activeShippingWidgetRef) {
                        window.activeShippingWidgetRef = window.renderShippingWidget(widgetContainer, activePrice, function(selectionData) {
                            if (btnPickup) {
                                const waMsg = buildWA(grupo, medidaName, 'shipping', {
                                    localidad: `${selectionData.cityName} (${selectionData.zoneName})`,
                                    direccion: `Total con envío: $${selectionData.totalWithShipping}`
                                });
                                btnPickup.href = `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`;
                            }
                        });
                    } else {
                        window.activeShippingWidgetRef.updateProductPrice(activePrice);
                    }
                }
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
                    const selMedida = divMedida.querySelector('select');
                    const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

                    const selOpt = divOpt.querySelector('select');
                    const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
                    const optLabel = product.optional_variant?.label || '';

                    // Capturar precio numérico de la variante activa para guardarlo en el carrito
                    const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
                    const itemPrice = (activeVariant && activeVariant.showPrice === true && activeVariant.price) ? activeVariant.price : null;

                    window.CarritoModule.toggle(product, acabado, categoryName, medidaText, optText, optLabel, itemPrice);
                    
                    const inFav = isProductInFavorites(product.id, acabado, medidaText, optText);
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
                         <div class="product-gallery-img-wrapper" style="position:relative;">
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
            
            detailImgContainer.innerHTML = galleryHTML;
            
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

        // --- Render Selectors ---
        // Acabado Selector (Horizontal Buttons)
        if (grupos.length > 1 || (grupos.length === 1 && grupos[0].acabado_name !== 'Único')) {
            divAcabado.className = 'variant-selector-wrapper';
            
            // Si hay exactamente 2 acabados, dividimos al 50%. Si hay cualquier otro número, dividimos al 33.33%.
            const btnWidth = grupos.length === 2 ? 'calc(50% - 4px)' : 'calc(33.333% - 6px)';
            
            divAcabado.innerHTML = `
                <label class="variant-label">🎨 Color / Acabado</label>
                <div class="variant-buttons-container" id="acabado-buttons-container" style="display: flex; flex-wrap: wrap; gap: 8px; overflow-x: visible;">
                    ${grupos.map((g, i) => {
                        const imgUrl = g.cover_image || (g.images_list && g.images_list.length > 0 ? g.images_list[0] : null);
                        return `
                            <button type="button" class="variant-btn ${i === currentGroupIndex ? 'active' : ''}" data-index="${i}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0.35rem 0.5rem; border-radius: 30px; flex: 0 0 ${btnWidth}; width: ${btnWidth}; max-width: ${btnWidth}; font-size: 0.82rem; white-space: nowrap; box-sizing: border-box;">
                                ${imgUrl ? `<img src="${imgUrl}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(255,255,255,0.7); box-shadow: 0 1px 3px rgba(0,0,0,0.15); flex-shrink: 0;">` : ''}
                                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${g.acabado_name}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            `;
            const btnContainer = divAcabado.querySelector('#acabado-buttons-container');

            btnContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.variant-btn');
                if (!btn) return;
                
                btnContainer.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                updateGroupView(parseInt(btn.dataset.index));
            });
        }

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

        // Registrar visita
        if (window.trackProductView) {
            window.trackProductView(product.id);
        }

        // Rellenar carrusel de recomendados ("Los más buscados")
        const relatedList = document.getElementById('detail-related-product-list');
        if (relatedList) {
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

                randomSelections.forEach(({ product: p, catName }) => {
                    const pCard = document.createElement('div');
                    pCard.className = 'category-card';
                    const productCover = Array.isArray(p.image) ? p.image[0] : (p.image || 'img/logo_provisional.png');
                    pCard.innerHTML = `
                        <div class="category-card-img-wrapper" style="position:relative;">
                            <img src="${productCover}" class="category-card-img lazy-img" alt="${p.title}" loading="lazy" onload="this.classList.add('loaded')">
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
                    relatedList.appendChild(pCard);
                });
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