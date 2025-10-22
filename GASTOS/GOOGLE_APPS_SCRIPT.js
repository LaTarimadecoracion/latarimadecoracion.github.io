// ========================================
// GOOGLE APPS SCRIPT PARA GASTOS FAMILIA
// Opción B: Una hoja por mes con todas las transacciones
// ========================================

function doPost(e) {
  try {
    Logger.log('Recibido: ' + e.postData.contents);
    
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const parts = data.month ? data.month.split('-') : data.date.split('-');
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
    
    if (data.type === 'transaction') {
      addTransactionToSheet(sheet, data);
      return success('Transacción agregada a ' + sheetName);
    }
    
    if (data.type === 'monthData') {
      updateMonthSummary(sheet, data);
      return success('Resumen actualizado en ' + sheetName);
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

function addTransactionToSheet(sheet, data) {
  const day = data.date.split('-')[2];
  const isIngreso = (data.type === 'ingreso' || data.type === 'venta');
  const tipoTexto = data.type === 'gasto' ? 'Gasto' : 
                    data.type === 'ingreso' ? 'Ingreso' : 'Venta';
  
  sheet.appendRow([
    parseInt(day),
    data.description || '',
    data.category || '',
    tipoTexto,
    isIngreso ? parseFloat(data.amount) : '',
    isIngreso ? '' : parseFloat(data.amount)
  ]);
  
  recalculateTotals(sheet);
}

function recalculateTotals(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 24) return;
  
  var ingresos = 0;
  var gastos = 0;
  
  var ingresosRange = sheet.getRange('E24:E' + lastRow).getValues();
  var gastosRange = sheet.getRange('F24:F' + lastRow).getValues();
  
  for (var i = 0; i < ingresosRange.length; i++) {
    if (ingresosRange[i][0]) ingresos += parseFloat(ingresosRange[i][0]);
    if (gastosRange[i][0]) gastos += parseFloat(gastosRange[i][0]);
  }
  
  sheet.getRange('B5').setValue(ingresos);
  sheet.getRange('B6').setValue(gastos);
  
  var inicial = parseFloat(sheet.getRange('B4').getValue()) || 0;
  var saldo = ingresos - gastos;
  var ahorro = saldo + ingresos;
  
  sheet.getRange('B7').setValue(saldo);
  sheet.getRange('B8').setValue(ahorro);
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
