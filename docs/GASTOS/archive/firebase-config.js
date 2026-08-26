// Archivo auxiliar de configuración de Firebase (guard) - evita 404 si no hay archivo
(function(){
    try {
        if (window.db) {
            console.log('ℹ️ firebase-config.js: Firebase ya inicializado (window.db existe)');
        } else {
            console.log('ℹ️ firebase-config.js: No hay instancia de Firebase en window; si quieres inicializar aquí añade config');
        }
    } catch (e) {
        console.warn('firebase-config.js: error al comprobar firebase', e);
    }
})();
