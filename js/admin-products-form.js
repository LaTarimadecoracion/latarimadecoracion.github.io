// js/admin-products-form.js
// --- ADMIN PRODUCTS FORM MODULE ---

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

    // Helper para asignar colores a grupos de variantes idénticas
    function updateMedidaGroupColors(container) {
        if (!container) return;
        const rows = [...container.querySelectorAll('.medida-admin-row')];
        const counts = {};
        rows.forEach(row => {
            const val = row.querySelector('.medida-valor').value.trim().toLowerCase();
            if (val) counts[val] = (counts[val] || 0) + 1;
        });

        const stringToHue = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            return Math.abs(hash) % 360;
        };

        rows.forEach(row => {
            const val = row.querySelector('.medida-valor').value.trim().toLowerCase();
            if (val && counts[val] > 1) {
                const hue = stringToHue(val);
                row.style.setProperty('border-left', `5px solid hsl(${hue}, 70%, 55%)`, 'important');
                row.style.setProperty('background-color', `hsl(${hue}, 60%, 95%)`, 'important');
            } else {
                row.style.setProperty('border-left', `1px solid transparent`, 'important');
                row.style.setProperty('background-color', `transparent`, 'important');
                row.style.setProperty('border-bottom', `1px solid #F1F5F9`, 'important'); // Keep the separator
            }
        });
    }

    // Helper: Crear fila de Medida con soporte Drag & Drop y diseño horizontal amplio de igual medida
    function createMedidaRow(groupId, medida = '', link = '', isDefault = false, isHidden = false, linkLabel = '', iconType = 'local_shipping', highlight = false, price = '', legend = '', showPrice = false, costPrice = '', multiplier = '') {
        const row = document.createElement('div');
        row.className = 'medida-admin-row';
        row.setAttribute('draggable', 'false'); // Deshabilitado por defecto, activado al tocar el handle
        if (isHidden) {
            row.style.opacity = '0.5';
            row.style.textDecoration = 'line-through';
        }
        row.dataset.hidden = isHidden ? 'true' : 'false';
        row.dataset.linkLabel = linkLabel;
        row.dataset.iconType = iconType;
        row.dataset.highlight = highlight ? 'true' : 'false';
        row.dataset.showPrice = showPrice ? 'true' : 'false';
        row.dataset.logisticaEnabled = (arguments[13] !== undefined && arguments[13] !== null) ? (arguments[13] ? 'true' : 'false') : 'true';

        let costPriceVal = costPrice;
        let priceVal = price;

        // Si no hay precio de costo pero sí hay precio de venta, igualamos el costo al precio de venta
        if ((costPriceVal === '' || parseFloat(costPriceVal) === 0) && priceVal !== '' && parseFloat(priceVal) > 0) {
            costPriceVal = priceVal;
        }

        let multValue = multiplier;
        if (multValue === '' && priceVal !== '' && costPriceVal !== '') {
            const pNum = parseFloat(priceVal);
            const cNum = parseFloat(costPriceVal);
            if (!isNaN(pNum) && !isNaN(cNum) && cNum > 0) {
                multValue = parseFloat((pNum / cNum).toFixed(2));
            }
        }

        const isVariantLogEnabled = row.dataset.logisticaEnabled !== 'false';

        row.innerHTML = `
            <div class="medida-drag-handle" title="Mantén presionado para arrastrar y reordenar" style="display: flex; align-items: center; justify-content: center; cursor: grab; padding: 4px; flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 20px; color: var(--text-muted);">drag_indicator</span>
            </div>
            <input type="radio" name="default-medida-${groupId}" class="medida-default-radio" title="Marcar como variante por defecto" ${isDefault ? 'checked' : ''} style="margin: 0 0.25rem; cursor: pointer; accent-color: var(--primary-color); width: 1.2rem; height: 1.2rem; flex-shrink: 0;">
            <div class="medida-inputs-container" style="flex-direction: column !important; gap: 6px !important; align-items: stretch !important;">
                <div style="display: flex; gap: 10px; width: 100%; align-items: center;">
                    <input type="text" class="medida-valor" placeholder="Medida (ej: 140x45 cm)" value="${medida}" style="flex: 30 !important; min-width: 0 !important; width: auto !important;">
                    <input type="text" class="medida-link" placeholder="Link de pago (vacío = WA)" value="${link}" style="flex: 50 !important; min-width: 0 !important; width: auto !important;">
                    <input type="number" class="medida-precio" placeholder="Precio ($)" value="${price}" style="flex: 20 !important; min-width: 0 !important; width: auto !important;" min="0">
                    <button type="button" class="btn-toggle-price-visibility"
                            style="background:none;border:none;cursor:pointer;color:${showPrice ? 'var(--primary-color)' : 'var(--text-muted)'};padding:0.4rem;display:flex;align-items:center;justify-content:center;flex: 0 0 auto !important; width: 32px !important; height: 32px !important;" 
                            title="${showPrice ? 'Ocultar precio en catálogo' : 'Mostrar precio en catálogo'}">
                        <span class="material-symbols-outlined" style="font-size: 18px;">${showPrice ? 'visibility' : 'visibility_off'}</span>
                    </button>
                </div>
                <div style="display: flex; gap: 10px; width: 100%; align-items: center;">
                    <input type="text" class="medida-leyenda" placeholder="Leyenda debajo del botón (ej: Envío gratis, vacío = automático)" value="${legend}" style="flex: 60 !important; min-width: 0 !important;">
                    <input type="number" class="medida-costo" placeholder="Costo ($)" value="${costPriceVal}" style="flex: 20 !important; min-width: 0 !important;" min="0">
                    <input type="number" class="medida-multiplicador" placeholder="Multipl. (x)" value="${multValue}" style="flex: 20 !important; min-width: 0 !important;" min="0" step="any">
                </div>
                <div class="medida-margin-badge-container" style="font-size: 0.72rem; display: flex; gap: 8px; font-weight: 600; margin-top: 2px;"></div>
            </div>
            <div class="medida-actions" style="display: flex; gap: 0.25rem; align-items: center; flex-shrink: 0;">
                <button type="button" class="btn-toggle-medida-flex"
                        style="background:none;border:none;cursor:pointer;color:${isVariantLogEnabled ? '#0284c7' : '#94a3b8'};padding:0.4rem;display:flex;align-items:center;justify-content:center;" title="${isVariantLogEnabled ? 'Logística Flex Permitida en esta variante (Clic para deshabilitar)' : 'Logística Flex Deshabilitada en esta variante (Clic para permitir)'}">
                    <span class="material-symbols-outlined" style="font-size: 18px;">${isVariantLogEnabled ? 'local_shipping' : 'no_sim'}</span>
                </button>
                <button type="button" class="btn-toggle-medida-visibility"
                        style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.4rem;display:flex;align-items:center;justify-content:center;" title="${isHidden ? 'Mostrar link' : 'Ocultar link'}">
                    <span class="material-symbols-outlined" style="font-size: 18px;">${isHidden ? 'visibility_off' : 'visibility'}</span>
                </button>
                <button type="button" class="btn-edit-link-label"
                        style="background:none;border:none;cursor:pointer;color:var(--primary-color);padding:0.4rem;display:flex;align-items:center;justify-content:center;" title="Editar ícono y texto del botón">
                    <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                </button>
                <button type="button" class="btn-clone-medida"
                        style="background:none;border:none;cursor:pointer;color:var(--primary-color);padding:0.4rem;display:flex;align-items:center;justify-content:center;" title="Clonar variante">
                    <span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span>
                </button>
                <button type="button" class="btn-remove-medida"
                        style="background:none;border:none;cursor:pointer;color:#EF4444;font-size:1.4rem;line-height:1;padding:0.4rem;display:flex;align-items:center;justify-content:center;" title="Eliminar">&times;</button>
            </div>
        `;

        const btnToggleFlex = row.querySelector('.btn-toggle-medida-flex');
        if (btnToggleFlex) {
            btnToggleFlex.addEventListener('click', () => {
                const currentLogEnabled = row.dataset.logisticaEnabled !== 'false';
                if (currentLogEnabled) {
                    row.dataset.logisticaEnabled = 'false';
                    btnToggleFlex.style.color = '#94a3b8';
                    btnToggleFlex.querySelector('.material-symbols-outlined').textContent = 'no_sim';
                    btnToggleFlex.title = 'Logística Flex Deshabilitada en esta variante (Clic para permitir)';
                } else {
                    row.dataset.logisticaEnabled = 'true';
                    btnToggleFlex.style.color = '#0284c7';
                    btnToggleFlex.querySelector('.material-symbols-outlined').textContent = 'local_shipping';
                    btnToggleFlex.title = 'Logística Flex Permitida en esta variante (Clic para deshabilitar)';
                }
            });
        }

        const btnToggleVis = row.querySelector('.btn-toggle-medida-visibility');
        btnToggleVis.addEventListener('click', () => {
            const currentHidden = row.dataset.hidden === 'true';
            if (currentHidden) {
                row.dataset.hidden = 'false';
                row.style.opacity = '1';
                row.style.textDecoration = 'none';
                btnToggleVis.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>';
                btnToggleVis.title = 'Ocultar link';
            } else {
                row.dataset.hidden = 'true';
                row.style.opacity = '0.5';
                row.style.textDecoration = 'line-through';
                btnToggleVis.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">visibility_off</span>';
                btnToggleVis.title = 'Mostrar link';
            }
        });

        const btnTogglePriceVis = row.querySelector('.btn-toggle-price-visibility');
        btnTogglePriceVis.addEventListener('click', () => {
            const currentShowPrice = row.dataset.showPrice === 'true';
            if (currentShowPrice) {
                row.dataset.showPrice = 'false';
                btnTogglePriceVis.querySelector('.material-symbols-outlined').textContent = 'visibility_off';
                btnTogglePriceVis.style.color = 'var(--text-muted)';
                btnTogglePriceVis.title = 'Mostrar precio en catálogo';
            } else {
                row.dataset.showPrice = 'true';
                btnTogglePriceVis.querySelector('.material-symbols-outlined').textContent = 'visibility';
                btnTogglePriceVis.style.color = 'var(--primary-color)';
                btnTogglePriceVis.title = 'Ocultar precio en catálogo';
            }
        });

        const btnEditLabel = row.querySelector('.btn-edit-link-label');
        btnEditLabel.addEventListener('click', () => {
            currentRowEditingLink = row;
            const currentLabel = row.dataset.linkLabel || "";
            const currentIcon = row.dataset.iconType || "local_shipping";
            const currentHighlight = row.dataset.highlight === 'true';
            
            document.getElementById('admin-link-label').value = currentLabel;
            const iconRadio = document.querySelector(`input[name="admin_link_icon"][value="${currentIcon}"]`);
            if (iconRadio) iconRadio.checked = true;
            document.getElementById('admin-link-highlight').checked = currentHighlight;
            
            document.getElementById('admin-link-modal').style.display = 'flex';
        });

        const valInput = row.querySelector('.medida-valor');
        valInput.addEventListener('input', () => {
            const container = row.closest('.group-medidas-rows');
            if (container) updateMedidaGroupColors(container);
        });

        row.querySelector('.btn-remove-medida').addEventListener('click', () => {
            const container = row.closest('.group-medidas-rows');
            row.remove();
            if (container) updateMedidaGroupColors(container);
        });
        
        row.querySelector('.btn-clone-medida').addEventListener('click', () => {
            const currentMedida = row.querySelector('.medida-valor').value.trim();
            const currentLink = row.querySelector('.medida-link').value.trim();
            const currentHidden = row.dataset.hidden === 'true';
            const currentLabel = row.dataset.linkLabel;
            const currentIcon = row.dataset.iconType;
            const currentHighlight = row.dataset.highlight === 'true';
            const currentPrice = row.querySelector('.medida-precio') ? row.querySelector('.medida-precio').value.trim() : '';
            const currentLegend = row.querySelector('.medida-leyenda') ? row.querySelector('.medida-leyenda').value.trim() : '';
            const currentShowPrice = row.dataset.showPrice === 'true';
            const currentCost = row.querySelector('.medida-costo') ? row.querySelector('.medida-costo').value.trim() : '';
            const currentMultiplier = row.querySelector('.medida-multiplicador') ? row.querySelector('.medida-multiplicador').value.trim() : '';
            
            // Crear nueva fila clonada
            const newRow = createMedidaRow(groupId, currentMedida, currentLink, false, currentHidden, currentLabel, currentIcon, currentHighlight, currentPrice, currentLegend, currentShowPrice, currentCost, currentMultiplier);
            
            // Insertar exactamente debajo de la original en el DOM
            row.after(newRow);
            const container = row.closest('.group-medidas-rows');
            if (container) updateMedidaGroupColors(container);
            
            // Foco en el primer campo del clon y seleccionar texto
            const newValInput = newRow.querySelector('.medida-valor');
            if (newValInput) {
                newValInput.focus();
                newValInput.select();
            }
        });

        // Configurar cálculos interactivos y bidireccionales entre Costo, Multiplicador y Precio
        const priceInp = row.querySelector('.medida-precio');
        const costInp = row.querySelector('.medida-costo');
        const multInp = row.querySelector('.medida-multiplicador');

        const updateMarginBadge = () => {
            const price = parseFloat(priceInp.value);
            const cost = parseFloat(costInp.value);
            const badgeContainer = row.querySelector('.medida-margin-badge-container');
            if (!badgeContainer) return;
            if (!isNaN(price) && !isNaN(cost) && cost > 0) {
                const profit = price - cost;
                const marginPercent = Math.round((profit / price) * 100);
                const isProfit = profit >= 0;
                badgeContainer.innerHTML = `
                    <span class="margin-calculator-badge ${isProfit ? 'profit' : 'loss'}" style="display: inline-flex; align-items: center; gap: 4px; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; margin-top: 4px; ${isProfit ? 'background: rgba(16, 185, 129, 0.1); color: #10b981;' : 'background: rgba(239, 68, 68, 0.1); color: #ef4444;'}">
                        Ganancia: $${profit.toLocaleString()} (${marginPercent}%)
                    </span>
                `;
            } else {
                badgeContainer.innerHTML = '';
            }
        };

        const calculateFromPrice = () => {
            const price = priceInp.valueAsNumber;
            const cost = costInp.valueAsNumber;
            if (!isNaN(price) && !isNaN(cost) && cost > 0) {
                const mult = price / cost;
                multInp.value = parseFloat(mult.toFixed(2));
            } else {
                multInp.value = '';
            }
            updateMarginBadge();
        };

        const calculateFromMultiplier = () => {
            const mult = multInp.valueAsNumber;
            const cost = costInp.valueAsNumber;
            if (!isNaN(mult) && !isNaN(cost)) {
                const price = cost * mult;
                priceInp.value = Math.round(price);
            }
            updateMarginBadge();
        };

        const calculateFromCost = () => {
            const cost = costInp.valueAsNumber;
            if (isNaN(cost) || cost <= 0) {
                updateMarginBadge();
                return;
            }
            const mult = multInp.valueAsNumber;
            const price = priceInp.valueAsNumber;

            if (!isNaN(mult)) {
                priceInp.value = Math.round(cost * mult);
            } else if (!isNaN(price)) {
                multInp.value = parseFloat((price / cost).toFixed(2));
            }
            updateMarginBadge();
        };

        priceInp.addEventListener('input', calculateFromPrice);
        multInp.addEventListener('input', calculateFromMultiplier);
        costInp.addEventListener('input', calculateFromCost);
        
        setTimeout(updateMarginBadge, 50);
        
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

    // Reordenar activeGroupsUI basándose en el orden real de las tarjetas en el DOM
    function reorderActiveGroupsUI() {
        const adminAcabadosGroupsContainer = document.getElementById('admin-acabados-groups');
        if (!adminAcabadosGroupsContainer) return;
        const cards = Array.from(adminAcabadosGroupsContainer.querySelectorAll('.acabado-group-card'));
        const newActiveGroupsUI = [];
        cards.forEach(c => {
            const state = activeGroupsUI.find(g => g.id === c.id);
            if (state) {
                newActiveGroupsUI.push(state);
            }
        });
        activeGroupsUI = newActiveGroupsUI;
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
        const isHidden = groupData && groupData.hidden;
        card.className = `acabado-group-card ${isHidden ? 'is-hidden-acabado' : ''}`; // starts collapsed
        card.id = groupId;
        card.innerHTML = `
            <div class="acabado-group-header" ${isHidden ? 'style="opacity: 0.6;"' : ''}>
                <h4 class="group-header-title">
                    <span class="material-symbols-outlined" style="font-size:18px;">palette</span>
                    <span class="group-header-text" ${isHidden ? 'style="text-decoration: line-through;"' : ''}>${groupData && groupData.acabado_name ? groupData.acabado_name : 'Nuevo Acabado'}</span>
                </h4>
                <div class="header-actions" onclick="event.stopPropagation();">
                    <button type="button" class="btn-toggle-visibility" title="Ocultar/Mostrar Acabado" style="background: transparent; border: none; color: var(--text-muted, #718096); cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">${groupData && groupData.hidden ? 'visibility_off' : 'visibility'}</span>
                    </button>
                    <div class="acabado-drag-handle" title="Mantener presionado para arrastrar y reordenar acabado">
                        <span class="material-symbols-outlined" style="font-size: 18px;">reorder</span>
                    </div>
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

        const btnToggleVis = card.querySelector('.btn-toggle-visibility');
        if (btnToggleVis) {
            btnToggleVis.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHiddenNow = card.classList.toggle('is-hidden-acabado');
                const icon = btnToggleVis.querySelector('.material-symbols-outlined');
                
                if (isHiddenNow) {
                    icon.textContent = 'visibility_off';
                    header.style.opacity = '0.6';
                    titleText.style.textDecoration = 'line-through';
                } else {
                    icon.textContent = 'visibility';
                    header.style.opacity = '1';
                    titleText.style.textDecoration = 'none';
                }
            });
        }

        card.querySelector('.btn-remove-group').addEventListener('click', () => {
            if (confirm('¿Seguro que querés eliminar este grupo de acabado entero?')) {
                card.remove();
                activeGroupsUI = activeGroupsUI.filter(g => g.id !== groupId);
            }
        });

        // Configurar arrastre de la tarjeta de acabado (Drag & Drop)
        const dragHandle = card.querySelector('.acabado-drag-handle');
        if (dragHandle) {
            dragHandle.addEventListener('mousedown', () => {
                card.setAttribute('draggable', 'true');
            });
            dragHandle.addEventListener('touchstart', () => {
                card.setAttribute('draggable', 'true');
            });
        }

        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            card.setAttribute('draggable', 'false');
            reorderActiveGroupsUI();
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
                medidas_variants: clonedMedidas,
                hidden: card.classList.contains('is-hidden-acabado')
            };

            // Call UI builder to create the duplicate group
            createAcabadoGroupUI(cloneData);

            // Get the newly created card (it is the last child of container)
            const adminAcabadosGroupsContainer = document.getElementById('admin-acabados-groups');
            const newCard = adminAcabadosGroupsContainer ? adminAcabadosGroupsContainer.lastElementChild : null;
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

            reorderActiveGroupsUI(); // Sincronizar orden en memoria

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
            updateMedidaGroupColors(medidasContainer);
        });

        if (groupData && groupData.medidas_variants) {
            groupData.medidas_variants.forEach(m => {
                const isLog = m.logisticaEnabled !== false && m.noFlex !== true && m.disableFlex !== true;
                medidasContainer.appendChild(createMedidaRow(groupId, m.medida, m.link, m.default, m.hidden, m.linkLabel, m.iconType, m.highlight, m.price !== undefined ? m.price : '', m.legend !== undefined ? m.legend : '', m.showPrice !== undefined ? m.showPrice : false, m.cost_price !== undefined ? m.cost_price : '', '', isLog));
            });
            updateMedidaGroupColors(medidasContainer);
        }

        const adminAcabadosGroupsContainer = document.getElementById('admin-acabados-groups');
        if (adminAcabadosGroupsContainer) {
            adminAcabadosGroupsContainer.appendChild(card);
        }
        renderGroupPreview(groupId);
    }

    document.addEventListener('click', (e) => {
        if (e.target && e.target.closest('#btn-add-acabado-group')) {
            createAcabadoGroupUI();
        }
    });

    document.addEventListener('dragover', (e) => {
        const container = document.getElementById('admin-acabados-groups');
        if (container && e.target && container.contains(e.target)) {
            e.preventDefault();
            const draggingCard = container.querySelector('.acabado-group-card.dragging');
            if (!draggingCard) return;

            const afterElement = getDragAfterElement(container, e.clientY, '.acabado-group-card');
            if (afterElement == null) {
                container.appendChild(draggingCard);
            } else {
                container.insertBefore(draggingCard, afterElement);
            }
        }
    });

    // Toggle de visibilidad para inputs de costos de envío del producto
    const bindProductShippingToggles = () => {
        const setupToggle = (checkId, grpId, displayStyle = 'block') => {
            const chk = document.getElementById(checkId);
            const grp = document.getElementById(grpId);
            if (chk && grp && !chk._hasToggleListener) {
                chk._hasToggleListener = true;
                chk.addEventListener('change', () => {
                    grp.style.display = chk.checked ? displayStyle : 'none';
                });
            }
        };
        setupToggle('product-ship-logistica-enabled', 'product-ship-logistica-group', 'block');
        setupToggle('product-ship-flete-enabled', 'product-ship-flete-group', 'block');
        setupToggle('product-ship-otro-enabled', 'product-ship-otro-group', 'grid');
    };
    bindProductShippingToggles();

    // ── Abrir formulario ──
    let sourceCategoryIdx = null; // tracks which category the product came from

    function openProductForm(cIdx, existingProd = null) {
        if (cIdx !== null) {
            window.isRentalMode = false;
        }

        targetCategoryIdForProduct = cIdx;
        sourceCategoryIdx = cIdx;                          // guardar categoría de origen
        const isCloning = existingProd && (existingProd.isClone || existingProd.id?.endsWith('-copia'));
        editingProductId  = (existingProd && !isCloning) ? existingProd.id : null;

        // Mostrar u ocultar checkbox de publicación automática en Novedades/Avisos
        const autoAvisoContainer = document.getElementById('admin-product-auto-aviso-container');
        if (autoAvisoContainer) {
            autoAvisoContainer.style.display = existingProd ? 'none' : 'flex';
        }
        const autoAvisoCheck = document.getElementById('admin-product-auto-aviso');
        if (autoAvisoCheck) {
            autoAvisoCheck.checked = true;
        }

        // Limpiar estado de grupos
        const adminAcabadosGroupsContainer = document.getElementById('admin-acabados-groups');
        if (adminAcabadosGroupsContainer) adminAcabadosGroupsContainer.innerHTML = '';
        activeGroupsUI = [];
        groupCounter = 0;

        // Mostrar / Ocultar campos específicos de Alquiler
        const rentalPriceGroup = document.getElementById('admin-product-rental-price-group');
        const categoriesDetails = document.getElementById('admin-product-categories-details');
        if (rentalPriceGroup) rentalPriceGroup.style.display = window.isRentalMode ? 'block' : 'none';
        if (categoriesDetails) categoriesDetails.style.display = window.isRentalMode ? 'none' : 'block';

        if (window.isRentalMode) {
            document.getElementById('admin-product-rental-price').value = existingProd?.price || '';
        }

        // Campos globales (Auto-generar ID Base36 sin puntos si es un producto nuevo)
        let autoId = existingProd?.id || '';
        if (!autoId && cIdx !== null && sessionProducts[cIdx]) {
            const catNum = (cIdx + 1).toString(36).toUpperCase();
            const prodCount = (sessionProducts[cIdx].products || []).length + 1;
            const prodNum = prodCount.toString(36).toUpperCase();
            autoId = `${catNum}${prodNum}`;
        }
        document.getElementById('admin-id').value          = autoId;
        document.getElementById('admin-title').value       = existingProd?.title       || '';
        document.getElementById('admin-description').value = existingProd?.description || '';
        document.getElementById('admin-video').value       = existingProd?.video       || '';

        // ── Poblar checkboxes de categorías y marcar principal (solo si no es alquiler) ──
        const assignedCategoryIds = [];
        let primaryCategoryId = existingProd?.primaryCatId || null;

        if (!window.isRentalMode) {
            if (existingProd) {
                const searchId = isCloning && existingProd.id ? existingProd.id.replace(/-copia$/, '') : existingProd.id;
                sessionProducts.forEach(cat => {
                    if (cat.products && cat.products.some(p => p.id === searchId || p.id === existingProd.id)) {
                        assignedCategoryIds.push(cat.id);
                    }
                });
                const realAssigned = assignedCategoryIds.filter(id => !id.endsWith('-todos'));
                if (!primaryCategoryId || primaryCategoryId.endsWith('-todos')) {
                    primaryCategoryId = realAssigned.length > 0 ? realAssigned[0] : (assignedCategoryIds.length > 0 ? assignedCategoryIds[0] : null);
                }
            } else {
                let currentCatId = sessionProducts[cIdx]?.id;
                if (currentCatId) {
                    // Si la categoría de origen es la de respaldo "Todos los productos", buscamos la primera categoría real del rubro
                    if (currentCatId.endsWith('-todos')) {
                        const rubroId = sessionProducts[cIdx]?.rubro || 'carpinteria';
                        const firstRealCat = sessionProducts.find(c => (c.rubro || 'carpinteria') === rubroId && !c.id.endsWith('-todos'));
                        if (firstRealCat) {
                            currentCatId = firstRealCat.id;
                        }
                    }
                    assignedCategoryIds.push(currentCatId);
                    primaryCategoryId = currentCatId;
                }
            }
        }

        const checkboxesContainer = document.getElementById('product-categories-checkboxes');
        if (checkboxesContainer) {
            checkboxesContainer.innerHTML = '';
            if (!window.isRentalMode) {
                const primaryCatObj = sessionProducts.find(c => c.id === primaryCategoryId);
                const activeRubroId = primaryCatObj ? (primaryCatObj.rubro || 'carpinteria') : 'carpinteria';

                sessionProducts.forEach((cat) => {
                    const isDefaultTodos = cat.id.endsWith('-todos');
                    const isChecked = isDefaultTodos ? (cat.id === `${activeRubroId}-todos`) : assignedCategoryIds.includes(cat.id);
                    const isPrimary = cat.id === primaryCategoryId;

                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid #F0F2F5;';

                    const checkboxLabel = document.createElement('label');
                    checkboxLabel.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:500; color:var(--text-main); margin:0;';
                    checkboxLabel.innerHTML = `
                        <input type="checkbox" class="cat-checkbox" value="${cat.id}" ${isChecked ? 'checked' : ''} ${isDefaultTodos ? 'disabled' : ''} style="width:18px; height:18px; cursor:pointer;">
                        <span>${cat.name} ${isDefaultTodos ? '<span style="font-size:0.72rem; color:var(--primary-color); opacity:0.8;">(Obligatorio)</span>' : ''}</span>
                    `;

                    const radioLabel = document.createElement('label');
                    radioLabel.style.cssText = 'display:flex; align-items:center; gap:4px; font-size:0.8rem; color:var(--text-muted); cursor:pointer; margin:0;';
                    radioLabel.innerHTML = isDefaultTodos ? `<span style="font-size: 0.72rem; font-style: italic; opacity:0.6;">Resguardo</span>` : `
                        <input type="radio" name="primary-category" class="cat-primary-radio" value="${cat.id}" ${isPrimary ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <span>Principal</span>
                    `;

                    row.appendChild(checkboxLabel);
                    row.appendChild(radioLabel);
                    checkboxesContainer.appendChild(row);

                    const radioInput = row.querySelector('.cat-primary-radio');
                    const checkboxInput = checkboxLabel.querySelector('.cat-checkbox');

                    if (radioInput) {
                        radioInput.addEventListener('change', () => {
                            if (radioInput.checked) {
                                checkboxInput.checked = true;

                                const targetCatObj = sessionProducts.find(c => c.id === cat.id);
                                const targetRubroId = targetCatObj ? (targetCatObj.rubro || 'carpinteria') : 'carpinteria';

                                checkboxesContainer.querySelectorAll('.cat-checkbox').forEach(cb => {
                                    if (cb.value.endsWith('-todos')) {
                                        cb.checked = (cb.value === `${targetRubroId}-todos`);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }

        // Variante opcional
        const optV = existingProd?.optional_variant || {};
        document.getElementById('admin-opt-label').value   = optV.label   || '';
        document.getElementById('admin-opt-options').value = optV.options ? optV.options.join(', ') : '';

        // Configuración de Envíos del Producto
        const shipConf = existingProd?.shippingConfig || {};
        const logCheck = document.getElementById('product-ship-logistica-enabled');
        const logCost = document.getElementById('product-ship-logistica-cost');
        const logGrp = document.getElementById('product-ship-logistica-group');
        const isLogEnabled = shipConf.logisticaEnabled !== false;
        if (logCheck) logCheck.checked = isLogEnabled;
        const logMaxU = document.getElementById('product-ship-logistica-max-units');
        const logFreeMinU = document.getElementById('product-ship-logistica-free-min-units');
        if (logCost) logCost.value = (shipConf.logisticaCost !== undefined && shipConf.logisticaCost !== null) ? shipConf.logisticaCost : '';
        if (logMaxU) logMaxU.value = shipConf.logisticaMaxUnits || '';
        if (logFreeMinU) logFreeMinU.value = shipConf.logisticaFreeMinUnits || '';
        if (logGrp) logGrp.style.display = isLogEnabled ? 'flex' : 'none';

        const fltCheck = document.getElementById('product-ship-flete-enabled');
        const fltCost = document.getElementById('product-ship-flete-cost');
        const fltMaxU = document.getElementById('product-ship-flete-max-units');
        const fltFreeMinU = document.getElementById('product-ship-flete-free-min-units');
        const fltGrp = document.getElementById('product-ship-flete-group');
        const isFltEnabled = shipConf.fleteEnabled !== false;
        if (fltCheck) fltCheck.checked = isFltEnabled;
        if (fltCost) fltCost.value = (shipConf.fleteCost !== undefined && shipConf.fleteCost !== null) ? shipConf.fleteCost : '';
        if (fltMaxU) fltMaxU.value = shipConf.fleteMaxUnits || '';
        if (fltFreeMinU) fltFreeMinU.value = shipConf.fleteFreeMinUnits || '';
        if (fltGrp) fltGrp.style.display = isFltEnabled ? 'flex' : 'none';

        const otrCheck = document.getElementById('product-ship-otro-enabled');
        const otrLbl = document.getElementById('product-ship-otro-label');
        const otrCost = document.getElementById('product-ship-otro-cost');
        const otrGrp = document.getElementById('product-ship-otro-group');
        if (otrCheck) otrCheck.checked = !!shipConf.otroEnabled;
        if (otrLbl) otrLbl.value = shipConf.otroLabel || '';
        if (otrCost) otrCost.value = (shipConf.otroCost !== undefined && shipConf.otroCost !== null) ? shipConf.otroCost : '';
        if (otrGrp) otrGrp.style.display = shipConf.otroEnabled ? 'grid' : 'none';

        const freeCheck = document.getElementById('product-ship-is-free');
        if (freeCheck) freeCheck.checked = !!shipConf.isFreeShipping;

        // Configuración de Medios de Pago del Producto
        const payConf = existingProd?.paymentConfig || {};
        const payTransCheck = document.getElementById('product-pay-transfer-enabled');
        const payLinkCheck = document.getElementById('product-pay-link-enabled');
        const payCreditCheck = document.getElementById('product-pay-credit-enabled');
        if (payTransCheck) payTransCheck.checked = payConf.transferEnabled !== false;
        if (payLinkCheck) payLinkCheck.checked = payConf.linkEnabled !== false;
        if (payCreditCheck) payCreditCheck.checked = payConf.creditEnabled !== false;

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
        let titleText = '';
        if (window.isRentalMode) {
            titleText = existingProd
                ? (isClon ? `📋 Clonando Alquiler: ${existingProd.title}` : `Editando Alquiler: ${existingProd.title}`)
                : `Nuevo Alquiler`;
        } else {
            titleText = existingProd
                ? (isClon ? `📋 Clonando: ${existingProd.title}` : `Editando: ${existingProd.title}`)
                : `Nuevo Producto en ${cIdx !== null ? sessionProducts[cIdx].name : 'Catálogo General'}`;
        }
        const adminFormTitle = document.getElementById('admin-form-title');
        const productModal = document.getElementById('admin-product-modal');
        if (adminFormTitle) adminFormTitle.textContent = titleText;
        if (productModal) {
            productModal.style.display = 'flex';
            productModal.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // ── Guardar producto con delegación de eventos global ──
    document.addEventListener('click', async (e) => {
        const btnGenerateJson = e.target.closest('#btn-generate-json');
        if (!btnGenerateJson) return;

        try {
            let idVal = document.getElementById('admin-id')?.value?.trim() || '';
            const pTitle = document.getElementById('admin-title')?.value?.trim() || '';

            if (!idVal) {
                if (pTitle) {
                    // Convertir el título en un slug amigable
                    idVal = pTitle
                        .toLowerCase()
                        .normalize('NFD') // Quitar acentos
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9\s-]/g, '') // Quitar caracteres especiales
                        .trim()
                        .replace(/\s+/g, '-') // Cambiar espacios por guiones
                        .replace(/-+/g, '-'); // Quitar guiones duplicados
                } else {
                    // Si tampoco hay título, generamos un ID temporal con timestamp
                    idVal = 'borrador-' + Date.now();
                }
                // Actualizar el input visualmente en el formulario
                const adminIdInp = document.getElementById('admin-id');
                if (adminIdInp) adminIdInp.value = idVal;
            }

            btnGenerateJson.disabled    = true;
            btnGenerateJson.textContent = 'Guardando...';

            const catName = window.isRentalMode ? 'alquileres' : (targetCategoryIdForProduct !== null && sessionProducts[targetCategoryIdForProduct] ? sessionProducts[targetCategoryIdForProduct].name : 'general');

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
                const medidasVariants = medidasContainer ? [...medidasContainer.querySelectorAll('.medida-admin-row')].map(row => {
                    const priceVal = row.querySelector('.medida-precio') ? row.querySelector('.medida-precio').value.trim() : '';
                    const costVal = row.querySelector('.medida-costo') ? row.querySelector('.medida-costo').value.trim() : '';
                    return {
                        medida: row.querySelector('.medida-valor')?.value?.trim() || '',
                        link:   row.querySelector('.medida-link')?.value?.trim() || '',
                        default: row.querySelector('.medida-default-radio')?.checked || false,
                        hidden: row.dataset.hidden === 'true',
                        linkLabel: row.dataset.linkLabel || '',
                        iconType: row.dataset.iconType || 'local_shipping',
                        highlight: row.dataset.highlight === 'true',
                        price: priceVal !== '' ? parseFloat(priceVal) : '',
                        cost_price: costVal !== '' ? parseFloat(costVal) : '',
                        legend: row.querySelector('.medida-leyenda') ? row.querySelector('.medida-leyenda').value.trim() : '',
                        showPrice: row.dataset.showPrice === 'true',
                        logisticaEnabled: row.dataset.logisticaEnabled !== 'false'
                    };
                }).filter(r => r.medida !== '') : [];


                finalAcabadosGroups.push({
                    acabado_name: card.querySelector('.group-acabado-name')?.value?.trim() || '',
                    cover_image: gState.images[0] || 'img/logo_provisional.png',
                    images_list: gState.images.length > 0 ? [...gState.images] : [],
                    medidas_variants: medidasVariants,
                    hidden: card.classList.contains('is-hidden-acabado')
                });
            }

            const optLabel   = document.getElementById('admin-opt-label')?.value?.trim() || '';
            const optRaw     = document.getElementById('admin-opt-options')?.value?.trim() || '';
            const optOptions = optRaw ? optRaw.split(',').map(s => s.trim()).filter(s => s) : [];

            const tagsRaw    = document.getElementById('admin-tags')?.value?.trim() || '';
            const tagsList   = tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(s => s) : [];
            const pVideo     = document.getElementById('admin-video')?.value?.trim() || '';

            // Configuración de Envíos del Producto
            const logMaxUnitsVal = parseInt(document.getElementById('product-ship-logistica-max-units')?.value);
            const logFreeMinVal = parseInt(document.getElementById('product-ship-logistica-free-min-units')?.value);
            const fltMaxUnitsVal = parseInt(document.getElementById('product-ship-flete-max-units')?.value);
            const fltFreeMinVal = parseInt(document.getElementById('product-ship-flete-free-min-units')?.value);

            const shippingConfig = {
                logisticaEnabled: document.getElementById('product-ship-logistica-enabled')?.checked || false,
                logisticaCost: parseFloat(document.getElementById('product-ship-logistica-cost')?.value) || 0,
                logisticaMaxUnits: (!isNaN(logMaxUnitsVal) && logMaxUnitsVal > 0) ? logMaxUnitsVal : undefined,
                logisticaFreeMinUnits: (!isNaN(logFreeMinVal) && logFreeMinVal > 0) ? logFreeMinVal : undefined,
                fleteEnabled: document.getElementById('product-ship-flete-enabled')?.checked || false,
                fleteCost: parseFloat(document.getElementById('product-ship-flete-cost')?.value) || 0,
                fleteMaxUnits: (!isNaN(fltMaxUnitsVal) && fltMaxUnitsVal > 0) ? fltMaxUnitsVal : undefined,
                fleteFreeMinUnits: (!isNaN(fltFreeMinVal) && fltFreeMinVal > 0) ? fltFreeMinVal : undefined,
                otroEnabled: document.getElementById('product-ship-otro-enabled')?.checked || false,
                otroLabel: document.getElementById('product-ship-otro-label')?.value?.trim() || 'A convenir',
                otroCost: parseFloat(document.getElementById('product-ship-otro-cost')?.value) || 0,
                isFreeShipping: document.getElementById('product-ship-is-free')?.checked || false
            };

            // Configuración de Medios de Pago del Producto
            const paymentConfig = {
                transferEnabled: document.getElementById('product-pay-transfer-enabled')?.checked ?? true,
                linkEnabled: document.getElementById('product-pay-link-enabled')?.checked ?? true,
                creditEnabled: document.getElementById('product-pay-credit-enabled')?.checked ?? true
            };

            const product = {
                id:          idVal,
                title:       document.getElementById('admin-title')?.value?.trim() || '',
                description: document.getElementById('admin-description')?.value?.trim() || '',
                video:       pVideo !== '' ? pVideo : undefined,
                image:       finalAcabadosGroups[0]?.cover_image || 'img/logo_provisional.png',
                acabados_groups: finalAcabadosGroups,
                tags:        tagsList,
                shippingConfig: shippingConfig,
                paymentConfig: paymentConfig,
                last_modified: Date.now()
            };

            if (optLabel && optOptions.length > 0) {
                product.optional_variant = { label: optLabel, options: optOptions };
            }

            if (window.isRentalMode) {
                product.price = document.getElementById('admin-product-rental-price').value.trim();
                product.primaryCatId = 'alquileres';

                // Validar duplicado de ID en rentals si es nuevo
                if (!editingProductId) {
                    if (sessionRentals.some(r => r.id === product.id)) {
                        alert(`Ya existe un alquiler con el ID "${product.id}". Cambiá el ID e intentá de nuevo.`);
                        btnGenerateJson.disabled = false;
                        btnGenerateJson.textContent = 'Guardar Producto en Servidor';
                        return;
                    }
                }

                // Buscar estado de visibilidad existente
                let existingRentalVisibleState = undefined;
                const found = sessionRentals.find(r => r.id === (editingProductId || product.id));
                if (found && found.visible !== undefined) {
                    existingRentalVisibleState = found.visible;
                }
                if (existingRentalVisibleState !== undefined) {
                    product.visible = existingRentalVisibleState;
                }

                // Guardar/Actualizar en sessionRentals
                const matchIndex = sessionRentals.findIndex(r => r.id === (editingProductId || product.id));
                if (matchIndex !== -1) {
                    sessionRentals[matchIndex] = product;
                } else {
                    sessionRentals.push(product);
                }

                // Auto-crear aviso si es un alquiler totalmente nuevo
                if (!editingProductId) {
                    const autoAvisoCheck = document.getElementById('admin-product-auto-aviso');
                    const shouldPublish = autoAvisoCheck ? autoAvisoCheck.checked : true;
                    
                    if (shouldPublish) {
                        const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                        const newAvisoBlock = {
                            title: `¡Nuevo Alquiler: ${product.title}!`,
                            description: `Sumamos un nuevo artículo a nuestra sección de alquileres. ¡Hacé clic para conocer todos los detalles de ${product.title}!`,
                            mediaType: 'image',
                            image: productCover,
                            videoUrl: '',
                            mapQuery: '',
                            links: [
                                {
                                    text: 'Ver Alquiler',
                                    url: `?view=view-product-detail&prod=${product.id}`,
                                    newTab: false
                                }
                            ],
                            linkUrl: `?view=view-product-detail&prod=${product.id}`,
                            linkText: 'Ver Alquiler',
                            linkNewTab: false,
                            timestamp: Date.now()
                        };

                        if (typeof window.sessionAvisos !== 'undefined') {
                            window.sessionAvisos.unshift(newAvisoBlock);
                            localStorage.setItem('sessionAvisosAutonomo', JSON.stringify(window.sessionAvisos));
                            if (window.syncSiteConfigWithServer) {
                                window.syncSiteConfigWithServer();
                            }
                        }
                    }
                }
                // Sincronizar avisos vinculados a este alquiler
                if (window.sessionAvisos && Array.isArray(window.sessionAvisos)) {
                    let avisosChanged = false;
                    window.sessionAvisos.forEach(aviso => {
                        const linksList = aviso.links || [];
                        const hasLinkToProduct = (aviso.linkUrl && aviso.linkUrl.includes(`prod=${product.id}`)) ||
                                                 linksList.some(l => l.url && l.url.includes(`prod=${product.id}`));
                        if (hasLinkToProduct && aviso.image !== product.image) {
                            aviso.image = product.image;
                            avisosChanged = true;
                        }
                    });
                    if (avisosChanged) {
                        localStorage.setItem('sessionAvisosAutonomo', JSON.stringify(window.sessionAvisos));
                    }
                }

                showAdminToast(editingProductId ? '✅ Alquiler actualizado correctamente' : '✅ Alquiler creado correctamente');

                if (window.saveRentalsToServer) {
                    await window.saveRentalsToServer();
                }

                const productModal = document.getElementById('admin-product-modal');
                if (productModal) productModal.style.display = 'none';
                renderAdminRentals();

                btnGenerateJson.disabled    = false;
                btnGenerateJson.textContent = 'Guardar Producto en Servidor';
                return;
            }

            // Obtener categorías seleccionadas y principal (solo modo normal)
            const checkboxesContainer = document.getElementById('product-categories-checkboxes');
            let selectedCatIds = checkboxesContainer ? [...checkboxesContainer.querySelectorAll('.cat-checkbox:checked')].map(cb => cb.value) : [];
            const primaryRadio = checkboxesContainer ? checkboxesContainer.querySelector('.cat-primary-radio:checked') : null;
            const realSelectedCatIds = selectedCatIds.filter(id => !id.endsWith('-todos'));
            let primaryCatId = primaryRadio ? primaryRadio.value : (realSelectedCatIds.length > 0 ? realSelectedCatIds[0] : (selectedCatIds.length > 0 ? selectedCatIds[0] : null));

            if (!primaryCatId) {
                alert('Debes elegir una categoría como la Principal.');
                btnGenerateJson.disabled = false;
                btnGenerateJson.textContent = 'Guardar Producto en Servidor';
                return;
            }

            // Identificar rubro de la categoría principal para forzar su Todos los productos
            const primaryCatObj = sessionProducts.find(c => c.id === primaryCatId);
            const primaryRubroId = primaryCatObj ? (primaryCatObj.rubro || 'carpinteria') : 'carpinteria';
            const defaultTodosId = `${primaryRubroId}-todos`;

            // Forzar que el array contenga el "Todos los productos" de su rubro
            if (!selectedCatIds.includes(defaultTodosId)) {
                selectedCatIds.push(defaultTodosId);
            }

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

            // Buscar si ya existe el producto para heredar su estado de visibilidad e historial
            let existingVisibleState = undefined;
            let existingHistory = [];
            for (const cat of sessionProducts) {
                if (cat.products) {
                    const found = cat.products.find(p => p.id === (editingProductId || product.id));
                    if (found) {
                        if (found.visible !== undefined) existingVisibleState = found.visible;
                        if (Array.isArray(found.history)) existingHistory = found.history;
                        break;
                    }
                }
            }

            product.history = existingHistory;

            const hasNoRealImages = !product.image || product.image === 'img/logo_provisional.png';
            if (hasNoRealImages) {
                product.visible = false;
            } else if (existingVisibleState !== undefined) {
                product.visible = existingVisibleState;
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

            // Auto-crear aviso si es un producto totalmente nuevo
            if (!editingProductId) {
                const autoAvisoCheck = document.getElementById('admin-product-auto-aviso');
                const shouldPublish = autoAvisoCheck ? autoAvisoCheck.checked : true;
                
                if (shouldPublish) {
                    const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
                    const newAvisoBlock = {
                        title: `¡Nuevo Ingreso: ${product.title}!`,
                        description: `Agregamos un nuevo producto a nuestro catálogo. ¡Hacé clic para conocer todos los detalles de ${product.title}!`,
                        mediaType: 'image',
                        image: productCover,
                        videoUrl: '',
                        mapQuery: '',
                        links: [
                            {
                                text: 'Ver Producto',
                                url: `?view=view-product-detail&prod=${product.id}`,
                                newTab: false
                            }
                        ],
                        linkUrl: `?view=view-product-detail&prod=${product.id}`,
                        linkText: 'Ver Producto',
                        linkNewTab: false,
                        timestamp: Date.now()
                    };

                    if (typeof window.sessionAvisos !== 'undefined') {
                        window.sessionAvisos.unshift(newAvisoBlock);
                        localStorage.setItem('sessionAvisosAutonomo', JSON.stringify(window.sessionAvisos));
                        if (window.syncSiteConfigWithServer) {
                            window.syncSiteConfigWithServer();
                        }
                    }
                }
            }

            // Sincronizar avisos vinculados a este producto
            if (window.sessionAvisos && Array.isArray(window.sessionAvisos)) {
                let avisosChanged = false;
                window.sessionAvisos.forEach(aviso => {
                    const linksList = aviso.links || [];
                    const hasLinkToProduct = (aviso.linkUrl && aviso.linkUrl.includes(`prod=${product.id}`)) ||
                                             linksList.some(l => l.url && l.url.includes(`prod=${product.id}`));
                    if (hasLinkToProduct && aviso.image !== product.image) {
                        aviso.image = product.image;
                        avisosChanged = true;
                    }
                });
                if (avisosChanged) {
                    localStorage.setItem('sessionAvisosAutonomo', JSON.stringify(window.sessionAvisos));
                }
            }

            showAdminToast(editingProductId ? '✅ Producto actualizado en todas las categorías' : '✅ Producto agregado a las categorías');

            if (typeof window.saveProductsToServer === 'function') {
                await window.saveProductsToServer();
            } else if (typeof saveProductsToServer === 'function') {
                await saveProductsToServer();
            } else {
                console.warn('saveProductsToServer no encontrada en window');
            }

            const productModal = document.getElementById('admin-product-modal');
            if (productModal) productModal.style.display = 'none';
            renderAdminUX();

            btnGenerateJson.disabled    = false;
            btnGenerateJson.textContent = 'Guardar Producto en Servidor';
        } catch (err) {
            console.error('Error al guardar el producto:', err);
            alert('Ocurrió un error al procesar el producto: ' + err.message);
            btnGenerateJson.disabled    = false;
            btnGenerateJson.textContent = 'Guardar Producto en Servidor';
        }
    });

    // --- BUSCADOR CONSCIENTE DE LAS VARIANTES (ACABADOS) ---
    
    // Función interna para generar el índice virtual de productos y variantes
