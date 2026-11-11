// js/modules/catalog-view.js
// --- CATÁLOGO NATIVO UNIFICADO (SIN IFRAME) ---
// Combina navegación por rubros, categorías, subcategorías, búsqueda inteligente,
// ordenamiento y vista Lista/Tarjetas directamente en el DOM principal (#catalog-view-root).

(function () {
    'use strict';

    const WHATSAPP_PHONE = '5491167007723';
    const SORT_STORAGE_KEY = 'latarima_catalog_sort_mode';
    const VIEW_STORAGE_KEY = 'latarima_catalog_view_mode';
    const BATCH_SIZE = 30;

    let isMounted = false;
    let rootEl = null;
    let catalogListContainer = null;
    let emptyState = null;

    let activeCatalogRubro = 'carpinteria';
    let activeCategoryId = 'all';
    let activeSubcategory = null;
    let currentSearchQuery = '';
    let currentSortMode = safeGetStorage(SORT_STORAGE_KEY) || 'az';
    let currentViewMode = safeGetStorage(VIEW_STORAGE_KEY) || (window.innerWidth >= 900 ? 'cards' : 'list');

    let allProducts = [];
    let currentFilteredProducts = [];
    let itemsToShow = BATCH_SIZE;
    let scrollListenersAttached = false;

    const currencyFormatter = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    });

    function safeGetStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function safeSetStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {}
    }

    function cleanImagePath(path) {
        if (!path) return 'img/logo_provisional.png';
        const raw = Array.isArray(path) ? (path[0] || '') : String(path);
        if (!raw) return 'img/logo_provisional.png';
        if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
            return raw;
        }
        return raw.replace(/^\.\//, '').replace(/^\//, '') || 'img/logo_provisional.png';
    }

    function getThumbImagePath(path) {
        const clean = cleanImagePath(path);
        if (typeof window.getThumbUrl === 'function') {
            return window.getThumbUrl(clean);
        }
        if (clean.startsWith('http') || clean.startsWith('data:') || clean.includes('_thumb.webp') || clean.includes('logo_provisional')) {
            return clean;
        }
        return clean.replace(/\.(webp|jpe?g|png)$/i, '_thumb.webp');
    }

    function getSourceCategories() {
        if (typeof window.sessionProducts !== 'undefined' && Array.isArray(window.sessionProducts) && window.sessionProducts.length > 0) {
            return window.sessionProducts;
        }
        if (typeof productsData !== 'undefined' && Array.isArray(productsData)) {
            return productsData;
        }
        return [];
    }

    function getVisibleRubros() {
        const rubrosList = (window.siteConfig && Array.isArray(window.siteConfig.rubros) && window.siteConfig.rubros.length > 0)
            ? window.siteConfig.rubros
            : [{ id: 'carpinteria', name: 'Carpintería' }];
        return rubrosList.filter(r => r && r.visible !== false);
    }

    function getVisibleCategoriesForRubro(rubroId) {
        const source = getSourceCategories();
        return source
            .filter(cat => {
                if (!cat || cat.visible === false) return false;
                if (!cat.id || cat.id.endsWith('-todos')) return false;
                const cleanName = (cat.name || '').trim().toLowerCase();
                const cleanId = (cat.id || '').trim().toLowerCase();
                if (cleanName === 'borrador' || cleanId === 'borrador') return false;
                const catRubro = cat.rubro || 'carpinteria';
                if (rubroId && catRubro !== rubroId) return false;
                return Array.isArray(cat.products) && cat.products.some(p => p && p.visible !== false);
            })
            .sort((a, b) => (a.name || '').trim().localeCompare((b.name || '').trim(), 'es', { sensitivity: 'base', numeric: true }));
    }

    // --- FALLBACK DE BÚSQUEDA INTELIGENTE (si ui-search-feed.js no estuviera disponible) ---
    const STOP_WORDS = new Set([
        'necesito', 'quiero', 'busco', 'comprar', 'tenes', 'tienen', 'hola', 'por', 'favor',
        'gracias', 'para', 'de', 'con', 'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las',
        'y', 'o', 'en', 'al', 'del', 'lo'
    ]);

    function normalizeText(str) {
        if (!str || typeof str !== 'string') return '';
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function stemWord(word) {
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
    }

    function tokenizeWords(str) {
        return normalizeText(str)
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 2);
    }

    function getCleanSearchTerms(text) {
        return normalizeText(text)
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 1 && !STOP_WORDS.has(w));
    }

    function matchTermInWords(term, words) {
        const termStem = stemWord(term);
        for (const w of words) {
            if (w === term) return 100;
            const wStem = stemWord(w);
            if (wStem.length >= 3 && termStem.length >= 3) {
                if (wStem === termStem) return 95;
                if (w.startsWith(term) && term.length >= 3) return 85;
                if (wStem.startsWith(termStem) && termStem.length >= 4) return 85;
            } else if (w.startsWith(term) && term.length >= 2) {
                return 80;
            }
            if (term.length >= 3 && w.includes(term)) return 70;
        }
        return 0;
    }

    function scoreCatalogFallback(items, rawQuery) {
        const queryTerms = getCleanSearchTerms(rawQuery || '');
        if (queryTerms.length === 0) {
            if ((rawQuery || '').trim() !== '') return [];
            return items.map(item => ({ item, tier: 0, score: 0, matchedCount: 0 }));
        }

        const evalTerm = (item, term) => {
            const titleWords = tokenizeWords(item.nombre || item.baseTitle || item.title || '');
            const acabWords = tokenizeWords((item.acabado || '') + ' ' + (item.acabadosSearch || ''));
            const catWords = tokenizeWords((item.cat && item.cat.name) || item.categoryName || '');
            const subWords = tokenizeWords((item.product && item.product.subtitle) || item.subtitle || '');

            const titleMatch = matchTermInWords(term, titleWords);
            if (titleMatch > 0) return { tier: 1, score: titleMatch + 200 };

            if (/\d/.test(term) && Array.isArray(item.medidas)) {
                const normTermNoSpaces = term.replace(/[\s\-\_cmx]/g, '');
                const hasMedida = item.medidas.some(medida => {
                    const normMedida = normalizeText(medida);
                    if (normMedida.includes(term)) return true;
                    const normMedidaClean = normMedida.replace(/[\s\-\_cmx]/g, '');
                    return normTermNoSpaces.length >= 2 && normMedidaClean.includes(normTermNoSpaces);
                });
                if (hasMedida) return { tier: 1, score: 250 };
            }

            const acabMatch = matchTermInWords(term, acabWords);
            if (acabMatch > 0) return { tier: 1, score: acabMatch + 180 };

            const catMatch = matchTermInWords(term, catWords);
            if (catMatch > 0) return { tier: 2, score: catMatch + 100 };

            const subMatch = matchTermInWords(term, subWords);
            if (subMatch > 0) return { tier: 2, score: subMatch + 90 };

            const tagWords = [];
            if (Array.isArray(item.tags)) {
                item.tags.forEach(t => tagWords.push(...tokenizeWords(t)));
            }
            const tagMatch = matchTermInWords(term, tagWords);
            if (tagMatch > 0) return { tier: 4, score: tagMatch };

            const descText = (item.product && item.product.description) || item.description || '';
            const descWords = tokenizeWords(descText).filter(w => w.length >= 4);
            const descMatch = matchTermInWords(term, descWords);
            if (descMatch >= 95) return { tier: 5, score: 30 };

            return null;
        };

        let scored = [];
        items.forEach(item => {
            const evals = queryTerms.map(t => evalTerm(item, t));
            if (evals.every(Boolean)) {
                const worstTier = Math.max(...evals.map(e => e.tier));
                const totalScore = evals.reduce((acc, e) => acc + e.score, 0);
                scored.push({ item, tier: worstTier, score: totalScore, matchedCount: queryTerms.length });
            }
        });

        const hasStrongAnd = scored.some(s => s.tier <= 3);
        if (!hasStrongAnd && queryTerms.length > 1) {
            const orScored = [];
            items.forEach(item => {
                const evals = queryTerms.map(t => evalTerm(item, t)).filter(Boolean);
                if (evals.length > 0) {
                    const bestTier = Math.min(...evals.map(e => e.tier));
                    const totalScore = evals.reduce((acc, e) => acc + e.score, 0);
                    if (bestTier <= 2 || scored.length === 0) {
                        orScored.push({ item, tier: bestTier, score: totalScore, matchedCount: evals.length });
                    }
                }
            });
            if (orScored.length > 0) scored = orScored;
        }

        if (scored.length === 0) return [];
        const bestTier = Math.min(...scored.map(s => s.tier));
        return scored
            .filter(s => s.tier <= bestTier)
            .sort((a, b) => {
                if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
                if (a.tier !== b.tier) return a.tier - b.tier;
                if (b.score !== a.score) return b.score - a.score;
                return (a.item.title || '').localeCompare((b.item.title || ''), 'es', { sensitivity: 'base' });
            });
    }

    // --- EXTRACCIÓN DE VARIANTES, PRECIOS Y CARRITO ---
    function getShippingVariants(product) {
        const variants = [];
        if (product.acabados_groups && product.acabados_groups.length > 0) {
            product.acabados_groups.filter(g => g && !g.hidden).forEach(group => {
                const acabadoName = group.acabado_name || '';
                if (Array.isArray(group.medidas_variants)) {
                    group.medidas_variants.forEach(v => {
                        if (v && !v.hidden) {
                            const label = acabadoName && acabadoName.toLowerCase() !== 'único'
                                ? `${acabadoName} - ${v.medida}`
                                : v.medida;
                            variants.push({
                                label,
                                link: (v.link || '').trim(),
                                price: (v.showPrice !== false && v.price) ? v.price : null,
                                acabado: acabadoName || 'Único',
                                medida: v.medida,
                                isDefault: v.default === true
                            });
                        }
                    });
                }
            });
        } else if (Array.isArray(product.medidas_variants)) {
            product.medidas_variants.forEach(v => {
                if (v && !v.hidden) {
                    variants.push({
                        label: v.medida,
                        link: (v.link || '').trim(),
                        price: (v.showPrice !== false && v.price) ? v.price : null,
                        acabado: 'Único',
                        medida: v.medida,
                        isDefault: v.default === true
                    });
                }
            });
        }
        return variants;
    }

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

    function getWhatsAppUrl(productTitle, variantLabel = '') {
        let msg = `¡Hola La Tarima! Quiero consultar por el producto: *${productTitle}*`;
        if (variantLabel) {
            msg += ` (Variante: ${variantLabel})`;
        }
        msg += '. ¿Me podés pasar más info y disponibilidad?';
        return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
    }

    function isProductInCartStorage(productId, acabado = '') {
        try {
            const data = localStorage.getItem('cartItems');
            if (!data) return false;
            const items = JSON.parse(data);
            if (!Array.isArray(items)) return false;
            const cleanAcabado = (acabado || '').trim().toLowerCase();
            return items.some(i => {
                if (String(i.id) !== String(productId)) return false;
                if (!cleanAcabado) return true;
                return (i.acabado || '').trim().toLowerCase() === cleanAcabado;
            });
        } catch (e) {
            return false;
        }
    }

    function syncCartBadges() {
        if (window.DesktopHeader && typeof window.DesktopHeader.syncCartBadge === 'function') {
            window.DesktopHeader.syncCartBadge();
        } else {
            const desktopBadge = document.getElementById('desktop-cart-badge');
            if (desktopBadge) {
                try {
                    const raw = localStorage.getItem('cartItems');
                    const list = raw ? JSON.parse(raw) : [];
                    const count = Array.isArray(list) ? list.length : 0;
                    desktopBadge.textContent = count;
                    desktopBadge.style.display = count > 0 ? 'inline-flex' : 'none';
                } catch (e) {}
            }
        }
        if (typeof window.updateFavoritesBadge === 'function') {
            window.updateFavoritesBadge();
        }
    }

    // --- CARGA Y NORMALIZACIÓN DE PRODUCTOS ---
    function loadProducts() {
        const visibleRubros = getVisibleRubros();
        if (visibleRubros.length > 0 && !visibleRubros.some(r => r.id === activeCatalogRubro)) {
            activeCatalogRubro = visibleRubros[0].id;
        }

        let rawItems = [];
        if (typeof window.getNormalizedCatalogProducts === 'function') {
            rawItems = window.getNormalizedCatalogProducts(activeCatalogRubro);
        } else {
            const cats = getVisibleCategoriesForRubro(activeCatalogRubro);
            cats.forEach(cat => {
                (cat.products || []).forEach(p => {
                    if (p && p.visible !== false) {
                        rawItems.push({
                            uniqueId: p.id,
                            id: p.id,
                            productId: p.id,
                            product: p,
                            cat: cat,
                            categoryName: cat.name,
                            title: p.title,
                            baseTitle: p.title,
                            nombre: p.title,
                            description: p.description || '',
                            acabado: '',
                            selectedAcabado: '',
                            image: cleanImagePath(p.image),
                            acabados_groups: p.acabados_groups || [],
                            medidas_variants: p.medidas_variants || [],
                            tags: p.tags || [],
                            medidas: []
                        });
                    }
                });
            });
        }

        allProducts = rawItems.map(item => ({
            ...item,
            image: cleanImagePath(item.image)
        }));
    }

    // --- RENDERIZADO DE TABS DE RUBROS, CATEGORÍAS Y SUBCATEGORÍAS ---
    function renderCatalogRubrosTabs() {
        const container = document.getElementById('catalog-rubros-tabs-container');
        if (!container) return;

        const visibleRubros = getVisibleRubros();
        if (visibleRubros.length <= 1) {
            container.classList.add('single-rubro');
            container.innerHTML = '';
            if (visibleRubros.length === 1) {
                activeCatalogRubro = visibleRubros[0].id;
            }
            return;
        }

        container.classList.remove('single-rubro');
        if (!visibleRubros.some(r => r.id === activeCatalogRubro)) {
            activeCatalogRubro = visibleRubros[0].id;
        }

        container.innerHTML = '';
        const pct = (100 / visibleRubros.length).toFixed(4);
        visibleRubros.forEach(r => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = r.id === activeCatalogRubro ? 'rubros-tab active' : 'rubros-tab';
            btn.style.width = `${pct}%`;
            btn.style.flex = `0 0 ${pct}%`;
            btn.textContent = r.name;
            btn.addEventListener('click', () => {
                if (activeCatalogRubro === r.id) return;
                activeCatalogRubro = r.id;
                activeCategoryId = 'all';
                activeSubcategory = null;
                loadProducts();
                renderCatalogRubrosTabs();
                updateCatalogUrl('all', { updateUrl: true });
                applyAllFiltersAndSort();
            });
            container.appendChild(btn);
        });
    }

    function ensureValidCategorySelection() {
        const visibleCategories = getVisibleCategoriesForRubro(activeCatalogRubro);
        if (activeCategoryId !== 'all' && !visibleCategories.some(c => c.id === activeCategoryId)) {
            activeCategoryId = 'all';
            activeSubcategory = null;
        }
    }

    function renderSubcategoriesBar(categoryProducts) {
        const subBar = document.getElementById('catalog-subcategories-bar');
        if (!subBar) return;

        if (!activeCategoryId || activeCategoryId === 'all') {
            subBar.innerHTML = '';
            subBar.style.display = 'none';
            activeSubcategory = null;
            return;
        }

        const subcatMap = new Map();
        const countBySub = new Map();
        const seenProdIds = new Set();

        categoryProducts.forEach(item => {
            const rawProd = item.product || item;
            const prodKey = item.id || rawProd.id;
            const subId = rawProd.subcategoria || item.subcategoria;
            const subLabel = rawProd.subcategoria_label || item.subcategoria_label;
            if (subId && subLabel) {
                subcatMap.set(subId, subLabel);
                if (!seenProdIds.has(`${subId}::${prodKey}`)) {
                    seenProdIds.add(`${subId}::${prodKey}`);
                    countBySub.set(subId, (countBySub.get(subId) || 0) + 1);
                }
            }
        });

        if (subcatMap.size < 2) {
            subBar.innerHTML = '';
            subBar.style.display = 'none';
            activeSubcategory = null;
            return;
        }

        if (activeSubcategory && !subcatMap.has(activeSubcategory)) {
            activeSubcategory = null;
        }

        subBar.innerHTML = '';
        subBar.style.display = 'flex';

        const totalUnique = new Set(categoryProducts.map(i => i.id)).size;
        const btnAllSub = document.createElement('button');
        btnAllSub.type = 'button';
        btnAllSub.className = `catalog-subcat-chip${!activeSubcategory ? ' active' : ''}`;
        btnAllSub.textContent = `Todos (${totalUnique})`;
        btnAllSub.addEventListener('click', () => {
            activeSubcategory = null;
            applyAllFiltersAndSort();
        });
        subBar.appendChild(btnAllSub);

        subcatMap.forEach((label, subId) => {
            const count = countBySub.get(subId) || 0;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `catalog-subcat-chip${activeSubcategory === subId ? ' active' : ''}`;
            btn.textContent = `${label} (${count})`;
            btn.addEventListener('click', () => {
                activeSubcategory = subId;
                applyAllFiltersAndSort();
            });
            subBar.appendChild(btn);
        });

        if (typeof window.enableDragToScroll === 'function') {
            window.enableDragToScroll(subBar);
        }
    }

    // --- FILTRADO, ORDENAMIENTO Y RENDERIZADO DE PRODUCTOS ---
    function getCategoryScopedProducts() {
        if (!activeCategoryId || activeCategoryId === 'all') {
            return [...allProducts];
        }
        const source = getSourceCategories();
        const catObj = source.find(c => c && c.id === activeCategoryId);
        const catProdIds = new Set();
        if (catObj && Array.isArray(catObj.products)) {
            catObj.products.forEach(p => {
                if (p && p.visible !== false && p.id) {
                    catProdIds.add(String(p.id));
                }
            });
        }
        return allProducts.filter(item => {
            if (item.cat && item.cat.id === activeCategoryId) return true;
            return catProdIds.has(String(item.id));
        });
    }

    function sortCatalogResults(results) {
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
    }

    function applyAllFiltersAndSort() {
        let scoped = getCategoryScopedProducts();
        renderSubcategoriesBar(scoped);

        if (activeSubcategory) {
            scoped = scoped.filter(item => {
                const rawProd = item.product || item;
                return (rawProd.subcategoria || item.subcategoria) === activeSubcategory;
            });
        }

        let results = [];
        const hasSearch = Boolean(currentSearchQuery && currentSearchQuery.trim());
        if (hasSearch) {
            const scored = (typeof window.searchCatalogScore === 'function')
                ? window.searchCatalogScore(scoped, currentSearchQuery)
                : scoreCatalogFallback(scoped, currentSearchQuery);
            results = scored.map(s => s.item);
            if (currentSortMode !== 'az') {
                sortCatalogResults(results);
            }
        } else {
            results = [...scoped];
            sortCatalogResults(results);
        }

        const countEl = document.getElementById('catalog-results-count');
        if (countEl) {
            countEl.textContent = `${results.length} ${results.length === 1 ? 'producto' : 'productos'}`;
        }

        const clearBtn = document.getElementById('catalog-clear-filters-btn');
        if (clearBtn) {
            const hasFilters = (activeCategoryId && activeCategoryId !== 'all') || Boolean(activeSubcategory) || hasSearch;
            clearBtn.style.display = hasFilters ? 'inline-flex' : 'none';
        }

        renderCatalogList(results, false);
    }

    function buildProductRow(product, absIdx) {
        const row = document.createElement('div');
        row.className = 'catalog-row';
        row.dataset.productId = product.id;
        row.style.animationDelay = `${(absIdx % 15) * 0.04}s`;

        const shippingVariants = getShippingVariants(product);
        const detailUrl = `./?prod=${encodeURIComponent(product.id)}`;

        const handleProductClick = (e) => {
            e.preventDefault();
            const foundData = typeof window.findProductById === 'function'
                ? window.findProductById(product.id)
                : null;
            if (foundData && typeof window.showProductDetail === 'function') {
                window.showProductDetail(foundData.product, foundData.catName, product.selectedAcabado || '');
                return;
            }
            if (typeof window.showProductDetail === 'function') {
                window.showProductDetail(product.product || product, product.categoryName || 'Catálogo', product.selectedAcabado || '');
            }
        };

        let defaultIdx = shippingVariants.findIndex(v => v.isDefault);
        if (defaultIdx === -1) defaultIdx = 0;

        const thumbSrc = getThumbImagePath(product.image);
        const origSrc = cleanImagePath(product.image);
        const initialAcabado = product.selectedAcabado || (shippingVariants[defaultIdx] ? shippingVariants[defaultIdx].acabado : '');
        const inCartInitial = isProductInCartStorage(product.id, initialAcabado);

        // 1. Thumbnail + Botón Carrito en miniatura
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'catalog-thumb-container';

        const thumbLink = document.createElement('a');
        thumbLink.href = detailUrl;
        thumbLink.className = 'catalog-thumb-link';

        const thumbImg = document.createElement('img');
        thumbImg.src = thumbSrc;
        thumbImg.className = 'catalog-thumb';
        thumbImg.alt = product.title || 'Producto';
        thumbImg.loading = 'lazy';
        thumbImg.decoding = 'async';
        thumbImg.addEventListener('error', function onImgError() {
            if (this.src.includes('_thumb.webp') && !this.dataset.triedOrig) {
                this.dataset.triedOrig = '1';
                this.src = origSrc;
                return;
            }
            this.removeEventListener('error', onImgError);
            this.src = 'img/logo_provisional.png';
        });
        thumbLink.appendChild(thumbImg);
        thumbLink.addEventListener('click', handleProductClick);
        thumbContainer.appendChild(thumbLink);

        const btnCartBadge = document.createElement('button');
        btnCartBadge.type = 'button';
        btnCartBadge.className = `catalog-thumb-cart-btn ${inCartInitial ? 'in-cart' : ''}`;
        btnCartBadge.title = inCartInitial ? 'En Carrito (Clic para quitar)' : 'Agregar al Carrito';
        btnCartBadge.innerHTML = `<span class="material-symbols-outlined">${inCartInitial ? 'check_circle' : 'add_shopping_cart'}</span>`;
        thumbContainer.appendChild(btnCartBadge);
        row.appendChild(thumbContainer);

        // 2. Columna de Textos (Título, Precio + Info, Selector de Variante)
        const textCol = document.createElement('div');
        textCol.className = 'catalog-text-col';
        textCol.style.cssText = 'display:flex; flex-direction:column; flex:1; min-width:0; justify-content:center;';

        const titleRow = document.createElement('div');
        const titleLink = document.createElement('a');
        titleLink.href = detailUrl;
        titleLink.className = 'catalog-title-link';
        titleLink.style.whiteSpace = 'normal';
        const titleH3 = document.createElement('h3');
        titleH3.className = 'catalog-title';
        titleH3.style.cssText = 'white-space:normal; overflow:visible; font-size:1rem; margin-bottom:2px;';
        titleH3.textContent = product.title || '';
        titleLink.appendChild(titleH3);
        titleLink.addEventListener('click', handleProductClick);
        titleRow.appendChild(titleLink);
        textCol.appendChild(titleRow);

        const priceRow = document.createElement('div');
        priceRow.style.cssText = 'display:flex; align-items:center; gap:6px; margin:1px 0 3px 0;';

        const priceTag = document.createElement('span');
        priceTag.className = 'catalog-price-tag';

        const getFormattedPriceText = (v) => {
            if (v && v.price) {
                return currencyFormatter.format(v.price);
            }
            const validPrices = shippingVariants.filter(sv => sv.price).map(sv => sv.price);
            if (validPrices.length > 0) {
                const minP = Math.min(...validPrices);
                const maxP = Math.max(...validPrices);
                return minP === maxP ? currencyFormatter.format(minP) : `Desde ${currencyFormatter.format(minP)}`;
            }
            return 'Consultar precio';
        };

        const initialPriceText = getFormattedPriceText(shippingVariants[defaultIdx]);
        priceTag.textContent = initialPriceText;
        if (initialPriceText === 'Consultar precio') {
            priceTag.style.fontSize = '0.85rem';
            priceTag.style.color = '#c0510a';
            priceTag.style.fontWeight = '700';
        }
        priceRow.appendChild(priceTag);

        const tooltipWrapper = document.createElement('div');
        tooltipWrapper.className = 'catalog-info-tooltip-wrapper';
        tooltipWrapper.innerHTML = `
            <span class="material-symbols-outlined catalog-info-icon">help_outline</span>
            <div class="catalog-tooltip-box">
                <div style="font-weight:700; margin-bottom:4px; color:#F59E0B;">💡 Guía de Compra y Envíos</div>
                <div style="margin-bottom:3px;">💵 <b>Precio publicado:</b> Venta directa en efectivo / transferencia al retirar.</div>
                <div style="margin-bottom:3px;">🚚 <b>Botón Comprar:</b> Calculá envío, cuotas o reservá online.</div>
                <div>💬 <b>Botón Consultar:</b> Atención o dudas vía WhatsApp.</div>
            </div>
        `;
        tooltipWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            tooltipWrapper.classList.toggle('active');
        });
        priceRow.appendChild(tooltipWrapper);
        textCol.appendChild(priceRow);

        const variantCol = document.createElement('div');
        variantCol.className = 'catalog-variant-col';

        let selectEl = null;
        if (shippingVariants.length > 1) {
            const selectWrapper = document.createElement('div');
            selectWrapper.className = 'catalog-select-wrapper';
            selectWrapper.style.cssText = 'margin-top:0.1rem; max-width:200px;';

            selectEl = document.createElement('select');
            selectEl.className = 'catalog-select';
            selectEl.style.padding = '0.2rem 1.2rem 0.2rem 0.5rem';

            shippingVariants.forEach((v, idx) => {
                const opt = document.createElement('option');
                opt.value = String(idx);
                opt.textContent = v.label;
                if (idx === defaultIdx) opt.selected = true;
                selectEl.appendChild(opt);
            });

            selectWrapper.appendChild(selectEl);
            variantCol.appendChild(selectWrapper);
        } else if (shippingVariants.length === 1) {
            const singleSpan = document.createElement('span');
            singleSpan.style.cssText = 'font-size:0.78rem; color:var(--text-muted); font-weight:500;';
            singleSpan.textContent = shippingVariants[0].label;
            variantCol.appendChild(singleSpan);
        } else {
            const emptySpan = document.createElement('span');
            emptySpan.style.cssText = 'font-size:0.78rem; color:var(--text-muted); font-style:italic;';
            emptySpan.textContent = 'Consultar disponibilidad';
            variantCol.appendChild(emptySpan);
        }
        textCol.appendChild(variantCol);
        row.appendChild(textCol);

        const getSelectedVariant = () => {
            const idx = selectEl ? parseInt(selectEl.value, 10) : defaultIdx;
            return shippingVariants[idx] || shippingVariants[0] || {};
        };

        const refreshCartButtonUI = (acabadoToCheck) => {
            const inCart = isProductInCartStorage(product.id, acabadoToCheck);
            btnCartBadge.classList.toggle('in-cart', inCart);
            btnCartBadge.title = inCart ? 'En Carrito (Clic para quitar)' : 'Agregar al Carrito';
            btnCartBadge.innerHTML = `<span class="material-symbols-outlined">${inCart ? 'check_circle' : 'add_shopping_cart'}</span>`;
        };

        btnCartBadge.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const selectedVar = getSelectedVariant();
            const acabado = selectedVar.acabado || product.selectedAcabado || 'Único';
            const medida = selectedVar.medida || '';
            const price = selectedVar.price || null;

            if (window.CarritoModule && typeof window.CarritoModule.toggle === 'function') {
                window.CarritoModule.toggle(product, acabado, product.categoryName || 'Catálogo', medida, '', '', price);
            }
            refreshCartButtonUI(acabado);
            syncCartBadges();
        });

        // 3. Columna de Botones de Acción
        const actionsCol = document.createElement('div');
        actionsCol.className = 'catalog-actions-col';

        const btnBuy = document.createElement('button');
        btnBuy.type = 'button';
        btnBuy.className = 'catalog-btn catalog-btn-shipping';
        btnBuy.style.cssText = 'display:inline-flex; background:linear-gradient(135deg, #059669, #10b981); box-shadow:0 4px 12px rgba(5, 150, 105, 0.25);';
        btnBuy.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.1rem;">bolt</span> Comprar';
        btnBuy.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const selectedVar = getSelectedVariant();
            const medidaName = selectedVar.medida || '';
            const acabadoName = selectedVar.acabado || product.selectedAcabado || 'Único';

            const foundData = typeof window.findProductById === 'function' ? window.findProductById(product.id) : null;
            const rawProduct = (foundData && foundData.product) || product.product || product;
            const groups = (rawProduct.acabados_groups && rawProduct.acabados_groups.length > 0)
                ? rawProduct.acabados_groups
                : (product.acabados_groups || []);
            const grupo = groups.find(g => (g.acabado_name || '').trim().toLowerCase() === acabadoName.trim().toLowerCase())
                || groups[0]
                || {};
            const variantPrice = (selectedVar.price !== undefined && selectedVar.price !== null)
                ? selectedVar.price
                : (parseFloat(rawProduct.price) || 0);

            if (typeof window.showProductPaymentModal === 'function') {
                window.showProductPaymentModal(rawProduct, grupo, medidaName, variantPrice, 1);
            } else if (typeof window.showProductDetail === 'function') {
                window.showProductDetail(rawProduct, (foundData && foundData.catName) || product.categoryName || 'Catálogo', acabadoName);
            }
        });
        actionsCol.appendChild(btnBuy);

        const btnWpp = document.createElement('a');
        btnWpp.className = 'catalog-btn catalog-btn-wpp';
        btnWpp.href = getWhatsAppUrl(product.title, shippingVariants[defaultIdx] ? shippingVariants[defaultIdx].label : '');
        btnWpp.target = '_blank';
        btnWpp.rel = 'noopener noreferrer';
        btnWpp.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.1rem; color:#c0510a;">chat</span> Consultar';
        actionsCol.appendChild(btnWpp);

        if (selectEl) {
            selectEl.addEventListener('change', (e) => {
                const selIdx = parseInt(e.target.value, 10);
                const selectedVar = shippingVariants[selIdx];
                if (!selectedVar) return;

                btnWpp.href = getWhatsAppUrl(product.title, selectedVar.label);
                const newPriceText = getFormattedPriceText(selectedVar);
                priceTag.textContent = newPriceText;
                if (newPriceText === 'Consultar precio') {
                    priceTag.style.fontSize = '0.85rem';
                    priceTag.style.color = '#c0510a';
                    priceTag.style.fontWeight = '700';
                } else {
                    priceTag.style.fontSize = '';
                    priceTag.style.color = '';
                    priceTag.style.fontWeight = '';
                }
                refreshCartButtonUI(selectedVar.acabado || product.selectedAcabado || '');
            });
        }

        row.appendChild(actionsCol);

        // En Modo Tarjetas, hacer clic en cualquier parte libre de la tarjeta abre la publicación
        row.addEventListener('click', (e) => {
            if (!catalogListContainer || !catalogListContainer.classList.contains('view-cards')) return;
            if (e.target.closest('button, a, select, .catalog-select-wrapper, .catalog-info-tooltip-wrapper, .catalog-actions-col')) return;
            handleProductClick(e);
        });

        return row;
    }

    function renderCatalogList(productsToRender, append = false) {
        if (!catalogListContainer) return;

        if (!append) {
            catalogListContainer.innerHTML = '';
            itemsToShow = BATCH_SIZE;
            currentFilteredProducts = productsToRender;
        }

        if (currentFilteredProducts.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const startIdx = catalogListContainer.querySelectorAll('.catalog-row').length;
        const batch = currentFilteredProducts.slice(startIdx, itemsToShow);
        const frag = document.createDocumentFragment();

        batch.forEach((product, idx) => {
            frag.appendChild(buildProductRow(product, startIdx + idx));
        });
        catalogListContainer.appendChild(frag);

        const oldIndicator = catalogListContainer.querySelector('.catalog-end-indicator');
        if (oldIndicator) oldIndicator.remove();

        const currentCount = catalogListContainer.querySelectorAll('.catalog-row').length;
        if (currentCount >= currentFilteredProducts.length && currentFilteredProducts.length > 0) {
            const endIndicator = document.createElement('div');
            endIndicator.className = 'catalog-end-indicator';
            endIndicator.style.cssText = 'text-align:center; padding:1.5rem 0 3rem 0; color:var(--text-muted); font-size:0.85rem; font-weight:600; width:100%; grid-column:1 / -1;';
            endIndicator.textContent = `✨ Llegaste al final del catálogo (${currentFilteredProducts.length} productos)`;
            catalogListContainer.appendChild(endIndicator);
        }
    }

    function setViewMode(mode) {
        currentViewMode = mode === 'cards' ? 'cards' : 'list';
        safeSetStorage(VIEW_STORAGE_KEY, currentViewMode);
        if (catalogListContainer) {
            catalogListContainer.classList.toggle('view-cards', currentViewMode === 'cards');
        }
        const btnList = document.getElementById('btn-view-list');
        const btnCards = document.getElementById('btn-view-cards');
        if (btnList) btnList.classList.toggle('active', currentViewMode === 'list');
        if (btnCards) btnCards.classList.toggle('active', currentViewMode === 'cards');
    }

    function updateCatalogUrl(categoryId, options = {}) {
        if (window.innerWidth < 900 || options.updateUrl === false) return;

        const basePath = window.location.pathname.replace(/\/index\.html$/, '/');
        const source = getSourceCategories();

        let targetUrl = `${basePath}?view=catalogo`;
        let targetTitle = 'Catálogo | LA TARIMA - Decoración';
        const stateObj = { viewId: 'view-catalogo' };

        if (categoryId && categoryId !== 'all') {
            const catObj = source.find(c => c && c.id === categoryId);
            targetUrl = `${basePath}?cat=${encodeURIComponent(categoryId)}`;
            targetTitle = (catObj && catObj.name) ? `${catObj.name} | LA TARIMA - Decoración` : targetTitle;
            stateObj.categoryId = categoryId;
            if (window.btnShareHeader) {
                window.btnShareHeader.setAttribute('data-category-id', categoryId);
                window.btnShareHeader.setAttribute('data-category-name', (catObj && catObj.name) || 'Categoría');
            }
        } else if (window.btnShareHeader) {
            window.btnShareHeader.removeAttribute('data-category-id');
            window.btnShareHeader.removeAttribute('data-category-name');
        }

        document.title = targetTitle;

        const currentRel = window.location.pathname.replace(/\/index\.html$/, '/') + window.location.search;
        if (currentRel !== targetUrl) {
            if (options.isBack || options.replaceState) {
                window.history.replaceState(stateObj, targetTitle, targetUrl);
            } else {
                window.history.pushState(stateObj, targetTitle, targetUrl);
            }
        }
    }

    function handleInfiniteScroll() {
        const viewEl = document.getElementById('view-catalogo');
        if (viewEl && !viewEl.classList.contains('active')) return;
        if (itemsToShow >= currentFilteredProducts.length) return;

        const threshold = 800;
        const appContainer = document.getElementById('app-container');
        let nearBottom = false;

        if (appContainer && appContainer.scrollHeight > appContainer.clientHeight + 20) {
            nearBottom = (appContainer.scrollHeight - appContainer.scrollTop - appContainer.clientHeight) < threshold;
        } else if (viewEl && viewEl.scrollHeight > viewEl.clientHeight + 20) {
            nearBottom = (viewEl.scrollHeight - viewEl.scrollTop - viewEl.clientHeight) < threshold;
        } else {
            const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
            const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
            const clientHeight = window.innerHeight || document.documentElement.clientHeight;
            nearBottom = (scrollHeight - scrollTop - clientHeight) < threshold;
        }

        if (nearBottom) {
            itemsToShow += BATCH_SIZE;
            renderCatalogList(currentFilteredProducts, true);
        }
    }

    function attachScrollListeners() {
        if (scrollListenersAttached) return;
        scrollListenersAttached = true;
        window.addEventListener('scroll', handleInfiniteScroll, { passive: true });
        document.addEventListener('scroll', handleInfiniteScroll, { passive: true });
        const appContainer = document.getElementById('app-container');
        if (appContainer) appContainer.addEventListener('scroll', handleInfiniteScroll, { passive: true });
        const viewEl = document.getElementById('view-catalogo');
        if (viewEl) viewEl.addEventListener('scroll', handleInfiniteScroll, { passive: true });
    }

    function syncSearchFromInput() {
        const searchInput = document.getElementById('search-input');
        currentSearchQuery = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
    }

    function clearAllFilters() {
        activeCategoryId = 'all';
        activeSubcategory = null;
        currentSearchQuery = '';
        const searchInput = document.getElementById('search-input');
        const btnClearSearch = document.getElementById('btn-clear-search');
        if (searchInput) searchInput.value = '';
        if (btnClearSearch) btnClearSearch.style.display = 'none';
        updateCatalogUrl('all', { updateUrl: true });
        applyAllFiltersAndSort();
    }

    // --- API PÚBLICA ---
    function mount(targetEl) {
        const target = targetEl || document.getElementById('catalog-view-root');
        if (!target) return false;

        if (isMounted && rootEl === target && document.getElementById('catalog-list')) {
            return true;
        }

        rootEl = target;
        rootEl.innerHTML = `
            <div class="catalog-container">
                <div id="catalog-rubros-tabs-container" class="rubros-tabs-bar"></div>
                <div id="catalog-subcategories-bar" class="catalog-subcategories-bar" style="display: none;"></div>
                <div class="catalog-toolbar" id="catalog-toolbar">
                    <div class="catalog-toolbar-left">
                        <span class="catalog-results-count" id="catalog-results-count">Cargando catálogo...</span>
                    </div>
                    <div class="catalog-toolbar-controls">
                        <div class="catalog-sort-wrapper">
                            <span class="material-symbols-outlined catalog-sort-icon">sort</span>
                            <select id="catalog-sort-select" class="catalog-sort-select" title="Ordenar productos">
                                <option value="az">Nombre: A - Z</option>
                                <option value="za">Nombre: Z - A</option>
                                <option value="price-asc">Menor precio</option>
                                <option value="price-desc">Mayor precio</option>
                            </select>
                        </div>
                        <div class="catalog-view-toggle" role="group" aria-label="Modo de visualización">
                            <button type="button" class="catalog-view-btn" id="btn-view-list" data-mode="list" title="Ver en Lista">
                                <span class="material-symbols-outlined">view_list</span>
                                <span class="catalog-view-btn-label">Lista</span>
                            </button>
                            <button type="button" class="catalog-view-btn" id="btn-view-cards" data-mode="cards" title="Ver en Tarjetas">
                                <span class="material-symbols-outlined">grid_view</span>
                                <span class="catalog-view-btn-label">Tarjetas</span>
                            </button>
                        </div>
                    </div>
                </div>
                <main id="catalog-list" class="catalog-list"></main>
                <div id="catalog-empty-state" class="catalog-empty-state" style="display: none;">
                    <span class="material-symbols-outlined">search_off</span>
                    <h3>No encontramos coincidencias</h3>
                    <p>Intentá buscando con otra palabra clave o limpiando los filtros activos.</p>
                    <button type="button" id="catalog-clear-filters-btn" class="catalog-empty-clear-btn" style="display: none;">Limpiar filtros</button>
                </div>
            </div>
        `;

        catalogListContainer = document.getElementById('catalog-list');
        emptyState = document.getElementById('catalog-empty-state');

        document.getElementById('btn-view-list')?.addEventListener('click', () => setViewMode('list'));
        document.getElementById('btn-view-cards')?.addEventListener('click', () => setViewMode('cards'));

        const sortSelect = document.getElementById('catalog-sort-select');
        if (sortSelect) {
            sortSelect.value = currentSortMode;
            sortSelect.addEventListener('change', (e) => {
                currentSortMode = e.target.value || 'az';
                safeSetStorage(SORT_STORAGE_KEY, currentSortMode);
                applyAllFiltersAndSort();
            });
        }

        document.getElementById('catalog-clear-filters-btn')?.addEventListener('click', clearAllFilters);

        setViewMode(currentViewMode);
        attachScrollListeners();
        isMounted = true;
        return true;
    }

    function setCategory(categoryId, options = {}) {
        if (!mount()) return;

        let targetCatId = categoryId || 'all';
        const source = getSourceCategories();

        if (targetCatId !== 'all' && targetCatId.endsWith('-todos')) {
            const rubroFromTodos = targetCatId.replace('-todos', '');
            if (rubroFromTodos) activeCatalogRubro = rubroFromTodos;
            targetCatId = 'all';
        } else if (targetCatId !== 'all') {
            const foundCat = source.find(c => c && c.id === targetCatId);
            if (foundCat && foundCat.rubro && foundCat.rubro !== activeCatalogRubro) {
                activeCatalogRubro = foundCat.rubro;
            }
        }

        activeCategoryId = targetCatId;
        activeSubcategory = options.subcategory || null;

        loadProducts();
        renderCatalogRubrosTabs();
        ensureValidCategorySelection();
        updateCatalogUrl(activeCategoryId, options);
        applyAllFiltersAndSort();
    }

    function refresh(options = {}) {
        if (!mount()) return;

        if (options.rubro) {
            activeCatalogRubro = options.rubro;
        }
        if (options.categoryId !== undefined) {
            return setCategory(options.categoryId, options);
        }
        if (options.subcategory !== undefined) {
            activeSubcategory = options.subcategory;
        }
        if (options.query !== undefined) {
            currentSearchQuery = String(options.query || '');
        } else if (!options.skipSearchSync) {
            syncSearchFromInput();
        }

        loadProducts();
        renderCatalogRubrosTabs();
        ensureValidCategorySelection();
        applyAllFiltersAndSort();
    }

    function filter(query) {
        if (!mount()) return;
        if (query !== undefined && query !== null) {
            currentSearchQuery = String(query);
        } else {
            syncSearchFromInput();
        }
        applyAllFiltersAndSort();
    }

    function getState() {
        return {
            mounted: isMounted,
            activeRubro: activeCatalogRubro,
            activeCategoryId,
            activeSubcategory,
            searchQuery: currentSearchQuery,
            sortMode: currentSortMode,
            viewMode: currentViewMode,
            totalResults: currentFilteredProducts.length
        };
    }

    window.CatalogNative = {
        mount,
        refresh,
        filter,
        setCategory,
        getState
    };

    const autoInit = () => {
        if (document.getElementById('catalog-view-root')) {
            refresh({ skipSearchSync: false });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
})();
