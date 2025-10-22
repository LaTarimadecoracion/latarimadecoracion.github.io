# 📊 Configuración de Google Sheets - Exportación Automática

## Paso 1: Crear la hoja de cálculo

1. Ve a: https://sheets.google.com
2. Crea una nueva hoja llamada: **"Gastos Familia"**
3. Copia el **ID de la hoja** de la URL:
   ```
   https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
   ```

## Paso 2: Estructura de las hojas

El script creará automáticamente las hojas por año:

### Hojas de transacciones (se crean automáticamente):
- **2024** → Todas las transacciones de 2024
- **2025** → Todas las transacciones de 2025
- **2026** → Todas las transacciones de 2026
- etc.

Cada hoja tendrá estos encabezados:
```
Fecha | Tipo | Categoría | Monto | Descripción | Módulo | Usuario | Timestamp
```

### Hojas de módulos (se crean automáticamente):
- **Módulos_2024** → Estado de módulos por mes en 2024
- **Módulos_2025** → Estado de módulos por mes en 2025
- etc.

Cada hoja tendrá:
```
Mes | Efectivo | Banco | ML Jona | ML Ceci | Total | Última actualización
```

**No necesitas crear nada manualmente**, el script lo hace solo cuando guardas la primera transacción.

## Paso 3: Crear Google Apps Script

1. En tu hoja de Google Sheets, ve a: **Extensiones** → **Apps Script**
2. Borra el código que aparece
3. Copia y pega este código:

```javascript
function doPost(e) {
  try {
    // Log para debug
    Logger.log('Recibido: ' + e.postData.contents);
    
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Extraer año y mes de la fecha
    const [year, month] = data.month ? data.month.split('-') : data.date.split('-');
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const monthName = monthNames[parseInt(month) - 1];
    
    // Obtener o crear la hoja del año
    let sheet = ss.getSheetByName(year);
    if (!sheet) {
      sheet = ss.insertSheet(year);
      initializeSheet(sheet, monthName);
    }
    
    // Si es una transacción individual
    if (data.type === 'transaction') {
      addTransaction(sheet, data);
      return success('Transacción guardada en ' + year);
    }
    
    // Si son datos completos del mes (módulos + transacciones)
    if (data.type === 'monthData') {
      updateMonthData(sheet, data, monthName);
      return success('Datos del mes actualizados');
    }
    
    return success('Procesado correctamente');
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return errorResponse(error);
  }
}

// Función de prueba para verificar que funciona
function doGet(e) {
  return ContentService.createTextOutput('Google Sheets API está funcionando correctamente ✅');
}

function initializeSheet(sheet, monthName) {
  // Estructura exacta como tu Excel
  const structure = [
    ['MES', monthName],
    ['', 'Dinero Inicial', '', '$0.00'],
    ['', 'Ingresos', '', '$0.00'],
    ['', 'Gastos del mes', '', '$0.00'],
    ['', 'Saldo', '', '$0.00'],
    ['', '', 'Ahorro', '$0.00'],
    ['', 'Dinero en Casa', '', '$0.00'],
    ['', 'Dinero en Banco', '', '$0.00'],
    ['', 'ML Jona', '', '$0.00'],
    ['', 'ML Cechu', '', '$0.00'],
    [''],
    ['', 'La Tarima', '', 'Creaciones CC'],
    ['', 'Ingresos', 'Gastos', 'Ingresos', 'Gastos'],
    ['', '$0.00', '$0.00', '$0.00', '$0.00'],
    ['', '$0.00', '', '$0.00'],
    ['', '', '0%'],
    [''],
    ['', 'Gastos Fijos', 'F', '$0.00'],
    ['', 'Otros', 'O', '$0.00'],
    ['', 'Alimentos', 'A', '$0.00'],
    ['', 'Otros Esenciales', 'E', '$0.00'],
    [''],
    ['Fecha', 'Descripcion', 'Categoria', '', 'Ingresos', 'Egresos']
  ];
  
  structure.forEach(row => sheet.appendRow(row));
  
  // Formato
  sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  sheet.getRange('A23:F23').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
  sheet.setFrozenRows(23);
}

function addTransaction(sheet, data) {
  const day = data.date.split('-')[2];
  const isIngreso = (data.transactionType === 'ingreso' || data.transactionType === 'venta');
  
  sheet.appendRow([
    day,
    data.description || '',
    data.category,
    '',
    isIngreso ? data.amount : '',
    isIngreso ? '' : data.amount
  ]);
}

function updateMonthData(sheet, data, monthName) {
  // Actualizar resumen general
  sheet.getRange('D2').setValue(data.inicial || 0);
  sheet.getRange('D3').setValue(data.ingresos || 0);
  sheet.getRange('D4').setValue(data.gastos || 0);
  sheet.getRange('D5').setValue(data.saldo || 0);
  sheet.getRange('D6').setValue(data.ahorro || 0);
  
  // Actualizar módulos
  sheet.getRange('D7').setValue(data.efectivo || 0);
  sheet.getRange('D8').setValue(data.banco || 0);
  sheet.getRange('D9').setValue(data.ml_jona || 0);
  sheet.getRange('D10').setValue(data.ml_ceci || 0);
  
  // Actualizar La Tarima
  if (data.laTarima) {
    sheet.getRange('B14').setValue(data.laTarima.ingresos || 0);
    sheet.getRange('C14').setValue(data.laTarima.gastos || 0);
  }
}

function success(message) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(error) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: error.toString()
  })).setMimeType(ContentService.MimeType.JSON);
}
```

## Paso 4: Publicar el Web App

1. Click en **Implementar** → **Nueva implementación**
2. Tipo: **Aplicación web**
3. Descripción: "API para Gastos Familia"
4. Ejecutar como: **Yo**
5. Quién tiene acceso: **Cualquier persona**
6. Click en **Implementar**
7. **Copia la URL del Web App** que se genera (algo como: https://script.google.com/macros/s/ABC123.../exec)

## Paso 5: Configurar la URL en tu app

Una vez que tengas la URL del Web App, dímela para integrarla en tu aplicación.

---

## ✅ ¿Qué hará esto?

- ✅ Cada transacción se guardará automáticamente en Google Sheets
- ✅ Los módulos se actualizarán cuando cambien
- ✅ Tendrás un backup visual en tu Drive
- ✅ Podrás hacer análisis y gráficos en Sheets
- ✅ Historial completo y editable

## 🔒 Seguridad:

- Solo tú puedes ver la hoja (es privada en tu Drive)
- El script solo puede escribir, no puede leer datos sensibles
- Firebase sigue siendo la fuente principal de datos
