// js/admin-rentals.js
// --- ADMIN RENTALS MODULE ---

    function initRentalsAdmin() {
        const btnOpenAddRental = document.getElementById('btn-open-add-rental');
        if (btnOpenAddRental) {
            btnOpenAddRental.addEventListener('click', () => {
                window.isRentalMode = true;
                openProductForm(null, null);
            });
        }

        const btnCancelRental = document.getElementById('btn-cancel-rental');
        if (btnCancelRental) {
            btnCancelRental.addEventListener('click', () => {
                const modal = document.getElementById('admin-rental-modal');
                if (modal) modal.style.display = 'none';
            });
        }

        // File upload change listener
        const rentalFileSelect = document.getElementById('admin-rental-image-file');
        if (rentalFileSelect) {
            rentalFileSelect.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const nameLabel = document.getElementById('admin-rental-image-name');
                if (nameLabel) nameLabel.textContent = file.name;

                // Show client-side local preview while processing
                const previewContainer = document.getElementById('admin-rental-image-preview-container');
                const previewImg = document.getElementById('admin-rental-image-preview');
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (previewImg) previewImg.src = event.target.result;
                    if (previewContainer) previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            });
        }

        // Form submit listener
        const rentalForm = document.getElementById('admin-rental-form');
        if (rentalForm) {
            rentalForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const submitBtn = document.getElementById('btn-save-rental-submit');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Procesando...';

                const id = document.getElementById('admin-rental-id').value.trim();
                const title = document.getElementById('admin-rental-title').value.trim();
                const description = document.getElementById('admin-rental-description').value.trim();
                const price = document.getElementById('admin-rental-price').value.trim();
                let imageUrl = document.getElementById('admin-rental-image-url').value;

                // 1. Si seleccionó un archivo nuevo, subirlo y convertirlo a WebP
                const fileInput = document.getElementById('admin-rental-image-file');
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    let webpFile = fileInput.files[0];
                    try {
                        if (typeof convertImageToWebP === 'function') {
                            const converted = await convertImageToWebP(webpFile);
                            webpFile = converted.file;
                        }
                    } catch (error) {
                        console.warn('No se pudo convertir imagen de alquiler a WebP:', error);
                    }

                    if (typeof uploadImageToServer === 'function') {
                        const uploadedPath = await uploadImageToServer(webpFile, 'alquileres', id);
                        if (uploadedPath) {
                            imageUrl = uploadedPath;
                        } else {
                            alert('No se pudo subir la foto de alquiler al servidor.');
                            submitBtn.disabled = false;
                            submitBtn.textContent = editingRentalId ? 'Actualizar Producto de Alquiler' : 'Guardar Producto de Alquiler';
                            return;
                        }
                    }
                }

                // 2. Crear o actualizar el objeto
                const rentalData = {
                    id: id,
                    title: title,
                    description: description,
                    price: price,
                    image: imageUrl
                };

                if (editingRentalId) {
                    const index = sessionRentals.findIndex(r => r.id === editingRentalId);
                    if (index !== -1) {
                        sessionRentals[index] = rentalData;
                    }
                    showAdminToast('✅ Alquiler actualizado correctamente');
                } else {
                    if (sessionRentals.some(r => r.id === id)) {
                        alert('Error: Ya existe un alquiler con este ID/Slug. Elegí otro ID único.');
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Guardar Producto de Alquiler';
                        return;
                    }
                    sessionRentals.push(rentalData);
                    showAdminToast('✅ Alquiler creado correctamente');
                }

                if (window.saveRentalsToServer) {
                    await window.saveRentalsToServer();
                }

                document.getElementById('admin-rental-modal').style.display = 'none';
                renderAdminRentals();

                submitBtn.disabled = false;
            });
        }
    }

    function renderAdminRentals() {
        const oldTableBody = document.getElementById('admin-rentals-table-body');
        if (!oldTableBody) return;
        const tableBody = oldTableBody.cloneNode(false);
        oldTableBody.parentNode.replaceChild(tableBody, oldTableBody);

        const sourceRentals = typeof sessionRentals !== 'undefined' ? sessionRentals : [];

        if (sourceRentals.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        No hay productos de alquiler creados. ¡Hacé clic en "Nuevo Alquiler" para agregar uno!
                    </td>
                </tr>
            `;
            return;
        }

        sourceRentals.forEach((rental, index) => {
            const tr = document.createElement('tr');
            tr.className = 'rental-admin-row';
            tr.style.borderBottom = '1px solid #EEF0F3';
            tr.setAttribute('data-index', index);
            tr.setAttribute('draggable', 'false');

            const imgUrl = rental.image || 'img/logo_provisional.png';
            const isVisible = rental.visible !== false;

            const dragHandleHtml = `<div class="rental-drag-handle" title="Mantén presionado para arrastrar y reordenar" style="padding: 0.35rem; background: #e2e8f0; color: #4a5568; border: none; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: grab;"><span class="material-symbols-outlined" style="font-size: 16px;">drag_indicator</span></div>`;

            tr.innerHTML = `
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        ${dragHandleHtml}
                        <div style="width: 44px; height: 44px; border-radius: 8px; background-image: url('${imgUrl}'); background-size: cover; background-position: center; border: 1px solid #E2E8F0; flex-shrink: 0;"></div>
                    </div>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <strong style="color: var(--text-main); font-size: 0.9rem; display: block;">${rental.title}</strong>
                    <small style="color: var(--text-muted); font-size: 0.75rem; font-family: monospace; display: block; margin-top: 2px;">ID: ${rental.id}</small>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle;">
                    <span style="background: #edf2f7; color: #4a5568; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.78rem; font-weight: 500;">
                        ${rental.price || 'Consultar'}
                    </span>
                </td>
                <td style="padding: 0.75rem 1rem; vertical-align: middle; text-align: center;">
                    <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
                        <button class="action-btn view btn-toggle-rental-visibility ${isVisible ? '' : 'hidden-mode'}" title="${isVisible ? 'Ocultar alquiler' : 'Mostrar alquiler'}" style="padding: 0.35rem; font-size: 0.85rem;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">${isVisible ? 'visibility' : 'visibility_off'}</span>
                        </button>
                        <button class="action-btn edit btn-edit-rental" title="Editar" style="padding: 0.35rem; font-size: 0.85rem;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                        </button>
                        <button class="action-btn clone btn-clone-rental" title="Clonar" style="padding: 0.35rem; font-size: 0.85rem;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                        </button>
                        <button class="action-btn del btn-delete-rental" title="Eliminar" style="padding: 0.35rem; font-size: 0.85rem;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    </div>
                </td>
            `;

            const handle = tr.querySelector('.rental-drag-handle');
            handle.addEventListener('mousedown', () => tr.setAttribute('draggable', 'true'));
            handle.addEventListener('touchstart', () => tr.setAttribute('draggable', 'true'));
            handle.addEventListener('mouseup', () => tr.setAttribute('draggable', 'false'));
            handle.addEventListener('touchend', () => tr.setAttribute('draggable', 'false'));

            tr.addEventListener('dragstart', (e) => {
                tr.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', index);
            });

            tr.addEventListener('dragend', () => {
                tr.classList.remove('dragging');
                tr.setAttribute('draggable', 'false');
            });

            tr.querySelector('.btn-toggle-rental-visibility').addEventListener('click', async () => {
                const newVisibleState = (rental.visible !== false) ? false : true;
                rental.visible = newVisibleState;

                showAdminToast(newVisibleState ? '👁️ Alquiler visible' : '👁️ Alquiler oculto');
                if (window.saveRentalsToServer) {
                    await window.saveRentalsToServer();
                }
                renderAdminRentals();
            });

            tr.querySelector('.btn-edit-rental').addEventListener('click', () => {
                window.isRentalMode = true;
                openProductForm(null, rental);
            });

            tr.querySelector('.btn-clone-rental').addEventListener('click', () => {
                cloneRental(rental);
            });

            tr.querySelector('.btn-delete-rental').addEventListener('click', async () => {
                if (confirm(`¿Seguro que querés eliminar el alquiler "${rental.title}"? Esta acción no se puede deshacer.`)) {
                    sessionRentals.splice(index, 1);
                    if (window.saveRentalsToServer) {
                        await window.saveRentalsToServer();
                    }
                    showAdminToast('✅ Alquiler eliminado correctamente');
                    renderAdminRentals();
                }
            });

            tableBody.appendChild(tr);
        });

        // Habilitar dragover y drop en el tbody clonado
        tableBody.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingRow = tableBody.querySelector('.dragging');
            if (!draggingRow) return;
            
            const afterElement = getDragAfterElement(tableBody, e.clientY, '.rental-admin-row');
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
            
            const rows = [...tableBody.querySelectorAll('.rental-admin-row')];
            const oldRentalsList = [...sessionRentals];
            const newRentalsList = [];
            
            rows.forEach(r => {
                const originalIdx = parseInt(r.getAttribute('data-index'));
                if (!isNaN(originalIdx) && oldRentalsList[originalIdx]) {
                    newRentalsList.push(oldRentalsList[originalIdx]);
                }
            });
            
            window.sessionRentals.length = 0;
            newRentalsList.forEach(r => window.sessionRentals.push(r));
            
            if (window.saveRentalsToServer) {
                await window.saveRentalsToServer();
            }
            renderAdminRentals();
            showAdminToast('✅ Alquileres reordenados y guardados físicamente');
        });
    }

    function cloneRental(rental) {
        if (!rental) return;

        const cloned = JSON.parse(JSON.stringify(rental));
        cloned.id = `${cloned.id}-copia`;
        cloned.title = `${cloned.title} (Copia)`;

        window.isRentalMode = true;
        openProductForm(null, cloned);

        editingProductId = null;

        const modal = document.getElementById('admin-product-modal');
        if (modal) modal.style.display = 'flex';

        showAdminToast('📋 Editá el clon y guardalo para añadirlo a alquileres');
    }

    function openRentalForm(rental = null) {
        const modal = document.getElementById('admin-rental-modal');
        const form = document.getElementById('admin-rental-form');
        const formTitle = document.getElementById('admin-rental-form-title');
        const submitBtn = document.getElementById('btn-save-rental-submit');
        const imgName = document.getElementById('admin-rental-image-name');
        const imgPreviewContainer = document.getElementById('admin-rental-image-preview-container');
        const imgPreview = document.getElementById('admin-rental-image-preview');
        const imgUrlInput = document.getElementById('admin-rental-image-url');

        if (!modal || !form) return;

        form.reset();
        imgName.textContent = 'Ninguna foto seleccionada';
        imgPreviewContainer.style.display = 'none';
        imgPreview.src = '';
        imgUrlInput.value = '';

        // Mostrar u ocultar checkbox de publicación automática en Novedades/Avisos para alquileres
        const autoAvisoContainer = document.getElementById('admin-rental-auto-aviso-container');
        if (autoAvisoContainer) {
            autoAvisoContainer.style.display = rental ? 'none' : 'flex';
        }
        const autoAvisoCheck = document.getElementById('admin-rental-auto-aviso');
        if (autoAvisoCheck) {
            autoAvisoCheck.checked = true;
        }

        if (rental) {
            editingRentalId = rental.id;
            formTitle.textContent = 'Editar Alquiler';
            submitBtn.textContent = 'Actualizar Producto de Alquiler';

            document.getElementById('admin-rental-id').value = rental.id;
            document.getElementById('admin-rental-id').disabled = true;
            document.getElementById('admin-rental-title').value = rental.title;
            document.getElementById('admin-rental-description').value = rental.description;
            document.getElementById('admin-rental-price').value = rental.price;

            if (rental.image) {
                imgUrlInput.value = rental.image;
                imgPreview.src = rental.image;
                imgPreviewContainer.style.display = 'block';
            }
        } else {
            editingRentalId = null;
            formTitle.textContent = 'Cargar Nuevo Alquiler';
            submitBtn.textContent = 'Guardar Producto de Alquiler';
            document.getElementById('admin-rental-id').disabled = false;
        }

        modal.style.display = 'flex';
    }


window.renderAdminUX = safeAdminRun(renderAdminUX);
window.renderAdminViewBuilderList = safeAdminRun(renderAdminViewBuilderList);
window.renderAdminHomeSectionsList = safeAdminRun(renderAdminHomeSectionsList);
window.renderAdminRentals = safeAdminRun(renderAdminRentals);
// --- LÓGICA DE ANCHO DEL PANEL DE ADMINISTRACIÓN (PC) ---
const adminLayoutContainer = document.getElementById('admin-layout-container');
const adminWidthTabs = document.querySelectorAll('.admin-width-tab');

