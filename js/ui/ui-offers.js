// js/ui-offers.js
// --- FRONTEND OFFERS & COMBOS MODULE ---

(function() {
    let timerInterval = null;
    let selectedOfferForModal = null;

    window.getGlobalUserZipCode = function() {
        if (window.UserDataManager && typeof window.UserDataManager.getZipCode === 'function') {
            return window.UserDataManager.getZipCode();
        }
        return localStorage.getItem('user_offers_cp') || '';
    };

    window.offersValidatedCP = window.getGlobalUserZipCode();

    window.initOffersFrontend = function() {
        startOffersCountdownTimer();
        setupOffersCPValidator();
        window.renderOffersFrontend();

        const closeModalBtn = document.getElementById('btn-close-offer-detail-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                closeOfferDetailModal();
            });
        }

        const btnAddComboToCart = document.getElementById('btn-add-combo-to-cart');
        if (btnAddComboToCart) {
            btnAddComboToCart.addEventListener('click', () => {
                if (selectedOfferForModal) {
                    addOfferToCart(selectedOfferForModal);
                    closeOfferDetailModal();
                }
            });
        }

        window.addEventListener('latarima:cp-updated', (e) => {
            const updatedCp = (e && e.detail && typeof e.detail.zipCode === 'string')
                ? e.detail.zipCode
                : window.getGlobalUserZipCode();
            window.offersValidatedCP = updatedCp || '';
            if (updatedCp) {
                localStorage.setItem('user_offers_cp', updatedCp);
            } else {
                localStorage.removeItem('user_offers_cp');
            }
            const cpInput = document.getElementById('offers-cp-input');
            if (cpInput) cpInput.value = updatedCp || '';
            updateOffersCPStatusDisplay();
            window.renderOffersFrontend();
        });
    };

    window.openUserProfileModal = async function(...args) {
        if (typeof window.ensureUserProfileModalLoaded === 'function') {
            await window.ensureUserProfileModalLoaded();
        }
        if (typeof window.openUserProfileModal === 'function' && !window.openUserProfileModal._isStub) {
            return window.openUserProfileModal(...args);
        }
    };
    window.openUserProfileModal._isStub = true;

    function setupOffersCPValidator() {
        const btnOpenModal = document.getElementById('btn-open-user-profile-modal');
        if (btnOpenModal) {
            btnOpenModal.onclick = () => {
                if (window.openUserProfileModal) window.openUserProfileModal();
            };
        }

        window.offersValidatedCP = window.getGlobalUserZipCode();
        updateOffersCPStatusDisplay();
    }

    function updateOffersCPStatusDisplay() {
        const statusText = document.getElementById('offers-cp-status-text');
        const titleText = document.getElementById('offers-cp-title');
        const iconBadge = document.getElementById('offers-cp-icon-badge');
        const btnProfileLabel = document.getElementById('btn-profile-label');
        const cpBar = document.getElementById('offers-cp-bar');

        if (!cpBar) return;

        const isComplete = window.UserDataManager && typeof window.UserDataManager.hasCompleteProfile === 'function'
            ? window.UserDataManager.hasCompleteProfile()
            : false;

        if (isComplete) {
            cpBar.style.display = 'none';
            return;
        }

        cpBar.style.display = 'flex';
        window.offersValidatedCP = window.getGlobalUserZipCode();

        if (!window.offersValidatedCP) {
            if (statusText) {
                statusText.innerHTML = '📍 Ingresá tu CP para activar envíos y beneficios';
                statusText.style.color = '#ffffff';
            }
            if (btnProfileLabel) btnProfileLabel.textContent = '⚡ Cargar Datos';
            if (cpBar) {
                cpBar.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
                cpBar.style.borderColor = '#22c55e';
            }
            if (iconBadge) {
                iconBadge.style.background = 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)';
                iconBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">distance</span>';
            }
            return;
        }

        if (btnProfileLabel) btnProfileLabel.textContent = `CP ${window.offersValidatedCP}`;

        if (typeof window.lookupPostalCode === 'function') {
            const res = window.lookupPostalCode(window.offersValidatedCP);
            if (res && res.hasLocalMatch !== false) {
                statusText.innerHTML = `🎉 <strong>¡Envío Gratis para ${res.localidad}!</strong> (CP ${res.cp})`;
                statusText.style.color = '#14532d';
                if (cpBar) {
                    cpBar.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                    cpBar.style.borderColor = '#86efac';
                }
                if (iconBadge) {
                    iconBadge.style.background = '#16a34a';
                    iconBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">verified</span>';
                }
            } else {
                statusText.innerHTML = `📦 <strong>Envíos al Interior (CP ${window.offersValidatedCP})</strong> vía Mercado Libre / Transporte.`;
                statusText.style.color = '#78350f';
                if (cpBar) {
                    cpBar.style.background = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                    cpBar.style.borderColor = '#fde047';
                }
                if (iconBadge) {
                    iconBadge.style.background = '#d97706';
                    iconBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">inventory_2</span>';
                }
            }
        } else {
            statusText.innerHTML = `CP ingresado: <strong>${window.offersValidatedCP}</strong>`;
        }
    }
    window.updateOffersCPStatusDisplay = updateOffersCPStatusDisplay;

    function renderUniversalCPBar(containerId, options = {}) {
        const targetContainer = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!targetContainer) return;

        const isComplete = window.UserDataManager && typeof window.UserDataManager.hasCompleteProfile === 'function'
            ? window.UserDataManager.hasCompleteProfile()
            : false;

        const barId = options.barId || `cp-bar-${Math.random().toString(36).substr(2, 6)}`;
        const statusTextId = `${barId}-status-text`;
        const iconBadgeId = `${barId}-icon-badge`;
        const btnLabelId = `${barId}-btn-label`;

        targetContainer.innerHTML = `
            <div id="${barId}" class="offers-cp-bar" style="margin-bottom: ${options.marginBottom || '1rem'};">
                <div class="offers-cp-info-group">
                    <div id="${iconBadgeId}" class="offers-cp-icon-badge">
                        <span class="material-symbols-outlined" style="font-size: 16px;">distance</span>
                    </div>
                    <div id="${statusTextId}" class="offers-cp-status-text">
                        📍 Ingresá tu CP para verificar envíos y bonificaciones
                    </div>
                </div>
                <button type="button" class="offers-cp-action-btn" id="${barId}-btn-action">
                    <span class="material-symbols-outlined" style="font-size: 16px; color: #ffffff;">tune</span>
                    <span id="${btnLabelId}">⚡ Cargar Datos</span>
                </button>
            </div>
        `;

        const actionBtn = document.getElementById(`${barId}-btn-action`);
        if (actionBtn) {
            actionBtn.onclick = () => {
                if (window.openUserProfileModal) window.openUserProfileModal();
            };
        }

        const updateInstance = () => {
            const cpBar = document.getElementById(barId);
            const statusText = document.getElementById(statusTextId);
            const iconBadge = document.getElementById(iconBadgeId);
            const btnProfileLabel = document.getElementById(btnLabelId);
            if (!cpBar) return;

            const currentCp = window.getGlobalUserZipCode();

            if (!currentCp) {
                if (statusText) {
                    statusText.innerHTML = options.noCpText || '📍 Ingresá tu CP para calcular envíos y bonificaciones';
                    statusText.style.color = '#ffffff';
                }
                if (btnProfileLabel) btnProfileLabel.textContent = '⚡ Cargar Datos';
                cpBar.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
                cpBar.style.borderColor = '#22c55e';
                if (iconBadge) {
                    iconBadge.style.background = 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)';
                    iconBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">distance</span>';
                }
                return;
            }

            if (btnProfileLabel) btnProfileLabel.textContent = `CP ${currentCp}`;

            if (typeof window.lookupPostalCode === 'function') {
                const res = window.lookupPostalCode(currentCp);
                if (res && res.hasLocalMatch !== false) {
                    statusText.innerHTML = `🎉 <strong>¡Cobertura directa para ${res.localidad}!</strong> (CP ${res.cp})`;
                    statusText.style.color = '#14532d';
                    cpBar.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                    cpBar.style.borderColor = '#86efac';
                    if (iconBadge) {
                        iconBadge.style.background = '#16a34a';
                        iconBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">verified</span>';
                    }
                } else {
                    statusText.innerHTML = `📦 <strong>Zona Interior (CP ${currentCp})</strong> - Expreso / Transporte a coordinar.`;
                    statusText.style.color = '#78350f';
                    cpBar.style.background = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                    cpBar.style.borderColor = '#fde047';
                    if (iconBadge) {
                        iconBadge.style.background = '#d97706';
                        iconBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">inventory_2</span>';
                    }
                }
            } else {
                statusText.innerHTML = `CP ingresado: <strong>${currentCp}</strong>`;
            }
        };

        updateInstance();

        if (targetContainer._cpUpdatedHandler) {
            window.removeEventListener('latarima:cp-updated', targetContainer._cpUpdatedHandler);
        }
        targetContainer._cpUpdatedHandler = () => {
            updateInstance();
        };
        targetContainer.dataset.cpListenerBound = 'true';
        window.addEventListener('latarima:cp-updated', targetContainer._cpUpdatedHandler);
    }

    window.renderUniversalCPBar = renderUniversalCPBar;

    function startOffersCountdownTimer() {
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            updateCountdownLabels();
        }, 1000);
    }

    function formatTimeRemaining(expirationDate) {
        if (!expirationDate) return null;
        const diff = new Date(expirationDate).getTime() - new Date().getTime();
        if (diff <= 0) return { expired: true, text: 'Expirada' };

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n) => String(n).padStart(2, '0');
        const text = days > 0 
            ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
            : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        return { expired: false, text, days, hours, minutes, seconds };
    }

    function updateCountdownLabels() {
        document.querySelectorAll('[data-offer-expiration]').forEach(el => {
            const exp = el.getAttribute('data-offer-expiration');
            const res = formatTimeRemaining(exp);
            if (res) {
                if (res.expired) {
                    el.textContent = '⏳ Expirada';
                    el.classList.add('expired');
                } else {
                    el.textContent = `⏳ ${res.text}`;
                }
            }
        });
    }

    window.getFreeShippingProducts = function() {
        const sourceData = (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (typeof productsData !== 'undefined' ? productsData : []);

        const freeShipProducts = [];
        const seenIds = new Set();
        const cortesConf = window.cortesConfig || null;

        if (Array.isArray(sourceData)) {
            sourceData.forEach(cat => {
                if (cat && cat.visible === false) return;
                if (Array.isArray(cat.products)) {
                    cat.products.forEach(prod => {
                        if (!prod || prod.visible === false || seenIds.has(prod.id)) return;
                        
                        const shipConf = prod.shippingConfig || {};

                        // Modo 1: Envío gratis directo habilitado
                        const isDirectFree = !!(
                            shipConf.isFreeShipping === true ||
                            prod.isFreeShipping === true ||
                            prod.shippingType === 'free' ||
                            shipConf.isFree === true ||
                            (Array.isArray(prod.variants) && prod.variants.some(v => v.shippingConfig?.isFreeShipping || v.isFreeShipping))
                        );

                        // Modo 2: Envío gratis por logística o flete según cantidad de unidades
                        let minUnits = parseInt(shipConf.logisticaFreeMinUnits) || parseInt(shipConf.fleteFreeMinUnits) || parseInt(prod.logisticaFreeMinUnits) || parseInt(prod.fleteFreeMinUnits) || 0;

                        if (!minUnits && Array.isArray(prod.variants)) {
                            for (const v of prod.variants) {
                                const vMin = parseInt(v.shippingConfig?.logisticaFreeMinUnits) || parseInt(v.shippingConfig?.fleteFreeMinUnits) || parseInt(v.logisticaFreeMinUnits) || parseInt(v.fleteFreeMinUnits) || 0;
                                if (vMin > 0) {
                                    minUnits = vMin;
                                    break;
                                }
                            }
                        }

                        // Modo 3: Cortes de Madera (categoría cortes-madera o isCustomCutting)
                        const isCortes = (
                            prod.isCustomCutting === true ||
                            prod.id === '67' || prod.id === '68' || prod.id === '69' ||
                            prod.primaryCatId === 'cortes-madera' ||
                            (Array.isArray(prod.categories) && prod.categories.includes('cortes-madera')) ||
                            cat.id === 'cortes-madera' || cat.slug === 'cortes-madera'
                        );

                        let cortesFreeShipping = false;
                        let cortesMinUnits = 0;
                        let cortesPromoLabel = '';
                        let cortesDiscountLabel = '';

                        if (isCortes && cortesConf) {
                            // Beneficios de flete / logística configurados en Panel de Cortes
                            const flexBen = cortesConf.logistica?.flex?.beneficios;
                            const fleteBen = cortesConf.logistica?.flete?.beneficios;
                            const flexActivo = cortesConf.logistica?.flex?.activo !== false;
                            const fleteActivo = cortesConf.logistica?.flete?.activo !== false;

                            if (flexActivo && flexBen && flexBen.activo !== false && flexBen.envioGratisMin > 0) {
                                cortesFreeShipping = true;
                                cortesMinUnits = flexBen.envioGratisMin;
                                cortesPromoLabel = `Envío Gratis desde ${flexBen.envioGratisMin} u. (Flex)`;
                            } else if (fleteActivo && fleteBen && fleteBen.activo !== false && fleteBen.envioGratisMin > 0) {
                                cortesFreeShipping = true;
                                cortesMinUnits = fleteBen.envioGratisMin;
                                cortesPromoLabel = `Envío Gratis desde ${fleteBen.envioGratisMin} u. (Flete)`;
                            }

                            // Descuentos por cantidad en cortes
                            const descConf = cortesConf.descuentos;
                            if (descConf && descConf.activo !== false && Array.isArray(descConf.escalas) && descConf.escalas.length > 0) {
                                const maxEscala = descConf.escalas.reduce((prev, curr) => (curr.discountPercent > prev.discountPercent) ? curr : prev, descConf.escalas[0]);
                                if (maxEscala && maxEscala.discountPercent > 0) {
                                    cortesDiscountLabel = `Hasta ${maxEscala.discountPercent}% OFF x cantidad`;
                                }
                            }
                        }

                        const isQuantityFree = minUnits > 0;

                        if (isDirectFree || isQuantityFree || cortesFreeShipping || (isCortes && cortesDiscountLabel)) {
                            seenIds.add(prod.id);
                            freeShipProducts.push({
                                product: prod,
                                catName: cat.name || '',
                                isDirectFree: isDirectFree,
                                minUnits: minUnits || cortesMinUnits,
                                isCortes: isCortes,
                                promoLabel: cortesPromoLabel,
                                discountLabel: cortesDiscountLabel
                            });
                        }
                    });
                }
            });
        }

        return freeShipProducts;
    };

    window.extractProductLivePrice = function(product, acabadoName = '', medidaName = '') {
        if (!product) return 0;

        // 1. Precios directos
        let pVal = parseFloat(product.price || product.precio || product.base_price || product.price_base) || 0;
        if (pVal > 0 && !acabadoName && !medidaName) return pVal;

        // 2. Buscar en acabados_groups
        if (Array.isArray(product.acabados_groups) && product.acabados_groups.length > 0) {
            let group = null;
            if (acabadoName) {
                group = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === acabadoName.trim().toLowerCase());
            }
            if (!group) group = product.acabados_groups[0];

            if (group && Array.isArray(group.medidas_variants) && group.medidas_variants.length > 0) {
                let variant = null;
                if (medidaName) {
                    variant = group.medidas_variants.find(m => (m.medida || m.name || '').trim().toLowerCase() === medidaName.trim().toLowerCase());
                }
                if (!variant) variant = group.medidas_variants.find(m => m.default) || group.medidas_variants[0];

                if (variant) {
                    const vPrice = parseFloat(variant.price || variant.precio || variant.cost_price) || 0;
                    if (vPrice > 0) return vPrice;
                }
            }
        }

        // 3. Buscar en variants array plano
        if (Array.isArray(product.variants) && product.variants.length > 0) {
            let variant = null;
            if (medidaName || acabadoName) {
                variant = product.variants.find(v => 
                    (v.medida || v.name || '').trim().toLowerCase() === (medidaName || acabadoName).trim().toLowerCase()
                );
            }
            if (!variant) variant = product.variants[0];
            if (variant) {
                const vPrice = parseFloat(variant.price || variant.precio || variant.cost_price) || 0;
                if (vPrice > 0) return vPrice;
            }
        }

        return pVal;
    }

    window.syncOfferLivePrices = function(offer) {
        if (!offer || !offer.product_items || !Array.isArray(offer.product_items) || offer.product_items.length === 0) {
            return offer;
        }

        let liveSubtotal = 0;

        offer.product_items.forEach(item => {
            const prodId = item.id || item.productId;
            if (!prodId) return;

            let liveProduct = null;
            if (typeof window.findProductById === 'function') {
                const res = window.findProductById(prodId);
                if (res) liveProduct = res.product;
            }

            if (!liveProduct && typeof window.sessionProducts !== 'undefined' && Array.isArray(window.sessionProducts)) {
                for (const cat of window.sessionProducts) {
                    if (Array.isArray(cat.products)) {
                        const found = cat.products.find(p => p.id === prodId);
                        if (found) { liveProduct = found; break; }
                    }
                }
            }

            if (liveProduct) {
                const liveUnitPrice = extractProductLivePrice(liveProduct, item.acabado || item.variant, item.medida);
                if (liveUnitPrice > 0) {
                    item.unitPrice = liveUnitPrice;
                    item.price = liveUnitPrice;
                }

                // Sincronizar imagen si cambió en el catálogo
                const liveCover = Array.isArray(liveProduct.image) ? liveProduct.image[0] : liveProduct.image;
                if (liveCover) {
                    item.image = liveCover;
                }
            }

            const itemQty = parseInt(item.quantity, 10) || 1;
            const itemPrice = item.unitPrice || item.price || 0;
            liveSubtotal += itemPrice * itemQty;
        });

        if (liveSubtotal > 0) {
            const oldSubtotal = offer.subtotalPrice || liveSubtotal;
            const oldOfferPrice = offer.offerPrice || liveSubtotal;

            offer.subtotalPrice = liveSubtotal;

            if (offer.discountPercent && Number(offer.discountPercent) > 0) {
                offer.offerPrice = Math.round(liveSubtotal * (1 - Number(offer.discountPercent) / 100));
            } else if (oldSubtotal > 0 && oldOfferPrice < oldSubtotal) {
                const ratio = oldOfferPrice / oldSubtotal;
                offer.offerPrice = Math.round(liveSubtotal * ratio);
                offer.discountPercent = Math.round((1 - ratio) * 100);
            } else {
                offer.offerPrice = liveSubtotal;
            }
        }

        return offer;
    };

    window.createFreeShippingProductCardElement = function(item) {
        let { product, catName, isDirectFree, minUnits, isCortes, promoLabel, discountLabel } = item;
        
        // Sincronizar producto vivo desde el catálogo
        if (typeof window.findProductById === 'function' && product && product.id) {
            const liveRes = window.findProductById(product.id);
            if (liveRes && liveRes.product) product = liveRes.product;
        }

        const card = document.createElement('div');
        card.className = 'offer-feed-card category-card';
        card.style.cssText = 'position: relative; cursor: pointer; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; border: 1px solid rgba(212, 175, 55, 0.25); display: flex; flex-direction: column; justify-content: space-between;';

        const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
        const priceVal = extractProductLivePrice(product);
        const formattedPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(priceVal || 0);

        // Evaluar si el CP validado en la sección Ofertas califica para envío gratis local
        let cpQualified = null; // null = no verificado aun
        if (window.offersValidatedCP && typeof window.lookupPostalCode === 'function') {
            const cpRes = window.lookupPostalCode(window.offersValidatedCP);
            cpQualified = (cpRes && cpRes.hasLocalMatch !== false);
        }

        let badgesHTML = '';
        if (isCortes) {
            // Badges específicos para productos de Cortes de Madera
            let badgesList = [];
            if (discountLabel) {
                badgesList.push(`
                    <div style="background: #dc2626; color: #ffffff; font-weight: 800; font-size: 0.68rem; padding: 3px 8px; border-radius: 20px; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4); display: flex; align-items: center; gap: 4px;">
                        🔥 ${discountLabel}
                    </div>
                `);
            }
            if (promoLabel) {
                badgesList.push(`
                    <div style="background: #16a34a; color: #ffffff; font-weight: 800; font-size: 0.68rem; padding: 3px 8px; border-radius: 20px; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.4); display: flex; align-items: center; gap: 4px;">
                        🚚 ${promoLabel}
                    </div>
                `);
            } else if (cpQualified === true && minUnits > 0) {
                badgesList.push(`
                    <div style="background: #16a34a; color: #ffffff; font-weight: 800; font-size: 0.68rem; padding: 3px 8px; border-radius: 20px; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.4); display: flex; align-items: center; gap: 4px;">
                        🎉 ENVÍO GRATIS (Mín. ${minUnits} U.)
                    </div>
                `);
            }
            if (badgesList.length > 0) {
                badgesHTML = `
                    <div style="position: absolute; top: 8px; left: 8px; z-index: 5; display: flex; flex-direction: column; gap: 4px;">
                        ${badgesList.join('')}
                    </div>
                `;
            }
        } else if (cpQualified === true) {
            // CP Validado y coincide con ruta de envío gratis local estándar
            const shipBadgeText = isDirectFree 
                ? '🎉 ENVÍO GRATIS EN TU ZONA' 
                : `🎉 ENVÍO GRATIS (Mín. ${minUnits} U.)`;
            
            badgesHTML = `
                <div style="position: absolute; top: 8px; left: 8px; z-index: 5; background: #16a34a; color: #ffffff; font-weight: 800; font-size: 0.68rem; padding: 3px 8px; border-radius: 20px; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.4); display: flex; align-items: center; gap: 4px;">
                    ${shipBadgeText}
                </div>
            `;
        }

        const cardSubdesc = product.subtitle || product.description || 'Producto destacado con beneficio de envío.';
        const promoTagBottom = isCortes
            ? (discountLabel ? `⚡ ${discountLabel}` : '🪵 Corte en Taller')
            : '⚡ Precio Promocional';

        card.innerHTML = `
            <div class="offer-photo-wrapper" style="position: relative; width: 100%; aspect-ratio: 3 / 2; overflow: hidden; background: #1a1a1a;">
                <img src="${productCover}" class="category-card-img loaded" alt="${product.title}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="offer-gradient-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; height: 60%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);"></div>

                ${badgesHTML}
            </div>

            <div style="padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; flex: 1;">
                <div>
                    <h3 style="margin: 0 0 0.35rem 0; font-size: 1.1rem; font-weight: 800; color: var(--text-main); line-clamp: 1; -webkit-line-clamp: 1; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">${product.title}</h3>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.82rem; color: var(--text-muted); line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35;">${cardSubdesc}</p>
                </div>

                <div style="background: #fafafa; border: 1px solid #f0f0f0; border-radius: 10px; padding: 0.6rem 0.8rem;">
                    <div style="display: flex; align-items: baseline; justify-content: flex-end; gap: 6px;">
                        <span style="font-size: 1.25rem; font-weight: 900; color: #dc2626;">${formattedPrice}</span>
                    </div>

                    <div style="margin-top: 2px; font-size: 0.78rem; color: #16a34a; font-weight: 800; text-align: right;">
                        ${promoTagBottom}
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            if (window.showProductDetail) window.showProductDetail(product, catName);
        });

        return card;
    };

    window.activeOffersRubro = 'todas';

    window.renderOffersRubrosTabs = function(activeOffers, uniqueFreeShipItems) {
        const tabsContainer = document.getElementById('offers-rubros-tabs-container');
        if (!tabsContainer) return;

        // Obtener lista oficial de rubros del sitio
        let rubrosList = [];
        try {
            if (window.parent && window.parent.siteConfig && window.parent.siteConfig.rubros) {
                rubrosList = window.parent.siteConfig.rubros;
            } else if (window.siteConfig && window.siteConfig.rubros) {
                rubrosList = window.siteConfig.rubros;
            }
        } catch (e) {
            if (window.siteConfig && window.siteConfig.rubros) {
                rubrosList = window.siteConfig.rubros;
            }
        }

        if (!Array.isArray(rubrosList) || rubrosList.length === 0) {
            rubrosList = [{ id: 'carpinteria', name: 'Carpintería' }];
        }

        const visibleRubros = rubrosList.filter(r => r.visible !== false);

        if (visibleRubros.length <= 1) {
            tabsContainer.classList.add('single-rubro');
            tabsContainer.innerHTML = '';
            tabsContainer.style.display = 'none';
            if (visibleRubros.length === 1) {
                window.activeOffersRubro = visibleRubros[0].id;
            }
            return;
        } else {
            tabsContainer.classList.remove('single-rubro');
            tabsContainer.style.display = 'flex';
        }

        // Construir arreglo de pestañas directamente con los rubros visibles (sin pestaña TODAS)
        const allTabs = [...visibleRubros];

        // Asegurar que activeOffersRubro coincida con un rubro visible existente
        const activeStillVisible = allTabs.some(r => r.id === window.activeOffersRubro);
        if (!activeStillVisible && allTabs.length > 0) {
            window.activeOffersRubro = allTabs[0].id;
        }

        tabsContainer.innerHTML = '';
        allTabs.forEach(r => {
            const isActive = r.id === window.activeOffersRubro;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = isActive ? 'rubros-tab active' : 'rubros-tab';
            
            // Forzar ancho geométrico exacto por JS inline como en categorias / catalogo / buscador
            const pct = (100 / allTabs.length).toFixed(4);
            btn.style.width = pct + '%';
            btn.style.flex = `0 0 ${pct}%`;

            btn.innerHTML = r.name;
            btn.addEventListener('click', () => {
                if (window.activeOffersRubro !== r.id) {
                    window.activeOffersRubro = r.id;
                    window.renderOffersRubrosTabs(activeOffers, uniqueFreeShipItems);
                    window.renderOffersFrontend();
                }
            });
            tabsContainer.appendChild(btn);
        });
    };

    window.renderOffersFrontend = function() {
        if (typeof setupOffersCPValidator === 'function') {
            setupOffersCPValidator();
        }
        if (typeof updateOffersCPStatusDisplay === 'function') {
            updateOffersCPStatusDisplay();
        }

        const container = document.getElementById('offers-grid-container');
        if (!container) return;

        const allOffers = (window.sessionOffers && window.sessionOffers.length > 0)
            ? window.sessionOffers
            : (typeof offersData !== 'undefined' ? offersData : []);

        const activeOffers = allOffers.filter(o => {
            if (o.active === false) return false;
            if (o.hasTimer && o.expirationDate) {
                const expTime = new Date(o.expirationDate).getTime();
                if (!isNaN(expTime) && expTime <= Date.now()) return false;
            }
            return true;
        });

        // Sincronizar precios de las ofertas con los productos vivos del catálogo
        activeOffers.forEach(o => {
            if (window.syncOfferLivePrices) window.syncOfferLivePrices(o);
        });

        // Obtener productos con Envío Gratis activo (Modo 1 y Modo 2)
        const freeShipItems = window.getFreeShippingProducts ? window.getFreeShippingProducts() : [];

        // Prevenir duplicación si una oferta ya contiene ese producto
        const offerProductIds = new Set();
        activeOffers.forEach(o => {
            if (Array.isArray(o.product_items)) {
                o.product_items.forEach(pi => { if (pi.id) offerProductIds.add(pi.id); });
            }
        });

        const uniqueFreeShipItems = freeShipItems.filter(item => !offerProductIds.has(item.product.id));

        // Renderizar barra de pestañas de rubros dinámicas
        if (window.renderOffersRubrosTabs) {
            window.renderOffersRubrosTabs(activeOffers, uniqueFreeShipItems);
        }

        // Auxiliar para resolver el id del rubro del producto/categoría
        const getRubroIdForProduct = (prodId, catObj) => {
            let categoryRubro = null;
            if (prodId && typeof window.findProductById === 'function') {
                const res = window.findProductById(prodId);
                if (res && res.category) {
                    categoryRubro = res.category.rubro || res.category.rubroId || null;
                }
            }
            if (!categoryRubro && typeof window.sessionProducts !== 'undefined' && Array.isArray(window.sessionProducts)) {
                for (const cat of window.sessionProducts) {
                    if (Array.isArray(cat.products) && cat.products.some(p => p.id === prodId)) {
                        categoryRubro = cat.rubro || cat.rubroId || null;
                        break;
                    }
                }
            }
            if (!categoryRubro && catObj) {
                categoryRubro = catObj.rubro || catObj.rubroId || null;
            }

            // Default a 'carpinteria' si no se especifica rubro en la categoría
            return categoryRubro ? String(categoryRubro).trim().toLowerCase() : 'carpinteria';
        };

        const currentRubro = (window.activeOffersRubro && window.activeOffersRubro !== 'todas')
            ? window.activeOffersRubro
            : (window.siteConfig && Array.isArray(window.siteConfig.rubros) && window.siteConfig.rubros.length > 0 ? window.siteConfig.rubros[0].id : 'carpinteria');

        const filteredOffers = activeOffers.filter(offer => {
            if (currentRubro === 'todas' || currentRubro === 'todos') return true;
            let r = offer.rubro || offer.rubroId;
            if (!r && Array.isArray(offer.product_items) && offer.product_items.length > 0) {
                for (const item of offer.product_items) {
                    r = getRubroIdForProduct(item.id || item.productId);
                    if (r) break;
                }
            }
            const offerRubroId = r ? String(r).trim().toLowerCase() : 'carpinteria';
            return offerRubroId === currentRubro;
        });

        const filteredFreeShipItems = uniqueFreeShipItems.filter(item => {
            if (currentRubro === 'todas' || currentRubro === 'todos') return true;
            const itemRubroId = getRubroIdForProduct(item.product?.id, item.product?.category);
            return itemRubroId === currentRubro;
        });

        if (filteredOffers.length === 0 && filteredFreeShipItems.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 56px; opacity: 0.4;">local_offer</span>
                    <h3 style="margin: 0.5rem 0 0.25rem; font-weight: 700; color: var(--text-main);">No hay ofertas vigentes en este rubro</h3>
                    <p style="font-size: 0.9rem;">Probá seleccionar otra pestaña o volvé a consultar más tarde.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        // 1. Renderizar ofertas / combos principales filtrados
        filteredOffers.forEach(offer => {
            const card = createOfferCardElement(offer);
            container.appendChild(card);
        });

        // 2. Renderizar productos con Envío Gratis filtrados
        filteredFreeShipItems.forEach(item => {
            const card = window.createFreeShippingProductCardElement(item);
            container.appendChild(card);
        });

        updateCountdownLabels();
    };

    window.createOfferCardElement = function(offer, isCarousel = false) {
        if (window.syncOfferLivePrices) window.syncOfferLivePrices(offer);
        const stampLabels = {
            'pro-gold': '⭐ PRO GOLD',
            'oportunidad': '🏆 OPORTUNIDAD ÚNICA',
            'relampago': '⚡ RELÁMPAGO',
            'combo': '🎁 COMBO EXCLUSIVO',
            'envio-gratis': '🚚 ENVÍO GRATIS'
        };
        const stampText = stampLabels[offer.stampStyle] || '🔥 OFERTA';

        // Cover picture logic: custom or 2x2 collage
        let coverHTML = '';
        if (offer.customCoverImage) {
            coverHTML = `<img src="${offer.customCoverImage}" class="category-card-img loaded" alt="${offer.title}" loading="lazy">`;
        } else if (offer.product_items && offer.product_items.length >= 2) {
            const items = offer.product_items.slice(0, 4);
            const gridCols = items.length === 2 ? 'grid-template-columns: 1fr 1fr;' : 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;';
            let mosaicHTML = `<div style="display: grid; ${gridCols} width: 100%; height: 100%; gap: 2px; background: #1a1a1a;">`;
            items.forEach(item => {
                mosaicHTML += `<img src="${item.image || 'img/logo_provisional.png'}" style="width: 100%; height: 100%; object-fit: cover;">`;
            });
            mosaicHTML += `</div>`;
            coverHTML = mosaicHTML;
        } else {
            const defaultImg = (offer.product_items && offer.product_items[0]) ? offer.product_items[0].image : 'img/logo_provisional.png';
            coverHTML = `<img src="${defaultImg}" class="category-card-img loaded" alt="${offer.title}" loading="lazy">`;
        }

        const formattedSubtotal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(offer.subtotalPrice || 0);
        const formattedOfferPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(offer.offerPrice || 0);
        const savings = Math.max(0, (offer.subtotalPrice || 0) - (offer.offerPrice || 0));
        const formattedSavings = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(savings);

        if (isCarousel) {
            const card = document.createElement('div');
            card.className = 'category-card offer-carousel-card';
            card.style.cssText = 'position: relative; cursor: pointer; border-radius: var(--radius-md); overflow: hidden;';

            card.innerHTML = `
                <div class="category-card-img-wrapper" style="position: relative;">
                    ${coverHTML}
                </div>

                <!-- Animated Stamp Badge -->
                <div class="stamp-badge ${offer.stampStyle || 'pro-gold'}" style="position: absolute; top: 8px; left: 8px; z-index: 5; font-size: 0.65rem; padding: 0.2rem 0.5rem;">
                    ${stampText}
                </div>

                <!-- Discount Badge -->
                ${offer.discountPercent ? `
                    <div style="position: absolute; top: 8px; right: 8px; z-index: 5; background: #dc2626; color: white; font-weight: 900; font-size: 0.7rem; padding: 2px 7px; border-radius: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                        -${offer.discountPercent}% OFF
                    </div>
                ` : ''}

                <!-- Real-time Countdown Timer Badge -->
                ${offer.hasTimer && offer.expirationDate ? `
                    <div class="offer-countdown-pill" data-offer-expiration="${offer.expirationDate}" style="position: absolute; top: 34px; left: 8px; z-index: 5; background: rgba(0, 0, 0, 0.82); color: #fbbf24; font-weight: 800; font-size: 0.68rem; padding: 2px 7px; border-radius: 12px; font-family: monospace;">
                        ⏳ Cargando...
                    </div>
                ` : ''}

                <!-- Overlay Layer containing Title & Price on top of Image -->
                <div class="category-overlay" style="display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; text-align: left; padding: 0.5rem 0.75rem; background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);">
                    <div style="font-size: 0.92rem; font-weight: 800; color: #ffffff; width: 100%; line-clamp: 1; -webkit-line-clamp: 1; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 4px rgba(0,0,0,0.9);">
                        ${offer.title}
                    </div>
                    <div style="display: flex; align-items: baseline; gap: 6px; margin-top: 2px;">
                        <span style="font-size: 0.72rem; text-decoration: line-through; color: rgba(255,255,255,0.75);">${formattedSubtotal}</span>
                        <span style="font-size: 1.05rem; font-weight: 900; color: #fef08a;">${formattedOfferPrice}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                showOfferDetailModal(offer);
            });

            return card;
        }

        const card = document.createElement('div');
        card.className = 'offer-feed-card';
        card.style.cssText = 'position: relative; cursor: pointer; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; border: 1px solid rgba(212, 175, 55, 0.25);';

        card.innerHTML = `
            <div class="offer-photo-wrapper" style="position: relative; width: 100%; aspect-ratio: 3 / 2; overflow: hidden; background: #1a1a1a;">
                ${coverHTML}
                <div class="offer-gradient-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; height: 60%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);"></div>

                <!-- Animated Stamp Badge -->
                <div class="stamp-badge ${offer.stampStyle || 'pro-gold'}" style="position: absolute; top: 10px; left: 10px; z-index: 5;">
                    ${stampText}
                </div>

                <!-- Discount Badge -->
                ${offer.discountPercent ? `
                    <div style="position: absolute; top: 10px; right: 10px; z-index: 5; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; font-weight: 900; font-size: 0.8rem; padding: 4px 10px; border-radius: 20px; box-shadow: 0 4px 12px rgba(220,38,38,0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                        -${offer.discountPercent}% OFF
                    </div>
                ` : ''}

                <!-- Real-time Countdown Timer Badge -->
                ${offer.hasTimer && offer.expirationDate ? `
                    <div class="offer-countdown-pill" data-offer-expiration="${offer.expirationDate}" style="position: absolute; bottom: 10px; left: 10px; z-index: 5; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); color: #fbbf24; font-weight: 800; font-size: 0.75rem; padding: 4px 10px; border-radius: 30px; border: 1px solid rgba(251, 191, 36, 0.4); font-family: monospace;">
                        ⏳ Cargando...
                    </div>
                ` : ''}
            </div>

            <div style="padding: 1rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0 0 0.35rem 0; font-size: 1.1rem; font-weight: 800; color: var(--text-main); line-clamp: 1; -webkit-line-clamp: 1; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">${offer.title}</h3>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.82rem; color: var(--text-muted); line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35;">${offer.description || 'Combo exclusivo por tiempo limitado.'}</p>
                </div>

                <div style="background: #fafafa; border: 1px solid #f0f0f0; border-radius: 10px; padding: 0.6rem 0.8rem;">
                    <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 6px;">
                        <span style="font-size: 0.8rem; text-decoration: line-through; color: #9ca3af; font-weight: 600;">${formattedSubtotal}</span>
                        <span style="font-size: 1.25rem; font-weight: 900; color: #dc2626;">${formattedOfferPrice}</span>
                    </div>

                    ${savings > 0 ? `
                        <div style="margin-top: 2px; font-size: 0.78rem; color: #16a34a; font-weight: 800; text-align: right;">
                            💰 Ahorrás ${formattedSavings}
                        </div>
                    ` : ''}
                </div>

                ${offer.shippingType === 'free' ? `
                    <div style="margin-top: 0.5rem; font-size: 0.78rem; color: #2563eb; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">local_shipping</span> Envío GRATIS Incluido
                    </div>
                ` : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            openOfferDetailView(offer);
        });

        return card;
    };

    function showOfferInfoModal(type, targetOffer) {
        const existing = document.getElementById('offer-info-modal-overlay');
        if (existing) existing.remove();

        const offer = targetOffer || selectedOfferForModal;
        const payConf = offer?.paymentConfig || {};
        const isTrans = payConf.transferEnabled !== false;
        const isLink = payConf.linkEnabled !== false;
        const isCredit = payConf.creditEnabled !== false;

        let dynamicPaymentsHtml = '';
        if (isTrans) {
            dynamicPaymentsHtml += `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:10px 12px; border-radius:12px;">
                    <strong style="color:#166534; display:block; margin-bottom:2px;">🏦 Transferencia Bancaria Directa</strong>
                    <span style="font-size:0.8rem; color:#15803d;">Aboná por CBU / ALIAS manteniendo el precio de oferta bonificado sin aumentos.</span>
                </div>`;
        }
        if (isLink) {
            dynamicPaymentsHtml += `
                <div style="background:#f0f9ff; border:1px solid #bae6fd; padding:10px 12px; border-radius:12px;">
                    <strong style="color:#0369a1; display:block; margin-bottom:2px;">🔗 Link de Pago / Débito</strong>
                    <span style="font-size:0.8rem; color:#0284c7;">Cobro directo con Mercado Pago, tarjetas de débito y dinero en cuenta.</span>
                </div>`;
        }
        if (isCredit) {
            dynamicPaymentsHtml += `
                <div style="background:#fffdf0; border:1px solid #fde68a; padding:10px 12px; border-radius:12px;">
                    <strong style="color:#b45309; display:block; margin-bottom:2px;">💳 Tarjeta de Crédito</strong>
                    <span style="font-size:0.8rem; color:#b45309;">Financiación en cuotas fijas con tarjeta de crédito.</span>
                </div>`;
        }
        if (!isTrans && !isLink && !isCredit) {
            dynamicPaymentsHtml = `
                <div style="background:#fef2f2; border:1px solid #fecaca; padding:10px 12px; border-radius:12px; color:#dc2626; font-size:0.82rem;">
                    ⚠️ Medios de pago en revisión para este combo. Coordinar por WhatsApp.
                </div>`;
        }

        const modalData = {
            payments: {
                title: '💳 Medios de Pago Habilitados para este Combo',
                icon: 'payments',
                color: '#16a34a',
                html: `
                    <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem; color:#334155; line-height:1.4;">
                        <div style="background:#fff7ed; border:1.5px solid #f59e0b; padding:10px 12px; border-radius:12px;">
                            <strong style="color:#92400e; display:block; margin-bottom:2px;">📌 Venta Directa de Fábrica</strong>
                            Precios promocionales directos del taller sin intermediarios.
                        </div>
                        ${dynamicPaymentsHtml}
                    </div>
                `
            },
            shipping: {
                title: '🚚 Envíos y Retiro por el Taller',
                icon: 'local_shipping',
                color: '#2563eb',
                html: `
                    <div style="display:flex; flex-direction:column; gap:12px; font-size:0.88rem; color:#334155; line-height:1.5;">
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:12px;">
                            <strong style="color:#1e40af; display:block; margin-bottom:4px;">🏪 Retiro Gratis por el Taller</strong>
                            Podés retirar tu combo sin costo por nuestro taller céntrico en <strong>Hurlingham</strong>, Buenos Aires (cerca de Av. Vergara y Av. Jauretche).
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:12px;">
                            <strong style="color:#0f172a; display:block; margin-bottom:4px;">🚚 Envíos a Domicilio (CABA y Gran BA)</strong>
                            Fletes puerta a puerta coordinando día y rango horario. Consultanos tu localidad para cotizar la tarifa más baja.
                        </div>
                        <div style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:12px;">
                            <strong style="color:#991b1b; display:block; margin-bottom:4px;">📦 Envíos al Interior del País</strong>
                            Despachamos tu combo protegido con embalaje reforzado mediante Expreso / Transporte a tu elección a cualquier punto de Argentina.
                        </div>
                    </div>
                `
            },
            warranty: {
                title: '⭐ Calidad, Fabricación & Garantía',
                icon: 'verified',
                color: '#8b5cf6',
                html: `
                    <div style="display:flex; flex-direction:column; gap:12px; font-size:0.88rem; color:#334155; line-height:1.5;">
                        <div style="background:#f5f3ff; border:1px solid #ddd6fe; padding:12px; border-radius:12px;">
                            <strong style="color:#5b21b6; display:block; margin-bottom:4px;">🌲 100% Madera Maciza Seleccionada</strong>
                            Trabajamos con maderas de primera calidad tratadas y lijadas a mano para asegurar una superficie suave, resistente y segura.
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:12px;">
                            <strong style="color:#0f172a; display:block; margin-bottom:4px;">🛠️ Tiempos de Fabricación</strong>
                            Fabricación artesanal cuidando cada terminación. Si el combo se encuentra disponible en stock de taller, la entrega es inmediata.
                        </div>
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:12px;">
                            <strong style="color:#166534; display:block; margin-bottom:4px;">🛡️ Garantía Directa de Fábrica</strong>
                            Todos nuestros combos y productos cuentan con respaldo y garantía directa del taller La Tarima.
                        </div>
                    </div>
                `
            }
        };

        const data = modalData[type] || modalData.payments;

        const overlay = document.createElement('div');
        overlay.id = 'offer-info-modal-overlay';
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 10005; display: flex; align-items: center; justify-content: center; padding: 1rem;';

        const card = document.createElement('div');
        card.style.cssText = 'background: white; border-radius: 20px; max-width: 480px; width: 100%; padding: 1.5rem; box-shadow: 0 20px 40px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; animation: modalPop 0.2s ease-out;';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                    <span class="material-symbols-outlined" style="color: ${data.color}; font-size: 24px;">${data.icon}</span>
                    <span>${data.title}</span>
                </h3>
                <button type="button" id="btn-close-info-modal" style="background: rgba(0,0,0,0.05); border: none; border-radius: 50%; width: 32px; height: 32px; font-size: 1rem; cursor: pointer; color: #64748b;">✕</button>
            </div>
            ${data.html}
            <button type="button" id="btn-ack-info-modal" class="btn-primary giant-btn" style="width: 100%; justify-content: center; margin-top: 1.25rem; font-size: 0.92rem; padding: 0.75rem;">
                <span>Entendido</span>
            </button>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        const closeFn = () => overlay.remove();
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
        card.querySelector('#btn-close-info-modal')?.addEventListener('click', closeFn);
        card.querySelector('#btn-ack-info-modal')?.addEventListener('click', closeFn);
    }

    window.showOfferInfoModal = showOfferInfoModal;
    window.showItemInfoModal = showOfferInfoModal;

    function openOfferDetailView(offer) {
        if (!offer) return;
        if (window.syncOfferLivePrices) window.syncOfferLivePrices(offer);
        selectedOfferForModal = offer;
        let offerPackQty = 1;

        const view = document.getElementById('view-offer-detail');
        if (!view) {
            showOfferDetailModal(offer);
            return;
        }

        // Fill Page Title & Description
        const titleEl = document.getElementById('offer-detail-page-title');
        if (titleEl) titleEl.textContent = offer.title;

        const descEl = document.getElementById('offer-detail-page-desc');
        if (descEl) descEl.textContent = offer.subtitle || offer.description || '¡Súper combo de productos con precio bonificado y ahorro directo!';

        const mainDescEl = document.getElementById('offer-detail-main-description');
        if (mainDescEl) mainDescEl.textContent = offer.description || offer.title || 'Combo de productos de madera maciza seleccionados con precio de oferta especial.';

        // Stock tag
        const stockEl = document.getElementById('offer-detail-stock-tag');
        if (stockEl) {
            if (offer.stockLimit) {
                stockEl.textContent = `⚡ Quedan ${offer.stockLimit} combos`;
                stockEl.style.display = 'inline-block';
            } else {
                stockEl.style.display = 'none';
            }
        }

        // Hero Cover (Custom Image or 2x2 Mosaic)
        const coverContainer = document.getElementById('offer-detail-cover-container');
        if (coverContainer) {
            coverContainer.innerHTML = '';
            
            // Build stamp text & badge
            const stamps = {
                'pro-gold': '⭐ PRO GOLD',
                'oportunidad': '🏆 OPORTUNIDAD ÚNICA',
                'relampago': '⚡ RELÁMPAGO',
                'combo': '🎁 COMBO EXCLUSIVO',
                'envio-gratis': '🚚 ENVÍO GRATIS'
            };
            const stampText = stamps[offer.stampStyle] || '🔥 OFERTA';

            // Build cover background or mosaic
            if (offer.customCoverImage) {
                coverContainer.innerHTML = `<img src="${offer.customCoverImage}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else if (offer.product_items && offer.product_items.length > 0) {
                if (offer.product_items.length === 1) {
                    coverContainer.innerHTML = `<img src="${offer.product_items[0].image || 'img/logo_provisional.png'}" style="width: 100%; height: 100%; object-fit: cover;">`;
                } else if (offer.product_items.length === 2) {
                    coverContainer.innerHTML = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; width: 100%; height: 100%;">
                            <img src="${offer.product_items[0].image}" style="width: 100%; height: 100%; object-fit: cover;">
                            <img src="${offer.product_items[1].image}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    `;
                } else {
                    const imgs = offer.product_items.slice(0, 4).map(i => i.image);
                    coverContainer.innerHTML = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; width: 100%; height: 100%;">
                            ${imgs.map(img => `<img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">`).join('')}
                        </div>
                    `;
                }
            }

            // Overlay Stamp
            const stampEl = document.createElement('div');
            stampEl.className = `stamp-badge ${offer.stampStyle || 'pro-gold'}`;
            stampEl.style.cssText = 'position: absolute; top: 14px; left: 14px; z-index: 5; font-size: 0.82rem; padding: 6px 14px;';
            stampEl.textContent = stampText;
            coverContainer.appendChild(stampEl);

            // Overlay Discount Tag
            if (offer.discountPercent) {
                const discEl = document.createElement('div');
                discEl.style.cssText = 'position: absolute; top: 14px; right: 14px; z-index: 5; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; font-weight: 900; font-size: 0.85rem; padding: 5px 12px; border-radius: 20px; box-shadow: 0 4px 12px rgba(220,38,38,0.4); text-transform: uppercase;';
                discEl.textContent = `-${offer.discountPercent}% OFF`;
                coverContainer.appendChild(discEl);
            }

            // Overlay Countdown Timer
            if (offer.hasTimer && offer.expirationDate) {
                const timerPill = document.createElement('div');
                timerPill.className = 'offer-countdown-pill';
                timerPill.setAttribute('data-offer-expiration', offer.expirationDate);
                timerPill.style.cssText = 'position: absolute; bottom: 14px; left: 14px; z-index: 5; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px); color: #fbbf24; font-weight: 800; font-size: 0.8rem; padding: 6px 14px; border-radius: 30px; border: 1.5px solid rgba(251, 191, 36, 0.5); font-family: monospace;';
                timerPill.textContent = '⏳ Cargando...';
                coverContainer.appendChild(timerPill);
            }

            // Overlay Share Button (Bottom Right over photo - Contenedor Circular Perfectos)
            const shareBtn = document.createElement('button');
            shareBtn.type = 'button';
            shareBtn.id = 'btn-share-offer-detail';
            shareBtn.title = 'Compartir Oferta';
            shareBtn.style.cssText = 'position: absolute; bottom: 14px; right: 14px; z-index: 5; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px); border: 1.5px solid rgba(255, 255, 255, 0.4); color: white; width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.4); box-sizing: border-box; padding: 0;';
            shareBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">share</span>`;
            shareBtn.onclick = (e) => {
                e.preventDefault();
                const shareUrl = (window.TarimaShortener && window.TarimaShortener.getShortOfferUrl)
                    ? window.TarimaShortener.getShortOfferUrl(offer.id)
                    : `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '/')}?s=${offer.id}`;
                const shareText = `¡Mirá este combo imperdible *${offer.title}* con ${offer.discountPercent || ''}% OFF en La Tarima! 🔥`;
                if (navigator.share) {
                    navigator.share({ title: offer.title, text: shareText, url: shareUrl }).catch(() => {});
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                    alert('🔗 ¡Enlace corto de la oferta copiado al portapapeles!');
                }
            };
            coverContainer.appendChild(shareBtn);
        }

        // Clarification Modals Listeners
        document.getElementById('btn-offer-modal-payments')?.addEventListener('click', () => showOfferInfoModal('payments'));
        document.getElementById('btn-offer-modal-shipping')?.addEventListener('click', () => showOfferInfoModal('shipping'));
        document.getElementById('btn-offer-modal-warranty')?.addEventListener('click', () => showOfferInfoModal('warranty'));

        // Price Info Tooltip Listeners (Hover & Click for Mobile)
        const priceInfoTrigger = document.getElementById('offer-price-info-trigger');
        const priceInfoTooltip = document.getElementById('offer-price-info-tooltip');
        if (priceInfoTrigger && priceInfoTooltip) {
            priceInfoTrigger.onmouseenter = () => { priceInfoTooltip.style.display = 'block'; };
            priceInfoTrigger.onmouseleave = () => { priceInfoTooltip.style.display = 'none'; };
            priceInfoTrigger.onclick = (e) => {
                e.stopPropagation();
                priceInfoTooltip.style.display = (priceInfoTooltip.style.display === 'block') ? 'none' : 'block';
            };
            document.addEventListener('click', () => { if (priceInfoTooltip) priceInfoTooltip.style.display = 'none'; });
        }

        // Favorite Toggle Button Setup
        const favBtn = document.getElementById('btn-offer-fav-dynamic');
        if (favBtn) {
            const checkFav = () => {
                try {
                    const data = localStorage.getItem('cartItems');
                    if (data) {
                        const arr = JSON.parse(data);
                        return arr.some(i => i.id === offer.id);
                    }
                } catch(e) {}
                return false;
            };
            const updateFavUI = () => {
                if (checkFav()) {
                    favBtn.style.color = '#dc2626';
                    favBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">favorite</span>`;
                } else {
                    favBtn.style.color = 'var(--text-main)';
                    favBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">favorite_border</span>`;
                }
            };
            updateFavUI();
            favBtn.onclick = (e) => {
                e.preventDefault();
                addOfferToCart(offer, offerPackQty);
                updateFavUI();
            };
        }

        // Dynamic Prices & Quantity Multiplier & Proportional Item Prices
        const qtyValEl = document.getElementById('offer-detail-qty-val');
        const origPriceEl = document.getElementById('offer-detail-original-price');
        const finalPriceEl = document.getElementById('offer-detail-final-price');
        const savingsBanner = document.getElementById('offer-detail-savings-banner');
        const itemsList = document.getElementById('offer-detail-items-list');

        const specCountEl = document.getElementById('offer-detail-spec-count');

        const renderPricesAndItems = () => {
            if (qtyValEl) qtyValEl.textContent = offerPackQty;

            const totalSubtotal = (offer.subtotalPrice || 0) * offerPackQty;
            const totalOfferPrice = (offer.offerPrice || 0) * offerPackQty;
            const totalSavings = Math.max(0, totalSubtotal - totalOfferPrice);

            const formattedSubtotal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(totalSubtotal);
            const formattedOfferPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(totalOfferPrice);
            const formattedSavings = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(totalSavings);

            if (origPriceEl) origPriceEl.textContent = formattedSubtotal;
            if (finalPriceEl) finalPriceEl.textContent = formattedOfferPrice;

            // Actualizar contador en Ficha Técnica del Combo
            if (specCountEl) {
                const totalItemCount = (offer.product_items || []).reduce((acc, i) => acc + (parseInt(i.quantity, 10) || 1), 0) * offerPackQty;
                specCountEl.textContent = `${totalItemCount} producto${totalItemCount !== 1 ? 's' : ''} incluido${totalItemCount !== 1 ? 's' : ''}`;
            }

            if (savingsBanner) {
                if (totalSavings > 0) {
                    savingsBanner.innerHTML = `🎉 ¡Estás ahorrando <b>${formattedSavings}</b> (${offer.discountPercent || Math.round((totalSavings / totalSubtotal) * 100)}% OFF) al llevar este combo en lugar de los productos por separado!`;
                    savingsBanner.style.display = 'block';
                    savingsBanner.style.background = 'linear-gradient(135deg, #f0fdf4, #dcfce7)';
                    savingsBanner.style.border = '1.5px solid #86efac';
                    savingsBanner.style.color = '#15803d';
                    savingsBanner.style.boxShadow = '0 4px 12px rgba(22, 101, 52, 0.08)';
                    savingsBanner.style.padding = '0.75rem';
                    savingsBanner.style.lineHeight = '1.4';
                } else {
                    savingsBanner.style.display = 'none';
                }
            }

            // Render List of included items with proportional discount prices
            if (itemsList) {
                itemsList.innerHTML = '';
                if (offer.product_items && offer.product_items.length > 0) {
                    const discountFactor = (offer.subtotalPrice && offer.subtotalPrice > 0) ? (offer.offerPrice / offer.subtotalPrice) : 1;
                    const discountPercent = offer.discountPercent || Math.round((1 - discountFactor) * 100);

                    offer.product_items.forEach(item => {
                        const card = document.createElement('div');
                        card.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 0.75rem 1rem; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);';
                        
                        const baseItemQty = parseInt(item.quantity, 10) || 1;
                        const totalItemQty = baseItemQty * offerPackQty;
                        const unitPrice = item.unitPrice || 0;
                        const originalTotalPrice = unitPrice * totalItemQty;
                        const proportionalTotalPrice = originalTotalPrice * discountFactor;

                        const formattedOrig = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(originalTotalPrice);
                        const formattedProp = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(proportionalTotalPrice);

                        card.innerHTML = `
                            <img src="${item.image || 'img/logo_provisional.png'}" style="width: 52px; height: 52px; object-fit: cover; border-radius: 8px; border: 1.5px solid #e2e8f0; flex-shrink: 0;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                    ${totalItemQty > 1 ? `<span style="background: #e0f2fe; color: #0369a1; font-weight: 900; font-size: 0.78rem; padding: 2px 8px; border-radius: 12px;">x${totalItemQty}</span>` : ''}
                                    <span>${item.title}</span>
                                </div>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                                    ${item.acabado ? `Acabado: <b>${item.acabado}</b>` : ''} ${item.medida ? `| Medida: <b>${item.medida}</b>` : ''}
                                </div>
                            </div>
                            <div style="text-align: right; line-height: 1.25; flex-shrink: 0;">
                                ${discountFactor < 1 ? `
                                    <div style="font-size: 0.78rem; text-decoration: line-through; color: #94a3b8; font-weight: 700; margin-bottom: 1px;">${formattedOrig}</div>
                                    <div style="font-size: 0.98rem; font-weight: 900; color: #166534;">${formattedProp}</div>
                                    ${discountPercent > 0 ? `<div style="font-size: 0.68rem; color: #16a34a; font-weight: 800;">(${discountPercent}% OFF)</div>` : ''}
                                ` : `
                                    <div style="font-size: 0.95rem; font-weight: 800; color: #334155;">${formattedOrig}</div>
                                `}
                            </div>
                        `;
                        itemsList.appendChild(card);
                    });
                }
            }
        };

        renderPricesAndItems();

        // Quantity controls listeners
        const btnMinus = document.getElementById('btn-offer-qty-minus');
        const btnPlus = document.getElementById('btn-offer-qty-plus');
        if (btnMinus) {
            btnMinus.onclick = (e) => {
                e.preventDefault();
                if (offerPackQty > 1) {
                    offerPackQty--;
                    renderPricesAndItems();
                }
            };
        }
        if (btnPlus) {
            btnPlus.onclick = (e) => {
                e.preventDefault();
                offerPackQty++;
                renderPricesAndItems();
            };
        }

        // Setup Cart Button
        const cartBtn = document.getElementById('btn-add-offer-to-cart');
        if (cartBtn) {
            cartBtn.onclick = (e) => {
                e.preventDefault();
                addOfferToCart(offer, offerPackQty);
            };
        }

        // Setup LO QUIERO / COMPRAR YA Button (Pago Directo Modal)
        const buyNowBtn = document.getElementById('btn-buy-now-offer');
        if (buyNowBtn) {
            buyNowBtn.onclick = (e) => {
                e.preventDefault();
                if (window.showOfferPaymentModal) window.showOfferPaymentModal(offer, offerPackQty);
            };
        }

        // Setup WhatsApp Pre-Qualification Delivery Modal
        const waBtn = document.getElementById('btn-whatsapp-offer');
        if (waBtn) {
            waBtn.onclick = (e) => {
                e.preventDefault();
                showOfferDeliveryModal(offer, offerPackQty);
            };
        }

        // Setup Share Button
        const shareBtn = document.getElementById('btn-share-offer-detail');
        if (shareBtn) {
            shareBtn.onclick = (e) => {
                e.preventDefault();
                const shareUrl = (window.TarimaShortener && window.TarimaShortener.getShortOfferUrl)
                    ? window.TarimaShortener.getShortOfferUrl(offer.id)
                    : `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '/')}?s=${offer.id}`;
                const shareText = `¡Mirá este combo imperdible *${offer.title}* con ${offer.discountPercent || ''}% OFF en La Tarima! 🔥`;
                if (navigator.share) {
                    navigator.share({ title: offer.title, text: shareText, url: shareUrl }).catch(() => {});
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                    alert('🔗 ¡Enlace corto de la oferta copiado al portapapeles!');
                }
            };
        }

        // Render Related Combos Carousel
        renderRelatedOffers(offer.id);

        // Actualizar la URL del navegador con el shortcode super corto de la oferta (ej: ?s=O.1)
        if (window.TarimaShortener && window.TarimaShortener.encodeOfferShortCode) {
            const offerCode = window.TarimaShortener.encodeOfferShortCode(offer.id);
            const currentParams = new URLSearchParams(window.location.search);
            if (currentParams.get('s') !== offerCode && currentParams.get('oferta') !== offer.id) {
                const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + `?s=${offerCode}`;
                window.history.pushState({ viewId: 'view-offer-detail', offerId: offer.id, shortCode: offerCode }, document.title, cleanUrl);
            }
        }

        // Navigate to the view
        if (window.navigateToView) {
            window.navigateToView('view-offer-detail', { offer });
        }
        updateCountdownLabels();
    }

    function showOfferDeliveryModal(offer, packQty = 1) {
        const existing = document.getElementById('delivery-modal-overlay');
        if (existing) existing.remove();

        const phone = '5491167007723';
        const formattedOfferPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format((offer.offerPrice || 0) * packQty);
        const itemsText = (offer.product_items || []).map(i => `- ${i.quantity || 1}x ${i.title} (${i.acabado || 'Estándar'})`).join('\n');

        const buildOfferWA = (tipoEntrega = '', shippingData = {}) => {
            let parts = [
                `• Combo: *${offer.title}*`,
                `• Cantidad Packs: ${packQty}`,
                `• Precio Total: *${formattedOfferPrice}*`,
                `\nProductos Incluidos:\n${itemsText}`
            ];

            if (tipoEntrega === 'pickup') {
                parts.push('\n• Entrega: 🏪 Retiro por el taller (Hurlingham)');
            } else if (tipoEntrega === 'shipping') {
                parts.push('\n• Entrega: 🚚 Necesito envío a domicilio');
                if (shippingData.localidad) parts.push(`• Destino/CP: ${shippingData.localidad}`);
                if (shippingData.direccion) parts.push(`• Dirección: ${shippingData.direccion}`);
            }

            return `¡Hola La Tarima! 👋 Me interesa comprar este combo:\n\n${parts.join('\n')}\n\n¿Me podrías brindar más información para coordinar?`;
        };

        const overlay = document.createElement('div');
        overlay.id = 'delivery-modal-overlay';
        overlay.className = 'delivery-modal-overlay';

        const sheet = document.createElement('div');
        sheet.className = 'delivery-modal-sheet';
        sheet.style.position = 'relative';
        sheet.innerHTML = `
            <button class="delivery-modal-back-arrow" id="dopt-back-arrow" title="Volver" style="display:none;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button class="delivery-modal-close-x" id="dopt-close-x" title="Cerrar">&times;</button>
            <div class="delivery-modal-handle"></div>
            <p class="delivery-modal-eyebrow">Antes de continuar</p>
            <h3 class="delivery-modal-title">¿Cómo querés recibir tu combo?</h3>
            <p class="delivery-modal-subtitle">Elegí la modalidad para coordinar tu compra por WhatsApp</p>
            
            <div class="delivery-modal-options">
                <button class="delivery-opt-btn delivery-opt-pickup" id="dopt-pickup">
                    <span class="delivery-opt-icon">🏪</span>
                    <span class="delivery-opt-label">Retirar por el taller</span>
                    <span class="delivery-opt-desc">Hurlingham, Buenos Aires (Efectivo / Transferencia)</span>
                </button>
                <button class="delivery-opt-btn delivery-opt-shipping" id="dopt-shipping">
                    <span class="delivery-opt-icon">🚚</span>
                    <span class="delivery-opt-label">Necesito envío</span>
                    <span class="delivery-opt-desc">Te cotizamos el envío a domicilio por WhatsApp</span>
                </button>
            </div>

            <!-- Formulario de Envío -->
            <div id="delivery-shipping-form" style="display:none; width:100%; flex-direction:column; gap:10px; margin-top:12px; text-align:left;">
                <p style="font-size:0.82rem; color:#64748B; margin:0 0 2px 0;">📍 Datos para cotizar el envío <span style="color:#94A3B8;">(opcionales)</span>:</p>
                <input type="text" id="ship-loc" placeholder="Localidad o Código Postal (ej: Ramos Mejía / 1704)" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid #CBD5E1; font-size:0.88rem; box-sizing:border-box;">
                <input type="text" id="ship-dir" placeholder="Dirección de entrega (ej: Av. de Mayo 123)" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid #CBD5E1; font-size:0.88rem; box-sizing:border-box;">
                <button id="btn-submit-shipping-wa" class="btn-primary giant-btn" style="width:100%; justify-content:center; margin-top:4px; font-size:0.92rem;">
                    <span>Enviar consulta por WhatsApp 💬</span>
                </button>
            </div>

            <!-- Panel de Retiro en Taller -->
            <div id="delivery-pickup-info" style="display:none; width:100%; flex-direction:column; gap:12px; margin-top:10px; text-align:left;">
                <div style="background:#FFF8F5; border:1.5px solid rgba(160,113,91,0.25); padding:14px; border-radius:14px; font-size:0.85rem; color:#2D3748; line-height:1.5;">
                    <p style="margin:0 0 6px 0; font-weight:700; color:#A0715B; display:flex; align-items:center; gap:6px;">
                        <span>💡 Aclaración sobre el precio:</span>
                    </p>
                    <p style="margin:0 0 12px 0;">El precio del combo promocional se congela y mantiene pagando en <strong>efectivo o transferencia</strong>.</p>
                    
                    <p style="margin:0 0 6px 0; font-weight:700; color:#A0715B; display:flex; align-items:center; gap:6px;">
                        <span>📍 Ubicación del taller:</span>
                    </p>
                    <p style="margin:0;">Hurlingham, Buenos Aires, Argentina<br><span style="color:#718096; font-size:0.8rem;">(Zona céntrica: cerca de Av. Vergara y Av. Jauretche)</span></p>
                </div>

                <button id="btn-submit-pickup-wa" class="btn-primary giant-btn" style="width:100%; justify-content:center; font-size:0.92rem;">
                    <span>Continuar a WhatsApp 💬</span>
                </button>
            </div>
        `;

        overlay.appendChild(sheet);
        document.body.appendChild(overlay);
        // Punto 91: Lock scroll modal
        if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();

        requestAnimationFrame(() => overlay.classList.add('open'));

        const closeModal = () => {
            overlay.classList.remove('open');
            if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
            setTimeout(() => overlay.remove(), 300);
        };

        const resetToInitialView = () => {
            const pickupInfo = document.getElementById('delivery-pickup-info');
            const shippingForm = document.getElementById('delivery-shipping-form');
            const optionsContainer = sheet.querySelector('.delivery-modal-options');
            const backArrow = document.getElementById('dopt-back-arrow');

            if (pickupInfo) pickupInfo.style.display = 'none';
            if (shippingForm) shippingForm.style.display = 'none';
            if (optionsContainer) optionsContainer.style.display = 'flex';
            if (backArrow) backArrow.style.display = 'none';
        };

        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
        document.getElementById('dopt-close-x')?.addEventListener('click', closeModal);
        document.getElementById('dopt-back-arrow')?.addEventListener('click', resetToInitialView);

        document.getElementById('dopt-pickup')?.addEventListener('click', () => {
            sheet.querySelector('.delivery-modal-options').style.display = 'none';
            document.getElementById('delivery-pickup-info').style.display = 'flex';
            document.getElementById('dopt-back-arrow').style.display = 'flex';
        });

        document.getElementById('dopt-shipping')?.addEventListener('click', () => {
            sheet.querySelector('.delivery-modal-options').style.display = 'none';
            document.getElementById('delivery-shipping-form').style.display = 'flex';
            document.getElementById('dopt-back-arrow').style.display = 'flex';
        });

        document.getElementById('btn-submit-pickup-wa')?.addEventListener('click', () => {
            const waMsg = buildOfferWA('pickup');
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
            closeModal();
        });

        document.getElementById('btn-submit-shipping-wa')?.addEventListener('click', () => {
            const loc = document.getElementById('ship-loc')?.value || '';
            const dir = document.getElementById('ship-dir')?.value || '';
            const waMsg = buildOfferWA('shipping', { localidad: loc, direccion: dir });
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
            closeModal();
        });
    }


    function renderRelatedOffers(currentOfferId) {
        const container = document.getElementById('offer-detail-related-list');
        if (!container) return;

        container.innerHTML = '';
        const otherOffers = (window.sessionOffers || []).filter(o => o.active !== false && o.id !== currentOfferId);

        if (otherOffers.length === 0) {
            container.innerHTML = '<p style="font-size:0.8rem; color:#94a3b8; font-style:italic; text-align:center; width:100%;">No hay otras ofertas activas por el momento.</p>';
            return;
        }

        // Mostrar exactamente 3 publicaciones y hacer que ocupen el 33% del ancho cada una
        const displayOffers = otherOffers.slice(0, 3);
        displayOffers.forEach(o => {
            const card = createOfferCardElement(o, true);
            card.style.flex = '0 0 calc((100% - 12px) / 3)';
            card.style.width = 'calc((100% - 12px) / 3)';
            card.style.minWidth = 'calc((100% - 12px) / 3)';
            card.style.boxSizing = 'border-box';
            container.appendChild(card);
        });
    }

    window.openOfferDetailView = openOfferDetailView;
    window.showOfferPaymentModal = async function(...args) {
        if (typeof window.ensureCheckoutModalLoaded === 'function') {
            await window.ensureCheckoutModalLoaded();
        }
        if (typeof window.showOfferPaymentModal === 'function' && !window.showOfferPaymentModal._isStub) {
            return window.showOfferPaymentModal(...args);
        }
    };
    window.showOfferPaymentModal._isStub = true;

    window.showProductPaymentModal = async function(...args) {
        if (typeof window.ensureCheckoutModalLoaded === 'function') {
            await window.ensureCheckoutModalLoaded();
        }
        if (typeof window.showProductPaymentModal === 'function' && !window.showProductPaymentModal._isStub) {
            return window.showProductPaymentModal(...args);
        }
    };
    window.showProductPaymentModal._isStub = true;

    function showOfferDetailModal(offer) {
        openOfferDetailView(offer);
    }

    function closeOfferDetailModal() {
        const modal = document.getElementById('offer-detail-modal');
        if (modal) modal.style.display = 'none';
        selectedOfferForModal = null;
    }

    function addOfferToCart(offer, qty = 1) {
        try {
            const carritoModule = (window.parent && window.parent.CarritoModule) || window.CarritoModule;
            if (carritoModule && typeof carritoModule.toggle === 'function') {
                const comboTitle = `COMBO: ${offer.title}`;
                const comboSub = (offer.product_items || []).map(i => i.title).join(' + ');

                carritoModule.toggle(
                    { id: offer.id, title: comboTitle, image: offer.customCoverImage || (offer.product_items && offer.product_items[0] ? offer.product_items[0].image : 'img/logo_provisional.png') },
                    'Combo Especial',
                    'OFERTAS',
                    comboSub,
                    '',
                    '',
                    offer.offerPrice * qty
                );

                if (window.updateFavoritesBadge) window.updateFavoritesBadge();
            }
        } catch (e) {
            console.error('Error al agregar combo al carrito:', e);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.initOffersFrontend();
    });
})();
