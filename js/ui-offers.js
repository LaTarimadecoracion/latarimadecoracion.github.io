// js/ui-offers.js
// --- FRONTEND OFFERS & COMBOS MODULE ---

(function() {
    let timerInterval = null;
    let selectedOfferForModal = null;

    window.initOffersFrontend = function() {
        startOffersCountdownTimer();
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
    };

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

    window.renderOffersFrontend = function() {
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

        if (activeOffers.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 56px; opacity: 0.4;">local_offer</span>
                    <h3 style="margin: 0.5rem 0 0.25rem; font-weight: 700; color: var(--text-main);">No hay ofertas vigentes</h3>
                    <p style="font-size: 0.9rem;">Pronto tendremos nuevos combos y descuentos relámpago. ¡Volvé a consultar más tarde!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        activeOffers.forEach(offer => {
            const card = createOfferCardElement(offer);
            container.appendChild(card);
        });

        updateCountdownLabels();
    };

    window.createOfferCardElement = function(offer, isCarousel = false) {
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
            <div class="offer-photo-wrapper" style="position: relative; width: 100%; height: ${isCarousel ? '190px' : '220px'}; overflow: hidden; background: #1a1a1a;">
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

    function showOfferInfoModal(type) {
        const existing = document.getElementById('offer-info-modal-overlay');
        if (existing) existing.remove();

        const modalData = {
            payments: {
                title: '💳 Formas de Pago & Compra Directa',
                icon: 'payments',
                color: '#16a34a',
                html: `
                    <div style="display:flex; flex-direction:column; gap:12px; font-size:0.88rem; color:#334155; line-height:1.5;">
                        <div style="background:#fff7ed; border:1.5px solid #f59e0b; padding:12px; border-radius:12px;">
                            <strong style="color:#92400e; display:block; margin-bottom:4px;">📌 Venta Directa Sin Intermediarios</strong>
                            Los precios de estas ofertas corresponden exclusivamente a <strong>compra directa de fábrica</strong> (fuera de cualquier plataforma de terceros) y no incluyen impuestos ni IVA.
                        </div>
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:12px;">
                            <strong style="color:#166534; display:block; margin-bottom:4px;">💵 Efectivo / Transferencia Bancaria</strong>
                            Aboná tu pedido al retirar por el taller o mediante transferencia bancaria congelando el precio promocional sin aumentos.
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:12px;">
                            <strong style="color:#0f172a; display:block; margin-bottom:4px;">🚚 Entrega & Retiro</strong>
                            Podés <strong>retirar tu pedido directamente por nuestro taller</strong> o <strong>coordinar envío a domicilio</strong>.
                        </div>
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

    function openOfferDetailView(offer) {
        if (!offer) return;
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
        if (descEl) descEl.textContent = offer.description || 'Combo especial con precio bonificado y ahorro exclusivo por tiempo limitado.';

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
                showOfferPaymentModal(offer, offerPackQty);
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

        requestAnimationFrame(() => overlay.classList.add('open'));

        const closeModal = () => {
            overlay.classList.remove('open');
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

    function showOfferPaymentModal(offer, packQty = 1) {
        const existing = document.getElementById('offer-payment-modal-overlay');
        if (existing) existing.remove();

        const phone = '5491167007723';
        const totalOfferVal = (offer.offerPrice || 0) * packQty;
        const formatCurr = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(val);
        const formattedOfferPrice = formatCurr(totalOfferVal);
        
        const alias = 'VENUS.PULMON.METRO';
        const cbu = '0720048988000002273736';
        const bank = 'Banco Santander';
        const titular = 'Yonatan Lucas Orellana';
        const cuit = '20-35281538-2';

        const overlay = document.createElement('div');
        overlay.id = 'offer-payment-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 1rem; opacity: 0; transition: opacity 0.25s ease-out; box-sizing: border-box;';

        const card = document.createElement('div');
        card.style.cssText = 'position: relative; max-width: 620px; width: 100%; border-radius: 24px; padding: 1.75rem; background: #ffffff; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); border: 1px solid #cbd5e1; font-family: var(--font-main); box-sizing: border-box; display: flex; flex-direction: column; align-items: stretch; gap: 0; transform: scale(0.92); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); margin: auto; max-height: 90vh; overflow-y: auto;';
        
        card.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.85rem; margin-bottom: 1.25rem; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                    <span class="material-symbols-outlined" style="color: #0f172a; font-size: 22px; background: #f1f5f9; padding: 6px; border-radius: 10px; flex-shrink: 0;">account_balance</span>
                    <div style="min-width: 0; flex: 1;">
                        <div style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase;">LA TARIMA - DECORACIÓN</div>
                        <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Datos de Transferencia Bancaria</h3>
                    </div>
                </div>
                <button type="button" id="pay-modal-close-x" title="Cerrar" style="background: #f8fafc; border: 1px solid #cbd5e1; font-size: 18px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0; margin-left: 8px;">&times;</button>
            </div>

            <!-- Resumen de Monto con Icono de Interrogación a la Derecha -->
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 0.85rem 1.1rem; margin-bottom: 1rem; width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative;">
                <div style="min-width: 0; flex: 1;">
                    <div style="font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Monto Total a Abonar</div>
                    <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${offer.title} ${packQty > 1 ? `(x${packQty})` : ''}</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; position: relative;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <div id="pay-modal-display-price" style="font-size: 1.55rem; font-weight: 900; color: #059669; font-family: var(--font-main); letter-spacing: -0.5px;">
                            ${formattedOfferPrice}
                        </div>
                        <button type="button" id="btn-pay-info-tooltip" title="Información sobre el precio" style="background: none; border: none; padding: 2px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #0284c7; border-radius: 50%;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">help_outline</span>
                        </button>
                    </div>

                    <div id="pay-modal-tax-badge" style="display: none; font-size: 0.62rem; font-weight: 800; color: #1e40af; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 2px 6px; margin-top: 2px;">
                        +21% IVA + IIBB PBA
                    </div>

                    <!-- Tooltip Popover Flotante en Hover/Click -->
                    <div id="pay-info-tooltip-popover" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 6px; background: #0f172a; color: #ffffff; padding: 0.75rem 0.9rem; border-radius: 12px; font-size: 0.75rem; width: 250px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 100; line-height: 1.4; text-align: left;">
                        <div style="font-weight: 800; margin-bottom: 4px; color: #38bdf8;">ℹ️ Precio Transferencia Directa</div>
                        Monto de contado/transferencia directa consumidor final sin IVA adicional ni comisiones intermedias.
                    </div>
                </div>
            </div>

            <!-- Opción Factura A (Limpia, expande formulario al tildar) -->
            <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; margin-bottom: 1.25rem; width: 100%; box-sizing: border-box;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 800; color: #0f172a; margin: 0;">
                    <input type="checkbox" id="chk-factura-a" style="width: 18px; height: 18px; accent-color: #0f172a; cursor: pointer;">
                    <span>Necesito Factura A (Responsable Inscripto)</span>
                </label>

                <!-- Menú Desplegable con Recálculo y Datos Fiscales -->
                <div id="factura-a-expand-menu" style="display: none; flex-direction: column; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                    <div style="font-size: 0.73rem; color: #475569; line-height: 1.35; background: #f8fafc; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        ⚠️ Adiciona <strong>+21% de IVA</strong> + <strong>3.5% de Ingresos Brutos PBA</strong>.
                    </div>

                    <!-- Desglose Impositivo Estilo Presupuesto (Columna de Precios Alineada a la Derecha) -->
                    <div id="factura-a-breakdown" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.75rem 0.9rem; display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; color: #334155;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-weight: 600;">Base Oferta:</span>
                            <span id="factura-base-val" style="font-weight: 700; color: #0f172a; font-family: monospace;"></span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-weight: 600;">IVA (21%):</span>
                            <span id="factura-iva-val" style="font-weight: 700; color: #0f172a; font-family: monospace;"></span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-weight: 600;">IIBB PBA (3.5%):</span>
                            <span id="factura-iibb-val" style="font-weight: 700; color: #0f172a; font-family: monospace;"></span>
                        </div>
                        <div style="border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 2px; display: flex; justify-content: space-between; align-items: center; font-weight: 800;">
                            <span style="color: #0f172a; font-size: 0.82rem;">Total Facturado:</span>
                            <span id="factura-total-val" style="color: #059669; font-size: 0.9rem; font-weight: 900; font-family: var(--font-main);"></span>
                        </div>
                    </div>

                    <!-- Campos de Datos Fiscales -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 4px;">
                        <div>
                            <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                Razón Social / Empresa:
                            </label>
                            <input type="text" id="factura-razon-social" placeholder="Ej: La Tarima SRL" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                CUIT:
                            </label>
                            <input type="text" id="factura-cuit" placeholder="Ej: 30-12345678-9" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>

                        <div style="grid-column: 1 / -1; width: 100%;">
                            <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                Dirección Fiscal:
                            </label>
                            <input type="text" id="factura-direccion-fiscal" placeholder="Av. Rivadavia 1234, Ciudad/localidad, Provincia" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Datos de CBU y Alias Reorganizados en Grid para Desktop PC -->
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 1.25rem; width: 100%; box-sizing: border-box;">
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; width: 100%; box-sizing: border-box;">
                    <!-- Alias Block Lineal Centrado -->
                    <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; text-align: center; align-items: center; justify-content: space-between;">
                        <div style="width: 100%;">
                            <div style="font-size: 0.65rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">ALIAS (SANTANDER / MP)</div>
                            <div style="font-size: 1.1rem; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 2px; letter-spacing: 0.5px; word-break: break-all;">${alias}</div>
                        </div>
                        <button type="button" id="btn-copy-alias" style="background: #0f172a; color: #ffffff; border: none; border-radius: 8px; padding: 7px 14px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; max-width: 150px; box-sizing: border-box; box-shadow: 0 2px 6px rgba(15,23,42,0.12); margin: 0 auto; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
                            <span class="material-symbols-outlined" id="copy-alias-icon" style="font-size: 15px;">content_copy</span>
                            <span id="copy-alias-lbl">Copiar</span>
                        </button>
                    </div>

                    <!-- CBU Block Lineal Centrado -->
                    <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; text-align: center; align-items: center; justify-content: space-between;">
                        <div style="width: 100%;">
                            <div style="font-size: 0.65rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">CBU / CVU</div>
                            <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; font-family: monospace; margin-top: 2px; word-break: break-all; letter-spacing: 0.5px;">${cbu}</div>
                        </div>
                        <button type="button" id="btn-copy-cbu" style="background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 14px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; max-width: 150px; box-sizing: border-box; margin: 0 auto; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
                            <span class="material-symbols-outlined" id="copy-cbu-icon" style="font-size: 15px;">content_copy</span>
                            <span id="copy-cbu-lbl">Copiar</span>
                        </button>
                    </div>
                </div>

                <!-- Ficha Oficial del Titular -->
                <div style="background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box; font-size: 0.8rem; color: #334155; display: flex; flex-wrap: wrap; justify-content: space-around; gap: 8px; text-align: center;">
                    <div>Titular: <strong style="color: #0f172a;">${titular}</strong></div>
                    <div>CUIT/CUIL: <strong style="color: #0f172a;">${cuit}</strong></div>
                    <div>Banco: <strong style="color: #0f172a;">${bank}</strong></div>
                </div>
            </div>

            <!-- Forma de Entrega Tildable (Retiro vs Envío) -->
            <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; margin-bottom: 1rem; width: 100%; box-sizing: border-box;">
                <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; text-align: center;">
                    🚚 Forma de Entrega Preferida:
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 10px;">
                        <input type="radio" name="pay-delivery-mode" id="pay-mode-pickup" value="pickup" checked style="accent-color: #0f172a; cursor: pointer;">
                        <span>🏬 Retiro por Taller / Local</span>
                    </label>

                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 10px;">
                        <input type="radio" name="pay-delivery-mode" id="pay-mode-shipping" value="shipping" style="accent-color: #0f172a; cursor: pointer;">
                        <span>🚚 Envío a Domicilio / Expreso</span>
                    </label>
                </div>

                <!-- Menú Desplegable de Datos de Envío (Solo si tilda Envío) -->
                <div id="pay-shipping-expand-menu" style="display: none; flex-direction: column; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                    <div style="font-size: 0.72rem; color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 6px 10px;">
                        📍 Completá tu dirección para coordinar la cotización y despacho de tu envío:
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                            Dirección (Calle y Altura):
                        </label>
                        <input type="text" id="pay-ship-dir" placeholder="Ej: Av. Corrientes 1234, 4to B" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Código Postal:
                            </label>
                            <input type="text" id="pay-ship-cp" placeholder="Ej: 1414" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Ciudad / Localidad:
                            </label>
                            <input type="text" id="pay-ship-ciudad" placeholder="Ej: Morón / CABA" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Provincia:
                            </label>
                            <input type="text" id="pay-ship-provincia" placeholder="Ej: Buenos Aires" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Campo de Aclaraciones Opcional -->
            <div style="width: 100%; box-sizing: border-box; margin-bottom: 1rem;">
                <label for="pay-modal-notes" style="display: block; font-size: 0.75rem; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px; text-align: center;">
                    ✏️ Aclaraciones sobre tu pago / pedido (Opcional):
                </label>
                <textarea id="pay-modal-notes" rows="2" placeholder="Ej: Transfirió mi pareja Juan Pérez, o aclaro que retiro por el taller el viernes..." style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; resize: none; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='#cbd5e1'"></textarea>
            </div>

            <!-- Recordatorio Visual de Adjuntar Foto de Pago (Opción 5) -->
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 0.65rem 0.85rem; margin-bottom: 1rem; font-size: 0.75rem; color: #166534; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 18px; color: #15803d; flex-shrink: 0;">add_a_photo</span>
                <span><strong>Paso final:</strong> Al abrir WhatsApp, recordá adjuntar la captura del comprobante.</span>
            </div>

            <!-- Botón Centrado Horizontalmente Minimalista -->
            <div style="display: flex; justify-content: center; width: 100%; box-sizing: border-box; margin-top: 0.25rem;">
                <button type="button" id="btn-submit-receipt-wa" style="width: 100%; max-width: 420px; justify-content: center; font-size: 0.9rem; font-weight: 800; background: #0f172a; border: 1px solid #0f172a; color: #ffffff; padding: 0.9rem 1.25rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(15,23,42,0.15); cursor: pointer; display: flex; align-items: center; gap: 8px; box-sizing: border-box; letter-spacing: 0.4px; transition: all 0.2s ease-in-out;">
                    <span class="material-symbols-outlined" style="font-size: 19px; color: #25d366;">chat</span>
                    <span>Enviar Comprobante por WhatsApp</span>
                </button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });

        const closeModal = () => {
            overlay.style.opacity = '0';
            card.style.transform = 'scale(0.92)';
            setTimeout(() => overlay.remove(), 250);
        };

        document.getElementById('pay-modal-close-x')?.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Evento Icono de Interrogación (Tooltip de Información en Hover & Click)
        const tooltipBtn = document.getElementById('btn-pay-info-tooltip');
        const tooltipPopover = document.getElementById('pay-info-tooltip-popover');
        if (tooltipBtn && tooltipPopover) {
            tooltipBtn.addEventListener('mouseenter', () => { tooltipPopover.style.display = 'block'; });
            tooltipBtn.addEventListener('mouseleave', () => { tooltipPopover.style.display = 'none'; });
            tooltipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                tooltipPopover.style.display = tooltipPopover.style.display === 'block' ? 'none' : 'block';
            });
        }

        // Evento Checkbox Factura A (Expande Menú, Recalcula e incluye Razón Social y CUIT)
        const chkFacturaA = document.getElementById('chk-factura-a');
        const expandMenu = document.getElementById('factura-a-expand-menu');
        const priceDisplay = document.getElementById('pay-modal-display-price');
        const taxBadge = document.getElementById('pay-modal-tax-badge');

        chkFacturaA?.addEventListener('change', () => {
            if (chkFacturaA.checked) {
                const ivaVal = totalOfferVal * 0.21;
                const iibbVal = totalOfferVal * 0.035;
                const totalFactA = totalOfferVal * 1.245;

                if (priceDisplay) priceDisplay.textContent = formatCurr(totalFactA);
                if (taxBadge) taxBadge.style.display = 'block';
                if (tooltipBtn) tooltipBtn.style.display = 'none';
                if (tooltipPopover) tooltipPopover.style.display = 'none';
                if (expandMenu) {
                    expandMenu.style.display = 'flex';
                    document.getElementById('factura-base-val').textContent = formatCurr(totalOfferVal);
                    document.getElementById('factura-iva-val').textContent = formatCurr(ivaVal);
                    document.getElementById('factura-iibb-val').textContent = formatCurr(iibbVal);
                    document.getElementById('factura-total-val').textContent = formatCurr(totalFactA);
                }
            } else {
                if (priceDisplay) priceDisplay.textContent = formattedOfferPrice;
                if (taxBadge) taxBadge.style.display = 'none';
                if (tooltipBtn) tooltipBtn.style.display = 'inline-flex';
                if (expandMenu) expandMenu.style.display = 'none';
            }
        });

        // Evento Selección de Forma de Entrega (Retiro vs Envío)
        const radioPickup = document.getElementById('pay-mode-pickup');
        const radioShipping = document.getElementById('pay-mode-shipping');
        const shippingExpandMenu = document.getElementById('pay-shipping-expand-menu');

        const handleDeliveryToggle = () => {
            if (radioShipping && radioShipping.checked) {
                if (shippingExpandMenu) shippingExpandMenu.style.display = 'flex';
            } else {
                if (shippingExpandMenu) shippingExpandMenu.style.display = 'none';
            }
        };

        radioPickup?.addEventListener('change', handleDeliveryToggle);
        radioShipping?.addEventListener('change', handleDeliveryToggle);

        // Eventos de botones "Copiar" con Micro-Interacción Verde Esmeralda (Opción 4)
        const handleCopyEffect = (btnId, lblId, iconId, textToCopy, defaultLabel) => {
            const btn = document.getElementById(btnId);
            const lbl = document.getElementById(lblId);
            const icon = document.getElementById(iconId);

            if (navigator.clipboard && btn && lbl) {
                navigator.clipboard.writeText(textToCopy);
                
                btn.style.background = '#059669';
                btn.style.color = '#ffffff';
                btn.style.borderColor = '#059669';
                btn.style.transform = 'scale(1.06)';
                lbl.textContent = '✓ Copiado';
                if (icon) icon.textContent = 'check_circle';

                setTimeout(() => {
                    btn.style.transform = 'scale(1)';
                }, 150);

                setTimeout(() => {
                    btn.style.background = btnId === 'btn-copy-alias' ? '#0f172a' : '#f1f5f9';
                    btn.style.color = btnId === 'btn-copy-alias' ? '#ffffff' : '#0f172a';
                    btn.style.borderColor = btnId === 'btn-copy-alias' ? 'transparent' : '#cbd5e1';
                    lbl.textContent = defaultLabel;
                    if (icon) icon.textContent = 'content_copy';
                }, 2000);
            }
        };

        document.getElementById('btn-copy-alias')?.addEventListener('click', () => handleCopyEffect('btn-copy-alias', 'copy-alias-lbl', 'copy-alias-icon', alias, 'Copiar'));
        document.getElementById('btn-copy-cbu')?.addEventListener('click', () => handleCopyEffect('btn-copy-cbu', 'copy-cbu-lbl', 'copy-cbu-icon', cbu, 'Copiar'));

        // Evento Enviar Comprobante por WhatsApp (Formato Sobrio en Lista sin Iconos)
        document.getElementById('btn-submit-receipt-wa')?.addEventListener('click', () => {
            const isFacturaA = chkFacturaA?.checked || false;
            const isShipping = radioShipping?.checked || false;
            const userNotes = document.getElementById('pay-modal-notes')?.value.trim() || '';
            
            let finalPriceVal = totalOfferVal;
            if (isFacturaA) {
                finalPriceVal = totalOfferVal * 1.245;
            }
            const finalPriceFormatted = formatCurr(finalPriceVal);

            let msgLines = [];
            msgLines.push("Hola La Tarima. Adjunto el comprobante de pago de mi pedido.");
            msgLines.push("");
            msgLines.push("Detalle de compra:");
            msgLines.push(`- Combo: ${offer.title} (Pack x${packQty})`);
            msgLines.push(`- Monto abonado: ${finalPriceFormatted}`);
            if (isFacturaA) {
                msgLines.push("- Comprobante solicitado: Factura A (Responsable Inscripto)");
            }

            if (isFacturaA) {
                const razon = document.getElementById('factura-razon-social')?.value.trim() || 'No especificada';
                const cuitEmp = document.getElementById('factura-cuit')?.value.trim() || 'No especificado';
                const dirFiscal = document.getElementById('factura-direccion-fiscal')?.value.trim() || 'No especificada';
                
                msgLines.push("");
                msgLines.push("Datos de facturacion:");
                msgLines.push(`- Razon Social: ${razon}`);
                msgLines.push(`- CUIT: ${cuitEmp}`);
                msgLines.push(`- Direccion Fiscal: ${dirFiscal}`);
            }

            msgLines.push("");
            msgLines.push("Datos de entrega:");
            if (isShipping) {
                const dir = document.getElementById('pay-ship-dir')?.value.trim() || 'No especificada';
                const cp = document.getElementById('pay-ship-cp')?.value.trim() || 'No especificado';
                const ciudad = document.getElementById('pay-ship-ciudad')?.value.trim() || 'No especificada';
                const prov = document.getElementById('pay-ship-provincia')?.value.trim() || 'No especificada';
                
                msgLines.push("- Modalidad: Envio a domicilio / Expreso");
                msgLines.push(`- Direccion: ${dir}`);
                msgLines.push(`- CP: ${cp}`);
                msgLines.push(`- Ciudad: ${ciudad}`);
                msgLines.push(`- Provincia: ${prov}`);
            } else {
                msgLines.push("- Modalidad: Retiro por taller / local");
            }

            if (userNotes) {
                msgLines.push("");
                msgLines.push("Aclaraciones:");
                msgLines.push(`- ${userNotes}`);
            }

            msgLines.push("");
            msgLines.push("Adjunto la captura del comprobante a continuacion. Gracias.");

            const waMsg = msgLines.join("\n");
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
