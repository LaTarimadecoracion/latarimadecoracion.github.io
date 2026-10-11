// js/admin/admin-cortes.js
// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO ADMIN: CONFIGURACIÓN INTELIGENTE DE CORTES DE MADERA, COSTOS Y ENVÍOS
// Matriz de Materiales, Usos y Tramos Dinámicos de Medidas/Capacidad por Transporte
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    let currentMaterialsList = [];
    let currentUsosList = [];
    let currentFlexDimensions = [];

    // Inicialización del módulo
    function initAdminCortes() {
        const btnTab = document.getElementById('tab-btn-cortes');
        if (btnTab) {
            btnTab.addEventListener('click', () => {
                if (typeof window.switchAdminSection === 'function') {
                    window.switchAdminSection('admin-cortes-view');
                } else {
                    document.querySelectorAll('.admin-section-view').forEach(v => v.style.display = 'none');
                    document.querySelectorAll('.admin-sidebar-btn').forEach(b => b.classList.remove('active'));
                    const view = document.getElementById('admin-cortes-view');
                    if (view) view.style.display = 'block';
                    btnTab.classList.add('active');
                }
                loadCortesConfigToUI();
            });
        }

        // Listener para el botón de guardar
        const btnSave = document.getElementById('btn-save-cortes-config');
        if (btnSave) {
            btnSave.onclick = saveCortesConfigFromUI;
        }
    }

    // Delegación global para el botón de guardar por si los partials se inyectan dinámicamente
    document.addEventListener('click', (e) => {
        const btnSave = e.target.closest('#btn-save-cortes-config');
        if (btnSave) {
            e.preventDefault();
            saveCortesConfigFromUI();
        }
    });

    // Navegación entre los 5 módulos principales de Cortes de Madera
    function switchCortesModuleTab(modName) {
        const tabs = [
            { id: 'materiales', btn: document.getElementById('btn-cortes-mtab-materiales'), panel: document.getElementById('cortes-modpanel-materiales') },
            { id: 'usos', btn: document.getElementById('btn-cortes-mtab-usos'), panel: document.getElementById('cortes-modpanel-usos') },
            { id: 'logistica', btn: document.getElementById('btn-cortes-mtab-logistica'), panel: document.getElementById('cortes-modpanel-logistica') },
            { id: 'descuentos', btn: document.getElementById('btn-cortes-mtab-descuentos'), panel: document.getElementById('cortes-modpanel-descuentos') },
            { id: 'simulador', btn: document.getElementById('btn-cortes-mtab-simulador'), panel: document.getElementById('cortes-modpanel-simulador') }
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

        // Si se entra al simulador, actualizar cálculos de inmediato
        if (modName === 'simulador' && typeof window.updateCortesAdminSimulator === 'function') {
            window.updateCortesAdminSimulator();
        }
    }
    window.switchCortesModuleTab = switchCortesModuleTab;

    // Navegación entre las 3 sub-solapas de logística para cortes
    function switchCortesShippingTab(tabName) {
        const btnFlex = document.getElementById('btn-cortes-tab-flex');
        const btnFlete = document.getElementById('btn-cortes-tab-flete');
        const btnExternas = document.getElementById('btn-cortes-tab-externas');

        const panelFlex = document.getElementById('cortes-ship-panel-flex');
        const panelFlete = document.getElementById('cortes-ship-panel-flete');
        const panelExternas = document.getElementById('cortes-ship-panel-externas');

        const btns = [btnFlex, btnFlete, btnExternas];
        const panels = [panelFlex, panelFlete, panelExternas];

        btns.forEach(b => {
            if (b) {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#475569';
                b.style.boxShadow = 'none';
            }
        });

        panels.forEach(p => {
            if (p) p.style.display = 'none';
        });

        if (tabName === 'flex') {
            if (btnFlex) {
                btnFlex.classList.add('active');
                btnFlex.style.background = '#0F172A';
                btnFlex.style.color = '#FFFFFF';
                btnFlex.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
            if (panelFlex) panelFlex.style.display = 'block';
        } else if (tabName === 'flete') {
            if (btnFlete) {
                btnFlete.classList.add('active');
                btnFlete.style.background = '#0F172A';
                btnFlete.style.color = '#FFFFFF';
                btnFlete.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
            if (panelFlete) panelFlete.style.display = 'block';
        } else if (tabName === 'externas') {
            if (btnExternas) {
                btnExternas.classList.add('active');
                btnExternas.style.background = '#0F172A';
                btnExternas.style.color = '#FFFFFF';
                btnExternas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
            if (panelExternas) panelExternas.style.display = 'block';
        }
    }
    window.switchCortesShippingTab = switchCortesShippingTab;

    // Renderizar grilla interactiva de Materiales y Placas
    function renderMaterialsUI() {
        const container = document.getElementById('cortes-materiales-container');
        if (!container) return;

        container.innerHTML = '';

        if (!currentMaterialsList || currentMaterialsList.length === 0) {
            container.innerHTML = `<div style="padding: 1rem; text-align: center; color: #64748B; font-size: 0.85rem;">No hay materiales cargados. Hacé clic en "Nuevo Material" para agregar uno.</div>`;
            return;
        }

        currentMaterialsList.forEach((mat, idx) => {
            const card = document.createElement('div');
            card.className = 'cortes-material-card';
            card.style.cssText = 'background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.85rem; display: flex; flex-direction: column; gap: 8px;';

            // Espesores disponibles para este material
            const matEspesores = Array.isArray(mat.espesores_disponibles) && mat.espesores_disponibles.length > 0 
                ? mat.espesores_disponibles 
                : ['18 mm', '22 mm'];

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 220px;">
                        <span class="material-symbols-outlined" style="color: #854D0E; font-size: 20px;">layers</span>
                        <input type="text" class="admin-input mat-inp-name" value="${mat.name || ''}" placeholder="Nombre del material o placa" style="font-weight: 700; width: 100%;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">
                            <input type="checkbox" class="mat-chk-activo" ${mat.activo !== false ? 'checked' : ''} style="cursor: pointer;"> Activo
                        </label>
                        <button type="button" class="btn-danger" onclick="window.removeCortesMaterialRow(${idx})" style="padding: 3px 8px; font-size: 0.75rem; border-radius: 6px;" title="Eliminar material">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Largo Placa (cm):</label>
                        <input type="number" class="admin-input mat-inp-max-largo" value="${mat.max_largo || 240}" min="10">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Ancho Placa (cm):</label>
                        <input type="number" class="admin-input mat-inp-max-ancho" value="${mat.max_ancho || 120}" min="10">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #0369A1; margin-bottom: 2px;">⚖️ Peso Placa Entera (kg):</label>
                        <input type="number" class="admin-input mat-inp-peso-placa" value="${mat.peso_placa !== undefined ? mat.peso_placa : (mat.peso_m2 ? Math.round(mat.peso_m2 * ((mat.max_largo || 240) * (mat.max_ancho || 120) / 10000)) : 28)}" step="0.5" min="1" placeholder="Ej: 28" style="font-weight: 700; border-color: #7DD3FC;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #1E293B; margin-bottom: 2px;">💰 Costo Placa Entera ($):</label>
                        <input type="number" class="admin-input mat-inp-costo-placa" value="${mat.costo_placa || Math.round((mat.costo_m2 || 27000) * ((mat.max_largo || 240) * (mat.max_ancho || 120) / 10000))}" step="1000" placeholder="Ej: 75000" style="font-weight: 700; border-color: #CBD5E1;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Costo Base ($/m²):</label>
                        <input type="number" class="admin-input mat-inp-costo" value="${mat.costo_m2 || 27000}" step="500">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #16A34A; margin-bottom: 2px;">📈 Margen Deseado (%):</label>
                        <input type="number" class="admin-input mat-inp-margen-pct" value="${mat.margen_pct !== undefined ? mat.margen_pct : Math.round(((mat.precio_m2 || 48500) / (mat.costo_m2 || 27000) - 1) * 100)}" step="5" min="0" placeholder="Ej: 50" style="font-weight: 800; border-color: #86EFAC; color: #15803D;">
                        <!-- Input oculto para mantener compatibilidad con precio_m2 -->
                        <input type="hidden" class="mat-inp-precio" value="${mat.precio_m2 || 48500}">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Espesores (escribir):</label>
                        <input type="text" class="admin-input mat-inp-espesor" value="${Array.isArray(mat.espesores_disponibles) ? mat.espesores_disponibles.join(', ') : (mat.espesor || mat.espesores_texto || '18 mm, 22 mm')}" placeholder="Ej: 18mm, 22mm">
                    </div>
                </div>

                <!-- Resumen Financiero y Logístico en Vivo: Ganancia, Precio y Peso x m2 -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; background: #F0FDF4; border: 1.5px solid #BBF7D0; padding: 6px 12px; border-radius: 8px;">
                    <div style="font-size: 0.73rem; color: #166534;">
                        📐 Placa: <strong class="mat-lbl-placa-calc">${((mat.max_largo || 240) * (mat.max_ancho || 120) / 10000).toFixed(2)} m²</strong>
                    </div>
                    <div style="font-size: 0.73rem; color: #0369A1;">
                        ⚖️ Densidad: <strong class="mat-lbl-peso-m2-calc">${(((mat.peso_placa !== undefined ? mat.peso_placa : 28) / (((mat.max_largo || 240) * (mat.max_ancho || 120) / 10000) || 1))).toFixed(1)} kg/m²</strong>
                    </div>
                    <div style="font-size: 0.73rem; color: #166534;">
                        🏷️ Venta Corte: <strong class="mat-lbl-precio-corte-calc" style="color: #15803D; font-size: 0.8rem;">$${(mat.precio_m2 || 48500).toLocaleString('es-AR')} / m²</strong>
                    </div>
                    <div style="font-size: 0.73rem; color: #166534;">
                        💵 Ganancia x Placa: <strong class="mat-lbl-ganancia-placa-calc" style="color: #047857; font-size: 0.8rem;">+$${Math.round(((mat.precio_m2 || 48500) - (mat.costo_m2 || 27000)) * ((mat.max_largo || 240) * (mat.max_ancho || 120) / 10000)).toLocaleString('es-AR')}</strong>
                    </div>
                </div>

                <div>
                    <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Mensaje de advertencia si el cliente supera las medidas:</label>
                    <input type="text" class="admin-input mat-inp-limite-msg" value="${mat.limite_mensaje || ''}" placeholder="Ej: Este material viene en placas de hasta 120 cm de ancho...">
                </div>
            `;

            container.appendChild(card);
        });

        // Vincular delegación de eventos al contenedor para cálculo interactivo en vivo
        if (!container.dataset.calcBound) {
            container.dataset.calcBound = "true";

            container.addEventListener('input', (e) => {
                const target = e.target;
                const card = target.closest('.cortes-material-card');
                if (!card) return;

                const inLargo = card.querySelector('.mat-inp-max-largo');
                const inAncho = card.querySelector('.mat-inp-max-ancho');
                const inCostoPlaca = card.querySelector('.mat-inp-costo-placa');
                const inCostoM2 = card.querySelector('.mat-inp-costo');
                const inMargenPct = card.querySelector('.mat-inp-margen-pct');
                const inPrecioM2 = card.querySelector('.mat-inp-precio');

                const lblPlaca = card.querySelector('.mat-lbl-placa-calc');
                const lblPrecioCorte = card.querySelector('.mat-lbl-precio-corte-calc');
                const lblGananciaPlaca = card.querySelector('.mat-lbl-ganancia-placa-calc');

                const largo = parseFloat(inLargo?.value) || 240;
                const ancho = parseFloat(inAncho?.value) || 120;
                const m2 = (largo * ancho) / 10000;

                // 1. Si cambia costo de placa o medidas -> calcular Costo por m2
                if (target.classList.contains('mat-inp-costo-placa') || target.classList.contains('mat-inp-max-largo') || target.classList.contains('mat-inp-max-ancho')) {
                    const costoPlaca = parseFloat(inCostoPlaca?.value) || 0;
                    if (m2 > 0 && inCostoM2) {
                        const calculatedCostoM2 = Math.round(costoPlaca / m2);
                        inCostoM2.value = calculatedCostoM2;
                    }
                } else if (target.classList.contains('mat-inp-costo')) {
                    // Si se escribe directo el Costo por m2 -> calcular costo placa entera
                    const costoM2 = parseFloat(inCostoM2?.value) || 0;
                    if (inCostoPlaca) {
                        inCostoPlaca.value = Math.round(costoM2 * m2);
                    }
                }

                // 2. Calcular Precio Venta por m2 según el Margen Deseado (%)
                const finalCostoM2 = parseFloat(inCostoM2?.value) || 0;
                const margenPct = parseFloat(inMargenPct?.value) || 0;
                const calculatedPrecioM2 = Math.round(finalCostoM2 * (1 + (margenPct / 100)));
                
                if (inPrecioM2) {
                    inPrecioM2.value = calculatedPrecioM2;
                }

                // 3. Actualizar resumen financiero
                if (lblPlaca && m2 > 0) {
                    lblPlaca.textContent = `${m2.toFixed(2)} m²`;
                }

                if (lblPrecioCorte) {
                    lblPrecioCorte.textContent = `$${calculatedPrecioM2.toLocaleString('es-AR')} / m²`;
                }

                if (lblGananciaPlaca && m2 > 0) {
                    const costoPlacaTotal = parseFloat(inCostoPlaca?.value) || (finalCostoM2 * m2);
                    const ventaPlacaTotal = calculatedPrecioM2 * m2;
                    const gananciaPlaca = Math.round(ventaPlacaTotal - costoPlacaTotal);
                    lblGananciaPlaca.textContent = `+$${gananciaPlaca.toLocaleString('es-AR')}`;
                }
            });
        }
    }

    // Funciones de cálculo interactivo de Placa Entera vs Costo m2
    window.recalcMatFromPlacaCosto = function(inputEl) {
        const card = inputEl.closest('div[style*="background: #F8FAFC"]') || inputEl.closest('div');
        if (!card) return;
        const largo = parseFloat(card.querySelector('.mat-inp-max-largo')?.value) || 240;
        const ancho = parseFloat(card.querySelector('.mat-inp-max-ancho')?.value) || 120;
        const costoPlaca = parseFloat(inputEl.value) || 0;
        const m2 = (largo * ancho) / 10000;
        
        if (m2 > 0) {
            const costoM2 = Math.round(costoPlaca / m2);
            const inCostoM2 = card.querySelector('.mat-inp-costo');
            if (inCostoM2) inCostoM2.value = costoM2;

            // Actualizar labels visuales
            const lblPlaca = card.querySelector('.mat-lbl-placa-calc');
            if (lblPlaca) lblPlaca.innerHTML = `📐 Placa: <strong>${m2.toFixed(2)} m²</strong>`;
            
            const precioM2 = parseFloat(card.querySelector('.mat-inp-precio')?.value) || 0;
            const lblMargen = card.querySelector('.mat-lbl-margen-calc');
            if (lblMargen && costoM2 > 0) {
                const margen = Math.round(((precioM2 / costoM2) - 1) * 100);
                lblMargen.innerHTML = `Margen s/costo: <strong>${margen}%</strong>`;
            }
        }
    };

    window.recalcMatFromM2Costo = function(inputEl) {
        const card = inputEl.closest('div[style*="background: #F8FAFC"]') || inputEl.closest('div');
        if (!card) return;
        const largo = parseFloat(card.querySelector('.mat-inp-max-largo')?.value) || 240;
        const ancho = parseFloat(card.querySelector('.mat-inp-max-ancho')?.value) || 120;
        const costoM2 = parseFloat(inputEl.value) || 0;
        const m2 = (largo * ancho) / 10000;
        
        const inCostoPlaca = card.querySelector('.mat-inp-costo-placa');
        if (inCostoPlaca) inCostoPlaca.value = Math.round(costoM2 * m2);

        const precioM2 = parseFloat(card.querySelector('.mat-inp-precio')?.value) || 0;
        const lblMargen = card.querySelector('.mat-lbl-margen-calc');
        if (lblMargen && costoM2 > 0) {
            const margen = Math.round(((precioM2 / costoM2) - 1) * 100);
            lblMargen.innerHTML = `Margen s/costo: <strong>${margen}%</strong>`;
        }
    };

    window.recalcMatRowPrices = function(inputEl) {
        const card = inputEl.closest('div[style*="background: #F8FAFC"]') || inputEl.closest('div');
        if (!card) return;
        const inCostoPlaca = card.querySelector('.mat-inp-costo-placa');
        if (inCostoPlaca) window.recalcMatFromPlacaCosto(inCostoPlaca);
    };

    window.addCortesMaterialRow = function() {
        // Preservar lo que el usuario haya editado en los inputs antes de agregar
        currentMaterialsList = getMaterialsFromUI();
        if (!Array.isArray(currentMaterialsList)) currentMaterialsList = [];
        currentMaterialsList.push({
            id: 'mat_' + Date.now(),
            name: 'Nuevo Tablero / Madera',
            precio_m2: 55000,
            costo_m2: 32000,
            costo_placa: 46080,
            max_largo: 240,
            max_ancho: 60,
            espesores_disponibles: ["18 mm", "22 mm"],
            limite_mensaje: 'El tablero seleccionado viene en placas de hasta 60 cm de ancho.',
            activo: true
        });
        renderMaterialsUI();
    };

    window.removeCortesMaterialRow = function(idx) {
        // Preservar lo editado en los inputs antes de remover
        currentMaterialsList = getMaterialsFromUI();
        if (!Array.isArray(currentMaterialsList) || idx < 0 || idx >= currentMaterialsList.length) return;
        
        const matName = currentMaterialsList[idx]?.name || 'este material';
        if (!confirm(`¿Deseás eliminar "${matName}" de la lista?`)) return;
        
        currentMaterialsList.splice(idx, 1);
        renderMaterialsUI();
    };

    // Extraer datos vivos de la UI de materiales
    function getMaterialsFromUI() {
        const container = document.getElementById('cortes-materiales-container');
        if (!container) return currentMaterialsList;

        const cards = container.children;
        const result = [];

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const name = card.querySelector('.mat-inp-name')?.value.trim() || 'Madera ' + (i + 1);
            const activo = card.querySelector('.mat-chk-activo')?.checked !== false;
            const precio = parseFloat(card.querySelector('.mat-inp-precio')?.value) || 48500;
            const costo = parseFloat(card.querySelector('.mat-inp-costo')?.value) || 27000;
            const costoPlaca = parseFloat(card.querySelector('.mat-inp-costo-placa')?.value) || 0;
            const maxLargo = parseFloat(card.querySelector('.mat-inp-max-largo')?.value) || 240;
            const maxAncho = parseFloat(card.querySelector('.mat-inp-max-ancho')?.value) || 60;
            const msg = card.querySelector('.mat-inp-limite-msg')?.value.trim() || '';

            // Extraer espesores ingresados por texto (ej: "18mm, 22mm, 30mm" o "1 pulgada, 2 pulgadas")
            const rawEspesorText = card.querySelector('.mat-inp-espesor')?.value.trim() || '18 mm, 22 mm';
            const espesoresArray = rawEspesorText.split(',').map(s => s.trim()).filter(Boolean);

            const origId = (currentMaterialsList[i] && currentMaterialsList[i].id) 
                ? currentMaterialsList[i].id 
                : name.toLowerCase().replace(/[^a-z0-9]/g, '_');

            const inMargenPct = parseFloat(card.querySelector('.mat-inp-margen-pct')?.value);
            const margenPct = !isNaN(inMargenPct) ? inMargenPct : Math.round(((precio / (costo || 1)) - 1) * 100);

            const m2Total = (maxLargo * maxAncho) / 10000;
            const pesoPlaca = parseFloat(card.querySelector('.mat-inp-peso-placa')?.value) || 28;
            const pesoM2 = m2Total > 0 ? parseFloat((pesoPlaca / m2Total).toFixed(2)) : 10;

            result.push({
                id: origId,
                name: name,
                precio_m2: precio,
                costo_m2: costo,
                costo_placa: costoPlaca,
                peso_placa: pesoPlaca,
                peso_m2: pesoM2,
                margen_pct: margenPct,
                max_largo: maxLargo,
                max_ancho: maxAncho,
                espesores_disponibles: espesoresArray.length > 0 ? espesoresArray : ['18 mm', '22 mm'],
                espesor: rawEspesorText,
                limite_mensaje: msg,
                activo: activo,
                is_default: (i === 0)
            });
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDERIZADO Y CONTROL DINÁMICO DE TIPOS DE CORTE / USOS (ANTI-AVIVADAS)
    // ═══════════════════════════════════════════════════════════════════════════
    function renderUsosUI() {
        const container = document.getElementById('cortes-usos-container');
        if (!container) return;

        container.innerHTML = '';

        if (!currentUsosList || currentUsosList.length === 0) {
            container.innerHTML = `<div style="padding: 1rem; text-align: center; color: #64748B; font-size: 0.85rem; background: #F8FAFC; border-radius: 8px; border: 1px dashed #CBD5E1;">No hay tipos de corte configurados. Hacé clic en "Nuevo Tipo de Corte / Destino".</div>`;
            return;
        }

        currentUsosList.forEach((uso, idx) => {
            const card = document.createElement('div');
            card.className = 'cortes-uso-card';
            card.style.cssText = 'background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.85rem; display: flex; flex-direction: column; gap: 8px;';

            // Conversión transparente: Si viene como multiplicador decimal viejo (ej 1.25 -> 25%, 1.0 -> 0%), lo convertimos a porcentaje amigable
            let rawFactor = (uso.factor_precio !== undefined && uso.factor_precio !== null) ? Number(uso.factor_precio) : 0;
            let displayPct = 0;
            if (rawFactor > 0 && rawFactor <= 3) {
                // Decimal clásico tipo 1.25 (+25%) o 1.0 (+0%)
                displayPct = Math.round((rawFactor - 1.0) * 100);
            } else {
                // Ya guardado como porcentaje directo (ej: 0, 25, 50, 75, 80)
                displayPct = Math.round(rawFactor);
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 220px;">
                        <span class="material-symbols-outlined" style="color: #4338CA; font-size: 20px;">carpenter</span>
                        <input type="text" class="admin-input uso-inp-nombre" value="${uso.name || ''}" placeholder="Ej: Estantería Base, Tapa Escritorio, Listón..." style="font-weight: 700; width: 100%;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">
                            <input type="checkbox" class="uso-chk-activo" ${uso.activo !== false ? 'checked' : ''} style="cursor: pointer;"> Activo
                        </label>
                        <button type="button" class="btn-danger" onclick="window.removeCortesUsoRow(${idx})" style="padding: 3px 8px; font-size: 0.75rem; border-radius: 6px;" title="Eliminar este tipo de corte">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Ancho Mín (cm):</label>
                        <input type="number" class="admin-input uso-inp-min-ancho" value="${uso.min_ancho || 0}" min="0" oninput="window.updateCortesAdminSimulator()">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Ancho Máx (cm):</label>
                        <input type="number" class="admin-input uso-inp-max-ancho" value="${uso.max_ancho || 999}" min="0" oninput="window.updateCortesAdminSimulator()">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Largo Mín (cm):</label>
                        <input type="number" class="admin-input uso-inp-min-largo" value="${uso.min_largo || 0}" min="0" oninput="window.updateCortesAdminSimulator()">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Largo Máx (cm):</label>
                        <input type="number" class="admin-input uso-inp-max-largo" value="${uso.max_largo || 999}" min="0" oninput="window.updateCortesAdminSimulator()">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #4338CA; margin-bottom: 2px;">Ganancia / Margen (+%):</label>
                        <div style="display: flex; align-items: center; position: relative;">
                            <input type="number" class="admin-input uso-inp-factor" value="${displayPct}" step="5" min="-50" max="500" placeholder="0" title="Ej: 25 para +25%, 50 para +50%, 0 para precio base" style="font-weight: 800; padding-right: 24px; color: #4338CA;" oninput="window.updateCortesAdminSimulator()">
                            <span style="position: absolute; right: 8px; font-size: 0.75rem; font-weight: 800; color: #6366F1; pointer-events: none;">%</span>
                        </div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #16A34A; margin-bottom: 2px;">Plus Preparación ($):</label>
                        <input type="number" class="admin-input uso-inp-fijo" value="${uso.recargo_fijo || 0}" step="100" min="0" style="font-weight: 700;" oninput="window.updateCortesAdminSimulator()">
                    </div>
                </div>

                <div>
                    <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Descripción / Etiqueta visible al calcular:</label>
                    <input type="text" class="admin-input uso-inp-desc" value="${uso.desc || ''}" placeholder="Ej: Tablas angostas de pared. Cortes rectos y cepillado estándar...">
                </div>
            `;

            container.appendChild(card);
        });
    }

    window.addCortesUsoRow = function() {
        currentUsosList = getUsosFromUI();
        if (!Array.isArray(currentUsosList)) currentUsosList = [];
        currentUsosList.push({
            id: 'uso_' + Date.now(),
            name: 'Nuevo Tipo de Corte',
            min_ancho: 0,
            max_ancho: 120,
            min_largo: 0,
            max_largo: 240,
            factor_precio: 0, // 0% de ganancia extra por defecto
            recargo_fijo: 0,
            desc: 'Corte estándar de taller.',
            activo: true
        });
        renderUsosUI();
        renderFlexDimensionsUI();
        updateLiveSimulator();
    };

    window.removeCortesUsoRow = function(idx) {
        currentUsosList = getUsosFromUI();
        if (!Array.isArray(currentUsosList) || idx < 0 || idx >= currentUsosList.length) return;
        const uName = currentUsosList[idx]?.name || 'este tipo de corte';
        if (!confirm(`¿Deseás eliminar "${uName}" de la lista?`)) return;
        currentUsosList.splice(idx, 1);
        renderUsosUI();
        renderFlexDimensionsUI();
        updateLiveSimulator();
    };

    function getUsosFromUI() {
        const container = document.getElementById('cortes-usos-container');
        if (!container) return currentUsosList;

        const cards = container.children;
        const result = [];

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const name = card.querySelector('.uso-inp-nombre')?.value.trim() || `Tipo de Corte ${i + 1}`;
            const activo = card.querySelector('.uso-chk-activo')?.checked !== false;
            const minAncho = parseFloat(card.querySelector('.uso-inp-min-ancho')?.value) || 0;
            const maxAncho = parseFloat(card.querySelector('.uso-inp-max-ancho')?.value) || 999;
            const minLargo = parseFloat(card.querySelector('.uso-inp-min-largo')?.value) || 0;
            const maxLargo = parseFloat(card.querySelector('.uso-inp-max-largo')?.value) || 999;
            const pctVal = parseFloat(card.querySelector('.uso-inp-factor')?.value);
            const factor = isNaN(pctVal) ? 0 : pctVal; // Se guarda directamente el número de porcentaje (ej: 0, 25, 50, 75)
            const fijo = parseFloat(card.querySelector('.uso-inp-fijo')?.value) || 0;
            const desc = card.querySelector('.uso-inp-desc')?.value.trim() || '';

            const origId = (currentUsosList[i] && currentUsosList[i].id) 
                ? currentUsosList[i].id 
                : name.toLowerCase().replace(/[^a-z0-9]/g, '_');

            result.push({
                id: origId,
                name: name,
                min_ancho: minAncho,
                max_ancho: maxAncho,
                min_largo: minLargo,
                max_largo: maxLargo,
                factor_precio: factor,
                recargo_fijo: fijo,
                desc: desc,
                activo: activo,
                is_default: (i === 0)
            });
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDERIZADO Y CONTROL DE TRAMOS DINÁMICOS DE DIMENSIONES (FLEX / LOGÍSTICA)
    // Sincronizado automáticamente con los Tipos de Corte / Usos (Anti-avivadas)
    // ═══════════════════════════════════════════════════════════════════════════
    function renderFlexDimensionsUI() {
        const container = document.getElementById('cortes-flex-dimensiones-container');
        if (!container) return;

        container.innerHTML = '';

        // Obtenemos los usos configurados en la pestaña 2
        const usos = getUsosFromUI();

        if (!usos || usos.length === 0) {
            container.innerHTML = `<div style="padding: 0.75rem; color: #64748B; font-size: 0.75rem; text-align: center; background: #F8FAFC; border-radius: 8px; border: 1px dashed #CBD5E1;">No hay tipos de corte configurados en la pestaña "Usos". Agregá uno allí para vincular su logística Flex.</div>`;
            return;
        }

        // Mapear con la configuración guardada previa de flex para preservar checkbox 'permite_flex' y 'max_unidades'
        usos.forEach((uso, idx) => {
            const usoId = uso.id || ('uso_' + idx);
            // Buscar si ya existía configuración de flex para este uso
            const savedFlex = (Array.isArray(currentFlexDimensions) ? currentFlexDimensions : []).find(d => d.uso_id === usoId || d.nombre === uso.name) || {};
            
            const permiteFlex = savedFlex.permite_flex !== false;
            const maxUnits = savedFlex.max_unidades || (uso.max_ancho <= 40 ? 6 : (uso.max_ancho <= 80 ? 3 : 2));
            const maxLargo = uso.max_largo || 999;
            const maxAncho = uso.max_ancho || 999;

            const row = document.createElement('div');
            row.className = 'cortes-flex-sync-row';
            row.dataset.usoId = usoId;
            row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 8px; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px;';

            row.innerHTML = `
                <div>
                    <label style="display: block; font-size: 0.65rem; font-weight: 700; color: #475569; margin-bottom: 2px;">Tipo de Corte (Uso):</label>
                    <div style="font-weight: 700; font-size: 0.8rem; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" class="dim-txt-nombre" title="${uso.name}">
                        ${uso.name}
                    </div>
                </div>
                <div>
                    <label style="display: block; font-size: 0.65rem; font-weight: 700; color: #64748B; margin-bottom: 2px;">Hasta Largo:</label>
                    <div style="font-size: 0.78rem; font-weight: 800; color: #334155; background: #EDF2F7; padding: 4px 8px; border-radius: 6px;">
                        ${maxLargo >= 999 ? 'Sin límite' : maxLargo + ' cm'}
                    </div>
                    <input type="hidden" class="dim-inp-largo" value="${maxLargo}">
                </div>
                <div>
                    <label style="display: block; font-size: 0.65rem; font-weight: 700; color: #64748B; margin-bottom: 2px;">Hasta Ancho:</label>
                    <div style="font-size: 0.78rem; font-weight: 800; color: #334155; background: #EDF2F7; padding: 4px 8px; border-radius: 6px;">
                        ${maxAncho >= 999 ? 'Sin límite' : maxAncho + ' cm'}
                    </div>
                    <input type="hidden" class="dim-inp-ancho" value="${maxAncho}">
                </div>
                <div>
                    <label style="display: block; font-size: 0.65rem; font-weight: 700; color: #0284C7; margin-bottom: 2px;">Capacidad Máx:</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="number" class="admin-input dim-inp-qty" value="${maxUnits}" min="1" max="20" style="padding: 4px 6px; font-size: 0.75rem; width: 100%; font-weight: 700;">
                        <span style="font-size: 0.68rem; color: #64748B;">u.</span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <label style="display: block; font-size: 0.65rem; font-weight: 700; color: #475569; margin-bottom: 3px;">Habilitar Flex:</label>
                    <label style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                        <input type="checkbox" class="dim-chk-permite-flex" ${permiteFlex ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                        <span style="color: ${permiteFlex ? '#16A34A' : '#DC2626'}; font-size: 0.7rem;">${permiteFlex ? 'Permitido' : 'Bloqueado'}</span>
                    </label>
                </div>
            `;

            // Toggle color en el checkbox
            const chk = row.querySelector('.dim-chk-permite-flex');
            const chkSpan = row.querySelector('span');
            if (chk) {
                chk.addEventListener('change', () => {
                    const active = chk.checked;
                    const spanLabel = chk.parentElement.querySelector('span');
                    if (spanLabel) {
                        spanLabel.textContent = active ? 'Permitido' : 'Bloqueado';
                        spanLabel.style.color = active ? '#16A34A' : '#DC2626';
                    }
                });
            }

            container.appendChild(row);
        });
    }

    function getFlexDimensionsFromUI() {
        const container = document.getElementById('cortes-flex-dimensiones-container');
        if (!container) return currentFlexDimensions;

        const rows = container.children;
        const result = [];
        const usos = getUsosFromUI();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.classList?.contains('cortes-flex-sync-row')) continue;

            const usoId = row.dataset.usoId;
            const matchingUso = usos.find((u, idx) => (u.id === usoId || ('uso_' + idx) === usoId)) || usos[i];

            const nombre = matchingUso?.name || row.querySelector('.dim-txt-nombre')?.textContent.trim() || `Bulto ${i + 1}`;
            const largo = matchingUso?.max_largo || parseFloat(row.querySelector('.dim-inp-largo')?.value) || 60;
            const ancho = matchingUso?.max_ancho || parseFloat(row.querySelector('.dim-inp-ancho')?.value) || 25;
            const qty = parseInt(row.querySelector('.dim-inp-qty')?.value) || 3;
            const permiteFlex = row.querySelector('.dim-chk-permite-flex')?.checked !== false;

            result.push({
                uso_id: usoId || (matchingUso?.id),
                nombre: nombre,
                max_largo: largo,
                max_ancho: ancho,
                max_unidades: qty,
                permite_flex: permiteFlex
            });
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDERIZADO Y CONTROL DE ESCALAS DE DESCUENTO DINÁMICAS EN FLEX
    // ═══════════════════════════════════════════════════════════════════════════
    let currentFlexDiscountScales = [
        { minQty: 2, discountPercent: 20 },
        { minQty: 4, discountPercent: 40 }
    ];

    function renderFlexDiscountScalesUI() {
        const container = document.getElementById('cortes-flex-escalas-container');
        if (!container) return;

        container.innerHTML = '';

        if (!currentFlexDiscountScales || currentFlexDiscountScales.length === 0) {
            container.innerHTML = `<div style="padding: 0.5rem; text-align: center; color: #64748B; font-size: 0.72rem; background: #F8FAFC; border-radius: 6px; border: 1px dashed #CBD5E1;">No hay escalas de descuento configuradas. Hacé clic en "Agregar Escala".</div>`;
            return;
        }

        currentFlexDiscountScales.forEach((esc, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 6px 10px;';

            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-size: 0.7rem; font-weight: 700; color: #475569; white-space: nowrap;">A partir de:</label>
                    <input type="number" class="admin-input flex-esc-inp-qty" value="${esc.minQty || 2}" min="1" max="99" style="width: 70px; padding: 4px 6px; font-size: 0.75rem; font-weight: 700;">
                    <span style="font-size: 0.7rem; color: #64748B;">tablas</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-size: 0.7rem; font-weight: 700; color: #0284C7; white-space: nowrap;">Descuento:</label>
                    <input type="number" class="admin-input flex-esc-inp-pct" value="${esc.discountPercent || 15}" min="1" max="100" style="width: 70px; padding: 4px 6px; font-size: 0.75rem; font-weight: 700;">
                    <span style="font-size: 0.7rem; color: #64748B;">% OFF</span>
                </div>
                <button type="button" class="btn-danger" onclick="window.removeCortesFlexDiscountScaleRow(${idx})" style="padding: 3px 6px; border-radius: 6px;" title="Eliminar escala">
                    <span class="material-symbols-outlined" style="font-size: 15px;">delete</span>
                </button>
            `;

            container.appendChild(row);
        });
    }

    window.addCortesFlexDiscountScaleRow = function() {
        currentFlexDiscountScales = getFlexDiscountScalesFromUI();
        if (!Array.isArray(currentFlexDiscountScales)) currentFlexDiscountScales = [];
        const lastQty = currentFlexDiscountScales.length > 0 ? (currentFlexDiscountScales[currentFlexDiscountScales.length - 1].minQty + 2) : 2;
        const lastPct = currentFlexDiscountScales.length > 0 ? Math.min(100, currentFlexDiscountScales[currentFlexDiscountScales.length - 1].discountPercent + 15) : 20;

        currentFlexDiscountScales.push({ minQty: lastQty, discountPercent: lastPct });
        renderFlexDiscountScalesUI();
    };

    window.removeCortesFlexDiscountScaleRow = function(idx) {
        currentFlexDiscountScales = getFlexDiscountScalesFromUI();
        if (!Array.isArray(currentFlexDiscountScales) || idx < 0 || idx >= currentFlexDiscountScales.length) return;
        currentFlexDiscountScales.splice(idx, 1);
        renderFlexDiscountScalesUI();
    };

    function getFlexDiscountScalesFromUI() {
        const container = document.getElementById('cortes-flex-escalas-container');
        if (!container) return currentFlexDiscountScales;

        const rows = container.children;
        const result = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const inQty = row.querySelector('.flex-esc-inp-qty');
            const inPct = row.querySelector('.flex-esc-inp-pct');
            if (inQty && inPct) {
                const q = parseInt(inQty.value) || 0;
                const p = parseFloat(inPct.value) || 0;
                if (q > 0 && p > 0) {
                    result.push({ minQty: q, discountPercent: p });
                }
            }
        }

        return result.sort((a, b) => a.minQty - b.minQty);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDERIZADO Y CONTROL DE ESCALAS DE DESCUENTO DINÁMICAS EN FLETE PROPIO
    // ═══════════════════════════════════════════════════════════════════════════
    let currentFleteDiscountScales = [
        { minQty: 5, discountPercent: 25 },
        { minQty: 10, discountPercent: 50 }
    ];

    function renderFleteDiscountScalesUI() {
        const container = document.getElementById('cortes-flete-escalas-container');
        if (!container) return;

        container.innerHTML = '';

        if (!currentFleteDiscountScales || currentFleteDiscountScales.length === 0) {
            container.innerHTML = `<div style="padding: 0.5rem; text-align: center; color: #64748B; font-size: 0.72rem; background: #F8FAFC; border-radius: 6px; border: 1px dashed #CBD5E1;">No hay escalas de descuento configuradas. Hacé clic en "Agregar Escala".</div>`;
            return;
        }

        currentFleteDiscountScales.forEach((esc, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 6px 10px;';

            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-size: 0.7rem; font-weight: 700; color: #475569; white-space: nowrap;">A partir de:</label>
                    <input type="number" class="admin-input flete-esc-inp-qty" value="${esc.minQty || 5}" min="1" max="999" style="width: 70px; padding: 4px 6px; font-size: 0.75rem; font-weight: 700;">
                    <span style="font-size: 0.7rem; color: #64748B;">tablas</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-size: 0.7rem; font-weight: 700; color: #0284C7; white-space: nowrap;">Descuento:</label>
                    <input type="number" class="admin-input flete-esc-inp-pct" value="${esc.discountPercent || 25}" min="1" max="100" style="width: 70px; padding: 4px 6px; font-size: 0.75rem; font-weight: 700;">
                    <span style="font-size: 0.7rem; color: #64748B;">% OFF</span>
                </div>
                <button type="button" class="btn-danger" onclick="window.removeCortesFleteDiscountScaleRow(${idx})" style="padding: 3px 6px; border-radius: 6px;" title="Eliminar escala">
                    <span class="material-symbols-outlined" style="font-size: 15px;">delete</span>
                </button>
            `;

            container.appendChild(row);
        });
    }

    window.addCortesFleteDiscountScaleRow = function() {
        currentFleteDiscountScales = getFleteDiscountScalesFromUI();
        if (!Array.isArray(currentFleteDiscountScales)) currentFleteDiscountScales = [];
        const lastQty = currentFleteDiscountScales.length > 0 ? (currentFleteDiscountScales[currentFleteDiscountScales.length - 1].minQty + 5) : 5;
        const lastPct = currentFleteDiscountScales.length > 0 ? Math.min(100, currentFleteDiscountScales[currentFleteDiscountScales.length - 1].discountPercent + 25) : 25;

        currentFleteDiscountScales.push({ minQty: lastQty, discountPercent: lastPct });
        renderFleteDiscountScalesUI();
    };

    window.removeCortesFleteDiscountScaleRow = function(idx) {
        currentFleteDiscountScales = getFleteDiscountScalesFromUI();
        if (!Array.isArray(currentFleteDiscountScales) || idx < 0 || idx >= currentFleteDiscountScales.length) return;
        currentFleteDiscountScales.splice(idx, 1);
        renderFleteDiscountScalesUI();
    };

    function getFleteDiscountScalesFromUI() {
        const container = document.getElementById('cortes-flete-escalas-container');
        if (!container) return currentFleteDiscountScales;

        const rows = container.children;
        const result = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const inQty = row.querySelector('.flete-esc-inp-qty');
            const inPct = row.querySelector('.flete-esc-inp-pct');
            if (inQty && inPct) {
                const q = parseInt(inQty.value) || 0;
                const p = parseFloat(inPct.value) || 0;
                if (q > 0 && p > 0) {
                    result.push({ minQty: q, discountPercent: p });
                }
            }
        }

        return result.sort((a, b) => a.minQty - b.minQty);
    }
    function loadCortesConfigToUI() {
        const conf = window.cortesConfig || {
            precios: { precio_m2_venta: 48500, costo_m2_base: 27000, minimo_corte_taller: 3500 },
            materiales: [
                { id: "pino_macizo", name: "Pino Macizo / Finger Joint", precio_m2: 48500, costo_m2: 27000, max_largo: 300, max_ancho: 120, limite_mensaje: "", activo: true, is_default: true },
                { id: "eucalipto_tablillado", name: "Eucalipto Alistonado / Tablillado", precio_m2: 68000, costo_m2: 42000, max_largo: 240, max_ancho: 60, limite_mensaje: "El tablero de Eucalipto viene en ancho máximo de 60 cm y largo de 240 cm.", activo: true, is_default: false },
                { id: "paraiso_alistonado", name: "Paraíso Alistonado", precio_m2: 82000, costo_m2: 52000, max_largo: 240, max_ancho: 60, limite_mensaje: "El tablero de Paraíso viene en ancho máximo de 60 cm y largo de 240 cm.", activo: true, is_default: false }
            ],
            usos: [
                { id: "estante", name: "Estantería / Repisa", factor_precio: 1.0, recargo_fijo: 0 },
                { id: "escritorio_mesa", name: "Tapa de Escritorio / Mesa", factor_precio: 1.25, recargo_fijo: 2500 },
                { id: "escalon", name: "Escalón / Tránsito Pesado", factor_precio: 1.15, recargo_fijo: 1800 }
            ],
            acabados: [
                { id: "natural", name: "Natural Cepillado", extra_price: 0, cost_price: 0 },
                { id: "encerado", name: "Tinte / Encerado Nogal o Cedro", extra_price: 2000, cost_price: 800 },
                { id: "barnizado", name: "Barniz Poliuretánico Satinado", extra_price: 3800, cost_price: 1500 }
            ],
            descuentos: {
                activo: true,
                escalas: [{ minQty: 3, discountPercent: 10 }, { minQty: 6, discountPercent: 15 }]
            },
            logistica: {
                max_largo_flex: 100, max_ancho_flex: 35, max_unidades_flex: 3, aviso_flete_excedido: "",
                flex: { 
                    activo: true, costo_caba: 8000, costo_cordon_1: 10000, costo_cordon_2: 12000,
                    dimensiones: [
                        { nombre: "Bulto Pequeño (Estantes chicos)", max_largo: 60, max_ancho: 25, max_unidades: 8 },
                        { nombre: "Bulto Mediano (Estantes estándar)", max_largo: 100, max_ancho: 35, max_unidades: 4 },
                        { nombre: "Bulto Límite Moto / Courier", max_largo: 120, max_ancho: 40, max_unidades: 2 }
                    ],
                    beneficios: { activo: true, envioGratisMin: 3, descuentoTarifaPct: 25, descuentoTarifaMin: 2 }
                },
                flete: { 
                    activo: true, costo_zona_1: 4500, costo_zona_2: 20000, costo_zona_3: 55000, fuera_rango_mensaje: "", permite_retiro_taller: true,
                    beneficios: { activo: true, envioGratisMin: 10, descuentoTarifaPct: 50, descuentoTarifaMin: 5 }
                },
                externas: { 
                    activo: true, recargo_embalaje: 3500, empresas_habilitadas: "Vía Cargo, Andreani, Correo Argentino", nota_despacho: "", aviso_roturas: "",
                    beneficios: { activo: true, embalajeGratisMin: 4, descuentoEmbalajePct: 50, descuentoEmbalajeMin: 2 }
                }
            }
        };

        // Materiales
        currentMaterialsList = Array.isArray(conf.materiales) ? [...conf.materiales] : [];
        renderMaterialsUI();

        // Tramos de dimensiones Flex
        if (conf.logistica?.flex?.dimensiones && Array.isArray(conf.logistica.flex.dimensiones)) {
            currentFlexDimensions = [...conf.logistica.flex.dimensiones];
        } else {
            currentFlexDimensions = [
                { nombre: "Bulto Pequeño", max_largo: 60, max_ancho: 25, max_unidades: 8 },
                { nombre: "Bulto Mediano", max_largo: 100, max_ancho: 35, max_unidades: 4 },
                { nombre: "Bulto Límite Moto", max_largo: 120, max_ancho: 40, max_unidades: 2 }
            ];
        }
        renderFlexDimensionsUI();

        // Usos y Tipos de Corte Dinámicos (Anti-avivadas)
        if (conf.usos && Array.isArray(conf.usos) && conf.usos.length > 0) {
            currentUsosList = [...conf.usos];
        } else {
            currentUsosList = [
                { id: "estante", name: "Estantería / Repisas (Base)", min_ancho: 0, max_ancho: 35, min_largo: 0, max_largo: 120, factor_precio: 1.0, recargo_fijo: 0, desc: "Tablas angostas de pared. Cortes rectos y cepillado estándar.", activo: true, is_default: true },
                { id: "escritorio_mesa", name: "Tapa Escritorio / Mesada (Lijado Fino)", min_ancho: 36, max_ancho: 120, min_largo: 0, max_largo: 300, factor_precio: 1.25, recargo_fijo: 2500, desc: "Selección de vetas, escuadrado especial y lijado fino al tacto.", activo: true, is_default: false },
                { id: "escalon", name: "Escalón / Tránsito Pesado", min_ancho: 20, max_ancho: 40, min_largo: 0, max_largo: 150, factor_precio: 1.15, recargo_fijo: 1800, desc: "Madera de alta resistencia con cantos boleados para pisada segura.", activo: true, is_default: false }
            ];
        }
        renderUsosUI();

        // Renderizar Productos Predeterminados detectados en la categoría cortes-madera
        renderPreconfiguredProductsUI();

        // Precios base / Mínimo de Taller
        const inMinimo = document.getElementById('inp-cortes-minimo');
        if (inMinimo) inMinimo.value = conf.precios?.minimo_corte_taller || 3500;

        // Acabados
        const encerado = conf.acabados?.find(a => a.id === 'encerado') || { extra_price: 2000, cost_price: 800 };
        const barniz = conf.acabados?.find(a => a.id === 'barnizado') || { extra_price: 3800, cost_price: 1500 };

        const inEnceradoVenta = document.getElementById('inp-cortes-encerado-venta');
        const inEnceradoCosto = document.getElementById('inp-cortes-encerado-costo');
        const inBarnizVenta = document.getElementById('inp-cortes-barniz-venta');
        const inBarnizCosto = document.getElementById('inp-cortes-barniz-costo');

        if (inEnceradoVenta) inEnceradoVenta.value = encerado.extra_price;
        if (inEnceradoCosto) inEnceradoCosto.value = encerado.cost_price;
        if (inBarnizVenta) inBarnizVenta.value = barniz.extra_price;
        if (inBarnizCosto) inBarnizCosto.value = barniz.cost_price;

        // Solapa 1: Logística Flex
        const inFlexCaba = document.getElementById('inp-cortes-flex-caba');
        const inFlexCord1 = document.getElementById('inp-cortes-flex-cordon1');
        const inFlexCord2 = document.getElementById('inp-cortes-flex-cordon2');
        const inAviso = document.getElementById('inp-cortes-aviso-flete');

        const inFlexMaxL = document.getElementById('inp-cortes-flex-max-largo');
        const inFlexMaxW = document.getElementById('inp-cortes-flex-max-ancho');
        const inFlexMaxH = document.getElementById('inp-cortes-flex-max-alto');
        const inFlexMaxPeso = document.getElementById('inp-cortes-flex-max-peso');
        const inFlexMaxUnits = document.getElementById('inp-cortes-flex-max-unidades');

        if (inFlexMaxL) inFlexMaxL.value = conf.logistica?.flex?.max_largo ?? (conf.logistica?.max_largo_flex ?? 140);
        if (inFlexMaxW) inFlexMaxW.value = conf.logistica?.flex?.max_ancho ?? (conf.logistica?.max_ancho_flex ?? 60);
        if (inFlexMaxH) inFlexMaxH.value = conf.logistica?.flex?.max_alto ?? 20;
        if (inFlexMaxPeso) inFlexMaxPeso.value = conf.logistica?.flex?.max_peso_bulto ?? 12;
        if (inFlexMaxUnits) inFlexMaxUnits.value = conf.logistica?.flex?.max_unidades ?? (conf.logistica?.max_unidades_flex ?? 5);

        // Beneficios en Flex: Envío gratis y escalas de descuento dinámicas
        const flexBen = conf.logistica?.flex?.beneficios || { activo: true, envioGratisMin: 6, escalas: [{ minQty: 2, discountPercent: 20 }, { minQty: 4, discountPercent: 40 }] };
        const chkFlexBen = document.getElementById('chk-cortes-flex-beneficios-activo');
        const inFlexGratisMin = document.getElementById('inp-cortes-flex-envio-gratis-min');

        if (chkFlexBen) chkFlexBen.checked = flexBen.activo !== false;
        if (inFlexGratisMin) inFlexGratisMin.value = flexBen.envioGratisMin ?? 6;

        if (Array.isArray(flexBen.escalas) && flexBen.escalas.length > 0) {
            currentFlexDiscountScales = [...flexBen.escalas];
        } else if (flexBen.descuentoTarifaMin && flexBen.descuentoTarifaPct) {
            currentFlexDiscountScales = [{ minQty: flexBen.descuentoTarifaMin, discountPercent: flexBen.descuentoTarifaPct }];
        } else {
            currentFlexDiscountScales = [
                { minQty: 2, discountPercent: 20 },
                { minQty: 4, discountPercent: 40 }
            ];
        }
        renderFlexDiscountScalesUI();

        // Sincronizar tarifas en vivo desde el maestro global window.sessionShippingFullData
        const globalShipData = window.sessionShippingFullData || {};
        const globalFlex = globalShipData.logistica || {};
        const globalFlete = globalShipData.flete || {};

        const flexTarifaCaba = globalFlex.caba?.baseCost ?? (conf.logistica?.flex?.costo_caba ?? 8000);
        const flexTarifaCord1 = globalFlex.cordon_1?.baseCost ?? (conf.logistica?.flex?.costo_cordon_1 ?? 10000);
        const flexTarifaCord2 = globalFlex.cordon_2?.baseCost ?? (conf.logistica?.flex?.costo_cordon_2 ?? 12000);

        const fleteTarifaZ1 = globalFlete.flete_zona_1?.baseCost ?? (conf.logistica?.flete?.costo_zona_1 ?? 4500);
        const fleteTarifaZ2 = globalFlete.flete_zona_2?.baseCost ?? (conf.logistica?.flete?.costo_zona_2 ?? 20000);
        const fleteTarifaZ3 = globalFlete.flete_zona_3?.baseCost ?? (conf.logistica?.flete?.costo_zona_3 ?? 55000);

        // Actualizar valores en inputs y etiquetas de Flex
        if (inFlexCaba) inFlexCaba.value = flexTarifaCaba;
        if (inFlexCord1) inFlexCord1.value = flexTarifaCord1;
        if (inFlexCord2) inFlexCord2.value = flexTarifaCord2;

        const lblFlexCaba = document.getElementById('lbl-cortes-flex-caba');
        const lblFlexCord1 = document.getElementById('lbl-cortes-flex-cordon1');
        const lblFlexCord2 = document.getElementById('lbl-cortes-flex-cordon2');
        if (lblFlexCaba) lblFlexCaba.textContent = `$${Number(flexTarifaCaba).toLocaleString('es-AR')}`;
        if (lblFlexCord1) lblFlexCord1.textContent = `$${Number(flexTarifaCord1).toLocaleString('es-AR')}`;
        if (lblFlexCord2) lblFlexCord2.textContent = `$${Number(flexTarifaCord2).toLocaleString('es-AR')}`;

        if (inAviso) inAviso.value = conf.logistica?.aviso_flete_excedido || "Por las dimensiones de la tabla, el envío se coordina por Flete particular o retiro sin cargo por el taller en Hurlingham.";


        // Solapa 2: Flete Propio
        const inFleteZ1 = document.getElementById('inp-cortes-flete-z1');
        const inFleteZ2 = document.getElementById('inp-cortes-flete-z2');
        const inFleteZ3 = document.getElementById('inp-cortes-flete-z3');
        const inFleteFuera = document.getElementById('inp-cortes-flete-fuera');
        const chkRetiro = document.getElementById('chk-cortes-retiro-taller');

        if (inFleteZ1) inFleteZ1.value = fleteTarifaZ1;
        if (inFleteZ2) inFleteZ2.value = fleteTarifaZ2;
        if (inFleteZ3) inFleteZ3.value = fleteTarifaZ3;

        const lblFleteZ1 = document.getElementById('lbl-cortes-flete-z1');
        const lblFleteZ2 = document.getElementById('lbl-cortes-flete-z2');
        const lblFleteZ3 = document.getElementById('lbl-cortes-flete-z3');
        if (lblFleteZ1) lblFleteZ1.textContent = `$${Number(fleteTarifaZ1).toLocaleString('es-AR')}`;
        if (lblFleteZ2) lblFleteZ2.textContent = `$${Number(fleteTarifaZ2).toLocaleString('es-AR')}`;
        if (lblFleteZ3) lblFleteZ3.textContent = `$${Number(fleteTarifaZ3).toLocaleString('es-AR')}`;

        // Límites Físicos Flete Propio
        const inFleteMaxL = document.getElementById('inp-cortes-flete-max-largo');
        const inFleteMaxW = document.getElementById('inp-cortes-flete-max-ancho');
        const inFleteMaxH = document.getElementById('inp-cortes-flete-max-alto');
        const inFleteMaxPeso = document.getElementById('inp-cortes-flete-max-peso');
        const inFleteMaxUnits = document.getElementById('inp-cortes-flete-max-unidades');

        if (inFleteMaxL) inFleteMaxL.value = conf.logistica?.flete?.max_largo ?? 300;
        if (inFleteMaxW) inFleteMaxW.value = conf.logistica?.flete?.max_ancho ?? 130;
        if (inFleteMaxH) inFleteMaxH.value = conf.logistica?.flete?.max_alto ?? 120;
        if (inFleteMaxPeso) inFleteMaxPeso.value = conf.logistica?.flete?.max_peso_bulto ?? (conf.logistica?.flete?.max_peso ?? 450);
        if (inFleteMaxUnits) inFleteMaxUnits.value = conf.logistica?.flete?.max_unidades ?? 25;

        // Beneficios en Flete: Envío gratis y escalas dinámicas de descuento
        const fleteBen = conf.logistica?.flete?.beneficios || { activo: true, envioGratisMin: 10, escalas: [{ minQty: 5, discountPercent: 25 }, { minQty: 10, discountPercent: 50 }] };
        const chkFleteBen = document.getElementById('chk-cortes-flete-beneficios-activo');
        const inFleteGratisMin = document.getElementById('inp-cortes-flete-envio-gratis-min');

        if (inFleteFuera) inFleteFuera.value = conf.logistica?.flete?.fuera_rango_mensaje || "Consultar cotización a medida para distancias mayores.";
        if (chkRetiro) chkRetiro.checked = conf.logistica?.flete?.permite_retiro_taller !== false;

        if (chkFleteBen) chkFleteBen.checked = fleteBen.activo !== false;
        if (inFleteGratisMin) inFleteGratisMin.value = fleteBen.envioGratisMin ?? 10;

        if (Array.isArray(fleteBen.escalas) && fleteBen.escalas.length > 0) {
            currentFleteDiscountScales = [...fleteBen.escalas];
        } else if (fleteBen.descuentoTarifaMin && fleteBen.descuentoTarifaPct) {
            currentFleteDiscountScales = [{ minQty: fleteBen.descuentoTarifaMin, discountPercent: fleteBen.descuentoTarifaPct }];
        } else {
            currentFleteDiscountScales = [
                { minQty: 5, discountPercent: 25 },
                { minQty: 10, discountPercent: 50 }
            ];
        }
        renderFleteDiscountScalesUI();

        // Solapa 3: Logísticas Externas
        const inRecargo = document.getElementById('inp-cortes-recargo-embalaje');
        const inEmpresas = document.getElementById('inp-cortes-empresas-externas');
        const inNotaDespacho = document.getElementById('inp-cortes-nota-despacho');
        const inAvisoRoturas = document.getElementById('inp-cortes-aviso-roturas');

        const extBen = conf.logistica?.externas?.beneficios || { activo: true, embalajeGratisMin: 4, descuentoEmbalajePct: 50, descuentoEmbalajeMin: 2 };
        const chkExtBen = document.getElementById('chk-cortes-externas-beneficios-activo');
        const inExtGratisMin = document.getElementById('inp-cortes-externas-embalaje-gratis-min');
        const inExtDescPct = document.getElementById('inp-cortes-externas-desc-pct');
        const inExtDescMin = document.getElementById('inp-cortes-externas-desc-min');

        if (inRecargo) inRecargo.value = conf.logistica?.externas?.recargo_embalaje ?? 3500;
        if (inEmpresas) inEmpresas.value = conf.logistica?.externas?.empresas_habilitadas || "Vía Cargo, Andreani, Correo Argentino";
        if (inNotaDespacho) inNotaDespacho.value = conf.logistica?.externas?.nota_despacho || "Despachamos desde receptoría en 24-48 hs hábiles. El costo de encomienda se abona en destino al retirar en sucursal o recibir en domicilio.";
        if (inAvisoRoturas) inAvisoRoturas.value = conf.logistica?.externas?.aviso_roturas || "Embalaje reforzado con esquineros y pluribol para máxima protección.";

        if (chkExtBen) chkExtBen.checked = extBen.activo !== false;
        if (inExtGratisMin) inExtGratisMin.value = extBen.embalajeGratisMin ?? 4;
        if (inExtDescPct) inExtDescPct.value = extBen.descuentoEmbalajePct ?? 50;
        if (inExtDescMin) inExtDescMin.value = extBen.descuentoEmbalajeMin ?? 2;

        // Descuentos en el Producto (Madera / Piezas)
        const chkDesc = document.getElementById('chk-cortes-desc-activo');
        const inDescCant1 = document.getElementById('inp-cortes-desc-cant-1');
        const inDescPct1 = document.getElementById('inp-cortes-desc-pct-1');
        const inDescCant2 = document.getElementById('inp-cortes-desc-cant-2');
        const inDescPct2 = document.getElementById('inp-cortes-desc-pct-2');

        const escalas = conf.descuentos?.escalas || [{ minQty: 3, discountPercent: 10 }, { minQty: 6, discountPercent: 15 }];
        if (chkDesc) chkDesc.checked = conf.descuentos?.activo !== false;
        if (inDescCant1) inDescCant1.value = escalas[0]?.minQty ?? 3;
        if (inDescPct1) inDescPct1.value = escalas[0]?.discountPercent ?? 10;
        if (inDescCant2) inDescCant2.value = escalas[1]?.minQty ?? 6;
        if (inDescPct2) inDescPct2.value = escalas[1]?.discountPercent ?? 15;

        // Actualizar opciones del selector de Material en el simulador
        const selSimMat = document.getElementById('sim-cortes-mat');
        if (selSimMat && Array.isArray(currentMaterialsList)) {
            const curVal = selSimMat.value;
            selSimMat.innerHTML = currentMaterialsList
                .filter(m => m.activo !== false)
                .map(m => `<option value="${m.id}" data-precio="${m.precio_m2}" data-costo="${m.costo_m2}" data-largo="${m.max_largo || 300}" data-ancho="${m.max_ancho || 120}">${m.name}</option>`)
                .join('');
            if (curVal && selSimMat.querySelector(`option[value="${curVal}"]`)) {
                selSimMat.value = curVal;
            }
        }

        updateLiveSimulator();
    }

    // Renderizar Productos Predeterminados detectados en la categoría cortes-madera
    async function renderPreconfiguredProductsUI() {
        const container = document.getElementById('cortes-pred-container');
        const countBadge = document.getElementById('cortes-pred-count');
        if (!container) return;

        let cortesProducts = [];

        // 1. Buscar en window.catalogIndex (si está cargado en memoria)
        if (Array.isArray(window.catalogIndex) && window.catalogIndex.length > 0) {
            window.catalogIndex.forEach(p => {
                const isCortes = (p.categories && p.categories.includes('cortes-madera')) || 
                                 p.primaryCatId === 'cortes-madera' || 
                                 p.rubro === 'cortes-madera' ||
                                 p.id === '67' || p.id === '68' || p.id === '69';
                if (isCortes && !cortesProducts.some(cp => String(cp.id) === String(p.id))) {
                    cortesProducts.push(p);
                }
            });
        }

        // 2. Si no encontró o faltan, buscar en window.sessionProducts (array plano)
        if (Array.isArray(window.sessionProducts) && window.sessionProducts.length > 0) {
            window.sessionProducts.forEach(p => {
                const isCortes = (p.categories && p.categories.includes('cortes-madera')) || 
                                 p.primaryCatId === 'cortes-madera' || 
                                 p.rubro === 'cortes-madera' ||
                                 p.id === '67' || p.id === '68' || p.id === '69';
                if (isCortes && !cortesProducts.some(cp => String(cp.id) === String(p.id))) {
                    cortesProducts.push(p);
                }
            });
        }

        // 3. Buscar en window.productsData (estructurado por categorías o plano)
        if (Array.isArray(window.productsData) && window.productsData.length > 0) {
            window.productsData.forEach(item => {
                if (item.products && Array.isArray(item.products)) {
                    item.products.forEach(p => {
                        const isCortes = (p.categories && p.categories.includes('cortes-madera')) || 
                                         p.primaryCatId === 'cortes-madera' || 
                                         p.rubro === 'cortes-madera' ||
                                         p.id === '67' || p.id === '68' || p.id === '69';
                        if (isCortes && !cortesProducts.some(cp => String(cp.id) === String(p.id))) {
                            cortesProducts.push(p);
                        }
                    });
                } else if (item.id) {
                    const p = item;
                    const isCortes = (p.categories && p.categories.includes('cortes-madera')) || 
                                     p.primaryCatId === 'cortes-madera' || 
                                     p.rubro === 'cortes-madera' ||
                                     p.id === '67' || p.id === '68' || p.id === '69';
                    if (isCortes && !cortesProducts.some(cp => String(cp.id) === String(p.id))) {
                        cortesProducts.push(p);
                    }
                }
            });
        }

        // 4. Si aún no hay productos en memoria, intentar fetch directo de data/catalog-index.json
        if (cortesProducts.length === 0) {
            try {
                const res = await fetch('data/catalog-index.json');
                if (res.ok) {
                    const idxData = await res.json();
                    if (Array.isArray(idxData)) {
                        window.catalogIndex = idxData;
                        idxData.forEach(p => {
                            const isCortes = (p.categories && p.categories.includes('cortes-madera')) || 
                                             p.primaryCatId === 'cortes-madera' || 
                                             p.rubro === 'cortes-madera' ||
                                             p.id === '67' || p.id === '68' || p.id === '69';
                            if (isCortes && !cortesProducts.some(cp => String(cp.id) === String(p.id))) {
                                cortesProducts.push(p);
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn('[Admin Cortes] No se pudo cargar catalog-index.json:', err);
            }
        }

        if (countBadge) {
            countBadge.textContent = `${cortesProducts.length} producto${cortesProducts.length === 1 ? '' : 's'} activo${cortesProducts.length === 1 ? '' : 's'}`;
        }

        if (cortesProducts.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 1rem; text-align: center; color: #64748B; font-size: 0.8rem; background: #FFFFFF; border-radius: 8px; border: 1px dashed #CBD5E1;">
                    No se encontraron productos predeterminados cargados en "Cortes de Madera".
                </div>
            `;
            return;
        }

        container.innerHTML = cortesProducts.map(p => {
            const isCustom = p.isCustomCutting || p.id === '69';
            const imgUrl = Array.isArray(p.image) ? p.image[0] : (p.image || 'img/estantes/estantes/estantes.webp');
            const totalVariants = (p.acabados_groups || []).reduce((acc, g) => acc + (g.medidas_variants || []).length, 0);

            return `
                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.75rem; display: flex; gap: 10px; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <img src="${imgUrl}" alt="${p.title}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px; border: 1px solid #CBD5E1; flex-shrink: 0;" onerror="this.src='img/estantes/estantes/estantes.webp'">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 2px;">
                            <strong style="font-size: 0.82rem; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${p.title}">${p.title}</strong>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; color: #64748B;">
                            ${isCustom 
                                ? `<span class="admin-badge-warning" style="font-size: 0.65rem; padding: 2px 6px;">Cotizador a Medida</span>` 
                                : `<span class="admin-badge-success" style="font-size: 0.65rem; padding: 2px 6px;">${totalVariants > 0 ? totalVariants + ' medidas listas' : 'Medidas listas'}</span>`
                            }
                            <span>ID #${p.id}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Simulador de prueba en vivo dentro del Admin
    function updateLiveSimulator() {
        const simLargo = parseFloat(document.getElementById('sim-cortes-largo')?.value) || 80;
        const simAncho = parseFloat(document.getElementById('sim-cortes-ancho')?.value) || 30;
        const minimo = parseFloat(document.getElementById('inp-cortes-minimo')?.value) || 3500;

        // Obtener material seleccionado en el simulador
        const selMat = document.getElementById('sim-cortes-mat');
        const optMat = selMat?.options[selMat.selectedIndex];
        let m2Venta = parseFloat(optMat?.getAttribute('data-precio')) || 48500;
        let m2Costo = parseFloat(optMat?.getAttribute('data-costo')) || 27000;
        const matMaxLargo = parseFloat(optMat?.getAttribute('data-largo')) || 300;
        const matMaxAncho = parseFloat(optMat?.getAttribute('data-ancho')) || 120;

        // Evaluar usos dinámicos configurados en la lista de Detección Inteligente
        const usosList = getUsosFromUI();
        let matchedUso = null;
        for (const u of usosList) {
            if (u.activo === false) continue;
            const minW = u.min_ancho || 0;
            const maxW = u.max_ancho !== undefined ? u.max_ancho : 999;
            const minL = u.min_largo || 0;
            const maxL = u.max_largo !== undefined ? u.max_largo : 999;
            const simMay = Math.max(simLargo, simAncho);
            const simMen = Math.min(simLargo, simAncho);
            if (simMen >= minW && simMen <= maxW && simMay >= minL && simMay <= maxL) {
                matchedUso = u;
                break;
            }
        }
        if (!matchedUso && usosList.length > 0) matchedUso = usosList[0];

        let factorUso = 1.0;
        let fijoUso = 0;
        if (matchedUso) {
            const rawVal = Number(matchedUso.factor_precio) || 0;
            if (rawVal > 0 && rawVal <= 3) {
                factorUso = rawVal;
            } else {
                factorUso = 1.0 + (rawVal / 100);
            }
            fijoUso = matchedUso.recargo_fijo || 0;
        }

        // Evaluar tramos de dimensiones en Flex
        const flexDims = getFlexDimensionsFromUI();
        let matchedFlexTier = null;
        for (const tier of flexDims) {
            if (simLargo <= tier.max_largo && simAncho <= tier.max_ancho) {
                matchedFlexTier = tier;
                break;
            }
        }

        const m2 = (simLargo * simAncho) / 10000;
        const costoCalculado = Math.round(m2 * m2Costo);
        const ventaCalculada = Math.max(minimo, Math.round(m2 * (m2Venta * factorUso) + fijoUso));
        const ganancia = ventaCalculada - costoCalculado;

        const lblSup = document.getElementById('sim-res-sup');
        const lblVenta = document.getElementById('sim-res-venta');
        const lblCosto = document.getElementById('sim-res-costo');
        const lblGanancia = document.getElementById('sim-res-ganancia');
        const lblEnvio = document.getElementById('sim-res-envio');

        if (lblSup) lblSup.textContent = `${m2.toFixed(2)} m²`;
        if (lblVenta) lblVenta.textContent = `$${ventaCalculada.toLocaleString('es-AR')}`;
        if (lblCosto) lblCosto.textContent = `$${costoCalculado.toLocaleString('es-AR')}`;
        if (lblGanancia) lblGanancia.textContent = `+$${ganancia.toLocaleString('es-AR')}`;

        if (lblEnvio) {
            if (simLargo > matMaxLargo || simAncho > matMaxAncho) {
                lblEnvio.className = 'admin-badge-danger';
                lblEnvio.style.background = '#DC2626';
                lblEnvio.style.color = '#FFFFFF';
                lblEnvio.textContent = `Excede Placa (${matMaxLargo}×${matMaxAncho})`;
            } else if (matchedFlexTier) {
                lblEnvio.className = 'admin-badge-success';
                lblEnvio.style.background = '#16A34A';
                lblEnvio.style.color = '#FFFFFF';
                lblEnvio.textContent = `Apto Flex (${matchedFlexTier.nombre}: hasta ${matchedFlexTier.max_unidades} u.)`;
            } else {
                lblEnvio.className = 'admin-badge-warning';
                lblEnvio.style.background = '#D97706';
                lblEnvio.style.color = '#FFFFFF';
                lblEnvio.textContent = 'Excede Flex (Flete Camioneta)';
            }
        }
    }
    window.updateCortesAdminSimulator = updateLiveSimulator;

    // Guardar cambios al backend
    async function saveCortesConfigFromUI() {
        const btnSave = document.getElementById('btn-save-cortes-config');
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.textContent = 'Guardando...';
        }

        const avisoFlete = document.getElementById('inp-cortes-aviso-flete')?.value || "";
        const materialsData = getMaterialsFromUI();
        const flexDimsData = getFlexDimensionsFromUI();

        // Calcular el tramo más grande como fallback de compatibilidad
        let maxLargoFallback = 100;
        let maxAnchoFallback = 35;
        let maxQtyFallback = 3;

        if (flexDimsData.length > 0) {
            maxLargoFallback = Math.max(...flexDimsData.map(d => d.max_largo));
            maxAnchoFallback = Math.max(...flexDimsData.map(d => d.max_ancho));
            maxQtyFallback = Math.max(...flexDimsData.map(d => d.max_unidades));
        }

        const defaultMat = materialsData.find(m => m.is_default) || materialsData[0] || { precio_m2: 48500, costo_m2: 27000 };

        const usosData = getUsosFromUI();

        const flexMaxL = parseFloat(document.getElementById('inp-cortes-flex-max-largo')?.value) || 140;
        const flexMaxW = parseFloat(document.getElementById('inp-cortes-flex-max-ancho')?.value) || 60;
        const flexMaxH = parseFloat(document.getElementById('inp-cortes-flex-max-alto')?.value) || 20;
        const flexMaxPeso = parseFloat(document.getElementById('inp-cortes-flex-max-peso')?.value) || 12;
        const flexMaxUnits = parseInt(document.getElementById('inp-cortes-flex-max-unidades')?.value) || 5;

        const payload = {
            precios: {
                precio_m2_venta: defaultMat.precio_m2,
                costo_m2_base: defaultMat.costo_m2,
                minimo_corte_taller: parseFloat(document.getElementById('inp-cortes-minimo')?.value) || 3500
            },
            materiales: materialsData,
            usos: usosData,
            acabados: [
                {
                    id: "natural",
                    name: "Natural Cepillado",
                    extra_price: 0,
                    cost_price: 0
                },
                {
                    id: "encerado",
                    name: "Tinte / Encerado Nogal o Cedro",
                    extra_price: parseFloat(document.getElementById('inp-cortes-encerado-venta')?.value) || 2000,
                    cost_price: parseFloat(document.getElementById('inp-cortes-encerado-costo')?.value) || 800
                },
                {
                    id: "barnizado",
                    name: "Barniz Poliuretánico Satinado",
                    extra_price: parseFloat(document.getElementById('inp-cortes-barniz-venta')?.value) || 3800,
                    cost_price: parseFloat(document.getElementById('inp-cortes-barniz-costo')?.value) || 1500
                }
            ],
            espesores: window.cortesConfig?.espesores || [
                { id: "1_pulgada", name: "1 Pulgada (~2.2 cm)", factor_precio: 1.0, factor_costo: 1.0, is_default: true },
                { id: "1_5_pulgadas", name: "1.5 Pulgadas (~3.2 cm)", factor_precio: 1.45, factor_costo: 1.45, is_default: false },
                { id: "2_pulgadas", name: "2 Pulgadas (~4.2 cm)", factor_precio: 1.95, factor_costo: 1.95, is_default: false }
            ],
            descuentos: {
                activo: document.getElementById('chk-cortes-desc-activo')?.checked !== false,
                escalas: [
                    {
                        minQty: parseInt(document.getElementById('inp-cortes-desc-cant-1')?.value) || 3,
                        discountPercent: parseFloat(document.getElementById('inp-cortes-desc-pct-1')?.value) || 10
                    },
                    {
                        minQty: parseInt(document.getElementById('inp-cortes-desc-cant-2')?.value) || 6,
                        discountPercent: parseFloat(document.getElementById('inp-cortes-desc-pct-2')?.value) || 15
                    }
                ]
            },
            logistica: {
                max_largo_flex: flexMaxL,
                max_ancho_flex: flexMaxW,
                max_alto_flex: flexMaxH,
                max_peso_flex: flexMaxPeso,
                max_unidades_flex: flexMaxUnits,
                aviso_flete_excedido: avisoFlete,
                flex: {
                    activo: true,
                    max_largo: flexMaxL,
                    max_ancho: flexMaxW,
                    max_alto: flexMaxH,
                    max_peso_bulto: flexMaxPeso,
                    max_unidades: flexMaxUnits,
                    costo_caba: parseFloat(document.getElementById('inp-cortes-flex-caba')?.value) || 8000,
                    costo_cordon_1: parseFloat(document.getElementById('inp-cortes-flex-cordon1')?.value) || 10000,
                    costo_cordon_2: parseFloat(document.getElementById('inp-cortes-flex-cordon2')?.value) || 12000,
                    aviso_flex: "Válido para paquetes compactos que entran en moto o furgón Flex.",
                    beneficios: {
                        activo: document.getElementById('chk-cortes-flex-beneficios-activo')?.checked !== false,
                        envioGratisMin: parseInt(document.getElementById('inp-cortes-flex-envio-gratis-min')?.value) || 0,
                        escalas: getFlexDiscountScalesFromUI()
                    }
                },
                flete: {
                    activo: true,
                    origen: "Taller Hurlingham",
                    max_largo: parseFloat(document.getElementById('inp-cortes-flete-max-largo')?.value) || 300,
                    max_ancho: parseFloat(document.getElementById('inp-cortes-flete-max-ancho')?.value) || 130,
                    max_alto: parseFloat(document.getElementById('inp-cortes-flete-max-alto')?.value) || 120,
                    max_peso_bulto: parseFloat(document.getElementById('inp-cortes-flete-max-peso')?.value) || 450,
                    max_unidades: parseInt(document.getElementById('inp-cortes-flete-max-unidades')?.value) || 25,
                    costo_zona_1: parseFloat(document.getElementById('inp-cortes-flete-z1')?.value) || 4500,
                    costo_zona_2: parseFloat(document.getElementById('inp-cortes-flete-z2')?.value) || 20000,
                    costo_zona_3: parseFloat(document.getElementById('inp-cortes-flete-z3')?.value) || 55000,
                    fuera_rango_mensaje: document.getElementById('inp-cortes-flete-fuera')?.value || "Consultar cotización a medida para distancias mayores.",
                    permite_retiro_taller: document.getElementById('chk-cortes-retiro-taller')?.checked !== false,
                    dimensiones: window.cortesConfig?.logistica?.flete?.dimensiones || [
                        { nombre: "Furgón Chico", max_largo: 180, max_ancho: 90, max_unidades: 15 },
                        { nombre: "Carga Completa", max_largo: 300, max_ancho: 130, max_unidades: 50 }
                    ],
                    beneficios: {
                        activo: document.getElementById('chk-cortes-flete-beneficios-activo')?.checked !== false,
                        envioGratisMin: parseInt(document.getElementById('inp-cortes-flete-envio-gratis-min')?.value) || 0,
                        escalas: getFleteDiscountScalesFromUI()
                    }
                },
                externas: {
                    activo: true,
                    recargo_embalaje: parseFloat(document.getElementById('inp-cortes-recargo-embalaje')?.value) || 3500,
                    empresas_habilitadas: document.getElementById('inp-cortes-empresas-externas')?.value || "Vía Cargo, Andreani, Correo Argentino",
                    nota_despacho: document.getElementById('inp-cortes-nota-despacho')?.value || "Despachamos desde receptoría en 24-48 hs hábiles. El costo de encomienda se abona en destino al retirar en sucursal o recibir en domicilio.",
                    aviso_roturas: document.getElementById('inp-cortes-aviso-roturas')?.value || "Embalaje reforzado con esquineros y pluribol para máxima protección.",
                    dimensiones: window.cortesConfig?.logistica?.externas?.dimensiones || [
                        { nombre: "Encomienda Estándar", max_largo: 120, max_ancho: 60, max_unidades: 6 }
                    ],
                    beneficios: {
                        activo: document.getElementById('chk-cortes-externas-beneficios-activo')?.checked !== false,
                        embalajeGratisMin: parseInt(document.getElementById('inp-cortes-externas-embalaje-gratis-min')?.value) || 4,
                        descuentoEmbalajePct: parseFloat(document.getElementById('inp-cortes-externas-desc-pct')?.value) || 50,
                        descuentoEmbalajeMin: parseInt(document.getElementById('inp-cortes-externas-desc-min')?.value) || 2
                    }
                }
            }
        };

        try {
            const resp = await fetch('/api/save-cortes-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();

            if (data.success) {
                window.cortesConfig = payload;
                if (typeof window.showToast === 'function') {
                    window.showToast('✅ Configuración de Cortes, Materiales y Envíos guardada correctamente');
                } else {
                    alert('✅ Configuración de Cortes, Materiales y Envíos guardada correctamente');
                }
            } else {
                alert('❌ Error: ' + (data.message || 'No se pudo guardar'));
            }
        } catch (err) {
            console.error('Error guardando cortes config:', err);
            window.cortesConfig = payload;
            alert('✅ Guardado en memoria local (Static Fallback)');
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">save</span><span>Guardar Configuración</span>';
            }
        }
    }

    // Exponer al scope global para que renderAdminUX pueda llamarlo
    window.loadCortesConfigToUI = loadCortesConfigToUI;
    window.initAdminCortes = initAdminCortes;
    window.saveCortesConfigFromUI = saveCortesConfigFromUI;

    // Auto-arranque
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdminCortes);
    } else {
        initAdminCortes();
    }
})();
