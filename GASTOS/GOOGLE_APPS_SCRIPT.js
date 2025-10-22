// ========================================
// GOOGLE APPS SCRIPT - VERSIÓN DE DIAGNÓSTICO
// ========================================

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName('DEBUG_LOG');
  
  if (!logSheet) {
    logSheet = ss.insertSheet('DEBUG_LOG');
    logSheet.appendRow(['TIMESTAMP', 'MENSAJE', 'DATOS']);
  }
  
  try {
    const data = JSON.parse(e.postData.contents);
    
    // LOG: Datos recibidos
    logSheet.appendRow([new Date(), 'Datos recibidos', JSON.stringify(data).substring(0, 500)]);
    
    if (data.type === 'monthData' && data.month) {
      const sheetName = data.month;
      
      logSheet.appendRow([new Date(), 'Procesando mes', sheetName]);
      logSheet.appendRow([new Date(), 'Transacciones recibidas', data.allTransactions ? data.allTransactions.length : 0]);
      
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(['FECHA', 'TIPO', 'CATEGORÍA', 'DESCRIPCIÓN', 'MONTO']);
        sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
        logSheet.appendRow([new Date(), 'Hoja creada', sheetName]);
      }
      
      // LIMPIAR
      if (sheet.getLastRow() > 1) {
        const rowsToDelete = sheet.getLastRow() - 1;
        sheet.deleteRows(2, rowsToDelete);
        logSheet.appendRow([new Date(), 'Filas eliminadas', rowsToDelete]);
      }
      
      // INSERTAR TRANSACCIONES UNA POR UNA CON LOG
      if (data.allTransactions && data.allTransactions.length > 0) {
        let insertadas = 0;
        data.allTransactions.forEach(function(t, index) {
          try {
            sheet.appendRow([
              t.date,
              t.type,
              t.category,
              t.description || '',
              t.amount
            ]);
            insertadas++;
            logSheet.appendRow([new Date(), 'Transacción insertada #' + (index + 1), t.date + ' - ' + t.amount]);
          } catch (insertError) {
            logSheet.appendRow([new Date(), 'ERROR insertando #' + (index + 1), insertError.toString()]);
          }
        });
        logSheet.appendRow([new Date(), 'TOTAL INSERTADAS', insertadas + ' de ' + data.allTransactions.length]);
      } else {
        logSheet.appendRow([new Date(), 'ERROR', 'No hay transacciones o array vacío']);
      }
      
      SpreadsheetApp.flush(); // Forzar escritura
      logSheet.appendRow([new Date(), '✅ PROCESO COMPLETADO', 'Última fila en ' + sheetName + ': ' + sheet.getLastRow()]);
      
      return success('OK - ' + (data.allTransactions ? data.allTransactions.length : 0) + ' transacciones procesadas');
    }
    
    logSheet.appendRow([new Date(), 'Tipo no reconocido', data.type || 'sin tipo']);
    return success('OK');
    
  } catch (error) {
    if (logSheet) {
      logSheet.appendRow([new Date(), '❌ ERROR GENERAL', error.toString()]);
    }
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
