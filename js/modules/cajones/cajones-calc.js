// js/modules/cajones/cajones-calc.js
// --- MOTOR DE CÁLCULO MATEMÁTICO Y DESPIECE PARA CAJONES CROSSFIT ---
// Módulo puramente funcional y desacoplado de la interfaz gráfica.

(function() {
    'use strict';

    /**
     * Evalúa las dimensiones y costos de un cajón según su regla constructiva.
     * @param {Object} params
     * @param {number} params.largo - Largo en cm
     * @param {number} params.ancho - Ancho en cm
     * @param {number} params.alto - Alto en cm
     * @param {number} params.qty - Cantidad de cajones
     * @param {Object} params.activeRegla - Objeto de regla de construcción
     * @param {Object} params.curPlaca - Placa activa con medidas y costos
     * @param {Object} params.config - cajonesConfig global
     * @returns {Object} Resultado del cálculo con despiece, costos, redondeo y validación de límites
     */
    function calculateCajon(params) {
        const {
            largo = 60,
            ancho = 30,
            alto = 30,
            qty = 1,
            activeRegla = {},
            curPlaca = {},
            config = {}
        } = params;

        const inL = parseFloat(largo) || 60;
        const inW = parseFloat(ancho) || 30;
        const inH = parseFloat(alto) || 30;
        const inQty = Math.max(1, parseInt(qty, 10) || 1);

        const reglaName = activeRegla.name || 'Cajón Simple';

        // 1. Validación de Límites Dimensionales y Estructurales
        const minL = activeRegla.min_largo !== undefined ? activeRegla.min_largo : 5;
        const maxL = activeRegla.max_largo !== undefined ? activeRegla.max_largo : 80;
        const minW = activeRegla.min_ancho !== undefined ? activeRegla.min_ancho : 5;
        const maxW = activeRegla.max_ancho !== undefined ? activeRegla.max_ancho : 60;
        const minH = activeRegla.min_alto !== undefined ? activeRegla.min_alto : 5;
        const maxH = activeRegla.max_alto !== undefined ? activeRegla.max_alto : 60;

        let isExceeded = false;
        const exceedReasons = [];

        if (inL > maxL) exceedReasons.push(`Largo máximo permitido: <strong>${maxL} cm</strong> (ingresaste ${inL} cm)`);
        if (inL < minL) exceedReasons.push(`Largo mínimo permitido: <strong>${minL} cm</strong> (ingresaste ${inL} cm)`);
        if (inW > maxW) exceedReasons.push(`Ancho/Prof. máxima permitida: <strong>${maxW} cm</strong> (ingresaste ${inW} cm)`);
        if (inW < minW) exceedReasons.push(`Ancho/Prof. mínima permitida: <strong>${minW} cm</strong> (ingresaste ${inW} cm)`);
        if (inH > maxH) exceedReasons.push(`Alto máximo permitido: <strong>${maxH} cm</strong> (ingresaste ${inH} cm)`);
        if (inH < minH) exceedReasons.push(`Alto mínimo permitido: <strong>${minH} cm</strong> (ingresaste ${inH} cm)`);

        if (exceedReasons.length > 0) {
            isExceeded = true;
        }

        // 2. Resolver los materiales asignados
        const mats = (config.materiales || []);
        
        // Placa seleccionada (o asignada a la regla, o fallback al primer material tipo placa)
        const assignedPlaca = (curPlaca && curPlaca.id && mats.find(m => m.id === curPlaca.id && m.activo !== false))
            || curPlaca
            || mats.find(m => m.id === activeRegla.material_placa_id && m.activo !== false)
            || mats.find(m => m.es_placa !== false && m.activo !== false)
            || { name: "Placa Fenólico 18mm", costo_placa: 35000, max_largo: 244, max_ancho: 124, espesores_texto: "18 mm" };

        // Espesor numérico en cm (E) extraído del texto de la placa asignada (ej: "18 mm" -> 1.8, "15 mm" -> 1.5, "25 mm" -> 2.5)
        let espNum = 1.8;
        if (assignedPlaca.espesores_texto) {
            const parsedEsp = parseFloat(assignedPlaca.espesores_texto);
            if (!isNaN(parsedEsp)) {
                // Si está en mm (> 3) lo pasamos a cm
                espNum = parsedEsp > 3 ? (parsedEsp / 10) : parsedEsp;
            }
        }

        // Tirante asignado a la regla (o fallback si no es 'ninguno')
        let assignedTirante = null;
        let costoMetroLinealTirante = 0;
        if (activeRegla.material_tirante_id && activeRegla.material_tirante_id !== 'ninguno') {
            assignedTirante = mats.find(m => m.id === activeRegla.material_tirante_id && m.activo !== false);
        }
        if (!assignedTirante && activeRegla.material_tirante_id !== 'ninguno') {
            // Si la regla requiere tirante por su estructura
            assignedTirante = mats.find(m => m.es_tirante === true && m.activo !== false);
        }

        if (assignedTirante) {
            const largoTiranteMetros = ((assignedTirante.max_largo || 360) / 100) || 3.6;
            costoMetroLinealTirante = Math.round((assignedTirante.costo_placa || 5000) / largoTiranteMetros);
        }

        let m2PlacaNeto = 0;
        let costoTiranteBase = 0;
        let mlTiranteTotal = 0;

        if (Array.isArray(activeRegla.formulas_despiece) && activeRegla.formulas_despiece.length > 0) {
            activeRegla.formulas_despiece.forEach(f => {
                const cant = f.cant || 1;
                const evalFormula = (str) => {
                    const clean = String(str).replace(/([0-9.]+)\s*\*\s*E/gi, function(_, n) { return '(' + n + ' * E)'; });
                    return Function('L', 'A', 'H', 'E', 'return Math.max(0, ' + clean + ');')(inL, inW, inH, espNum);
                };

                const isTirante = f.tipo_material === 'tirante';

                try {
                    const dimL = evalFormula(f.formula_largo || 'L');
                    const dimW = evalFormula(f.formula_ancho || (isTirante ? '1' : 'A'));

                    if (isTirante) {
                        // Para tirante: formula_largo expresa longitud en cm de cada tramo
                        const mlTramo = (cant * dimL) / 100;
                        mlTiranteTotal += mlTramo;
                        costoTiranteBase += mlTramo * costoMetroLinealTirante;
                    } else {
                        // Para placa: m² de corte
                        m2PlacaNeto += (cant * (dimL * dimW)) / 10000;
                    }
                } catch(e) {
                    if (isTirante) {
                        const mlFallback = (cant * inH) / 100;
                        mlTiranteTotal += mlFallback;
                        costoTiranteBase += mlFallback * costoMetroLinealTirante;
                    } else {
                        m2PlacaNeto += ((inL * inW) / 10000);
                    }
                }
            });
        } else {
            // Estándar 4 caras + 1 tapa completas
            const areaTapa = (inL * inW);
            const areaFrentes = 2 * (inL * inH);
            const areaLaterales = 2 * (inW * inH);
            m2PlacaNeto = (areaTapa + areaFrentes + areaLaterales) / 10000;
        }

        const desperdicioPct = activeRegla.desperdicio_pct || 0;
        const m2ConDesperdicio = m2PlacaNeto * (1 + (desperdicioPct / 100));

        // 3. Costos y Precios
        const areaPlaca = ((assignedPlaca.max_largo || 244) * (assignedPlaca.max_ancho || 124)) / 10000;
        const costoM2 = Math.round((assignedPlaca.costo_placa || 20000) / (areaPlaca || 3.02));
        const multiplicadorRegla = activeRegla.multiplicador_costo || 5.0;
        
        const costoMaderaPlaca = m2ConDesperdicio * costoM2;
        const costoMaterialesTotal = costoMaderaPlaca + costoTiranteBase;

        const minCajon = (config.taller && config.taller.minimo_cajon) || 1000;
        const rawUnitPrice = Math.max(minCajon, Math.round(costoMaterialesTotal * multiplicadorRegla));

        // 4. Redondeo comercial
        const pasoRedondeo = (config.taller && config.taller.redondeo_paso) || 500;
        const unitPrice = pasoRedondeo > 0 
            ? Math.max(minCajon, Math.floor(rawUnitPrice / pasoRedondeo) * pasoRedondeo) 
            : rawUnitPrice;

        const tiranteDesc = assignedTirante ? ` + ${assignedTirante.name}` : '';

        return {
            reglaId: activeRegla.id,
            reglaName: reglaName,
            placaId: assignedPlaca.id,
            placaName: assignedPlaca.name,
            materialName: `${assignedPlaca.name}${tiranteDesc}`,
            largo: inL,
            ancho: inW,
            alto: inH,
            espesorText: assignedPlaca.espesores_texto || "18 mm",
            m2Unit: m2ConDesperdicio,
            mlTirante: mlTiranteTotal,
            rawUnitPrice: rawUnitPrice,
            unitPrice: unitPrice,
            qty: inQty,
            subtotal: unitPrice * inQty,
            isExceeded: isExceeded,
            exceedReasons: exceedReasons,
            limiteMensaje: activeRegla.limite_mensaje || ''
        };
    }

    window.CajonesCalc = {
        calculateCajon
    };
})();
