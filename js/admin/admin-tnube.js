// js/admin/admin-tnube.js
// --- MÓDULO AUTÓNOMO: EXPORTADOR Y CALCULADOR DE PRECIOS PARA TIENDANUBE ---
// Completamente modular y aislado. Permite definir reglas de recargo (porcentaje o monto fijo),
// redondeo configurable (5, 10, 50, 100, 200, 300, 500, etc.) en positivo/negativo/cercano,
// edición manual por fila y descarga del CSV oficial de Tiendanube.

(function () {
    'use strict';

    // Estado interno del módulo aislado
    const state = {
        adjustType: 'percent', // 'percent' | 'fixed'
        adjustValue: 12,       // 12% o $ monto fijo
        roundStep: 100,        // 0, 5, 10, 50, 100, 200, 300, 500, 1000
        roundDirection: 'nearest', // 'nearest' | 'up' | 'down'
        promoMode: 'none',     // 'none' | '10' | '15' | '20' | '25'
        searchQuery: '',
        selectedCategory: 'all',
        filterCustom: 'all',   // 'all' | 'custom'
        overrides: {},         // { sku: customPriceNumber }
        items: []              // Lista plana de ítems/variantes calculadas
    };

    // Cargar overrides guardados en localStorage
    function loadSavedConfig() {
        try {
            const saved = localStorage.getItem('latarima_tnube_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.adjustType) state.adjustType = parsed.adjustType;
                if (parsed.adjustValue !== undefined) state.adjustValue = parseFloat(parsed.adjustValue) || 0;
                if (parsed.roundStep !== undefined) state.roundStep = parseInt(parsed.roundStep, 10);
                if (parsed.roundDirection) state.roundDirection = parsed.roundDirection;
                if (parsed.promoMode) state.promoMode = parsed.promoMode;
                if (parsed.overrides) state.overrides = parsed.overrides;
            }
        } catch (e) {
            console.warn('[AdminTnube] Error leyendo localStorage config:', e);
        }
    }

    function saveConfig() {
        try {
            localStorage.setItem('latarima_tnube_config', JSON.stringify({
                adjustType: state.adjustType,
                adjustValue: state.adjustValue,
                roundStep: state.roundStep,
                roundDirection: state.roundDirection,
                promoMode: state.promoMode,
                overrides: state.overrides
            }));
        } catch (e) {
            console.warn('[AdminTnube] Error guardando config:', e);
        }
    }

    // Función pura de cálculo y redondeo según las reglas elegidas
    function calculateFinalPrice(basePrice, sku) {
        if (!basePrice || basePrice <= 0) return 0;

        // Si tiene un override manual para este SKU, respetarlo exactamente
        if (state.overrides[sku] !== undefined && state.overrides[sku] !== null && state.overrides[sku] > 0) {
            return state.overrides[sku];
        }

        let raw = basePrice;
        if (state.adjustType === 'percent') {
            raw = basePrice * (1 + (state.adjustValue / 100));
        } else if (state.adjustType === 'fixed') {
            raw = basePrice + state.adjustValue;
        }

        const step = state.roundStep;
        if (!step || step <= 0) {
            return Math.round(raw);
        }

        if (state.roundDirection === 'up') {
            return Math.ceil(raw / step) * step;
        } else if (state.roundDirection === 'down') {
            return Math.floor(raw / step) * step;
        } else {
            return Math.round(raw / step) * step;
        }
    }

    function slugify(text) {
        return String(text || '')
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .toLowerCase();
    }

    // Construir la lista plana de productos y variantes a partir de sessionProducts o productsData
    function buildItemsList() {
        const source = (window.sessionProducts && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (window.productsData || []);

        const flat = [];
        const seenProdIds = new Set();

        source.forEach(cat => {
            if (!cat.products || !Array.isArray(cat.products)) return;
            const catName = cat.name ? cat.name.trim() : 'Muebles';

            cat.products.forEach(prod => {
                if (!prod || !prod.id || seenProdIds.has(prod.id)) return;
                seenProdIds.add(prod.id);

                const handle = slugify(prod.title || prod.id) || `prod-${prod.id}`;
                const title = prod.title || 'Producto La Tarima';
                const image = Array.isArray(prod.image) ? prod.image[0] : (prod.image || 'img/logo_provisional.png');
                const grupos = (prod.acabados_groups || []).filter(g => !g.hidden);

                let variants = [];
                if (grupos.length > 0) {
                    grupos.forEach(g => {
                        const acName = (g.acabado_name && g.acabado_name !== 'Único') ? g.acabado_name.trim() : '';
                        const medidas = (g.medidas_variants || []).filter(m => !m.hidden);
                        if (medidas.length > 0) {
                            medidas.forEach(m => {
                                variants.push({
                                    acabado: acName,
                                    medida: m.medida ? m.medida.trim() : '',
                                    basePrice: m.price || prod.price || 0,
                                    image: g.cover_image || image
                                });
                            });
                        } else if (acName) {
                            variants.push({
                                acabado: acName,
                                medida: '',
                                basePrice: prod.price || 0,
                                image: g.cover_image || image
                            });
                        }
                    });
                }

                if (variants.length === 0) {
                    const sku = String(prod.id);
                    flat.push({
                        productId: prod.id,
                        sku: sku,
                        handle: handle,
                        title: title,
                        variantLabel: 'Estándar',
                        categoryName: catName,
                        basePrice: prod.price || 0,
                        image: image,
                        isFirstVariant: true,
                        rawProduct: prod,
                        acabado: '',
                        medida: ''
                    });
                } else {
                    variants.forEach((v, idx) => {
                        const parts = [];
                        if (v.acabado) parts.push(v.acabado);
                        if (v.medida) parts.push(v.medida);
                        const varLabel = parts.join(' · ') || 'Estándar';

                        const sku = `${prod.id}${v.acabado ? '-' + slugify(v.acabado) : ''}${v.medida ? '-' + slugify(v.medida) : ''}`;

                        flat.push({
                            productId: prod.id,
                            sku: sku,
                            handle: handle,
                            title: title,
                            variantLabel: varLabel,
                            categoryName: catName,
                            basePrice: v.basePrice || 0,
                            image: v.image || image,
                            isFirstVariant: (idx === 0),
                            rawProduct: prod,
                            acabado: v.acabado,
                            medida: v.medida
                        });
                    });
                }
            });
        });

        state.items = flat;
    }

    // Renderizar la vista
    function render() {
        const tbody = document.getElementById('tnube-table-body');
        if (!tbody) return;

        // Filtrar
        const q = state.searchQuery.toLowerCase().trim();
        const filtered = state.items.filter(item => {
            if (state.selectedCategory !== 'all' && item.categoryName !== state.selectedCategory) return false;
            if (state.filterCustom === 'custom' && !state.overrides[item.sku]) return false;
            if (q) {
                const matchTitle = item.title.toLowerCase().includes(q);
                const matchVar = item.variantLabel.toLowerCase().includes(q);
                const matchSku = item.sku.toLowerCase().includes(q);
                const matchCat = item.categoryName.toLowerCase().includes(q);
                if (!matchTitle && !matchVar && !matchSku && !matchCat) return false;
            }
            return true;
        });

        // Actualizar estadísticas del Header
        const statTotal = document.getElementById('tnube-stat-total');
        const statVariants = document.getElementById('tnube-stat-variants');
        const statOverrides = document.getElementById('tnube-stat-overrides');
        const examplePrice = document.getElementById('tnube-example-price');

        const uniqueProducts = new Set(state.items.map(i => i.productId)).size;
        if (statTotal) statTotal.textContent = uniqueProducts;
        if (statVariants) statVariants.textContent = state.items.length;
        const totalOverrides = Object.keys(state.overrides).filter(k => state.overrides[k] > 0).length;
        if (statOverrides) statOverrides.textContent = totalOverrides;

        if (examplePrice) {
            const exVal = calculateFinalPrice(20000, '__dummy__');
            examplePrice.textContent = `$${exVal.toLocaleString('es-AR')}`;
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 2.5rem; text-align: center; color: #94A3B8;">
                        <span class="material-symbols-outlined" style="font-size: 36px; display: block; margin-bottom: 6px;">search_off</span>
                        No se encontraron productos coincidentes con los filtros actuales.
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filtered.forEach(item => {
            const finalPrice = calculateFinalPrice(item.basePrice, item.sku);
            const isManual = (state.overrides[item.sku] !== undefined && state.overrides[item.sku] > 0);
            const diff = finalPrice - item.basePrice;
            const diffSign = diff > 0 ? `+$${diff.toLocaleString('es-AR')}` : (diff < 0 ? `-$${Math.abs(diff).toLocaleString('es-AR')}` : '$0');
            const diffColor = diff > 0 ? '#16A34A' : (diff < 0 ? '#DC2626' : '#64748B');

            html += `
                <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 8px 14px; vertical-align: middle;">
                        <img src="${item.image}" alt="" style="width: 38px; height: 38px; object-fit: cover; border-radius: 6px; border: 1px solid #E2E8F0; background: #FFF;">
                    </td>
                    <td style="padding: 8px 14px; vertical-align: middle;">
                        <div style="font-weight: 700; color: #1E293B;">${item.title}</div>
                        <div style="font-size: 0.76rem; color: #64748B; display: flex; align-items: center; gap: 8px;">
                            <span style="background: #E2E8F0; color: #334155; padding: 1px 6px; border-radius: 4px; font-weight: 600;">${item.variantLabel}</span>
                            <span>SKU: <code>${item.sku}</code></span>
                            ${isManual ? '<span style="color: #D97706; font-weight: 700;">★ Personalizado</span>' : ''}
                        </div>
                    </td>
                    <td style="padding: 8px 14px; vertical-align: middle; color: #64748B; font-weight: 600;">
                        ${item.categoryName}
                    </td>
                    <td style="padding: 8px 14px; vertical-align: middle; text-align: right; font-weight: 700; color: #475569;">
                        $${item.basePrice.toLocaleString('es-AR')}
                    </td>
                    <td style="padding: 8px 14px; vertical-align: middle; text-align: right;">
                        <div style="display: inline-flex; align-items: center; gap: 4px;">
                            <span style="color: #64748B; font-weight: 700;">$</span>
                            <input 
                                type="number" 
                                class="tnube-price-input" 
                                data-sku="${item.sku}" 
                                value="${finalPrice}" 
                                step="1"
                                style="width: 105px; height: 32px; text-align: right; border: 1px solid ${isManual ? '#F59E0B' : '#CBD5E1'}; border-radius: 6px; padding: 0 8px; font-size: 0.88rem; font-weight: 800; color: ${isManual ? '#B45309' : '#0284C7'}; background: ${isManual ? '#FEF3C7' : '#FFFFFF'}; outline: none;"
                                title="${isManual ? 'Precio modificado manualmente. Borrá para volver a la regla automática.' : 'Escribí un precio para sobreescribir este producto'}"
                            >
                        </div>
                    </td>
                    <td style="padding: 8px 14px; vertical-align: middle; text-align: right; font-weight: 700; color: ${diffColor};">
                        ${diffSign}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Binds de inputs manuales
        tbody.querySelectorAll('.tnube-price-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const sku = e.target.dataset.sku;
                const val = parseFloat(e.target.value);
                if (val && !isNaN(val) && val > 0) {
                    state.overrides[sku] = val;
                } else {
                    delete state.overrides[sku];
                }
                saveConfig();
                render();
            });
        });
    }

    // Poblar combo de categorías
    function populateCategories() {
        const select = document.getElementById('tnube-filter-category');
        if (!select) return;

        const cats = new Set(state.items.map(i => i.categoryName));
        let html = '<option value="all">Todas las Categorías</option>';
        cats.forEach(c => {
            if (c) html += `<option value="${c}">${c}</option>`;
        });
        select.innerHTML = html;
        select.value = state.selectedCategory;
    }

    // Generar y descargar el archivo CSV exacto de Tiendanube
    function downloadTiendanubeCsv() {
        const headers = [
            'Identificador de URL',
            'Nombre',
            'Categorías',
            'Nombre de propiedad 1',
            'Valor de propiedad 1',
            'Nombre de propiedad 2',
            'Valor de propiedad 2',
            'Nombre de propiedad 3',
            'Valor de propiedad 3',
            'Precio',
            'Precio promocional',
            'Peso (kg)',
            'Alto (cm)',
            'Ancho (cm)',
            'Profundidad (cm)',
            'Stock',
            'SKU',
            'Código de barras',
            'Mostrar en tienda',
            'Envío sin cargo',
            'Descripción',
            'Tags',
            'Título para SEO',
            'Descripción para SEO',
            'Marca',
            'Producto Físico',
            'MPN (Número de pieza del fabricante)',
            'Sexo',
            'Rango de edad',
            'Costo',
            'Visibilidad'
        ];

        function escapeCSV(text) {
            if (text === null || text === undefined || text === '') return '';
            const str = String(text).replace(/"/g, '""').replace(/\r?\n/g, ' ');
            return `"${str}"`;
        }

        const rows = [headers.map(h => escapeCSV(h)).join(';')];

        state.items.forEach(item => {
            const finalPrice = calculateFinalPrice(item.basePrice, item.sku);
            const isFirst = item.isFirstVariant;
            const prod = item.rawProduct || {};

            let promoPrice = '';
            let normalPrice = finalPrice;
            if (state.promoMode !== 'none') {
                const pct = parseFloat(state.promoMode) || 0;
                if (pct > 0) {
                    const listPrice = Math.round(finalPrice * (1 + (pct / 100)));
                    normalPrice = listPrice;
                    promoPrice = finalPrice;
                }
            }

            const cleanDesc = (prod.description || item.title || '').replace(/<[^>]*>?/gm, '').trim();
            const seoTitle = `${item.title} | LA TARIMA`;
            const seoDesc = cleanDesc.substring(0, 155);

            let alto = '20', ancho = '30', profundidad = '20';
            const aM = cleanDesc.match(/alto[:\s]+(\d+)/i); if (aM) alto = aM[1];
            const anM = cleanDesc.match(/(?:ancho|largo)[:\s]+(\d+)/i); if (anM) ancho = anM[1];
            const pM = cleanDesc.match(/profundidad[:\s]+(\d+)/i); if (pM) profundidad = pM[1];

            const prop1Name = item.acabado ? 'Acabado' : (item.medida ? 'Medida' : '');
            const prop1Val = item.acabado ? item.acabado : (item.medida ? item.medida : '');
            const prop2Name = (item.acabado && item.medida) ? 'Medida' : '';
            const prop2Val = (item.acabado && item.medida) ? item.medida : '';

            const row = [
                escapeCSV(item.handle),
                isFirst ? escapeCSV(item.title) : '',
                isFirst ? escapeCSV(item.categoryName) : '',
                escapeCSV(prop1Name),
                escapeCSV(prop1Val),
                escapeCSV(prop2Name),
                escapeCSV(prop2Val),
                '',
                '',
                escapeCSV(normalPrice > 0 ? `${normalPrice}.00` : ''),
                escapeCSV(promoPrice > 0 ? `${promoPrice}.00` : ''),
                '5',
                escapeCSV(alto),
                escapeCSV(ancho),
                escapeCSV(profundidad),
                '99',
                escapeCSV(item.sku),
                '',
                isFirst ? 'SI' : '',
                isFirst ? 'NO' : '',
                isFirst ? escapeCSV(cleanDesc) : '',
                isFirst ? escapeCSV('muebles, madera, artesanal, la tarima') : '',
                isFirst ? escapeCSV(seoTitle) : '',
                isFirst ? escapeCSV(seoDesc) : '',
                isFirst ? 'La Tarima' : '',
                isFirst ? 'SI' : '',
                '',
                '',
                '',
                '',
                isFirst ? 'Visible' : ''
            ];

            rows.push(row.join(';'));
        });

        const csvContent = '\uFEFF' + rows.join('\r\n'); // BOM UTF-8 para compatibilidad perfecta con Excel y Tiendanube
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        a.href = url;
        a.download = `tiendanube-productos-${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showAdminToast) {
            window.showAdminToast('📥 Catálogo CSV para Tiendanube descargado exitosamente');
        } else {
            alert('¡Catálogo CSV descargado exitosamente!');
        }
    }

    // Inicialización del módulo
    function init() {
        loadSavedConfig();
        buildItemsList();

        // Referencias del DOM
        const typeSelect = document.getElementById('tnube-adjust-type');
        const valInput = document.getElementById('tnube-adjust-value');
        const valLabel = document.getElementById('tnube-adjust-val-label');
        const suffix = document.getElementById('tnube-adjust-suffix');
        const stepSelect = document.getElementById('tnube-round-step');
        const dirSelect = document.getElementById('tnube-round-direction');
        const promoSelect = document.getElementById('tnube-promo-mode');
        const searchInput = document.getElementById('tnube-search-input');
        const catFilter = document.getElementById('tnube-filter-category');
        const customFilter = document.getElementById('tnube-filter-custom');
        const btnReset = document.getElementById('btn-tnube-reset-overrides');
        const btnDownload = document.getElementById('btn-tnube-download-csv');

        if (!typeSelect) return; // Aún no está inyectado el HTML

        // Sincronizar UI con state
        typeSelect.value = state.adjustType;
        valInput.value = state.adjustValue;
        stepSelect.value = String(state.roundStep);
        dirSelect.value = state.roundDirection;
        promoSelect.value = state.promoMode;

        const updateTypeUI = () => {
            if (state.adjustType === 'percent') {
                valLabel.textContent = 'Recargo / Comisión (%):';
                suffix.textContent = '%';
                valInput.step = '0.5';
            } else {
                valLabel.textContent = 'Monto Fijo a sumar ($):';
                suffix.textContent = '$';
                valInput.step = '100';
            }
        };
        updateTypeUI();

        typeSelect.addEventListener('change', (e) => {
            state.adjustType = e.target.value;
            updateTypeUI();
            saveConfig();
            render();
        });

        valInput.addEventListener('input', (e) => {
            state.adjustValue = parseFloat(e.target.value) || 0;
            saveConfig();
            render();
        });

        stepSelect.addEventListener('change', (e) => {
            state.roundStep = parseInt(e.target.value, 10);
            saveConfig();
            render();
        });

        dirSelect.addEventListener('change', (e) => {
            state.roundDirection = e.target.value;
            saveConfig();
            render();
        });

        promoSelect.addEventListener('change', (e) => {
            state.promoMode = e.target.value;
            saveConfig();
            render();
        });

        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            render();
        });

        catFilter.addEventListener('change', (e) => {
            state.selectedCategory = e.target.value;
            render();
        });

        customFilter.addEventListener('change', (e) => {
            state.filterCustom = e.target.value;
            render();
        });

        btnReset.addEventListener('click', () => {
            const count = Object.keys(state.overrides).length;
            if (count === 0) {
                alert('No hay precios personalizados a mano.');
                return;
            }
            if (confirm(`¿Restablecer los ${count} precios personalizados y volver a las reglas automáticas?`)) {
                state.overrides = {};
                saveConfig();
                render();
            }
        });

        btnDownload.addEventListener('click', () => {
            downloadTiendanubeCsv();
        });

        populateCategories();
        render();
    }

    // Exponer API global autónoma
    window.AdminTnubeModule = {
        init: init,
        render: render,
        refreshData: () => {
            buildItemsList();
            populateCategories();
            render();
        },
        downloadCsv: downloadTiendanubeCsv
    };
})();
