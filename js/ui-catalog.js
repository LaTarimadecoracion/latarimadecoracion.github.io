
    function findProductById(prodId) {
        if (!prodId) return null;
        const searchClean = decodeURIComponent(prodId).trim().toLowerCase();
        const normSearch = searchClean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

        // 1. Revisar caché individual en memoria
        if (window.productDetailCache && window.productDetailCache.has(searchClean)) {
            const cachedP = window.productDetailCache.get(searchClean);
            return { product: cachedP, catName: cachedP.primaryCatId || '' };
        }

        // 2. Revisar window.sessionProducts
        if (window.sessionProducts) {
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
            if (fallback) return fallback;
        }

        return null;
    }

    function openProductLightbox(images, initialIndex = 0, productTitle = '') {
        if (!images || images.length === 0) return;

        let currentIndex = initialIndex;

        // Crear el modal solo una vez y reutilizarlo
        let modal = document.getElementById('product-lightbox-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'product-lightbox-modal';
            // Estilos inline para no depender de CSS externo
            modal.style.cssText = `
                display: none;
                position: fixed;
                inset: 0;
                z-index: 99999;
                background: rgba(0,0,0,0.88);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                align-items: center;
                justify-content: center;
                cursor: zoom-out;
            `;
            modal.innerHTML = `
                <img id="lb-img" style="
                    max-width: min(92vw, 960px);
                    max-height: 88vh;
                    object-fit: contain;
                    border-radius: 6px;
                    cursor: default;
                    display: block;
                    user-select: none;
                    -webkit-user-drag: none;
                " alt="Foto del producto" draggable="false">

                <!-- Cerrar -->
                <button id="lb-close" type="button" title="Cerrar (Esc)" style="
                    position: fixed;
                    top: 18px; right: 18px;
                    background: rgba(255,255,255,0.12);
                    border: none;
                    color: #fff;
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    font-size: 22px;
                    line-height: 1;
                    transition: background 0.2s;
                    z-index: 2;
                ">
                    <span class="material-symbols-outlined" style="font-size:22px;">close</span>
                </button>

                <!-- Contador -->
                <span id="lb-counter" style="
                    position: fixed;
                    bottom: 22px; left: 50%; transform: translateX(-50%);
                    background: rgba(0,0,0,0.45);
                    color: rgba(255,255,255,0.85);
                    font-size: 0.78rem;
                    font-weight: 600;
                    padding: 4px 14px;
                    border-radius: 50px;
                    letter-spacing: 0.04em;
                    pointer-events: none;
                    z-index: 2;
                "></span>

                <!-- Flecha izquierda -->
                <button id="lb-prev" type="button" title="Anterior" style="
                    position: fixed;
                    left: 14px; top: 50%; transform: translateY(-50%);
                    background: rgba(255,255,255,0.1);
                    border: none; color: #fff;
                    width: 44px; height: 44px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s;
                    z-index: 2;
                ">
                    <span class="material-symbols-outlined" style="font-size:26px;">chevron_left</span>
                </button>

                <!-- Flecha derecha -->
                <button id="lb-next" type="button" title="Siguiente" style="
                    position: fixed;
                    right: 14px; top: 50%; transform: translateY(-50%);
                    background: rgba(255,255,255,0.1);
                    border: none; color: #fff;
                    width: 44px; height: 44px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s;
                    z-index: 2;
                ">
                    <span class="material-symbols-outlined" style="font-size:26px;">chevron_right</span>
                </button>
            `;
            document.body.appendChild(modal);
        }

        const imgEl     = modal.querySelector('#lb-img');
        const closeBtn  = modal.querySelector('#lb-close');
        const prevBtn   = modal.querySelector('#lb-prev');
        const nextBtn   = modal.querySelector('#lb-next');
        const counterEl = modal.querySelector('#lb-counter');

        function showImage(index) {
            if (index < 0) index = images.length - 1;
            if (index >= images.length) index = 0;
            currentIndex = index;
            imgEl.src = images[currentIndex];
            imgEl.alt = productTitle || 'Foto del producto';
            // Mostrar/ocultar flechas y contador
            const multi = images.length > 1;
            prevBtn.style.display = multi ? 'flex' : 'none';
            nextBtn.style.display = multi ? 'flex' : 'none';
            counterEl.style.display = multi ? 'block' : 'none';
            if (multi) counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
        }

        function closeLightbox() {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleKey);
            modal.removeEventListener('touchstart', onTouchStart);
            modal.removeEventListener('touchend', onTouchEnd);
        }

        // Teclado
        function handleKey(e) {
            if (e.key === 'Escape')      closeLightbox();
            if (e.key === 'ArrowLeft')   showImage(currentIndex - 1);
            if (e.key === 'ArrowRight')  showImage(currentIndex + 1);
        }

        // Swipe táctil
        let touchStartX = 0;
        function onTouchStart(e) { touchStartX = e.touches[0].clientX; }
        function onTouchEnd(e) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 50) dx < 0 ? showImage(currentIndex + 1) : showImage(currentIndex - 1);
        }

        // Asignar eventos (reemplazar para no acumular listeners)
        closeBtn.onclick  = (e) => { e.stopPropagation(); closeLightbox(); };
        prevBtn.onclick   = (e) => { e.stopPropagation(); showImage(currentIndex - 1); };
        nextBtn.onclick   = (e) => { e.stopPropagation(); showImage(currentIndex + 1); };
        imgEl.onclick     = (e) => { e.stopPropagation(); };
        modal.onclick     = (e) => { if (e.target === modal) closeLightbox(); };

        document.addEventListener('keydown', handleKey);
        modal.addEventListener('touchstart', onTouchStart, { passive: true });
        modal.addEventListener('touchend', onTouchEnd, { passive: true });

        // Hover en botones
        [closeBtn, prevBtn, nextBtn].forEach(btn => {
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.22)';
            btn.onmouseleave = () => btn.style.background = 'rgba(255,255,255,0.1)';
        });

        showImage(initialIndex);
        modal.style.display = 'flex';
    }
    window.openProductLightbox = openProductLightbox;





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
        // Leer teléfono desde siteConfig para no hardcodear — editable desde el admin
        const waUrl = window.siteConfig?.socialLinks?.whatsapp || 'https://wa.me/5491167007723';
        const phone = waUrl.replace('https://wa.me/', '');
        const text = encodeURIComponent(whatsappMessage);
        btnBuyPickup.href = `https://wa.me/${phone}?text=${text}`;
    }



    function updateMetaTags(title, desc, imageUrl, product = null) {
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

        // Schema.org JSON-LD estructurado para SEO y Google Shopping
        let ldScript = document.getElementById('product-schema-ld');
        if (!ldScript) {
            ldScript = document.createElement('script');
            ldScript.id = 'product-schema-ld';
            ldScript.type = 'application/ld+json';
            document.head.appendChild(ldScript);
        }

        if (product) {
            let bestPrice = 0;
            const firstGroup = (product.acabados_groups || []).find(g => !g.hidden);
            if (firstGroup && firstGroup.medidas_variants && firstGroup.medidas_variants.length > 0) {
                const firstVariant = firstGroup.medidas_variants.find(v => !v.hidden && v.price > 0);
                if (firstVariant) bestPrice = firstVariant.price;
            }
            if (!bestPrice && product.price) bestPrice = product.price;

            const absUrl = (url) => !url ? null : (url.startsWith('http') ? url : `${window.location.origin}/${url.replace(/^[\/\\]/, '')}`);
            const images = [];
            (product.acabados_groups || []).filter(g => !g.hidden).forEach(g => {
                if (g.cover_image) images.push(absUrl(g.cover_image));
                (g.images_list || []).forEach(img => {
                    const u = absUrl(img);
                    if (u && !images.includes(u)) images.push(u);
                });
            });
            if (images.length === 0 && imageUrl) images.push(absUrl(imageUrl));

            const schemaData = {
                '@context': 'https://schema.org',
                '@type': 'Product',
                'name': product.title || title,
                'description': (product.description || desc || '').substring(0, 500),
                'image': images.filter(Boolean),
                'brand': { '@type': 'Brand', 'name': 'La Tarima' },
                'offers': {
                    '@type': 'Offer',
                    'priceCurrency': 'ARS',
                    'price': bestPrice || 0,
                    'availability': 'https://schema.org/InStock',
                    'seller': { '@type': 'Organization', 'name': 'La Tarima Decoración' },
                    'url': window.location.href
                }
            };
            ldScript.textContent = JSON.stringify(schemaData);
        } else {
            ldScript.textContent = '';
        }
    }



    async function showProductDetail(product, categoryName, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '', isBack = false) {
        if (!product) return;

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
        updateMetaTags(product.title, safeDesc, imageUrl, product);

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
                    let activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
                    if (!activeVariant && (product.isCustomCutting === true || product.id === '69') && grupo.medidas_variants && grupo.medidas_variants.length > 0) {
                        activeVariant = grupo.medidas_variants[0];
                    }
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
                        
                        let discountsList = (activeVariant.volumeDiscounts && Array.isArray(activeVariant.volumeDiscounts) && activeVariant.volumeDiscounts.length > 0)
                            ? activeVariant.volumeDiscounts
                            : (product.quantityDiscounts || []);
                        
                        // Si es producto de la categoría Cortes de Madera, integrar escala global de cortesConfig
                        const isCortesProduct = product.isCustomCutting || product.category === 'cortes-madera' || product.rubro === 'cortes-madera' || product.id === '67' || product.id === '68' || product.id === '69';
                        if (isCortesProduct && window.cortesConfig?.descuentos?.activo !== false && window.cortesConfig?.descuentos?.escalas) {
                            discountsList = window.cortesConfig.descuentos.escalas;
                        }
                        
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

                        // 2. Logística Flex (evaluando medidas de bulto, peso de la madera y división en paquetes)
                        let isFlexExcludedBySize = false;
                        let flexPackagesCount = 1;
                        let flexTotalWeightKg = 0;

                        if (product.isCustomCutting || product.id === '69') {
                            const conf = window.cortesConfig?.logistica?.flex;
                            const inL = document.getElementById('detail-custom-cut-largo');
                            const inW = document.getElementById('detail-custom-cut-ancho');
                            const selMat = document.getElementById('detail-custom-cut-material');

                            const rawL = parseFloat(inL?.value) || 80;
                            const rawW = parseFloat(inW?.value) || 30;
                            // Auto-orientación inteligente (largo mayor, ancho menor)
                            const l = Math.max(rawL, rawW);
                            const w = Math.min(rawL, rawW);

                            // Límites físicos configurados en el panel de Flex
                            const maxBultoLargo = conf?.max_largo || 140;
                            const maxBultoAncho = conf?.max_ancho || 60;
                            const maxBultoPeso = conf?.max_peso_bulto || 12;
                            const maxUnitsPerPkg = conf?.max_unidades || 5;

                            // Si una sola tabla excede el largo o ancho del bulto de moto, se excluye Flex
                            if (l > maxBultoLargo || w > maxBultoAncho) {
                                isFlexExcludedBySize = true;
                            } else {
                                // Obtener densidad de la madera seleccionada
                                const optMat = selMat?.options[selMat?.selectedIndex];
                                const matId = optMat?.value;
                                const curMat = (window.cortesConfig?.materiales || []).find(m => m.id === matId);
                                const pesoM2 = curMat?.peso_m2 || 10; // kg/m2 base
                                const pieceM2 = (l * w) / 10000;
                                const pieceWeight = pieceM2 * pesoM2;
                                flexTotalWeightKg = pieceWeight * qty;

                                // Si una sola pieza ya pesa más de lo que puede llevar una moto completa (ej > 15 kg), excluir Flex
                                if (pieceWeight > maxBultoPeso * 1.5) {
                                    isFlexExcludedBySize = true;
                                } else {
                                    // Paquetes necesarios por cantidad de unidades
                                    const pkgsByQty = Math.ceil(qty / maxUnitsPerPkg);
                                    // Paquetes necesarios por peso total acumulado
                                    const pkgsByWeight = Math.ceil(flexTotalWeightKg / maxBultoPeso);
                                    // Se toma el que requiera más paquetes para no sobrecargar
                                    flexPackagesCount = Math.max(pkgsByQty, pkgsByWeight, 1);

                                    // Si excede 4 paquetes (ej más de 48 kg), una moto no lo puede trasladar
                                    if (flexPackagesCount > 4 || flexTotalWeightKg > (maxBultoPeso * 4)) {
                                        isFlexExcludedBySize = true;
                                    }
                                }
                            }
                        }

                        // Beneficios específicos de envío por tipo de transporte (Cortes de Madera)
                        const isCortesForShipping = product.isCustomCutting || product.category === 'cortes-madera' || product.rubro === 'cortes-madera' || product.id === '67' || product.id === '68' || product.id === '69';
                        const logCortes = (isCortesForShipping && window.cortesConfig?.logistica) ? window.cortesConfig.logistica : null;

                        // Beneficios propios para Logística Flex (pequeños bultos, escalas progresivas de descuento y envío gratis)
                        const flexBen = logCortes?.flex?.beneficios;
                        const isFlexFreeShipping = flexBen && flexBen.activo !== false && (flexBen.envioGratisMin > 0) && qty >= flexBen.envioGratisMin;
                        
                        let flexDiscountPct = 0;
                        if (flexBen && flexBen.activo !== false && !isFlexFreeShipping) {
                            if (Array.isArray(flexBen.escalas) && flexBen.escalas.length > 0) {
                                // Buscar la escala más alta que cumpla la cantidad comprada
                                const sortedScales = [...flexBen.escalas].sort((a, b) => b.minQty - a.minQty);
                                const matchedScale = sortedScales.find(s => qty >= s.minQty);
                                if (matchedScale) flexDiscountPct = matchedScale.discountPercent || 0;
                            } else if (flexBen.descuentoTarifaMin && flexBen.descuentoTarifaPct && qty >= flexBen.descuentoTarifaMin) {
                                flexDiscountPct = flexBen.descuentoTarifaPct || 0;
                            }
                        }

                        // Beneficios propios para Flete Propio (grandes volúmenes, obras, hasta 100 placas)
                        const fleteBen = logCortes?.flete?.beneficios;
                        const isFleteFreeShipping = fleteBen && fleteBen.activo !== false && qty >= (fleteBen.envioGratisMin || 10);
                        const fleteDiscountPct = (fleteBen && fleteBen.activo !== false && qty >= (fleteBen.descuentoTarifaMin || 5)) ? (fleteBen.descuentoTarifaPct || 0) : 0;

                        if (!isFlexDisabled && !isFlexExcludedBySize && shipConf.logisticaEnabled !== false && cpRes.logistica && cpRes.logistica.active !== false) {
                            const manualCost = parseFloat(shipConf.logisticaCost) || 0;
                            const sysCost = cpRes.logistica.cost || 0;
                            const baseCost = manualCost > 0 ? manualCost : sysCost;
                            const freeMin = parseInt(shipConf.logisticaFreeMinUnits) || 0;
                            const maxUnits = parseInt(shipConf.logisticaMaxUnits) || 0;
                            const isFreeByQty = (freeMin > 0 && qty >= freeMin) || isFlexFreeShipping;

                            // Multiplicación automática por paquetes según medidas y peso
                            const packages = (product.isCustomCutting || product.id === '69') ? flexPackagesCount : (maxUnits > 0 ? Math.ceil(qty / maxUnits) : 1);
                            let cost = isFreeByQty ? 0 : (baseCost * packages);
                            if (cost > 0 && flexDiscountPct > 0) {
                                cost = Math.round(cost * (1 - flexDiscountPct / 100));
                            }
                            const pkgBadge = packages > 1 ? ` (${packages} paquetes)` : '';
                            validOptions.push({ 
                                label: isFreeByQty ? `Logística Flex (¡Envío GRATIS por cantidad!)${pkgBadge}` : (flexDiscountPct > 0 ? `Logística Flex (${flexDiscountPct}% OFF)${pkgBadge}` : `Logística Flex / Courier${pkgBadge}`), 
                                cost: cost, 
                                icon: 'local_shipping' 
                            });
                        }

                        // 3. Flete particular
                        if (shipConf.fleteEnabled !== false && cpRes.flete && cpRes.flete.active !== false) {
                            const manualCost = parseFloat(shipConf.fleteCost) || 0;
                            const sysCost = cpRes.flete.cost || 0;
                            const baseCost = manualCost > 0 ? manualCost : sysCost;
                            const freeMin = parseInt(shipConf.fleteFreeMinUnits) || 0;
                            const maxUnits = parseInt(shipConf.fleteMaxUnits) || 0;
                            const isFreeByQty = (freeMin > 0 && qty >= freeMin) || isFleteFreeShipping;
                            const packages = maxUnits > 0 ? Math.ceil(qty / maxUnits) : 1;
                            let cost = isFreeByQty ? 0 : (baseCost * packages);
                            if (cost > 0 && fleteDiscountPct > 0) {
                                cost = Math.round(cost * (1 - fleteDiscountPct / 100));
                            }
                            validOptions.push({ 
                                label: isFreeByQty ? 'Flete Particular (¡Envío GRATIS por cantidad!)' : (fleteDiscountPct > 0 ? `Flete Particular (${fleteDiscountPct}% OFF en flete)` : 'Flete Particular'), 
                                cost: cost, 
                                icon: 'fire_truck' 
                            });
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

            // Escuchar clics en la imagen de la galería para abrir Lightbox / Fullscreen estilo Mercado Libre
            const imgWrappers = detailImgContainer.querySelectorAll('.product-gallery-img-wrapper');
            imgWrappers.forEach((wrapper, idx) => {
                wrapper.style.cursor = 'zoom-in';
                wrapper.title = 'Hacé clic para ampliar en pantalla completa';
                wrapper.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openProductLightbox(images, idx, product.title);
                });
            });

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

            // Actualizar descripción dinámica (descripción específica del acabado o la base del producto)
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

                if (product.isCustomCutting === true || product.id === '69') {
                    // MODO CORTE INTERACTIVO A MEDIDA: Inyectar selector con Material, Uso, Espesor y casilleros de largo/ancho
                    const conf = window.cortesConfig || {
                        precios: { precio_m2_venta: 48500, minimo_corte_taller: 3500 },
                        materiales: [
                            { id: "pino_macizo", name: "Pino Macizo / Finger Joint", precio_m2: 48500, max_largo: 300, max_ancho: 120, activo: true, is_default: true },
                            { id: "eucalipto_tablillado", name: "Eucalipto Alistonado / Tablillado", precio_m2: 68000, max_largo: 240, max_ancho: 60, limite_mensaje: "El tablero de Eucalipto viene en ancho máx. de 60 cm y largo de 240 cm.", activo: true, is_default: false },
                            { id: "paraiso_alistonado", name: "Paraíso Alistonado", precio_m2: 82000, max_largo: 240, max_ancho: 60, limite_mensaje: "El tablero de Paraíso viene en ancho máx. de 60 cm y largo de 240 cm.", activo: true, is_default: false }
                        ],
                        usos: [
                            { id: "estante", name: "Estantería / Repisa", factor_precio: 1.0, recargo_fijo: 0, is_default: true },
                            { id: "escritorio_mesa", name: "Tapa de Escritorio / Mesa", factor_precio: 1.25, recargo_fijo: 2500, is_default: false },
                            { id: "escalon", name: "Escalón / Tránsito Pesado", factor_precio: 1.15, recargo_fijo: 1800, is_default: false }
                        ],
                        espesores: [
                            { id: "1_pulgada", name: "1 Pulgada (~2.2 cm)", factor_precio: 1.0, is_default: true },
                            { id: "1_5_pulgadas", name: "1.5 Pulgadas (~3.2 cm)", factor_precio: 1.45, is_default: false },
                            { id: "2_pulgadas", name: "2 Pulgadas (~4.2 cm)", factor_precio: 1.95, is_default: false }
                        ]
                    };

                    const activeMats = (Array.isArray(conf.materiales) && conf.materiales.length > 0)
                        ? conf.materiales.filter(m => m.activo !== false)
                        : [{ id: "pino_macizo", name: "Pino Macizo / Finger Joint", precio_m2: conf.precios?.precio_m2_venta || 48500, max_largo: 300, max_ancho: 120 }];

                    const activeUsos = (Array.isArray(conf.usos) && conf.usos.length > 0)
                        ? conf.usos
                        : [
                            { id: "estante", name: "Estantería / Repisa", factor_precio: 1.0, recargo_fijo: 0 },
                            { id: "escritorio_mesa", name: "Tapa de Escritorio / Mesa", factor_precio: 1.25, recargo_fijo: 2500 },
                            { id: "escalon", name: "Escalón / Tránsito Pesado", factor_precio: 1.15, recargo_fijo: 1800 }
                        ];

                    const activeEspesores = (Array.isArray(conf.espesores) && conf.espesores.length > 0)
                        ? conf.espesores
                        : [{ id: "1_pulgada", name: "1 Pulgada (~2.2 cm)", factor_precio: 1.0 }];

                    // Agrupar materiales por nombre para que el cliente NUNCA vea dos opciones con el mismo nombre
                    const groupedMatsMap = new Map();
                    activeMats.forEach(m => {
                        const cleanName = (m.name || 'Madera').trim();
                        if (!groupedMatsMap.has(cleanName)) {
                            groupedMatsMap.set(cleanName, {
                                name: cleanName,
                                id: m.id,
                                max_largo: m.max_largo || 300,
                                max_ancho: m.max_ancho || 120,
                                limite_mensaje: m.limite_mensaje || '',
                                items: []
                            });
                        }
                        const entry = groupedMatsMap.get(cleanName);
                        entry.items.push(m);
                        if (m.max_largo > entry.max_largo) entry.max_largo = m.max_largo;
                        if (m.max_ancho > entry.max_ancho) entry.max_ancho = m.max_ancho;
                    });
                    const unifiedMatsList = Array.from(groupedMatsMap.values());

                    // Encontrar índice del material si viene preseleccionado por URL
                    let preselectedGroupIdx = 0;
                    if (preselectedMedida) {
                        const cleanPre = preselectedMedida.toLowerCase();
                        const foundIdx = unifiedMatsList.findIndex(g => {
                            const gName = g.name.toLowerCase();
                            return cleanPre.includes(gName) || gName.includes(cleanPre) || (g.id && cleanPre.includes(g.id.toLowerCase()));
                        });
                        if (foundIdx !== -1) preselectedGroupIdx = foundIdx;
                    }

                    divMedida.className = 'variant-selector-wrapper mt-1';
                    divMedida.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label class="variant-label" style="margin-bottom:0;">📐 Configurar Corte a Medida:</label>
                            <span id="cortes-badge-mode" style="font-size:0.75rem; font-weight:800; color:var(--primary-color);">Cálculo Milimétrico</span>
                        </div>

                        <!-- Selector de Material / Tablero (Sin nombres duplicados) -->
                        <div style="margin-bottom:8px;">
                            <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px; text-transform:uppercase;">1. Madera / Tablero:</label>
                            <select id="detail-custom-cut-material" class="admin-input" style="width:100%; font-weight:700; border-radius:8px;">
                                ${unifiedMatsList.map((g, idx) => `
                                    <option value="${g.name}" data-group-index="${idx}" ${idx === preselectedGroupIdx ? 'selected' : ''}>
                                        ${g.name} (Hasta ${g.max_largo} × ${g.max_ancho} cm)
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Selector de Espesor -->
                        <div style="margin-bottom:8px;">
                            <label style="display:block; font-size:0.72rem; font-weight:700; color:#475569; margin-bottom:3px; text-transform:uppercase;">2. Espesor del Tablero:</label>
                            <select id="detail-custom-cut-espesor" class="admin-input" style="width:100%; font-weight:700; border-radius:8px;">
                            </select>
                        </div>

                        <!-- Grilla de Medidas Largo x Ancho -->
                        <div class="custom-cut-inputs-grid" style="background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:12px; padding:0.85rem; display:flex; flex-direction:column; gap:8px;">
                            <div class="custom-cut-row" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                                <div class="custom-cut-col" style="display:flex; flex-direction:column; gap:3px;">
                                    <label style="font-size:0.72rem; font-weight:700; color:#475569; text-transform:uppercase;">Largo (cm):</label>
                                    <div style="position:relative; display:flex; align-items:center;">
                                        <input type="number" id="detail-custom-cut-largo" value="80" min="15" max="300" step="1" class="admin-input" style="width:100%; padding:6px 22px 6px 8px; font-weight:700; border:1.5px solid #CBD5E1; border-radius:8px; box-sizing:border-box;">
                                        <span style="position:absolute; right:6px; font-size:0.75rem; font-weight:700; color:#94A3B8; pointer-events:none;">cm</span>
                                    </div>
                                </div>
                                <div class="custom-cut-col" style="display:flex; flex-direction:column; gap:3px;">
                                    <label style="font-size:0.72rem; font-weight:700; color:#475569; text-transform:uppercase;">Ancho / Prof. (cm):</label>
                                    <div style="position:relative; display:flex; align-items:center;">
                                        <input type="number" id="detail-custom-cut-ancho" value="30" min="10" max="120" step="1" class="admin-input" style="width:100%; padding:6px 22px 6px 8px; font-weight:700; border:1.5px solid #CBD5E1; border-radius:8px; box-sizing:border-box;">
                                        <span style="position:absolute; right:6px; font-size:0.75rem; font-weight:700; color:#94A3B8; pointer-events:none;">cm</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Alerta de Medidas Excedidas para el Material -->
                            <div id="detail-custom-cut-warning" style="display:none; background:#FEF2F2; border:1px solid #FCA5A5; color:#991B1B; padding:0.6rem; border-radius:8px; font-size:0.75rem; line-height:1.35; font-weight:600;">
                            </div>

                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:#64748B;">
                                <span id="detail-custom-cut-m2">📐 Superficie: 0.24 m²</span>
                                <span id="detail-custom-cut-spec" style="color:#16A34A; font-weight:700;">Corte Rectificado</span>
                            </div>
                        </div>
                    `;
                    divMedida.style.display = 'block';

                    // Actualizar selector de espesores para la madera seleccionada
                    // Cada espesor sabe a qué precio_m2 y límites corresponde exactamente
                    const updateEspesoresForSelectedMaterial = () => {
                        const selMat = document.getElementById('detail-custom-cut-material');
                        const selEsp = document.getElementById('detail-custom-cut-espesor');
                        if (!selMat || !selEsp) return;

                        const selectedGroupIndex = parseInt(selMat.options[selMat.selectedIndex]?.getAttribute('data-group-index') || '0');
                        const curGroup = unifiedMatsList[selectedGroupIndex] || unifiedMatsList[0];
                        if (!curGroup) return;

                        const currentEspVal = selEsp.value;
                        const espesorOptions = [];

                        // Recorrer las placas que forman este grupo
                        curGroup.items.forEach(matItem => {
                            const rawEspList = Array.isArray(matItem.espesores_disponibles) && matItem.espesores_disponibles.length > 0
                                ? matItem.espesores_disponibles
                                : [matItem.espesor || '18 mm'];

                            rawEspList.forEach(espText => {
                                const cleanEsp = espText.trim();
                                if (!cleanEsp) return;
                                if (!espesorOptions.some(o => o.text === cleanEsp)) {
                                    espesorOptions.push({
                                        text: cleanEsp,
                                        precio_m2: matItem.precio_m2 || 48500,
                                        max_largo: matItem.max_largo || curGroup.max_largo,
                                        max_ancho: matItem.max_ancho || curGroup.max_ancho,
                                        msg: matItem.limite_mensaje || curGroup.limite_mensaje
                                    });
                                }
                            });
                        });

                        if (espesorOptions.length === 0) {
                            espesorOptions.push({
                                text: '18 mm',
                                precio_m2: curGroup.items[0]?.precio_m2 || 48500,
                                max_largo: curGroup.max_largo,
                                max_ancho: curGroup.max_ancho,
                                msg: curGroup.limite_mensaje
                            });
                        }

                        selEsp.innerHTML = espesorOptions.map(opt => `
                            <option value="${opt.text}" data-precio="${opt.precio_m2}" data-max-largo="${opt.max_largo}" data-max-ancho="${opt.max_ancho}" data-msg="${opt.msg || ''}" ${opt.text === currentEspVal ? 'selected' : ''}>
                                ${opt.text}
                            </option>
                        `).join('');

                        if (!espesorOptions.some(o => o.text === currentEspVal)) {
                            selEsp.selectedIndex = 0;
                        }
                    };

                    const calcCut = () => {
                        const inL = document.getElementById('detail-custom-cut-largo');
                        const inW = document.getElementById('detail-custom-cut-ancho');
                        const selMat = document.getElementById('detail-custom-cut-material');
                        const selEsp = document.getElementById('detail-custom-cut-espesor');
                        const warnBox = document.getElementById('detail-custom-cut-warning');

                        const rawL = parseFloat(inL?.value) || 15;
                        const rawW = parseFloat(inW?.value) || 10;
                        
                        // Auto-Orientación Inteligente:
                        // La pieza es físicamente la misma sin importar si el cliente puso el número más grande en 'Largo' o en 'Ancho'.
                        // autoL siempre es el lado mayor (largo/frente) y autoW es el lado menor (ancho/profundidad).
                        const autoL = Math.max(rawL, rawW);
                        const autoW = Math.min(rawL, rawW);

                        const m2 = (autoL * autoW) / 10000;

                        const optMat = selMat?.options[selMat.selectedIndex];
                        const optEsp = selEsp?.options[selEsp.selectedIndex];

                        // Los límites y precio m2 ahora vienen asociados al espesor/tablero elegido
                        const maxL = parseFloat(optEsp?.getAttribute('data-max-largo')) || parseFloat(optMat?.getAttribute('data-max-largo')) || 300;
                        const maxW = parseFloat(optEsp?.getAttribute('data-max-ancho')) || parseFloat(optMat?.getAttribute('data-max-ancho')) || 120;
                        const precioM2Base = parseFloat(optEsp?.getAttribute('data-precio')) || parseFloat(optMat?.getAttribute('data-precio')) || (conf.precios?.precio_m2_venta || 48500);
                        const limitMsg = optEsp?.getAttribute('data-msg') || optMat?.getAttribute('data-msg') || '';

                        // Detección automática invisible evaluando la lista dinámica de usos/tipos de corte
                        let factorUso = 1.0;
                        let recargoFijoUso = 0;
                        let detectedLabel = 'Corte Estándar Cepillado';

                        const availableUsos = Array.isArray(conf.usos) ? conf.usos.filter(u => u.activo !== false) : [];
                        
                        // Buscar el uso que calce con las dimensiones autoW (ancho/profundidad) y autoL (largo)
                        // Se evalúan los más específicos primero (los que tengan min_ancho o recargos)
                        const matchedUso = availableUsos.find(u => {
                            const minW = u.min_ancho || 0;
                            const maxW_uso = u.max_ancho !== undefined ? u.max_ancho : 999;
                            const minL = u.min_largo || 0;
                            const maxL_uso = u.max_largo !== undefined ? u.max_largo : 999;
                            return (autoW >= minW && autoW <= maxW_uso && autoL >= minL && autoL <= maxL_uso);
                        }) || availableUsos[0];

                        if (matchedUso) {
                            const rawFactor = Number(matchedUso.factor_precio) || 0;
                            if (rawFactor > 0 && rawFactor <= 3) {
                                // Soporte retrocompatible para decimales viejos (ej 1.25)
                                factorUso = rawFactor;
                            } else {
                                // Porcentaje amigable directo: 0% -> 1.0, 25% -> 1.25, 50% -> 1.50
                                factorUso = 1.0 + (rawFactor / 100);
                            }
                            recargoFijoUso = matchedUso.recargo_fijo || 0;
                            detectedLabel = matchedUso.name || 'Corte Estándar';
                        }

                        // Validar límites de dimensiones físicas de la placa evaluando la pieza ya orientada
                        let isExceeded = false;
                        if (autoL > maxL || autoW > maxW) {
                            isExceeded = true;
                            if (warnBox) {
                                warnBox.style.display = 'block';
                                warnBox.innerHTML = `
                                    ⚠️ <strong>Medida fuera de límite:</strong> Este tablero (${optMat?.text.split('(')[0].trim()} en ${optEsp?.text.trim()}) viene en placas de hasta <strong>${maxL} cm de largo × ${maxW} cm de ancho</strong>.<br>
                                    ${limitMsg ? `<em>${limitMsg}</em><br>` : ''}
                                    Tu corte es de <strong>${autoL} × ${autoW} cm</strong>. Por favor ajustá los centímetros o elegí otro material.
                                `;
                            }
                        } else {
                            if (warnBox) warnBox.style.display = 'none';
                        }

                        const lblM2 = document.getElementById('detail-custom-cut-m2');
                        if (lblM2) lblM2.textContent = `📐 Superficie: ${m2.toFixed(2)} m²`;

                        const lblSpec = document.getElementById('detail-custom-cut-spec');
                        if (lblSpec) lblSpec.textContent = `${detectedLabel} (${optEsp?.text.split('(')[0].trim()})`;

                        const minimo = conf.precios?.minimo_corte_taller || 3500;
                        const precioM2Final = precioM2Base * factorUso;
                        const calcPrice = Math.max(minimo, Math.round(m2 * precioM2Final + recargoFijoUso));

                        const medidaDesc = `${autoL} × ${autoW} cm (${optMat?.text.split('(')[0].trim()} - ${detectedLabel})`;
                        defaultMedidaName = medidaDesc;

                        if (grupo.medidas_variants && grupo.medidas_variants[0]) {
                            grupo.medidas_variants[0].price = calcPrice;
                            grupo.medidas_variants[0].medida = medidaDesc;
                            grupo.medidas_variants[0].showPrice = true;
                            grupo.medidas_variants[0].hidden = false;
                        }

                        updateBuyButton(grupo, medidaDesc);

                        // Si excede la placa, deshabilitar botón de comprar/agregar
                        const btnBuy = document.getElementById('btn-modal-add-to-cart');
                        if (btnBuy) {
                            if (isExceeded) {
                                btnBuy.disabled = true;
                                btnBuy.style.opacity = '0.5';
                                btnBuy.style.pointerEvents = 'none';
                            } else {
                                btnBuy.disabled = false;
                                btnBuy.style.opacity = '1';
                                btnBuy.style.pointerEvents = 'auto';
                            }
                        }
                    };

                    document.getElementById('detail-custom-cut-largo')?.addEventListener('input', calcCut);
                    document.getElementById('detail-custom-cut-ancho')?.addEventListener('input', calcCut);
                    document.getElementById('detail-custom-cut-material')?.addEventListener('change', () => {
                        updateEspesoresForSelectedMaterial();
                        calcCut();
                    });
                    document.getElementById('detail-custom-cut-uso')?.addEventListener('change', calcCut);
                    document.getElementById('detail-custom-cut-espesor')?.addEventListener('change', calcCut);

                    // Inicializar opciones de espesor según material por defecto
                    updateEspesoresForSelectedMaterial();
                    calcCut();
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

            // Initial button update for this group (usar la variante activa calculada o la por defecto)
            const initialMedida = (product.isCustomCutting === true || product.id === '69')
                ? (grupo.medidas_variants && grupo.medidas_variants[0] ? grupo.medidas_variants[0].medida : defaultMedidaName)
                : defaultMedidaName;
            updateBuyButton(grupo, initialMedida);

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