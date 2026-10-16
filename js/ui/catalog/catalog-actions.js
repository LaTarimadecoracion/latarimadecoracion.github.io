// js/ui/catalog/catalog-actions.js
// --- ACCIONES DE COMPRA, WHATSAPP, DESCUENTOS POR VOLUMEN Y ENLACES ---
// Extraído de ui-catalog.js como componente modular independiente.

(function() {
    'use strict';

    function getProductVolumeDiscounts(product, activeVariant = null) {
        let discounts = (activeVariant && activeVariant.volumeDiscounts && Array.isArray(activeVariant.volumeDiscounts) && activeVariant.volumeDiscounts.length > 0)
            ? activeVariant.volumeDiscounts
            : (product?.quantityDiscounts || []);

        const isCortesProduct = product && (
            product.isCustomCutting ||
            product.id === '67' || product.id === '68' || product.id === '69' ||
            product.category === 'cortes-madera' ||
            product.primaryCatId === 'cortes-madera' ||
            (Array.isArray(product.categories) && product.categories.includes('cortes-madera'))
        );

        if (isCortesProduct && window.cortesConfig?.descuentos?.activo !== false && Array.isArray(window.cortesConfig?.descuentos?.escalas) && window.cortesConfig.descuentos.escalas.length > 0) {
            discounts = window.cortesConfig.descuentos.escalas;
        }
        return discounts || [];
    }

    function getBestDiscountRule(product, qty, activeVariant = null) {
        const list = getProductVolumeDiscounts(product, activeVariant);
        if (!list || !Array.isArray(list) || list.length === 0) return null;
        const sortedRules = [...list].sort((a, b) => {
            const minA = a.minQty !== undefined ? a.minQty : a.minUnits;
            const minB = b.minQty !== undefined ? b.minQty : b.minUnits;
            return minB - minA;
        });
        for (const rule of sortedRules) {
            const minUnits = rule.minQty !== undefined ? rule.minQty : rule.minUnits;
            if (qty >= minUnits) return rule;
        }
        return null;
    }

    function buildWhatsAppMessage(context) {
        const {
            product,
            grupo,
            medidaName,
            customCutsList,
            divOpt
        } = context;

        const selOpt = divOpt ? divOpt.querySelector('select') : null;
        const optText = selOpt ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
        const optLabel = product.optional_variant?.label || '';

        const qtyValEl = document.getElementById('qty-value');
        const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1', 10) : 1;

        let details = [];
        if (grupo && grupo.acabado_name && grupo.acabado_name !== 'Único') {
            details.push(`• Acabado: ${grupo.acabado_name}`);
        }

        if ((product.isCustomCutting === true || product.id === '69') && Array.isArray(customCutsList) && customCutsList.length > 0) {
            const cutsSummary = customCutsList.map((c, idx) => 
                `  ${idx + 1}) ${c.qty}x ${c.largo}x${c.ancho} cm (${c.material} ${c.espesor}) - $${Number(c.subtotal).toLocaleString('es-AR')}`
            ).join('\n');
            details.push(`• Despiece (${customCutsList.length} medidas distintas):\n${cutsSummary}`);
        } else if ((product.isCajonProduct === true || product.id === '95') && Array.isArray(context.cajonesList || window._activeCajonesList) && (context.cajonesList || window._activeCajonesList).length > 0) {
            const list = context.cajonesList || window._activeCajonesList;
            const cajonesSummary = list.map((c, idx) => 
                `  ${idx + 1}) ${c.qty}x ${c.reglaName || 'Cajón'} ${c.largo}x${c.ancho}x${c.alto} cm - $${Number(c.subtotal).toLocaleString('es-AR')}`
            ).join('\n');
            details.push(`• Cajones a Medida (${list.length} medidas distintas):\n${cajonesSummary}`);
        } else if (medidaName) {
            details.push(`• Medida: ${medidaName}`);
        }

        if (optText && optLabel) {
            details.push(`• ${optLabel}: ${optText}`);
        }
        if (qtyVal > 1) {
            details.push(`• Cantidad total: ${qtyVal} piezas`);
        }

        const detailsStr = details.length > 0 ? ` (${details.map(d => d.replace('• ', '')).join(', ')})` : '';

        let productUrl = window.location.href;
        if (window.TarimaShortener && typeof window.TarimaShortener.encodeShortCode === 'function') {
            const acabName = (grupo && grupo.acabado_name) ? grupo.acabado_name : '';
            const shortCode = window.TarimaShortener.encodeShortCode(product.id, acabName, medidaName, optText, false);
            if (shortCode) {
                const origin = window.location.origin;
                const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
                productUrl = `${origin}${path}/p/${shortCode}.html`;
            }
        }

        let vacationNote = "";
        if (window.vacationConfig && window.vacationConfig.active) {
            const start = window.vacationConfig.startDate || "receso";
            const deliv = window.vacationConfig.deliveriesDate || "el regreso";
            vacationNote = `\n\n(Nota: Sé que están de vacaciones del ${start} y las entregas se retoman a partir del ${deliv}).`;
        }

        return `¡Hola! Quisiera consultar más información sobre el producto *${product.title}*${detailsStr}.\n\nLink al producto: ${productUrl}${vacationNote}`;
    }

    function updateProductBuyButton(context) {
        const {
            product,
            grupo,
            medidaName,
            categoryName,
            customCutsList,
            divMedida,
            divOpt
        } = context;

        const phone = context.phone || (() => {
            const waUrl = window.siteConfig?.socialLinks?.whatsapp || 'https://wa.me/5491167007723';
            return waUrl.replace('https://wa.me/', '');
        })();

        // 1. Enlaces dinámicos directos (MercadoLibre, envíos)
        const container = document.getElementById('dynamic-shipping-links-container');
        if (container) {
            container.innerHTML = '';
            
            let linksToRender = [];
            if (grupo.medidas_variants && grupo.medidas_variants.length > 0) {
                linksToRender = grupo.medidas_variants.filter(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
            }
            
            if (linksToRender.length > 0) {
                linksToRender.forEach(variant => {
                    const link = (variant.link || '').trim();
                    if (link) {
                        let linkLabel = variant.linkLabel || "Comprar con envío";
                        let iconType = variant.iconType || "local_shipping";

                        const wrapper = document.createElement('div');
                        wrapper.style.display = "flex";
                        wrapper.style.flexDirection = "column";
                        wrapper.style.gap = "4px";
                        wrapper.style.width = "100%";

                        const btn = document.createElement('a');
                        btn.href = link;
                        btn.target = "_blank";
                        btn.className = "btn-primary giant-btn" + (variant.highlight ? " btn-highlight-pulse" : "");
                        btn.style.display = "flex";
                        btn.innerHTML = `<span class="material-symbols-outlined">${iconType}</span><span>${linkLabel}</span>`;
                        
                        btn.onclick = () => {
                            try {
                                if (typeof gtag === 'function') {
                                    gtag('event', 'begin_checkout', {
                                        currency: 'ARS',
                                        items: [{
                                            item_id: product.id,
                                            item_name: product.title,
                                            item_category: categoryName
                                        }]
                                    });
                                }
                            } catch (e) { /* Ignore */ }
                        };
                        
                        let legendText = (variant.legend || '').trim();
                        if (!legendText) {
                            const lLower = link.toLowerCase();
                            if (lLower.includes('mercadolibre.com') || lLower.includes('ml.com') || lLower.includes('mpago.')) {
                                legendText = "Redirige a Mercado Libre (tarjeta, cuotas y envíos a todo el país)";
                            } else if (lLower.includes('wa.me') || lLower.includes('whatsapp.com')) {
                                legendText = "Chateá con nosotros directamente por WhatsApp";
                            } else {
                                legendText = "Redirige a plataforma de pago externa segura";
                            }
                        }

                        const legendEl = document.createElement('span');
                        legendEl.style.fontSize = "0.75rem";
                        legendEl.style.color = "#64748B";
                        legendEl.style.textAlign = "center";
                        legendEl.style.marginTop = "2px";
                        legendEl.style.fontStyle = "italic";
                        legendEl.innerText = legendText;

                        wrapper.appendChild(btn);
                        wrapper.appendChild(legendEl);
                        container.appendChild(wrapper);
                    }
                });
            }
            
            container.style.display = container.children.length === 0 ? 'none' : 'flex';
        }

        // 2. Actualizar visualización de precio
        const priceDisplay = document.getElementById('detail-price-display');
        if (priceDisplay) {
            const isRental = categoryName === 'Alquileres' || product.primaryCatId === 'alquileres';
            const rowEl = priceDisplay.closest('.price-quantity-row');
            
            if (isRental) {
                if (product.price) {
                    priceDisplay.style.display = 'block';
                    priceDisplay.style.textAlign = 'right';
                    priceDisplay.innerHTML = `<span style="font-size:0.9rem; color:#64748B; font-weight:500;">Precio de Alquiler:</span> <span style="font-size:1.6rem; font-weight:800; color:var(--primary-color);">${product.price}</span>`;
                    if (rowEl) rowEl.style.display = 'flex';
                } else {
                    priceDisplay.style.display = 'none';
                    if (rowEl) rowEl.style.display = 'none';
                }
            } else {
                let activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaName);
                if (!activeVariant && (product.isCustomCutting === true || product.id === '69' || product.isCajonProduct === true || product.id === '95') && grupo.medidas_variants && grupo.medidas_variants.length > 0) {
                    activeVariant = grupo.medidas_variants[0];
                }
                if (activeVariant && (activeVariant.showPrice === true || product.isCajonProduct === true || product.id === '95') && activeVariant.price !== undefined && activeVariant.price !== '') {
                    priceDisplay.style.display = 'flex';
                    priceDisplay.style.justifyContent = 'flex-end';
                    priceDisplay.style.alignItems = 'center';
                    priceDisplay.style.gap = '8px';
                    priceDisplay.style.position = 'relative';
                    if (rowEl) rowEl.style.display = 'flex';

                    const formatter = new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                        minimumFractionDigits: 0
                    });
                    
                    const qtyValEl = document.getElementById('qty-value');
                    const qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1', 10) : 1;
                    
                    const isCajon = product.isCajonProduct === true || product.id === '95';
                    const activeCajones = context.cajonesList || window._activeCajonesList || [];
                    const hasCajonesList = isCajon && Array.isArray(activeCajones) && activeCajones.length > 0;
                    const hasCustomCutsList = (product.isCustomCutting === true || product.id === '69') && Array.isArray(customCutsList) && customCutsList.length > 0;

                    let effectiveQty = qtyVal;
                    let effectiveSubtotal = (activeVariant.price || 0) * effectiveQty;

                    if (hasCajonesList) {
                        effectiveQty = activeCajones.reduce((acc, c) => acc + (c.qty || 1), 0);
                        effectiveSubtotal = activeCajones.reduce((acc, c) => acc + (c.subtotal || 0), 0);
                    } else if (hasCustomCutsList) {
                        effectiveQty = customCutsList.reduce((acc, c) => acc + (c.qty || 1), 0);
                        effectiveSubtotal = customCutsList.reduce((acc, c) => acc + (c.subtotal || 0), 0);
                    }

                    let totalDiscountAmount = 0;
                    let discountRule = null;
                    let discountsList = getProductVolumeDiscounts(product, activeVariant);
                    let discountedCutsSummary = [];

                    if (hasCajonesList) {
                        totalDiscountAmount = 0;
                        activeCajones.forEach(box => {
                            const rule = getBestDiscountRule(product, box.qty || 1, activeVariant);
                            if (rule && rule.discountPercent > 0) {
                                const boxSub = box.subtotal || 0;
                                const boxDisc = boxSub * (rule.discountPercent / 100);
                                totalDiscountAmount += boxDisc;
                            }
                        });
                    } else if (hasCustomCutsList) {
                        totalDiscountAmount = 0;
                        customCutsList.forEach(cut => {
                            const rule = getBestDiscountRule(product, cut.qty || 1, activeVariant);
                            if (rule) {
                                let cutDiscount = 0;
                                const cutSub = cut.subtotal || 0;
                                if (rule.discountPercent !== undefined && rule.discountPercent > 0) {
                                    cutDiscount = cutSub * (rule.discountPercent / 100);
                                } else if (rule.discountValue !== undefined && rule.discountValue > 0) {
                                    const minUnits = rule.minQty !== undefined ? rule.minQty : rule.minUnits;
                                    cutDiscount = Math.floor((cut.qty || 1) / minUnits) * rule.discountValue;
                                }
                                if (cutDiscount > 0) {
                                    totalDiscountAmount += cutDiscount;
                                    discountedCutsSummary.push({ cut, rule, discountAmount: cutDiscount });
                                }
                            }
                        });
                        if (discountedCutsSummary.length > 0) {
                            discountRule = discountedCutsSummary[0].rule;
                        }
                    } else {
                        discountRule = getBestDiscountRule(product, effectiveQty, activeVariant);
                        if (discountRule) {
                            if (discountRule.discountPercent !== undefined && discountRule.discountPercent > 0) {
                                totalDiscountAmount = effectiveSubtotal * (discountRule.discountPercent / 100);
                            } else if (discountRule.discountValue !== undefined && discountRule.discountValue > 0) {
                                const minUnits = discountRule.minQty !== undefined ? discountRule.minQty : discountRule.minUnits;
                                totalDiscountAmount = Math.floor(effectiveQty / minUnits) * discountRule.discountValue;
                            }
                        }
                    }

                    if (totalDiscountAmount > 0) {
                        const originalTotalPrice = effectiveSubtotal;
                        const totalPrice = originalTotalPrice - totalDiscountAmount;
                        const formattedOriginalPrice = formatter.format(originalTotalPrice);
                        const formattedTotalPrice = formatter.format(totalPrice);
                        const effectivePct = Math.round((totalDiscountAmount / originalTotalPrice) * 100);
                        const badgeText = effectivePct > 0 ? `${effectivePct}% OFF` : `-$${formatter.format(totalDiscountAmount).replace('$', '').trim()}`;
                        
                        priceDisplay.innerHTML = `
                            <div style="display: flex; flex-direction: column; align-items: flex-end;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="text-decoration: line-through; color: #94A3B8; font-size: 0.95rem; font-weight: 500;">${formattedOriginalPrice}</span>
                                    <span style="background-color: #10B981; color: white; font-size: 0.72rem; font-weight: 700; padding: 2px 6px; border-radius: 12px; font-family: var(--font-main);">${badgeText}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span style="font-size:1.65rem; font-weight:900; color:#c0510a; line-height: 1.2;">${formattedTotalPrice}</span>
                                    <div class="price-info-wrapper" style="position: relative; display: inline-flex; align-items: center;">
                                        <span class="material-symbols-outlined price-info-icon" style="font-size: 20px; color: #94A3B8; cursor: pointer; user-select: none; transition: color 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px;">help_outline</span>
                                        <div class="price-tooltip" style="display: none; position: absolute; bottom: 125%; right: 0; width: 250px; background: #1E293B; color: #FFFFFF; padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.78rem; line-height: 1.4; font-weight: 500; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; pointer-events: none; opacity: 0; transition: opacity 0.2s ease; box-sizing: border-box;">
                                            Precio en efectivo/transferencia para retirar por el taller (no incluye impuestos ni envío).
                                            <div style="position: absolute; top: 100%; right: 8px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #1E293B;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        const formattedPrice = formatter.format(effectiveSubtotal);
                        priceDisplay.innerHTML = `
                            <span style="font-size:1.65rem; font-weight:900; color:#c0510a; line-height: 1.2;">${formattedPrice}</span>
                            <div class="price-info-wrapper" style="position: relative; display: inline-flex; align-items: center;">
                                <span class="material-symbols-outlined price-info-icon" style="font-size: 20px; color: #94A3B8; cursor: pointer; user-select: none; transition: color 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px;">help_outline</span>
                                <div class="price-tooltip" style="display: none; position: absolute; bottom: 125%; right: 0; width: 250px; background: #1E293B; color: #FFFFFF; padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.78rem; line-height: 1.4; font-weight: 500; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; pointer-events: none; opacity: 0; transition: opacity 0.2s ease; box-sizing: border-box;">
                                    Precio en efectivo/transferencia para retirar por el taller (no incluye impuestos ni envío).
                                    <div style="position: absolute; top: 100%; right: 8px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #1E293B;"></div>
                                </div>
                            </div>
                        `;
                    }

                    // Banner de descuentos por volumen
                    const discountBanner = document.getElementById('detail-qty-discount-banner');
                    if (discountBanner) {
                        if (discountsList && discountsList.length > 0) {
                            const tiersText = [...discountsList]
                                .sort((a, b) => (a.minQty !== undefined ? a.minQty : a.minUnits) - (b.minQty !== undefined ? b.minQty : b.minUnits))
                                .map(d => {
                                    const minU = d.minQty !== undefined ? d.minQty : d.minUnits;
                                    const parts = [];
                                    if (d.discountPercent > 0) parts.push(`${d.discountPercent}% OFF prod.`);
                                    if (d.shippingDiscountPercent > 0) parts.push(d.shippingDiscountPercent >= 100 ? 'Envío GRATIS' : `${d.shippingDiscountPercent}% OFF envío`);
                                    return `${minU}+ uds: ${parts.join(' + ') || (d.discountPercent + '% OFF')}`;
                                })
                                .join(' | ');

                            if (hasCustomCutsList) {
                                if (discountedCutsSummary.length > 0) {
                                    discountBanner.style.display = 'block';
                                    discountBanner.style.background = '#f0fdf4';
                                    discountBanner.style.border = '1px solid #bbf7d0';
                                    discountBanner.style.color = '#15803d';
                                    discountBanner.innerHTML = `🎉 ¡Descuento por cantidad aplicado en cortes idénticos! Ahorrás <strong>$${formatter.format(totalDiscountAmount).replace('$', '').trim()}</strong>.`;
                                } else {
                                    discountBanner.style.display = 'block';
                                    discountBanner.style.background = '#eff6ff';
                                    discountBanner.style.border = '1px solid #bfdbfe';
                                    discountBanner.style.color = '#0369a1';
                                    discountBanner.innerHTML = `🏷️ Descuentos por cantidad (mismas dimensiones): <strong>${tiersText}</strong>`;
                                }
                            } else if (discountRule) {
                                discountBanner.style.display = 'block';
                                discountBanner.style.background = '#f0fdf4';
                                discountBanner.style.border = '1px solid #bbf7d0';
                                discountBanner.style.color = '#15803d';
                                const activeParts = [];
                                if (discountRule.discountPercent > 0) activeParts.push(`<strong>${discountRule.discountPercent}% OFF en producto</strong>`);
                                if (discountRule.shippingDiscountPercent > 0) {
                                    activeParts.push(discountRule.shippingDiscountPercent >= 100 ? '<strong>ENVÍO GRATIS</strong>' : `<strong>${discountRule.shippingDiscountPercent}% OFF en envío</strong>`);
                                }
                                discountBanner.innerHTML = `🎉 ¡Llevando ${effectiveQty} uds tenés ${activeParts.join(' + ') || 'descuento especial'}!`;
                            } else {
                                discountBanner.style.display = 'block';
                                discountBanner.style.background = '#eff6ff';
                                discountBanner.style.border = '1px solid #bfdbfe';
                                discountBanner.style.color = '#0369a1';
                                discountBanner.innerHTML = `🏷️ Descuentos por cantidad: <strong>${tiersText}</strong>`;
                            }
                        } else {
                            discountBanner.style.display = 'none';
                        }
                    }

                    // Tooltip hover / click
                    const wrapper = priceDisplay.querySelector('.price-info-wrapper');
                    const tooltip = priceDisplay.querySelector('.price-tooltip');
                    const icon = priceDisplay.querySelector('.price-info-icon');

                    if (wrapper && tooltip && icon) {
                        const showTooltip = () => {
                            icon.style.color = 'var(--primary-color)';
                            tooltip.style.display = 'block';
                            setTimeout(() => { tooltip.style.opacity = '1'; }, 10);
                        };
                        const hideTooltip = () => {
                            icon.style.color = '#94A3B8';
                            tooltip.style.opacity = '0';
                            setTimeout(() => { tooltip.style.display = 'none'; }, 200);
                        };

                        wrapper.addEventListener('mouseenter', showTooltip);
                        wrapper.addEventListener('mouseleave', hideTooltip);

                        icon.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const isVisible = tooltip.style.display === 'block' && tooltip.style.opacity === '1';
                            if (isVisible) hideTooltip(); else showTooltip();
                        });

                        document.addEventListener('click', hideTooltip);
                    }
                } else {
                    priceDisplay.style.display = 'flex';
                    priceDisplay.style.justifyContent = 'flex-end';
                    priceDisplay.style.alignItems = 'center';
                    priceDisplay.style.position = 'relative';
                    if (rowEl) rowEl.style.display = 'flex';
                    
                    priceDisplay.innerHTML = `
                        <span style="font-size:1.1rem; font-weight:800; color:#c0510a; background: #FFF4E6; border: 1px solid #FFE8CC; padding: 4px 10px; border-radius: 8px; line-height: 1.2; display: inline-flex; align-items: center; gap: 4px;">
                            💬 Consultar precio
                        </span>
                    `;
                }
            }
        }

        // 3. Render de Mejor Costo de Envío Inteligente debajo del precio
        if (typeof window.renderShippingBestPriceBadge === 'function') {
            window.renderShippingBestPriceBadge(context);
        }

        // 4. Botón de retiro / consulta directa por WhatsApp
        const btnPickup = document.getElementById('btn-buy-pickup');
        if (btnPickup) {
            btnPickup.href = `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(context))}`;
        }
    }

    window.getProductVolumeDiscounts = getProductVolumeDiscounts;
    window.getBestDiscountRule = getBestDiscountRule;
    window.buildWhatsAppMessage = buildWhatsAppMessage;
    window.updateProductBuyButton = updateProductBuyButton;
})();
