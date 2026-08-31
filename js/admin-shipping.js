// js/admin-shipping.js
// --- MÓDULO ADMIN GESTIÓN DE TARIFAS Y ZONAS DE ENVÍO POR MODALIDAD (LOGÍSTICA FLUX & FLETE HURLINGHAM) ---

(function() {
    let currentShipMode = 'logistica'; // 'logistica' | 'flete' | 'otro'

    // 1. Zonas de Logística (Basadas en el Tarifario Base Flux Logística)
    const logisticaZoneCatalog = {
        caba: {
            title: '🏙️ 1. CABA (Capital Federal)',
            badge: 'Tarifa Base Flux: $4.070',
            cpRange: 'C.P. 1000 – 1499',
            cities: ['Agronomía', 'Almagro', 'Balvanera', 'Barracas', 'Belgrano', 'Boedo', 'Caballito', 'Chacarita', 'Coghlan', 'Constitución', 'Flores', 'Floresta', 'La Boca', 'La Paternal', 'Liniers', 'Mataderos', 'Monte Castro', 'Monserrat', 'Núñez', 'Nueva Pompeya', 'Palermo', 'Parque Avellaneda', 'Parque Chacabuco', 'Parque Chas', 'Parque Patricios', 'Puerto Madero', 'Recoleta', 'Retiro', 'San Cristóbal', 'San Nicolás', 'San Telmo', 'Saavedra', 'Villa Crespo', 'Villa del Parque', 'Villa Devoto', 'Villa General Mitre', 'Villa Luro', 'Villa Ortúzar', 'Villa Pueyrredón', 'Villa Real', 'Villa Riachuelo', 'Villa Santa Rita', 'Villa Soldati', 'Villa Urquiza', 'Villa Lugano', 'Versalles', 'Vélez Sarsfield']
        },
        cordon_1: {
            title: '🟣 2. CORDÓN 1 (GBA Cercano)',
            badge: 'Tarifa Base Flux: $5.380',
            cpRange: 'C.P. 1600–1699 (parte), 1700–1799 (parte), 1800–1899 (parte)',
            cities: [
                'Vicente López', 'San Isidro', 'San Fernando', 'Gral. San Martín',
                'Tres de Febrero', 'Hurlingham', 'Morón', 'Ituzaingó', 'La Matanza (Primer Cordón)',
                'Avellaneda', 'Lanús', 'Lomas de Zamora'
            ]
        },
        cordon_2: {
            title: '🟠 3. CORDÓN 2 (GBA Alejado / Extendido)',
            badge: 'Tarifa Base Flux: $8.280',
            cpRange: 'C.P. 1600–1699 (alejado), 1700–1799 (alejado), 1800–1899 (alejado), 1900',
            cities: [
                'Tigre', 'Malvinas Argentinas', 'José C. Paz', 'San Miguel', 'Escobar', 'Pilar', 'Campana', 'Zárate',
                'Moreno', 'General Rodríguez', 'Luján', 'Merlo', 'Marcos Paz', 'La Matanza (Segundo Cordón)',
                'Quilmes', 'Berazategui', 'Florencio Varela', 'Almirante Brown', 'Esteban Echeverría', 'Ezeiza',
                'Cañuelas', 'San Vicente', 'Presidente Perón', 'Ensenada', 'Berisso', 'La Plata'
            ]
        },
        resto_provincias: {
            title: '🇦🇷 4. Resto del País (Provincias / Expreso)',
            badge: 'Provincias de Argentina',
            cpRange: 'C.P. 2000 – 9999',
            cities: [
                'Santa Fe', 'Córdoba', 'Mendoza', 'Salta', 'Misiones', 'Tucumán', 'Entre Ríos',
                'Corrientes', 'Chaco', 'Neuquén', 'Río Negro', 'Chubut', 'Santa Cruz', 'Tierra del Fuego',
                'Jujuy', 'San Juan', 'San Luis', 'La Rioja', 'Catamarca', 'Santiago del Estero', 'Formosa'
            ]
        }
    };

    // 2. Zonas de Flete Particular (Centradas en el Origen Hurlingham)
    const fleteZoneCatalog = {
        flete_zona_1: {
            title: '🟡 ZONA 1: Hurlingham (Zona Local de Origen)',
            badge: 'Origen Base: Hurlingham',
            cpRange: 'C.P. 1686, 1688 (Hurlingham, Villa Tesei, William Morris)',
            cities: ['Hurlingham', 'Villa Tesei', 'William Morris']
        },
        flete_zona_2: {
            title: '🟢 ZONA 2: Cordón Cercano a Hurlingham',
            badge: 'Partidos Limitrofes',
            cpRange: 'C.P. 1682, 1708, 1714, 1650, 1663',
            cities: ['Ituzaingó', 'Morón', 'Tres de Febrero', 'San Martín', 'San Miguel']
        },
        flete_zona_3: {
            title: '🔵 ZONA 3: Cordón Extendido Flete',
            badge: 'GBA Norte, GBA Oeste Alejado y CABA',
            cpRange: 'C.P. 1000–1499, 1600–1699, 1744, 1665',
            cities: ['CABA', 'Vicente López', 'San Isidro', 'San Fernando', 'Tigre', 'Malvinas Argentinas', 'José C. Paz', 'Moreno']
        },
        flete_fuera_rango: {
            title: '🚛 Fuera de Rango Flete Directo',
            badge: 'GBA Sur Alejado, Interior Bs.As. y Provincias',
            cpRange: 'Resto de Códigos Postales',
            cities: ['Quilmes', 'Berazategui', 'La Plata', 'Luján', 'Ezeiza', 'Cañuelas', 'Provincias (Consulta por WhatsApp)']
        }
    };

    // 3. Zonas de Otro / Expreso
    const otroZoneCatalog = {
        otro_amba: {
            title: '🚚 AMBA / Gran Buenos Aires',
            badge: 'Envíos Especiales AMBA',
            cpRange: 'C.P. 1000 – 1899',
            cities: ['CABA', 'Zona Norte', 'Zona Oeste', 'Zona Sur']
        },
        otro_interior: {
            title: '🇦🇷 Expreso al Interior del País',
            badge: 'Envíos por Transporte / Expreso',
            cpRange: 'C.P. 1900 – 9999',
            cities: ['Santa Fe', 'Córdoba', 'Mendoza', 'Salta', 'Misiones', 'Tucumán', 'Entre Ríos', 'Patagonia', 'Norte Argentino']
        }
    };

    // Estructura de tarifas predeterminadas
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
        const stored = localStorage.getItem('sessionShippingFullData');
        if (stored) {
            try {
                window.sessionShippingFullData = JSON.parse(stored);
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

        // Configurar pestañas de submodalidad
        const subtabBtns = document.querySelectorAll('.admin-shipping-subtab-btn');
        subtabBtns.forEach(btn => {
            const mode = btn.dataset.shipMode;
            if (mode === currentShipMode) {
                btn.classList.add('active');
                btn.style.borderColor = '#0284c7';
                btn.style.background = '#e0f2fe';
                btn.style.color = '#0284c7';
            } else {
                btn.classList.remove('active');
                btn.style.borderColor = '#cbd5e1';
                btn.style.background = '#f8fafc';
                btn.style.color = '#475569';
            }

            btn.onclick = () => {
                currentShipMode = mode;
                window.renderAdminShipping();
            };
        });

        const fullData = window.sessionShippingFullData || defaultShippingData;
        const currentModeData = fullData[currentShipMode] || defaultShippingData[currentShipMode] || {};

        const modeTitles = {
            logistica: { title: '📦 Tarifas: Logística (Tarifario Base Flux: CABA $4070, Cordón 1 $5380, Cordón 2 $8280)', color: '#0284c7', bg: '#e0f2fe', catalog: logisticaZoneCatalog },
            flete: { title: '🚛 Tarifas: Flete Particular (Origen Hurlingham -> Zona 1, Zona 2, Zona 3)', color: '#047857', bg: '#d1fae5', catalog: fleteZoneCatalog },
            otro: { title: '🚚 Tarifas: Otro / Expreso Personalizado', color: '#6b21a8', bg: '#f3e8ff', catalog: otroZoneCatalog }
        };

        const currentMeta = modeTitles[currentShipMode];
        const activeCatalog = currentMeta.catalog;

        let html = `
            <!-- Cabecera de Modalidad Activa -->
            <div style="background: ${currentMeta.bg}; border: 1.5px solid ${currentMeta.color}; border-radius: 12px; padding: 0.9rem 1.1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="font-weight: 800; color: ${currentMeta.color}; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                    ${currentMeta.title}
                </div>
                <div style="font-size: 0.78rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 10px;">
                    ${currentShipMode === 'logistica' ? `
                        <button type="button" onclick="window.applyFluxDefaults()" style="background: #0284c7; color: white; border: none; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; cursor: pointer;">
                            ⚡ Cargar Precios Flux ($4070 / $5380 / $8280)
                        </button>
                    ` : (currentShipMode === 'flete' ? `
                        <span style="background: #d1fae5; color: #047857; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 0.76rem;">📍 Origen Base: Hurlingham</span>
                    ` : '')}
                </div>
            </div>
        `;

        Object.keys(activeCatalog).forEach(zoneKey => {
            const zMeta = activeCatalog[zoneKey];
            const zVal = (currentModeData && currentModeData[zoneKey]) ? currentModeData[zoneKey] : { active: true, baseCost: 0 };

            html += `
                <div class="shipping-zone-card-block" data-zone-key="${zoneKey}" style="background: white; border: 1.5px solid #0284c7; border-radius: 14px; padding: 1.1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 0.85rem;">
                    <!-- Encabezado de la Zona -->
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                        <div>
                            <h4 style="margin: 0; font-size: 1.02rem; font-weight: 800; color: #0f172a;">${zMeta.title}</h4>
                            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                                <span style="font-family: monospace; font-weight: 700; color: #0284c7;">${zMeta.cpRange}</span> &bull; ${zMeta.badge}
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #334155; cursor: pointer;">
                                <input type="checkbox" class="ship-zone-active-chk" data-mode="${currentShipMode}" data-zone="${zoneKey}" ${zVal.active !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: ${currentMeta.color};">
                                <span>Habilitado</span>
                            </label>

                            <div style="display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 4px 10px; border-radius: 8px; border: 1.5px solid #cbd5e1;">
                                <span style="font-size: 0.78rem; font-weight: 800; color: #475569;">Costo ($):</span>
                                <input type="number" class="ship-zone-cost-in" data-mode="${currentShipMode}" data-zone="${zoneKey}" value="${zVal.baseCost !== undefined ? zVal.baseCost : 0}" placeholder="Ej: 4500 (0 = Cotizar WA)" style="width: 120px; padding: 0.35rem 0.6rem; font-size: 0.88rem; font-weight: 800; color: #0f172a; border: 1.5px solid #cbd5e1; border-radius: 6px; outline: none;">
                            </div>
                        </div>
                    </div>

                    <!-- Acordeón de Ciudades y Partidos Incluidos -->
                    <details style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.6rem 0.85rem;">
                        <summary style="font-size: 0.8rem; font-weight: 800; color: #334155; cursor: pointer; user-select: none;">
                            📍 Ver Partidos / Ciudades Incluidas (${zMeta.cities.length})
                        </summary>
                        <div class="zone-city-tags-wrapper" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 0.75rem; max-height: 180px; overflow-y: auto; padding-right: 4px;">
                            ${zMeta.cities.map(c => `<span class="city-tag" style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; font-size: 0.76rem; color: #1e293b; font-weight: 600;">${c}</span>`).join('')}
                        </div>
                    </details>
                </div>
            `;
        });

        container.innerHTML = html;
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
    };

    window.saveAdminShippingRates = async function() {
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
            console.error('Guardado local realizado.');
        }

        if (window.showAdminToast) {
            window.showAdminToast('✅ Tarifas de envíos guardadas exitosamente.');
        } else {
            alert('✅ Tarifas de envíos guardadas exitosamente.');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const btnSave = document.getElementById('btn-save-shipping-rates');
        if (btnSave) {
            btnSave.addEventListener('click', window.saveAdminShippingRates);
        }
    });
})();
