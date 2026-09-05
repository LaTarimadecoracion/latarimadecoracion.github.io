// js/shipping-config.js
window.sessionShippingFullData = {
    "logistica": {
        "caba": {
            "active": true,
            "baseCost": 8000
        },
        "cordon_1": {
            "active": true,
            "baseCost": 10000
        },
        "cordon_2": {
            "active": true,
            "baseCost": 12000
        },
        "resto_provincias": {
            "active": true,
            "baseCost": 0
        }
    },
    "flete": {
        "flete_zona_1": {
            "active": true,
            "baseCost": 4500
        },
        "flete_zona_2": {
            "active": true,
            "baseCost": 7500
        },
        "flete_zona_3": {
            "active": true,
            "baseCost": 11000
        },
        "flete_fuera_rango": {
            "active": false,
            "baseCost": 0,
            "requireWA": true
        }
    },
    "otro": {
        "otro_amba": {
            "active": true,
            "baseCost": 0
        },
        "otro_interior": {
            "active": true,
            "baseCost": 0,
            "requireWA": true
        }
    }
};
