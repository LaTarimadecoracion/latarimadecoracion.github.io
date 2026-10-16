// js/modules/cajones-widget.js
// --- CONFIGURADOR DE CAJONES CROSSFIT (CONTROLADOR DE EVENTOS Y ESTADO) ---
// Arquitectura modular:
// - js/modules/cajones/cajones-calc.js (Lógica matemática pura, fórmulas de despiece, límites y redondeo)
// - js/modules/cajones/cajones-ui.js (Templates HTML y renderizado de componentes visuales)
// - js/modules/cajones-widget.js (Controlador que conecta el DOM, estado y carrito de la tienda)

(function() {
    'use strict';

    function initCajonesWidget(product, grupo, context) {
        const { divMedida, bottomContainer, updateBuyButton, updateFavState, updateUrlWithVariants, getBestDiscountRule } = context;

        const cfg = window.cajonesConfig || {
            materiales: [
                { id: "fenolico_18mm", name: "Placa Fenólico Industrial 18mm", max_largo: 244, max_ancho: 124, costo_placa: 20000, espesores_texto: "18 mm", activo: true, es_placa: true }
            ],
            reglas_construccion: [
                { id: "cajon_simple", name: "Cajón Simple", multiplicador_costo: 5.0, formulas_despiece: [] }
            ]
        };

        const activePlacas = (cfg.materiales || []).filter(m => m.activo !== false && m.es_placa !== false);
        const curPlaca = activePlacas[0] || (cfg.materiales && cfg.materiales[0]) || { name: "Placa Fenólico Industrial 18mm", costo_placa: 20000, max_largo: 244, max_ancho: 124, espesores_texto: "18 mm" };
        const activeReglas = (cfg.reglas_construccion || []).filter(r => r.activo !== false);

        let cajonesList = window._activeCajonesList || [];
        let editingIndex = -1;
        let currentCalculated = null;

        // Memoria de la opción elegida intencionalmente por el cliente
        let userPreferredReglaId = 'cajon_simple';
        let isAutoSwitched = false;

        // 1. Badge Verde en el lateral derecho de la ficha
        divMedida.className = 'variant-selector-wrapper mt-1';
        divMedida.style.display = 'block';
        divMedida.innerHTML = `
            <div style="background:#F0FDF4; border:1.5px solid #BBF7D0; border-radius:10px; padding:10px 12px; display:flex; align-items:center; gap:8px;">
                <span class="material-symbols-outlined" style="font-size:20px; color:#166534; flex-shrink:0;">tune</span>
                <div style="font-size:0.78rem; font-weight:700; color:#166534; line-height:1.3;">
                    Cajón a medida personalizado
                    <div style="font-size:0.7rem; font-weight:500; color:#15803D;">Configurá las medidas y agregá cajones en el panel inferior ↓</div>
                </div>
            </div>
        `;

        // 2. Inyección del Formulario en el contenedor inferior ancho
        if (bottomContainer) {
            bottomContainer.style.display = 'block';
            bottomContainer.innerHTML = window.CajonesUI ? window.CajonesUI.getFormTemplate(activeReglas, activePlacas) : '';
        }

        // 3. Vincular botones +/- de cantidad
        document.getElementById('btn-cajon-qty-minus')?.addEventListener('click', () => {
            const qIn = document.getElementById('detail-cajon-item-qty');
            if (qIn) qIn.value = String(Math.max(1, (parseInt(qIn.value, 10) || 1) - 1));
            calcPreview();
        });
        document.getElementById('btn-cajon-qty-plus')?.addEventListener('click', () => {
            const qIn = document.getElementById('detail-cajon-item-qty');
            if (qIn) qIn.value = String((parseInt(qIn.value, 10) || 1) + 1);
            calcPreview();
        });

        // 4. Cálculo en tiempo real usando el motor CajonesCalc
        function calcPreview() {
            const inL = parseFloat(document.getElementById('detail-cajon-largo')?.value) || 50;
            const inW = parseFloat(document.getElementById('detail-cajon-ancho')?.value) || 28;
            const inH = parseFloat(document.getElementById('detail-cajon-alto')?.value) || 9;
            const qtyInput = document.getElementById('detail-cajon-item-qty');
            const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10));

            const selRegla = document.getElementById('detail-cajon-regla');
            let reglaId = selRegla?.value || userPreferredReglaId;

            // Leer siempre la configuración viva y materiales activos
            const currentCfg = window.cajonesConfig || cfg;
            const currentReglas = (currentCfg.reglas_construccion || []).filter(r => r.activo !== false);
            const currentPlacas = (currentCfg.materiales || []).filter(m => m.activo !== false && m.es_placa !== false);

            const selPlaca = document.getElementById('detail-cajon-placa');
            const placaId = selPlaca?.value;
            const liveCurPlaca = (placaId ? currentPlacas.find(p => p.id === placaId) : null) || currentPlacas[0] || curPlaca;

            // Encontrar la regla simple de referencia
            const simpleRegla = currentReglas.find(r => r.id === 'cajon_simple') || currentReglas[0] || { max_largo: 80, max_ancho: 60, max_alto: 60 };
            const maxL_simple = simpleRegla.max_largo !== undefined ? simpleRegla.max_largo : 80;
            const maxW_simple = simpleRegla.max_ancho !== undefined ? simpleRegla.max_ancho : 60;
            const maxH_simple = simpleRegla.max_alto !== undefined ? simpleRegla.max_alto : 60;

            const exceedsSimple = (inL > maxL_simple || inW > maxW_simple || inH > maxH_simple);

            let wasAutoSwitched = false;
            let autoSwitchReason = null;

            // ── Memoria inteligente bidireccional ──
            if (userPreferredReglaId === 'cajon_simple') {
                if (exceedsSimple) {
                    // Excede las medidas de simple: Pasar a Reforzado automáticamente
                    const reforzadaRegla = currentReglas.find(r => r.id === 'cajon_reforzado');
                    if (reforzadaRegla) {
                        reglaId = 'cajon_reforzado';
                        if (selRegla) selRegla.value = 'cajon_reforzado';
                        isAutoSwitched = true;
                        wasAutoSwitched = true;
                        autoSwitchReason = {
                            excedido: [
                                inL > maxL_simple ? `Largo: ${inL} cm (máx. simple: ${maxL_simple} cm)` : '',
                                inW > maxW_simple ? `Ancho: ${inW} cm (máx. simple: ${maxW_simple} cm)` : '',
                                inH > maxH_simple ? `Alto: ${inH} cm (máx. simple: ${maxH_simple} cm)` : ''
                            ].filter(Boolean).join(', '),
                            limitesSimple: `hasta ${maxL_simple} cm de largo × ${maxW_simple} cm de ancho × ${maxH_simple} cm de alto`
                        };
                    }
                } else if (isAutoSwitched) {
                    // Volvió a medidas válidas para Cajón Simple: REVERTIR AUTOMÁTICAMENTE
                    reglaId = 'cajon_simple';
                    if (selRegla) selRegla.value = 'cajon_simple';
                    isAutoSwitched = false;
                    wasAutoSwitched = false;
                }
            }

            const activeRegla = currentReglas.find(r => r.id === reglaId) || currentReglas[0] || { name: 'Cajón Simple', multiplicador_costo: 5.0 };

            if (!window.CajonesCalc) {
                console.error("CajonesCalc no está disponible.");
                return;
            }

            currentCalculated = window.CajonesCalc.calculateCajon({
                largo: inL,
                ancho: inW,
                alto: inH,
                qty: qty,
                activeRegla: activeRegla,
                curPlaca: liveCurPlaca,
                config: currentCfg
            });

            // Actualizar alertas de límites dimensionales o aviso de auto-escalado
            const warnBox = document.getElementById('detail-cajon-warning');
            const btnAdd = document.getElementById('btn-add-cajon-to-list');

            if (wasAutoSwitched && !currentCalculated.isExceeded) {
                // Cartel informativo azul de auto-upgrade a Reforzado
                if (warnBox) {
                    warnBox.style.display = 'block';
                    warnBox.style.background = '#EFF6FF';
                    warnBox.style.border = '1.5px solid #93C5FD';
                    warnBox.style.color = '#1E3A8A';
                    warnBox.innerHTML = `
                        <div style="display:flex; align-items:flex-start; gap:10px;">
                            <span class="material-symbols-outlined" style="font-size:24px; color:#2563EB; flex-shrink:0; margin-top:2px;">shield_with_heart</span>
                            <div style="font-size:0.82rem; line-height:1.45;">
                                <strong style="color:#1E40AF; font-size:0.88rem; display:block; margin-bottom:3px;">
                                    🚀 Se activó automáticamente el modelo "Cajón Reforzado (Esqueleto U)"
                                </strong>
                                Por seguridad y estabilidad estructural, las medidas ingresadas (<strong>${autoSwitchReason.excedido}</strong>) superan el tamaño máximo recomendado para el armado estándar con unión placa con placa (${autoSwitchReason.limitesSimple}).
                            </div>
                        </div>
                    `;
                }
                if (btnAdd) {
                    btnAdd.disabled = false;
                    btnAdd.style.opacity = '1';
                    btnAdd.style.cursor = 'pointer';
                }
            } else if (currentCalculated.isExceeded) {
                if (warnBox) {
                    warnBox.style.display = 'block';
                    warnBox.style.background = '#FEF2F2';
                    warnBox.style.border = '1px solid #FCA5A5';
                    warnBox.style.color = '#991B1B';
                    const customMsg = currentCalculated.limiteMensaje ? `<div style="margin-top:4px; font-weight:500; color:#7F1D1D;"><em>${currentCalculated.limiteMensaje}</em></div>` : '';
                    warnBox.innerHTML = `
                        <div style="display:flex; align-items:flex-start; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:20px; color:#DC2626; flex-shrink:0;">warning</span>
                            <div>
                                <strong>Medidas fuera de límite para "${currentCalculated.reglaName}":</strong>
                                <ul style="margin:4px 0 0 1rem; padding:0;">
                                    ${currentCalculated.exceedReasons.map(r => `<li>${r}</li>`).join('')}
                                </ul>
                                ${customMsg}
                            </div>
                        </div>
                    `;
                }
                if (btnAdd) {
                    btnAdd.disabled = true;
                    btnAdd.style.opacity = '0.5';
                    btnAdd.style.cursor = 'not-allowed';
                }
            } else {
                if (warnBox) warnBox.style.display = 'none';
                if (btnAdd) {
                    btnAdd.disabled = false;
                    btnAdd.style.opacity = '1';
                    btnAdd.style.cursor = 'pointer';
                }
            }

            // Actualizar indicadores del formulario
            const lblM2 = document.getElementById('detail-cajon-m2');
            if (lblM2) lblM2.textContent = `📐 Superficie: ${currentCalculated.m2Unit.toFixed(2)} m²`;

            const badgeRegla = document.getElementById('detail-cajon-regla-badge');
            if (badgeRegla) badgeRegla.textContent = currentCalculated.reglaName;

            const lblDescTitle = document.getElementById('detail-cajon-desc-title');
            if (lblDescTitle) lblDescTitle.textContent = `${currentCalculated.reglaName}:`;

            const lblDescText = document.getElementById('detail-cajon-desc-text');
            if (lblDescText) {
                lblDescText.textContent = activeRegla.descripcion || 'Estructura en placa de alta resistencia con corte y ensamble exacto.';
            }

            const lblPreview = document.getElementById('detail-cajon-unit-preview');
            if (lblPreview) {
                const subtotalActual = currentCalculated.unitPrice * currentCalculated.qty;
                const rawSubtotalActual = currentCalculated.rawUnitPrice * currentCalculated.qty;
                const ahorroTotal = rawSubtotalActual - subtotalActual;

                if (currentCalculated.rawUnitPrice > currentCalculated.unitPrice) {
                    if (currentCalculated.qty > 1) {
                        lblPreview.innerHTML = `
                            <span style="text-decoration:line-through; color:#94A3B8; font-size:0.95rem; font-weight:800; margin-right:4px;">$${rawSubtotalActual.toLocaleString('es-AR')}</span>
                            <span style="color:var(--primary-color, #ea580c); font-weight:900; font-size:1.1rem;">$${subtotalActual.toLocaleString('es-AR')}</span>
                            <span style="font-size:0.8rem; color:#64748B; font-weight:700; margin-left:4px;">($${currentCalculated.unitPrice.toLocaleString('es-AR')} c/u)</span>
                            <span style="font-size:0.75rem; font-weight:800; color:#15803D; background:#DCFCE7; border:1px solid #BBF7D0; padding:2px 8px; border-radius:10px; margin-left:6px; vertical-align:middle;">Redondeado (-$${ahorroTotal.toLocaleString('es-AR')})</span>
                        `;
                    } else {
                        lblPreview.innerHTML = `
                            <span style="text-decoration:line-through; color:#94A3B8; font-size:1rem; font-weight:800; margin-right:6px;">$${currentCalculated.rawUnitPrice.toLocaleString('es-AR')}</span>
                            <span style="color:var(--primary-color, #ea580c); font-weight:900; font-size:1.05rem;">$${currentCalculated.unitPrice.toLocaleString('es-AR')} c/u</span>
                            <span style="font-size:0.75rem; font-weight:800; color:#15803D; background:#DCFCE7; border:1px solid #BBF7D0; padding:2px 8px; border-radius:10px; margin-left:6px; vertical-align:middle;">Redondeado (-$${ahorroTotal.toLocaleString('es-AR')})</span>
                        `;
                    }
                } else {
                    if (currentCalculated.qty > 1) {
                        lblPreview.innerHTML = `
                            <span style="color:var(--primary-color, #ea580c); font-weight:900; font-size:1.1rem;">$${subtotalActual.toLocaleString('es-AR')}</span>
                            <span style="font-size:0.8rem; color:#64748B; font-weight:700; margin-left:4px;">($${currentCalculated.unitPrice.toLocaleString('es-AR')} c/u)</span>
                        `;
                    } else {
                        lblPreview.innerHTML = `$${currentCalculated.unitPrice.toLocaleString('es-AR')} c/u`;
                    }
                }
            }

            syncGlobalState();
        }

        // 5. Renderizar lista de cajones agregados usando CajonesUI
        function renderCajonesList() {
            const container = document.getElementById('detail-custom-cajones-list-container');
            if (!container) return;

            if (cajonesList.length === 0) {
                container.style.display = 'none';
                container.innerHTML = '';
                syncGlobalState();
                return;
            }

            container.style.display = 'block';
            container.innerHTML = window.CajonesUI ? window.CajonesUI.getCajonesListTableTemplate(cajonesList, editingIndex) : '';

            // Botón Vaciar Lista
            document.getElementById('btn-clear-cajones-list')?.addEventListener('click', () => {
                if (!confirm('¿Seguro que deseas vaciar la lista de cajones?')) return;
                cajonesList = [];
                window._activeCajonesList = cajonesList;
                renderCajonesList();
            });

            // Botones Editar y Eliminar
            container.querySelectorAll('.btn-edit-cajon-item').forEach(b => {
                b.addEventListener('click', () => {
                    const idx = parseInt(b.dataset.index, 10);
                    const item = cajonesList[idx];
                    if (!item) return;

                    editingIndex = idx;
                    if (item.reglaId) {
                        const selR = document.getElementById('detail-cajon-regla');
                        if (selR) selR.value = item.reglaId;
                    }
                    if (item.placaId) {
                        const selP = document.getElementById('detail-cajon-placa');
                        if (selP) selP.value = item.placaId;
                    }
                    document.getElementById('detail-cajon-largo').value = item.largo;
                    document.getElementById('detail-cajon-ancho').value = item.ancho;
                    document.getElementById('detail-cajon-alto').value = item.alto;
                    document.getElementById('detail-cajon-item-qty').value = item.qty;

                    document.getElementById('btn-add-cajon-text').textContent = 'Guardar cambios del cajón';
                    document.getElementById('btn-cancel-edit-cajon').style.display = 'inline-block';
                    calcPreview();
                    bottomContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            });

            container.querySelectorAll('.btn-remove-cajon-item').forEach(b => {
                b.addEventListener('click', () => {
                    const idx = parseInt(b.dataset.index, 10);
                    cajonesList.splice(idx, 1);
                    window._activeCajonesList = cajonesList;
                    renderCajonesList();
                });
            });

            syncGlobalState();
        }

        // 6. Sincronizar el estado del producto y tarjeta lateral nativa de la tienda
        function syncGlobalState() {
            let totalSubtotal = 0;
            let totalQty = 1;
            let summaryDesc = '';

            if (cajonesList.length > 0) {
                totalQty = cajonesList.reduce((acc, c) => acc + (c.qty || 1), 0);
                totalSubtotal = cajonesList.reduce((acc, c) => acc + (c.subtotal || 0), 0);
                summaryDesc = `A Medida (${totalQty} cajones: ` + cajonesList.map(c => `${c.qty}x ${c.reglaName || 'Cajón'} en ${c.placaName || c.materialName || 'Fenólico'} ${c.largo}x${c.ancho}x${c.alto}cm`).join(', ') + ')';
            } else if (currentCalculated) {
                totalQty = currentCalculated.qty;
                totalSubtotal = currentCalculated.subtotal;
                summaryDesc = `A Medida (${currentCalculated.reglaName || 'Cajón'} en ${currentCalculated.placaName || currentCalculated.materialName || 'Fenólico'} ${currentCalculated.largo} × ${currentCalculated.ancho} × ${currentCalculated.alto} cm)`;
            }

            const unitPrice = totalQty > 0 ? Math.round(totalSubtotal / totalQty) : totalSubtotal;

            const priceMain = document.getElementById('price-main-number');
            if (priceMain) priceMain.textContent = `$${totalSubtotal.toLocaleString('es-AR')}`;

            const priceSub = document.getElementById('price-sub-calc');
            if (priceSub) {
                priceSub.textContent = totalQty > 1
                    ? `$${unitPrice.toLocaleString('es-AR')} c/u ($${totalSubtotal.toLocaleString('es-AR')} total)`
                    : `$${unitPrice.toLocaleString('es-AR')} c/u`;
            }

            const qtyValEl = document.getElementById('qty-value');
            if (qtyValEl) qtyValEl.textContent = String(totalQty);

            if (grupo.medidas_variants && grupo.medidas_variants[0]) {
                grupo.medidas_variants[0].medida = summaryDesc;
                grupo.medidas_variants[0].price = unitPrice;
                grupo.medidas_variants[0].showPrice = true;
                grupo.medidas_variants[0].hidden = false;
            }

            // Renderizar Banner de Descuento por Volumen usando CajonesUI
            const bannerVol = document.getElementById('cajones-volume-discount-banner');
            if (bannerVol && window.CajonesUI) {
                const discounts = (window.cajonesConfig && Array.isArray(window.cajonesConfig.descuentos_box) && window.cajonesConfig.descuentos_box.length > 0)
                    ? window.cajonesConfig.descuentos_box
                    : ((product && Array.isArray(product.quantityDiscounts)) ? product.quantityDiscounts : []);
                if (discounts.length > 0) {
                    const sortedTiers = [...discounts].sort((a, b) => (a.minQty || 0) - (b.minQty || 0));
                    const activeVariant = grupo.medidas_variants ? grupo.medidas_variants[0] : null;
                    const bestRule = getBestDiscountRule ? getBestDiscountRule(totalQty, activeVariant) : null;
                    const nextTier = sortedTiers.find(t => (t.minQty || 0) > totalQty);
                    const faltan = nextTier ? Math.max(1, nextTier.minQty - totalQty) : 0;

                    const envioGratisBox = window.cajonesConfig?.envio_gratis_box;

                    bannerVol.style.display = 'block';
                    bannerVol.innerHTML = window.CajonesUI.getVolumeDiscountBannerTemplate({
                        totalQty,
                        totalSubtotal,
                        bestRule,
                        nextTier,
                        faltan,
                        sortedTiers,
                        envioGratisBox
                    });
                } else {
                    bannerVol.style.display = 'none';
                }
            }

            updateBuyButton(grupo, summaryDesc);
            if (updateUrlWithVariants) updateUrlWithVariants();
            if (updateFavState) updateFavState();

            // Sincronizar en vivo el badge de envíos con las medidas y cantidad de cajones
            if (window.renderShippingBestPriceBadge) {
                window.renderShippingBestPriceBadge({
                    product,
                    grupo,
                    medidaName: summaryDesc,
                    categoryName: 'cajones-crossfit',
                    customCutsList: null,
                    divMedida,
                    divOpt: null
                });
            }
        }

        // 7. Botón "+ Agregar a lista de cajones"
        document.getElementById('btn-add-cajon-to-list')?.addEventListener('click', () => {
            if (!currentCalculated) return;
            if (currentCalculated.isExceeded) {
                alert('No se puede guardar este cajón porque excede las medidas o límites estructurales permitidos para este tipo de armado.');
                return;
            }

            if (editingIndex >= 0) {
                cajonesList[editingIndex] = { ...currentCalculated };
                editingIndex = -1;
                document.getElementById('btn-add-cajon-text').textContent = '+ Agregar a lista de cajones';
                document.getElementById('btn-cancel-edit-cajon').style.display = 'none';
            } else {
                cajonesList.push({ ...currentCalculated });
            }

            window._activeCajonesList = cajonesList;
            renderCajonesList();
        });

        document.getElementById('btn-cancel-edit-cajon')?.addEventListener('click', () => {
            editingIndex = -1;
            document.getElementById('btn-add-cajon-text').textContent = '+ Agregar a lista de cajones';
            document.getElementById('btn-cancel-edit-cajon').style.display = 'none';
            calcPreview();
        });

        // Escuchar cambios de usuario
        document.getElementById('detail-cajon-regla')?.addEventListener('change', (e) => {
            userPreferredReglaId = e.target.value;
            isAutoSwitched = false;
            calcPreview();
        });
        document.getElementById('detail-cajon-placa')?.addEventListener('change', calcPreview);
        document.getElementById('detail-cajon-largo')?.addEventListener('input', calcPreview);
        document.getElementById('detail-cajon-ancho')?.addEventListener('input', calcPreview);
        document.getElementById('detail-cajon-alto')?.addEventListener('input', calcPreview);
        document.getElementById('detail-cajon-item-qty')?.addEventListener('input', calcPreview);
        document.getElementById('detail-cajon-item-qty')?.addEventListener('change', calcPreview);

        // Inicializar
        calcPreview();
        renderCajonesList();
    }

    window.initCajonesWidget = initCajonesWidget;
})();
