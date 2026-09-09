// js/admin-core.js
// --- ADMIN CORE MODULE ---

// Admin State
    window.editingCategoryIndex = null;
    window.oldCategoryName = null;
    let lastDragTime = 0; // Evita conflictos entre clic y arrastre en las miniaturas de fotos

    // --- LÓGICA INTERACTIVA DEL MODULO INVENTARIO 3.0 (PARALELO) ---
    // --- LÓGICA DE INVENTARIO 3.0 (UNIFICACIÓN DE CATÁLOGO + EDITOR + STOCK + MAYORISTA + ESCÁNER) ---
    window.renderAdminInventoryV3 = function() {
        populateV3CatFilter();
        window.renderV3UnifiedGrid();
    };

    function populateV3CatFilter() {
        const select = document.getElementById('v3-unified-cat-filter');
        if (!select) return;

        const currentVal = select.value || 'all';
        select.innerHTML = '<option value="all">Todas las Categorías</option>';

        const sourceData = (window.sessionProducts && Array.isArray(window.sessionProducts) && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : ((typeof window.productsData !== 'undefined' && Array.isArray(window.productsData)) ? window.productsData : []);

        sourceData.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.name} (${(cat.products || []).length})`;
            if (cat.id === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    }

    window.renderV3UnifiedGrid = function() {
        const tbody = document.getElementById('v3-unified-table-body');
        if (!tbody) return;

        const searchQuery = (document.getElementById('v3-unified-search')?.value || '').toLowerCase().trim();
        const selectedCat = document.getElementById('v3-unified-cat-filter')?.value || 'all';

        const sourceData = (window.sessionProducts && Array.isArray(window.sessionProducts) && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : ((typeof window.productsData !== 'undefined' && Array.isArray(window.productsData)) ? window.productsData : []);

        let allProducts = [];
        sourceData.forEach((cat, cIdx) => {
            if (selectedCat !== 'all' && cat.id !== selectedCat) return;

            (cat.products || []).forEach((p, pIdx) => {
                allProducts.push({ ...p, categoryName: cat.name, cIdx, pIdx });
            });
        });

        if (searchQuery) {
            allProducts = allProducts.filter(p => 
                (p.title && p.title.toLowerCase().includes(searchQuery)) ||
                (p.id && p.id.toLowerCase().includes(searchQuery)) ||
                (p.categoryName && p.categoryName.toLowerCase().includes(searchQuery))
            );
        }

        if (allProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem; color: #64748b;">
                        <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.4; display: block; margin-bottom: 6px;">search_off</span>
                        No se encontraron productos en el inventario unificado.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allProducts.map(p => `
            <tr id="v3-row-${p.cIdx}-${p.pIdx}" style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;">
                <td style="padding: 10px 14px; vertical-align: middle;">
                    <div style="width: 42px; height: 42px; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        <img src="${p.image || 'img/logo_provisional.png'}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${p.title}">
                    </div>
                </td>
                <td style="padding: 10px 14px; vertical-align: middle;">
                    <strong style="color: #0f172a; font-size: 0.88rem; display: block;">${p.title}</strong>
                    <span style="font-size: 0.72rem; color: #64748b; font-weight: 600; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px;">
                        ${p.categoryName}
                    </span>
                </td>
                <td style="padding: 10px 14px; vertical-align: middle; font-family: monospace; font-size: 0.82rem; font-weight: 700; color: #334155;">
                    ${p.id || 'N/A'}
                </td>
                <td style="padding: 10px 14px; vertical-align: middle;">
                    <input type="number" id="v3-stock-${p.cIdx}-${p.pIdx}" value="${p.stock ?? 0}" style="width: 80px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 800; text-align: center;">
                </td>
                <td style="padding: 10px 14px; vertical-align: middle;">
                    <input type="number" id="v3-price-${p.cIdx}-${p.pIdx}" value="${p.price ?? 0}" style="width: 120px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 800; color: #16a34a;">
                </td>
                <td style="padding: 10px 14px; vertical-align: middle;">
                    <input type="number" id="v3-wholesale-${p.cIdx}-${p.pIdx}" value="${p.wholesalePrice ?? p.price ?? 0}" style="width: 120px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 800; color: #2563eb;">
                </td>
                <td style="padding: 10px 14px; vertical-align: middle; text-align: center;">
                    <button type="button" onclick="window.openProductForm && window.openProductForm(${p.cIdx}, sessionProducts[${p.cIdx}].products[${p.pIdx}])" class="btn-outline" style="padding: 0.35rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Editar Fotos y Detalles Avanzados">
                        <span class="material-symbols-outlined" style="font-size: 15px;">edit</span>
                        <span>Ficha</span>
                    </button>
                </td>
            </tr>
        `).join('');
    };

    window.applyV3WholesaleRule = function() {
        const pctInput = document.getElementById('v3-wholesale-discount-pct');
        const pct = parseFloat(pctInput?.value || 0);

        if (!window.sessionProducts || pct <= 0) return;

        window.sessionProducts.forEach((cat, cIdx) => {
            (cat.products || []).forEach((p, pIdx) => {
                const priceEl = document.getElementById(`v3-price-${cIdx}-${pIdx}`);
                const wholesaleEl = document.getElementById(`v3-wholesale-${cIdx}-${pIdx}`);

                const currentPrice = priceEl ? parseFloat(priceEl.value) || (p.price || 0) : (p.price || 0);
                const calculatedWholesale = Math.round(currentPrice * (1 - pct / 100));

                if (wholesaleEl) wholesaleEl.value = calculatedWholesale;
                p.wholesalePrice = calculatedWholesale;
            });
        });

        if (typeof window.showAdminToast === 'function') window.showAdminToast(`⚡ Se calculó un ${pct}% OFF de precio mayorista`);
    };

    window.saveV3UnifiedChanges = async function() {
        if (!window.sessionProducts) return;

        window.sessionProducts.forEach((cat, cIdx) => {
            (cat.products || []).forEach((p, pIdx) => {
                const stockEl = document.getElementById(`v3-stock-${cIdx}-${pIdx}`);
                const priceEl = document.getElementById(`v3-price-${cIdx}-${pIdx}`);
                const wholesaleEl = document.getElementById(`v3-wholesale-${cIdx}-${pIdx}`);

                if (stockEl) p.stock = parseInt(stockEl.value) || 0;
                if (priceEl) p.price = parseFloat(priceEl.value) || 0;
                if (wholesaleEl) p.wholesalePrice = parseFloat(wholesaleEl.value) || p.price;
            });
        });

        if (typeof window.showAdminToast === 'function') window.showAdminToast('✅ ¡Inventario y Precios Unificados guardados!');
        if (typeof window.saveProductsToServer === 'function') await window.saveProductsToServer();
        window.renderV3UnifiedGrid();
    };

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

function updateAdminUrlTab(tabKey) {
    if (!tabKey) return;
    try {
        const url = new URL(window.location.href);
        const viewParam = url.searchParams.get('view');
        const adminViewEl = document.getElementById('view-admin');
        const isAdminActive = (viewParam === 'admin') || (adminViewEl && adminViewEl.classList.contains('active'));
        
        if (isAdminActive) {
            url.searchParams.set('tab', tabKey);
            window.history.replaceState({ tab: tabKey }, '', url.toString());
        }
    } catch(e) {}
}

function initAdminUX20() {
    const mainTabBtn = document.getElementById('tab-btn-dashboard');
    if (!mainTabBtn) {
        adminUX20Initialized = false;
        return;
    }
    if (adminUX20Initialized) return;
    adminUX20Initialized = true;

    // Listener del botón para desplegar/contraer el sidebar lateral (estilo Mercado Libre)
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const adminSidebar = document.getElementById('admin-sidebar');
    if (btnToggleSidebar && adminSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            adminSidebar.classList.toggle('expanded');
            const isExpanded = adminSidebar.classList.contains('expanded');
            localStorage.setItem('adminSidebarExpanded', isExpanded ? 'true' : 'false');
        });
        if (localStorage.getItem('adminSidebarExpanded') === 'true') {
            adminSidebar.classList.add('expanded');
        }
    }

    // Leer la pestaña activa inicial desde la URL (?tab=...) o HASH (#tab)
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab') || window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'settings', 'catalog', 'bulk-edit', 'offers', 'shipping', 'payments', 'stock', 'pc-stock', 'pages', 'orders', 'quotes', 'users', 'maintenance'];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
        currentAdminTab = tabFromUrl;
    }

    // Asegurar que la URL mantenga el parámetro de la pestaña actual
    updateAdminUrlTab(currentAdminTab);

    // --- LISTENERS DE CORE / NAVEGACIÓN (V2) ---
    validTabs.forEach(tab => {
        const btn = document.getElementById(`tab-btn-${tab}`);
        if (btn) {
            btn.addEventListener('click', () => {
                currentAdminTab = tab;
                updateAdminUrlTab(tab);
                if (tab === 'pages') {
                    switchAdminSubtab('page-home');
                }
                renderAdminUX();
            });
        }
    });

    // Delegación global de clics para pestañas, subpestañas y ancho del panel
    if (!window._adminNavigationDelegated) {
        window._adminNavigationDelegated = true;
        document.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.admin-sidebar-btn, .admin-nav-btn');
            if (navBtn && navBtn.id && navBtn.id.startsWith('tab-btn-')) {
                const tabKey = navBtn.id.replace('tab-btn-', '');
                currentAdminTab = tabKey;
                updateAdminUrlTab(tabKey);
                if (tabKey === 'pages') switchAdminSubtab('page-home');
                renderAdminUX();
                return;
            }

            const subtabBtn = e.target.closest('.admin-pill-tab');
            if (subtabBtn) {
                const targetSubtab = subtabBtn.getAttribute('data-subtab');
                if (targetSubtab) switchAdminSubtab(targetSubtab);
                return;
            }

            const widthTab = e.target.closest('.admin-width-tab');
            if (widthTab) {
                const widthMode = widthTab.getAttribute('data-width') || 'normal';
                const container = document.getElementById('admin-layout-container');
                if (container) {
                    container.className = `admin-layout width-${widthMode}`;
                }
                document.querySelectorAll('.admin-width-tab').forEach(b => {
                    if (b === widthTab) b.classList.add('active');
                    else b.classList.remove('active');
                });
                return;
            }
        });
    }

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
    if (typeof window.initPagesGroupingAdmin === 'function') window.initPagesGroupingAdmin();
    if (typeof window.initMaintenanceAdmin === 'function') window.initMaintenanceAdmin();
    if (typeof window.initCategoriesFormAdmin === 'function') window.initCategoriesFormAdmin();
    if (typeof window.initProductsAdmin === 'function') window.initProductsAdmin();
    if (typeof window.initAdminOffers === 'function') window.initAdminOffers();
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

    // Asegurar lectura de URL en cada renderizado
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab') || window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'settings', 'catalog', 'bulk-edit', 'offers', 'shipping', 'payments', 'stock', 'pc-stock', 'pages', 'orders', 'quotes', 'users', 'maintenance'];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
        currentAdminTab = tabFromUrl;
    }

    // Control visual de la barra de navegación del panel (V2)
        const tabs = ['dashboard', 'settings', 'catalog', 'bulk-edit', 'offers', 'shipping', 'payments', 'stock', 'pc-stock', 'pages', 'orders', 'quotes', 'users'];
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

        // Ocultar todas las secciones principales y actualizar el título dinámico del Header
        const tabNames = {
            dashboard: { title: 'Panel de Control', icon: 'dashboard' },
            settings: { title: 'Ajustes del Negocio', icon: 'settings' },
            catalog: { title: 'Catálogo de Productos', icon: 'inventory_2' },
            'bulk-edit': { title: 'Editor Masivo de Precios & Productos', icon: 'table_chart' },
            offers: { title: 'Ofertas & Combos', icon: 'local_offer' },
            shipping: { title: 'Envíos & Zonas Tarifarias', icon: 'local_shipping' },
            payments: { title: 'Métodos & Pasarelas de Pago', icon: 'payments' },
            stock: { title: 'Control de Stock & Inventario', icon: 'inventory' },
            'pc-stock': { title: 'Control de Stock PC (Escáner)', icon: 'desktop_windows' },
            pages: { title: 'Páginas & Banners', icon: 'view_quilt' },
            orders: { title: 'Gestión de Pedidos', icon: 'description' },
            quotes: { title: 'Generador de Presupuestos', icon: 'request_quote' },
            users: { title: 'Usuarios & Permisos', icon: 'group' }
        };

        const currentTabInfo = tabNames[currentAdminTab] || { title: 'Panel de Control', icon: 'shield_person' };
        const topbarTitleEl = document.getElementById('admin-topbar-title');
        const topbarIconEl = document.getElementById('admin-topbar-icon');
        if (topbarTitleEl) topbarTitleEl.textContent = currentTabInfo.title;
        if (topbarIconEl) topbarIconEl.textContent = currentTabInfo.icon;

        const viewIds = {
            dashboard: 'admin-dashboard-view',
            settings: 'admin-settings-view',
            catalog: 'admin-catalog-view',
            'bulk-edit': 'admin-bulk-edit-view',
            offers: 'admin-offers-view',
            shipping: 'admin-shipping-view',
            payments: 'admin-payments-view',
            stock: 'admin-stock-view',
            'pc-stock': 'admin-pc-stock-view',
            pages: 'admin-pages-view',
            orders: 'admin-orders-view',
            quotes: 'admin-quotes-view',
            users: 'admin-users-view',
            'inventory-v3': 'admin-inventory-v3-view'
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
        } else if (currentAdminTab === 'bulk-edit') {
            if (typeof window.initBulkEditAdmin === 'function') {
                window.initBulkEditAdmin();
            }
        } else if (currentAdminTab === 'offers') {
            if (typeof window.renderAdminOffers === 'function') {
                window.renderAdminOffers();
            }
        } else if (currentAdminTab === 'shipping') {
            if (typeof window.renderAdminShipping === 'function') {
                window.renderAdminShipping();
            }
        } else if (currentAdminTab === 'payments') {
            if (typeof window.renderAdminPayments === 'function') {
                window.renderAdminPayments();
            }
        } else if (currentAdminTab === 'orders') {
            if (typeof window.initOrdersIframeAutoHeight === 'function') {
                setTimeout(window.initOrdersIframeAutoHeight, 100);
                setTimeout(window.initOrdersIframeAutoHeight, 500);
            }
        } else if (currentAdminTab === 'stock') {
            if (typeof window.initAdminStockNative === 'function') {
                window.initAdminStockNative();
            }
        } else if (currentAdminTab === 'pc-stock') {
            if (typeof window.initAdminPcStockModule === 'function') {
                window.initAdminPcStockModule();
            }
        } else if (currentAdminTab === 'quotes') {
            if (typeof window.renderAdminQuotes === 'function') {
                window.renderAdminQuotes();
            }
        } else if (currentAdminTab === 'users') {
            if (typeof window.renderAdminUsers === 'function') {
                window.renderAdminUsers();
            }
        } else if (currentAdminTab === 'inventory-v3') {
            if (typeof window.renderAdminInventoryV3 === 'function') {
                window.renderAdminInventoryV3();
            }
        } else if (currentAdminTab === 'catalog') {
            const categoriesView = document.getElementById('admin-categories-view');
            const productsView = document.getElementById('admin-products-view');

            if (currentAdminPhase === 'categories') {
                if (categoriesView) categoriesView.style.display = 'block';
                if (productsView) productsView.style.display = 'none';
                if (typeof renderAdminTree === 'function') renderAdminTree();
                if (typeof renderAdminRentals === 'function') renderAdminRentals();
            } else if (currentAdminPhase === 'products') {
                if (categoriesView) categoriesView.style.display = 'none';
                if (productsView) productsView.style.display = 'block';

                // Sincronizar selector de categorías
                const filterSelect = document.getElementById('admin-category-filter');
                if (filterSelect && Array.isArray(sessionProducts)) {
                    filterSelect.innerHTML = '<option value="all">Todas las categorías</option>';
                    sessionProducts.forEach(cat => {
                        const opt = document.createElement('option');
                        opt.value = cat.id;
                        opt.textContent = cat.name;
                        if (cat.id === selectedCategoryIdForProducts) opt.selected = true;
                        filterSelect.appendChild(opt);
                    });
                }

                if (typeof renderAdminProducts === 'function') renderAdminProducts();
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
        }
    }

    window.initOrdersIframeAutoHeight = function() {
        const iframe = document.getElementById('admin-orders-iframe');
        if (!iframe) return;
        try {
            if (iframe.contentWindow && iframe.contentWindow.document && iframe.contentWindow.document.body) {
                const doc = iframe.contentWindow.document;
                const h = Math.max(doc.body.scrollHeight, doc.body.offsetHeight, doc.documentElement.scrollHeight);
                if (h > 200) {
                    iframe.style.height = (h + 40) + 'px';
                }
            }
        } catch(e) {}
    };

    window.addEventListener('message', (e) => {
        if (e.data && e.data.action === 'scrollOrdersToTop') {
            const adminMain = document.querySelector('.admin-main');
            const ordersSection = document.getElementById('admin-orders-view');
            if (ordersSection) {
                ordersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (adminMain) {
                adminMain.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });

