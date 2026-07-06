// js/admin-categories-form.js
// --- ADMIN CATEGORIES FORM MODULE ---

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
            if (window.editingCategoryIndex === null && !fileInput.files.length) {
                alert("Para una nueva categoría es obligatorio subir una foto de portada.");
                return;
            }

            btnSaveCat.disabled = true;
            btnSaveCat.textContent = "Guardando...";

            // Rubro seleccionado
            const rubroVal = document.getElementById('admin-cat-rubro').value || 'carpinteria';

            if (window.editingCategoryIndex !== null) {
                const currentImgUrl = sessionProducts[window.editingCategoryIndex].image;
                // Convertir la foto a WebP si se seleccionó una nueva
                let webpCatFile = fileInput.files[0] || null;
                if (webpCatFile) {
                    try {
                        const converted = await convertImageToWebP(webpCatFile);
                        webpCatFile = converted.file;
                    } catch (e) { console.warn('No se pudo convertir imagen de categoría:', e); }
                }
                const result = await editCategoryInServer(id, window.oldCategoryName, name, currentImgUrl, webpCatFile);
                if (!result) {
                    alert("Error editando la categoría.");
                    btnSaveCat.disabled = false;
                    btnSaveCat.textContent = "Actualizar Categoría";
                    return;
                }
                
                // Actualizar array local
                sessionProducts[window.editingCategoryIndex].id = id;
                sessionProducts[window.editingCategoryIndex].name = name;
                sessionProducts[window.editingCategoryIndex].rubro = rubroVal; // Guardar rubro
                if (result.imageUrl) {
                    sessionProducts[window.editingCategoryIndex].image = result.imageUrl;
                }

                // Rewrite product images
                if (window.oldCategoryName !== name) {
                    const sanitize = (n) => n ? n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-') : '';
                    const oldFolderSanitized = sanitize(window.oldCategoryName);
                    const newFolderSanitized = sanitize(name);
                    const oldPathPrefix = `img/${oldFolderSanitized}/`;
                    const newPathPrefix = `img/${newFolderSanitized}/`;

                    sessionProducts[window.editingCategoryIndex].products.forEach(p => {
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
                    rubro: rubroVal, // Guardar rubro
                    order: sessionProducts.length,
                    products: []
                });
                showAdminToast('Categoría creada correctamente');
            }

            sessionProducts.forEach((c, idx) => c.order = idx);
            await saveProductsToServer();
            
            window.editingCategoryIndex = null;
            window.oldCategoryName = null;
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


window.renderRubrosSelect = function(selectedValue = 'carpinteria') {
    const select = document.getElementById('admin-cat-rubro');
    if (!select) return;
    select.innerHTML = '';
    window.rubros.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        if (r.id === selectedValue) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
};

window.initCategoriesFormAdmin = function() {
    // --- LISTENERS DE FORMULARIO DE CATEGORÍAS ---
        const btnOpenAddCategory = document.getElementById('btn-open-add-category');
        const btnCreateCatInline = document.getElementById('btn-create-cat-inline');

        const openCategoryModalHandler = () => {
            window.editingCategoryIndex = null;
            window.oldCategoryName = null;
            const adminCatForm = document.getElementById('admin-cat-form');
            if (adminCatForm) adminCatForm.reset();
            
            // Habilitar campos que pudieron haber sido deshabilitados al editar "Todos los productos"
            const idInput = document.getElementById('admin-cat-id');
            const nameInput = document.getElementById('admin-cat-name');
            const rubroSelect = document.getElementById('admin-cat-rubro');
            if (idInput) idInput.disabled = false;
            if (nameInput) nameInput.disabled = false;
            if (rubroSelect) rubroSelect.disabled = false;

            // Cargar select de rubros por defecto en carpintería
            window.renderRubrosSelect('carpinteria');

            const formTitle = document.getElementById('admin-category-form-title');
            if (formTitle) formTitle.innerHTML = 'Crear Nueva Categoría';
            const btnSaveCat = document.getElementById('btn-save-cat');
            if (btnSaveCat) btnSaveCat.textContent = "Guardar Categoría";
            const catModal = document.getElementById('admin-category-modal');
            if (catModal) catModal.style.display = 'flex';
        };

        if (btnOpenAddCategory) {
            btnOpenAddCategory.addEventListener('click', openCategoryModalHandler);
        }
        
        if (btnCreateCatInline) {
            btnCreateCatInline.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid closing/toggling the details block if nested
                openCategoryModalHandler();
            });
        }

        const btnCancelCategory = document.getElementById('btn-cancel-category');
        if (btnCancelCategory) {
            btnCancelCategory.addEventListener('click', () => {
                const catModal = document.getElementById('admin-category-modal');
                if (catModal) catModal.style.display = 'none';
            });
        }

        // --- LÓGICA DE NUEVO RUBRO ---
        window.editingRubroId = null; // Variable global para trackear rubro en edición
        
        const btnAddRubro = document.getElementById('btn-admin-add-rubro');
        const rubroModal = document.getElementById('admin-rubro-modal');
        const btnCancelRubro = document.getElementById('btn-cancel-rubro');
        const btnSaveRubro = document.getElementById('btn-save-rubro');

        if (btnAddRubro && rubroModal) {
            btnAddRubro.addEventListener('click', () => {
                window.editingRubroId = null;
                const rubroForm = document.getElementById('admin-rubro-form');
                if (rubroForm) rubroForm.reset();
                
                const idInput = document.getElementById('admin-rubro-id');
                if (idInput) idInput.disabled = false;
                
                const modalTitle = document.getElementById('admin-rubro-modal-title');
                if (modalTitle) modalTitle.textContent = 'Crear Nuevo Rubro';
                
                btnSaveRubro.textContent = 'Guardar Rubro';
                rubroModal.style.display = 'flex';
            });
        }

        if (btnCancelRubro && rubroModal) {
            btnCancelRubro.addEventListener('click', () => {
                window.editingRubroId = null;
                rubroModal.style.display = 'none';
            });
        }

        if (btnSaveRubro && rubroModal) {
            btnSaveRubro.addEventListener('click', async () => {
                const idInput = document.getElementById('admin-rubro-id');
                const nameInput = document.getElementById('admin-rubro-name');

                const id = (idInput.value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
                const name = (nameInput.value || '').trim();

                if (!id || !name) {
                    alert("Por favor completa todos los campos del rubro.");
                    return;
                }

                btnSaveRubro.disabled = true;
                btnSaveRubro.textContent = "Guardando...";

                try {
                    if (window.editingRubroId) {
                        // Modificar existente
                        const existing = window.rubros.find(r => r.id === window.editingRubroId);
                        if (existing) {
                            existing.name = name;
                        }
                        showAdminToast(`Rubro "${name}" actualizado exitosamente`);
                    } else {
                        // Verificar duplicados solo en modo creación
                        if (window.rubros.some(r => r.id === id)) {
                            alert("Ya existe un rubro con ese ID.");
                            btnSaveRubro.disabled = false;
                            btnSaveRubro.textContent = "Guardar Rubro";
                            return;
                        }
                        // Crear nuevo
                        window.rubros.push({ id, name });
                        showAdminToast(`Rubro "${name}" creado exitosamente`);
                    }
                    
                    // Sincronizar en disco via servidor
                    await window.syncSiteConfigWithServer();
                    
                    rubroModal.style.display = 'none';

                    // Actualizar el dropdown del formulario de categorías y preseleccionar el rubro
                    window.renderRubrosSelect(id);
                    
                    // Si estamos en la vista de categorías, refrescar el árbol
                    if (typeof renderAdminTree === 'function') {
                        renderAdminTree();
                    }
                } catch (e) {
                    alert("Error guardando el rubro en el servidor.");
                } finally {
                    btnSaveRubro.disabled = false;
                    btnSaveRubro.textContent = window.editingRubroId ? "Actualizar Rubro" : "Guardar Rubro";
                    window.editingRubroId = null;
                }
            });
        }
};
