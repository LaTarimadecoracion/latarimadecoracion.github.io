// js/ui/catalog/catalog-utils.js
// --- UTILIDADES DEL CATÁLOGO & SEO & LIGHTBOX ---
// Extraído de ui-catalog.js para modularización limpia.

(function() {
    'use strict';

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
                        const pId = String(p.id != null ? p.id : '').trim().toLowerCase();
                        const pTitle = String(p.title != null ? p.title : '').trim().toLowerCase();
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

        function handleKey(e) {
            if (e.key === 'Escape')      closeLightbox();
            if (e.key === 'ArrowLeft')   showImage(currentIndex - 1);
            if (e.key === 'ArrowRight')  showImage(currentIndex + 1);
        }

        let touchStartX = 0;
        function onTouchStart(e) { touchStartX = e.touches[0].clientX; }
        function onTouchEnd(e) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 50) dx < 0 ? showImage(currentIndex + 1) : showImage(currentIndex - 1);
        }

        closeBtn.onclick  = (e) => { e.stopPropagation(); closeLightbox(); };
        prevBtn.onclick   = (e) => { e.stopPropagation(); showImage(currentIndex - 1); };
        nextBtn.onclick   = (e) => { e.stopPropagation(); showImage(currentIndex + 1); };
        imgEl.onclick     = (e) => { e.stopPropagation(); };
        modal.onclick     = (e) => { if (e.target === modal) closeLightbox(); };

        document.addEventListener('keydown', handleKey);
        modal.addEventListener('touchstart', onTouchStart, { passive: true });
        modal.addEventListener('touchend', onTouchEnd, { passive: true });

        [closeBtn, prevBtn, nextBtn].forEach(btn => {
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.22)';
            btn.onmouseleave = () => btn.style.background = 'rgba(255,255,255,0.1)';
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
