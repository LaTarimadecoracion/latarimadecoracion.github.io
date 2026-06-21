// js/avisos.js
// --- DECOUPLED PLUG-AND-PLAY NOTIFICATIONS (AVISOS) MODULE ---

    // Sin avisos por defecto: solo se muestra lo cargado desde el panel admin
    let avisos = [];

    // 2. Persistencia en Disco y LocalStorage Aislada
    function loadAvisos() {
        try {
            if (window.siteConfig && window.siteConfig.sessionAvisos && window.siteConfig.sessionAvisos.length > 0) {
                avisos = [...window.siteConfig.sessionAvisos];
            } else {
                const localData = localStorage.getItem('sessionAvisosAutonomo');
                if (localData) {
                    avisos = JSON.parse(localData);
                } else {
                    avisos = []; // Sin datos del admin → lista vacía
                }
                if (window.siteConfig) {
                    window.siteConfig.sessionAvisos = [...avisos];
                }
            }
        } catch (e) {
            console.error('[Avisos Module] Error cargando notificaciones:', e);
            avisos = [];
        }
    }

    // Guardado persistente
    function saveAvisos() {
        try {
            localStorage.setItem('sessionAvisosAutonomo', JSON.stringify(avisos));
            if (window.siteConfig) {
                window.siteConfig.sessionAvisos = [...avisos];
            }
            if (window.syncSiteConfigWithServer) {
                window.syncSiteConfigWithServer();
            }
        } catch (e) {
            console.error('[Avisos Module] Error guardando notificaciones:', e);
        }
    }

    // Helpers Auxiliares de Resolución
    function findProductById(prodId) {
        if (typeof window.sessionProducts === 'undefined' || !window.sessionProducts) return null;
        let fallback = null;
        for (const cat of window.sessionProducts) {
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

    function extractYouTubeId(urlOrId) {
        if (!urlOrId) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = urlOrId.match(regExp);
        return (match && match[2].length === 11) ? match[2] : urlOrId;
    }

    // 3. Renderizado Cliente — Feed de Cards
    function renderAvisos() {
        let notifContainer = document.getElementById('notification-list-container');

        if (!notifContainer) {
            const mainView = document.getElementById('view-avisos') || document.getElementById('view-notifications');
            if (mainView) {
                notifContainer = document.createElement('div');
                notifContainer.id = 'notification-list-container';
                notifContainer.className = 'avisos-feed';
                const contentEl = mainView.querySelector('.view-content') || mainView;
                contentEl.appendChild(notifContainer);
            }
        }

        const emptyState = document.getElementById('notif-empty-state');
        if (!notifContainer) return;

        notifContainer.innerHTML = '';

        if (avisos.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            notifContainer.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        notifContainer.style.display = 'flex';

        avisos.forEach((aviso, i) => {
            try {
                const card = document.createElement('div');
                card.className = 'aviso-card';
                card.style.animationDelay = `${i * 0.07}s`;

                // --- Imagen superior (image / product / video) ---
                let mediaHTML = '';
                if (aviso.type === 'image' && aviso.imageUrl) {
                    mediaHTML = `<div class="aviso-card-media"><img src="${aviso.imageUrl}" alt="" loading="lazy"></div>`;
                } else if (aviso.type === 'video') {
                    const ytId = extractYouTubeId(aviso.youtubeId);
                    if (ytId) {
                        mediaHTML = `
                            <div class="aviso-card-media aviso-card-video">
                                <iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&mute=1&modestbranding=1&rel=0"
                                    allow="encrypted-media" allowfullscreen loading="lazy"
                                    style="width:100%;height:100%;border:none;"></iframe>
                            </div>`;
                    }
                } else if (aviso.type === 'product') {
                    const res = findProductById(aviso.productId);
                    if (res) {
                        const { product, catName } = res;
                        const cover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                        mediaHTML = `
                            <div class="aviso-card-media aviso-card-product-media" data-prod-id="${product.id}">
                                <img src="${cover}" alt="${product.title}" loading="lazy">
                                <div class="aviso-card-product-overlay">
                                    <span class="aviso-card-cat-tag">${catName}</span>
                                    <span class="aviso-card-product-cta">Ver producto</span>
                                </div>
                            </div>`;
                    }
                }

                // --- Cuerpo: etiqueta tipo + título + descripción ---
                const typeLabel = { text: 'Novedad', image: 'Imágen', video: 'Video', product: 'Producto destacado' }[aviso.type] || 'Novedad';
                const titleHTML  = aviso.title?.trim()       ? `<h3 class="aviso-card-title">${aviso.title.trim()}</h3>` : '';
                const descHTML   = aviso.description?.trim() ? `<p class="aviso-card-desc">${aviso.description.trim()}</p>` : '';
                const timeHTML   = aviso.time?.trim()        ? `<span class="aviso-card-time">${aviso.time.trim()}</span>` : '';
                const linkHTML   = (aviso.linkText?.trim() && aviso.linkUrl?.trim())
                    ? `<a href="${aviso.linkUrl.trim()}" target="_blank" class="aviso-card-btn">${aviso.linkText.trim()} <span class="material-symbols-outlined" style="font-size:13px;">open_in_new</span></a>`
                    : '';

                card.innerHTML = `
                    ${mediaHTML}
                    <div class="aviso-card-body">
                        <div class="aviso-card-meta">
                            <span class="aviso-card-type-tag">${typeLabel}</span>
                            ${timeHTML}
                        </div>
                        ${titleHTML}
                        ${descHTML}
                        ${linkHTML}
                    </div>
                `;

                // Click en producto → abre detalle
                if (aviso.type === 'product') {
                    const mediaEl = card.querySelector('.aviso-card-product-media');
                    if (mediaEl) {
                        mediaEl.style.cursor = 'pointer';
                        mediaEl.addEventListener('click', () => {
                            const res = findProductById(aviso.productId);
                            if (res && window.showProductDetail) window.showProductDetail(res.product, res.catName);
                        });
                    }
                }

                notifContainer.appendChild(card);
            } catch (err) {
                console.error('[Avisos Module] Error renderizando aviso:', err, aviso);
            }
        });
    }

    // 4. Inyección Dinámica del Panel de Administración Maestro
    function injectAdminPanel() {
        const adminParent = document.getElementById('admin-nosotros-panel');
        if (!adminParent) return;

        // Si ya está inyectado, evitamos duplicidad y refrescamos la lista
        if (document.getElementById('admin-avisos-panel')) {
            renderAdminAvisosList();
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'admin-avisos-panel';
        panel.className = 'admin-nosotros-section';
        panel.style.cssText = `
            background: white; 
            padding: 1.5rem; 
            border-radius: var(--radius-md); 
            box-shadow: var(--shadow-sm); 
            margin-bottom: 2rem; 
            border: 1.5px solid #E8ECF0;
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.8rem;">
                <h3 style="font-size: 1.1rem; margin:0; display:flex; align-items:center; gap:0.5rem; color:var(--primary-color);">
                    <span class="material-symbols-outlined">notifications_active</span>
                    Gestión de Avisos Multimodales
                </h3>
                <button type="button" id="btn-add-aviso-dynamic" class="btn-primary" style="padding:0.5rem 1rem; width:auto; font-size:0.85rem;">➕ Agregar Aviso</button>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                Creá avisos de Texto, Banners, Videos de YouTube o Productos Destacados en tiempo real.
            </p>
            <div id="admin-avisos-list" style="display: flex; flex-direction: column; gap: 0.8rem;">
                <!-- Lista inyectada dinámicamente -->
            </div>

            <!-- Modal Dinámico para Crear/Editar Aviso (Formulario Maestro) -->
            <div id="admin-aviso-modal-dynamic" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 9999; justify-content: center; align-items: center;">
                <div style="background: white; padding: 1.5rem; border-radius: 12px; width: 90%; max-width: 450px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); max-height:90vh; overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.25rem;">
                        <h3 id="admin-aviso-form-title" style="font-size: 1.05rem; margin:0; font-weight:700; color:var(--text-main);">Agregar Aviso</h3>
                        <button type="button" id="btn-cancel-aviso-dynamic" style="padding:0.4rem 1rem; border-radius:8px; border:1.5px solid #cbd5e1; background:white; cursor:pointer; font-size:0.85rem;">Cancelar</button>
                    </div>
                    <form id="admin-aviso-form-dynamic" style="display:flex; flex-direction:column; gap:1rem;">
                        <input type="hidden" id="admin-aviso-id">
                        
                        <!-- Selector Maestro de Tipo -->
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">Tipo de Aviso</label>
                            <select id="admin-aviso-type" style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main); appearance:auto; cursor:pointer;" required>
                                <option value="text">📝 Texto (Notificación Común)</option>
                                <option value="image">🌅 Imagen / Banner Publicitario</option>
                                <option value="video">🎥 Video de YouTube</option>
                                <option value="product">📦 Producto Destacado del Catálogo</option>
                            </select>
                        </div>

                        <!-- CAMPOS COMUNES OPCIONALES (REGLA DE ORO) -->
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">Título del Aviso (Opcional)</label>
                            <input type="text" id="admin-aviso-title" placeholder="ej: ¡Súper Lanzamiento!" style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">Ícono (Material Icon - Opcional)</label>
                            <input type="text" id="admin-aviso-icon" placeholder="ej: campaign, celebration, local_shipping" style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">Tiempo transcurrido (Opcional)</label>
                            <input type="text" id="admin-aviso-time" placeholder="ej: Hace 3 horas, Preventa, etc." style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);">
                        </div>

                        <!-- NUEVOS CAMPOS: ENLACES OPCIONALES -->
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">Texto del Botón (Opcional)</label>
                            <input type="text" id="admin-aviso-linktext" placeholder="ej: Ver más, Comprar ahora" style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);">
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">Enlace URL (Opcional)</label>
                            <input type="text" id="admin-aviso-linkurl" placeholder="ej: https://wa.me/... o #sección" style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);">
                        </div>

                        <hr style="border:0; border-top:1px solid #E2E8F0; margin:0.25rem 0;">

                        <!-- CAMPOS ESPECÍFICOS -->
                        <!-- Grupo 1: Texto -->
                        <div id="group-aviso-text" class="aviso-type-group" style="display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">Mensaje del Aviso</label>
                            <textarea id="admin-aviso-description" placeholder="ej: Ya se encuentran disponibles las nuevas torres Montessori..." style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; height:80px; resize:none; font-family:var(--font-main);"></textarea>
                        </div>

                        <!-- Grupo 2: Imagen/Banner -->
                        <div id="group-aviso-image" class="aviso-type-group" style="display:none; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">URL de la Imagen / Banner</label>
                            <input type="text" id="admin-aviso-imageurl" placeholder="ej: https://tusitio.com/img/banner.jpg" style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);">
                        </div>

                        <!-- Grupo 3: Video -->
                        <div id="group-aviso-video" class="aviso-type-group" style="display:none; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">URL o ID del Video de YouTube</label>
                            <input type="text" id="admin-aviso-youtubeid" placeholder="ej: https://www.youtube.com/watch?v=dQw4w9WgXcQ" style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main);">
                        </div>

                        <!-- Grupo 4: Producto Destacado -->
                        <div id="group-aviso-product" class="aviso-type-group" style="display:none; flex-direction:column; gap:4px;">
                            <label style="font-size: 0.82rem; font-weight:600; color:var(--text-main);">Seleccionar Producto</label>
                            <select id="admin-aviso-productid" style="width:100%; padding:0.6rem 0.8rem; border:1.5px solid #E2E8F0; border-radius:8px; font-family:var(--font-main); appearance:auto; cursor:pointer;">
                                <!-- Cargado dinámicamente al abrir -->
                            </select>
                        </div>

                        <button type="button" id="btn-save-aviso-dynamic" class="btn-primary" style="margin-top: 0.5rem; padding: 0.7rem; font-weight:bold;">Guardar Aviso</button>
                    </form>
                </div>
            </div>
        `;

        adminParent.appendChild(panel);

        // Lógica de Conmutación de Campos en el formulario maestro
        const typeSelect = document.getElementById('admin-aviso-type');
        const updateFormGroups = () => {
            const selectedType = typeSelect.value;
            document.querySelectorAll('.aviso-type-group').forEach(el => {
                el.style.display = 'none';
            });
            if (selectedType === 'text') {
                document.getElementById('group-aviso-text').style.display = 'flex';
            } else if (selectedType === 'image') {
                document.getElementById('group-aviso-image').style.display = 'flex';
            } else if (selectedType === 'video') {
                document.getElementById('group-aviso-video').style.display = 'flex';
            } else if (selectedType === 'product') {
                document.getElementById('group-aviso-product').style.display = 'flex';
            }
        };
        typeSelect.addEventListener('change', updateFormGroups);

        // Registrar Eventos Básicos
        document.getElementById('btn-add-aviso-dynamic').addEventListener('click', () => openAvisoForm());
        document.getElementById('btn-cancel-aviso-dynamic').addEventListener('click', () => {
            document.getElementById('admin-aviso-modal-dynamic').style.display = 'none';
        });

        document.getElementById('btn-save-aviso-dynamic').addEventListener('click', () => {
            const id = document.getElementById('admin-aviso-id').value;
            const type = document.getElementById('admin-aviso-type').value;
            const title = document.getElementById('admin-aviso-title').value.trim();
            const icon = document.getElementById('admin-aviso-icon').value.trim();
            const time = document.getElementById('admin-aviso-time').value.trim();
            
            // Nuevos enlaces opcionales
            const linkText = document.getElementById('admin-aviso-linktext').value.trim();
            const linkUrl = document.getElementById('admin-aviso-linkurl').value.trim();

            const description = document.getElementById('admin-aviso-description').value.trim();
            const imageUrl = document.getElementById('admin-aviso-imageurl').value.trim();
            const youtubeId = document.getElementById('admin-aviso-youtubeid').value.trim();
            const productId = document.getElementById('admin-aviso-productid').value;

            // Validación
            if (type === 'text' && !description) {
                alert('Completá el mensaje de texto.');
                return;
            }
            if (type === 'image' && !imageUrl) {
                alert('Completá la URL de la imagen.');
                return;
            }
            if (type === 'video' && !youtubeId) {
                alert('Completá el ID o enlace del video de YouTube.');
                return;
            }
            if (type === 'product' && !productId) {
                alert('Seleccioná un producto del catálogo.');
                return;
            }

            const payload = {
                id: id || `aviso-${Date.now()}`,
                type,
                title,
                icon,
                time,
                linkText,
                linkUrl,
                description: type === 'text' ? description : '',
                imageUrl: type === 'image' ? imageUrl : '',
                youtubeId: type === 'video' ? youtubeId : '',
                productId: type === 'product' ? productId : ''
            };

            if (id) {
                const idx = avisos.findIndex(a => a.id === id);
                if (idx !== -1) {
                    avisos[idx] = payload;
                }
            } else {
                avisos.push(payload);
            }

            saveAvisos();
            document.getElementById('admin-aviso-modal-dynamic').style.display = 'none';
            renderAdminAvisosList();
            renderAvisos();
        });

        renderAdminAvisosList();
    }

    function openAvisoForm(avisoId = null) {
        const modal = document.getElementById('admin-aviso-modal-dynamic');
        if (!modal) return;

        const titleInput = document.getElementById('admin-aviso-title');
        const iconInput = document.getElementById('admin-aviso-icon');
        const timeInput = document.getElementById('admin-aviso-time');
        const idInput = document.getElementById('admin-aviso-id');
        const typeSelect = document.getElementById('admin-aviso-type');
        const formTitle = document.getElementById('admin-aviso-form-title');
        
        // Inputs de enlaces
        const linkTextInput = document.getElementById('admin-aviso-linktext');
        const linkUrlInput = document.getElementById('admin-aviso-linkurl');

        // Cargar dinámicamente selector de productos de la base actual
        const prodSelect = document.getElementById('admin-aviso-productid');
        if (prodSelect) {
            prodSelect.innerHTML = '<option value="">-- Seleccionar Producto --</option>';
            if (typeof window.sessionProducts !== 'undefined' && window.sessionProducts) {
                window.sessionProducts.forEach(cat => {
                    if (cat.products) {
                        cat.products.forEach(p => {
                            const opt = document.createElement('option');
                            opt.value = p.id;
                            opt.textContent = `${cat.name} - ${p.title}`;
                            prodSelect.appendChild(opt);
                        });
                    }
                });
            }
        }

        const updateFormGroups = () => {
            const selectedType = typeSelect.value;
            document.querySelectorAll('.aviso-type-group').forEach(el => {
                el.style.display = 'none';
            });
            if (selectedType === 'text') {
                document.getElementById('group-aviso-text').style.display = 'flex';
            } else if (selectedType === 'image') {
                document.getElementById('group-aviso-image').style.display = 'flex';
            } else if (selectedType === 'video') {
                document.getElementById('group-aviso-video').style.display = 'flex';
            } else if (selectedType === 'product') {
                document.getElementById('group-aviso-product').style.display = 'flex';
            }
        };

        if (avisoId) {
            const aviso = avisos.find(a => a.id === avisoId);
            if (aviso) {
                idInput.value = aviso.id;
                titleInput.value = aviso.title || '';
                iconInput.value = aviso.icon || '';
                timeInput.value = aviso.time || '';
                typeSelect.value = aviso.type || 'text';
                
                // Enlaces
                linkTextInput.value = aviso.linkText || '';
                linkUrlInput.value = aviso.linkUrl || '';

                document.getElementById('admin-aviso-description').value = aviso.description || '';
                document.getElementById('admin-aviso-imageurl').value = aviso.imageUrl || '';
                document.getElementById('admin-aviso-youtubeid').value = aviso.youtubeId || '';
                document.getElementById('admin-aviso-productid').value = aviso.productId || '';

                formTitle.textContent = '✏️ Editar Aviso';
                updateFormGroups();
            }
        } else {
            idInput.value = '';
            titleInput.value = '';
            iconInput.value = 'campaign'; // ícono por defecto premium
            timeInput.value = '';
            typeSelect.value = 'text';
            
            // Enlaces
            linkTextInput.value = '';
            linkUrlInput.value = '';

            document.getElementById('admin-aviso-description').value = '';
            document.getElementById('admin-aviso-imageurl').value = '';
            document.getElementById('admin-aviso-youtubeid').value = '';
            document.getElementById('admin-aviso-productid').value = '';

            formTitle.textContent = '➕ Agregar Nuevo Aviso';
            updateFormGroups();
        }

        modal.style.display = 'flex';
    }

    function renderAdminAvisosList() {
        const listContainer = document.getElementById('admin-avisos-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (avisos.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); border: 1.5px dashed #E8ECF0; border-radius: 12px; background: #fafafa; font-size: 0.85rem;">
                    No hay avisos configurados. El cliente verá el aviso estático por defecto.
                </div>
            `;
            return;
        }

        avisos.forEach((aviso, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === avisos.length - 1;
            const card = document.createElement('div');
            card.className = 'section-row';
            card.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.75rem 1rem;
                background: #fafafa;
                border-radius: var(--radius-md);
                border: 1.5px solid #E8ECF0;
                gap: 1rem;
                box-shadow: var(--shadow-sm);
            `;

            let typeBadge = '';
            let typeDetails = '';
            if (aviso.type === 'text') {
                typeBadge = '📝 Texto';
                typeDetails = aviso.description || '';
            } else if (aviso.type === 'image') {
                typeBadge = '🌅 Banner';
                typeDetails = aviso.imageUrl || '';
            } else if (aviso.type === 'video') {
                typeBadge = '🎥 Video';
                typeDetails = aviso.youtubeId || '';
            } else if (aviso.type === 'product') {
                typeBadge = '📦 Producto';
                const pInfo = findProductById(aviso.productId);
                typeDetails = pInfo ? pInfo.product.title : `ID: ${aviso.productId}`;
            }

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap: 0.8rem; overflow: hidden; flex: 1;">
                    <div style="background: #fff; width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid #E2E8F0; flex-shrink:0;">
                        <span class="material-symbols-outlined" style="color: var(--primary-color, #c0510a); font-size:1.25rem;">${aviso.icon || 'notifications'}</span>
                    </div>
                    <div style="overflow: hidden; flex: 1;">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="font-size:0.65rem; padding:0.1rem 0.35rem; background:#e2e8f0; border-radius:4px; font-weight:700; color:#475569;">${typeBadge}</span>
                            <strong style="font-size:0.9rem; color:var(--text-main); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">${aviso.title || 'Aviso sin Título'}</strong>
                        </div>
                        <span style="font-size:0.75rem; color:var(--text-muted); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; margin-top:2px;">
                            ${typeDetails}
                        </span>
                    </div>
                </div>
                <div style="display: flex; gap: 0.35rem; flex-shrink:0;">
                    <button type="button" class="btn-edit-aviso action-btn edit" style="padding: 0.4rem; cursor:pointer;" title="Editar"><span class="material-symbols-outlined" style="font-size: 16px;">edit</span></button>
                    <button type="button" class="btn-up-aviso action-btn" style="padding: 0.4rem; cursor:pointer;" ${isFirst ? 'disabled style="opacity:0.3; cursor:default;"' : ''} title="Subir"><span class="material-symbols-outlined" style="font-size: 16px; color:${isFirst ? '#999' : 'var(--primary-color)'}">arrow_upward</span></button>
                    <button type="button" class="btn-down-aviso action-btn" style="padding: 0.4rem; cursor:pointer;" ${isLast ? 'disabled style="opacity:0.3; cursor:default;"' : ''} title="Bajar"><span class="material-symbols-outlined" style="font-size: 16px; color:${isLast ? '#999' : 'var(--primary-color)'}">arrow_downward</span></button>
                    <button type="button" class="btn-delete-aviso action-btn del" style="padding: 0.4rem; cursor:pointer;" title="Eliminar"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
                </div>
            `;

            card.querySelector('.btn-edit-aviso').addEventListener('click', () => openAvisoForm(aviso.id));
            
            if (!isFirst) {
                card.querySelector('.btn-up-aviso').addEventListener('click', () => {
                    [avisos[idx], avisos[idx - 1]] = [avisos[idx - 1], avisos[idx]];
                    saveAvisos();
                    renderAdminAvisosList();
                    renderAvisos();
                });
            }
            
            if (!isLast) {
                card.querySelector('.btn-down-aviso').addEventListener('click', () => {
                    [avisos[idx], avisos[idx + 1]] = [avisos[idx + 1], avisos[idx]];
                    saveAvisos();
                    renderAdminAvisosList();
                    renderAvisos();
                });
            }

            card.querySelector('.btn-delete-aviso').addEventListener('click', () => {
                if (confirm('¿Seguro que querés borrar este aviso?')) {
                    avisos.splice(idx, 1);
                    saveAvisos();
                    renderAdminAvisosList();
                    renderAvisos();
                }
            });

            listContainer.appendChild(card);
        });
    }

    // 5. Objeto de Módulo Encapsulado en Namespace Global
    window.AvisosModule = {
        init: function() {
            loadAvisos();

            // Interceptamos y sobrescribimos de forma segura la función global de renderizado
            window.renderAvisosCliente = renderAvisos;

            renderAvisos();

            // Escuchar cambios de tab de administración para inyectar su panel en caliente
            const sectionsTabBtn = document.getElementById('tab-btn-sections');
            if (sectionsTabBtn) {
                sectionsTabBtn.addEventListener('click', () => {
                    setTimeout(injectAdminPanel, 50); // Leve retardo para esperar al DOM
                });
            }

            // Escuchar la navegación a la vista de Notificaciones en el cliente
            const avisosNavBtn = document.getElementById('nav-notif-btn');
            if (avisosNavBtn) {
                avisosNavBtn.addEventListener('click', () => {
                    renderAvisos();
                });
            }

            // Escuchar el botón de acceso rápido para crear avisos desde la sección Home
            const quickAddBtn = document.getElementById('btn-quick-add-aviso');
            if (quickAddBtn) {
                quickAddBtn.addEventListener('click', () => {
                    injectAdminPanel(); // Asegura que el modal dinámico e inputs existan en el DOM
                    openAvisoForm();    // Despliega el formulario maestro en blanco
                });
            }
        },
        render: renderAvisos,
        injectAdmin: injectAdminPanel,
        getAvisos: function() {
            return avisos;
        }
    };

    // 6. Inicializador Global Seguro
    window.initAvisos = function() {
        if (window.AvisosModule && window.AvisosModule.init) {
            window.AvisosModule.init();
        }
    };
})();
