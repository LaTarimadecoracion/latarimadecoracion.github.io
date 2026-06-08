// js/admin.js
// --- ADMIN MODULE ---

// Interceptor global para Admin (Aislamiento de fallos)
window.safeAdminRun = function(fn) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            console.error('[Admin Fault Tolerance] Excepción capturada en la administración:', error);
            alert('Ocurrió un error en el panel de administración. Revisa la consola.');
        }
    };
};

// Admin State
    let editingCategoryIndex = null;
    let oldCategoryName = null;
    let lastDragTime = 0; // Evita conflictos entre clic y arrastre en las miniaturas de fotos

    // ── Nosotros State & Defaults ──
    // SessionNosotros and defaultNosotros are managed in data.js
    
    let editingNosotrosIndex = null;
    
    // Category Creation / Edition
    const btnSaveCat = document.getElementById('btn-save-cat');
    if (btnSaveCat) {
        btnSaveCat.addEventListener('click', async () => {
            const id = document.getElementById('admin-cat-id').value;
            const name = document.getElementById('admin-cat-name').value;
            const fileInput = document.getElementById('admin-cat-image');

            if (!id || !name) {
                alert("Completá el ID y Nombre de la categoría.");
                return;
            }
            if (editingCategoryIndex === null && !fileInput.files.length) {
                alert("Para una nueva categoría es obligatorio subir una foto de portada.");
                return;
            }

            btnSaveCat.disabled = true;
            btnSaveCat.textContent = "Guardando...";

            if (editingCategoryIndex !== null) {
                const currentImgUrl = sessionProducts[editingCategoryIndex].image;
                // Convertir la foto a WebP si se seleccionó una nueva
                let webpCatFile = fileInput.files[0] || null;
                if (webpCatFile) {
                    try {
                        const converted = await convertImageToWebP(webpCatFile);
                        webpCatFile = converted.file;
                    } catch (e) { console.warn('No se pudo convertir imagen de categoría:', e); }
                }
                const result = await editCategoryInServer(id, oldCategoryName, name, currentImgUrl, webpCatFile);
                if (!result) {
                    alert("Error editando la categoría.");
                    btnSaveCat.disabled = false;
                    btnSaveCat.textContent = "Actualizar Categoría";
                    return;
                }
                
                // Actualizar array local
                sessionProducts[editingCategoryIndex].id = id;
                sessionProducts[editingCategoryIndex].name = name;
                if (result.imageUrl) {
                    sessionProducts[editingCategoryIndex].image = result.imageUrl;
                }

                // Rewrite product images
                if (oldCategoryName !== name) {
                    const sanitize = (n) => n ? n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-') : '';
                    const oldFolderSanitized = sanitize(oldCategoryName);
                    const newFolderSanitized = sanitize(name);
                    const oldPathPrefix = `img/${oldFolderSanitized}/`;
                    const newPathPrefix = `img/${newFolderSanitized}/`;

                    sessionProducts[editingCategoryIndex].products.forEach(p => {
                        if (typeof p.image === 'string') {
                            p.image = p.image.replace(oldPathPrefix, newPathPrefix);
                        } else if (Array.isArray(p.image)) {
                            p.image = p.image.map(img => img.replace(oldPathPrefix, newPathPrefix));
                        }
                    });
                }
                showAdminToast('Categoría actualizada correctamente');
            } else {
                // Convertir a WebP antes de subir la foto de portada
                let webpCatFile = fileInput.files[0];
                try {
                    const converted = await convertImageToWebP(webpCatFile);
                    webpCatFile = converted.file;
                } catch (e) { console.warn('No se pudo convertir imagen de categoría:', e); }

                const uploadedPath = await uploadImageToServer(webpCatFile, name);
                if (!uploadedPath) {
                    alert("Error subiendo la foto.");
                    btnSaveCat.disabled = false;
                    btnSaveCat.textContent = "Guardar Categoría";
                    return;
                }

                sessionProducts.push({
                    id: id,
                    name: name,
                    image: uploadedPath,
                    order: sessionProducts.length,
                    products: []
                });
                showAdminToast('Categoría creada correctamente');
            }

            sessionProducts.forEach((c, idx) => c.order = idx);
            await saveProductsToServer();
            
            editingCategoryIndex = null;
            oldCategoryName = null;
            document.getElementById('admin-cat-form').reset();
            const formTitle = document.getElementById('admin-category-form-title');
            if (formTitle) formTitle.innerHTML = 'Crear Nueva Categoría';
            
            const catModal = document.getElementById('admin-category-modal');
            if (catModal) catModal.style.display = 'none';

            renderAdminUX();
            
            btnSaveCat.disabled = false;
            btnSaveCat.textContent = "Guardar Categoría";
        });
    }

    // Admin UX 2.0 - Lógica de Fases, Buscador, Filtros y Paginación
    let currentAdminPhase = 'categories'; // 'categories' o 'products'
    let currentAdminTab = 'catalog'; // 'catalog', 'sections', 'config'
    let editingConfigKey = null;
    let selectedCategoryIdForProducts = null; // id de la categoría elegida (ej: 'Barandas')
    let adminCurrentPage = 1;
    const adminItemsPerPage = 20;
    let adminSearchQuery = '';

    const adminCategoryTree = document.getElementById('admin-category-tree');
    let targetCategoryIdForProduct = null;
    let editingProductId = null;
    let selectedProductImage = "img/logo_provisional.png";

    let adminUX20Initialized = false;
    function initAdminUX20() {
        if (adminUX20Initialized) return;
        adminUX20Initialized = true;

        const adminSearchInput = document.getElementById('admin-search');
        if (adminSearchInput) {
            adminSearchInput.addEventListener('input', (e) => {
                adminSearchQuery = e.target.value;
                adminCurrentPage = 1;
                renderAdminProducts();
            });
        }

        const filterSelect = document.getElementById('admin-category-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                selectedCategoryIdForProducts = e.target.value;
                adminCurrentPage = 1;
                renderAdminProducts();
            });
        }

        const btnAdminPrev = document.getElementById('btn-admin-prev');
        if (btnAdminPrev) {
            btnAdminPrev.addEventListener('click', () => {
                if (adminCurrentPage > 1) {
                    adminCurrentPage--;
                    renderAdminProducts();
                }
            });
        }

        const btnAdminNext = document.getElementById('btn-admin-next');
        if (btnAdminNext) {
            btnAdminNext.addEventListener('click', () => {
                adminCurrentPage++;
                renderAdminProducts();
            });
        }

        const btnAddProductMain = document.getElementById('btn-add-product-main');
        if (btnAddProductMain) {
            btnAddProductMain.addEventListener('click', () => {
                let catIdx = 0;
                if (selectedCategoryIdForProducts && selectedCategoryIdForProducts !== 'all') {
                    const idx = sessionProducts.findIndex(c => c.id === selectedCategoryIdForProducts);
                    if (idx !== -1) catIdx = idx;
                }
                openProductForm(catIdx, null);
            });
        }

        const btnOpenAddCategory = document.getElementById('btn-open-add-category');
        if (btnOpenAddCategory) {
            btnOpenAddCategory.addEventListener('click', () => {
                editingCategoryIndex = null;
                oldCategoryName = null;
                document.getElementById('admin-cat-form').reset();
                const formTitle = document.getElementById('admin-category-form-title');
                if (formTitle) formTitle.innerHTML = 'Crear Nueva Categoría';
                document.getElementById('btn-save-cat').textContent = "Guardar Categoría";
                const catModal = document.getElementById('admin-category-modal');
                if (catModal) catModal.style.display = 'flex';
            });
        }

        const btnCancelCategory = document.getElementById('btn-cancel-category');
        if (btnCancelCategory) {
            btnCancelCategory.addEventListener('click', () => {
                const catModal = document.getElementById('admin-category-modal');
                if (catModal) catModal.style.display = 'none';
            });
        }

        // --- LISTENERS DE PESTAÑAS (TABS) DEL DASHBOARD ---
        const tabBtnCatalog = document.getElementById('tab-btn-catalog');
        const tabBtnSections = document.getElementById('tab-btn-sections');
        const tabBtnConfig = document.getElementById('tab-btn-config');

        if (tabBtnCatalog) {
            tabBtnCatalog.addEventListener('click', () => {
                currentAdminTab = 'catalog';
                renderAdminUX();
            });
        }
        if (tabBtnSections) {
            tabBtnSections.addEventListener('click', () => {
                currentAdminTab = 'sections';
                renderAdminUX();
            });
        }
        if (tabBtnConfig) {
            tabBtnConfig.addEventListener('click', () => {
                currentAdminTab = 'config';
                renderAdminUX();
            });
        }

        // --- LISTENERS DEL MODAL DE CONFIGURACIÓN ---
        const btnCancelAppConfig = document.getElementById('btn-cancel-app-config');
        const appConfigModal = document.getElementById('admin-app-config-modal');
        if (btnCancelAppConfig && appConfigModal) {
            btnCancelAppConfig.addEventListener('click', () => {
                appConfigModal.style.display = 'none';
            });
        }

        const btnSaveAppConfig = document.getElementById('btn-save-app-config');
        if (btnSaveAppConfig) {
            btnSaveAppConfig.addEventListener('click', () => {
                const key = document.getElementById('admin-config-section-key').value;
                const titleInput = document.getElementById('admin-config-title').value.trim();
                const subtitleInput = document.getElementById('admin-config-subtitle').value.trim();
                const iconInput = document.getElementById('admin-config-icon').value.trim();
                const visibleInput = document.getElementById('admin-config-visible').checked;

                if (!titleInput || !subtitleInput || !iconInput) {
                    alert('Por favor, completá todos los campos.');
                    return;
                }

                appConfig[key] = {
                    title: titleInput,
                    subtitle: subtitleInput,
                    icon: iconInput,
                    visible: visibleInput
                };

                // Persistir
                localStorage.setItem('appConfig', JSON.stringify(appConfig));
                if (window.syncSiteConfigWithServer) {
                    window.syncSiteConfigWithServer();
                }

                if (appConfigModal) appConfigModal.style.display = 'none';

                showAdminToast('✅ Configuración guardada');

                // Hot reload visual in client layout
                renderBottomNav();
                
                // Re-render current page header if it's currently active!
                const activeView = Array.from(views).find(v => v.classList.contains('active'));
                if (activeView) {
                    updateHeader(activeView.id);
                }

                // Re-render the config list
                renderAdminConfig();
            });
        }

        // --- LISTENERS DEL CONSTRUCTOR DE VISTAS (VIEW BUILDER) ---
        const builderSelect = document.getElementById('admin-view-builder-select');
        if (builderSelect) {
            builderSelect.addEventListener('change', () => {
                renderAdminViewBuilderList();
            });
        }

        const btnAddSectionComp = document.getElementById('btn-add-section-component');
        if (btnAddSectionComp) {
            btnAddSectionComp.addEventListener('click', () => {
                openComponentForm();
            });
        }

        const btnCancelSectionComp = document.getElementById('btn-cancel-section-component');
        const compModal = document.getElementById('admin-component-modal');
        if (btnCancelSectionComp && compModal) {
            btnCancelSectionComp.addEventListener('click', () => {
                compModal.style.display = 'none';
            });
        }

        const compTypeSelect = document.getElementById('admin-comp-type');
        if (compTypeSelect) {
            compTypeSelect.addEventListener('change', (e) => {
                switchCompPanel(e.target.value);
            });
        }

        function switchCompPanel(type) {
            const panels = {
                banner: 'comp-panel-banner',
                product: 'comp-panel-product',
                video: 'comp-panel-video'
            };
            Object.entries(panels).forEach(([key, id]) => {
                const panel = document.getElementById(id);
                if (panel) panel.style.display = (key === type) ? 'block' : 'none';
            });
        }

        const compBannerInput = document.getElementById('admin-comp-banner-image');
        const compBannerPreview = document.getElementById('comp-banner-preview');
        const btnSaveSectionComp = document.getElementById('btn-save-section-component');

        if (compBannerInput && compBannerPreview) {
            compBannerInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (btnSaveSectionComp) {
                    btnSaveSectionComp.disabled = true;
                    btnSaveSectionComp.textContent = '⏳ Procesando banner...';
                }

                compBannerPreview.innerHTML = '⏳ Procesando...';

                try {
                    const { file: webpFile, dataUrl } = await convertImageToWebP(file);
                    compBannerPreview.innerHTML = `
                        <img src="${dataUrl}" style="width:100%; border-radius:8px; border:1px solid #ddd; height: 100px; object-fit: cover;">
                        <small style="color: #27ae60; font-size: 0.75rem;">✅ Convertida a WebP</small>
                    `;
                    const uploadedPath = await uploadImageToServer(webpFile, 'banner', 'promo');
                    if (uploadedPath) {
                        document.getElementById('admin-comp-banner-image-url').value = uploadedPath;
                    }
                } catch (err) {
                    console.error('Error convirtiendo imagen:', err);
                    compBannerPreview.innerHTML = '<small style="color:red;">⚠️ Error procesando imagen.</small>';
                } finally {
                    if (btnSaveSectionComp) {
                        btnSaveSectionComp.disabled = false;
                        btnSaveSectionComp.textContent = 'Guardar Componente';
                    }
                }
            });
        }

        const compVideoInput = document.getElementById('admin-comp-video-url');
        if (compVideoInput) {
            compVideoInput.addEventListener('blur', () => {
                const ytId = extractYouTubeId(compVideoInput.value.trim());
                const preview = document.getElementById('comp-video-preview');
                if (!preview) return;
                if (ytId) {
                    preview.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&mute=1&modestbranding=1&rel=0" allowfullscreen style="width:100%; height:120px; border:none; border-radius:8px;"></iframe>`;
                    preview.style.display = 'block';
                } else {
                    preview.innerHTML = '<small style="color:red;">⚠️ URL de YouTube no válida.</small>';
                    preview.style.display = 'block';
                }
            });
        }

        if (btnSaveSectionComp && compModal) {
            btnSaveSectionComp.addEventListener('click', async () => {
                const section = document.getElementById('admin-view-builder-select').value;
                const compId = document.getElementById('admin-comp-id').value;
                const type = document.getElementById('admin-comp-type').value;

                btnSaveSectionComp.disabled = true;
                btnSaveSectionComp.textContent = 'Guardando...';

                let newComp = { id: compId || `comp-${Date.now()}`, type };

                if (type === 'banner') {
                    const imgUrl = document.getElementById('admin-comp-banner-image-url').value;
                    const link = document.getElementById('admin-comp-banner-link').value.trim();
                    if (!imgUrl) {
                        alert('Por favor, subí una foto de banner.');
                        btnSaveSectionComp.disabled = false;
                        btnSaveSectionComp.textContent = 'Guardar Componente';
                        return;
                    }
                    newComp.image = imgUrl;
                    newComp.link = link;

                } else if (type === 'product') {
                    const productId = document.getElementById('admin-comp-product-select').value;
                    const badge = document.getElementById('admin-comp-product-badge').value.trim();
                    if (!productId) {
                        alert('Por favor, seleccioná un producto destacable.');
                        btnSaveSectionComp.disabled = false;
                        btnSaveSectionComp.textContent = 'Guardar Componente';
                        return;
                    }
                    newComp.productId = productId;
                    newComp.badge = badge;

                } else if (type === 'video') {
                    const url = document.getElementById('admin-comp-video-url').value.trim();
                    if (!extractYouTubeId(url)) {
                        alert('Por favor, ingresá una URL válida de YouTube.');
                        btnSaveSectionComp.disabled = false;
                        btnSaveSectionComp.textContent = 'Guardar Componente';
                        return;
                    }
                    newComp.url = url;
                }

                // Guardar posicionamiento del componente si es de la sección Home
                if (section === 'home') {
                    const posSelect = document.getElementById('admin-comp-position');
                    newComp.position = posSelect ? posSelect.value : 'bottom';
                }

                if (!contentRegistry[section]) contentRegistry[section] = [];

                let stack = contentRegistry[section];

                if (compId) {
                    const idx = stack.findIndex(c => c.id === compId);
                    if (idx !== -1) stack[idx] = newComp;
                } else {
                    stack.push(newComp);
                }

                contentRegistry[section] = stack;

                // Guardar en contentRegistry
                saveContentRegistry();

                compModal.style.display = 'none';
                showAdminToast('✅ Componente guardado');

                // Hot reload visual in client layout
                if (section === 'home') {
                    if (window.syncHomeOrder) window.syncHomeOrder();
                    if (window.renderAdminHomeSectionsList) window.renderAdminHomeSectionsList();
                    renderHome();
                }
                else if (section === 'search') runSearch();
                else if (section === 'avisos') renderAvisosCliente();

                // Re-render list
                renderAdminViewBuilderList();

                btnSaveSectionComp.disabled = false;
                btnSaveSectionComp.textContent = 'Guardar Componente';
            });
        }

        initSocialLinksAdmin();
        initThemeAdmin();
    }

    function renderAdminUX() {
        initAdminUX20();

        const categoriesView = document.getElementById('admin-categories-view');
        const persistentElements = document.getElementById('admin-nosotros-panel') || document.getElementById('admin-persistent-elements');
        const productsView = document.getElementById('admin-products-view');
        const configView = document.getElementById('admin-config-view');
        const closeBtn = document.getElementById('btn-close-admin');

        // Actualizar visual de botones de pestañas
        const tabBtnCatalog = document.getElementById('tab-btn-catalog');
        const tabBtnSections = document.getElementById('tab-btn-sections');
        const tabBtnConfig = document.getElementById('tab-btn-config');

        if (tabBtnCatalog && tabBtnSections && tabBtnConfig) {
            tabBtnCatalog.className = currentAdminTab === 'catalog' ? 'btn-primary' : 'btn-outline';
            tabBtnSections.className = currentAdminTab === 'sections' ? 'btn-primary' : 'btn-outline';
            tabBtnConfig.className = currentAdminTab === 'config' ? 'btn-primary' : 'btn-outline';
        }

        // Ocultar todos los contenedores primero
        if (categoriesView) categoriesView.style.display = 'none';
        if (persistentElements) persistentElements.style.display = 'none';
        if (productsView) productsView.style.display = 'none';
        if (configView) configView.style.display = 'none';

        if (currentAdminTab === 'catalog') {
            if (currentAdminPhase === 'categories') {
                if (categoriesView) categoriesView.style.display = 'block';
                if (closeBtn) closeBtn.textContent = 'Cerrar';
                renderAdminTree();
            } else if (currentAdminPhase === 'products') {
                if (productsView) productsView.style.display = 'block';
                if (closeBtn) closeBtn.textContent = '◀ Volver';

                // Sync dynamic category dropdown
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
        } else if (currentAdminTab === 'sections') {
            if (persistentElements) persistentElements.style.display = 'block';
            if (closeBtn) closeBtn.textContent = 'Cerrar';
            if (window.renderAdminHomeSectionsList) window.renderAdminHomeSectionsList();
            renderAdminNosotrosList();
        } else if (currentAdminTab === 'config') {
            if (configView) configView.style.display = 'block';
            if (closeBtn) closeBtn.textContent = 'Cerrar';
            renderAdminConfig();
            populateAdminSocialLinks();
            populateAdminTheme();
        }
    }

    function renderAdminConfig() {
        const configList = document.getElementById('admin-config-list');
        if (!configList) return;
        configList.innerHTML = '';

        const keys = ['home', 'search', 'profile', 'avisos', 'nosotros'];
        const sectionLabels = {
            home: "Inicio (Home)",
            search: "Buscador (Explorar)",
            profile: "Perfil (Mi Cuenta)",
            avisos: "Avisos (Novedades)",
            nosotros: "Nosotros (Historia/Contacto)"
        };

        keys.forEach(key => {
            const config = appConfig[key];
            if (!config) return;
            const card = document.createElement('div');
            card.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.85rem 1.2rem;
                background: white;
                border-radius: var(--radius-md);
                border: 1.5px solid #E8ECF0;
                gap: 1rem;
                box-shadow: var(--shadow-sm);
            `;

            const isVisible = config.visible !== false;

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap: 0.9rem; overflow: hidden; flex: 1;">
                    <div style="width: 44px; height: 44px; border-radius: 8px; background: #f4f6f9; display: flex; align-items: center; justify-content: center; color: var(--primary-color); flex-shrink: 0;">
                        <span class="material-symbols-outlined" style="font-size: 24px;">${config.icon}</span>
                    </div>
                    <div style="overflow: hidden; flex: 1;">
                        <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 600; display: block;">${sectionLabels[key]}</span>
                        <strong style="font-size:0.95rem; color:var(--text-main); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">${config.title}</strong>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin: 2px 0 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${config.subtitle}</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.8rem; flex-shrink:0;">
                    <span style="background: ${isVisible ? '#e6fffa' : '#fff5f5'}; color: ${isVisible ? '#087f5b' : '#c92a2a'}; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
                        ${isVisible ? 'Activa' : 'Inactiva'}
                    </span>
                    <button type="button" class="btn-edit-config action-btn edit" style="padding: 0.45rem;" title="Editar"><span class="material-symbols-outlined" style="font-size: 18px;">edit</span></button>
                </div>
            `;

            card.querySelector('.btn-edit-config').addEventListener('click', () => openAppConfigForm(key));

            configList.appendChild(card);
        });
    }

    function openAppConfigForm(key) {
        editingConfigKey = key;
        const config = appConfig[key];
        if (!config) return;

        document.getElementById('admin-config-section-key').value = key;
        document.getElementById('admin-config-title').value = config.title;
        document.getElementById('admin-config-subtitle').value = config.subtitle;
        document.getElementById('admin-config-icon').value = config.icon;
        document.getElementById('admin-config-visible').checked = config.visible !== false;

        const modal = document.getElementById('admin-app-config-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function renderAdminProducts() {
        const oldTableBody = document.getElementById('admin-products-table-body');
        if (!oldTableBody) return;
        const tableBody = oldTableBody.cloneNode(false);
        oldTableBody.parentNode.replaceChild(tableBody, oldTableBody);

        // Aggregate matching products
        let prods = [];
        sessionProducts.forEach((cat, catIdx) => {
            if (selectedCategoryIdForProducts === 'all' || !selectedCategoryIdForProducts || cat.id === selectedCategoryIdForProducts) {
                cat.products.forEach((prod, pIdx) => {
                    prods.push({
                        ...prod,
                        catIndex: catIdx,
                        prodIndex: pIdx,
                        categoryName: cat.name,
                        categoryId: cat.id
                    });
                });
            }
        });

        // Search filter
        if (adminSearchQuery) {
            const q = adminSearchQuery.toLowerCase();
            prods = prods.filter(p => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
        }

        // Pagination clamping
        const totalProds = prods.length;
        const totalPages = Math.ceil(totalProds / adminItemsPerPage) || 1;
        if (adminCurrentPage > totalPages) adminCurrentPage = totalPages;
        if (adminCurrentPage < 1) adminCurrentPage = 1;

        const start = (adminCurrentPage - 1) * adminItemsPerPage;
        const paginated = prods.slice(start, start + adminItemsPerPage);

        // Update indicators
        const indicator = document.getElementById('admin-page-indicator');
        if (indicator) {
            indicator.textContent = `Página ${adminCurrentPage} de ${totalPages} (Total: ${totalProds})`;
        }

        const prevBtn = document.getElementById('btn-admin-prev');
        const nextBtn = document.getElementById('btn-admin-next');
        if (prevBtn) prevBtn.disabled = (adminCurrentPage === 1);
        if (nextBtn) nextBtn.disabled = (adminCurrentPage === totalPages);

        if (paginated.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.3; display: block; margin-bottom: 0.5rem;">search_off</span>
                        No se encontraron productos.
                    </td>
                </tr>
            `;
            return;
        }

        const showDragHandle = selectedCategoryIdForProducts !== 'all' && selectedCategoryIdForProducts;
        const dragHandleHtml = showDragHandle 
            ? `<div class="product-drag-handle" title="Mantén presionado para arrastrar y reordenar" style="padding: 0.35rem; background: #e2e8f0; color: #4a5568; border: none; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: grab;"><span class="material-symbols-outlined" style="font-size: 16px;">drag_indicator</span></div>`
            : '';

        paginated.forEach(p => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #EEF0F3';
            
            row.innerHTML = `
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <div style="width: 44px; height: 44px; border-radius: 8px; background-image: url('${p.image}'); background-size: cover; background-position: center; border: 1px solid #E2E8F0;"></div>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <strong style="color: var(--text-main); font-size: 0.9rem; display: block;">${p.title}</strong>
                    <small style="color: var(--text-muted); font-size: 0.75rem; font-family: monospace;">SKU: ${p.id}</small>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <span style="background: #edf2f7; color: #4a5568; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.78rem; font-weight: 500;">
                        ${p.categoryName}
                    </span>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle; text-align: center;">
                    <span style="font-weight: 600; color: var(--primary-color); font-size: 0.88rem;">
                        ${p.acabados_groups ? p.acabados_groups.length : 1}
                    </span>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle; text-align: center;">
                    <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
                        ${dragHandleHtml}
                        <button class="action-btn edit btn-edit-prod-new" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="Editar" style="padding: 0.35rem; font-size: 0.85rem;"><span class="material-symbols-outlined" style="font-size: 16px;">edit</span></button>
                        <button class="action-btn clone btn-clone-prod-new" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="Clonar" style="padding: 0.35rem; font-size: 0.85rem;"><span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span></button>
                        <button class="action-btn del btn-del-prod-new" data-cat="${p.catIndex}" data-prod="${p.prodIndex}" title="Eliminar" style="padding: 0.35rem; font-size: 0.85rem;"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
                    </div>
                </td>
            `;

            if (showDragHandle) {
                row.setAttribute('draggable', 'false');
                row.className = 'product-admin-row';
                row.setAttribute('data-index', p.prodIndex);
                
                const handle = row.querySelector('.product-drag-handle');
                handle.addEventListener('mousedown', () => row.setAttribute('draggable', 'true'));
                handle.addEventListener('touchstart', () => row.setAttribute('draggable', 'true'));
                handle.addEventListener('mouseup', () => row.setAttribute('draggable', 'false'));
                handle.addEventListener('touchend', () => row.setAttribute('draggable', 'false'));
                
                row.addEventListener('dragstart', (e) => {
                    row.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', p.prodIndex);
                });
                
                row.addEventListener('dragend', () => {
                    row.classList.remove('dragging');
                    row.setAttribute('draggable', 'false');
                });
            }

            row.querySelector('.btn-edit-prod-new').addEventListener('click', (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const pIdx = parseInt(e.currentTarget.getAttribute('data-prod'));
                openProductForm(cIdx, sessionProducts[cIdx].products[pIdx]);
            });

            row.querySelector('.btn-clone-prod-new').addEventListener('click', (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const pIdx = parseInt(e.currentTarget.getAttribute('data-prod'));
                cloneProduct(cIdx, pIdx);
            });

            row.querySelector('.btn-del-prod-new').addEventListener('click', async (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const pIdx = parseInt(e.currentTarget.getAttribute('data-prod'));
                const catName = sessionProducts[cIdx].name;
                const prodTitle = sessionProducts[cIdx].products[pIdx].title;
                if (confirm(`¿Eliminar "${prodTitle}"?`)) {
                    try {
                        await fetch('/api/products/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: prodTitle, category: catName })
                        });
                    } catch (error) {
                        console.error('Error al limpiar archivos de producto', error);
                    }

                    sessionProducts[cIdx].products.splice(pIdx, 1);
                    showAdminToast('Producto eliminado');
                    await saveProductsToServer();
                    renderAdminProducts();
                }
            });

            tableBody.appendChild(row);
        });

        // Habilitar dragover y drop en el tbody clonado
        if (showDragHandle) {
            tableBody.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingRow = tableBody.querySelector('.dragging');
                if (!draggingRow) return;
                
                const afterElement = getDragAfterElement(tableBody, e.clientY, '.product-admin-row');
                if (afterElement == null) {
                    tableBody.appendChild(draggingRow);
                } else {
                    tableBody.insertBefore(draggingRow, afterElement);
                }
            });
            
            tableBody.addEventListener('drop', async (e) => {
                e.preventDefault();
                const draggingRow = tableBody.querySelector('.dragging');
                if (!draggingRow) return;
                
                const rows = [...tableBody.querySelectorAll('.product-admin-row')];
                const catIdx = sessionProducts.findIndex(c => c.id === selectedCategoryIdForProducts);
                if (catIdx === -1) return;
                
                const oldProductsList = [...sessionProducts[catIdx].products];
                const newProductsList = [];
                const start = (adminCurrentPage - 1) * adminItemsPerPage;
                
                rows.forEach(r => {
                    const originalIdx = parseInt(r.getAttribute('data-index'));
                    if (!isNaN(originalIdx) && oldProductsList[originalIdx]) {
                        newProductsList.push(oldProductsList[originalIdx]);
                    }
                });
                
                const fullProductsList = [...sessionProducts[catIdx].products];
                for (let i = 0; i < newProductsList.length; i++) {
                    fullProductsList[start + i] = newProductsList[i];
                }
                
                sessionProducts[catIdx].products = fullProductsList;
                
                await saveProductsToServer();
                renderAdminProducts();
                showAdminToast('✅ Productos reordenados y guardados físicamente');
            });
        }
    }

    function renderAdminTree() {
        const oldCategoryTree = document.getElementById('admin-category-tree');
        if (!oldCategoryTree) return;
        const adminCategoryTreeEl = oldCategoryTree.cloneNode(false);
        oldCategoryTree.parentNode.replaceChild(adminCategoryTreeEl, oldCategoryTree);

        if (sessionProducts.length === 0) {
            adminCategoryTreeEl.innerHTML = `
                <div class="admin-empty-tree">
                    <span class="material-symbols-outlined">inventory_2</span>
                    <p>No hay categorías aún.<br>Creá la primera desde el formulario de arriba.</p>
                </div>
            `;
            return;
        }

        sessionProducts.forEach((cat, catIndex) => {
            const catBlock = document.createElement('div');
            catBlock.className = 'cat-shelf';
            catBlock.setAttribute('draggable', 'false');
            catBlock.setAttribute('data-index', catIndex);

            catBlock.innerHTML = `
                <div class="cat-shelf-header" style="cursor: pointer;" data-cat-id="${cat.id}">
                    <div class="cat-drag-handle" title="Mantén presionado para arrastrar y reordenar" style="margin-right: 0.6rem; display: flex; align-items: center; justify-content: center; cursor: grab; padding: 0.4rem; color: var(--text-muted); flex-shrink: 0;" onclick="event.stopPropagation();">
                        <span class="material-symbols-outlined" style="font-size: 20px;">drag_indicator</span>
                    </div>
                    <div class="cat-shelf-cover" style="background-image: url('${cat.image}');"></div>
                    <div class="cat-shelf-meta" style="flex-grow: 1;">
                        <h4 class="cat-shelf-name">${cat.name}</h4>
                        <span class="cat-shelf-count" style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.78rem; font-weight: 600; display: inline-block; margin-top: 4px;">
                            ${cat.products.length} producto${cat.products.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div class="product-row-actions" onclick="event.stopPropagation();">
                        <button class="btn-edit-cat action-btn edit" data-cat="${catIndex}" title="Editar categoría"><span class="material-symbols-outlined">edit</span></button>
                        <button class="btn-clone-cat action-btn clone" data-cat="${catIndex}" title="Clonar categoría"><span class="material-symbols-outlined">content_copy</span></button>
                        <button class="btn-del-cat shelf-del-btn" data-cat="${catIndex}" title="Eliminar categoría">
                            <span class="material-symbols-outlined">folder_delete</span>
                        </button>
                    </div>
                </div>
            `;

            catBlock.querySelector('.cat-shelf-header').addEventListener('click', (e) => {
                const catId = e.currentTarget.getAttribute('data-cat-id');
                selectedCategoryIdForProducts = catId;
                currentAdminPhase = 'products';
                adminCurrentPage = 1;
                adminSearchQuery = '';
                const searchInput = document.getElementById('admin-search');
                if (searchInput) searchInput.value = '';
                renderAdminUX();
            });

            // Arrastre solo con el handle
            const handle = catBlock.querySelector('.cat-drag-handle');
            if (handle) {
                handle.addEventListener('mousedown', () => catBlock.setAttribute('draggable', 'true'));
                handle.addEventListener('touchstart', () => catBlock.setAttribute('draggable', 'true'));
                handle.addEventListener('mouseup', () => catBlock.setAttribute('draggable', 'false'));
                handle.addEventListener('touchend', () => catBlock.setAttribute('draggable', 'false'));
            }

            catBlock.addEventListener('dragstart', (e) => {
                catBlock.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', catIndex);
            });

            catBlock.addEventListener('dragend', () => {
                catBlock.classList.remove('dragging');
                catBlock.setAttribute('draggable', 'false');
            });

            adminCategoryTreeEl.appendChild(catBlock);
        });

        // ── Event Listeners de Categorías ──

        adminCategoryTreeEl.querySelectorAll('.btn-del-cat').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const catName = sessionProducts[cIdx].name;
                if (confirm(`¿Eliminar "${catName}" y todos sus productos? Esta acción no se puede deshacer.`)) {
                    try {
                        await fetch('/api/categories/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: catName })
                        });
                    } catch (error) {
                        console.error('Error al limpiar archivos de categoría', error);
                    }

                    sessionProducts.splice(cIdx, 1);
                    showAdminToast('Categoría eliminada');
                    await saveProductsToServer();
                    renderAdminUX();
                }
            });
        });

        adminCategoryTreeEl.querySelectorAll('.btn-edit-cat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const cat = sessionProducts[cIdx];
                
                editingCategoryIndex = cIdx;
                oldCategoryName = cat.name;
                
                document.getElementById('admin-cat-id').value = cat.id;
                document.getElementById('admin-cat-name').value = cat.name;
                
                const formTitle = document.getElementById('admin-category-form-title');
                if (formTitle) formTitle.innerHTML = 'Editar Categoría';
                document.getElementById('btn-save-cat').textContent = "Actualizar Categoría";
                
                const catModal = document.getElementById('admin-category-modal');
                if (catModal) catModal.style.display = 'flex';
            });
        });

        adminCategoryTreeEl.querySelectorAll('.btn-clone-cat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                cloneCategory(cIdx);
            });
        });

        // Habilitar dragover y drop
        adminCategoryTreeEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = adminCategoryTreeEl.querySelector('.dragging');
            if (!draggingCard) return;
            
            const afterElement = getDragAfterElement(adminCategoryTreeEl, e.clientY, '.cat-shelf');
            if (afterElement == null) {
                adminCategoryTreeEl.appendChild(draggingCard);
            } else {
                adminCategoryTreeEl.insertBefore(draggingCard, afterElement);
            }
        });
        
        adminCategoryTreeEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            const draggingCard = adminCategoryTreeEl.querySelector('.dragging');
            if (!draggingCard) return;
            
            const cards = [...adminCategoryTreeEl.querySelectorAll('.cat-shelf')];
            const oldCategories = [...sessionProducts];
            const newCategories = [];
            
            cards.forEach(c => {
                const originalIdx = parseInt(c.getAttribute('data-index'));
                if (!isNaN(originalIdx) && oldCategories[originalIdx]) {
                    newCategories.push(oldCategories[originalIdx]);
                }
            });
            
            newCategories.forEach((c, idx) => {
                c.order = idx;
            });
            
            sessionProducts.length = 0;
            sessionProducts.push(...newCategories);
            
            await saveProductsToServer();
            renderAdminTree();
            showAdminToast('✅ Estanterías reordenadas y guardadas físicamente');
        });
    }

    // ── Clonar Producto ──
    function cloneProduct(cIdx, pIdx) {
        const original = sessionProducts[cIdx].products[pIdx];
        if (!original) return;

        // Deep clone para no arrastrar referencias en memoria
        const cloned = JSON.parse(JSON.stringify(original));

        // Modificar datos clave para evitar colisiones de IDs
        cloned.id    = `${cloned.id}-copia`;
        cloned.title = `${cloned.title} (Copia)`;

        // Abrir el formulario con los datos clonados pre-cargados
        openProductForm(cIdx, cloned);

        // Forzar modo "nuevo producto" para que al guardar se inserte, no se sobreescriba
        editingProductId = null;

        // Asegurar que el modal sea visible
        const modal = document.getElementById('admin-product-modal');
        if (modal) modal.style.display = 'flex';

        showAdminToast('📋 Editá el clon y guardalo para añadirlo al catálogo');
    }

    // ── Clonar Categoría ──
    function cloneCategory(cIdx) {
        const original = sessionProducts[cIdx];
        if (!original) return;

        // Deep clone
        const cloned = JSON.parse(JSON.stringify(original));

        // Modificar datos clave
        cloned.id   = `${cloned.id}-copia`;
        cloned.name = `${cloned.name} (Copia)`;
        cloned.order = sessionProducts.length;

        // Injectar en el formulario de categoría para que el usuario ajuste y guarde
        editingCategoryIndex = null;  // forzar modo creación
        oldCategoryName = null;

        document.getElementById('admin-cat-id').value   = cloned.id;
        document.getElementById('admin-cat-name').value = cloned.name;

        const formTitle = document.getElementById('admin-category-form-title');
        if (formTitle) formTitle.innerHTML = 'Clonar Categoría — Revisá y Guardá';
        document.getElementById('btn-save-cat').textContent = 'Guardar Categoría Clonada';

        const catModal = document.getElementById('admin-category-modal');
        if (catModal) catModal.style.display = 'flex';
        
        showAdminToast('📋 Ajustá el nombre/ID del clon y subí una foto de portada');
    }

    // Toast notification for admin actions
    function showAdminToast(msg) {
        let toast = document.getElementById('admin-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'admin-toast';
            toast.className = 'admin-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // ═════════════════════════════════════════════════
    //  ADMIN — Formulario de Producto (nuevo sistema limpio)
    // ═════════════════════════════════════════════════
    const productModal      = document.getElementById('admin-product-modal');
    const adminFormTitle    = document.getElementById('admin-form-title');
    const btnCancelProduct  = document.getElementById('btn-cancel-product');
    const adminAcabadosGroupsContainer = document.getElementById('admin-acabados-groups');
    const btnAddAcabadoGroup = document.getElementById('btn-add-acabado-group');

    // Estado del formulario: array de objetos que representan cada grupo
    // Cada grupo en memoria tiene: id (dom), pendingFiles, existingImages, coverIndex
    let activeGroupsUI = [];
    let groupCounter = 0;

    if (btnCancelProduct) {
        btnCancelProduct.addEventListener('click', () => { productModal.style.display = 'none'; });
    }

    // Helper: Encontrar el elemento más cercano para arrastrar y soltar (Drag and Drop)
    function getDragAfterElement(container, y, selector = '.medida-admin-row') {
        const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Helper: Crear fila de Medida con soporte Drag & Drop y diseño horizontal amplio de igual medida
    function createMedidaRow(groupId, medida = '', link = '', isDefault = false) {
        const row = document.createElement('div');
        row.className = 'medida-admin-row';
        row.setAttribute('draggable', 'false'); // Deshabilitado por defecto, activado al tocar el handle
        row.innerHTML = `
            <div class="medida-drag-handle" title="Mantén presionado para arrastrar y reordenar" style="display: flex; align-items: center; justify-content: center; cursor: grab; padding: 4px; flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 20px; color: var(--text-muted);">drag_indicator</span>
            </div>
            <input type="radio" name="default-medida-${groupId}" class="medida-default-radio" title="Marcar como variante por defecto" ${isDefault ? 'checked' : ''} style="margin: 0 0.25rem; cursor: pointer; accent-color: var(--primary-color); width: 1.2rem; height: 1.2rem; flex-shrink: 0;">
            <div class="medida-inputs-container">
                <input type="text" class="medida-valor" placeholder="Medida (ej: 140x45 cm)" value="${medida}">
                <input type="text" class="medida-link" placeholder="Link de pago (vacío = WA)" value="${link}">
            </div>
            <button type="button" class="btn-clone-medida"
                    style="background:none;border:none;cursor:pointer;color:var(--primary-color);padding:0.4rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;" title="Clonar variante">
                <span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span>
            </button>
            <button type="button" class="btn-remove-medida"
                    style="background:none;border:none;cursor:pointer;color:#EF4444;font-size:1.4rem;line-height:1;padding:0.4rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;" title="Eliminar">&times;</button>
        `;

        row.querySelector('.btn-remove-medida').addEventListener('click', () => row.remove());
        
        row.querySelector('.btn-clone-medida').addEventListener('click', () => {
            const currentMedida = row.querySelector('.medida-valor').value.trim();
            const currentLink = row.querySelector('.medida-link').value.trim();
            
            // Crear nueva fila clonada
            const newRow = createMedidaRow(groupId, currentMedida, currentLink, false);
            
            // Insertar exactamente debajo de la original en el DOM
            row.after(newRow);
            
            // Foco en el primer campo del clon y seleccionar texto
            const valInput = newRow.querySelector('.medida-valor');
            if (valInput) {
                valInput.focus();
                valInput.select();
            }
        });
        
        // Habilitar arrastre solo al sostener el handle (mantiene campos de texto editables)
        const dragHandle = row.querySelector('.medida-drag-handle');
        dragHandle.addEventListener('mousedown', () => {
            row.setAttribute('draggable', 'true');
        });
        dragHandle.addEventListener('touchstart', () => {
            row.setAttribute('draggable', 'true');
        });
        
        row.addEventListener('dragstart', (e) => {
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
        });
        
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            row.setAttribute('draggable', 'false');
        });

        return row;
    }

    // Helper: Encontrar el thumbnail más cercano al arrastrar (Drag and Drop horizontal)
    function getDragAfterThumbElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.preview-thumb:not(.dragging-thumb)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Helper: Renderizar previsualizaciones de un grupo
    function renderGroupPreview(groupId) {
        const gState = activeGroupsUI.find(g => g.id === groupId);
        if (!gState) return;
        const grid = document.getElementById(`preview-grid-${groupId}`);
        if (!grid) return;
        
        // Clonar el grid para evitar acumulación de event listeners de dragover/drop
        const oldGrid = grid;
        const newGrid = oldGrid.cloneNode(false);
        oldGrid.parentNode.replaceChild(newGrid, oldGrid);
        
        gState.images.forEach((item, idx) => {
            if (!item) return;
            const isNew = item instanceof File;
            const url = isNew ? URL.createObjectURL(item) : item;
            const isCover = idx === 0;

            const thumb = document.createElement('div');
            thumb.className = 'preview-thumb' + (isNew ? ' preview-thumb--new' : '') + (isCover ? ' is-cover' : '');
            thumb.setAttribute('draggable', 'true');
            thumb.setAttribute('data-index', idx);
            thumb.style.cursor = 'grab';
            
            thumb.innerHTML = `
                <img src="${url}" alt="foto ${idx}">
                <span class="cover-badge">Portada</span>
                ${isNew ? '<span class="new-badge">Nueva</span>' : ''}
                <button type="button" class="preview-remove" title="Eliminar foto">&times;</button>
                <div class="thumb-nav-buttons" onclick="event.stopPropagation();">
                    ${idx > 0 ? `<button type="button" class="btn-thumb-move btn-thumb-left" title="Mover a la izquierda"><span class="material-symbols-outlined">chevron_left</span></button>` : '<span></span>'}
                    ${idx < gState.images.length - 1 ? `<button type="button" class="btn-thumb-move btn-thumb-right" title="Mover a la derecha"><span class="material-symbols-outlined">chevron_right</span></button>` : '<span></span>'}
                </div>
            `;
            
            // Botones de navegación (izquierda/derecha)
            const btnLeft = thumb.querySelector('.btn-thumb-left');
            const btnRight = thumb.querySelector('.btn-thumb-right');
            
            if (btnLeft) {
                btnLeft.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const temp = gState.images[idx];
                    gState.images[idx] = gState.images[idx - 1];
                    gState.images[idx - 1] = temp;
                    renderGroupPreview(groupId);
                });
            }
            
            if (btnRight) {
                btnRight.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const temp = gState.images[idx];
                    gState.images[idx] = gState.images[idx + 1];
                    gState.images[idx + 1] = temp;
                    renderGroupPreview(groupId);
                });
            }

            // Evento Click: Seleccionar como portada (mover al índice 0) o eliminar
            thumb.addEventListener('click', (e) => {
                if (Date.now() - lastDragTime < 150) {
                    return; // Ignorar clics justo después de arrastrar
                }
                if (e.target.closest('.preview-remove')) {
                    e.stopPropagation();
                    gState.images.splice(idx, 1);
                    renderGroupPreview(groupId);
                    return;
                }
                if (idx > 0) {
                    const [selected] = gState.images.splice(idx, 1);
                    gState.images.unshift(selected);
                    renderGroupPreview(groupId);
                }
            });
            
            // Drag and Drop para reordenar miniaturas
            thumb.addEventListener('dragstart', (e) => {
                thumb.classList.add('dragging-thumb');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', idx);
            });
            
            thumb.addEventListener('dragend', () => {
                thumb.classList.remove('dragging-thumb');
                lastDragTime = Date.now();
            });
            
            newGrid.appendChild(thumb);
        });

        // Configurar dragover y drop en el grid clonado
        newGrid.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingThumb = newGrid.querySelector('.dragging-thumb');
            if (!draggingThumb) return;
            
            const afterElement = getDragAfterThumbElement(newGrid, e.clientX);
            if (afterElement == null) {
                newGrid.appendChild(draggingThumb);
            } else {
                newGrid.insertBefore(draggingThumb, afterElement);
            }
        });
        
        newGrid.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingThumb = newGrid.querySelector('.dragging-thumb');
            if (!draggingThumb) return;
            
            const thumbs = [...newGrid.querySelectorAll('.preview-thumb')];
            const newImages = [];
            
            thumbs.forEach(t => {
                const originalIdx = parseInt(t.getAttribute('data-index'));
                if (!isNaN(originalIdx) && gState.images[originalIdx]) {
                    newImages.push(gState.images[originalIdx]);
                }
            });
            
            gState.images = newImages;
            lastDragTime = Date.now(); // Registrar el tiempo de drag
            renderGroupPreview(groupId);
        });
    }

    // Crear DOM para un Grupo de Acabado
    function createAcabadoGroupUI(groupData = null) {
        const groupId = `group-${++groupCounter}`;
        
        const gState = {
            id: groupId,
            images: []
        };
        
        if (groupData) {
            if (groupData.images_list && groupData.images_list.length > 0) {
                gState.images = [...groupData.images_list];
            } else if (groupData.cover_image) {
                gState.images = [groupData.cover_image];
            }
        }

        activeGroupsUI.push(gState);

        const card = document.createElement('div');
        card.className = 'acabado-group-card'; // starts collapsed
        card.id = groupId;
        card.innerHTML = `
            <div class="acabado-group-header">
                <h4 class="group-header-title">
                    <span class="material-symbols-outlined" style="font-size:18px;">palette</span>
                    <span class="group-header-text">${groupData && groupData.acabado_name ? groupData.acabado_name : 'Nuevo Acabado'}</span>
                </h4>
                <div class="header-actions" onclick="event.stopPropagation();">
                    <button type="button" class="btn-clone-group" title="Duplicar Acabado Completo">
                        <span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span>
                    </button>
                    <button type="button" class="btn-toggle-group" title="Expandir/Colapsar">
                        <span class="material-symbols-outlined">expand_more</span>
                    </button>
                    <button type="button" class="btn-remove-group" title="Eliminar Grupo Completo">&times;</button>
                </div>
            </div>
            
            <div class="acabado-group-body">
                <div class="form-group" style="margin-bottom:1rem;">
                    <label style="font-size:0.85rem;">Nombre del Acabado / Color</label>
                    <input type="text" class="group-acabado-name" placeholder="ej: Blanco Hidroesmalte" value="${groupData ? (groupData.acabado_name || '') : ''}">
                </div>

                <div class="form-group" style="margin-bottom:1rem;">
                    <label style="font-size:0.85rem; margin-bottom: 0.4rem; display: block;">Fotos de este Acabado <small style="font-weight:400;">(Clic para elegir portada)</small></label>
                    <div class="image-drop-zone" id="drop-zone-${groupId}" style="border: 2px dashed #CBD5E1; border-radius: 12px; padding: 1.5rem; text-align: center; background: #FAF9F6; transition: all 0.2s ease; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;">
                        <span class="material-symbols-outlined" style="font-size: 32px; color: var(--primary-color, #c0510a); opacity: 0.7;">upload_file</span>
                        <span style="font-size: 0.85rem; color: var(--text-main); font-weight: 600;">Arrastrá tus fotos acá o hacé clic para explorar</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">Soporta múltiples imágenes (se optimizarán automáticamente)</span>
                        <input type="file" id="file-${groupId}" accept="image/*" multiple style="display: none;">
                    </div>
                    <div id="preview-grid-${groupId}" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem;"></div>
                </div>

                <div class="form-group attr-group" style="background:#f8f9fb;padding:0.8rem;border-radius:8px;border:1px solid #E8ECF0;margin-bottom:0;">
                    <label style="font-size:0.85rem;margin-bottom:0.5rem;display:flex;align-items:center;gap:0.3rem;">
                        <span class="material-symbols-outlined" style="font-size:16px;">straighten</span>
                        Medidas y Links
                    </label>
                    <div class="group-medidas-rows"></div>
                    <button type="button" class="btn-add-medida-row btn-outline mt-1" style="font-size:0.8rem;padding:0.3rem 0.8rem;width:auto;min-width:auto;">+ Agregar Medida</button>
                </div>
            </div>
        `;

        // Expand/Collapse logic
        const header = card.querySelector('.acabado-group-header');
        const body = card.querySelector('.acabado-group-body');
        const titleText = card.querySelector('.group-header-text');
        const nameInput = card.querySelector('.group-acabado-name');

        header.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-group') || e.target.closest('.btn-clone-group')) return;
            const isOpen = card.classList.contains('is-open');
            if (isOpen) {
                card.classList.remove('is-open');
                body.style.display = 'none';
            } else {
                card.classList.add('is-open');
                body.style.display = 'block';
            }
        });

        nameInput.addEventListener('input', (e) => {
            titleText.textContent = e.target.value.trim() || 'Nuevo Acabado';
        });

        card.querySelector('.btn-remove-group').addEventListener('click', () => {
            if (confirm('¿Seguro que querés eliminar este grupo de acabado entero?')) {
                card.remove();
                activeGroupsUI = activeGroupsUI.filter(g => g.id !== groupId);
            }
        });

        // Duplicador de grupo de acabados
        card.querySelector('.btn-clone-group').addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Gather current measures in the card DOM
            const clonedMedidas = [];
            card.querySelectorAll('.medida-admin-row').forEach(row => {
                const val = row.querySelector('.medida-valor')?.value.trim() || '';
                const link = row.querySelector('.medida-link')?.value.trim() || '';
                const isDefault = row.querySelector('.medida-default-radio')?.checked || false;
                clonedMedidas.push({ medida: val, link: link, default: isDefault });
            });

            // Gather images and pending files
            const cloneData = {
                acabado_name: nameInput.value.trim() ? `${nameInput.value.trim()} Copia` : 'Copia de Acabado',
                images_list: gState.images ? [...gState.images] : [],
                medidas_variants: clonedMedidas
            };

            // Call UI builder to create the duplicate group
            createAcabadoGroupUI(cloneData);

            // Get the newly created card (it is the last child of container)
            const newCard = adminAcabadosGroupsContainer.lastElementChild;
            if (newCard && newCard !== card) {
                // Insert the new card exactly below the current card in the DOM
                card.after(newCard);
            }

            // Copy pending Files to the new group's state
            const newGroupId = newCard.id;
            const newGState = activeGroupsUI.find(g => g.id === newGroupId);
            if (newGState && gState.images.some(img => img instanceof File)) {
                newGState.images = [...gState.images];
                // Re-render preview for the cloned card
                renderGroupPreview(newGroupId);
            }

            showAdminToast('✅ Acabado duplicado con sus variantes');
        });

        const fileInput = card.querySelector(`#file-${groupId}`);
        
        // Helper asíncrono para procesar archivos de fotos (común a Input y Drop-Zone)
        const processUploadedFiles = async (rawFiles) => {
            if (rawFiles.length === 0) return;
            
            if (btnGenerateJson) {
                btnGenerateJson.disabled = true;
                btnGenerateJson.textContent = '⏳ Procesando imágenes...';
            }

            try {
                const converted = await Promise.all(rawFiles.map(f => convertImageToWebP(f)));
                gState.images = gState.images.concat(converted.map(r => r.file));
            } catch (err) {
                console.error('Error convirtiendo imágenes del producto:', err);
            } finally {
                if (btnGenerateJson) {
                    btnGenerateJson.disabled = false;
                    btnGenerateJson.textContent = 'Guardar Producto';
                }
                renderGroupPreview(groupId);
            }
        };

        fileInput.addEventListener('change', (e) => {
            processUploadedFiles(Array.from(e.target.files));
            fileInput.value = '';
        });

        // Configurar comportamiento interactivo de la Drop-Zone
        const dropZone = card.querySelector(`#drop-zone-${groupId}`);
        
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        const resetDropZoneStyle = () => {
            dropZone.classList.remove('dragover');
        };
        
        dropZone.addEventListener('dragleave', resetDropZoneStyle);
        dropZone.addEventListener('dragend', resetDropZoneStyle);
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            resetDropZoneStyle();
            
            const rawFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            processUploadedFiles(rawFiles);
        });

        const medidasContainer = card.querySelector('.group-medidas-rows');
        
        // Agregar soporte de Drag & Drop para reordenar las filas de medidas de forma ultra suave
        medidasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingRow = medidasContainer.querySelector('.dragging');
            if (!draggingRow) return;
            
            const afterElement = getDragAfterElement(medidasContainer, e.clientY);
            if (afterElement == null) {
                medidasContainer.appendChild(draggingRow);
            } else {
                medidasContainer.insertBefore(draggingRow, afterElement);
            }
        });

        card.querySelector('.btn-add-medida-row').addEventListener('click', () => {
            medidasContainer.appendChild(createMedidaRow(groupId));
        });

        if (groupData && groupData.medidas_variants) {
            groupData.medidas_variants.forEach(m => {
                medidasContainer.appendChild(createMedidaRow(groupId, m.medida, m.link, m.default));
            });
        }

        adminAcabadosGroupsContainer.appendChild(card);
        renderGroupPreview(groupId);
    }

    if (btnAddAcabadoGroup) {
        btnAddAcabadoGroup.addEventListener('click', () => createAcabadoGroupUI());
    }

    // ── Abrir formulario ──
    let sourceCategoryIdx = null; // tracks which category the product came from

    function openProductForm(cIdx, existingProd = null) {
        targetCategoryIdForProduct = cIdx;
        sourceCategoryIdx = cIdx;                          // guardar categoría de origen
        editingProductId  = existingProd ? existingProd.id : null;

        // Limpiar estado de grupos
        if (adminAcabadosGroupsContainer) adminAcabadosGroupsContainer.innerHTML = '';
        activeGroupsUI = [];
        groupCounter = 0;

        // Campos globales
        document.getElementById('admin-id').value          = existingProd?.id          || '';
        document.getElementById('admin-title').value       = existingProd?.title       || '';
        document.getElementById('admin-description').value = existingProd?.description || '';

        // ── Poblar checkboxes de categorías y marcar principal ──
        const assignedCategoryIds = [];
        let primaryCategoryId = existingProd?.primaryCatId || null;

        if (existingProd) {
            sessionProducts.forEach(cat => {
                if (cat.products && cat.products.some(p => p.id === existingProd.id)) {
                    assignedCategoryIds.push(cat.id);
                }
            });
            if (!primaryCategoryId && assignedCategoryIds.length > 0) {
                primaryCategoryId = assignedCategoryIds[0];
            }
        } else {
            const currentCatId = sessionProducts[cIdx]?.id;
            if (currentCatId) {
                assignedCategoryIds.push(currentCatId);
                primaryCategoryId = currentCatId;
            }
        }

        const checkboxesContainer = document.getElementById('product-categories-checkboxes');
        if (checkboxesContainer) {
            checkboxesContainer.innerHTML = '';
            sessionProducts.forEach((cat) => {
                const isChecked = assignedCategoryIds.includes(cat.id);
                const isPrimary = cat.id === primaryCategoryId;

                const row = document.createElement('div');
                row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid #F0F2F5;';

                const checkboxLabel = document.createElement('label');
                checkboxLabel.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:500; color:var(--text-main); margin:0;';
                checkboxLabel.innerHTML = `
                    <input type="checkbox" class="cat-checkbox" value="${cat.id}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
                    <span>${cat.name}</span>
                `;

                const radioLabel = document.createElement('label');
                radioLabel.style.cssText = 'display:flex; align-items:center; gap:4px; font-size:0.8rem; color:var(--text-muted); cursor:pointer; margin:0;';
                radioLabel.innerHTML = `
                    <input type="radio" name="primary-category" class="cat-primary-radio" value="${cat.id}" ${isPrimary ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <span>Principal</span>
                `;

                row.appendChild(checkboxLabel);
                row.appendChild(radioLabel);
                checkboxesContainer.appendChild(row);

                const radioInput = radioLabel.querySelector('.cat-primary-radio');
                const checkboxInput = checkboxLabel.querySelector('.cat-checkbox');

                radioInput.addEventListener('change', () => {
                    if (radioInput.checked) {
                        checkboxInput.checked = true;
                    }
                });
            });
        }

        // Variante opcional
        const optV = existingProd?.optional_variant || {};
        document.getElementById('admin-opt-label').value   = optV.label   || '';
        document.getElementById('admin-opt-options').value = optV.options ? optV.options.join(', ') : '';

        // Etiquetas
        document.getElementById('admin-tags').value = existingProd?.tags ? existingProd.tags.join(', ') : '';

        // Poblar grupos de acabados
        if (existingProd && existingProd.acabados_groups && existingProd.acabados_groups.length > 0) {
            existingProd.acabados_groups.forEach(g => createAcabadoGroupUI(g));
        } else if (existingProd) {
            // Compatibilidad: migrar visualmente el producto viejo a un grupo
            const legacyGroup = {
                acabado_name: existingProd.acabado || '',
                cover_image: typeof existingProd.image === 'string' ? existingProd.image : (existingProd.image?.[0] || ''),
                images_list: existingProd.images_list || (Array.isArray(existingProd.image) ? existingProd.image : [existingProd.image]),
                medidas_variants: existingProd.medidas_variants || []
            };
            createAcabadoGroupUI(legacyGroup);
        } else {
            // Producto nuevo: crear al menos un grupo vacío
            createAcabadoGroupUI();
        }

        const isClon = existingProd && existingProd.id && existingProd.id.endsWith('-copia');
        adminFormTitle.textContent = existingProd
            ? (isClon ? `📋 Clonando: ${existingProd.title}` : `Editando: ${existingProd.title}`)
            : `Nuevo Producto en ${sessionProducts[cIdx].name}`;
        productModal.style.display = 'flex';
        productModal.scrollIntoView({ behavior: 'smooth' });
    }

    // ── Guardar producto ──
    const btnGenerateJson = document.getElementById('btn-generate-json');
    if (btnGenerateJson) {
        btnGenerateJson.addEventListener('click', async () => {
            const idVal = document.getElementById('admin-id').value.trim();
            if (!idVal) { alert('El ID es obligatorio.'); return; }

            btnGenerateJson.disabled    = true;
            btnGenerateJson.textContent = 'Guardando...';

            const pTitle  = document.getElementById('admin-title').value;
            const catName = sessionProducts[targetCategoryIdForProduct].name;

            const finalAcabadosGroups = [];

            for (const gState of activeGroupsUI) {
                const card = document.getElementById(gState.id);
                if (!card) continue;

                const uploadedImages = [];
                for (const item of gState.images) {
                    if (item instanceof File) {
                        const path = await uploadImageToServer(item, catName, pTitle);
                        if (path) uploadedImages.push(path);
                    } else {
                        uploadedImages.push(item);
                    }
                }
                
                gState.images = uploadedImages;

                const medidasContainer = card.querySelector('.group-medidas-rows');
                const medidasVariants = [...medidasContainer.querySelectorAll('.medida-admin-row')].map(row => ({
                    medida: row.querySelector('.medida-valor').value.trim(),
                    link:   row.querySelector('.medida-link').value.trim(),
                    default: row.querySelector('.medida-default-radio').checked
                })).filter(r => r.medida !== '');


                finalAcabadosGroups.push({
                    acabado_name: card.querySelector('.group-acabado-name').value.trim(),
                    cover_image: gState.images[0] || 'img/logo_provisional.png',
                    images_list: gState.images.length > 0 ? [...gState.images] : [],
                    medidas_variants: medidasVariants
                });
            }

            const optLabel   = document.getElementById('admin-opt-label').value.trim();
            const optRaw     = document.getElementById('admin-opt-options').value.trim();
            const optOptions = optRaw ? optRaw.split(',').map(s => s.trim()).filter(s => s) : [];

            const tagsRaw    = document.getElementById('admin-tags').value.trim();
            const tagsList   = tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(s => s) : [];

            const product = {
                id:          idVal,
                title:       document.getElementById('admin-title').value.trim(),
                description: document.getElementById('admin-description').value.trim(),
                image:       finalAcabadosGroups[0]?.cover_image || 'img/logo_provisional.png',
                acabados_groups: finalAcabadosGroups,
                tags:        tagsList,
                last_modified: Date.now()
            };

            if (optLabel && optOptions.length > 0) {
                product.optional_variant = { label: optLabel, options: optOptions };
            }

            // Obtener categorías seleccionadas y principal
            const checkboxesContainer = document.getElementById('product-categories-checkboxes');
            const selectedCatIds = [...checkboxesContainer.querySelectorAll('.cat-checkbox:checked')].map(cb => cb.value);
            const primaryRadio = checkboxesContainer.querySelector('.cat-primary-radio:checked');
            const primaryCatId = primaryRadio ? primaryRadio.value : null;

            if (selectedCatIds.length === 0) {
                alert('Debes seleccionar al menos una categoría.');
                btnGenerateJson.disabled = false;
                btnGenerateJson.textContent = 'Guardar Producto en Servidor';
                return;
            }

            if (!primaryCatId || !selectedCatIds.includes(primaryCatId)) {
                alert('Debes elegir una de las categorías seleccionadas como la Principal.');
                btnGenerateJson.disabled = false;
                btnGenerateJson.textContent = 'Guardar Producto en Servidor';
                return;
            }

            product.primaryCatId = primaryCatId;

            // Validar duplicado de ID si es producto nuevo
            if (!editingProductId) {
                let idExists = false;
                let existingInCat = '';
                for (const catId of selectedCatIds) {
                    const catObj = sessionProducts.find(c => c.id === catId);
                    if (catObj && catObj.products && catObj.products.some(p => p.id === product.id)) {
                        idExists = true;
                        existingInCat = catObj.name;
                        break;
                    }
                }
                if (idExists) {
                    alert(`Ya existe un producto con el ID "${product.id}" en la categoría "${existingInCat}". Cambiá el ID e intentá de nuevo.`);
                    btnGenerateJson.disabled = false;
                    btnGenerateJson.textContent = 'Guardar Producto en Servidor';
                    return;
                }
            }

            // Aplicar cambios en todas las categorías de sessionProducts
            sessionProducts.forEach(cat => {
                if (!cat.products) cat.products = [];

                const isChecked = selectedCatIds.includes(cat.id);
                const matchIndex = cat.products.findIndex(p => p.id === (editingProductId || product.id));

                if (isChecked) {
                    if (matchIndex !== -1) {
                        cat.products[matchIndex] = product;
                    } else {
                        cat.products.push(product);
                    }
                } else {
                    if (matchIndex !== -1) {
                        cat.products.splice(matchIndex, 1);
                    }
                }
            });

            showAdminToast(editingProductId ? '✅ Producto actualizado en todas las categorías' : '✅ Producto agregado a las categorías');

            await saveProductsToServer();

            productModal.style.display = 'none';
            renderAdminUX();

            btnGenerateJson.disabled    = false;
            btnGenerateJson.textContent = 'Guardar Producto en Servidor';
        });
    }

    // 6. Search View — Dynamic filters & real-time search
    const searchInput = document.getElementById('search-input');
    const searchFilterChips = document.getElementById('search-filter-chips');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchEmptyState = document.getElementById('search-empty-state');

    let activeSearchCategoryId = 'all';

    function buildSearchFilters() {
        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
        if (!searchFilterChips || typeof sourceData === 'undefined') return;
        searchFilterChips.innerHTML = '';

        // "Todos" chip
        const allChip = document.createElement('button');
        allChip.className = 'chip' + (activeSearchCategoryId === 'all' ? ' active' : '');
        allChip.textContent = 'Todos';
        allChip.dataset.catId = 'all';
        searchFilterChips.appendChild(allChip);

        sourceData.forEach(cat => {
            const chip = document.createElement('button');
            chip.className = 'chip' + (activeSearchCategoryId === cat.id ? ' active' : '');
            chip.textContent = cat.name;
            chip.dataset.catId = cat.id;
            searchFilterChips.appendChild(chip);
        });

        searchFilterChips.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                activeSearchCategoryId = chip.dataset.catId;
                buildSearchFilters();
                runSearch();
            });
        });
    }

    // --- BUSCADOR CONSCIENTE DE LAS VARIANTES (ACABADOS) ---
    
    // Función interna para generar el índice virtual de productos y variantes
    function getIndexedProducts() {
        const indexed = [];
        // Usar sessionProducts como fuente de verdad activa si existe (para tener productos creados/editados)
        const sourceProducts = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) 
            ? sessionProducts 
            : (typeof productsData !== 'undefined' ? productsData : []);

        sourceProducts.forEach(cat => {
            if (!cat.products) return;
            cat.products.forEach(product => {
                let indexedAnyVariant = false;

                // 1. Indexar cada variante/acabado virtual por separado
                if (product.acabados_groups && Array.isArray(product.acabados_groups)) {
                    product.acabados_groups.forEach(acabado => {
                        if (acabado.acabado_name) {
                            indexed.push({
                                id: product.id,
                                product: product,
                                cat: cat,
                                nombre: product.title,
                                acabado: acabado.acabado_name,
                                // Guardar la imagen específica de la variante para un resultado visual premium
                                image: acabado.cover_image || product.image,
                                tags: product.tags || []
                            });
                            indexedAnyVariant = true;
                        }
                    });
                }

                // 2. Indexar el producto base original (solo si no se indexó ninguna variante con acabado)
                if (!indexedAnyVariant) {
                    indexed.push({
                        id: product.id,
                        product: product,
                        cat: cat,
                        nombre: product.title,
                        acabado: '',
                        image: product.image,
                        tags: product.tags || []
                    });
                }
            });
        });
        return indexed;
    }

    // Registrar clicks de búsqueda para rankear acabados en "Más Buscados"
    window.trackSearchClick = function(productId, acabado) {
        try {
            const rankingRaw = localStorage.getItem('searchPopularityRanking') || '{}';
            const ranking = JSON.parse(rankingRaw);
            
            // Incrementar popularidad del producto base
            ranking[productId] = (ranking[productId] || 0) + 1;
            
            // Incrementar popularidad del acabado específico si aplica
            if (acabado) {
                const key = `${productId}::${acabado}`;
                ranking[key] = (ranking[key] || 0) + 1;
            }
            
            localStorage.setItem('searchPopularityRanking', JSON.stringify(ranking));
            console.log(`[Search Tracking] Click registrado. Prod: ${productId}, Acabado: ${acabado || 'Ninguno'}`);
        } catch (e) {
            console.error('[Search Tracking] Error al guardar popularidad:', e);
        }
    };

    const normalizeForSearch = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    function runSearch() {
        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
        if (!searchResultsContainer || typeof sourceData === 'undefined') return;
        
        const rawQuery = searchInput ? searchInput.value : '';
        const query = normalizeForSearch(rawQuery).trim();

        // Si no hay consulta de búsqueda, renderizar la landing inspiradora del constructor
        if (!query) {
            const hasDynamicContent = renderSectionContent('search', searchResultsContainer);
            if (hasDynamicContent) {
                if (searchEmptyState) searchEmptyState.style.display = 'none';
                return;
            }
        }

        const indexed = getIndexedProducts();
        let results = [];

        indexed.forEach(item => {
            // Filtrar por categoría seleccionada
            if (activeSearchCategoryId !== 'all' && item.cat.id !== activeSearchCategoryId) return;

            // Coincidir consulta con título, acabado, descripción original o tags (normalizando acentos)
            const matchesQuery = !query ||
                normalizeForSearch(item.nombre).includes(query) ||
                (item.acabado && normalizeForSearch(item.acabado).includes(query)) ||
                (item.product.description && normalizeForSearch(item.product.description).includes(query)) ||
                (item.tags && item.tags.some(tag => normalizeForSearch(tag).includes(query)));

            if (matchesQuery) {
                if (activeSearchCategoryId === 'all') {
                    const key = `${item.id}::${item.acabado}`;
                    const existingIndex = results.findIndex(r => `${r.id}::${r.acabado}` === key);
                    if (existingIndex !== -1) {
                        const currentIsPrimary = item.product.primaryCatId === item.cat.id;
                        if (currentIsPrimary) {
                            results[existingIndex] = item;
                        }
                    } else {
                        results.push(item);
                    }
                } else {
                    results.push(item);
                }
            }
        });

        searchResultsContainer.innerHTML = '';

        if (results.length === 0) {
            if (searchEmptyState) searchEmptyState.style.display = 'flex';
            return;
        }
        if (searchEmptyState) searchEmptyState.style.display = 'none';

        results.forEach(item => {
            const { product, cat, nombre, acabado, image } = item;
            const card = document.createElement('div');
            card.className = 'feed-card';
            
            // Badge premium de variante si aplica
            const acabadoBadge = acabado 
                ? `<span style="position: absolute; top: 12px; right: 12px; z-index: 5; background: var(--primary-color, #c0510a); color: white; border: none; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; font-size: 0.68rem; padding: 0.25rem 0.65rem; border-radius: 50px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">${acabado}</span>`
                : '';

            const productCover = Array.isArray(image) ? image[0] : (image || 'img/logo_provisional.png');

            card.innerHTML = `
                <div class="feed-card-photo-container">
                    <img src="${productCover}" class="feed-card-img" alt="${nombre}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded'); if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                    ${acabadoBadge}
                    <div class="feed-card-gradient"></div>
                    <div class="feed-card-info">
                        <span class="feed-card-cat">${cat.name}</span>
                        <h3 class="feed-card-title">${nombre}</h3>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                // Registrar tracking de popularidad (base + variante)
                if (window.trackSearchClick) window.trackSearchClick(product.id, acabado);
                
                // Mostrar detalle con acabado preseleccionado
                if (window.showProductDetail) window.showProductDetail(product, cat.name, acabado);
            });
            
            searchResultsContainer.appendChild(card);
        });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CATEGORY FEED — Vista exclusiva por categoría
    // Solo se accede desde las tarjetas de la Home.
    // Sin header, sin botón volver, sin título: solo fotos.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const categoryFeedView = document.getElementById('view-category-feed');
    const categoryFeedList = document.getElementById('category-feed-container');
    const categoryFeedEmpty = document.getElementById('category-feed-empty');

    function navigateToCategoryFeed(categoryId) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('cat') !== categoryId) {
            const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + `?cat=${categoryId}`;
            window.history.pushState({ viewId: 'view-category-feed', categoryId }, document.title, cleanUrl);
        }

        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : productsData;
        if (typeof sourceData === 'undefined') return;

        const cat = sourceData.find(c => c.id === categoryId);
        if (!cat) return;

        // Configurar atributos para compartir categoría
        if (window.btnShareHeader) {
            window.btnShareHeader.setAttribute('data-category-id', categoryId);
            window.btnShareHeader.setAttribute('data-category-name', cat.name);
        }

        // Limpiar el feed anterior
        if (categoryFeedList) categoryFeedList.innerHTML = '';

        if (!cat.products || cat.products.length === 0) {
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'flex';
        } else {
            if (categoryFeedEmpty) categoryFeedEmpty.style.display = 'none';

            cat.products.forEach(product => {
                const card = document.createElement('div');
                card.className = 'feed-card';
                const productCover = Array.isArray(product.image) ? product.image[0] : product.image;
                card.innerHTML = `
                    <div class="feed-card-photo-container">
                        <img src="${productCover}" class="feed-card-img" alt="${product.title}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded'); if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                        <div class="feed-card-gradient"></div>
                        <div class="feed-card-info">
                            <h3 class="feed-card-title">${product.title}</h3>
                            ${product.acabados_groups && product.acabados_groups.length > 0
                                ? `<span class="feed-card-variants-badge">${product.acabados_groups.length} acabados</span>`
                                : ''}
                        </div>
                    </div>
                `;
                card.addEventListener('click', () => {
                    showProductDetail(product, cat.name);
                });
                categoryFeedList.appendChild(card);
            });
        }

        // Navegar: ocultar todo y mostrar solo el feed de categoría
        navigateToView('view-category-feed', { name: cat.name }, true);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SEARCH — Vista del buscador general
    // Solo se accede tocando el ícono de lupa en el nav.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function navigateToSearch(categoryId = 'all') {
        activeSearchCategoryId = categoryId;
        navigateToView('view-search');
        document.getElementById('app-container').scrollTop = 0;
        if (searchInput) searchInput.value = '';
        buildSearchFilters();
        runSearch();
    }

    // Attach search input listener
    if (searchInput) {
        searchInput.addEventListener('input', runSearch);
    }

    // Initialize search when tab is clicked (reset to "all" on direct nav tab click)
    const searchNavItem = document.querySelector('.nav-item[data-target="view-search"]');
    if (searchNavItem) {
        searchNavItem.addEventListener('click', () => {
            // Only reset if NOT navigating from a category card (navigateToSearch sets it first)
            // We reset on next tick so navigateToSearch (if called) has priority
            setTimeout(() => {
                buildSearchFilters();
                runSearch();
            }, 0);
        });
    }

    // Initialize search view on first load so it's ready
    buildSearchFilters();
    runSearch();

    // 7. Push Config
    const navNotifBtn = document.getElementById('nav-notif-btn');
    const navBadge = document.getElementById('nav-badge');
    const btnEnablePush = document.getElementById('btn-enable-push');

    if (navNotifBtn && navBadge) {
        navNotifBtn.addEventListener('click', () => { navBadge.style.display = 'none'; });
    }
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error: ', err));
        });
    }
    if (btnEnablePush) {
        btnEnablePush.addEventListener('click', async () => {
            if (!('Notification' in window)) return alert('Navegador no soporta notificaciones.');
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                btnEnablePush.textContent = '¡Activadas!';
                btnEnablePush.style.background = '#38a169';
                btnEnablePush.style.color = 'white';
            } else {
                alert('Necesitás darnos permiso.');
            }
        });
    }
    // --- LÓGICA DEL RENDERIZADO DEL CONSTRUCTOR EN EL ADMIN ---
    function renderAdminViewBuilderList() {
        const oldListContainer = document.getElementById('admin-section-components-list');
        if (!oldListContainer) return;
        const listContainer = oldListContainer.cloneNode(false);
        oldListContainer.parentNode.replaceChild(listContainer, oldListContainer);

        const section = document.getElementById('admin-view-builder-select')?.value || 'home';
        const stack = contentRegistry[section] || [];

        if (stack.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); border: 1.5px dashed #E8ECF0; border-radius: 12px; background: #fafafa;">
                    <span class="material-symbols-outlined" style="font-size: 32px; opacity: 0.4; display: block; margin-bottom: 0.4rem;">dashboard_customize</span>
                    Esta sección no tiene componentes personalizados.<br>Se mostrará el contenido por defecto de la plantilla.
                </div>
            `;
            return;
        }

        stack.forEach((comp, idx) => {
            const card = document.createElement('div');
            card.className = 'view-builder-card';
            card.setAttribute('data-index', idx);
            card.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.75rem 1rem;
                background: white;
                border-radius: var(--radius-md);
                border: 1.5px solid #E8ECF0;
                gap: 1rem;
                box-shadow: var(--shadow-sm);
                transition: all 0.2s ease;
            `;

            // Miniatura según el tipo de componente
            let thumbHtml = '';
            let detailsHtml = '';

            let positionBadgeHtml = '';
            if (section === 'home') {
                const pos = comp.position || 'bottom';
                const label = pos === 'top' ? 'Superior' : 'Inferior';
                const color = pos === 'top' ? '#2b6cb0' : '#4a5568';
                const bg = pos === 'top' ? '#ebf8ff' : '#edf2f7';
                positionBadgeHtml = `<span style="display:inline-block; font-size:0.68rem; font-weight:700; padding:0.15rem 0.4rem; border-radius:50px; color:${color}; background:${bg}; margin-top:2px;">${label}</span>`;
            }

            if (comp.type === 'banner') {
                thumbHtml = `<img src="${comp.image || 'img/logo_provisional.png'}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">`;
                detailsHtml = `
                    <strong style="font-size:0.92rem; color:var(--text-main); display: block;">🌅 Banner Promocional</strong>
                    <span style="font-size:0.75rem; color:var(--text-muted); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">
                        Link: ${comp.link || 'Sin acción'}
                    </span>
                    ${positionBadgeHtml}
                `;
            } else if (comp.type === 'product') {
                const res = findProductById(comp.productId);
                const cover = res ? (Array.isArray(res.product.image) ? res.product.image[0] : res.product.image) : 'img/logo_provisional.png';
                thumbHtml = `<img src="${cover}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">`;
                detailsHtml = `
                    <strong style="font-size:0.92rem; color:var(--text-main); display: block;">⭐️ Producto Destacado</strong>
                    <span style="font-size:0.75rem; color:var(--primary-color); font-weight: 600; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">
                        [${comp.badge || 'Destacado'}] ${res ? res.product.title : comp.productId}
                    </span>
                    ${positionBadgeHtml}
                `;
            } else if (comp.type === 'video') {
                const ytId = extractYouTubeId(comp.url);
                const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'img/logo_provisional.png';
                thumbHtml = `<img src="${ytThumb}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">`;
                detailsHtml = `
                    <strong style="font-size:0.92rem; color:var(--text-main); display: block;">🎥 Video Promocional</strong>
                    <span style="font-size:0.75rem; color:var(--text-muted); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">
                        YouTube: ${comp.url}
                    </span>
                    ${positionBadgeHtml}
                `;
            }

            card.innerHTML = `
                <div class="comp-drag-handle" title="Mantén presionado para arrastrar y reordenar" style="display: flex; align-items: center; justify-content: center; cursor: grab; padding: 0.4rem; color: var(--text-muted); flex-shrink: 0;"><span class="material-symbols-outlined" style="font-size: 18px;">drag_indicator</span></div>
                <div style="display:flex; align-items:center; gap: 0.8rem; overflow: hidden; flex: 1;">
                    ${thumbHtml}
                    <div style="overflow: hidden; flex: 1;">
                        ${detailsHtml}
                    </div>
                </div>
                <div style="display: flex; gap: 0.35rem; flex-shrink:0;">
                    <button type="button" class="btn-edit-comp action-btn edit" style="padding: 0.4rem;" title="Editar"><span class="material-symbols-outlined" style="font-size: 18px;">edit</span></button>
                    <button type="button" class="btn-delete-comp action-btn del" style="padding: 0.4rem;" title="Eliminar"><span class="material-symbols-outlined" style="font-size: 18px;">delete</span></button>
                </div>
            `;

            card.setAttribute('draggable', 'false');
            
            const handle = card.querySelector('.comp-drag-handle');
            handle.addEventListener('mousedown', () => card.setAttribute('draggable', 'true'));
            handle.addEventListener('touchstart', () => card.setAttribute('draggable', 'true'));
            handle.addEventListener('mouseup', () => card.setAttribute('draggable', 'false'));
            handle.addEventListener('touchend', () => card.setAttribute('draggable', 'false'));
            
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', idx);
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                card.setAttribute('draggable', 'false');
            });

            card.querySelector('.btn-edit-comp').addEventListener('click', () => openComponentForm(comp.id));
            card.querySelector('.btn-delete-comp').addEventListener('click', () => deleteComponent(section, idx));

            listContainer.appendChild(card);
        });

        // Habilitar dragover y drop en el listContainer clonado
        listContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = listContainer.querySelector('.dragging');
            if (!draggingCard) return;
            
            const afterElement = getDragAfterElement(listContainer, e.clientY, '.view-builder-card');
            if (afterElement == null) {
                listContainer.appendChild(draggingCard);
            } else {
                listContainer.insertBefore(draggingCard, afterElement);
            }
        });
        
        listContainer.addEventListener('drop', async (e) => {
            e.preventDefault();
            const draggingCard = listContainer.querySelector('.dragging');
            if (!draggingCard) return;
            
            const cards = [...listContainer.querySelectorAll('.view-builder-card')];
            const oldStack = [...contentRegistry[section]];
            const newStack = [];
            
            cards.forEach(c => {
                const originalIdx = parseInt(c.getAttribute('data-index'));
                if (!isNaN(originalIdx) && oldStack[originalIdx]) {
                    newStack.push(oldStack[originalIdx]);
                }
            });
            
            contentRegistry[section] = newStack;
            
            // Guardar en caliente en disco
            saveContentRegistry();
            renderAdminViewBuilderList();
            showAdminToast('✅ Componentes reordenados y guardados físicamente');
        });
    }

    function openComponentForm(compId = null) {
        const section = document.getElementById('admin-view-builder-select')?.value || 'home';
        
        // Cargar listado de productos del catálogo en el select
        const prodSelect = document.getElementById('admin-comp-product-select');
        if (prodSelect) {
            prodSelect.innerHTML = '';
            sessionProducts.forEach(cat => {
                cat.products.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = `[${cat.name}] - ${p.title}`;
                    prodSelect.appendChild(opt);
                });
            });
        }

        // Limpiar inputs del modal
        document.getElementById('admin-comp-id').value = '';
        document.getElementById('admin-comp-banner-image-url').value = '';
        document.getElementById('admin-comp-banner-link').value = '';
        document.getElementById('admin-comp-product-badge').value = '';
        document.getElementById('admin-comp-video-url').value = '';
        
        const bannerImagePreview = document.getElementById('comp-banner-preview');
        const videoPreview = document.getElementById('comp-video-preview');
        const fileInput = document.getElementById('admin-comp-banner-image');
        
        if (bannerImagePreview) bannerImagePreview.innerHTML = '';
        if (videoPreview) { videoPreview.innerHTML = ''; videoPreview.style.display = 'none'; }
        if (fileInput) fileInput.value = '';

        let type = 'banner';

        if (compId) {
            const stack = contentRegistry[section] || [];
            const comp = stack.find(c => c.id === compId);
            if (comp) {
                document.getElementById('admin-comp-id').value = comp.id;
                type = comp.type;
                document.getElementById('admin-comp-type').value = type;

                if (type === 'banner') {
                    document.getElementById('admin-comp-banner-image-url').value = comp.image || '';
                    document.getElementById('admin-comp-banner-link').value = comp.link || '';
                    if (comp.image && bannerImagePreview) {
                        bannerImagePreview.innerHTML = `<img src="${comp.image}" style="width:100%; border-radius:8px; border:1px solid #ddd; height: 100px; object-fit: cover;">`;
                    }
                } else if (type === 'product') {
                    if (prodSelect) prodSelect.value = comp.productId || '';
                    document.getElementById('admin-comp-product-badge').value = comp.badge || '';
                } else if (type === 'video') {
                    document.getElementById('admin-comp-video-url').value = comp.url || '';
                    const ytId = extractYouTubeId(comp.url);
                    if (ytId && videoPreview) {
                        videoPreview.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&mute=1&modestbranding=1&rel=0" allowfullscreen style="width:100%; height:120px; border:none; border-radius:8px;"></iframe>`;
                        videoPreview.style.display = 'block';
                    }
                }
            }
            document.getElementById('admin-component-form-title').textContent = '✏️ Editar Componente de Vista';
        } else {
            document.getElementById('admin-comp-type').value = 'banner';
            document.getElementById('admin-component-form-title').textContent = '➕ Agregar Componente de Vista';
        }

        // Cargar valor de posición (Solo Home) y alternar visibilidad del grupo de posición
        const posSelect = document.getElementById('admin-comp-position');
        if (posSelect) {
            if (compId) {
                const stack = contentRegistry[section] || [];
                const comp = stack.find(c => c.id === compId);
                posSelect.value = (comp && comp.position) ? comp.position : 'bottom';
            } else {
                posSelect.value = 'bottom';
            }
        }
        const posGroup = document.getElementById('admin-comp-position-group');
        if (posGroup) {
            posGroup.style.display = (section === 'home') ? 'block' : 'none';
        }

        // Forzar conmutación visual del panel correspondiente
        const panels = { banner: 'comp-panel-banner', product: 'comp-panel-product', video: 'comp-panel-video' };
        Object.entries(panels).forEach(([key, id]) => {
            const panel = document.getElementById(id);
            if (panel) panel.style.display = (key === type) ? 'block' : 'none';
        });

        const modal = document.getElementById('admin-component-modal');
        if (modal) modal.style.display = 'flex';
    }


    function moveComponent(section, index, direction) {
        if (!contentRegistry[section]) return;
        let stack = contentRegistry[section];
        
        if (direction === 'up' && index > 0) {
            [stack[index], stack[index - 1]] = [stack[index - 1], stack[index]];
        } else if (direction === 'down' && index < stack.length - 1) {
            [stack[index], stack[index + 1]] = [stack[index + 1], stack[index]];
        }

        contentRegistry[section] = stack;
        saveContentRegistry();

        // Hot reload visual in client layout
        if (section === 'home') {
            if (window.syncHomeOrder) window.syncHomeOrder();
            if (window.renderAdminHomeSectionsList) window.renderAdminHomeSectionsList();
            renderHome();
        }
        else if (section === 'search') runSearch();
        else if (section === 'avisos') renderAvisosCliente();

        renderAdminViewBuilderList();
    }

    function deleteComponent(section, index) {
        if (!contentRegistry[section] || !confirm('¿Seguro que querés eliminar este componente de la vista?')) return;

        contentRegistry[section].splice(index, 1);
        saveContentRegistry();

        // Hot reload visual in client layout
        if (section === 'home') {
            if (window.syncHomeOrder) window.syncHomeOrder();
            if (window.renderAdminHomeSectionsList) window.renderAdminHomeSectionsList();
            renderHome();
        }
        else if (section === 'search') runSearch();
        else if (section === 'avisos') renderAvisosCliente();

        renderAdminViewBuilderList();
    }

    // --- CONSTRUCTOR Y ORDENADOR DE SECCIONES DEL HOME ---
    function renderAdminHomeSectionsList() {
        const oldListContainer = document.getElementById('admin-home-sections-list');
        if (!oldListContainer) return;
        const listContainer = oldListContainer.cloneNode(false);
        oldListContainer.parentNode.replaceChild(listContainer, oldListContainer);

        const sectionsData = homeConfig.sections;
        const order = homeConfig.order;

        order.forEach((sectionId, idx) => {
            const card = document.createElement('div');
            card.className = 'section-row';
            card.setAttribute('data-id', sectionId);
            card.setAttribute('draggable', 'false');
            card.style.cssText = `
                background: #fafafa;
                border: 1.5px solid #E8ECF0;
                border-radius: 12px;
                padding: 1.2rem;
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
                box-shadow: var(--shadow-sm);
                transition: all 0.2s ease;
            `;

            if (sectionId.startsWith('comp-')) {
                // Componente dinámico individual del View Builder
                const homeStack = (typeof contentRegistry !== 'undefined' && contentRegistry.home) ? contentRegistry.home : [];
                const comp = homeStack.find(c => c.id === sectionId);
                
                if (!comp) return; // Continuar, componente inexistente
                
                let detailsText = '';
                let compIcon = 'campaign';
                let compLabel = 'Componente Dinámico';

                if (comp.type === 'banner') {
                    compIcon = 'image';
                    compLabel = '🌅 Banner Dinámico';
                    detailsText = comp.link ? `Enlace: ${comp.link}` : 'Sin enlace de acción';
                } else if (comp.type === 'product') {
                    compIcon = 'star';
                    compLabel = '⭐️ Destacado de Producto';
                    const res = findProductById(comp.productId);
                    detailsText = res ? `Producto: ${res.product.title}` : `ID Producto: ${comp.productId}`;
                } else if (comp.type === 'video') {
                    compIcon = 'smart_display';
                    compLabel = '🎥 Video Dinámico';
                    detailsText = `YouTube: ${comp.url}`;
                }

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="section-drag-handle" title="Mantén presionado para arrastrar y reordenar" style="display: flex; align-items: center; justify-content: center; cursor: grab; padding: 0.2rem; color: var(--text-muted); flex-shrink: 0;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">drag_indicator</span>
                            </div>
                            <span class="material-symbols-outlined" style="color: var(--primary-color, #c0510a); font-size: 1.35rem; vertical-align: middle;">${compIcon}</span>
                            <div>
                                <strong style="color: var(--text-main); font-size: 0.92rem; display:block;">${compLabel}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 250px;">
                                    ${detailsText}
                                </span>
                            </div>
                        </div>
                    </div>
                `;

            } else {
                // Sección predeterminada estática
                const section = sectionsData[sectionId] || { title: sectionId, subtitle: '', icon: 'folder' };
                
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="section-drag-handle" title="Mantén presionado para arrastrar y reordenar" style="display: flex; align-items: center; justify-content: center; cursor: grab; padding: 0.2rem; color: var(--text-muted); flex-shrink: 0;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">drag_indicator</span>
                            </div>
                            <span class="material-symbols-outlined" style="color: var(--primary-color, #c0510a); font-size: 1.35rem; vertical-align: middle;">${section.icon}</span>
                            <strong style="color: var(--text-main); font-size: 0.95rem;">${section.title} <span style="font-weight: normal; color: var(--text-muted); font-size: 0.8rem;">(ID: ${sectionId})</span></strong>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 0.72rem; font-weight:600; display:block; margin-bottom: 4px; color: var(--text-muted);">Título</label>
                            <input type="text" class="input-section-title" value="${section.title}" style="width:100%; padding:0.5rem 0.75rem; font-size:0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);" data-id="${sectionId}">
                        </div>
                        <div>
                            <label style="font-size: 0.72rem; font-weight:600; display:block; margin-bottom: 4px; color: var(--text-muted);">Subtítulo</label>
                            <input type="text" class="input-section-subtitle" value="${section.subtitle}" style="width:100%; padding:0.5rem 0.75rem; font-size:0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);" data-id="${sectionId}">
                        </div>
                        <div>
                            <label style="font-size: 0.72rem; font-weight:600; display:block; margin-bottom: 4px; color: var(--text-muted);">Ícono (Material)</label>
                            <input type="text" class="input-section-icon" value="${section.icon}" style="width:100%; padding:0.5rem 0.75rem; font-size:0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);" data-id="${sectionId}">
                        </div>
                    </div>
                `;

                // Listeners para Inputs
                const handleInputChange = (field, e) => {
                    const val = e.target.value.trim();
                    if (val) {
                        homeConfig.sections[sectionId][field] = val;
                        saveHomeConfig();
                        if (window.renderHome) window.renderHome();
                    }
                };

                card.querySelector('.input-section-title').addEventListener('change', (e) => handleInputChange('title', e));
                card.querySelector('.input-section-subtitle').addEventListener('change', (e) => handleInputChange('subtitle', e));
                card.querySelector('.input-section-icon').addEventListener('change', (e) => {
                    handleInputChange('icon', e);
                    renderAdminHomeSectionsList();
                });
            }

            // Habilitar arrastre solo cuando se interactúa con el handle
            const handle = card.querySelector('.section-drag-handle');
            if (handle) {
                handle.addEventListener('mousedown', () => card.setAttribute('draggable', 'true'));
                handle.addEventListener('touchstart', () => card.setAttribute('draggable', 'true'));
                handle.addEventListener('mouseup', () => card.setAttribute('draggable', 'false'));
                handle.addEventListener('touchend', () => card.setAttribute('draggable', 'false'));
            }

            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', sectionId);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                card.setAttribute('draggable', 'false');
            });

            listContainer.appendChild(card);
        });

        // Habilitar dragover y drop en el listContainer clonado
        listContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = listContainer.querySelector('.dragging');
            if (!draggingCard) return;
            
            const afterElement = getDragAfterElement(listContainer, e.clientY, '.section-row');
            if (afterElement == null) {
                listContainer.appendChild(draggingCard);
            } else {
                listContainer.insertBefore(draggingCard, afterElement);
            }
        });
        
        listContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingCard = listContainer.querySelector('.dragging');
            if (!draggingCard) return;
            
            const cards = [...listContainer.querySelectorAll('.section-row')];
            const newOrder = [];
            
            cards.forEach(c => {
                const sId = c.getAttribute('data-id');
                if (sId) {
                    newOrder.push(sId);
                }
            });
            
            homeConfig.order = newOrder;
            
            // Guardar en caliente en disco
            saveHomeConfig();
            renderAdminHomeSectionsList();
            if (window.renderHome) window.renderHome();
            showAdminToast('✅ Orden de secciones guardado físicamente');
        });
    }

    function populateAdminSocialLinks() {
        const instagramInput = document.getElementById('admin-social-instagram');
        const tiktokInput = document.getElementById('admin-social-tiktok');
        const facebookInput = document.getElementById('admin-social-facebook');
        const youtubeInput = document.getElementById('admin-social-youtube');
        const whatsappInput = document.getElementById('admin-social-whatsapp');
        const mercadolibreInput = document.getElementById('admin-social-mercadolibre');

        const links = window.socialLinks || {};

        if (instagramInput) instagramInput.value = links.instagram || '';
        if (tiktokInput) tiktokInput.value = links.tiktok || '';
        if (facebookInput) facebookInput.value = links.facebook || '';
        if (youtubeInput) youtubeInput.value = links.youtube || '';
        if (whatsappInput) whatsappInput.value = links.whatsapp || '';
        if (mercadolibreInput) mercadolibreInput.value = links.mercadolibre || '';
    }

    function initSocialLinksAdmin() {
        const form = document.getElementById('admin-social-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const instagram = document.getElementById('admin-social-instagram')?.value || '';
            const tiktok = document.getElementById('admin-social-tiktok')?.value || '';
            const facebook = document.getElementById('admin-social-facebook')?.value || '';
            const youtube = document.getElementById('admin-social-youtube')?.value || '';
            const whatsapp = document.getElementById('admin-social-whatsapp')?.value || '';
            const mercadolibre = document.getElementById('admin-social-mercadolibre')?.value || '';

            window.socialLinks = {
                instagram,
                tiktok,
                facebook,
                youtube,
                whatsapp,
                mercadolibre
            };

            localStorage.setItem('socialLinks', JSON.stringify(window.socialLinks));

            if (window.syncSiteConfigWithServer) {
                await window.syncSiteConfigWithServer();
            }

            // Sync with client view
            if (window.renderNosotrosBlocksCliente) {
                window.renderNosotrosBlocksCliente();
            }

            showAdminToast('✅ Redes sociales guardadas');
        });
    }

    function populateAdminTheme() {
        const themeSelect = document.getElementById('admin-theme-select');
        if (themeSelect) {
            themeSelect.value = window.activeTheme || 'classic';
        }
    }

    function initThemeAdmin() {
        const themeSelect = document.getElementById('admin-theme-select');
        if (!themeSelect) return;

        themeSelect.addEventListener('change', async function() {
            const newTheme = this.value;
            window.activeTheme = newTheme;
            
            // Aplicar de inmediato visualmente
            if (window.applyTheme) {
                window.applyTheme(newTheme);
            }
            
            localStorage.setItem('activeTheme', newTheme);

            if (window.syncSiteConfigWithServer) {
                await window.syncSiteConfigWithServer();
            }

            showAdminToast(`✅ Temática aplicada: ${newTheme}`);
        });
    }

    
window.renderAdminUX = safeAdminRun(renderAdminUX);
window.renderAdminViewBuilderList = safeAdminRun(renderAdminViewBuilderList);
window.renderAdminHomeSectionsList = safeAdminRun(renderAdminHomeSectionsList);

