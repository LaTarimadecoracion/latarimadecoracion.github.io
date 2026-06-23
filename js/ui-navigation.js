
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
                // Desactivar scroll del parent si estamos en el iframe
                if (viewId === 'view-catalogo' || viewId === 'view-calculator') {
                    appContainer.style.overflowY = 'hidden';
                } else {
                    appContainer.style.overflowY = 'auto';
                }
            }
            
            // Renderizado dinámico condicional al navegar
            if (viewId === 'view-about') {
                renderNosotrosBlocksCliente();
            } else if (viewId === 'view-notifications') {
                renderAvisosCliente();
            } else if (viewId === 'view-rentals') {
                renderRentals();
            } else if (viewId === 'view-admin') {
                window.currentAdminTab = 'catalog';
                window.currentAdminPhase = 'categories';
                renderAdminUX();
            }
        }

        // Activar el item del nav correspondiente si aplica
        const matchingNavItem = document.querySelector(`.nav-item[data-target="${viewId}"]`);
        if (matchingNavItem) {
            matchingNavItem.classList.add('active');
        }

        updateHeader(viewId, context);

        // Actualizar URL en el historial (si no es navegación hacia atrás o disparada por popstate/detalles/categoría)
        const isProductOrCategoryView = viewId === 'view-product-detail' || viewId === 'view-category-feed';
        
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
                'view-calculator': 'calcular'
            };
            
            const viewName = prettyNames[viewId] || '';
            let query = '';
            if (viewId !== 'view-home' && viewName) {
                query = `?view=${viewName}`;
            }
            
            const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + query;
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

document.addEventListener('DOMContentLoaded', () => {
    const btnCloseAdmin = document.getElementById('btn-close-admin');
    if (btnCloseAdmin) {
        btnCloseAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            window.navigationHistory = [];
            if(window.navigateToView) window.navigateToView('view-home');
            if(window.renderHome) window.renderHome();
        });
    }

    const btnCloseAdminHeader = document.getElementById('btn-close-admin-header');
    if (btnCloseAdminHeader) {
        btnCloseAdminHeader.addEventListener('click', (e) => {
            e.preventDefault();
            window.navigationHistory = [];
            if(window.navigateToView) window.navigateToView('view-home');
            if(window.renderHome) window.renderHome();
        });
    }
});