// js/modules/cortes-widget.js
// --- CONFIGURADOR DE CORTES DE MADERA A MEDIDA ---
// Extraído de ui-catalog.js como componente modular independiente.

(function() {
    'use strict';

    function initCortesWidget(product, grupo, context) {
        const {
            divMedida,
            bottomContainer,
            updateBuyButton,
            updateFavState,
            updateUrlWithVariants,
            getBestDiscountRule,
            getProductVolumeDiscounts,
            preselectedMedida
        } = context;

        const conf = window.cortesConfig || {
            precios: { precio_m2_venta: 48500, minimo_corte_taller: 3500 },
            materiales: [
                { id: "pino_macizo", name: "Pino Macizo / Finger Joint", precio_m2: 48500, max_largo: 300, max_ancho: 120, activo: true, is_default: true },
                { id: "eucalipto_tablillado", name: "Eucalipto Alistonado / Tablillado", precio_m2: 68000, max_largo: 240, max_ancho: 60, limite_mensaje: "El tablero de Eucalipto viene en ancho máx. de 60 cm y largo de 240 cm.", activo: true, is_default: false },
                { id: "paraiso_alistonado", name: "Paraíso Alistonado", precio_m2: 82000, max_largo: 240, max_ancho: 60, limite_mensaje: "El tablero de Paraíso viene en ancho máx. de 60 cm y largo de 240 cm.", activo: true, is_default: false }
            ],
            usos: [
                { id: "estante", name: "Estantería / Repisa", factor_precio: 1.0, recargo_fijo: 0, is_default: true },
                { id: "escritorio_mesa", name: "Tapa de Escritorio / Mesa", factor_precio: 1.25, recargo_fijo: 2500, is_default: false },
                { id: "escalon", name: "Escalón / Tránsito Pesado", factor_precio: 1.15, recargo_fijo: 1800, is_default: false }
            ],
            espesores: [
                { id: "1_pulgada", name: "1 Pulgada (~2.2 cm)", factor_precio: 1.0, is_default: true },
                { id: "1_5_pulgadas", name: "1.5 Pulgadas (~3.2 cm)", factor_precio: 1.45, is_default: false },
                { id: "2_pulgadas", name: "2 Pulgadas (~4.2 cm)", factor_precio: 1.95, is_default: false }
            ]
        };

        const activeMats = (Array.isArray(conf.materiales) && conf.materiales.length > 0)
            ? conf.materiales.filter(m => m.activo !== false)
            : [{ id: "pino_macizo", name: "Pino Macizo / Finger Joint", precio_m2: conf.precios?.precio_m2_venta || 48500, max_largo: 300, max_ancho: 120 }];

        const groupedMatsMap = new Map();
        activeMats.forEach(m => {
            const cleanName = (m.name || 'Madera').trim();
            if (!groupedMatsMap.has(cleanName)) {
                groupedMatsMap.set(cleanName, {
                    name: cleanName,
                    id: m.id,
                    max_largo: m.max_largo || 300,
                    max_ancho: m.max_ancho || 120,
                    limite_mensaje: m.limite_mensaje || '',
                    items: []
                });
            }
            const entry = groupedMatsMap.get(cleanName);
            entry.items.push(m);
            if (m.max_largo > entry.max_largo) entry.max_largo = m.max_largo;
            if (m.max_ancho > entry.max_ancho) entry.max_ancho = m.max_ancho;
        });
        const unifiedMatsList = Array.from(groupedMatsMap.values());

        let preselectedGroupIdx = 0;
        if (preselectedMedida) {
            const cleanPre = preselectedMedida.toLowerCase();
            const foundIdx = unifiedMatsList.findIndex(g => {
                const gName = g.name.toLowerCase();
                return cleanPre.includes(gName) || gName.includes(cleanPre) || (g.id && cleanPre.includes(g.id.toLowerCase()));
            });
            if (foundIdx !== -1) preselectedGroupIdx = foundIdx;
        }

        // 1. Badge Verde lateral derecho
        divMedida.className = 'variant-selector-wrapper mt-1';
        divMedida.innerHTML = `
            <div style="background:#F0FDF4; border:1.5px solid #BBF7D0; border-radius:10px; padding:10px 12px; display:flex; align-items:center; gap:8px;">
                <span class="material-symbols-outlined" style="font-size:20px; color:#166534; flex-shrink:0;">tune</span>
                <div style="font-size:0.78rem; font-weight:700; color:#166534; line-height:1.3;">
                    Corte a medida personalizado
                    <div style="font-size:0.7rem; font-weight:500; color:#15803D;">Configurá las medidas y agregá cortes en el panel inferior ↓</div>
                </div>
            </div>
        `;
        divMedida.style.display = 'block';

        // 2. Inyección del Formulario en contenedor de ancho completo
        if (bottomContainer) {
            bottomContainer.style.display = 'block';
            bottomContainer.innerHTML = `
                <div style="margin-bottom:1.25rem; border-bottom:1.5px solid #E2E8F0; padding-bottom:0.75rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-outlined" style="color:var(--primary-color, #ea580c); font-size:24px;">design_services</span>
                        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0F172A;">Medida personalizada</h3>
                    </div>
                </div>

                <div class="custom-cutting-form-rows" style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:14px; padding:1.25rem; margin-bottom:1.5rem; display:flex; flex-direction:column; gap:1rem;">
                    <!-- Fila 1: Elegir Madera / Tablero -->
                    <div class="custom-cutting-row-1">
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.02em;">
                            <span class="material-symbols-outlined" style="font-size:18px; color:var(--primary-color, #ea580c);">forest</span>
                            <span>1. Elegir Madera / Tablero:</span>
                        </label>
                        <select id="detail-custom-cut-material" class="admin-input" style="width:100%; font-weight:700; border-radius:10px; padding:9px 12px; font-size:0.92rem; background:white; border:1.5px solid #CBD5E1;">
                            ${unifiedMatsList.map((g, idx) => `
                                <option value="${g.name}" data-group-index="${idx}" ${idx === preselectedGroupIdx ? 'selected' : ''}>
                                    ${g.name} (Placas de hasta ${g.max_largo} × ${g.max_ancho} cm)
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Fila 2: Largo - Ancho - Espesor - Cantidad -->
                    <div class="custom-cutting-row-2" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:12px; align-items:end;">
                        <div>
                            <label style="font-size:0.75rem; font-weight:700; color:#334155; text-transform:uppercase; display:block; margin-bottom:5px;">Largo (cm):</label>
                            <div style="position:relative; display:flex; align-items:center;">
                                <input type="number" id="detail-custom-cut-largo" value="80" min="15" max="300" step="1" class="admin-input" style="width:100%; padding:9px 28px 9px 12px; font-weight:800; font-size:0.95rem; border:1.5px solid #CBD5E1; border-radius:10px; box-sizing:border-box; background:white;">
                                <span style="position:absolute; right:10px; font-size:0.75rem; font-weight:700; color:#94A3B8; pointer-events:none;">cm</span>
                            </div>
                        </div>

                        <div>
                            <label style="font-size:0.75rem; font-weight:700; color:#334155; text-transform:uppercase; display:block; margin-bottom:5px;">Ancho / Prof. (cm):</label>
                            <div style="position:relative; display:flex; align-items:center;">
                                <input type="number" id="detail-custom-cut-ancho" value="30" min="10" max="120" step="1" class="admin-input" style="width:100%; padding:9px 28px 9px 12px; font-weight:800; font-size:0.95rem; border:1.5px solid #CBD5E1; border-radius:10px; box-sizing:border-box; background:white;">
                                <span style="position:absolute; right:10px; font-size:0.75rem; font-weight:700; color:#94A3B8; pointer-events:none;">cm</span>
                            </div>
                        </div>

                        <div>
                            <label style="font-size:0.75rem; font-weight:700; color:#334155; text-transform:uppercase; display:block; margin-bottom:5px;">Espesor:</label>
                            <select id="detail-custom-cut-espesor" class="admin-input" style="width:100%; padding:9px 12px; font-weight:800; font-size:0.92rem; border:1.5px solid #CBD5E1; border-radius:10px; box-sizing:border-box; background:white;">
                            </select>
                        </div>

                        <div>
                            <label style="font-size:0.75rem; font-weight:700; color:#334155; text-transform:uppercase; display:block; margin-bottom:5px;">Cantidad:</label>
                            <div style="display:flex; align-items:center; background:white; border:1.5px solid #CBD5E1; border-radius:10px; padding:2px 8px; height:42px; box-sizing:border-box;">
                                <button type="button" id="btn-cut-qty-minus" style="border:none; background:none; cursor:pointer; font-size:1.1rem; font-weight:900; color:#64748B; padding:0 6px;">−</button>
                                <input type="number" id="detail-custom-cut-item-qty" value="1" min="1" max="100" style="width:100%; border:none; outline:none; text-align:center; font-weight:800; font-size:1rem; color:#0F172A; padding:0; background:transparent;">
                                <button type="button" id="btn-cut-qty-plus" style="border:none; background:none; cursor:pointer; font-size:1.1rem; font-weight:900; color:#64748B; padding:0 6px;">+</button>
                            </div>
                        </div>
                    </div>

                    <div id="detail-custom-cut-warning" style="display:none; background:#FEF2F2; border:1px solid #FCA5A5; color:#991B1B; padding:0.75rem 1rem; border-radius:10px; font-size:0.8rem; line-height:1.4; font-weight:600;">
                    </div>

                    <div class="custom-cutting-row-3" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-top:10px; border-top:1.5px dashed #CBD5E1;">
                        <div style="display:flex; align-items:center; gap:14px; font-size:0.8rem; color:#64748B; flex-wrap:wrap;">
                            <span id="detail-custom-cut-m2" style="font-weight:700; color:#334155;">📐 Superficie: 0.24 m²</span>
                            <span id="detail-custom-cut-spec" style="color:#16A34A; font-weight:700; background:#DCFCE7; padding:2px 8px; border-radius:6px;">Corte Rectificado</span>
                            <span id="detail-custom-cut-unit-preview" style="color:var(--primary-color, #ea580c); font-weight:800; font-size:0.9rem;">$0 c/u</span>
                        </div>

                        <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
                            <button type="button" id="btn-cancel-edit-cut" style="display:none; background:#E2E8F0; color:#475569; border:none; border-radius:10px; padding:10px 16px; font-size:0.85rem; font-weight:700; cursor:pointer;">
                                Cancelar edición
                            </button>
                            <button type="button" id="btn-add-cut-to-list" style="background:#0284c7; color:white; border:none; border-radius:10px; padding:10px 22px; font-size:0.9rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 2px 6px rgba(2,132,199,0.3); transition:all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size:20px;">playlist_add</span>
                                <span id="btn-add-cut-text">+ Agregar a lista de cortes</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Banner de Descuentos por Cantidad / Volumen (Ubicado entre Formulario y Lista) -->
                <div id="cortes-volume-discount-banner" style="margin-bottom:1.25rem; display:none;"></div>

                <div id="detail-custom-cuts-list-container">
                </div>
            `;
        }

        // Vincular botones +/- de cantidad del corte
        document.getElementById('btn-cut-qty-minus')?.addEventListener('click', () => {
            const qIn = document.getElementById('detail-custom-cut-item-qty');
            if (qIn) qIn.value = String(Math.max(1, (parseInt(qIn.value, 10) || 1) - 1));
            calcCut();
        });
        document.getElementById('btn-cut-qty-plus')?.addEventListener('click', () => {
            const qIn = document.getElementById('detail-custom-cut-item-qty');
            if (qIn) qIn.value = String((parseInt(qIn.value, 10) || 1) + 1);
            calcCut();
        });

        // Actualizar selector de espesores para la madera seleccionada
        const updateEspesoresForSelectedMaterial = () => {
            const selMat = document.getElementById('detail-custom-cut-material');
            const selEsp = document.getElementById('detail-custom-cut-espesor');
            if (!selMat || !selEsp) return;

            const selectedGroupIndex = parseInt(selMat.options[selMat.selectedIndex]?.getAttribute('data-group-index') || '0');
            const curGroup = unifiedMatsList[selectedGroupIndex] || unifiedMatsList[0];
            if (!curGroup) return;

            const currentEspVal = selEsp.value;
            const espesorOptions = [];

            curGroup.items.forEach(matItem => {
                const rawEspList = Array.isArray(matItem.espesores_disponibles) && matItem.espesores_disponibles.length > 0
                    ? matItem.espesores_disponibles
                    : [matItem.espesor || '18 mm'];

                rawEspList.forEach(espText => {
                    const cleanEsp = espText.trim();
                    if (!cleanEsp) return;
                    if (!espesorOptions.some(o => o.text === cleanEsp)) {
                        espesorOptions.push({
                            text: cleanEsp,
                            precio_m2: matItem.precio_m2 || 48500,
                            max_largo: matItem.max_largo || curGroup.max_largo,
                            max_ancho: matItem.max_ancho || curGroup.max_ancho,
                            msg: matItem.limite_mensaje || curGroup.limite_mensaje
                        });
                    }
                });
            });

            if (espesorOptions.length === 0) {
                espesorOptions.push({
                    text: '18 mm',
                    precio_m2: curGroup.items[0]?.precio_m2 || 48500,
                    max_largo: curGroup.max_largo,
                    max_ancho: curGroup.max_ancho,
                    msg: curGroup.limite_mensaje
                });
            }

            selEsp.innerHTML = espesorOptions.map(opt => `
                <option value="${opt.text}" data-precio="${opt.precio_m2}" data-max-largo="${opt.max_largo}" data-max-ancho="${opt.max_ancho}" data-msg="${opt.msg || ''}" ${opt.text === currentEspVal ? 'selected' : ''}>
                    ${opt.text}
                </option>
            `).join('');

            if (!espesorOptions.some(o => o.text === currentEspVal)) {
                selEsp.selectedIndex = 0;
            }
        };

        let customCutsList = window._activeCustomCutsList || [];
        let currentCalculatedCut = null;
        let editingCutIndex = -1;

        const renderCustomCutsList = () => {
            const listContainer = document.getElementById('detail-custom-cuts-list-container');
            if (!listContainer) return;

            if (customCutsList.length === 0) {
                listContainer.style.display = 'none';
                listContainer.innerHTML = '';
                return;
            }

            const totalPieces = customCutsList.reduce((acc, c) => acc + (c.qty || 1), 0);
            const totalM2 = customCutsList.reduce((acc, c) => acc + (c.m2Total || 0), 0);
            const totalSubtotal = customCutsList.reduce((acc, c) => acc + (c.subtotal || 0), 0);

            let totalListDiscount = 0;
            const discountedCutsIndices = new Map();

            customCutsList.forEach((c, idx) => {
                const rule = getBestDiscountRule ? getBestDiscountRule(c.qty || 1) : null;
                if (rule) {
                    let cutDisc = 0;
                    if (rule.discountPercent !== undefined && rule.discountPercent > 0) {
                        cutDisc = (c.subtotal || 0) * (rule.discountPercent / 100);
                    } else if (rule.discountValue !== undefined && rule.discountValue > 0) {
                        const minU = rule.minQty !== undefined ? rule.minQty : rule.minUnits;
                        cutDisc = Math.floor((c.qty || 1) / minU) * rule.discountValue;
                    }
                    if (cutDisc > 0) {
                        totalListDiscount += cutDisc;
                        discountedCutsIndices.set(idx, { rule, discountAmount: cutDisc });
                    }
                }
            });

            const finalListSubtotal = totalSubtotal - totalListDiscount;

            const listDiscounts = (getProductVolumeDiscounts && typeof getProductVolumeDiscounts === 'function') ? getProductVolumeDiscounts() : [];
            const tiersText = (listDiscounts && listDiscounts.length > 0)
                ? [...listDiscounts]
                    .sort((a, b) => (a.minQty !== undefined ? a.minQty : a.minUnits) - (b.minQty !== undefined ? b.minQty : b.minUnits))
                    .map(d => {
                        const minU = d.minQty !== undefined ? d.minQty : d.minUnits;
                        const parts = [];
                        if (d.discountPercent > 0) parts.push(`${d.discountPercent}% OFF`);
                        if (d.shippingDiscountPercent > 0) parts.push(d.shippingDiscountPercent >= 100 ? 'Envío GRATIS' : `${d.shippingDiscountPercent}% OFF envío`);
                        return `${minU}+ uds: ${parts.join(' + ') || (d.discountPercent + '% OFF')}`;
                    })
                    .join(' | ')
                : '';

            listContainer.style.display = 'block';
            listContainer.innerHTML = `
                <div style="background:#FFFFFF; border:1.5px solid #CBD5E1; border-radius:14px; padding:1.25rem; box-shadow:0 4px 16px rgba(0,0,0,0.04); width:100%; box-sizing:border-box;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1.5px solid #F1F5F9; padding-bottom:10px; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:0.95rem; color:#0F172A;">
                            <span class="material-symbols-outlined" style="font-size:20px; color:#0284c7;">table_rows</span>
                            <span>Lista de Cortes Agregados al Pedido (${totalPieces} piezas en total)</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="font-size:0.8rem; color:#64748B;">Superficie total: <strong style="color:#0F172A;">${totalM2.toFixed(2)} m²</strong></span>
                            <button type="button" id="btn-clear-custom-cuts" style="background:#FEE2E2; border:1px solid #FCA5A5; color:#DC2626; font-size:0.75rem; font-weight:800; cursor:pointer; padding:4px 10px; border-radius:6px; display:flex; align-items:center; gap:4px; transition:all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size:15px;">delete_sweep</span>
                                <span>Vaciar lista</span>
                            </button>
                        </div>
                    </div>

                    <div style="overflow-x:auto; width:100%;">
                        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.82rem; min-width:600px;">
                            <thead>
                                <tr style="background:#F8FAFC; color:#475569; font-weight:800; border-bottom:1.5px solid #E2E8F0; text-transform:uppercase; font-size:0.72rem; letter-spacing:0.03em;">
                                    <th style="padding:10px 12px; width:45px; text-align:center;">#</th>
                                    <th style="padding:10px 12px;">Madera / Tablero</th>
                                    <th style="padding:10px 12px;">Medida (Largo × Ancho)</th>
                                    <th style="padding:10px 12px;">Espesor</th>
                                    <th style="padding:10px 12px; text-align:center;">Cant.</th>
                                    <th style="padding:10px 12px; text-align:right;">Subtotal</th>
                                    <th style="padding:10px 12px; text-align:center; width:130px;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${customCutsList.map((c, idx) => {
                                    const isCurrentEditing = editingCutIndex === idx;
                                    const cutDiscountInfo = discountedCutsIndices.get(idx);
                                    const finalCutSubtotal = cutDiscountInfo ? (c.subtotal - cutDiscountInfo.discountAmount) : c.subtotal;

                                    return `
                                        <tr style="border-bottom:1px solid #E2E8F0; background:${isCurrentEditing ? '#EFF6FF' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')}; transition:background 0.2s ease;">
                                            <td style="padding:10px 12px; text-align:center; font-weight:800; color:#64748B;">
                                                ${idx + 1}
                                            </td>
                                            <td style="padding:10px 12px;">
                                                <div style="font-weight:800; color:#0F172A;">${c.material}</div>
                                                <div style="font-size:0.7rem; color:#64748B;">${c.usageLabel || 'Corte cepillado'}</div>
                                            </td>
                                            <td style="padding:10px 12px;">
                                                <span style="font-weight:800; color:#0284c7; font-size:0.9rem;">${c.largo} × ${c.ancho} cm</span>
                                                <span style="font-size:0.7rem; color:#64748B; margin-left:4px;">(${(c.m2Unit || 0).toFixed(2)} m²)</span>
                                            </td>
                                            <td style="padding:10px 12px; font-weight:700; color:#334155;">
                                                ${c.espesor}
                                            </td>
                                            <td style="padding:10px 12px; text-align:center;">
                                                <span style="background:#E0F2FE; color:#0369A1; font-weight:800; padding:3px 8px; border-radius:6px; font-size:0.8rem;">
                                                    ${c.qty} un.
                                                </span>
                                            </td>
                                            <td style="padding:10px 12px; text-align:right; white-space:nowrap;">
                                                ${cutDiscountInfo ? `
                                                    <div style="text-decoration:line-through; color:#94A3B8; font-size:0.75rem;">
                                                        $${Number(c.subtotal).toLocaleString('es-AR')}
                                                    </div>
                                                    <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                                                        <span style="background:#10B981; color:white; font-size:0.65rem; font-weight:700; padding:1px 5px; border-radius:10px;">
                                                            ${cutDiscountInfo.rule.discountPercent ? `${cutDiscountInfo.rule.discountPercent}% OFF` : 'OFERTA'}
                                                        </span>
                                                        <span style="font-weight:900; color:#C0510A; font-size:0.92rem;">
                                                            $${Number(finalCutSubtotal).toLocaleString('es-AR')}
                                                        </span>
                                                    </div>
                                                ` : (c.rawUnitPrice && c.rawUnitPrice > c.unitPrice) ? `
                                                    <div style="font-size:0.85rem; text-decoration:line-through; color:#94A3B8; font-weight:800; line-height:1.2;">
                                                        $${Number(c.rawUnitPrice * (c.qty || 1)).toLocaleString('es-AR')}
                                                    </div>
                                                    <div style="font-weight:900; color:#C0510A; font-size:0.95rem; line-height:1.2;">
                                                        $${Number(c.subtotal).toLocaleString('es-AR')}
                                                    </div>
                                                ` : `
                                                    <span style="font-weight:800; color:#C0510A; font-size:0.9rem;">
                                                        $${Number(c.subtotal).toLocaleString('es-AR')}
                                                    </span>
                                                `}
                                            </td>
                                            <td style="padding:10px 12px; text-align:center;">
                                                <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                                                    <button type="button" class="btn-edit-custom-cut-item" data-cut-index="${idx}" style="background:#F1F5F9; border:1px solid #CBD5E1; color:#0284C7; cursor:pointer; padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; font-size:0.72rem; font-weight:700;" title="Modificar/Editar medidas de este corte">
                                                        <span class="material-symbols-outlined" style="font-size:15px;">edit</span>
                                                        <span>Editar</span>
                                                    </button>
                                                    <button type="button" class="btn-remove-custom-cut-item" data-cut-index="${idx}" style="background:#FEE2E2; border:1px solid #FECACA; color:#EF4444; cursor:pointer; padding:4px 6px; border-radius:6px; display:inline-flex; align-items:center;" title="Eliminar corte de la lista">
                                                        <span class="material-symbols-outlined" style="font-size:15px;">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1.5px dashed #CBD5E1; flex-wrap:wrap; gap:8px;">
                        <div style="font-size:0.8rem; color:#475569;">
                            Total de piezas a cortar: <strong style="color:#0F172A;">${totalPieces} unidades</strong> en <strong>${customCutsList.length} cortes distintos</strong>.
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${totalListDiscount > 0 ? `
                                <div style="text-align:right;">
                                    <div style="font-size:0.75rem; color:#94A3B8; text-decoration:line-through;">
                                        Subtotal: $${Number(totalSubtotal).toLocaleString('es-AR')}
                                    </div>
                                    <div style="font-size:0.75rem; color:#15803D; font-weight:700;">
                                        Ahorro: -$${Number(totalListDiscount).toLocaleString('es-AR')}
                                    </div>
                                </div>
                            ` : ''}
                            <div style="font-size:1rem; font-weight:800; color:#0F172A;">
                                Total cortes: <span style="color:#0284c7; font-size:1.2rem;">$${Number(finalListSubtotal).toLocaleString('es-AR')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            listContainer.querySelectorAll('.btn-edit-custom-cut-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cutIdx = parseInt(btn.getAttribute('data-cut-index'), 10);
                    if (!isNaN(cutIdx) && cutIdx >= 0 && cutIdx < customCutsList.length) {
                        loadCutForEditing(cutIdx);
                    }
                });
            });

            listContainer.querySelectorAll('.btn-remove-custom-cut-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cutIdx = parseInt(btn.getAttribute('data-cut-index'), 10);
                    if (!isNaN(cutIdx) && cutIdx >= 0 && cutIdx < customCutsList.length) {
                        customCutsList.splice(cutIdx, 1);
                        if (editingCutIndex === cutIdx) {
                            resetEditingState();
                        } else if (editingCutIndex > cutIdx) {
                            editingCutIndex--;
                        }
                        window._activeCustomCutsList = customCutsList;
                        renderCustomCutsList();
                        calcCut();
                    }
                });
            });

            document.getElementById('btn-clear-custom-cuts')?.addEventListener('click', () => {
                if (confirm('¿Querés vaciar toda la lista de cortes?')) {
                    customCutsList.length = 0;
                    window._activeCustomCutsList = customCutsList;
                    resetEditingState();
                    renderCustomCutsList();
                    calcCut();
                }
            });
        };

        const loadCutForEditing = (cutIdx) => {
            const cut = customCutsList[cutIdx];
            if (!cut) return;

            editingCutIndex = cutIdx;

            const selMat = document.getElementById('detail-custom-cut-material');
            if (selMat) {
                for (let i = 0; i < selMat.options.length; i++) {
                    if (selMat.options[i].value === cut.material) {
                        selMat.selectedIndex = i;
                        break;
                    }
                }
                updateEspesoresForSelectedMaterial();
            }

            const selEsp = document.getElementById('detail-custom-cut-espesor');
            if (selEsp) {
                for (let i = 0; i < selEsp.options.length; i++) {
                    if (selEsp.options[i].value === cut.espesor) {
                        selEsp.selectedIndex = i;
                        break;
                    }
                }
            }

            const inL = document.getElementById('detail-custom-cut-largo');
            const inW = document.getElementById('detail-custom-cut-ancho');
            if (inL) inL.value = cut.largo;
            if (inW) inW.value = cut.ancho;

            const inQ = document.getElementById('detail-custom-cut-item-qty');
            if (inQ) inQ.value = cut.qty || 1;

            const btnAddText = document.getElementById('btn-add-cut-text');
            if (btnAddText) btnAddText.textContent = 'Guardar cambios del corte #' + (cutIdx + 1);

            const btnCancel = document.getElementById('btn-cancel-edit-cut');
            if (btnCancel) btnCancel.style.display = 'inline-block';

            renderCustomCutsList();
            calcCut();

            bottomContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        const resetEditingState = () => {
            editingCutIndex = -1;
            const btnAddText = document.getElementById('btn-add-cut-text');
            if (btnAddText) btnAddText.textContent = '+ Agregar a lista de cortes';
            const btnCancel = document.getElementById('btn-cancel-edit-cut');
            if (btnCancel) btnCancel.style.display = 'none';
        };

        document.getElementById('btn-cancel-edit-cut')?.addEventListener('click', () => {
            resetEditingState();
            renderCustomCutsList();
            calcCut();
        });

        const addCutItemToList = () => {
            if (!currentCalculatedCut) return;
            if (currentCalculatedCut.isExceeded) {
                alert('No se puede guardar esta pieza porque excede las dimensiones máximas del tablero seleccionado.');
                return;
            }

            const qtyInput = document.getElementById('detail-custom-cut-item-qty');
            const itemQty = Math.max(1, parseInt(qtyInput?.value || '1', 10));

            const pieceSubtotal = currentCalculatedCut.unitPrice * itemQty;
            const pieceM2Total = currentCalculatedCut.m2Unit * itemQty;

            const cutData = {
                id: (editingCutIndex >= 0 && customCutsList[editingCutIndex]?.id) ? customCutsList[editingCutIndex].id : ('cut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
                material: currentCalculatedCut.materialName,
                espesor: currentCalculatedCut.espesorText,
                largo: currentCalculatedCut.autoL,
                ancho: currentCalculatedCut.autoW,
                autoL: currentCalculatedCut.autoL,
                autoW: currentCalculatedCut.autoW,
                qty: itemQty,
                m2Unit: currentCalculatedCut.m2Unit,
                m2Total: pieceM2Total,
                rawUnitPrice: currentCalculatedCut.rawUnitPrice || currentCalculatedCut.unitPrice,
                unitPrice: currentCalculatedCut.unitPrice,
                subtotal: pieceSubtotal,
                usageLabel: currentCalculatedCut.usageLabel,
                weightKg: currentCalculatedCut.weightKg
            };

            if (editingCutIndex >= 0 && editingCutIndex < customCutsList.length) {
                const existingDuplicateIdx = customCutsList.findIndex((c, idx) => 
                    idx !== editingCutIndex &&
                    (c.material || '').trim().toLowerCase() === (cutData.material || '').trim().toLowerCase() &&
                    (c.espesor || '').trim().toLowerCase() === (cutData.espesor || '').trim().toLowerCase() &&
                    Number(c.autoL) === Number(cutData.autoL) &&
                    Number(c.autoW) === Number(cutData.autoW)
                );

                if (existingDuplicateIdx !== -1) {
                    const target = customCutsList[existingDuplicateIdx];
                    target.qty = (target.qty || 1) + cutData.qty;
                    target.m2Total = target.m2Unit * target.qty;
                    target.subtotal = target.unitPrice * target.qty;
                    customCutsList.splice(editingCutIndex, 1);
                } else {
                    customCutsList[editingCutIndex] = cutData;
                }
                resetEditingState();
            } else {
                const existingIdx = customCutsList.findIndex(c => 
                    (c.material || '').trim().toLowerCase() === (cutData.material || '').trim().toLowerCase() &&
                    (c.espesor || '').trim().toLowerCase() === (cutData.espesor || '').trim().toLowerCase() &&
                    Number(c.autoL) === Number(cutData.autoL) &&
                    Number(c.autoW) === Number(cutData.autoW)
                );

                if (existingIdx !== -1) {
                    const existing = customCutsList[existingIdx];
                    existing.qty = (existing.qty || 1) + cutData.qty;
                    existing.m2Total = existing.m2Unit * existing.qty;
                    existing.subtotal = existing.unitPrice * existing.qty;
                } else {
                    customCutsList.push(cutData);
                }
            }

            window._activeCustomCutsList = customCutsList;

            if (qtyInput) qtyInput.value = '1';

            renderCustomCutsList();
            calcCut();
        };

        document.getElementById('btn-add-cut-to-list')?.addEventListener('click', addCutItemToList);

        const calcCut = () => {
            const inL = document.getElementById('detail-custom-cut-largo');
            const inW = document.getElementById('detail-custom-cut-ancho');
            const selMat = document.getElementById('detail-custom-cut-material');
            const selEsp = document.getElementById('detail-custom-cut-espesor');
            const warnBox = document.getElementById('detail-custom-cut-warning');

            const rawL = parseFloat(inL?.value) || 15;
            const rawW = parseFloat(inW?.value) || 10;
            
            const autoL = Math.max(rawL, rawW);
            const autoW = Math.min(rawL, rawW);

            const m2 = (autoL * autoW) / 10000;

            const optMat = selMat?.options[selMat.selectedIndex];
            const optEsp = selEsp?.options[selEsp.selectedIndex];

            const maxL = parseFloat(optEsp?.getAttribute('data-max-largo')) || parseFloat(optMat?.getAttribute('data-max-largo')) || 300;
            const maxW = parseFloat(optEsp?.getAttribute('data-max-ancho')) || parseFloat(optMat?.getAttribute('data-max-ancho')) || 120;
            const precioM2Base = parseFloat(optEsp?.getAttribute('data-precio')) || parseFloat(optMat?.getAttribute('data-precio')) || (conf.precios?.precio_m2_venta || 48500);
            const limitMsg = optEsp?.getAttribute('data-msg') || optMat?.getAttribute('data-msg') || '';

            let factorUso = 1.0;
            let recargoFijoUso = 0;
            let detectedLabel = 'Corte Estándar Cepillado';

            const availableUsos = Array.isArray(conf.usos) ? conf.usos.filter(u => u.activo !== false) : [];
            
            const matchedUso = availableUsos.find(u => {
                const minW = u.min_ancho || 0;
                const maxW_uso = u.max_ancho !== undefined ? u.max_ancho : 999;
                const minL = u.min_largo || 0;
                const maxL_uso = u.max_largo !== undefined ? u.max_largo : 999;
                return (autoW >= minW && autoW <= maxW_uso && autoL >= minL && autoL <= maxL_uso);
            }) || availableUsos[0];

            if (matchedUso) {
                const rawFactor = Number(matchedUso.factor_precio) || 0;
                if (rawFactor > 0 && rawFactor <= 3) {
                    factorUso = rawFactor;
                } else {
                    factorUso = 1.0 + (rawFactor / 100);
                }
                recargoFijoUso = matchedUso.recargo_fijo || 0;
                detectedLabel = matchedUso.name || 'Corte Estándar';
            }

            let isExceeded = false;
            if (autoL > maxL || autoW > maxW) {
                isExceeded = true;
                if (warnBox) {
                    warnBox.style.display = 'block';
                    warnBox.innerHTML = `
                        ⚠️ <strong>Medida fuera de límite:</strong> Este tablero (${optMat?.text.split('(')[0].trim()} en ${optEsp?.text.trim()}) viene en placas de hasta <strong>${maxL} cm de largo × ${maxW} cm de ancho</strong>.<br>
                        ${limitMsg ? `<em>${limitMsg}</em><br>` : ''}
                        Tu corte es de <strong>${autoL} × ${autoW} cm</strong>. Por favor ajustá los centímetros o elegí otro material.
                    `;
                }
            } else {
                if (warnBox) warnBox.style.display = 'none';
            }

            const lblM2 = document.getElementById('detail-custom-cut-m2');
            if (lblM2) lblM2.textContent = `📐 Superficie: ${m2.toFixed(2)} m²`;

            const lblSpec = document.getElementById('detail-custom-cut-spec');
            if (lblSpec) lblSpec.textContent = `${detectedLabel} (${optEsp?.text.split('(')[0].trim()})`;

            const minimo = conf.precios?.minimo_corte_taller || 3500;
            const precioM2Final = precioM2Base * factorUso;
            const rawCalcPrice = Math.max(minimo, Math.round(m2 * precioM2Final + recargoFijoUso));

            // Paso de redondeo comercial (500 pesos por defecto o según config)
            const pasoRedondeo = (conf.taller && conf.taller.redondeo_paso !== undefined) ? conf.taller.redondeo_paso : 500;
            const calcPrice = (pasoRedondeo > 0)
                ? Math.max(minimo, Math.floor(rawCalcPrice / pasoRedondeo) * pasoRedondeo)
                : rawCalcPrice;

            // Leer cantidad actual del formulario
            const qtyInput = document.getElementById('detail-custom-cut-item-qty');
            const itemQty = Math.max(1, parseInt(qtyInput?.value || '1', 10));

            const lblPricePrev = document.getElementById('detail-custom-cut-unit-preview');
            if (lblPricePrev) {
                const subtotalActual = calcPrice * itemQty;
                const rawSubtotalActual = rawCalcPrice * itemQty;
                const ahorroTotal = rawSubtotalActual - subtotalActual;

                if (rawCalcPrice > calcPrice) {
                    if (itemQty > 1) {
                        lblPricePrev.innerHTML = `
                            <span style="text-decoration:line-through; color:#94A3B8; font-size:0.95rem; font-weight:800; margin-right:4px;">$${rawSubtotalActual.toLocaleString('es-AR')}</span>
                            <span style="color:var(--primary-color, #ea580c); font-weight:900; font-size:1.1rem;">$${subtotalActual.toLocaleString('es-AR')}</span>
                            <span style="font-size:0.8rem; color:#64748B; font-weight:700; margin-left:4px;">($${calcPrice.toLocaleString('es-AR')} c/u)</span>
                            <span style="font-size:0.75rem; font-weight:800; color:#15803D; background:#DCFCE7; border:1px solid #BBF7D0; padding:2px 8px; border-radius:10px; margin-left:6px; vertical-align:middle;">Redondeado (-$${ahorroTotal.toLocaleString('es-AR')})</span>
                        `;
                    } else {
                        lblPricePrev.innerHTML = `
                            <span style="text-decoration:line-through; color:#94A3B8; font-size:1rem; font-weight:800; margin-right:6px;">$${rawCalcPrice.toLocaleString('es-AR')}</span>
                            <span style="color:var(--primary-color, #ea580c); font-weight:900; font-size:1.05rem;">$${calcPrice.toLocaleString('es-AR')} c/u</span>
                            <span style="font-size:0.75rem; font-weight:800; color:#15803D; background:#DCFCE7; border:1px solid #BBF7D0; padding:2px 8px; border-radius:10px; margin-left:6px; vertical-align:middle;">Redondeado (-$${ahorroTotal.toLocaleString('es-AR')})</span>
                        `;
                    }
                } else {
                    if (itemQty > 1) {
                        lblPricePrev.innerHTML = `
                            <span style="color:var(--primary-color, #ea580c); font-weight:900; font-size:1.1rem;">$${subtotalActual.toLocaleString('es-AR')}</span>
                            <span style="font-size:0.8rem; color:#64748B; font-weight:700; margin-left:4px;">($${calcPrice.toLocaleString('es-AR')} c/u)</span>
                        `;
                    } else {
                        lblPricePrev.innerHTML = `$${calcPrice.toLocaleString('es-AR')} c/u`;
                    }
                }
            }

            const cleanMatName = optMat?.text.split('(')[0].trim() || 'Madera';
            const cleanEspText = optEsp?.text.trim() || '18 mm';

            const curMat = (conf.materiales || []).find(m => m.name === optMat?.value || m.id === optMat?.value);
            const pesoM2 = curMat?.peso_m2 || 10;
            const weightKg = m2 * pesoM2;

            currentCalculatedCut = {
                materialName: cleanMatName,
                espesorText: cleanEspText,
                autoL,
                autoW,
                m2Unit: m2,
                rawUnitPrice: rawCalcPrice,
                unitPrice: calcPrice,
                usageLabel: detectedLabel,
                isExceeded,
                weightKg
            };

            // Determinar total de piezas y subtotal general (de la lista si hay elementos, o del corte en curso)
            let totalPieces = 0;
            let totalSubtotal = 0;
            let medidaDesc = '';

            if (customCutsList.length > 0) {
                totalPieces = customCutsList.reduce((acc, c) => acc + (c.qty || 1), 0);
                totalSubtotal = customCutsList.reduce((acc, c) => acc + (c.subtotal || 0), 0);
                medidaDesc = `Despiece personalizado (${totalPieces} piezas en ${customCutsList.length} medidas)`;
            } else {
                totalPieces = itemQty;
                totalSubtotal = calcPrice * itemQty;
                medidaDesc = `${autoL} × ${autoW} cm (${cleanMatName} - ${detectedLabel})`;
            }

            const qtyValEl = document.getElementById('qty-value');
            if (qtyValEl) qtyValEl.textContent = String(totalPieces);

            const priceMain = document.getElementById('price-main-number');
            if (priceMain) priceMain.textContent = `$${totalSubtotal.toLocaleString('es-AR')}`;

            const priceSub = document.getElementById('price-sub-calc');
            if (priceSub) {
                const effUnit = totalPieces > 0 ? Math.round(totalSubtotal / totalPieces) : totalSubtotal;
                priceSub.textContent = totalPieces > 1
                    ? `$${effUnit.toLocaleString('es-AR')} c/u ($${totalSubtotal.toLocaleString('es-AR')} total)`
                    : `$${effUnit.toLocaleString('es-AR')} c/u`;
            }

            if (grupo.medidas_variants && grupo.medidas_variants[0]) {
                const effUnit = totalPieces > 0 ? Math.round(totalSubtotal / totalPieces) : calcPrice;
                grupo.medidas_variants[0].price = effUnit;
                grupo.medidas_variants[0].medida = medidaDesc;
                grupo.medidas_variants[0].showPrice = true;
                grupo.medidas_variants[0].hidden = false;
            }

            // Renderizar Banner de Descuento por Volumen Escalable (Entre formulario y lista)
            const bannerVol = document.getElementById('cortes-volume-discount-banner');
            if (bannerVol) {
                const rawDiscounts = (product && Array.isArray(product.quantityDiscounts) && product.quantityDiscounts.length > 0)
                    ? product.quantityDiscounts
                    : (conf.descuentos?.activo !== false && Array.isArray(conf.descuentos?.escalas))
                        ? conf.descuentos.escalas
                        : [];

                if (rawDiscounts.length > 0) {
                    const sortedTiers = [...rawDiscounts].sort((a, b) => ((a.minQty !== undefined ? a.minQty : a.minUnits) || 0) - ((b.minQty !== undefined ? b.minQty : b.minUnits) || 0));

                    const activeVariant = grupo.medidas_variants ? grupo.medidas_variants[0] : null;
                    const bestRule = getBestDiscountRule ? getBestDiscountRule(totalPieces, activeVariant) : null;

                    // Próxima escala superior disponible para seguir motivando
                    const nextTier = sortedTiers.find(t => ((t.minQty !== undefined ? t.minQty : t.minUnits) || 0) > totalPieces);
                    const nextMin = nextTier ? (nextTier.minQty !== undefined ? nextTier.minQty : nextTier.minUnits) : 0;
                    const faltan = nextTier ? Math.max(1, nextMin - totalPieces) : 0;

                    // Chips visuales de todas las escalas configuradas
                    const tiersChipsHtml = sortedTiers.map(t => {
                        const minU = t.minQty !== undefined ? t.minQty : t.minUnits;
                        const isAchieved = totalPieces >= minU;
                        const isNext = nextTier && nextMin === minU;
                        const bg = isAchieved ? '#16A34A' : (isNext ? '#0284C7' : '#94A3B8');
                        return `<span style="background:${bg}; color:white; font-size:0.7rem; font-weight:800; padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                            ${isAchieved ? '✓ ' : ''}${minU}+ uds: ${t.discountPercent}% OFF
                        </span>`;
                    }).join(' ');

                    bannerVol.style.display = 'block';

                    if (bestRule && bestRule.discountPercent > 0) {
                        const discPct = bestRule.discountPercent;
                        const ahorroVolumen = Math.round(totalSubtotal * (discPct / 100));
                        bannerVol.innerHTML = `
                            <div style="background:#F0FDF4; border:1.5px solid #86EFAC; border-radius:12px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; box-shadow:0 2px 8px rgba(22,101,52,0.06);">
                                <div style="display:flex; align-items:flex-start; gap:10px;">
                                    <span class="material-symbols-outlined" style="font-size:24px; color:#16A34A; margin-top:2px;">verified</span>
                                    <div style="font-size:0.85rem; color:#166534; line-height:1.4;">
                                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                            <strong>¡Descuento activo: ${discPct}% OFF!</strong>
                                            <span style="font-size:0.75rem; color:#15803D;">Ahorrás <strong>$${ahorroVolumen.toLocaleString('es-AR')}</strong> extra por llevar ${totalPieces} cortes.</span>
                                        </div>
                                        ${nextTier ? `
                                            <div style="font-size:0.75rem; color:#047857; margin-top:4px;">
                                                🚀 ¡Agregando <strong>${faltan} ${faltan === 1 ? 'corte más' : 'cortes más'}</strong> subís de escala y activás <strong>${nextTier.discountPercent}% OFF</strong>!
                                            </div>
                                        ` : `
                                            <div style="font-size:0.75rem; color:#047857; margin-top:4px;">
                                                🏆 ¡Alcanzaste el mayor nivel de descuento para cortes de placas!
                                            </div>
                                        `}
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                    ${tiersChipsHtml}
                                </div>
                            </div>
                        `;
                    } else {
                        // Aún no alcanzó la primera escala
                        bannerVol.innerHTML = `
                            <div style="background:#EFF6FF; border:1.5px solid #BFDBFE; border-radius:12px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; box-shadow:0 2px 8px rgba(37,99,235,0.05);">
                                <div style="display:flex; align-items:flex-start; gap:10px;">
                                    <span class="material-symbols-outlined" style="font-size:24px; color:#2563EB; margin-top:2px;">loyalty</span>
                                    <div style="font-size:0.85rem; color:#1E40AF; line-height:1.4;">
                                        <strong>Descuentos escalables por cantidad:</strong><br>
                                        <span style="font-size:0.75rem; color:#1D4ED8;">
                                            ${faltan > 0 ? `¡Agregá <strong>${faltan} ${faltan === 1 ? 'corte más' : 'cortes más'}</strong> para activar tu primer descuento de <strong>${nextTier.discountPercent}% OFF</strong>!` : ''}
                                        </span>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                    ${tiersChipsHtml}
                                </div>
                            </div>
                        `;
                    }
                } else {
                    bannerVol.style.display = 'none';
                }
            }

            updateBuyButton(grupo, medidaDesc);

            const btnBuy = document.getElementById('btn-modal-add-to-cart');
            if (btnBuy) {
                if (customCutsList.length === 0 && isExceeded) {
                    btnBuy.disabled = true;
                    btnBuy.style.opacity = '0.5';
                    btnBuy.style.pointerEvents = 'none';
                } else {
                    btnBuy.disabled = false;
                    btnBuy.style.opacity = '1';
                    btnBuy.style.pointerEvents = 'auto';
                }
            }
        };

        document.getElementById('detail-custom-cut-largo')?.addEventListener('input', calcCut);
        document.getElementById('detail-custom-cut-ancho')?.addEventListener('input', calcCut);
        document.getElementById('detail-custom-cut-material')?.addEventListener('change', () => {
            updateEspesoresForSelectedMaterial();
            calcCut();
        });
        document.getElementById('detail-custom-cut-uso')?.addEventListener('change', calcCut);
        document.getElementById('detail-custom-cut-espesor')?.addEventListener('change', calcCut);
        document.getElementById('detail-custom-cut-item-qty')?.addEventListener('input', calcCut);
        document.getElementById('detail-custom-cut-item-qty')?.addEventListener('change', calcCut);

        updateEspesoresForSelectedMaterial();
        calcCut();
        renderCustomCutsList();
    }

    window.initCortesWidget = initCortesWidget;
})();
