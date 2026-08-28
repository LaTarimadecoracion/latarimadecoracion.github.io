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
            showOfferDetailModal(offer);
        });

        return card;
    };

    function showOfferDetailModal(offer) {
        selectedOfferForModal = offer;
        const modal = document.getElementById('offer-detail-modal');
        if (!modal) return;

        document.getElementById('offer-modal-detail-title').textContent = offer.title;
        document.getElementById('offer-modal-detail-desc').textContent = offer.description || '';

        // Formatted prices
        const formattedSubtotal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(offer.subtotalPrice || 0);
        const formattedOfferPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(offer.offerPrice || 0);
        const savings = Math.max(0, (offer.subtotalPrice || 0) - (offer.offerPrice || 0));
        const formattedSavings = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(savings);

        document.getElementById('offer-modal-original-price').textContent = formattedSubtotal;
        document.getElementById('offer-modal-final-price').textContent = formattedOfferPrice;

        const savingsEl = document.getElementById('offer-modal-savings-tag');
        if (savingsEl) {
            if (savings > 0) {
                savingsEl.textContent = `💰 ¡Ahorrás ${formattedSavings} (${offer.discountPercent}% OFF)!`;
                savingsEl.style.display = 'block';
            } else {
                savingsEl.style.display = 'none';
            }
        }

        // Timer in modal
        const timerPill = document.getElementById('offer-modal-timer-pill');
        if (timerPill) {
            if (offer.hasTimer && offer.expirationDate) {
                timerPill.setAttribute('data-offer-expiration', offer.expirationDate);
                timerPill.style.display = 'inline-flex';
            } else {
                timerPill.style.display = 'none';
            }
        }

        // Included items list
        const itemsContainer = document.getElementById('offer-modal-items-list');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            if (offer.product_items && offer.product_items.length > 0) {
                offer.product_items.forEach(item => {
                    const row = document.createElement('div');
                    row.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 0.5rem;
                        background: #f9fafb;
                        border-radius: 8px;
                        border: 1px solid #f0f0f0;
                        margin-bottom: 0.4rem;
                    `;
                    row.innerHTML = `
                        <img src="${item.image || 'img/logo_provisional.png'}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                                ${item.quantity && item.quantity > 1 ? `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 0.75rem; padding: 2px 7px; border-radius: 12px;">x${item.quantity}</span>` : ''}
                                <span>${item.title}</span>
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">
                                ${item.acabado ? `Variante: <b>${item.acabado}</b>` : ''}
                            </div>
                        </div>
                    `;
                    itemsContainer.appendChild(row);
                });
            }
        }

        modal.style.display = 'flex';
        updateCountdownLabels();
    }

    function closeOfferDetailModal() {
        const modal = document.getElementById('offer-detail-modal');
        if (modal) modal.style.display = 'none';
        selectedOfferForModal = null;
    }

    function addOfferToCart(offer) {
        try {
            const carritoModule = (window.parent && window.parent.CarritoModule) || window.CarritoModule;
            if (carritoModule && typeof carritoModule.toggle === 'function') {
                // Generate a custom bundle title
                const comboTitle = `COMBO: ${offer.title}`;
                const comboSub = (offer.product_items || []).map(i => i.title).join(' + ');

                carritoModule.toggle(
                    { id: offer.id, title: comboTitle, image: offer.customCoverImage || (offer.product_items && offer.product_items[0] ? offer.product_items[0].image : 'img/logo_provisional.png') },
                    'Combo Especial',
                    'OFERTAS',
                    comboSub,
                    '',
                    '',
                    offer.offerPrice
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
