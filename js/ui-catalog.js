
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



    function generateWaMsg(productTitle, productDesc, variantName) {
        const baseMsg = `Hola La Tarima! Me interesa el producto: ${productTitle} (${productDesc.substring(0, 30)}...). `;
        if (variantName) {
            return baseMsg + `Elegí la variante: ${variantName}. ¿Me podrías pasar el presupuesto actual para pasar a retirar por el taller?`;
        }
        return baseMsg + `¿Me podrías pasar el presupuesto actual para pasar a retirar por el taller?`;
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
            if (product.primaryCatId && typeof window.sessionProducts !== 'undefined') {
                const primaryCat = window.sessionProducts.find(c => c.id === product.primaryCatId);
                if (primaryCat) displayCategory = primaryCat.name;
            }
            detailCategory.textContent = displayCategory;
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
            btnPickup.onclick = () => {
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
                } catch (e) { /* Ignore adblocker errors */ }
            };
        }

        // 1. Identificar grupos de acabado
        let grupos = product.acabados_groups || [];
        
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
        if (priceDisplay) priceDisplay.style.display = 'none';

        attrContainer.innerHTML = '';

        // Contenedores internos para selectores
        const divAcabado = document.createElement('div');
        const divMedida = document.createElement('div');
        const divOpt = document.createElement('div');
        attrContainer.appendChild(divAcabado);
        attrContainer.appendChild(divMedida);
        attrContainer.appendChild(divOpt);

        let initialGroupIndex = 0;
        if (preselectedAcabado && grupos.length > 0) {
            const matchedIdx = grupos.findIndex(g => (g.acabado_name || '').trim().toLowerCase() === (preselectedAcabado || '').trim().toLowerCase());
            if (matchedIdx !== -1) {
                initialGroupIndex = matchedIdx;
            }
        }
        let currentGroupIndex = initialGroupIndex;

        function buildWA(grupo, medidaIndex) {
            const medidaText = grupo.medidas_variants[medidaIndex]?.medida || '';
            const selOpt = divOpt.querySelector('select');
            const optText = selOpt ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
            const optLabel = product.optional_variant?.label || '';

            let parts = [`*${product.title}*`];
            if (grupo.acabado_name && grupo.acabado_name !== 'Único') parts.push(`Acabado: ${grupo.acabado_name}`);
            if (medidaText) parts.push(`Medida: ${medidaText}`);
            if (optText && optLabel) parts.push(`${optLabel}: ${optText}`);

            return `¡Hola La Tarima! Quiero consultar por el producto: ${parts.join(', ')}. ¿Me podés pasar más info y disponibilidad?`;
        }

        function updateBuyButton(grupo, medidaIndex) {
            const link = grupo.medidas_variants[medidaIndex]?.link?.trim();
            if (link) {
                btnShipping.href = link;
                btnShipping.style.display = 'flex';
            } else {
                btnShipping.style.display = 'none';
            }
            if (btnPickup) btnPickup.href = `https://wa.me/${phone}?text=${encodeURIComponent(buildWA(grupo, medidaIndex))}`;
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

                    window.CarritoModule.toggle(product, acabado, categoryName, medidaText, optText, optLabel);
                    
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
                const currentQuery = window.location.search;
                const originPath = `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '/')}`;
                const baseUrl = originPath.endsWith('/') ? originPath : originPath + '/';
                const shareUrl = `${baseUrl}p/${product.id}.html${currentQuery}`;
                
                const grupo = grupos[currentGroupIndex];
                const acabadoName = grupo.acabado_name || 'Único';
                
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

                if (navigator.share) {
                    navigator.share({
                        title: product.title,
                        text: shareText,
                        url: shareUrl
                    }).catch(err => {
                        console.log('Error sharing:', err);
                        // Falla navigator.share (ej: cancelado o error de contexto), hacemos fallback al portapapeles
                        copyTextToClipboard(`${shareText}\n${shareUrl}`);
                    });
                } else {
                    copyTextToClipboard(`${shareText}\n${shareUrl}`);
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
            let defaultIdx = 0;
            if (grupo.medidas_variants && grupo.medidas_variants.length > 0) {
                if (preselectedMedida) {
                    const matchedMedIdx = grupo.medidas_variants.findIndex(m => (m.medida || '').trim().toLowerCase() === (preselectedMedida || '').trim().toLowerCase());
                    if (matchedMedIdx !== -1) defaultIdx = matchedMedIdx;
                } else {
                    const defIndex = grupo.medidas_variants.findIndex(m => m.default === true);
                    if (defIndex !== -1) defaultIdx = defIndex;
                }

                divMedida.className = 'variant-selector-wrapper mt-1';
                divMedida.innerHTML = `
                    <label class="variant-label">📏 Medida</label>
                    <select class="variant-select-cascade">
                        ${grupo.medidas_variants.map((m, i) => `
                            <option value="${i}" ${i === defaultIdx ? 'selected' : ''}>${m.medida}</option>
                        `).join('')}
                    </select>
                `;
                divMedida.querySelector('select').addEventListener('change', (e) => {
                    updateBuyButton(grupo, parseInt(e.target.value));
                    updateFavState();
                    updateUrlWithVariants();
                });
            }

            // Initial button update for this group
            updateBuyButton(grupo, defaultIdx);

            // Update Favorites button state
            updateFavState();

            // Update URL parameters
            updateUrlWithVariants();
        }

        // --- Render Selectors ---
        // Acabado Selector (Horizontal Buttons)
        if (grupos.length > 1 || (grupos.length === 1 && grupos[0].acabado_name !== 'Único')) {
            divAcabado.className = 'variant-selector-wrapper';
            divAcabado.innerHTML = `
                <label class="variant-label">🎨 Color / Acabado</label>
                <div class="variant-buttons-container" id="acabado-buttons-container">
                    ${grupos.map((g, i) => `
                        <button type="button" class="variant-btn ${i === currentGroupIndex ? 'active' : ''}" data-index="${i}">
                            ${g.acabado_name}
                        </button>
                    `).join('')}
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
            divOpt.querySelector('select').addEventListener('change', () => {
                const selMedida = divMedida.querySelector('select');
                const mIdx = selMedida ? parseInt(selMedida.value) : 0;
                updateBuyButton(grupos[currentGroupIndex], mIdx);
                updateFavState();
                updateUrlWithVariants();
            });
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
                    if (cat.products) {
                        cat.products.forEach(p => {
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
                alert('Hubo un error al guardar en el servidor: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('No se pudo conectar con el servidor local para guardar.');
        }
    }


window.showProductDetail = safeRender(showProductDetail, 'showProductDetail');


window.updateActionLinks = updateActionLinks;


window.findProductById = findProductById;