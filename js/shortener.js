/**
 * shortener.js - Motor de acortamiento de URLs nativo para La Tarima
 * Permite generar y decodificar enlaces extremadamente cortos (?s=CODE)
 * para WhatsApp, AutoResponder y bots automáticos.
 */
(function () {
    'use strict';

    // Función auxiliar para obtener la lista plana de todos los productos en orden determinista
    function getAllProductsFlat() {
        const source = (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (typeof window.productsData !== 'undefined' ? window.productsData : []);
        
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
     * Convierte un ID de producto y sus variantes seleccionadas a un código corto.
     * Estructura del código corto: [ÍndiceProducto].[ÍndiceAcabado].[ÍndiceMedida].[ÍndiceOpción]
     * Ejemplo: "1" (solo producto) o "1.2.1" (producto 1, acabado 2, medida 1)
     */
    function encodeShortCode(productId, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '') {
        const allProducts = getAllProductsFlat();
        const prodIndex = allProducts.findIndex(p => p.id === productId);
        
        if (prodIndex === -1) return productId; // Fallback al id original si no lo encuentra

        const prodNumber = prodIndex + 1; // 1-indexed
        const product = allProducts[prodIndex];

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

        // Construir código compacto
        let code = `${prodNumber}`;
        if (acabadoIdx > 0 || medidaIdx > 0 || opcionIdx > 0) {
            code += `.${acabadoIdx}`;
            if (medidaIdx > 0 || opcionIdx > 0) {
                code += `.${medidaIdx}`;
                if (opcionIdx > 0) {
                    code += `.${opcionIdx}`;
                }
            }
        }

        return code;
    }

    /**
     * Decodifica un código corto (?s=CODE) y devuelve el objeto con producto y variantes.
     */
    function decodeShortCode(shortCode) {
        if (!shortCode) return null;

        const parts = String(shortCode).trim().split('.');
        const prodNumber = parseInt(parts[0], 10);

        if (isNaN(prodNumber) || prodNumber <= 0) {
            // Si el código no es numérico, intentamos buscarlo como ID normal de producto
            return { productId: shortCode, preselectedAcabado: '', preselectedMedida: '', preselectedOpcion: '' };
        }

        const allProducts = getAllProductsFlat();
        const product = allProducts[prodNumber - 1];

        if (!product) return null;

        let preselectedAcabado = '';
        let preselectedMedida = '';
        let preselectedOpcion = '';

        const grupos = (product.acabados_groups || []).filter(g => !g.hidden);

        // Decodificar acabado
        const acabadoIdx = parts[1] ? parseInt(parts[1], 10) : 0;
        if (acabadoIdx > 0 && grupos[acabadoIdx - 1]) {
            preselectedAcabado = grupos[acabadoIdx - 1].acabado_name || '';
        }

        // Decodificar medida
        const activeGrupo = grupos[acabadoIdx > 0 ? acabadoIdx - 1 : 0] || grupos[0] || {};
        const medidas = activeGrupo.medidas_variants || product.medidas_variants || [];
        const medidaIdx = parts[2] ? parseInt(parts[2], 10) : 0;
        if (medidaIdx > 0 && medidas[medidaIdx - 1]) {
            preselectedMedida = medidas[medidaIdx - 1].medida || '';
        }

        // Decodificar opción
        const optVariant = product.optional_variant;
        const opcionIdx = parts[3] ? parseInt(parts[3], 10) : 0;
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

    /**
     * Genera la URL corta completa para compartir apuntando al stub SEO estático
     * para asegurar la foto/miniatura Open Graph (og:image) en WhatsApp.
     */
    function getShortProductUrl(productId, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '') {
        const code = encodeShortCode(productId, preselectedAcabado, preselectedMedida, preselectedOpcion);
        const origin = window.location.origin;
        const path = window.location.pathname.replace(/\/index\.html$/, '/');
        const basePath = path.endsWith('/') ? path : path + '/';
        const cleanProdId = String(productId).replace(/^\/|\.html$/g, '');
        return `${origin}${basePath}p/${cleanProdId}.html?s=${code}`;
    }

    // Exponer API global
    window.TarimaShortener = {
        encodeShortCode,
        decodeShortCode,
        getShortProductUrl,
        getAllProductsFlat
    };

    window.getShortProductUrl = getShortProductUrl;
})();
