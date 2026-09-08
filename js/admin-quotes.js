/* =============================================================================
   js/admin-quotes.js
   Generador Profesional de Presupuestos para La Tarima 2.0
   Envío directo por WhatsApp, Email y exportación a PDF impreso
   ============================================================================= */

(function () {
    let currentQuote = {
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        clientCuit: '',
        clientAddress: '',
        clientLocality: '',
        clientZip: '',
        validDays: 7,
        leadDays: '7 a 10',
        notes: '',
        items: [],
        shippingCost: 0,
        discountPercent: 0
    };

    const QUOTES_STORAGE_KEY = 'la_tarima_saved_quotes_v1';

    function getSavedQuotes() {
        try {
            const raw = localStorage.getItem(QUOTES_STORAGE_KEY);
            if (!raw) return [];
            let list = JSON.parse(raw);
            const now = Date.now();
            const maxAgeMs = 60 * 24 * 60 * 60 * 1000; // 60 días
            const filtered = list.filter(q => (now - (q.createdAt || now)) <= maxAgeMs);
            if (filtered.length !== list.length) {
                localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(filtered));
            }
            return filtered;
        } catch (e) {
            console.error('Error al obtener presupuestos:', e);
            return [];
        }
    }

    function saveCurrentQuoteToHistory(status = 'enviado') {
        if (currentQuote.items.length === 0) return null;
        try {
            const list = getSavedQuotes();
            const subtotal = currentQuote.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
            const discountVal = Math.round(subtotal * (currentQuote.discountPercent / 100));
            const total = Math.max(0, subtotal - discountVal + Number(currentQuote.shippingCost));

            const newQuoteRecord = {
                id: 'P-' + Math.floor(100000 + Math.random() * 900000),
                createdAt: Date.now(),
                status: status,
                clientName: currentQuote.clientName || 'Cliente sin nombre',
                clientPhone: currentQuote.clientPhone || '',
                clientEmail: currentQuote.clientEmail || '',
                clientCuit: currentQuote.clientCuit || '',
                clientAddress: currentQuote.clientAddress || '',
                clientLocality: currentQuote.clientLocality || '',
                clientZip: currentQuote.clientZip || '',
                validDays: currentQuote.validDays,
                leadDays: currentQuote.leadDays || '7 a 10',
                notes: currentQuote.notes,
                items: JSON.parse(JSON.stringify(currentQuote.items)),
                shippingCost: currentQuote.shippingCost,
                discountPercent: currentQuote.discountPercent,
                totalAmount: total
            };

            list.unshift(newQuoteRecord);
            localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(list));
            renderAdminQuotes();
            return newQuoteRecord;
        } catch (e) {
            console.error('Error al guardar presupuesto en historial:', e);
            return null;
        }
    }

    function renderAdminQuotes() {
        const container = document.getElementById('admin-quotes-view');
        if (!container) return;

        const savedQuotes = getSavedQuotes();

        container.innerHTML = `
            <div class="admin-card" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem; background: var(--admin-surface); border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-md);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h3 class="admin-card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--admin-text-main); display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: var(--admin-accent);">request_quote</span>
                            Generador Rápido de Presupuestos
                        </h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--admin-text-muted);">
                            Armá presupuestos personalizados para clientes perezosos y guardalos automáticamente por 60 días para convertirlos en pedidos reales con 1 clic.
                        </p>
                    </div>
                    <button type="button" id="btn-quote-reset" class="btn-outline" style="color: #ef4444; border-color: #fca5a5;">
                        <span class="material-symbols-outlined">restart_alt</span> Limpiar Presupuesto
                    </button>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                
                <!-- Tarjeta 1: Datos del Cliente -->
                <div class="admin-card" style="background: #ffffff; border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-md); padding: 1.25rem;">
                    <header class="admin-page-header" style="margin-bottom: 0.85rem; padding-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                        <h4 style="margin:0; font-size: 0.95rem; font-weight: 700; color: var(--admin-text-main); display: flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="color: var(--admin-accent); font-size: 20px;">person</span>
                            1. Datos del Cliente
                        </h4>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <button type="button" id="btn-copy-client-data-request" class="btn-outline" style="padding: 0.35rem; width: 32px; height: 32px; min-width: 32px; color: var(--admin-accent); border-color: var(--admin-accent); display: inline-flex; align-items: center; justify-content: center; border-radius: 6px;" title="Copiar plantilla de pedido de datos para enviar por WhatsApp">
                                <span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span>
                            </button>
                            <button type="button" id="btn-copy-bank-transfer-details" class="btn-outline" style="padding: 0.35rem; width: 32px; height: 32px; min-width: 32px; color: #16a34a; border-color: #86efac; background: #f0fdf4; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px;" title="Copiar datos bancarios (CBU / ALIAS / Banco) para transferencia">
                                <span class="material-symbols-outlined" style="font-size: 18px;">account_balance</span>
                            </button>
                        </div>
                    </header>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.85rem;">
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-client-name" style="font-size: 0.78rem;">Nombre del Cliente / Empresa *</label>
                            <input type="text" id="quote-client-name" class="premium-input" placeholder="ej: Lucía Fernández" value="${currentQuote.clientName}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-client-phone" style="font-size: 0.78rem;">WhatsApp (Sin 0 ni 15)</label>
                            <input type="text" id="quote-client-phone" class="premium-input" placeholder="ej: 1167007723" value="${currentQuote.clientPhone}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-client-email" style="font-size: 0.78rem;">Correo Electrónico (Opcional)</label>
                            <input type="email" id="quote-client-email" class="premium-input" placeholder="ej: lucia@gmail.com" value="${currentQuote.clientEmail}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-client-cuit" style="font-size: 0.78rem;">DNI o CUIT (Para Factura / Envíos)</label>
                            <input type="text" id="quote-client-cuit" class="premium-input" placeholder="ej: 20-35281538-2 o 35281538" value="${currentQuote.clientCuit || ''}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-client-address" style="font-size: 0.78rem;">Dirección de Entrega (Calle y N°)</label>
                            <input type="text" id="quote-client-address" class="premium-input" placeholder="ej: Av. Rivadavia 12345, 4 B" value="${currentQuote.clientAddress}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-client-locality" style="font-size: 0.78rem;">Localidad / Barrio</label>
                            <input type="text" id="quote-client-locality" class="premium-input" placeholder="ej: Haedo" value="${currentQuote.clientLocality}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-client-zip" style="font-size: 0.78rem;">Código Postal (Auto-cotiza flete)</label>
                            <input type="text" id="quote-client-zip" class="premium-input" placeholder="ej: 1706" value="${currentQuote.clientZip}">
                        </div>
                    </div>
                </div>

                <!-- Tarjeta 2: Agregar Productos e Ítems a medida -->
                <div class="admin-card" style="background: #ffffff; border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-md); padding: 1.25rem;">
                    <header class="admin-page-header" style="margin-bottom: 0.85rem; padding-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin:0; font-size: 0.95rem; font-weight: 700; color: var(--admin-text-main); display: flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="color: var(--admin-accent); font-size: 20px;">add_shopping_cart</span>
                            2. Productos & Trabajos a Medida
                        </h4>
                        <button type="button" id="btn-quote-add-custom" class="btn-outline" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">
                            ➕ Ítem Personalizado / Trabajo A Medida
                        </button>
                    </header>

                    <!-- Buscador de Catálogo -->
                    <div class="search-wrapper" style="margin-bottom: 1rem;">
                        <span class="material-symbols-outlined">search</span>
                        <input type="text" id="quote-product-search" placeholder="Buscá un producto del catálogo para agregar (ej: Organizador, Estantería...)" autocomplete="off">
                        <div id="quote-search-results" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); max-height: 250px; overflow-y: auto; z-index: 100;"></div>
                    </div>

                    <!-- Tabla de Ítems Presupuestados -->
                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Detalle del Producto / Ítem</th>
                                    <th style="width: 80px; text-align: center;">Cant.</th>
                                    <th style="width: 120px; text-align: right;">Precio Unit.</th>
                                    <th style="width: 120px; text-align: right;">Subtotal</th>
                                    <th style="width: 50px; text-align: center;"></th>
                                </tr>
                            </thead>
                            <tbody id="quote-items-tbody">
                                ${currentQuote.items.length === 0 ? `
                                    <tr>
                                        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--admin-text-subtle); font-style: italic;">
                                            No agregaste productos aún. Usá el buscador o creá un ítem a medida.
                                        </td>
                                    </tr>
                                ` : currentQuote.items.map((item, idx) => {
                                    const sourceData = (window.sessionProducts && window.sessionProducts.length > 0) ? window.sessionProducts : (window.productsData || []);
                                    let product = null;
                                    sourceData.forEach(c => (c.products || []).forEach(p => { if (String(p.id) === String(item.productId)) product = p; }));

                                    let acabadosHTML = '';
                                    let medidasHTML = '';

                                    if (product) {
                                        if (product.acabados_groups && product.acabados_groups.length > 0) {
                                            const opts = product.acabados_groups.map(g => {
                                                const name = g.acabado_name || 'Natural';
                                                return `<option value="${name}" ${name === item.acabado ? 'selected' : ''}>${name}</option>`;
                                            }).join('');
                                            acabadosHTML = `<select class="quote-acabado-select premium-select" data-index="${idx}" style="font-size: 0.75rem; padding: 2px 5px; height: 26px;">${opts}</select>`;

                                            const curGroup = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === (item.acabado || '').trim().toLowerCase()) || product.acabados_groups[0];
                                            if (curGroup && curGroup.medidas_variants && curGroup.medidas_variants.length > 0) {
                                                const mOpts = curGroup.medidas_variants.map(m => {
                                                    const mName = m.medida || 'Estándar';
                                                    return `<option value="${mName}" ${mName === item.medida ? 'selected' : ''}>${mName}</option>`;
                                                }).join('');
                                                medidasHTML = `<select class="quote-medida-select premium-select" data-index="${idx}" style="font-size: 0.75rem; padding: 2px 5px; height: 26px;">${mOpts}</select>`;
                                            }
                                        } else if (product.medidas_variants && product.medidas_variants.length > 0) {
                                            const mOpts = product.medidas_variants.map(m => {
                                                const mName = m.medida || 'Estándar';
                                                return `<option value="${mName}" ${mName === item.medida ? 'selected' : ''}>${mName}</option>`;
                                            }).join('');
                                            medidasHTML = `<select class="quote-medida-select premium-select" data-index="${idx}" style="font-size: 0.75rem; padding: 2px 5px; height: 26px;">${mOpts}</select>`;
                                        }
                                    }

                                    return `
                                    <tr>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                                ${item.image ? `<img src="${item.image}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0; flex-shrink: 0;">` : ''}
                                                <input type="text" class="quote-item-title premium-input" data-index="${idx}" value="${item.title}" style="font-weight: 700; font-size: 0.85rem; padding: 0.35rem 0.5rem;">
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                                ${acabadosHTML ? `<div style="display: flex; align-items: center; gap: 3px;"><span style="font-size: 0.7rem; color: #64748b;">Acabado:</span>${acabadosHTML}</div>` : ''}
                                                ${medidasHTML ? `<div style="display: flex; align-items: center; gap: 3px;"><span style="font-size: 0.7rem; color: #64748b;">Medida:</span>${medidasHTML}</div>` : ''}
                                                <input type="text" class="quote-item-desc premium-input" data-index="${idx}" value="${item.details || ''}" placeholder="Detalles extra / aclaración..." style="font-size: 0.75rem; padding: 0.25rem 0.5rem; color: #64748b; flex: 1; min-width: 120px;">
                                            </div>
                                        </td>
                                        <td style="text-align: center;">
                                            <input type="number" min="1" class="quote-item-qty premium-input" data-index="${idx}" value="${item.qty}" style="text-align: center; font-weight: 800; padding: 0.35rem 0.2rem;">
                                        </td>
                                        <td style="text-align: right;">
                                            <input type="number" min="0" class="quote-item-price premium-input" data-index="${idx}" value="${item.price}" style="text-align: right; font-weight: 700; padding: 0.35rem 0.5rem;">
                                        </td>
                                        <td style="text-align: right; font-weight: 800; font-size: 0.9rem; color: var(--admin-text-main);">
                                            $${(item.qty * item.price).toLocaleString()}
                                        </td>
                                        <td style="text-align: center;">
                                            <button type="button" class="btn-remove-quote-item" data-index="${idx}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem;" title="Eliminar ítem">&times;</button>
                                        </td>
                                    </tr>
                                    `;
                                }).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Tarjeta 3: Envío, Descuentos y Validez -->
                <div class="admin-card" style="background: #ffffff; border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-md); padding: 1.25rem;">
                    <header class="admin-page-header" style="margin-bottom: 0.85rem; padding-bottom: 0.5rem;">
                        <h4 style="margin:0; font-size: 0.95rem; font-weight: 700; color: var(--admin-text-main); display: flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="color: var(--admin-accent); font-size: 20px;">local_shipping</span>
                            3. Envío, Descuento & Validez
                        </h4>
                    </header>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem;">
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-shipping-cost" style="font-size: 0.78rem;">Costo de Envío ($)</label>
                            <input type="number" min="0" id="quote-shipping-cost" class="premium-input" placeholder="0 = Gratis / A convenir" value="${currentQuote.shippingCost}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-discount-percent" style="font-size: 0.78rem;">Descuento Especial (% OFF)</label>
                            <input type="number" min="0" max="100" id="quote-discount-percent" class="premium-input" placeholder="ej: 10" value="${currentQuote.discountPercent}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-valid-days" style="font-size: 0.78rem;">Validez del Presupuesto</label>
                            <select id="quote-valid-days" class="premium-select">
                                <option value="3" ${currentQuote.validDays == 3 ? 'selected' : ''}>3 Días</option>
                                <option value="7" ${currentQuote.validDays == 7 ? 'selected' : ''}>7 Días (Recomendado)</option>
                                <option value="15" ${currentQuote.validDays == 15 ? 'selected' : ''}>15 Días</option>
                                <option value="30" ${currentQuote.validDays == 30 ? 'selected' : ''}>30 Días</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="quote-lead-days" style="font-size: 0.78rem;">Tiempo de Elaboración</label>
                            <select id="quote-lead-days" class="premium-select">
                                <option value="Inmediata / Stock" ${currentQuote.leadDays === 'Inmediata / Stock' ? 'selected' : ''}>Entrega Inmediata (Stock)</option>
                                <option value="3 a 5" ${currentQuote.leadDays === '3 a 5' ? 'selected' : ''}>3 a 5 días hábiles</option>
                                <option value="7 a 10" ${currentQuote.leadDays === '7 a 10' ? 'selected' : ''}>7 a 10 días hábiles (Habitual)</option>
                                <option value="10 a 15" ${currentQuote.leadDays === '10 a 15' ? 'selected' : ''}>10 a 15 días hábiles</option>
                                <option value="15 a 20" ${currentQuote.leadDays === '15 a 20' ? 'selected' : ''}>15 a 20 días hábiles</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group" style="margin: 0.85rem 0 0 0;">
                        <label for="quote-notes" style="font-size: 0.78rem;">Aclaraciones o Nota Especial para el Cliente</label>
                        <textarea id="quote-notes" class="premium-input" placeholder="ej: Incluye colocación bonificada." style="min-height: 50px; font-size: 0.8rem;">${currentQuote.notes}</textarea>
                    </div>
                </div>

                <!-- Tarjeta Final ABAJO: Resumen y Botones de Envío -->
                <div class="admin-card" style="background: #0f172a; color: #ffffff; border-radius: 12px; padding: 1.25rem; box-shadow: 0 10px 25px rgba(0,0,0,0.2); margin-top: 0.5rem;">
                    <header style="border-bottom: 1px solid #334155; padding-bottom: 0.75rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span style="font-size: 0.68rem; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #38bdf8;">LA TARIMA · RESUMEN FINAL</span>
                            <h3 style="margin: 2px 0 0 0; font-size: 1.1rem; font-weight: 800; color: #ffffff;">Resumen del Presupuesto & Envíos</h3>
                        </div>
                        <span class="material-symbols-outlined" style="color: #38bdf8; font-size: 28px;">receipt_long</span>
                    </header>

                    <!-- Totales Calculados -->
                    <div id="quote-preview-totals"></div>

                    <!-- Botones de Acción Directa en Fila Horizontal -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 1.25rem;">
                        <button type="button" id="btn-send-quote-wa" style="background: #25d366; color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
                            <span class="material-symbols-outlined">send</span> Enviar por WhatsApp
                        </button>
                        <button type="button" id="btn-send-cbu-wa" style="background: #16a34a; color: white; border: none; padding: 0.65rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <span class="material-symbols-outlined">account_balance</span> Enviar CBU / Cuentas
                        </button>
                        <button type="button" id="btn-send-quote-email" style="background: #0284c7; color: white; border: none; padding: 0.65rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <span class="material-symbols-outlined">mail</span> Enviar por Email
                        </button>
                    </div>
                </div>

                <!-- Tarjeta 5: Historial de Presupuestos Guardados (Últimos 60 Días) -->
                <div class="admin-card" style="background: #ffffff; border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-md); padding: 1.25rem; margin-top: 0.5rem;">
                    <header class="admin-page-header" style="margin-bottom: 0.85rem; padding-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <h4 style="margin:0; font-size: 0.95rem; font-weight: 700; color: var(--admin-text-main); display: flex; align-items: center; gap: 6px;">
                                <span class="material-symbols-outlined" style="color: var(--admin-accent); font-size: 20px;">history</span>
                                Historial de Presupuestos Guardados (Últimos 60 Días)
                            </h4>
                            <span style="font-size: 0.75rem; color: var(--admin-text-muted);">
                                Presupuestos enviados o generados recientemente. Convertilos a Pedido Directo si el cliente confirma.
                            </span>
                        </div>
                        <span class="admin-badge" style="background: #f1f5f9; color: #475569; font-weight: 800; font-size: 0.75rem; padding: 4px 10px; border-radius: 20px;">
                            ${savedQuotes.length} Guardados
                        </span>
                    </header>

                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Cód. / Fecha</th>
                                    <th>Cliente</th>
                                    <th>Productos / Ítems</th>
                                    <th style="text-align: right;">Total</th>
                                    <th style="text-align: center;">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${savedQuotes.length === 0 ? `
                                    <tr>
                                        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--admin-text-subtle); font-style: italic;">
                                            No hay presupuestos guardados en los últimos 60 días. Se guardarán automáticamente cuando envíes por WhatsApp o Email.
                                        </td>
                                    </tr>
                                ` : savedQuotes.map(q => {
                                    const dateStr = new Date(q.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
                                    const itemsSummary = q.items.map(i => `${i.title} (x${i.qty})`).join(', ');
                                    return `
                                        <tr>
                                            <td>
                                                <strong style="font-size: 0.82rem; color: #0284c7; display: block;">${q.id}</strong>
                                                <span style="font-size: 0.72rem; color: #64748b;">${dateStr}</span>
                                            </td>
                                            <td>
                                                <strong style="font-size: 0.85rem; color: #0f172a; display: block;">${q.clientName}</strong>
                                                <span style="font-size: 0.73rem; color: #64748b;">${q.clientPhone ? 'WA: ' + q.clientPhone : ''} ${q.clientLocality ? '• ' + q.clientLocality : ''}</span>
                                            </td>
                                            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; color: #334155;" title="${itemsSummary}">
                                                ${itemsSummary}
                                            </td>
                                            <td style="text-align: right; font-weight: 800; font-size: 0.9rem; color: #16a34a;">
                                                $${Number(q.totalAmount || 0).toLocaleString()}
                                            </td>
                                            <td style="text-align: center; white-space: nowrap;">
                                                <button type="button" class="btn-convert-quote-order btn-outline" data-id="${q.id}" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; color: #16a34a; border-color: #bbf7d0; background: #f0fdf4; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Cargar como Pedido en el Panel de Pedidos">
                                                    <span class="material-symbols-outlined" style="font-size: 16px;">add_task</span> Cargar Pedido
                                                </button>
                                                <button type="button" class="btn-load-quote-edit btn-outline" data-id="${q.id}" style="font-size: 0.75rem; padding: 0.35rem 0.5rem; color: #0284c7; border-color: #bae6fd; background: #f0f9ff; font-weight: 700; cursor: pointer;" title="Recargar en el editor de presupuestos">
                                                    <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        bindEvents();
        updateTotalsPreview();
    }

    function updateTotalsPreview() {
        const subtotal = currentQuote.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
        const discountVal = Math.round(subtotal * (currentQuote.discountPercent / 100));
        const total = Math.max(0, subtotal - discountVal + Number(currentQuote.shippingCost));

        const container = document.getElementById('quote-preview-totals');
        if (!container) return;

        const fmt = (val) => '$' + Number(val).toLocaleString();

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: #94a3b8;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Cliente:</span>
                    <strong style="color: #ffffff;">${currentQuote.clientName || 'Sin especificar'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Ítems acumulados:</span>
                    <strong style="color: #ffffff;">${currentQuote.items.reduce((a, b) => a + Number(b.qty), 0)} un.</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px dashed #334155; padding-top: 6px; margin-top: 4px;">
                    <span>Subtotal Productos:</span>
                    <strong style="color: #ffffff;">${fmt(subtotal)}</strong>
                </div>
                ${currentQuote.discountPercent > 0 ? `
                    <div style="display: flex; justify-content: space-between; color: #4ade80;">
                        <span>Descuento (${currentQuote.discountPercent}% OFF):</span>
                        <strong>-${fmt(discountVal)}</strong>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between;">
                    <span>Envío:</span>
                    <strong style="color: #ffffff;">${currentQuote.shippingCost > 0 ? fmt(currentQuote.shippingCost) : 'Gratis / A convenir'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #38bdf8; padding-top: 8px; margin-top: 6px; font-size: 1.1rem; color: #ffffff;">
                    <strong style="font-weight: 800;">TOTAL PRESUPUESTADO:</strong>
                    <strong style="font-weight: 900; font-size: 1.3rem; color: #38bdf8;">${fmt(total)}</strong>
                </div>
            </div>
        `;
    }

    function bindEvents() {
        // Form inputs sync
        document.getElementById('quote-client-name')?.addEventListener('input', (e) => { currentQuote.clientName = e.target.value; updateTotalsPreview(); });
        document.getElementById('quote-client-phone')?.addEventListener('input', (e) => { currentQuote.clientPhone = e.target.value; });
        document.getElementById('quote-client-email')?.addEventListener('input', (e) => { currentQuote.clientEmail = e.target.value; });
        document.getElementById('quote-client-cuit')?.addEventListener('input', (e) => { currentQuote.clientCuit = e.target.value; });
        
        document.getElementById('quote-client-address')?.addEventListener('input', (e) => { currentQuote.clientAddress = e.target.value; });
        document.getElementById('quote-client-locality')?.addEventListener('input', (e) => { currentQuote.clientLocality = e.target.value; updateTotalsPreview(); });

        const zipInp = document.getElementById('quote-client-zip');
        const locInp = document.getElementById('quote-client-locality');
        const shipInp = document.getElementById('quote-shipping-cost');

        zipInp?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            currentQuote.clientZip = val;
            if (typeof window.lookupPostalCode === 'function' && val.length >= 4) {
                const res = window.lookupPostalCode(val);
                if (res && res.localidad) {
                    if (locInp && (!currentQuote.clientLocality || currentQuote.clientLocality.trim() === '')) {
                        locInp.value = res.localidad;
                        currentQuote.clientLocality = res.localidad;
                    }
                    if (res.logistica && res.logistica.cost > 0 && (!currentQuote.shippingCost || currentQuote.shippingCost === 0)) {
                        currentQuote.shippingCost = res.logistica.cost;
                        if (shipInp) shipInp.value = res.logistica.cost;
                    }
                }
            }
            updateTotalsPreview();
        });

        document.getElementById('quote-shipping-cost')?.addEventListener('input', (e) => { currentQuote.shippingCost = parseFloat(e.target.value) || 0; updateTotalsPreview(); });
        document.getElementById('quote-discount-percent')?.addEventListener('input', (e) => { currentQuote.discountPercent = parseFloat(e.target.value) || 0; updateTotalsPreview(); });
        document.getElementById('quote-valid-days')?.addEventListener('change', (e) => { currentQuote.validDays = parseInt(e.target.value); });
        document.getElementById('quote-lead-days')?.addEventListener('change', (e) => { currentQuote.leadDays = e.target.value; });
        document.getElementById('quote-notes')?.addEventListener('input', (e) => { currentQuote.notes = e.target.value; });

        // Copiar Pedido de Datos al Cliente
        document.getElementById('btn-copy-client-data-request')?.addEventListener('click', () => {
            const requestText = `¡Hola! 👋 Para poder armarte la ficha del pedido y coordinar el despacho/envío de forma directa, ¿podrías pasarnos por acá los siguientes datos?

📌 Nombre y Apellido / Empresa:
📌 DNI o CUIT (para despacho y factura):
📌 Teléfono de contacto:
📌 Dirección de entrega (Calle y N°):
📌 Piso / Dpto / Timbre (si aplica):
📌 Localidad / Barrio:
📌 Código Postal:
📌 Observaciones (ej. entrecalles, timbre, horario de entrega):

¡Muchas gracias! 🪵✨`;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(requestText).then(() => {
                    if (typeof showAdminToast === 'function') {
                        showAdminToast('📋 ¡Texto copiado! Pegalo en el chat de WhatsApp con el cliente.');
                    } else {
                        alert('📋 ¡Texto de pedido de datos copiado! Pegalo en el chat con el cliente.');
                    }
                }).catch(() => {
                    prompt('Copiar texto de solicitud de datos:', requestText);
                });
            } else {
                prompt('Copiar texto de solicitud de datos:', requestText);
            }
        });

        // Copiar Datos Bancarios para Transferencia
        document.getElementById('btn-copy-bank-transfer-details')?.addEventListener('click', () => {
            const transfer = window.sessionPaymentConfig?.transfer || {};
            
            const bankLines = [];
            bankLines.push('🏦 Datos para Transferencia Bancaria Directa:');
            if (transfer.bank) bankLines.push(`• Banco: ${transfer.bank}`);
            if (transfer.alias) bankLines.push(`• ALIAS: ${transfer.alias}`);
            if (transfer.cbu) bankLines.push(`• CBU: ${transfer.cbu}`);
            if (transfer.titular) bankLines.push(`• Titular: ${transfer.titular}`);
            if (transfer.cuit) bankLines.push(`• CUIT: ${transfer.cuit}`);
            bankLines.push('\nPor favor, una vez realizada la transferencia envianos el comprobante por acá. ¡Muchas gracias! 🪵✨');

            const transferText = bankLines.join('\n');

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(transferText).then(() => {
                    if (typeof showAdminToast === 'function') {
                        showAdminToast('🏦 ¡Datos bancarios copiados! Pegalos en el chat con el cliente.');
                    } else {
                        alert('🏦 ¡Datos bancarios copiados! Pegalos en el chat con el cliente.');
                    }
                }).catch(() => {
                    prompt('Copiar datos bancarios:', transferText);
                });
            } else {
                prompt('Copiar datos bancarios:', transferText);
            }
        });

        // Reset
        document.getElementById('btn-quote-reset')?.addEventListener('click', () => {
            if (confirm('¿Limpiar los datos del presupuesto actual?')) {
                currentQuote = { clientName: '', clientPhone: '', clientEmail: '', clientAddress: '', clientLocality: '', clientZip: '', validDays: 7, leadDays: '7 a 10', notes: '', items: [], shippingCost: 0, discountPercent: 0 };
                renderAdminQuotes();
            }
        });

        // Add custom item
        document.getElementById('btn-quote-add-custom')?.addEventListener('click', () => {
            currentQuote.items.push({ title: 'Trabajo a medida / Personalizado', details: '', qty: 1, price: 15000 });
            renderAdminQuotes();
        });

        // Search product (Combos / Offers style product picker)
        const searchInput = document.getElementById('quote-product-search');
        const resultsDiv = document.getElementById('quote-search-results');

        searchInput?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            if (!q) { resultsDiv.style.display = 'none'; return; }

            let matches = [];
            const sourceData = (window.sessionProducts && window.sessionProducts.length > 0) ? window.sessionProducts : (window.productsData || []);
            if (sourceData) {
                sourceData.forEach(cat => {
                    (cat.products || []).forEach(p => {
                        if (p && p.title && (p.title.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q))) {
                            matches.push({ product: p, catName: cat.name });
                        }
                    });
                });
            }

            if (matches.length === 0) {
                resultsDiv.innerHTML = `<div style="padding: 10px; font-size: 0.82rem; color: #64748b; text-align: center;">No se encontraron productos</div>`;
            } else {
                resultsDiv.innerHTML = matches.slice(0, 10).map((m, idx) => {
                    const imgUrl = Array.isArray(m.product.image) ? m.product.image[0] : (m.product.image || 'img/logo_provisional.png');
                    return `
                        <div class="quote-search-item" data-match-index="${idx}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; box-sizing: border-box;">
                            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                                <img src="${imgUrl}" style="width: 38px; height: 38px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; flex-shrink: 0; background: #f8fafc;">
                                <div style="flex: 1; min-width: 0; overflow: hidden;">
                                    <strong style="font-size: 0.84rem; color: #0f172a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${m.product.title}</strong>
                                    <span style="font-size: 0.72rem; color: #64748b; display: block; line-height: 1.2; margin-top: 2px;">${m.catName}</span>
                                </div>
                            </div>
                            <div style="font-size: 0.78rem; font-weight: 700; color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 4px 10px; border-radius: 6px; flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px;">
                                ➕ Agregar
                            </div>
                        </div>
                    `;
                }).join("");

                resultsDiv.querySelectorAll('.quote-search-item').forEach(el => {
                    el.addEventListener('click', () => {
                        const matchIdx = parseInt(el.getAttribute('data-match-index'));
                        const selectedMatch = matches[matchIdx];
                        if (selectedMatch) {
                            addProductToQuote(selectedMatch.product);
                        }
                        searchInput.value = '';
                        resultsDiv.style.display = 'none';
                    });
                });
            }
            resultsDiv.style.display = 'block';
        });

        // Event listeners for quote items
        bindQuoteItemEvents();

        // Listeners for saved quotes history
        document.querySelectorAll('.btn-convert-quote-order').forEach(btn => {
            btn.addEventListener('click', () => {
                const qid = btn.getAttribute('data-id');
                const list = getSavedQuotes();
                const quoteRecord = list.find(q => q.id === qid);
                if (quoteRecord) {
                    convertQuoteToOrder(quoteRecord);
                }
            });
        });

        document.querySelectorAll('.btn-load-quote-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const qid = btn.getAttribute('data-id');
                const list = getSavedQuotes();
                const quoteRecord = list.find(q => q.id === qid);
                if (quoteRecord) {
                    currentQuote = {
                        clientName: quoteRecord.clientName || '',
                        clientPhone: quoteRecord.clientPhone || '',
                        clientEmail: quoteRecord.clientEmail || '',
                        clientLocality: quoteRecord.clientLocality || '',
                        validDays: quoteRecord.validDays || 7,
                        leadDays: quoteRecord.leadDays || '7 a 10',
                        notes: quoteRecord.notes || '',
                        items: JSON.parse(JSON.stringify(quoteRecord.items || [])),
                        shippingCost: quoteRecord.shippingCost || 0,
                        discountPercent: quoteRecord.discountPercent || 0
                    };
                    renderAdminQuotes();
                }
            });
        });
    }

    function convertQuoteToOrder(quoteRecord) {
        if (!quoteRecord) return;

        // Formatear la orden para pasar a la vista de Pedidos
        const itemsSummary = quoteRecord.items.map(i => `${i.title} (x${i.qty})${i.details ? ' [' + i.details + ']' : ''}`).join(', ');

        // Calcular peso total estimado sumando cada item x cantidad
        const totalWeight = quoteRecord.items.reduce((sum, item) => {
            const w = parseFloat(item.weight) || 1;
            const q = parseInt(item.qty) || 1;
            return sum + (w * q);
        }, 0);

        const cuitStr = quoteRecord.clientCuit ? ` | CUIT/DNI: ${quoteRecord.clientCuit}` : '';

        const orderData = {
            clientName: quoteRecord.clientName || 'Cliente',
            clientPhone: quoteRecord.clientPhone || '',
            productType: 'custom',
            productName: itemsSummary || 'Presupuesto Convertido',
            description: `Presupuesto ${quoteRecord.id}${cuitStr}. ${quoteRecord.notes ? 'Notas: ' + quoteRecord.notes : ''}`,
            totalAmount: quoteRecord.totalAmount || 0,
            address: quoteRecord.clientAddress || '',
            locality: quoteRecord.clientLocality || '',
            zipCode: quoteRecord.clientZip || '',
            estimatedWeight: Math.round(totalWeight * 10) / 10 || 1,
            observations: (quoteRecord.clientCuit ? `CUIT/DNI: ${quoteRecord.clientCuit}. ` : '') + (quoteRecord.notes || ''),
            paidStatus: 'nada',
            status: 'pendiente'
        };

        // Si existe iframe de pedidos o función global para abrir modal de pedido
        if (typeof window.navigateToView === 'function') {
            window.navigateToView('view-pedidos-admin');
            
            const tryOpen = (attempts = 0) => {
                const iframe = document.querySelector('#view-pedidos-admin iframe');
                if (iframe && iframe.contentWindow && typeof iframe.contentWindow.openModal === 'function') {
                    iframe.contentWindow.openModal(orderData);
                } else if (typeof window.openModal === 'function') {
                    window.openModal(orderData);
                } else if (attempts < 15) {
                    setTimeout(() => tryOpen(attempts + 1), 150);
                }
            };
            setTimeout(() => tryOpen(0), 100);
        }
    }

    function resolveQuoteProductPrice(product, acabadoName, medidaName) {
        if (!product) return 0;
        let foundPrice = 0;
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
                if (variant && variant.price !== undefined) foundPrice = parseFloat(variant.price) || 0;
            }
        }
        if (foundPrice === 0 && product.medidas_variants && product.medidas_variants.length > 0) {
            let variant = null;
            if (medidaName) {
                variant = product.medidas_variants.find(m => (m.medida || '').trim().toLowerCase() === (medidaName || '').trim().toLowerCase());
            }
            if (!variant) variant = product.medidas_variants[0];
            if (variant && variant.price !== undefined) foundPrice = parseFloat(variant.price) || 0;
        }
        if (foundPrice === 0) {
            foundPrice = parseFloat(product.price || product.precio) || 0;
        }
        return foundPrice;
    }

    function addProductToQuote(product) {
        let defaultAcabado = '';
        let defaultMedida = '';
        let defaultImage = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');

        if (product.acabados_groups && product.acabados_groups.length > 0) {
            const firstG = product.acabados_groups[0];
            defaultAcabado = firstG.acabado_name || 'Natural';
            if (firstG.cover_image) defaultImage = firstG.cover_image;
            if (firstG.medidas_variants && firstG.medidas_variants.length > 0) {
                defaultMedida = firstG.medidas_variants[0].medida || 'Estándar';
            }
        } else if (product.medidas_variants && product.medidas_variants.length > 0) {
            defaultMedida = product.medidas_variants[0].medida || 'Estándar';
        }

        const price = resolveQuoteProductPrice(product, defaultAcabado, defaultMedida);

        let detailsParts = [];
        if (defaultAcabado) detailsParts.push(`Acabado: ${defaultAcabado}`);
        if (defaultMedida) detailsParts.push(`Medida: ${defaultMedida}`);

        currentQuote.items.push({
            productId: product.id,
            title: product.title,
            acabado: defaultAcabado,
            medida: defaultMedida,
            details: detailsParts.join(' | '),
            qty: 1,
            price: price,
            weight: parseFloat(product.estimatedWeight) || 1,
            image: defaultImage
        });

        renderAdminQuotes();
    }

    function bindQuoteItemEvents() {
        document.querySelectorAll('.quote-item-title').forEach(inp => {
            inp.addEventListener('input', (e) => { currentQuote.items[inp.dataset.index].title = e.target.value; });
        });
        document.querySelectorAll('.quote-item-desc').forEach(inp => {
            inp.addEventListener('input', (e) => { currentQuote.items[inp.dataset.index].details = e.target.value; });
        });
        document.querySelectorAll('.quote-item-qty').forEach(inp => {
            inp.addEventListener('input', (e) => {
                currentQuote.items[inp.dataset.index].qty = parseInt(e.target.value) || 1;
                renderAdminQuotes();
            });
        });
        document.querySelectorAll('.quote-item-price').forEach(inp => {
            inp.addEventListener('input', (e) => {
                currentQuote.items[inp.dataset.index].price = parseFloat(e.target.value) || 0;
                renderAdminQuotes();
            });
        });
        document.querySelectorAll('.btn-remove-quote-item').forEach(btn => {
            btn.addEventListener('click', () => {
                currentQuote.items.splice(btn.dataset.index, 1);
                renderAdminQuotes();
            });
        });

        // Dropdown Acabado listener
        document.querySelectorAll('.quote-acabado-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const idx = parseInt(sel.dataset.index);
                const item = currentQuote.items[idx];
                if (!item) return;

                item.acabado = e.target.value;
                const sourceData = (window.sessionProducts && window.sessionProducts.length > 0) ? window.sessionProducts : (window.productsData || []);
                let product = null;
                sourceData.forEach(c => (c.products || []).forEach(p => { if (String(p.id) === String(item.productId)) product = p; }));

                if (product) {
                    const newPrice = resolveQuoteProductPrice(product, item.acabado, item.medida);
                    if (newPrice > 0) item.price = newPrice;
                    let parts = [];
                    if (item.acabado) parts.push(`Acabado: ${item.acabado}`);
                    if (item.medida) parts.push(`Medida: ${item.medida}`);
                    item.details = parts.join(' | ');
                }
                renderAdminQuotes();
            });
        });

        // Dropdown Medida listener
        document.querySelectorAll('.quote-medida-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const idx = parseInt(sel.dataset.index);
                const item = currentQuote.items[idx];
                if (!item) return;

                item.medida = e.target.value;
                const sourceData = (window.sessionProducts && window.sessionProducts.length > 0) ? window.sessionProducts : (window.productsData || []);
                let product = null;
                sourceData.forEach(c => (c.products || []).forEach(p => { if (String(p.id) === String(item.productId)) product = p; }));

                if (product) {
                    const newPrice = resolveQuoteProductPrice(product, item.acabado, item.medida);
                    if (newPrice > 0) item.price = newPrice;
                    let parts = [];
                    if (item.acabado) parts.push(`Acabado: ${item.acabado}`);
                    if (item.medida) parts.push(`Medida: ${item.medida}`);
                    item.details = parts.join(' | ');
                }
                renderAdminQuotes();
            });
        });

        // Actions
        document.getElementById('btn-send-quote-wa')?.addEventListener('click', () => {
            saveCurrentQuoteToHistory('enviado');
            sendWhatsAppQuote();
        });
        document.getElementById('btn-send-cbu-wa')?.addEventListener('click', () => {
            sendCBUViaWhatsApp();
        });
        document.getElementById('btn-send-quote-email')?.addEventListener('click', () => {
            saveCurrentQuoteToHistory('enviado');
            sendEmailQuote();
        });
    }

    function sendCBUViaWhatsApp() {
        const transfer = window.sessionPaymentConfig?.transfer || {};
        
        const bankLines = [];
        bankLines.push('🏦 Datos para Transferencia Bancaria Directa:');
        if (transfer.bank) bankLines.push(`• Banco: ${transfer.bank}`);
        if (transfer.alias) bankLines.push(`• ALIAS: ${transfer.alias}`);
        if (transfer.cbu) bankLines.push(`• CBU: ${transfer.cbu}`);
        if (transfer.titular) bankLines.push(`• Titular: ${transfer.titular}`);
        if (transfer.cuit) bankLines.push(`• CUIT: ${transfer.cuit}`);
        bankLines.push('\nPor favor, una vez realizada la transferencia envianos el comprobante por acá. ¡Muchas gracias! 🪵✨');

        const msg = bankLines.join('\n');

        let cleanPhone = (currentQuote.clientPhone || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('549')) {
            cleanPhone = cleanPhone.substring(3);
        } else if (cleanPhone.startsWith('54')) {
            cleanPhone = cleanPhone.substring(2);
        }
        if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }
        if (cleanPhone.startsWith('15') && cleanPhone.length === 12) {
            cleanPhone = cleanPhone.substring(2);
        }
        
        const finalPhone = cleanPhone ? `549${cleanPhone}` : '';
        const waUrl = finalPhone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
    }

    function sendWhatsAppQuote() {
        if (currentQuote.items.length === 0) {
            alert('Agregá al menos 1 producto para armar el presupuesto.');
            return;
        }

        const subtotal = currentQuote.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
        const discountVal = Math.round(subtotal * (currentQuote.discountPercent / 100));
        const total = Math.max(0, subtotal - discountVal + Number(currentQuote.shippingCost));
        const fmt = (val) => '$' + Number(val).toLocaleString();

        let msg = `*PRESUPUESTO ESTIMADO - LA TARIMA*\n`;
        if (currentQuote.clientName) msg += `Cliente: *${currentQuote.clientName}*\n`;
        msg += `------------------------------------\n`;

        currentQuote.items.forEach(it => {
            msg += `• *${it.title}* x${it.qty}\n`;
            if (it.details) msg += `   - ${it.details}\n`;
            msg += `   - Subtotal: *${fmt(it.qty * it.price)}*\n`;
        });

        msg += `------------------------------------\n`;
        msg += `Subtotal Productos: *${fmt(subtotal)}*\n`;
        if (currentQuote.discountPercent > 0) {
            msg += `Descuento (${currentQuote.discountPercent}% OFF): *-${fmt(discountVal)}*\n`;
        }
        msg += `Envío (${currentQuote.clientLocality || 'A convenir'}): *${currentQuote.shippingCost > 0 ? fmt(currentQuote.shippingCost) : 'Gratis / A convenir'}*\n`;
        msg += `*TOTAL FINAL: ${fmt(total)}*\n`;
        msg += `------------------------------------\n`;
        msg += `* Precios expresados sin impuestos.\n`;
        msg += `* Modalidad de pago: Transferencia bancaria.\n`;
        msg += `* Presupuesto válido por ${currentQuote.validDays} días.\n`;
        if (currentQuote.leadDays) {
            msg += `* Tiempo estimado de elaboración: ${currentQuote.leadDays === 'Inmediata / Stock' ? 'Entrega Inmediata (Stock)' : currentQuote.leadDays + ' días hábiles'}.\n`;
        }
        if (currentQuote.notes) msg += `* Nota: ${currentQuote.notes}\n`;
        msg += `\n¿Te gustaría confirmarlo o realizar alguna modificación?`;

        let cleanPhone = (currentQuote.clientPhone || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('549')) {
            cleanPhone = cleanPhone.substring(3);
        } else if (cleanPhone.startsWith('54')) {
            cleanPhone = cleanPhone.substring(2);
        }
        if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }
        if (cleanPhone.startsWith('15') && cleanPhone.length === 12) {
            cleanPhone = cleanPhone.substring(2);
        }
        
        const finalPhone = cleanPhone ? `549${cleanPhone}` : '';
        const waUrl = finalPhone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
    }

    function sendEmailQuote() {
        if (!currentQuote.clientEmail) {
            alert('Ingresá el correo electrónico del cliente arriba.');
            return;
        }
        const subject = encodeURIComponent(`Presupuesto La Tarima - ${currentQuote.clientName || 'Cliente'}`);
        const body = encodeURIComponent(`Hola ${currentQuote.clientName || ''},\n\nAdjuntamos el presupuesto cotizado.\n\nValidez: ${currentQuote.validDays} días.\n\nSaludos,\nEquipo La Tarima`);
        window.location.href = `mailto:${currentQuote.clientEmail}?subject=${subject}&body=${body}`;
    }

    function printPDFQuote() {
        window.print();
    }

    window.renderAdminQuotes = renderAdminQuotes;
    window.convertQuoteToOrder = convertQuoteToOrder;
})();
