// js/admin/cajones/cajones-discounts.js
// --- SUBMÓDULO 4: GESTIÓN DE DESCUENTOS POR CANTIDAD & BENEFICIOS ---

(function() {
    'use strict';

    let descuentosList = [
        { minQty: 3, discountPercent: 8 },
        { minQty: 6, discountPercent: 12 }
    ];

    function getDescuentos() {
        return getScalesFromUI();
    }

    function setDescuentos(list) {
        descuentosList = Array.isArray(list) && list.length > 0 
            ? JSON.parse(JSON.stringify(list)) 
            : [
                { minQty: 3, discountPercent: 8 },
                { minQty: 6, discountPercent: 12 }
            ];
    }

    function getScalesFromUI() {
        const container = document.getElementById('cajones-escalas-container');
        if (!container) return descuentosList;

        const rows = container.querySelectorAll('.cajon-escala-row');
        const result = [];
        rows.forEach(r => {
            const q = parseInt(r.querySelector('.cajon-esc-inp-qty')?.value, 10);
            const p = parseInt(r.querySelector('.cajon-esc-inp-pct')?.value, 10);
            if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
                result.push({ minQty: q, discountPercent: p });
            }
        });
        if (result.length > 0) {
            descuentosList = result;
        }
        return descuentosList;
    }

    function renderDiscountScalesUI() {
        const container = document.getElementById('cajones-escalas-container');
        if (!container) return;

        container.innerHTML = '';

        if (!descuentosList || descuentosList.length === 0) {
            container.innerHTML = `<div style="padding: 0.75rem; text-align: center; color: #64748B; font-size: 0.75rem; background: #FFFFFF; border-radius: 8px; border: 1px dashed #CBD5E1;">No hay escalas configuradas. Hacé clic en "+ Agregar Escala".</div>`;
            return;
        }

        descuentosList.forEach((esc, idx) => {
            const row = document.createElement('div');
            row.className = 'cajon-escala-row';
            row.style.cssText = 'display: grid; grid-template-columns: auto 1fr 1fr auto; gap: 10px; align-items: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px; transition: transform 0.15s ease, box-shadow 0.15s ease;';

            row.innerHTML = `
                <span class="material-symbols-outlined cajon-esc-drag-handle" style="color: #64748B; font-size: 20px; cursor: grab; user-select: none; padding: 2px;" title="Mantener presionado para arrastrar y reordenar escalas">layers</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-size: 0.72rem; font-weight: 700; color: #475569; white-space: nowrap;">A partir de:</label>
                    <input type="number" class="admin-input cajon-esc-inp-qty" value="${esc.minQty || (idx * 3 + 3)}" min="2" max="999" style="width: 75px; padding: 4px 8px; font-size: 0.8rem; font-weight: 700;">
                    <span style="font-size: 0.72rem; color: #64748B;">cajones</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-size: 0.72rem; font-weight: 700; color: #10B981; white-space: nowrap;">Descuento:</label>
                    <input type="number" class="admin-input cajon-esc-inp-pct" value="${esc.discountPercent || 10}" min="1" max="99" style="width: 75px; padding: 4px 8px; font-size: 0.8rem; font-weight: 700; color: #15803D;">
                    <span style="font-size: 0.72rem; font-weight: 700; color: #15803D;">% OFF</span>
                </div>
                <button type="button" class="btn-danger" onclick="window.removeCajonDiscountScaleRow(${idx})" style="padding: 4px 8px; border-radius: 6px; cursor: pointer;" title="Eliminar escala">
                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                </button>
            `;

            container.appendChild(row);
        });

        // Configurar Drag & Drop con utilidad modular
        if (window.CajonesAdminDrag) {
            window.CajonesAdminDrag.setup({
                container: container,
                itemSelector: '.cajon-escala-row',
                handleSelector: '.cajon-esc-drag-handle',
                orientation: 'vertical',
                onReorder: getScalesFromUI
            });
        }
    }

    // Acciones globales
    window.addCajonDiscountScaleRow = function() {
        getScalesFromUI();
        const lastQty = descuentosList.length > 0 ? (descuentosList[descuentosList.length - 1].minQty + 3) : 3;
        const lastPct = descuentosList.length > 0 ? Math.min(90, descuentosList[descuentosList.length - 1].discountPercent + 5) : 8;
        descuentosList.push({ minQty: lastQty, discountPercent: lastPct });
        renderDiscountScalesUI();
    };

    window.removeCajonDiscountScaleRow = function(idx) {
        getScalesFromUI();
        if (idx < 0 || idx >= descuentosList.length) return;
        descuentosList.splice(idx, 1);
        renderDiscountScalesUI();
    };

    // Exponer API del módulo
    window.CajonesAdminDiscounts = {
        getDescuentos: getDescuentos,
        setDescuentos: setDescuentos,
        syncFromDOM: getScalesFromUI,
        renderUI: renderDiscountScalesUI
    };

    // Retrocompatibilidad
    window.renderCajonDiscountScalesUI = renderDiscountScalesUI;
    window.getCajonDiscountScalesFromUI = getScalesFromUI;
})();
