// ========================================
// GOOGLE APPS SCRIPT PARA GASTOS FAMILIA
// Sistema de respaldo automático mejorado
// ========================================

function doPost(e) {
  try {
    Logger.log('Recibido: ' + e.postData.contents);
    
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Si es un respaldo completo de todos los datos
    if (data.type === 'fullBackup') {
      updateFullBackup(ss, data);
      return success('Respaldo completo actualizado');
    }
    
    // Si son datos de un mes específico
    if (data.type === 'monthData') {
      const parts = data.month.split('-');
      const year = parts[0];
      const month = parts[1];
      const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const monthName = monthNames[parseInt(month) - 1];
      const sheetName = year + '-' + month + ' ' + monthName;
      
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        initializeMonthSheet(sheet, monthName);
      }
      
      updateMonthSummary(sheet, data);
      
      // También actualizar el respaldo completo
      updateFullBackup(ss, data);
      
      return success('Mes actualizado: ' + sheetName);
    }
    
    return success('Procesado correctamente');
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return errorResponse(error);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Google Sheets API está funcionando correctamente');
}

// ========================================
// FUNCIÓN PARA RESPALDO COMPLETO
// ========================================
function updateFullBackup(ss, data) {
  let backupSheet = ss.getSheetByName('RESPALDO_COMPLETO');
  
  // Si no existe la hoja de respaldo, crearla
  if (!backupSheet) {
    backupSheet = ss.insertSheet('RESPALDO_COMPLETO', 0); // Primera posición
    
    // Encabezados
    backupSheet.getRange('A1:H1').setValues([[
      'FECHA', 'DÍA', 'TIPO', 'CATEGORÍA', 'DESCRIPCIÓN', 'MONTO', 'MES', 'ID'
    ]]);
    backupSheet.getRange('A1:H1').setFontWeight('bold')
      .setBackground('#4285f4').setFontColor('#ffffff');
    
    backupSheet.setFrozenRows(1);
    backupSheet.setColumnWidth(1, 100); // Fecha
    backupSheet.setColumnWidth(2, 50);  // Día
    backupSheet.setColumnWidth(3, 80);  // Tipo
    backupSheet.setColumnWidth(4, 120); // Categoría
    backupSheet.setColumnWidth(5, 250); // Descripción
    backupSheet.setColumnWidth(6, 100); // Monto
    backupSheet.setColumnWidth(7, 100); // Mes
    backupSheet.setColumnWidth(8, 150); // ID
  }
  
  // Obtener todas las transacciones desde data o desde allTransactions
  let allTransactions = [];
  
  if (data.allTransactions) {
    allTransactions = data.allTransactions;
  } else if (data.transactions) {
    allTransactions = data.transactions;
  }
  
  // Limpiar todas las filas excepto el encabezado
  const lastRow = backupSheet.getLastRow();
  if (lastRow > 1) {
    backupSheet.deleteRows(2, lastRow - 1);
  }
  
  // Insertar todas las transacciones ordenadas por fecha
  if (allTransactions && allTransactions.length > 0) {
    // Ordenar por fecha
    allTransactions.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    
    // Preparar datos para insertar
    const rows = allTransactions.map(t => {
      const day = t.date.split('-')[2];
      const mes = t.date.substring(0, 7); // YYYY-MM
      const tipoTexto = t.type === 'gasto' ? '💸 Gasto' : 
                        t.type === 'ingreso' ? '💰 Ingreso' : '💵 Venta';
      const categoria = formatCategory(t.category);
      
      return [
        t.date,
        parseInt(day),
        tipoTexto,
        categoria,
        t.description || '',
        parseFloat(t.amount),
        mes,
        t.id
      ];
    });
    
    // Insertar todas las filas de una vez
    backupSheet.getRange(2, 1, rows.length, 8).setValues(rows);
    
    // Formatear columna de monto
    backupSheet.getRange(2, 6, rows.length, 1).setNumberFormat('$#,##0.00');
  }
  
  Logger.log('Respaldo completo actualizado con ' + allTransactions.length + ' transacciones');
}

function formatCategory(category) {
  const categories = {
    'la_tarima': '🔨 La Tarima',
    'comida': '🍔 Comida',
    'transporte': '🚗 Transporte',
    'servicios': '💡 Servicios',
    'salud': '🏥 Salud',
    'entretenimiento': '🎮 Entretenimiento',
    'compras': '🛒 Compras',
    'educacion': '📚 Educación',
    'otros': '📦 Otros'
  };
  return categories[category] || category;
}

// ========================================
// FUNCIÓN PARA HOJA MENSUAL
// ========================================
function initializeMonthSheet(sheet, monthName) {
  sheet.getRange('A1').setValue(monthName.toUpperCase());
  sheet.getRange('A1:B1').merge().setFontSize(16).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  
  sheet.getRange('A3').setValue('RESUMEN DEL MES');
  sheet.getRange('A3:B3').merge().setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
  
  sheet.getRange('A4').setValue('Dinero Inicial');
  sheet.getRange('A5').setValue('Ingresos');
  sheet.getRange('A6').setValue('Gastos del mes');
  sheet.getRange('A7').setValue('Saldo');
  sheet.getRange('A8').setValue('Ahorro');
  sheet.getRange('B4:B8').setValue('$0.00');
  
  sheet.getRange('A10').setValue('MÓDULOS');
  sheet.getRange('A10:B10').merge().setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
  
  sheet.getRange('A11').setValue('💵 Efectivo');
  sheet.getRange('A12').setValue('🏦 Banco');
  sheet.getRange('A13').setValue('📱 ML Jona');
  sheet.getRange('A14').setValue('📱 ML Cechu');
  sheet.getRange('B11:B14').setValue('$0.00');
  
  sheet.getRange('A16').setValue('LA TARIMA');
  sheet.getRange('A16:B16').merge().setFontWeight('bold').setBackground('#fbbc04').setFontColor('#000000');
  
  sheet.getRange('A17').setValue('Ingresos');
  sheet.getRange('A18').setValue('Gastos');
  sheet.getRange('A19').setValue('Diferencia');
  sheet.getRange('A20').setValue('Rentabilidad');
  sheet.getRange('B17:B20').setValue('$0.00');
  
  sheet.getRange('A22').setValue('TRANSACCIONES');
  sheet.getRange('A22:F22').merge().setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
  
  sheet.getRange('A23').setValue('Día');
  sheet.getRange('B23').setValue('Descripción');
  sheet.getRange('C23').setValue('Categoría');
  sheet.getRange('D23').setValue('Tipo');
  sheet.getRange('E23').setValue('Ingresos');
  sheet.getRange('F23').setValue('Gastos');
  sheet.getRange('A23:F23').setFontWeight('bold').setBackground('#f4b400').setFontColor('#000000');
  
  sheet.setFrozenRows(23);
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
  
  sheet.getRange('B4:B20').setNumberFormat('$#,##0.00');
  sheet.getRange('E24:F').setNumberFormat('$#,##0.00');
  sheet.getRange('B20').setNumberFormat('0.00%');
}



function updateMonthSummary(sheet, data) {
  sheet.getRange('B4').setValue(parseFloat(data.inicial) || 0);
  sheet.getRange('B5').setValue(parseFloat(data.ingresos) || 0);
  sheet.getRange('B6').setValue(parseFloat(data.gastos) || 0);
  sheet.getRange('B7').setValue(parseFloat(data.saldo) || 0);
  sheet.getRange('B8').setValue(parseFloat(data.ahorro) || 0);
  
  sheet.getRange('B11').setValue(parseFloat(data.efectivo) || 0);
  sheet.getRange('B12').setValue(parseFloat(data.banco) || 0);
  sheet.getRange('B13').setValue(parseFloat(data.ml_jona) || 0);
  sheet.getRange('B14').setValue(parseFloat(data.ml_ceci) || 0);
  
  if (data.laTarima) {
    var ingLT = parseFloat(data.laTarima.ingresos) || 0;
    var gasLT = parseFloat(data.laTarima.gastos) || 0;
    var diff = ingLT - gasLT;
    var rent = gasLT === 0 ? 0 : diff / gasLT;
    
    sheet.getRange('B17').setValue(ingLT);
    sheet.getRange('B18').setValue(gasLT);
    sheet.getRange('B19').setValue(diff);
    sheet.getRange('B20').setValue(rent);
  }
  
  // Recrear transacciones si vienen en los datos
  if (data.transactions && data.transactions.length > 0) {
    var lastRow = sheet.getLastRow();
    if (lastRow >= 24) {
      sheet.deleteRows(24, lastRow - 23);
    }
    
    for (var i = 0; i < data.transactions.length; i++) {
      var trans = data.transactions[i];
      var day = trans.date.split('-')[2];
      var isIngreso = (trans.type === 'ingreso' || trans.type === 'venta');
      var tipoTexto = trans.type === 'gasto' ? 'Gasto' : 
                      trans.type === 'ingreso' ? 'Ingreso' : 'Venta';
      
      sheet.appendRow([
        parseInt(day),
        trans.description || '',
        trans.category || '',
        tipoTexto,
        isIngreso ? parseFloat(trans.amount) : '',
        isIngreso ? '' : parseFloat(trans.amount)
      ]);
    }
  } else if (data.transactions && data.transactions.length === 0) {
    // Si no hay transacciones, borrar todas
    var lastRow = sheet.getLastRow();
    if (lastRow >= 24) {
      sheet.deleteRows(24, lastRow - 23);
    }
  }
  
  SpreadsheetApp.flush();
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
