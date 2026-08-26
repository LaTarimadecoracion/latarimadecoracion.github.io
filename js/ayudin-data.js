// js/ayudin-data.js
// --- DATA FOR AYUDIN HELP CENTER ---

window.ayudinRubros = [
    { id: "carpinteria", name: "Carpintería", icon: "handyman" },
    { id: "emprendedores", name: "Emprendedores", icon: "store" }
];

window.ayudinData = [
    {
        id: "optimizador-corte",
        title: "Optimización de Corte de Madera",
        description: "Optimizá el corte de tus listones y tableros comerciales para ahorrar madera y dinero.",
        image: "img/logo_provisional.png",
        rubro: "carpinteria",
        actionUrl: "apps/corte.html",
        icon: "grid_on",
        content: ""
    },
    {
        id: "calc-altura",
        title: "Calculadora de Altura Ideal",
        description: "Calculá la altura perfecta para barandas de cunas y camas de tus clientes.",
        image: "img/logo_provisional.png",
        rubro: "carpinteria",
        actionUrl: "calcular.html",
        icon: "calculate",
        content: ""
    },
    {
        id: "formula-espaciado",
        title: "Fórmula de Espaciado Uniforme",
        description: "Cómo calcular la distancia exacta entre listones, barrotes o cajones sin fallar.",
        image: "img/logo_provisional.png",
        rubro: "carpinteria",
        actionUrl: "",
        icon: "straighten",
        content: `
            <div class="ayudin-detail-body">
                <p>Para lograr que un mueble se vea profesional, el espaciado entre listones, barrotes de cunas o cajones debe ser matemáticamente idéntico.</p>
                
                <div class="formula-box">
                    <div class="formula-title">Fórmula del Espaciado Libre (E)</div>
                    <div class="formula-expression">E = (A<sub>total</sub> - (N &times; Espesor)) / (N + 1)</div>
                </div>

                <h4>¿Qué significa cada variable?</h4>
                <ul>
                    <li><strong>A<sub>total</sub>:</strong> El ancho o largo libre total disponible en el marco.</li>
                    <li><strong>N:</strong> La cantidad de listones o divisiones que vas a colocar.</li>
                    <li><strong>Espesor:</strong> El espesor de cada listón o barrote (medido en la misma dirección que el ancho).</li>
                </ul>

                <h4>Ejemplo práctico:</h4>
                <p>Tenés un marco de <strong>100 cm</strong> y querés colocar <strong>5 listones</strong> de <strong>4 cm</strong> de espesor cada uno:</p>
                <ol>
                    <li>Multiplicás la cantidad de listones por su espesor: <code>5 &times; 4 cm = 20 cm</code>.</li>
                    <li>Restás eso del ancho total: <code>100 cm - 20 cm = 80 cm</code> (este es el espacio libre neto).</li>
                    <li>Dividís por la cantidad de espacios resultantes (N + 1): <code>5 listones + 1 = 6 espacios</code>.</li>
                    <li>Hacés el cálculo final: <code>80 cm / 6 = 13.33 cm</code>.</li>
                </ol>
                <p><strong>Resultado:</strong> Debés colocar cada listón dejando exactamente <strong>13.33 cm (133 mm)</strong> libres entre cada uno.</p>
            </div>
        `
    },
    {
        id: "costos-precios",
        title: "Cálculo de Precio de Venta",
        description: "Estructura de costos paso a paso para presupuestar tus trabajos en madera sin perder margen.",
        image: "img/logo_provisional.png",
        rubro: "emprendedores",
        actionUrl: "",
        icon: "payments",
        content: `
            <div class="ayudin-detail-body">
                <p>Uno de los errores más comunes al emprender en carpintería es cobrar únicamente multiplicando el valor de la madera. Esto ignora gastos invisibles y deprecia tu mano de obra.</p>
                
                <div class="formula-box">
                    <div class="formula-title">Precio de Venta Sugerido</div>
                    <div class="formula-expression">Precio = (Materiales + Mano de Obra + Gastos Fijos Proportion) &times; Margen Ganancia</div>
                </div>

                <h4>1. Materiales directos</h4>
                <p>Sumá todo lo físico que se va en el mueble: madera (pies de madera utilizados), tornillos, cola, lija, tinte, laca, herrajes y embalaje. Añadí un <strong>10% de desperdicio</strong> por seguridad.</p>

                <h4>2. Tu Mano de Obra (Horas de Trabajo)</h4>
                <p>Definí cuánto vale tu hora de taller. Multiplicá ese valor por las horas reales que te tomará cortar, cepillar, ensamblar, lijar, pintar y embalar el producto.</p>

                <h4>3. Gastos Fijos (Gastos de Estructura)</h4>
                <p>Calculá una porción de tus costos fijos mensuales (alquiler de taller, luz, desgaste de herramientas, internet) y asignala al proyecto. Una forma simple es sumarle un **15% al 20%** al costo total de materiales y horas.</p>

                <h4>4. Margen de Ganancia Neto</h4>
                <p>Multiplicá el costo total anterior por tu margen de ganancia para reinversión y crecimiento del taller (usualmente entre **1.3** y **1.5** para un 30% a 50% de ganancia neta).</p>
            </div>
        `
    },
    {
        id: "check-pedidos",
        title: "Checklist de Pedidos Personalizados",
        description: "Lista de verificación para evitar malentendidos con clientes al tomar un trabajo a medida.",
        image: "img/logo_provisional.png",
        rubro: "emprendedores",
        actionUrl: "",
        icon: "fact_check",
        content: `
            <div class="ayudin-detail-body">
                <p>Tomar pedidos personalizados en carpintería tiene el riesgo de que el cliente recuerde o imagine algo diferente a lo acordado. Utilizá esta checklist antes de cortar la primera tabla:</p>
                
                <h4 style="margin-top: 1rem;">📋 Datos Críticos a Confirmar por Escrito:</h4>
                <ul>
                    <li><strong>Medidas Finales Externas:</strong> Ancho, alto y profundidad máxima. Consultar si hay zócalos o molduras que obstruyan la colocación.</li>
                    <li><strong>Espacio de Entrega:</strong> Confirmar las dimensiones de puertas, ascensores o escaleras por donde debe pasar el mueble armado.</li>
                    <li><strong>Tipo de Madera y Acabado:</strong> Especificar la madera (Eucalipto, Pino, Paraíso) y el acabado (Laca satinada, Tinte Petiribí, Hidrolaca al agua).</li>
                    <li><strong>Herrajes:</strong> Detallar si lleva guías telescópicas, bisagras cazoleta con cierre suave, etc.</li>
                </ul>

                <h4>💳 Condiciones de Pago y Entrega:</h4>
                <ul>
                    <li>Seña obligatoria (mínimo 50%) para reservar materiales y congelar el precio.</li>
                    <li>Plazo estimado de entrega detallando semanas hábiles (ej: 3 a 4 semanas hábiles).</li>
                    <li>Costo de envío y si incluye subida por escalera o colocación en el domicilio.</li>
                </ul>
            </div>
        `
    },
    {
        id: "editor-fotos-masivo",
        title: "Editor de Fotos Masivo (3:2)",
        description: "Cargá, recortá y reencuadrá múltiples fotos a la vez en formato 3:2 u otros antes de publicarlas.",
        image: "img/logo_provisional.png",
        rubro: "emprendedores",
        actionUrl: "apps/editor-fotos.html",
        icon: "crop",
        content: ""
    }
];
