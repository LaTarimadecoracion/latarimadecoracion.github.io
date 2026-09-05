// js/admin-payments.js
// --- MÓDULO ADMIN GESTIÓN DE MÉTODOS Y PASARELAS DE PAGO V2 ---

(function() {
    let selectedPayProdIds = new Set();
    let selectedPayOfferIds = new Set();

    const defaultPaymentConfig = {
        transfer: {
            active: true,
            alias: 'VENUS.PULMON.METRO',
            cbu: '0720048988000002273736',
            bank: 'Banco Santander',
            titular: 'Yonatan Lucas Orellana',
            cuit: '20-35281538-2',
            discountPercent: 0
        },
        mercadopago: {
            active: false,
            mode: 'sandbox', // 'sandbox' | 'production'
            publicKey: '',
            accessToken: '',
            maxInstallments: 12
        },
        credit: {
            active: true,
            surchargePercent: 0
        }
    };

    function loadPaymentConfig() {
        if (window.sessionPaymentConfig) {
            return;
        }
        const stored = localStorage.getItem('sessionPaymentConfig');
        if (stored) {
            try {
                window.sessionPaymentConfig = JSON.parse(stored);
            } catch (e) {
                window.sessionPaymentConfig = defaultPaymentConfig;
            }
        } else {
            window.sessionPaymentConfig = defaultPaymentConfig;
        }
    }

    loadPaymentConfig();

    const formatCurr = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(val || 0);

    window.renderAdminPayments = function() {
        const container = document.getElementById('admin-payments-view');
        if (!container) return;

        const config = window.sessionPaymentConfig || defaultPaymentConfig;
        const transfer = config.transfer || defaultPaymentConfig.transfer;
        const mp = config.mercadopago || defaultPaymentConfig.mercadopago;

        const mpStatusBadge = mp.accessToken
            ? `<span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span> Configurado (${mp.mode === 'production' ? 'PROD' : 'TEST'})
               </span>`
            : `<span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-symbols-outlined" style="font-size: 16px;">warning</span> Pendiente de Claves
               </span>`;

        container.innerHTML = `
            <!-- Header Sección -->
            <div class="admin-page-header">
                <div>
                    <h3 class="admin-header-title">
                        <span class="material-symbols-outlined">payments</span>
                        Gestión de Métodos &amp; Pasarelas de Pago
                    </h3>
                    <p class="admin-header-desc">Configurá las credenciales oficiales de Mercado Pago y tus datos bancarios para transferencia.</p>
                </div>
                <div class="admin-header-actions">
                    <button type="button" onclick="window.saveAdminPaymentConfig()" class="btn-primary" id="btn-save-payments-main">
                        <span class="material-symbols-outlined">save</span> Guardar Cambios
                    </button>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
                
                <!-- 1. MERCADO PAGO API (CHECKOUT PRO) -->
                <div class="admin-card" style="border: 1.5px solid #0284c7; background: #ffffff; border-radius: 16px; padding: 1.25rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="material-symbols-outlined" style="color: #0284c7; font-size: 26px;">credit_card</span>
                            <div>
                                <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a;">💳 Mercado Pago API (Checkout Pro)</h4>
                                <div style="font-size: 0.73rem; color: #64748b;">Cobro automático con cuotas, débito y dinero en cuenta</div>
                            </div>
                        </div>
                        ${mpStatusBadge}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 800; color: #0f172a; cursor: pointer; background: #f0f9ff; border: 1px solid #bae6fd; padding: 8px 12px; border-radius: 10px;">
                            <input type="checkbox" id="admin-mp-active" ${mp.active ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #0284c7; cursor: pointer;">
                            <span>Habilitar cobro automático con Mercado Pago</span>
                        </label>

                        <div>
                            <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                                Entorno / Modo de Ejecución:
                            </label>
                            <div style="display: flex; gap: 12px;">
                                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #0f172a; cursor: pointer;">
                                    <input type="radio" name="admin-mp-mode" value="sandbox" ${mp.mode !== 'production' ? 'checked' : ''} style="accent-color: #0284c7;">
                                    <span>🧪 Pruebas (Sandbox)</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #0f172a; cursor: pointer;">
                                    <input type="radio" name="admin-mp-mode" value="production" ${mp.mode === 'production' ? 'checked' : ''} style="accent-color: #0284c7;">
                                    <span>🚀 Producción (Real)</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Public Key (Clave Pública MP):
                            </label>
                            <input type="text" id="admin-mp-public-key" value="${mp.publicKey || ''}" placeholder="Ej: APP_USR-xxxx... o TEST-xxxx..." style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; font-family: monospace; color: #0f172a; outline: none;">
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Access Token (Clave Privada de API):
                            </label>
                            <input type="password" id="admin-mp-access-token" value="${mp.accessToken || ''}" placeholder="Ej: APP_USR-123456789..." style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; font-family: monospace; color: #0f172a; outline: none;">
                            <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">
                                Obtela en <a href="https://www.mercadopago.com.ar/developers/panel/credentials" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-weight: 700;">mercadopago.com.ar/developers</a> ➔ Sus Credenciales.
                            </div>
                        </div>

                    </div>
                </div>

                <!-- 2. TRANSFERENCIA BANCARIA DIRECTA -->
                <div class="admin-card" style="border: 1.5px solid #059669; background: #ffffff; border-radius: 16px; padding: 1.25rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="material-symbols-outlined" style="color: #059669; font-size: 26px;">account_balance</span>
                            <div>
                                <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a;">🏦 Transferencia Bancaria Directa</h4>
                                <div style="font-size: 0.73rem; color: #64748b;">Datos bancarios exhibidos en el checkout al pagar</div>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 800; color: #0f172a; cursor: pointer; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 12px; border-radius: 10px;">
                            <input type="checkbox" id="admin-transfer-active" ${transfer.active !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #059669; cursor: pointer;">
                            <span>Habilitar pago por Transferencia Bancaria</span>
                        </label>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    ALIAS:
                                </label>
                                <input type="text" id="admin-transfer-alias" value="${transfer.alias || ''}" placeholder="Ej: MI.ALIAS.MP" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; font-weight: 700; color: #0f172a; outline: none;">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    CBU / CVU:
                                </label>
                                <input type="text" id="admin-transfer-cbu" value="${transfer.cbu || ''}" placeholder="Ej: 07200489..." style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.82rem; font-family: monospace; color: #0f172a; outline: none;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Banco / Entidad:
                                </label>
                                <input type="text" id="admin-transfer-bank" value="${transfer.bank || ''}" placeholder="Ej: Banco Santander" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; outline: none;">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Titular de la Cuenta:
                                </label>
                                <input type="text" id="admin-transfer-titular" value="${transfer.titular || ''}" placeholder="Ej: Juan Pérez" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; outline: none;">
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                CUIT / CUIL del Titular:
                            </label>
                            <input type="text" id="admin-transfer-cuit" value="${transfer.cuit || ''}" placeholder="Ej: 20-12345678-9" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; outline: none;">
                        </div>

                    </div>
                </div>

            </div>

            <!-- ==================== TABLAS COLAPSABLES POR PRODUCTO Y OFERTA ==================== -->
            <div style="display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.5rem;">
                
                <!-- 3. COLAPSABLE: MEDIOS DE PAGO POR PRODUCTO -->
                <div class="admin-card" style="border: 1px solid #cbd5e1; border-radius: 16px; background: #ffffff; overflow: hidden; padding: 0;">
                    <div onclick="window.toggleAdminPaymentPanel('admin-pay-prods-wrapper', 'admin-pay-prods-icon')" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; background: #f8fafc; cursor: pointer; user-select: none; border-bottom: 1px solid #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="admin-pay-prods-icon" class="material-symbols-outlined" style="color: #64748b; font-size: 22px; transition: transform 0.2s ease; transform: rotate(-90deg);">expand_more</span>
                            <span class="material-symbols-outlined" style="color: #0f172a; font-size: 24px;">inventory_2</span>
                            <div>
                                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a;">📦 Asignación de Medios de Pago por Producto (Catálogo)</h4>
                                <div style="font-size: 0.72rem; color: #64748b;">Verificá y configurá qué métodos de pago acepta cada producto individualmente</div>
                            </div>
                        </div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: #64748b; background: #e2e8f0; padding: 2px 10px; border-radius: 12px;" id="admin-pay-prods-count">0 Productos</span>
                    </div>

                    <div id="admin-pay-prods-wrapper" style="display: none; padding: 1.25rem;">
                        <div style="margin-bottom: 0.75rem; display: flex; gap: 10px; align-items: center;">
                            <input type="text" id="admin-pay-prod-search" placeholder="🔍 Buscar producto por título o categoría..." oninput="window.renderAdminPaymentProducts(this.value)" style="flex: 3; min-width: 0; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 0.9rem; font-size: 0.85rem; outline: none;">
                            <button type="button" onclick="window.saveAdminPaymentConfig()" class="btn-primary" style="flex: 1; min-width: 0; font-size: 0.8rem; padding: 0.55rem 1rem; border-radius: 10px; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">save</span> Guardar Productos
                            </button>
                        </div>

                        <!-- BARRA DE ACCIÓN MASIVA SIMPLIFICADA (DESPLEGABLE EN 1 FILA HORIZONTAL) -->
                        <div id="admin-pay-prods-bulk-bar" style="display: none; margin-bottom: 0.85rem; background: #f8fafc; border: 1.5px solid #0284c7; border-radius: 12px; padding: 0.6rem 0.9rem; flex-wrap: nowrap; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.8rem; overflow-x: auto; transition: all 0.2s ease;">
                            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #0f172a; white-space: nowrap;">
                                <span class="material-symbols-outlined" style="color: #0284c7; font-size: 20px;">checklist</span>
                                <span id="admin-pay-prods-selected-count">0 seleccionados</span>
                            </div>
                            <div style="display: flex; flex-wrap: nowrap; align-items: center; gap: 6px; white-space: nowrap;">
                                <button type="button" onclick="window.selectAllPayProducts()" style="background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="Seleccionar todos los productos visibles">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">select_all</span> Seleccionar todo
                                </button>
                                <button type="button" onclick="window.clearPayProductSelection()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="Limpiar selección">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">deselect</span> Deseleccionar
                                </button>
                                <button type="button" onclick="window.bulkUpdatePayProductsAll(true)" style="background: #0f172a; color: #ffffff; border: none; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="Activar todos los métodos de pago en seleccionados">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span> Todos ON
                                </button>
                                <button type="button" onclick="window.bulkUpdatePayProductsAll(false)" style="background: #64748b; color: #ffffff; border: none; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="Desactivar todos los métodos de pago en seleccionados">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">cancel</span> Todos OFF
                                </button>
                            </div>
                        </div>

                        <div style="overflow-x: auto; max-height: 450px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                                <thead>
                                    <tr style="background: #f1f5f9; color: #475569; font-weight: 800; text-transform: uppercase; font-size: 0.7rem; border-bottom: 1.5px solid #cbd5e1; user-select: none;">
                                        <th style="padding: 10px; width: 36px; text-align: center;">
                                            <input type="checkbox" id="chk-select-all-pay-prods" onchange="window.toggleSelectAllPayProducts(this.checked)" title="Seleccionar/Deseleccionar todos" style="width: 16px; height: 16px; accent-color: #0284c7; cursor: pointer;">
                                        </th>
                                        <th style="padding: 10px; width: 50px;">Foto</th>
                                        <th style="padding: 10px;">Título del Producto</th>
                                        <th style="padding: 10px; width: 100px;">Precio</th>
                                        <th onclick="window.togglePayColumnProducts('transferEnabled')" style="padding: 10px; width: 110px; text-align: center; cursor: pointer; background: #e2e8f0; border-radius: 6px 0 0 0;" title="Tocar aquí para alternar Transferencia (ON/OFF) en seleccionados o todos">
                                            🏦 Transferencia <span class="material-symbols-outlined" style="font-size: 13px; vertical-align: middle;">swap_vert</span>
                                        </th>
                                        <th onclick="window.togglePayColumnProducts('linkEnabled')" style="padding: 10px; width: 110px; text-align: center; cursor: pointer; background: #e2e8f0;" title="Tocar aquí para alternar Link/Débito (ON/OFF) en seleccionados o todos">
                                            🔗 Link / Débito <span class="material-symbols-outlined" style="font-size: 13px; vertical-align: middle;">swap_vert</span>
                                        </th>
                                        <th onclick="window.togglePayColumnProducts('creditEnabled')" style="padding: 10px; width: 110px; text-align: center; cursor: pointer; background: #e2e8f0; border-radius: 0 6px 0 0;" title="Tocar aquí para alternar Tarjeta (ON/OFF) en seleccionados o todos">
                                            💳 Tarjeta <span class="material-symbols-outlined" style="font-size: 13px; vertical-align: middle;">swap_vert</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="admin-pay-prods-tbody">
                                    <!-- Inyectado dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- 4. COLAPSABLE: MEDIOS DE PAGO POR OFERTA -->
                <div class="admin-card" style="border: 1px solid #cbd5e1; border-radius: 16px; background: #ffffff; overflow: hidden; padding: 0;">
                    <div onclick="window.toggleAdminPaymentPanel('admin-pay-offers-wrapper', 'admin-pay-offers-icon')" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; background: #f8fafc; cursor: pointer; user-select: none; border-bottom: 1px solid #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="admin-pay-offers-icon" class="material-symbols-outlined" style="color: #64748b; font-size: 22px; transition: transform 0.2s ease; transform: rotate(-90deg);">expand_more</span>
                            <span class="material-symbols-outlined" style="color: #c0510a; font-size: 24px;">local_offer</span>
                            <div>
                                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a;">🏷️ Asignación de Medios de Pago por Oferta / Combo</h4>
                                <div style="font-size: 0.72rem; color: #64748b;">Habilitá o deshabilitá métodos de pago directamente para cada oferta de la tienda</div>
                            </div>
                        </div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: #c0510a; background: #ffedd5; padding: 2px 10px; border-radius: 12px;" id="admin-pay-offers-count">0 Ofertas</span>
                    </div>

                    <div id="admin-pay-offers-wrapper" style="display: none; padding: 1.25rem;">
                        <div style="margin-bottom: 0.75rem; display: flex; gap: 10px; align-items: center;">
                            <input type="text" id="admin-pay-offer-search" placeholder="🔍 Buscar oferta por título..." oninput="window.renderAdminPaymentOffers(this.value)" style="flex: 3; min-width: 0; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.6rem 0.9rem; font-size: 0.85rem; outline: none;">
                            <button type="button" onclick="window.saveAdminPaymentConfig()" class="btn-primary" style="flex: 1; min-width: 0; font-size: 0.8rem; padding: 0.55rem 1rem; border-radius: 10px; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 6px; background: #c0510a;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">save</span> Guardar Ofertas
                            </button>
                        </div>

                        <!-- BARRA DE ACCIÓN MASIVA OFERTAS SIMPLIFICADA (DESPLEGABLE EN 1 FILA HORIZONTAL) -->
                        <div id="admin-pay-offers-bulk-bar" style="display: none; margin-bottom: 0.85rem; background: #fff7ed; border: 1.5px solid #c0510a; border-radius: 12px; padding: 0.6rem 0.9rem; flex-wrap: nowrap; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.8rem; overflow-x: auto; transition: all 0.2s ease;">
                            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #0f172a; white-space: nowrap;">
                                <span class="material-symbols-outlined" style="color: #c0510a; font-size: 20px;">checklist</span>
                                <span id="admin-pay-offers-selected-count">0 seleccionadas</span>
                            </div>
                            <div style="display: flex; flex-wrap: nowrap; align-items: center; gap: 6px; white-space: nowrap;">
                                <button type="button" onclick="window.selectAllPayOffers()" style="background: #ffedd5; color: #c0510a; border: 1px solid #fed7aa; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="Seleccionar todas las ofertas visibles">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">select_all</span> Seleccionar todo
                                </button>
                                <button type="button" onclick="window.clearPayOfferSelection()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="Limpiar selección">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">deselect</span> Deseleccionar
                                </button>
                                <button type="button" onclick="window.bulkUpdatePayOffersAll(true)" style="background: #c0510a; color: #ffffff; border: none; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="Activar todos los métodos de pago en seleccionadas">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span> Todos ON
                                </button>
                                <button type="button" onclick="window.bulkUpdatePayOffersAll(false)" style="background: #64748b; color: #ffffff; border: none; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="Desactivar todos los métodos de pago en seleccionadas">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">cancel</span> Todos OFF
                                </button>
                            </div>
                        </div>

                        <div style="overflow-x: auto; max-height: 450px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                                <thead>
                                    <tr style="background: #fff7ed; color: #c0510a; font-weight: 800; text-transform: uppercase; font-size: 0.7rem; border-bottom: 1.5px solid #fed7aa; user-select: none;">
                                        <th style="padding: 10px; width: 36px; text-align: center;">
                                            <input type="checkbox" id="chk-select-all-pay-offers" onchange="window.toggleSelectAllPayOffers(this.checked)" title="Seleccionar/Deseleccionar todas" style="width: 16px; height: 16px; accent-color: #c0510a; cursor: pointer;">
                                        </th>
                                        <th style="padding: 10px; width: 50px;">Foto</th>
                                        <th style="padding: 10px;">Título de la Oferta</th>
                                        <th style="padding: 10px; width: 100px;">Precio Oferta</th>
                                        <th onclick="window.togglePayColumnOffers('transferEnabled')" style="padding: 10px; width: 110px; text-align: center; cursor: pointer; background: #fed7aa; border-radius: 6px 0 0 0;" title="Tocar aquí para alternar Transferencia (ON/OFF) en seleccionadas o todas">
                                            🏦 Transferencia <span class="material-symbols-outlined" style="font-size: 13px; vertical-align: middle;">swap_vert</span>
                                        </th>
                                        <th onclick="window.togglePayColumnOffers('linkEnabled')" style="padding: 10px; width: 110px; text-align: center; cursor: pointer; background: #fed7aa;" title="Tocar aquí para alternar Link/Débito (ON/OFF) en seleccionadas o todas">
                                            🔗 Link / Débito <span class="material-symbols-outlined" style="font-size: 13px; vertical-align: middle;">swap_vert</span>
                                        </th>
                                        <th onclick="window.togglePayColumnOffers('creditEnabled')" style="padding: 10px; width: 110px; text-align: center; cursor: pointer; background: #fed7aa; border-radius: 0 6px 0 0;" title="Tocar aquí para alternar Tarjeta (ON/OFF) en seleccionadas o todas">
                                            💳 Tarjeta <span class="material-symbols-outlined" style="font-size: 13px; vertical-align: middle;">swap_vert</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="admin-pay-offers-tbody">
                                    <!-- Inyectado dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        `;

        // Render inicial de las dos tablas
        window.renderAdminPaymentProducts();
        window.renderAdminPaymentOffers();
    };

    // Toggle de paneles colapsables
    window.toggleAdminPaymentPanel = function(wrapperId, iconId) {
        const wrapper = document.getElementById(wrapperId);
        const icon = document.getElementById(iconId);
        if (!wrapper) return;
        const isHidden = wrapper.style.display === 'none';
        wrapper.style.display = isHidden ? 'block' : 'none';
        if (icon) {
            icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
        }
    };

    // RENDER TABLA PRODUCTOS
    window.renderAdminPaymentProducts = function(query = '') {
        const tbody = document.getElementById('admin-pay-prods-tbody');
        const countSpan = document.getElementById('admin-pay-prods-count');
        if (!tbody) return;

        const categories = window.sessionProducts || [];
        let allProducts = [];

        categories.forEach(cat => {
            (cat.products || []).forEach(prod => {
                allProducts.push({ ...prod, categoryName: cat.name });
            });
        });

        if (countSpan) countSpan.textContent = `${allProducts.length} Productos`;

        const q = (query || '').toLowerCase().trim();
        const filtered = q ? allProducts.filter(p => (p.title || '').toLowerCase().includes(q) || (p.categoryName || '').toLowerCase().includes(q)) : allProducts;

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 1rem; text-align: center; color: #94a3b8; font-style: italic;">No se encontraron productos.</td></tr>';
            window.updatePayProductsBulkBarUI();
            return;
        }

        tbody.innerHTML = filtered.map(prod => {
            const payConf = prod.paymentConfig || {};
            const isTrans = payConf.transferEnabled !== false;
            const isLink = payConf.linkEnabled !== false;
            const isCredit = payConf.creditEnabled !== false;
            const isSelected = selectedPayProdIds.has(prod.id);

            const imgSrc = Array.isArray(prod.image) ? prod.image[0] : (prod.image || 'img/logo_provisional.png');

            return `
                <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.15s; ${isSelected ? 'background: #f0f9ff;' : ''}" onmouseover="if(!${isSelected}) this.style.background='#f8fafc'" onmouseout="if(!${isSelected}) this.style.background='transparent'">
                    <td style="padding: 8px; text-align: center;">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="window.onPayProductSelectChange('${prod.id}', this.checked)" style="width: 16px; height: 16px; accent-color: #0284c7; cursor: pointer;">
                    </td>
                    <td style="padding: 8px;">
                        <img src="${imgSrc}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="window.onPayProductSelectChange('${prod.id}', !${isSelected})">
                    </td>
                    <td style="padding: 8px;">
                        <div style="font-weight: 700; color: #0f172a; cursor: pointer;" onclick="window.onPayProductSelectChange('${prod.id}', !${isSelected})" title="Tocar título para seleccionar/deseleccionar">${prod.title}</div>
                        <div style="font-size: 0.68rem; color: #64748b;">${prod.categoryName || 'Catálogo'}</div>
                    </td>
                    <td style="padding: 8px; font-weight: 800; color: #059669; font-family: monospace;">
                        ${formatCurr(prod.price)}
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <input type="checkbox" ${isTrans ? 'checked' : ''} onchange="window.updateProductPaymentConfig('${prod.id}', 'transferEnabled', this.checked)" style="width: 18px; height: 18px; accent-color: #16a34a; cursor: pointer;">
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <input type="checkbox" ${isLink ? 'checked' : ''} onchange="window.updateProductPaymentConfig('${prod.id}', 'linkEnabled', this.checked)" style="width: 18px; height: 18px; accent-color: #0284c7; cursor: pointer;">
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <input type="checkbox" ${isCredit ? 'checked' : ''} onchange="window.updateProductPaymentConfig('${prod.id}', 'creditEnabled', this.checked)" style="width: 18px; height: 18px; accent-color: #d97706; cursor: pointer;">
                    </td>
                </tr>
            `;
        }).join('');

        window.updatePayProductsBulkBarUI();
    };

    // FUNCIONES DE SELECCIÓN Y EDICIÓN MASIVA PRODUCTOS
    window.onPayProductSelectChange = function(prodId, isChecked) {
        if (isChecked) {
            selectedPayProdIds.add(prodId);
        } else {
            selectedPayProdIds.delete(prodId);
        }
        window.updatePayProductsBulkBarUI();
        const query = document.getElementById('admin-pay-prod-search')?.value || '';
        window.renderAdminPaymentProducts(query);
    };

    window.toggleSelectAllPayProducts = function(isChecked) {
        const categories = window.sessionProducts || [];
        const query = (document.getElementById('admin-pay-prod-search')?.value || '').toLowerCase().trim();
        categories.forEach(cat => {
            (cat.products || []).forEach(prod => {
                if (!query || (prod.title || '').toLowerCase().includes(query) || (cat.name || '').toLowerCase().includes(query)) {
                    if (isChecked) {
                        selectedPayProdIds.add(prod.id);
                    } else {
                        selectedPayProdIds.delete(prod.id);
                    }
                }
            });
        });
        window.renderAdminPaymentProducts(query);
    };

    window.selectAllPayProducts = function() {
        const categories = window.sessionProducts || [];
        categories.forEach(cat => {
            (cat.products || []).forEach(prod => {
                selectedPayProdIds.add(prod.id);
            });
        });
        const query = document.getElementById('admin-pay-prod-search')?.value || '';
        window.renderAdminPaymentProducts(query);
    };

    window.clearPayProductSelection = function() {
        selectedPayProdIds.clear();
        const query = document.getElementById('admin-pay-prod-search')?.value || '';
        window.renderAdminPaymentProducts(query);
    };

    window.updatePayProductsBulkBarUI = function() {
        const countSpan = document.getElementById('admin-pay-prods-selected-count');
        const bulkBar = document.getElementById('admin-pay-prods-bulk-bar');
        const count = selectedPayProdIds.size;
        if (countSpan) {
            countSpan.textContent = `${count} seleccionado${count === 1 ? '' : 's'}`;
        }
        if (bulkBar) {
            bulkBar.style.display = count > 0 ? 'flex' : 'none';
        }
        const chkAll = document.getElementById('chk-select-all-pay-prods');
        if (chkAll) {
            const categories = window.sessionProducts || [];
            let totalCount = 0;
            categories.forEach(cat => { totalCount += (cat.products || []).length; });
            chkAll.checked = totalCount > 0 && selectedPayProdIds.size >= totalCount;
        }
    };

    window.togglePayColumnProducts = function(fieldKey) {
        const categories = window.sessionProducts || (typeof productsData !== 'undefined' ? productsData : []);
        const targetSet = selectedPayProdIds.size > 0 ? selectedPayProdIds : null;
        
        let targetProds = [];
        categories.forEach(cat => {
            (cat.products || []).forEach(prod => {
                if (!targetSet || targetSet.has(prod.id)) {
                    targetProds.push(prod);
                }
            });
        });

        if (targetProds.length === 0) return;

        const allActive = targetProds.every(prod => (prod.paymentConfig ? prod.paymentConfig[fieldKey] !== false : true));
        const newValue = !allActive;

        targetProds.forEach(prod => {
            if (!prod.paymentConfig) prod.paymentConfig = { transferEnabled: true, linkEnabled: true, creditEnabled: true };
            prod.paymentConfig[fieldKey] = newValue;
        });

        window.sessionProducts = categories;
        localStorage.setItem('sessionProducts', JSON.stringify(categories));
        if (typeof window.saveProductsToServer === 'function') {
            window.saveProductsToServer();
        } else {
            try {
                fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categories)
                });
            } catch(e) {}
        }
        const query = document.getElementById('admin-pay-prod-search')?.value || '';
        window.renderAdminPaymentProducts(query);
    };

    window.bulkUpdatePayProductsAll = function(value) {
        const categories = window.sessionProducts || (typeof productsData !== 'undefined' ? productsData : []);
        const targetSet = selectedPayProdIds.size > 0 ? selectedPayProdIds : null;

        categories.forEach(cat => {
            (cat.products || []).forEach(prod => {
                if (!targetSet || targetSet.has(prod.id)) {
                    prod.paymentConfig = { transferEnabled: value, linkEnabled: value, creditEnabled: value };
                }
            });
        });
        window.sessionProducts = categories;
        localStorage.setItem('sessionProducts', JSON.stringify(categories));
        if (typeof window.saveProductsToServer === 'function') {
            window.saveProductsToServer();
        } else {
            try {
                fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categories)
                });
            } catch(e) {}
        }
        const query = document.getElementById('admin-pay-prod-search')?.value || '';
        window.renderAdminPaymentProducts(query);
    };

    // UPDATE PAYMENT CONFIG PRODUCTO
    window.updateProductPaymentConfig = function(prodId, fieldKey, isChecked) {
        const categories = window.sessionProducts || (typeof productsData !== 'undefined' ? productsData : []);
        categories.forEach(cat => {
            (cat.products || []).forEach(prod => {
                if (prod.id === prodId) {
                    if (!prod.paymentConfig) prod.paymentConfig = { transferEnabled: true, linkEnabled: true, creditEnabled: true };
                    prod.paymentConfig[fieldKey] = isChecked;
                }
            });
        });
        window.sessionProducts = categories;
        localStorage.setItem('sessionProducts', JSON.stringify(categories));
        if (typeof window.saveProductsToServer === 'function') {
            window.saveProductsToServer();
        } else {
            try {
                fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categories)
                });
            } catch(e) {}
        }
    };

    // RENDER TABLA OFERTAS
    window.renderAdminPaymentOffers = function(query = '') {
        const tbody = document.getElementById('admin-pay-offers-tbody');
        const countSpan = document.getElementById('admin-pay-offers-count');
        if (!tbody) return;

        const offers = window.sessionOffers || (typeof offersData !== 'undefined' ? offersData : []);
        if (countSpan) countSpan.textContent = `${offers.length} Ofertas`;

        const q = (query || '').toLowerCase().trim();
        const filtered = q ? offers.filter(o => (o.title || '').toLowerCase().includes(q)) : offers;

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 1rem; text-align: center; color: #94a3b8; font-style: italic;">No hay ofertas registradas.</td></tr>';
            window.updatePayOffersBulkBarUI();
            return;
        }

        tbody.innerHTML = filtered.map(offer => {
            const payConf = offer.paymentConfig || {};
            const isTrans = payConf.transferEnabled !== false;
            const isLink = payConf.linkEnabled !== false;
            const isCredit = payConf.creditEnabled !== false;
            const isSelected = selectedPayOfferIds.has(offer.id);

            const imgSrc = offer.customCoverImage || (offer.product_items && offer.product_items[0]?.image) || 'img/logo_provisional.png';

            return `
                <tr style="border-bottom: 1px solid #fed7aa; transition: background 0.15s; ${isSelected ? 'background: #fff7ed;' : ''}" onmouseover="if(!${isSelected}) this.style.background='#fff7ed'" onmouseout="if(!${isSelected}) this.style.background='transparent'">
                    <td style="padding: 8px; text-align: center;">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="window.onPayOfferSelectChange('${offer.id}', this.checked)" style="width: 16px; height: 16px; accent-color: #c0510a; cursor: pointer;">
                    </td>
                    <td style="padding: 8px;">
                        <img src="${imgSrc}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid #fdba74; cursor: pointer;" onclick="window.onPayOfferSelectChange('${offer.id}', !${isSelected})">
                    </td>
                    <td style="padding: 8px;">
                        <div style="font-weight: 800; color: #0f172a; cursor: pointer;" onclick="window.onPayOfferSelectChange('${offer.id}', !${isSelected})" title="Tocar título para seleccionar/deseleccionar">${offer.title}</div>
                        <div style="font-size: 0.68rem; color: #c0510a;">Combo Promocional</div>
                    </td>
                    <td style="padding: 8px; font-weight: 800; color: #c0510a; font-family: monospace;">
                        ${formatCurr(offer.offerPrice)}
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <input type="checkbox" ${isTrans ? 'checked' : ''} onchange="window.updateOfferPaymentConfig('${offer.id}', 'transferEnabled', this.checked)" style="width: 18px; height: 18px; accent-color: #16a34a; cursor: pointer;">
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <input type="checkbox" ${isLink ? 'checked' : ''} onchange="window.updateOfferPaymentConfig('${offer.id}', 'linkEnabled', this.checked)" style="width: 18px; height: 18px; accent-color: #0284c7; cursor: pointer;">
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <input type="checkbox" ${isCredit ? 'checked' : ''} onchange="window.updateOfferPaymentConfig('${offer.id}', 'creditEnabled', this.checked)" style="width: 18px; height: 18px; accent-color: #d97706; cursor: pointer;">
                    </td>
                </tr>
            `;
        }).join('');

        window.updatePayOffersBulkBarUI();
    };

    // FUNCIONES DE SELECCIÓN Y EDICIÓN MASIVA OFERTAS
    window.onPayOfferSelectChange = function(offerId, isChecked) {
        if (isChecked) {
            selectedPayOfferIds.add(offerId);
        } else {
            selectedPayOfferIds.delete(offerId);
        }
        window.updatePayOffersBulkBarUI();
        const query = document.getElementById('admin-pay-offer-search')?.value || '';
        window.renderAdminPaymentOffers(query);
    };

    window.toggleSelectAllPayOffers = function(isChecked) {
        const offers = window.sessionOffers || [];
        const query = (document.getElementById('admin-pay-offer-search')?.value || '').toLowerCase().trim();
        offers.forEach(offer => {
            if (!query || (offer.title || '').toLowerCase().includes(query)) {
                if (isChecked) {
                    selectedPayOfferIds.add(offer.id);
                } else {
                    selectedPayOfferIds.delete(offer.id);
                }
            }
        });
        window.renderAdminPaymentOffers(query);
    };

    window.selectAllPayOffers = function() {
        const offers = window.sessionOffers || [];
        offers.forEach(offer => {
            selectedPayOfferIds.add(offer.id);
        });
        const query = document.getElementById('admin-pay-offer-search')?.value || '';
        window.renderAdminPaymentOffers(query);
    };

    window.clearPayOfferSelection = function() {
        selectedPayOfferIds.clear();
        const query = document.getElementById('admin-pay-offer-search')?.value || '';
        window.renderAdminPaymentOffers(query);
    };

    window.updatePayOffersBulkBarUI = function() {
        const countSpan = document.getElementById('admin-pay-offers-selected-count');
        if (countSpan) {
            countSpan.textContent = `${selectedPayOfferIds.size} seleccionadas`;
        }
        const chkAll = document.getElementById('chk-select-all-pay-offers');
        if (chkAll) {
            const offers = window.sessionOffers || [];
            chkAll.checked = offers.length > 0 && selectedPayOfferIds.size >= offers.length;
        }
    };

    window.togglePayColumnOffers = function(fieldKey) {
        const offers = window.sessionOffers || (typeof offersData !== 'undefined' ? offersData : []);
        const targetSet = selectedPayOfferIds.size > 0 ? selectedPayOfferIds : null;
        
        let targetOffers = offers.filter(o => !targetSet || targetSet.has(o.id));
        if (targetOffers.length === 0) return;

        const allActive = targetOffers.every(o => (o.paymentConfig ? o.paymentConfig[fieldKey] !== false : true));
        const newValue = !allActive;

        targetOffers.forEach(o => {
            if (!o.paymentConfig) o.paymentConfig = { transferEnabled: true, linkEnabled: true, creditEnabled: true };
            o.paymentConfig[fieldKey] = newValue;
        });

        window.sessionOffers = offers;
        localStorage.setItem('sessionOffers', JSON.stringify(offers));
        try {
            fetch('/api/save-offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(offers)
            });
        } catch(e) {}
        const query = document.getElementById('admin-pay-offer-search')?.value || '';
        window.renderAdminPaymentOffers(query);
    };

    window.bulkUpdatePayOffersAll = function(value) {
        const offers = window.sessionOffers || (typeof offersData !== 'undefined' ? offersData : []);
        const targetSet = selectedPayOfferIds.size > 0 ? selectedPayOfferIds : null;

        offers.forEach(offer => {
            if (!targetSet || targetSet.has(offer.id)) {
                offer.paymentConfig = { transferEnabled: value, linkEnabled: value, creditEnabled: value };
            }
        });
        window.sessionOffers = offers;
        localStorage.setItem('sessionOffers', JSON.stringify(offers));
        try {
            fetch('/api/save-offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(offers)
            });
        } catch(e) {}
        const query = document.getElementById('admin-pay-offer-search')?.value || '';
        window.renderAdminPaymentOffers(query);
    };

    window.saveAdminPaymentConfig = async function() {
        const btn = document.getElementById('btn-save-payments-main');
        const mpActive = document.getElementById('admin-mp-active')?.checked || false;
        const mpMode = document.querySelector('input[name="admin-mp-mode"]:checked')?.value || 'sandbox';
        const mpPublicKey = document.getElementById('admin-mp-public-key')?.value.trim() || '';
        const mpAccessToken = document.getElementById('admin-mp-access-token')?.value.trim() || '';

        const transferActive = document.getElementById('admin-transfer-active')?.checked || false;
        const transferAlias = document.getElementById('admin-transfer-alias')?.value.trim() || '';
        const transferCbu = document.getElementById('admin-transfer-cbu')?.value.trim() || '';
        const transferBank = document.getElementById('admin-transfer-bank')?.value.trim() || '';
        const transferTitular = document.getElementById('admin-transfer-titular')?.value.trim() || '';
        const transferCuit = document.getElementById('admin-transfer-cuit')?.value.trim() || '';

        const newConfig = {
            transfer: {
                active: transferActive,
                alias: transferAlias,
                cbu: transferCbu,
                bank: transferBank,
                titular: transferTitular,
                cuit: transferCuit
            },
            mercadopago: {
                active: mpActive,
                mode: mpMode,
                publicKey: mpPublicKey,
                accessToken: mpAccessToken
            }
        };

        window.sessionPaymentConfig = newConfig;
        localStorage.setItem('sessionPaymentConfig', JSON.stringify(newConfig));

        try {
            // 1. Guardar Configuración de Pagos en disco (js/payment-config.js)
            await fetch('/api/save-payment-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });

            // 2. Guardar Productos en disco (js/products-data.js)
            if (window.sessionProducts) {
                await fetch('/api/save-products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(window.sessionProducts)
                });
            }

            // 3. Guardar Ofertas en disco (js/offers-data.js)
            if (window.sessionOffers) {
                await fetch('/api/save-offers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(window.sessionOffers)
                });
            }
        } catch (e) {
            console.error('Error guardando en el servidor:', e);
        }

        if (btn) {
            btn.style.background = '#059669';
            btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> ¡Todo Sincronizado en Servidor!';
            setTimeout(() => {
                btn.style.background = '';
                btn.innerHTML = '<span class="material-symbols-outlined">save</span> Guardar Cambios';
                window.renderAdminPayments();
            }, 1800);
        }
    };
})();
