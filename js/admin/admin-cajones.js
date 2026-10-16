// js/admin/admin-cajones.js
// --- CONTROLADOR PRINCIPAL Y ORQUESTADOR: CAJONES CROSSFIT ---
// Coordina los submódulos independientes ubicados en js/admin/cajones/

(function() {
    'use strict';

    // Navegación entre las 5 pestañas
    function switchCajonesModuleTab(modName) {
        // Sincronizar cambios en memoria antes de alternar de panel
        if (window.CajonesAdminMaterials) window.CajonesAdminMaterials.syncFromDOM();
        if (window.CajonesAdminRules) window.CajonesAdminRules.syncFromDOM();
        if (window.CajonesAdminDiscounts) window.CajonesAdminDiscounts.syncFromDOM();

        const tabs = [
            { id: 'materiales', btn: document.getElementById('btn-cajones-mtab-materiales'), panel: document.getElementById('cajones-modpanel-materiales') },
            { id: 'usos', btn: document.getElementById('btn-cajones-mtab-usos'), panel: document.getElementById('cajones-modpanel-usos') },
            { id: 'logistica', btn: document.getElementById('btn-cajones-mtab-logistica'), panel: document.getElementById('cajones-modpanel-logistica') },
            { id: 'descuentos', btn: document.getElementById('btn-cajones-mtab-descuentos'), panel: document.getElementById('cajones-modpanel-descuentos') },
            { id: 'simulador', btn: document.getElementById('btn-cajones-mtab-simulador'), panel: document.getElementById('cajones-modpanel-simulador') }
        ];

        tabs.forEach(t => {
            if (t.btn) {
                t.btn.classList.remove('active');
                t.btn.style.background = 'transparent';
                t.btn.style.color = '#475569';
                t.btn.style.boxShadow = 'none';
            }
            if (t.panel) {
                t.panel.style.display = 'none';
            }
        });

        const activeTab = tabs.find(t => t.id === modName) || tabs[0];
        if (activeTab.btn) {
            activeTab.btn.classList.add('active');
            activeTab.btn.style.background = '#0F172A';
            activeTab.btn.style.color = '#FFFFFF';
            activeTab.btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        }
        if (activeTab.panel) {
            activeTab.panel.style.display = 'block';
        }

        if (modName === 'simulador' && window.CajonesAdminSimulator) {
            window.CajonesAdminSimulator.run();
        }

        setupCajonesTabsDragAndDrop();
    }
    window.switchCajonesModuleTab = switchCajonesModuleTab;

    // Configurar Drag & Drop horizontal para la barra de pestañas principales
    function setupCajonesTabsDragAndDrop() {
        const tabsBar = document.getElementById('cajones-module-tabs');
        if (!tabsBar || !window.CajonesAdminDrag) return;

        window.CajonesAdminDrag.setup({
            container: tabsBar,
            itemSelector: '.cajones-main-tab-btn',
            handleSelector: '.tab-drag-handle',
            orientation: 'horizontal',
            draggingClass: 'dragging-tab'
        });
    }

    // Cargar datos a la UI desde la base de datos
    function loadCajonesConfigToUI() {
        const cfg = window.cajonesConfig;
        if (!cfg) return;

        // 1. Materiales
        if (window.CajonesAdminMaterials) {
            let mats = [];
            if (Array.isArray(cfg.materiales) && cfg.materiales.length > 0) {
                mats = cfg.materiales;
            } else if (cfg.material) {
                mats = [{
                    id: cfg.material.id || 'fenolico_18mm',
                    name: cfg.material.name || 'Placa Fenólico Industrial 18mm',
                    max_largo: cfg.material.largo_placa || 244,
                    max_ancho: cfg.material.ancho_placa || 124,
                    peso_placa: cfg.material.peso_placa || 35,
                    costo_placa: cfg.material.costo_placa || 35000,
                    costo_m2: cfg.material.costo_m2 || 11568,
                    margen_pct: cfg.material.margen_pct !== undefined ? cfg.material.margen_pct : 140,
                    precio_m2: cfg.material.precio_m2 || 27763,
                    espesores_texto: (cfg.material.espesores_disponibles || ['18 mm']).join(', '),
                    espesores_disponibles: cfg.material.espesores_disponibles || ['18 mm'],
                    limite_mensaje: cfg.material.limite_mensaje || '',
                    activo: true,
                    es_placa: true,
                    es_tirante: false,
                    is_default: true
                }];
            }
            window.CajonesAdminMaterials.setMaterials(mats);
            window.CajonesAdminMaterials.renderUI();
        }

        // 2. Reglas de Construcción
        if (window.CajonesAdminRules) {
            window.CajonesAdminRules.setReglas(Array.isArray(cfg.reglas_construccion) ? cfg.reglas_construccion : []);
            window.CajonesAdminRules.renderUI();
        }

        // 3. Taller
        const tal = cfg.taller || {};
        const inMinTaller = document.getElementById('cajon-taller-minimo');
        const inRedondeoTaller = document.getElementById('cajon-taller-redondeo');
        if (inMinTaller) inMinTaller.value = tal.minimo_cajon || 1000;
        if (inRedondeoTaller) inRedondeoTaller.value = tal.redondeo_paso || 500;

        // 4. Logística y Fletes
        const log = cfg.logistica || {};
        const inFlexSuma = document.getElementById('cajon-flex-max-suma-lados');
        const inFlexPeso = document.getElementById('cajon-flex-max-peso');
        const inFlexUnidades = document.getElementById('cajon-flex-max-unidades');
        const inVehiculoNombre = document.getElementById('cajon-vehiculo-nombre');
        const inCajaLargo = document.getElementById('cajon-caja-largo');
        const inCajaAncho = document.getElementById('cajon-caja-ancho');
        const inCajaAlto = document.getElementById('cajon-caja-alto-techo');
        const inFleteArmados = document.getElementById('cajon-flete-max-armados');
        const inFleteDesarmados = document.getElementById('cajon-flete-max-desarmados');
        const inDireccion = document.getElementById('cajon-ship-direccion');
        const inGigantePct = document.getElementById('cajon-gigante-pct-caja');
        const inGiganteMult = document.getElementById('cajon-gigante-mult-viajes');

        if (inFlexSuma) inFlexSuma.value = log.flex_max_suma_lados || 150;
        if (inFlexPeso) inFlexPeso.value = log.flex_max_peso_kg || 30;
        if (inFlexUnidades) inFlexUnidades.value = log.flex_max_unidades_bulto || 1;
        if (inVehiculoNombre) inVehiculoNombre.value = log.vehiculo_nombre || "Ford Ranger (al Ras del Techo)";
        if (inCajaLargo) inCajaLargo.value = log.vehiculo_caja_largo || 145;
        if (inCajaAncho) inCajaAncho.value = log.vehiculo_caja_ancho || 115;
        if (inCajaAlto) inCajaAlto.value = log.vehiculo_caja_alto_techo || 85;
        if (inGigantePct) inGigantePct.value = log.gigante_umbral_pct_caja !== undefined ? log.gigante_umbral_pct_caja : 65;
        if (inGiganteMult) inGiganteMult.value = log.gigante_mult_viajes !== undefined ? log.gigante_mult_viajes : 2;
        if (inFleteArmados) inFleteArmados.value = log.flete_ranger_max_armados || 6;
        if (inFleteDesarmados) inFleteDesarmados.value = log.flete_ranger_max_desarmados || 20;
        if (inDireccion) inDireccion.value = log.direccion_retiro || "Taller Hurlingham, GBA Oeste";

        // 5. Descuentos por Cantidad
        if (window.CajonesAdminDiscounts) {
            window.CajonesAdminDiscounts.setDescuentos(cfg.descuentos_box);
            window.CajonesAdminDiscounts.renderUI();
        }

        // Beneficio de Envío Gratis por Cantidad
        const chkEnvioGratis = document.getElementById('chk-cajon-envio-gratis-activo');
        const inEnvioGratisMin = document.getElementById('cajon-envio-gratis-min-qty');
        const envioGratisCfg = cfg.envio_gratis_box || {};
        if (chkEnvioGratis) chkEnvioGratis.checked = envioGratisCfg.activo !== false;
        if (inEnvioGratisMin) inEnvioGratisMin.value = envioGratisCfg.minQty || 10;

        if (window.CajonesAdminSimulator) {
            window.CajonesAdminSimulator.run();
        }
        setupCajonesTabsDragAndDrop();
    }
    window.loadCajonesConfigToUI = loadCajonesConfigToUI;

    // Guardar configuración al servidor
    async function saveCajonesConfigFromUI() {
        const btn = document.getElementById('btn-save-cajones-config');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 18px;">sync</span> Guardando...`;
        }

        try {
            const savedMaterials = window.CajonesAdminMaterials ? window.CajonesAdminMaterials.syncFromDOM() : [];
            const savedReglas = window.CajonesAdminRules ? window.CajonesAdminRules.syncFromDOM() : [];
            const savedDescuentos = window.CajonesAdminDiscounts ? window.CajonesAdminDiscounts.syncFromDOM() : [];

            const inDireccion = document.getElementById('cajon-ship-direccion')?.value || "Taller Hurlingham, GBA Oeste";
            const inMinTaller = parseFloat(document.getElementById('cajon-taller-minimo')?.value);
            const inRedondeoTaller = parseInt(document.getElementById('cajon-taller-redondeo')?.value, 10);

            const updatedConfig = {
                materiales: savedMaterials,
                reglas_construccion: savedReglas,
                taller: {
                    costo_tornillos_cola: savedReglas[0] ? savedReglas[0].costo_fijacion_base : 2000,
                    precio_armado_taller: savedReglas[0] ? savedReglas[0].plus_armado : 6000,
                    desperdicio_pct: savedReglas[0] ? savedReglas[0].desperdicio_pct : 10,
                    minimo_cajon: !isNaN(inMinTaller) ? inMinTaller : 1000,
                    redondeo_paso: !isNaN(inRedondeoTaller) ? inRedondeoTaller : 500
                },
                logistica: {
                    flex_max_suma_lados: parseInt(document.getElementById('cajon-flex-max-suma-lados')?.value, 10) || 150,
                    flex_max_peso_kg: parseFloat(document.getElementById('cajon-flex-max-peso')?.value) || 30,
                    flex_max_unidades_bulto: parseInt(document.getElementById('cajon-flex-max-unidades')?.value, 10) || 1,
                    vehiculo_nombre: document.getElementById('cajon-vehiculo-nombre')?.value.trim() || "Ford Ranger (al Ras del Techo)",
                    vehiculo_caja_largo: parseFloat(document.getElementById('cajon-caja-largo')?.value) || 145,
                    vehiculo_caja_ancho: parseFloat(document.getElementById('cajon-caja-ancho')?.value) || 115,
                    vehiculo_caja_alto_techo: parseFloat(document.getElementById('cajon-caja-alto-techo')?.value) || 85,
                    gigante_umbral_pct_caja: parseFloat(document.getElementById('cajon-gigante-pct-caja')?.value) || 65,
                    gigante_mult_viajes: parseInt(document.getElementById('cajon-gigante-mult-viajes')?.value, 10) || 2,
                    flete_ranger_max_armados: parseInt(document.getElementById('cajon-flete-max-armados')?.value, 10) || 6,
                    flete_ranger_max_desarmados: parseInt(document.getElementById('cajon-flete-max-desarmados')?.value, 10) || 20,
                    retiro_taller: true,
                    direccion_retiro: inDireccion
                },
                descuentos_box: savedDescuentos,
                envio_gratis_box: {
                    activo: document.getElementById('chk-cajon-envio-gratis-activo')?.checked !== false,
                    minQty: parseInt(document.getElementById('cajon-envio-gratis-min-qty')?.value, 10) || 10
                }
            };

            const response = await fetch('/api/save-cajones-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig)
            });

            if (!response.ok) throw new Error('Error al guardar en el servidor');
            window.cajonesConfig = updatedConfig;

            if (typeof window.showToast === 'function') {
                window.showToast('✅ Configuración de Cajones CrossFit guardada exitosamente.', 'success');
            } else {
                alert('✅ Configuración de Cajones guardada exitosamente.');
            }
        } catch (err) {
            console.error(err);
            alert('❌ Error al guardar: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">save</span> <span>Guardar Configuración</span>`;
            }
        }
    }
    window.saveCajonesConfigFromUI = saveCajonesConfigFromUI;

})();
