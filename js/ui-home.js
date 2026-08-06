    function setupInfiniteCarousel(containerEl, itemsArray, renderItemFunc) {
        if (!itemsArray || itemsArray.length === 0) return false;
        
        // Limpiamos el contenedor para evitar duplicados residuales
        containerEl.innerHTML = '';

        // En lugar de triplicar y forzar saltos (lo cual causa flickering grave en celulares
        // por conflicto con el momentum scrolling nativo), usamos una lista nativa simple.
        const fragment = document.createDocumentFragment();
        itemsArray.forEach(item => {
            fragment.appendChild(renderItemFunc(item));
        });
        containerEl.appendChild(fragment);

        return true;
    }

    function renderSectionContent(sectionId, containerEl, customStack = null) {
        if (!containerEl) return;
        
        const stack = customStack || window.contentRegistry[sectionId];
        if (!stack || stack.length === 0) {
            return false; // Indicates empty stack
        }

        containerEl.innerHTML = '';


        stack.forEach(comp => {
            if (comp.type === 'banner' && comp.image) {
                const banner = document.createElement('div');
                banner.className = 'promo-banner';
                banner.style.cssText = `
                    position: relative;
                    width: 100%;
                    height: 180px;
                    background-image: url('${comp.image}');
                    background-size: cover;
                    background-position: center;
                    border-radius: var(--radius-md);
                    margin-bottom: 1.25rem;
                    cursor: ${comp.link ? 'pointer' : 'default'};
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                `;
                if (comp.link) {
                    banner.addEventListener('click', () => {
                        window.open(comp.link, '_blank');
                    });
                }
                containerEl.appendChild(banner);

            } else if (comp.type === 'product' && comp.productId) {
                // Buscar en window.sessionProducts primero (datos enriquecidos), luego en productsData
                const res = findProductById(comp.productId);
                if (res) {
                    const { product, catName } = res;
                    const card = document.createElement('div');
                    card.className = 'feed-card';
                    card.style.cssText = 'margin-bottom: 1.25rem; position: relative;';
                    // Resolver imagen: puede ser array (variantes) o string directo
                    const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                    const badgeText = comp.badge || 'Destacado';
                    
                    let catObj = null;
                    if (product.primaryCatId && typeof window.sessionProducts !== 'undefined') {
                        catObj = window.sessionProducts.find(c => c.id === product.primaryCatId);
                    }
                    if (!catObj && typeof window.sessionProducts !== 'undefined' && catName) {
                        catObj = window.sessionProducts.find(c => c.name.toLowerCase() === catName.toLowerCase());
                    }
                    const catId = catObj ? catObj.id : (product.primaryCatId || '');

                    card.innerHTML = `
                        <div class="feed-card-photo-container">
                            <div class="feed-card-img-wrapper" style="position:relative;">
                                <img src="${productCover}" class="feed-card-img lazy-img" alt="${product.title}" loading="lazy" onload="this.classList.add('loaded')">
                            </div>
                            <div class="feed-card-gradient"></div>
                            <div class="feed-card-info">
                                <span class="feed-card-cat" ${catId ? `data-category-id="${catId}"` : ''}>${catName}</span>
                                <h3 class="feed-card-title">${product.title}</h3>
                            </div>
                            <span class="feed-card-variants-badge" style="background: var(--primary-color, #c0510a); color: white; border: none; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; font-size: 0.72rem; padding: 0.3rem 0.75rem; border-radius: 50px; box-shadow: 0 2px 8px rgba(0,0,0,0.25);">
                                ${badgeText}
                            </span>
                        </div>
                    `;
                    card.addEventListener('click', () => {
                        showProductDetail(product, catName);
                    });
                    containerEl.appendChild(card);
                } else {
                    // Producto no encontrado — mostrar card de placeholder
                    const placeholder = document.createElement('div');
                    placeholder.style.cssText = `padding: 1rem; background: #fff8f0; border: 1.5px dashed #f5c299; border-radius: var(--radius-md); margin-bottom: 1.25rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;`;
                    placeholder.innerHTML = `<span class="material-symbols-outlined" style="display:block; font-size:24px; margin-bottom:0.25rem; opacity:0.4;">image_not_supported</span>Producto no disponible (ID: ${comp.productId})`;
                    containerEl.appendChild(placeholder);
                }

            } else if (comp.type === 'video' && comp.url) {
                const ytId = extractYouTubeId(comp.url);
                if (ytId) {
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = `
                        position: relative;
                        width: 100%;
                        height: 200px;
                        border-radius: var(--radius-md);
                        overflow: hidden;
                        margin-bottom: 1.25rem;
                        box-shadow: var(--shadow-sm);
                    `;
                    wrapper.innerHTML = `
                        <iframe
                            src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0"
                            allow="autoplay; encrypted-media"
                            allowfullscreen
                            style="width: 100%; height: 100%; border: none;"
                        ></iframe>
                        <div style="position: absolute; top:0; left:0; width:100%; height:100%; background:transparent; z-index:10;"></div>
                    `;
                    containerEl.appendChild(wrapper);
                }
            }
        });

        return true; // Indicates successfully rendered stack
    }



    window.loadProductViews = async function() {
        let globalViews = {};
        
        // 1. Intentar cargar del servidor
        try {
            const res = await fetch('/api/views');
            if (res.ok) {
                globalViews = await res.json();
            }
        } catch (e) {
            console.warn('[Tracking] No se pudieron cargar las vistas globales del servidor:', e);
        }
        
        // 2. Intentar cargar de LocalStorage como respaldo
        let localViews = {};
        try {
            const data = localStorage.getItem('product_views');
            if (data) {
                localViews = JSON.parse(data);
            }
        } catch (e) {
            console.error('[Tracking] Error leyendo product_views de LocalStorage:', e);
        }
        
        // 3. Unificar las vistas en window.sessionProducts y productsData
        const mergeViews = (productsArray) => {
            if (!productsArray || !Array.isArray(productsArray)) return;
            productsArray.forEach(cat => {
                if (cat.products && Array.isArray(cat.products)) {
                    cat.products.forEach(p => {
                        const serverVal = globalViews[p.id] || 0;
                        const localVal = localViews[p.id] || 0;
                        p.views = Math.max(serverVal, localVal);
                    });
                }
            });
        };
        
        if (window.sessionProducts) mergeViews(window.sessionProducts);
        if (window.productsData) mergeViews(window.productsData);
    };



    window.trackProductView = async function(productId) {
        if (!productId) return;

        // 1. Incrementar en memoria local
        try {
            const incrementLocal = (productsArray) => {
                if (!productsArray || !Array.isArray(productsArray)) return;
                for (const cat of productsArray) {
                    if (cat.products && Array.isArray(cat.products)) {
                        const p = cat.products.find(prod => prod.id === productId);
                        if (p) {
                            p.views = (p.views || 0) + 1;
                            return true;
                        }
                    }
                }
                return false;
            };
            incrementLocal(window.sessionProducts);
            incrementLocal(window.productsData);
        } catch (e) {
            console.error('[Tracking] Error incrementando contador en memoria:', e);
        }

        // 2. Incrementar en LocalStorage
        try {
            const localViews = localStorage.getItem('product_views') ? JSON.parse(localStorage.getItem('product_views')) : {};
            localViews[productId] = (localViews[productId] || 0) + 1;
            localStorage.setItem('product_views', JSON.stringify(localViews));
        } catch (e) {
            console.error('[Tracking] Error guardando vista en LocalStorage:', e);
        }

        // 3. Intentar actualizar en servidor
        try {
            await fetch('/api/products/view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });
        } catch (e) {
            console.warn('[Tracking] No se pudo conectar al servidor para registrar la vista:', e);
        }

        // 4. Registrar vista en Google Analytics
        if (typeof gtag === 'function') {
            gtag('event', 'view_item', {
                currency: 'ARS',
                items: [{
                    item_id: productId,
                    item_name: productId
                }]
            });
        }
    };



    function renderHome() {
        const homeContent = document.querySelector('#view-home .home-content');
        if (!homeContent) return;

        // Sincronizar orden antes de dibujar
        if (window.syncHomeOrder) window.syncHomeOrder();

        homeContent.style.padding = '0 0 2rem 0';
        homeContent.innerHTML = ''; // Limpiar contenido previo para inyección limpia ordenada

        // Garantizar que homeConfig esté disponible
        if (typeof homeConfig === 'undefined' || !homeConfig.order) {
            window.homeConfig = {
                order: ['categorias', 'novedades', 'buscados'],
                sections: {
                    categorias: { title: "Categorías", subtitle: "Nuestras líneas de productos", icon: "grid_view" },
                    novedades: { title: "Nuevos Diseños 2026", subtitle: "Novedades del taller", icon: "celebration" },
                    buscados: { title: "Los más buscados", subtitle: "Los preferidos de nuestros clientes", icon: "star" }
                }
            };
        }

        homeConfig.order.forEach(sectionId => {
            try {
                if (sectionId.startsWith('comp-')) {
                    // Componentes dinámicos del View Builder (renderizados individualmente)
                    const homeStack = (typeof window.contentRegistry !== 'undefined' && window.contentRegistry.home) ? window.contentRegistry.home : [];
                    const comp = homeStack.find(c => c.id === sectionId);
                    
                    if (comp) {
                        const sectionEl = document.createElement('section');
                        sectionEl.className = `home-section full-width section-dynamic`;
                        sectionEl.style.cssText = 'margin-bottom: 0.75rem; padding: 0 1.25rem;';
                        homeContent.appendChild(sectionEl);

                        if (window.renderSectionContent) {
                            window.renderSectionContent('home', sectionEl, [comp]);
                        }
                    }
                    return; // Continuar con la siguiente sección
                }

                const config = homeConfig.sections[sectionId] || { title: sectionId, subtitle: '', icon: 'folder' };
                
                // Crear el contenedor de la sección
                const sectionEl = document.createElement('section');
                sectionEl.className = `home-section full-width section-${sectionId}`;
                sectionEl.style.cssText = 'margin-bottom: 0.75rem;';

                // Determinar título dinámico si es la sección de novedades
                let titleToShow = config.title;
                if (sectionId === 'novedades') {
                    const latestYear = getLatestModificationYear();
                    titleToShow = config.title.replace(/\b\d{4}\b/g, latestYear);
                }

                // Crear cabecera premium de la sección
                const headerEl = document.createElement('div');
                headerEl.className = 'section-header-premium';
                headerEl.style.cssText = 'padding: 0.75rem 1.5rem 0.4rem; display: flex; align-items: center; gap: 8px;';
                headerEl.innerHTML = `
                    <span class="material-symbols-outlined" style="color: var(--primary-color, #c0510a); font-size: 1.5rem; vertical-align: middle;">${config.icon}</span>
                    <div>
                        <h2 class="section-title" style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin: 0; padding:0;">${titleToShow}</h2>
                        ${config.subtitle ? `<p class="section-subtitle" style="font-size: 0.8rem; color: var(--text-muted); margin: 2px 0 0 0; padding:0;">${config.subtitle}</p>` : ''}
                    </div>
                `;
                sectionEl.appendChild(headerEl);

                // Crear contenedor específico para la sección
                const containerEl = document.createElement('div');
                containerEl.style.cssText = 'padding: 0 1.25rem 0.5rem;';

                if (sectionId === 'categorias') {
                    containerEl.id = 'carousel-categories';
                    containerEl.className = 'carousel-categories';
                    sectionEl.appendChild(containerEl);
                    homeContent.appendChild(sectionEl);

                    // Rellenar categorías
                    const sourceData = (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0) ? window.sessionProducts : productsData;
                    if (typeof sourceData !== 'undefined' && sourceData.length > 0) {
                        const targetRubros = config.rubros || (config.rubro && config.rubro !== 'all' ? [config.rubro] : null);
                        const sortedCategories = [...sourceData].sort((a, b) => (a.order || 0) - (b.order || 0));
                        const visibleCategories = sortedCategories.filter(cat => {
                            if (cat.visible === false) return false;
                            
                            // Excluir la categoría virtual de resguardo del carrusel principal de la Home
                            if (cat.id.endsWith('-todos')) return false;

                            // Validar pertenencia de rubro
                            const catRubro = cat.rubro || 'carpinteria';
                            if (targetRubros && !targetRubros.includes(catRubro)) return false;

                            return true;
                        });
                        setupInfiniteCarousel(containerEl, visibleCategories, (cat) => {
                            const catCard = document.createElement('div');
                            catCard.className = 'category-card';
                            const catCover = Array.isArray(cat.image) ? cat.image[0] : (cat.image || 'img/logo_provisional.png');
                            catCard.innerHTML = `
                                <div class="category-card-img-wrapper" style="position:relative;">
                                    <img src="${catCover}" class="category-card-img lazy-img" alt="${cat.name}" loading="lazy" onload="this.classList.add('loaded')">
                                </div>
                                <div class="category-overlay">
                                    <span>${cat.name}</span>
                                </div>
                            `;
                            catCard.addEventListener('click', () => {
                                if (window.navigateToCategoryFeed) window.navigateToCategoryFeed(cat.id);
                            });
                            return catCard;
                        });
                    } else {
                        containerEl.innerHTML = '<p class="text-muted">No hay categorías disponibles.</p>';
                    }

                } else if (sectionId === 'novedades') {
                    containerEl.id = 'home-new-designs-list';
                    containerEl.className = 'carousel-categories';
                    sectionEl.appendChild(containerEl);
                    homeContent.appendChild(sectionEl);

                    // Rellenar novedades
                    const sourceData = (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0) ? window.sessionProducts : productsData;
                    if (typeof sourceData !== 'undefined' && sourceData.length > 0) {
                        let allProducts = [];
                        const seenIds = new Set();
                        
                        const targetRubros = config.rubros || (config.rubro && config.rubro !== 'all' ? [config.rubro] : null);

                        sourceData.forEach(cat => {
                            if (cat.visible === false) return;
                            
                            // Validar rubro de la categoría
                            const catRubro = cat.rubro || 'carpinteria';
                            if (targetRubros && !targetRubros.includes(catRubro)) return;

                            if (cat.products) {
                                cat.products.forEach(product => {
                                    if (product.visible === false) return;
                                    if (!seenIds.has(product.id)) {
                                        seenIds.add(product.id);
                                        const res = findProductById(product.id);
                                        allProducts.push({ product, catName: res ? res.catName : cat.name });
                                    }
                                });
                            }
                        });

                        const limit = config.limit ? parseInt(config.limit, 10) : 5;
                        const latestProducts = [...allProducts]
                            .sort((a, b) => getProductTimestamp(b.product) - getProductTimestamp(a.product))
                            .slice(0, limit);
                        setupInfiniteCarousel(containerEl, latestProducts, ({ product, catName }) => {
                            const card = document.createElement('div');
                            card.className = 'category-card';
                            const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                            card.innerHTML = `
                                <div class="category-card-img-wrapper" style="position:relative;">
                                    <img src="${productCover}" class="category-card-img lazy-img" alt="${product.title}" loading="lazy" onload="this.classList.add('loaded')">
                                </div>
                                <div class="category-overlay">
                                    <span>${product.title}</span>
                                </div>
                            `;
                            card.addEventListener('click', () => {
                                if (window.showProductDetail) window.showProductDetail(product, catName);
                            });
                            return card;
                        });
                    } else {
                        containerEl.innerHTML = '<p class="text-muted">No hay novedades disponibles.</p>';
                    }

                } else if (sectionId === 'buscados') {
                    containerEl.id = 'home-product-list';
                    containerEl.className = 'carousel-categories';
                    sectionEl.appendChild(containerEl);
                    homeContent.appendChild(sectionEl);

                    // Rellenar más buscados
                    const sourceData = (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0) ? window.sessionProducts : productsData;
                    if (typeof sourceData !== 'undefined' && sourceData.length > 0) {
                        let allProducts = [];
                        const seenIds = new Set();
                        
                        const targetRubros = config.rubros || (config.rubro && config.rubro !== 'all' ? [config.rubro] : null);

                        sourceData.forEach(cat => {
                            if (cat.visible === false) return;

                            // Validar rubro de la categoría
                            const catRubro = cat.rubro || 'carpinteria';
                            if (targetRubros && !targetRubros.includes(catRubro)) return;

                            if (cat.products) {
                                cat.products.forEach(product => {
                                    if (product.visible === false) return;
                                    if (!seenIds.has(product.id)) {
                                        seenIds.add(product.id);
                                        const res = findProductById(product.id);
                                        allProducts.push({ product, catName: res ? res.catName : cat.name });
                                    }
                                });
                            }
                        });

                        // Selección aleatoria para mantener el home dinámico (sin base de datos)
                        const limit = config.limit ? parseInt(config.limit, 10) : 8;
                        const randomSelections = [...allProducts]
                            .sort(() => 0.5 - Math.random())
                            .slice(0, limit);
                        setupInfiniteCarousel(containerEl, randomSelections, ({ product, catName }) => {
                            const pCard = document.createElement('div');
                            pCard.className = 'category-card';
                            const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                            pCard.innerHTML = `
                                <div class="category-card-img-wrapper" style="position:relative;">
                                    <img src="${productCover}" class="category-card-img lazy-img" alt="${product.title}" loading="lazy" onload="this.classList.add('loaded')">
                                </div>
                                <div class="category-overlay">
                                    <span>${product.title}</span>
                                </div>
                            `;
                            pCard.addEventListener('click', () => {
                                if (window.showProductDetail) window.showProductDetail(product, catName);
                            });
                            return pCard;
                        });
                    } else {
                        containerEl.innerHTML = '<p class="text-muted">No hay productos disponibles.</p>';
                    }
                }

            } catch (err) {
                console.error(`[Fault Tolerance] Error renderizando sección '${sectionId}':`, err);
            }
        });

        // Re-inicializar drag-to-scroll en todos los carruseles creados
        if (typeof window.enableDragToScroll === 'function') {
            document.querySelectorAll('.carousel-categories').forEach(el => window.enableDragToScroll(el));
        }
    }


window.renderHome = safeRender(renderHome, 'renderHome');


window.renderSectionContent = safeRender(renderSectionContent, 'renderSectionContent');