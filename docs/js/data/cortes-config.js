// js/data/cortes-config.js
// --- CORTES DE MADERA CONFIGURATION DATABASE ---
// Overwritten automatically by the Node server. DO NOT EDIT MANUALLY.

window.cortesConfig = {
    "precios": {
        "precio_m2_venta": 48500,
        "costo_m2_base": 27000,
        "minimo_corte_taller": 3500
    },
    "materiales": [
        {
            "id": "pino_macizo",
            "name": "Placa de Pino",
            "precio_m2": 48500,
            "costo_m2": 27000,
            "max_largo": 240,
            "max_ancho": 120,
            "espesores_disponibles": ["1 pulgada (~2.2 cm)", "1.5 pulgadas (~3.2 cm)", "2 pulgadas (~4.2 cm)"],
            "limite_mensaje": "Para piezas de más de 120 cm de ancho se cotiza unión de placas en taller.",
            "activo": true,
            "is_default": true
        },
        {
            "id": "eucalipto_tablillado",
            "name": "Placa Fenolico | Industrial",
            "precio_m2": 68000,
            "costo_m2": 42000,
            "max_largo": 240,
            "max_ancho": 120,
            "espesores_disponibles": ["18 mm", "22 mm"],
            "limite_mensaje": "El tablero seleccionado viene en espesor único de fábrica.",
            "activo": true,
            "is_default": false
        }
    ],
    "usos": [
        {
            "id": "estante",
            "name": "Estantería / Repisas (Base)",
            "desc": "Cortes compactos, tablas angostas para pared y cepillado estándar de taller.",
            "max_ancho": 35,
            "max_largo": 120,
            "factor_precio": 1,
            "recargo_fijo": 0,
            "is_default": true
        },
        {
            "id": "escritorio_mesa",
            "name": "Tapa Escritorio / Mesada (Lijado Fino)",
            "desc": "Tableros de gran formato, selección de vetas, escuadrado especial y pulido suave al tacto.",
            "min_ancho": 36,
            "factor_precio": 1.25,
            "recargo_fijo": 2500,
            "is_default": false
        },
        {
            "id": "escalon",
            "name": "Escalón / Tránsito Pesado",
            "desc": "Madera seleccionada de alta resistencia con cantos boleados/redondeados para pisada segura.",
            "factor_precio": 1.15,
            "recargo_fijo": 1800,
            "is_default": false
        }
    ],
    "acabados": [
        {
            "id": "natural",
            "name": "Natural Cepillado",
            "extra_price": 0,
            "cost_price": 0
        },
        {
            "id": "encerado",
            "name": "Tinte / Encerado Nogal o Cedro",
            "extra_price": 2000,
            "cost_price": 800
        },
        {
            "id": "barnizado",
            "name": "Barniz Poliuretánico Satinado",
            "extra_price": 3800,
            "cost_price": 1500
        }
    ],
    "espesores": [
        {
            "id": "1_pulgada",
            "name": "1 Pulgada (~2.2 cm)",
            "factor_precio": 1,
            "factor_costo": 1,
            "is_default": true
        },
        {
            "id": "1_5_pulgadas",
            "name": "1.5 Pulgadas (~3.2 cm)",
            "factor_precio": 1.45,
            "factor_costo": 1.45,
            "is_default": false
        },
        {
            "id": "2_pulgadas",
            "name": "2 Pulgadas (~4.2 cm)",
            "factor_precio": 1.95,
            "factor_costo": 1.95,
            "is_default": false
        }
    ],
    "descuentos": {
        "activo": false,
        "escalas": [
            {
                "minQty": 3,
                "discountPercent": 10
            },
            {
                "minQty": 6,
                "discountPercent": 15
            }
        ]
    },
    "logistica": {
        "max_largo_flex": 120,
        "max_ancho_flex": 40,
        "max_unidades_flex": 8,
        "aviso_flete_excedido": "",
        "flex": {
            "activo": true,
            "max_largo": 120,
            "max_ancho": 40,
            "max_unidades": 8,
            "costo_caba": 8000,
            "costo_cordon_1": 10000,
            "costo_cordon_2": 12000,
            "aviso_flex": "Válido para paquetes compactos que entran en moto o furgón Flex.",
            "dimensiones": [
                {
                    "nombre": "Bulto Pequeño (Estantes chicos)",
                    "max_largo": 60,
                    "max_ancho": 25,
                    "max_unidades": 8
                },
                {
                    "nombre": "Bulto Mediano (Estantes estándar)",
                    "max_largo": 100,
                    "max_ancho": 35,
                    "max_unidades": 4
                },
                {
                    "nombre": "Bulto Límite Moto / Courier",
                    "max_largo": 120,
                    "max_ancho": 40,
                    "max_unidades": 2
                }
            ],
            "beneficios": {
                "activo": true,
                "envioGratisMin": 3,
                "descuentoTarifaPct": 25,
                "descuentoTarifaMin": 2
            }
        },
        "flete": {
            "activo": true,
            "origen": "Taller Hurlingham",
            "costo_zona_1": 4500,
            "costo_zona_2": 20000,
            "costo_zona_3": 55000,
            "fuera_rango_mensaje": "Consultar cotización a medida para distancias mayores.",
            "permite_retiro_taller": true,
            "dimensiones": [
                {
                    "nombre": "Furgón Chico / Camioneta",
                    "max_largo": 180,
                    "max_ancho": 90,
                    "max_unidades": 15
                },
                {
                    "nombre": "Flete Carga Completa / Placas Enteras",
                    "max_largo": 300,
                    "max_ancho": 130,
                    "max_unidades": 50
                }
            ],
            "beneficios": {
                "activo": true,
                "envioGratisMin": 10,
                "descuentoTarifaPct": 50,
                "descuentoTarifaMin": 5
            }
        },
        "externas": {
            "activo": true,
            "recargo_embalaje": 3500,
            "empresas_habilitadas": "Vía Cargo, Andreani, Correo Argentino",
            "nota_despacho": "Despachamos desde receptoría en 24-48 hs hábiles. El costo de encomienda se abona en destino al retirar en sucursal o recibir en domicilio.",
            "aviso_roturas": "Embalaje reforzado con esquineros y pluribol para máxima protección.",
            "dimensiones": [
                {
                    "nombre": "Encomienda Estándar",
                    "max_largo": 120,
                    "max_ancho": 60,
                    "max_unidades": 6
                },
                {
                    "nombre": "Expreso Paletizado / Gran Formato",
                    "max_largo": 250,
                    "max_ancho": 100,
                    "max_unidades": 20
                }
            ],
            "beneficios": {
                "activo": true,
                "embalajeGratisMin": 4,
                "descuentoEmbalajePct": 50,
                "descuentoEmbalajeMin": 2
            }
        }
    }
};
