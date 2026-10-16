// js/modules/cajones/cajones-ui.js
// --- COMPONENTES VISUALES Y TEMPLATES HTML PARA CAJONES CROSSFIT ---
// Módulo puramente declarativo para renderizar formularios, tablas y banners.

(function() {
    'use strict';

    /**
     * Devuelve el HTML del formulario de medidas y selector de tipo de cajón.
     */
    function getFormTemplate(activeReglas, activePlacas = []) {
        return `
            <div style="margin-bottom:1.25rem; border-bottom:1.5px solid #E2E8F0; padding-bottom:0.75rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="material-symbols-outlined" style="color:var(--primary-color, #ea580c); font-size:24px;">design_services</span>
                    <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0F172A;">Medida personalizada</h3>
                </div>
            </div>

            <!-- Formulario en 3 Filas Idéntico a Cortes -->
            <div class="custom-cutting-form-rows" style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:14px; padding:1.25rem; margin-bottom:1.5rem; display:flex; flex-direction:column; gap:1rem;">
                
                <!-- Fila 1: 1. Tipo de Cajón y Tipo de Placa / Material -->
                <div class="custom-cutting-row-1" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:12px;">
                    <!-- Selector de Regla / Armado -->
                    <div>
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.02em;">
                            <span class="material-symbols-outlined" style="font-size:18px; color:var(--primary-color, #ea580c);">inventory_2</span>
                            <span>1. Tipo de Cajón (Estructura):</span>
                        </label>
                        <select id="detail-cajon-regla" class="admin-input" style="width:100%; font-weight:700; border-radius:10px; padding:9px 12px; font-size:0.92rem; background:white; border:1.5px solid #CBD5E1;">
                            ${activeReglas.map((r, idx) => `
                                <option value="${r.id}" data-idx="${idx}" ${idx === 0 ? 'selected' : ''}>
                                    ${r.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Selector de Tipo de Placa / Madera -->
                    <div>
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.02em;">
                            <span class="material-symbols-outlined" style="font-size:18px; color:#854D0E;">forest</span>
                            <span>Material de la Placa:</span>
                        </label>
                        <select id="detail-cajon-placa" class="admin-input" style="width:100%; font-weight:700; border-radius:10px; padding:9px 12px; font-size:0.92rem; background:white; border:1.5px solid #CBD5E1;">
                            ${activePlacas.map((p, idx) => `
                                <option value="${p.id}" data-idx="${idx}" ${idx === 0 ? 'selected' : ''}>
                                    ${p.name} (${p.espesores_texto || '18 mm'})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- Fila 2: Largo - Ancho - Alto - Cantidad -->
                <div class="custom-cutting-row-2" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:12px; align-items:end;">
                    <!-- Largo -->
                    <div>
                        <label style="font-size:0.75rem; font-weight:700; color:#334155; text-transform:uppercase; display:block; margin-bottom:5px;">LARGO (CM):</label>
                        <div style="position:relative; display:flex; align-items:center;">
                            <input type="number" id="detail-cajon-largo" value="50" min="1" max="300" step="1" class="admin-input" style="width:100%; padding:9px 28px 9px 12px; font-weight:800; font-size:0.95rem; border:1.5px solid #CBD5E1; border-radius:10px; box-sizing:border-box; background:white;">
                            <span style="position:absolute; right:10px; font-size:0.75rem; font-weight:700; color:#94A3B8; pointer-events:none;">cm</span>
                        </div>
                    </div>

                    <!-- Ancho / Prof. -->
                    <div>
                        <label style="font-size:0.75rem; font-weight:700; color:#334155; text-transform:uppercase; display:block; margin-bottom:5px;">ANCHO / PROF. (CM):</label>
                        <div style="position:relative; display:flex; align-items:center;">
                            <input type="number" id="detail-cajon-ancho" value="28" min="1" max="250" step="1" class="admin-input" style="width:100%; padding:9px 28px 9px 12px; font-weight:800; font-size:0.95rem; border:1.5px solid #CBD5E1; border-radius:10px; box-sizing:border-box; background:white;">
                            <span style="position:absolute; right:10px; font-size:0.75rem; font-weight:700; color:#94A3B8; pointer-events:none;">cm</span>
                        </div>
                    </div>

                    <!-- Alto -->
                    <div>
                        <label style="font-size:0.75rem; font-weight:700; color:#334155; text-transform:uppercase; display:block; margin-bottom:5px;">ALTO (CM):</label>
                        <div style="position:relative; display:flex; align-items:center;">
                            <input type="number" id="detail-cajon-alto" value="9" min="1" max="250" step="1" class="admin-input" style="width:100%; padding:9px 28px 9px 12px; font-weight:800; font-size:0.95rem; border:1.5px solid #CBD5E1; border-radius:10px; box-sizing:border-box; background:white;">
                            <span style="position:absolute; right:10px; font-size:0.75rem; font-weight:700; color:#94A3B8; pointer-events:none;">cm</span>
                        </div>
                    </div>

                    <!-- Cantidad (+ / -) -->
                    <div>
                        <label style="font-size:0.75rem; font-weight:700; color:#334155; text-transform:uppercase; display:block; margin-bottom:5px;">CANTIDAD:</label>
                        <div style="display:flex; align-items:center; background:white; border:1.5px solid #CBD5E1; border-radius:10px; padding:2px 8px; height:42px; box-sizing:border-box;">
                            <button type="button" id="btn-cajon-qty-minus" style="border:none; background:none; cursor:pointer; font-size:1.1rem; font-weight:900; color:#64748B; padding:0 6px;">−</button>
                            <input type="number" id="detail-cajon-item-qty" value="1" min="1" max="100" style="width:100%; border:none; outline:none; text-align:center; font-weight:800; font-size:1rem; color:#0F172A; padding:0; background:transparent;">
                            <button type="button" id="btn-cajon-qty-plus" style="border:none; background:none; cursor:pointer; font-size:1.1rem; font-weight:900; color:#64748B; padding:0 6px;">+</button>
                        </div>
                    </div>
                </div>

                <!-- Breve descripción explicativa de elaboración del cajón -->
                <div id="detail-cajon-desc-wrapper" style="background:#FFFFFF; border:1px solid #E2E8F0; border-left:3.5px solid var(--primary-color, #ea580c); border-radius:8px; padding:8px 12px; display:flex; align-items:flex-start; gap:8px;">
                    <span class="material-symbols-outlined" style="font-size:18px; color:var(--primary-color, #ea580c); flex-shrink:0; margin-top:2px;">info</span>
                    <div style="font-size:0.75rem; color:#475569; line-height:1.45;">
                        <strong id="detail-cajon-desc-title" style="color:#0F172A; font-weight:700;">Elaboración:</strong>
                        <span id="detail-cajon-desc-text">Estructura y método de ensamble.</span>
                    </div>
                </div>

                <!-- Cartel de advertencia por medidas fuera de límite -->
                <div id="detail-cajon-warning" style="display:none; background:#FEF2F2; border:1px solid #FCA5A5; color:#991B1B; padding:0.75rem 1rem; border-radius:10px; font-size:0.8rem; line-height:1.4; font-weight:600;">
                </div>

                <!-- Fila 3: Superficie, Precio y Botón Agregar -->
                <div class="custom-cutting-row-3" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-top:10px; border-top:1.5px dashed #CBD5E1;">
                    <div style="display:flex; align-items:center; gap:14px; font-size:0.8rem; color:#64748B; flex-wrap:wrap;">
                        <span id="detail-cajon-m2" style="font-weight:700; color:#334155;">📐 Superficie: 0.73 m²</span>
                        <span id="detail-cajon-regla-badge" style="color:#16A34A; font-weight:700; background:#DCFCE7; padding:2px 8px; border-radius:6px;">Cajón Simple</span>
                        <span id="detail-cajon-unit-preview" style="color:var(--primary-color, #ea580c); font-weight:800; font-size:0.95rem;">$0 c/u</span>
                    </div>

                    <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
                        <button type="button" id="btn-cancel-edit-cajon" style="display:none; background:#E2E8F0; color:#475569; border:none; border-radius:10px; padding:10px 16px; font-size:0.85rem; font-weight:700; cursor:pointer;">
                            Cancelar edición
                        </button>
                        <button type="button" id="btn-add-cajon-to-list" style="background:#0284c7; color:white; border:none; border-radius:10px; padding:10px 22px; font-size:0.9rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 2px 6px rgba(2,132,199,0.3); transition:all 0.2s ease;">
                            <span class="material-symbols-outlined" style="font-size:20px;">playlist_add</span>
                            <span id="btn-add-cajon-text">+ Agregar a lista de cajones</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Banner de Descuentos por Cantidad / Volumen (Ubicado entre Formulario y Lista) -->
            <div id="cajones-volume-discount-banner" style="margin-bottom:1.25rem; display:none;"></div>

            <!-- Lista de Cajones Agregados -->
            <div id="detail-custom-cajones-list-container" style="display:none;"></div>
        `;
    }

    /**
     * Devuelve el HTML de la tabla con los cajones agregados a la lista.
     */
    function getCajonesListTableTemplate(cajonesList, editingIndex) {
        const totalPieces = cajonesList.reduce((acc, c) => acc + (c.qty || 1), 0);
        const totalM2 = cajonesList.reduce((acc, c) => acc + ((c.m2Unit || 0) * (c.qty || 1)), 0);
        const totalSubtotal = cajonesList.reduce((acc, c) => acc + (c.subtotal || 0), 0);
        const totalRawSubtotal = cajonesList.reduce((acc, c) => acc + ((c.rawUnitPrice || c.unitPrice || 0) * (c.qty || 1)), 0);
        const totalAhorroRedondeo = totalRawSubtotal - totalSubtotal;

        return `
            <div style="background:#FFFFFF; border:1.5px solid #CBD5E1; border-radius:14px; padding:1.25rem; box-shadow:0 4px 16px rgba(0,0,0,0.04); width:100%; box-sizing:border-box;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1.5px solid #F1F5F9; padding-bottom:10px; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:0.95rem; color:#0F172A;">
                        <span class="material-symbols-outlined" style="font-size:20px; color:#0284c7;">table_rows</span>
                        <span>Lista de Cajones Agregados al Pedido (${totalPieces} unidades en total)</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:0.8rem; color:#64748B;">Superficie total: <strong style="color:#0F172A;">${totalM2.toFixed(2)} m²</strong></span>
                        <button type="button" id="btn-clear-cajones-list" style="background:#FEE2E2; border:1px solid #FCA5A5; color:#DC2626; font-size:0.75rem; font-weight:800; cursor:pointer; padding:4px 10px; border-radius:6px; display:flex; align-items:center; gap:4px; transition:all 0.2s ease;">
                            <span class="material-symbols-outlined" style="font-size:15px;">delete_sweep</span>
                            <span>Vaciar lista</span>
                        </button>
                    </div>
                </div>

                <div style="overflow-x:auto; width:100%;">
                    <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.82rem; min-width:600px;">
                        <thead>
                            <tr style="background:#F8FAFC; color:#475569; font-weight:800; border-bottom:1.5px solid #E2E8F0; text-transform:uppercase; font-size:0.72rem; letter-spacing:0.03em;">
                                <th style="padding:10px 12px; width:40px; text-align:center;">#</th>
                                <th style="padding:10px 12px;">Tipo de Cajón</th>
                                <th style="padding:10px 12px;">Medida (Largo × Ancho × Alto)</th>
                                <th style="padding:10px 12px; text-align:center;">Cant.</th>
                                <th style="padding:10px 12px; text-align:right;">Subtotal</th>
                                <th style="padding:10px 12px; text-align:center; width:130px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cajonesList.map((c, idx) => `
                                <tr style="border-bottom:1px solid #E2E8F0; background:${editingIndex === idx ? '#EFF6FF' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')};">
                                    <td style="padding:10px 12px; text-align:center; font-weight:800; color:#64748B;">${idx + 1}</td>
                                    <td style="padding:10px 12px; font-weight:800; color:#0F172A;">
                                        <div>${c.reglaName || 'Cajón Simple'}</div>
                                        <div style="font-size:0.7rem; color:#64748B; font-weight:600;">${c.materialName || 'Fenólico 18mm'}</div>
                                    </td>
                                    <td style="padding:10px 12px;">
                                        <span style="font-weight:800; color:#0284c7; font-size:0.9rem;">${c.largo} × ${c.ancho} × ${c.alto} cm</span>
                                        <span style="font-size:0.7rem; color:#64748B; margin-left:4px;">(${(c.m2Unit || 0).toFixed(2)} m²)</span>
                                    </td>
                                    <td style="padding:10px 12px; text-align:center;">
                                        <span style="background:#E0F2FE; color:#0369A1; font-weight:800; padding:3px 8px; border-radius:6px; font-size:0.8rem;">${c.qty} un.</span>
                                    </td>
                                    <td style="padding:10px 12px; text-align:right;">
                                        ${(c.rawUnitPrice && c.rawUnitPrice > c.unitPrice) ? `
                                            <div style="font-size:0.95rem; text-decoration:line-through; color:#94A3B8; font-weight:800; line-height:1.2;">
                                                $${Number(c.rawUnitPrice * (c.qty || 1)).toLocaleString('es-AR')}
                                            </div>
                                        ` : ''}
                                        <div style="font-weight:900; color:#C0510A; font-size:1rem; line-height:1.2;">
                                            $${Number(c.subtotal).toLocaleString('es-AR')}
                                        </div>
                                    </td>
                                    <td style="padding:10px 12px; text-align:center;">
                                        <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                                            <button type="button" class="btn-edit-cajon-item" data-index="${idx}" style="background:#F1F5F9; border:1px solid #CBD5E1; color:#0284C7; cursor:pointer; padding:4px 8px; border-radius:6px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:3px;">
                                                <span class="material-symbols-outlined" style="font-size:15px;">edit</span>
                                                <span>Editar</span>
                                            </button>
                                            <button type="button" class="btn-remove-cajon-item" data-index="${idx}" style="background:#FEE2E2; border:1px solid #FECACA; color:#EF4444; cursor:pointer; padding:4px 6px; border-radius:6px; display:inline-flex; align-items:center;">
                                                <span class="material-symbols-outlined" style="font-size:15px;">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1.5px dashed #CBD5E1; flex-wrap:wrap; gap:8px;">
                    <div style="font-size:0.8rem; color:#475569; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <span>Total cajones: <strong style="color:#0F172A;">${totalPieces} unidades</strong> en <strong>${cajonesList.length} medidas distintas</strong>.</span>
                        ${totalAhorroRedondeo > 0 ? `
                            <span style="background:#DCFCE7; border:1px solid #BBF7D0; color:#15803D; font-weight:800; padding:2px 8px; border-radius:8px; font-size:0.75rem;">
                                🎁 Ahorro por redondeo: -$${totalAhorroRedondeo.toLocaleString('es-AR')}
                            </span>
                        ` : ''}
                    </div>
                    <div style="font-size:1rem; font-weight:800; color:#0F172A;">
                        Total: <span style="color:#0284c7; font-size:1.2rem;">$${Number(totalSubtotal).toLocaleString('es-AR')}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Devuelve el HTML del banner interactivo de promociones por volumen.
     */
    function getVolumeDiscountBannerTemplate(params) {
        const {
            totalQty,
            totalSubtotal,
            bestRule,
            nextTier,
            faltan,
            sortedTiers,
            envioGratisBox
        } = params;

        let chips = sortedTiers.map(t => {
            const isAchieved = totalQty >= t.minQty;
            const isNext = nextTier && nextTier.minQty === t.minQty;
            const bg = isAchieved ? '#16A34A' : (isNext ? '#0284C7' : '#94A3B8');
            return `<span style="background:${bg}; color:white; font-size:0.7rem; font-weight:800; padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                ${isAchieved ? '✓ ' : ''}${t.minQty}+ uds: ${t.discountPercent}% OFF
            </span>`;
        });

        // Chip de Envío Gratis si está activo
        const isFreeShipActive = envioGratisBox && envioGratisBox.activo !== false && (envioGratisBox.minQty || 10) > 0;
        const freeShipMin = isFreeShipActive ? (parseInt(envioGratisBox.minQty, 10) || 10) : 0;
        const isFreeShipAchieved = isFreeShipActive && totalQty >= freeShipMin;

        if (isFreeShipActive) {
            const shipBg = isFreeShipAchieved ? '#15803D' : '#0284C7';
            chips.push(`<span style="background:${shipBg}; color:white; font-size:0.7rem; font-weight:800; padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                ${isFreeShipAchieved ? '✓ ' : ''}🚚 ${freeShipMin}+ uds: Envío GRATIS
            </span>`);
        }

        const tiersChipsHtml = chips.join(' ');

        if (bestRule && bestRule.discountPercent > 0) {
            const discPct = bestRule.discountPercent;
            const ahorroVolumen = Math.round(totalSubtotal * (discPct / 100));
            const faltanEnvioGratis = (isFreeShipActive && !isFreeShipAchieved) ? (freeShipMin - totalQty) : 0;

            return `
                <div style="background:#F0FDF4; border:1.5px solid #86EFAC; border-radius:12px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; box-shadow:0 2px 8px rgba(22,101,52,0.06);">
                    <div style="display:flex; align-items:flex-start; gap:10px;">
                        <span class="material-symbols-outlined" style="font-size:24px; color:#16A34A; margin-top:2px;">verified</span>
                        <div style="font-size:0.85rem; color:#166534; line-height:1.4;">
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <strong>¡Descuento activo: ${discPct}% OFF!</strong>
                                <span style="font-size:0.75rem; color:#15803D;">Ahorrás <strong>$${ahorroVolumen.toLocaleString('es-AR')}</strong> extra por llevar ${totalQty} unidades.</span>
                            </div>
                            ${nextTier ? `
                                <div style="font-size:0.75rem; color:#047857; margin-top:4px;">
                                    🚀 ¡Llevando <strong>${faltan} ${faltan === 1 ? 'cajón más' : 'cajones más'}</strong> subís de nivel y activás <strong>${nextTier.discountPercent}% OFF</strong>!
                                </div>
                            ` : `
                                <div style="font-size:0.75rem; color:#047857; margin-top:4px;">
                                    🏆 ¡Alcanzaste el mayor nivel de descuento para mayoristas!
                                </div>
                            `}
                            ${isFreeShipAchieved ? `
                                <div style="font-size:0.75rem; color:#15803D; font-weight:800; margin-top:3px; display:flex; align-items:center; gap:4px;">
                                    <span>🚚 ¡Envío 100% Bonificado activo por llevar ${totalQty} cajones!</span>
                                </div>
                            ` : (faltanEnvioGratis > 0 ? `
                                <div style="font-size:0.75rem; color:#0284C7; font-weight:700; margin-top:3px; display:flex; align-items:center; gap:4px;">
                                    <span>📦 Sumá <strong>${faltanEnvioGratis} ${faltanEnvioGratis === 1 ? 'cajón más' : 'cajones más'}</strong> para tener ¡ENVÍO GRATIS!</span>
                                </div>
                            ` : '')}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        ${tiersChipsHtml}
                    </div>
                </div>
            `;
        } else {
            const faltanEnvioGratis = (isFreeShipActive && !isFreeShipAchieved) ? (freeShipMin - totalQty) : 0;
            return `
                <div style="background:#EFF6FF; border:1.5px solid #BFDBFE; border-radius:12px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; box-shadow:0 2px 8px rgba(37,99,235,0.05);">
                    <div style="display:flex; align-items:flex-start; gap:10px;">
                        <span class="material-symbols-outlined" style="font-size:24px; color:#2563EB; margin-top:2px;">loyalty</span>
                        <div style="font-size:0.85rem; color:#1E40AF; line-height:1.4;">
                            <strong>Descuentos escalables por cantidad:</strong><br>
                            <span style="font-size:0.75rem; color:#1D4ED8;">
                                ${faltan > 0 ? `¡Agregá <strong>${faltan} ${faltan === 1 ? 'unidad más' : 'unidades más'}</strong> para activar tu primer descuento de <strong>${nextTier.discountPercent}% OFF</strong>!` : ''}
                            </span>
                            ${faltanEnvioGratis > 0 ? `
                                <div style="font-size:0.75rem; color:#0369A1; font-weight:700; margin-top:3px;">
                                    🚚 ¡Envío gratis a partir de ${freeShipMin} cajones! (Te faltan ${faltanEnvioGratis})
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        ${tiersChipsHtml}
                    </div>
                </div>
            `;
        }
    }

    window.CajonesUI = {
        getFormTemplate,
        getCajonesListTableTemplate,
        getVolumeDiscountBannerTemplate
    };
})();
