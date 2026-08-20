// js/admin-shipping.js
// Pestaña del Panel de Administración para la gestión de envíos y mensajería propia

(function() {
    function initShippingAdmin() {
        const container = document.getElementById('admin-tab-shipping');
        if (!container) return;

        renderAdminShippingTab(container);
    }

    function renderAdminShippingTab(container) {
        const config = window.getShippingConfig();

        const html = `
            <div class="admin-card" style="padding:20px; margin-bottom:20px;">
                <h3 style="margin-top:0; display:flex; align-items:center; gap:8px;">
                    <span class="material-symbols-outlined" style="color:#028090;">local_shipping</span>
                    <span>Configuración de Mensajería Propia (Envíos AMBA)</span>
                </h3>
                <p style="color:#64748B; font-size:0.9rem; margin-bottom:20px;">
                    Gestioná los horarios de corte para promesas de entrega en 24h / Mismo día y las tarifas por zona o ciudad.
                </p>

                <!-- 1. Ajuste de Horarios de Corte -->
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:16px; border-radius:12px; margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:#1E293B;">⏱️ Horario Límite (Corte de Pedidos)</h4>
                    <div style="display:grid; grid-template-columns: 1fr 2fr; gap:16px; align-items:center;">
                        <div>
                            <label style="font-size:0.85rem; font-weight:600; color:#475569; display:block; margin-bottom:4px;">Horario de Corte (hs):</label>
                            <input type="number" id="admin-shipping-cutoff" value="${config.cutoffHour}" min="0" max="23" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #CBD5E1;">
                        </div>
                        <div>
                            <p style="font-size:0.82rem; color:#64748B; margin:0;">
                                • Antes de esta hora: Se promete entrega <strong>EN EL DÍA (HOY)</strong>.<br>
                                • Después de esta hora: Se promete entrega <strong>AL DÍA SIGUIENTE (MAÑANA)</strong>.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 2. Modalidad de Tarifa -->
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:16px; border-radius:12px; margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:#1E293B;">💲 Modalidad de Tarifario</h4>
                    <div style="display:flex; gap:20px; align-items:center;">
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; cursor:pointer;">
                            <input type="radio" name="admin-pricing-mode" value="zone" ${config.pricingMode === 'zone' ? 'checked' : ''}>
                            <strong>Precio Fijo por Zona completa</strong>
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; cursor:pointer;">
                            <input type="radio" name="admin-pricing-mode" value="city" ${config.pricingMode === 'city' ? 'checked' : ''}>
                            <strong>Tarifa Personalizada por Ciudad / Barrio</strong>
                        </label>
                    </div>
                </div>

                <!-- 3. Edición de Zonas y Precios -->
                <div style="margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:#1E293B;">🗺️ Precios por Zona</h4>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                        ${Object.values(config.zones).map(zone => `
                            <div style="background:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:12px; padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                    <strong style="font-size:0.95rem; color:${zone.badgeColor};">${zone.name}</strong>
                                    <label style="font-size:0.8rem; display:flex; align-items:center; gap:4px; cursor:pointer;">
                                        <input type="checkbox" id="zone-enabled-${zone.id}" ${zone.enabled ? 'checked' : ''}> Activa
                                    </label>
                                </div>
                                <div style="margin-bottom:12px;">
                                    <label style="font-size:0.8rem; color:#64748B; display:block; margin-bottom:4px;">Precio Base ($ ARS):</label>
                                    <input type="number" id="zone-price-${zone.id}" value="${zone.basePrice}" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #CBD5E1; font-weight:700;">
                                </div>
                                <details style="font-size:0.82rem; color:#475569;">
                                    <summary style="cursor:pointer; font-weight:600; color:#028090;">Ver ${zone.cities.length} localidades</summary>
                                    <div style="margin-top:8px; max-height:150px; overflow-y:auto; padding-right:6px; display:flex; flex-direction:column; gap:4px;">
                                        ${zone.cities.map(city => `
                                            <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid #F1F5F9;">
                                                <span>${city}</span>
                                                <input type="number" placeholder="$${zone.basePrice}" id="city-price-${zone.id}-${city.replace(/\s+/g, '_')}" value="${zone.customCityPrices?.[city] || ''}" style="width:90px; padding:3px 6px; font-size:0.78rem; border-radius:6px; border:1px solid #CBD5E1; text-align:right;">
                                            </div>
                                        `).join('')}
                                    </div>
                                </details>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end;">
                    <button type="button" id="btn-save-shipping-admin" class="btn-primary" style="padding:10px 24px; font-weight:700; font-size:0.95rem;">
                        Guardar Configuración de Envíos
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Guardar cambios
        container.querySelector('#btn-save-shipping-admin').onclick = () => {
            const cutoffHour = parseInt(container.querySelector('#admin-shipping-cutoff').value || '12');
            const pricingMode = container.querySelector('input[name="admin-pricing-mode"]:checked').value;

            Object.values(config.zones).forEach(zone => {
                const enabled = container.querySelector(`#zone-enabled-${zone.id}`).checked;
                const basePrice = parseFloat(container.querySelector(`#zone-price-${zone.id}`).value || '0');

                zone.enabled = enabled;
                zone.basePrice = basePrice;
                zone.customCityPrices = zone.customCityPrices || {};

                zone.cities.forEach(city => {
                    const cityInput = container.querySelector(`#city-price-${zone.id}-${city.replace(/\s+/g, '_')}`);
                    if (cityInput && cityInput.value) {
                        zone.customCityPrices[city] = parseFloat(cityInput.value);
                    } else if (zone.customCityPrices[city]) {
                        delete zone.customCityPrices[city];
                    }
                });
            });

            config.cutoffHour = cutoffHour;
            config.pricingMode = pricingMode;

            window.saveShippingConfig(config);

            alert('¡Configuración de envíos por mensajería guardada correctamente!');
        };
    }

    window.initShippingAdmin = initShippingAdmin;
})();
