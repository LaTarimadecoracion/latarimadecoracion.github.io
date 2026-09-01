// js/admin-shipping.js
// --- MÓDULO ADMIN GESTIÓN DE TARIFAS Y ZONAS DE ENVÍO (GUARDADO AUTOMÁTICO V5) ---

(function() {
    let currentShipMode = 'logistica'; // 'logistica' | 'flete' | 'otro'

    // Catálogo inicial por defecto
    const defaultZoneCatalogs = {
        logistica: {
            caba: {
                title: '🏙️ 1. CABA (Capital Federal)',
                badge: 'Tarifa Base Flux: $4.070',
                cpRange: 'C.P. 1000 – 1499',
                cities: ['Agronomía (1419)', 'Almagro (1177)', 'Belgrano (1428)', 'Caballito (1405)', 'Devoto (1419)', 'Flores (1406)', 'Palermo (1425)', 'Recoleta (1113)', 'San Telmo (1063)', 'Villa Urquiza (1431)']
            },
            cordon_1: {
                title: '🟣 2. CORDÓN 1 (GBA Cercano)',
                badge: 'Tarifa Base Flux: $5.380',
                cpRange: 'C.P. 1600–1699, 1700–1799, 1800–1899',
                cities: ['Vicente López (1638)', 'San Isidro (1642)', 'San Fernando (1646)', 'San Martín (1650)', 'Tres de Febrero (1678)', 'Hurlingham (1686)', 'Morón (1708)', 'Ituzaingó (1714)', 'Avellaneda (1870)', 'Lanús (1824)', 'Lomas de Zamora (1832)']
            },
            cordon_2: {
                title: '🟠 3. CORDÓN 2 (GBA Alejado / Extendido)',
                badge: 'Tarifa Base Flux: $8.280',
                cpRange: 'C.P. 1600–1699, 1700–1799, 1800–1899, 1900',
                cities: ['Tigre (1648)', 'Malvinas Argentinas (1613)', 'José C. Paz (1665)', 'San Miguel (1663)', 'Escobar (1625)', 'Pilar (1629)', 'Moreno (1744)', 'Merlo (1722)', 'Quilmes (1878)', 'Berazategui (1884)', 'Ezeiza (1804)', 'La Plata (1900)']
            },
            resto_provincias: {
                title: '🇦🇷 4. Resto del País (Provincias / Expreso)',
                badge: 'Provincias de Argentina',
                cpRange: 'C.P. 2000 – 9999',
                cities: ['Rosario, Santa Fe (2000)', 'Córdoba Cap. (5000)', 'Mendoza Cap. (5500)', 'Salta Cap. (4400)', 'Posadas, Misiones (3300)', 'Tucumán Cap. (4000)', 'Paraná, Entre Ríos (3100)', 'Neuquén Cap. (8300)']
            }
        },
        flete: {
            flete_zona_1: {
                title: '🟡 ZONA 1: Hurlingham (Origen Local)',
                badge: 'Origen Base: Hurlingham',
                cpRange: 'C.P. 1686, 1688',
                cities: ['Hurlingham (1686)', 'Villa Tesei (1688)', 'William Morris (1686)']
            },
            flete_zona_2: {
                title: '🟢 ZONA 2: Cordón Cercano a Hurlingham',
                badge: 'Partidos Limítrofes',
                cpRange: 'C.P. 1682, 1708, 1714, 1650, 1663',
                cities: ['Ituzaingó (1714)', 'Morón (1708)', 'Tres de Febrero (1678)', 'San Martín (1650)', 'San Miguel (1663)']
            },
            flete_zona_3: {
                title: '🔵 ZONA 3: Cordón Extendido Flete',
                badge: 'GBA Norte, GBA Oeste Alejado y CABA',
                cpRange: 'C.P. 1000–1499, 1600–1699, 1744, 1665',
                cities: ['CABA (1000)', 'Vicente López (1638)', 'San Isidro (1642)', 'San Fernando (1646)', 'Tigre (1648)', 'Malvinas Argentinas (1613)', 'José C. Paz (1665)', 'Moreno (1744)']
            },
            flete_fuera_rango: {
                title: '🚛 Fuera de Rango Flete Directo',
                badge: 'GBA Sur Alejado e Interior',
                cpRange: 'Resto de Códigos Postales',
                cities: ['Quilmes (1878)', 'Berazategui (1884)', 'La Plata (1900)', 'Luján (6700)', 'Ezeiza (1804)']
            }
        },
        otro: {
            otro_amba: {
                title: '🚚 AMBA / Gran Buenos Aires',
                badge: 'Envíos Especiales AMBA',
                cpRange: 'C.P. 1000 – 1899',
                cities: ['CABA (1000)', 'Zona Norte (1600)', 'Zona Oeste (1700)', 'Zona Sur (1800)']
            },
            otro_interior: {
                title: '🇦🇷 Expreso al Interior del País',
                badge: 'Envíos por Transporte / Expreso',
                cpRange: 'C.P. 1900 – 9999',
                cities: ['Santa Fe (2000)', 'Córdoba (5000)', 'Mendoza (5500)', 'Salta (4400)', 'Patagonia (8000)']
            }
        }
    };

    // Precios por defecto
    const defaultShippingData = {
        logistica: {
            caba: { active: true, baseCost: 4070 },
            cordon_1: { active: true, baseCost: 5380 },
            cordon_2: { active: true, baseCost: 8280 },
            resto_provincias: { active: true, baseCost: 0, requireWA: true }
        },
        flete: {
            flete_zona_1: { active: true, baseCost: 4500 },
            flete_zona_2: { active: true, baseCost: 7500 },
            flete_zona_3: { active: true, baseCost: 11000 },
            flete_fuera_rango: { active: false, baseCost: 0, requireWA: true }
        },
        otro: {
            otro_amba: { active: true, baseCost: 0 },
            otro_interior: { active: true, baseCost: 0, requireWA: true }
        }
    };

    function loadShippingData() {
        const storedCatalogs = localStorage.getItem('sessionShippingZoneCatalogs');
        if (storedCatalogs) {
            try {
                window.sessionShippingZoneCatalogs = JSON.parse(storedCatalogs);
            } catch (e) {
                window.sessionShippingZoneCatalogs = JSON.parse(JSON.stringify(defaultZoneCatalogs));
            }
        } else {
            window.sessionShippingZoneCatalogs = JSON.parse(JSON.stringify(defaultZoneCatalogs));
        }

        const storedData = localStorage.getItem('sessionShippingFullData');
        if (storedData) {
            try {
                window.sessionShippingFullData = JSON.parse(storedData);
            } catch (e) {
                window.sessionShippingFullData = defaultShippingData;
            }
        } else {
            window.sessionShippingFullData = defaultShippingData;
        }
    }

    loadShippingData();

    window.renderAdminShipping = function() {
        const container = document.getElementById('admin-shipping-zones-container');
        if (!container) return;

        // Subpestañas minimalistas
        const subtabBtns = document.querySelectorAll('.admin-shipping-subtab-btn');
        subtabBtns.forEach(btn => {
            const mode = btn.dataset.shipMode;
            if (mode === currentShipMode) {
                btn.classList.add('active');
                btn.style.borderColor = '#0f172a';
                btn.style.background = '#0f172a';
                btn.style.color = '#ffffff';
            } else {
                btn.classList.remove('active');
                btn.style.borderColor = '#e2e8f0';
                btn.style.background = '#ffffff';
                btn.style.color = '#475569';
            }

            btn.onclick = () => {
                currentShipMode = mode;
                window.renderAdminShipping();
            };
        });

        const allCatalogs = window.sessionShippingZoneCatalogs || defaultZoneCatalogs;
        const activeCatalog = allCatalogs[currentShipMode] || defaultZoneCatalogs[currentShipMode] || {};

        const fullData = window.sessionShippingFullData || defaultShippingData;
        const currentModeData = fullData[currentShipMode] || defaultShippingData[currentShipMode] || {};

        const modeTitles = {
            logistica: { title: '📦 Logística (Courier / Colectivo)', subtitle: 'Flux Logística: CABA $4070 | Cordón 1 $5380 | Cordón 2 $8280' },
            flete: { title: '🚛 Flete Particular (Camioneta)', subtitle: 'Saliendo desde Hurlingham: Zona 1, Zona 2, Zona 3' },
            otro: { title: '🚚 Otro / Expreso Personalizado', subtitle: 'Presupuestos e interior del país' }
        };

        const currentMeta = modeTitles[currentShipMode];

        let html = `
            <!-- Fila Única de Cabecera -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.85rem 1.2rem; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h3 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a;">${currentMeta.title}</h3>
                    <p style="margin: 2px 0 0 0; font-size: 0.78rem; color: #64748b;">${currentMeta.subtitle}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="window.addNewShippingZone('${currentShipMode}')" style="background: #f8fafc; color: #0f172a; border: 1.5px solid #cbd5e1; padding: 0.4rem 0.8rem; border-radius: 8px; font-weight: 800; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">add</span> Crear Zona
                    </button>
                    ${currentShipMode === 'logistica' ? `
                        <button type="button" onclick="window.applyFluxDefaults()" style="background: #0284c7; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 8px; font-weight: 800; font-size: 0.75rem; cursor: pointer;">
                            ⚡ Precios Flux
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        Object.keys(activeCatalog).forEach(zoneKey => {
            const zMeta = activeCatalog[zoneKey];
            const zVal = (currentModeData && currentModeData[zoneKey]) ? currentModeData[zoneKey] : { active: true, baseCost: 0 };

            html += `
                <!-- Ficha Desplegable de 3 Líneas por Zona -->
                <div class="shipping-zone-card-block" data-zone-key="${zoneKey}" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; margin-bottom: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    
                    <!-- LÍNEA 1 (SIEMPRE VISIBLE): Título Desplegable + Habilitado + Costo ($) -->
                    <div style="padding: 0.85rem 1.1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: #ffffff;">
                        
                        <!-- Título de la Zona que despliega la Cascada al tocarlo -->
                        <div onclick="window.toggleZoneCascade('${zoneKey}')" style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px;" title="Tocar para desplegar localidades">
                            <span class="material-symbols-outlined" id="zone-icon-${zoneKey}" style="font-size: 20px; color: #0284c7; transition: transform 0.2s;">expand_more</span>
                            <div>
                                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                                    ${zMeta.title}
                                    <span style="font-size: 0.72rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px;">${zMeta.cities.length} loc.</span>
                                </h4>
                                <div style="font-size: 0.73rem; color: #64748b; margin-top: 1px;">
                                    ${zMeta.cpRange || 'C.P.'}
                                </div>
                            </div>
                        </div>

                        <!-- Controles de Habilitado y Costo en Línea 1 -->
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #334155; cursor: pointer;">
                                <input type="checkbox" class="ship-zone-active-chk" data-mode="${currentShipMode}" data-zone="${zoneKey}" ${zVal.active !== false ? 'checked' : ''} style="width: 17px; height: 17px; accent-color: #0f172a; cursor: pointer;">
                                <span>Habilitado</span>
                            </label>

                            <div style="display: flex; align-items: center; gap: 4px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.25rem 0.6rem;">
                                <span style="font-size: 0.78rem; font-weight: 800; color: #64748b;">$</span>
                                <input type="number" class="ship-zone-cost-in" data-mode="${currentShipMode}" data-zone="${zoneKey}" value="${zVal.baseCost !== undefined ? zVal.baseCost : 0}" placeholder="0" style="width: 90px; border: none; background: transparent; font-size: 0.9rem; font-weight: 800; color: #0f172a; outline: none;">
                            </div>
                        </div>

                    </div>

                    <!-- CONTENIDO EN CASCADA (DESPLEGABLE AL TOCAR EL TÍTULO) -->
                    <div id="zone-cascade-${zoneKey}" style="display: none; padding: 0.85rem 1.1rem; border-top: 1px solid #f1f5f9; background: #fafafa;">
                        
                        <!-- LÍNEA 2: Filtro / Buscador + Añadir Nueva Localidad -->
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.75rem; flex-wrap: wrap;">
                            <input type="text" id="add-city-name-${zoneKey}" placeholder="Localidad o Ciudad (Ej: Morón)" style="flex: 2; min-width: 140px; padding: 0.45rem 0.75rem; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 0.8rem; outline: none; background: white;">
                            <input type="text" id="add-city-cp-${zoneKey}" placeholder="C.P. (Ej: 1708)" style="flex: 1; min-width: 80px; padding: 0.45rem 0.75rem; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 0.8rem; outline: none; background: white;">
                            <button type="button" onclick="window.addCityToZone('${currentShipMode}', '${zoneKey}')" style="background: #0f172a; color: white; border: none; padding: 0.45rem 0.9rem; border-radius: 8px; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                                <span class="material-symbols-outlined" style="font-size: 15px;">add</span> Añadir
                            </button>
                        </div>

                        <!-- LÍNEA 3: Lista en Cascada Vertical con Ícono de Lápiz (✏️) para Editar -->
                        <div style="display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; padding-right: 4px;">
                            ${zMeta.cities.map((city, idx) => `
                                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; font-weight: 700; color: #1e293b;">
                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${city}</span>
                                    
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <!-- Ícono de Lápiz para Editar Localidad / C.P. -->
                                        <button type="button" onclick="window.editCityInZone('${currentShipMode}', '${zoneKey}', ${idx})" style="background: none; border: none; color: #0284c7; cursor: pointer; padding: 0; display: flex; align-items: center;" title="Editar localidad / C.P.">
                                            <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                        </button>
                                        <!-- Ícono de Basura para Eliminar -->
                                        <button type="button" onclick="window.removeCityFromZone('${currentShipMode}', '${zoneKey}', ${idx})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; display: flex; align-items: center;" title="Eliminar localidad">
                                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                    </div>

                </div>
            `;
        });

        container.innerHTML = html;

        // Escuchadores para GUARDADO AUTOMÁTICO EN TIEMPO REAL
        const inputsCost = container.querySelectorAll('.ship-zone-cost-in');
        const chksActive = container.querySelectorAll('.ship-zone-active-chk');

        inputsCost.forEach(input => {
            input.addEventListener('input', window.saveAdminShippingRatesSilently);
            input.addEventListener('change', window.saveAdminShippingRatesSilently);
        });

        chksActive.forEach(chk => {
            chk.addEventListener('change', window.saveAdminShippingRatesSilently);
        });
    };

    // Alternar Despliegue de Cascada al tocar el título
    window.toggleZoneCascade = function(zoneKey) {
        const cascade = document.getElementById(`zone-cascade-${zoneKey}`);
        const icon = document.getElementById(`zone-icon-${zoneKey}`);
        if (!cascade) return;
        
        const isHidden = cascade.style.display === 'none';
        cascade.style.display = isHidden ? 'block' : 'none';
        if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    };

    // Editar Localidad / C.P. con Ícono de Lápiz
    window.editCityInZone = function(mode, zoneKey, cityIndex) {
        const catalogs = window.sessionShippingZoneCatalogs || defaultZoneCatalogs;
        if (catalogs[mode] && catalogs[mode][zoneKey]) {
            const currentLabel = catalogs[mode][zoneKey].cities[cityIndex] || '';
            const newLabel = prompt('Editar Nombre de Ciudad y Código Postal (C.P.):', currentLabel);
            if (newLabel && newLabel.trim()) {
                catalogs[mode][zoneKey].cities[cityIndex] = newLabel.trim();
                localStorage.setItem('sessionShippingZoneCatalogs', JSON.stringify(catalogs));
                window.renderAdminShipping();
                window.saveAdminShippingRatesSilently();
            }
        }
    };

    // Agregar Ciudad con su C.P.
    window.addCityToZone = function(mode, zoneKey) {
        const nameIn = document.getElementById(`add-city-name-${zoneKey}`);
        const cpIn = document.getElementById(`add-city-cp-${zoneKey}`);
        if (!nameIn) return;

        const nameVal = nameIn.value.trim();
        const cpVal = cpIn ? cpIn.value.trim() : '';

        if (!nameVal) return alert('Por favor escribí el nombre de la ciudad o localidad.');

        const fullLabel = cpVal ? `${nameVal} (${cpVal})` : nameVal;

        const catalogs = window.sessionShippingZoneCatalogs || defaultZoneCatalogs;
        if (catalogs[mode] && catalogs[mode][zoneKey]) {
            catalogs[mode][zoneKey].cities.push(fullLabel);
            localStorage.setItem('sessionShippingZoneCatalogs', JSON.stringify(catalogs));
            window.renderAdminShipping();
            window.saveAdminShippingRatesSilently();
        }
    };

    window.removeCityFromZone = function(mode, zoneKey, cityIndex) {
        const catalogs = window.sessionShippingZoneCatalogs || defaultZoneCatalogs;
        if (catalogs[mode] && catalogs[mode][zoneKey]) {
            catalogs[mode][zoneKey].cities.splice(cityIndex, 1);
            localStorage.setItem('sessionShippingZoneCatalogs', JSON.stringify(catalogs));
            window.renderAdminShipping();
            window.saveAdminShippingRatesSilently();
        }
    };

    window.addNewShippingZone = function(mode) {
        const title = prompt('Nombre / Título de la nueva zona o cordón:');
        if (!title || !title.trim()) return;

        const zoneKey = 'custom_zone_' + Date.now();
        const catalogs = window.sessionShippingZoneCatalogs || defaultZoneCatalogs;
        if (!catalogs[mode]) catalogs[mode] = {};

        catalogs[mode][zoneKey] = {
            title: title.trim(),
            badge: 'Zona Personalizada',
            cpRange: 'C.P. Mapeados',
            cities: []
        };

        const fullData = window.sessionShippingFullData || defaultShippingData;
        if (!fullData[mode]) fullData[mode] = {};
        fullData[mode][zoneKey] = { active: true, baseCost: 0 };

        localStorage.setItem('sessionShippingZoneCatalogs', JSON.stringify(catalogs));
        localStorage.setItem('sessionShippingFullData', JSON.stringify(fullData));
        window.renderAdminShipping();
        window.saveAdminShippingRatesSilently();
    };

    window.removeShippingZone = function(mode, zoneKey) {
        if (!confirm('¿Estás seguro de eliminar esta zona de envíos?')) return;
        const catalogs = window.sessionShippingZoneCatalogs || defaultZoneCatalogs;
        if (catalogs[mode] && catalogs[mode][zoneKey]) {
            delete catalogs[mode][zoneKey];
            localStorage.setItem('sessionShippingZoneCatalogs', JSON.stringify(catalogs));
        }

        const fullData = window.sessionShippingFullData || defaultShippingData;
        if (fullData[mode] && fullData[mode][zoneKey]) {
            delete fullData[mode][zoneKey];
            localStorage.setItem('sessionShippingFullData', JSON.stringify(fullData));
        }

        window.renderAdminShipping();
        window.saveAdminShippingRatesSilently();
    };

    window.applyFluxDefaults = function() {
        if (!window.sessionShippingFullData) window.sessionShippingFullData = defaultShippingData;
        window.sessionShippingFullData.logistica = {
            caba: { active: true, baseCost: 4070 },
            cordon_1: { active: true, baseCost: 5380 },
            cordon_2: { active: true, baseCost: 8280 },
            resto_provincias: { active: true, baseCost: 0, requireWA: true }
        };
        window.renderAdminShipping();
        window.saveAdminShippingRatesSilently();
    };

    // GUARDADO AUTOMÁTICO SILENCIOSO (Sin popups molestos)
    window.saveAdminShippingRatesSilently = async function() {
        const fullData = window.sessionShippingFullData || defaultShippingData;
        const modes = ['logistica', 'flete', 'otro'];

        modes.forEach(mode => {
            if (!fullData[mode]) fullData[mode] = {};
            const activeChkList = document.querySelectorAll(`.ship-zone-active-chk[data-mode="${mode}"]`);

            activeChkList.forEach(activeChk => {
                const zoneKey = activeChk.dataset.zone;
                const costIn = document.querySelector(`.ship-zone-cost-in[data-mode="${mode}"][data-zone="${zoneKey}"]`);

                fullData[mode][zoneKey] = {
                    active: activeChk ? activeChk.checked : true,
                    baseCost: costIn ? (parseFloat(costIn.value) || 0) : 0
                };
            });
        });

        window.sessionShippingFullData = fullData;
        localStorage.setItem('sessionShippingFullData', JSON.stringify(fullData));

        try {
            await fetch('/api/save-shipping-full', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullData)
            });
        } catch (e) {
            // Guardado en memoria local completado
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        // Inicialización automática
    });
})();
