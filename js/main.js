
// js/main.js
// --- ORCHESTRATOR ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Splash Screen
    const splashScreen = document.getElementById('splash-screen');
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            splashScreen.style.visibility = 'hidden';
        }
    }, 2000);

    // 2. Global DOM Cache
    window.navItems = document.querySelectorAll('.nav-item');
    window.views = document.querySelectorAll('.view');
    window.btnBack = document.getElementById('btn-back');
    window.dynamicTitle = document.getElementById('dynamic-main-title');
    window.dynamicSubtitle = document.getElementById('dynamic-subtitle');
    window.btnShareHeader = document.getElementById('btn-share-header');

    // Inicializar renders
    if (window.renderBottomNav) window.renderBottomNav();
    
    // Cargar estadísticas de vistas antes de pintar el home para que el ordenamiento sea real y transparente
    if (window.loadProductViews) {
        window.loadProductViews().finally(() => {
            if (window.renderHome) window.renderHome();
            if (window.renderAvisosCliente) window.renderAvisosCliente();
        });
    } else {
        if (window.renderHome) window.renderHome();
        if (window.renderAvisosCliente) window.renderAvisosCliente();
    }

    // Módulo Avisos Autónomo
    try {
        if (window.initAvisos) window.initAvisos();
    } catch (e) {
        console.error("Error inicializando AvisosModule:", e);
    }

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

            const shareUrl = `${window.location.origin}${window.location.pathname}?cat=${categoryId}`;
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

    // 3. Deep Linking Router para Productos Compartidos (?p=id-producto) y Vistas (?view=id-vista)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const prodId = urlParams.get('p') || urlParams.get('product');
        if (prodId) {
            // Pequeño retardo para asegurar que los renders y la UI se asienten en el DOM
            setTimeout(() => {
                if (window.findProductById && window.showProductDetail) {
                    const foundData = window.findProductById(prodId);
                    if (foundData) {
                        console.log(`[Router] Producto compartido detectado: ${prodId}. Abriendo modal.`);
                        window.showProductDetail(foundData.product, foundData.catName);
                        
                        // Limpiar la URL sin recargar para estética premium
                        const cleanUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, cleanUrl);
                    } else {
                        console.warn(`[Router] Producto con ID '${prodId}' no encontrado en el catálogo.`);
                    }
                }
            }, 150);
        }

        const viewId = urlParams.get('view');
        if (viewId) {
            setTimeout(() => {
                if (window.navigateToView) {
                    console.log(`[Router] Navegación solicitada por URL a: ${viewId}`);
                    window.navigateToView(viewId);
                    
                    // Limpiar la URL sin recargar para estética premium
                    const cleanUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);
                }
            }, 150);
        }

        const catId = urlParams.get('cat') || urlParams.get('category');
        if (catId) {
            setTimeout(() => {
                if (window.navigateToCategoryFeed) {
                    console.log(`[Router] Categoría compartida detectada: ${catId}. Abriendo feed.`);
                    window.navigateToCategoryFeed(catId);
                    
                    // Limpiar la URL sin recargar para estética premium
                    const cleanUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);
                }
            }, 150);
        }
    } catch (e) {
        console.error("[Router] Error en deep-linking:", e);
    }
});
