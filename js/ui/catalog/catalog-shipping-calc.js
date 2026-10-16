// js/ui/catalog/catalog-shipping-calc.js
// --- CÁLCULO DINÁMICO DE ENVÍOS, LOGÍSTICA FLEX, COURIER Y FLETE PARTICULAR ---
// Extraído de ui-catalog.js como componente modular independiente.

(function() {
    'use strict';

    function renderShippingBestPriceBadge(context) {
        const {
            product,
            grupo,
            medidaName,
            categoryName,
            customCutsList,
            divMedida,
            divOpt
        } = context;

        const shipBadgeContainer = document.getElementById('detail-shipping-best-price-badge');
        if (!shipBadgeContainer) return;

        const isRental = categoryName === 'Alquileres' || product.primaryCatId === 'alquileres';
        if (isRental) {
            shipBadgeContainer.style.display = 'none';
            return;
        }

        shipBadgeContainer.style.display = 'block';
        const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName) || (grupo.medidas_variants || [])[0];
        const shipConf = product.shippingConfig || {};
        const isFlexDisabled = activeVariant && (activeVariant.logisticaEnabled === false || activeVariant.noFlex === true || activeVariant.disableFlex === true);

        let userZip = '';
        try {
            const savedData = localStorage.getItem('userData');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                userZip = (parsed.zipCode || '').trim();
            }
        } catch(e) {}

        let cpRes = null;
        if (userZip && window.lookupPostalCode) {
            cpRes = window.lookupPostalCode(userZip);
        }

        const triggerCheckoutModal = () => {
            const selMedida = divMedida ? divMedida.querySelector('select') : null;
            const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : medidaName;
            const selOpt = divOpt ? divOpt.querySelector('select') : null;
            const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
            const optLabel = product.optional_variant?.label || '';
            const curVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaText);
            const variantPrice = (curVariant && curVariant.price !== undefined && curVariant.price !== '') ? curVariant.price : (parseFloat(product.price) || 0);
            const qtyValEl = document.getElementById('qty-value');
            const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1', 10) : 1;

            if (window.showProductPaymentModal) {
                window.showProductPaymentModal(product, grupo, medidaText, variantPrice, qtyVal, optText, optLabel);
            } else if (window.showOfferPaymentModal) {
                window.showOfferPaymentModal(product, qtyVal, { grupo, medida: medidaText, price: variantPrice, opcion: optText, opcionLabel: optLabel });
            }
        };

        if (!userZip || !cpRes || cpRes.hasLocalMatch === false) {
            shipBadgeContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 6px; color: #475569; font-weight: 700;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #0284c7;">local_shipping</span>
                        <span>Medios de envío y costos</span>
                    </div>
                    <button type="button" id="btn-detail-cp-trigger" style="background: #e0f2fe; color: #0284c7; border: 1.5px solid #bae6fd; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">location_on</span>
                        <span>Calcular costo de envío</span>
                    </button>
                </div>
            `;
            document.getElementById('btn-detail-cp-trigger')?.addEventListener('click', triggerCheckoutModal);
            return;
        }

        const qtyValEl = document.getElementById('qty-value');
        const hasCustomCutsList = (product.isCustomCutting === true || product.id === '69') && Array.isArray(customCutsList) && customCutsList.length > 0;
        const qty = hasCustomCutsList ? customCutsList.reduce((acc, c) => acc + (c.qty || 1), 0) : (qtyValEl ? (parseInt(qtyValEl.textContent, 10) || 1) : 1);
        let validOptions = [];

        // 1. Envío global gratis
        if (shipConf.isFreeShipping || shipConf.isFree || product.shippingType === 'free') {
            validOptions.push({ label: 'Envío gratis a domicilio', cost: 0, icon: 'local_shipping' });
        }

        // 2. Logística Flex (evaluando medidas de bulto, peso de la madera y paquetes)
        let isFlexExcludedBySize = false;
        let flexPackagesCount = 1;
        let flexTotalWeightKg = 0;

        // 2. Logística Flex para Cajones CrossFit o Cortes de Madera
        const isCajonProduct = product.id === '95' || product.primaryCatId === 'cajones-crossfit' || (product.categories && product.categories.includes('cajones-crossfit'));
        const cajonesList = window._activeCajonesList || [];

        if (isCajonProduct) {
            const cajonLog = window.cajonesConfig?.logistica || {};
            const maxSumaLados = cajonLog.flex_max_suma_lados || 150;
            const maxPesoFlex = cajonLog.flex_max_peso_kg || 30;
            const maxUnitsFlex = cajonLog.flex_max_unidades_bulto || 1;

            if (cajonesList.length > 0) {
                // Evaluar lista de cajones agregados
                for (const item of cajonesList) {
                    const sumaLados = (item.largo || 0) + (item.ancho || 0) + (item.alto || 0);
                    // Peso estimado por cajón basado en su m² de placa de 18mm (~11.5 kg/m²)
                    const pesoEstUnit = (item.m2Unit || 1) * 11.5;
                    if (sumaLados > maxSumaLados || pesoEstUnit > maxPesoFlex) {
                        isFlexExcludedBySize = true;
                        break;
                    }
                    flexTotalWeightKg += pesoEstUnit * (item.qty || 1);
                }
                if (!isFlexExcludedBySize) {
                    const totalCajones = cajonesList.reduce((acc, c) => acc + (c.qty || 1), 0);
                    flexPackagesCount = Math.max(1, Math.ceil(totalCajones / maxUnitsFlex));
                    if (flexPackagesCount > 3 || flexTotalWeightKg > (maxPesoFlex * 2)) {
                        isFlexExcludedBySize = true;
                    }
                }
            } else {
                // Evaluar cajón actual en pantalla
                const inL = parseFloat(document.getElementById('detail-cajon-largo')?.value) || 60;
                const inW = parseFloat(document.getElementById('detail-cajon-ancho')?.value) || 30;
                const inH = parseFloat(document.getElementById('detail-cajon-alto')?.value) || 30;
                const inQty = parseInt(document.getElementById('detail-cajon-item-qty')?.value, 10) || qty || 1;

                const sumaLados = inL + inW + inH;
                const m2Est = (2 * ((inL * inW) + (inL * inH) + (inW * inH))) / 10000;
                const pesoUnit = m2Est * 11.5;
                flexTotalWeightKg = pesoUnit * inQty;

                if (sumaLados > maxSumaLados || pesoUnit > maxPesoFlex) {
                    isFlexExcludedBySize = true;
                } else {
                    flexPackagesCount = Math.max(1, Math.ceil(inQty / maxUnitsFlex));
                    if (flexPackagesCount > 3 || flexTotalWeightKg > (maxPesoFlex * 2)) {
                        isFlexExcludedBySize = true;
                    }
                }
            }
        } else if (product.isCustomCutting || product.id === '69') {
            const conf = window.cortesConfig?.logistica?.flex;
            const maxBultoLargo = conf?.max_largo || 140;
            const maxBultoAncho = conf?.max_ancho || 60;
            const maxBultoPeso = conf?.max_peso_bulto || 12;
            const maxUnitsPerPkg = conf?.max_unidades || 5;

            if (hasCustomCutsList) {
                for (const cut of customCutsList) {
                    if (cut.autoL > maxBultoLargo || cut.autoW > maxBultoAncho) {
                        isFlexExcludedBySize = true;
                        break;
                    }
                    if (cut.weightKg > maxBultoPeso * 1.5) {
                        isFlexExcludedBySize = true;
                        break;
                    }
                    flexTotalWeightKg += (cut.weightKg || 0) * (cut.qty || 1);
                }
                if (!isFlexExcludedBySize) {
                    const pkgsByQty = Math.ceil(qty / maxUnitsPerPkg);
                    const pkgsByWeight = Math.ceil(flexTotalWeightKg / maxBultoPeso);
                    flexPackagesCount = Math.max(pkgsByQty, pkgsByWeight, 1);
                    if (flexPackagesCount > 4 || flexTotalWeightKg > (maxBultoPeso * 4)) {
                        isFlexExcludedBySize = true;
                    }
                }
            } else {
                const inL = document.getElementById('detail-custom-cut-largo');
                const inW = document.getElementById('detail-custom-cut-ancho');
                const selMat = document.getElementById('detail-custom-cut-material');

                const rawL = parseFloat(inL?.value) || 80;
                const rawW = parseFloat(inW?.value) || 30;
                const l = Math.max(rawL, rawW);
                const w = Math.min(rawL, rawW);

                if (l > maxBultoLargo || w > maxBultoAncho) {
                    isFlexExcludedBySize = true;
                } else {
                    const optMat = selMat?.options[selMat?.selectedIndex];
                    const matId = optMat?.value;
                    const curMat = (window.cortesConfig?.materiales || []).find(m => m.id === matId);
                    const pesoM2 = curMat?.peso_m2 || 10;
                    const pieceM2 = (l * w) / 10000;
                    const pieceWeight = pieceM2 * pesoM2;
                    flexTotalWeightKg = pieceWeight * qty;

                    if (pieceWeight > maxBultoPeso * 1.5) {
                        isFlexExcludedBySize = true;
                    } else {
                        const pkgsByQty = Math.ceil(qty / maxUnitsPerPkg);
                        const pkgsByWeight = Math.ceil(flexTotalWeightKg / maxBultoPeso);
                        flexPackagesCount = Math.max(pkgsByQty, pkgsByWeight, 1);
                        if (flexPackagesCount > 4 || flexTotalWeightKg > (maxBultoPeso * 4)) {
                            isFlexExcludedBySize = true;
                        }
                    }
                }
            }
        }

        const isCortesForShipping = product.isCustomCutting || product.category === 'cortes-madera' || product.rubro === 'cortes-madera' || product.id === '67' || product.id === '68' || product.id === '69';
        const logCortes = (isCortesForShipping && window.cortesConfig?.logistica) ? window.cortesConfig.logistica : null;

        const flexBen = logCortes?.flex?.beneficios;
        const isFlexFreeShipping = flexBen && flexBen.activo !== false && (flexBen.envioGratisMin > 0) && qty >= flexBen.envioGratisMin;
        
        let flexDiscountPct = 0;
        if (flexBen && flexBen.activo !== false && !isFlexFreeShipping) {
            if (Array.isArray(flexBen.escalas) && flexBen.escalas.length > 0) {
                const sortedScales = [...flexBen.escalas].sort((a, b) => b.minQty - a.minQty);
                const matchedScale = sortedScales.find(s => qty >= s.minQty);
                if (matchedScale) flexDiscountPct = matchedScale.discountPercent || 0;
            } else if (flexBen.descuentoTarifaMin && flexBen.descuentoTarifaPct && qty >= flexBen.descuentoTarifaMin) {
                flexDiscountPct = flexBen.descuentoTarifaPct || 0;
            }
        }

        const fleteBen = logCortes?.flete?.beneficios;
        const isFleteFreeShipping = fleteBen && fleteBen.activo !== false && qty >= (fleteBen.envioGratisMin || 10);
        const fleteDiscountPct = (fleteBen && fleteBen.activo !== false && qty >= (fleteBen.descuentoTarifaMin || 5)) ? (fleteBen.descuentoTarifaPct || 0) : 0;

        // Beneficio de envío gratis por volumen para Cajones CrossFit (Boxes)
        const cajonEnvioGratis = window.cajonesConfig?.envio_gratis_box;
        const isCajonFreeShipping = isCajonProduct && cajonEnvioGratis && cajonEnvioGratis.activo !== false && qty >= (parseInt(cajonEnvioGratis.minQty, 10) || 10);

        if (!isFlexDisabled && !isFlexExcludedBySize && shipConf.logisticaEnabled !== false && cpRes.logistica && cpRes.logistica.active !== false) {
            const manualCost = parseFloat(shipConf.logisticaCost) || 0;
            const sysCost = cpRes.logistica.cost || 0;
            const baseCost = manualCost > 0 ? manualCost : sysCost;
            const freeMin = parseInt(shipConf.logisticaFreeMinUnits) || 0;
            const maxUnits = parseInt(shipConf.logisticaMaxUnits) || 0;
            const isFreeByQty = (freeMin > 0 && qty >= freeMin) || isFlexFreeShipping || isCajonFreeShipping;

            const packages = (product.isCustomCutting || product.id === '69') ? flexPackagesCount : (maxUnits > 0 ? Math.ceil(qty / maxUnits) : 1);
            let cost = isFreeByQty ? 0 : (baseCost * packages);
            if (cost > 0 && flexDiscountPct > 0) {
                cost = Math.round(cost * (1 - flexDiscountPct / 100));
            }
            const pkgBadge = packages > 1 ? ` (${packages} paquetes)` : '';
            validOptions.push({ 
                label: isFreeByQty ? `Logística Flex (¡Envío GRATIS por cantidad!)${pkgBadge}` : (flexDiscountPct > 0 ? `Logística Flex (${flexDiscountPct}% OFF)${pkgBadge}` : `Logística Flex / Courier${pkgBadge}`), 
                cost: cost, 
                icon: 'local_shipping' 
            });
        }

        // 3. Flete particular (Vehículo de reparto / Ranger)
        if (shipConf.fleteEnabled !== false && cpRes.flete && cpRes.flete.active !== false) {
            const manualCost = parseFloat(shipConf.fleteCost) || 0;
            const sysCost = cpRes.flete.cost || 0;
            const baseCost = manualCost > 0 ? manualCost : sysCost;
            const freeMin = parseInt(shipConf.fleteFreeMinUnits) || 0;
            
            let viajesFlete = 1;
            let vehiculoNombre = 'Ranger';

            if (isCajonProduct) {
                const cajonLog = window.cajonesConfig?.logistica || {};
                vehiculoNombre = cajonLog.vehiculo_nombre || 'Ford Ranger';
                const bedL = cajonLog.vehiculo_caja_largo || 145;
                const bedW = cajonLog.vehiculo_caja_ancho || 115;
                const bedH = cajonLog.vehiculo_caja_alto_techo || 85;

                // Dimensiones del vehículo (volumen cúbico útil en cm³)
                const volCamaCm3 = bedL * bedW * bedH;

                const cajonesList = window._activeCajonesList || [];
                let itemsToPack = [];

                if (cajonesList.length > 0) {
                    cajonesList.forEach(c => {
                        const cant = c.qty || 1;
                        for (let k = 0; k < cant; k++) {
                            itemsToPack.push({
                                l: parseFloat(c.largo) || 50,
                                w: parseFloat(c.ancho) || 28,
                                h: parseFloat(c.alto) || 9
                            });
                        }
                    });
                } else {
                    const inL = parseFloat(document.getElementById('detail-cajon-largo')?.value) || 50;
                    const inW = parseFloat(document.getElementById('detail-cajon-ancho')?.value) || 28;
                    const inH = parseFloat(document.getElementById('detail-cajon-alto')?.value) || 9;
                    const inQty = parseInt(document.getElementById('detail-cajon-item-qty')?.value, 10) || qty || 1;
                    for (let k = 0; k < inQty; k++) {
                        itemsToPack.push({ l: inL, w: inW, h: inH });
                    }
                }

                // Configuración de sobredimensión / cajón gigante
                const umbralPct = (cajonLog.gigante_umbral_pct_caja !== undefined ? cajonLog.gigante_umbral_pct_caja : 65) / 100;
                const multViajesGigante = parseInt(cajonLog.gigante_mult_viajes, 10) || 2;

                // Calcular capacidad realista en la caja de carga sin superar el techo
                if (itemsToPack.length > 0) {
                    let viajesTotalesCalculados = 0;
                    const itemsNormales = [];

                    itemsToPack.forEach(c => {
                        const volUnit = c.l * c.w * c.h;
                        const pctOcupacionCaja = volCamaCm3 > 0 ? (volUnit / volCamaCm3) : 0;
                        
                        // Si un solo cajón ocupa más del umbral configurado (ej: 65% de la caja de la chata),
                        // se considera bulto gigante exclusivo: cobra multViajesGigante (ej: 2 viajes por cada unidad gigante)
                        if (pctOcupacionCaja >= umbralPct) {
                            viajesTotalesCalculados += multViajesGigante;
                        } else {
                            itemsNormales.push(c);
                        }
                    });

                    // Para los cajones normales/chicos, se calcula la estiba habitual sin multas de exclusividad
                    if (itemsNormales.length > 0) {
                        let totalVolNormales = 0;
                        itemsNormales.forEach(c => { totalVolNormales += (c.l * c.w * c.h); });
                        
                        const sampleNormal = itemsNormales[0];
                        const fitBase1 = Math.floor(bedL / sampleNormal.l) * Math.floor(bedW / sampleNormal.w);
                        const fitBase2 = Math.floor(bedL / sampleNormal.w) * Math.floor(bedW / sampleNormal.l);
                        const fitBase = Math.max(1, fitBase1, fitBase2);
                        const fitAltura = Math.max(1, Math.floor(bedH / sampleNormal.h));
                        const maxPorViaje = Math.max(1, fitBase * fitAltura);

                        const viajesNormales = Math.ceil(itemsNormales.length / maxPorViaje);
                        viajesTotalesCalculados += viajesNormales;
                    }

                    viajesFlete = Math.max(1, viajesTotalesCalculados);
                } else {
                    const fallbackMax = cajonLog.flete_ranger_max_armados || 6;
                    viajesFlete = Math.max(1, Math.ceil(qty / fallbackMax));
                }
            } else {
                let fleteMaxUnits = parseInt(shipConf.fleteMaxUnits) || 0;
                viajesFlete = fleteMaxUnits > 0 ? Math.ceil(qty / fleteMaxUnits) : 1;
            }

            const isFreeByQty = (freeMin > 0 && qty >= freeMin) || isFleteFreeShipping || isCajonFreeShipping;
            let cost = isFreeByQty ? 0 : (baseCost * viajesFlete);
            if (cost > 0 && fleteDiscountPct > 0) {
                cost = Math.round(cost * (1 - fleteDiscountPct / 100));
            }
            const viajesBadge = viajesFlete > 1 ? ` (${viajesFlete} viajes en camioneta)` : '';
            validOptions.push({ 
                label: isFreeByQty ? 'Flete Particular (¡Envío GRATIS por cantidad!)' : (fleteDiscountPct > 0 ? `Flete Particular (${fleteDiscountPct}% OFF en flete)${viajesBadge}` : `Flete Particular (${vehiculoNombre})${viajesBadge}`), 
                cost: cost, 
                icon: 'fire_truck' 
            });
        }

        const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

        if (validOptions.length > 0) {
            validOptions.sort((a, b) => a.cost - b.cost);
            const best = validOptions[0];
            const costStr = best.cost === 0 ? '<b style="color:#15803d; text-transform:uppercase;">¡GRATIS!</b>' : `<b style="color:#0284c7; font-size: 0.95rem;">${formatter.format(best.cost)}</b>`;

            shipBadgeContainer.innerHTML = `
                <div id="btn-detail-cp-trigger-card" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; cursor: pointer;" title="Tocar para cambiar Código Postal o método de envío">
                    <div style="display: flex; align-items: center; gap: 4px; font-size: 0.82rem; color: #1e293b;">
                        <span class="material-symbols-outlined" style="font-size: 20px; color: #0284c7; flex-shrink: 0; margin-right: 2px;">${best.icon || 'local_shipping'}</span>
                        <span>Envío a <strong>${cpRes.localidad}</strong> (CP ${cpRes.cp})</span>
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #0284c7; flex-shrink: 0; margin-left: 2px;" title="Modificar ubicación">edit</span>
                    </div>
                    <div style="text-align: right; font-size: 0.82rem; white-space: nowrap;">
                        ${costStr}
                    </div>
                </div>
            `;
            document.getElementById('btn-detail-cp-trigger-card')?.addEventListener('click', triggerCheckoutModal);
        } else {
            shipBadgeContainer.innerHTML = `
                <div id="btn-detail-cp-trigger-card" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; cursor: pointer;" title="Tocar para cambiar Código Postal">
                    <div style="display: flex; align-items: center; gap: 4px; font-size: 0.82rem; color: #9a3412;">
                        <span class="material-symbols-outlined" style="font-size: 20px; color: #ea580c; flex-shrink: 0; margin-right: 2px;">info</span>
                        <span>Envío a <strong>${cpRes.localidad}</strong> (CP ${cpRes.cp})</span>
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #ea580c; flex-shrink: 0; margin-left: 2px;" title="Modificar ubicación">edit</span>
                    </div>
                    <div style="text-align: right; font-size: 0.82rem; color: #9a3412; font-weight: 700; white-space: nowrap;">
                        A convenir por WhatsApp
                    </div>
                </div>
            `;
            document.getElementById('btn-detail-cp-trigger-card')?.addEventListener('click', triggerCheckoutModal);
        }
    }

    window.renderShippingBestPriceBadge = renderShippingBestPriceBadge;
})();
