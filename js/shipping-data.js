// js/shipping-data.js
// Base de datos de cobertura de mensajería propia (AMBA) y configuración por defecto

(function() {
    const defaultShippingConfig = {
        cutoffHour: 12, // Horario de corte (12 = 12:00 PM)
        sameDayDeliveryEnabled: true,
        pricingMode: "zone", // "zone" (por zona) o "city" (tarifa por ciudad)
        sameDayText: "Llega HOY comprando antes de las 12:00 hs",
        nextDayText: "Llega MAÑANA comprando después de las 12:00 hs",
        zones: {
            caba: {
                id: "caba",
                name: "Capital Federal (CABA)",
                basePrice: 3500,
                enabled: true,
                badgeColor: "#00A896",
                cities: [
                    "Agronomía", "Almagro", "Balvanera", "Barracas", "Belgrano", "Boedo", "Caballito", 
                    "Chacarita", "Coghlan", "Constitución", "Flores", "Floresta", "La Boca", "La Paternal", 
                    "Liniers", "Mataderos", "Monte Castro", "Monserrat", "Núñez", "Nueva Pompeya", "Palermo", 
                    "Parque Avellaneda", "Parque Chacabuco", "Parque Chas", "Parque Patricios", "Puerto Madero", 
                    "Recoleta", "Retiro", "San Cristóbal", "San Nicolás", "San Telmo", "Saavedra", "Villa Crespo", 
                    "Villa del Parque", "Villa Devoto", "Villa General Mitre", "Villa Luro", "Villa Ortúzar", 
                    "Villa Pueyrredón", "Villa Real", "Villa Riachuelo", "Villa Santa Rita", "Villa Soldati", 
                    "Villa Urquiza", "Villa Lugano", "Versalles", "Vélez Sarsfield"
                ],
                customCityPrices: {}
            },
            zona_norte: {
                id: "zona_norte",
                name: "Zona Norte",
                basePrice: 4800,
                enabled: true,
                badgeColor: "#028090",
                cities: [
                    "Alberti", "Benavídez", "Boulogne", "Campana", "Churruca", "Don Torcuato", "El Talar", 
                    "Fátima", "Garín", "General Maschwitz", "Munro", "Nordelta", "Pilar", "San Fernando", 
                    "San Isidro", "San Martín", "Santos Lugares", "Tigre", "Vicente López", "Villa Ballester", 
                    "Villa Rosa", "Zárate"
                ],
                customCityPrices: {}
            },
            zona_oeste: {
                id: "zona_oeste",
                name: "Zona Oeste",
                basePrice: 4200,
                enabled: true,
                badgeColor: "#F4A261",
                cities: [
                    "Caseros", "Ciudadela", "Ciudad de Evita", "Ciudad Madero", "El Palomar", "Francisco Álvarez", 
                    "Haedo", "Hurlingham", "Isidoro Casanova", "Ituzaingó", "José C. Paz", "Laferrere", "Leloir", 
                    "Los Polvorines", "Luján", "Marcos Paz", "Mariano Acosta", "Merlo", "Moreno", "Morón", 
                    "Rafael Castillo", "Ramos Mejía", "San Justo", "San Miguel", "Tapiales", "Tablada", 
                    "Virrey del Pino", "Villa Celina"
                ],
                customCityPrices: {}
            },
            zona_sur: {
                id: "zona_sur",
                name: "Zona Sur",
                basePrice: 5200,
                enabled: true,
                badgeColor: "#E76F51",
                cities: [
                    "Adrogué", "Avellaneda", "Banfield", "Bernal", "Burzaco", "El Rocío", "Ezeiza", 
                    "Florencio Varela", "Lanús", "Llavallol", "Lomas de Zamora", "Longchamps", "Monte Chingolo", 
                    "Monte Grande", "Paraná", "Piñeyro", "Plátanos", "Quilmes", "R. Calzada", "Ranelagh", 
                    "San F. Solano", "Santa Catalina", "Santos Vega", "Sarandí", "T. Suárez", "Villa Caraza", "Wilde"
                ],
                customCityPrices: {}
            }
        }
    };

    // Cargar desde localStorage o global siteConfig si existiera
    function getShippingConfig() {
        try {
            const saved = localStorage.getItem('shipping_config_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...defaultShippingConfig, ...parsed };
            }
        } catch (e) {
            console.error('Error cargando shipping_config:', e);
        }
        return defaultShippingConfig;
    }

    function saveShippingConfig(config) {
        try {
            localStorage.setItem('shipping_config_v1', JSON.stringify(config));
            window.shippingConfig = config;
            window.dispatchEvent(new CustomEvent('shippingConfigUpdated', { detail: config }));
        } catch (e) {
            console.error('Error guardando shipping_config:', e);
        }
    }

    window.defaultShippingConfig = defaultShippingConfig;
    window.getShippingConfig = getShippingConfig;
    window.saveShippingConfig = saveShippingConfig;
    window.shippingConfig = getShippingConfig();
})();
