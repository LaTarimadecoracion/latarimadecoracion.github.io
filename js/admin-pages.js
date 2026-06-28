// js/admin-pages.js
// --- ADMIN PAGES MODULE ---

window.initPagesAdmin = function() {
    // --- LISTENERS DEL MODAL DE CONFIGURACIÓN ---
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
        // --- LISTENERS DEL CONSTRUCTOR DE VISTAS (VIEW BUILDER) ---
        const builderSelect = document.getElementById('admin-view-builder-select');
        if (builderSelect) {
            builderSelect.addEventListener('change', () => {
                renderAdminViewBuilderList();
            });
        }

        const btnAddSectionComps = document.querySelectorAll('.btn-add-view-component');
        btnAddSectionComps.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.getAttribute('data-target-page');
                openComponentForm(section);
            });
        });

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
                const url = compVideoInput.value.trim();
                const ytId = extractYouTubeId(url);
                const tkId = window.extractTikTokId ? window.extractTikTokId(url) : null;
                const preview = document.getElementById('comp-video-preview');
                if (!preview) return;
                
                if (ytId) {
                    preview.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&mute=1&modestbranding=1&rel=0" allowfullscreen style="width:100%; height:120px; border:none; border-radius:8px;"></iframe>`;
                    preview.style.display = 'block';
                } else if (tkId) {
                    preview.innerHTML = `<iframe src="https://www.tiktok.com/embed/v2/${tkId}" allowfullscreen style="width:100%; height:120px; border:none; border-radius:8px;"></iframe>`;
                    preview.style.display = 'block';
                } else {
                    preview.innerHTML = '<small style="color:red;">⚠️ URL de YouTube o TikTok no válida.</small>';
                    preview.style.display = 'block';
                }
            });
        }

        if (btnSaveSectionComp && compModal) {
            btnSaveSectionComp.addEventListener('click', async () => {
                const section = document.getElementById('admin-component-form').getAttribute('data-target-section') || 'home';
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
                    const isValid = extractYouTubeId(url) || (window.extractTikTokId && window.extractTikTokId(url));
                    if (!isValid) {
                        alert('Por favor, ingresá una URL válida de YouTube o TikTok.');
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
                else if (section === 'categories') runSearch();
                else if (section === 'avisos') renderAvisosCliente();

                // Re-render list
                renderAdminViewBuilderList();

                btnSaveSectionComp.disabled = false;
                btnSaveSectionComp.textContent = 'Guardar Componente';
            });
        }

};

    function renderSingleAdminConfig(key, containerId) {
        const configContainer = document.getElementById(containerId);
        if (!configContainer) return;
        configContainer.innerHTML = '';

        const config = appConfig[key];
        if (!config) return;

        const sectionLabels = {
            home: "Inicio (Home)",
            categories: "Categorías",
            cart: "Carrito de Compras",
            videos: "Videos (TikTok Style)",
            catalogo: "Catálogo General (Iframe)",
            avisos: "Avisos (Novedades)",
            nosotros: "Nosotros (Historia/Contacto)"
        };

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
        configContainer.appendChild(card);
    }

    function renderAdminConfig() {
        renderSingleAdminConfig('home', 'admin-config-menu-home');
        renderSingleAdminConfig('categories', 'admin-config-menu-categories');
        renderSingleAdminConfig('avisos', 'admin-config-menu-avisos');
        renderSingleAdminConfig('nosotros', 'admin-config-menu-nosotros');
        
        renderSingleAdminConfig('cart', 'admin-config-menu-cart');
        renderSingleAdminConfig('videos', 'admin-config-menu-videos');
        renderSingleAdminConfig('catalogo', 'admin-config-menu-catalog');
        renderSingleAdminConfig('search', 'admin-config-menu-search');
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
    function renderSingleAdminViewBuilderList(section) {
        const oldListContainer = document.getElementById(`admin-components-${section}`);
        if (!oldListContainer) return;
        const listContainer = oldListContainer.cloneNode(false);
        oldListContainer.parentNode.replaceChild(listContainer, oldListContainer);

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

            card.querySelector('.btn-edit-comp').addEventListener('click', () => openComponentForm(section, comp.id));
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
            renderSingleAdminViewBuilderList(section);
            showAdminToast('✅ Componentes reordenados y guardados físicamente');
        });
    }

    function renderAdminViewBuilderList() {
        renderSingleAdminViewBuilderList('home');
        renderSingleAdminViewBuilderList('categories');
        renderSingleAdminViewBuilderList('avisos');
        renderSingleAdminViewBuilderList('cart');
        renderSingleAdminViewBuilderList('videos');
        renderSingleAdminViewBuilderList('catalogo');
        renderSingleAdminViewBuilderList('search');
    }

    function openComponentForm(section, compId = null) {
        document.getElementById('admin-component-form').setAttribute('data-target-section', section);
        
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
        else if (section === 'categories') runSearch();
        else if (section === 'avisos') renderAvisosCliente();

        renderSingleAdminViewBuilderList(section);
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
        else if (section === 'categories') runSearch();
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
                        <div style="display: flex; gap: 0.35rem; flex-shrink:0;">
                            <button type="button" class="btn-edit-comp action-btn edit" style="padding: 0.4rem;" title="Editar"><span class="material-symbols-outlined" style="font-size: 18px;">edit</span></button>
                            <button type="button" class="btn-delete-comp action-btn del" style="padding: 0.4rem;" title="Eliminar"><span class="material-symbols-outlined" style="font-size: 18px;">delete</span></button>
                        </div>
                    </div>
                `;

                const btnEdit = card.querySelector('.btn-edit-comp');
                const btnDelete = card.querySelector('.btn-delete-comp');
                
                if (btnEdit) {
                    btnEdit.addEventListener('click', () => {
                        openComponentForm('home', comp.id);
                    });
                }
                if (btnDelete) {
                    btnDelete.addEventListener('click', () => {
                        const idx = homeStack.findIndex(c => c.id === comp.id);
                        if (idx !== -1) {
                            deleteComponent('home', idx);
                        }
                    });
                }

            } else {
                // Sección predeterminada estática
                const section = sectionsData[sectionId] || { title: sectionId, subtitle: '', icon: 'folder' };
                
                let extraInputs = '';
                if (sectionId === 'novedades' || sectionId === 'buscados') {
                    const currentLimit = section.limit || (sectionId === 'novedades' ? 5 : 8);
                    extraInputs = `
                        <div style="grid-column: span 3; margin-top: 4px;">
                            <label style="font-size: 0.72rem; font-weight:600; display:block; margin-bottom: 4px; color: var(--text-muted);">Cantidad de productos a mostrar</label>
                            <input type="number" class="input-section-limit" value="${currentLimit}" min="1" max="100" style="width:100%; padding:0.5rem 0.75rem; font-size:0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);" data-id="${sectionId}">
                        </div>
                    `;
                }
                
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
                        ${extraInputs}
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
                
                const limitInput = card.querySelector('.input-section-limit');
                if (limitInput) {
                    limitInput.addEventListener('change', (e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) {
                            homeConfig.sections[sectionId].limit = val;
                            saveHomeConfig();
                            if (window.renderHome) window.renderHome();
                        }
                    });
                }
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
            if (window.renderGlobalSocialLinks) {
                window.renderGlobalSocialLinks();
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


function applyAdminPanelWidth(width) {
    if (!adminLayoutContainer) return;
    adminLayoutContainer.classList.remove('width-normal', 'width-full');
    adminLayoutContainer.classList.add(`width-${width}`);

    // Aplicar también a la vista general .admin-view
    const viewAdmin = document.getElementById('view-admin');
    if (viewAdmin) {
        viewAdmin.classList.remove('width-normal', 'width-full');
        viewAdmin.classList.add(`width-${width}`);
    }

    adminWidthTabs.forEach(tab => {
        if (tab.getAttribute('data-width') === width) {
            tab.classList.add('active');
            tab.style.background = '#FFF';
            tab.style.fontWeight = '600';
            tab.style.color = '#0F172A';
        } else {
            tab.classList.remove('active');
            tab.style.background = 'transparent';
            tab.style.fontWeight = '500';
            tab.style.color = '#94A3B8';
        }
    });
}

// Cargar la preferencia de ancho del panel de administración
const savedAdminWidth = localStorage.getItem('adminPanelPreferredWidth') || 'normal';
applyAdminPanelWidth(savedAdminWidth);

adminWidthTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const width = tab.getAttribute('data-width');
        applyAdminPanelWidth(width);
        localStorage.setItem('adminPanelPreferredWidth', width);
    });
});

window.initMayoristaAdmin = function() {
    const aliasInput = document.getElementById('admin-may-alias');
    const cbuInput = document.getElementById('admin-may-cbu');
    const titularInput = document.getElementById('admin-may-titular');
    const bankInput = document.getElementById('admin-may-bank');
    const markupInput = document.getElementById('admin-may-markup');
    const termsTextarea = document.getElementById('admin-may-terms');
    const saveBtn = document.getElementById('btn-save-mayorista-config');

    if (!aliasInput || !saveBtn) return;

    // Cargar config actual
    const cfg = window.siteConfig.mayoristaConfig || {};
    aliasInput.value = cfg.alias || '';
    cbuInput.value = cfg.cbu || '';
    titularInput.value = cfg.titular || '';
    bankInput.value = cfg.bank || '';
    markupInput.value = cfg.markupPercent !== undefined ? cfg.markupPercent : 10;
    termsTextarea.value = cfg.terms || '';

    // Manejador del botón Guardar
    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px; animation: spin 1s linear infinite;">sync</span> Guardando...';

        window.siteConfig.mayoristaConfig = {
            alias: aliasInput.value.trim(),
            cbu: cbuInput.value.trim(),
            titular: titularInput.value.trim(),
            bank: bankInput.value.trim(),
            markupPercent: parseInt(markupInput.value.trim()) || 0,
            terms: termsTextarea.value
        };

        try {
            if (window.syncSiteConfigWithServer) {
                await window.syncSiteConfigWithServer();
            }
            alert('¡Configuración mayorista guardada con éxito!');
        } catch (e) {
            console.error('[Admin Mayorista] Error al guardar config:', e);
            alert('Hubo un error al guardar la configuración en el servidor.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    });
};
