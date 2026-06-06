const fs = require('fs');

const code = fs.readFileSync('js/app.js', 'utf8');

// Dividiremos el código en 3 bloques principales usando strings únicos como delimitadores.

const idxDataStart = code.indexOf('// Navegación inteligente - Historial de vistas');
const idxUIStart = code.indexOf('// Dynamic Bottom Navigation Rendering');
const idxAdminStart = code.indexOf('// Admin State');
const idxMainEnd = code.indexOf('// Inicializar renders de constructor al cargar admin');

if (idxDataStart === -1 || idxUIStart === -1 || idxAdminStart === -1 || idxMainEnd === -1) {
    console.error('Fallo al encontrar delimitadores');
    process.exit(1);
}

// 1. DATA
let dataSection = code.substring(idxDataStart, idxUIStart);

// Aseguramos que la persistencia use la ventana global para ser accesible en otros módulos
dataSection = `// js/data.js
// --- DATA MODULE ---
` + dataSection.replace(/let navigationHistory/g, 'window.navigationHistory')
                .replace(/let sessionProducts/g, 'window.sessionProducts')
                .replace(/let appConfig/g, 'window.appConfig')
                .replace(/let contentRegistry/g, 'window.contentRegistry')
                .replace(/const defaultNosotros/g, 'window.defaultNosotros')
                .replace(/function findProductById/g, 'window.findProductById = function')
                .replace(/function extractYouTubeId/g, 'window.extractYouTubeId = function');

// En dataSection hay varios const/let locales a la inicialización que no importa que sean globales.

// 2. UI
let uiSection = code.substring(idxUIStart, idxAdminStart);

// Alternativa segura para UI: En lugar de reescribir cada llave, creamos un wrapper dinámico en runtime!
uiSection = `// js/ui.js
// --- UI MODULE ---

// Interceptor de Degradación Elegante: envuelve las funciones de renderizado en un try-catch global
function safeRender(fn, name) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            console.error(\`[Fault Tolerance] Error controlado en la sección/función UI '\${name}':\`, error);
            // Evitamos pantallas blancas, simplemente abortamos este renderizado parcial
            return false;
        }
    };
}

` + uiSection;

// Hacer las funciones de UI globales y envolverlas
uiSection = uiSection
    .replace(/function renderBottomNav/g, 'window.renderBottomNav = function')
    .replace(/function updateHeader/g, 'window.updateHeader = function')
    .replace(/function navigateToView/g, 'window.navigateToView = function')
    .replace(/function hideAllViews/g, 'window.hideAllViews = function')
    .replace(/function renderHome/g, 'window.renderHome = function')
    .replace(/function renderSectionContent/g, 'window.renderSectionContent = function')
    .replace(/function showProductDetail/g, 'window.showProductDetail = function')
    .replace(/function renderNosotrosBlocksCliente/g, 'window.renderNosotrosBlocksCliente = function')
    .replace(/function renderAvisosCliente/g, 'window.renderAvisosCliente = function')
    .replace(/function openPhotoViewer/g, 'window.openPhotoViewer = function')
    .replace(/function updateActionLinks/g, 'window.updateActionLinks = function');

// Ahora aplicamos el safeRender a las asignaciones:
uiSection = uiSection
    .replace(/window\.renderBottomNav = function/g, 'window.renderBottomNav = safeRender(function')
    .replace(/window\.updateHeader = function/g, 'window.updateHeader = safeRender(function')
    .replace(/window\.navigateToView = function/g, 'window.navigateToView = safeRender(function')
    .replace(/window\.renderHome = function/g, 'window.renderHome = safeRender(function')
    .replace(/window\.renderSectionContent = function/g, 'window.renderSectionContent = safeRender(function')
    .replace(/window\.renderNosotrosBlocksCliente = function/g, 'window.renderNosotrosBlocksCliente = safeRender(function')
    .replace(/window\.renderAvisosCliente = function/g, 'window.renderAvisosCliente = safeRender(function');

// Cuidado: safeRender(function(x) { ... } -> falta el cierre de paréntesis al final de la función original.
// Como es imposible saber con regex dónde termina la función, otra técnica mejor es:
// Declararlas normalmente y al final de ui.js sobreescribirlas: window.renderHome = safeRender(window.renderHome, "renderHome");

uiSection = code.substring(idxUIStart, idxAdminStart);
uiSection = `// js/ui.js
// --- UI MODULE ---

// Interceptor de Degradación Elegante
window.safeRender = function(fn, name) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            console.error(\`[Fault Tolerance] Error controlado en '\${name}':\`, error);
            return false;
        }
    };
};

` + uiSection;

// Exportaciones explícitas al final
uiSection += `
window.renderBottomNav = safeRender(renderBottomNav, 'renderBottomNav');
window.updateHeader = safeRender(updateHeader, 'updateHeader');
window.navigateToView = safeRender(navigateToView, 'navigateToView');
window.hideAllViews = hideAllViews;
window.renderHome = safeRender(renderHome, 'renderHome');
window.renderSectionContent = safeRender(renderSectionContent, 'renderSectionContent');
window.showProductDetail = safeRender(showProductDetail, 'showProductDetail');
window.renderNosotrosBlocksCliente = safeRender(renderNosotrosBlocksCliente, 'renderNosotrosBlocksCliente');
window.renderAvisosCliente = safeRender(renderAvisosCliente, 'renderAvisosCliente');
window.openPhotoViewer = openPhotoViewer;
window.updateActionLinks = updateActionLinks;
`;

// 3. ADMIN
let adminSection = code.substring(idxAdminStart, idxMainEnd);

adminSection = `// js/admin.js
// --- ADMIN MODULE ---

// Interceptor global para Admin (Aislamiento de fallos)
window.safeAdminRun = function(fn) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            console.error('[Admin Fault Tolerance] Excepción capturada en la administración:', error);
            alert('Ocurrió un error en el panel de administración. Revisa la consola.');
        }
    };
};

` + adminSection;

// Exportamos las inicializaciones
adminSection += `
window.renderAdminUX = safeAdminRun(renderAdminUX);
window.renderAdminViewBuilderList = safeAdminRun(renderAdminViewBuilderList);
`;

// 4. MAIN
let mainSection = code.substring(0, idxDataStart) + code.substring(idxMainEnd);

// Eliminar el closure superior para poder declarar variables globales
mainSection = mainSection.replace("document.addEventListener('DOMContentLoaded', () => {", "");

// Reparar las referencias al DOM en Main que se hacían al principio.
// Esas referencias se hacían al inicio pero se usan en toda la app.
// Hay que extraer los selectores DOM y exportarlos globalmente.
const domSelectors = `
// js/main.js
// --- ORCHESTRATOR ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Splash Screen
    const splashScreen = document.getElementById('splash-screen');
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            splashScreen.style.visibility = 'hidden';
        }
    }, 2000);

    // 2. Global DOM Cache
    window.navItems = document.querySelectorAll('.nav-item');
    window.views = document.querySelectorAll('.view');
    window.btnBack = document.getElementById('btn-back');
    window.dynamicTitle = document.getElementById('dynamic-main-title');
    window.dynamicSubtitle = document.getElementById('dynamic-subtitle');

    // Inicializar renders
    if (window.renderBottomNav) window.renderBottomNav();
    if (window.renderHome) window.renderHome();
    if (window.renderAvisosCliente) window.renderAvisosCliente();

    const listInit = document.getElementById('admin-section-components-list');
    if (listInit && window.renderAdminViewBuilderList) {
        window.renderAdminViewBuilderList();
    }

    // Eventos Globales (Back)
    if (window.btnBack) {
        window.btnBack.addEventListener('click', () => {
            if (window.navigationHistory && window.navigationHistory.length > 0) {
                const prev = window.navigationHistory[window.navigationHistory.length - 1];
                if (window.navigateToView) window.navigateToView(prev.viewId, prev.context, true);
            }
        });
    }

    // Eventos Globales (Nav Items creados dinámicamente)
    document.querySelector('.bottom-nav').addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item');
        if (item) {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            window.navigationHistory = [];
            if (window.navigateToView) window.navigateToView(targetId);
        }
    });
});
`;

fs.writeFileSync('js/data.js', dataSection);
fs.writeFileSync('js/ui.js', uiSection);
fs.writeFileSync('js/admin.js', adminSection);
fs.writeFileSync('js/main.js', domSelectors);

console.log('Migración completa.');
