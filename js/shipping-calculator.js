// js/shipping-calculator.js
// Componente de cálculo de envíos por mensajería propia e interacción visual en el producto

(function() {
    // Formateador de moneda de Argentina
    const formatCurrency = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    });

    // Determinar si la compra entra en entrega el mismo día o al día siguiente
    function getDeliveryPromiseText(config) {
        const now = new Date();
        const currentHour = now.getHours();
        const cutoff = config.cutoffHour || 12;

        if (currentHour < cutoff) {
            return {
                isSameDay: true,
                text: config.sameDayText || `🚀 ¡Llega HOY! (Comprando antes de las ${cutoff}:00 hs)`,
                badgeClass: 'same-day'
            };
        } else {
            return {
                isSameDay: false,
                text: config.nextDayText || `🚚 ¡Llega MAÑANA! (Comprando después de las ${cutoff}:00 hs)`,
                badgeClass: 'next-day'
            };
        }
    }

    // Renderizar el Widget Calculador de Envíos dentro de la Ficha del Producto
    function renderShippingWidget(container, productPrice = 0, onShippingSelectedCallback = null) {
        if (!container) return;

        const config = window.shippingConfig || window.getShippingConfig();
        const promise = getDeliveryPromiseText(config);

        // Recordar la última selección del usuario en localStorage
        let selectedZoneId = localStorage.getItem('user_shipping_zone') || 'caba';
        let selectedCityName = localStorage.getItem('user_shipping_city') || '';

        const html = `
            <div class="shipping-widget-container" id="shipping-widget-root">
                <div class="shipping-widget-header">
                    <h4 class="shipping-widget-title">
                        <span class="material-symbols-outlined">local_shipping</span>
                        <span>Mensajería Propia (Entrega Rápida)</span>
                    </h4>
                    <button type="button" class="btn-open-coverage-modal" id="btn-show-map-modal">
                        <span class="material-symbols-outlined" style="font-size:1.1rem;">map</span>
                        <span>Ver mapa</span>
                    </button>
                </div>

                <div class="shipping-delivery-badge ${promise.badgeClass}" id="shipping-delivery-badge-text">
                    <span class="material-symbols-outlined" style="font-size:1.2rem;">schedule</span>
                    <span>${promise.text}</span>
                </div>

                <div class="shipping-selectors-grid">
                    <div class="shipping-select-group">
                        <label for="shipping-zone-select">Zona de Envío</label>
                        <select id="shipping-zone-select">
                            ${Object.values(config.zones).map(z => `
                                <option value="${z.id}" ${z.id === selectedZoneId ? 'selected' : ''} ${!z.enabled ? 'disabled' : ''}>
                                    ${z.name} ${!z.enabled ? '(Deshabilitada)' : ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="shipping-select-group">
                        <label for="shipping-city-select">Localidad / Barrio</label>
                        <select id="shipping-city-select">
                            <option value="">Seleccionar ciudad...</option>
                        </select>
                    </div>
                </div>

                <div class="shipping-quote-box" id="shipping-quote-box">
                    <div class="shipping-quote-row">
                        <span>Costo del Producto:</span>
                        <span id="shipping-product-price">${formatCurrency.format(productPrice)}</span>
                    </div>
                    <div class="shipping-quote-row">
                        <span>Costo de Envío (<span id="shipping-zone-label">CABA</span>):</span>
                        <span class="shipping-quote-price" id="shipping-cost-amount">$0</span>
                    </div>
                    <div class="shipping-quote-row total-row">
                        <span>Total con Envío:</span>
                        <span class="shipping-quote-price" id="shipping-total-amount">${formatCurrency.format(productPrice)}</span>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Referencias del DOM
        const zoneSelect = container.querySelector('#shipping-zone-select');
        const citySelect = container.querySelector('#shipping-city-select');
        const zoneLabel = container.querySelector('#shipping-zone-label');
        const costAmount = container.querySelector('#shipping-cost-amount');
        const totalAmount = container.querySelector('#shipping-total-amount');
        const productPriceEl = container.querySelector('#shipping-product-price');
        const btnMap = container.querySelector('#btn-show-map-modal');

        // Actualizar el selector de ciudades basado en la zona seleccionada
        function updateCitiesOptions(zoneId, preselectCity = '') {
            const zone = config.zones[zoneId];
            if (!zone) return;

            citySelect.innerHTML = `<option value="">Seleccionar localidad...</option>` +
                zone.cities.map(c => `<option value="${c}" ${c === preselectCity ? 'selected' : ''}>${c}</option>`).join('');

            // Si la ciudad preseleccionada no pertenecía a la nueva zona, seleccionar la primera
            if (!zone.cities.includes(preselectCity) && zone.cities.length > 0) {
                citySelect.value = zone.cities[0];
            }
        }

        // Calcular costo de envío actual
        function calculateShippingCost() {
            const currentZoneId = zoneSelect.value;
            const currentCity = citySelect.value;
            const zone = config.zones[currentZoneId];

            if (!zone || !zone.enabled) return 0;

            let shippingPrice = zone.basePrice;

            // Si está configurado tarifado individual por ciudad y la ciudad tiene un precio específico
            if (config.pricingMode === 'city' && currentCity && zone.customCityPrices && zone.customCityPrices[currentCity]) {
                shippingPrice = zone.customCityPrices[currentCity];
            }

            return shippingPrice;
        }

        // Recalcular y actualizar la interfaz del quote
        function updateQuote(currentProductPrice = productPrice) {
            const currentZoneId = zoneSelect.value;
            const currentCity = citySelect.value;
            const zone = config.zones[currentZoneId];

            const shippingCost = calculateShippingCost();
            const totalWithShipping = currentProductPrice + shippingCost;

            zoneLabel.textContent = zone ? zone.name : 'AMBA';
            costAmount.textContent = formatCurrency.format(shippingCost);
            totalAmount.textContent = formatCurrency.format(totalWithShipping);
            productPriceEl.textContent = formatCurrency.format(currentProductPrice);

            // Guardar selección
            localStorage.setItem('user_shipping_zone', currentZoneId);
            localStorage.setItem('user_shipping_city', currentCity);

            if (typeof onShippingSelectedCallback === 'function') {
                onShippingSelectedCallback({
                    zoneId: currentZoneId,
                    zoneName: zone ? zone.name : '',
                    cityName: currentCity,
                    shippingCost: shippingCost,
                    totalWithShipping: totalWithShipping,
                    deliveryPromise: promise
                });
            }
        }

        // Listeners de eventos
        zoneSelect.addEventListener('change', () => {
            updateCitiesOptions(zoneSelect.value);
            updateQuote();
        });

        citySelect.addEventListener('change', () => {
            updateQuote();
        });

        if (btnMap) {
            btnMap.addEventListener('click', () => {
                showCoverageMapModal();
            });
        }

        // Inicializar opciones de ciudad
        updateCitiesOptions(selectedZoneId, selectedCityName);
        updateQuote();

        return {
            updateProductPrice: function(newPrice) {
                productPrice = newPrice;
                updateQuote(newPrice);
            },
            getSelection: function() {
                const zoneId = zoneSelect.value;
                const city = citySelect.value;
                const cost = calculateShippingCost();
                return {
                    zoneId,
                    zoneName: config.zones[zoneId]?.name || '',
                    city,
                    cost,
                    total: productPrice + cost,
                    promise
                };
            }
        };
    }

    // Modal para mostrar el Mapa de AMBA y Acordeón de Cobertura
    function showCoverageMapModal() {
        const existing = document.getElementById('coverage-modal-overlay');
        if (existing) existing.remove();

        const config = window.shippingConfig || window.getShippingConfig();

        const modal = document.createElement('div');
        modal.id = 'coverage-modal-overlay';
        modal.className = 'coverage-modal-overlay';

        modal.innerHTML = `
            <div class="coverage-modal-container">
                <div class="coverage-modal-header">
                    <h3>🗺️ Mapa y Zonas de Cobertura</h3>
                    <button type="button" class="delivery-modal-close-x" id="btn-close-coverage-modal">&times;</button>
                </div>
                <div class="coverage-modal-body">
                    <div>
                        <img src="map/mapa.png" alt="Mapa de Cobertura AMBA" class="coverage-map-img">
                        <p style="font-size:0.8rem; color:#64748B; text-align:center; margin-top:8px;">
                            Mapa representativo de zonas de entrega por mensajería propia La Tarima.
                        </p>
                    </div>
                    <div class="coverage-accordion">
                        <p style="font-size:0.85rem; color:#475569; font-weight:600; margin:0 0 8px 0;">
                            Explorá las localidades divididas por zona:
                        </p>
                        ${Object.values(config.zones).map(z => `
                            <div class="coverage-zone-card">
                                <div class="coverage-zone-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'flex' : 'none'">
                                    <span style="display:flex; align-items:center; gap:8px;">
                                        <span style="width:12px; height:12px; border-radius:50%; background:${z.badgeColor}; display:inline-block;"></span>
                                        ${z.name}
                                    </span>
                                    <span class="material-symbols-outlined" style="font-size:1.1rem;">expand_more</span>
                                </div>
                                <div class="coverage-zone-cities" style="display:none;">
                                    ${z.cities.map(c => `<span class="city-tag">${c}</span>`).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#btn-close-coverage-modal').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    window.renderShippingWidget = renderShippingWidget;
    window.showCoverageMapModal = showCoverageMapModal;
})();
