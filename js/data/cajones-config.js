// js/data/cajones-config.js
// --- CAJONES CROSSFIT & PLIOMÉTRICOS CONFIGURATION DATABASE ---
// Overwritten automatically by the Node server. DO NOT EDIT MANUALLY.

window.cajonesConfig = {
    "materiales": [
        {
            "id": "fenolico_18mm",
            "name": "Placa Pino 18 mm",
            "max_largo": 244,
            "max_ancho": 124,
            "peso_placa": 25,
            "costo_placa": 35000,
            "costo_m2": 11568,
            "margen_pct": 140,
            "precio_m2": 27763,
            "espesores_texto": "18 mm",
            "espesores_disponibles": [
                "18 mm"
            ],
            "limite_mensaje": "Para cajones gigantes de más de 120 cm se cotiza unión de placas en taller.",
            "activo": true,
            "es_placa": true,
            "es_tirante": false,
            "is_default": true
        },
        {
            "id": "mat_1792101110518",
            "name": "Placa Fenólico Industrial 18 mm",
            "max_largo": 244,
            "max_ancho": 124,
            "peso_placa": 35,
            "costo_placa": 40000,
            "costo_m2": 13221,
            "margen_pct": 140,
            "precio_m2": 31730,
            "espesores_texto": "18 mm",
            "espesores_disponibles": [
                "18 mm"
            ],
            "limite_mensaje": "",
            "activo": true,
            "es_placa": true,
            "es_tirante": false,
            "is_default": false
        },
        {
            "id": "tirante_pino_2x2",
            "name": "Tirante 2x2",
            "max_largo": 360,
            "max_ancho": 5,
            "peso_placa": 3.5,
            "costo_placa": 5000,
            "costo_m2": 27778,
            "margen_pct": 100,
            "precio_m2": 55556,
            "espesores_texto": "45x45 mm",
            "espesores_disponibles": [
                "45x45 mm"
            ],
            "limite_mensaje": "Tirantes para estructura interna donde se atornillan las caras.",
            "activo": true,
            "es_placa": false,
            "es_tirante": true,
            "is_default": false
        }
    ],
    "reglas_construccion": [
        {
            "id": "cajon_simple",
            "name": "Cajón Simple",
            "descripcion": "4 caras + 1 tapa (5 piezas de placa sin fondo, unión directa placa con placa).",
            "tipo_estructura": "simple_5_piezas",
            "material_placa_id": "fenolico_18mm",
            "material_tirante_id": "ninguno",
            "formulas_despiece": [
                {
                    "pieza": "Tapa Superior",
                    "cant": 1,
                    "formula_largo": "L",
                    "formula_ancho": "A",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Caras Frente y Fondo (Largos)",
                    "cant": 2,
                    "formula_largo": "L",
                    "formula_ancho": "H",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Caras Laterales (Cortos)",
                    "cant": 2,
                    "formula_largo": "A",
                    "formula_ancho": "H",
                    "tipo_material": "placa"
                }
            ],
            "piezas": {
                "tapas": 1,
                "laterales": 4,
                "refuerzos_esqueleto": 0
            },
            "multiplicador_costo": 5,
            "costo_fijacion_base": 2000,
            "plus_armado": 6000,
            "desperdicio_pct": 10,
            "min_largo": 20,
            "max_largo": 120,
            "min_ancho": 20,
            "max_ancho": 120,
            "min_alto": 5,
            "max_alto": 30,
            "limite_mensaje": "Para cajones más grandes se requiere una estructura con refuerzos internos para garantizar la resistencia y estabilidad.",
            "activo": true
        },
        {
            "id": "cajon_reforzado",
            "name": "Cajón Reforzado (Esqueleto U)",
            "descripcion": "4 caras + 1 tapa + esqueleto interno en U invertida (tirantes 2x2",
            "tipo_estructura": "personalizado",
            "material_placa_id": "fenolico_18mm",
            "material_tirante_id": "tirante_pino_2x2",
            "formulas_despiece": [
                {
                    "pieza": "Tapa Superior",
                    "cant": 1,
                    "formula_largo": "L",
                    "formula_ancho": "A",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Caras Frente y Fondo (Largos)",
                    "cant": 2,
                    "formula_largo": "L",
                    "formula_ancho": "H",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Caras Laterales (Cortos)",
                    "cant": 2,
                    "formula_largo": "A",
                    "formula_ancho": "H",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Esqueleto: Patas Verticales (2 caballetes)",
                    "cant": 4,
                    "formula_largo": "H",
                    "formula_ancho": "1",
                    "tipo_material": "tirante"
                },
                {
                    "pieza": "Esqueleto: Travesaños Superiores (2 caballetes)",
                    "cant": 2,
                    "formula_largo": "A",
                    "formula_ancho": "1",
                    "tipo_material": "tirante"
                }
            ],
            "piezas": {
                "tapas": 1,
                "laterales": 4,
                "refuerzos_esqueleto": 8
            },
            "multiplicador_costo": 5,
            "costo_fijacion_base": 3000,
            "plus_armado": 8000,
            "desperdicio_pct": 10,
            "min_largo": 20,
            "max_largo": 240,
            "min_ancho": 20,
            "max_ancho": 240,
            "min_alto": 20,
            "max_alto": 120,
            "limite_mensaje": "El Cajón Reforzado, esqueleto estructural de tirantes 2x2",
            "activo": true
        },
        {
            "id": "cajon_3_en_1_oficial",
            "name": "Cajón 3 en 1 Oficial (6 Caras Cerradas)",
            "descripcion": "El cajón clásico de CrossFit. Cerrado en sus 6 lados con tabique central de apoyo. Al girarlo ofrece 3 alturas de salto distintas (ej: 50, 60 y 75 cm).",
            "tipo_estructura": "personalizado",
            "material_placa_id": "fenolico_18mm",
            "material_tirante_id": "ninguno",
            "formulas_despiece": [
                {
                    "pieza": "Tapa Superior y Base Inferior",
                    "cant": 2,
                    "formula_largo": "L",
                    "formula_ancho": "A",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Caras Frente y Fondo (Largos)",
                    "cant": 2,
                    "formula_largo": "L",
                    "formula_ancho": "H - 2*E",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Caras Laterales con Manijas Caladas",
                    "cant": 2,
                    "formula_largo": "A - 2*E",
                    "formula_ancho": "H - 2*E",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Costilla / Tabique Interno Anti-hundimiento",
                    "cant": 1,
                    "formula_largo": "L - 2*E",
                    "formula_ancho": "H - 2*E",
                    "tipo_material": "placa"
                }
            ],
            "piezas": {
                "tapas": 1,
                "laterales": 4,
                "refuerzos_esqueleto": 0
            },
            "multiplicador_costo": 5,
            "costo_fijacion_base": 3500,
            "plus_armado": 9000,
            "desperdicio_pct": 5,
            "min_largo": 40,
            "max_largo": 120,
            "min_ancho": 35,
            "max_ancho": 120,
            "min_alto": 30,
            "max_alto": 80,
            "limite_mensaje": "El Cajón 3 en 1 Oficial cerrado se fabrica para conservar la maniobrabilidad de giro y el peso óptimo de traslado.",
            "activo": true
        },
        {
            "id": "cajon_banco_step",
            "name": "Cajón Banco / Step Funcional (Box Squat)",
            "descripcion": "Diseño alargado y de altura media (35 a 45 cm) para sentadillas (Box Squats), subidas (Step-ups) y empujes de cadera (Hip Thrust). Incluye costilla central de refuerzo.",
            "tipo_estructura": "personalizado",
            "material_placa_id": "fenolico_18mm",
            "material_tirante_id": "ninguno",
            "formulas_despiece": [
                {
                    "pieza": "Tapa Banco Superior",
                    "cant": 1,
                    "formula_largo": "L",
                    "formula_ancho": "A",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Largueros Laterales",
                    "cant": 2,
                    "formula_largo": "L",
                    "formula_ancho": "H",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Cabezales Cortos",
                    "cant": 2,
                    "formula_largo": "A",
                    "formula_ancho": "H",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Tabique Central Refuerzo Vano",
                    "cant": 1,
                    "formula_largo": "A",
                    "formula_ancho": "H",
                    "tipo_material": "placa"
                }
            ],
            "piezas": {
                "tapas": 1,
                "laterales": 4,
                "refuerzos_esqueleto": 0
            },
            "multiplicador_costo": 5,
            "costo_fijacion_base": 2500,
            "plus_armado": 7000,
            "desperdicio_pct": 10,
            "min_largo": 60,
            "max_largo": 140,
            "min_ancho": 25,
            "max_ancho": 50,
            "min_alto": 25,
            "max_alto": 50,
            "limite_mensaje": "Para el formato Banco / Step se recomienda largo de 60 a 140 cm y alto de 25 a 50 cm para mantener la postura ergonómica de sentadilla y apoyo.",
            "activo": false
        },
        {
            "id": "bloques_halterofilia_jerk",
            "name": "Bloques de Halterofilia / Jerk Box",
            "descripcion": "Bloques de impacto ultra-pesados para soportar caídas de barras olímpicas cargadas (150-200 kg) en levantamiento de pesas. Doble tapa superior y esqueleto macizo de tirantes.",
            "tipo_estructura": "personalizado",
            "material_placa_id": "fenolico_18mm",
            "material_tirante_id": "tirante_pino_2x2",
            "formulas_despiece": [
                {
                    "pieza": "Doble Tapa de Impacto Superior",
                    "cant": 2,
                    "formula_largo": "L",
                    "formula_ancho": "A",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Caras Frente y Fondo",
                    "cant": 2,
                    "formula_largo": "L",
                    "formula_ancho": "H",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Caras Laterales",
                    "cant": 2,
                    "formula_largo": "A",
                    "formula_ancho": "H",
                    "tipo_material": "placa"
                },
                {
                    "pieza": "Topes de Madera Anti-rodaje de Barra",
                    "cant": 2,
                    "formula_largo": "A",
                    "formula_ancho": "1",
                    "tipo_material": "tirante"
                },
                {
                    "pieza": "Pilares de Soporte de Impacto Vertical",
                    "cant": 4,
                    "formula_largo": "H",
                    "formula_ancho": "1",
                    "tipo_material": "tirante"
                },
                {
                    "pieza": "Vigas Cuadrícula de Reparto de Peso",
                    "cant": 4,
                    "formula_largo": "A",
                    "formula_ancho": "1",
                    "tipo_material": "tirante"
                }
            ],
            "piezas": {
                "tapas": 1,
                "laterales": 4,
                "refuerzos_esqueleto": 8
            },
            "multiplicador_costo": 5.5,
            "costo_fijacion_base": 5000,
            "plus_armado": 12000,
            "desperdicio_pct": 5,
            "min_largo": 50,
            "max_largo": 100,
            "min_ancho": 40,
            "max_ancho": 70,
            "min_alto": 20,
            "max_alto": 60,
            "limite_mensaje": "Los Bloques Jerk de Halterofilia se construyen con doble tapa y marco de vigas para absorber toneladas de impacto por caída libre de barra.",
            "activo": false
        }
    ],
    "taller": {
        "costo_tornillos_cola": 2000,
        "precio_armado_taller": 6000,
        "desperdicio_pct": 10,
        "minimo_cajon": 1000,
        "redondeo_paso": 500
    },
    "logistica": {
        "flex_max_suma_lados": 150,
        "flex_max_peso_kg": 30,
        "flex_max_unidades_bulto": 1,
        "vehiculo_nombre": "Ford Ranger (al Ras del Techo)",
        "vehiculo_caja_largo": 145,
        "vehiculo_caja_ancho": 115,
        "vehiculo_caja_alto_techo": 85,
        "gigante_umbral_pct_caja": 65,
        "gigante_mult_viajes": 2,
        "flete_ranger_max_armados": 6,
        "flete_ranger_max_desarmados": 20,
        "retiro_taller": true,
        "direccion_retiro": "Taller Hurlingham, GBA Oeste"
    },
    "descuentos_box": [
        {
            "minQty": 3,
            "discountPercent": 8
        },
        {
            "minQty": 6,
            "discountPercent": 15
        }
    ],
    "envio_gratis_box": {
        "activo": true,
        "minQty": 10
    }
};
