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
            <div class="admin-page-header">
                <div>
                    <h3 class="admin-header-title">
                        <span class="material-symbols-outlined">local_shipping</span>
                        ${currentMeta.title}
                    </h3>
                    <p class="admin-header-desc">${currentMeta.subtitle}</p>
                </div>
                <div class="admin-header-actions">
                    <button type="button" onclick="window.addNewShippingZone('${currentShipMode}')" class="btn-outline">
                        <span class="material-symbols-outlined">add</span> Crear Zona
                    </button>
                    ${currentShipMode === 'logistica' ? `
                        <button type="button" onclick="window.applyFluxDefaults()" class="btn-primary">
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
                <div class="shipping-zone-card-block admin-card" data-zone-key="${zoneKey}">
                    
                    <!-- LÍNEA 1 (SIEMPRE VISIBLE): Título Desplegable + Habilitado + Costo ($) -->
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                        
                        <!-- Título de la Zona que despliega la Cascada al tocarlo -->
                        <div onclick="window.toggleZoneCascade('${zoneKey}')" style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px;" title="Tocar para desplegar localidades">
                            <span class="material-symbols-outlined" id="zone-icon-${zoneKey}" style="font-size: 20px; color: var(--admin-accent); transition: transform 0.2s;">expand_more</span>
                            <div>
                                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--admin-text-main); display: flex; align-items: center; gap: 6px;">
                                    ${zMeta.title}
                                    <span style="font-size: 0.72rem; font-weight: 700; color: var(--admin-text-muted); background: var(--admin-surface-hover); padding: 2px 8px; border-radius: var(--admin-radius-sm);">${zMeta.cities.length} loc.</span>
                                </h4>
                                <div style="font-size: 0.73rem; color: var(--admin-text-muted); margin-top: 1px;">
                                    ${zMeta.cpRange || 'C.P.'}
                                </div>
                            </div>
                        </div>

                        <!-- Controles de Habilitado y Costo en Línea 1 -->
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; color: var(--admin-text-secondary); cursor: pointer;">
                                <input type="checkbox" class="ship-zone-active-chk" data-mode="${currentShipMode}" data-zone="${zoneKey}" ${zVal.active !== false ? 'checked' : ''} style="width: 17px; height: 17px; accent-color: var(--admin-accent); cursor: pointer;">
                                <span>Habilitado</span>
                            </label>

                            <div style="display: flex; align-items: center; gap: 4px; background: var(--admin-surface-hover); border: 1.5px solid var(--admin-border-color); border-radius: var(--admin-radius-sm); padding: 0.25rem 0.6rem;">
                                <span style="font-size: 0.78rem; font-weight: 800; color: var(--admin-text-muted);">$</span>
                                <input type="number" class="ship-zone-cost-in" data-mode="${currentShipMode}" data-zone="${zoneKey}" value="${zVal.baseCost !== undefined ? zVal.baseCost : 0}" placeholder="0" style="width: 90px; border: none; background: transparent; font-size: 0.9rem; font-weight: 700; color: var(--admin-text-main); outline: none;">
                            </div>
                        </div>

                    </div>

                    <!-- CONTENIDO EN CASCADA (DESPLEGABLE AL TOCAR EL TÍTULO) -->
                    <div id="zone-cascade-${zoneKey}" style="display: none; margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid var(--admin-border-color);">
                        
                        <!-- LÍNEA 2: Filtro / Buscador + Añadir Nueva Localidad -->
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.75rem; flex-wrap: wrap;">
                            <input type="text" id="add-city-name-${zoneKey}" class="premium-input" placeholder="Localidad o Ciudad (Ej: Morón)" style="flex: 2; min-width: 140px;">
                            <input type="text" id="add-city-cp-${zoneKey}" class="premium-input" placeholder="C.P. (Ej: 1708)" style="flex: 1; min-width: 80px;">
                            <button type="button" onclick="window.addCityToZone('${currentShipMode}', '${zoneKey}')" class="btn-primary" style="padding: 0.55rem 0.9rem; font-size: 0.8rem;">
                                <span class="material-symbols-outlined" style="font-size: 16px;">add</span> Añadir
                            </button>
                        </div>

                        <!-- LÍNEA 3: Lista en Cascada Vertical con Ícono de Lápiz (✏️) para Editar -->
                        <div style="display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; padding-right: 4px;">
                            ${zMeta.cities.map((city, idx) => `
                                <div style="background: var(--admin-surface-hover); border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-sm); padding: 6px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; font-weight: 600; color: var(--admin-text-main);">
                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${city}</span>
                                    
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <!-- Ícono de Lápiz para Editar Localidad / C.P. -->
                                        <button type="button" onclick="window.editCityInZone('${currentShipMode}', '${zoneKey}', ${idx})" class="admin-action-btn edit" title="Editar localidad / C.P.">
                                            <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                        </button>
                                        <!-- Ícono de Basura para Eliminar -->
                                        <button type="button" onclick="window.removeCityFromZone('${currentShipMode}', '${zoneKey}', ${idx})" class="admin-action-btn delete" title="Eliminar localidad">
                                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

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

    // 🗺️ BUSCADOR Y MAPA INTERACTIVO DE CÓDIGO POSTAL CON LEAFLET
    window.renderAdminPostalResult = function(query) {
        const cardContainer = document.getElementById('admin-postal-result-card');
        if (!cardContainer) return;

        if (!query || !query.trim()) {
            cardContainer.style.display = 'none';
            cardContainer.innerHTML = '';
            return;
        }

        const res = window.lookupPostalCode ? window.lookupPostalCode(query) : null;
        cardContainer.style.display = 'block';

        if (!res) {
            cardContainer.innerHTML = `
                <div style="background: #FFFBEB; border: 1.5px solid #FCD34D; border-radius: 12px; padding: 1rem; color: #92400E; display: flex; align-items: flex-start; gap: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                    <span class="material-symbols-outlined" style="color: #D97706; font-size: 24px; margin-top: 2px;">warning</span>
                    <div>
                        <strong style="font-size: 0.92rem; display: block; margin-bottom: 2px;">Código Postal no encontrado</strong>
                        <span style="font-size: 0.82rem; line-height: 1.4; color: #B45309;">El número o localidad de "<strong>${query}</strong>" no se encuentra registrado en el padrón oficial de Argentina. Por favor verificá el número e intentá nuevamente.</span>
                    </div>
                </div>
            `;
            return;
        }

        const mapId = 'admin-postal-result-map';

        cardContainer.innerHTML = `
            <div style="background: #FAF9F6; border: 1.5px solid var(--admin-accent); border-radius: 14px; padding: 1.15rem; box-shadow: 0 4px 14px rgba(160, 113, 91, 0.08); position: relative;">
                
                <!-- 1. PROVINCIA (Header Prominente) -->
                <div style="background: #1C1917; color: #FAF9F6; border-radius: 10px; padding: 0.65rem 1rem; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="color: #A0715B; font-size: 22px;">map</span>
                        <div>
                            <div style="font-size: 0.65rem; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; color: #A0715B;">PROVINCIA PRIMORDIAL</div>
                            <div style="font-size: 1.05rem; font-weight: 900; letter-spacing: 0.5px;">${res.provincia}</div>
                        </div>
                    </div>
                    <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 800; color: #FAF9F6;">CP ${res.cp}</span>
                </div>

                <!-- 2. UBICACIÓN (Jerarquía Descente) -->
                <div style="background: white; border: 1px solid #E7E5E4; border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 0.85rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                    <div>
                        <div style="font-size: 0.68rem; font-weight: 800; color: #78716C; text-transform: uppercase;">2. LOCALIDAD / PARTIDO</div>
                        <div style="font-size: 0.95rem; font-weight: 800; color: #1C1917;">${res.localidad}</div>
                        <div style="font-size: 0.78rem; color: #78716C; font-weight: 600;">(${res.partido})</div>
                    </div>
                    <div>
                        <div style="font-size: 0.68rem; font-weight: 800; color: #78716C; text-transform: uppercase;">3. BARRIO / ZONA</div>
                        <div style="font-size: 0.95rem; font-weight: 800; color: #1C1917;">${res.barrio}</div>
                    </div>
                </div>

                <!-- 🗺️ MINIMAPA INTERACTIVO DE UBICACIÓN Y DISTANCIA -->
                <div style="background: white; border: 1.5px solid #E7E5E4; border-radius: 12px; overflow: hidden; margin-bottom: 0.85rem; position: relative;">
                    <div style="padding: 0.5rem 0.85rem; background: #FAF9F6; border-bottom: 1px solid #E7E5E4; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: var(--admin-accent); display: flex; align-items: center; justify-content: space-between;">
                        <span style="display: flex; align-items: center; gap: 5px;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">explore</span>
                            Mapa Interactivo de Ubicación &amp; Recorrido
                        </span>
                        <span style="font-size: 0.7rem; color: #78716C; font-weight: 600;">
                            📍 Hurlingham ➔ 📌 ${res.localidad} (${res.provincia})
                        </span>
                    </div>
                    <div id="${mapId}" style="height: 220px; width: 100%; background: #F5F5F4; z-index: 1;"></div>
                </div>

                <!-- 3. COINCIDENCIA / GRUPOS DE ENVÍO -->
                <div style="margin-bottom: 0.85rem;">
                    <div style="font-size: 0.72rem; font-weight: 800; color: #78716C; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 14px;">groups</span>
                        Coincidencia con Grupos de Envío Cargados
                    </div>

                    ${res.hasLocalMatch ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <!-- Tarjeta Logística -->
                            <div style="background: white; border: 1.5px solid ${res.logistica.active ? '#0284c7' : '#e2e8f0'}; border-radius: 10px; padding: 0.75rem 0.9rem;">
                                <div style="font-size: 0.72rem; font-weight: 800; color: #0284c7; text-transform: uppercase;">📦 Logística (Courier)</div>
                                <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${res.logistica.zoneName}</div>
                                <div style="font-size: 1.1rem; font-weight: 900; color: ${res.logistica.cost > 0 ? '#0284c7' : '#64748b'}; margin-top: 4px;">${res.logistica.costFormatted}</div>
                            </div>
                            <!-- Tarjeta Flete -->
                            <div style="background: white; border: 1.5px solid ${res.flete.active ? '#059669' : '#e2e8f0'}; border-radius: 10px; padding: 0.75rem 0.9rem;">
                                <div style="font-size: 0.72rem; font-weight: 800; color: #059669; text-transform: uppercase;">🚛 Flete Particular</div>
                                <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${res.flete.zoneName}</div>
                                <div style="font-size: 1.1rem; font-weight: 900; color: ${res.flete.cost > 0 ? '#059669' : '#64748b'}; margin-top: 4px;">${res.flete.costFormatted}</div>
                            </div>
                        </div>
                    ` : `
                        <div style="background: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 10px; padding: 0.85rem 1rem; color: #991B1B;">
                            <div style="font-size: 0.88rem; font-weight: 800; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <span class="material-symbols-outlined" style="font-size: 18px; color: #DC2626;">cancel</span>
                                Sin coincidencia con grupos de envío propio / flete local
                            </div>
                            <div style="font-size: 0.8rem; line-height: 1.4; color: #7F1D1D; margin-bottom: 0.75rem;">
                                ${res.recommendationText}
                            </div>
                            <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #991B1B; margin-bottom: 6px;">
                                Cotizar directamente en webs de Expreso:
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                ${res.logisticsLinks.map(l => `
                                    <a href="${l.url}" target="_blank" rel="noopener noreferrer" style="background: ${l.color}; color: white; border-radius: 6px; padding: 0.4rem 0.75rem; font-size: 0.78rem; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                        ${l.name} ↗
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    `}
                </div>

            </div>
        `;

        // Render Leaflet Map
        initPostalResultMap(res, mapId);
    };

    function initPostalResultMap(res, containerId) {
        setTimeout(() => {
            const el = document.getElementById(containerId);
            if (!el) return;

            loadLeafletIfNeeded(function() {
                if (!window.L) return;

                if (!window.activeAdminPostalMaps) window.activeAdminPostalMaps = {};
                if (window.activeAdminPostalMaps[containerId]) {
                    try { window.activeAdminPostalMaps[containerId].remove(); } catch(e){}
                }

                const origin = res.originCoords || [-34.5898, -58.6384]; // Hurlingham
                const dest = res.coords || [-34.5898, -58.6384];

                const map = L.map(containerId, {
                    zoomControl: true,
                    attributionControl: false
                }).setView(dest, 11);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    maxZoom: 19,
                    subdomains: 'abcd'
                }).addTo(map);

                const originIcon = L.divIcon({
                    className: 'custom-map-pin origin-pin',
                    html: `<div style="background: #1C1917; color: #FAF9F6; border: 2px solid #A0715B; padding: 4px 9px; border-radius: 20px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px;">
                              <span>🌲 Taller Hurlingham</span>
                           </div>`,
                    iconSize: [120, 30],
                    iconAnchor: [60, 15]
                });

                const destIcon = L.divIcon({
                    className: 'custom-map-pin dest-pin',
                    html: `<div style="background: #A0715B; color: white; border: 2px solid white; padding: 4px 9px; border-radius: 20px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px;">
                              <span>📍 ${res.localidad}</span>
                           </div>`,
                    iconSize: [130, 30],
                    iconAnchor: [65, 15]
                });

                L.marker(origin, { icon: originIcon }).addTo(map).bindPopup('<b>Taller La Tarima</b><br>Hurlingham (CP 1686)');
                L.marker(dest, { icon: destIcon }).addTo(map).bindPopup(`<b>${res.localidad}</b><br>${res.provincia} (CP ${res.cp})`);

                if (Math.abs(origin[0] - dest[0]) > 0.001 || Math.abs(origin[1] - dest[1]) > 0.001) {
                    L.polyline([origin, dest], {
                        color: '#A0715B',
                        weight: 3,
                        opacity: 0.75,
                        dashArray: '6, 8'
                    }).addTo(map);

                    const bounds = L.latLngBounds([origin, dest]);
                    map.fitBounds(bounds, { padding: [35, 35] });
                } else {
                    map.setView(origin, 13);
                }

                window.activeAdminPostalMaps[containerId] = map;
                setTimeout(() => map.invalidateSize(), 200);
            });
        }, 100);
    }

    function loadLeafletIfNeeded(callback) {
        if (window.L) return callback();

        if (!document.getElementById('leaflet-css')) {
            const css = document.createElement('link');
            css.id = 'leaflet-css';
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
        }

        if (document.getElementById('leaflet-js')) {
            const js = document.getElementById('leaflet-js');
            js.addEventListener('load', callback);
        } else {
            const js = document.createElement('script');
            js.id = 'leaflet-js';
            js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            js.onload = callback;
            document.head.appendChild(js);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Inicialización automática
    });
})();
