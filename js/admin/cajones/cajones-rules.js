// js/admin/cajones/cajones-rules.js
// --- SUBMÓDULO 2: GESTIÓN DE REGLAS DE CONSTRUCCIÓN & FÓRMULAS DE CORTE ---

(function() {
    'use strict';

    let reglasList = [];

    function getReglas() {
        return reglasList;
    }

    function setReglas(list) {
        reglasList = Array.isArray(list) ? JSON.parse(JSON.stringify(list)) : [];
    }

    // Sincronizar array de reglas en memoria desde el DOM
    function syncReglasFromDOM() {
        const container = document.getElementById('cajones-reglas-container');
        if (!container) return reglasList;
        const cards = container.querySelectorAll('.cajones-regla-card');
        const reordered = [];

        cards.forEach((card, idx) => {
            const reglaId = card.dataset.reglaId;
            const found = reglasList.find(r => r.id === reglaId) || {};

            const name = card.querySelector('.regla-inp-name')?.value.trim() || `Regla ${idx + 1}`;
            const activo = card.querySelector('.regla-chk-activo')?.checked !== false;
            const descripcion = card.querySelector('.regla-inp-desc')?.value.trim() || '';
            const multiplicador = parseFloat(card.querySelector('.regla-inp-multiplicador')?.value) || 5.0;
            const materialPlacaId = card.querySelector('.regla-sel-placa')?.value || 'fenolico_18mm';
            const materialTiranteId = card.querySelector('.regla-sel-tirante')?.value || 'ninguno';
            const plusArmado = parseFloat(card.querySelector('.regla-inp-plus-armado')?.value) || 6000;
            const costoFijacion = parseFloat(card.querySelector('.regla-inp-costo-fijacion')?.value) || 2000;
            const desperdicio = parseFloat(card.querySelector('.regla-inp-desperdicio')?.value) || 10;

            const minLargo = parseFloat(card.querySelector('.regla-inp-min-largo')?.value) || 15;
            const maxLargo = parseFloat(card.querySelector('.regla-inp-max-largo')?.value) || 80;
            const minAncho = parseFloat(card.querySelector('.regla-inp-min-ancho')?.value) || 15;
            const maxAncho = parseFloat(card.querySelector('.regla-inp-max-ancho')?.value) || 60;
            const minAlto = parseFloat(card.querySelector('.regla-inp-min-alto')?.value) || 15;
            const maxAlto = parseFloat(card.querySelector('.regla-inp-max-alto')?.value) || 60;
            const limiteMensaje = card.querySelector('.regla-inp-limite-msg')?.value.trim() || '';

            // Fórmulas de despiece de esta regla
            const formulaRows = card.querySelectorAll('.regla-formula-row');
            const formulas = [];
            formulaRows.forEach(tr => {
                const pieza = tr.querySelector('.form-inp-pieza')?.value.trim() || 'Pieza';
                const cant = parseInt(tr.querySelector('.form-inp-cant')?.value, 10) || 1;
                const formulaLargo = tr.querySelector('.form-inp-largo')?.value.trim() || 'L';
                const formulaAncho = tr.querySelector('.form-inp-ancho')?.value.trim() || 'A';
                const tipoMaterial = tr.querySelector('.form-sel-tipo')?.value || 'placa';
                formulas.push({
                    pieza: pieza,
                    cant: cant,
                    formula_largo: formulaLargo,
                    formula_ancho: formulaAncho,
                    tipo_material: tipoMaterial
                });
            });

            const hasTirantes = materialTiranteId && materialTiranteId !== 'ninguno';

            reordered.push({
                ...found,
                id: reglaId || ('regla_' + Date.now() + '_' + idx),
                name: name,
                descripcion: descripcion,
                tipo_estructura: reglaId && reglaId.includes('simple') ? 'simple_5_piezas' : (found.tipo_estructura || 'personalizado'),
                material_placa_id: materialPlacaId,
                material_tirante_id: materialTiranteId,
                formulas_despiece: formulas.length > 0 ? formulas : (found.formulas_despiece || []),
                piezas: {
                    tapas: 1,
                    laterales: 4,
                    refuerzos_esqueleto: hasTirantes ? 8 : 0
                },
                multiplicador_costo: multiplicador,
                costo_fijacion_base: costoFijacion,
                plus_armado: plusArmado,
                desperdicio_pct: desperdicio,
                min_largo: minLargo,
                max_largo: maxLargo,
                min_ancho: minAncho,
                max_ancho: maxAncho,
                min_alto: minAlto,
                max_alto: maxAlto,
                limite_mensaje: limiteMensaje,
                activo: activo
            });
        });

        if (reordered.length > 0) {
            reglasList = reordered;
        }
        return reglasList;
    }

    // Renderizar grilla de Reglas de Construcción (Pestaña 2)
    function renderReglasUI() {
        const container = document.getElementById('cajones-reglas-container');
        if (!container) return;

        container.innerHTML = '';

        if (!reglasList || reglasList.length === 0) {
            container.innerHTML = `<div style="padding: 1rem; text-align: center; color: #64748B; font-size: 0.85rem;">No hay reglas de construcción configuradas. Hacé clic en "+ Nueva Regla" para agregar una.</div>`;
            return;
        }

        const materials = window.CajonesAdminMaterials ? window.CajonesAdminMaterials.getMaterials() : [];

        reglasList.forEach((regla, idx) => {
            const card = document.createElement('div');
            card.className = 'cajones-regla-card';
            card.dataset.reglaId = regla.id || ('regla_' + Date.now() + '_' + idx);
            card.style.cssText = 'background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s ease, box-shadow 0.15s ease;';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 240px;">
                        <span class="material-symbols-outlined cajon-regla-drag-handle" style="color: #6366F1; font-size: 22px; cursor: grab; user-select: none; padding: 2px 4px; border-radius: 4px;" title="Mantener presionado para arrastrar y reordenar reglas">layers</span>
                        <input type="text" class="admin-input regla-inp-name" value="${regla.name || ''}" placeholder="Nombre de la Regla (ej: Cajón Simple)" style="font-weight: 800; font-size: 0.95rem; width: 100%;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; background: #FFF; padding: 4px 10px; border-radius: 8px; border: 1px solid #E2E8F0;">
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer; color: #1E293B;">
                            <input type="checkbox" class="regla-chk-activo" ${regla.activo !== false ? 'checked' : ''} style="cursor: pointer;"> Activa
                        </label>
                        <div style="width: 1px; height: 16px; background: #CBD5E1;"></div>
                        <button type="button" class="btn-danger" onclick="window.removeCajonReglaRow(${idx})" style="padding: 3px 8px; font-size: 0.75rem; border-radius: 6px; cursor: pointer;" title="Eliminar regla">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    </div>
                </div>

                <div>
                    <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Descripción para el cliente:</label>
                    <input type="text" class="admin-input regla-inp-desc" value="${regla.descripcion || ''}" placeholder="Ej: 4 caras + 1 tapa (5 piezas sin fondo)">
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 10px; border-radius: 8px;">
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #15803D; margin-bottom: 2px;">🚀 Multiplicador Taller:</label>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span style="font-weight: 800; font-size: 0.9rem; color: #15803D;">×</span>
                            <input type="number" class="admin-input regla-inp-multiplicador" value="${regla.multiplicador_costo || 5.0}" step="0.5" min="1" placeholder="Ej: 5.0" style="font-weight: 800; color: #15803D; border-color: #86EFAC;">
                        </div>
                        <small style="color: #64748B; font-size: 0.65rem;">Ej: Costo $10k × 5 = $50k</small>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #0369A1; margin-bottom: 2px;">🪵 Placa Asignada:</label>
                        <select class="admin-input regla-sel-placa" style="font-weight: 700; font-size: 0.75rem; border-color: #7DD3FC; background: #F0F9FF;">
                            ${materials.filter(m => m.es_placa !== false && m.activo !== false).map(m => `
                                <option value="${m.id}" ${regla.material_placa_id === m.id || (!regla.material_placa_id && m.is_default) ? 'selected' : ''}>
                                    ${m.name} (${m.espesores_texto || '18 mm'})
                                </option>
                            `).join('')}
                        </select>
                        <small style="color: #64748B; font-size: 0.65rem;">Fija costo m² y espesor E</small>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #D97706; margin-bottom: 2px;">🦴 Tirante Asignado:</label>
                        <select class="admin-input regla-sel-tirante" style="font-weight: 700; font-size: 0.75rem; border-color: #FDE68A; background: #FFFDF0;">
                            <option value="ninguno" ${!regla.material_tirante_id || regla.material_tirante_id === 'ninguno' ? 'selected' : ''}>— Sin Tirantes (Solo Placas) —</option>
                            ${materials.filter(m => m.es_tirante === true && m.activo !== false).map(m => `
                                <option value="${m.id}" ${regla.material_tirante_id === m.id ? 'selected' : ''}>
                                    ${m.name} (${m.espesores_texto || '45x45 mm'})
                                </option>
                            `).join('')}
                        </select>
                        <small style="color: #64748B; font-size: 0.65rem;">Para refuerzos / esqueleto</small>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #B45309; margin-bottom: 2px;">🔨 Plus Armado ($):</label>
                        <input type="number" class="admin-input regla-inp-plus-armado" value="${regla.plus_armado !== undefined ? regla.plus_armado : 6000}" step="1000" placeholder="Ej: 6000" style="font-weight: 700;">
                        <small style="color: #64748B; font-size: 0.65rem;">Si pide armado en taller</small>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">🔩 Fijación / Cola ($):</label>
                        <input type="number" class="admin-input regla-inp-costo-fijacion" value="${regla.costo_fijacion_base !== undefined ? regla.costo_fijacion_base : 2000}" step="500" placeholder="Ej: 2000">
                        <small style="color: #64748B; font-size: 0.65rem;">Insumos fijos por cajón</small>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">🪵 Desperdicio (%):</label>
                        <input type="number" class="admin-input regla-inp-desperdicio" value="${regla.desperdicio_pct !== undefined ? regla.desperdicio_pct : 10}" step="1" min="0" placeholder="Ej: 10">
                        <small style="color: #64748B; font-size: 0.65rem;">Aserrín / cortes</small>
                    </div>
                </div>

                <!-- Límites Dimensionales -->
                <div style="background: #FFFBEB; border: 1.5px solid #FDE68A; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="font-weight: 800; font-size: 0.8rem; color: #92400E; display: flex; align-items: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #D97706;">straighten</span>
                        Límites de Medidas Permitidas
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #78350F; margin-bottom: 2px;">Largo Mín (cm):</label>
                            <input type="number" class="admin-input regla-inp-min-largo" value="${regla.min_largo !== undefined ? regla.min_largo : 15}" min="1" step="1" placeholder="Ej: 15" style="font-weight: 700;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #B45309; margin-bottom: 2px;">Largo Máx (cm):</label>
                            <input type="number" class="admin-input regla-inp-max-largo" value="${regla.max_largo !== undefined ? regla.max_largo : 80}" min="1" step="1" placeholder="Ej: 80" style="font-weight: 800; color: #B45309; border-color: #FCD34D;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #78350F; margin-bottom: 2px;">Ancho Mín (cm):</label>
                            <input type="number" class="admin-input regla-inp-min-ancho" value="${regla.min_ancho !== undefined ? regla.min_ancho : 15}" min="1" step="1" placeholder="Ej: 15" style="font-weight: 700;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #B45309; margin-bottom: 2px;">Ancho Máx (cm):</label>
                            <input type="number" class="admin-input regla-inp-max-ancho" value="${regla.max_ancho !== undefined ? regla.max_ancho : 60}" min="1" step="1" placeholder="Ej: 60" style="font-weight: 800; color: #B45309; border-color: #FCD34D;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #78350F; margin-bottom: 2px;">Alto Mín (cm):</label>
                            <input type="number" class="admin-input regla-inp-min-alto" value="${regla.min_alto !== undefined ? regla.min_alto : 15}" min="1" step="1" placeholder="Ej: 15" style="font-weight: 700;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #B45309; margin-bottom: 2px;">Alto Máx (cm):</label>
                            <input type="number" class="admin-input regla-inp-max-alto" value="${regla.max_alto !== undefined ? regla.max_alto : 60}" min="1" step="1" placeholder="Ej: 60" style="font-weight: 800; color: #B45309; border-color: #FCD34D;">
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #78350F; margin-bottom: 2px;">Mensaje de advertencia si supera los límites:</label>
                        <input type="text" class="admin-input regla-inp-limite-msg" value="${regla.limite_mensaje || ''}" placeholder="Ej: Para medidas mayores se requiere estructura reforzada." style="font-size: 0.75rem;">
                    </div>
                </div>

                <!-- Fórmulas Matemáticas de Despiece -->
                <details class="regla-formulas-details" style="background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 10px; overflow: hidden; transition: all 0.2s ease;">
                    <summary style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; user-select: none; background: #F8FAFC; border-bottom: 1px solid transparent; font-weight: 800; font-size: 0.8rem; color: #0F172A; list-style: none;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #6366F1;">calculate</span>
                            <span>Fórmulas Matemáticas de Despiece (Corte de Piezas)</span>
                            <span style="background: #EEF2FF; color: #4F46E5; font-size: 0.68rem; font-weight: 800; padding: 2px 7px; border-radius: 6px;">
                                ${(regla.formulas_despiece || []).length} piezas
                            </span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: #64748B; font-weight: 700;">
                            <span>Ver / Editar fórmulas</span>
                            <span class="material-symbols-outlined regla-formulas-arrow" style="font-size: 18px; transition: transform 0.2s ease;">expand_more</span>
                        </div>
                    </summary>

                    <div style="padding: 12px; border-top: 1px solid #E2E8F0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                            <div style="font-size: 0.68rem; color: #64748B;">
                                Variables disponibles: <code style="background:#F1F5F9;padding:1px 4px;border-radius:4px;color:#0F172A;font-weight:700;">L</code> = Largo, 
                                <code style="background:#F1F5F9;padding:1px 4px;border-radius:4px;color:#0F172A;font-weight:700;">A</code> = Ancho, 
                                <code style="background:#F1F5F9;padding:1px 4px;border-radius:4px;color:#0F172A;font-weight:700;">H</code> = Alto, 
                                <code style="background:#F1F5F9;padding:1px 4px;border-radius:4px;color:#0F172A;font-weight:700;">E</code> = Espesor
                            </div>
                            <button type="button" onclick="window.addFormulaRowToRegla(${idx})" class="btn-secondary" style="font-size: 0.72rem; padding: 4px 10px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; cursor: pointer;">
                                <span class="material-symbols-outlined" style="font-size: 14px;">add</span> Agregar Pieza
                            </button>
                        </div>

                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                                <thead>
                                    <tr style="background: #F1F5F9; border-bottom: 1.5px solid #CBD5E1; color: #475569;">
                                        <th style="padding: 6px 8px;">Pieza / Nombre</th>
                                        <th style="padding: 6px 8px; width: 60px;">Cant</th>
                                        <th style="padding: 6px 8px;">Fórmula Largo (cm)</th>
                                        <th style="padding: 6px 8px;">Fórmula Ancho (cm)</th>
                                        <th style="padding: 6px 8px; width: 110px;">Tipo</th>
                                        <th style="padding: 6px 8px; width: 35px; text-align: center;">✕</th>
                                    </tr>
                                </thead>
                                <tbody class="regla-formulas-tbody">
                                    ${(regla.formulas_despiece || []).map(f => `
                                        <tr class="regla-formula-row" style="border-bottom: 1px solid #F1F5F9;">
                                            <td style="padding: 4px 6px;">
                                                <input type="text" class="admin-input form-inp-pieza" value="${f.pieza || ''}" placeholder="Ej: Tapa Superior" style="font-size: 0.72rem; padding: 4px 6px;">
                                            </td>
                                            <td style="padding: 4px 6px;">
                                                <input type="number" class="admin-input form-inp-cant" value="${f.cant || 1}" min="1" style="font-size: 0.72rem; padding: 4px 6px; font-weight: 700; text-align: center;">
                                            </td>
                                            <td style="padding: 4px 6px;">
                                                <input type="text" class="admin-input form-inp-largo" value="${f.formula_largo || 'L'}" placeholder="Ej: L - 2*E" style="font-size: 0.72rem; padding: 4px 6px; font-family: monospace; font-weight: 700; color: #0369A1;">
                                            </td>
                                            <td style="padding: 4px 6px;">
                                                <input type="text" class="admin-input form-inp-ancho" value="${f.formula_ancho || 'A'}" placeholder="Ej: A - 2*E" style="font-size: 0.72rem; padding: 4px 6px; font-family: monospace; font-weight: 700; color: #0369A1;">
                                            </td>
                                            <td style="padding: 4px 6px;">
                                                <select class="admin-input form-sel-tipo" style="font-size: 0.7rem; padding: 4px 6px;">
                                                    <option value="placa" ${f.tipo_material === 'placa' ? 'selected' : ''}>🪵 Placa</option>
                                                    <option value="tirante" ${f.tipo_material === 'tirante' ? 'selected' : ''}>🦴 Tirante</option>
                                                </select>
                                            </td>
                                            <td style="padding: 4px 6px; text-align: center;">
                                                <button type="button" onclick="this.closest('.regla-formula-row').remove()" style="background: none; border: none; color: #EF4444; cursor: pointer; padding: 2px;" title="Eliminar fórmula">
                                                    <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </details>
            `;

            container.appendChild(card);
        });

        // Configurar Drag & Drop con utilidad modular
        if (window.CajonesAdminDrag) {
            window.CajonesAdminDrag.setup({
                container: container,
                itemSelector: '.cajones-regla-card',
                handleSelector: '.cajon-regla-drag-handle',
                orientation: 'vertical',
                onReorder: syncReglasFromDOM
            });
        }
    }

    // Agregar fórmula de corte a una regla
    window.addFormulaRowToRegla = function(reglaIdx) {
        const cards = document.querySelectorAll('.cajones-regla-card');
        const targetCard = cards[reglaIdx];
        if (!targetCard) return;

        const tbody = targetCard.querySelector('.regla-formulas-tbody');
        if (!tbody) return;

        const tr = document.createElement('tr');
        tr.className = 'regla-formula-row';
        tr.style.cssText = 'border-bottom: 1px solid #F1F5F9;';
        tr.innerHTML = `
            <td style="padding: 4px 6px;">
                <input type="text" class="admin-input form-inp-pieza" value="Nueva Pieza" placeholder="Ej: Refuerzo" style="font-size: 0.72rem; padding: 4px 6px;">
            </td>
            <td style="padding: 4px 6px;">
                <input type="number" class="admin-input form-inp-cant" value="1" min="1" style="font-size: 0.72rem; padding: 4px 6px; font-weight: 700; text-align: center;">
            </td>
            <td style="padding: 4px 6px;">
                <input type="text" class="admin-input form-inp-largo" value="L - 2*E" placeholder="Ej: L" style="font-size: 0.72rem; padding: 4px 6px; font-family: monospace; font-weight: 700; color: #0369A1;">
            </td>
            <td style="padding: 4px 6px;">
                <input type="text" class="admin-input form-inp-ancho" value="A - 2*E" placeholder="Ej: A" style="font-size: 0.72rem; padding: 4px 6px; font-family: monospace; font-weight: 700; color: #0369A1;">
            </td>
            <td style="padding: 4px 6px;">
                <select class="admin-input form-sel-tipo" style="font-size: 0.7rem; padding: 4px 6px;">
                    <option value="placa" selected>🪵 Placa</option>
                    <option value="tirante">🦴 Tirante</option>
                </select>
            </td>
            <td style="padding: 4px 6px; text-align: center;">
                <button type="button" onclick="this.closest('.regla-formula-row').remove()" style="background: none; border: none; color: #EF4444; cursor: pointer; padding: 2px;" title="Eliminar fórmula">
                    <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    };

    // Acciones globales de reglas
    window.addCajonReglaRow = function() {
        syncReglasFromDOM();
        const nextNum = reglasList.length + 1;
        const materials = window.CajonesAdminMaterials ? window.CajonesAdminMaterials.getMaterials() : [];
        reglasList.push({
            id: 'regla_' + Date.now(),
            name: `Regla ${nextNum}: Nuevo Tipo`,
            descripcion: 'Configuración personalizada de armado',
            tipo_estructura: 'personalizado',
            material_placa_id: materials[0] ? materials[0].id : 'fenolico_18mm',
            material_tirante_id: 'ninguno',
            formulas_despiece: [],
            piezas: {
                tapas: 1,
                laterales: 4,
                refuerzos_esqueleto: 0
            },
            multiplicador_costo: 5.0,
            costo_fijacion_base: 2000,
            plus_armado: 6000,
            desperdicio_pct: 10,
            min_largo: 15,
            max_largo: 80,
            min_ancho: 15,
            max_ancho: 60,
            min_alto: 15,
            max_alto: 60,
            limite_mensaje: 'Para medidas mayores se requiere estructura reforzada.',
            activo: true
        });
        renderReglasUI();
    };

    window.removeCajonReglaRow = function(idx) {
        syncReglasFromDOM();
        if (!confirm('¿Seguro que deseas eliminar esta regla de construcción?')) return;
        reglasList.splice(idx, 1);
        renderReglasUI();
    };

    // Exponer API del módulo
    window.CajonesAdminRules = {
        getReglas: getReglas,
        setReglas: setReglas,
        syncFromDOM: syncReglasFromDOM,
        renderUI: renderReglasUI
    };

    // Retrocompatibilidad
    window.renderCajonReglasUI = renderReglasUI;
    window.syncCurrentReglasFromDOM = syncReglasFromDOM;
})();
