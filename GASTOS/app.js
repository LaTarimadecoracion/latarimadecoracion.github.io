// Estado de la aplicación
console.log('🚀 CARGANDO APP.JS - Inicio');

// Usuario actual
let currentUser = null;

const AppState = {
    currentMonth: new Date().toISOString().slice(0, 7),
    // Módulos ahora son por mes: { "2025-10": { efectivo: 1000, banco: 2000, ... }, "2025-11": { ... } }
    modulesByMonth: {},
    transactions: []
};

// ==========================================
// AUTENTICACIÓN
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
            alert('⚠️ Error al cargar datos. Verifica que tu email esté autorizado.');
        });
}

// Guardar datos en Firestore
function saveDataToFirebase() {
    if (!currentUser) {
        console.log('⚠️ No hay usuario, guardando en localStorage temporalmente');
        localStorage.setItem('gastosApp', JSON.stringify(AppState));
        return;
    }
    
    // Guardar en la colección compartida
    db.collection('familyData').doc('sharedAppState')
        .set({
            modulesByMonth: AppState.modulesByMonth,
            transactions: AppState.transactions,
            currentMonth: AppState.currentMonth,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: currentUser.email
        })
        .then(() => {
            console.log('💾 Datos compartidos guardados en Firebase');
            
            // Exportar resumen mensual a Google Sheets
            exportMonthDataToSheets(AppState.currentMonth);
        })
        .catch((error) => {
            console.error('❌ Error guardando datos:', error);
            alert('⚠️ Error al guardar. Verifica que tu email esté autorizado.');
        });
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
    ml_jona: { name: 'ML Jona', icon: '📱', color: '#F59E0B' },
    ml_ceci: { name: 'ML Ceci', icon: '📱', color: '#EC4899' }
};

// Categorías de transacciones
const CATEGORIES = {
    la_tarima: '🔨',
    comida: '🍔',
    transporte: '🚗',
    servicios: '💡',
    salud: '🏥',
    entretenimiento: '🎮',
    compras: '🛒',
    educacion: '📚',
    otros: '📦'
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('App iniciando...');
    
    // Siempre cargar el mes actual al iniciar
    AppState.currentMonth = new Date().toISOString().slice(0, 7);
    
    initializeUI();
    attachEventListeners();
    
    // Los datos se cargarán cuando el usuario se autentique
    console.log('App lista - esperando autenticación!');
});

// Funciones legacy mantenidas por compatibilidad (ahora usan Firebase)
function loadData() {
    // Ahora se carga desde Firebase en loadDataFromFirebase()
    console.log('⚠️ loadData() llamado - usando Firebase');
}

function saveData() {
    // Ahora se guarda en Firebase
    saveDataToFirebase();
}

// Inicializar UI
function initializeUI() {
    updateMonthDisplay();
    initializeDayInput();
}

// Inicializar input de día con el último guardado o día actual
function initializeDayInput() {
    const savedDay = localStorage.getItem('lastSelectedDay') || new Date().getDate();
    const [year, month] = AppState.currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate(); // month sin restar 1 porque Date(year, month, 0) da último día del mes anterior
    
    // Ajustar el max del input según los días del mes
    const dayInput = document.getElementById('quickDay');
    if (dayInput) {
        dayInput.max = daysInMonth;
        // Restaurar el último día seleccionado (o día actual)
        const dayToSet = Math.min(parseInt(savedDay), daysInMonth);
        dayInput.value = dayToSet;
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

    document.getElementById('filterType').addEventListener('change', displayTransactions);

    // Filtro de día en Dashboard
    const filterDayInput = document.getElementById('filterDay');
    const btnClearFilter = document.getElementById('btnClearFilter');
    
    if (filterDayInput) {
        filterDayInput.addEventListener('input', displayRecentTransactions);
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
}

// Limpiar filtro de día
function clearDayFilter() {
    const filterDay = document.getElementById('filterDay');
    if (filterDay) {
        filterDay.value = '';
        displayRecentTransactions();
    }
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
    const totals = calculateTotals();
    
    // Saldo inicial = suma de todos los módulos del mes actual
    const currentModules = getModulesForCurrentMonth();
    const initialBalance = Object.values(currentModules).reduce((sum, val) => sum + val, 0);
    const totalIncome = totals.income + totals.sales;
    // Saldo actual = saldo inicial + ingresos - gastos
    const currentBalance = initialBalance + totalIncome - totals.expense;
    
    // Update segmented balance display
    const segments = document.querySelectorAll('.segment-amount');
    if (segments.length === 4) {
        segments[0].textContent = formatCurrency(initialBalance); // SALDO INICIAL (módulos)
        segments[1].textContent = formatCurrency(currentBalance); // SALDO ACTUAL
        segments[2].textContent = formatCurrency(totals.expense); // GASTOS
        segments[3].textContent = formatCurrency(totalIncome); // INGRESOS (incluye ventas)
    }

    displayRecentTransactions();
    displayCategoryChart(totals.categoryExpenses);
}

// Calcular totales
function calculateTotals() {
    const currentMonthTransactions = AppState.transactions.filter(t => 
        t.date.startsWith(AppState.currentMonth)
    );

    const totals = {
        income: 0,
        expense: 0,
        sales: 0,
        categoryExpenses: {}
    };

    currentMonthTransactions.forEach(t => {
        if (t.type === 'ingreso') {
            totals.income += t.amount;
        } else if (t.type === 'gasto') {
            totals.expense += t.amount;
            totals.categoryExpenses[t.category] = (totals.categoryExpenses[t.category] || 0) + t.amount;
        } else if (t.type === 'venta') {
            totals.sales += t.amount;
        }
    });

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
    
    recentTransactions = recentTransactions.sort((a, b) => {
        // Ordenar por fecha ascendente (día 1 arriba, día 31 abajo)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
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
        const categoryIcon = CATEGORIES[transaction.category] || '📦';
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
                <button class="btn-delete" data-id="${transaction.id}" title="Eliminar">🗑️</button>
            </div>
        `;
        
        // Agregar event listener al botón de eliminar
        const deleteBtn = item.querySelector('.btn-delete');
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
    
    currentMonthTransactions.forEach(t => {
        if (t.type === 'ingreso' || t.type === 'venta') {
            ingresosActuales += t.amount;
        }
    });
    
    const ahorro = diferencia + ingresosActuales;
    
    // Actualizar la barra de información
    const totalInicialEl = document.getElementById('totalInicial');
    const totalMesAnteriorEl = document.getElementById('totalMesAnterior');
    const totalDiferenciaEl = document.getElementById('totalDiferencia');
    const totalAhorroEl = document.getElementById('totalAhorro');
    
    if (totalInicialEl) totalInicialEl.textContent = formatCurrency(totalInicial);
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
    const transaction = {
        id: Date.now().toString(),
        type: formData.get('type'),
        module: formData.get('module'),
        amount: parseFloat(formData.get('amount')),
        category: formData.get('category'),
        date: formData.get('date'),
        description: formData.get('description')
    };

    // Los módulos son solo saldos iniciales, no se modifican con transacciones
    // Las transacciones solo se registran para el cálculo del balance

    AppState.transactions.push(transaction);
    
    saveData();
    
    closeTransactionModal();
    updateDashboard();
    displayTransactions();
    
    showNotification('✅ Transacción guardada');
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
    
    const transaction = {
        id: Date.now().toString(),
        type: formData.get('type'),
        module: 'general',
        amount: parseFloat(formData.get('amount')),
        category: formData.get('category'),
        date: dateStr,
        description: formData.get('description') || ''
    };

    AppState.transactions.push(transaction);
    
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
    
    // Actualizar vistas
    updateDashboard();
    displayRecentTransactions();
    displayTransactions();
    
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
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
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
    const transactions = AppState.transactions.filter(t => t.date.startsWith(month));
    
    if (transactions.length === 0) {
        showNotification('⚠️ No hay transacciones en este mes', 'warning');
        return;
    }
    
    // Crear CSV
    let csv = 'Fecha,Tipo,Categoría,Módulo,Descripción,Monto\n';
    
    transactions.forEach(t => {
        csv += `${t.date},${t.type},${t.category || ''},${t.module || ''},${t.description || ''},${t.amount}\n`;
    });
    
    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gastos_${month}.csv`;
    link.click();
    
    updateLastExportTime();
    showNotification('✅ CSV descargado exitosamente', 'success');
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
    
    if (!confirm('⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos actuales en Firebase.\n\n¿Estás seguro de continuar?')) {
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            // Validar que tenga la estructura correcta
            if (!backup.transactions || !Array.isArray(backup.transactions)) {
                alert('❌ El archivo no tiene un formato válido');
                return;
            }
            
            // Restaurar datos en AppState
            AppState.transactions = backup.transactions || [];
            AppState.modulesByMonth = backup.modulesByMonth || {};
            
            // Guardar en Firebase
            saveDataToFirebase()
                .then(() => {
                    showNotification('✅ Backup restaurado exitosamente', 'success');
                    updateDashboard();
                    displayTransactions();
                    displayModulesCards();
                    console.log('✅ Restaurados:', AppState.transactions.length, 'transacciones');
                })
                .catch(error => {
                    console.error('❌ Error restaurando:', error);
                    alert('❌ Error al restaurar el backup: ' + error.message);
                });
            
        } catch (error) {
            console.error('❌ Error leyendo backup:', error);
            alert('❌ Error al leer el archivo JSON: ' + error.message);
        }
        
        // Limpiar input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Exportar funciones globales
window.deleteTransaction = deleteTransaction;
