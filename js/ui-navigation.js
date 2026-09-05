
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
            { key: 'home', target: 'view-home', id: null, defaultIcon: 'home', label: 'INICIO' },
            { key: 'categories', target: 'view-categories', id: null, defaultIcon: 'category', label: 'CATEGORÍAS' },
            { key: 'cart', target: 'view-profile', id: null, defaultIcon: 'shopping_cart', label: 'CARRITO' },
            { key: 'videos', target: 'view-videos', id: null, defaultIcon: 'play_circle', label: 'VIDEOS' },
            { key: 'nosotros', target: 'view-about', id: null, defaultIcon: 'info', label: 'NOSOTROS' }
        ];

        sectionsMapping.forEach(sec => {
            const config = window.appConfig[sec.key];
            // Si el admin configuró ocultar una sección existente, se oculta. Si es nueva (categories/videos), se muestra.
            if (config && config.visible === false) return;
            
            const iconToUse = (config && config.icon) ? config.icon : sec.defaultIcon;

            const a = document.createElement('a');
            a.href = '#';
            a.className = 'nav-item';
            a.setAttribute('data-target', sec.target);
            if (sec.id) a.id = sec.id;

            // Check if current active view corresponds to this target
            const activeView = Array.from(window.views).find(v => v.classList.contains('active'));
            if (activeView && activeView.id === sec.target) {
                a.classList.add('active');
            }

            if (sec.key === 'cart') {
                a.innerHTML = `
                    <div class="cart-icon-wrapper" style="position: relative; display: inline-flex;"><span class="material-symbols-outlined">${iconToUse}</span>
                        <span class="cart-fav-badge" id="fav-badge" style="display: none;">0</span>
                    </div>
                    <span class="nav-label">${sec.label}</span>
                `;
            } else {
                a.innerHTML = `
                    <span class="material-symbols-outlined">${iconToUse}</span>
                    <span class="nav-label">${sec.label}</span>
                `;
            }

            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.navigationHistory = [];
                navigateToView(sec.target);
            });

            bottomNav.appendChild(a);
        });

        // Actualizar el estado inicial del badge de favoritos
        if (window.updateFavoritesBadge) window.updateFavoritesBadge();
    }



    function hideAllViews() {
        window.views.forEach(view => view.classList.remove('active'));
        const currentNavItems = document.querySelectorAll('.nav-item');
        currentNavItems.forEach(nav => nav.classList.remove('active'));
    }



    function navigateToView(viewId, context = null, isBack = false) {
        const currentActiveView = Array.from(window.views).find(v => v.classList.contains('active'));
        const currentActiveViewId = currentActiveView ? currentActiveView.id : null;

        // Interceptar navegación hacia atrás para recargar el producto o categoría correspondiente si ha cambiado
        if (isBack) {
            if (viewId === 'view-product-detail' && context && context.productId) {
                const currentProductId = document.getElementById('view-product-detail')?.dataset.productId;
                if (currentProductId !== context.productId) {
                    if (window.findProductById && window.showProductDetail) {
                        const foundData = window.findProductById(context.productId);
                        if (foundData) {
                            window.showProductDetail(foundData.product, foundData.catName, '', '', '', true);
                            return;
                        }
                    }
                }
            } else if (viewId === 'view-category-feed' && context && context.categoryId) {
                const currentCategoryId = document.getElementById('view-category-feed')?.dataset.categoryId;
                if (currentCategoryId !== context.categoryId) {
                    if (window.navigateToCategoryFeed) {
                        window.navigateToCategoryFeed(context.categoryId, true);
                        return;
                    }
                }
            }
        }

        // Detectar si estamos navegando al mismo tipo de vista pero con diferente contenido (producto o categoría)
        let isDifferentContent = false;
        if (currentActiveViewId === viewId) {
            if (viewId === 'view-product-detail') {
                const currentProductId = document.getElementById('view-product-detail')?.dataset.productId;
                const targetProductId = context?.productId;
                if (currentProductId && targetProductId && currentProductId !== targetProductId) {
                    isDifferentContent = true;
                }
            } else if (viewId === 'view-category-feed') {
                const currentCategoryId = document.getElementById('view-category-feed')?.dataset.categoryId;
                const targetCategoryId = context?.categoryId;
                if (currentCategoryId && targetCategoryId && currentCategoryId !== targetCategoryId) {
                    isDifferentContent = true;
                }
            }
        }

        if (!isBack && currentActiveViewId && (currentActiveViewId !== viewId || isDifferentContent)) {
            // Guardar en el historial la vista previa con su contexto anterior
            let previousContext = null;
            if (currentActiveViewId === 'view-product-detail') {
                previousContext = {
                    title: document.getElementById('detail-title')?.textContent,
                    category: document.getElementById('detail-category')?.textContent,
                    productId: document.getElementById('view-product-detail')?.dataset.productId
                };
            } else if (currentActiveViewId === 'view-category-feed') {
                previousContext = {
                    name: window.dynamicTitle.textContent,
                    categoryId: document.getElementById('view-category-feed')?.dataset.categoryId
                };
            }
            window.navigationHistory.push({ viewId: currentActiveViewId, context: previousContext });
        } else if (isBack) {
            // Si es atrás, sacamos el último del historial
            window.navigationHistory.pop();
        }

        hideAllViews();

        const targetView = document.getElementById(viewId);

        if (targetView) {
            targetView.classList.add('active');
            
            // Asignar datasets para identificar el contenido cargado actualmente
            if (viewId === 'view-product-detail' && context && context.productId) {
                targetView.dataset.productId = context.productId;
            }
            if (viewId === 'view-category-feed' && context && context.categoryId) {
                targetView.dataset.categoryId = context.categoryId;
            }
            
            // Actualizar título de la pestaña del navegador (document.title)
        const viewTitles = {
            'view-home': 'LA TARIMA - Decoración',
            'view-categories': 'Categorías | LA TARIMA - Decoración',
            'view-category-feed': (context && context.name) ? `${context.name} | LA TARIMA - Decoración` : 'Categorías | LA TARIMA - Decoración',
            'view-profile': 'Tu Carrito | LA TARIMA - Decoración',
            'view-about': 'Sobre Nosotros | LA TARIMA - Decoración',
            'view-search': 'Buscar Productos | LA TARIMA - Decoración',
            'view-videos': 'Videos | LA TARIMA - Decoración',
            'view-notifications': 'Avisos | LA TARIMA - Decoración',
            'view-rentals': 'Alquileres | LA TARIMA - Decoración',
            'view-catalogo': 'Catálogo | LA TARIMA - Decoración',
            'view-offers': 'Ofertas & Combos | LA TARIMA - Decoración',
            'view-calculator': 'Calculadora | LA TARIMA - Decoración',
            'view-mayorista': 'Mayorista | LA TARIMA - Decoración',
            'view-stock': 'Control de Stock | LA TARIMA - Decoración',
            'view-musica': 'Música | LA TARIMA - Decoración',
            'view-pedidos': 'Pedidos | LA TARIMA - Decoración',
            'view-admin': 'Panel de Administración | LA TARIMA - Decoración',
            'view-product-detail': (context && context.title) ? `${context.title} | LA TARIMA - Decoración` : 'LA TARIMA - Decoración'
        };
        if (viewTitles[viewId]) {
            document.title = viewTitles[viewId];
        }

        // Ocultar cabecera y barra de navegación inferior si entramos al panel de administración
            const headerBar = document.querySelector('.main-header-bar');
            const bottomNav = document.querySelector('.bottom-nav');
            if (viewId === 'view-admin') {
                if (headerBar) headerBar.style.setProperty('display', 'none', 'important');
                if (bottomNav) bottomNav.style.setProperty('display', 'none', 'important');
            } else {
                if (headerBar) headerBar.style.display = 'flex';
                if (bottomNav) bottomNav.style.display = 'flex';
            }

            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.scrollTop = 0;
                // Desactivar scroll y padding inferior del parent si estamos en el iframe
                if (viewId === 'view-catalogo' || viewId === 'view-calculator' || viewId === 'view-mayorista' || viewId === 'view-stock' || viewId === 'view-musica' || viewId === 'view-ayudin' || viewId === 'view-pedidos' || viewId === 'view-pedidos-admin' || viewId === 'view-editor') {
                    appContainer.style.setProperty('overflow-y', 'hidden', 'important');
                    appContainer.style.setProperty('padding-bottom', '0px', 'important');
                } else {
                    appContainer.style.setProperty('overflow-y', 'auto', 'important');
                    appContainer.style.setProperty('padding-bottom', '95px', 'important');
                }
            }
            
            // Renderizar links de redes sociales globales en la vista activa
            if (window.renderGlobalSocialLinks) {
                window.renderGlobalSocialLinks();
            }
            
            // Renderizado dinámico condicional al navegar
            if (viewId === 'view-offers') {
                if (window.renderOffersFrontend) window.renderOffersFrontend();
            } else if (viewId === 'view-home') {
                if (window.renderHome) window.renderHome();
            } else if (viewId === 'view-categories') {
                if (window.renderCategoriesMenu) window.renderCategoriesMenu();
            } else if (viewId === 'view-videos') {
                if (window.renderVideosView) window.renderVideosView();
            } else if (viewId === 'view-catalogo') {
                const iframe = document.querySelector('#view-catalogo iframe');
                if (iframe && iframe.contentWindow) {
                    if (typeof iframe.contentWindow.refreshCatalog === 'function') {
                        iframe.contentWindow.refreshCatalog();
                    } else {
                        iframe.contentWindow.location.reload();
                    }
                }
            } else if (viewId === 'view-mayorista') {
                const iframe = document.querySelector('#view-mayorista iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.location.reload();
                }
            } else if (viewId === 'view-musica') {
                const iframe = document.querySelector('#view-musica iframe');
                if (iframe && iframe.contentWindow) {
                    if (typeof iframe.contentWindow.refreshTrackList === 'function') {
                        iframe.contentWindow.refreshTrackList();
                    } else {
                        iframe.contentWindow.location.reload();
                    }
                }
            } else if (viewId === 'view-ayudin') {
                const iframe = document.querySelector('#view-ayudin iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.location.reload();
                }
            } else if (viewId === 'view-pedidos') {
                const urlParams = new URLSearchParams(window.location.search);
                const orderId = (context && context.orderId) || urlParams.get('id');
                const iframe = document.querySelector('#view-pedidos iframe');
                if (iframe) {
                    iframe.src = orderId ? `pedidos/index.html?id=${encodeURIComponent(orderId)}` : `pedidos/index.html`;
                }
            } else if (viewId === 'view-pedidos-admin') {
                const iframe = document.querySelector('#view-pedidos-admin iframe');
                if (iframe) {
                    iframe.src = `pedidos/admin.html`;
                }
            } else if (viewId === 'view-editor') {
                const iframe = document.querySelector('#view-editor iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.location.reload();
                }
            } else if (viewId === 'view-about') {
                renderNosotrosBlocksCliente();
            } else if (viewId === 'view-notifications') {
                // Marcar avisos como leídos
                const badge = document.getElementById('header-nav-badge');
                if (badge) badge.style.display = 'none';
                const btn = document.getElementById('nav-notif-btn-header');
                if (btn) btn.classList.remove('pulse-notif');
                localStorage.setItem('lastReadAvisoTimestamp', Date.now().toString());

                if (window.renderInfoBlocksCliente) {
                    window.renderInfoBlocksCliente('avisos');
                } else if (typeof renderAvisosCliente !== 'undefined') {
                    renderAvisosCliente();
                }
            } else if (viewId === 'view-search') {
                if (window.runSearch) window.runSearch();
            } else if (viewId === 'view-rentals') {
                renderRentals();
            } else if (viewId === 'view-profile') {
                if (window.CarritoModule && window.CarritoModule.render) {
                    window.CarritoModule.render();
                } else if (typeof window.renderPerfilCarritoView === 'function') {
                    window.renderPerfilCarritoView();
                }
            } else if (viewId === 'view-admin') {
                const urlParams = new URLSearchParams(window.location.search);
                const tabFromUrl = urlParams.get('tab') || window.location.hash.replace('#', '');
                const validTabs = ['dashboard', 'settings', 'catalog', 'offers', 'shipping', 'stock', 'pages', 'orders', 'maintenance'];
                if (tabFromUrl && validTabs.includes(tabFromUrl)) {
                    window.currentAdminTab = tabFromUrl;
                } else if (!window.currentAdminTab) {
                    window.currentAdminTab = 'dashboard';
                }
                if (window.renderAdminUX) window.renderAdminUX();
            }
        }

        // Activar el item del nav correspondiente si aplica
        const matchingNavItem = document.querySelector(`.nav-item[data-target="${viewId}"]`);
        if (matchingNavItem) {
            matchingNavItem.classList.add('active');
        }

        updateHeader(viewId, context);

        // Actualizar URL en el historial (si no es navegación hacia atrás o disparada por popstate/detalles/categoría)
        const isProductOrCategoryView = viewId === 'view-product-detail' || viewId === 'view-category-feed' || viewId === 'view-offer-detail';
        
        if (!isProductOrCategoryView) {
            const prettyNames = {
                'view-about': 'nosotros',
                'view-search': 'buscar',
                'view-notifications': 'avisos',
                'view-profile': 'perfil',
                'view-rentals': 'alquileres',
                'view-admin': 'admin',
                'view-catalogo': 'catalogo',
                'view-categories': 'categorias',
                'view-videos': 'videos',
                'view-cart': 'carrito',
                'view-calculator': 'calcular',
                'view-mayorista': 'mayorista',
                'view-stock': 'stock',
                'view-musica': 'musica',
                'view-ayudin': 'ayudin',
                'view-pedidos': 'pedidos',
                'view-pedidos-admin': 'pedidos-admin',
                'view-editor': 'editor',
                'view-offer-detail': 'oferta'
            };
            
            let basePath = window.location.pathname.replace(/\/index\.html$/, '/');
            basePath = basePath.replace(/\/(alquiles|alquileres|rentas|rentales|stock|mayorista|catalogo|musica|admin)\/?$/, '/');
            
            let query = '';
            if (prettyNames[viewId]) {
                query = '?view=' + prettyNames[viewId];
                if (viewId === 'view-pedidos' && context && context.orderId) {
                    query += '&id=' + encodeURIComponent(context.orderId);
                } else if (viewId === 'view-admin') {
                    const currentTab = window.currentAdminTab || new URLSearchParams(window.location.search).get('tab') || 'dashboard';
                    query += '&tab=' + encodeURIComponent(currentTab);
                }
            } else if (viewId === 'view-home') {
                query = '';
            }
            
            const cleanUrl = basePath + query;
            if (!isBack) {
                window.history.pushState({ viewId }, document.title, cleanUrl);
            } else {
                window.history.replaceState({ viewId }, document.title, cleanUrl);
            }
        }

        // Tracking virtual de Google Analytics para la SPA
        if (typeof gtag === 'function') {
            gtag('event', 'page_view', {
                page_title: (context && context.title) ? context.title : (document.title + ' - ' + viewId.replace('view-', '').toUpperCase()),
                page_location: window.location.href.split('?')[0] + '#' + viewId,
                page_path: '/' + viewId
            });
        }
    }



    
window.renderBottomNav = safeRender(renderBottomNav, 'renderBottomNav');


window.updateHeader = safeRender(updateHeader, 'updateHeader');


window.navigateToView = safeRender(navigateToView, 'navigateToView');


window.hideAllViews = hideAllViews;

document.addEventListener('click', (e) => {
    const btnClose = e.target.closest('#btn-close-admin, #btn-close-admin-header');
    if (btnClose) {
        e.preventDefault();
        window.navigationHistory = [];
        if (window.navigateToView) window.navigateToView('view-home');
        if (window.renderHome) window.renderHome();
    }
});

    // Reenvío de gestos de scroll/touch al iframe activo cuando se arrastra por fuera
    let lastTouchY = 0;
    window.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
            lastTouchY = e.touches[0].clientY;
        }
    }, { passive: true });

    const getTargetVisibleIframe = (e) => {
        const activeView = document.querySelector('.view.active');
        if (!activeView) return null;

        const iframe = e.target.closest('iframe') || (e.target.closest('.app-iframe-container')?.querySelector('iframe'));
        if (!iframe || !iframe.contentWindow) return null;

        if (iframe.offsetWidth === 0 || iframe.offsetHeight === 0) return null;
        const style = window.getComputedStyle(iframe);
        if (style.display === 'none' || style.visibility === 'hidden') return null;

        const parentSection = iframe.closest('.admin-section-view');
        if (parentSection && window.getComputedStyle(parentSection).display === 'none') return null;

        return iframe;
    };

    const forwardScrollToIframe = (deltaY, iframe) => {
        if (!iframe || !iframe.contentWindow) return;
        try {
            iframe.contentWindow.scrollBy({ top: deltaY, behavior: 'auto' });
            const doc = iframe.contentDocument;
            if (doc) {
                const innerApp = doc.getElementById('app-container');
                if (innerApp) innerApp.scrollTop += deltaY;
                if (doc.documentElement) doc.documentElement.scrollTop += deltaY;
                if (doc.body) doc.body.scrollTop += deltaY;
            }
        } catch (err) {}
    };

    window.addEventListener('wheel', (e) => {
        const iframe = getTargetVisibleIframe(e);
        if (iframe) {
            forwardScrollToIframe(e.deltaY, iframe);
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        const iframe = getTargetVisibleIframe(e);
        if (iframe && e.touches && e.touches.length > 0) {
            const currentY = e.touches[0].clientY;
            const deltaY = lastTouchY - currentY;
            lastTouchY = currentY;
            if (Math.abs(deltaY) > 0) {
                forwardScrollToIframe(deltaY, iframe);
            }
        }
    }, { passive: true });