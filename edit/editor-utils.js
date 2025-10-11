/**
 * Utilidades del Editor Principal
 * Funciones adicionales para mejorar la experiencia del editor
 */

class EditorUtils {
    constructor() {
        this.previewWindow = null;
        this.isPreviewEnabled = false;
    }

    // Inicializar utilidades del editor
    init() {
        this.addPreviewButton();
        this.addExportButton();
        this.addValidationHelpers();
        this.setupKeyboardShortcuts();
    }

    // Agregar botón de vista previa en vivo
    addPreviewButton() {
        const actionsDiv = document.querySelector('.actions');
        if (!actionsDiv) return;

        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn-primary';
        previewBtn.innerHTML = '👁️ Vista Previa en Vivo';
        previewBtn.onclick = () => this.toggleLivePreview();
        
        actionsDiv.insertBefore(previewBtn, actionsDiv.firstChild);
    }

    // Agregar botón de exportar HTML
    addExportButton() {
        const actionsDiv = document.querySelector('.actions');
        if (!actionsDiv) return;

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn-primary';
        exportBtn.innerHTML = '📄 Exportar HTML';
        exportBtn.onclick = () => this.exportStaticHTML();
        
        actionsDiv.appendChild(exportBtn);
    }

    // Vista previa en vivo
    toggleLivePreview() {
        if (this.isPreviewEnabled) {
            this.closeLivePreview();
        } else {
            this.openLivePreview();
        }
    }

    openLivePreview() {
        const url = '../index.html?auto-update=true&preview=true';
        this.previewWindow = window.open(url, 'preview', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (this.previewWindow) {
            this.isPreviewEnabled = true;
            this.updatePreviewButton();
            
            // Monitorear si la ventana se cierra
            const checkClosed = setInterval(() => {
                if (this.previewWindow.closed) {
                    this.isPreviewEnabled = false;
                    this.updatePreviewButton();
                    clearInterval(checkClosed);
                }
            }, 1000);
        }
    }

    closeLivePreview() {
        if (this.previewWindow && !this.previewWindow.closed) {
            this.previewWindow.close();
        }
        this.isPreviewEnabled = false;
        this.updatePreviewButton();
    }

    updatePreviewButton() {
        const btn = document.querySelector('.actions button[onclick*="toggleLivePreview"]');
        if (btn) {
            btn.innerHTML = this.isPreviewEnabled ? '❌ Cerrar Vista Previa' : '👁️ Vista Previa en Vivo';
        }
    }

    // Exportar HTML estático
    async exportStaticHTML() {
        try {
            // Actualizar datos antes de exportar
            if (window.actualizarPreview) {
                window.actualizarPreview();
            }

            const generator = new StaticHTMLGenerator();
            const htmlContent = await generator.generateFullHTML();
            
            if (htmlContent) {
                // Crear blob con el HTML
                const blob = new Blob([htmlContent], { type: 'text/html' });
                
                // Crear enlace de descarga
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'index-generated.html';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                if (window.mostrarMensaje) {
                    window.mostrarMensaje('HTML exportado correctamente', 'success');
                }
            }
        } catch (error) {
            console.error('Error exportando HTML:', error);
            if (window.mostrarMensaje) {
                window.mostrarMensaje('Error al exportar HTML: ' + error.message, 'error');
            }
        }
    }

    // Agregar ayudas de validación
    addValidationHelpers() {
        // Validación de URLs
        const urlInputs = document.querySelectorAll('input[type="url"], input[placeholder*="http"]');
        urlInputs.forEach(input => {
            input.addEventListener('blur', this.validateURL);
        });

        // Validación de colores
        const colorInputs = document.querySelectorAll('input[type="color"]');
        colorInputs.forEach(input => {
            input.addEventListener('change', this.validateColor);
        });

        // Validación de IDs (sin espacios)
        const idInputs = document.querySelectorAll('input[placeholder*="ID"], input[placeholder*="id"]');
        idInputs.forEach(input => {
            input.addEventListener('input', this.validateID);
        });
    }

    validateURL(event) {
        const input = event.target;
        const value = input.value.trim();
        
        if (value && !value.startsWith('http') && !value.startsWith('/') && !value.includes('.html')) {
            input.style.borderColor = '#e74c3c';
            input.title = 'URL debe comenzar con http/https, / o terminar en .html';
        } else {
            input.style.borderColor = '#ddd';
            input.title = '';
        }
    }

    validateColor(event) {
        const input = event.target;
        const value = input.value;
        
        // Los inputs de tipo color siempre devuelven valores válidos
        console.log('Color seleccionado:', value);
    }

    validateID(event) {
        const input = event.target;
        let value = input.value;
        
        // Remover espacios y caracteres especiales
        const cleanValue = value.replace(/[^a-zA-Z0-9-_]/g, '');
        
        if (value !== cleanValue) {
            input.value = cleanValue;
            input.style.borderColor = '#f39c12';
            setTimeout(() => {
                input.style.borderColor = '#ddd';
            }, 1000);
        }
    }

    // Atajos de teclado
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S para guardar
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (window.guardarJSON) {
                    window.guardarJSON();
                }
            }
            
            // Ctrl+R para recargar datos
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                if (window.cargarJSON) {
                    window.cargarJSON();
                }
            }
            
            // Ctrl+P para vista previa
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.toggleLivePreview();
            }
            
            // Ctrl+E para exportar
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.exportStaticHTML();
            }
        });

        // Mostrar ayuda de atajos
        this.addKeyboardHelp();
    }

    addKeyboardHelp() {
        const helpDiv = document.createElement('div');
        helpDiv.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: #2c3e50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0.7;
            transition: opacity 0.3s;
        `;
        
        helpDiv.innerHTML = `
            <strong>Atajos:</strong><br>
            Ctrl+S: Guardar | Ctrl+R: Recargar<br>
            Ctrl+P: Vista previa | Ctrl+E: Exportar
        `;
        
        helpDiv.addEventListener('mouseenter', () => helpDiv.style.opacity = '1');
        helpDiv.addEventListener('mouseleave', () => helpDiv.style.opacity = '0.7');
        
        document.body.appendChild(helpDiv);
    }

    // Función para sincronizar cambios con vista previa en vivo
    syncWithPreview() {
        if (this.isPreviewEnabled && this.previewWindow && !this.previewWindow.closed) {
            try {
                // Enviar mensaje a la ventana de vista previa para que se actualice
                this.previewWindow.postMessage({
                    type: 'update-config',
                    data: window.datosMain
                }, '*');
            } catch (error) {
                console.warn('No se pudo sincronizar con vista previa:', error);
            }
        }
    }

    // Función para importar configuración desde archivo
    async importConfiguration() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No se seleccionó archivo'));
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        resolve(data);
                    } catch (error) {
                        reject(new Error('Archivo JSON inválido'));
                    }
                };
                reader.readAsText(file);
            };
            
            input.onclick = () => resolve(null); // Si cancela
            input.click();
        });
    }

    // Función para backup automático
    createAutoBackup() {
        const backupKey = 'latarama-editor-backup';
        const backupData = {
            timestamp: new Date().toISOString(),
            data: window.datosMain
        };
        
        try {
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            console.log('✅ Backup automático creado');
        } catch (error) {
            console.warn('⚠️ No se pudo crear backup automático:', error);
        }
    }

    // Función para restaurar desde backup
    restoreFromBackup() {
        const backupKey = 'latarama-editor-backup';
        
        try {
            const backup = localStorage.getItem(backupKey);
            if (backup) {
                const backupData = JSON.parse(backup);
                const backupDate = new Date(backupData.timestamp).toLocaleString();
                
                if (confirm(`¿Restaurar backup del ${backupDate}?`)) {
                    window.datosMain = backupData.data;
                    if (window.mostrarDatos) {
                        window.mostrarDatos();
                    }
                    if (window.actualizarPreview) {
                        window.actualizarPreview();
                    }
                    if (window.mostrarMensaje) {
                        window.mostrarMensaje('Backup restaurado correctamente', 'success');
                    }
                }
            } else {
                if (window.mostrarMensaje) {
                    window.mostrarMensaje('No hay backup disponible', 'error');
                }
            }
        } catch (error) {
            console.error('Error restaurando backup:', error);
            if (window.mostrarMensaje) {
                window.mostrarMensaje('Error restaurando backup: ' + error.message, 'error');
            }
        }
    }
}

// Función para configurar listener de mensajes de vista previa
function setupPreviewMessageListener() {
    window.addEventListener('message', (event) => {
        if (event.data.type === 'request-config-update') {
            // La vista previa solicita actualización
            if (window.editorUtils) {
                window.editorUtils.syncWithPreview();
            }
        }
    });
}

// Inicializar utilidades cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.editorUtils = new EditorUtils();
    window.editorUtils.init();
    setupPreviewMessageListener();
    
    // Crear backup automático cada 5 minutos
    setInterval(() => {
        if (window.editorUtils) {
            window.editorUtils.createAutoBackup();
        }
    }, 5 * 60 * 1000);
});

// Sobrescribir la función actualizarPreview para incluir sincronización
if (window.actualizarPreview) {
    const originalActualizarPreview = window.actualizarPreview;
    window.actualizarPreview = function() {
        originalActualizarPreview.call(this);
        if (window.editorUtils) {
            window.editorUtils.syncWithPreview();
        }
    };
}

// Exportar para uso global
window.EditorUtils = EditorUtils;