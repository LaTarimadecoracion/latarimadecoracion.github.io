// js/admin/cajones/cajones-simulator.js
// --- SUBMÓDULO 5: SIMULADOR DE TALLER & RENTABILIDAD EN VIVO ---

(function() {
    'use strict';

    function runSimulation() {
        const reglasList = window.CajonesAdminRules ? window.CajonesAdminRules.getReglas() : [];
        const materialsList = window.CajonesAdminMaterials ? window.CajonesAdminMaterials.getMaterials() : [];

        const selRegla = document.getElementById('sim-cajon-regla');
        if (selRegla && (!selRegla.options || selRegla.options.length === 0 || selRegla.options.length !== reglasList.length)) {
            selRegla.innerHTML = reglasList.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        }

        const reglaId = selRegla ? selRegla.value : (reglasList[0] ? reglasList[0].id : 'cajon_simple');
        const activeRegla = reglasList.find(r => r.id === reglaId) || reglasList[0] || {};

        const inLargo = parseFloat(document.getElementById('sim-cajon-largo')?.value) || 75;
        const inAncho = parseFloat(document.getElementById('sim-cajon-ancho')?.value) || 60;
        const inAlto = parseFloat(document.getElementById('sim-cajon-alto')?.value) || 50;
        const qty = Math.max(1, parseInt(document.getElementById('sim-cajon-qty')?.value, 10) || 1);

        const currentCfg = window.cajonesConfig || {
            materiales: materialsList,
            reglas_construccion: reglasList,
            taller: { minimo_cajon: 1000, redondeo_paso: 500 }
        };

        if (window.CajonesCalc) {
            const calc = window.CajonesCalc.calculateCajon({
                largo: inLargo,
                ancho: inAncho,
                alto: inAlto,
                qty: qty,
                activeRegla: activeRegla,
                config: currentCfg
            });

            const mat = materialsList.find(m => m.id === activeRegla.material_placa_id && m.activo !== false) || materialsList[0] || {};
            const costoPlaca = mat.costo_placa || 35000;
            const areaPlaca = ((mat.max_largo || 244) * (mat.max_ancho || 124)) / 10000;
            const costoM2 = Math.round(costoPlaca / (areaPlaca || 3.02));

            const m2Totales = calc.m2Unit * qty;
            const placasEstimadas = parseFloat((m2Totales / (areaPlaca || 3.02)).toFixed(2));
            const costoTotalMaterial = Math.round(m2Totales * costoM2);
            const ventaTotal = calc.subtotal;
            const gananciaLimpia = Math.max(0, ventaTotal - costoTotalMaterial);

            const elPlacas = document.getElementById('sim-lbl-placas');
            const elCosto = document.getElementById('sim-lbl-costo');
            const elVenta = document.getElementById('sim-lbl-venta');
            const elGanancia = document.getElementById('sim-lbl-ganancia');

            if (elPlacas) elPlacas.textContent = `${placasEstimadas} Placa(s)`;
            if (elCosto) elCosto.textContent = `$${costoTotalMaterial.toLocaleString('es-AR')}`;
            if (elVenta) elVenta.textContent = `$${ventaTotal.toLocaleString('es-AR')}`;
            if (elGanancia) elGanancia.textContent = `+$${gananciaLimpia.toLocaleString('es-AR')}`;
        }
    }

    // Exponer API del simulador
    window.CajonesAdminSimulator = {
        run: runSimulation
    };

    // Retrocompatibilidad
    window.runCajonAdminSimulation = runSimulation;
})();
