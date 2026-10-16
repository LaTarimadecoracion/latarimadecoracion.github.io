// js/admin/cajones/cajones-materials.js
// --- SUBMÓDULO 1: GESTIÓN DE MATERIALES & TABLEROS ---

(function() {
    'use strict';

    let materialsList = [];

    function getMaterials() {
        return materialsList;
    }

    function setMaterials(list) {
        materialsList = Array.isArray(list) ? JSON.parse(JSON.stringify(list)) : [];
    }

    // Sincronizar array en memoria leyendo todos los inputs del DOM
    function syncMaterialsFromDOM() {
        const container = document.getElementById('cajones-materiales-container');
        if (!container) return materialsList;
        const cards = container.querySelectorAll('.cajones-material-card');
        const reordered = [];

        cards.forEach((card, idx) => {
            const matId = card.dataset.materialId;
            const found = materialsList.find(m => m.id === matId);
            const name = card.querySelector('.mat-inp-name')?.value.trim() || `Material ${idx + 1}`;
            const activo = card.querySelector('.mat-chk-activo')?.checked !== false;
            const es_placa = card.querySelector('.mat-chk-placa')?.checked !== false;
            const es_tirante = card.querySelector('.mat-chk-tirante')?.checked === true;
            const max_largo = parseFloat(card.querySelector('.mat-inp-max-largo')?.value) || 244;
            const max_ancho = parseFloat(card.querySelector('.mat-inp-max-ancho')?.value) || 124;
            const peso_placa = parseFloat(card.querySelector('.mat-inp-peso-placa')?.value) || 35;
            const costo_placa = parseFloat(card.querySelector('.mat-inp-costo-placa')?.value) || 20000;
            const costo_m2 = parseFloat(card.querySelector('.mat-inp-costo')?.value) || 6611;
            const margen_pct = parseFloat(card.querySelector('.mat-inp-margen-pct')?.value) || 140;
            const precio_m2 = parseFloat(card.querySelector('.mat-inp-precio')?.value) || Math.round(costo_m2 * (1 + (margen_pct / 100)));
            const espesores_texto = card.querySelector('.mat-inp-espesor')?.value.trim() || '18 mm';
            const limite_mensaje = card.querySelector('.mat-inp-limite-msg')?.value.trim() || '';

            reordered.push({
                ...(found || {}),
                id: matId,
                name: name,
                max_largo: max_largo,
                max_ancho: max_ancho,
                peso_placa: peso_placa,
                costo_placa: costo_placa,
                costo_m2: costo_m2,
                margen_pct: margen_pct,
                precio_m2: precio_m2,
                espesores_texto: espesores_texto,
                espesores_disponibles: espesores_texto.split(',').map(s => s.trim()).filter(Boolean),
                limite_mensaje: limite_mensaje,
                activo: activo,
                es_placa: es_placa,
                es_tirante: es_tirante,
                is_default: idx === 0
            });
        });

        if (reordered.length > 0) {
            materialsList = reordered;
        }
        return materialsList;
    }

    // Renderizar grilla de materiales
    function renderMaterialsUI() {
        const container = document.getElementById('cajones-materiales-container');
        if (!container) return;

        container.innerHTML = '';

        if (!materialsList || materialsList.length === 0) {
            container.innerHTML = `<div style="padding: 1rem; text-align: center; color: #64748B; font-size: 0.85rem;">No hay materiales cargados. Hacé clic en "+ Nuevo Material" para agregar uno.</div>`;
            return;
        }

        materialsList.forEach((mat, idx) => {
            const card = document.createElement('div');
            card.className = 'cajones-material-card';
            card.dataset.materialId = mat.id || ('mat_' + Date.now() + '_' + idx);
            card.style.cssText = 'background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.85rem; display: flex; flex-direction: column; gap: 8px; transition: transform 0.15s ease, box-shadow 0.15s ease;';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 220px;">
                        <span class="material-symbols-outlined cajon-mat-drag-handle" style="color: #854D0E; font-size: 22px; cursor: grab; user-select: none; padding: 2px 4px; border-radius: 4px;" title="Mantener presionado para arrastrar y reordenar materiales">layers</span>
                        <input type="text" class="admin-input mat-inp-name" value="${mat.name || ''}" placeholder="Nombre del material o placa" style="font-weight: 700; width: 100%;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; background: #FFF; padding: 4px 10px; border-radius: 8px; border: 1px solid #E2E8F0;">
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer; color: #1E293B;">
                            <input type="checkbox" class="mat-chk-activo" ${mat.activo !== false ? 'checked' : ''} style="cursor: pointer;"> Activo
                        </label>
                        <div style="width: 1px; height: 16px; background: #CBD5E1;"></div>
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer; color: #0284C7;" title="Utilizado para tapas, bases y caras exteriores del cajón">
                            <input type="checkbox" class="mat-chk-placa" ${mat.es_placa !== false ? 'checked' : ''} style="cursor: pointer;"> 🪵 Placa
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer; color: #B45309;" title="Utilizado para esqueleto y refuerzos internos donde se fijan las caras">
                            <input type="checkbox" class="mat-chk-tirante" ${mat.es_tirante === true ? 'checked' : ''} style="cursor: pointer;"> 🦴 Tirante
                        </label>
                        <div style="width: 1px; height: 16px; background: #CBD5E1;"></div>
                        <button type="button" class="btn-danger" onclick="window.removeCajonMaterialRow(${idx})" style="padding: 3px 8px; font-size: 0.75rem; border-radius: 6px; cursor: pointer;" title="Eliminar material">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Largo Placa (cm):</label>
                        <input type="number" class="admin-input mat-inp-max-largo" value="${mat.max_largo || 244}" min="10">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Ancho Placa (cm):</label>
                        <input type="number" class="admin-input mat-inp-max-ancho" value="${mat.max_ancho || 124}" min="10">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #0369A1; margin-bottom: 2px;">⚖️ Peso Placa Entera (kg):</label>
                        <input type="number" class="admin-input mat-inp-peso-placa" value="${mat.peso_placa !== undefined ? mat.peso_placa : 35}" step="0.5" min="1" placeholder="Ej: 35" style="font-weight: 700; border-color: #7DD3FC;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #1E293B; margin-bottom: 2px;">💰 Costo Placa Entera ($):</label>
                        <input type="number" class="admin-input mat-inp-costo-placa" value="${mat.costo_placa || 20000}" step="1000" placeholder="Ej: 20000" style="font-weight: 700; border-color: #CBD5E1;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Costo Base ($/m²):</label>
                        <input type="number" class="admin-input mat-inp-costo" value="${mat.costo_m2 || 6611}" step="500">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #16A34A; margin-bottom: 2px;">📈 Margen Deseado (%):</label>
                        <input type="number" class="admin-input mat-inp-margen-pct" value="${mat.margen_pct !== undefined ? mat.margen_pct : 140}" step="5" min="0" placeholder="Ej: 140" style="font-weight: 800; border-color: #86EFAC; color: #15803D;">
                        <input type="hidden" class="mat-inp-precio" value="${mat.precio_m2 || 15866}">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Espesores (escribir):</label>
                        <input type="text" class="admin-input mat-inp-espesor" value="${mat.espesores_texto || (Array.isArray(mat.espesores_disponibles) ? mat.espesores_disponibles.join(', ') : '18 mm')}" placeholder="Ej: 18 mm">
                    </div>
                </div>

                <!-- Resumen Financiero y Logístico en Vivo -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; background: #F0FDF4; border: 1.5px solid #BBF7D0; padding: 6px 12px; border-radius: 8px;">
                    <div style="font-size: 0.73rem; color: #166534;">
                        📐 Placa: <strong class="mat-lbl-placa-calc">${((mat.max_largo || 244) * (mat.max_ancho || 124) / 10000).toFixed(2)} m²</strong>
                    </div>
                    <div style="font-size: 0.73rem; color: #0369A1;">
                        ⚖️ Densidad: <strong class="mat-lbl-peso-m2-calc">${(((mat.peso_placa !== undefined ? mat.peso_placa : 35) / (((mat.max_largo || 244) * (mat.max_ancho || 124) / 10000) || 1))).toFixed(1)} kg/m²</strong>
                    </div>
                    <div style="font-size: 0.73rem; color: #166534;">
                        🏷️ Venta Corte: <strong class="mat-lbl-precio-corte-calc" style="color: #15803D; font-size: 0.8rem;">$${(mat.precio_m2 || 15866).toLocaleString('es-AR')} / m²</strong>
                    </div>
                    <div style="font-size: 0.73rem; color: #166534;">
                        💵 Ganancia x Placa: <strong class="mat-lbl-ganancia-placa-calc" style="color: #047857; font-size: 0.8rem;">+$${Math.round(((mat.precio_m2 || 15866) - (mat.costo_m2 || 6611)) * ((mat.max_largo || 244) * (mat.max_ancho || 124) / 10000)).toLocaleString('es-AR')}</strong>
                    </div>
                </div>

                <div>
                    <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Mensaje de advertencia si el cliente supera las medidas:</label>
                    <input type="text" class="admin-input mat-inp-limite-msg" value="${mat.limite_mensaje || ''}" placeholder="Ej: Para cajones gigantes se cotiza unión de placas en taller...">
                </div>
            `;

            container.appendChild(card);
        });

        // Configurar Drag & Drop con utilidad modular
        if (window.CajonesAdminDrag) {
            window.CajonesAdminDrag.setup({
                container: container,
                itemSelector: '.cajones-material-card',
                handleSelector: '.cajon-mat-drag-handle',
                orientation: 'vertical',
                onReorder: syncMaterialsFromDOM
            });
        }

        // Eventos de cálculo dinámico
        if (!container.dataset.calcBound) {
            container.dataset.calcBound = "true";
            container.addEventListener('input', handleMaterialCalcInput);
        }
    }

    function handleMaterialCalcInput(e) {
        const target = e.target;
        const card = target.closest('.cajones-material-card');
        if (!card) return;

        const inLargo = card.querySelector('.mat-inp-max-largo');
        const inAncho = card.querySelector('.mat-inp-max-ancho');
        const inCostoPlaca = card.querySelector('.mat-inp-costo-placa');
        const inCostoM2 = card.querySelector('.mat-inp-costo');
        const inMargenPct = card.querySelector('.mat-inp-margen-pct');
        const inPrecioM2 = card.querySelector('.mat-inp-precio');
        const inPesoPlaca = card.querySelector('.mat-inp-peso-placa');

        const lblPlaca = card.querySelector('.mat-lbl-placa-calc');
        const lblPesoM2 = card.querySelector('.mat-lbl-peso-m2-calc');
        const lblPrecioCorte = card.querySelector('.mat-lbl-precio-corte-calc');
        const lblGananciaPlaca = card.querySelector('.mat-lbl-ganancia-placa-calc');

        const largo = parseFloat(inLargo?.value) || 244;
        const ancho = parseFloat(inAncho?.value) || 124;
        const m2 = (largo * ancho) / 10000;

        if (target.classList.contains('mat-inp-costo-placa') || target.classList.contains('mat-inp-max-largo') || target.classList.contains('mat-inp-max-ancho')) {
            const costoPlaca = parseFloat(inCostoPlaca?.value) || 0;
            if (m2 > 0 && inCostoM2) {
                inCostoM2.value = Math.round(costoPlaca / m2);
            }
        } else if (target.classList.contains('mat-inp-costo')) {
            const costoM2 = parseFloat(inCostoM2?.value) || 0;
            if (inCostoPlaca) {
                inCostoPlaca.value = Math.round(costoM2 * m2);
            }
        }

        const finalCostoM2 = parseFloat(inCostoM2?.value) || 0;
        const margenPct = parseFloat(inMargenPct?.value) || 0;
        const calculatedPrecioM2 = Math.round(finalCostoM2 * (1 + (margenPct / 100)));
        
        if (inPrecioM2) {
            inPrecioM2.value = calculatedPrecioM2;
        }

        if (lblPlaca && m2 > 0) lblPlaca.textContent = `${m2.toFixed(2)} m²`;
        const pesoPlaca = parseFloat(inPesoPlaca?.value) || 0;
        if (lblPesoM2 && m2 > 0) lblPesoM2.textContent = `${(pesoPlaca / m2).toFixed(1)} kg/m²`;
        if (lblPrecioCorte) lblPrecioCorte.textContent = `$${calculatedPrecioM2.toLocaleString('es-AR')} / m²`;
        if (lblGananciaPlaca && m2 > 0) {
            const gananciaPlaca = Math.round((calculatedPrecioM2 - finalCostoM2) * m2);
            lblGananciaPlaca.textContent = `+$${gananciaPlaca.toLocaleString('es-AR')}`;
        }
    }

    // Acciones globales
    window.addCajonMaterialRow = function() {
        syncMaterialsFromDOM();
        materialsList.push({
            id: 'mat_' + Date.now(),
            name: 'Nuevo Material',
            max_largo: 244,
            max_ancho: 124,
            peso_placa: 35,
            costo_placa: 20000,
            costo_m2: 6611,
            margen_pct: 140,
            precio_m2: 15866,
            espesores_texto: '18 mm',
            espesores_disponibles: ['18 mm'],
            limite_mensaje: '',
            activo: true,
            es_placa: true,
            es_tirante: false
        });
        renderMaterialsUI();
    };

    window.removeCajonMaterialRow = function(idx) {
        syncMaterialsFromDOM();
        if (!confirm('¿Seguro que deseas eliminar este material?')) return;
        materialsList.splice(idx, 1);
        renderMaterialsUI();
    };

    // Exponer API del módulo
    window.CajonesAdminMaterials = {
        getMaterials: getMaterials,
        setMaterials: setMaterials,
        syncFromDOM: syncMaterialsFromDOM,
        renderUI: renderMaterialsUI
    };

    // Retrocompatibilidad
    window.renderCajonMaterialsUI = renderMaterialsUI;
    window.syncCurrentMaterialsFromDOM = syncMaterialsFromDOM;
})();
