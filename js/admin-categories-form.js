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


window.initCategoriesFormAdmin = function() {
    // --- LISTENERS DE FORMULARIO DE CATEGORÍAS ---
        const btnOpenAddCategory = document.getElementById('btn-open-add-category');
        const btnCreateCatInline = document.getElementById('btn-create-cat-inline');

        const openCategoryModalHandler = () => {
            editingCategoryIndex = null;
            oldCategoryName = null;
            const adminCatForm = document.getElementById('admin-cat-form');
            if (adminCatForm) adminCatForm.reset();
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

};
