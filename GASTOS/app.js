// Estado de la aplicación
console.log('🚀 CARGANDO APP.JS - Inicio');

// Usuario actual
let currentUser = null;

// Verificar si AppState ya existe en window para evitar duplicados
if (!window.AppState) {
    window.AppState = {
        currentMonth: new Date().toISOString().slice(0, 7),
        // Módulos ahora son por mes: { "2025-10": { efectivo: 1000, banco: 2000, ... }, "2025-11": { ... } }
        modulesByMonth: {},
        transactions: []
    };
    console.log('✅ AppState inicializado');
} else {
    console.log('ℹ️ AppState ya estaba inicializado');
}

// Referencia corta para el estado
const AppState = window.AppState;

// ==========================================
// AUTENTICACIÓN FIREBASE
// ==========================================

// Listener de autenticación
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('✅ Usuario autenticado:', user.email);
        currentUser = user;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        // Cargar datos de Firebase (las reglas de Firestore controlarán el acceso)
        loadDataFromFirebase();
    } else {
        console.log('❌ Usuario no autenticado');
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }
});

// Detectar cambios de conectividad (importante para móviles)
let isOnline = navigator.onLine;

window.addEventListener('online', () => {
    console.log('🌐 Conectividad restaurada');
    isOnline = true;
    showToast('🌐 Conectado - Sincronizando...');
    
    // Sincronizar datos pendientes cuando se recupera la conexión
    if (currentUser) {
        setTimeout(() => {
            saveDataToFirebase();
        }, 1000); // Esperar un poco para asegurar estabilidad de conexión
    }
});

window.addEventListener('offline', () => {
    console.log('📴 Sin conexión a internet');
    isOnline = false;
    showToast('📴 Sin conexión - Datos guardados localmente');
});

// Login con Google
document.addEventListener('DOMContentLoaded', () => {
    const btnLoginGoogle = document.getElementById('btnLoginGoogle');
    if (btnLoginGoogle) {
        btnLoginGoogle.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    console.log('✅ Login exitoso:', result.user.email);
                })
                .catch((error) => {
                    console.error('❌ Error en login:', error);
                    alert('Error al iniciar sesión: ' + error.message);
                });
        });
    }
});

// ==========================================
// FIREBASE FIRESTORE
// ==========================================

// Cargar datos desde Firestore
function loadDataFromFirebase() {
    if (!currentUser) return;
    
    console.log('📥 Cargando datos de Firebase (datos compartidos)...');
    
    // Usar una colección compartida para la familia
    // Todos los usuarios autorizados acceden al mismo documento
    db.collection('familyData').doc('sharedAppState')
        .onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                AppState.modulesByMonth = data.modulesByMonth || {};
                AppState.transactions = data.transactions || [];
                // Solo establecer el mes actual si no está definido
                if (!AppState.currentMonth) {
                    AppState.currentMonth = new Date().toISOString().slice(0, 7);
                }
                
                console.log('✅ Datos compartidos cargados de Firebase');
                console.log('📅 Mes actual establecido:', AppState.currentMonth);
                
                // Actualizar UI solo si ya está inicializada
                if (document.getElementById('currentMonth')) {
                    updateDashboard();
                    displayRecentTransactions();
                    displayTransactions();
                    displayModulesCards();
                }
            } else {
                console.log('📝 Primera vez, creando documento compartido...');
                saveDataToFirebase();
            }
        }, (error) => {
            console.error('❌ Error cargando datos:', error);
            
            if (error.code === 'permission-denied') {
                alert(`🔒 ACCESO DENEGADO\n\nTu email (${currentUser.email}) no está autorizado para acceder a esta aplicación.\n\nContacta al administrador para solicitar acceso.`);
                
                // Cerrar sesión automáticamente
                auth.signOut();
            } else {
                alert('⚠️ Error al cargar datos: ' + error.message);
            }
        });
}

// Guardar datos a Firestore (mejorado para móviles)
function saveDataToFirebase() {
    if (!currentUser) {
        console.log('⚠️ No hay usuario autenticado - saltando guardado en Firebase');
        return;
    }
    
    if (!db) {
        console.error('❌ Firebase no está inicializado correctamente');
        return;
    }
    
    // Verificar conectividad antes de intentar guardar
    if (!navigator.onLine) {
        console.log('� Sin conexión - guardado diferido hasta recuperar conectividad');
        showToast('📴 Sin conexión - se sincronizará al conectar');
        return;
    }
    
    console.log('�📤 Guardando datos en Firebase...', {
        user: currentUser.email,
        transacciones: AppState.transactions.length,
        meses: Object.keys(AppState.modulesByMonth).length,
        online: navigator.onLine
    });
    
    // Configurar timeout para evitar colgarse en móviles con mala conexión
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: operación tardó más de 15 segundos')), 15000)
    );
    
    const savePromise = db.collection('familyData').doc('sharedAppState')
        .set({
            modulesByMonth: AppState.modulesByMonth,
            transactions: AppState.transactions,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.email,
            deviceInfo: {
                userAgent: navigator.userAgent.substring(0, 100),
                timestamp: new Date().toISOString(),
                online: navigator.onLine,
                connection: navigator.connection ? {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink
                } : 'unknown'
            }
        });
    
    Promise.race([savePromise, timeoutPromise])
        .then(() => {
            console.log('✅ Datos guardados exitosamente en Firebase');
            showToast('💾 Datos sincronizados');
        })
        .catch((error) => {
            console.error('❌ Error detallado guardando en Firebase:', {
                code: error.code,
                message: error.message,
                online: navigator.onLine,
                details: error
            });
            
            if (error.code === 'permission-denied') {
                showToast('🔒 Sin permisos para guardar');
                alert('🔒 Sin permisos para guardar datos. Contacta al administrador.');
            } else if (error.code === 'unavailable' || error.message.includes('Timeout')) {
                console.log('🔄 Firebase no disponible o timeout, reintentando...');
                showToast('🔄 Reintentando sincronización...');
                // Reintentar después de 3 segundos
                setTimeout(() => saveDataToFirebase(), 3000);
            } else {
                showToast('⚠️ Error al sincronizar');
                console.error('Error de sincronización:', error.message);
            }
        });
}

// Manejar botón de sincronización manual
function handleSyncButton() {
    const syncButton = document.getElementById('syncButton');
    
    if (!currentUser) {
        showToast('🔐 Debes iniciar sesión para sincronizar');
        return;
    }
    
    if (!navigator.onLine) {
        showToast('📴 Sin conexión a internet');
        return;
    }
    
    // Animación del botón
    syncButton.classList.add('syncing');
    showToast('🔄 Sincronizando datos...');
    
    console.log('🔄 Sincronización manual iniciada');
    
    // Forzar guardado inmediato
    saveDataToFirebase();
    
    // También cargar datos por si hay cambios remotos
    loadDataFromFirebase();
    
    // Quitar animación después de 2 segundos
    setTimeout(() => {
        syncButton.classList.remove('syncing');
    }, 2000);
}

// ==========================================
// MODO OSCURO
// ==========================================

// Inicializar tema
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// NOTE: Feature 'classic/modern' removed. Styles are managed via a single stylesheet (`styles.css`).

// Cambiar tema
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Animación del icono
    const icon = document.querySelector('.theme-icon');
    icon.style.transform = 'rotate(360deg) scale(1.2)';
    setTimeout(() => {
        icon.style.transform = 'rotate(0deg) scale(1)';
    }, 500);
}

// Actualizar icono del tema
function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Helper para obtener módulos del mes actual
function getModulesForCurrentMonth() {
    if (!AppState.modulesByMonth[AppState.currentMonth]) {
        AppState.modulesByMonth[AppState.currentMonth] = {
            efectivo: 0,
            banco: 0,
            ml_jona: 0,
            ml_ceci: 0
        };
    }
    return AppState.modulesByMonth[AppState.currentMonth];
}

// Configuración de módulos
const MODULE_CONFIG = {
    efectivo: { name: 'Efectivo', icon: '💵', color: '#10B981' },
    banco: { name: 'Banco', icon: '🏦', color: '#3B82F6' },
    ml_jona: { name: 'ML Jonathan', icon: '📦', color: '#8B5CF6' },
    ml_ceci: { name: 'ML Cecilia', icon: '📦', color: '#EC4899' },
    tarima: { name: 'La Tarima', icon: '🏪', color: '#F59E0B' }
};

// Categorías de transacciones
const CATEGORIES = {
    la_tarima: '',
    comida: '',
    transporte: '',
    servicios: '',
    salud: '',
    entretenimiento: '',
    compras: '',
    educacion: '',
    otros: ''
};

// Normalizar transacción: asegurar tipos correctos y formato de fecha
function normalizeTransaction(t) {
    const tx = Object.assign({}, t);

    // Monto: convertir comas a puntos, eliminar símbolos y forzar number
    if (tx.amount === undefined || tx.amount === null) {
        tx.amount = 0;
    }
    if (typeof tx.amount === 'string') {
        // Eliminar todo excepto dígitos, comas, puntos y signo menos
        let s = tx.amount.replace(/[^0-9,\.-]/g, '');

        // Manejar separadores de miles y decimal según presencia de '.' y ','
        if (s.includes('.') && s.includes(',')) {
            // Ej: 1.234,56 -> eliminar puntos (miles) y convertir coma a punto (decimal)
            s = s.replace(/\./g, '').replace(/,/g, '.');
        } else if (s.includes(',')) {
            // Ej: 1234,56 -> coma decimal
            s = s.replace(/,/g, '.');
        } else if (s.includes('.')) {
            // Si solo hay puntos, decidir si es decimal o separador de miles
            const parts = s.split('.');
            if (parts.length === 2) {
                // Un único punto: tratar siempre como decimal (aceptar cualquier cantidad de decimales)
                // Ej: 20.20 -> 20.20 ; 20.222 -> 20.222
                s = parts.join('.');
            } else {
                // Múltiples puntos: probablemente separadores de miles, eliminar
                // Ej: 1.234.567 -> 1234567
                s = parts.join('');
            }
        }

        const n = parseFloat(s);
        tx.amount = isNaN(n) ? 0 : n;
    } else if (typeof tx.amount === 'number') {
        // ok
    } else {
        const n = parseFloat(tx.amount);
        tx.amount = isNaN(n) ? 0 : n;
    }

    // Fecha: intentar normalizar a YYYY-MM-DD
    if (tx.date) {
        // Si es Date
        if (tx.date instanceof Date && !isNaN(tx.date.getTime())) {
            tx.date = tx.date.toISOString().split('T')[0];
        } else if (typeof tx.date === 'string') {
            // Si ya está en formato YYYY-MM-DD, dejar
            if (/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
                // ok
            } else {
                // Intentar parsear formatos comunes DD/MM/YYYY o DD-MM-YYYY
                const parts = tx.date.split(/[\/\-.]/).map(p => p.trim());
                if (parts.length === 3) {
                    let [p1, p2, p3] = parts;
                    let day, month, year;
                    if (p1.length === 4) { // YYYY/MM/DD
                        year = p1; month = p2; day = p3;
                    } else { // DD/MM/YYYY
                        day = p1; month = p2; year = p3;
                    }
                    if (year.length === 2) year = '20' + year;
                    day = String(day).padStart(2, '0');
                    month = String(month).padStart(2, '0');
                    if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day)) {
                        tx.date = `${year}-${month}-${day}`;
                    } else {
                        // fallback a fecha actual
                        tx.date = new Date().toISOString().split('T')[0];
                    }
                } else {
                    tx.date = new Date().toISOString().split('T')[0];
                }
            }
        }
    } else {
        tx.date = new Date().toISOString().split('T')[0];
    }

    // Normalizar strings
    tx.type = String(tx.type || '').toLowerCase();
    tx.module = String(tx.module || '').toLowerCase();
    tx.category = String(tx.category || 'otros');
    tx.description = String(tx.description || '');

    return tx;
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ App iniciando...');
    initTheme(); // Inicializar tema primero
    loadData();
    initializeUI();
    attachEventListeners();
    updateDashboard();
    // Mostrar también tarjetas de módulos/valores iniciales en el dashboard
    if (typeof displayModulesCards === 'function') displayModulesCards();
    displayTransactions();
    console.log('✅ App lista!');
});

// Cargar datos del localStorage (solo si no hay usuario Firebase autenticado)
function loadData() {
    // Si hay usuario autenticado, Firebase se encargará de los datos
    if (currentUser) {
        console.log('👤 Usuario autenticado - datos se cargarán desde Firebase');
        return;
    }
    
    const savedData = localStorage.getItem('gastosApp');
    if (savedData) {
        const data = JSON.parse(savedData);
        AppState.modulesByMonth = data.modulesByMonth || {};
        // Normalizar transacciones cargadas (por si vienen de versiones anteriores)
        const rawTx = data.transactions || [];
        try {
            AppState.transactions = rawTx.map(t => normalizeTransaction(t));
            console.log(`✅ ${AppState.transactions.length} transacciones cargadas y normalizadas`);
        } catch (e) {
            console.error('❌ Error normalizando transacciones al cargar:', e);
            AppState.transactions = rawTx;
        }
        // No sobrescribir el mes actual a menos que se indique explícitamente
        // AppState.currentMonth se mantiene con el valor actual
        console.log('✅ Datos cargados desde localStorage');
    }
    
    // Asegurar que el mes actual se muestre correctamente
    updateMonthDisplay();
    console.log('Mes actual configurado a:', AppState.currentMonth);
}

// Función para mostrar notificaciones discretas (toast)
function showToast(message, duration = 2000) {
    // Remover toast anterior si existe
    const existingToast = document.getElementById('toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Crear nuevo toast
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: var(--shadow-lg);
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Mostrar con animación
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Ocultar después del tiempo especificado
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, duration);
}

// Guardar datos en localStorage y Firebase (mejorado)
function saveData() {
    try {
        // Guardar localmente como respaldo
        localStorage.setItem('gastosApp', JSON.stringify(AppState));
        console.log('💾 Datos guardados en localStorage');
        
        // Guardar en Firebase si el usuario está autenticado
        if (currentUser && db) {
            console.log('🔄 Iniciando sincronización con Firebase...');
            saveDataToFirebase();
        } else if (!currentUser) {
            console.log('ℹ️ Usuario no autenticado - solo guardando localmente');
        } else if (!db) {
            console.error('❌ Firebase no disponible - solo guardando localmente');
        }
    } catch (error) {
        console.error('❌ Error en saveData:', error);
        showToast('⚠️ Error al guardar datos');
    }
}

// Inicializar UI
function initializeUI() {
    updateMonthDisplay();
    initializeDayInput();
    
    // Asegurar que el campo de monto esté limpio al cargar
    const quickAmount = document.getElementById('quickAmount');
    if (quickAmount) {
        quickAmount.value = '';
    }
}

// Inicializar input de día con el último guardado o día actual
function initializeDayInput() {
    const savedDay = localStorage.getItem('lastSelectedDay') || new Date().getDate();
    const [year, month] = AppState.currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate(); // month sin restar 1 porque Date(year, month, 0) da último día del mes anterior
    
    // Ajustar el max del input según los días del mes (formulario superior)
    const dayInput = document.getElementById('quickDay');
    if (dayInput) {
        dayInput.max = daysInMonth;
        // Restaurar el último día seleccionado (o día actual)
        const dayToSet = Math.min(parseInt(savedDay), daysInMonth);
        dayInput.value = dayToSet;
    }
    
    // Ajustar el max del input según los días del mes (formulario inferior)
    const dayInputBottom = document.getElementById('quickDayBottom');
    if (dayInputBottom) {
        dayInputBottom.max = daysInMonth;
        const dayToSet = Math.min(parseInt(savedDay), daysInMonth);
        dayInputBottom.value = dayToSet;
    }
    
    // Ajustar el filtro de días también
    const filterDay = document.getElementById('filterDay');
    if (filterDay) {
        filterDay.max = daysInMonth;
    }
}

// Actualizar display del mes
function updateMonthDisplay() {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [year, month] = AppState.currentMonth.split('-');
    document.getElementById('currentMonth').textContent = 
        `${monthNames[parseInt(month) - 1]} ${year}`;
}

// Abrir selector de mes
function openMonthPicker() {
    const [year, month] = AppState.currentMonth.split('-');
    document.getElementById('pickerMonth').value = month;
    document.getElementById('pickerYear').value = year;
    document.getElementById('monthPickerModal').classList.add('active');
}

// Cerrar selector de mes
function closeMonthPicker() {
    document.getElementById('monthPickerModal').classList.remove('active');
}

// Manejar cambio de mes desde el picker
function handleMonthPickerSubmit(e) {
    e.preventDefault();
    const month = document.getElementById('pickerMonth').value;
    const year = document.getElementById('pickerYear').value;
    AppState.currentMonth = `${year}-${month}`;
    
    updateMonthDisplay();
    initializeDayInput();
    updateDashboard();
    displayRecentTransactions();
    displayTransactions();
    displayModulesCards();
    closeMonthPicker();
}

// Event Listeners
function attachEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    document.getElementById('addTransactionBtn').addEventListener('click', openTransactionModal);
    document.getElementById('closeModal').addEventListener('click', closeTransactionModal);
    document.getElementById('cancelTransaction').addEventListener('click', closeTransactionModal);
    
    document.getElementById('transactionModal').addEventListener('click', (e) => {
        if (e.target.id === 'transactionModal') {
            closeTransactionModal();
        }
    });

    document.getElementById('transactionForm').addEventListener('submit', handleTransactionSubmit);
    document.getElementById('quickAddForm').addEventListener('submit', handleQuickAddSubmit);
    document.getElementById('btnAddDetail').addEventListener('click', handleAddDetailClick);

    // Enter en los selects del quick add para submit rápido
    const quickType = document.getElementById('quickType');
    const quickCategory = document.getElementById('quickCategory');
    
    if (quickType) {
        quickType.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('quickAddForm').requestSubmit();
            }
        });
    }
    
    if (quickCategory) {
        quickCategory.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('quickAddForm').requestSubmit();
            }
        });
    }

    document.getElementById('filterType').addEventListener('change', displayTransactions);

    // Filtros en Dashboard
    const filterDayInput = document.getElementById('filterDay');
    const filterDashType = document.getElementById('filterDashType');
    const filterDashCategory = document.getElementById('filterDashCategory');
    const btnClearFilter = document.getElementById('btnClearFilter');
    
    if (filterDayInput) {
        filterDayInput.addEventListener('input', displayRecentTransactions);
    }
    
    if (filterDashType) {
        filterDashType.addEventListener('change', displayRecentTransactions);
    }
    
    if (filterDashCategory) {
        filterDashCategory.addEventListener('change', displayRecentTransactions);
    }
    
    if (btnClearFilter) {
        btnClearFilter.addEventListener('click', clearDayFilter);
    }

    document.getElementById('resetMonthBtn').addEventListener('click', handleResetMonth);
    
    // Month navigation
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('currentMonth').addEventListener('click', openMonthPicker);
    
    // Month picker
    document.getElementById('closeMonthPicker').addEventListener('click', closeMonthPicker);
    document.getElementById('cancelMonthPicker').addEventListener('click', closeMonthPicker);
    document.getElementById('monthPickerForm').addEventListener('submit', handleMonthPickerSubmit);
    
    document.getElementById('monthPickerModal').addEventListener('click', (e) => {
        if (e.target.id === 'monthPickerModal') {
            closeMonthPicker();
        }
    });
    
    // Backup buttons
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    const restoreBackupBtn = document.getElementById('restoreBackupBtn');
    const restoreFileInput = document.getElementById('restoreFileInput');
    
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', downloadExcel);
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', downloadCSV);
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', downloadJSON);
    if (restoreBackupBtn) restoreBackupBtn.addEventListener('click', restoreFromBackup);
    if (restoreFileInput) restoreFileInput.addEventListener('change', handleRestoreFile);
    
    // Cargar última fecha de exportación
    const lastExport = localStorage.getItem('lastExportTime');
    if (lastExport) {
        const elem = document.getElementById('lastExportTime');
        if (elem) elem.textContent = lastExport;
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Sync button (sincronización manual)
    const syncButton = document.getElementById('syncButton');
    if (syncButton) {
        syncButton.addEventListener('click', handleSyncButton);
    }

    // Formato en tiempo real para inputs de monto (focus/blur)
    const quickAmount = document.getElementById('quickAmount');
    const transAmount = document.getElementById('transactionAmount');

    function formatInputDisplay(el) {
        if (!el) return;
        // Si el campo está vacío, dejarlo vacío (no poner 0)
        if (!el.value || el.value.trim() === '') {
            el.value = '';
            return;
        }
        const n = normalizeTransaction({ amount: el.value }).amount;
        const formatted = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
        el.value = formatted;
    }

    function unformatInputForEdit(el) {
        if (!el) return;
        // Si el campo está vacío, dejarlo vacío
        if (!el.value || el.value.trim() === '' || el.value === '0' || el.value === '0.00') {
            el.value = '';
            return;
        }
        const n = normalizeTransaction({ amount: el.value }).amount;
        // Mostrar con punto decimal para facilitar edición (no usar separador de miles)
        // Mantener hasta 5 decimales durante edición si existen
        const display = (Math.round(n * 100000) / 100000).toString();
        el.value = display;
    }

    if (quickAmount) {
        quickAmount.addEventListener('focus', (e) => unformatInputForEdit(e.target));
        quickAmount.addEventListener('blur', (e) => formatInputDisplay(e.target));
        quickAmount.addEventListener('paste', (e) => {
            // Dejamos que paste ocurra, luego formateamos en next tick
            setTimeout(() => formatInputDisplay(quickAmount), 50);
        });
    }

    if (transAmount) {
        transAmount.addEventListener('focus', (e) => unformatInputForEdit(e.target));
        transAmount.addEventListener('blur', (e) => formatInputDisplay(e.target));
        transAmount.addEventListener('paste', (e) => {
            setTimeout(() => formatInputDisplay(transAmount), 50);
        });
    }
}

// Limpiar filtro de día
function clearDayFilter() {
    const filterDay = document.getElementById('filterDay');
    const filterDashType = document.getElementById('filterDashType');
    const filterDashCategory = document.getElementById('filterDashCategory');
    
    if (filterDay) {
        filterDay.value = '';
    }
    if (filterDashType) {
        filterDashType.value = 'all';
    }
    if (filterDashCategory) {
        filterDashCategory.value = 'all';
    }
    
    displayRecentTransactions();
}

// Cambiar mes
function changeMonth(direction) {
    const [year, month] = AppState.currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    AppState.currentMonth = date.toISOString().slice(0, 7);
    
    // Limpiar filtro de día al cambiar de mes
    const filterDay = document.getElementById('filterDay');
    if (filterDay) {
        filterDay.value = '';
    }
    
    updateMonthDisplay();
    initializeDayInput();
    updateDashboard();
    displayRecentTransactions();
    displayTransactions();
    displayModulesCards(); // Actualizar módulos al cambiar de mes
    
    saveData();
}

// Cambiar tab
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });

    if (tabName === 'dashboard') {
        updateDashboard();
    } else if (tabName === 'modules') {
        displayModulesCards();
    }
}

// Actualizar dashboard
function updateDashboard() {
    try {
        const totals = calculateTotals();
        
        // Actualizar totales generales
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const totalBalanceEl = document.getElementById('totalBalance');

    // Saldo actual debe incluir el saldo inicial (saldos por módulos) + ingresos/ventas - gastos
    const currentModules = getModulesForCurrentMonth();
    const initialSum = Object.values(currentModules).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const balanceWithInitial = initialSum + (totals.income - totals.expenses);

    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(totals.income);
    if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(totals.expenses);
    if (totalBalanceEl) totalBalanceEl.textContent = formatCurrency(balanceWithInitial);
        
        // Actualizar estadísticas de La Tarima
        const tarimaStats = document.getElementById('tarimaStats');
        if (tarimaStats) {
            tarimaStats.innerHTML = `
                <div class="balance-segmented" style="margin-top: 1rem;">
                    <div class="segment">
                        <div class="segment-label">VENTAS</div>
                        <div class="segment-amount">${formatCurrency(totals.tarima?.ventas || 0)}</div>
                    </div>
                    
                    <div class="segment">
                        <div class="segment-label">GASTOS</div>
                        <div class="segment-amount">${formatCurrency(totals.tarima?.gastos || 0)}</div>
                    </div>
                    
                    <div class="segment">
                        <div class="segment-label">RENTABILIDAD</div>
                        <div class="segment-amount" style="color: ${(totals.tarima?.rentabilidad || 0) >= 0 ? '#16A34A' : '#DC2626'};">
                            ${formatCurrency(totals.tarima?.rentabilidad || 0)}
                        </div>
                    </div>
                    
                    <div class="segment">
                        <div class="segment-label">MARGEN</div>
                        <div class="segment-amount">
                            ${Number(totals.tarima?.margen || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}%
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Actualizar gráfico de categorías
        if (typeof displayCategoryChart === 'function') {
            displayCategoryChart(totals.categoryExpenses || {});
        }
        
        // Actualizar transacciones recientes
        if (typeof displayRecentTransactions === 'function') {
            displayRecentTransactions();
        }
    } catch (error) {
        console.error('Error en updateDashboard:', error);
    }
}

// Calcular totales
function calculateTotals() {
    console.log('Calculando totales para el mes:', AppState.currentMonth);
    
    const currentMonthTransactions = AppState.transactions.filter(t => 
        t && t.date && t.date.startsWith && t.date.startsWith(AppState.currentMonth)
    );

    console.log('Transacciones del mes actual:', currentMonthTransactions);

    const totals = {
        income: 0,
        expenses: 0,
        balance: 0,
        categoryExpenses: {},
        // Nuevos totales para La Tarima
        tarima: {
            ventas: 0,
            gastos: 0,
            rentabilidad: 0,
            margen: 0
        }
    };

    currentMonthTransactions.forEach(t => {
        // Asegurarse de que el monto sea un número
        const amount = parseFloat(t.amount) || 0;
        
        // Convertir a minúsculas para evitar problemas de mayúsculas/minúsculas
        const module = String(t.module || '').toLowerCase();
        const type = String(t.type || '').toLowerCase();
        
        console.log('Procesando transacción:', { module, type, amount, t });
        
        // Si es de La Tarima
        if (module === 'tarima' || t.category === 'la_tarima') {
            console.log('Transacción de La Tarima encontrada:', t);
            
            if (type === 'ingreso' || type === 'venta') {
                // Sumar tanto a ingresos generales como a ventas de La Tarima
                totals.income += amount;
                totals.tarima.ventas += amount;
                console.log('Sumando a ventas de La Tarima:', amount);
            } else if (type === 'gasto') {
                totals.expenses += amount;
                totals.tarima.gastos += amount;
                console.log('Sumando a gastos de La Tarima:', amount);
            }
        } 
        // Si no es de La Tarima
        else {
            if (type === 'ingreso' || type === 'venta') {
                totals.income += amount;
            } else if (type === 'gasto') {
                totals.expenses += amount;
            }
        }
        
        // Agrupar por categoría (solo para gastos)
        if (t.type === 'gasto' && t.category) {
            if (!totals.categoryExpenses[t.category]) {
                totals.categoryExpenses[t.category] = 0;
            }
            totals.categoryExpenses[t.category] += amount;
        }
    });

    // Calcular rentabilidad de La Tarima (Ganancia Neta)
    totals.tarima.rentabilidad = totals.tarima.ventas - totals.tarima.gastos;
    
    // Calcular margen de rentabilidad: (Ventas / Gastos) * 100
    if (totals.tarima.gastos > 0) {
        const margen = (totals.tarima.ventas / totals.tarima.gastos) * 100;
        // Redondear a 2 decimales
        totals.tarima.margen = Math.round(margen * 100) / 100;
    } else if (totals.tarima.ventas > 0) {
        // Si no hay gastos pero sí ventas, el margen es infinito
        totals.tarima.margen = Infinity;
    } else {
        // Si no hay ni ventas ni gastos, el margen es 0
        totals.tarima.margen = 0;
    }
    
    // Asegurar que no haya NaN o valores infinitos
    if (isNaN(totals.tarima.margen) || !isFinite(totals.tarima.margen)) {
        totals.tarima.margen = 0;
    }
    
    console.log('Totales calculados para La Tarima:', totals.tarima);

    totals.balance = totals.income - totals.expenses;
    return totals;
}

// Mostrar transacciones recientes
function displayRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    
    if (!container) {
        console.error('Container recentTransactions no encontrado');
        return;
    }
    
    console.log('Total transacciones:', AppState.transactions.length);
    console.log('Mes actual:', AppState.currentMonth);
    
    let recentTransactions = AppState.transactions
        .filter(t => t.date && t.date.startsWith(AppState.currentMonth));
    
    // Filtrar por día si hay un valor en el filtro
    const filterDay = document.getElementById('filterDay');
    if (filterDay && filterDay.value) {
        const selectedDay = filterDay.value.padStart(2, '0');
        recentTransactions = recentTransactions.filter(t => {
            const day = t.date.split('-')[2];
            return day === selectedDay;
        });
    }
    
    // Filtrar por tipo
    const filterDashType = document.getElementById('filterDashType');
    if (filterDashType && filterDashType.value !== 'all') {
        recentTransactions = recentTransactions.filter(t => t.type === filterDashType.value);
    }
    
    // Filtrar por categoría
    const filterDashCategory = document.getElementById('filterDashCategory');
    if (filterDashCategory && filterDashCategory.value !== 'all') {
        recentTransactions = recentTransactions.filter(t => t.category === filterDashCategory.value);
    }
    
    recentTransactions = recentTransactions.sort((a, b) => {
        // Ordenar por fecha descendente (más reciente primero)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });

    console.log('Transacciones filtradas:', recentTransactions.length);

    if (recentTransactions.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding: 1.5rem; text-align: center; color: #6B7280;">No hay transacciones recientes</div>';
        return;
    }

    container.innerHTML = '';
    recentTransactions.forEach(transaction => {
        const typeCircle = transaction.type === 'gasto' ? '<span class="circle-indicator red"></span>' : 
                          transaction.type === 'ingreso' ? '<span class="circle-indicator green"></span>' : 
                          '<span class="circle-indicator yellow"></span>';
        const categoryIcon = CATEGORIES[transaction.category] || '';
        const sign = transaction.type === 'gasto' ? '-' : '+';
        
        // Mostrar categoría siempre, y descripción si existe
        const categoryText = formatCategoryName(transaction.category);
        const displayText = transaction.description 
            ? `${categoryText} - ${transaction.description}` 
            : categoryText;
        
        // Obtener solo el día de la fecha
        const day = transaction.date.split('-')[2];
        
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `
            <div class="recent-item-info">
                <span class="recent-day">${day}</span>
                ${typeCircle}
                <span>${categoryIcon}</span>
                <span>${displayText}</span>
            </div>
            <div class="recent-item-actions">
                <div class="recent-item-amount ${transaction.type}">
                    ${sign}${formatCurrency(transaction.amount)}
                </div>
                <button class="btn-edit" data-id="${transaction.id}" title="Editar">✏️</button>
                <button class="btn-delete" data-id="${transaction.id}" title="Eliminar">🗑️</button>
            </div>
        `;
        
        // Agregar event listeners
        const editBtn = item.querySelector('.btn-edit');
        const deleteBtn = item.querySelector('.btn-delete');
        
        editBtn.addEventListener('click', () => handleEditTransaction(transaction.id));
        deleteBtn.addEventListener('click', () => handleDeleteTransaction(transaction.id));
        
        container.appendChild(item);
    });
}

// Eliminar transacción
function handleDeleteTransaction(transactionId) {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) {
        return;
    }
    
    const index = AppState.transactions.findIndex(t => t.id === transactionId);
    if (index !== -1) {
        AppState.transactions.splice(index, 1);
        saveData();
        updateDashboard();
        displayRecentTransactions();
        displayTransactions();
        showNotification('🗑️ Transacción eliminada');
    }
}

// Editar transacción inline
function handleEditTransaction(transactionId) {
    const transaction = AppState.transactions.find(t => t.id === transactionId);
    if (!transaction) {
        alert('Transacción no encontrada');
        return;
    }
    
    // Buscar el elemento de la transacción
    const recentItems = document.querySelectorAll('.recent-item');
    let targetElement = null;
    
    recentItems.forEach(item => {
        const editBtn = item.querySelector(`[data-id="${transactionId}"]`);
        if (editBtn) {
            targetElement = item;
        }
    });
    
    if (!targetElement) {
        console.error('No se encontró el elemento de la transacción');
        return;
    }
    
    // Extraer día de la fecha
    const day = transaction.date.split('-')[2];
    
    // Reemplazar el contenido con un formulario inline
    targetElement.innerHTML = `
        <form class="quick-add-form-inline edit-mode" data-id="${transactionId}" data-original-date="${transaction.date}">
            <input type="number" 
                   name="day" 
                   placeholder="Día"
                   value="${parseInt(day)}"
                   min="1"
                   max="31"
                   required>
            
            <input type="text" 
                   name="amount" 
                   placeholder="$ Monto"
                   value="${transaction.amount}"
                   inputmode="decimal"
                   required>
            
            <select name="type" required>
                <option value="ingreso" ${transaction.type === 'ingreso' ? 'selected' : ''}>💰 Ingreso</option>
                <option value="gasto" ${transaction.type === 'gasto' ? 'selected' : ''}>💸 Gasto</option>
                <option value="venta" ${transaction.type === 'venta' ? 'selected' : ''}>💵 Venta</option>
            </select>

            <select name="category" required>
                <option value="la_tarima" ${transaction.category === 'la_tarima' ? 'selected' : ''}>🔨 La Tarima</option>
                <option value="comida" ${transaction.category === 'comida' ? 'selected' : ''}>🍔 Comida</option>
                <option value="transporte" ${transaction.category === 'transporte' ? 'selected' : ''}>🚗 Transporte</option>
                <option value="servicios" ${transaction.category === 'servicios' ? 'selected' : ''}>💡 Servicios</option>
                <option value="salud" ${transaction.category === 'salud' ? 'selected' : ''}>🏥 Salud</option>
                <option value="entretenimiento" ${transaction.category === 'entretenimiento' ? 'selected' : ''}>🎮 Entret.</option>
                <option value="compras" ${transaction.category === 'compras' ? 'selected' : ''}>🛒 Compras</option>
                <option value="educacion" ${transaction.category === 'educacion' ? 'selected' : ''}>📚 Educ.</option>
                <option value="otros" ${transaction.category === 'otros' ? 'selected' : ''}>📦 Otros</option>
            </select>

            <input type="hidden" name="description" value="${transaction.description || ''}">

            <button type="button" class="btn-add-detail-inline" title="Agregar/editar detalle">
                ${transaction.description ? '📝' : '➕'}
            </button>

            <button type="submit" class="btn-quick-add-inline">
                ✅
            </button>
        </form>
    `;
    
    // Agregar event listener al formulario
    const form = targetElement.querySelector('form');
    form.addEventListener('submit', (e) => handleInlineEditSubmit(e, transactionId));
    
    // Event listener para el botón de detalle
    const btnDetail = form.querySelector('.btn-add-detail-inline');
    btnDetail.addEventListener('click', () => editAddDetail(form));
    
    // Event listeners para Enter en los selects
    const typeSelect = form.querySelector('select[name="type"]');
    const categorySelect = form.querySelector('select[name="category"]');
    
    typeSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.querySelector('button[type="submit"]').click();
        }
    });
    
    categorySelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.querySelector('button[type="submit"]').click();
        }
    });
}

// Manejar submit del formulario de edición inline
function handleInlineEditSubmit(e, transactionId) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const selectedDay = parseInt(formData.get('day'));
    const originalDate = e.target.dataset.originalDate;
    const [year, month] = originalDate.split('-');
    
    // Validar día
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    if (selectedDay < 1 || selectedDay > daysInMonth) {
        alert(`El día debe estar entre 1 y ${daysInMonth} para este mes.`);
        return;
    }
    
    // Construir la fecha completa
    const dateStr = `${year}-${month}-${String(selectedDay).padStart(2, '0')}`;
    
    // Encontrar y actualizar la transacción
    const index = AppState.transactions.findIndex(t => t.id === transactionId);
    if (index !== -1) {
        const category = formData.get('category');
        const type = formData.get('type');
        const module = (category === 'la_tarima') ? 'tarima' : 'general';
        
        let updatedTransaction = {
            id: transactionId,
            type: type,
            module: module,
            amount: formData.get('amount'),
            category: category,
            date: dateStr,
            description: formData.get('description') || ''
        };
        
        updatedTransaction = normalizeTransaction(updatedTransaction);
        AppState.transactions[index] = updatedTransaction;
        
        saveData();
        updateDashboard();
        displayRecentTransactions();
        
        showNotification('✅ Transacción actualizada');
    }
}

// Editar detalle en formulario inline
function editAddDetail(form) {
    const currentDescription = form.querySelector('input[name="description"]').value;
    const description = prompt('📝 Ingresa el detalle de la transacción:', currentDescription);
    
    if (description !== null) {
        form.querySelector('input[name="description"]').value = description;
        
        const btn = form.querySelector('.btn-add-detail-inline');
        if (description.trim() !== '') {
            btn.textContent = '📝';
            btn.style.color = '#059669';
        } else {
            btn.textContent = '➕';
            btn.style.color = '#3B82F6';
        }
    }
}

// Formatear nombre de categoría
function formatCategoryName(category) {
    if (category === 'la_tarima') return 'La Tarima';
    return category.charAt(0).toUpperCase() + category.slice(1);
}

// Mostrar gráfico de categorías
function displayCategoryChart(categoryExpenses) {
    const chartContainer = document.getElementById('categoryChart');
    
    if (Object.keys(categoryExpenses).length === 0) {
        chartContainer.innerHTML = '<div class="empty-state">No hay gastos registrados este mes</div>';
        return;
    }

    const maxAmount = Math.max(...Object.values(categoryExpenses));
    chartContainer.innerHTML = '';

    Object.entries(categoryExpenses)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, amount]) => {
            const percentage = (amount / maxAmount) * 100;
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.innerHTML = `
                <div class="chart-bar-label">
                    <span>${CATEGORIES[category]} ${formatCategoryName(category)}</span>
                    <span>${formatCurrency(amount)}</span>
                </div>
                <div class="chart-bar-fill" style="width: ${percentage}%"></div>
            `;
            chartContainer.appendChild(bar);
        });
}

// Mostrar transacciones
function displayTransactions() {
    const list = document.getElementById('transactionsList');
    const filterType = document.getElementById('filterType').value;

    let filtered = AppState.transactions.filter(t => 
        t.date.startsWith(AppState.currentMonth)
    );

    if (filterType !== 'all') {
        filtered = filtered.filter(t => t.type === filterType);
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>No hay transacciones para mostrar</p>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    filtered.forEach(transaction => {
        const item = createTransactionElement(transaction);
        list.appendChild(item);
    });
}

// Crear elemento de transacción
function createTransactionElement(transaction) {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    
    const typeText = transaction.type === 'gasto' ? 'Gasto' : 
                     transaction.type === 'ingreso' ? 'Ingreso' : 'Venta';
    
    const typeCircle = transaction.type === 'gasto' ? '<span class="circle-indicator red"></span>' : 
                       transaction.type === 'ingreso' ? '<span class="circle-indicator green"></span>' : 
                       '<span class="circle-indicator yellow"></span>';
    
    const formattedDate = new Date(transaction.date + 'T00:00:00').toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
    });

    const sign = transaction.type === 'gasto' ? '-' : '+';
    
    item.innerHTML = `
        <div class="td-fecha">${formattedDate}</div>
        <div class="td-tipo">${typeCircle} ${typeText}</div>
        <div class="td-categoria">${formatCategoryName(transaction.category)}</div>
        <div class="td-descripcion">${transaction.description || '-'}</div>
        <div class="td-monto ${transaction.type}">${sign}${formatCurrency(transaction.amount)}</div>
        <div class="td-actions">
            <button class="btn-icon" onclick="deleteTransaction('${transaction.id}')" title="Eliminar">🗑️</button>
        </div>
    `;
    
    return item;
}

// Modal de transacción
function openTransactionModal() {
    document.getElementById('transactionModal').classList.add('active');
    document.getElementById('transactionForm').reset();
    document.getElementById('transDate').valueAsDate = new Date();
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('active');
}

// Mostrar tarjetas de módulos
function displayModulesCards() {
    const moduleNames = ['efectivo', 'banco', 'ml_jona', 'ml_ceci'];
    const currentModules = getModulesForCurrentMonth();
    
    // Actualizar los montos de cada módulo
    moduleNames.forEach(moduleName => {
        const amount = currentModules[moduleName] || 0;
        const element = document.getElementById(`${moduleName}-amount`);
        if (element) {
            element.textContent = formatCurrency(amount);
        }
    });
    
    // INICIAL: Suma de los módulos del mes actual
    const totalInicial = Object.values(currentModules).reduce((sum, val) => sum + val, 0);
    
    // MES ANTERIOR: Calcular el saldo actual del mes anterior
    const [year, month] = AppState.currentMonth.split('-').map(Number);
    const previousMonthDate = new Date(year, month - 2, 1); // -2 porque los meses van de 0-11
    const previousMonthKey = previousMonthDate.toISOString().slice(0, 7);
    
    // Obtener módulos del mes anterior
    const previousModules = AppState.modulesByMonth[previousMonthKey] || {
        efectivo: 0, banco: 0, ml_jona: 0, ml_ceci: 0
    };
    const totalInicialMesAnterior = Object.values(previousModules).reduce((sum, val) => sum + val, 0);
    
    // Calcular ingresos y gastos del mes anterior
    const previousMonthTransactions = AppState.transactions.filter(t => 
        t.date && t.date.startsWith(previousMonthKey)
    );
    
    let ingresosMesAnterior = 0;
    let gastosMesAnterior = 0;
    
    previousMonthTransactions.forEach(t => {
        if (t.type === 'ingreso' || t.type === 'venta') {
            ingresosMesAnterior += t.amount;
        } else if (t.type === 'gasto') {
            gastosMesAnterior += t.amount;
        }
    });
    
    // Saldo actual del mes anterior = inicial + ingresos - gastos
    const saldoActualMesAnterior = totalInicialMesAnterior + ingresosMesAnterior - gastosMesAnterior;
    
    // DIFERENCIA: Inicial del mes actual - Saldo actual del mes anterior
    const diferencia = totalInicial - saldoActualMesAnterior;
    
    // AHORRO: Diferencia + Ingresos del mes actual
    const currentMonthTransactions = AppState.transactions.filter(t => 
        t.date && t.date.startsWith(AppState.currentMonth)
    );
    
    let ingresosActuales = 0;
    let gastosActuales = 0;

    currentMonthTransactions.forEach(t => {
        if (t.type === 'ingreso' || t.type === 'venta') {
            ingresosActuales += t.amount;
        } else if (t.type === 'gasto') {
            gastosActuales += t.amount;
        }
    });

    // Saldo actual del mes = inicial + ingresos - gastos
    const saldoActualMes = totalInicial + ingresosActuales - gastosActuales;

    // Ahorro = Saldo actual del mes - Saldo actual del mes anterior
    const ahorro = saldoActualMes - saldoActualMesAnterior;
    
    // Actualizar la barra de información
    const totalInicialEl = document.getElementById('totalInicial');
    const totalInicialModulesEl = document.getElementById('totalInicialModules');
    const totalMesAnteriorEl = document.getElementById('totalMesAnterior');
    const totalDiferenciaEl = document.getElementById('totalDiferencia');
    const totalAhorroEl = document.getElementById('totalAhorro');
    
    if (totalInicialEl) totalInicialEl.textContent = formatCurrency(totalInicial);
    if (totalInicialModulesEl) totalInicialModulesEl.textContent = formatCurrency(totalInicial);
    if (totalMesAnteriorEl) totalMesAnteriorEl.textContent = formatCurrency(saldoActualMesAnterior);
    if (totalDiferenciaEl) {
        totalDiferenciaEl.textContent = formatCurrency(diferencia);
        // Cambiar color según si es positivo o negativo (colores más oscuros para fondo claro)
        if (diferencia > 0) {
            totalDiferenciaEl.style.color = '#059669'; // verde oscuro
        } else if (diferencia < 0) {
            totalDiferenciaEl.style.color = '#DC2626'; // rojo oscuro
        } else {
            totalDiferenciaEl.style.color = '#111827'; // gris oscuro
        }
    }
    if (totalAhorroEl) {
        totalAhorroEl.textContent = formatCurrency(ahorro);
        // Color según si el ahorro es positivo o negativo (colores más oscuros para fondo claro)
        if (ahorro > 0) {
            totalAhorroEl.style.color = '#059669'; // verde oscuro
        } else if (ahorro < 0) {
            totalAhorroEl.style.color = '#DC2626'; // rojo oscuro
        } else {
            totalAhorroEl.style.color = '#111827'; // gris oscuro
        }
    }
}

// Editar módulo individual
function editModule(moduleName) {
    const currentModules = getModulesForCurrentMonth();
    const currentAmount = currentModules[moduleName] || 0;
    const moduleInfo = MODULE_CONFIG[moduleName];
    
    const newAmount = prompt(
        `${moduleInfo.icon} ${moduleInfo.name}\n\nIngresa el saldo inicial del mes:`,
        currentAmount
    );
    
    if (newAmount !== null) {
        const parsedAmount = parseFloat(newAmount);
        if (!isNaN(parsedAmount)) {
            currentModules[moduleName] = parsedAmount;
            saveData();
            updateDashboard();
            displayModulesCards();
            showNotification(`✅ ${moduleInfo.name} actualizado`);
        } else {
            alert('Por favor ingresa un número válido');
        }
    }
}

// Hacer la función global para que funcione con onclick
window.editModule = editModule;

// Manejar submit de módulos (removido, ahora se usa editModule)

// Manejar submit de transacción
function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const editId = e.target.dataset.editId;
    
    if (editId) {
        // MODO EDICIÓN: Actualizar transacción existente
        const index = AppState.transactions.findIndex(t => t.id === editId);
        if (index !== -1) {
            let updatedTransaction = {
                id: editId,
                type: formData.get('type'),
                module: formData.get('module'),
                amount: formData.get('amount'),
                category: formData.get('category'),
                date: formData.get('date'),
                description: formData.get('description')
            };
            
            updatedTransaction = normalizeTransaction(updatedTransaction);
            AppState.transactions[index] = updatedTransaction;
            
            saveData();
            closeTransactionModal();
            updateDashboard();
            displayRecentTransactions();
            displayTransactions();
            
            showNotification('✅ Transacción actualizada');
        }
        
        // Limpiar el editId
        delete e.target.dataset.editId;
        
    } else {
        // MODO CREACIÓN: Nueva transacción
        let transaction = {
            id: Date.now().toString(),
            type: formData.get('type'),
            module: formData.get('module'),
            amount: formData.get('amount'),
            category: formData.get('category'),
            date: formData.get('date'),
            description: formData.get('description')
        };

        transaction = normalizeTransaction(transaction);
        AppState.transactions.push(transaction);
        
        saveData();
        closeTransactionModal();
        updateDashboard();
        displayRecentTransactions();
        displayTransactions();
        
        showNotification('✅ Transacción guardada');
    }
}

// Manejar clic en botón de agregar detalle
function handleAddDetailClick() {
    const description = prompt('📝 Ingresa el detalle de la transacción:');
    if (description !== null && description.trim() !== '') {
        // Guardar el detalle en un campo oculto o variable temporal
        const form = document.getElementById('quickAddForm');
        let descInput = form.querySelector('input[name="description"]');
        
        // Si no existe el input oculto, crearlo
        if (!descInput) {
            descInput = document.createElement('input');
            descInput.type = 'hidden';
            descInput.name = 'description';
            form.appendChild(descInput);
        }
        
        descInput.value = description;
        
        // Cambiar visualmente el botón para indicar que hay un detalle
        const btn = document.getElementById('btnAddDetail');
        btn.textContent = '📝';
        btn.style.color = '#059669';
        
        showNotification('📝 Detalle agregado');
    }
}

// Manejar submit de formulario rápido
function handleQuickAddSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const selectedDay = parseInt(formData.get('day'));
    const [year, month] = AppState.currentMonth.split('-');
    
    // Validar que el día sea válido para el mes actual
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    if (selectedDay < 1 || selectedDay > daysInMonth) {
        alert(`El día debe estar entre 1 y ${daysInMonth} para este mes.`);
        return;
    }
    
    // Guardar el día seleccionado para futuras transacciones
    localStorage.setItem('lastSelectedDay', selectedDay);
    
    // Construir la fecha completa
    const dateStr = `${year}-${month}-${String(selectedDay).padStart(2, '0')}`;
    
    // Obtener categoría y tipo de transacción
    const category = formData.get('category');
    const type = formData.get('type');
    
    // Determinar el módulo basado en la categoría
    const module = (category === 'la_tarima') ? 'tarima' : 'general';
    
    // Si es una venta o ingreso de La Tarima, asegurarse de que el tipo sea 'ingreso' o 'venta'
    let transactionType = type;
    if (category === 'la_tarima' && (type === 'ingreso' || type === 'venta')) {
        transactionType = 'ingreso'; // Unificar ingresos y ventas para La Tarima
    }
    
    console.log('Creando transacción:', { category, module, type: transactionType });
    
    const transaction = {
        id: Date.now().toString(),
        type: transactionType,
        module: module,
        amount: formData.get('amount'),
        category: category,
        date: dateStr,
        description: formData.get('description') || ''
    };

    const normalized = normalizeTransaction(transaction);
    AppState.transactions.push(normalized);
    
    saveData();
    
    // Limpiar solo el campo de monto y mantener el foco en él
    document.getElementById('quickAmount').value = '';
    document.getElementById('quickAmount').focus();
    
    // Resetear el botón de detalle y limpiar el campo oculto
    const btnDetail = document.getElementById('btnAddDetail');
    btnDetail.textContent = '➕';
    btnDetail.style.color = '#3B82F6';
    const descInput = e.target.querySelector('input[name="description"]');
    if (descInput) {
        descInput.value = '';
    }
    
    // Actualizar todas las vistas
    console.log('Actualizando la interfaz...');
    
    // Forzar actualización del dashboard
    updateDashboard();
    
    // Actualizar transacciones recientes
    if (typeof displayRecentTransactions === 'function') {
        displayRecentTransactions();
    }
    
    // Actualizar lista de transacciones
    if (typeof displayTransactions === 'function') {
        displayTransactions();
    }
    
    // Forzar un repintado del navegador
    document.body.offsetHeight;
    
    // Feedback visual
    const btn = e.target.querySelector('.btn-quick-add-inline');
    const originalEmoji = btn.textContent;
    btn.textContent = '✓';
    btn.style.background = '#10B981';
    btn.style.color = 'white';
    
    setTimeout(() => {
        btn.textContent = originalEmoji;
        btn.style.background = '';
        btn.style.color = '';
    }, 800);
}

// Eliminar transacción
function deleteTransaction(id) {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) {
        return;
    }

    AppState.transactions = AppState.transactions.filter(t => t.id !== id);
    saveData();
    
    updateDashboard();
    displayTransactions();
    
    showNotification('🗑️ Transacción eliminada');
}

// Reiniciar mes
function handleResetMonth() {
    const confirmation = prompt('⚠️ ADVERTENCIA: Esto eliminará TODAS las transacciones del mes actual.\n\nEscribe "CONFIRMAR" para continuar:');
    
    if (confirmation !== 'CONFIRMAR') {
        showNotification('❌ Operación cancelada');
        return;
    }

    AppState.transactions = AppState.transactions.filter(t => 
        !t.date.startsWith(AppState.currentMonth)
    );

    saveData();
    updateDashboard();
    displayTransactions();
    
    showNotification('🔄 Mes reiniciado correctamente');
}

// Formatear moneda
function formatCurrency(amount) {
    // Mostrar siempre 2 decimales en la UI
    const options = {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    };
    return new Intl.NumberFormat('es-AR', options).format(Number(amount) || 0);
}

// Mostrar notificación
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1F2937;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==========================================
// FUNCIONES DE BACKUP Y EXPORTACIÓN
// ==========================================

function downloadCSV() {
    const month = AppState.currentMonth;
    const monthName = new Date(month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    // Procesar transacciones: filtrar, formatear y ordenar
    const transactions = AppState.transactions
        .filter(t => t.date && t.date.startsWith(month))
        .map(t => {
            // Asegurar que la fecha esté en formato YYYY-MM-DD
            let formattedDate = t.date;
            if (formattedDate && formattedDate.length === 10) {
                // Si ya está en formato YYYY-MM-DD, dejarlo así
                formattedDate = formattedDate;
            } else if (formattedDate) {
                // Si no, intentar formatear desde timestamp o lo que sea
                try {
                    const date = new Date(formattedDate);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toISOString().split('T')[0];
                    }
                } catch (e) {
                    console.error('Error al formatear fecha:', e);
                }
            }

            return {
                ...t,
                date: formattedDate,
                // Escapar comillas y formatear para CSV
                description: t.description ? `"${String(t.description).replace(/"/g, '""')}"` : '""',
                category: t.category ? `"${String(t.category).replace(/"/g, '""')}"` : '""',
                module: t.module ? `"${String(t.module).replace(/"/g, '""')}"` : '""',
                // Formatear monto con coma como separador decimal y siempre 2 decimales
                amount: typeof t.amount === 'number' ? t.amount.toFixed(2).replace(/\./, ',') : '0,00'
            };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha descendente
    
    if (transactions.length === 0) {
        showNotification('⚠️ No hay transacciones en este mes', 'warning');
        return;
    }
    
    // Crear encabezados y filas del CSV
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Módulo', 'Descripción', 'Monto'];
    const csvContent = [
        headers.join(','), // Encabezados
        ...transactions.map(t => [
            t.date,
            t.type,
            t.category,
            t.module,
            t.description,
            t.amount
        ].join(','))
    ].join('\n');
    
    // Crear y descargar archivo
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gastos_${monthName.toLowerCase().replace(' ', '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    updateLastExportTime();
    showNotification(`✅ Exportado ${transactions.length} transacciones a CSV`, 'success');
}

function downloadExcel() {
    if (AppState.transactions.length === 0) {
        showNotification('⚠️ No hay transacciones para exportar', 'warning');
        return;
    }
    
    // Agrupar por mes
    const byMonth = {};
    AppState.transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(t);
    });
    
    // Crear HTML para Excel
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="utf-8">
            <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>`;
    
    Object.keys(byMonth).sort().forEach(month => {
        html += `<x:ExcelWorksheet><x:Name>${month}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>`;
    });
    
    html += `</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        </head>
        <body>`;
    
    Object.keys(byMonth).sort().forEach(month => {
        const transactions = byMonth[month];
        const ingresos = transactions.filter(t => t.type === 'ingreso' || t.type === 'venta').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const gastos = transactions.filter(t => t.type === 'gasto' || t.type === 'compra').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        html += `
            <table border="1">
                <caption><h2>${month}</h2></caption>
                <thead>
                    <tr style="background:#4285f4;color:white;font-weight:bold;">
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Categoría</th>
                        <th>Módulo</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>`;
        
        transactions.forEach(t => {
            html += `
                <tr>
                    <td>${t.date}</td>
                    <td>${t.type}</td>
                    <td>${t.category || ''}</td>
                    <td>${t.module || ''}</td>
                    <td>${t.description || ''}</td>
                    <td>${t.amount}</td>
                </tr>`;
        });
        
        html += `
                    <tr style="background:#f0f0f0;font-weight:bold;">
                        <td colspan="5">INGRESOS</td>
                        <td>$${ingresos.toFixed(2)}</td>
                    </tr>
                    <tr style="background:#f0f0f0;font-weight:bold;">
                        <td colspan="5">GASTOS</td>
                        <td>$${gastos.toFixed(2)}</td>
                    </tr>
                    <tr style="background:#d4edda;font-weight:bold;">
                        <td colspan="5">SALDO</td>
                        <td>$${(ingresos - gastos).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            <br><br>`;
    });
    
    html += `</body></html>`;
    
    // Descargar
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gastos_completo_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    
    updateLastExportTime();
    showNotification('✅ Excel descargado exitosamente', 'success');
}

function downloadJSON() {
    const backup = {
        exportDate: new Date().toISOString(),
        transactions: AppState.transactions,
        modulesByMonth: AppState.modulesByMonth
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_completo_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    updateLastExportTime();
    showNotification('✅ Backup JSON descargado exitosamente', 'success');
}

function updateLastExportTime() {
    const now = new Date().toLocaleString('es-AR');
    const elem = document.getElementById('lastExportTime');
    if (elem) {
        elem.textContent = now;
        localStorage.setItem('lastExportTime', now);
    }
}

function restoreFromBackup() {
    const fileInput = document.getElementById('restoreFileInput');
    fileInput.click();
}

function handleRestoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            // Validar que tenga la estructura correcta
            if (!backup.transactions || !Array.isArray(backup.transactions)) {
                alert('❌ El archivo no tiene un formato válido');
                event.target.value = '';
                return;
            }
            
            // Detectar qué meses tiene el backup
            const monthsInBackup = new Set();
            backup.transactions.forEach(t => {
                const month = t.date.substring(0, 7);
                monthsInBackup.add(month);
            });
            
            const monthsList = Array.from(monthsInBackup).sort();
            
            if (monthsList.length === 0) {
                alert('❌ El backup no contiene transacciones');
                event.target.value = '';
                return;
            }
            
            // Mostrar opciones al usuario
            let userChoice;
            if (monthsList.length === 1) {
                // Solo hay un mes
                userChoice = confirm(`El backup contiene el mes: ${monthsList[0]}\n\n¿Quieres restaurar este mes?\n\nOK = Restaurar solo este mes\nCancelar = No hacer nada`);
                
                if (!userChoice) {
                    event.target.value = '';
                    return;
                }
                
                // Restaurar solo ese mes
                restoreSingleMonth(backup, monthsList[0]);
                
            } else {
                // Múltiples meses - dar opciones
                const monthsText = monthsList.join(', ');
                const choice = prompt(`📊 El backup contiene ${monthsList.length} meses:\n${monthsText}\n\n¿Qué quieres hacer?\n\n1 = Restaurar TODO (reemplaza todos los datos)\n2 = Restaurar SOLO UN MES (escribe el mes)\n\nEscribe 1, 2 o el mes (ej: 2025-10):`);
                
                if (!choice) {
                    event.target.value = '';
                    return;
                }
                
                if (choice === '1') {
                    // Restaurar TODO
                    const confirmAll = confirm(`⚠️ ¿Reemplazar TODOS los datos actuales con los ${backup.transactions.length} transacciones del backup?`);
                    
                    if (confirmAll) {
                        AppState.transactions = backup.transactions || [];
                        AppState.modulesByMonth = backup.modulesByMonth || {};
                        
                        saveDataToFirebase()
                            .then(() => {
                                showNotification(`✅ ${backup.transactions.length} transacciones restauradas`, 'success');
                                updateDashboard();
                                displayTransactions();
                                displayModulesCards();
                            })
                            .catch(error => {
                                alert('❌ Error: ' + error.message);
                            });
                    }
                    
                } else if (choice === '2' || monthsList.includes(choice)) {
                    // Restaurar un mes específico
                    let selectedMonth = choice === '2' ? prompt(`Escribe el mes (${monthsList.join(', ')}):`) : choice;
                    
                    if (selectedMonth && monthsList.includes(selectedMonth)) {
                        restoreSingleMonth(backup, selectedMonth);
                    } else {
                        alert('❌ Mes no válido');
                    }
                } else {
                    alert('❌ Opción no válida');
                }
            }
            
        } catch (error) {
            console.error('❌ Error leyendo backup:', error);
            alert('❌ Error al leer el archivo JSON: ' + error.message);
        }
        
        // Limpiar input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

function restoreSingleMonth(backup, month) {
    const transactionsToRestore = backup.transactions.filter(t => t.date.startsWith(month));
    
    const confirmation = confirm(`¿Restaurar ${transactionsToRestore.length} transacciones del mes ${month}?\n\nEsto REEMPLAZARÁ las transacciones actuales de ese mes.`);
    
    if (!confirmation) return;
    
    // Eliminar transacciones del mes seleccionado
    AppState.transactions = AppState.transactions.filter(t => !t.date.startsWith(month));
    
    // Agregar transacciones del backup para ese mes
    AppState.transactions.push(...transactionsToRestore);
    
    // Restaurar módulos de ese mes si existen
    if (backup.modulesByMonth && backup.modulesByMonth[month]) {
        AppState.modulesByMonth[month] = backup.modulesByMonth[month];
    }
    
    // Guardar en Firebase
    saveDataToFirebase()
        .then(() => {
            showNotification(`✅ Mes ${month} restaurado con ${transactionsToRestore.length} transacciones`, 'success');
            
            // Si estamos viendo ese mes, actualizar la vista
            if (AppState.currentMonth === month) {
                updateDashboard();
                displayTransactions();
                displayModulesCards();
            }
            
            console.log(`✅ Mes ${month} restaurado:`, transactionsToRestore.length, 'transacciones');
        })
        .catch(error => {
            console.error('❌ Error restaurando mes:', error);
            alert('❌ Error al restaurar: ' + error.message);
        });
}

// Exportar funciones globales
window.deleteTransaction = deleteTransaction;

// ==========================================
// IMPORTACIÓN DE TRANSACCIONES DESDE CSV
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const importBtn = document.getElementById('importTransactionsBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileImport);
    }
});

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const transactions = await parseCSV(file);
        if (transactions && transactions.length > 0) {
            showImportPreview(transactions);
        }
    } catch (error) {
        console.error('Error al importar transacciones:', error);
        showNotification('Error al importar transacciones', 'error');
    }
    
    // Limpiar el input para permitir importar el mismo archivo de nuevo
    event.target.value = '';
}

function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                console.log('Primeras 500 caracteres del archivo:', text.substring(0, 500));
                
                // Normalizar saltos de línea y dividir en líneas
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                console.log(`Total de líneas encontradas: ${lines.length}`);
                
                if (lines.length === 0) {
                    throw new Error('El archivo está vacío');
                }

                // Verificar si la primera línea contiene encabezados
                const firstLine = lines[0].toLowerCase();
                console.log('Primera línea del archivo:', firstLine);
                
                const hasHeaders = firstLine.includes('fecha') && 
                                 (firstLine.includes('descrip') || firstLine.includes('concepto'));
                
                // Si hay encabezados, los usamos, si no, asumimos el orden de Mercado Pago
                let headers = [];
                let startIndex = 0;
                
                if (hasHeaders) {
                    headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    startIndex = 1; // Saltar la fila de encabezados
                } else {
                    // Asumir orden de Mercado Pago: Fecha, Hora, Descripción, Importe, Saldo
                    headers = ['fecha', 'hora', 'descripcion', 'importe', 'saldo'];
                }
                
                console.log('Encabezados detectados:', headers);
                
                const transactions = [];
                const categoryMap = {
                    'mercadopago': 'servicios',
                    'transferencia': 'transferencia',
                    'pago': 'pagos',
                    'cobro': 'ingresos',
                    'retiro': 'efectivo',
                    'deposito': 'ingresos',
                    'cuentadni': 'transferencia',
                    'pago de servicios': 'servicios',
                    'pago de tarjeta': 'tarjeta'
                };
                
                for (let i = startIndex; i < lines.length; i++) {
                    try {
                        const line = lines[i];
                        if (!line.trim()) continue;
                        
                        // Manejar comas dentro de campos entre comillas
                        const values = [];
                        let inQuotes = false;
                        let currentValue = '';
                        
                        for (let j = 0; j < line.length; j++) {
                            const char = line[j];
                            
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                values.push(currentValue.trim());
                                currentValue = '';
                            } else {
                                currentValue += char;
                            }
                        }
                        values.push(currentValue.trim());
                        
                        // Verificar si la línea tiene suficientes valores
                        if (values.length < headers.length) {
                            console.warn(`Línea ${i+1} ignorada - No tiene suficientes valores:`, line);
                            continue;
                        }
                        
                        const transaction = {};
                        headers.forEach((header, index) => {
                            if (values[index] !== undefined) {
                                // Eliminar comillas al inicio y final si existen
                                transaction[header] = values[index].replace(/^"/, '').replace(/"$/, '');
                            } else {
                                transaction[header] = '';
                            }
                        });
                        
                        // Procesar el monto (puede venir como "1.000,50", "20.20", "-1.000,50", etc.)
                        // Usar normalizeTransaction para asegurar comportamiento consistente
                        const parsedAmount = normalizeTransaction({ amount: transaction.importe }).amount;
                        const amount = parsedAmount || 0;
                        
                        // Determinar si es ingreso o gasto basado en el signo del monto
                        const isIncome = amount > 0;
                        
                        // Determinar categoría basada en la descripción
                        let category = 'otros';
                        const descLower = (transaction.descripcion || '').toLowerCase();
                        
                        for (const [key, value] of Object.entries(categoryMap)) {
                            if (descLower.includes(key)) {
                                category = value;
                                break;
                            }
                        }
                        
                        // Formatear fecha (asumiendo formato DD/MM/AAAA)
                        let formattedDate = new Date().toISOString().split('T')[0];
                        if (transaction.fecha) {
                            // Manejar diferentes formatos de fecha
                            const dateParts = transaction.fecha.split(/[\/\-.]/);
                            if (dateParts.length === 3) {
                                let day, month, year;
                                
                                // Intentar determinar el formato de fecha
                                if (dateParts[0].length === 4) {
                                    // Formato YYYY/MM/DD
                                    [year, month, day] = dateParts;
                                } else {
                                    // Asumir formato DD/MM/YYYY
                                    [day, month, year] = dateParts;
                                }
                                
                                // Asegurar que el año tenga 4 dígitos
                                if (year.length === 2) {
                                    year = '20' + year;
                                }
                                
                                formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            }
                        }
                        
                        const transactionObj = {
                            id: `mp-${Date.now()}-${i}`,
                            date: formattedDate,
                            description: (transaction.descripcion || '').trim(),
                            amount: Math.abs(amount),
                            type: isIncome ? 'ingreso' : 'gasto',
                            category: category,
                            module: 'general',
                            imported: true,
                            source: 'mercadopago',
                            originalData: { ...transaction } // Guardar datos originales para referencia
                        };
                        
                        // Solo agregar si el monto es mayor a 0
                        if (transactionObj.amount > 0) {
                            transactions.push(transactionObj);
                            
                            // Mostrar las primeras 5 transacciones en consola
                            if (transactions.length <= 5) {
                                console.log('Transacción procesada:', transactionObj);
                            }
                        }
                    } catch (lineError) {
                        console.error(`Error en la línea ${i+1}:`, lineError);
                        console.error('Contenido de la línea:', lines[i]);
                    }
                }
                
                console.log(`Total de transacciones procesadas: ${transactions.length}`);
                
                // Ordenar por fecha (más recientes primero)
                const validTransactions = transactions
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                
                resolve(validTransactions);
            } catch (error) {
                console.error('Error al analizar el archivo CSV:', error);
                reject(new Error('Formato de archivo CSV inválido: ' + error.message));
            }
        };
        reader.onerror = () => {
            console.error('Error al leer el archivo');
            reject(new Error('Error al leer el archivo'));
        };
        reader.readAsText(file, 'UTF-8');
    });
}

function showImportPreview(transactions) {
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    // Crear contenido del modal
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 25px;
        border-radius: 12px;
        width: 100%;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;
    
    // Título
    const title = document.createElement('h3');
    title.textContent = `Vista previa de importación (${transactions.length} transacciones)`;
    title.style.marginTop = '0';
    title.style.color = '#2D3748';
    modalContent.appendChild(title);
    
    // Tabla de vista previa
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '15px';
    table.style.fontSize = '14px';
    
    // Encabezados de la tabla
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#F7FAFC';
    
    ['Fecha', 'Descripción', 'Monto', 'Tipo', 'Categoría'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.padding = '10px 12px';
        th.style.borderBottom = '1px solid #E2E8F0';
        th.style.textAlign = 'left';
        th.style.fontWeight = '600';
        th.style.color = '#4A5568';
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Filas de la tabla
    const tbody = document.createElement('tbody');
    const previewCount = Math.min(transactions.length, 10);
    
    for (let i = 0; i < previewCount; i++) {
        const t = transactions[i];
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #EDF2F7';
        
        if (i % 2 === 0) {
            tr.style.backgroundColor = '#F8FAFC';
        }
        
        const dateCell = document.createElement('td');
        dateCell.textContent = t.date;
        dateCell.style.padding = '10px 12px';
        dateCell.style.color = '#4A5568';
        tr.appendChild(dateCell);
        
        const descCell = document.createElement('td');
        descCell.textContent = t.description;
        descCell.style.padding = '10px 12px';
        descCell.style.color = '#2D3748';
        tr.appendChild(descCell);
        
        const amountCell = document.createElement('td');
        amountCell.textContent = formatCurrency(t.amount);
        amountCell.style.padding = '10px 12px';
        amountCell.style.fontWeight = '500';
        amountCell.style.color = t.type === 'ingreso' ? '#10B981' : '#EF4444';
        tr.appendChild(amountCell);
        
        const typeCell = document.createElement('td');
        typeCell.textContent = t.type === 'ingreso' ? 'Ingreso' : 'Gasto';
        typeCell.style.padding = '10px 12px';
        typeCell.style.color = t.type === 'ingreso' ? '#10B981' : '#EF4444';
        typeCell.style.fontWeight = '500';
        tr.appendChild(typeCell);
        
        const catCell = document.createElement('td');
        catCell.textContent = t.category.charAt(0).toUpperCase() + t.category.slice(1);
        catCell.style.padding = '10px 12px';
        catCell.style.color = '#4A5568';
        tr.appendChild(catCell);
        
        tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
    modalContent.appendChild(table);
    
    // Mensaje de transacciones adicionales
    if (transactions.length > 10) {
        const moreInfo = document.createElement('p');
        moreInfo.textContent = `... y ${transactions.length - 10} transacciones más`;
        moreInfo.style.textAlign = 'center';
        moreInfo.style.margin = '10px 0';
        moreInfo.style.color = '#718096';
        moreInfo.style.fontSize = '0.9em';
        modalContent.appendChild(moreInfo);
    }
    
    // Resumen
    const summary = document.createElement('div');
    summary.style.margin = '15px 0';
    summary.style.padding = '12px';
    summary.style.backgroundColor = '#F0FDF4';
    summary.style.borderRadius = '6px';
    summary.style.borderLeft = '4px solid #10B981';
    
    const totalIncome = transactions
        .filter(t => t.type === 'ingreso')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const totalExpenses = transactions
        .filter(t => t.type === 'gasto')
        .reduce((sum, t) => sum + t.amount, 0);
    
    summary.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #4B5563;">Total Ingresos:</span>
            <span style="color: #10B981; font-weight: 600;">${formatCurrency(totalIncome)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #4B5563;">Total Gastos:</span>
            <span style="color: #EF4444; font-weight: 600;">${formatCurrency(totalExpenses)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #D1FAE5;">
            <span style="color: #4B5563; font-weight: 600;">Saldo Neto:</span>
            <span style="color: ${totalIncome >= totalExpenses ? '#10B981' : '#EF4444'}; font-weight: 700;">
                ${formatCurrency(totalIncome - totalExpenses)}
            </span>
        </div>
    `;
    
    modalContent.appendChild(summary);
    
    // Botones
    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.justifyContent = 'flex-end';
    buttons.style.gap = '10px';
    buttons.style.marginTop = '20px';
    buttons.style.paddingTop = '15px';
    buttons.style.borderTop = '1px solid #E2E8F0';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.borderRadius = '6px';
    cancelBtn.style.border = '1px solid #E2E8F0';
    cancelBtn.style.background = 'white';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.transition = 'all 0.2s';
    cancelBtn.onmouseover = () => cancelBtn.style.backgroundColor = '#F8FAFC';
    cancelBtn.onmouseout = () => cancelBtn.style.backgroundColor = 'white';
    cancelBtn.onclick = () => document.body.removeChild(modal);
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirmar Importación';
    confirmBtn.className = 'btn-primary';
    confirmBtn.style.padding = '8px 20px';
    confirmBtn.style.borderRadius = '6px';
    confirmBtn.style.border = 'none';
    confirmBtn.style.background = '#4F46E5';
    confirmBtn.style.color = 'white';
    confirmBtn.style.fontWeight = '600';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.style.transition = 'all 0.2s';
    confirmBtn.onmouseover = () => confirmBtn.style.backgroundColor = '#4338CA';
    confirmBtn.onmouseout = () => confirmBtn.style.backgroundColor = '#4F46E5';
    
    confirmBtn.onclick = async () => {
        try {
            // Mostrar indicador de carga
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner">⏳</span> Importando...';
            
            await saveImportedTransactions(transactions);
            updateDashboard();
            displayTransactions();
            
            // Cerrar el modal después de un breve retraso para mostrar el mensaje
            const successMsg = document.createElement('div');
            successMsg.textContent = `¡${transactions.length} transacciones importadas con éxito!`;
            successMsg.style.color = '#10B981';
            successMsg.style.marginTop = '15px';
            successMsg.style.textAlign = 'center';
            successMsg.style.fontWeight = '600';
            modalContent.appendChild(successMsg);
            
            // Ocultar botones
            buttons.style.display = 'none';
            
            // Cerrar automáticamente después de 2 segundos
            setTimeout(() => {
                document.body.removeChild(modal);
                showNotification(`Se importaron ${transactions.length} transacciones correctamente`);
            }, 2000);
            
        } catch (error) {
            console.error('Error al guardar transacciones:', error);
            showNotification('Error al importar transacciones', 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Reintentar Importación';
        }
    };
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);
    modalContent.appendChild(buttons);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Cerrar al hacer clic fuera del contenido
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

async function saveImportedTransactions(transactions) {
    try {
        // Agrupar transacciones por mes
        const transactionsByMonth = {};
        
        transactions.forEach(transaction => {
            // Obtener el mes de la transacción (formato: YYYY-MM)
            const transactionDate = new Date(transaction.date);
            const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
            
            // Inicializar el array del mes si no existe
            if (!transactionsByMonth[transactionMonth]) {
                transactionsByMonth[transactionMonth] = [];
            }
            
            // Agregar la transacción al mes correspondiente
            transactionsByMonth[transactionMonth].push(transaction);
        });
        
        // Guardar transacciones por mes
        // Agregar transacciones al array global AppState.transactions evitando duplicados
        const existingIdsGlobal = new Set(AppState.transactions.map(t => t.id));
        let addedCount = 0;
        for (const monthTransactions of Object.values(transactionsByMonth)) {
            const newTransactions = monthTransactions.filter(t => !existingIdsGlobal.has(t.id));
            if (newTransactions.length > 0) {
                // Normalizar cada transacción importada antes de agregar
                const normalized = newTransactions.map(nt => normalizeTransaction(nt));
                AppState.transactions.push(...normalized);
                normalized.forEach(nt => existingIdsGlobal.add(nt.id));
                addedCount += normalized.length;
                console.log(`Guardando ${normalized.length} transacciones importadas`);
            }
        }
        console.log(`Total de transacciones añadidas: ${addedCount}`);
        
        // Guardar en localStorage
        saveData();
        
        // Si usas Firebase
        if (window.db) {
            try {
                const { writeBatch, collection, doc, serverTimestamp, setDoc } = await import('https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js');
                let batch = writeBatch(db);
                const transactionsRef = collection(db, 'transactions');
                
                // Contador para el lote actual
                let batchCount = 0;
                const BATCH_LIMIT = 500;
                
                // Procesar todas las transacciones de todos los meses
                for (const monthTransactions of Object.values(transactionsByMonth)) {
                    for (const transaction of monthTransactions) {
                        const docRef = doc(transactionsRef, transaction.id);
                        batch.set(docRef, {
                            ...transaction,
                            userId: AppState.user?.uid || 'anonymous',
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });

                        batchCount++;

                        // Si alcanzamos el límite del lote, hacemos commit y creamos un nuevo lote
                        if (batchCount >= BATCH_LIMIT) {
                            await batch.commit();
                            // crear un nuevo lote (batch) usando let (corregido arriba)
                            batch = writeBatch(db);
                            batchCount = 0;
                        }
                    }
                }
                
                // Hacer commit del último lote si hay transacciones pendientes
                if (batchCount > 0) {
                    await batch.commit();
                }
                
                console.log('Transacciones guardadas en Firebase');
            } catch (error) {
                console.error('Error al guardar en Firebase:', error);
                // No lanzamos el error para no interrumpir el flujo
            }
        }
        
        // Actualizar la interfaz
        updateDashboard();
        displayTransactions();
        
        return transactions.length;
    } catch (error) {
        console.error('Error en saveImportedTransactions:', error);
        throw error;
    }
}
