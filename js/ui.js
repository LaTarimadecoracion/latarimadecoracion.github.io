// js/ui.js
// --- UI MODULE ---

// Interceptor de Degradación Elegante
window.safeRender = function(fn, name) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            console.error(`[Fault Tolerance] Error controlado en '${name}':`, error);
            return false;
        }
    };
};

// Dynamic Bottom Navigation Rendering
    // Global favorites badge updater
    window.updateFavoritesBadge = function() {
        const badgeEl = document.getElementById('fav-badge');
        if (!badgeEl) return;
        
        try {
            const data = localStorage.getItem('cartItems');
            const count = data ? JSON.parse(data).length : 0;
            
            if (count > 0) {
                badgeEl.textContent = count;
                badgeEl.style.display = 'flex';
                
                // Disparar micro-animación pulsante de corazón
                badgeEl.classList.remove('pulse-heart');
                void badgeEl.offsetWidth; // forzar reflow
                badgeEl.classList.add('pulse-heart');
            } else {
                badgeEl.style.display = 'none';
            }
        } catch (e) {
            console.error('[UI Module] Error actualizando badge de favoritos:', e);
        }
    };

    function renderBottomNav() {
        const bottomNav = document.querySelector('.bottom-nav');
        if (!bottomNav) return;

        bottomNav.innerHTML = '';

        const sectionsMapping = [
            { key: 'home', target: 'view-home', id: null },
            { key: 'profile', target: 'view-profile', id: null },
            { key: 'search', target: 'view-search', id: null },
            { key: 'avisos', target: 'view-notifications', id: 'nav-notif-btn' },
            { key: 'nosotros', target: 'view-about', id: null }
        ];

        sectionsMapping.forEach(sec => {
            const config = appConfig[sec.key];
            if (!config || config.visible === false) return;

            const a = document.createElement('a');
            a.href = '#';
            a.className = 'nav-item';
            a.setAttribute('data-target', sec.target);
            if (sec.id) a.id = sec.id;

            // Check if current active view corresponds to this target
            const activeView = Array.from(views).find(v => v.classList.contains('active'));
            if (activeView && activeView.id === sec.target) {
                a.classList.add('active');
            }

            if (sec.key === 'avisos') {
                a.innerHTML = `
                    <div class="icon-wrapper">
                        <span class="material-symbols-outlined">${config.icon}</span>
                        <span class="badge" id="nav-badge"></span>
                    </div>
                `;
            } else if (sec.key === 'profile') {
                a.innerHTML = `
                    <div class="icon-wrapper">
                        <span class="material-symbols-outlined">${config.icon}</span>
                        <span class="cart-fav-badge" id="fav-badge" style="display: none;">0</span>
                    </div>
                `;
            } else {
                a.innerHTML = `
                    <span class="material-symbols-outlined">${config.icon}</span>
                `;
            }

            a.addEventListener('click', (e) => {
                e.preventDefault();
                navigationHistory = [];
                navigateToView(sec.target);
            });

            bottomNav.appendChild(a);
        });

        // Actualizar el estado inicial del badge de favoritos
        if (window.updateFavoritesBadge) window.updateFavoritesBadge();
    }

    // Render navigation dynamic bar
    // renderBottomNav() is orchestrated by main.js

    // Helper to find any product across categories by ID
    function findProductById(prodId) {
        if (!sessionProducts) return null;
        let fallback = null;
        for (const cat of sessionProducts) {
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

    function renderSectionContent(sectionId, containerEl, customStack = null) {
        if (!containerEl) return;
        
        const stack = customStack || contentRegistry[sectionId];
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
                // Buscar en sessionProducts primero (datos enriquecidos), luego en productsData
                const res = findProductById(comp.productId);
                if (res) {
                    const { product, catName } = res;
                    const card = document.createElement('div');
                    card.className = 'feed-card';
                    card.style.cssText = 'margin-bottom: 1.25rem; position: relative;';
                    // Resolver imagen: puede ser array (variantes) o string directo
                    const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                    const badgeText = comp.badge || 'Destacado';
                    
                    card.innerHTML = `
                        <div class="feed-card-photo-container">
                            <img src="${productCover}" class="feed-card-img" alt="${product.title}" loading="lazy" onerror="if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                            <div class="feed-card-gradient"></div>
                            <div class="feed-card-info">
                                <span class="feed-card-cat">${catName}</span>
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

    // Dynamic rendering of the Avisos (Notifications) view
    // Componentes dinámicos vía contentRegistry, luego avisos estáticos por defecto
    function renderAvisosCliente() {
        const notifContainer = document.getElementById('notification-list-container');
        if (!notifContainer) return;

        notifContainer.innerHTML = '';

        // Renderizar componentes del stack de Avisos vía el motor unificado
        const avisosStack = contentRegistry.avisos;
        if (avisosStack && avisosStack.length > 0) {
            avisosStack.forEach(comp => {
                if (comp.type === 'banner' && comp.image) {
                    const banner = document.createElement('div');
                    banner.className = 'promo-banner';
                    banner.style.cssText = `
                        position: relative;
                        width: 100%;
                        height: 140px;
                        background-image: url('${comp.image}');
                        background-size: cover;
                        background-position: center;
                        border-radius: var(--radius-md);
                        margin-bottom: 1rem;
                        cursor: ${comp.link ? 'pointer' : 'default'};
                        overflow: hidden;
                        box-shadow: var(--shadow-sm);
                    `;
                    if (comp.link) {
                        banner.addEventListener('click', () => { window.open(comp.link, '_blank'); });
                    }
                    notifContainer.appendChild(banner);

                } else if (comp.type === 'product' && comp.productId) {
                    const res = findProductById(comp.productId);
                    if (res) {
                        const { product, catName } = res;
                        const card = document.createElement('div');
                        card.className = 'notification-item unread';
                        card.style.cssText = `
                            cursor: pointer;
                            display: flex;
                            gap: 12px;
                            margin-bottom: 1rem;
                            border: 1.5px solid #ffeedb;
                            background: #fffdf9;
                            padding: 1rem;
                            border-radius: var(--radius-md);
                            box-shadow: var(--shadow-sm);
                        `;
                        const productCover = Array.isArray(product.image) ? product.image[0] : product.image;
                        card.innerHTML = `
                            <div style="width: 50px; height: 50px; border-radius: 8px; background-image: url('${productCover}'); background-size: cover; background-position: center; border: 1px solid #ffeedb; flex-shrink: 0;"></div>
                            <div style="flex:1;">
                                <h4 style="color: #c0510a; font-size: 0.95rem; margin-bottom: 2px; font-weight: 700; display:flex; align-items:center; gap:4px;">
                                    <span class="material-symbols-outlined" style="font-size:16px;">campaign</span>
                                    ${comp.badge || 'Aviso Especial'}
                                </h4>
                                <strong style="font-size:0.9rem; color:var(--text-main);">${product.title}</strong>
                                <p style="font-size:0.8rem; color:var(--text-muted); margin-top: 2px; line-height: 1.4;">${product.description.substring(0, 85)}...</p>
                            </div>
                        `;
                        card.addEventListener('click', () => {
                            showProductDetail(product, catName);
                        });
                        notifContainer.appendChild(card);
                    }

                } else if (comp.type === 'video' && comp.url) {
                    const ytId = extractYouTubeId(comp.url);
                    if (ytId) {
                        const wrapper = document.createElement('div');
                        wrapper.style.cssText = `
                            position: relative;
                            width: 100%;
                            height: 160px;
                            border-radius: var(--radius-md);
                            overflow: hidden;
                            margin-bottom: 1rem;
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
                        notifContainer.appendChild(wrapper);
                    }
                }
            });
        }

        // Incorporar las notificaciones estáticas tradicionales
        const defaultNoticesHTML = `
            <div class="notification-item unread">
                <div class="notif-icon"><span class="material-symbols-outlined">celebration</span></div>
                <div class="notif-text">
                    <h4>¡Nuevo Lanzamiento!</h4>
                    <p>Ya están disponibles los podios reforzados en preventa exclusiva.</p>
                    <span class="notif-time">Hace 2 horas</span>
                </div>
            </div>
            <div class="notification-item">
                <div class="notif-icon"><span class="material-symbols-outlined">local_shipping</span></div>
                <div class="notif-text">
                    <h4>Envíos gratis</h4>
                    <p>Esta semana tenemos envíos gratis en CABA y GBA para compras superiores a $50.000.</p>
                    <span class="notif-time">Hace 2 días</span>
                </div>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = defaultNoticesHTML;
        while (tempDiv.firstChild) {
            notifContainer.appendChild(tempDiv.firstChild);
        }
    }

    function hideAllViews() {
        views.forEach(view => view.classList.remove('active'));
        const currentNavItems = document.querySelectorAll('.nav-item');
        currentNavItems.forEach(nav => nav.classList.remove('active'));
    }

    function navigateToView(viewId, context = null, isBack = false) {
        const currentActiveView = Array.from(views).find(v => v.classList.contains('active'));
        const currentActiveViewId = currentActiveView ? currentActiveView.id : null;

        if (!isBack && currentActiveViewId && currentActiveViewId !== viewId) {
            // Guardar en el historial la vista previa con su contexto anterior
            let previousContext = null;
            if (currentActiveViewId === 'view-product-detail') {
                previousContext = {
                    title: document.getElementById('detail-title')?.textContent,
                    category: document.getElementById('detail-category')?.textContent
                };
            } else if (currentActiveViewId === 'view-category-feed') {
                previousContext = {
                    name: dynamicTitle.textContent
                };
            }
            navigationHistory.push({ viewId: currentActiveViewId, context: previousContext });
        } else if (isBack) {
            // Si es atrás, sacamos el último del historial
            navigationHistory.pop();
        }

        hideAllViews();

        const targetView = document.getElementById(viewId);

        if (targetView) {
            targetView.classList.add('active');
            document.getElementById('app-container').scrollTop = 0;
            
            // Renderizado dinámico condicional al navegar
            if (viewId === 'view-about') {
                renderNosotrosBlocksCliente();
            } else if (viewId === 'view-notifications') {
                renderAvisosCliente();
            } else if (viewId === 'view-admin') {
                currentAdminTab = 'catalog';
                currentAdminPhase = 'categories';
                renderAdminUX();
            }
        }

        // Activar el item del nav correspondiente si aplica
        const matchingNavItem = document.querySelector(`.nav-item[data-target="${viewId}"]`);
        if (matchingNavItem) {
            matchingNavItem.classList.add('active');
        }

        updateHeader(viewId, context);
    }


    // 3. Render Home (Categories and Most Wanted)
    const carouselCategories = document.getElementById('carousel-categories');
    const homeProductList = document.getElementById('home-product-list');

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

        const sourceProducts = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0)
            ? sessionProducts
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
        
        // 3. Unificar las vistas en sessionProducts y productsData
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
                    const homeStack = (typeof contentRegistry !== 'undefined' && contentRegistry.home) ? contentRegistry.home : [];
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
                    const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
                    if (typeof sourceData !== 'undefined' && sourceData.length > 0) {
                        const sortedCategories = [...sourceData].sort((a, b) => (a.order || 0) - (b.order || 0));
                        sortedCategories.forEach(cat => {
                            const catCard = document.createElement('div');
                            catCard.className = 'category-card';
                            const catCover = Array.isArray(cat.image) ? cat.image[0] : (cat.image || 'img/logo_provisional.png');
                            catCard.innerHTML = `
                                <img src="${catCover}" class="category-card-img" alt="${cat.name}" loading="lazy" onerror="if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                                <div class="category-overlay">
                                    <span>${cat.name}</span>
                                </div>
                            `;
                            catCard.addEventListener('click', () => {
                                if (window.navigateToCategoryFeed) window.navigateToCategoryFeed(cat.id);
                            });
                            containerEl.appendChild(catCard);
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
                    const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
                    if (typeof sourceData !== 'undefined' && sourceData.length > 0) {
                        let allProducts = [];
                        const seenIds = new Set();
                        sourceData.forEach(cat => {
                            if (cat.products) {
                                cat.products.forEach(product => {
                                    if (!seenIds.has(product.id)) {
                                        seenIds.add(product.id);
                                        const res = findProductById(product.id);
                                        allProducts.push({ product, catName: res ? res.catName : cat.name });
                                    }
                                });
                            }
                        });

                        const latestProducts = [...allProducts]
                            .sort((a, b) => getProductTimestamp(b.product) - getProductTimestamp(a.product))
                            .slice(0, 5);
                        latestProducts.forEach(({ product, catName }) => {
                            const card = document.createElement('div');
                            card.className = 'category-card';
                            const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                            card.innerHTML = `
                                <img src="${productCover}" class="category-card-img" alt="${product.title}" loading="lazy" onerror="if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                                <div class="category-overlay">
                                    <span>${product.title}</span>
                                </div>
                            `;
                            card.addEventListener('click', () => {
                                if (window.showProductDetail) window.showProductDetail(product, catName);
                            });
                            containerEl.appendChild(card);
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
                    const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
                    if (typeof sourceData !== 'undefined' && sourceData.length > 0) {
                        let allProducts = [];
                        const seenIds = new Set();
                        sourceData.forEach(cat => {
                            if (cat.products) {
                                cat.products.forEach(product => {
                                    if (!seenIds.has(product.id)) {
                                        seenIds.add(product.id);
                                        const res = findProductById(product.id);
                                        allProducts.push({ product, catName: res ? res.catName : cat.name });
                                    }
                                });
                            }
                        });

                        // Ordenar por vistas descendente antes de recortar los top 8
                        const mostWanted = [...allProducts]
                            .sort((a, b) => {
                                const viewsA = a.product.views || 0;
                                const viewsB = b.product.views || 0;
                                return viewsB - viewsA;
                            })
                            .slice(0, 8);
                        mostWanted.forEach(({ product, catName }) => {
                            const pCard = document.createElement('div');
                            pCard.className = 'category-card';
                            const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                            const viewsCount = product.views || 0;
                            pCard.innerHTML = `
                                <img src="${productCover}" class="category-card-img" alt="${product.title}" loading="lazy" onerror="if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                                <div class="category-overlay" style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
                                    <span>${product.title}</span>
                                    ${viewsCount > 0 ? `
                                        <span style="font-size: 0.72rem; opacity: 0.8; font-weight: normal; margin-top: 2px; display: flex; align-items: center; gap: 3px;">
                                            <span class="material-symbols-outlined" style="font-size: 11px; vertical-align: middle;">visibility</span>
                                            ${viewsCount} ${viewsCount === 1 ? 'visita' : 'visitas'}
                                        </span>
                                    ` : ''}
                                </div>
                            `;
                            pCard.addEventListener('click', () => {
                                if (window.showProductDetail) window.showProductDetail(product, catName);
                            });
                            containerEl.appendChild(pCard);
                        });
                    } else {
                        containerEl.innerHTML = '<p class="text-muted">No hay productos disponibles.</p>';
                    }
                }

            } catch (err) {
                console.error(`[Fault Tolerance] Error renderizando sección '${sectionId}':`, err);
            }
        });
    }


    // renderHome() is orchestrated by main.js

    // 4. Detail View
    const viewHome = document.getElementById('view-home');
    const viewDetail = document.getElementById('view-product-detail');
    
    const detailDescription = document.getElementById('detail-description');
    const btnBuyShipping = document.getElementById('btn-buy-shipping');
    const btnBuyPickup = document.getElementById('btn-buy-pickup');

    const detailVariantsContainer = document.getElementById('detail-variants-container');
    const detailVariants = document.getElementById('detail-variants');

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

    function showProductDetail(product, categoryName, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '') {
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

        const attrContainer = document.getElementById('detail-attributes-container');
        const priceDisplay = document.getElementById('detail-price-display');
        const btnShipping = document.getElementById('btn-buy-shipping');
        const btnPickup = document.getElementById('btn-buy-pickup');
        const phone = '5491167007723';

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
                const shareUrl = `${window.location.origin}${window.location.pathname}?p=${product.id}`;
                const shareText = `Mira lo que encontré en La Tarima 😊\n*${product.title}* (${acabado})`;
                
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
                        <img src="${imgUrl}" class="product-detail-img" alt="${product.title}" loading="lazy" onerror="if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
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
                });
            }

            // Initial button update for this group
            updateBuyButton(grupo, defaultIdx);

            // Update Favorites button state
            updateFavState();
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

        navigateToView('view-product-detail', {
            title: product.title,
            category: categoryName
        });
    }

    // 5. Admin Panel Logic
    const viewAdmin = document.getElementById('view-admin');
    const btnCloseAdmin = document.getElementById('btn-close-admin');
    let headerClickCount = 0;
    let headerClickTimer = null;

    window.initAdminShortcut = function() {
        if (window.dynamicTitle) {
            window.dynamicTitle.style.cursor = 'pointer';
            window.dynamicTitle.addEventListener('click', () => {
                // Verificar estrictamente si la vista activa es "view-about"
                const aboutView = document.getElementById('view-about');
                if (aboutView && aboutView.classList.contains('active')) {
                    headerClickCount++;
                    if (headerClickTimer) clearTimeout(headerClickTimer);
                    
                    headerClickTimer = setTimeout(() => {
                        headerClickCount = 0;
                    }, 2500);

                    if (headerClickCount >= 5) {
                        if (window.navigateToView) window.navigateToView('view-admin');
                        headerClickCount = 0;
                        if (headerClickTimer) clearTimeout(headerClickTimer);
                        window.currentAdminPhase = 'categories';
                        if (window.renderAdminUX) window.renderAdminUX();
                    }
                } else {
                    headerClickCount = 0;
                }
            });
        }
    };

    if (btnCloseAdmin) {
        btnCloseAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentAdminTab === 'catalog' && currentAdminPhase === 'products') {
                currentAdminPhase = 'categories';
                renderAdminUX();
            } else {
                // Limpiar historial al salir de admin para evitar comportamientos extraños
                navigationHistory = [];
                navigateToView('view-home');
                renderHome(); // Re-render in case changes were made
            }
        });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MANTENIMIENTO: Limpieza y Conversión WebP
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const btnRunMaintenance = document.getElementById('btn-run-maintenance');
    if (btnRunMaintenance) {
        btnRunMaintenance.addEventListener('click', async () => {
            const confirmMsg = '⚠️ ATENCIÓN: Esta operación:\n\n• Convertirá imágenes .jpg/.png a .webp en disco\n• Eliminará archivos de imagen que no figuren en la base de datos\n• Actualizará products-data.js con las rutas .webp\n\n¿Querés continuar?';
            if (!confirm(confirmMsg)) return;

            const resultPanel   = document.getElementById('maintenance-result');
            const summaryEl     = document.getElementById('maintenance-summary');
            const logEl         = document.getElementById('maintenance-log');

            btnRunMaintenance.disabled    = true;
            btnRunMaintenance.textContent = '⏳ Ejecutando mantenimiento...';

            try {
                const response = await fetch('/api/maintenance/clean-and-convert', { method: 'POST' });
                const data     = await response.json();

                resultPanel.style.display = 'block';
                resultPanel.scrollIntoView({ behavior: 'smooth' });

                if (data.success) {
                    const s = data.summary;
                    summaryEl.innerHTML = `
                        <span style="background:#27ae60; color:white; padding:0.3rem 0.7rem; border-radius:20px; font-size:0.8rem; font-weight:600;">✅ Mantenidas: ${s.imagenes_mantenidas}</span>
                        <span style="background:#2980b9; color:white; padding:0.3rem 0.7rem; border-radius:20px; font-size:0.8rem; font-weight:600;">🔄 Convertidas: ${s.convertidas_a_webp}</span>
                        <span style="background:#c0510a; color:white; padding:0.3rem 0.7rem; border-radius:20px; font-size:0.8rem; font-weight:600;">🗑️ Eliminadas: ${s.huerfanos_eliminados}</span>
                    `;
                    logEl.textContent = data.log.join('\n');
                    // Si se hicieron cambios, recargar products-data.js
                    if (s.convertidas_a_webp > 0 || s.huerfanos_eliminados > 0) {
                        summaryEl.innerHTML += '<br><small style="color:#f0e68c; font-size:0.75rem; margin-top:0.5rem; display:block;">⚡ Recargá el servidor para que los cambios en products-data.js entren en efecto.</small>';
                    }
                } else {
                    summaryEl.innerHTML = `<span style="color:#ff6b6b; font-weight:600;">❌ Error: ${data.error}</span>`;
                    logEl.textContent   = (data.log || []).join('\n');
                }

            } catch (err) {
                resultPanel.style.display = 'block';
                summaryEl.innerHTML = `<span style="color:#ff6b6b;">❌ No se pudo conectar con el servidor: ${err.message}</span>`;
                logEl.textContent   = '';
            } finally {
                btnRunMaintenance.disabled    = false;
                btnRunMaintenance.innerHTML   = '<span class="material-symbols-outlined" style="font-size:1.1rem; vertical-align:middle;">auto_fix_high</span> Ejecutar Limpieza y Conversión WebP';
            }
        });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // GESTIÓN DINÁMICA DE SECCIÓN NOSOTROS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const nosotrosBlocksContainer = document.getElementById('nosotros-blocks-container');
    const adminNosotrosList = document.getElementById('admin-nosotros-list');
    const adminNosotrosModal = document.getElementById('admin-nosotros-modal');
    const btnAddNosotrosBlock = document.getElementById('btn-add-nosotros-block');
    const btnCancelNosotros = document.getElementById('btn-cancel-nosotros');
    const btnSaveNosotrosBlock = document.getElementById('btn-save-nosotros-block');
    const inputNosotrosImage = document.getElementById('admin-nosotros-image');
    const nosotrosImagePreview = document.getElementById('nosotros-image-preview');

    // 1. Guardar localmente
    function saveNosotrosToLocalStorage() {
        localStorage.setItem('sessionNosotros', JSON.stringify(sessionNosotros));
        if (window.syncSiteConfigWithServer) {
            window.syncSiteConfigWithServer();
        }
    }

    // 2. Renderizado Cliente
    function renderNosotrosBlocksCliente() {
        if (!nosotrosBlocksContainer) return;
        nosotrosBlocksContainer.innerHTML = '';

        if (sessionNosotros.length === 0) {
            nosotrosBlocksContainer.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem 0;">No hay bloques de información cargados.</p>';
            return;
        }

        sessionNosotros.forEach((block, idx) => {
            const blockSection = document.createElement('section');
            blockSection.className = 'nosotros-block';

            // ── Generar HTML del bloque de media según tipo ──
            let mediaHtml = '';
            const mType = block.mediaType || (block.image ? 'image' : 'none');

            if (mType === 'image' && block.image) {
                mediaHtml = `
                <div class="block-image-wrapper">
                    <img src="${block.image}" alt="${block.title}" class="nosotros-img">
                </div>`;

            } else if (mType === 'video' && block.videoUrl) {
                const ytId = extractYouTubeId(block.videoUrl);
                if (ytId) {
                    mediaHtml = `
                    <div class="block-video-wrapper">
                        <iframe
                            src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0"
                            allow="autoplay; encrypted-media"
                            allowfullscreen
                            loading="lazy"
                            title="${block.title}"
                        ></iframe>
                        <div class="block-video-shield"></div>
                    </div>`;
                }

            } else if (mType === 'map' && block.mapQuery) {
                const encodedQuery = encodeURIComponent(block.mapQuery);
                const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodedQuery}&output=embed&z=15`;
                const mapsOpenUrl = `https://maps.google.com/maps?q=${encodedQuery}`;
                mediaHtml = `
                <div class="block-map-wrapper">
                    <iframe
                        src="${mapsEmbedUrl}"
                        allowfullscreen
                        loading="lazy"
                        title="${block.mapQuery}"
                    ></iframe>
                    <a href="${mapsOpenUrl}" target="_blank" class="block-map-link" title="Abrir en Google Maps">
                        <span class="block-map-badge">
                            <span class="material-symbols-outlined" style="font-size:1rem;">navigation</span>
                            Cómo llegar
                        </span>
                    </a>
                </div>`;
            }

            const actionButtonHtml = block.linkUrl
                ? `<a href="${block.linkUrl}" target="_blank" class="block-action-btn">${block.linkText || 'Ver más'}</a>`
                : '';

            blockSection.innerHTML = `
                <h2>${block.title}</h2>
                ${mediaHtml}
                <p>${block.description}</p>
                ${actionButtonHtml}
            `;
            nosotrosBlocksContainer.appendChild(blockSection);

            if (idx < sessionNosotros.length - 1) {
                const hr = document.createElement('hr');
                hr.className = 'block-divider';
                nosotrosBlocksContainer.appendChild(hr);
            }
        });
    }

    // Utilitario: extraer ID de YouTube de cualquier formato de URL
    function extractYouTubeId(url) {
        if (!url) return null;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
            /youtube\.com\/shorts\/([\w-]{11})/
        ];
        for (const p of patterns) {
            const m = url.match(p);
            if (m) return m[1];
        }
        return null;
    }

    // 3. Renderizado Lista Admin
    // 3. Renderizado Lista Admin (Compact Cards UI)
    function renderAdminNosotrosList() {
        if (!adminNosotrosList) return;
        adminNosotrosList.innerHTML = '';

        if (sessionNosotros.length === 0) {
            adminNosotrosList.innerHTML = '<p class="text-muted" style="padding: 1rem 0;">No hay bloques cargados.</p>';
            return;
        }

        sessionNosotros.forEach((block, idx) => {
            const card = document.createElement('div');
            card.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.75rem 1rem;
                background: white;
                border-radius: var(--radius-md);
                border: 1.5px solid #E8ECF0;
                margin-bottom: 0.6rem;
                gap: 1rem;
                box-shadow: var(--shadow-sm);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;

            // Miniatura de la imagen (WebP o placeholder/icono según tipo)
            let thumbHtml = '';
            const mType = block.mediaType || (block.image ? 'image' : 'none');
            if (mType === 'image' && block.image) {
                thumbHtml = `<img src="${block.image}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">`;
            } else if (mType === 'video' && block.videoUrl) {
                const ytId = extractYouTubeId(block.videoUrl);
                const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'img/logo_provisional.png';
                thumbHtml = `<img src="${ytThumb}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">`;
            } else if (mType === 'map' && block.mapQuery) {
                thumbHtml = `
                <div style="width: 44px; height: 44px; border-radius: 8px; background: #e0f2fe; border: 1px solid #bae6fd; display: flex; align-items: center; justify-content: center; color: #0284c7;">
                    <span class="material-symbols-outlined" style="font-size: 22px;">map</span>
                </div>`;
            } else {
                thumbHtml = `<img src="img/logo_provisional.png" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">`;
            }

            const isFirst = idx === 0;
            const isLast = idx === sessionNosotros.length - 1;

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap: 0.8rem; overflow: hidden; flex: 1;">
                    ${thumbHtml}
                    <div style="overflow: hidden; flex: 1;">
                        <strong style="font-size:0.92rem; color:var(--text-main); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${block.title}</strong>
                        <p style="font-size:0.78rem; color:var(--text-muted); margin: 2px 0 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${block.description}</p>
                    </div>
                </div>
                <div style="display: flex; gap: 0.35rem; flex-shrink:0;">
                    <button type="button" class="btn-edit-block action-btn edit" style="padding: 0.4rem;" title="Editar"><span class="material-symbols-outlined" style="font-size: 18px;">edit</span></button>
                    <button type="button" class="btn-up-block action-btn" style="padding: 0.4rem;" ${isFirst ? 'disabled' : ''} title="Subir"><span class="material-symbols-outlined" style="font-size: 18px; color: ${isFirst ? '#cbd5e1' : 'var(--primary-color)'}">arrow_upward</span></button>
                    <button type="button" class="btn-down-block action-btn" style="padding: 0.4rem;" ${isLast ? 'disabled' : ''} title="Bajar"><span class="material-symbols-outlined" style="font-size: 18px; color: ${isLast ? '#cbd5e1' : 'var(--primary-color)'}">arrow_downward</span></button>
                    <button type="button" class="btn-delete-block action-btn del" style="padding: 0.4rem;" title="Eliminar"><span class="material-symbols-outlined" style="font-size: 18px;">delete</span></button>
                </div>
            `;

            card.querySelector('.btn-edit-block').addEventListener('click', () => openNosotrosForm(idx));
            card.querySelector('.btn-up-block').addEventListener('click', () => moveNosotrosBlockUp(idx));
            card.querySelector('.btn-down-block').addEventListener('click', () => moveNosotrosBlockDown(idx));
            card.querySelector('.btn-delete-block').addEventListener('click', () => deleteNosotrosBlock(idx));

            adminNosotrosList.appendChild(card);
        });
    }

    function moveNosotrosBlockUp(idx) {
        if (idx > 0) {
            [sessionNosotros[idx], sessionNosotros[idx - 1]] = [sessionNosotros[idx - 1], sessionNosotros[idx]];
            saveNosotrosToLocalStorage();
            renderAdminNosotrosList();
            renderNosotrosBlocksCliente();
        }
    }

    function moveNosotrosBlockDown(idx) {
        if (idx < sessionNosotros.length - 1) {
            [sessionNosotros[idx], sessionNosotros[idx + 1]] = [sessionNosotros[idx + 1], sessionNosotros[idx]];
            saveNosotrosToLocalStorage();
            renderAdminNosotrosList();
            renderNosotrosBlocksCliente();
        }
    }

    // 4. Abrir Formulario
    function openNosotrosForm(idx = null) {
        editingNosotrosIndex = idx;
        const titleInput       = document.getElementById('admin-nosotros-title');
        const descriptionInput = document.getElementById('admin-nosotros-description');
        const linkUrlInput     = document.getElementById('nosotros-link-url');
        const linkTextInput    = document.getElementById('nosotros-link-text');
        const hiddenUrlInput   = document.getElementById('admin-nosotros-image-url');
        const videoUrlInput    = document.getElementById('admin-nosotros-video-url');
        const mapQueryInput    = document.getElementById('admin-nosotros-map-query');

        // Limpiar todos los inputs
        titleInput.value       = '';
        descriptionInput.value = '';
        linkUrlInput.value     = '';
        linkTextInput.value    = '';
        hiddenUrlInput.value   = '';
        if (videoUrlInput) videoUrlInput.value = '';
        if (mapQueryInput) mapQueryInput.value = '';
        if (inputNosotrosImage) inputNosotrosImage.value = '';
        if (nosotrosImagePreview) nosotrosImagePreview.innerHTML = '';
        const videoPreview = document.getElementById('nosotros-video-preview');
        const mapPreview   = document.getElementById('nosotros-map-preview');
        if (videoPreview) { videoPreview.innerHTML = ''; videoPreview.style.display = 'none'; }
        if (mapPreview)   { mapPreview.innerHTML = '';   mapPreview.style.display = 'none'; }

        // Tipo de medio por defecto: imagen
        let mediaType = 'image';

        if (idx !== null) {
            const block = sessionNosotros[idx];
            titleInput.value       = block.title;
            descriptionInput.value = block.description;
            linkUrlInput.value     = block.linkUrl  || '';
            linkTextInput.value    = block.linkText || '';
            mediaType = block.mediaType || 'image';

            if (mediaType === 'image') {
                hiddenUrlInput.value = block.image || '';
                if (block.image && nosotrosImagePreview) {
                    nosotrosImagePreview.innerHTML = `<img src="${block.image}" style="width:100%; border-radius:8px; border:1px solid #ddd;">`;
                }
            } else if (mediaType === 'video') {
                if (videoUrlInput) videoUrlInput.value = block.videoUrl || '';
                if (block.videoUrl && videoPreview) {
                    const ytId = extractYouTubeId(block.videoUrl);
                    if (ytId) {
                        videoPreview.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&mute=1&modestbranding=1&rel=0" allowfullscreen style="width:100%; height:160px; border:none; border-radius:8px;"></iframe>`;
                        videoPreview.style.display = 'block';
                    }
                }
            } else if (mediaType === 'map') {
                if (mapQueryInput) mapQueryInput.value = block.mapQuery || '';
                if (block.mapQuery && mapPreview) {
                    const enc = encodeURIComponent(block.mapQuery);
                    mapPreview.innerHTML = `<iframe src="https://maps.google.com/maps?q=${enc}&output=embed&z=15" style="width:100%; height:200px; border:none; border-radius:8px;"></iframe>`;
                    mapPreview.style.display = 'block';
                }
            }
            document.getElementById('admin-nosotros-form-title').textContent = `Editar Bloque: ${block.title}`;
        } else {
            document.getElementById('admin-nosotros-form-title').textContent = '➕ Agregar Nuevo Bloque de Nosotros';
        }

        // Activar la pestaña correcta
        switchMediaPanel(mediaType);

        if (adminNosotrosModal) {
            adminNosotrosModal.style.display = 'flex';
            adminNosotrosModal.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // 5. Eliminar Bloque
    function deleteNosotrosBlock(idx) {
        if (confirm(`¿Seguro que querés eliminar el bloque "${sessionNosotros[idx].title}"?`)) {
            sessionNosotros.splice(idx, 1);
            saveNosotrosToLocalStorage();
            renderAdminNosotrosList();
        }
    }

    // 6. Subir imagen localmente o usar servidor (con conversión WebP automática)
    if (inputNosotrosImage && nosotrosImagePreview) {
        inputNosotrosImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (btnSaveNosotrosBlock) {
                btnSaveNosotrosBlock.disabled = true;
                btnSaveNosotrosBlock.textContent = '⏳ Procesando imagen...';
            }

            try {
                const { file: webpFile, dataUrl } = await convertImageToWebP(file);
                nosotrosImagePreview.innerHTML = `
                    <img src="${dataUrl}" style="width:100%; border-radius:8px; border:1px solid #ddd;">
                    <small style="color: #27ae60; font-size: 0.75rem;">✅ Convertida a WebP</small>
                `;
                const uploadedPath = await uploadImageToServer(webpFile, 'nosotros', 'bloque');
                if (uploadedPath) {
                    document.getElementById('admin-nosotros-image-url').value = uploadedPath;
                }
            } catch (err) {
                console.error('Error convirtiendo imagen:', err);
                nosotrosImagePreview.innerHTML = '<small style="color:red;">⚠️ Error procesando imagen.</small>';
            } finally {
                if (btnSaveNosotrosBlock) {
                    btnSaveNosotrosBlock.disabled = false;
                    btnSaveNosotrosBlock.textContent = 'Guardar Bloque de Nosotros';
                }
            }
        });
    }

    // ── Selector de tipo de medio: lógica de cambio de panel ──
    function switchMediaPanel(type) {
        const panels = { image: 'nosotros-panel-image', video: 'nosotros-panel-video', map: 'nosotros-panel-map' };
        Object.entries(panels).forEach(([key, id]) => {
            const panel = document.getElementById(id);
            if (panel) panel.style.display = (key === type) ? 'block' : 'none';
        });
        // Actualizar botones activos
        const selector = document.getElementById('nosotros-media-type-selector');
        if (selector) {
            selector.querySelectorAll('.media-type-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === type);
            });
        }
    }

    // Eventos de los botones de selección de tipo
    const mediaTypeSelector = document.getElementById('nosotros-media-type-selector');
    if (mediaTypeSelector) {
        mediaTypeSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.media-type-btn');
            if (!btn) return;
            switchMediaPanel(btn.dataset.type);
        });
    }

    // Vista previa en vivo del video de YouTube
    const videoUrlInput = document.getElementById('admin-nosotros-video-url');
    if (videoUrlInput) {
        videoUrlInput.addEventListener('blur', () => {
            const ytId = extractYouTubeId(videoUrlInput.value.trim());
            const preview = document.getElementById('nosotros-video-preview');
            if (!preview) return;
            if (ytId) {
                preview.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&mute=1&modestbranding=1&rel=0" allowfullscreen style="width:100%; height:160px; border:none; border-radius:8px;"></iframe>`;
                preview.style.display = 'block';
            } else {
                preview.innerHTML = '<small style="color:red;">⚠️ URL de YouTube no válida.</small>';
                preview.style.display = 'block';
            }
        });
    }

    // Vista previa del mapa al presionar el botón
    const btnPreviewMap = document.getElementById('btn-preview-map');
    if (btnPreviewMap) {
        btnPreviewMap.addEventListener('click', () => {
            const query = document.getElementById('admin-nosotros-map-query')?.value.trim();
            const preview = document.getElementById('nosotros-map-preview');
            if (!preview || !query) return;
            const enc = encodeURIComponent(query);
            preview.innerHTML = `<iframe src="https://maps.google.com/maps?q=${enc}&output=embed&z=15" style="width:100%; height:220px; border:none; border-radius:8px;"></iframe>`;
            preview.style.display = 'block';
        });
    }


    // 7. Guardar Bloque
    if (btnSaveNosotrosBlock) {
        btnSaveNosotrosBlock.addEventListener('click', async () => {
            const title       = document.getElementById('admin-nosotros-title').value.trim();
            const description = document.getElementById('admin-nosotros-description').value.trim();
            const linkUrl     = document.getElementById('nosotros-link-url').value.trim();
            const linkText    = document.getElementById('nosotros-link-text').value.trim();

            if (!title || !description) {
                alert('Por favor completa los campos obligatorios (Título y Descripción).');
                return;
            }

            // Detectar qué panel está activo
            const activeTypeBtn = document.querySelector('#nosotros-media-type-selector .media-type-btn.active');
            const mediaType = activeTypeBtn ? activeTypeBtn.dataset.type : 'image';

            const newBlock = {
                title,
                description,
                linkUrl,
                linkText,
                mediaType,
                // Campos condicionales
                image:    mediaType === 'image' ? (document.getElementById('admin-nosotros-image-url').value || 'img/logo_provisional.png') : '',
                videoUrl: mediaType === 'video' ? (document.getElementById('admin-nosotros-video-url')?.value.trim() || '') : '',
                mapQuery: mediaType === 'map'   ? (document.getElementById('admin-nosotros-map-query')?.value.trim() || '') : ''
            };

            // Validaciones por tipo
            if (mediaType === 'video' && !extractYouTubeId(newBlock.videoUrl)) {
                alert('Por favor ingresá una URL válida de YouTube.');
                return;
            }
            if (mediaType === 'map' && !newBlock.mapQuery) {
                alert('Por favor ingresá el nombre del lugar para el mapa.');
                return;
            }

            if (editingNosotrosIndex !== null) {
                sessionNosotros[editingNosotrosIndex] = newBlock;
            } else {
                sessionNosotros.push(newBlock);
            }

            saveNosotrosToLocalStorage();
            if (adminNosotrosModal) adminNosotrosModal.style.display = 'none';
            renderAdminNosotrosList();
            alert('✅ Bloque de Nosotros guardado exitosamente.');
        });
    }

    // 8. Eventos de botones Nosotros
    if (btnAddNosotrosBlock) {
        btnAddNosotrosBlock.addEventListener('click', () => openNosotrosForm());
    }

    if (btnCancelNosotros) {
        btnCancelNosotros.addEventListener('click', () => {
            if (adminNosotrosModal) adminNosotrosModal.style.display = 'none';
        });
    }

    // API Helpers
    async function saveProductsToServer() {
        try {
            const response = await fetch('/api/save-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionProducts)
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UTILIDAD: Convertir imagen a WebP (Canvas API)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function convertImageToWebP(file, quality = 0.80) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Intentar exportar como WebP; si el browser no soporta, caer en JPEG
                    const webpDataUrl = canvas.toDataURL('image/webp', quality);
                    const isWebP = webpDataUrl.startsWith('data:image/webp');
                    const finalDataUrl = isWebP ? webpDataUrl : canvas.toDataURL('image/jpeg', quality);

                    // Convertir data URL a Blob
                    const arr = finalDataUrl.split(',');
                    const mime = arr[0].match(/:(.*?);/)[1];
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) u8arr[n] = bstr.charCodeAt(n);
                    const ext = isWebP ? 'webp' : 'jpg';
                    const blob = new Blob([u8arr], { type: mime });
                    const convertedFile = new File([blob], `imagen.${ext}`, { type: mime });
                    resolve({ file: convertedFile, dataUrl: finalDataUrl });
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function uploadImageToServer(file, categoryName, productTitle) {
        const formData = new FormData();
        // REGLA DE ORO: Primero inyectamos todos los textos
        if (categoryName) {
            formData.append('category', categoryName.trim());
        }
        if (productTitle) {
            formData.append('title', productTitle.trim());
        }
        // Al final agregamos la imagen (ya convertida a WebP antes de llegar acá)
        formData.append('image', file);
        
        try {
            const response = await fetch('/api/upload-image', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) return data.imagePath;
            throw new Error(data.message);
        } catch (error) {
            console.error('Error subiendo imagen:', error);
            return null;
        }
    }

    async function editCategoryInServer(id, oldName, newName, currentImageUrl, file) {
        const formData = new FormData();
        formData.append('id', id);
        formData.append('oldName', oldName);
        formData.append('newName', newName);
        if (currentImageUrl) formData.append('currentImageUrl', currentImageUrl);
        if (file) formData.append('image', file);
        
        try {
            const response = await fetch('/api/categories/edit', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) return data;
            throw new Error(data.message);
        } catch (error) {
            console.error('Error editando categoría:', error);
            return null;
        }
    }

    
window.renderBottomNav = safeRender(renderBottomNav, 'renderBottomNav');
window.updateHeader = safeRender(updateHeader, 'updateHeader');
window.navigateToView = safeRender(navigateToView, 'navigateToView');
window.hideAllViews = hideAllViews;
window.renderHome = safeRender(renderHome, 'renderHome');
window.renderSectionContent = safeRender(renderSectionContent, 'renderSectionContent');
window.showProductDetail = safeRender(showProductDetail, 'showProductDetail');
window.renderNosotrosBlocksCliente = safeRender(renderNosotrosBlocksCliente, 'renderNosotrosBlocksCliente');
window.renderAvisosCliente = safeRender(renderAvisosCliente, 'renderAvisosCliente');
window.openPhotoViewer = openPhotoViewer;
window.updateActionLinks = updateActionLinks;
window.findProductById = findProductById;

// --- MOUSE DRAG TO SCROLL FOR HORIZONTAL CAROUSELS (PC COMPATIBILITY) ---
(function() {
    let isDown = false;
    let startX;
    let scrollLeft;
    let activeCarousel = null;
    let velocity = 0;
    let lastTime = 0;
    let lastX = 0;
    let clickStartX = 0;
    let clickStartY = 0;

    const carouselSelector = '.carousel-categories, .carousel-gallery, .carousel-horizontal, .carousel-full, .product-detail-carousel, .filter-chips, .variant-buttons-container';

    const style = document.createElement('style');
    style.innerHTML = `
        ${carouselSelector} {
            cursor: grab;
            user-select: none;
            -webkit-user-drag: none;
        }
        .carousel-categories:active, .carousel-gallery:active, .carousel-horizontal:active, .carousel-full:active, .product-detail-carousel:active, .filter-chips:active, .variant-buttons-container:active {
            cursor: grabbing;
        }
        .carousel-categories *, .carousel-gallery *, .carousel-horizontal *, .carousel-full *, .product-detail-carousel *, .filter-chips *, .variant-buttons-container * {
            -webkit-user-drag: none;
            user-select: none;
        }
    `;
    document.head.appendChild(style);

    // Prevent native drag-and-drop of images and links inside the carousel
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest(carouselSelector)) {
            e.preventDefault();
        }
    }, true);

    document.addEventListener('mousedown', (e) => {
        const carousel = e.target.closest(carouselSelector);
        if (!carousel) return;

        isDown = true;
        activeCarousel = carousel;
        carousel.classList.add('grabbing');

        // Temporarily disable scroll snapping so programmatically setting scrollLeft is smooth
        carousel.style.scrollSnapType = 'none';
        carousel.style.scrollBehavior = 'auto'; // Disable CSS transition scroll-behavior during manual drag

        startX = e.pageX;
        scrollLeft = carousel.scrollLeft;

        lastTime = Date.now();
        lastX = e.pageX;
        velocity = 0;
        
        clickStartX = e.clientX;
        clickStartY = e.clientY;
    }, true);

    const endDrag = () => {
        if (!isDown || !activeCarousel) return;
        isDown = false;
        activeCarousel.classList.remove('grabbing');

        const carousel = activeCarousel;
        activeCarousel = null;

        // Restore scroll behavior
        carousel.style.scrollBehavior = '';

        if (Math.abs(velocity) > 0.5) {
            let momentum = velocity * 15;
            const step = () => {
                if (isDown) return;
                carousel.scrollLeft -= momentum;
                momentum *= 0.92;
                if (Math.abs(momentum) > 0.5) {
                    requestAnimationFrame(step);
                } else {
                    // Re-enable scroll snap after momentum scroll ends
                    carousel.style.scrollSnapType = '';
                }
            };
            requestAnimationFrame(step);
        } else {
            // Re-enable scroll snap immediately if there is no momentum
            carousel.style.scrollSnapType = '';
        }
    };

    document.addEventListener('mouseup', endDrag);
    document.addEventListener('mouseleave', endDrag);

    document.addEventListener('mousemove', (e) => {
        if (!isDown || !activeCarousel) return;

        e.preventDefault();

        const x = e.pageX;
        const walk = (x - startX) * 1.5;
        activeCarousel.scrollLeft = scrollLeft - walk;

        const now = Date.now();
        const elapsed = now - lastTime;
        if (elapsed > 0) {
            const deltaX = e.pageX - lastX;
            velocity = deltaX / elapsed;
            lastTime = now;
            lastX = e.pageX;
        }
    });

    document.addEventListener('click', (e) => {
        const carousel = e.target.closest(carouselSelector);
        if (!carousel) return;

        const deltaX = Math.abs(e.clientX - clickStartX);
        const deltaY = Math.abs(e.clientY - clickStartY);
        if (deltaX > 10 || deltaY > 10) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
})();

