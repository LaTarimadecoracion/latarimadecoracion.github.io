
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

    // 3. Deep Linking Router para Productos Compartidos (?p=id-producto)
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
    } catch (e) {
        console.error("[Router] Error en deep-linking:", e);
    }
});
