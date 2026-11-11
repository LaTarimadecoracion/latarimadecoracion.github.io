// js/ui/checkout-modal.js
// --- CHECKOUT PAYMENT MODAL (LAZY-LOADED) ---

(function() {
    function showOfferPaymentModal(offerInput, packQty = 1, productContext = null) {
        window._checkoutSelectedQty = packQty;
        const existing = document.getElementById('offer-payment-modal-overlay');
        if (existing) existing.remove();

        const isProductItem = !!productContext || (offerInput && offerInput.acabados_groups);
        let freshItem = offerInput;

        if (isProductItem) {
            // Producto individual
            const prodId = offerInput?.id || productContext?.product?.id;
            let freshProds = window.sessionProducts;
            try {
                const stored = localStorage.getItem('sessionProductsAutonomo') || localStorage.getItem('sessionProducts');
                if (stored) {
                    const parsedStored = JSON.parse(stored);
                    if (Array.isArray(parsedStored) && parsedStored.length > 0) {
                        freshProds = parsedStored;
                        window.sessionProducts = parsedStored;
                    }
                }
            } catch(e) {}
            if (freshProds) {
                for (const cat of freshProds) {
                    const found = (cat.products || []).find(p => String(p.id) === String(prodId));
                    if (found) { freshItem = found; break; }
                }
            }
        } else {
            // Oferta / Combo
            let freshOffers = window.sessionOffers;
            try {
                const stored = localStorage.getItem('sessionOffersAutonomo') || localStorage.getItem('sessionOffers');
                if (stored) {
                    const parsedOffers = JSON.parse(stored);
                    if (Array.isArray(parsedOffers) && parsedOffers.length > 0) {
                        freshOffers = parsedOffers;
                        window.sessionOffers = parsedOffers;
                    }
                }
            } catch(e) {}
            freshItem = (freshOffers || []).find(o => String(o.id) === String(offerInput?.id)) || offerInput;
        }

        const offer = freshItem;
        const phone = '5491167007723';

        // Calcular precio base del item (oferta u opción de producto)
        let basePrice = 0;
        let itemDisplayName = offer.title || 'Producto';

        if (isProductItem) {
            const grupoName = productContext?.grupo?.acabado_name || '';
            const medidaName = productContext?.medida || '';
            const opcionName = productContext?.opcion || '';
            const variantPrice = productContext?.price !== undefined ? productContext.price : (parseFloat(offer.price) || 0);
            basePrice = variantPrice;
            const extraDetails = [];
            if (grupoName && grupoName !== 'Único') extraDetails.push(`Acabado: ${grupoName}`);
            if (medidaName) extraDetails.push(`Medida: ${medidaName}`);
            if (opcionName) extraDetails.push(`${productContext?.opcionLabel || 'Opción'}: ${opcionName}`);
            if (extraDetails.length > 0) {
                itemDisplayName = `${offer.title} (${extraDetails.join(' · ')})`;
            }
        } else {
            basePrice = offer.offerPrice || 0;
        }

        const totalOfferVal = (basePrice || 0) * packQty;
        const formatCurr = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(val);
        const formattedOfferPrice = formatCurr(totalOfferVal);
        
        let payConf = window.sessionPaymentConfig || {};
        try {
            const storedPayConf = localStorage.getItem('sessionPaymentConfig');
            if (storedPayConf) {
                payConf = JSON.parse(storedPayConf);
                window.sessionPaymentConfig = payConf;
            }
        } catch(e) {}

        // Helper para resolver el rubro de un producto/item
        const getItemRubro = (item) => {
            if (!item) return 'carpinteria';
            if (item.rubro) return String(item.rubro).toLowerCase().trim();
            const catId = item.category || item.categoryId || '';
            if (catId && window.sessionProducts) {
                const foundCat = window.sessionProducts.find(c => String(c.id).toLowerCase() === String(catId).toLowerCase() || String(c.name).toLowerCase() === String(catId).toLowerCase());
                if (foundCat && foundCat.rubro) return String(foundCat.rubro).toLowerCase().trim();
            }
            if (catId && window.categoriesData) {
                const foundCat = window.categoriesData.find(c => String(c.id).toLowerCase() === String(catId).toLowerCase() || String(c.name).toLowerCase() === String(catId).toLowerCase());
                if (foundCat && foundCat.rubro) return String(foundCat.rubro).toLowerCase().trim();
            }
            return 'carpinteria';
        };

        // Evaluar si es carrito mixto o reventa (pinturería / otros rubros)
        let isResaleOrMixed = false;
        let transferAccountDesc = 'Cuenta Oficial Taller de Carpintería';

        if (productContext?.cartShippingContext?.cartItems && productContext.cartShippingContext.cartItems.length > 0) {
            const items = productContext.cartShippingContext.cartItems;
            const hasNonCarpinteria = items.some(it => {
                const r = getItemRubro(it);
                return r && r !== 'carpinteria';
            });
            if (hasNonCarpinteria) {
                isResaleOrMixed = true;
                const hasCarpinteria = items.some(it => getItemRubro(it) === 'carpinteria');
                transferAccountDesc = hasCarpinteria
                    ? 'Cuenta Oficial Reventa / Pedido Mixto'
                    : 'Cuenta Oficial Pinturería / Reventa';
            }
        } else {
            const offerRubro = getItemRubro(offer);
            if (offerRubro && offerRubro !== 'carpinteria') {
                isResaleOrMixed = true;
                transferAccountDesc = 'Cuenta Oficial Pinturería / Reventa';
            }
        }

        const transferConf = (isResaleOrMixed && payConf.transferCecilia && payConf.transferCecilia.active !== false)
            ? payConf.transferCecilia
            : (payConf.transfer || {});
        
        const alias = transferConf.alias || (isResaleOrMixed ? 'latarima.deco' : 'VENUS.PULMON.METRO');
        const cbu = transferConf.cbu || (isResaleOrMixed ? '0000003100152918804776' : '0720048988000002273736');
        const bank = transferConf.bank || (isResaleOrMixed ? 'Mercado Pago' : 'Banco Santander');
        const titular = transferConf.titular || (isResaleOrMixed ? 'Cecilia Beatriz Cerón' : 'Yonatan Lucas Orellana');
        const cuit = transferConf.cuit || (isResaleOrMixed ? '27-28767339-1' : '20-35281538-2');

        const mpConf = payConf.mercadopago || {};
        const isMpGlobalActive = mpConf.active !== false;
        const mpLinkSurchargePct = parseFloat(mpConf.surchargePercent) || 0;
        const mpCreditSurchargePct = parseFloat(mpConf.creditSurchargePercent !== undefined ? mpConf.creditSurchargePercent : mpLinkSurchargePct) || 0;
        const mpMaxInstallments = parseInt(mpConf.maxInstallments, 10) || 12;
        window._checkoutSelectedPayMethod = 'transfer';

        // Determinar imagen del producto / combo para la orden
        let resolvedItemImage = '';
        if (productContext?.grupo?.cover_image) {
            resolvedItemImage = productContext.grupo.cover_image;
        } else if (productContext?.grupo?.images_list && productContext.grupo.images_list[0]) {
            resolvedItemImage = productContext.grupo.images_list[0];
        } else if (offer?.customCoverImage) {
            resolvedItemImage = offer.customCoverImage;
        } else if (offer?.image) {
            resolvedItemImage = Array.isArray(offer.image) ? offer.image[0] : offer.image;
        } else if (offer?.product_items && offer.product_items[0]?.image) {
            resolvedItemImage = offer.product_items[0].image;
        }

        const overlay = document.createElement('div');
        overlay.id = 'offer-payment-modal-overlay';
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 0; opacity: 0; transition: opacity 0.25s ease-out; box-sizing: border-box; width: 100vw; height: 100vh; height: 100dvh;';

        const card = document.createElement('div');
        card.style.cssText = 'position: relative; width: 100vw; height: 100vh; height: 100dvh; max-width: 100vw; max-height: 100vh; max-height: 100dvh; border-radius: 0; padding: 1rem 1.25rem; background: #ffffff; box-shadow: none; border: none; font-family: var(--font-main); box-sizing: border-box; display: flex; flex-direction: column; align-items: stretch; justify-content: space-between; transform: scale(0.98); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); margin: 0; overflow: hidden;';

        const publicUserCheckout = (window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function')
            ? window.AdminAuth.getPublicUser()
            : null;

        const googleAutofillBannerHTML = !publicUserCheckout ? `
            <div id="checkout-google-autofill-bar" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0.65rem 0.9rem; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; width: 100%; box-sizing: border-box;">
                <div style="font-size: 0.78rem; font-weight: 700; color: #334155; line-height: 1.35; flex: 1; min-width: 180px;">
                    ¿Ya tenés cuenta? Ingresá con Google en 1 clic para autocompletar tus datos
                </div>
                <button type="button" id="btn-checkout-google-autofill" style="background: #ffffff; border: 1.5px solid #cbd5e1; color: #0f172a; border-radius: 9px; padding: 0.45rem 0.85rem; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.2s;">
                    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"/><path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"/></svg>
                    <span>Usar Google</span>
                </button>
            </div>
        ` : '';
        
        card.innerHTML = `
            <!-- Botón X cerrado bien arriba a la derecha -->
            <button type="button" id="pay-modal-close-x" title="Cerrar" style="position: fixed; top: 0.85rem; right: 0.85rem; width: 30px; height: 30px; background: none; border: none; font-size: 26px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #94a3b8; z-index: 100000; padding: 0; transition: color 0.2s;" onmouseenter="this.style.color='#0f172a'" onmouseleave="this.style.color='#94a3b8'">&times;</button>

            <!-- Header Modal con Barra de Pasos -->
            <div style="width: 100%; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; padding-right: 2rem; flex-shrink: 0; box-sizing: border-box;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <span class="material-symbols-outlined" style="color: #0f172a; font-size: 22px; background: #f1f5f9; padding: 6px; border-radius: 10px; flex-shrink: 0;">shopping_bag</span>
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase;">LA TARIMA - CHECKOUT</div>
                            <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="checkout-step-title">1. Entrega y Contacto</h3>
                        </div>
                    </div>
                </div>

                <!-- Stepper Visual (3 Pasos) -->
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px; margin: 0 auto;">
                    <div id="step-indicator-1" style="flex: 1; height: 6px; background: #0f172a; border-radius: 4px; transition: background 0.3s;"></div>
                    <div id="step-indicator-2" style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 4px; transition: background 0.3s;"></div>
                    <div id="step-indicator-3" style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 4px; transition: background 0.3s;"></div>
                </div>
            </div>

            <!-- Contenido Principal Desplazable -->
            <div style="flex: 1; overflow-y: auto; padding: 1rem 0; box-sizing: border-box; width: 100%; max-width: 650px; margin: 0 auto;">
                
                <!-- ==================== PASO 1: ENTREGA Y CONTACTO ==================== -->
                <div id="checkout-step-1-content" style="display: flex; flex-direction: column; gap: 1rem;">
                    ${googleAutofillBannerHTML}
                    
                    <!-- 1. Datos de Contacto del Cliente -->
                    <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                            👤 1. Datos de Contacto para el Pedido:
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Nombre y Apellido *
                                </label>
                                <input type="text" id="pay-client-name" placeholder="Ej: María González" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Teléfono / WhatsApp *
                                </label>
                                <input type="tel" id="pay-client-phone" placeholder="Ej: 11 1234 5678" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                        </div>
                    </div>

                    <!-- 2. Forma de Entrega Preferida -->
                    <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                            🚚 2. Forma de Entrega Preferida:
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 10px;">
                                <input type="radio" name="pay-delivery-mode" id="pay-mode-pickup" value="pickup" style="accent-color: #0f172a; cursor: pointer;">
                                <span>🏬 Retiro por Taller / Local (Hurlingham)</span>
                            </label>

                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 10px;">
                                <input type="radio" name="pay-delivery-mode" id="pay-mode-shipping" value="shipping" checked style="accent-color: #0f172a; cursor: pointer;">
                                <span>🚚 Envío a Domicilio / Flete / Expreso</span>
                            </label>
                        </div>

                        <!-- Menú Desplegable de Datos de Envío -->
                        <div id="pay-shipping-expand-menu" style="display: none; flex-direction: column; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
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
                                    <input type="text" id="pay-ship-cp" placeholder="Ej: 1712" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                        Ciudad / Localidad:
                                    </label>
                                    <input type="text" id="pay-ship-ciudad" placeholder="Ej: Castelar / CABA" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                        Provincia:
                                    </label>
                                    <input type="text" id="pay-ship-provincia" placeholder="Ej: Buenos Aires" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>
                            </div>

                            <!-- Correo Electrónico (para notificaciones y seguimiento del envío) -->
                            <div style="margin-top: 2px;">
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Correo Electrónico (para seguimiento del envío):
                                </label>
                                <input type="email" id="pay-ship-email" placeholder="Ej: tunombre@gmail.com" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <!-- Resultado lookup CP + selector método de envío (Ocupa el 100% del ancho debajo de todos los campos a mano) -->
                            <div id="pay-ship-lookup-result" style="display:none; margin-top:10px; width:100%; box-sizing:border-box;"></div>
                        </div>
                    </div>

                    <!-- Tarjeta Separada: Otras plataformas de venta (Siempre Visible) -->
                    <div id="checkout-external-platforms-container" style="display:none; width: 100%; box-sizing: border-box;"></div>
                </div>

                <!-- ==================== PASO 2: PAGO Y FACTURACIÓN ==================== -->
                <div id="checkout-step-2-content" style="display: none; flex-direction: column; gap: 1rem;">
                    
                    <!-- 3. Monto Total a Abonar Unificado con Necesito Factura A -->
                    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 16px; padding: 1rem 1.1rem; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative;">
                            <div style="min-width: 0; flex: 1;">
                                <div style="font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">💰 3. Monto Total a Abonar</div>
                                <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${itemDisplayName} ${packQty > 1 ? `(x${packQty})` : ''}</div>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; position: relative;">
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <div id="pay-modal-display-price" style="font-size: 1.6rem; font-weight: 900; color: #059669; font-family: var(--font-main); letter-spacing: -0.5px;">
                                        ${formattedOfferPrice}
                                    </div>
                                    <button type="button" id="btn-pay-info-tooltip" title="Información sobre el precio" style="background: none; border: none; padding: 2px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #0284c7; border-radius: 50%;">
                                        <span class="material-symbols-outlined" style="font-size: 18px;">help_outline</span>
                                    </button>
                                </div>

                                <div id="pay-modal-tax-badge" style="display: none; font-size: 0.62rem; font-weight: 800; color: #1e40af; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 2px 6px; margin-top: 2px;">
                                    +21% IVA + IIBB PBA
                                </div>

                                <!-- Tooltip Popover Flotante -->
                                <div id="pay-info-tooltip-popover" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 6px; background: #0f172a; color: #ffffff; padding: 0.75rem 0.9rem; border-radius: 12px; font-size: 0.75rem; width: 250px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 100; line-height: 1.4; text-align: left;">
                                    <div style="font-weight: 800; margin-bottom: 4px; color: #38bdf8;">ℹ️ Precio Transferencia Directa</div>
                                    Monto de contado/transferencia directa consumidor final sin IVA adicional ni comisiones intermedias.
                                </div>
                            </div>
                        </div>

                        <!-- Desglose de Producto + Envío si aplica -->
                        <div id="pay-modal-breakdown-box" style="display: none; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 0.78rem; flex-direction: column; gap: 4px;">
                            <div style="display: flex; justify-content: space-between; color: #475569;">
                                <span>Subtotal Productos:</span>
                                <span style="font-weight: 700; color: #0f172a;" id="breakdown-prod-val">${formattedOfferPrice}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; color: #0284c7;" id="breakdown-ship-row">
                                <span id="breakdown-ship-label">🚚 Envío:</span>
                                <span style="font-weight: 700;" id="breakdown-ship-val"></span>
                            </div>
                            <div style="display: none; justify-content: space-between; color: #b45309;" id="breakdown-mp-surcharge-row">
                                <span id="breakdown-mp-surcharge-label">💳 Recargo Mercado Pago:</span>
                                <span style="font-weight: 700;" id="breakdown-mp-surcharge-val"></span>
                            </div>
                        </div>

                        <!-- Opciones de Facturación (Factura C / Factura A) -->
                        <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                            <div style="font-size: 0.74rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.4px;">
                                📄 ¿Precisás Factura para tu compra?
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <!-- Opción Factura C (Consumidor Final / Organismos / Monotributo) -->
                                <label style="display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #0f172a; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 8px 12px; transition: all 0.2s;" id="lbl-factura-c">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="chk-factura-c" style="width: 17px; height: 17px; accent-color: #0f172a; cursor: pointer;">
                                        <div>
                                            <span style="font-weight: 800;">Solicitar Factura C</span>
                                            <div style="font-size: 0.72rem; color: #64748b; font-weight: 500;">Mismo precio estándar (Organismos, empresas, final)</div>
                                        </div>
                                    </div>
                                    
                                </label>

                                <!-- Opción Factura A (Responsable Inscripto) -->
                                <label style="display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #0f172a; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 8px 12px; transition: all 0.2s;" id="lbl-factura-a">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" id="chk-factura-a" style="width: 17px; height: 17px; accent-color: #0f172a; cursor: pointer;">
                                        <div>
                                            <span style="font-weight: 800;">Solicitar Factura A</span>
                                            <div style="font-size: 0.72rem; color: #64748b; font-weight: 500;">Discrimina IVA (Responsable Inscripto)</div>
                                        </div>
                                    </div>
                                    <span style="font-size: 0.72rem; font-weight: 800; background: #eff6ff; color: #0284c7; padding: 2px 7px; border-radius: 6px; border: 1px solid #bfdbfe;">+IVA e IIBB</span>
                                </label>
                            </div>

                            <!-- Menú Desplegable de Datos Fiscales -->
                            <div id="factura-expand-menu" style="display: none; flex-direction: column; gap: 10px; margin-top: 4px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                                <!-- Banner informativo dinámico -->
                                <div id="factura-c-info-banner" style="display: none; font-size: 0.75rem; color: #047857; background: #ecfdf5; padding: 7px 10px; border-radius: 8px; border: 1px solid #a7f3d0; line-height: 1.35;">
                                    ✅ <strong>Factura C:</strong> Se emite a consumidor final o a nombre de la entidad/persona con los datos detallados abajo, sin ningún recargo sobre el total.
                                </div>
                                <div id="factura-a-info-banner" style="display: none; font-size: 0.75rem; color: #0369a1; background: #f0f9ff; padding: 7px 10px; border-radius: 8px; border: 1px solid #bae6fd; line-height: 1.35;">
                                    ⚠️ <strong>Factura A:</strong> Adiciona <strong>+21% de IVA</strong> + <strong>3.5% de Ingresos Brutos PBA</strong> discriminados en el comprobante.
                                </div>

                                <!-- Desglose impositivo solo para Factura A -->
                                <div id="factura-a-breakdown" style="display: none; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.75rem 0.9rem; flex-direction: column; gap: 6px; font-size: 0.78rem; color: #334155;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="color: #64748b; font-weight: 600;">Base Producto:</span>
                                        <span id="factura-base-val" style="font-weight: 700; color: #0f172a; font-family: monospace;"></span>
                                    </div>
                                    <div id="factura-ship-row" style="display: none; justify-content: space-between; align-items: center;">
                                        <span style="color: #0284c7; font-weight: 600;" id="factura-ship-label">Envío:</span>
                                        <span id="factura-ship-val" style="font-weight: 700; color: #0284c7; font-family: monospace;"></span>
                                    </div>
                                    <div id="factura-subtotal-row" style="display: none; justify-content: space-between; align-items: center; border-top: 1px dotted #cbd5e1; padding-top: 4px;">
                                        <span style="color: #0f172a; font-weight: 700;">Base Imponible Total:</span>
                                        <span id="factura-subtotal-val" style="font-weight: 800; color: #0f172a; font-family: monospace;"></span>
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

                                <!-- Formulario de Datos de Facturación (Orden oficial estilo ARCA) -->
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 4px;">
                                    <!-- 1. Persona / Empresa / Entidad -->
                                    <div style="grid-column: 1 / -1; width: 100%;">
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                            1. Persona / Empresa / Entidad:
                                        </label>
                                        <input type="text" id="factura-razon-social" placeholder="Ej: ARCA (Agencia de Recaudación y Control Aduanero) o Tu Nombre" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>

                                    <!-- 2. Domicilio -->
                                    <div style="grid-column: 1 / -1; width: 100%;">
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                            2. Domicilio:
                                        </label>
                                        <input type="text" id="factura-direccion-fiscal" placeholder="Ej: Hipólito Yrigoyen 370, 4.° piso" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>

                                    <!-- 3. Provincia / Localidad -->
                                    <div>
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                            3. Provincia / Jurisdicción:
                                        </label>
                                        <input type="text" id="factura-provincia" placeholder="Ej: Ciudad Autónoma de Buenos Aires" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>

                                    <!-- 4. CUIT / CUIL -->
                                    <div>
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                            4. CUIT / CUIL / DNI:
                                        </label>
                                        <input type="text" id="factura-cuit" placeholder="Ej: 33-69345023-9" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>

                                    <!-- 5. Condición frente al IVA (Select con opciones tributarias) -->
                                    <div style="grid-column: 1 / -1; width: 100%;">
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                            5. Condición frente al IVA:
                                        </label>
                                        <select id="factura-condicion-iva" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none; background: #ffffff; cursor: pointer;">
                                            <option value="Consumidor Final" selected>Consumidor Final (ARCA / Organismos / Personas)</option>
                                            <option value="Responsable Inscripto">IVA Responsable Inscripto (Empresas - Factura A)</option>
                                            <option value="Responsable Monotributo">Responsable Monotributo</option>
                                            <option value="IVA Exento">IVA Exento / No Gravado</option>
                                            <option value="Sujeto No Categorizado">Sujeto No Categorizado</option>
                                        </select>
                                    </div>

                                    <!-- 6. Correo Electrónico (para envío de la factura digital) -->
                                    <div style="grid-column: 1 / -1; width: 100%;">
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                            6. Correo Electrónico (para envío de factura):
                                        </label>
                                        <input type="email" id="factura-email" placeholder="Ej: compras@arca.gob.ar o tu-correo@gmail.com" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 4. Elección de Medio de Pago Preferido -->
                    <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                            💳 4. Elegí tu Medio de Pago Preferido:
                        </div>

                        <!-- 3 Botones ultra limpios (Icono + Título) -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;" id="pay-methods-grid-container">
                            <button type="button" class="pay-method-btn" data-pay-val="transfer" id="btn-pay-choice-transfer" style="background: #f8fafc; color: #334155; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0.75rem 0.4rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 24px; color: #16a34a;">account_balance</span>
                                <div style="font-size: 0.78rem; font-weight: 800; line-height: 1.2;">Transferencia</div>
                            </button>

                            <button type="button" class="pay-method-btn" data-pay-val="link" id="btn-pay-choice-link" style="background: #f8fafc; color: #334155; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0.75rem 0.4rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 24px; color: #009ee3;">handshake</span>
                                <div style="font-size: 0.78rem; font-weight: 800; line-height: 1.2;">Mercado Pago</div>
                            </button>

                            <button type="button" class="pay-method-btn" data-pay-val="credit" id="btn-pay-choice-credit" style="background: #f8fafc; color: #334155; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0.75rem 0.4rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 24px; color: #d97706;">credit_card</span>
                                <div style="font-size: 0.78rem; font-weight: 800; line-height: 1.2;">Tarjeta</div>
                            </button>
                        </div>

                        <!-- Panel 1: Transferencia Directa -->
                        <div id="pay-panel-transfer" style="display: none; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.78rem; color: #166534; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                                <div style="font-weight: 800; display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; color: #16a34a;">verified</span>
                                    <span>Pago por Transferencia Bancaria Directa (${transferAccountDesc})</span>
                                </div>
                                <span style="font-weight: 800; color: #15803d; background: #ffffff; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; border: 1px solid #86efac;">Sin Recargo (0% Costo Adicional)</span>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; width: 100%; box-sizing: border-box; margin-top: 4px;">
                                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; text-align: center; align-items: center; justify-content: space-between;">
                                    <div style="width: 100%;">
                                        <div style="font-size: 0.65rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">ALIAS (${isResaleOrMixed ? 'MERCADO PAGO' : 'SANTANDER'})</div>
                                        <div style="font-size: 1.1rem; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 2px; letter-spacing: 0.5px; word-break: break-all;">${alias}</div>
                                    </div>
                                    <button type="button" id="btn-copy-alias" style="background: #0f172a; color: #ffffff; border: none; border-radius: 8px; padding: 7px 14px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; max-width: 150px; box-sizing: border-box; box-shadow: 0 2px 6px rgba(15,23,42,0.12); margin: 0 auto;">
                                        <span class="material-symbols-outlined" id="copy-alias-icon" style="font-size: 15px;">content_copy</span>
                                        <span id="copy-alias-lbl">Copiar Alias</span>
                                    </button>
                                </div>

                                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; text-align: center; align-items: center; justify-content: space-between;">
                                    <div style="width: 100%;">
                                        <div style="font-size: 0.65rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">CBU / CVU</div>
                                        <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; font-family: monospace; margin-top: 2px; word-break: break-all; letter-spacing: 0.5px;">${cbu}</div>
                                    </div>
                                    <button type="button" id="btn-copy-cbu" style="background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 14px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; max-width: 150px; box-sizing: border-box; margin: 0 auto;">
                                        <span class="material-symbols-outlined" id="copy-cbu-icon" style="font-size: 15px;">content_copy</span>
                                        <span id="copy-cbu-lbl">Copiar CBU</span>
                                    </button>
                                </div>
                            </div>

                            <div style="background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box; font-size: 0.8rem; color: #334155; display: flex; flex-wrap: wrap; justify-content: space-around; gap: 8px; text-align: center;">
                                <div>Titular: <strong style="color: #0f172a;">${titular}</strong></div>
                                <div>CUIT/CUIL: <strong style="color: #0f172a;">${cuit}</strong></div>
                                <div>Banco: <strong style="color: #0f172a;">${bank}</strong></div>
                            </div>
                        </div>

                        <!-- Panel 2: Link de Pago / Débito / Dinero en Cuenta -->
                        <div id="pay-panel-link" style="display: none; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 12px; padding: 1rem; text-align: center; margin-top: 10px; width: 100% !important; box-sizing: border-box !important;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                                <div style="font-size: 0.9rem; font-weight: 800; color: #0369a1; display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined">handshake</span> Pago Online con Mercado Pago (Dinero en cuenta / Débito / Tarjetas)
                                </div>
                                ${isMpGlobalActive
                                    ? `<span style="font-size: 0.68rem; font-weight: 800; background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 2px 8px; border-radius: 6px;">✓ COBRO ONLINE ACTIVO</span>`
                                    : `<span style="font-size: 0.68rem; font-weight: 800; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 6px;">💬 LINK POR WHATSAPP</span>`
                                }
                            </div>

                            <div style="font-size: 0.76rem; color: #0369a1; background: #ffffff; border: 1px solid #e0f2fe; padding: 8px 12px; border-radius: 8px; font-weight: 700; text-align: left; line-height: 1.4;">
                                🔒 Abonás de forma rápida y 100% segura con tu cuenta de Mercado Pago, dinero disponible o débito.
                            </div>

                            ${isMpGlobalActive ? `
                            <button type="button" id="btn-pay-mp-online-link" style="background: #009ee3; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.25rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(0, 158, 227, 0.3); transition: all 0.2s; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">payments</span>
                                <span>Pagar ahora con Mercado Pago</span>
                            </button>
                            ` : ''}
                        </div>

                        <!-- Panel 3: Tarjeta de Crédito (Cuotas) -->
                        <div id="pay-panel-credit" style="display: none; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; background: #fffdf0; border: 1.5px solid #fde68a; border-radius: 12px; padding: 1rem; text-align: center; margin-top: 10px; width: 100% !important; box-sizing: border-box !important;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                                <div style="font-size: 0.9rem; font-weight: 800; color: #b45309; display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined">credit_card</span> Pago con Tarjeta Débito / Crédito (Vía Mercado Pago)
                                </div>
                                ${isMpGlobalActive
                                    ? `<span style="font-size: 0.68rem; font-weight: 800; background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 2px 8px; border-radius: 6px;">✓ COBRO ONLINE ACTIVO</span>`
                                    : `<span style="font-size: 0.68rem; font-weight: 800; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 6px;">💬 LINK POR WHATSAPP</span>`
                                }
                            </div>

                            <div style="font-size: 0.76rem; color: #b45309; background: #ffffff; border: 1px solid #fef3c7; padding: 8px 12px; border-radius: 8px; font-weight: 700; text-align: left; line-height: 1.4;">
                                💳 Podés pagar en hasta ${mpMaxInstallments} cuotas con cualquier tarjeta de crédito o débito en la pantalla segura.
                            </div>

                            ${isMpGlobalActive ? `
                            <button type="button" id="btn-pay-mp-online-credit" style="background: #009ee3; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.25rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(0, 158, 227, 0.3); transition: all 0.2s; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">credit_card</span>
                                <span>Pagar con Tarjeta (vía Mercado Pago)</span>
                            </button>
                            ` : ''}
                        </div>
                        <div id="mp-checkout-error-msg" style="display: none; margin-top: 8px; padding: 8px 12px; background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; font-size: 0.78rem; font-weight: 700;"></div>
                    </div>
                </div>

                <!-- ==================== PASO 3: ACLARACIONES Y ENVÍO ==================== -->
                <div id="checkout-step-3-content" style="display: none; flex-direction: column; gap: 1rem;">
                    
                    <!-- 5. Aclaraciones del Pedido (Opcional) -->
                    <div style="width: 100%; box-sizing: border-box;">
                        <label for="pay-modal-notes" style="display: block; font-size: 0.75rem; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px;">
                            ✏️ 5. Aclaraciones del pedido (Opcional):
                        </label>
                        <textarea id="pay-modal-notes" rows="4" placeholder="Ej: Transfirió mi pareja Juan Pérez, o aclaro horario de retiro..." style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.75rem 0.85rem; font-size: 0.85rem; color: #0f172a; font-family: inherit; resize: none; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='#cbd5e1'"></textarea>
                    </div>

                    <!-- 6. Aviso de Paso Final -->
                    <div id="checkout-step3-final-notice" style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.82rem; color: #166534; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span class="material-symbols-outlined" id="checkout-step3-notice-icon" style="font-size: 22px; color: #15803d; flex-shrink: 0;">add_a_photo</span>
                        <span id="checkout-step3-notice-text"><strong>Aviso de paso final:</strong> Al abrir WhatsApp, recordá adjuntar la foto o comprobante de pago.</span>
                    </div>

                    <!-- 7. Sellos de Confianza y Compra Segura -->
                    <div class="checkout-trust-badges" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 4px; padding: 0.75rem 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #334155; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #0284c7; flex-shrink: 0;">lock</span>
                            <span>Sitio Cifrado SSL</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #334155; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #16a34a; flex-shrink: 0;">verified_user</span>
                            <span>Garantía de Fábrica</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #334155; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #d97706; flex-shrink: 0;">carpenter</span>
                            <span>Taller Directo</span>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Footer con Botones de Navegación (Volver / Siguiente / Enviar WhatsApp) -->
            <div style="width: 100%; border-top: 1px solid #f1f5f9; padding-top: 0.75rem; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; gap: 10px; max-width: 650px; margin: 0 auto;">
                <button type="button" id="btn-checkout-prev" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0.8rem 1.2rem; font-weight: 800; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                    <span>Volver atrás</span>
                </button>

                <button type="button" id="btn-checkout-next" style="background: #0f172a; color: #ffffff; border: none; border-radius: 12px; padding: 0.8rem 1.5rem; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(15,23,42,0.18); transition: all 0.2s;">
                    <span>Siguiente</span>
                    <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span>
                </button>

                <button type="button" id="btn-submit-receipt-wa" style="display: none; background: #25d366; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.4rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(37,211,102,0.3); transition: all 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 20px;">chat</span>
                    <span>Confirmar Pedido por WhatsApp</span>
                </button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        function saveUserDataToStorage() {
            try {
                const cpVal = document.getElementById('pay-ship-cp')?.value || '';
                const data = {
                    name: document.getElementById('pay-client-name')?.value || '',
                    phone: document.getElementById('pay-client-phone')?.value || '',
                    deliveryMode: document.getElementById('pay-mode-shipping')?.checked ? 'shipping' : 'pickup',
                    dir: document.getElementById('pay-ship-dir')?.value || '',
                    cp: cpVal,
                    ciudad: document.getElementById('pay-ship-ciudad')?.value || '',
                    provincia: document.getElementById('pay-ship-provincia')?.value || '',
                    email: document.getElementById('pay-ship-email')?.value || '',
                    razonSocial: document.getElementById('factura-razon-social')?.value || '',
                    cuit: document.getElementById('factura-cuit')?.value || '',
                    dirFiscal: document.getElementById('factura-direccion-fiscal')?.value || '',
                    provFiscal: document.getElementById('factura-provincia')?.value || '',
                    condIva: document.getElementById('factura-condicion-iva')?.value || '',
                    emailFiscal: document.getElementById('factura-email')?.value || ''
                };
                localStorage.setItem('latarima_checkout_user_data', JSON.stringify(data));

                // Sincronizar también en la clave global userData si se ingresó un CP
                if (cpVal.trim()) {
                    const cleanCp = cpVal.trim();
                    if (window.UserDataManager && typeof window.UserDataManager.save === 'function') {
                        const currentZip = typeof window.UserDataManager.getZipCode === 'function' ? window.UserDataManager.getZipCode() : '';
                        if (currentZip !== cleanCp) {
                            window.UserDataManager.save({ zipCode: cleanCp });
                        }
                    } else {
                        let mainUserData = {};
                        try {
                            const rawMain = localStorage.getItem('userData');
                            if (rawMain) mainUserData = JSON.parse(rawMain);
                        } catch(err) {}
                        mainUserData.zipCode = cleanCp;
                        localStorage.setItem('userData', JSON.stringify(mainUserData));
                    }
                }
            } catch (e) {}
        }

        const closeModal = () => {
            window.removeEventListener('keydown', handleKeyDown);
            saveUserDataToStorage();
            window.dispatchEvent(new CustomEvent('latarima:cp-updated'));
            if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
            overlay.style.opacity = '0';
            card.style.transform = 'scale(0.92)';
            setTimeout(() => overlay.remove(), 250);
        };

        document.getElementById('pay-modal-close-x')?.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // LÓGICA DE CONTROL DE PASOS (WIZARD 1 -> 2 -> 3)
        let currentStep = 1;

        const titleElem = document.getElementById('checkout-step-title');
        const step1Content = document.getElementById('checkout-step-1-content');
        const step2Content = document.getElementById('checkout-step-2-content');
        const step3Content = document.getElementById('checkout-step-3-content');

        const stepInd1 = document.getElementById('step-indicator-1');
        const stepInd2 = document.getElementById('step-indicator-2');
        const stepInd3 = document.getElementById('step-indicator-3');

        const btnPrev = document.getElementById('btn-checkout-prev');
        const btnNext = document.getElementById('btn-checkout-next');
        const btnWa = document.getElementById('btn-submit-receipt-wa');

        const updateWizardView = () => {
            // Ocultar todos los contenidos de paso
            if (step1Content) step1Content.style.display = 'none';
            if (step2Content) step2Content.style.display = 'none';
            if (step3Content) step3Content.style.display = 'none';

            // Resetear indicadores
            if (stepInd1) stepInd1.style.background = '#e2e8f0';
            if (stepInd2) stepInd2.style.background = '#e2e8f0';
            if (stepInd3) stepInd3.style.background = '#e2e8f0';

            if (currentStep === 1) {
                if (titleElem) titleElem.textContent = '1. Entrega y Contacto';
                if (step1Content) step1Content.style.display = 'flex';
                if (stepInd1) stepInd1.style.background = '#0f172a';

                if (btnPrev) {
                    btnPrev.style.visibility = 'visible';
                    btnPrev.querySelector('span:not(.material-symbols-outlined)').textContent = 'Volver atrás';
                    btnPrev.querySelector('.material-symbols-outlined').textContent = 'arrow_back';
                }
                if (btnNext) btnNext.style.display = 'flex';
                if (btnWa) btnWa.style.display = 'none';
            } else if (currentStep === 2) {
                if (titleElem) titleElem.textContent = '2. Monto y Medio de Pago';
                if (step2Content) step2Content.style.display = 'flex';
                if (stepInd1) stepInd1.style.background = '#059669';
                if (stepInd2) stepInd2.style.background = '#0f172a';

                if (btnPrev) {
                    btnPrev.style.visibility = 'visible';
                    btnPrev.querySelector('span:not(.material-symbols-outlined)').textContent = 'Volver atrás';
                    btnPrev.querySelector('.material-symbols-outlined').textContent = 'arrow_back';
                }
                if (btnNext) btnNext.style.display = 'flex';
                if (btnWa) btnWa.style.display = 'none';
            } else if (currentStep === 3) {
                if (titleElem) titleElem.textContent = '3. Aclaraciones y Finalizar';
                if (step3Content) step3Content.style.display = 'flex';
                if (stepInd1) stepInd1.style.background = '#059669';
                if (stepInd2) stepInd2.style.background = '#059669';
                if (stepInd3) stepInd3.style.background = '#25d366';

                if (btnPrev) {
                    btnPrev.style.visibility = 'visible';
                    btnPrev.querySelector('span:not(.material-symbols-outlined)').textContent = 'Volver atrás';
                    btnPrev.querySelector('.material-symbols-outlined').textContent = 'arrow_back';
                }
                if (btnNext) btnNext.style.display = 'none';
                if (btnWa) btnWa.style.display = 'flex';
            }
        };

        function validateStep1() {
            let isValid = true;
            let firstInvalidInput = null;

            const fieldsToValidate = [
                { id: 'pay-client-name', name: 'Nombre y Apellido' },
                { id: 'pay-client-phone', name: 'Teléfono / WhatsApp' }
            ];

            const isShipping = document.getElementById('pay-mode-shipping')?.checked;
            if (isShipping) {
                fieldsToValidate.push({ id: 'pay-ship-dir', name: 'Dirección (Calle y Altura)' });
                fieldsToValidate.push({ id: 'pay-ship-cp', name: 'Código Postal' });
                fieldsToValidate.push({ id: 'pay-ship-ciudad', name: 'Ciudad / Localidad' });
                fieldsToValidate.push({ id: 'pay-ship-provincia', name: 'Provincia' });
            }

            fieldsToValidate.forEach(item => {
                const input = document.getElementById(item.id);
                if (!input) return;
                const val = input.value.trim();
                if (!val) {
                    isValid = false;
                    input.style.borderColor = '#ef4444';
                    input.style.background = '#fef2f2';
                    if (!firstInvalidInput) firstInvalidInput = input;

                    const clearError = () => {
                        input.style.borderColor = '#cbd5e1';
                        input.style.background = '#ffffff';
                        input.removeEventListener('input', clearError);
                    };
                    input.addEventListener('input', clearError);
                } else {
                    input.style.borderColor = '#cbd5e1';
                    input.style.background = '#ffffff';
                }
            });

            if (!isValid && firstInvalidInput) {
                firstInvalidInput.focus();
            }

            return isValid;
        }

        function validateStep2() {
            const isFactA = document.getElementById('chk-factura-a')?.checked;
            const isFactC = document.getElementById('chk-factura-c')?.checked;

            if (!isFactA && !isFactC) return true; // No pidió factura, continúa normalmente

            let isValid = true;
            let firstInvalid = null;

            const facturaFields = [
                { id: 'factura-razon-social', name: 'Persona / Empresa / Entidad' },
                { id: 'factura-direccion-fiscal', name: 'Domicilio' },
                { id: 'factura-provincia', name: 'Provincia / Jurisdicción' },
                { id: 'factura-cuit', name: 'CUIT / CUIL / DNI' },
                { id: 'factura-email', name: 'Correo Electrónico' }
            ];

            facturaFields.forEach(item => {
                const input = document.getElementById(item.id);
                if (!input) return;
                const val = input.value.trim();
                if (!val) {
                    isValid = false;
                    input.style.borderColor = '#ef4444';
                    input.style.background = '#fef2f2';
                    if (!firstInvalid) firstInvalid = input;

                    const clearError = () => {
                        input.style.borderColor = '#cbd5e1';
                        input.style.background = '#ffffff';
                        input.removeEventListener('input', clearError);
                    };
                    input.addEventListener('input', clearError);
                }
            });

            if (!isValid && firstInvalid) {
                firstInvalid.focus();
                // Feedback visual sutil
                const expandMenu = document.getElementById('factura-expand-menu');
                if (expandMenu) {
                    expandMenu.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }

            return isValid;
        }

        btnNext?.addEventListener('click', () => {
            if (currentStep === 1) {
                if (!validateStep1()) return;
            } else if (currentStep === 2) {
                if (!validateStep2()) return;
            }
            if (currentStep < 3) {
                currentStep++;
                updateWizardView();
            }
        });

        btnPrev?.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateWizardView();
            } else {
                closeModal();
            }
        });

        // Evento cambio de Medio de Pago Preferido (Botones 3 en 1 fila)
        const payButtons = card.querySelectorAll('.pay-method-btn');
        const panelTransfer = document.getElementById('pay-panel-transfer');
        const panelLink = document.getElementById('pay-panel-link');
        const panelCredit = document.getElementById('pay-panel-credit');

        const offerPayConf = offer.paymentConfig || {};
        const isTransferEnabled = offerPayConf.transferEnabled !== false;
        const isMpOrCardEnabled = (offerPayConf.linkEnabled !== false) || (offerPayConf.creditEnabled !== false);
        const isLinkEnabled = isMpOrCardEnabled;
        const isCreditEnabled = isMpOrCardEnabled;

        payButtons.forEach(btn => {
            const val = btn.getAttribute('data-pay-val');
            if (val === 'transfer' && !isTransferEnabled) btn.style.display = 'none';
            if (val === 'link' && !isLinkEnabled) btn.style.display = 'none';
            if (val === 'credit' && !isCreditEnabled) btn.style.display = 'none';

            btn.addEventListener('click', (e) => {
                e.preventDefault();

                payButtons.forEach(b => {
                    b.style.background = '#f8fafc';
                    b.style.color = '#334155';
                    b.style.borderColor = '#cbd5e1';
                    b.style.boxShadow = 'none';
                });

                btn.style.background = '#0f172a';
                btn.style.color = '#ffffff';
                btn.style.borderColor = '#0f172a';
                btn.style.boxShadow = '0 4px 10px rgba(15,23,42,0.15)';

                window._checkoutSelectedPayMethod = val;
                if (panelTransfer) panelTransfer.style.display = val === 'transfer' ? 'flex' : 'none';
                if (panelLink) panelLink.style.display = val === 'link' ? 'flex' : 'none';
                if (panelCredit) panelCredit.style.display = val === 'credit' ? 'flex' : 'none';

                const noticeIcon = document.getElementById('checkout-step3-notice-icon');
                const noticeText = document.getElementById('checkout-step3-notice-text');
                if (noticeText) {
                    if (val === 'transfer') {
                        if (noticeIcon) noticeIcon.textContent = 'add_a_photo';
                        noticeText.innerHTML = '<strong>Aviso de paso final:</strong> Al abrir WhatsApp, recordá adjuntar la foto o comprobante de pago.';
                    } else {
                        if (noticeIcon) noticeIcon.textContent = 'verified';
                        noticeText.innerHTML = '<strong>Aviso de paso final:</strong> Si ya abonaste por Mercado Pago, adjuntá el comprobante o indicá tu número de operación en WhatsApp.';
                    }
                }

                updateTotalDisplay();
            });
        });

        // Preseleccionar el primer medio de pago que esté habilitado
        const visiblePayBtns = Array.from(payButtons).filter(b => b.style.display !== 'none');
        if (visiblePayBtns.length > 0) {
            visiblePayBtns[0].click();
        }

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

        // Eventos de Facturación (Factura C vs Factura A)
        const chkFacturaC = document.getElementById('chk-factura-c');
        const chkFacturaA = document.getElementById('chk-factura-a');
        const expandMenu = document.getElementById('factura-expand-menu');
        const bannerFacturaC = document.getElementById('factura-c-info-banner');
        const bannerFacturaA = document.getElementById('factura-a-info-banner');
        const breakdownFacturaA = document.getElementById('factura-a-breakdown');
        const lblFacturaC = document.getElementById('lbl-factura-c');
        const lblFacturaA = document.getElementById('lbl-factura-a');
        const priceDisplay = document.getElementById('pay-modal-display-price');
        const taxBadge = document.getElementById('pay-modal-tax-badge');

        const syncFacturaUI = () => {
            const wantC = chkFacturaC && chkFacturaC.checked;
            const wantA = chkFacturaA && chkFacturaA.checked;

            if (lblFacturaC) {
                lblFacturaC.style.borderColor = wantC ? '#059669' : '#cbd5e1';
                lblFacturaC.style.background = wantC ? '#ecfdf5' : '#ffffff';
            }
            if (lblFacturaA) {
                lblFacturaA.style.borderColor = wantA ? '#0284c7' : '#cbd5e1';
                lblFacturaA.style.background = wantA ? '#f0f9ff' : '#ffffff';
            }

            if (wantA) {
                if (taxBadge) taxBadge.style.display = 'block';
                if (tooltipBtn) tooltipBtn.style.display = 'none';
                if (tooltipPopover) tooltipPopover.style.display = 'none';
                if (expandMenu) expandMenu.style.display = 'flex';
                if (bannerFacturaA) bannerFacturaA.style.display = 'block';
                if (bannerFacturaC) bannerFacturaC.style.display = 'none';
                if (breakdownFacturaA) breakdownFacturaA.style.display = 'flex';
            } else if (wantC) {
                if (taxBadge) taxBadge.style.display = 'none';
                if (tooltipBtn) tooltipBtn.style.display = 'inline-flex';
                if (expandMenu) expandMenu.style.display = 'flex';
                if (bannerFacturaC) bannerFacturaC.style.display = 'block';
                if (bannerFacturaA) bannerFacturaA.style.display = 'none';
                if (breakdownFacturaA) breakdownFacturaA.style.display = 'none';
            } else {
                if (taxBadge) taxBadge.style.display = 'none';
                if (tooltipBtn) tooltipBtn.style.display = 'inline-flex';
                if (expandMenu) expandMenu.style.display = 'none';
                if (bannerFacturaC) bannerFacturaC.style.display = 'none';
                if (bannerFacturaA) bannerFacturaA.style.display = 'none';
                if (breakdownFacturaA) breakdownFacturaA.style.display = 'none';
            }
            updateTotalDisplay();
        };

        chkFacturaC?.addEventListener('change', () => {
            if (chkFacturaC.checked && chkFacturaA) chkFacturaA.checked = false;
            syncFacturaUI();
        });

        chkFacturaA?.addEventListener('change', () => {
            if (chkFacturaA.checked && chkFacturaC) chkFacturaC.checked = false;
            syncFacturaUI();
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

        // LÓGICA: lookup de CP + mostrar tarifas de envío según shippingConfig de la oferta / producto
        window._checkoutSelectedShipCost = 0;
        window._checkoutSelectedShipLabel = '';
        let shipConf = (productContext && productContext.product && productContext.product.shippingConfig) || (offer && offer.shippingConfig);
        if (!shipConf || (!shipConf.logisticaEnabled && !shipConf.fleteEnabled && !shipConf.otroEnabled && !shipConf.isFreeShipping)) {
            shipConf = {
                logisticaEnabled: true,
                logisticaCost: 0,
                fleteEnabled: true,
                fleteCost: 0,
                otroEnabled: false,
                isFreeShipping: false
            };
        }

        // Tarjeta Independiente de Plataformas Externas (Siempre Visible en el Paso 1)
        const renderExternalPlatformsCard = () => {
            const container = document.getElementById('checkout-external-platforms-container');
            if (!container) return;

            const isValidExternalUrl = (u) => {
                if (!u || typeof u !== 'string') return false;
                const clean = u.trim().toLowerCase();
                return clean.startsWith('http://') || clean.startsWith('https://');
            };

            const prodObj = productContext?.product || offer;
            const isCustomConfigurator = prodObj && (prodObj.isCajonProduct === true || prodObj.id === '95' || prodObj.isCustomCutting === true || prodObj.id === '69');

            let externalLinks = [];

            if (isProductItem && !isCustomConfigurator) {
                const grupo = productContext?.grupo || (offer.acabados_groups && offer.acabados_groups[0]) || {};
                const medida = (productContext?.medida || '').trim();
                let relevantVariants = (grupo.medidas_variants || []).filter(m => m.hidden !== true && isValidExternalUrl(m.link));
                if (medida) {
                    const exact = relevantVariants.filter(m => (m.medida || '').trim() === medida);
                    if (exact.length > 0) relevantVariants = exact;
                }
                relevantVariants.forEach(v => {
                    if (isValidExternalUrl(v.link)) {
                        externalLinks.push({ link: v.link.trim(), label: v.linkLabel, legend: v.legend });
                    }
                });
            }

            if (externalLinks.length === 0 && !isCustomConfigurator) {
                const fallbackLink = (offer && (offer.link || offer.mercadolibre_link || offer.mlLink)) || (productContext?.product && (productContext.product.link || productContext.product.mercadolibre_link));
                if (isValidExternalUrl(fallbackLink)) {
                    externalLinks.push({ link: String(fallbackLink).trim() });
                }
            }

            if (externalLinks.length === 0) {
                container.style.display = 'none';
                container.innerHTML = '';
                return;
            }

            let out = `
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.9rem 1rem; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px;">
                    <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
                        <span>🌐 ¿Preferís comprar por otra plataforma con envío?</span>
                    </div>
            `;

            externalLinks.forEach(v => {
                const url = v.link.trim();
                const urlLower = url.toLowerCase();
                let platformName = "Mercado Libre";
                let platformIcon = "shopping_bag";
                let platformBg = "#fff059";
                let platformColor = "#2d3277";
                let platformBorder = "#e5d836";
                let desc = "Compralo con Mercado Envíos a todo el país y cuotas";

                if (urlLower.includes('tiendanube.com') || urlLower.includes('mitiendanube.com')) {
                    platformName = "Tienda Nube";
                    platformIcon = "storefront";
                    platformBg = "#2c3b87";
                    platformColor = "#ffffff";
                    platformBorder = "#1e2968";
                    desc = "Compralo directamente desde nuestra Tienda Nube oficial";
                } else if (!urlLower.includes('mercadolibre.com') && !urlLower.includes('mercadolibre.com.ar') && !urlLower.includes('ml.com') && !urlLower.includes('mpago.')) {
                    platformName = v.label || "Plataforma Externa";
                    platformIcon = "open_in_new";
                    platformBg = "#f1f5f9";
                    platformColor = "#0f172a";
                    platformBorder = "#cbd5e1";
                    desc = v.legend || "Compralo a través de este enlace externo";
                }

                out += `
                    <a href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: ${platformBg}; color: ${platformColor}; border: 1.5px solid ${platformBorder}; border-radius: 12px; padding: 10px 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.01)'" onmouseout="this.style.transform='scale(1)'">
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                            <span class="material-symbols-outlined" style="font-size: 22px; flex-shrink: 0;">${platformIcon}</span>
                            <div style="min-width: 0;">
                                <div style="font-size: 0.82rem; font-weight: 800; line-height: 1.2;">Comprar por ${platformName}</div>
                                <div style="font-size: 0.68rem; opacity: 0.85; margin-top: 2px; line-height: 1.2;">${desc}</div>
                            </div>
                        </div>
                        <span class="material-symbols-outlined" style="font-size: 20px; flex-shrink: 0;">arrow_forward</span>
                    </a>
                `;
            });

            out += `</div>`;
            container.innerHTML = out;
            container.style.display = 'block';
        };

        // Renderizar inmediatamente la tarjeta independiente de plataformas externas al abrir el modal
        renderExternalPlatformsCard();

        function renderShipOptions(cpRes) {
            const container = document.getElementById('pay-ship-lookup-result');
            if (!container) return;

            if (!cpRes) {
                // Punto 49: Mensaje amigable CP
                container.style.display = 'block';
                container.innerHTML = `
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:8px 12px;font-size:0.78rem;color:#1e40af;display:flex;align-items:center;gap:8px;">
                        <span class="material-symbols-outlined" style="font-size:20px;color:#2563eb;flex-shrink:0;">local_shipping</span>
                        <span>Ingresá tu <strong>Código Postal o Ciudad</strong> para calcular el costo de envío directo.</span>
                    </div>
                `;
                return;
            }

            const options = [];
            const cartShipCtx = productContext?.cartShippingContext;
            const isLocalLogisticaCoverage = !!(cpRes.logistica && cpRes.logistica.active !== false && cpRes.logistica.zoneKey !== 'resto_provincias' && cpRes.hasLocalMatch !== false);
            const isLocalFleteCoverage = !!(cpRes.flete && cpRes.flete.active !== false && cpRes.flete.zoneKey !== 'flete_fuera_rango' && cpRes.hasLocalMatch !== false);
            const hasAnyLocalCoverage = isLocalLogisticaCoverage || isLocalFleteCoverage;

            if (cartShipCtx && cartShipCtx.isCartSummary) {
                // Sincronizar opciones con el cálculo exacto del Carrito (Multi-producto, bultos y deshabilitaciones)
                if (cartShipCtx.logisticaAvailable && cpRes.logistica && cpRes.logistica.active !== false) {
                    const isFreeByQty = !!(isLocalLogisticaCoverage && cartShipCtx.isFlexFreeByQty);
                    const packages = cartShipCtx.totalLogisticaPackages || 1;
                    const sysCost = cpRes.logistica.cost || 0;
                    const cost = isFreeByQty ? 0 : (isLocalLogisticaCoverage ? (cartShipCtx.totalFlexCost !== null && cartShipCtx.totalFlexCost !== undefined ? cartShipCtx.totalFlexCost : (sysCost * packages)) : 0);
                    let zoneName = cpRes.logistica.zoneName || 'Zona';
                    let detailText = zoneName;
                    if (isFreeByQty) {
                        detailText += ` · 🎉 ¡Envío GRATIS por volumen de productos!`;
                    } else if (!isLocalLogisticaCoverage) {
                        detailText += ` · Despacho por Expreso / Transporte a convenir`;
                    } else if (packages > 1) {
                        detailText += ` · ${packages} bultos combinados del carrito`;
                    } else {
                        detailText += ` · 1 bulto estándar del carrito`;
                    }

                    options.push({
                        key: 'logistica',
                        label: isFreeByQty ? '📦 Logística Flex / Express (¡Envío GRATIS!)' : (isLocalLogisticaCoverage ? '📦 Logística Flex / Express' : '🚚 Transporte / Expreso al Interior'),
                        cleanLabel: isLocalLogisticaCoverage ? 'Logística Flex / Express' : 'Transporte / Expreso al Interior',
                        detail: detailText,
                        cost,
                        packages,
                        isFreeByQty,
                        active: true
                    });
                }

                if (cartShipCtx.fleteAvailable && isLocalFleteCoverage) {
                    const isFreeByQty = !!(isLocalFleteCoverage && cartShipCtx.isFleteFreeByQty);
                    const packages = cartShipCtx.totalFletePackages || 1;
                    const sysCost = cpRes.flete.cost || 0;
                    const cost = isFreeByQty ? 0 : (cartShipCtx.totalFleteCost !== null && cartShipCtx.totalFleteCost !== undefined ? cartShipCtx.totalFleteCost : (sysCost * packages));
                    let zoneName = cpRes.flete.zoneName || 'Zona';
                    let detailText = zoneName;
                    if (isFreeByQty) {
                        detailText += ` · 🎉 ¡Flete GRATIS por volumen de productos!`;
                    } else if (packages > 1) {
                        detailText += ` · ${packages} fletes (${packages} bultos/fletes necesarios)`;
                    } else {
                        detailText += ` · Transporte directo (1 flete)`;
                    }

                    options.push({
                        key: 'flete',
                        label: isFreeByQty ? '🚛 Flete Propio (¡Flete GRATIS!)' : '🚛 Flete Propio',
                        cleanLabel: 'Flete Propio',
                        detail: detailText,
                        cost,
                        packages,
                        isFreeByQty,
                        active: true
                    });
                }
            } else {
                // Solo incluir Logística si está activa para el CP y la variante activa no tiene deshabilitada la logística Flex
                let isVariantLogisticaDisabled = false;
                if (isProductItem) {
                    const activeGrupo = productContext?.grupo || (offer?.acabados_groups && offer.acabados_groups[0]) || {};
                    const activeMedidaStr = (productContext?.medida || '').trim();
                    const variantMatch = (activeGrupo.medidas_variants || []).find(m => (m.medida || '').trim() === activeMedidaStr) || (activeGrupo.medidas_variants || [])[0];
                    if (variantMatch) {
                        if (variantMatch.logisticaEnabled === false || variantMatch.noFlex === true || variantMatch.disableFlex === true) {
                            isVariantLogisticaDisabled = true;
                        }
                    }
                }

                if (!isVariantLogisticaDisabled && shipConf.logisticaEnabled && cpRes.logistica && cpRes.logistica.active !== false) {
                    const manualCost = parseFloat(shipConf.logisticaCost) || 0;
                    const sysCost = cpRes.logistica.cost || 0;
                    const baseCost = isLocalLogisticaCoverage ? (manualCost > 0 ? manualCost : sysCost) : 0;

                    const qty = window._checkoutSelectedQty || productContext?.quantity || packQty || 1;
                    const freeMin = parseInt(shipConf.logisticaFreeMinUnits) || 0;
                    const maxUnits = parseInt(shipConf.logisticaMaxUnits) || 0;

                    // El envío gratis de Logística Flex solo aplica dentro de CABA y GBA (cobertura local con tarifa > 0)
                    let isFreeByQty = isLocalLogisticaCoverage && baseCost > 0 && (freeMin > 0 && qty >= freeMin);
                    let packages = maxUnits > 0 ? Math.ceil(qty / maxUnits) : 1;
                    let cost = isFreeByQty ? 0 : (baseCost * packages);

                    let zoneName = cpRes.logistica.zoneName || 'Zona';
                    let detailText = zoneName;
                    if (isFreeByQty) {
                        detailText += ` · 🎉 ¡Envío GRATIS por compra de ${freeMin}+ uds!`;
                    } else if (!isLocalLogisticaCoverage) {
                        detailText += ` · Despacho por Expreso / Vía Cargo / Correo a coordinar`;
                    } else if (packages > 1 && baseCost > 0) {
                        detailText += ` · ${packages} bultos ($${baseCost.toLocaleString('es-AR')} c/u - Máx. ${maxUnits} ud/paquete)`;
                    }

                    options.push({
                        key: 'logistica',
                        label: isFreeByQty ? '📦 Logística Flex (¡Envío GRATIS por volumen!)' : (isLocalLogisticaCoverage ? '📦 Logística (Courier Flex)' : '🚚 Transporte / Expreso al Interior'),
                        cleanLabel: isLocalLogisticaCoverage ? 'Logística' : 'Transporte / Expreso al Interior',
                        detail: detailText,
                        cost,
                        packages,
                        isFreeByQty,
                        active: true
                    });
                }

                // Solo incluir Flete Particular si está dentro de cobertura de Flete (CABA / GBA)
                if (shipConf.fleteEnabled && isLocalFleteCoverage) {
                    const manualCost = parseFloat(shipConf.fleteCost) || 0;
                    const sysCost = cpRes.flete.cost || 0;
                    const baseCost = manualCost > 0 ? manualCost : sysCost;

                    const qty = window._checkoutSelectedQty || productContext?.quantity || packQty || 1;
                    const freeMin = parseInt(shipConf.fleteFreeMinUnits) || 0;
                    const maxUnits = parseInt(shipConf.fleteMaxUnits) || 0;

                    let isFreeByQty = isLocalFleteCoverage && baseCost > 0 && (freeMin > 0 && qty >= freeMin);
                    let packages = maxUnits > 0 ? Math.ceil(qty / maxUnits) : 1;
                    let cost = isFreeByQty ? 0 : (baseCost * packages);

                    let zoneName = cpRes.flete.zoneName || 'Zona';
                    let detailText = zoneName;
                    if (isFreeByQty) {
                        detailText += ` · 🎉 ¡Flete GRATIS por compra de ${freeMin}+ uds!`;
                    } else if (packages > 1 && baseCost > 0) {
                        detailText += ` · ${packages} fletes ($${baseCost.toLocaleString('es-AR')} c/u - Máx. ${maxUnits} ud/flete)`;
                    }

                    options.push({
                        key: 'flete',
                        label: isFreeByQty ? '🚛 Flete Particular (¡Flete GRATIS por volumen!)' : '🚛 Flete Particular',
                        cleanLabel: 'Flete Particular',
                        detail: detailText,
                        cost,
                        packages,
                        isFreeByQty,
                        active: true
                    });
                }
            }

            if (shipConf.otroEnabled) {
                const cost = parseFloat(shipConf.otroCost) || 0;
                const label = shipConf.otroLabel || 'A convenir';
                options.push({ key: 'otro', label: '🚚 ' + label, cleanLabel: label, detail: 'Acordar con vendedor', cost, active: true });
            }

            // Cabecera con ciudad detectada
            const locationHeaderHtml = '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:8px 12px;margin-bottom:8px;">'
                + '<div style="font-size:0.68rem;font-weight:800;color:#0369a1;text-transform:uppercase;margin-bottom:3px;">📍 Ubicación detectada</div>'
                + '<div style="font-size:0.85rem;font-weight:800;color:#0f172a;">' + cpRes.localidad + ', ' + cpRes.provincia + ' (CP ' + cpRes.cp + ')</div>'
                + '</div>';

            // Si cumple con la regla de Envío Gratis DENTRO de la zona de cobertura de Logística Flex o Flete Particular (CABA / GBA)
            const freeOpt = options.find(o => o.isFreeByQty);
            const isOrderFreeShipping = hasAnyLocalCoverage && !!(shipConf.isFreeShipping || shipConf.isFree || freeOpt);

            if (isOrderFreeShipping) {
                const freeSubtitle = freeOpt
                    ? `${freeOpt.detail} · ¡Sin cargo adicional a tu domicilio!`
                    : '¡Tu pedido califica para envío a domicilio 100% bonificado!';
                const freeCleanLabel = freeOpt ? `${freeOpt.cleanLabel} (¡ENVÍO GRATIS!)` : '¡ENVÍO GRATIS!';

                container.innerHTML = locationHeaderHtml + `
                    <div style="background:linear-gradient(135deg, #16a34a 0%, #15803d 100%);border:2px solid #22c55e;border-radius:12px;padding:14px 16px;color:#ffffff;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 6px 18px rgba(22,163,74,0.28);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="background:rgba(255,255,255,0.22);width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">
                                🚚
                            </div>
                            <div>
                                <div style="font-size:1.08rem;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;line-height:1.15;">
                                    🎉 ¡ENVÍO GRATIS!!!
                                </div>
                                <div style="font-size:0.76rem;font-weight:700;color:#dcfce7;margin-top:4px;line-height:1.3;">
                                    ${freeSubtitle}
                                </div>
                            </div>
                        </div>
                        <div style="background:#ffffff;color:#15803d;font-size:0.82rem;font-weight:900;padding:6px 11px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.12);">
                            $ 0 · GRATIS
                        </div>
                    </div>
                `;
                container.style.display = 'block';
                window._checkoutSelectedShipCost = 0;
                window._checkoutSelectedShipLabel = freeCleanLabel;
                updateShipLine();
                updateTotalDisplay();
                return;
            }

            // Si no hay opciones directas activas
            if (options.length === 0) {
                container.style.display = 'block';
                container.innerHTML = locationHeaderHtml + '<div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:8px;padding:8px 12px;font-size:0.75rem;color:#c0510a;font-weight:700;">💬 Te cotizamos el envío particular o por expreso directamente por WhatsApp al enviar tu consulta.</div>';
                window._checkoutSelectedShipCost = 0;
                window._checkoutSelectedShipLabel = 'A convenir';
                updateShipLine();
                updateTotalDisplay();
                return;
            }

            let html = locationHeaderHtml;

            // Opciones de envío como radio buttons
            html += '<div style="font-size:0.68rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:5px;">Elegí el método de envío:</div>';
            html += '<div style="display:flex;flex-direction:column;gap:6px;" id="ship-options-list">';

            // Determinar la opción a preseleccionar según la preferencia elegida en el carrito (flex vs flete)
            const preferredKey = (cartShipCtx && cartShipCtx.selectedShipVal === 'flete') ? 'flete' : ((cartShipCtx && cartShipCtx.selectedShipVal === 'flex') ? 'logistica' : (options[0]?.key || ''));
            let defaultOptIdx = options.findIndex(o => o.key === preferredKey);
            if (defaultOptIdx === -1) defaultOptIdx = 0;

            options.forEach((opt, idx) => {
                const costLabel = opt.isFreeByQty ? '¡GRATIS!' : (opt.cost > 0 ? formatCurr(opt.cost) : 'Cotizar por WA');
                const isChecked = idx === defaultOptIdx;
                html += `<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:${isChecked ? '#f0f9ff' : '#f8fafc'};border:1.5px solid ${isChecked ? '#0284c7' : '#e2e8f0'};border-radius:10px;padding:8px 12px;cursor:pointer;" data-cost="${opt.cost}" data-label="${opt.cleanLabel}">
                    <span style="display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:700;color:#0f172a;">
                        <input type="radio" name="ship-method-choice" value="${opt.key}" ${isChecked ? 'checked' : ''} style="accent-color:#0f172a;cursor:pointer;">
                        <span>${opt.label}<br><span style="font-size:0.68rem;font-weight:600;color:#64748b;">${opt.detail}</span></span>
                    </span>
                    <span style="font-size:0.88rem;font-weight:900;color:${opt.isFreeByQty ? '#16a34a' : (opt.cost > 0 ? '#0284c7' : '#64748b')};white-space:nowrap;">${costLabel}</span>
                </label>`;
            });

            html += '</div>';

            container.innerHTML = html;
            container.style.display = 'block';

            // Preseleccionar opción activa
            if (options.length > 0 && options[defaultOptIdx]?.active) {
                window._checkoutSelectedShipCost = options[defaultOptIdx].cost;
                window._checkoutSelectedShipLabel = options[defaultOptIdx].cleanLabel;
                updateShipLine();
                updateTotalDisplay();
            }

            // Evento cambio de radio
            container.querySelectorAll('input[name="ship-method-choice"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    const lbl = radio.closest('label');
                    window._checkoutSelectedShipCost = parseFloat(lbl.dataset.cost) || 0;
                    window._checkoutSelectedShipLabel = lbl.dataset.label || '';
                    // Highlight selected
                    container.querySelectorAll('label').forEach(l => { l.style.borderColor = '#e2e8f0'; l.style.background = '#f8fafc'; });
                    lbl.style.borderColor = '#0284c7';
                    lbl.style.background = '#f0f9ff';
                    updateShipLine();
                    updateTotalDisplay();
                });
                // Highlight initial
                if (radio.checked) {
                    const lbl = radio.closest('label');
                    lbl.style.borderColor = '#0284c7';
                    lbl.style.background = '#f0f9ff';
                }
            });
        }

        function updateShipLine() {
            // Desglose de envío gestionado limpiamente en pay-modal-breakdown-box
        }

        function getCurrentFinalTotalInfo() {
            const isShipping = document.getElementById('pay-mode-shipping')?.checked;
            const isFacturaA = document.getElementById('chk-factura-a')?.checked;
            const shipCost = isShipping ? (window._checkoutSelectedShipCost || 0) : 0;
            const shipLabel = window._checkoutSelectedShipLabel || '';
            const activePayVal = window._checkoutSelectedPayMethod || 'transfer';

            let mpSurchargePct = 0;
            if (activePayVal === 'link') mpSurchargePct = mpLinkSurchargePct;
            else if (activePayVal === 'credit') mpSurchargePct = mpCreditSurchargePct;

            const baseWithShip = totalOfferVal + shipCost;
            const mpSurchargeVal = mpSurchargePct > 0 ? Math.round(baseWithShip * (mpSurchargePct / 100)) : 0;
            const subtotalWithMp = baseWithShip + mpSurchargeVal;

            const ivaVal = subtotalWithMp * 0.21;
            const iibbVal = subtotalWithMp * 0.035;
            const totalFactA = subtotalWithMp * 1.245;

            const finalTotal = Math.round(isFacturaA ? totalFactA : subtotalWithMp);
            return {
                isShipping,
                isFacturaA,
                shipCost,
                shipLabel,
                activePayVal,
                mpSurchargePct,
                mpSurchargeVal,
                baseWithShip,
                subtotalWithMp,
                ivaVal,
                iibbVal,
                totalFactA,
                finalTotal
            };
        }

        function updateTotalDisplay() {
            const info = getCurrentFinalTotalInfo();
            const { isShipping, isFacturaA, shipCost, shipLabel, mpSurchargePct, mpSurchargeVal, subtotalWithMp, ivaVal, iibbVal, totalFactA, finalTotal } = info;

            const priceDisplay = document.getElementById('pay-modal-display-price');
            if (priceDisplay) priceDisplay.textContent = formatCurr(finalTotal);

            // Actualizar desglose en tarjeta 3 (Monto Total a Abonar)
            const breakdownBox = document.getElementById('pay-modal-breakdown-box');
            const shipRow = document.getElementById('breakdown-ship-row');
            const shipLbl = document.getElementById('breakdown-ship-label');
            const shipVal = document.getElementById('breakdown-ship-val');
            const mpRow = document.getElementById('breakdown-mp-surcharge-row');
            const mpLbl = document.getElementById('breakdown-mp-surcharge-label');
            const mpVal = document.getElementById('breakdown-mp-surcharge-val');

            const hasShipBreakdown = !!(isShipping && (shipCost > 0 || shipLabel));
            const hasMpBreakdown = mpSurchargeVal > 0;

            if (breakdownBox) {
                if (hasShipBreakdown || hasMpBreakdown) {
                    breakdownBox.style.display = 'flex';
                    if (shipRow) {
                        if (hasShipBreakdown) {
                            shipRow.style.display = 'flex';
                            const isFreeShip = shipCost === 0 && shipLabel.toLowerCase().includes('gratis');
                            if (shipLbl) shipLbl.textContent = '🚚 Envío (' + shipLabel + '):';
                            if (shipVal) {
                                shipVal.textContent = shipCost > 0 ? formatCurr(shipCost) : (isFreeShip ? '¡ENVÍO GRATIS! ($ 0)' : 'A cotizar');
                                shipVal.style.color = isFreeShip ? '#15803d' : '';
                                shipVal.style.fontWeight = isFreeShip ? '900' : '';
                            }
                        } else {
                            shipRow.style.display = 'none';
                        }
                    }
                    if (mpRow) {
                        if (hasMpBreakdown) {
                            mpRow.style.display = 'flex';
                            if (mpLbl) mpLbl.textContent = `💳 Recargo Mercado Pago (+${mpSurchargePct}%):`;
                            if (mpVal) mpVal.textContent = '+' + formatCurr(mpSurchargeVal);
                        } else {
                            mpRow.style.display = 'none';
                        }
                    }
                } else {
                    breakdownBox.style.display = 'none';
                }
            }

            // Actualizar desglose Factura A
            const breakdownFactA = document.getElementById('factura-a-breakdown');
            if (isFacturaA && breakdownFactA) {
                const factBase = document.getElementById('factura-base-val');
                const factShipRow = document.getElementById('factura-ship-row');
                const factShipLbl = document.getElementById('factura-ship-label');
                const factShipVal = document.getElementById('factura-ship-val');
                const factSubRow = document.getElementById('factura-subtotal-row');
                const factSubVal = document.getElementById('factura-subtotal-val');

                if (factBase) factBase.textContent = formatCurr(totalOfferVal + mpSurchargeVal);

                if (isShipping && shipCost > 0) {
                    if (factShipRow) factShipRow.style.display = 'flex';
                    if (factShipLbl) factShipLbl.textContent = 'Envío (' + shipLabel + '):';
                    if (factShipVal) factShipVal.textContent = formatCurr(shipCost);

                    if (factSubRow) factSubRow.style.display = 'flex';
                    if (factSubVal) factSubVal.textContent = formatCurr(subtotalWithMp);
                } else {
                    if (factShipRow) factShipRow.style.display = 'none';
                    if (factSubRow) factSubRow.style.display = 'none';
                }

                const ivaElem = document.getElementById('factura-iva-val');
                const iibbElem = document.getElementById('factura-iibb-val');
                const totElem = document.getElementById('factura-total-val');

                if (ivaElem) ivaElem.textContent = formatCurr(ivaVal);
                if (iibbElem) iibbElem.textContent = formatCurr(iibbVal);
                if (totElem) totElem.textContent = formatCurr(totalFactA);
            }
        }

        // Listener en campo CP y Ciudad con autocompletado y debounce
        const cpInput = document.getElementById('pay-ship-cp');
        const ciudadInput = document.getElementById('pay-ship-ciudad');
        const provInput = document.getElementById('pay-ship-provincia');

        let cpLookupTimer = null;
        const executePostalLookup = (sourceInput) => {
            clearTimeout(cpLookupTimer);
            cpLookupTimer = setTimeout(() => {
                const query = (sourceInput ? sourceInput.value : (cpInput?.value || ciudadInput?.value || '')).trim();
                if (!query || query.length < 3) {
                    const c = document.getElementById('pay-ship-lookup-result');
                    if (c) c.style.display = 'none';
                    return;
                }
                const res = window.lookupPostalCode ? window.lookupPostalCode(query) : null;
                if (res) {
                    // Si el cliente tipeó en Ciudad y no tenía CP, autocompletarle el CP exacto
                    if (cpInput && !cpInput.value && res.cp) {
                        cpInput.value = res.cp;
                    }
                    if (ciudadInput && res.localidad && (sourceInput === cpInput || !ciudadInput.value)) ciudadInput.value = res.localidad;
                    if (provInput && res.provincia && (sourceInput === cpInput || !provInput.value)) provInput.value = res.provincia;
                    
                    // Sincronizar en localStorage de la app para que todas las vistas se actualicen automáticamente
                    try {
                        const payload = { zipCode: res.cp || query };
                        if (res.localidad) payload.locality = res.localidad;
                        if (res.provincia) payload.province = res.provincia;
                        if (window.UserDataManager && typeof window.UserDataManager.save === 'function') {
                            window.UserDataManager.save(payload);
                        } else {
                            let userData = {};
                            const saved = localStorage.getItem('userData');
                            if (saved) userData = JSON.parse(saved);
                            Object.assign(userData, payload);
                            localStorage.setItem('userData', JSON.stringify(userData));
                            window.dispatchEvent(new CustomEvent('latarima:cp-updated', { detail: { zipCode: res.cp || query } }));
                        }
                    } catch(e) {}
                    saveUserDataToStorage();
                }
                renderShipOptions(res);
            }, 450);
        };

        cpInput?.addEventListener('input', () => executePostalLookup(cpInput));
        ciudadInput?.addEventListener('input', () => {
            // Si el campo de CP está vacío, permitir que la ciudad dispare el cálculo de envío
            if (cpInput && !cpInput.value.trim()) {
                executePostalLookup(ciudadInput);
            }
        });

        // Limpiar estado de envío cuando se vuelve a Retiro
        radioPickup?.addEventListener('change', () => {
            window._checkoutSelectedShipCost = 0;
            window._checkoutSelectedShipLabel = '';
            updateShipLine();
            updateTotalDisplay();
        });
        radioShipping?.addEventListener('change', () => {
            const query = cpInput?.value.trim();
            const res = (query && query.length >= 3 && window.lookupPostalCode) ? window.lookupPostalCode(query) : null;
            renderShipOptions(res);
            updateShipLine();
            updateTotalDisplay();
        });

        function restoreUserDataFromStorage() {
            try {
                const raw = localStorage.getItem('latarima_checkout_user_data');
                const data = raw ? JSON.parse(raw) : {};
                const uData = (window.UserDataManager && typeof window.UserDataManager.get === 'function')
                    ? window.UserDataManager.get()
                    : {};
                const merged = {
                    name: data.name || uData.name || '',
                    phone: data.phone || uData.phone || '',
                    dir: data.dir || uData.address || '',
                    cp: data.cp || uData.zipCode || '',
                    ciudad: data.ciudad || uData.locality || '',
                    provincia: data.provincia || uData.province || '',
                    email: data.email || uData.email || '',
                    razonSocial: data.razonSocial || uData.razonSocial || '',
                    cuit: data.cuit || uData.cuit || '',
                    dirFiscal: data.dirFiscal || uData.dirFiscal || '',
                    deliveryMode: data.deliveryMode || ''
                };

                if (merged.name && document.getElementById('pay-client-name')) document.getElementById('pay-client-name').value = merged.name;
                if (merged.phone && document.getElementById('pay-client-phone')) document.getElementById('pay-client-phone').value = merged.phone;
                if (merged.dir && document.getElementById('pay-ship-dir')) document.getElementById('pay-ship-dir').value = merged.dir;
                if (merged.cp && document.getElementById('pay-ship-cp')) document.getElementById('pay-ship-cp').value = merged.cp;
                if (merged.ciudad && document.getElementById('pay-ship-ciudad')) document.getElementById('pay-ship-ciudad').value = merged.ciudad;
                if (merged.provincia && document.getElementById('pay-ship-provincia')) document.getElementById('pay-ship-provincia').value = merged.provincia;
                if (merged.email && document.getElementById('pay-ship-email')) document.getElementById('pay-ship-email').value = merged.email;
                try {
                    const loggedUser = window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function' ? window.AdminAuth.getPublicUser() : null;
                    if (loggedUser) {
                        const nameEl = document.getElementById('pay-client-name');
                        const mailEl = document.getElementById('pay-ship-email');
                        if (nameEl && !nameEl.value && loggedUser.nombre) nameEl.value = loggedUser.nombre;
                        if (mailEl && !mailEl.value && loggedUser.email) mailEl.value = loggedUser.email;
                    }
                } catch(e) {}
                if (merged.razonSocial && document.getElementById('factura-razon-social')) document.getElementById('factura-razon-social').value = merged.razonSocial;
                if (merged.cuit && document.getElementById('factura-cuit')) document.getElementById('factura-cuit').value = merged.cuit;
                if (merged.dirFiscal && document.getElementById('factura-direccion-fiscal')) document.getElementById('factura-direccion-fiscal').value = merged.dirFiscal;

                if (merged.deliveryMode === 'pickup') {
                    const rPickup = document.getElementById('pay-mode-pickup');
                    if (rPickup) rPickup.checked = true;
                    const shipMenu = document.getElementById('pay-shipping-expand-menu');
                    if (shipMenu) shipMenu.style.display = 'none';
                    window._checkoutSelectedShipCost = 0;
                    window._checkoutSelectedShipLabel = '';
                    updateShipLine();
                    updateTotalDisplay();
                } else if (merged.deliveryMode === 'shipping' || (merged.cp && merged.cp.length >= 3)) {
                    const rShip = document.getElementById('pay-mode-shipping');
                    if (rShip) rShip.checked = true;
                    const shipMenu = document.getElementById('pay-shipping-expand-menu');
                    if (shipMenu) shipMenu.style.display = 'flex';
                    if (merged.cp && merged.cp.length >= 3) {
                        const res = window.lookupPostalCode ? window.lookupPostalCode(merged.cp) : null;
                        renderShipOptions(res);
                        updateShipLine();
                        updateTotalDisplay();
                    }
                }
            } catch (e) {}
        }

        const fieldsToAutoSave = [
            'pay-client-name', 'pay-client-phone', 'pay-ship-dir',
            'pay-ship-cp', 'pay-ship-ciudad', 'pay-ship-provincia', 'pay-ship-email',
            'factura-razon-social', 'factura-cuit', 'factura-direccion-fiscal'
        ];
        fieldsToAutoSave.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', saveUserDataToStorage);
                el.addEventListener('change', saveUserDataToStorage);
            }
        });
        document.getElementById('pay-mode-pickup')?.addEventListener('change', saveUserDataToStorage);
        document.getElementById('pay-mode-shipping')?.addEventListener('change', saveUserDataToStorage);

        restoreUserDataFromStorage();

        // Barra opcional de autocompletado en 1 clic con Google (solo si no está logueado)
        const checkoutGoogleBtn = document.getElementById('btn-checkout-google-autofill');
        const checkoutGoogleBar = document.getElementById('checkout-google-autofill-bar');
        if (checkoutGoogleBtn && checkoutGoogleBar) {
            const defaultGoogleBtnHTML = checkoutGoogleBtn.innerHTML;
            checkoutGoogleBtn.addEventListener('click', async () => {
                if (!window.AdminAuth || typeof window.AdminAuth.loginPublicStoreWithGoogle !== 'function') {
                    return;
                }
                checkoutGoogleBtn.disabled = true;
                checkoutGoogleBtn.style.opacity = '0.7';
                checkoutGoogleBtn.style.cursor = 'wait';
                checkoutGoogleBtn.textContent = 'Conectando...';

                try {
                    const user = await window.AdminAuth.loginPublicStoreWithGoogle();
                    if (!user) return;
                    if (window.AdminAuth && typeof window.AdminAuth.syncClientProfileFromCloud === 'function') {
                        await window.AdminAuth.syncClientProfileFromCloud();
                    }

                    const uData = (window.UserDataManager && typeof window.UserDataManager.get === 'function')
                        ? window.UserDataManager.get()
                        : {};

                    const setVal = (id, val) => {
                        const el = document.getElementById(id);
                        if (el && val) el.value = val;
                    };

                    setVal('pay-client-name', uData.name || user.nombre || '');
                    setVal('pay-client-phone', uData.phone || '');
                    setVal('pay-ship-dir', uData.address || '');
                    setVal('pay-ship-cp', uData.zipCode || '');
                    setVal('pay-ship-ciudad', uData.locality || '');
                    setVal('pay-ship-provincia', uData.province || '');
                    setVal('pay-ship-email', uData.email || user.email || '');
                    setVal('factura-razon-social', uData.razonSocial || '');
                    setVal('factura-cuit', uData.cuit || '');
                    setVal('factura-direccion-fiscal', uData.dirFiscal || '');

                    const cleanCp = (document.getElementById('pay-ship-cp')?.value || '').trim();
                    const isShippingSelected = document.getElementById('pay-mode-shipping')?.checked;
                    if (isShippingSelected) {
                        const shipMenu = document.getElementById('pay-shipping-expand-menu');
                        if (shipMenu) shipMenu.style.display = 'flex';
                        if (cleanCp.length >= 3) {
                            const res = window.lookupPostalCode ? window.lookupPostalCode(cleanCp) : null;
                            if (res) {
                                if (ciudadInput && res.localidad && !ciudadInput.value) ciudadInput.value = res.localidad;
                                if (provInput && res.provincia && !provInput.value) provInput.value = res.provincia;
                            }
                            renderShipOptions(res);
                            updateShipLine();
                            updateTotalDisplay();
                        }
                    }

                    saveUserDataToStorage();
                    if (typeof window.renderPerfilCarritoView === 'function') {
                        window.renderPerfilCarritoView();
                    }

                    checkoutGoogleBar.style.background = '#f0fdf4';
                    checkoutGoogleBar.style.borderColor = '#86efac';
                    checkoutGoogleBar.style.color = '#15803d';
                    checkoutGoogleBar.innerHTML = `<div style="font-size: 0.8rem; font-weight: 800; color: #15803d;">✅ Datos cargados desde tu cuenta Google</div>`;
                } catch (err) {
                    checkoutGoogleBtn.disabled = false;
                    checkoutGoogleBtn.style.opacity = '1';
                    checkoutGoogleBtn.style.cursor = 'pointer';
                    checkoutGoogleBtn.innerHTML = defaultGoogleBtnHTML;
                }
            });
        }

        updateWizardView();

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

        // Evento Pago Online Automático con Mercado Pago (Checkout Pro)
        const triggerMercadoPagoCheckout = async (btnEl, payModeType) => {
            if (!validateStep2()) return;
            const errBox = document.getElementById('mp-checkout-error-msg');
            if (errBox) errBox.style.display = 'none';

            const info = getCurrentFinalTotalInfo();
            const finalAmount = info.finalTotal;
            const clientName = document.getElementById('pay-client-name')?.value.trim() || 'Cliente La Tarima';
            const clientPhone = document.getElementById('pay-client-phone')?.value.trim() || '';
            const loggedMpEmail = window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function' ? (window.AdminAuth.getPublicUser()?.email || '') : '';
            const clientEmail = document.getElementById('pay-ship-email')?.value.trim() || document.getElementById('factura-email')?.value.trim() || loggedMpEmail || 'comprador@latarima.com.ar';

            const originalHtml = btnEl.innerHTML;
            btnEl.disabled = true;
            btnEl.style.opacity = '0.8';
            btnEl.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px; animation: spin 1s linear infinite;">sync</span><span>Generando link seguro de Mercado Pago...</span>';

            // Código corto canónico Base36 si es producto de catálogo
            let productShortCode = '';
            try {
                if (window.TarimaShortener && typeof window.TarimaShortener.encodeShortCode === 'function' && offer?.id) {
                    const gName = productContext?.grupo?.acabado_name || '';
                    const mName = productContext?.medida || '';
                    const oName = productContext?.opcion || '';
                    productShortCode = window.TarimaShortener.encodeShortCode(offer.id, gName, mName, oName, true) || '';
                }
            } catch(e) {}

            const payload = {
                itemId: String(offer?.id || 'pedido-latarima'),
                shortCode: productShortCode,
                productId: String(offer?.id || ''),
                image: resolvedItemImage || '',
                selectedFinish: productContext?.grupo?.acabado_name || '',
                selectedMeasure: productContext?.medida || '',
                title: `${itemDisplayName}${packQty > 1 ? ` (x${packQty})` : ''}`,
                description: info.isShipping && info.shipLabel ? `Incluye envío: ${info.shipLabel}` : 'Retiro en taller / Envío a coordinar',
                amount: finalAmount,
                maxInstallments: mpMaxInstallments,
                payerName: clientName,
                payerPhone: clientPhone,
                payerEmail: clientEmail,
                mode: mpConf.mode || 'production',
                originUrl: (/^https:\/\//i.test(window.location.origin) && !/localhost|127\.0\.0\.1|192\.168\./i.test(window.location.origin)) ? (window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '')) : 'https://latarimadecoracion.github.io',
                externalReference: 'LT-' + Date.now()
            };

            try {
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
                const endpoint = (!isLocalhost && mpConf.workerUrl) ? mpConf.workerUrl : '/api/mercadopago/preference';

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (!res.ok || !data.success || !data.init_point) {
                    throw new Error(data.message || 'No se pudo generar el link de Mercado Pago.');
                }

                if (typeof window.saveMyLocalOrder === 'function') {
                    window.saveMyLocalOrder({
                        id: payload.externalReference,
                        title: payload.title,
                        amount: payload.amount,
                        image: payload.image,
                        selectedFinish: payload.selectedFinish,
                        selectedMeasure: payload.selectedMeasure,
                        clientName: payload.payerName,
                        clientEmail: payload.payerEmail,
                        shippingMethod: info.isShipping ? 'envio' : 'retira',
                        shippingLabel: info.shipLabel || '',
                        paymentMethod: 'mercadopago',
                        status: 'pendiente',
                        createdAt: Date.now()
                    });
                }
                // Abrir Checkout Pro de Mercado Pago en nueva pestaña y avanzar al Paso 3 para que pueda avisar por WhatsApp
                window.open(data.init_point, '_blank', 'noopener,noreferrer');
                btnEl.disabled = false;
                btnEl.style.opacity = '1';
                btnEl.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">open_in_new</span><span>Checkout de Mercado Pago abierto (Reabrir)</span>';

                currentStep = 3;
                updateWizardView();
            } catch (err) {
                btnEl.disabled = false;
                btnEl.style.opacity = '1';
                btnEl.innerHTML = originalHtml;
                if (errBox) {
                    errBox.textContent = '⚠️ ' + (err.message || 'Falta configurar las credenciales de Mercado Pago en el Panel de Administración.');
                    errBox.style.display = 'block';
                }
            }
        };

        document.getElementById('btn-pay-mp-online-link')?.addEventListener('click', function() {
            triggerMercadoPagoCheckout(this, 'link');
        });
        document.getElementById('btn-pay-mp-online-credit')?.addEventListener('click', function() {
            triggerMercadoPagoCheckout(this, 'credit');
        });

        // Evento Enviar Comprobante por WhatsApp (Texto Plano Limpio sin Asteriscos)
        const waSubmitBtn = document.getElementById('btn-submit-receipt-wa');
        if (waSubmitBtn) {
            waSubmitBtn.onclick = (e) => {
                e.preventDefault();
                const isFacturaA = chkFacturaA?.checked || false;
                const isShipping = radioShipping?.checked || false;
                const userNotes = document.getElementById('pay-modal-notes')?.value.trim() || '';
                
                const info = getCurrentFinalTotalInfo();
                const finalPriceVal = info.finalTotal;
                const finalPriceFormatted = formatCurr(finalPriceVal);
                const payMethodLabel = info.activePayVal === 'link'
                    ? 'Mercado Pago (Link / Débito / Dinero en cuenta)'
                    : (info.activePayVal === 'credit' ? 'Mercado Pago (Tarjeta de Crédito)' : `Transferencia Bancaria (${bank})`);

                const clientName = document.getElementById('pay-client-name')?.value.trim();
                const clientPhone = document.getElementById('pay-client-phone')?.value.trim();
                const loggedWaEmail = window.AdminAuth && typeof window.AdminAuth.getPublicUser === 'function' ? (window.AdminAuth.getPublicUser()?.email || '') : '';
                const clientEmail = document.getElementById('pay-ship-email')?.value.trim() || document.getElementById('factura-email')?.value.trim() || loggedWaEmail || '';

                const trackingOrderId = 'LT-' + Date.now().toString().slice(-6);

                // Código corto canónico Base36 si es producto de catálogo
                let productShortCode = '';
                try {
                    if (window.TarimaShortener && typeof window.TarimaShortener.encodeShortCode === 'function' && offer?.id) {
                        const gName = productContext?.grupo?.acabado_name || '';
                        const mName = productContext?.medida || '';
                        const oName = productContext?.opcion || '';
                        productShortCode = window.TarimaShortener.encodeShortCode(offer.id, gName, mName, oName, true) || '';
                    }
                } catch(e) {}

                // Generar URL pública de seguimiento del pedido
                let trackingPageUrl = '';
                try {
                    const origin = (/^https:\/\//i.test(window.location.origin) && !/localhost|127\.0\.0\.1|192\.168\./i.test(window.location.origin))
                        ? (window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, ''))
                        : 'https://latarimadecoracion.github.io';
                    trackingPageUrl = `${origin}/pedidos/index.html?id=${encodeURIComponent(trackingOrderId)}`;
                } catch(e) {}

                let msgLines = [];
                msgLines.push(`Hola La Tarima. Adjunto el comprobante de pago de mi pedido #${trackingOrderId}.`);
                msgLines.push('');
                msgLines.push('Detalle de compra:');
                if (productContext && productContext.medida && productContext.medida.includes('\n')) {
                    msgLines.push('- Productos del Carrito:');
                    const cartParts = productContext.medida.split('\n');
                    cartParts.forEach(part => {
                        if (part.startsWith('   ')) {
                            msgLines.push(part);
                        } else if (part.trim()) {
                            msgLines.push(`  • ${part.trim()}`);
                        }
                    });
                } else if (isProductItem) {
                    const grupoName = productContext?.grupo?.acabado_name || '';
                    const medidaName = productContext?.medida || '';
                    const opcionName = productContext?.opcion || '';
                    
                    msgLines.push(`  • ${packQty > 1 ? `${packQty}x ` : '1x '}${offer.title}${grupoName && grupoName !== 'Único' ? ` - ${grupoName}` : ''}`);
                    let singleDetails = [];
                    if (medidaName) singleDetails.push(medidaName);
                    if (opcionName) singleDetails.push(opcionName);
                    if (singleDetails.length > 0) {
                        msgLines.push(`   ${singleDetails.join(' - ')}`);
                    }

                    // Enlace directo con foto / ficha del producto en WhatsApp
                    try {
                        let itemProdUrl = '';
                        if (window.TarimaShortener && typeof window.TarimaShortener.encodeShortCode === 'function') {
                            const shortCode = window.TarimaShortener.encodeShortCode(offer.id, grupoName, medidaName, opcionName, true);
                            if (shortCode) {
                                const origin = window.location.origin;
                                const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
                                itemProdUrl = `${origin}${path}/p/${shortCode}.html`;
                            }
                        }
                        if (!itemProdUrl && window.location.origin) {
                            itemProdUrl = window.location.href;
                        }
                        if (itemProdUrl) {
                            msgLines.push(`   Foto / Ficha: ${itemProdUrl}`);
                        }
                    } catch(e) {}
                } else {
                    msgLines.push(`  • Combo: ${itemDisplayName} ${packQty > 1 ? `(Pack x${packQty})` : ''}`);
                }
                msgLines.push(`- Medio de pago: ${payMethodLabel}`);
                msgLines.push(`- Monto total: ${finalPriceFormatted}`);
                const isFacturaC = document.getElementById('chk-factura-c')?.checked || false;
                if (isFacturaA) {
                    msgLines.push('- Comprobante solicitado: Factura A (Responsable Inscripto)');
                } else if (isFacturaC) {
                    msgLines.push('- Comprobante solicitado: Factura C');
                }

                if (isFacturaA || isFacturaC) {
                    const razon = document.getElementById('factura-razon-social')?.value.trim() || 'No especificado';
                    const dirFiscal = document.getElementById('factura-direccion-fiscal')?.value.trim() || 'No especificado';
                    const provFiscal = document.getElementById('factura-provincia')?.value.trim() || 'No especificada';
                    const cuitEmp = document.getElementById('factura-cuit')?.value.trim() || 'No especificado';
                    const condIva = document.getElementById('factura-condicion-iva')?.value || 'Consumidor Final';
                    
                    msgLines.push('');
                    const emailFiscal = document.getElementById('factura-email')?.value.trim() || 'No especificado';

                    msgLines.push(`Datos de facturación (${isFacturaA ? 'Factura A' : 'Factura C'}):`);
                    msgLines.push(`- Entidad / Razón Social: ${razon}`);
                    msgLines.push(`- Domicilio: ${dirFiscal}`);
                    msgLines.push(`- Provincia: ${provFiscal}`);
                    msgLines.push(`- CUIT: ${cuitEmp}`);
                    msgLines.push(`- Condición frente al IVA: ${condIva}`);
                    msgLines.push(`- Correo Facturación: ${emailFiscal}`);
                }

                msgLines.push('');
                msgLines.push('Datos de entrega:');
                if (isShipping) {
                    const dir = document.getElementById('pay-ship-dir')?.value.trim() || 'No especificada';
                    const cp = document.getElementById('pay-ship-cp')?.value.trim() || 'No especificado';
                    const ciudad = document.getElementById('pay-ship-ciudad')?.value.trim() || 'No especificada';
                    const prov = document.getElementById('pay-ship-provincia')?.value.trim() || 'No especificada';
                    const email = document.getElementById('pay-ship-email')?.value.trim() || '';
                    
                    const isFreeShipSelected = (window._checkoutSelectedShipCost === 0) && (window._checkoutSelectedShipLabel || '').toLowerCase().includes('gratis');
                    const shipCostStr = window._checkoutSelectedShipCost > 0
                        ? formatCurr(window._checkoutSelectedShipCost)
                        : (isFreeShipSelected ? '¡ENVÍO GRATIS! ($ 0)' : 'A cotizar');
                    msgLines.push('- Método: Envío a domicilio / flete');
                    msgLines.push(`- Envío: ${window._checkoutSelectedShipLabel || 'A confirmar'} — ${shipCostStr}`);
                    msgLines.push(`- Dirección: ${dir}`);
                    msgLines.push(`- CP: ${cp}`);
                    msgLines.push(`- Localidad: ${ciudad}`);
                    msgLines.push(`- Provincia: ${prov}`);
                    if (email) msgLines.push(`- Correo: ${email}`);
                } else {
                    msgLines.push('- Método: Retiro por taller / local (Hurlingham)');
                }

                if (clientName || clientPhone) {
                    msgLines.push('');
                    msgLines.push('Datos de contacto:');
                    if (clientName) msgLines.push(`- Nombre: ${clientName}`);
                    if (clientPhone) msgLines.push(`- Teléfono: ${clientPhone}`);
                }

                if (userNotes) {
                    msgLines.push('');
                    msgLines.push('Aclaraciones:');
                    msgLines.push(`- ${userNotes}`);
                }

                if (trackingPageUrl) {
                    msgLines.push('');
                    msgLines.push('Link de seguimiento de mi pedido:');
                    msgLines.push(trackingPageUrl);
                }

                const waText = msgLines.join('\n');
                const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;

                // 1. Abrir DIRECTO y sincrónico WhatsApp en el mismo click del usuario (cero bloqueo de popups)
                try {
                    window.open(waUrl, '_blank');
                } catch(e) {
                    window.location.href = waUrl;
                }

                // 2. Enviar pedido al Cloudflare KV en paralelo
                const workerBaseUrl = (mpConf && mpConf.workerUrl) ? mpConf.workerUrl : 'https://super-shadow-4ad9.latarimadecoracion.workers.dev';
                const transPayload = {
                    title: `${itemDisplayName}${packQty > 1 ? ` (x${packQty})` : ''}`,
                    amount: finalPriceVal,
                    shortCode: productShortCode,
                    productId: String(offer?.id || ''),
                    image: resolvedItemImage || '',
                    selectedFinish: productContext?.grupo?.acabado_name || '',
                    selectedMeasure: productContext?.medida || '',
                    payerName: clientName || 'Cliente La Tarima',
                    payerPhone: clientPhone || '',
                    payerEmail: clientEmail,
                    shippingAddress: isShipping ? (document.getElementById('pay-ship-dir')?.value.trim() || '') : '',
                    shippingMethod: isShipping ? 'envio' : 'retira',
                    shippingCost: window._checkoutSelectedShipCost || 0,
                    shippingLabel: window._checkoutSelectedShipLabel || '',
                    transferAccount: transferAccountDesc || '',
                    userNotes: userNotes,
                    externalReference: trackingOrderId
                };

                if (typeof window.saveMyLocalOrder === 'function') {
                    window.saveMyLocalOrder({
                        ...transPayload,
                        id: trackingOrderId,
                        clientEmail: clientEmail,
                        paymentMethod: 'transferencia',
                        status: 'pendiente_de_confirmacion',
                        createdAt: Date.now()
                    });
                }
                fetch(`${workerBaseUrl}/pedidos/transferencia`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transPayload),
                    keepalive: true
                }).catch(netErr => {
                    console.warn('Error registrando pedido en la nube:', netErr);
                });

                // 3. Mostrar pantalla de confirmación interactiva en la web
                const modalContent = document.querySelector('#offer-payment-modal .modal-content') || document.querySelector('#offer-payment-modal > div');
                if (modalContent) {
                    modalContent.innerHTML = `
                        <div style="padding: 2.25rem 1.5rem; text-align: center; font-family: inherit;">
                            <div style="width: 72px; height: 72px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem; box-shadow: 0 4px 16px rgba(22, 163, 74, 0.25);">
                                <span class="material-symbols-outlined" style="font-size: 42px;">check_circle</span>
                            </div>
                            <h2 style="font-size: 1.45rem; font-weight: 800; color: #0f172a; margin: 0 0 0.4rem 0;">¡Pedido Registrado con Éxito!</h2>
                            <p style="font-size: 0.92rem; color: #64748b; margin: 0 0 1rem 0;">Tu código de seguimiento oficial es:</p>
                            
                            <div style="background: #f8fafc; border: 2px dashed #A0715B; border-radius: 14px; padding: 1.25rem 1rem; margin-bottom: 1.35rem; display: inline-block; width: 100%; box-sizing: border-box;">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
                                    <div style="font-size: 1.65rem; font-weight: 900; letter-spacing: 1.5px; color: #A0715B; font-family: monospace;">#${trackingOrderId}</div>
                                    <button type="button" id="btn-copy-order-code" style="background: #0f172a; color: #ffffff; border: none; border-radius: 8px; padding: 6px 12px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 6px rgba(15,23,42,0.15); transition: all 0.2s;" title="Copiar código al portapapeles">
                                        <span class="material-symbols-outlined" id="copy-order-icon" style="font-size: 15px;">content_copy</span>
                                        <span id="copy-order-lbl">Copiar código</span>
                                    </button>
                                </div>

                                <div style="font-size: 0.82rem; color: #475569; margin-top: 12px; line-height: 1.45; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 9px 12px; text-align: left; display: flex; align-items: flex-start; gap: 8px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; color: #0284c7; flex-shrink: 0; margin-top: 1px;">info</span>
                                    <span><strong>Guardá este código:</strong> Con él podés buscar y consultar el estado y fabricación de tu pedido en cualquier momento desde nuestra web en la sección de seguimiento.</span>
                                </div>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px; margin: 0 auto;">
                                <a href="${trackingPageUrl}" target="_blank" style="background: #A0715B; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 0.9rem 1.25rem; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(160, 113, 91, 0.3);">
                                    <span class="material-symbols-outlined" style="font-size: 22px;">visibility</span>
                                    <span>Ver Seguimiento en Vivo</span>
                                </a>
                                <a href="${waUrl}" target="_blank" style="background: #f0fdf4; color: #16a34a; border: 1.5px solid #86efac; text-decoration: none; border-radius: 12px; padding: 0.75rem 1.25rem; font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">chat</span>
                                    <span>WhatsApp ya abierto (Tocar aquí si necesitás reabrir)</span>
                                </a>
                                <button type="button" onclick="closeModal();" style="background: none; border: none; color: #64748b; font-size: 0.88rem; font-weight: 600; cursor: pointer; padding: 0.5rem; margin-top: 4px;">
                                    Cerrar y seguir navegando
                                </button>
                            </div>
                        </div>
                    `;

                    // Evento para copiar código al portapapeles con micro-interacción verde
                    const copyBtn = document.getElementById('btn-copy-order-code');
                    if (copyBtn) {
                        copyBtn.onclick = () => {
                            const textToCopy = trackingOrderId;
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(textToCopy);
                            } else {
                                const tempInput = document.createElement('input');
                                tempInput.value = textToCopy;
                                document.body.appendChild(tempInput);
                                tempInput.select();
                                try { document.execCommand('copy'); } catch(e) {}
                                document.body.removeChild(tempInput);
                            }
                            const lbl = document.getElementById('copy-order-lbl');
                            const icon = document.getElementById('copy-order-icon');
                            copyBtn.style.background = '#059669';
                            copyBtn.style.transform = 'scale(1.05)';
                            if (lbl) lbl.textContent = '¡Código Copiado!';
                            if (icon) icon.textContent = 'check_circle';
                            setTimeout(() => {
                                copyBtn.style.transform = 'scale(1)';
                            }, 150);
                            setTimeout(() => {
                                copyBtn.style.background = '#0f172a';
                                if (lbl) lbl.textContent = 'Copiar código';
                                if (icon) icon.textContent = 'content_copy';
                            }, 2000);
                        };
                    }
                }
            };
        }
    }

    window.showOfferPaymentModal = showOfferPaymentModal;
    window.showProductPaymentModal = function(product, grupo, medida, price, qty = 1, opcion = '', opcionLabel = '', cartShippingContext = null) {
        return showOfferPaymentModal(product, qty, { grupo, medida, price, opcion, opcionLabel, cartShippingContext });
    };
})();
