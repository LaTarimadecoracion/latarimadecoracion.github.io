// js/admin-categories.js
// --- ADMIN CATEGORIES MODULE ---

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
                        <button class="btn-toggle-cat-visibility action-btn view ${cat.visible !== false ? '' : 'hidden-mode'}" data-cat="${catIndex}" title="${cat.visible !== false ? 'Ocultar categoría' : 'Mostrar categoría'}" style="padding: 0.35rem; font-size: 0.85rem;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">${cat.visible !== false ? 'visibility' : 'visibility_off'}</span>
                        </button>
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
