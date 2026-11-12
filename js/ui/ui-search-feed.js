// js/ui/ui-search-feed.js
// --- CLIENT SEARCH, CATEGORY FEED & FEED PRODUCT CARDS ---
(function() {
    // ── Clonar Categoría ──

    function getIndexedProducts() {
        if (typeof window.getNormalizedCatalogProducts === 'function') {
            return window.getNormalizedCatalogProducts();
        }
        return [];
    }

    // Registrar clicks de búsqueda para rankear acabados en "Más Buscados"
    window.trackSearchClick = function(productId, acabado) {
        try {
            const rankingRaw = localStorage.getItem('searchPopularityRanking') || '{}';
            const ranking = JSON.parse(rankingRaw);
            
            // Incrementar popularidad del producto base
            ranking[productId] = (ranking[productId] || 0) + 1;
            
            // Incrementar popularidad del acabado específico si aplica
            if (acabado) {
                const key = `${productId}::${acabado}`;
                ranking[key] = (ranking[key] || 0) + 1;
            }
            
            localStorage.setItem('searchPopularityRanking', JSON.stringify(ranking));
            console.log(`[Search Tracking] Click registrado. Prod: ${productId}, Acabado: ${acabado || 'Ninguno'}`);
        } catch (e) {
            console.error('[Search Tracking] Error al guardar popularidad:', e);
        }
    };

    // 6. Search View — Real-time search
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchEmptyState = document.getElementById('search-empty-state');

    const normalizeForSearch = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    // Fonetización en español para tolerar tipeo informal/errores (c/k/q, z/s, b/v, y/ll, h muda)
    const phoneticNormalize = (str) => {
        if (!str || typeof str !== 'string') return '';
        let s = normalizeForSearch(str);
        s = s.replace(/qu/g, 'k').replace(/q/g, 'k')
             .replace(/c(?=[eiy])/g, 's').replace(/c(?=[aou])/g, 'k').replace(/c$/g, 'k')
             .replace(/z/g, 's')
             .replace(/v/g, 'b')
             .replace(/h/g, '')
             .replace(/y(?=[aeiou])/g, 'll')
             .replace(/([a-z])\1+/g, '$1');
        return s;
    };

    // Stemming morfológico en español para unificar singular/plural y diminutivos de compra sin cortar raíces
    const stemWord = (word) => {
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

    const tokenizeWords = (str) => {
        if (!str || typeof str !== 'string') return [];
        return normalizeForSearch(str)
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 2);
    };

    const matchTermInWords = (term, words, allowFuzzy = false) => {
        const termStem = stemWord(term);
        const termPhon = phoneticNormalize(term);
        const termPhonStem = stemWord(termPhon);

        for (const word of words) {
            if (word === term) return 100;

            const wStem = stemWord(word);
            if (wStem.length >= 3 && termStem.length >= 3) {
                if (wStem === termStem) return 95;
                if (word.startsWith(term) && term.length >= 3) return 85;
                if (wStem.startsWith(termStem) && termStem.length >= 4) return 85;
            } else if (word.startsWith(term) && term.length >= 2) {
                return 80;
            }

            if (allowFuzzy && term.length >= 4 && word.length >= 4) {
                const wPhon = phoneticNormalize(word);
                const wPhonStem = stemWord(wPhon);
                if (wPhon === termPhon || (wPhonStem.length >= 3 && wPhonStem === termPhonStem)) return 75;
                if (Math.abs(term.length - word.length) <= 2) {
                    if (getSimilarityRatio(term, word) >= 0.82) return 70;
                    if (getSimilarityRatio(termPhon, wPhon) >= 0.85) return 68;
                }
            }
        }
        return 0;
    };

    // Levenshtein distance string similarity ratio
    const getSimilarityRatio = (str1, str2) => {
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        if (s1 === s2) return 1.0;
        if (s1.length === 0 || s2.length === 0) return 0.0;
        
        const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
        for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
        for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
        
        for (let j = 1; j <= s2.length; j += 1) {
            for (let i = 1; i <= s1.length; i += 1) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j - 1][i] + 1, // deletion
                    track[j][i - 1] + 1, // insertion
                    track[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        
        const distance = track[s2.length][s1.length];
        const maxLength = Math.max(s1.length, s2.length);
        return (maxLength - distance) / maxLength;
    };

    // Filters out conversational stop words and Spanish punctuation to enable conversational searches
    const getCleanSearchTerms = (text) => {
        const stopWords = new Set([
            "necesito", "quiero", "busco", "comprar", "tenes", "tienen", "hola", "por", "favor", 
            "gracias", "para", "de", "con", "un", "una", "unos", "unas", "el", "la", "los", "las",
            "y", "o", "en", "al", "del", "lo"
        ]);
        const clean = normalizeForSearch(text)
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
            .split(/\s+/)
            .filter(word => word.length > 1 && !stopWords.has(word));
        return clean;
    };

    // Estado del rubro activo en la vista de búsqueda
    window.activeSearchRubro = 'carpinteria';

    function renderSearchRubrosTabs() {
        const container = document.getElementById('search-rubros-tabs-container');
        if (!container) return;

        const rubrosList = (window.siteConfig && window.siteConfig.rubros) || [
            { id: "carpinteria", name: "Carpintería", icon: "🪵" }
        ];

        // Solo mostrar rubros visibles
        const visibleRubros = rubrosList.filter(r => r.visible !== false);

        if (visibleRubros.length <= 1) {
            container.classList.add('single-rubro');
            container.innerHTML = '';
            // Si solo hay uno, asegurar que sea el activo para el filtrado lógico
            if (visibleRubros.length === 1) {
                window.activeSearchRubro = visibleRubros[0].id;
            }
            return;
        } else {
            container.classList.remove('single-rubro');
        }

        container.innerHTML = '';
        visibleRubros.forEach(r => {
            const isActive = r.id === window.activeSearchRubro;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = isActive ? 'rubros-tab active' : 'rubros-tab';
            
            // Forzar ancho geométrico exacto por JS inline
            const pct = (100 / visibleRubros.length).toFixed(4);
            btn.style.width = pct + '%';
            btn.style.flex = `0 0 ${pct}%`;

            btn.innerHTML = r.name;
            btn.addEventListener('click', () => {
                window.activeSearchRubro = r.id;
                renderSearchRubrosTabs();
                runSearch();
            });
            container.appendChild(btn);
        });
    }

    
    // Helper Central: Formateador de Precio y Helper de Rango de Precios
    const feedCurrencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

    function getProductPriceDisplay(product, specificAcabadoName = null) {
        if (!product) return '<span class="feed-card-price-custom">Consultar precio</span>';
        
        let allPrices = [];
        let allComparePrices = [];
        
        const collectPrices = (m) => {
            if (m && m.hidden !== true && m.showPrice !== false && m.price !== undefined && m.price !== '' && !isNaN(parseFloat(m.price))) {
                const p = parseFloat(m.price);
                allPrices.push(p);
                const cp = parseFloat(m.comparePrice || m.originalPrice || m.precioAnterior || 0);
                if (!isNaN(cp) && cp > p) allComparePrices.push(cp);
            }
        };

        // Si hay un acabado específico seleccionado
        if (specificAcabadoName && product.acabados_groups && Array.isArray(product.acabados_groups)) {
            const grp = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === specificAcabadoName.trim().toLowerCase());
            if (grp && grp.medidas_variants) {
                grp.medidas_variants.forEach(collectPrices);
            }
        }
        
        // Si no se encontraron o es general para toda la tarjeta de categoría
        if (allPrices.length === 0) {
            if (product.acabados_groups && Array.isArray(product.acabados_groups)) {
                product.acabados_groups.forEach(g => {
                    if (g && g.hidden !== true && g.medidas_variants) {
                        g.medidas_variants.forEach(collectPrices);
                    }
                });
            }
            if (product.medidas_variants && Array.isArray(product.medidas_variants)) {
                product.medidas_variants.forEach(collectPrices);
            }
        }

        if (allPrices.length === 0) {
            return '<span class="feed-card-price-custom">Consultar precio</span>';
        }

        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);

        let oldPriceHtml = '';
        if (allComparePrices.length > 0) {
            const maxCompare = Math.max(...allComparePrices);
            if (maxCompare > minPrice) {
                oldPriceHtml = `<span class="feed-card-price-old">${feedCurrencyFormatter.format(maxCompare)}</span>`;
            }
        } else if (product.comparePrice && Number(product.comparePrice) > minPrice) {
            oldPriceHtml = `<span class="feed-card-price-old">${feedCurrencyFormatter.format(Number(product.comparePrice))}</span>`;
        } else if (product.originalPrice && Number(product.originalPrice) > minPrice) {
            oldPriceHtml = `<span class="feed-card-price-old">${feedCurrencyFormatter.format(Number(product.originalPrice))}</span>`;
        }

        if (minPrice === maxPrice) {
            return `${oldPriceHtml}<span class="feed-card-price-current">${feedCurrencyFormatter.format(minPrice)}</span>`;
        } else {
            return `${oldPriceHtml}<span class="feed-card-price-prefix">Desde</span><span class="feed-card-price-current">${feedCurrencyFormatter.format(minPrice)}</span>`;
        }
    }

    // Helper: Evaluar información de Envío Gratis del producto
    function getProductFreeShippingInfo(product) {
        if (!product) return null;
        const shipConf = product.shippingConfig || {};

        // 1. Envío gratis directo
        const isDirect = !!(
            shipConf.isFreeShipping === true ||
            product.isFreeShipping === true ||
            product.shippingType === 'free' ||
            shipConf.isFree === true
        );
        if (isDirect) {
            return { isFree: true, label: 'Envío Gratis', badgeText: 'Envío Gratis', type: 'direct' };
        }

        // Variantes con envío gratis directo
        if (Array.isArray(product.variants) && product.variants.some(v => v.shippingConfig?.isFreeShipping || v.isFreeShipping)) {
            return { isFree: true, label: 'Envío Gratis', badgeText: 'Envío Gratis', type: 'direct' };
        }
        if (Array.isArray(product.acabados_groups)) {
            for (const g of product.acabados_groups) {
                if (Array.isArray(g.medidas_variants) && g.medidas_variants.some(m => m.shippingConfig?.isFreeShipping || m.isFreeShipping)) {
                    return { isFree: true, label: 'Envío Gratis', badgeText: 'Envío Gratis', type: 'direct' };
                }
            }
        }

        // 2. Envío gratis por cantidad
        if (Array.isArray(product.quantityDiscounts)) {
            const freeTier = product.quantityDiscounts.find(d => Number(d.shippingDiscountPercent) >= 100 && Number(d.minUnits) > 0);
            if (freeTier) {
                return {
                    isFree: true,
                    label: `Envío Gratis desde ${freeTier.minUnits} u.`,
                    badgeText: `Envío Gratis +${freeTier.minUnits}u`,
                    type: 'volume',
                    minUnits: freeTier.minUnits
                };
            }
        }
        const logMin = parseInt(shipConf.logisticaFreeMinUnits) || parseInt(product.logisticaFreeMinUnits) || 0;
        if (logMin > 0) {
            return { isFree: true, label: `Envío Gratis desde ${logMin} u.`, badgeText: `Envío Gratis +${logMin}u`, type: 'volume', minUnits: logMin };
        }
        const fleteMin = parseInt(shipConf.fleteFreeMinUnits) || parseInt(product.fleteFreeMinUnits) || 0;
        if (fleteMin > 0) {
            return { isFree: true, label: `Envío Gratis desde ${fleteMin} u.`, badgeText: `Envío Gratis +${fleteMin}u`, type: 'volume', minUnits: fleteMin };
        }

        return null;
    }

    // Helper: Evaluar información de Descuento en el precio del producto
    function getProductDiscountInfo(product, specificAcabadoName = null) {
        if (!product) return null;

        // 1. Descuento porcentual directo en el producto
        const directPercent = Number(product.discountPercent || product.descuento || 0);
        if (directPercent > 0) {
            return { type: 'percent', percent: directPercent, label: `${directPercent}% OFF`, badgeText: `${directPercent}% OFF` };
        }

        // 2. Comparación de precio tachado
        let maxCompare = 0;
        let minNormal = Infinity;
        const checkVariant = (m) => {
            if (!m || m.hidden === true || m.showPrice === false) return;
            const p = parseFloat(m.price);
            const cp = parseFloat(m.comparePrice || m.originalPrice || m.precioAnterior || 0);
            if (!isNaN(p) && p > 0) {
                if (p < minNormal) minNormal = p;
                if (!isNaN(cp) && cp > p && cp > maxCompare) maxCompare = cp;
            }
        };
        if (product.acabados_groups && Array.isArray(product.acabados_groups)) {
            product.acabados_groups.forEach(g => {
                if (g && Array.isArray(g.medidas_variants)) g.medidas_variants.forEach(checkVariant);
            });
        }
        if (product.medidas_variants && Array.isArray(product.medidas_variants)) {
            product.medidas_variants.forEach(checkVariant);
        }
        if (product.comparePrice && Number(product.comparePrice) > maxCompare) maxCompare = Number(product.comparePrice);
        if (product.originalPrice && Number(product.originalPrice) > maxCompare) maxCompare = Number(product.originalPrice);

        if (maxCompare > minNormal && isFinite(minNormal)) {
            const pct = Math.round(((maxCompare - minNormal) / maxCompare) * 100);
            return {
                type: 'compare',
                oldPrice: maxCompare,
                currentPrice: minNormal,
                percent: pct > 0 ? pct : null,
                label: pct > 0 ? `${pct}% OFF` : 'OFERTA',
                badgeText: pct > 0 ? `${pct}% OFF` : 'OFERTA'
            };
        }

        // 3. Descuentos por volumen / cantidad
        if (Array.isArray(product.quantityDiscounts) && product.quantityDiscounts.length > 0) {
            const tiers = product.quantityDiscounts.filter(d => Number(d.discountPercent) > 0 && Number(d.minUnits) > 0);
            if (tiers.length > 0) {
                const firstTier = tiers[0];
                return {
                    type: 'volume',
                    percent: firstTier.discountPercent,
                    minUnits: firstTier.minUnits,
                    label: `${firstTier.discountPercent}% OFF desde ${firstTier.minUnits} u.`,
                    badgeText: `${firstTier.discountPercent}% OFF x cant.`
                };
            }
        }

        return null;
    }

    // Helper para verificar si un producto o variante está en el carrito
    function checkProductCartStatus(productId, acabadoName = '') {
        try {
            const raw = localStorage.getItem('cartItems');
            if (!raw) return false;
            const items = JSON.parse(raw);
            return items.some(item => 
                String(item.id) === String(productId) &&
                (!acabadoName || (item.acabado || '').trim().toLowerCase() === acabadoName.trim().toLowerCase())
            );
        } catch(e) { return false; }
    }

    // Helper para verificar si está en favoritos
    
    // Helper de Compartir Producto desde Feed
    
    // Helper Central Reutilizable: Crea una tarjeta feed-card completa e interactiva con el nuevo diseño
    function createFeedProductCard(product, options = {}) {
        const catName = options.catName || '';
        const acabado = options.acabado || (product.acabados_groups && product.acabados_groups[0]?.acabado_name) || '';
        const imageOverride = options.imageOverride || null;
        const extraClass = options.extraClass || '';

        const card = document.createElement('div');
        card.className = ('feed-card ' + extraClass).trim();
        
        const isFav = checkProductFavStatus(product.id, acabado);
        const inCart = checkProductCartStatus(product.id, acabado);
        const priceHtml = getProductPriceDisplay(product, acabado);
        const rawCoverImg = imageOverride || (Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png'));
        const coverImg = window.getThumbUrl ? window.getThumbUrl(rawCoverImg) : rawCoverImg;

        // Badges flotantes superiores izquierdos (Acabados, Envío Gratis, Descuento)
        const variantsCount = (product.acabados_groups && product.acabados_groups.length) || 0;
        const badgesList = [];

        // 1. Badge de acabados (Limpio, sin icono confuso de paleta / signo de interrogación)
        if (variantsCount > 1) {
            badgesList.push(`<div class="feed-card-floating-badge" title="${variantsCount} acabados disponibles">
                <span>${variantsCount} acabados</span>
            </div>`);
        } else if (acabado && acabado.toLowerCase() !== 'único' && acabado.toLowerCase() !== 'unico' && acabado.toLowerCase() !== 'estándar') {
            badgesList.push(`<div class="feed-card-floating-badge" title="Acabado: ${acabado}">
                <span>${acabado}</span>
            </div>`);
        }

        // 2. Badge de Envío Gratis
        const freeShipInfo = getProductFreeShippingInfo(product);
        if (freeShipInfo) {
            badgesList.push(`<div class="feed-card-floating-badge badge-free-shipping" title="${freeShipInfo.label}">
                <span class="material-symbols-outlined" style="font-size: 13px;">local_shipping</span>
                <span>${freeShipInfo.badgeText}</span>
            </div>`);
        }

        // 3. Badge de Descuento
        const discountInfo = getProductDiscountInfo(product, acabado);
        if (discountInfo) {
            badgesList.push(`<div class="feed-card-floating-badge badge-discount" title="${discountInfo.label}">
                <span class="material-symbols-outlined" style="font-size: 13px;">local_offer</span>
                <span>${discountInfo.badgeText}</span>
            </div>`);
        }

        const badgesHtml = badgesList.length > 0
            ? `<div class="feed-card-floating-badges-col">${badgesList.join('')}</div>`
            : '';

        const safeTitle = (product.title || '').replace(/"/g, '&quot;');

        card.innerHTML = `
            <div class="feed-card-photo-container">
                <img src="${coverImg}" class="feed-card-img lazy-img" alt="${safeTitle}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded'); if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                ${badgesHtml}
                <!-- Botones Flotantes: 1. Corazón, 2. Carrito, 3. Compartir -->
                <div class="feed-card-actions-float">
                    <button type="button" class="feed-action-btn btn-feed-fav ${isFav ? 'is-fav' : ''}" title="${isFav ? 'Guardado en favoritos' : 'Guardar en favoritos'}">
                        <span class="material-symbols-outlined" style="font-size: 18px;">${isFav ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <button type="button" class="feed-action-btn btn-feed-cart ${inCart ? 'in-cart' : ''}" title="${inCart ? 'Ya está en el carrito' : 'Agregar al carrito'}">
                        <span class="material-symbols-outlined" style="font-size: 18px;">${inCart ? 'shopping_bag' : 'add_shopping_cart'}</span>
                    </button>
                    <button type="button" class="feed-action-btn btn-feed-share" title="Compartir producto">
                        <span class="material-symbols-outlined" style="font-size: 18px;">share</span>
                    </button>
                </div>
            </div>
            <div class="feed-card-info">
                <div class="feed-card-title-container">
                    <h3 class="feed-card-title" title="${safeTitle}">${product.title}</h3>
                </div>
                <div class="feed-card-price-row">
                    ${priceHtml}
                </div>
                ${(freeShipInfo || discountInfo) ? `
                <div class="feed-card-promo-line">
                    ${freeShipInfo ? `
                        <span class="feed-card-promo-free-shipping" title="${freeShipInfo.label}">
                            <span class="material-symbols-outlined" style="font-size: 13px;">local_shipping</span>
                            <span>${freeShipInfo.label}</span>
                        </span>
                    ` : ''}
                    ${(!freeShipInfo && discountInfo) ? `
                        <span class="feed-card-promo-discount" title="${discountInfo.label}">
                            ${discountInfo.label}
                        </span>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        `;

        // Marquee al desbordar
        setTimeout(() => {
            const titleEl = card.querySelector('.feed-card-title');
            if (titleEl && titleEl.scrollWidth > titleEl.clientWidth + 2) {
                titleEl.classList.add('has-overflow');
            }
        }, 80);

        // Soporte táctil en mobile
        let touchTimer = null;
        card.addEventListener('touchstart', () => {
            touchTimer = setTimeout(() => card.classList.add('is-active-marquee'), 250);
        }, { passive: true });
        card.addEventListener('touchend', () => {
            clearTimeout(touchTimer);
            setTimeout(() => card.classList.remove('is-active-marquee'), 2000);
        }, { passive: true });

        // Click en Corazón
        const favBtn = card.querySelector('.btn-feed-fav');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.CarritoModule && window.CarritoModule.toggle) {
                    window.CarritoModule.toggle(product, acabado || 'Único', catName || '');
                    const isNowFav = checkProductFavStatus(product.id, acabado);
                    favBtn.classList.toggle('is-fav', isNowFav);
                    favBtn.querySelector('.material-symbols-outlined').textContent = isNowFav ? 'favorite' : 'favorite_border';
                    const cartBtn = card.querySelector('.btn-feed-cart');
                    if (cartBtn) {
                        cartBtn.classList.toggle('in-cart', isNowFav);
                        cartBtn.querySelector('.material-symbols-outlined').textContent = isNowFav ? 'shopping_bag' : 'add_shopping_cart';
                    }
                }
            });
        }

        // Click en Carrito
        const cartBtn = card.querySelector('.btn-feed-cart');
        if (cartBtn) {
            cartBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.CarritoModule && window.CarritoModule.toggle) {
                    window.CarritoModule.toggle(product, acabado || 'Único', catName || '');
                    const isNowCart = checkProductCartStatus(product.id, acabado);
                    cartBtn.classList.toggle('in-cart', isNowCart);
                    cartBtn.querySelector('.material-symbols-outlined').textContent = isNowCart ? 'shopping_bag' : 'add_shopping_cart';
                    if (favBtn) {
                        favBtn.classList.toggle('is-fav', isNowCart);
                        favBtn.querySelector('.material-symbols-outlined').textContent = isNowCart ? 'favorite' : 'favorite_border';
                    }
                }
            });
        }

        // Click en Compartir
        const shareBtn = card.querySelector('.btn-feed-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleShareProduct(product, acabado || '');
            });
        }

        // Click en Tarjeta
        card.addEventListener('click', () => {
            if (window.trackSearchClick) window.trackSearchClick(product.id, acabado);
            if (window.showProductDetail) {
                window.showProductDetail(product, catName || '', acabado || '');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                const appContainer = document.getElementById('app-container');
                if (appContainer) appContainer.scrollTop = 0;
            }
        });

        return card;
    }

    function handleShareProduct(product, acabadoName = '') {
        try {
            const origin = window.location.origin;
            const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
            let shareUrl = `${origin}${path}/?prod=${encodeURIComponent(product.id)}`;
            
            if (acabadoName) {
                shareUrl += `&acabado=${encodeURIComponent(acabadoName)}`;
            }

            // Si hay acortador disponible para ficha técnica corta
            if (window.TarimaShortener && typeof window.TarimaShortener.encodeShortCode === 'function') {
                const shortCode = window.TarimaShortener.encodeShortCode(product.id, acabadoName, '', '', false);
                if (shortCode) {
                    shareUrl = `${origin}${path}/p/${shortCode}.html`;
                }
            }

            const title = product.title + (acabadoName ? ` (${acabadoName})` : '');
            const shareText = `🪵 ¡Mirá este mueble en La Tarima!: ${title}`;

            const showToast = (msg) => {
                const toast = document.getElementById('admin-toast');
                if (toast) {
                    toast.textContent = msg;
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 2200);
                } else {
                    alert(msg);
                }
            };

            if (navigator.share) {
                navigator.share({
                    title: title,
                    text: shareText,
                    url: shareUrl
                }).catch(err => {
                    if (err && err.name !== 'AbortError') {
                        copyToClipboard(`${shareText} ${shareUrl}`, showToast);
                    }
                });
            } else {
                copyToClipboard(shareUrl, showToast);
            }
        } catch(e) {
            console.error('Error sharing product:', e);
        }
    }

    function copyToClipboard(text, callback) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => callback("🔗 ¡Enlace del producto copiado!"));
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            callback("🔗 ¡Enlace del producto copiado!");
        }
    }

    function checkProductFavStatus(productId, acabadoName = '') {
        return checkProductCartStatus(productId, acabadoName);
    }

    
    // ══════════════════════════════════════════════════════════════════════════
    // 🔍 Desplegable de Últimas 3 Búsquedas estilo Mercado Libre (en el mismo buscador)
    // ══════════════════════════════════════════════════════════════════════════
    const SEARCH_HISTORY_KEY = 'tarima_recent_searches';

    function getSearchHistory() {
        try {
            const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.slice(0, 3) : [];
        } catch(e) { return []; }
    }

    function saveSearchTerm(term) {
        if (!term || typeof term !== 'string') return;
        const clean = term.trim();
        if (clean.length < 2) return;
        try {
            let history = getSearchHistory();
            history = history.filter(item => item.toLowerCase() !== clean.toLowerCase());
            history.unshift(clean);
            if (history.length > 3) history = history.slice(0, 3);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
        } catch(e) {}
    }

    function removeSearchHistoryItem(termToRemove) {
        try {
            let history = getSearchHistory();
            history = history.filter(item => item.toLowerCase() !== termToRemove.toLowerCase());
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
            renderRecentSearchesDropdown();
        } catch(e) {}
    }

    function hideRecentSearchesDropdown() {
        const dropdown = document.getElementById('search-recent-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }

    function renderRecentSearchesDropdown() {
        const dropdown = document.getElementById('search-recent-dropdown');
        if (!dropdown || !searchInput) return;

        const currentVal = searchInput.value.trim();
        const history = getSearchHistory();

        // Solo mostrar cuando el buscador está enfocado, vacío y hay búsquedas recientes (hasta 3)
        if (currentVal.length > 0 || history.length === 0 || document.activeElement !== searchInput) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = '';
        history.slice(0, 3).forEach(term => {
            const row = document.createElement('div');
            row.className = 'search-recent-item';
            row.innerHTML = `
                <div class="search-recent-item-left">
                    <span class="material-symbols-outlined search-recent-icon">schedule</span>
                    <span class="search-recent-text"></span>
                </div>
                <span class="material-symbols-outlined search-recent-remove" title="Quitar del historial" role="button" aria-label="Quitar">close</span>
            `;
            row.querySelector('.search-recent-text').textContent = term;

            // Usar mousedown para que ejecute antes de que el input pierda foco
            row.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (e.target.closest('.search-recent-remove')) {
                    removeSearchHistoryItem(term);
                    return;
                }
                searchInput.value = term;
                if (btnClearSearch) btnClearSearch.style.display = 'flex';
                hideRecentSearchesDropdown();
                saveSearchTerm(term);
                window.runSearch();
            });

            dropdown.appendChild(row);
        });

        dropdown.style.display = 'block';
    }

    window.showRecentSearchesDropdown = renderRecentSearchesDropdown;
    window.hideRecentSearchesDropdown = hideRecentSearchesDropdown;

    function runSearch() {
        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
        if (!searchResultsContainer || typeof sourceData === 'undefined') return;
        
        // Dibujar los tabs del buscador si no se han dibujado
        renderSearchRubrosTabs();

        const rawQuery = searchInput ? searchInput.value : '';
        const query = normalizeForSearch(rawQuery).trim();

        // 🔍 Detector Inteligente de Número de Orden / Seguimiento de Pedidos
        const cleanDigits = rawQuery.replace(/[^0-9]/g, '').trim();
        if (cleanDigits.length >= 6) {
            const allOrders = (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) ? ordersData : [];
            const matchedOrder = allOrders.find(o => String(o.id).trim() === cleanDigits);
            if (matchedOrder) {
                if (window.navigateToView) {
                    window.navigateToView('view-pedidos', { orderId: matchedOrder.id });
                }
                return;
            }
        }

        const activeView = document.querySelector('.view.active');
        if (activeView && activeView.id === 'view-catalogo') {
            if (window.CatalogNative && typeof window.CatalogNative.filter === 'function') {
                window.CatalogNative.filter(rawQuery);
                return;
            }
            const iframe = document.querySelector('#view-catalogo iframe');
            if (iframe && iframe.contentWindow && iframe.contentWindow.filterCatalogAZ) {
                iframe.contentWindow.filterCatalogAZ(query);
            }
            return;
        } else if (activeView && activeView.id === 'view-mayorista') {
            const iframe = document.querySelector('#view-mayorista iframe');
            if (iframe && iframe.contentWindow && iframe.contentWindow.filterWholesaleCatalog) {
                iframe.contentWindow.filterWholesaleCatalog(query);
            }
            return;
        }

        const indexed = getIndexedProducts();
        
        // 1. Filtrar por rubro del producto
        const rubroFiltered = indexed.filter(item => {
            const itemRubro = item.cat ? (item.cat.rubro || 'carpinteria') : 'carpinteria';
            return itemRubro === window.activeSearchRubro;
        });

        // Dividir la consulta en términos limpios (ej: "necesito mesa y baranda" -> ["mesa", "baranda"])
        const queryTerms = getCleanSearchTerms(rawQuery);
        
        if (queryTerms.length === 0 && rawQuery.trim() !== '') {
            searchResultsContainer.innerHTML = '';
            if (searchEmptyState) searchEmptyState.style.display = 'flex';
            return;
        }

        // Evaluación por niveles de relevancia (Tiers) para evitar que tags secundarios o descripciones contaminen búsquedas específicas
        const evaluateItemForTerm = (item, term) => {
            const titleWords = tokenizeWords(item.nombre || '');
            const catWords = tokenizeWords(item.cat && item.cat.name ? item.cat.name : '');
            const acabadoWords = tokenizeWords(item.acabado || '');

            // Nivel 1: Coincidencia directa o morfológica en el Título del producto
            const titleExact = matchTermInWords(term, titleWords, false);
            if (titleExact > 0) return { tier: 1, score: titleExact + 200 };

            // Nivel 1B: Coincidencia en Medidas (si contiene números) o Acabado específico
            if (/\d/.test(term) && Array.isArray(item.medidas)) {
                const normTermNoSpaces = term.replace(/[\s\-\_cmx]/g, '');
                const hasMedida = item.medidas.some(medida => {
                    const normMedida = normalizeForSearch(medida);
                    if (normMedida.includes(term)) return true;
                    const normMedidaClean = normMedida.replace(/[\s\-\_cmx]/g, '');
                    return normTermNoSpaces.length >= 2 && normMedidaClean.includes(normTermNoSpaces);
                });
                if (hasMedida) return { tier: 1, score: 250 };
            }
            const acabExact = matchTermInWords(term, acabadoWords, false);
            if (acabExact > 0) return { tier: 1, score: acabExact + 180 };

            // Nivel 2: Coincidencia exacta/morfológica en el Nombre de Categoría
            const catExact = matchTermInWords(term, catWords, false);
            if (catExact > 0) return { tier: 2, score: catExact + 100 };

            // Nivel 3: Tolerancia a errores de tipeo (fonética / Levenshtein estricto) en Título o Categoría
            const titleFuzzy = matchTermInWords(term, titleWords, true);
            if (titleFuzzy > 0) return { tier: 3, score: titleFuzzy + 50 }; const acabFuzzy = matchTermInWords(term, acabadoWords, true); if (acabFuzzy > 0) return { tier: 3, score: acabFuzzy + 45 };
            const catFuzzy = matchTermInWords(term, catWords, true);
            if (catFuzzy > 0) return { tier: 3, score: catFuzzy + 40 };

            // Nivel 4: Coincidencia en Tags (tokenizados por palabra, solo actúa como respaldo si no hay Nivel 1..3)
            const tagWords = [];
            if (Array.isArray(item.tags)) {
                item.tags.forEach(t => tagWords.push(...tokenizeWords(t)));
            }
            const tagMatch = matchTermInWords(term, tagWords, false);
            if (tagMatch > 0) return { tier: 4, score: tagMatch };

            // Nivel 5: Coincidencia exacta/raíz en Descripción (último respaldo)
            const descText = (item.product && item.product.description) || item.description || '';
            const descWords = tokenizeWords(descText).filter(w => w.length >= 4);
            const descMatch = matchTermInWords(term, descWords, false);
            if (descMatch >= 95) return { tier: 5, score: 30 };

            return null;
        };

        let results = [];

        if (queryTerms.length === 0) {
            results = [...rubroFiltered];
            results.sort((a, b) => {
                const nameA = (a.nombre || '').toLowerCase();
                const nameB = (b.nombre || '').toLowerCase();
                return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
            });
        } else {
            // Evaluar cada producto con lógica AND primero
            let scoredItems = [];
            rubroFiltered.forEach(item => {
                const termEvals = queryTerms.map(t => evaluateItemForTerm(item, t));
                if (termEvals.every(Boolean)) {
                    const worstTier = Math.max(...termEvals.map(e => e.tier));
                    const totalScore = termEvals.reduce((acc, e) => acc + e.score, 0);
                    scoredItems.push({ item, tier: worstTier, score: totalScore, matchedCount: queryTerms.length });
                }
            });

            // Si hay varios términos y la búsqueda AND dio solo coincidencias débiles (Tier >= 4) o ninguna,
            // verificar si todos los términos tienen coincidencias fuertes (Tier 1..2) por separado (ej. "mesa y escalera")
            const hasStrongAnd = scoredItems.some(s => s.tier <= 3);
            if (!hasStrongAnd && queryTerms.length > 1) {
                const orScored = [];
                rubroFiltered.forEach(item => {
                    const termEvals = queryTerms.map(t => evaluateItemForTerm(item, t)).filter(Boolean);
                    if (termEvals.length > 0) {
                        const bestTier = Math.min(...termEvals.map(e => e.tier));
                        const totalScore = termEvals.reduce((acc, e) => acc + e.score, 0);
                        if (bestTier <= 2 || scoredItems.length === 0) {
                            orScored.push({ item, tier: bestTier, score: totalScore, matchedCount: termEvals.length });
                        }
                    }
                });
                if (orScored.length > 0) {
                    scoredItems = orScored;
                }
            }

            if (scoredItems.length > 0) {
                // Filtrar por el mejor nivel de relevancia encontrado (si hay coincidencias en Título [Tier 1], descartar ruido de Tags/Descripción)
                const bestTierFound = Math.min(...scoredItems.map(s => s.tier));
                const filteredScored = scoredItems.filter(s => s.tier <= bestTierFound);

                filteredScored.sort((a, b) => {
                    if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
                    if (a.tier !== b.tier) return a.tier - b.tier;
                    if (b.score !== a.score) return b.score - a.score;
                    const nameA = (a.item.nombre || '').toLowerCase();
                    const nameB = (b.item.nombre || '').toLowerCase();
                    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
                });

                results = filteredScored.map(s => s.item);
            }
        }

        searchResultsContainer.innerHTML = '';

        if (results.length === 0) {
            if (searchEmptyState) searchEmptyState.style.display = 'flex';
            return;
        }
        if (searchEmptyState) searchEmptyState.style.display = 'none';

                results.forEach(item => {
            const { product, cat, nombre, acabado, image } = item;
            const card = createFeedProductCard(product, {
                catName: cat ? cat.name : '',
                acabado: acabado,
                imageOverride: image
            });
            card.addEventListener('click', () => {
                if (window.showProductDetail) {
                    window.showProductDetail(product, cat ? cat.name : '', acabado);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    const appContainer = document.getElementById('app-container');
                    if (appContainer) appContainer.scrollTop = 0;
                }
            });
            searchResultsContainer.appendChild(card);
        });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CATEGORY FEED — Vista exclusiva por categoría
    // Solo se accede desde las tarjetas de la Home.
    // Sin header, sin botón volver, sin título: solo fotos.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const categoryFeedView = document.getElementById('view-category-feed');
    const categoryFeedList = document.getElementById('category-feed-container');
    const categoryFeedEmpty = document.getElementById('category-feed-empty');

    function navigateToCategoryFeed(categoryId, isBack = false) {
        if (window.innerWidth >= 900 && typeof window.navigateToView === 'function') {
            return window.navigateToView('view-catalogo', { categoryId }, isBack);
        }
        

        const urlParams = new URLSearchParams(window.location.search);
        const currentCat = urlParams.get('cat') || urlParams.get('category');
        const hasOtherParams = urlParams.has('prod') || urlParams.has('product') || urlParams.has('p') || urlParams.has('view');
        if (currentCat !== categoryId || hasOtherParams) {
            const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + `?cat=${encodeURIComponent(categoryId)}`;
            if (isBack) {
                window.history.replaceState({ viewId: 'view-category-feed', categoryId }, document.title, cleanUrl);
            } else {
                window.history.pushState({ viewId: 'view-category-feed', categoryId }, document.title, cleanUrl);
            }
        }

        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
        if (typeof sourceData === 'undefined') return;

        let cat = sourceData.find(c => c.id === categoryId);
        // Fallback dinámico si sessionProducts en localStorage quedó viejo
        if (!cat && typeof productsData !== 'undefined') {
            cat = productsData.find(c => c.id === categoryId);
            if (cat && window.sessionProducts) {
                window.sessionProducts.push(cat);
            }
        }
        if (!cat) return;

        if (isBack) {
            const categoryFeedView = document.getElementById('view-category-feed');
            if (categoryFeedView) categoryFeedView.dataset.categoryId = categoryId;
        }

        if (window.navigateToView) {
            window.navigateToView('view-category-feed', { categoryId: categoryId, name: cat.name }, isBack);
        }

        // Configurar atributos para compartir categoría
        if (window.btnShareHeader) {
            window.btnShareHeader.setAttribute('data-category-id', categoryId);
            window.btnShareHeader.setAttribute('data-category-name', cat.name);
        }

        // Configurar e inicializar barra de subcategorías
        const subcategoriesBar = document.getElementById('category-feed-subcategories-bar');
        if (subcategoriesBar) {
            subcategoriesBar.innerHTML = '';
            subcategoriesBar.style.display = 'none';
        }

        // Limpiar el feed anterior
        if (categoryFeedList) categoryFeedList.innerHTML = '';

        // Obtener productos (si es categoría general de resguardo, unificar dinámicamente)
        let categoryProducts = [];
        if (categoryId.endsWith('-todos')) {
            const rubroId = categoryId.replace('-todos', '');
            const otherCategories = sourceData.filter(c => (c.rubro || 'carpinteria') === rubroId && !c.id.endsWith('-todos') && c.visible !== false);
            
            const seenIds = new Set();
            otherCategories.forEach(c => {
                if (c.products) {
                    c.products.forEach(p => {
                        if (!seenIds.has(p.id) && p.visible !== false) {
                            seenIds.add(p.id);
                            categoryProducts.push(p);
                        }
                    });
                }
            });
            // Añadir los que estén guardados físicamente aquí
            if (cat.products) {
                cat.products.forEach(p => {
                    if (!seenIds.has(p.id) && p.visible !== false) {
                        seenIds.add(p.id);
                        categoryProducts.push(p);
                    }
                });
            }
        } else {
            categoryProducts = (cat.products || []).filter(p => p.visible !== false);
        }

        function renderFeedCards(prodsToRender) {
            if (!categoryFeedList) return;
            categoryFeedList.innerHTML = '';
            if (prodsToRender.length === 0) {
                if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'flex';
                return;
            }
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'none';

                        prodsToRender.forEach(product => {
                const defaultAcabado = (product.acabados_groups && product.acabados_groups[0]?.acabado_name) || '';
                const card = createFeedProductCard(product, {
                    catName: cat.name,
                    acabado: defaultAcabado
                });
                card.addEventListener('click', () => {
                    showProductDetail(product, cat.name);
                });
                categoryFeedList.appendChild(card);
            });
        }

        if (categoryProducts.length === 0) {
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'flex';
        } else {
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'none';

            // Detectar subcategorías presentes en los productos
            const subcatMap = new Map();
            categoryProducts.forEach(p => {
                if (p.subcategoria && p.subcategoria_label) {
                    subcatMap.set(p.subcategoria, p.subcategoria_label);
                }
            });

            // Si hay 2 o más subcategorías, armar la barra de chips
            if (subcategoriesBar && subcatMap.size >= 2) {
                subcategoriesBar.innerHTML = '';
                subcategoriesBar.style.display = 'flex';

                // Botón "Todos"
                const btnAll = document.createElement('button');
                btnAll.type = 'button';
                btnAll.className = 'chip active';
                btnAll.textContent = `Todos (${categoryProducts.length})`;
                btnAll.addEventListener('click', () => {
                    subcategoriesBar.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    btnAll.classList.add('active');
                    renderFeedCards(categoryProducts);
                });
                subcategoriesBar.appendChild(btnAll);

                // Botón por cada subcategoría
                subcatMap.forEach((label, subId) => {
                    const count = categoryProducts.filter(p => p.subcategoria === subId).length;
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'chip';
                    btn.textContent = `${label} (${count})`;
                    btn.addEventListener('click', () => {
                        subcategoriesBar.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                        btn.classList.add('active');
                        const filtered = categoryProducts.filter(p => p.subcategoria === subId);
                        renderFeedCards(filtered);
                    });
                    subcategoriesBar.appendChild(btn);
                });

                if (window.enableDragToScroll) {
                    window.enableDragToScroll(subcategoriesBar);
                }
            }

            renderFeedCards(categoryProducts);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SEARCH — Vista del buscador general
    // Solo se accede tocando el ícono de lupa en el nav.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function navigateToSearch() {
        navigateToView('view-search');
        document.getElementById('app-container').scrollTop = 0;
        if (searchInput) searchInput.value = '';
        runSearch();
    }

    // Attach search input listener, desplegable de últimas 3 búsquedas y botón de limpieza rápida
    const btnClearSearch = document.getElementById('btn-clear-search');
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            renderRecentSearchesDropdown();
        });

        searchInput.addEventListener('click', () => {
            renderRecentSearchesDropdown();
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                hideRecentSearchesDropdown();
            }, 150);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = searchInput.value.trim();
                if (val.length >= 2) saveSearchTerm(val);
                hideRecentSearchesDropdown();
                searchInput.blur();
            } else if (e.key === 'Escape') {
                hideRecentSearchesDropdown();
            }
        });

        searchInput.addEventListener('input', () => {
            const hasText = !!searchInput.value.trim();
            if (btnClearSearch) {
                btnClearSearch.style.display = hasText ? 'flex' : 'none';
            }
            if (hasText) {
                hideRecentSearchesDropdown();
            } else {
                renderRecentSearchesDropdown();
            }
            window.runSearch();
        });

        if (btnClearSearch) {
            btnClearSearch.addEventListener('click', (e) => {
                e.preventDefault();
                searchInput.value = '';
                btnClearSearch.style.display = 'none';
                searchInput.focus();
                renderRecentSearchesDropdown();
                window.runSearch();
            });
        }
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar-container')) {
            hideRecentSearchesDropdown();
        }
    });

    // Initialize search when tab is clicked (reset to "all" on direct nav tab click)
    const searchNavItem = document.querySelector('.nav-item[data-target="view-search"]');
    if (searchNavItem) {
        searchNavItem.addEventListener('click', () => {
            setTimeout(() => {
                window.runSearch();
            }, 0);
        });
    }

    // Exponer al scope global
    
    window.createFeedProductCard = createFeedProductCard;
    window.getProductFreeShippingInfo = getProductFreeShippingInfo;
    window.getProductDiscountInfo = getProductDiscountInfo;
    window.getProductPriceDisplay = getProductPriceDisplay;
    window.checkProductFavStatus = checkProductFavStatus;
    window.checkProductCartStatus = checkProductCartStatus;
    window.handleShareProduct = handleShareProduct;
    window.runSearch = runSearch;
    window.renderSearchRubrosTabs = renderSearchRubrosTabs;
    window.navigateToCategoryFeed = navigateToCategoryFeed;

    // Initialize search view on first load so it's ready
    window.runSearch();


    window.getIndexedProducts = getIndexedProducts;
    window.navigateToSearch = navigateToSearch;

    window.searchCatalogScore = function(items, rawQuery) {
        const list = Array.isArray(items) ? items : [];
        const queryTerms = getCleanSearchTerms(rawQuery || '');
        if (queryTerms.length === 0) {
            if ((rawQuery || '').trim() !== '') return [];
            return list.map(item => ({ item, tier: 0, score: 0, matchedCount: 0 }));
        }

        const evalTerm = (item, term) => {
            const titleWords = tokenizeWords(item.nombre || item.baseTitle || item.title || '');
            const catWords = tokenizeWords((item.cat && item.cat.name) || item.categoryName || '');
            const acabadoWords = tokenizeWords((item.acabado || '') + ' ' + (item.acabadosSearch || ''));
            const subWords = tokenizeWords((item.product && item.product.subtitle) || item.subtitle || '');

            const titleExact = matchTermInWords(term, titleWords, false);
            if (titleExact > 0) return { tier: 1, score: titleExact + 200 };

            if (/\d/.test(term) && Array.isArray(item.medidas)) {
                const normTermNoSpaces = term.replace(/[\s\-\_cmx]/g, '');
                const hasMedida = item.medidas.some(medida => {
                    const normMedida = normalizeForSearch(medida);
                    if (normMedida.includes(term)) return true;
                    const normMedidaClean = normMedida.replace(/[\s\-\_cmx]/g, '');
                    return normTermNoSpaces.length >= 2 && normMedidaClean.includes(normTermNoSpaces);
                });
                if (hasMedida) return { tier: 1, score: 250 };
            }

            const acabExact = matchTermInWords(term, acabadoWords, false);
            if (acabExact > 0) return { tier: 1, score: acabExact + 180 };

            const catExact = matchTermInWords(term, catWords, false);
            if (catExact > 0) return { tier: 2, score: catExact + 100 };

            const subExact = matchTermInWords(term, subWords, false);
            if (subExact > 0) return { tier: 2, score: subExact + 90 };

            const titleFuzzy = matchTermInWords(term, titleWords, true);
            if (titleFuzzy > 0) return { tier: 3, score: titleFuzzy + 50 };
            const acabFuzzy = matchTermInWords(term, acabadoWords, true);
            if (acabFuzzy > 0) return { tier: 3, score: acabFuzzy + 45 };
            const catFuzzy = matchTermInWords(term, catWords, true);
            if (catFuzzy > 0) return { tier: 3, score: catFuzzy + 40 };

            const tagWords = [];
            if (Array.isArray(item.tags)) {
                item.tags.forEach(t => tagWords.push(...tokenizeWords(t)));
            }
            const tagMatch = matchTermInWords(term, tagWords, false);
            if (tagMatch > 0) return { tier: 4, score: tagMatch };

            const descText = (item.product && item.product.description) || item.description || '';
            const descWords = tokenizeWords(descText).filter(w => w.length >= 4);
            const descMatch = matchTermInWords(term, descWords, false);
            if (descMatch >= 95) return { tier: 5, score: 30 };

            return null;
        };

        let scoredItems = [];
        list.forEach(item => {
            const termEvals = queryTerms.map(t => evalTerm(item, t));
            if (termEvals.every(Boolean)) {
                const worstTier = Math.max(...termEvals.map(e => e.tier));
                const totalScore = termEvals.reduce((acc, e) => acc + e.score, 0);
                scoredItems.push({ item, tier: worstTier, score: totalScore, matchedCount: queryTerms.length });
            }
        });

        const hasStrongAnd = scoredItems.some(s => s.tier <= 3);
        if (!hasStrongAnd && queryTerms.length > 1) {
            const orScored = [];
            list.forEach(item => {
                const termEvals = queryTerms.map(t => evalTerm(item, t)).filter(Boolean);
                if (termEvals.length > 0) {
                    const bestTier = Math.min(...termEvals.map(e => e.tier));
                    const totalScore = termEvals.reduce((acc, e) => acc + e.score, 0);
                    if (bestTier <= 2 || scoredItems.length === 0) {
                        orScored.push({ item, tier: bestTier, score: totalScore, matchedCount: termEvals.length });
                    }
                }
            });
            if (orScored.length > 0) scoredItems = orScored;
        }

        if (scoredItems.length === 0) return [];

        const bestTierFound = Math.min(...scoredItems.map(s => s.tier));
        const filteredScored = scoredItems.filter(s => s.tier <= bestTierFound);
        filteredScored.sort((a, b) => {
            if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
            if (a.tier !== b.tier) return a.tier - b.tier;
            if (b.score !== a.score) return b.score - a.score;
            const nameA = (a.item.nombre || a.item.title || '').toLowerCase();
            const nameB = (b.item.nombre || b.item.title || '').toLowerCase();
            return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        });

        return filteredScored;
    };
})();
