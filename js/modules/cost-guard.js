/**
 * =============================================================================
 * js/modules/cost-guard.js
 * Motor Matemático Anti-Pérdida y Guardián de Costos (Cost Protection Engine)
 * La Tarima 2.0
 * =============================================================================
 */

(function (window) {
    'use strict';

    const CONFIG = {
        DEFAULT_MIN_MARGIN_PCT: 25,     // Margen bruto mínimo de seguridad (25%)
        CRITICAL_NET_MARGIN_PCT: 10,    // Margen neto mínimo en checkout tras transfer/volumen (10%)
        RECOMMENDED_MARGIN_PCT: 35,     // Margen objetivo recomendado para taller
        DEFAULT_TRANSFER_DISCOUNT_PCT: 10 // Descuento por pago en transferencia
    };

    /**
     * Calcula la ganancia neta en pesos
     */
    function calculateProfit(price, cost) {
        const p = Number(price) || 0;
        const c = Number(cost) || 0;
        return p - c;
    }

    /**
     * Calcula el margen bruto sobre el precio de venta (%)
     * Margen = ((Precio - Costo) / Precio) * 100
     */
    function calculateGrossMarginPct(price, cost) {
        const p = Number(price) || 0;
        const c = Number(cost) || 0;
        if (p <= 0) return 0;
        return ((p - c) / p) * 100;
    }

    /**
     * Calcula el multiplicador comercial (Markup)
     * Markup = Precio / Costo
     */
    function calculateMarkup(price, cost) {
        const p = Number(price) || 0;
        const c = Number(cost) || 0;
        if (c <= 0) return 0;
        return p / c;
    }

    /**
     * Calcula el Precio Mínimo de Seguridad (Floor Price)
     * Precio = Costo / (1 - Margen / 100)
     */
    function calculateFloorPrice(cost, minMarginPct) {
        const c = Number(cost) || 0;
        const m = (minMarginPct !== undefined && minMarginPct !== null) ? Number(minMarginPct) : CONFIG.DEFAULT_MIN_MARGIN_PCT;
        if (c <= 0) return 0;
        if (m >= 100) return c * 2;
        return Math.ceil(c / (1 - (m / 100)));
    }

    /**
     * Valida un precio individual frente a su costo base
     * @returns {Object} { ok, status: 'safe'|'warning'|'danger'|'critical', marginPct, profit, floorPrice, message }
     */
    function validatePrice(price, cost, minMarginPct) {
        const p = Number(price);
        const c = Number(cost);
        const targetMargin = (minMarginPct !== undefined && minMarginPct !== null) ? Number(minMarginPct) : CONFIG.DEFAULT_MIN_MARGIN_PCT;

        // 1. Precio cero o inválido
        if (isNaN(p) || p <= 0) {
            return {
                ok: false,
                status: 'critical',
                marginPct: 0,
                profit: 0,
                floorPrice: calculateFloorPrice(c, targetMargin),
                message: 'El precio debe ser un número mayor a $0.'
            };
        }

        // 2. Si no hay costo cargado, es válido pero sin análisis
        if (isNaN(c) || c <= 0) {
            return {
                ok: true,
                status: 'safe',
                marginPct: 100,
                profit: p,
                floorPrice: p,
                message: 'Sin costo base registrado.'
            };
        }

        const profit = p - c;
        const marginPct = ((p - c) / p) * 100;
        const floorPrice = calculateFloorPrice(c, targetMargin);

        // 3. Venta por debajo del costo (PÉRDIDA TOTAL)
        if (p < c) {
            return {
                ok: false,
                status: 'critical',
                marginPct: Math.round(marginPct),
                profit,
                floorPrice,
                message: `¡Pérdida directa de $${Math.abs(profit).toLocaleString('es-AR')}! El precio ($${p.toLocaleString('es-AR')}) es menor al costo ($${c.toLocaleString('es-AR')}).`
            };
        }

        // 4. Margen nulo (empate)
        if (p === c) {
            return {
                ok: false,
                status: 'critical',
                marginPct: 0,
                profit: 0,
                floorPrice,
                message: `El precio es igual al costo ($${c.toLocaleString('es-AR')}). Ganancia $0.`
            };
        }

        // 5. Margen por debajo del piso de seguridad
        if (marginPct < targetMargin) {
            return {
                ok: false,
                status: 'danger',
                marginPct: Math.round(marginPct),
                profit,
                floorPrice,
                message: `Margen bajo (${Math.round(marginPct)}% vs mínimo ${targetMargin}%). Piso seguro: $${floorPrice.toLocaleString('es-AR')}.`
            };
        }

        // 6. Margen aceptable pero justo
        if (marginPct < CONFIG.RECOMMENDED_MARGIN_PCT) {
            return {
                ok: true,
                status: 'warning',
                marginPct: Math.round(marginPct),
                profit,
                floorPrice,
                message: `Margen ajustado (${Math.round(marginPct)}%). Recomendado: ≥${CONFIG.RECOMMENDED_MARGIN_PCT}%.`
            };
        }

        // 7. Margen saludable
        return {
            ok: true,
            status: 'safe',
            marginPct: Math.round(marginPct),
            profit,
            floorPrice,
            message: `Margen saludable (${Math.round(marginPct)}%). Ganancia: $${profit.toLocaleString('es-AR')}.`
        };
    }

    /**
     * Valida descuentos comerciales acumulables para prevenir pérdidas en checkout
     * (Descuento por volumen + Descuento por pago por transferencia)
     */
    function validateCumulativeDiscount(price, cost, maxVolumeDiscountPct, paymentDiscountPct) {
        const p = Number(price) || 0;
        const c = Number(cost) || 0;
        const volPct = Math.max(0, Number(maxVolumeDiscountPct) || 0);
        const payPct = (paymentDiscountPct !== undefined && paymentDiscountPct !== null && !isNaN(paymentDiscountPct))
            ? Math.max(0, Number(paymentDiscountPct))
            : CONFIG.DEFAULT_TRANSFER_DISCOUNT_PCT;

        if (p <= 0 || c <= 0) {
            return { ok: true, netPrice: p, netMarginPct: 100 };
        }

        // Precio tras descuento por volumen
        const priceAfterVol = p * (1 - (volPct / 100));
        // Precio final en checkout tras transferencia
        const netPrice = Math.round(priceAfterVol * (1 - (payPct / 100)));
        const netProfit = netPrice - c;
        const netMarginPct = ((netPrice - c) / netPrice) * 100;

        if (netPrice < c) {
            return {
                ok: false,
                status: 'critical',
                netPrice,
                netProfit,
                netMarginPct: Math.round(netMarginPct),
                message: `¡Pérdida en checkout! Con -${volPct}% vol y -${payPct}% transf, el precio cae a $${netPrice.toLocaleString('es-AR')} (Costo: $${c.toLocaleString('es-AR')}).`
            };
        }

        if (netMarginPct < CONFIG.CRITICAL_NET_MARGIN_PCT) {
            return {
                ok: false,
                status: 'danger',
                netPrice,
                netProfit,
                netMarginPct: Math.round(netMarginPct),
                message: `Margen neto crítico (${Math.round(netMarginPct)}% tras descuentos combinados). Mínimo requerido: ${CONFIG.CRITICAL_NET_MARGIN_PCT}%.`
            };
        }

        return {
            ok: true,
            status: 'safe',
            netPrice,
            netProfit,
            netMarginPct: Math.round(netMarginPct),
            message: `Descuento seguro. Margen neto remanente en checkout: ${Math.round(netMarginPct)}%.`
        };
    }

    /**
     * Audita un producto completo con todas sus variantes y reglas de descuento
     */
    function auditProductPricing(product, minMarginPct) {
        const results = {
            productId: product.id,
            title: product.title || '',
            hasCriticalErrors: false,
            warningsCount: 0,
            variantsChecked: 0,
            variantAudits: []
        };

        const targetMargin = minMarginPct || CONFIG.DEFAULT_MIN_MARGIN_PCT;
        const basePrice = Number(product.price) || 0;
        const baseCost = Number(product.cost_price) || 0;

        if (basePrice > 0 || baseCost > 0) {
            const baseCheck = validatePrice(basePrice, baseCost, targetMargin);
            if (!baseCheck.ok) results.hasCriticalErrors = true;
            if (baseCheck.status === 'warning') results.warningsCount++;
            results.baseAudit = baseCheck;
        }

        if (Array.isArray(product.acabados_groups)) {
            product.acabados_groups.forEach((grupo, gIdx) => {
                (grupo.medidas_variants || []).forEach((v, vIdx) => {
                    results.variantsChecked++;
                    const check = validatePrice(v.price, v.cost_price, targetMargin);

                    // Verificar descuentos por volumen si existen
                    let discountCheck = null;
                    const maxVolDisc = Math.max(
                        0,
                        ...((v.volumeDiscounts || product.quantityDiscounts || []).map(r => Number(r.discountPercent) || 0))
                    );

                    if (maxVolDisc > 0 && v.cost_price > 0) {
                        discountCheck = validateCumulativeDiscount(v.price, v.cost_price, maxVolDisc);
                        if (!discountCheck.ok) results.hasCriticalErrors = true;
                    }

                    if (!check.ok) results.hasCriticalErrors = true;
                    if (check.status === 'warning') results.warningsCount++;

                    results.variantAudits.push({
                        groupIndex: gIdx,
                        variantIndex: vIdx,
                        medida: v.medida || 'Única',
                        price: v.price,
                        cost_price: v.cost_price,
                        priceCheck: check,
                        discountCheck: discountCheck
                    });
                });
            });
        }

        return results;
    }

    // Exponer API pública en window
    window.CostGuard = {
        CONFIG,
        calculateProfit,
        calculateGrossMarginPct,
        calculateMarkup,
        calculateFloorPrice,
        validatePrice,
        validateCumulativeDiscount,
        auditProductPricing
    };

})(typeof window !== 'undefined' ? window : globalThis);
