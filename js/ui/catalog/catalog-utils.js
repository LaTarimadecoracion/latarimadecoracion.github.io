// js/ui/catalog/catalog-utils.js
// --- UTILIDADES DEL CATÁLOGO & SEO & LIGHTBOX ---
// Extraído de ui-catalog.js para modularización limpia.

(function() {
    'use strict';

    // Mapa de compatibilidad histórica para enlaces antiguos
    const LEGACY_PRODUCT_ALIASES = {
        'F6': '4H', '6B': '4H', '61': '4E', '66': '4C', '68': '42',
        '82': '79', '93': '4D', '94': '4G', '6A': '4B', 'B2': '41',
        'B3': '4G', 'C4': 'B6', 'C5': 'B5', 'C6': 'B4', 'D1': '46',
        'D5': '4B', 'E6': '4F', 'F1': 'D6', 'F5': '79', '45': '43'
    };

    function findProductById(prodId) {
        if (!prodId) return null;
        let rawId = decodeURIComponent(prodId).trim();
        if (LEGACY_PRODUCT_ALIASES[rawId.toUpperCase()]) {
            rawId = LEGACY_PRODUCT_ALIASES[rawId.toUpperCase()];
        }
        const searchClean = rawId.toLowerCase();
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
                        const pId = String(p.id != null ? p.id : '').trim().toLowerCase();
                        const pTitle = String(p.title != null ? p.title : '').trim().toLowerCase();
                        const normTitle = pTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                        const normId = pId.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                        const pSlug = (p.title || '').trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, '-').replace(/-+/g, '-').toLowerCase();
                        return pId === searchClean || pTitle === searchClean || pSlug === searchClean || normId === normSearch || normTitle === normSearch || (normSearch.length > 5 && normTitle.includes(normSearch));
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
        if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();

        let currentIndex = initialIndex;
        let scale = 1;
        let posX = 0;
        let posY = 0;
        let startDistance = 0;
        let startScale = 1;
        let startTouchX = 0;
        let startTouchY = 0;
        let isDragging = false;
        let lastTap = 0;

        // Crear el modal solo una vez y reutilizarlo
        let modal = document.getElementById('product-lightbox-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'product-lightbox-modal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                inset: 0;
                z-index: 99999;
                background: rgba(0,0,0,0.92);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                align-items: center;
                justify-content: center;
                overflow: hidden;
                touch-action: none;
                user-select: none;
            `;
            modal.innerHTML = `
                <div id="lb-viewport" style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <img id="lb-img" style="
                        max-width: min(92vw, 980px);
                        max-height: 86vh;
                        object-fit: contain;
                        border-radius: 6px;
                        cursor: zoom-in;
                        display: block;
                        user-select: none;
                        -webkit-user-drag: none;
                        transform-origin: center center;
                        transition: transform 0.15s ease-out;
                        will-change: transform;
                    " alt="Foto del producto" draggable="false">
                </div>

                <!-- Cerrar -->
                <button id="lb-close" type="button" title="Cerrar (Esc)" style="
                    position: fixed;
                    top: 18px; right: 18px;
                    background: rgba(255,255,255,0.16);
                    border: none;
                    color: #fff;
                    width: 42px; height: 42px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s, transform 0.15s;
                    z-index: 10;
                ">
                    <span class="material-symbols-outlined" style="font-size:24px;">close</span>
                </button>

                <!-- Sugerencia sutil de Zoom en móvil -->
                <div id="lb-hint" style="
                    position: fixed;
                    top: 22px; left: 50%; transform: translateX(-50%);
                    background: rgba(0,0,0,0.5);
                    color: rgba(255,255,255,0.85);
                    font-size: 0.72rem;
                    font-weight: 500;
                    padding: 4px 12px;
                    border-radius: 50px;
                    letter-spacing: 0.02em;
                    pointer-events: none;
                    z-index: 10;
                    display: flex; align-items: center; gap: 4px;
                ">
                    <span class="material-symbols-outlined" style="font-size: 14px;">pinch</span>
                    <span>Doble toque o pellizco para zoom</span>
                </div>

                <!-- Contador -->
                <span id="lb-counter" style="
                    position: fixed;
                    bottom: 22px; left: 50%; transform: translateX(-50%);
                    background: rgba(0,0,0,0.55);
                    color: rgba(255,255,255,0.9);
                    font-size: 0.78rem;
                    font-weight: 600;
                    padding: 4px 14px;
                    border-radius: 50px;
                    letter-spacing: 0.04em;
                    pointer-events: none;
                    z-index: 10;
                "></span>

                <!-- Flecha izquierda -->
                <button id="lb-prev" type="button" title="Anterior" style="
                    position: fixed;
                    left: 14px; top: 50%; transform: translateY(-50%);
                    background: rgba(255,255,255,0.12);
                    border: none; color: #fff;
                    width: 44px; height: 44px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s;
                    z-index: 10;
                ">
                    <span class="material-symbols-outlined" style="font-size:26px;">chevron_left</span>
                </button>

                <!-- Flecha derecha -->
                <button id="lb-next" type="button" title="Siguiente" style="
                    position: fixed;
                    right: 14px; top: 50%; transform: translateY(-50%);
                    background: rgba(255,255,255,0.12);
                    border: none; color: #fff;
                    width: 44px; height: 44px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s;
                    z-index: 10;
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

        function updateTransform(smooth = false) {
            imgEl.style.transition = smooth ? 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
            imgEl.style.transform = `translate3d(${posX}px, ${posY}px, 0px) scale(${scale})`;
            imgEl.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
        }

        function resetZoom(smooth = true) {
            scale = 1;
            posX = 0;
            posY = 0;
            updateTransform(smooth);
        }

        function showImage(index) {
            if (index < 0) index = images.length - 1;
            if (index >= images.length) index = 0;
            currentIndex = index;
            resetZoom(false);

            imgEl.src = images[currentIndex];
            imgEl.alt = productTitle || 'Foto del producto';
            const multi = images.length > 1;
            prevBtn.style.display = multi ? 'flex' : 'none';
            nextBtn.style.display = multi ? 'flex' : 'none';
            counterEl.style.display = multi ? 'block' : 'none';
            if (multi) counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
        }

        function closeLightbox() {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleKey);
            cleanupTouchEvents();
            if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
        }

        function handleKey(e) {
            if (e.key === 'Escape') closeLightbox();
            if (scale === 1) {
                if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
                if (e.key === 'ArrowRight') showImage(currentIndex + 1);
            }
        }

        // Doble clic / doble toque para alternar entre 1x y 2.5x
        function handleDoubleTap(clientX, clientY) {
            if (scale > 1) {
                resetZoom(true);
            } else {
                scale = 2.5;
                const rect = imgEl.getBoundingClientRect();
                const offsetX = (clientX - (rect.left + rect.width / 2)) * -1;
                const offsetY = (clientY - (rect.top + rect.height / 2)) * -1;
                posX = Math.max(-rect.width * 0.7, Math.min(rect.width * 0.7, offsetX));
                posY = Math.max(-rect.height * 0.7, Math.min(rect.height * 0.7, offsetY));
                updateTransform(true);
            }
        }

        // Pinch-to-zoom con 2 dedos y arrastre con 1 dedo cuando hay zoom
        function getDistance(t1, t2) {
            return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        }

        function onTouchStart(e) {
            if (e.touches.length === 2) {
                // Inicio de Pinch-to-Zoom
                isDragging = false;
                startDistance = getDistance(e.touches[0], e.touches[1]);
                startScale = scale;
            } else if (e.touches.length === 1) {
                // Chequear doble tap rápido
                const now = Date.now();
                if (now - lastTap < 300) {
                    handleDoubleTap(e.touches[0].clientX, e.touches[0].clientY);
                    lastTap = 0;
                    return;
                }
                lastTap = now;

                startTouchX = e.touches[0].clientX - posX;
                startTouchY = e.touches[0].clientY - posY;
                isDragging = true;
            }
        }

        function onTouchMove(e) {
            if (e.touches.length === 2 && startDistance > 0) {
                e.preventDefault();
                const dist = getDistance(e.touches[0], e.touches[1]);
                const newScale = startScale * (dist / startDistance);
                scale = Math.min(Math.max(newScale, 1), 4);
                updateTransform(false);
            } else if (e.touches.length === 1 && isDragging) {
                if (scale > 1) {
                    e.preventDefault();
                    posX = e.touches[0].clientX - startTouchX;
                    posY = e.touches[0].clientY - startTouchY;
                    updateTransform(false);
                }
            }
        }

        function onTouchEnd(e) {
            if (scale <= 1.05) {
                resetZoom(true);
                // Si fue swipe lateral en escala normal, cambiar de imagen
                if (e.changedTouches.length === 1 && isDragging) {
                    const dx = e.changedTouches[0].clientX - (startTouchX + posX);
                    if (Math.abs(dx) > 55) {
                        dx < 0 ? showImage(currentIndex + 1) : showImage(currentIndex - 1);
                    }
                }
            }
            if (e.touches.length === 0) {
                isDragging = false;
            }
        }

        // Eventos táctiles y de mouse
        function bindTouchEvents() {
            modal.addEventListener('touchstart', onTouchStart, { passive: false });
            modal.addEventListener('touchmove', onTouchMove, { passive: false });
            modal.addEventListener('touchend', onTouchEnd, { passive: false });
        }

        function cleanupTouchEvents() {
            modal.removeEventListener('touchstart', onTouchStart);
            modal.removeEventListener('touchmove', onTouchMove);
            modal.removeEventListener('touchend', onTouchEnd);
        }

        // Zoom en PC con rueda del mouse
        modal.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY * -0.005;
            scale = Math.min(Math.max(scale + delta, 1), 4);
            if (scale <= 1) {
                resetZoom(true);
            } else {
                updateTransform(false);
            }
        };

        imgEl.ondblclick = (e) => {
            e.stopPropagation();
            handleDoubleTap(e.clientX, e.clientY);
        };

        closeBtn.onclick = (e) => { e.stopPropagation(); closeLightbox(); };
        prevBtn.onclick  = (e) => { e.stopPropagation(); showImage(currentIndex - 1); };
        nextBtn.onclick  = (e) => { e.stopPropagation(); showImage(currentIndex + 1); };
        modal.onclick    = (e) => { if (e.target === modal || e.target.id === 'lb-viewport') closeLightbox(); };

        document.addEventListener('keydown', handleKey);
        bindTouchEvents();

        [closeBtn, prevBtn, nextBtn].forEach(btn => {
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.28)';
            btn.onmouseleave = () => btn.style.background = 'rgba(255,255,255,0.12)';
        });

        showImage(initialIndex);
        modal.style.display = 'flex';
    }

    function getProductTimestamp(product) {
        if (!product) return 0;
        if (product.last_modified) {
            const ts = Number(product.last_modified);
            if (!isNaN(ts)) return ts;
        }

        let maxTimestamp = 0;
        const checkPath = (path) => {
            if (path && typeof path === 'string') {
                const match = path.match(/(\d{13})/);
                if (match) {
                    const ts = parseInt(match[1]);
                    if (ts > 1577836800000 && ts < 4102444800000) {
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
        const btnBuyShipping = document.getElementById('btn-buy-shipping');
        const btnBuyPickup = document.getElementById('btn-buy-pickup');
        if (btnBuyShipping) btnBuyShipping.href = linkMercadoLibre || '#';
        const waUrl = window.siteConfig?.socialLinks?.whatsapp || 'https://wa.me/5491167007723';
        const phone = waUrl.replace('https://wa.me/', '');
        const text = encodeURIComponent(whatsappMessage);
        if (btnBuyPickup) btnBuyPickup.href = `https://wa.me/${phone}?text=${text}`;
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
            try {
                localStorage.setItem('sessionProductsAutonomo', JSON.stringify(window.sessionProducts));
                console.log('Productos guardados en localStorage como respaldo.');
            } catch (lsError) {
                console.error('No se pudo guardar el respaldo en localStorage', lsError);
            }
        }
    }

    // Exponer en window para retrocompatibilidad total
    window.findProductById = findProductById;
    window.openProductLightbox = openProductLightbox;
    window.getProductTimestamp = getProductTimestamp;
    window.getLatestModificationYear = getLatestModificationYear;
    window.updateActionLinks = updateActionLinks;
    window.updateMetaTags = updateMetaTags;
    window.saveProductsToServer = saveProductsToServer;
})();
