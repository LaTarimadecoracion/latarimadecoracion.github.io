// js/admin-categories.js
// --- ADMIN CATEGORIES MODULE ---

    function ensureDefaultCategories() {
        const rubrosList = window.rubros || [{ id: "carpinteria", name: "Carpintería", icon: "🪵" }];
        let changed = false;
        rubrosList.forEach(rubro => {
            const defaultId = `${rubro.id}-todos`;
            const exists = sessionProducts.some(cat => cat.id === defaultId);
            if (!exists) {
                // Insertar al inicio (orden -1)
                sessionProducts.push({
                    id: defaultId,
                    name: `Todos los productos`,
                    rubro: rubro.id,
                    image: `img/logo_provisional.png`,
                    visible: true,
                    order: -1,
                    products: []
                });
                changed = true;
            }
        });
        if (changed) {
            // Ordenar para que queden al inicio
            sessionProducts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
    }

    function renderAdminTree() {
        ensureDefaultCategories();

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

        // Obtener lista de rubros
        const rubrosList = window.rubros || [{ id: "carpinteria", name: "Carpintería", icon: "🪵" }];

        // Renderizar un grupo por cada rubro
        rubrosList.forEach(rubro => {
            const rubroGroup = document.createElement('div');
            rubroGroup.className = 'admin-rubro-group';
            rubroGroup.dataset.rubroId = rubro.id;

            // Recordar si estaba colapsado (por defecto CERRADO / COLAPSADO)
            const isCollapsed = sessionStorage.getItem(`rubro_collapsed_${rubro.id}`) !== 'false';
            if (isCollapsed) {
                rubroGroup.classList.add('collapsed');
            }

            // Filtrar las categorías correspondientes a este rubro
            const filteredCategories = sessionProducts.map((cat, originalIndex) => ({ cat, originalIndex }))
                .filter(item => {
                    const catRubro = item.cat.rubro || 'carpinteria';
                    return catRubro === rubro.id;
                });

            // Si el rubro está marcado como invisible, le aplicamos atenuación
            const isRubroVisible = rubro.visible !== false;
            if (!isRubroVisible) {
                rubroGroup.style.opacity = '0.6';
            }

            // Opciones de acción para el rubro (Carpintería no se puede eliminar)
            const isCarpinteria = rubro.id === 'carpinteria';
            const rubroDelHTML = isCarpinteria ? '' : `
                <button type="button" class="btn-del-rubro action-btn delete" title="Eliminar Rubro" style="padding:0.25rem; font-size:0.8rem; background:transparent; border:none; cursor:pointer;">
                    <span class="material-symbols-outlined" style="font-size:16px; color:#EF4444;">delete</span>
                </button>
            `;

            rubroGroup.innerHTML = `
                <div class="admin-rubro-header">
                    <span class="rubro-title" style="flex-grow: 1;">${rubro.name} (${filteredCategories.length})</span>
                    <div class="rubro-actions" onclick="event.stopPropagation();" style="display: flex; align-items: center; gap: 8px; margin-right: 12px;">
                        <button type="button" class="btn-toggle-rubro-visibility action-btn view ${isRubroVisible ? '' : 'hidden-mode'}" title="${isRubroVisible ? 'Ocultar Rubro' : 'Mostrar Rubro'}" style="padding:0.25rem; font-size:0.8rem; background:transparent; border:none; cursor:pointer;">
                            <span class="material-symbols-outlined" style="font-size:16px;">${isRubroVisible ? 'visibility' : 'visibility_off'}</span>
                        </button>
                        <button type="button" class="btn-edit-rubro action-btn edit" title="Editar Rubro" style="padding:0.25rem; font-size:0.8rem; background:transparent; border:none; cursor:pointer;">
                            <span class="material-symbols-outlined" style="font-size:16px;">edit</span>
                        </button>
                        ${rubroDelHTML}
                    </div>
                    <span class="material-symbols-outlined expand-arrow">expand_more</span>
                </div>
                <div class="admin-rubro-shelf-list">
                    <!-- Categorías inyectadas -->
                </div>
            `;

            const header = rubroGroup.querySelector('.admin-rubro-header');
            const shelfList = rubroGroup.querySelector('.admin-rubro-shelf-list');

            // --- LISTENERS DE ACCIONES DE RUBRO ---
            const btnToggleVis = rubroGroup.querySelector('.btn-toggle-rubro-visibility');
            if (btnToggleVis) {
                btnToggleVis.addEventListener('click', async () => {
                    rubro.visible = (rubro.visible !== false) ? false : true;
                    showAdminToast(rubro.visible ? `👁️ Rubro "${rubro.name}" ahora es visible` : `👁️ Rubro "${rubro.name}" ahora está oculto`);
                    await window.syncSiteConfigWithServer();
                    renderAdminTree();
                });
            }

            const btnEdit = rubroGroup.querySelector('.btn-edit-rubro');
            if (btnEdit) {
                btnEdit.addEventListener('click', () => {
                    window.editingRubroId = rubro.id;
                    
                    const idInput = document.getElementById('admin-rubro-id');
                    const nameInput = document.getElementById('admin-rubro-name');
                    
                    if (idInput) {
                        idInput.value = rubro.id;
                        idInput.disabled = true; // Impedir modificar el ID
                    }
                    if (nameInput) nameInput.value = rubro.name;
                    
                    const modalTitle = document.getElementById('admin-rubro-modal-title');
                    if (modalTitle) modalTitle.textContent = 'Editar Rubro';
                    
                    const btnSaveRubro = document.getElementById('btn-save-rubro');
                    if (btnSaveRubro) btnSaveRubro.textContent = 'Actualizar Rubro';
                    
                    const rubroModal = document.getElementById('admin-rubro-modal');
                    if (rubroModal) rubroModal.style.display = 'flex';
                });
            }

            const btnDel = rubroGroup.querySelector('.btn-del-rubro');
            if (btnDel) {
                btnDel.addEventListener('click', async () => {
                    if (confirm(`¿Eliminar el Rubro "${rubro.name}"? Se borrarán de forma física TODAS las categorías y productos asociados a este rubro de forma irreversible.`)) {
                        // 1. Borrar todas las categorías de este rubro de sessionProducts
                        const originalLength = sessionProducts.length;
                        
                        // Filtrar y eliminar en disco de forma paralela
                        const toDelete = sessionProducts.filter(cat => (cat.rubro || 'carpinteria') === rubro.id);
                        for (const cat of toDelete) {
                            try {
                                await fetch('/api/categories/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: cat.name, rubro: rubro.id })
                                });
                            } catch (e) {
                                console.error(`Error eliminando archivos de categoría ${cat.name}:`, e);
                            }
                        }

                        // Actualizar array en memoria
                        sessionProducts = sessionProducts.filter(cat => (cat.rubro || 'carpinteria') !== rubro.id);
                        window.sessionProducts = sessionProducts;

                        // 2. Eliminar el rubro de window.rubros
                        window.rubros = window.rubros.filter(r => r.id !== rubro.id);

                        // 3. Sincronizar cambios en el servidor
                        await window.syncSiteConfigWithServer();
                        await saveProductsToServer();

                        showAdminToast(`Rubro "${rubro.name}" eliminado correctamente`);
                        renderAdminTree();
                    }
                });
            }

            // Lógica de colapsar / expandir (solo si no se hace click en las acciones)
            header.addEventListener('click', (e) => {
                if (e.target.closest('.rubro-actions')) return;
                const currentlyCollapsed = rubroGroup.classList.toggle('collapsed');
                sessionStorage.setItem(`rubro_collapsed_${rubro.id}`, currentlyCollapsed ? 'true' : 'false');
            });

            // Si está vacío, renderizar aviso sutil
            if (filteredCategories.length === 0) {
                shelfList.innerHTML = `
                    <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.82rem; font-style: italic;">
                        Sin categorías en este rubro.
                    </div>
                `;
            } else {
                filteredCategories.forEach(({ cat, originalIndex }) => {
                    const catBlock = document.createElement('div');
                    catBlock.className = 'cat-shelf';
                    catBlock.setAttribute('draggable', 'false');
                    catBlock.setAttribute('data-index', originalIndex);

                    // Si es la categoría default de "Todos los productos", no permitimos borrarla ni clonarla
                    const isDefault = cat.id === `${rubro.id}-todos`;
                    const actionsHTML = isDefault ? `
                        <button class="btn-toggle-cat-visibility action-btn view ${cat.visible !== false ? '' : 'hidden-mode'}" data-cat="${originalIndex}" title="${cat.visible !== false ? 'Ocultar categoría' : 'Mostrar categoría'}" style="padding: 0.35rem; font-size: 0.85rem;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">${cat.visible !== false ? 'visibility' : 'visibility_off'}</span>
                        </button>
                        <button class="btn-edit-cat action-btn edit" data-cat="${originalIndex}" title="Editar fotos de portada"><span class="material-symbols-outlined">edit</span></button>
                        <span class="material-symbols-outlined" style="color:var(--text-muted); opacity: 0.5; font-size: 18px; margin: 0 8px;" title="Categoría fija obligatoria">lock</span>
                    ` : `
                        <button class="btn-toggle-cat-visibility action-btn view ${cat.visible !== false ? '' : 'hidden-mode'}" data-cat="${originalIndex}" title="${cat.visible !== false ? 'Ocultar categoría' : 'Mostrar categoría'}" style="padding: 0.35rem; font-size: 0.85rem;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">${cat.visible !== false ? 'visibility' : 'visibility_off'}</span>
                        </button>
                        <button class="btn-edit-cat action-btn edit" data-cat="${originalIndex}" title="Editar categoría"><span class="material-symbols-outlined">edit</span></button>
                        <button class="btn-clone-cat action-btn clone" data-cat="${originalIndex}" title="Clonar categoría"><span class="material-symbols-outlined">content_copy</span></button>
                        <button class="btn-del-cat shelf-del-btn" data-cat="${originalIndex}" title="Eliminar categoría">
                            <span class="material-symbols-outlined">folder_delete</span>
                        </button>
                    `;

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
                                ${actionsHTML}
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
                        e.dataTransfer.setData('text/plain', originalIndex);
                    });

                    catBlock.addEventListener('dragend', () => {
                        catBlock.classList.remove('dragging');
                        catBlock.setAttribute('draggable', 'false');
                    });

                    shelfList.appendChild(catBlock);
                });

                // Habilitar dragover y drop por rubro
                shelfList.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    const draggingCard = adminCategoryTreeEl.querySelector('.dragging');
                    if (!draggingCard) return;
                    
                    const afterElement = getDragAfterElement(shelfList, e.clientY, '.cat-shelf');
                    if (afterElement == null) {
                        shelfList.appendChild(draggingCard);
                    } else {
                        shelfList.insertBefore(draggingCard, afterElement);
                    }
                });

                // Habilitar que también se pueda tirar en el contenedor general del rubro (si está colapsado o vacío)
                rubroGroup.addEventListener('dragover', (e) => {
                    e.preventDefault();
                });
            }

            adminCategoryTreeEl.appendChild(rubroGroup);
        });

        // ── Event Listeners de Categorías ──
        adminCategoryTreeEl.querySelectorAll('.btn-toggle-cat-visibility').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const cat = sessionProducts[cIdx];
                cat.visible = (cat.visible !== false) ? false : true;
                
                showAdminToast(cat.visible ? '👁️ Categoría visible' : '👁️ Categoría oculta');
                await saveProductsToServer();
                renderAdminUX();
            });
        });

        adminCategoryTreeEl.querySelectorAll('.btn-del-cat').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const cat = sessionProducts[cIdx];
                const catName = cat.name;
                const catRubro = cat.rubro || 'carpinteria';
                const defaultId = `${catRubro}-todos`;

                if (confirm(`¿Eliminar la categoría "${catName}"? Los productos que tiene adentro se trasladarán a "Todos los productos" de este rubro como respaldo.`)) {
                    // Buscar la categoría de respaldo
                    const defaultCat = sessionProducts.find(c => c.id === defaultId);
                    if (defaultCat && cat.products && cat.products.length > 0) {
                        // Mover productos al final
                        defaultCat.products.push(...cat.products);
                    }

                    // IMPORTANTE: NO llamamos al borrado de fotos físicas para que los productos migrados conserven sus fotos
                    sessionProducts.splice(cIdx, 1);
                    showAdminToast('Categoría removida y productos migrados a Todos los productos.');
                    await saveProductsToServer();
                    renderAdminUX();
                }
            });
        });

        adminCategoryTreeEl.querySelectorAll('.btn-edit-cat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cIdx = parseInt(e.currentTarget.getAttribute('data-cat'));
                const cat = sessionProducts[cIdx];
                
                window.editingCategoryIndex = cIdx;
                window.oldCategoryName = cat.name;
                
                const idInput = document.getElementById('admin-cat-id');
                const nameInput = document.getElementById('admin-cat-name');
                const rubroSelect = document.getElementById('admin-cat-rubro');

                idInput.value = cat.id;
                nameInput.value = cat.name;
                
                // Si es la categoría default de respaldo, bloquear únicamente edición de ID y Rubro (el Nombre visible queda editable)
                const isDefault = cat.id.endsWith('-todos');
                idInput.disabled = isDefault;
                nameInput.disabled = false; // El nombre visible siempre queda editable
                if (rubroSelect) rubroSelect.disabled = isDefault;

                // Cargar dropdown de rubro y preseleccionar el de la categoría
                if (typeof window.renderRubrosSelect === 'function') {
                    window.renderRubrosSelect(cat.rubro || 'carpinteria');
                }
                
                const formTitle = document.getElementById('admin-category-form-title');
                if (formTitle) {
                    formTitle.innerHTML = isDefault ? 'Editar Fotos Portada (Categoría Protegida)' : 'Editar Categoría';
                }
                
                const btnSaveCat = document.getElementById('btn-save-cat');
                if (btnSaveCat) {
                    btnSaveCat.textContent = "Actualizar Categoría";
                }
                
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

        // Drop global en la lista para reordenar y persistir el rubro si se mueve de grupo
        adminCategoryTreeEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            const draggingCard = adminCategoryTreeEl.querySelector('.dragging');
            if (!draggingCard) return;

            // Determinar a qué rubro se tiró la tarjeta
            const targetGroup = draggingCard.closest('.admin-rubro-group');
            const targetRubroId = targetGroup ? targetGroup.dataset.rubroId : 'carpinteria';
            
            // Recoger todas las tarjetas en el orden en el que quedaron en la UI
            const cards = [...adminCategoryTreeEl.querySelectorAll('.cat-shelf')];
            const oldCategories = [...sessionProducts];
            const newCategories = [];
            
            cards.forEach(c => {
                const originalIdx = parseInt(c.getAttribute('data-index'));
                if (!isNaN(originalIdx) && oldCategories[originalIdx]) {
                    const catObj = oldCategories[originalIdx];
                    // Si esta tarjeta es la que estamos arrastrando, actualizamos su rubro al del grupo destino
                    if (c === draggingCard) {
                        catObj.rubro = targetRubroId;
                    }
                    newCategories.push(catObj);
                }
            });
            
            newCategories.forEach((c, idx) => {
                c.order = idx;
            });
            
            sessionProducts.length = 0;
            sessionProducts.push(...newCategories);
            
            await saveProductsToServer();
            renderAdminTree();
            showAdminToast('✅ Categorías reordenadas y guardadas físicamente');
        });
    }

    // ── Clonar Producto ──

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
        window.editingCategoryIndex = null;  // forzar modo creación
        window.oldCategoryName = null;

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
