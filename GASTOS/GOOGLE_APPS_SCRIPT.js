// ========================================
// GOOGLE APPS SCRIPT - VERSIÓN ULTRA SIMPLE
// ========================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.type === 'monthData' && data.month) {
      const sheetName = data.month; // Simplemente "2025-10"
      
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        // Crear encabezados simples
        sheet.appendRow(['FECHA', 'TIPO', 'CATEGORÍA', 'DESCRIPCIÓN', 'MONTO']);
        sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
      }
      
      // LIMPIAR TODO excepto encabezado
      if (sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      
      // INSERTAR TRANSACCIONES
      if (data.allTransactions && data.allTransactions.length > 0) {
        data.allTransactions.forEach(function(t) {
          sheet.appendRow([
            t.date,
            t.type,
            t.category,
            t.description || '',
            t.amount
          ]);
        });
      }
      
      return success('OK');
    }
    
    return success('OK');
    
  } catch (error) {
    return errorResponse(error.toString());
  }
}

function doGet(e) {
  return ContentService.createTextOutput('OK');
}



function success(message) {
  return ContentService.createTextOutput(JSON.stringify({status: 'success', message: message}))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(error) {
  return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error}))
    .setMimeType(ContentService.MimeType.JSON);
}
