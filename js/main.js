
// js/main.js
// --- ORCHESTRATOR ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Event-driven Splash Screen logic
    const hideSplashScreen = () => {
        const splash = document.getElementById('splash-screen');
        if (splash && splash.style.display !== 'none' && splash.style.opacity !== '0') {
            splash.style.transition = 'opacity 0.3s ease, visibility 0.3s';
            splash.style.opacity = '0';
            splash.style.visibility = 'hidden';
            setTimeout(() => {
                splash.style.display = 'none';
            }, 300);
        }
    };

    // Safety fallback to hide splash screen if anything stalls
    setTimeout(hideSplashScreen, 1500);

    // 2. Global DOM Cache
    window.navItems = document.querySelectorAll('.nav-item');
    window.views = document.querySelectorAll('.view');
    window.btnBack = document.getElementById('btn-back');
    window.dynamicTitle = document.getElementById('dynamic-main-title');
    window.dynamicSubtitle = document.getElementById('dynamic-subtitle');
    window.btnShareHeader = document.getElementById('btn-share-header');

    // Inicializar renders
    if (window.renderBottomNav) window.renderBottomNav();
    
    const initAllDragToScroll = () => {
        if (typeof window.enableDragToScroll === 'function') {
            document.querySelectorAll('.carousel-categories').forEach(el => window.enableDragToScroll(el));
        }
    };

    // Cargar estadísticas de vistas antes de pintar el home para que el ordenamiento sea real y transparente
    if (window.loadProductViews) {
        window.loadProductViews().finally(() => {
            if (window.renderHome) window.renderHome();
            if (window.renderCategoriesMenu) window.renderCategoriesMenu();
            if (window.renderVideosView) window.renderVideosView();
            if (window.renderNosotrosBlocksCliente) window.renderNosotrosBlocksCliente();
            initAllDragToScroll();
            hideSplashScreen();
        });
    } else {
        if (window.renderHome) window.renderHome();
        if (window.renderCategoriesMenu) window.renderCategoriesMenu();
        if (window.renderVideosView) window.renderVideosView();
        if (window.renderNosotrosBlocksCliente) window.renderNosotrosBlocksCliente();
        initAllDragToScroll();
        hideSplashScreen();
    }

    // Módulo Avisos Autónomo
    try {
        if (window.initAvisos) window.initAvisos();
    } catch (e) {
        console.error("Error inicializando AvisosModule:", e);
    }

    // --- Sistema de Notificaciones In-App (Avisos) ---
    function checkUnreadAvisos() {
        if (!window.sessionAvisos || window.sessionAvisos.length === 0) return;
        
        const lastRead = parseInt(localStorage.getItem('lastReadAvisoTimestamp') || '0', 10);
        
        const latestAviso = window.sessionAvisos.reduce((max, aviso) => {
            const ts = (aviso && aviso.timestamp) || 0;
            return ts > max ? ts : max;
        }, 0);

        if (latestAviso > lastRead) {
            // Activar campanita
            const badge = document.getElementById('header-nav-badge');
            if (badge) badge.style.display = 'block';
            
            const btn = document.getElementById('nav-notif-btn-header');
            if (btn) btn.classList.add('pulse-notif');

            // Mostrar el Toast (MSN style)
            showAvisoToast();
        }
    }

    function showAvisoToast() {
        if (document.getElementById('aviso-toast')) return;

        const toast = document.createElement('div');
        toast.id = 'aviso-toast';
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-icon"><span class="material-symbols-outlined">notifications_active</span></div>
            <div class="toast-content">
                <strong>¡Novedades!</strong>
                <span>Tenés un nuevo aviso disponible.</span>
            </div>
            <button class="toast-close"><span class="material-symbols-outlined">close</span></button>
        `;

        document.body.appendChild(toast);

        toast.addEventListener('click', (e) => {
            if (e.target.closest('.toast-close')) return;
            if (window.navigateToView) window.navigateToView('view-notifications');
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        });

        toast.querySelector('.toast-close').addEventListener('click', (e) => {
            e.stopPropagation();
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        });

        requestAnimationFrame(() => {
            setTimeout(() => toast.classList.add('show'), 100);
        });

        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 400);
            }
        }, 5000);
    }

    setTimeout(checkUnreadAvisos, 800);
    // -------------------------------------------------

    const listInit = document.getElementById('admin-section-components-list');
    if (listInit && window.renderAdminViewBuilderList) {
        window.renderAdminViewBuilderList();
    }

    if (window.initAdminShortcut) window.initAdminShortcut();

    // Eventos Globales (Back)
    if (window.btnBack) {
        window.btnBack.addEventListener('click', () => {
            if (window.navigationHistory && window.navigationHistory.length > 0) {
                const prev = window.navigationHistory[window.navigationHistory.length - 1];
                if (window.navigateToView) window.navigateToView(prev.viewId, prev.context, true);
            }
        });
    }

    // Eventos Globales (Share Category)
    if (window.btnShareHeader) {
        window.btnShareHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const categoryId = window.btnShareHeader.getAttribute('data-category-id');
            const categoryName = window.btnShareHeader.getAttribute('data-category-name') || 'Categoría';
            if (!categoryId) return;

            const shareUrl = `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '/')}?cat=${categoryId}`;
            const shareText = `Mirá la categoría *${categoryName}* en La Tarima 😊`;

            const copyTextToClipboard = (textToCopy) => {
                const showToast = () => {
                    const toast = document.getElementById('admin-toast');
                    if (toast) {
                        toast.textContent = "🔗 ¡Enlace de categoría copiado!";
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
                    title: categoryName,
                    text: shareText,
                    url: shareUrl
                }).catch(err => {
                    console.log('Error sharing:', err);
                    copyTextToClipboard(`${shareText}\n${shareUrl}`);
                });
            } else {
                copyTextToClipboard(`${shareText}\n${shareUrl}`);
            }
        });
    }

    // Eventos Globales (Nav Items creados dinámicamente)
    document.querySelector('.bottom-nav').addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item');
        if (item) {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            window.navigationHistory = [];
            if (window.navigateToView) window.navigateToView(targetId);
        }
    });

    // 3. Deep Linking Router para Productos Compartidos (?prod=id-producto) y Vistas (?view=id-vista)
    function getVariantsFromUrl(product, urlParams) {
        let preselectedAcabado = '';
        let preselectedMedida = '';
        let preselectedOpcion = '';
        
        const urlKeys = Array.from(urlParams.keys())
            .filter(k => k !== 'prod' && k !== 'product' && k !== 'p' && k !== 'view' && k !== 'cat' && k !== 'category');
        
        urlKeys.forEach(key => {
            const cleanKey = key.trim().toLowerCase();
            if (!cleanKey) return;
            
            let grupos = (product.acabados_groups || []).filter(g => !g.hidden);
            if (grupos.length === 0) {
                const singleAcabado = (product.acabado || 'Único').trim().toLowerCase();
                if (cleanKey === singleAcabado) {
                    preselectedAcabado = product.acabado || 'Único';
                }
            } else {
                const matchedGrupo = grupos.find(g => (g.acabado_name || '').trim().toLowerCase() === cleanKey);
                if (matchedGrupo) {
                    preselectedAcabado = matchedGrupo.acabado_name;
                }
            }
            
            if (grupos.length > 0) {
                for (const g of grupos) {
                    if (g.medidas_variants) {
                        const matchedMed = g.medidas_variants.find(m => (m.medida || '').trim().toLowerCase() === cleanKey);
                        if (matchedMed) {
                            preselectedMedida = matchedMed.medida;
                            break;
                        }
                    }
                }
            } else if (product.medidas_variants) {
                const matchedMed = product.medidas_variants.find(m => (m.medida || '').trim().toLowerCase() === cleanKey);
                if (matchedMed) {
                    preselectedMedida = matchedMed.medida;
                }
            }
            
            const opt = product.optional_variant;
            if (opt && opt.options) {
                const matchedOpt = opt.options.find(o => (o || '').trim().toLowerCase() === cleanKey);
                if (matchedOpt) {
                    preselectedOpcion = matchedOpt;
                }
            }
        });
        
        return { preselectedAcabado, preselectedMedida, preselectedOpcion };
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. Detectar parámetro de URL ultra corta (?s=CODE)
        const shortCode = urlParams.get('s');
        if (shortCode && window.TarimaShortener && window.TarimaShortener.decodeShortCode) {
            const decoded = window.TarimaShortener.decodeShortCode(shortCode);
            if (decoded && decoded.productId) {
                setTimeout(() => {
                    if (window.findProductById && window.showProductDetail) {
                        const foundData = window.findProductById(decoded.productId);
                        if (foundData && foundData.product.visible !== false) {
                            console.log(`[Router] Producto corto detectado (code=${shortCode}): ${decoded.productId}`);
                            window.showProductDetail(
                                foundData.product,
                                foundData.catName,
                                decoded.preselectedAcabado,
                                decoded.preselectedMedida,
                                decoded.preselectedOpcion
                            );
                        }
                    }
                }, 150);
            }
        } else {
            // 2. Fallback a parámetros estándar (?prod=, ?p=, ?product=)
            const prodId = urlParams.get('prod') || urlParams.get('product') || urlParams.get('p');
            if (prodId) {
                setTimeout(() => {
                    if (window.findProductById && window.showProductDetail) {
                        const foundData = window.findProductById(prodId);
                        if (foundData) {
                            const catObj = window.sessionProducts ? window.sessionProducts.find(c => c.name === foundData.catName || c.id === foundData.catName) : null;
                            if (foundData.product.visible !== false) {
                                console.log(`[Router] Producto compartido detectado: ${prodId}. Abriendo modal.`);
                                const { preselectedAcabado, preselectedMedida, preselectedOpcion } = getVariantsFromUrl(foundData.product, urlParams);
                                window.showProductDetail(foundData.product, foundData.catName, preselectedAcabado, preselectedMedida, preselectedOpcion);
                            }
                        }
                    }
                }, 150);
            }
        }

        const viewParam = urlParams.get('view') || urlParams.get('sec');
        if (viewParam) {
            if (viewParam === 'edit' || viewParam === 'editor') {
                window.location.replace('Herramientas/editor-fotos.html');
                return;
            }
            const viewIdMap = {
                'nosotros': 'view-about',
                'buscar': 'view-search',
                'avisos': 'view-notifications',
                'perfil': 'view-profile',
                'alquileres': 'view-rentals',
                'alquiles': 'view-rentals',
                'rentas': 'view-rentals',
                'admin': 'view-admin',
                'catalogo': 'view-catalogo',
                'calcular': 'view-calculator',
                'mayorista': 'view-mayorista',
                'musica': 'view-musica',
                'ayudin': 'view-ayudin',
                'help': 'view-ayudin',
                'herramientas': 'view-ayudin',
                'pedidos': 'view-pedidos'
            };
            const targetViewId = viewIdMap[viewParam] || viewParam;
            setTimeout(() => {
                if (window.navigateToView) {
                    console.log(`[Router] Navegación solicitada por URL a: ${targetViewId}`);
                    window.navigateToView(targetViewId);
                }
            }, 150);
        }

        // Soporte para rutas limpias SPA: /alquileres, /alquiles, /rentas
        const cleanPath = window.location.pathname.toLowerCase().replace(/\/$/, '');
        if (cleanPath.endsWith('/edit') || cleanPath.endsWith('/editor') || cleanPath.endsWith('/web/edit') || cleanPath.endsWith('/web/editor')) {
            window.location.replace('Herramientas/editor-fotos.html');
            return;
        }
        if (cleanPath.endsWith('/alquiles') || cleanPath.endsWith('/alquileres') || cleanPath.endsWith('/rentas')) {
            setTimeout(() => {
                if (window.navigateToView) {
                    console.log(`[Router] Ruta limpia detectada: ${cleanPath}. Redirigiendo a Alquileres.`);
                    window.navigateToView('view-rentals');
                }
            }, 150);
        }

        const catId = urlParams.get('cat') || urlParams.get('category');
        if (catId) {
            setTimeout(() => {
                if (window.navigateToCategoryFeed) {
                    console.log(`[Router] Categoría compartida detectada: ${catId}. Abriendo feed.`);
                    window.navigateToCategoryFeed(catId);
                }
            }, 150);
        }

        const cartParam = urlParams.get('cart');
        if (cartParam) {
            setTimeout(() => {
                if (window.importCartFromString) {
                    console.log(`[Router] Importación de carrito detectada.`);
                    window.importCartFromString(cartParam);
                }
            }, 200);
        }
    } catch (e) {
        console.error("[Router] Error en deep-linking:", e);
    }

    // 4. Popstate event listener for native back/forward navigation support
    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const prodId = urlParams.get('prod') || urlParams.get('product') || urlParams.get('p');
        const viewParam = urlParams.get('view') || urlParams.get('sec');
        const catId = urlParams.get('cat') || urlParams.get('category');
        const cartParam = urlParams.get('cart');
        
        if (prodId) {
            if (window.findProductById && window.showProductDetail) {
                const foundData = window.findProductById(prodId);
                if (foundData) {
                    const catObj = window.sessionProducts ? window.sessionProducts.find(c => c.name === foundData.catName || c.id === foundData.catName) : null;
                    const isCatVisible = !catObj || catObj.visible !== false;
                    if (foundData.product.visible !== false) {
                        const { preselectedAcabado, preselectedMedida, preselectedOpcion } = getVariantsFromUrl(foundData.product, urlParams);
                        window.showProductDetail(foundData.product, foundData.catName, preselectedAcabado, preselectedMedida, preselectedOpcion);
                    }
                }
            }
        } else if (catId) {
            if (window.navigateToCategoryFeed) {
                window.navigateToCategoryFeed(catId);
            }
        } else if (cartParam) {
            if (window.importCartFromString) {
                window.importCartFromString(cartParam);
            }
        } else if (viewParam) {
            const viewIdMap = {
                'nosotros': 'view-about',
                'buscar': 'view-search',
                'avisos': 'view-notifications',
                'perfil': 'view-profile',
                'alquileres': 'view-rentals',
                'alquiles': 'view-rentals',
                'rentas': 'view-rentals',
                'admin': 'view-admin',
                'catalogo': 'view-catalogo',
                'calcular': 'view-calculator',
                'categorias': 'view-categories',
                'videos': 'view-videos',
                'carrito': 'view-cart',
                'mayorista': 'view-mayorista',
                'musica': 'view-musica',
                'pedidos': 'view-pedidos'
            };
            const targetViewId = viewIdMap[viewParam] || viewParam;
            if (window.navigateToView) {
                window.navigateToView(targetViewId, null, true);
            }
        } else {
            if (window.navigateToView) {
                window.navigateToView('view-home', null, true);
            }
        }
    });
});

// Efecto de explosión de confeti en clicks/taps para temáticas festivas
document.addEventListener('pointerdown', (e) => {
    const activeTheme = window.activeTheme || 'classic';
    const festiveThemes = ['mundial', 'navidad', 'halloween', 'valentin'];
    if (!festiveThemes.includes(activeTheme)) return;

    // Dos colores específicos por temática (bien de cancha)
    const themeColors = {
        mundial: ['#74ACDF', '#FFFFFF'], // Celeste y blanco
        navidad: ['#C22A2A', '#1A6C37'], // Rojo y verde
        halloween: ['#E65100', '#5E35B1'], // Naranja y violeta
        valentin: ['#E91E63', '#FFFFFF'] // Rosa y blanco
    };

    const colors = themeColors[activeTheme];
    if (!colors) return;

    const particleCount = 28; // Mayor cantidad para simular una lluvia tupida de tribuna
    const container = document.body;

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-particle';

        const size = Math.random() * 8 + 6; // 6px a 14px
        const color = colors[Math.floor(Math.random() * colors.length)];

        if (activeTheme === 'valentin') {
            // Lluvia de rosas rojas para San Valentín
            p.textContent = '🌹';
            p.style.fontSize = `${Math.random() * 10 + 14}px`; // 14px a 24px (mejor escala para ver los detalles de la rosa)
            p.style.display = 'flex';
            p.style.alignItems = 'center';
            p.style.justifyContent = 'center';
            p.style.backgroundColor = 'transparent';
        } else {
            // Confetis perfectamente cuadrados (estilo papel cortado de tribuna)
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.backgroundColor = color;
            p.style.borderRadius = '0px'; // 100% Cuadrado sin bordes redondeados
        }

        // Posición de origen (donde se hizo click/tap)
        p.style.left = `${e.clientX - size / 2}px`;
        p.style.top = `${e.clientY - size / 2}px`;

        // Explosión radial simétrica en cámara lenta (tipo estrella flotante)
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 65 + 35; // Velocidad de explosión reducida para cámara lenta
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity + 75; // Desplazamiento + caída vertical lenta y persistente
        const rot = Math.random() * 900 + 450; // Gran cantidad de giros durante los 3.5 segundos de caída

        p.style.setProperty('--tx', `${tx}px`);
        p.style.setProperty('--ty', `${ty}px`);
        p.style.setProperty('--rot', `${rot}deg`);

        container.appendChild(p);

        // Limpieza tras 3.5s (duración de la fiesta de confeti en cámara lenta)
        setTimeout(() => p.remove(), 3500);
    }

    // --- Redirección y Sincronización de Scroll en Vistas con Iframe ---
    // Permite hacer scroll desde cualquier lugar de la pantalla (márgenes grises, cabecera, navegación inferior)
    window.addEventListener('wheel', (e) => {
        const activeView = document.querySelector('.view.active');
        if (activeView) {
            if (activeView.id === 'view-mayorista' || activeView.id === 'view-catalogo' || activeView.id === 'view-ayudin' || activeView.id === 'view-calculator' || activeView.id === 'view-musica') {
                const iframe = activeView.querySelector('iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.scrollBy(0, e.deltaY);
                }
            } else {
                // Si el mouse está fuera de #app-container, desplazarlo igualmente
                if (!e.target.closest('#app-container')) {
                    const appContainer = document.getElementById('app-container');
                    if (appContainer) {
                        appContainer.scrollTop += e.deltaY;
                    }
                }
            }
        }
    }, { passive: true });

    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        const activeView = document.querySelector('.view.active');
        if (activeView && (activeView.id === 'view-mayorista' || activeView.id === 'view-catalogo' || activeView.id === 'view-ayudin' || activeView.id === 'view-calculator' || activeView.id === 'view-musica')) {
            const iframe = activeView.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                const touchY = e.touches[0].clientY;
                const deltaY = touchStartY - touchY;
                iframe.contentWindow.scrollBy(0, deltaY);
                touchStartY = touchY;
            }
        }
    }, { passive: true });
});
