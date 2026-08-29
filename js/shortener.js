/**
 * shortener.js - Motor de acortamiento de URLs nativo en Base36 para La Tarima
 * Genera enlaces ultracortos (ej: /1.A.2) jerárquicos por categoría, producto y variantes.
 */
(function () {
    'use strict';

    function toBase36(num) {
        if (typeof num !== 'number' || num <= 0 || isNaN(num)) return '0';
        return num.toString(36).toUpperCase();
    }

    function fromBase36(str) {
        if (!str) return 0;
        const val = parseInt(String(str).trim(), 36);
        return isNaN(val) ? 0 : val;
    }

    function getCategoriesData() {
        return (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (typeof window.productsData !== 'undefined' ? window.productsData : []);
    }

    // Función auxiliar para obtener la lista plana de todos los productos (para fallback retrocompatible)
    function getAllProductsFlat() {
        const source = getCategoriesData();
        const list = [];
        const seenIds = new Set();

        source.forEach(cat => {
            if (cat.products && Array.isArray(cat.products)) {
                cat.products.forEach(prod => {
                    if (prod && prod.id && !seenIds.has(prod.id)) {
                        seenIds.add(prod.id);
                        list.push(prod);
                    }
                });
            }
        });
        return list;
    }

    /**
     * Convierte un ID de producto y sus variantes a un código Base36 corto.
     * Estructura del código corto: [CategoríaBase36].[ProductoEnCatBase36].[AcabadoBase36].[MedidaBase36].[OpciónBase36]
     * Ejemplo: "1.1" (Cat 1, Prod 1) o "1.A.2" (Cat 1, Prod 10, Acabado 2)
     */
    function encodeShortCode(productId, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '') {
        const categories = getCategoriesData();
        let catIndex = -1;
        let prodIndex = -1;
        let product = null;

        for (let c = 0; c < categories.length; c++) {
            const cat = categories[c];
            if (cat.products && Array.isArray(cat.products)) {
                const pIdx = cat.products.findIndex(p => p && p.id === productId);
                if (pIdx !== -1) {
                    catIndex = c;
                    prodIndex = pIdx;
                    product = cat.products[pIdx];
                    break;
                }
            }
        }

        if (!product || catIndex === -1 || prodIndex === -1) {
            return productId; // Fallback al ID original si no se encuentra
        }

        const catCode = toBase36(catIndex + 1);
        const prodCode = toBase36(prodIndex + 1);

        let acabadoIdx = 0;
        let medidaIdx = 0;
        let opcionIdx = 0;

        // 1. Buscar índice de acabado
        const grupos = (product.acabados_groups || []).filter(g => !g.hidden);
        if (preselectedAcabado && grupos.length > 0) {
            const foundGroupIdx = grupos.findIndex(g => (g.acabado_name || '').trim().toLowerCase() === preselectedAcabado.trim().toLowerCase());
            if (foundGroupIdx !== -1) acabadoIdx = foundGroupIdx + 1;
        }

        // 2. Buscar índice de medida
        const activeGrupo = grupos[acabadoIdx > 0 ? acabadoIdx - 1 : 0] || {};
        const medidas = activeGrupo.medidas_variants || product.medidas_variants || [];
        if (preselectedMedida && medidas.length > 0) {
            const foundMedidaIdx = medidas.findIndex(m => (m.medida || '').trim().toLowerCase() === preselectedMedida.trim().toLowerCase());
            if (foundMedidaIdx !== -1) medidaIdx = foundMedidaIdx + 1;
        }

        // 3. Buscar índice de opción
        const optVariant = product.optional_variant;
        if (preselectedOpcion && optVariant && optVariant.options && Array.isArray(optVariant.options)) {
            const foundOptIdx = optVariant.options.findIndex(o => (o || '').trim().toLowerCase() === preselectedOpcion.trim().toLowerCase());
            if (foundOptIdx !== -1) opcionIdx = foundOptIdx + 1;
        }

        // Construir código compacto Base36
        let code = `${catCode}.${prodCode}`;
        if (acabadoIdx > 0 || medidaIdx > 0 || opcionIdx > 0) {
            code += `.${toBase36(acabadoIdx)}`;
            if (medidaIdx > 0 || opcionIdx > 0) {
                code += `.${toBase36(medidaIdx)}`;
                if (opcionIdx > 0) {
                    code += `.${toBase36(opcionIdx)}`;
                }
            }
        }

        return code;
    }

    /**
     * Decodifica un código corto Base36 (ej: 1.A.2) y devuelve el producto y variantes.
     */
    function decodeShortCode(shortCode) {
        if (!shortCode) return null;

        const cleanCode = String(shortCode).trim().replace(/^\/+|\/+$/g, '');
        const parts = cleanCode.split('.');

        const categories = getCategoriesData();
        let product = null;

        let acabadoIdx = 0;
        let medidaIdx = 0;
        let opcionIdx = 0;

        if (parts.length >= 2) {
            const catNum = fromBase36(parts[0]);
            const prodNum = fromBase36(parts[1]);

            if (catNum > 0 && categories[catNum - 1]) {
                const cat = categories[catNum - 1];
                if (cat.products && cat.products[prodNum - 1]) {
                    product = cat.products[prodNum - 1];
                }
            }

            acabadoIdx = parts[2] ? fromBase36(parts[2]) : 0;
            medidaIdx = parts[3] ? fromBase36(parts[3]) : 0;
            opcionIdx = parts[4] ? fromBase36(parts[4]) : 0;
        }

        // Fallback: si es un código de 1 solo segmento o no se encontró en jerarquía
        if (!product) {
            const prodNumber = fromBase36(parts[0]);
            const flatList = getAllProductsFlat();
            if (prodNumber > 0 && flatList[prodNumber - 1]) {
                product = flatList[prodNumber - 1];
                acabadoIdx = parts[1] ? fromBase36(parts[1]) : 0;
                medidaIdx = parts[2] ? fromBase36(parts[2]) : 0;
                opcionIdx = parts[3] ? fromBase36(parts[3]) : 0;
            } else {
                // Intentar buscar por ID directo
                const foundById = flatList.find(p => p.id === cleanCode);
                if (foundById) {
                    return { productId: foundById.id, productTitle: foundById.title, preselectedAcabado: '', preselectedMedida: '', preselectedOpcion: '' };
                }
                return null;
            }
        }

        let preselectedAcabado = '';
        let preselectedMedida = '';
        let preselectedOpcion = '';

        const grupos = (product.acabados_groups || []).filter(g => !g.hidden);

        // Decodificar acabado
        if (acabadoIdx > 0 && grupos[acabadoIdx - 1]) {
            preselectedAcabado = grupos[acabadoIdx - 1].acabado_name || '';
        }

        // Decodificar medida
        const activeGrupo = grupos[acabadoIdx > 0 ? acabadoIdx - 1 : 0] || grupos[0] || {};
        const medidas = activeGrupo.medidas_variants || product.medidas_variants || [];
        if (medidaIdx > 0 && medidas[medidaIdx - 1]) {
            preselectedMedida = medidas[medidaIdx - 1].medida || '';
        }

        // Decodificar opción
        const optVariant = product.optional_variant;
        if (opcionIdx > 0 && optVariant && optVariant.options && optVariant.options[opcionIdx - 1]) {
            preselectedOpcion = optVariant.options[opcionIdx - 1];
        }

        return {
            productId: product.id,
            productTitle: product.title,
            preselectedAcabado,
            preselectedMedida,
            preselectedOpcion
        };
    }

    function getOffersData() {
        return (typeof window.sessionOffers !== 'undefined' && Array.isArray(window.sessionOffers) && window.sessionOffers.length > 0)
            ? window.sessionOffers
            : (typeof window.offersData !== 'undefined' ? window.offersData : []);
    }

    /**
     * Codifica un ID de oferta a un código Base36 super corto (ej: O.1, O.2, O.A)
     */
    function encodeOfferShortCode(offerId) {
        if (!offerId) return 'O.1';
        const offers = getOffersData();
        const idx = offers.findIndex(o => o && o.id === offerId);
        if (idx !== -1) {
            return `O.${toBase36(idx + 1)}`;
        }
        return `O.${offerId}`;
    }

    /**
     * Decodifica un código corto de oferta (ej: O.1 o o.1 o O.A)
     */
    function decodeOfferShortCode(shortCode) {
        if (!shortCode) return null;
        const clean = String(shortCode).trim().replace(/^\/+|\/+$/g, '');
        const offers = getOffersData();

        if (/^O\.[0-9A-Z]+$/i.test(clean)) {
            const raw = clean.substring(2);
            const num = fromBase36(raw);
            if (num > 0 && offers[num - 1]) {
                return offers[num - 1];
            }
            // Fallback por ID directo
            const found = offers.find(o => o.id === raw || o.id === clean);
            if (found) return found;
        }

        const foundDirect = offers.find(o => o.id === clean);
        return foundDirect || null;
    }

    /**
     * Genera la URL corta completa para una oferta (ej: https://latarimadecoracion.com/?s=O.1 o /O.1)
     */
    function getShortOfferUrl(offerId) {
        const code = encodeOfferShortCode(offerId);
        const origin = window.location.origin;
        const path = window.location.pathname.replace(/\/index\.html$/, '/');
        const basePath = path.endsWith('/') ? path : path + '/';
        return `${origin}${basePath}?s=${code}`;
    }

    /**
     * Genera la URL corta completa directa con diagonal (ej: https://latarimadecoracion.com/1.A.2)
     */
    function getShortProductUrl(productId, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '') {
        const code = encodeShortCode(productId, preselectedAcabado, preselectedMedida, preselectedOpcion);
        const origin = window.location.origin;
        const path = window.location.pathname.replace(/\/index\.html$/, '/');
        const basePath = path.endsWith('/') ? path : path + '/';
        return `${origin}${basePath}${code}`;
    }

    // Exponer API global
    window.TarimaShortener = {
        toBase36,
        fromBase36,
        encodeShortCode,
        decodeShortCode,
        getShortProductUrl,
        encodeOfferShortCode,
        decodeOfferShortCode,
        getShortOfferUrl,
        getAllProductsFlat
    };

    window.getShortProductUrl = getShortProductUrl;
    window.getShortOfferUrl = getShortOfferUrl;
})();

