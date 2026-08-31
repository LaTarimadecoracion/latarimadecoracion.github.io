// js/admin-offers.js
// --- ADMIN OFFERS & COMBOS MODULE ---

(function() {
    let editingOfferId = null;
    let selectedComboItems = []; // Array of { productId, acabado, medida, unitPrice, title, image }

    window.initAdminOffers = function() {
        const btnAddOffer = document.getElementById('btn-add-offer-main');
        if (btnAddOffer) {
            btnAddOffer.addEventListener('click', () => {
                openOfferModal(null);
            });
        }

        const modalCloseBtn = document.getElementById('btn-close-offer-modal');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                closeOfferModal();
            });
        }

        const offerForm = document.getElementById('admin-offer-form');
        if (offerForm) {
            offerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                saveOffer();
            });
        }

        // Dynamic price calculator listeners
        const discountInput = document.getElementById('offer-discount-percent');
        const offerPriceInput = document.getElementById('offer-final-price');

        if (discountInput) {
            discountInput.addEventListener('input', () => {
                recalculateOfferPrices('discount');
            });
        }

        if (offerPriceInput) {
            offerPriceInput.addEventListener('input', () => {
                recalculateOfferPrices('price');
            });
        }

        // Timer checkbox toggle
        const timerCheckbox = document.getElementById('offer-has-timer');
        const timerGroup = document.getElementById('offer-timer-group');
        if (timerCheckbox && timerGroup) {
            timerCheckbox.addEventListener('change', () => {
                timerGroup.style.display = timerCheckbox.checked ? 'block' : 'none';
            });
        }

        // Shipping type listener
        const shippingSelect = document.getElementById('offer-shipping-type');
        const shippingCostGroup = document.getElementById('offer-shipping-cost-group');
        if (shippingSelect && shippingCostGroup) {
            shippingSelect.addEventListener('change', () => {
                shippingCostGroup.style.display = shippingSelect.value === 'fixed' ? 'block' : 'none';
            });
        }

        // Event Listeners para Tildes de Envíos en Oferta (Logística, Flete, Otro)
        const logisticaCheck = document.getElementById('offer-ship-logistica-enabled');
        const logisticaGroup = document.getElementById('offer-ship-logistica-group');
        logisticaCheck?.addEventListener('change', () => {
            if (logisticaGroup) logisticaGroup.style.display = logisticaCheck.checked ? 'block' : 'none';
        });

        const fleteCheck = document.getElementById('offer-ship-flete-enabled');
        const fleteGroup = document.getElementById('offer-ship-flete-group');
        fleteCheck?.addEventListener('change', () => {
            if (fleteGroup) fleteGroup.style.display = fleteCheck.checked ? 'block' : 'none';
        });

        const otroCheck = document.getElementById('offer-ship-otro-enabled');
        const otroGroup = document.getElementById('offer-ship-otro-group');
        otroCheck?.addEventListener('change', () => {
            if (otroGroup) otroGroup.style.display = otroCheck.checked ? 'grid' : 'none';
        });

        // Product search filter inside modal
        const productSearchInput = document.getElementById('offer-product-search');
        if (productSearchInput) {
            productSearchInput.addEventListener('input', (e) => {
                renderModalProductSelector(e.target.value);
            });
        }

        // Stamp option card interactive click listener
        const stampGrid = document.getElementById('offer-stamp-options-grid');
        if (stampGrid) {
            stampGrid.addEventListener('click', (e) => {
                const card = e.target.closest('.stamp-option-card');
                if (card) {
                    const val = card.dataset.stampVal;
                    document.getElementById('offer-stamp-style').value = val;
                    stampGrid.querySelectorAll('.stamp-option-card').forEach(c => {
                        c.classList.remove('active');
                        c.style.borderColor = '#e2e8f0';
                        c.style.background = '#fafafa';
                    });
                    card.classList.add('active');
                    card.style.borderColor = '#b38728';
                    card.style.background = '#fffdf0';
                }
            });
        }

        // Magic Auto-fill button listener
        const btnAutofill = document.getElementById('btn-autofill-offer-info');
        if (btnAutofill) {
            btnAutofill.addEventListener('click', () => {
                autoFillOfferInfo(true);
            });
        }

        // Cover image preview upload
        const coverInput = document.getElementById('offer-cover-file');
        if (coverInput) {
            coverInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const formData = new FormData();
                    formData.append('image', file);
                    try {
                        const res = await fetch('/api/upload-image', {
                            method: 'POST',
                            body: formData
                        });
                        const data = await res.json();
                        if (data.success && data.imageUrl) {
                            document.getElementById('offer-cover-preview-img').src = data.imageUrl;
                            document.getElementById('offer-custom-cover-url').value = data.imageUrl;
                            document.getElementById('offer-cover-preview-wrapper').style.display = 'block';
                        }
                    } catch (err) {
                        console.error('Error al subir imagen de oferta:', err);
                    }
                }
            });
        }

        const btnRemoveCover = document.getElementById('btn-remove-offer-cover');
        if (btnRemoveCover) {
            btnRemoveCover.addEventListener('click', () => {
                document.getElementById('offer-custom-cover-url').value = '';
                document.getElementById('offer-cover-preview-wrapper').style.display = 'none';
            });
        }
    };

    window.renderAdminOffers = function() {
        const container = document.getElementById('admin-offers-list');
        if (!container) return;

        const offers = window.sessionOffers || [];

        if (offers.length === 0) {
            container.innerHTML = `
                <div class="dashboard-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: var(--text-muted); opacity: 0.5;">local_offer</span>
                    <h4 style="margin: 0.5rem 0 0.25rem; font-weight: 700;">No hay ofertas cargadas</h4>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">Creá tu primera oferta o combo especial para llamar la atención de tus clientes.</p>
                    <button type="button" class="admin-btn primary" onclick="document.getElementById('btn-add-offer-main').click()" style="margin-top: 1rem;">
                        <span class="material-symbols-outlined">add</span> Crear Nueva Oferta
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        offers.forEach(offer => {
            const card = document.createElement('div');
            card.className = 'admin-offer-card';
            card.style.cssText = `
                background: var(--bg-card, #ffffff);
                border: 1px solid var(--border-color, #e5e7eb);
                border-radius: 12px;
                padding: 1.25rem;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                position: relative;
                overflow: hidden;
            `;

            // Check expiration status
            const isExpired = offer.hasTimer && offer.expirationDate && new Date(offer.expirationDate) < new Date();
            const isActive = offer.active !== false && !isExpired;

            // Stamp label mapping
            const stampLabels = {
                'pro-gold': '⭐ PRO GOLD',
                'oportunidad': '🏆 OPORTUNIDAD ÚNICA',
                'relampago': '⚡ RELÁMPAGO',
                'combo': '🎁 COMBO EXCLUSIVO',
                'envio-gratis': '🚚 ENVÍO GRATIS'
            };
            const stampText = stampLabels[offer.stampStyle] || '🔥 OFERTA';

            const formattedSubtotal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(offer.subtotalPrice || 0);
            const formattedOfferPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(offer.offerPrice || 0);
            const savings = Math.max(0, (offer.subtotalPrice || 0) - (offer.offerPrice || 0));
            const formattedSavings = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(savings);

            // Cover image: custom or primary item image
            let coverImg = offer.customCoverImage;
            if (!coverImg && offer.product_items && offer.product_items.length > 0) {
                coverImg = offer.product_items[0].image;
            }
            if (!coverImg) coverImg = 'img/logo_provisional.png';

            card.innerHTML = `
                <div>
                    <div style="position: relative; height: 160px; border-radius: 8px; overflow: hidden; margin-bottom: 0.75rem; background: #f3f4f6;">
                        <img src="${coverImg}" style="width: 100%; height: 100%; object-fit: cover;" alt="${offer.title}">
                        
                        <div class="stamp-badge ${offer.stampStyle || 'pro-gold'}" style="position: absolute; top: 8px; left: 8px;">
                            ${stampText}
                        </div>

                        ${offer.discountPercent ? `
                            <span style="position: absolute; top: 8px; right: 8px; background: #dc2626; color: white; font-weight: 800; font-size: 0.75rem; padding: 2px 8px; border-radius: 20px;">
                                -${offer.discountPercent}% OFF
                            </span>
                        ` : ''}

                        <span class="offer-status-pill ${isActive ? 'active' : (isExpired ? 'expired' : 'paused')}" style="position: absolute; bottom: 8px; left: 8px; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; color: white; background: ${isActive ? '#16a34a' : (isExpired ? '#dc2626' : '#6b7280')};">
                            ${isActive ? '🟢 Activa' : (isExpired ? '⏳ Expirada' : '⏸️ Pausada')}
                        </span>
                    </div>

                    <h3 style="margin: 0 0 0.25rem 0; font-size: 1.05rem; font-weight: 700; color: var(--text-main);">${offer.title}</h3>
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: var(--text-muted); line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">
                        ${offer.description || 'Sin descripción'}
                    </p>

                    <div style="background: rgba(0,0,0,0.02); border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; font-size: 0.85rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                            <span style="color: var(--text-muted);">Precio de lista:</span>
                            <span style="text-decoration: line-through; color: #9ca3af;">${formattedSubtotal}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1rem; color: #dc2626;">
                            <span>Precio Oferta:</span>
                            <span>${formattedOfferPrice}</span>
                        </div>
                        ${savings > 0 ? `
                            <div style="text-align: right; font-size: 0.75rem; color: #16a34a; font-weight: 700;">
                                💰 Ahorro: ${formattedSavings}
                            </div>
                        ` : ''}
                    </div>

                    <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; margin-bottom: 0.75rem;">
                        <div>📦 <b>Productos en el combo:</b> ${offer.product_items ? offer.product_items.length : 0} items</div>
                        ${offer.stockLimit ? `<div>🔥 <b>Cupo limitado:</b> ${offer.stockLimit} unidades disponibles</div>` : ''}
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
                            ${offer.shippingConfig?.isFreeShipping || offer.shippingType === 'free' ? '<span style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">✨ ENVÍO GRATIS</span>' : ''}
                            ${offer.shippingConfig?.logisticaEnabled ? `<span style="background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">📦 Logística (${offer.shippingConfig.logisticaCost ? '$' + offer.shippingConfig.logisticaCost : 'Gratis'})</span>` : ''}
                            ${offer.shippingConfig?.fleteEnabled ? `<span style="background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">🚛 Flete (${offer.shippingConfig.fleteCost ? '$' + offer.shippingConfig.fleteCost : 'Gratis'})</span>` : ''}
                            ${offer.shippingConfig?.otroEnabled ? `<span style="background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">🚚 ${offer.shippingConfig.otroLabel || 'Otro'}</span>` : ''}
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 6px; border-top: 1px solid var(--border-color, #e5e7eb); padding-top: 0.75rem;">
                    <button type="button" class="admin-btn secondary" style="flex: 1; padding: 0.4rem; font-size: 0.8rem;" onclick="openOfferModal('${offer.id}')">
                        <span class="material-symbols-outlined" style="font-size: 16px;">edit</span> Editar
                    </button>
                    <button type="button" class="admin-btn secondary" style="padding: 0.4rem;" title="${offer.active !== false ? 'Pausar' : 'Activar'}" onclick="toggleOfferActive('${offer.id}')">
                        <span class="material-symbols-outlined" style="font-size: 16px;">${offer.active !== false ? 'pause' : 'play_arrow'}</span>
                    </button>
                    <button type="button" class="admin-btn danger" style="padding: 0.4rem;" title="Eliminar" onclick="deleteOffer('${offer.id}')">
                        <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                    </button>
                </div>
            `;

            container.appendChild(card);
        });
    };

    window.openOfferModal = function(offerId = null) {
        editingOfferId = offerId;
        const modal = document.getElementById('admin-offer-modal');
        if (!modal) return;

        selectedComboItems = [];

        const currentStamp = offerId ? (((window.sessionOffers || []).find(o => o.id === offerId) || {}).stampStyle || 'pro-gold') : 'pro-gold';
        document.getElementById('offer-stamp-style').value = currentStamp;
        const stampGrid = document.getElementById('offer-stamp-options-grid');
        if (stampGrid) {
            stampGrid.querySelectorAll('.stamp-option-card').forEach(card => {
                if (card.dataset.stampVal === currentStamp) {
                    card.classList.add('active');
                    card.style.borderColor = '#b38728';
                    card.style.background = '#fffdf0';
                } else {
                    card.classList.remove('active');
                    card.style.borderColor = '#e2e8f0';
                    card.style.background = '#fafafa';
                }
            });
        }

        if (offerId) {
            const offer = (window.sessionOffers || []).find(o => o.id === offerId);
            if (offer) {
                document.getElementById('offer-modal-title').textContent = 'Editar Oferta / Combo Especial';
                document.getElementById('offer-title').value = offer.title || '';
                document.getElementById('offer-description').value = offer.description || '';
                document.getElementById('offer-stock-limit').value = offer.stockLimit || '';
                document.getElementById('offer-discount-percent').value = offer.discountPercent || '';
                document.getElementById('offer-final-price').value = offer.offerPrice || '';
                document.getElementById('offer-shipping-type').value = offer.shippingType || 'standard';
                document.getElementById('offer-shipping-cost').value = offer.shippingCost || '';
                
                // Populación de opciones de envío (Logística, Flete, Otro, Gratis)
                const shipConf = offer.shippingConfig || {};

                const logCheck = document.getElementById('offer-ship-logistica-enabled');
                const logCost = document.getElementById('offer-ship-logistica-cost');
                const logGrp = document.getElementById('offer-ship-logistica-group');
                if (logCheck) logCheck.checked = !!shipConf.logisticaEnabled;
                if (logCost) logCost.value = shipConf.logisticaCost !== undefined && shipConf.logisticaCost !== null ? shipConf.logisticaCost : '';
                if (logGrp) logGrp.style.display = shipConf.logisticaEnabled ? 'block' : 'none';

                const fltCheck = document.getElementById('offer-ship-flete-enabled');
                const fltCost = document.getElementById('offer-ship-flete-cost');
                const fltGrp = document.getElementById('offer-ship-flete-group');
                if (fltCheck) fltCheck.checked = !!shipConf.fleteEnabled;
                if (fltCost) fltCost.value = shipConf.fleteCost !== undefined && shipConf.fleteCost !== null ? shipConf.fleteCost : '';
                if (fltGrp) fltGrp.style.display = shipConf.fleteEnabled ? 'block' : 'none';

                const otrCheck = document.getElementById('offer-ship-otro-enabled');
                const otrLbl = document.getElementById('offer-ship-otro-label');
                const otrCost = document.getElementById('offer-ship-otro-cost');
                const otrGrp = document.getElementById('offer-ship-otro-group');
                if (otrCheck) otrCheck.checked = !!shipConf.otroEnabled;
                if (otrLbl) otrLbl.value = shipConf.otroLabel || '';
                if (otrCost) otrCost.value = shipConf.otroCost !== undefined && shipConf.otroCost !== null ? shipConf.otroCost : '';
                if (otrGrp) otrGrp.style.display = shipConf.otroEnabled ? 'grid' : 'none';

                const freeCheck = document.getElementById('offer-ship-is-free');
                if (freeCheck) freeCheck.checked = !!(shipConf.isFreeShipping || offer.shippingType === 'free');

                const hasTimer = !!offer.hasTimer;
                document.getElementById('offer-has-timer').checked = hasTimer;
                document.getElementById('offer-timer-group').style.display = hasTimer ? 'block' : 'none';
                document.getElementById('offer-expiration-date').value = offer.expirationDate || '';

                if (offer.customCoverImage) {
                    document.getElementById('offer-custom-cover-url').value = offer.customCoverImage;
                    document.getElementById('offer-cover-preview-img').src = offer.customCoverImage;
                    document.getElementById('offer-cover-preview-wrapper').style.display = 'block';
                } else {
                    document.getElementById('offer-custom-cover-url').value = '';
                    document.getElementById('offer-cover-preview-wrapper').style.display = 'none';
                }

                if (offer.product_items && Array.isArray(offer.product_items)) {
                    selectedComboItems = JSON.parse(JSON.stringify(offer.product_items));
                }
            }
        } else {
            document.getElementById('offer-modal-title').textContent = 'Crear Nueva Oferta / Combo Especial';
            document.getElementById('admin-offer-form').reset();
            document.getElementById('offer-stamp-style').value = 'pro-gold';
            document.getElementById('offer-custom-cover-url').value = '';
            document.getElementById('offer-cover-preview-wrapper').style.display = 'none';
            document.getElementById('offer-timer-group').style.display = 'none';
            document.getElementById('offer-shipping-cost-group').style.display = 'none';

            ['offer-ship-logistica-enabled', 'offer-ship-flete-enabled', 'offer-ship-otro-enabled', 'offer-ship-is-free'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.checked = false;
            });
            ['offer-ship-logistica-cost', 'offer-ship-flete-cost', 'offer-ship-otro-cost', 'offer-ship-otro-label'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            ['offer-ship-logistica-group', 'offer-ship-flete-group', 'offer-ship-otro-group'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }

        renderSelectedComboItems();
        renderModalProductSelector('');

        modal.style.display = 'flex';
    };
    window.editOffer = window.openOfferModal;

    window.closeOfferModal = function() {
        const modal = document.getElementById('admin-offer-modal');
        if (modal) modal.style.display = 'none';
    };

    function renderModalProductSelector(query = '') {
        const container = document.getElementById('offer-available-products-list');
        if (!container) return;

        const sourceData = window.sessionProducts || [];
        let availableProducts = [];
        const seenIds = new Set();

        const q = query.toLowerCase().trim();

        sourceData.forEach(cat => {
            if (cat.visible === false || (cat.id && cat.id.endsWith('-todos'))) return;
            if (cat.products) {
                cat.products.forEach(p => {
                    if (p.visible === false) return;
                    if (!seenIds.has(p.id)) {
                        const match = !q || (p.title || '').toLowerCase().includes(q) || cat.name.toLowerCase().includes(q);
                        if (match) {
                            seenIds.add(p.id);
                            availableProducts.push({ product: p, catName: cat.name });
                        }
                    }
                });
            }
        });

        if (availableProducts.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;">No se encontraron productos disponibles.</p>';
            return;
        }

        container.innerHTML = '';
        availableProducts.forEach(({ product, catName }) => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.5rem;
                border-bottom: 1px solid var(--border-color, #e5e7eb);
                font-size: 0.85rem;
            `;

            const imgUrl = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');

            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                    <img src="${imgUrl}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <div style="font-weight: 600; text-overflow: ellipsis; overflow: hidden;">${product.title}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">${catName}</div>
                    </div>
                </div>
                <button type="button" class="admin-btn secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                    <span class="material-symbols-outlined" style="font-size: 14px;">add</span> Agregar
                </button>
            `;

            row.querySelector('button').addEventListener('click', () => {
                addProductToCombo(product);
            });

            container.appendChild(row);
        });
    }

    function resolveProductPrice(product, acabadoName, medidaName) {
        if (!product) return 0;

        let foundPrice = 0;

        // 1. Search inside acabados_groups if present
        if (product.acabados_groups && product.acabados_groups.length > 0) {
            let group = null;
            if (acabadoName) {
                group = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === (acabadoName || '').trim().toLowerCase());
            }
            if (!group) group = product.acabados_groups[0];

            if (group && group.medidas_variants && group.medidas_variants.length > 0) {
                let variant = null;
                if (medidaName) {
                    variant = group.medidas_variants.find(m => (m.medida || '').trim().toLowerCase() === (medidaName || '').trim().toLowerCase());
                }
                if (!variant) variant = group.medidas_variants[0];
                if (variant && (variant.price !== undefined && variant.price !== null)) {
                    foundPrice = parseFloat(variant.price) || 0;
                }
            }
        }

        // 2. Search direct product.medidas_variants if foundPrice is still 0
        if (foundPrice === 0 && product.medidas_variants && product.medidas_variants.length > 0) {
            let variant = null;
            if (medidaName) {
                variant = product.medidas_variants.find(m => (m.medida || '').trim().toLowerCase() === (medidaName || '').trim().toLowerCase());
            }
            if (!variant) variant = product.medidas_variants[0];
            if (variant && (variant.price !== undefined && variant.price !== null)) {
                foundPrice = parseFloat(variant.price) || 0;
            }
        }

        // 3. Direct product price fallbacks
        if (foundPrice === 0) {
            foundPrice = parseFloat(product.price || product.base_price || product.precio || product.price_base) || 0;
        }

        return foundPrice;
    }

    function addProductToCombo(product) {
        // Extract default price, variant and image
        let defaultAcabado = 'Natural';
        let defaultMedida = 'Estándar';
        let defaultImage = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');

        if (product.acabados_groups && product.acabados_groups.length > 0) {
            const firstG = product.acabados_groups[0];
            defaultAcabado = firstG.acabado_name || 'Natural';
            if (firstG.cover_image) {
                defaultImage = firstG.cover_image;
            } else if (firstG.images_list && firstG.images_list.length > 0) {
                defaultImage = firstG.images_list[0];
            }
            if (firstG.medidas_variants && firstG.medidas_variants.length > 0) {
                const firstV = firstG.medidas_variants[0];
                defaultMedida = firstV.medida || 'Estándar';
            }
        } else if (product.medidas_variants && product.medidas_variants.length > 0) {
            const firstV = product.medidas_variants[0];
            defaultMedida = firstV.medida || 'Estándar';
        }

        const defaultPrice = resolveProductPrice(product, defaultAcabado, defaultMedida);

        // Check if item already exists in selectedComboItems
        const existingItem = selectedComboItems.find(item => item.productId === product.id && item.acabado === defaultAcabado && item.medida === defaultMedida);
        if (existingItem) {
            existingItem.quantity = (parseInt(existingItem.quantity, 10) || 1) + 1;
        } else {
            selectedComboItems.push({
                productId: product.id,
                title: product.title,
                image: defaultImage,
                acabado: defaultAcabado,
                medida: defaultMedida,
                unitPrice: defaultPrice,
                quantity: 1
            });
        }

        renderSelectedComboItems();
        recalculateSubtotal();
        autoFillOfferInfo(false);
    }

    function autoFillOfferInfo(force = false) {
        const titleInput = document.getElementById('offer-title');
        const descInput = document.getElementById('offer-description');
        if (!titleInput || !descInput) return;

        if (selectedComboItems.length === 0) return;

        // If not forced and user already typed a custom title, keep user's title
        if (!force && titleInput.value.trim() !== '') return;

        let totalUnits = 0;
        selectedComboItems.forEach(i => totalUnits += (parseInt(i.quantity, 10) || 1));

        // Extract and clean titles with quantity prefixes
        const titleParts = selectedComboItems.map(item => {
            let t = item.title || 'Producto';
            t = t.replace(/^Baranda:\s*/i, '').replace(/^Mesa:\s*/i, '').replace(/^Silla:\s*/i, '').trim();
            const qty = parseInt(item.quantity, 10) || 1;
            return qty > 1 ? `x${qty} ${t}` : t;
        });

        let generatedTitle = '';
        let generatedDesc = '';

        if (selectedComboItems.length === 1) {
            const qty = parseInt(selectedComboItems[0].quantity, 10) || 1;
            if (qty > 1) {
                generatedTitle = `Combo Promocional: Pack x${qty} ${titleParts[0].replace(/^x\d+\s*/, '')}`;
                generatedDesc = `¡Llevate este súper pack de ${qty} unidades con un descuento promocional exclusivo por tiempo limitado!`;
            } else {
                generatedTitle = `Oferta Especial: ${titleParts[0]}`;
                generatedDesc = `¡Llevate este ${titleParts[0]} con un descuento promocional exclusivo por tiempo limitado!`;
            }
        } else {
            generatedTitle = `Combo Especial (Pack x${totalUnits}): ${titleParts.join(' + ')}`;
            generatedDesc = `¡Súper combo de ${totalUnits} unidades de productos con precio bonificado y ahorro directo!`;
        }

        titleInput.value = generatedTitle;
        descInput.value = generatedDesc;
    }

    function renderSelectedComboItems() {
        const container = document.getElementById('offer-selected-items-list');
        if (!container) return;

        let totalUnits = 0;
        selectedComboItems.forEach(i => totalUnits += (parseInt(i.quantity, 10) || 1));

        const countBadge = document.getElementById('offer-selected-count-badge');
        if (countBadge) {
            countBadge.textContent = `${totalUnits} unidad${totalUnits === 1 ? '' : 'es'}`;
        }

        if (selectedComboItems.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; padding: 0.5rem 0;">Ningún producto seleccionado para este combo.</p>';
            recalculateSubtotal();
            return;
        }

        container.innerHTML = '';
        selectedComboItems.forEach((item, index) => {
            if (!item.quantity) item.quantity = 1;
            const prodRes = findProductByIdInSession(item.productId);
            const product = prodRes ? prodRes.product : null;

            // Build variants & medidas select options and gather photos for selected acabado
            let acabadosOptionsHTML = '';
            let medidasOptionsHTML = '';
            let availableImages = [];

            if (product) {
                if (product.acabados_groups && product.acabados_groups.length > 0) {
                    product.acabados_groups.forEach(g => {
                        const name = g.acabado_name || 'Natural';
                        acabadosOptionsHTML += `<option value="${name}" ${name === item.acabado ? 'selected' : ''}>${name}</option>`;
                    });

                    const currentGroup = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === (item.acabado || '').trim().toLowerCase()) || product.acabados_groups[0];
                    if (currentGroup) {
                        if (currentGroup.cover_image) availableImages.push(currentGroup.cover_image);
                        if (currentGroup.images_list && Array.isArray(currentGroup.images_list)) {
                            currentGroup.images_list.forEach(img => {
                                if (img && !availableImages.includes(img)) availableImages.push(img);
                            });
                        }

                        if (currentGroup.medidas_variants && currentGroup.medidas_variants.length > 0) {
                            currentGroup.medidas_variants.forEach(m => {
                                const mName = m.medida || 'Estándar';
                                medidasOptionsHTML += `<option value="${mName}" ${mName === item.medida ? 'selected' : ''}>${mName}</option>`;
                            });
                        }
                    }
                } else if (product.medidas_variants && product.medidas_variants.length > 0) {
                    product.medidas_variants.forEach(m => {
                        const mName = m.medida || 'Estándar';
                        medidasOptionsHTML += `<option value="${mName}" ${mName === item.medida ? 'selected' : ''}>${mName}</option>`;
                    });
                }

                if (availableImages.length === 0) {
                    if (Array.isArray(product.image)) {
                        availableImages = product.image;
                    } else if (product.image) {
                        availableImages = [product.image];
                    }
                }
            }

            // Fallback image if item.image is empty or not in availableImages
            if (!item.image && availableImages.length > 0) {
                item.image = availableImages[0];
            }

            // Ensure price is synced if unitPrice was 0
            if ((!item.unitPrice || item.unitPrice === 0) && product) {
                item.unitPrice = resolveProductPrice(product, item.acabado, item.medida);
            }

            const card = document.createElement('div');
            card.style.cssText = `
                background: #ffffff;
                border: 1.5px solid #e2e8f0;
                border-radius: 12px;
                padding: 0.85rem;
                margin-bottom: 0.75rem;
                box-shadow: 0 2px 6px rgba(0,0,0,0.02);
                display: flex;
                flex-direction: column;
                gap: 0.6rem;
            `;

            card.innerHTML = `
                <!-- Fila Superior: Foto + Título + Botón Eliminar -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                        <img class="combo-item-img" src="${item.image || 'img/logo_provisional.png'}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; flex-shrink: 0; cursor: pointer;" title="Foto actual del producto">
                        <div style="font-weight: 800; font-size: 0.88rem; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${item.title}
                        </div>
                    </div>
                    <button type="button" class="btn-remove-item" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;" title="Quitar item de la oferta">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                    </button>
                </div>

                <!-- Fila Inferior: Variantes, Medidas, Fotos, Precio y Cantidad -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        ${acabadosOptionsHTML ? `
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Acabado:</span>
                                <select class="combo-acabado-select" style="font-size: 0.78rem; font-weight: 600; padding: 3px 8px; border-radius: 6px; border: 1.5px solid #cbd5e1; background: white; color: #334155;">
                                    ${acabadosOptionsHTML}
                                </select>
                            </div>
                        ` : ''}

                        ${medidasOptionsHTML ? `
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Medida:</span>
                                <select class="combo-medida-select" style="font-size: 0.78rem; font-weight: 600; padding: 3px 8px; border-radius: 6px; border: 1.5px solid #cbd5e1; background: white; color: #334155;">
                                    ${medidasOptionsHTML}
                                </select>
                            </div>
                        ` : ''}

                        ${availableImages.length > 1 ? `
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Foto:</span>
                                <select class="combo-image-select" style="font-size: 0.78rem; font-weight: 600; padding: 3px 6px; border-radius: 6px; border: 1.5px solid #cbd5e1; background: white; color: #334155;">
                                    ${availableImages.map((imgUrl, i) => `<option value="${imgUrl}" ${imgUrl === item.image ? 'selected' : ''}>Foto ${i + 1}</option>`).join('')}
                                </select>
                            </div>
                        ` : ''}

                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Precio un.:</span>
                            <input type="number" class="combo-price-input" value="${item.unitPrice}" style="width: 85px; font-size: 0.8rem; font-weight: 800; padding: 3px 6px; border-radius: 6px; border: 1.5px solid #cbd5e1; background: white; color: #166534;" title="Precio unitario de lista">
                        </div>
                    </div>

                    <!-- Quantitative Controls -->
                    <div style="display: flex; align-items: center; gap: 6px; background: white; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 2px 8px;">
                        <button type="button" class="btn-item-qty-minus" style="border: none; background: transparent; font-weight: 900; cursor: pointer; color: #475569; font-size: 1.1rem; padding: 0 4px;" title="Disminuir cantidad">-</button>
                        <span class="item-qty-label" style="font-size: 0.85rem; font-weight: 900; color: #0f172a; min-width: 32px; text-align: center;">x${item.quantity}</span>
                        <button type="button" class="btn-item-qty-plus" style="border: none; background: transparent; font-weight: 900; cursor: pointer; color: #475569; font-size: 1.1rem; padding: 0 4px;" title="Aumentar cantidad">+</button>
                    </div>
                </div>
            `;

            const priceIn = card.querySelector('.combo-price-input');
            if (priceIn) {
                priceIn.addEventListener('input', (e) => {
                    item.unitPrice = parseFloat(e.target.value) || 0;
                    recalculateSubtotal();
                });
            }

            const acabadoSel = card.querySelector('.combo-acabado-select');
            if (acabadoSel) {
                acabadoSel.addEventListener('change', (e) => {
                    const selectedName = e.target.value;
                    item.acabado = selectedName;
                    if (product && product.acabados_groups) {
                        const group = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === selectedName.trim().toLowerCase());
                        if (group) {
                            if (group.cover_image) {
                                item.image = group.cover_image;
                            } else if (group.images_list && group.images_list.length > 0) {
                                item.image = group.images_list[0];
                            }
                            if (group.medidas_variants && group.medidas_variants.length > 0) {
                                const hasMed = group.medidas_variants.some(m => m.medida === item.medida);
                                if (!hasMed) {
                                    item.medida = group.medidas_variants[0].medida || 'Estándar';
                                }
                            }
                        }
                    }
                    const catPrice = resolveProductPrice(product, item.acabado, item.medida);
                    if (catPrice > 0) {
                        item.unitPrice = catPrice;
                    }
                    renderSelectedComboItems();
                    recalculateSubtotal();
                    autoFillOfferInfo(false);
                });
            }

            const medidaSel = card.querySelector('.combo-medida-select');
            if (medidaSel) {
                medidaSel.addEventListener('change', (e) => {
                    item.medida = e.target.value;
                    const catPrice = resolveProductPrice(product, item.acabado, item.medida);
                    if (catPrice > 0) {
                        item.unitPrice = catPrice;
                    }
                    renderSelectedComboItems();
                    recalculateSubtotal();
                    autoFillOfferInfo(false);
                });
            }

            const imgSel = card.querySelector('.combo-image-select');
            if (imgSel) {
                imgSel.addEventListener('change', (e) => {
                    item.image = e.target.value;
                    const imgEl = card.querySelector('.combo-item-img');
                    if (imgEl) imgEl.src = item.image;
                });
            }

            const btnMinus = card.querySelector('.btn-item-qty-minus');
            if (btnMinus) {
                btnMinus.addEventListener('click', () => {
                    if (item.quantity > 1) {
                        item.quantity--;
                    } else {
                        selectedComboItems.splice(index, 1);
                    }
                    renderSelectedComboItems();
                    recalculateSubtotal();
                    autoFillOfferInfo(false);
                });
            }

            const btnPlus = card.querySelector('.btn-item-qty-plus');
            if (btnPlus) {
                btnPlus.addEventListener('click', () => {
                    item.quantity = (parseInt(item.quantity, 10) || 1) + 1;
                    renderSelectedComboItems();
                    recalculateSubtotal();
                    autoFillOfferInfo(false);
                });
            }

            card.querySelector('.btn-remove-item').addEventListener('click', () => {
                selectedComboItems.splice(index, 1);
                renderSelectedComboItems();
                recalculateSubtotal();
                autoFillOfferInfo(false);
            });

            container.appendChild(card);
        });

        recalculateSubtotal();
    }

    function findProductByIdInSession(id) {
        if (!window.sessionProducts) return null;
        for (const cat of window.sessionProducts) {
            if (cat.products) {
                const found = cat.products.find(p => p.id === id);
                if (found) return { product: found, catName: cat.name };
            }
        }
        return null;
    }

    function recalculateSubtotal() {
        let sum = 0;
        selectedComboItems.forEach(item => {
            const qty = parseInt(item.quantity, 10) || 1;
            sum += (item.unitPrice || 0) * qty;
        });

        const subtotalEl = document.getElementById('offer-subtotal-display');
        if (subtotalEl) {
            subtotalEl.textContent = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(sum);
        }

        document.getElementById('offer-subtotal-hidden').value = sum;
        recalculateOfferPrices('discount');
    }

    function recalculateOfferPrices(triggerSource = 'discount') {
        const subtotal = parseFloat(document.getElementById('offer-subtotal-hidden').value) || 0;
        const discountInput = document.getElementById('offer-discount-percent');
        const priceInput = document.getElementById('offer-final-price');
        const savingsEl = document.getElementById('offer-savings-display');

        if (subtotal <= 0) return;

        if (triggerSource === 'discount') {
            const pct = parseFloat(discountInput.value) || 0;
            const finalPrice = Math.round(subtotal * (1 - pct / 100));
            priceInput.value = finalPrice > 0 ? finalPrice : '';
        } else if (triggerSource === 'price') {
            const finalPrice = parseFloat(priceInput.value) || 0;
            const pct = Math.round(((subtotal - finalPrice) / subtotal) * 100);
            discountInput.value = pct > 0 ? pct : '';
        }

        const currentFinalPrice = parseFloat(priceInput.value) || subtotal;
        const savings = Math.max(0, subtotal - currentFinalPrice);

        if (savingsEl) {
            if (savings > 0) {
                const fmtSavings = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(savings);
                savingsEl.innerHTML = `💰 <b>Ahorro para el cliente: ${fmtSavings}</b>`;
                savingsEl.style.display = 'block';
            } else {
                savingsEl.style.display = 'none';
            }
        }
    }

    async function saveOffer() {
        const title = document.getElementById('offer-title').value.trim();
        if (!title) {
            alert('Por favor decí un nombre para la oferta o combo.');
            return;
        }

        if (selectedComboItems.length === 0) {
            alert('Agregá al menos 1 producto al combo.');
            return;
        }

        const subtotal = parseFloat(document.getElementById('offer-subtotal-hidden').value) || 0;
        const offerPrice = parseFloat(document.getElementById('offer-final-price').value) || subtotal;
        const discountPercent = parseInt(document.getElementById('offer-discount-percent').value) || 0;
        const stampStyle = document.getElementById('offer-stamp-style').value || 'pro-gold';
        const stockLimitVal = document.getElementById('offer-stock-limit').value;
        const stockLimit = stockLimitVal ? parseInt(stockLimitVal) : null;
        const shippingType = document.getElementById('offer-shipping-type').value || 'standard';
        const shippingCost = parseFloat(document.getElementById('offer-shipping-cost').value) || 0;

        // Configuración estructurada de envíos para la oferta (Logística, Flete, Otro, Gratis)
        const shippingConfig = {
            logisticaEnabled: document.getElementById('offer-ship-logistica-enabled')?.checked || false,
            logisticaCost: parseFloat(document.getElementById('offer-ship-logistica-cost')?.value) || 0,
            fleteEnabled: document.getElementById('offer-ship-flete-enabled')?.checked || false,
            fleteCost: parseFloat(document.getElementById('offer-ship-flete-cost')?.value) || 0,
            otroEnabled: document.getElementById('offer-ship-otro-enabled')?.checked || false,
            otroLabel: document.getElementById('offer-ship-otro-label')?.value.trim() || 'A convenir',
            otroCost: parseFloat(document.getElementById('offer-ship-otro-cost')?.value) || 0,
            isFreeShipping: document.getElementById('offer-ship-is-free')?.checked || false
        };

        const hasTimer = document.getElementById('offer-has-timer').checked;
        const expirationDate = hasTimer ? document.getElementById('offer-expiration-date').value : null;
        const customCoverImage = document.getElementById('offer-custom-cover-url').value || '';
        const description = document.getElementById('offer-description').value || '';

        const offerId = editingOfferId || 'offer_' + Date.now();

        const offerObj = {
            id: offerId,
            title,
            description,
            stampStyle,
            stockLimit,
            product_items: selectedComboItems,
            subtotalPrice: subtotal,
            offerPrice,
            discountPercent,
            shippingType: shippingConfig.isFreeShipping ? 'free' : shippingType,
            shippingCost,
            shippingConfig,
            hasTimer,
            expirationDate,
            customCoverImage,
            active: true,
            created_at: Date.now()
        };

        if (!window.sessionOffers) window.sessionOffers = [];

        if (editingOfferId) {
            const idx = window.sessionOffers.findIndex(o => o.id === editingOfferId);
            if (idx !== -1) {
                window.sessionOffers[idx] = offerObj;
            } else {
                window.sessionOffers.push(offerObj);
            }
        } else {
            window.sessionOffers.unshift(offerObj);
        }

        // Save local and server
        try {
            localStorage.setItem('sessionOffersAutonomo', JSON.stringify(window.sessionOffers));
            await fetch('/api/save-offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.sessionOffers)
            });
        } catch (e) {
            console.error('Error guardando ofertas en el servidor:', e);
        }

        closeOfferModal();
        window.renderAdminOffers();
        if (window.renderOffersFrontend) window.renderOffersFrontend();
        if (window.renderHome) window.renderHome();
    }

    window.toggleOfferActive = async function(offerId) {
        const offer = (window.sessionOffers || []).find(o => o.id === offerId);
        if (offer) {
            offer.active = offer.active === false ? true : false;
            try {
                localStorage.setItem('sessionOffersAutonomo', JSON.stringify(window.sessionOffers));
                await fetch('/api/save-offers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(window.sessionOffers)
                });
            } catch (e) {}
            window.renderAdminOffers();
            if (window.renderOffersFrontend) window.renderOffersFrontend();
            if (window.renderHome) window.renderHome();
        }
    };

    window.deleteOffer = async function(offerId) {
        if (!confirm('¿Estás seguro de que querés eliminar esta oferta?')) return;
        window.sessionOffers = (window.sessionOffers || []).filter(o => o.id !== offerId);
        try {
            localStorage.setItem('sessionOffersAutonomo', JSON.stringify(window.sessionOffers));
            await fetch('/api/save-offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.sessionOffers)
            });
        } catch (e) {}
        window.renderAdminOffers();
        if (window.renderOffersFrontend) window.renderOffersFrontend();
        if (window.renderHome) window.renderHome();
    };

})();
