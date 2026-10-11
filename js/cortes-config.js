// js/data/cortes-config.js
// --- CORTES DE MADERA CONFIGURATION DATABASE ---
// Overwritten automatically by the Node server. DO NOT EDIT MANUALLY.

window.cortesConfig = {
    "precios": {
        "precio_m2_venta": 24306,
        "costo_m2_base": 12153,
        "minimo_corte_taller": 3500
    },
    "materiales": [
        {
            "id": "pino_macizo",
            "name": "Placa de Pino",
            "precio_m2": 24306,
            "costo_m2": 12153,
            "costo_placa": 35000,
            "peso_placa": 28,
            "peso_m2": 9.72,
            "margen_pct": 100,
            "max_largo": 240,
            "max_ancho": 120,
            "espesores_disponibles": [
                "18 mm"
            ],
            "espesor": "18 mm",
            "limite_mensaje": "Para piezas de más de 120 cm de ancho se cotiza unión de placas en taller.",
            "activo": true,
            "is_default": true
        }
    ],
    "usos": [
        {
            "id": "estante",
            "name": "Estantería / Repisas (Base)",
            "min_ancho": 0,
            "max_ancho": 40,
            "min_largo": 0,
            "max_largo": 120,
            "factor_precio": 50,
            "recargo_fijo": 2500,
            "desc": "Cortes estándar para estantes y repisas. Lijado y cepillado de taller.",
            "activo": true,
            "is_default": true
        },
        {
            "id": "escritorio_mesa",
            "name": "Tapa Escritorio / Mesada (Lijado Fino)",
            "min_ancho": 40,
            "max_ancho": 80,
            "min_largo": 0,
            "max_largo": 120,
            "factor_precio": 75,
            "recargo_fijo": 2500,
            "desc": "Selección de vetas sin nudos abiertos, escuadrado de precisión y calibrado con lijado fino al tacto para uso diario.",
            "activo": true,
            "is_default": false
        },
        {
            "id": "uso_1791650988462",
            "name": "Corte Especial",
            "min_ancho": 0,
            "max_ancho": 120,
            "min_largo": 0,
            "max_largo": 240,
            "factor_precio": 80,
            "recargo_fijo": 3500,
            "desc": "Corte estándar de taller.",
            "activo": true,
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
        "max_alto_flex": 20,
        "max_peso_flex": 10,
        "max_unidades_flex": 6,
        "aviso_flete_excedido": "",
        "flex": {
            "activo": true,
            "max_largo": 120,
            "max_ancho": 40,
            "max_alto": 20,
            "max_peso_bulto": 10,
            "max_unidades": 6,
            "costo_caba": 8000,
            "costo_cordon_1": 10000,
            "costo_cordon_2": 12000,
            "aviso_flex": "Válido para paquetes compactos que entran en moto o furgón Flex.",
            "beneficios": {
                "activo": true,
                "envioGratisMin": 20,
                "escalas": [
                    {
                        "minQty": 10,
                        "discountPercent": 50
                    }
                ]
            }
        },
        "flete": {
            "activo": true,
            "origen": "Taller Hurlingham",
            "max_largo": 300,
            "max_ancho": 130,
            "max_alto": 120,
            "max_peso_bulto": 450,
            "max_unidades": 25,
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
                "activo": false,
                "envioGratisMin": 10,
                "escalas": [
                    {
                        "minQty": 5,
                        "discountPercent": 50
                    }
                ]
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
                "activo": false,
                "embalajeGratisMin": 4,
                "descuentoEmbalajePct": 50,
                "descuentoEmbalajeMin": 2
            }
        }
    }
};
