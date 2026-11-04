/**
 * shortener.js - Motor de acortamiento de URLs nativo en Base36 para La Tarima
 * Genera enlaces ultracortos jerárquicos canónicos (ej: /p/B.1.1.1.html o /?s=B.1.1.1)
 * y garantiza compatibilidad retroactiva 100% con enlaces antiguos (ej: B3D11, F6, etc.).
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

    // Obtener lista plana de productos
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

    // Resuelve la coordenada primaria (Categoría, Índice de Producto) inequívoca
    function getPrimaryCoordinate(product, categories) {
        if (!product || !categories || categories.length === 0) return null;

        if (product.primaryCatId) {
            const cIdx = categories.findIndex(c => c.id === product.primaryCatId);
            if (cIdx !== -1) {
                const pIdx = (categories[cIdx].products || []).findIndex(p => p && p.id === product.id);
                if (pIdx !== -1) return { cIdx, pIdx };
            }
        }

        // Buscar en categorías visibles primero
        for (let c = 0; c < categories.length; c++) {
            if (categories[c].visible === false) continue;
            const pIdx = (categories[c].products || []).findIndex(p => p && p.id === product.id);
            if (pIdx !== -1) return { cIdx: c, pIdx };
        }

        // Fallback a cualquier categoría
        for (let c = 0; c < categories.length; c++) {
            const pIdx = (categories[c].products || []).findIndex(p => p && p.id === product.id);
            if (pIdx !== -1) return { cIdx: c, pIdx };
        }

        return null;
    }

    /**
     * Convierte un ID de producto y sus variantes a un código canónico Base36 inequívoco.
     * Por defecto useDots = true para evitar ambigüedades en WhatsApp y URLs.
     */
    function encodeShortCode(productId, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '', useDots = true) {
        const categories = getCategoriesData();
        const flatList = getAllProductsFlat();
        let product = flatList.find(p => p && p.id === productId);
        if (!product) product = flatList.find(p => p && p.shortId === productId);

        if (!product) {
            return productId;
        }

        const coord = getPrimaryCoordinate(product, categories);
        const catCode = coord ? toBase36(coord.cIdx + 1) : '1';
        const prodCode = coord ? toBase36(coord.pIdx + 1) : toBase36(fromBase36(product.id.substring(0, 4)) || 1);

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
            const foundMedidaIdx = medidas.findIndex(m => (m.medida || m.name || '').trim().toLowerCase() === preselectedMedida.trim().toLowerCase());
            if (foundMedidaIdx !== -1) medidaIdx = foundMedidaIdx + 1;
        }

        // 3. Buscar índice de opción
        const optVariant = product.optional_variant;
        if (preselectedOpcion && optVariant && optVariant.options && Array.isArray(optVariant.options)) {
            const foundOptIdx = optVariant.options.findIndex(o => (o || '').trim().toLowerCase() === preselectedOpcion.trim().toLowerCase());
            if (foundOptIdx !== -1) opcionIdx = foundOptIdx + 1;
        }

        const sep = useDots ? '.' : '';

        // Construir código canónico Base36 (ej: B.1.1.1, 1.2.1)
        let code = `${catCode}${sep}${prodCode}`;
        if (acabadoIdx > 0 || medidaIdx > 0 || opcionIdx > 0) {
            code += `${sep}${toBase36(acabadoIdx)}`;
            if (medidaIdx > 0 || opcionIdx > 0) {
                code += `${sep}${toBase36(medidaIdx)}`;
                if (opcionIdx > 0) {
                    code += `${sep}${toBase36(opcionIdx)}`;
                }
            }
        }

        return code;
    }

    // Mapa de compatibilidad histórica para enlaces antiguos (WhatsApp / Meta Catalog / Facebook / Enlaces previos)
    const LEGACY_PRODUCT_ALIASES = {
        'F6': '4H', // Repisa Biblioteca Estantes Montessori
        '6B': '4H', // Repisa Biblioteca Estantes Montessori
        '61': '4E', // Estantes Montessori
        '66': '4C', // Ménsulas para estantes
        '68': '42', // Especiero
        '82': '79', // Pie de cama romano
        '93': '4D', // Banco Escalera De Pino 3 Escalones
        '94': '4G', // Banco Banquito Escalera Niños Infantil
        '6A': '4B', // Ménsulas para escritorios
        'B2': '41', // Baúl de madera de pino - Mediano (80 cm)
        'B3': '4G', // Banco Banquito Escalera Niños Infantil
        'C4': 'B6', // Juego de Mesa y Sillas Infantiles (Colonial)
        'C5': 'B5', // Juego de Mesa y Sillas Infantiles (Redondos)
        'C6': 'B4', // Juego de Mesa y Sillas Infantiles
        'D1': '46', // Mueble Multifunción - Estilo Nórdico
        'D5': '4B', // Ménsulas para escritorios
        'E6': '4F', // Caballetes de madera
        'F1': 'D6', // Escritorio para PC - Soporte Gabinete
        'F5': '79', // Pie de cama romano
        '45': '43', // Verdulero Mediano / Clasico
        'B3D11': { id: 'F3', acabado: 'Natural', medida: 'Mesita' },
        'B3D': { id: 'F3', acabado: '', medida: '' }
    };

    /**
     * Decodifica un código corto Base36 estático o por jerarquía (ej: B.1.1.1, B3D11, 1.2.1).
     */
    function decodeShortCode(shortCode) {
        if (!shortCode) return null;

        let cleanCode = String(shortCode).trim().replace(/^\/+|\/+$/g, '');
        if (LEGACY_PRODUCT_ALIASES[cleanCode]) {
            const alias = LEGACY_PRODUCT_ALIASES[cleanCode];
            if (typeof alias === 'object') {
                const flat = getAllProductsFlat();
                const p = flat.find(x => x.id === alias.id);
                if (p) {
                    return {
                        productId: p.id,
                        productTitle: p.title,
                        product: p,
                        preselectedAcabado: alias.acabado || '',
                        preselectedMedida: alias.medida || '',
                        preselectedOpcion: ''
                    };
                }
            }
            cleanCode = alias;
        }

        const categories = getCategoriesData();
        const flatList = getAllProductsFlat();
        let product = null;

        let acabadoIdx = 0;
        let medidaIdx = 0;
        let opcionIdx = 0;

        // 1. Canónico con puntos: cat.prod.acabado.medida.opcion (ej: B.1.1.1, 1.2.1)
        if (cleanCode.includes('.')) {
            const parts = cleanCode.split('.');
            const catCodeStr = parts[0];
            const prodCodeStr = parts[1];

            const catNum = fromBase36(catCodeStr);
            const prodNum = fromBase36(prodCodeStr);

            if (catNum > 0 && categories[catNum - 1]) {
                const cat = categories[catNum - 1];
                if (prodNum > 0 && cat.products && cat.products[prodNum - 1]) {
                    product = cat.products[prodNum - 1];
                }
            }

            if (!product) {
                // Fallback a búsqueda directa por ID o shortId de la segunda parte
                product = flatList.find(p => p.id === prodCodeStr || p.shortId === prodCodeStr);
            }

            acabadoIdx = parts[2] ? fromBase36(parts[2]) : 0;
            medidaIdx = parts[3] ? fromBase36(parts[3]) : 0;
            opcionIdx = parts[4] ? fromBase36(parts[4]) : 0;
        }

        // 2. ID exacto directo en la lista plana
        if (!product) {
            product = flatList.find(p => p.id === cleanCode);
            if (!product) product = flatList.find(p => p.shortId === cleanCode);
        }

        // 3. Fallback para códigos compactos sin punto (ej: B3D11, 121, GA)
        if (!product && /^[0-9A-Z]{2,7}$/i.test(cleanCode)) {
            for (let catLen = 1; catLen <= 2 && catLen < cleanCode.length; catLen++) {
                const catCodeStr = cleanCode.substring(0, catLen);
                const catNum = fromBase36(catCodeStr);
                if (catNum > 0 && categories[catNum - 1]) {
                    const cat = categories[catNum - 1];
                    const remaining = cleanCode.substring(catLen);

                    // 3a. Coincidencia por shortId o ID de producto dentro de la categoría
                    for (let prodLen = Math.min(4, remaining.length); prodLen >= 1; prodLen--) {
                        const prodCodeStr = remaining.substring(0, prodLen);
                        const foundInCat = (cat.products || []).find(p => p.shortId === prodCodeStr || p.id === prodCodeStr);
                        if (foundInCat) {
                            product = foundInCat;
                            const rest = remaining.substring(prodLen);
                            acabadoIdx = rest[0] ? fromBase36(rest[0]) : 0;
                            medidaIdx = rest[1] ? fromBase36(rest[1]) : 0;
                            opcionIdx = rest[2] ? fromBase36(rest[2]) : 0;
                            break;
                        }
                    }

                    if (product) break;

                    // 3b. Coincidencia por índice de producto dentro de la categoría
                    for (let prodLen = Math.min(2, remaining.length); prodLen >= 1; prodLen--) {
                        const prodCodeStr = remaining.substring(0, prodLen);
                        const prodNum = fromBase36(prodCodeStr);
                        if (prodNum > 0 && cat.products && cat.products[prodNum - 1]) {
                            product = cat.products[prodNum - 1];
                            const rest = remaining.substring(prodLen);
                            acabadoIdx = rest[0] ? fromBase36(rest[0]) : 0;
                            medidaIdx = rest[1] ? fromBase36(rest[1]) : 0;
                            opcionIdx = rest[2] ? fromBase36(rest[2]) : 0;
                            break;
                        }
                    }

                    if (product) break;
                }
            }
        }

        if (!product) {
            return null;
        }

        let preselectedAcabado = '';
        let preselectedMedida = '';
        let preselectedOpcion = '';

        const grupos = (product.acabados_groups || []).filter(g => !g.hidden);

        if (acabadoIdx > 0 && grupos[acabadoIdx - 1]) {
            preselectedAcabado = grupos[acabadoIdx - 1].acabado_name || '';
        }

        const activeGrupo = grupos[acabadoIdx > 0 ? acabadoIdx - 1 : 0] || grupos[0] || {};
        const medidas = activeGrupo.medidas_variants || product.medidas_variants || [];
        if (medidaIdx > 0 && medidas[medidaIdx - 1]) {
            preselectedMedida = medidas[medidaIdx - 1].medida || medidas[medidaIdx - 1].name || '';
        }

        const optVariant = product.optional_variant;
        if (opcionIdx > 0 && optVariant && optVariant.options && optVariant.options[opcionIdx - 1]) {
            preselectedOpcion = optVariant.options[opcionIdx - 1];
        }

        return {
            productId: product.id,
            productTitle: product.title,
            product: product,
            preselectedAcabado,
            preselectedMedida,
            preselectedOpcion
        };
    }

    /**
     * Codifica una oferta de flash sale a código Base36 (ej: O.1)
     */
    function encodeOfferShortCode(offerId) {
        if (!offerId) return 'O.1';
        const offersData = (typeof window.offersData !== 'undefined' && Array.isArray(window.offersData))
            ? window.offersData
            : [];
        const index = offersData.findIndex(o => o && o.id === offerId);
        const codeNum = index !== -1 ? (index + 1) : 1;
        return `O.${toBase36(codeNum)}`;
    }

    /**
     * Decodifica un código de oferta (ej: O.1 -> oferta en index 0)
     */
    function decodeOfferShortCode(code) {
        if (!code) return null;
        const clean = String(code).trim().replace(/^\/+|\/+$/g, '');
        const match = clean.match(/^O\.([0-9A-Z]+)$/i);
        if (!match) return null;

        const idx = fromBase36(match[1]) - 1;
        const offersData = (typeof window.offersData !== 'undefined' && Array.isArray(window.offersData))
            ? window.offersData
            : [];

        if (idx >= 0 && idx < offersData.length) {
            return offersData[idx];
        }

        const foundDirect = offersData.find(o => o && o.id === clean);
        return foundDirect || null;
    }

    function getShortOfferUrl(offerId) {
        const code = encodeOfferShortCode(offerId);
        const origin = window.location.origin;
        const path = window.location.pathname.replace(/\/index\.html$/, '/');
        const basePath = path.endsWith('/') ? path : path + '/';
        return `${origin}${basePath}?s=${code}`;
    }

    function getShortProductUrl(productId, preselectedAcabado = '', preselectedMedida = '', preselectedOpcion = '') {
        const code = encodeShortCode(productId, preselectedAcabado, preselectedMedida, preselectedOpcion, true);
        const origin = window.location.origin;
        const path = window.location.pathname.replace(/\/index\.html$/, '/');
        const basePath = path.endsWith('/') ? path : path + '/';
        return `${origin}${basePath}p/${code}.html`;
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
