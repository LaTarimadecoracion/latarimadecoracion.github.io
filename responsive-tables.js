(function(){
  function initTable(table){
    var headerRow = table.querySelector('tr');
    if(!headerRow) return;
    var headers = Array.prototype.map.call(headerRow.children, function(cell){
      return (cell.textContent || '').trim();
    });
    var rows = table.querySelectorAll('tr');
    for(var r=1; r<rows.length; r++){
      var tds = rows[r].querySelectorAll('td');
      for(var i=0; i<tds.length; i++){
        var td = tds[i];
        if(!td.hasAttribute('data-label')){
          var label = headers[i] || '';
          if(label){ td.setAttribute('data-label', label); }
        }
      }
    }
  }
  function init(){
    var tables = document.querySelectorAll('table.product-table');
    for(var i=0; i<tables.length; i++) initTable(tables[i]);
  }
  if(document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
