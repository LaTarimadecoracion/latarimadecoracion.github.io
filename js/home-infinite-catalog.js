// js/modules/home-infinite-catalog.js
// --- MÓDULO AUTÓNOMO DE CATÁLOGO COMPLETO INFINITO EN EL INICIO ---
// 100% Modular: De entrada no carga ni muestra productos.
// Al bajar hasta el final de la página de Inicio, el cliente puede presionar el botón
// para abrir el catálogo completo, y a partir de ahí va cargando fila por fila a medida que sigue bajando.

(function() {
    'use strict';

    let activeObserver = null;

    function cleanupObservers() {
        if (activeObserver) {
            try { activeObserver.disconnect(); } catch (e) {}
            activeObserver = null;
        }
    }

    function getColumnsPerRow() {
        const w = window.innerWidth;
        if (w >= 1200) return 4;
        if (w >= 900) return 3;
        return 2;
    }

    function collectCatalogProducts(rubroFilter = 'all') {
        const sourceData = (typeof window.sessionProducts !== 'undefined' && Array.isArray(window.sessionProducts) && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : ((typeof productsData !== 'undefined' && Array.isArray(productsData)) ? productsData : []);

        const allItems = [];
        const seenIds = new Set();

        // Ordenar categorías por orden o A-Z
        const sortedCats = [...sourceData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        sortedCats.forEach(cat => {
            if (!cat || cat.visible === false || cat.id === 'Borrador' || String(cat.id).endsWith('-todos')) return;

            const catRubro = (cat.rubro || 'carpinteria').toLowerCase();
            if (rubroFilter !== 'all' && catRubro !== rubroFilter.toLowerCase()) return;

            if (Array.isArray(cat.products)) {
                cat.products.forEach(product => {
                    if (!product || product.visible === false || product.primaryCatId === 'Borrador') return;
                    const pid = String(product.id).trim();
                    if (!seenIds.has(pid)) {
                        seenIds.add(pid);
                        allItems.push({
                            product,
                            catName: cat.name || 'Carpintería',
                            catId: cat.id,
                            rubro: catRubro
                        });
                    }
                });
            }
        });

        // También revisar categorías '-todos' por si hay algún producto de respaldo que no esté en otra categoría
        sortedCats.forEach(cat => {
            if (!cat || cat.visible === false || !String(cat.id).endsWith('-todos')) return;
            const catRubro = (cat.rubro || 'carpinteria').toLowerCase();
            if (rubroFilter !== 'all' && catRubro !== rubroFilter.toLowerCase()) return;

            if (Array.isArray(cat.products)) {
                cat.products.forEach(product => {
                    if (!product || product.visible === false || product.primaryCatId === 'Borrador') return;
                    const pid = String(product.id).trim();
                    if (!seenIds.has(pid)) {
                        seenIds.add(pid);
                        allItems.push({
                            product,
                            catName: cat.name || 'Catálogo',
                            catId: cat.id,
                            rubro: catRubro
                        });
                    }
                });
            }
        });

        return allItems;
    }

    function createFallbackCard(product, catName) {
        const card = document.createElement('div');
        card.className = 'feed-card';
        const coverImg = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
        const safeTitle = (product.title || '').replace(/"/g, '&quot;');
        const priceHtml = (typeof window.getProductPriceDisplay === 'function')
            ? window.getProductPriceDisplay(product)
            : '';

        card.innerHTML = `
            <div class="feed-card-photo-container">
                <img src="${coverImg}" class="feed-card-img lazy-img" alt="${safeTitle}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded'); this.onerror=null; this.src='img/logo_provisional.png';">
            </div>
            <div class="feed-card-info">
                <div class="feed-card-title-container">
                    <h3 class="feed-card-title" title="${safeTitle}">${product.title}</h3>
                </div>
                <div class="feed-card-price-row">${priceHtml}</div>
            </div>
        `;
        card.addEventListener('click', () => {
            if (window.showProductDetail) {
                window.showProductDetail(product, catName);
            }
        });
        return card;
    }

    function initHomeInfiniteCatalog(homeContentEl) {
        const targetContainer = homeContentEl || document.querySelector('#view-home .home-content');
        if (!targetContainer) return;

        cleanupObservers();

        // Remover instancia previa si existiera
        const existing = targetContainer.querySelector('#home-infinite-catalog-section');
        if (existing) existing.remove();

        const totalAllProducts = collectCatalogProducts('all');
        if (totalAllProducts.length === 0) return;

        // Estado interno de esta sesión de Home
        let isOpened = false;
        let activeRubro = 'all';
        let currentItems = totalAllProducts;
        let currentIndex = 0;

        // Crear sección contenedora modular
        const sectionEl = document.createElement('section');
        sectionEl.id = 'home-infinite-catalog-section';
        sectionEl.className = 'home-section full-width home-infinite-catalog-section';

        // Obtener rubros visibles si hay más de 1
        const rubrosList = (window.rubros && Array.isArray(window.rubros))
            ? window.rubros.filter(r => r.visible !== false)
            : [];

        sectionEl.innerHTML = `
            <!-- Bloque Disparador (Cerrado de entrada — se abre al presionar el botón) -->
            <div id="home-catalog-trigger-box" class="home-catalog-trigger-box">
                <div class="home-catalog-divider">
                    <span class="home-catalog-divider-line"></span>
                    <span class="home-catalog-divider-badge">CATÁLOGO COMPLETO (${totalAllProducts.length} MODELOS)</span>
                    <span class="home-catalog-divider-line"></span>
                </div>
                <button type="button" id="btn-open-home-catalog" class="home-catalog-open-btn">
                    <div class="home-catalog-open-btn-left">
                        <span class="material-symbols-outlined home-catalog-open-icon">grid_view</span>
                        <div class="home-catalog-open-texts">
                            <span class="home-catalog-open-title">Ver Catálogo Completo</span>
                            <span class="home-catalog-open-subtitle">Presioná acá para desplegar todos nuestros productos</span>
                        </div>
                    </div>
                    <span class="material-symbols-outlined home-catalog-chevron">keyboard_double_arrow_down</span>
                </button>
            </div>

            <!-- Contenedor Desplegable del Catálogo (Oculto hasta presionar el botón) -->
            <div id="home-catalog-expanded-area" class="home-catalog-expanded-area" style="display: none;">
                <div class="section-header-premium home-catalog-header">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: var(--primary-color, #c0510a); font-size: 1.5rem;">inventory_2</span>
                            <div>
                                <h2 class="section-title" style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin: 0; padding: 0;">Catálogo Completo</h2>
                                <p id="home-catalog-counter-subtitle" class="section-subtitle" style="font-size: 0.78rem; color: var(--text-muted); margin: 2px 0 0 0; padding: 0;">Mostrando todos nuestros modelos (${totalAllProducts.length})</p>
                            </div>
                        </div>
                    </div>
                    <div id="home-catalog-rubro-pills" class="novedades-rubros-pills" style="display: ${rubrosList.length > 1 ? 'flex' : 'none'}; gap: 6px; margin-top: 8px; flex-wrap: nowrap; align-items: center; overflow-x: auto; width: 100%;"></div>
                </div>

                <!-- Grilla donde se inyectan los productos fila por fila -->
                <div id="home-infinite-catalog-grid" class="category-feed-list home-infinite-catalog-grid"></div>

                <!-- Centinela inferior para cargar la siguiente fila al hacer scroll -->
                <div id="home-infinite-catalog-sentinel" class="home-infinite-catalog-sentinel">
                    <div id="home-infinite-loader" class="home-infinite-loader">
                        <span class="material-symbols-outlined home-infinite-spinner">autorenew</span>
                        <span>Cargando más productos...</span>
                    </div>
                </div>
            </div>
        `;

        targetContainer.appendChild(sectionEl);

        const triggerBox = sectionEl.querySelector('#home-catalog-trigger-box');
        const btnOpen = sectionEl.querySelector('#btn-open-home-catalog');
        const expandedArea = sectionEl.querySelector('#home-catalog-expanded-area');
        const pillsContainer = sectionEl.querySelector('#home-catalog-rubro-pills');
        const counterSubtitle = sectionEl.querySelector('#home-catalog-counter-subtitle');
        const gridEl = sectionEl.querySelector('#home-infinite-catalog-grid');
        const sentinelEl = sectionEl.querySelector('#home-infinite-catalog-sentinel');
        const loaderEl = sectionEl.querySelector('#home-infinite-loader');

        // Renderizar píldoras de filtro por rubro si hay más de 1 rubro
        function renderRubroPills() {
            if (!pillsContainer || rubrosList.length <= 1) return;
            const allOptions = [{ id: 'all', name: 'Todos', icon: '✨' }, ...rubrosList];
            pillsContainer.innerHTML = allOptions.map(r => {
                const isSelected = r.id === activeRubro;
                const bg = isSelected ? '#16a34a' : '#f1f5f9';
                const color = isSelected ? '#ffffff' : '#475569';
                const border = isSelected ? '#16a34a' : '#e2e8f0';
                return `
                    <button type="button" class="novedades-rubro-pill" data-rubro="${r.id}" style="background: ${bg}; color: ${color}; border: 1px solid ${border}; box-shadow: ${isSelected ? '0 2px 6px rgba(22, 163, 74, 0.25)' : 'none'}; width: auto !important; flex: 0 0 auto !important;">
                        ${r.icon ? `<span>${r.icon}</span>` : ''}
                        <span>${r.name}</span>
                    </button>
                `;
            }).join('');

            pillsContainer.querySelectorAll('.novedades-rubro-pill').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sel = btn.dataset.rubro;
                    if (sel && sel !== activeRubro) {
                        activeRubro = sel;
                        renderRubroPills();
                        resetAndLoadFirstRows();
                    }
                });
            });
        }

        // Cargar N filas de productos (por defecto 1 fila = 2 en celu, 3 en tablet/PC, 4 en monitor grande)
        function appendNextRows(rowsCount = 1) {
            if (!gridEl || currentIndex >= currentItems.length) {
                if (loaderEl) loaderEl.style.display = 'none';
                return;
            }

            const cols = getColumnsPerRow();
            const itemsToLoad = cols * rowsCount;
            const slice = currentItems.slice(currentIndex, currentIndex + itemsToLoad);
            currentIndex += slice.length;

            const fragment = document.createDocumentFragment();
            slice.forEach((item, idx) => {
                const { product, catName } = item;
                let card;
                if (typeof window.createFeedProductCard === 'function') {
                    card = window.createFeedProductCard(product, {
                        catName: catName || '',
                        extraClass: 'home-catalog-row-item'
                    });
                } else {
                    card = createFallbackCard(product, catName || '');
                    card.classList.add('home-catalog-row-item');
                }
                // Animación suave de entrada por fila
                card.style.animationDelay = `${(idx % cols) * 45}ms`;
                fragment.appendChild(card);
            });

            gridEl.appendChild(fragment);

            if (currentIndex >= currentItems.length) {
                if (loaderEl) {
                    loaderEl.innerHTML = `<span style="color: #64748b; font-size: 0.8rem; font-weight: 600;">✨ Viste los ${currentItems.length} productos del catálogo</span>`;
                }
            } else {
                if (loaderEl) {
                    loaderEl.style.display = 'flex';
                }
            }
        }

        function resetAndLoadFirstRows() {
            currentItems = collectCatalogProducts(activeRubro);
            currentIndex = 0;
            if (gridEl) gridEl.innerHTML = '';
            if (counterSubtitle) {
                counterSubtitle.textContent = `Mostrando ${currentItems.length} modelos disponibles`;
            }
            if (loaderEl) {
                loaderEl.style.display = 'flex';
                loaderEl.innerHTML = `
                    <span class="material-symbols-outlined home-infinite-spinner">autorenew</span>
                    <span>Cargando más productos...</span>
                `;
            }
            // Al abrir, cargamos las primeras 2 filas para que ya tenga contenido visible inmediato y el resto cargue fila a fila al bajar
            appendNextRows(2);
        }

        function setupRowByRowObserver() {
            if (activeObserver) activeObserver.disconnect();
            const appContainer = document.getElementById('app-container');

            activeObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && isOpened && currentIndex < currentItems.length) {
                        appendNextRows(1); // Carga exactamente 1 fila adicional a medida que sigue bajando
                    }
                });
            }, {
                root: appContainer || null,
                rootMargin: '180px 0px',
                threshold: 0.01
            });

            if (sentinelEl) {
                activeObserver.observe(sentinelEl);
            }
        }

        function openCatalog() {
            if (isOpened) return;
            const homeView = document.getElementById('view-home');
            if (!homeView || !homeView.classList.contains('active')) return;

            isOpened = true;
            if (triggerBox) triggerBox.style.display = 'none';
            if (expandedArea) expandedArea.style.display = 'block';

            renderRubroPills();
            resetAndLoadFirstRows();
            setupRowByRowObserver();
        }

        // Apertura exclusivamente cuando el cliente presiona el botón
        if (btnOpen) {
            btnOpen.addEventListener('click', (e) => {
                e.preventDefault();
                openCatalog();
            });
        }
    }

    window.initHomeInfiniteCatalog = window.safeRender
        ? window.safeRender(initHomeInfiniteCatalog, 'initHomeInfiniteCatalog')
        : initHomeInfiniteCatalog;
})();
