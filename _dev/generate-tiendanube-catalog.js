const fs = require('fs');
const path = require('path');

// 1. Cargar productos desde js/data/products-data.js
const productsDataPath = path.join(__dirname, '..', 'js', 'data', 'products-data.js');
let productsDataContent = fs.readFileSync(productsDataPath, 'utf8');

const jsonStr = productsDataContent.replace(/^const\s+productsData\s*=\s*/, '').replace(/;\s*$/, '');
let categories = [];
try {
    categories = JSON.parse(jsonStr);
} catch (err) {
    console.error('Error parseando products-data.js:', err);
    process.exit(1);
}

// Encabezados exactos según la plantilla oficial de Tiendanube
const headers = [
    'Identificador de URL',
    'Nombre',
    'Categorías',
    'Nombre de propiedad 1',
    'Valor de propiedad 1',
    'Nombre de propiedad 2',
    'Valor de propiedad 2',
    'Nombre de propiedad 3',
    'Valor de propiedad 3',
    'Precio',
    'Precio promocional',
    'Peso (kg)',
    'Alto (cm)',
    'Ancho (cm)',
    'Profundidad (cm)',
    'Stock',
    'SKU',
    'Código de barras',
    'Mostrar en tienda',
    'Envío sin cargo',
    'Descripción',
    'Tags',
    'Título para SEO',
    'Descripción para SEO',
    'Marca',
    'Producto Físico',
    'MPN (Número de pieza del fabricante)',
    'Sexo',
    'Rango de edad',
    'Costo',
    'Visibilidad'
];

function escapeCSV(text) {
    if (text === null || text === undefined || text === '') return '';
    const str = String(text).replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${str}"`;
}

function slugify(text) {
    return String(text || '')
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
}

const rows = [headers.map(h => escapeCSV(h)).join(';')];
const seenIds = new Set();
let totalExported = 0;
let totalVariants = 0;

categories.forEach(cat => {
    if (!cat.products || !Array.isArray(cat.products)) return;

    cat.products.forEach(prod => {
        if (!prod || !prod.id || seenIds.has(prod.id)) return;
        seenIds.add(prod.id);
        totalExported++;

        const handle = slugify(prod.title || prod.id) || `prod-${prod.id}`;
        const title = prod.title || 'Producto La Tarima';
        const categoryName = cat.name ? cat.name.trim() : 'Muebles y Decoración';
        const cleanDesc = (prod.description || title).replace(/<[^>]*>?/gm, '').trim();
        const seoTitle = `${title} | LA TARIMA`;
        const seoDesc = cleanDesc.substring(0, 155);

        // Extraer dimensiones si están disponibles en el texto o propiedades
        let alto = '';
        let ancho = '';
        let profundidad = '';
        const altoMatch = cleanDesc.match(/alto[:\s]+(\d+)/i);
        if (altoMatch) alto = altoMatch[1];
        const anchoMatch = cleanDesc.match(/(?:ancho|largo)[:\s]+(\d+)/i);
        if (anchoMatch) ancho = anchoMatch[1];
        const profMatch = cleanDesc.match(/profundidad[:\s]+(\d+)/i);
        if (profMatch) profundidad = profMatch[1];

        // Determinar acabados y variantes
        const grupos = (prod.acabados_groups || []).filter(g => !g.hidden);
        
        // Si tiene múltiples acabados o medidas
        let variantList = [];
        if (grupos.length > 0) {
            grupos.forEach(g => {
                const acName = (g.acabado_name && g.acabado_name !== 'Único') ? g.acabado_name.trim() : '';
                const medidas = (g.medidas_variants || []).filter(m => !m.hidden);
                if (medidas.length > 0) {
                    medidas.forEach(m => {
                        variantList.push({
                            acabado: acName,
                            medida: m.medida ? m.medida.trim() : '',
                            price: m.price || prod.price || ''
                        });
                    });
                } else if (acName) {
                    variantList.push({
                        acabado: acName,
                        medida: '',
                        price: prod.price || ''
                    });
                }
            });
        }

        // Si no tiene variantes complejas, generar al menos 1 fila base
        if (variantList.length === 0) {
            const basePrice = prod.price || '';
            const row = [
                escapeCSV(handle),                       // Identificador de URL
                escapeCSV(title),                        // Nombre
                escapeCSV(categoryName),                 // Categorías
                '',                                      // Nombre de propiedad 1
                '',                                      // Valor de propiedad 1
                '',                                      // Nombre de propiedad 2
                '',                                      // Valor de propiedad 2
                '',                                      // Nombre de propiedad 3
                '',                                      // Valor de propiedad 3
                escapeCSV(basePrice ? `${basePrice}.00` : ''), // Precio
                '',                                      // Precio promocional
                '5',                                     // Peso (kg) estimado por defecto
                escapeCSV(alto || '20'),                 // Alto (cm)
                escapeCSV(ancho || '30'),                // Ancho (cm)
                escapeCSV(profundidad || '20'),          // Profundidad (cm)
                '99',                                    // Stock disponible
                escapeCSV(prod.id),                      // SKU
                '',                                      // Código de barras
                'SI',                                    // Mostrar en tienda
                'NO',                                    // Envío sin cargo
                escapeCSV(cleanDesc),                    // Descripción
                escapeCSV('muebles, madera, artesanal, la tarima'), // Tags
                escapeCSV(seoTitle),                     // Título para SEO
                escapeCSV(seoDesc),                      // Descripción para SEO
                'La Tarima',                             // Marca
                'SI',                                    // Producto Físico
                '',                                      // MPN
                '',                                      // Sexo
                '',                                      // Rango de edad
                '',                                      // Costo
                'Visible'                                // Visibilidad
            ];
            rows.push(row.join(';'));
            totalVariants++;
        } else {
            // Múltiples variantes: La 1ra fila lleva todos los datos, las siguientes filas hijas llevan handle y variantes
            variantList.forEach((v, vIdx) => {
                totalVariants++;
                const isFirst = (vIdx === 0);
                const vPrice = v.price || prod.price || '';

                const prop1Name = v.acabado ? 'Acabado' : (v.medida ? 'Medida' : '');
                const prop1Val = v.acabado ? v.acabado : (v.medida ? v.medida : '');
                const prop2Name = (v.acabado && v.medida) ? 'Medida' : '';
                const prop2Val = (v.acabado && v.medida) ? v.medida : '';

                const skuVariant = `${prod.id}${v.acabado ? '-' + slugify(v.acabado) : ''}${v.medida ? '-' + slugify(v.medida) : ''}`;

                const row = [
                    escapeCSV(handle),                                     // Identificador de URL
                    isFirst ? escapeCSV(title) : '',                      // Nombre (solo en la primera fila)
                    isFirst ? escapeCSV(categoryName) : '',               // Categorías
                    escapeCSV(prop1Name),                                 // Nombre de propiedad 1
                    escapeCSV(prop1Val),                                  // Valor de propiedad 1
                    escapeCSV(prop2Name),                                 // Nombre de propiedad 2
                    escapeCSV(prop2Val),                                  // Valor de propiedad 2
                    '',                                                   // Nombre de propiedad 3
                    '',                                                   // Valor de propiedad 3
                    escapeCSV(vPrice ? `${vPrice}.00` : ''),               // Precio
                    '',                                                   // Precio promocional
                    '5',                                                  // Peso (kg)
                    escapeCSV(alto || '20'),                              // Alto (cm)
                    escapeCSV(ancho || '30'),                             // Ancho (cm)
                    escapeCSV(profundidad || '20'),                       // Profundidad (cm)
                    '99',                                                 // Stock
                    escapeCSV(skuVariant),                                // SKU
                    '',                                                   // Código de barras
                    isFirst ? 'SI' : '',                                  // Mostrar en tienda
                    isFirst ? 'NO' : '',                                  // Envío sin cargo
                    isFirst ? escapeCSV(cleanDesc) : '',                  // Descripción
                    isFirst ? escapeCSV('muebles, madera, artesanal') : '', // Tags
                    isFirst ? escapeCSV(seoTitle) : '',                   // Título para SEO
                    isFirst ? escapeCSV(seoDesc) : '',                    // Descripción para SEO
                    isFirst ? 'La Tarima' : '',                           // Marca
                    isFirst ? 'SI' : '',                                  // Producto Físico
                    '',                                                   // MPN
                    '',                                                   // Sexo
                    '',                                                   // Rango de edad
                    '',                                                   // Costo
                    isFirst ? 'Visible' : ''                              // Visibilidad
                ];
                rows.push(row.join(';'));
            });
        }
    });
});

const outputPath = path.join(__dirname, '..', 'tnube', 'productos-para-importar.csv');
fs.writeFileSync(outputPath, rows.join('\r\n'), 'utf8');

console.log(`✅ ¡Catálogo generado para Tiendanube exitosamente!`);
console.log(`📦 Productos únicos: ${totalExported}`);
console.log(`📏 Total filas y variantes generadas: ${totalVariants}`);
console.log(`📍 Archivo guardado en: ${outputPath}`);
