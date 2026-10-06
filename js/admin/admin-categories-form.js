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
                    const rubroFolder = rubroVal && rubroVal !== 'carpinteria' ? sanitize(rubroVal) : '';
                    const oldFolderSanitized = sanitize(window.oldCategoryName);
                    const newFolderSanitized = sanitize(name);
                    const oldPathPrefix = rubroFolder ? `img/${rubroFolder}/${oldFolderSanitized}/` : `img/${oldFolderSanitized}/`;
                    const newPathPrefix = rubroFolder ? `img/${rubroFolder}/${newFolderSanitized}/` : `img/${newFolderSanitized}/`;

                    sessionProducts[window.editingCategoryIndex].products.forEach(p => {
                        if (typeof p.image === 'string') {
                            p.image = p.image.replace(oldPathPrefix, newPathPrefix);
                        } else if (Array.isArray(p.image)) {
                            p.image = p.image.map(img => typeof img === 'string' ? img.replace(oldPathPrefix, newPathPrefix) : img);
                        }

                        if (p.acabados_groups && Array.isArray(p.acabados_groups)) {
                            p.acabados_groups.forEach(group => {
                                if (typeof group.cover_image === 'string') {
                                    group.cover_image = group.cover_image.replace(oldPathPrefix, newPathPrefix);
                                }
                                if (Array.isArray(group.images_list)) {
                                    group.images_list = group.images_list.map(img => typeof img === 'string' ? img.replace(oldPathPrefix, newPathPrefix) : img);
                                }
                            });
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

                // Generar catShortId estático e inmutable
                let nextCatShortNum = sessionProducts.length + 1;
                let nextCatShortId = nextCatShortNum.toString(36).toUpperCase();
                while (sessionProducts.some(c => c.catShortId === nextCatShortId)) {
                    nextCatShortNum++;
                    nextCatShortId = nextCatShortNum.toString(36).toUpperCase();
                }

                sessionProducts.push({
                    id: id,
                    catShortId: nextCatShortId,
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

        const catImgFileInput = document.getElementById('admin-cat-image');
        const catImgTriggerBtn = document.getElementById('btn-trigger-cat-image');
        const catImgChangeBtn = document.getElementById('btn-change-cat-image');
        const catImgRemoveBtn = document.getElementById('btn-remove-cat-image');
        const catImgPreviewContainer = document.getElementById('admin-cat-image-preview-container');
        const catImgPreviewEl = document.getElementById('admin-cat-image-preview');
        const catImgFilenameEl = document.getElementById('admin-cat-image-filename');

        const updateCategoryPhotoPreview = (fileOrUrl) => {
            if (!fileOrUrl) {
                if (catImgPreviewContainer) catImgPreviewContainer.style.display = 'none';
                if (catImgTriggerBtn) catImgTriggerBtn.style.display = 'flex';
                if (catImgFileInput) catImgFileInput.value = '';
                return;
            }
            if (fileOrUrl instanceof File) {
                const url = URL.createObjectURL(fileOrUrl);
                if (catImgPreviewEl) catImgPreviewEl.src = url;
                if (catImgFilenameEl) catImgFilenameEl.textContent = fileOrUrl.name;
            } else if (typeof fileOrUrl === 'string') {
                if (catImgPreviewEl) catImgPreviewEl.src = fileOrUrl;
                if (catImgFilenameEl) catImgFilenameEl.textContent = fileOrUrl.split('/').pop() || 'Portada actual';
            }
            if (catImgPreviewContainer) catImgPreviewContainer.style.display = 'flex';
            if (catImgTriggerBtn) catImgTriggerBtn.style.display = 'none';
        };

        if (catImgTriggerBtn) catImgTriggerBtn.addEventListener('click', () => catImgFileInput?.click());
        if (catImgChangeBtn) catImgChangeBtn.addEventListener('click', () => catImgFileInput?.click());
        if (catImgRemoveBtn) catImgRemoveBtn.addEventListener('click', () => updateCategoryPhotoPreview(null));

        if (catImgFileInput) {
            catImgFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    updateCategoryPhotoPreview(e.target.files[0]);
                }
            });
        }

        window.updateCategoryPhotoPreview = updateCategoryPhotoPreview;

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

            // Auto-generar ID numérico/slug único para nueva categoría si el toggle está activo
            const autoToggle = document.getElementById('admin-cat-id-auto-toggle');
            const scanBtn = document.getElementById('btn-focus-scan-cat-id');

            if (autoToggle) autoToggle.checked = true;
            if (idInput) {
                idInput.readOnly = true;
                idInput.style.background = '#F1F5F9';
                const catCount = sessionProducts.length + 1;
                idInput.value = `cat-${catCount}-${Date.now().toString(36)}`;
            }
            if (scanBtn) scanBtn.style.display = 'none';

            // Resetear foto preview
            updateCategoryPhotoPreview(null);

            // Cargar select de rubros por defecto en carpintería
            window.renderRubrosSelect('carpinteria');

            const formTitle = document.getElementById('admin-category-form-title');
            if (formTitle) formTitle.innerHTML = 'Crear Nueva Categoría';
            const btnSaveCat = document.getElementById('btn-save-cat');
            if (btnSaveCat) btnSaveCat.textContent = "Guardar Categoría";
            const catModal = document.getElementById('admin-category-modal');
            if (catModal) catModal.style.display = 'flex';
        };

        // Escuchadores para el cambio entre ID Automático e ID Manual / Escáner
        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'admin-cat-id-auto-toggle') {
                const isAuto = e.target.checked;
                const idInput = document.getElementById('admin-cat-id');
                const scanBtn = document.getElementById('btn-focus-scan-cat-id');

                if (idInput) {
                    if (isAuto) {
                        idInput.readOnly = true;
                        idInput.style.background = '#F1F5F9';
                        if (!window.editingCategoryIndex) {
                            const catCount = sessionProducts.length + 1;
                            idInput.value = `cat-${catCount}-${Date.now().toString(36)}`;
                        }
                        if (scanBtn) scanBtn.style.display = 'none';
                    } else {
                        idInput.readOnly = false;
                        idInput.style.background = '#FFFFFF';
                        if (!window.editingCategoryIndex) idInput.value = '';
                        idInput.focus();
                        if (scanBtn) scanBtn.style.display = 'inline-flex';
                    }
                }
            }
        });

        // Botón enfocar listo para escanear con pistola
        document.addEventListener('click', (e) => {
            const scanBtn = e.target.closest('#btn-focus-scan-cat-id');
            if (scanBtn) {
                const idInput = document.getElementById('admin-cat-id');
                if (idInput) {
                    idInput.readOnly = false;
                    idInput.style.background = '#FFFFFF';
                    idInput.value = '';
                    idInput.focus();
                    if (typeof showAdminToast === 'function') {
                        showAdminToast('📷 Pistola lista: escaneá el código de barras');
                    }
                }
            }
        });

        // Delegación global de click para abrir y cancelar modal de categorías
        document.addEventListener('click', (e) => {
            const btnOpen = e.target.closest('#btn-open-add-category, #btn-create-cat-inline');
            if (btnOpen) {
                e.stopPropagation();
                openCategoryModalHandler();
                return;
            }

            const btnCancel = e.target.closest('#btn-cancel-category');
            if (btnCancel) {
                const catModal = document.getElementById('admin-category-modal');
                if (catModal) catModal.style.display = 'none';
                return;
            }

            const btnSaveCat = e.target.closest('#btn-save-cat');
            if (btnSaveCat) {
                e.preventDefault();
                (async () => {
                    const idInput = document.getElementById('admin-cat-id');
                    const nameInput = document.getElementById('admin-cat-name');
                    const fileInput = document.getElementById('admin-cat-image');

                    if (!idInput || !nameInput) return;
                    const id = idInput.value;
                    const name = nameInput.value;

                    if (!id || !name) {
                        alert("Completá el ID y Nombre de la categoría.");
                        return;
                    }
                    if (window.editingCategoryIndex === null && (!fileInput || !fileInput.files.length)) {
                        alert("Para una nueva categoría es obligatorio subir una foto de portada.");
                        return;
                    }

                    btnSaveCat.disabled = true;
                    btnSaveCat.textContent = "Guardando...";

                    const rubroSelect = document.getElementById('admin-cat-rubro');
                    const rubroVal = rubroSelect ? rubroSelect.value || 'carpinteria' : 'carpinteria';

                    try {
                        if (window.editingCategoryIndex !== null) {
                            const currentImgUrl = sessionProducts[window.editingCategoryIndex].image;
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
                            
                            sessionProducts[window.editingCategoryIndex].id = id;
                            sessionProducts[window.editingCategoryIndex].name = name;
                            sessionProducts[window.editingCategoryIndex].rubro = rubroVal;
                            if (result.imageUrl) {
                                sessionProducts[window.editingCategoryIndex].image = result.imageUrl;
                            }

                            if (window.oldCategoryName !== name) {
                                const sanitize = (n) => n ? n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-') : '';
                                const rubroFolder = rubroVal && rubroVal !== 'carpinteria' ? sanitize(rubroVal) : '';
                                const oldFolderSanitized = sanitize(window.oldCategoryName);
                                const newFolderSanitized = sanitize(name);
                                const oldPathPrefix = rubroFolder ? `img/${rubroFolder}/${oldFolderSanitized}/` : `img/${oldFolderSanitized}/`;
                                const newPathPrefix = rubroFolder ? `img/${rubroFolder}/${newFolderSanitized}/` : `img/${newFolderSanitized}/`;

                                sessionProducts[window.editingCategoryIndex].products.forEach(p => {
                                    if (typeof p.image === 'string') {
                                        p.image = p.image.replace(oldPathPrefix, newPathPrefix);
                                    } else if (Array.isArray(p.image)) {
                                        p.image = p.image.map(img => typeof img === 'string' ? img.replace(oldPathPrefix, newPathPrefix) : img);
                                    }

                                    if (p.acabados_groups && Array.isArray(p.acabados_groups)) {
                                        p.acabados_groups.forEach(group => {
                                            if (typeof group.cover_image === 'string') {
                                                group.cover_image = group.cover_image.replace(oldPathPrefix, newPathPrefix);
                                            }
                                            if (Array.isArray(group.images_list)) {
                                                group.images_list = group.images_list.map(img => typeof img === 'string' ? img.replace(oldPathPrefix, newPathPrefix) : img);
                                            }
                                        });
                                    }
                                });
                            }
                            if (typeof showAdminToast === 'function') showAdminToast('Categoría actualizada correctamente');
                        } else {
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
                                rubro: rubroVal,
                                order: sessionProducts.length,
                                products: []
                            });
                            if (typeof showAdminToast === 'function') showAdminToast('Categoría creada correctamente');
                        }

                        sessionProducts.forEach((c, idx) => c.order = idx);
                        await saveProductsToServer();
                        
                        window.editingCategoryIndex = null;
                        window.oldCategoryName = null;
                        const adminCatForm = document.getElementById('admin-cat-form');
                        if (adminCatForm) adminCatForm.reset();
                        const formTitle = document.getElementById('admin-category-form-title');
                        if (formTitle) formTitle.innerHTML = 'Crear Nueva Categoría';
                        
                        const catModal = document.getElementById('admin-category-modal');
                        if (catModal) catModal.style.display = 'none';

                        if (typeof renderAdminUX === 'function') renderAdminUX();
                    } catch (err) {
                        console.error('Error al guardar categoría:', err);
                        alert("Error al guardar la categoría.");
                    } finally {
                        btnSaveCat.disabled = false;
                        btnSaveCat.textContent = window.editingCategoryIndex !== null ? "Actualizar Categoría" : "Guardar Categoría";
                    }
                })();
            }
        });

        // --- LÓGICA DE NUEVO RUBRO ---
        window.editingRubroId = null; // Variable global para trackear rubro en edición
        
        // Delegación global de click para abrir el modal de nuevo rubro (soporta múltiples botones y carga asíncrona)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#btn-admin-add-rubro');
            if (!btn) return;
            
            const rubroModal = document.getElementById('admin-rubro-modal');
            const btnSaveRubro = document.getElementById('btn-save-rubro');
            if (!rubroModal) return;

            window.editingRubroId = null;
            const rubroForm = document.getElementById('admin-rubro-form');
            if (rubroForm) rubroForm.reset();
            
            const idInput = document.getElementById('admin-rubro-id');
            if (idInput) idInput.disabled = false;
            
            const modalTitle = document.getElementById('admin-rubro-modal-title');
            if (modalTitle) modalTitle.textContent = 'Crear Nuevo Rubro';
            
            if (btnSaveRubro) btnSaveRubro.textContent = 'Guardar Rubro';
            rubroModal.style.display = 'flex';
        });
        // Delegación global de click para Cancelar Rubro
        document.addEventListener('click', (e) => {
            const btnCancel = e.target.closest('#btn-cancel-rubro');
            if (btnCancel) {
                window.editingRubroId = null;
                const rubroModal = document.getElementById('admin-rubro-modal');
                if (rubroModal) rubroModal.style.display = 'none';
                return;
            }

            const btnSave = e.target.closest('#btn-save-rubro');
            if (btnSave) {
                e.preventDefault();
                (async () => {
                    const rubroModal = document.getElementById('admin-rubro-modal');
                    const idInput = document.getElementById('admin-rubro-id');
                    const nameInput = document.getElementById('admin-rubro-name');

                    if (!idInput || !nameInput || !rubroModal) return;

                    const name = (nameInput.value || '').trim();
                    let id = (idInput.value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
                    if (!id && name) {
                        id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
                        idInput.value = id;
                    }

                    if (!id || !name) {
                        alert("Por favor completa el nombre del rubro.");
                        return;
                    }

                    btnSave.disabled = true;
                    btnSave.textContent = "Guardando...";

                    const idModeInput = document.getElementById('admin-rubro-id-mode');
                    const idMode = idModeInput ? idModeInput.value || 'auto' : 'auto';

                    try {
                        window.rubros = window.rubros || [{ id: "carpinteria", name: "Carpintería", icon: "🪵" }];
                        
                        if (window.editingRubroId) {
                            // Modificar existente
                            const existing = window.rubros.find(r => r.id === window.editingRubroId);
                            if (existing) {
                                existing.name = name;
                                existing.idMode = idMode;
                            }
                            if (typeof showAdminToast === 'function') showAdminToast(`Rubro "${name}" actualizado exitosamente`);
                        } else {
                            // Verificar duplicados solo en modo creación
                            if (window.rubros.some(r => r.id === id)) {
                                alert("Ya existe un rubro con ese ID.");
                                btnSave.disabled = false;
                                btnSave.textContent = "Guardar Rubro";
                                return;
                            }
                            // Crear nuevo
                            window.rubros.push({ id, name, idMode, visible: true });
                            if (typeof showAdminToast === 'function') showAdminToast(`Rubro "${name}" creado exitosamente`);
                        }
                        
                        // Sincronizar en disco via servidor
                        if (typeof window.syncSiteConfigWithServer === 'function') {
                            await window.syncSiteConfigWithServer();
                        }
                        
                        rubroModal.style.display = 'none';

                        // Actualizar el dropdown del formulario de categorías
                        if (typeof window.renderRubrosSelect === 'function') {
                            window.renderRubrosSelect(id);
                        }
                        
                        // Si estamos en la vista de categorías, refrescar el árbol
                        if (typeof renderAdminTree === 'function') {
                            renderAdminTree();
                        }
                    } catch (e) {
                        console.error('Error al guardar rubro:', e);
                        alert("Error guardando el rubro en el servidor.");
                    } finally {
                        btnSave.disabled = false;
                        btnSave.textContent = window.editingRubroId ? "Actualizar Rubro" : "Guardar Rubro";
                        window.editingRubroId = null;
                    }
                })();
            }
        });

        // Auto-generar ID al escribir el nombre si el ID está vacío o no deshabilitado
        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'admin-rubro-name') {
                const idInput = document.getElementById('admin-rubro-id');
                if (idInput && !idInput.disabled && !window.editingRubroId) {
                    idInput.value = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
                }
            }
        });
};
