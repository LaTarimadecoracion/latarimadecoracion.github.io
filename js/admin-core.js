// js/admin-core.js
// --- ADMIN CORE MODULE ---

// Admin State
    window.editingCategoryIndex = null;
    window.oldCategoryName = null;
    let lastDragTime = 0; // Evita conflictos entre clic y arrastre en las miniaturas de fotos

    // ── Nosotros State & Defaults ──
    // SessionNosotros and defaultNosotros are managed in data.js
    
    let editingNosotrosIndex = null;
    
    // Category Creation / Edition

    // Admin UX 2.0 - Lógica de Fases, Buscador, Filtros y Paginación
    let currentAdminPhase = 'categories'; // 'categories' o 'products'
    let currentAdminTab = 'dashboard'; // 'dashboard', 'catalog', 'pages', 'maintenance'
    let editingConfigKey = null;
    let selectedCategoryIdForProducts = null; // id de la categoría elegida (ej: 'Barandas')
    let adminCurrentPage = 1;
    const adminItemsPerPage = 20;
    let adminSearchQuery = '';

    const adminCategoryTree = document.getElementById('admin-category-tree');
    let targetCategoryIdForProduct = null;
    let editingProductId = null;
    let selectedProductImage = "img/logo_provisional.png";
    let editingRentalId = null;

    let adminUX20Initialized = false;

function initAdminUX20() {
    if (adminUX20Initialized) return;
    adminUX20Initialized = true;

    // --- LISTENERS DE CORE / NAVEGACIÓN ---
        // --- LISTENERS DE PESTAÑAS (TABS) DEL DASHBOARD (V2) ---
        const tabs = ['dashboard', 'settings', 'catalog', 'pages', 'orders', 'maintenance'];
        tabs.forEach(tab => {
            const btn = document.getElementById(`tab-btn-${tab}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    currentAdminTab = tab;
                    if (tab === 'pages') {
                        switchAdminSubtab('page-home');
                    }
                    renderAdminUX();
                });
            }
        });

        // --- LISTENERS DE SUB-PESTAÑAS DE PÁGINAS ---
        const subtabBtns = document.querySelectorAll('.admin-pill-tab');
        subtabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSubtab = btn.getAttribute('data-subtab');
                switchAdminSubtab(targetSubtab);
            });
        });

        // Botón de retroceso de productos a categorías
        const btnBackToCategories = document.getElementById('btn-back-to-categories');
        if (btnBackToCategories) {
            btnBackToCategories.addEventListener('click', () => {
                currentAdminPhase = 'categories';
                renderAdminUX();
            });
        }

    // Inicializar sub-módulos
    if (typeof window.initSettingsAdmin === 'function') window.initSettingsAdmin();
    if (typeof window.initMaintenanceAdmin === 'function') window.initMaintenanceAdmin();
    if (typeof window.initCategoriesFormAdmin === 'function') window.initCategoriesFormAdmin();
    if (typeof window.initProductsAdmin === 'function') window.initProductsAdmin();
    if (typeof window.initPagesAdmin === 'function') window.initPagesAdmin();
    if (typeof window.initSocialLinksAdmin === 'function') window.initSocialLinksAdmin();
    if (typeof window.initThemeAdmin === 'function') window.initThemeAdmin();
    if (typeof window.initGithubPublishAdmin === 'function') window.initGithubPublishAdmin();
    if (typeof window.initRentalsAdmin === 'function') window.initRentalsAdmin();
    if (typeof window.initMayoristaAdmin === 'function') window.initMayoristaAdmin();
    if (typeof window.initVacationAdmin === 'function') window.initVacationAdmin();
}

    async function renderAdminDashboard() {
        // Calcular totales
        const totalCategories = sessionProducts.length;
        let totalProducts = 0;
        sessionProducts.forEach(cat => {
            totalProducts += (cat.products || []).length;
        });

        const activeThemeName = window.activeTheme || 'classic';
        const themeLabels = {
            classic: "🌲 Madera Clásica",
            sobrio: "⚫ Sobrio V1",
            mundial: "⚽ Mes Mundialista",
            navidad: "🎅 Navidad",
            halloween: "🎃 Halloween",
            valentin: "💖 San Valentín",
            imperial: "✨ Elegancia Imperial"
        };
        const themeLabel = themeLabels[activeThemeName] || activeThemeName;

        // Renderizar estadísticas estáticas
        const catStat = document.getElementById('stat-total-categories');
        const prodStat = document.getElementById('stat-total-products');
        const themeStat = document.getElementById('stat-active-theme');
        const viewsStat = document.getElementById('stat-total-views');

        if (catStat) catStat.textContent = totalCategories;
        if (prodStat) prodStat.textContent = totalProducts;
        if (themeStat) themeStat.textContent = themeLabel;

        // Buscar visitas acumuladas del servidor
        let viewsMap = {};
        let totalViews = 0;
        try {
            const res = await fetch('/api/views');
            if (res.ok) {
                viewsMap = await res.json();
                Object.values(viewsMap).forEach(v => {
                    totalViews += (v || 0);
                });
            }
        } catch (e) {
            console.error('Error al obtener estadísticas de visitas:', e);
        }
        if (viewsStat) viewsStat.textContent = totalViews;

        // Renderizar lista de productos más populares
        const topProductsList = document.getElementById('dashboard-top-products-list');
        if (!topProductsList) return;

        // Armar array con las visitas de cada producto
        let productsWithViews = [];
        sessionProducts.forEach(cat => {
            (cat.products || []).forEach(prod => {
                const viewsCount = viewsMap[prod.id] || 0;
                productsWithViews.push({
                    id: prod.id,
                    title: prod.title,
                    categoryName: cat.name,
                    image: prod.image,
                    views: viewsCount
                });
            });
        });

        // Ordenar descendentemente por visitas y tomar los top 5
        productsWithViews.sort((a, b) => b.views - a.views);
        const topProducts = productsWithViews.filter(p => p.views > 0).slice(0, 5);

        if (topProducts.length === 0) {
            topProductsList.innerHTML = `
                <div class="dashboard-empty-state">
                    <span class="material-symbols-outlined">monitoring</span>
                    <p>No hay visitas registradas todavía.</p>
                </div>
            `;
        } else {
            topProductsList.innerHTML = '';
            const maxViews = topProducts[0]?.views || 1;
            topProducts.forEach(p => {
                const item = document.createElement('div');
                item.className = 'popular-item';
                
                const imgUrl = Array.isArray(p.image) ? p.image[0] : (p.image || 'img/logo_provisional.png');
                const percent = (p.views / maxViews) * 100;

                item.innerHTML = `
                    <div class="popular-thumb" style="background-image: url('${imgUrl}');"></div>
                    <div class="popular-meta">
                        <h4 class="popular-title" title="${p.title}">${p.title}</h4>
                        <span class="popular-category">${p.categoryName}</span>
                        <div class="popularity-bar-container">
                            <div class="popularity-bar-fill" style="width: 0%;" data-width="${percent}"></div>
                        </div>
                    </div>
                    <div class="popular-views">
                        <span class="material-symbols-outlined">visibility</span>
                        <strong>${p.views}</strong>
                    </div>
                `;
                topProductsList.appendChild(item);
            });
        }

        // Renderizar lista de visitas por categoría
        const categoriesViewsList = document.getElementById('dashboard-categories-views-list');
        if (categoriesViewsList) {
            // Calcular visitas por categoría
            let categoryViewsMap = {};
            let maxCategoryViews = 0;
            let totalCatViewsSum = 0;

            sessionProducts.forEach(cat => {
                let catViewsSum = 0;
                (cat.products || []).forEach(prod => {
                    catViewsSum += (viewsMap[prod.id] || 0);
                });
                if (catViewsSum > 0) {
                    categoryViewsMap[cat.name] = {
                        name: cat.name,
                        image: cat.image,
                        views: catViewsSum
                    };
                    totalCatViewsSum += catViewsSum;
                    if (catViewsSum > maxCategoryViews) {
                        maxCategoryViews = catViewsSum;
                    }
                }
            });

            const sortedCategories = Object.values(categoryViewsMap).sort((a, b) => b.views - a.views);

            if (sortedCategories.length === 0) {
                categoriesViewsList.innerHTML = `
                    <div class="dashboard-empty-state">
                        <span class="material-symbols-outlined">pie_chart</span>
                        <p>No hay visitas registradas todavía.</p>
                    </div>
                `;
            } else {
                categoriesViewsList.innerHTML = '';
                sortedCategories.forEach(c => {
                    const item = document.createElement('div');
                    item.className = 'popular-item';
                    const imgUrl = Array.isArray(c.image) ? c.image[0] : (c.image || 'img/logo_provisional.png');
                    const percent = maxCategoryViews > 0 ? (c.views / maxCategoryViews) * 100 : 0;
                    const totalPercent = totalCatViewsSum > 0 ? Math.round((c.views / totalCatViewsSum) * 100) : 0;

                    item.innerHTML = `
                        <div class="popular-thumb" style="background-image: url('${imgUrl}');"></div>
                        <div class="popular-meta">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <h4 class="popular-title" title="${c.name}">${c.name}</h4>
                                <span style="font-size:0.72rem; font-weight:700; color:var(--text-muted);">${totalPercent}% del total</span>
                            </div>
                            <div class="popularity-bar-container">
                                <div class="popularity-bar-fill" style="width: 0%;" data-width="${percent}"></div>
                            </div>
                        </div>
                        <div class="popular-views" style="background: rgba(49, 130, 206, 0.1); color: #3182CE;">
                            <span class="material-symbols-outlined">folder</span>
                            <strong>${c.views}</strong>
                        </div>
                    `;
                    categoriesViewsList.appendChild(item);
                });
            }
        }

        // Gatillar la animación de barras de progreso después de inyectar en el DOM
        setTimeout(() => {
            document.querySelectorAll('.popularity-bar-fill').forEach(bar => {
                const targetWidth = bar.getAttribute('data-width');
                if (targetWidth) {
                    bar.style.width = targetWidth + '%';
                }
            });
        }, 100);
    }


    function switchAdminSubtab(subtabId) {
        const subtabBtns = document.querySelectorAll('.admin-pill-tab');
        subtabBtns.forEach(btn => {
            if (btn.getAttribute('data-subtab') === subtabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const subviews = ['page-home', 'page-categories', 'page-avisos', 'page-nosotros', 'page-cart', 'page-videos', 'page-catalogo', 'page-search', 'page-mayorista'];
        subviews.forEach(key => {
            const el = document.getElementById(`subview-${key}`);
            if (el) {
                el.style.display = (key === subtabId) ? 'block' : 'none';
            }
        });
    }


function renderAdminUX() {
    initAdminUX20();
        // Control visual de la barra de navegación del panel (V2)
        const tabs = ['dashboard', 'settings', 'catalog', 'pages', 'orders', 'maintenance'];
        tabs.forEach(tab => {
            const btn = document.getElementById(`tab-btn-${tab}`);
            if (btn) {
                if (currentAdminTab === tab) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });

        // Ocultar todas las secciones principales
        const viewIds = {
            dashboard: 'admin-dashboard-view',
            settings: 'admin-settings-view',
            catalog: 'admin-catalog-view',
            pages: 'admin-pages-view',
            orders: 'admin-orders-view',
            maintenance: 'admin-maintenance-view'
        };

        Object.entries(viewIds).forEach(([key, id]) => {
            const container = document.getElementById(id);
            if (container) {
                container.style.display = (currentAdminTab === key) ? 'block' : 'none';
            }
        });

        // Renderizado dinámico y lógica de cada sección activa
        if (currentAdminTab === 'dashboard') {
            renderAdminDashboard();
            populateAdminTheme();
            if (typeof window.populateAdminVacation === 'function') window.populateAdminVacation();
        } else if (currentAdminTab === 'catalog') {
            const categoriesView = document.getElementById('admin-categories-view');
            const productsView = document.getElementById('admin-products-view');

            if (currentAdminPhase === 'categories') {
                if (categoriesView) categoriesView.style.display = 'block';
                if (productsView) productsView.style.display = 'none';
                renderAdminTree();
                renderAdminRentals();
            } else if (currentAdminPhase === 'products') {
                if (categoriesView) categoriesView.style.display = 'none';
                if (productsView) productsView.style.display = 'block';

                // Sincronizar selector de categorías
                const filterSelect = document.getElementById('admin-category-filter');
                if (filterSelect) {
                    filterSelect.innerHTML = '<option value="all">Todas las categorías</option>';
                    sessionProducts.forEach(cat => {
                        const opt = document.createElement('option');
                        opt.value = cat.id;
                        opt.textContent = cat.name;
                        if (cat.id === selectedCategoryIdForProducts) opt.selected = true;
                        filterSelect.appendChild(opt);
                    });
                }

                renderAdminProducts();
            }
        } else if (currentAdminTab === 'pages') {
            renderAdminConfig();
            if (window.renderAdminHomeSectionsList) window.renderAdminHomeSectionsList();
            if (window.renderAdminViewBuilderList) window.renderAdminViewBuilderList();
            renderAdminNosotrosList();
            populateAdminSocialLinks();

            // Sincronizar subvista activa
            const activeBtn = document.querySelector('.admin-pill-tab.active');
            const activeSubtab = activeBtn ? activeBtn.getAttribute('data-subtab') : 'page-home';
            switchAdminSubtab(activeSubtab);
        } else if (currentAdminTab === 'maintenance') {
            // Se mantiene el diseño estático inicial
        }
    }

