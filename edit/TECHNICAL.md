# Documentación Técnica - Sistema de Editor Dinámico

## 🏗️ Arquitectura del Sistema

### Componentes Principales

#### 1. **Editor Principal** (`edit/index.html`)
- Interfaz visual para editar configuración
- Formularios dinámicos para cada sección
- Vista previa JSON en tiempo real
- Sistema de validación integrado

#### 2. **Gestor de Página Principal** (`js/main-page-manager.js`)
- Clase `MainPageManager`: Aplica configuración desde JSON
- Carga `edit/main-data.json` y modifica el DOM
- Actualiza SEO, enlaces sociales, navegación
- Solo afecta elementos editables, preserva estructura

#### 3. **Sistema de Auto-aplicación** (`js/auto-apply-system.js`)
- Clase `AutoApplySystem`: Monitorea cambios en JSON
- Aplicación automática de cambios (solo en desarrollo)
- Clase `StaticHTMLGenerator`: Genera HTML estático desde JSON
- Notificaciones visuales de actualizaciones

#### 4. **Utilidades del Editor** (`edit/editor-utils.js`)
- Clase `EditorUtils`: Funciones avanzadas del editor
- Vista previa en vivo en nueva ventana
- Exportación de HTML estático
- Atajos de teclado y validaciones
- Sistema de backup automático

## 📁 Estructura de Archivos

```
├── edit/
│   ├── index.html          # Editor principal
│   ├── main-data.json      # Configuración editable
│   ├── editor-utils.js     # Utilidades avanzadas
│   └── README.md          # Documentación usuario
├── js/
│   ├── main-page-manager.js    # Gestor dinámico
│   └── auto-apply-system.js    # Auto-aplicación
└── index.html             # Página principal (modificada)
```

## 🔄 Flujo de Datos

### Edición → Aplicación
1. **Usuario edita** en `edit/index.html`
2. **Cambios se reflejan** en vista previa JSON
3. **Usuario guarda** descargando `main-data.json`
4. **Archivo se sube** al servidor reemplazando el existente
5. **Sistema detecta cambios** y aplica automáticamente
6. **Página se actualiza** sin recargar

### Carga Inicial
1. **Página carga** `index.html`
2. **Script ejecuta** `MainPageManager.init()`
3. **Se carga** `edit/main-data.json`
4. **Se aplica configuración** al DOM existente
5. **Página funciona** con nueva configuración

## 🛠️ API del Sistema

### MainPageManager

```javascript
const manager = new MainPageManager();
await manager.init();

// Métodos principales:
manager.loadData()           // Carga JSON
manager.applyConfiguration() // Aplica al DOM
manager.updateSEO()         // Actualiza meta tags
manager.updateNavigation()  // Actualiza navegación
```

### AutoApplySystem

```javascript
const autoApply = new AutoApplySystem();
autoApply.init();

// Configuración:
autoApply.isEnabled         // Estado del sistema
autoApply.checkInterval     // Intervalo de verificación (ms)
```

### EditorUtils

```javascript
const utils = new EditorUtils();
utils.init();

// Funciones útiles:
utils.toggleLivePreview()   // Vista previa en vivo
utils.exportStaticHTML()    // Exportar HTML
utils.createAutoBackup()    // Backup automático
utils.restoreFromBackup()   // Restaurar backup
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```javascript
// En la URL del editor o página principal:
?auto-update=true    // Habilita auto-aplicación
?preview=true        // Modo vista previa
?debug=true         // Logs adicionales
```

### Personalización de Intervalos

```javascript
// Modificar en auto-apply-system.js:
this.checkInterval = 30000; // 30 segundos (por defecto)
```

### Backup Automático

```javascript
// Intervalo de backup (editor-utils.js):
setInterval(() => {
    window.editorUtils.createAutoBackup();
}, 5 * 60 * 1000); // 5 minutos
```

## 🎯 Elementos Editables

### Configuración Básica
- `siteName`: Nombre del sitio
- `subtitle`: Subtítulo del sitio
- `seo.title`: Título SEO
- `seo.description`: Descripción SEO
- `seo.keywords`: Palabras clave

### Enlaces Sociales
- `socialLinks.whatsapp`: WhatsApp
- `socialLinks.tiktok`: TikTok  
- `socialLinks.instagram`: Instagram
- `socialLinks.facebook`: Facebook
- `socialLinks.youtube`: YouTube

### Navegación
- `mainNavigation.barandas`: Dropdown de barandas
- `navigationButtons[]`: Botones principales
- `socialSection.links[]`: Enlaces sociales del final

### Iconos Flotantes
- `floatingIcons[].id`: ID único del icono
- `floatingIcons[].text`: Texto del tooltip
- `floatingIcons[].url`: URL de destino
- `floatingIcons[].image`: Ruta de imagen
- `floatingIcons[].position`: Orden de apilamiento

## 🔍 Debugging y Troubleshooting

### Logs del Sistema
```javascript
// Habilitar logs detallados:
localStorage.setItem('debug-editor', 'true');

// Ver estado actual:
console.log(window.datosMain);
console.log(window.MainPageManager);
```

### Verificar Carga de JSON
```javascript
// Verificar si el JSON se carga correctamente:
fetch('edit/main-data.json')
  .then(r => r.json())
  .then(data => console.log('JSON loaded:', data));
```

### Resetear Configuración
```javascript
// Limpiar localStorage y recargar:
localStorage.clear();
location.reload();
```

## 🚀 Despliegue y Producción

### Lista de Verificación
- [ ] Archivo `main-data.json` existe y es válido
- [ ] Scripts están correctamente enlazados
- [ ] Permisos de archivos son correctos
- [ ] URLs en configuración funcionan
- [ ] Imágenes existen en rutas especificadas

### Optimización
```javascript
// Deshabilitar auto-update en producción:
// Remover ?auto-update=true de URLs

// Minimizar archivos JavaScript para producción
// Comprimir JSON si es muy grande
```

### Backup de Producción
```bash
# Crear backup antes de cambios:
cp edit/main-data.json edit/main-data.json.backup

# Restaurar si es necesario:
cp edit/main-data.json.backup edit/main-data.json
```

## 🔐 Seguridad

### Validación de Datos
- URLs se validan automáticamente
- IDs se sanitizan (sin espacios/caracteres especiales)
- JSON se valida antes de aplicar

### Permisos de Archivos
```bash
# Configurar permisos correctos:
chmod 644 edit/main-data.json
chmod 644 js/*.js
```

### CORS y Fetch
- Sistema funciona con archivos locales y remotos
- Requiere servidor web para funcionar correctamente
- No funciona con `file://` protocol

## 📊 Monitoreo

### Métricas del Sistema
```javascript
// Verificar rendimiento:
console.time('config-load');
await manager.loadData();
console.timeEnd('config-load');

// Contar elementos actualizados:
console.log('Elementos procesados:', 
  document.querySelectorAll('[data-dynamic]').length);
```

### Errores Comunes
1. **JSON malformado**: Verificar sintaxis en editor
2. **Archivos no encontrados**: Verificar rutas relativas
3. **CORS errors**: Usar servidor web, no file://
4. **Cache issues**: Limpiar caché del navegador

## 🔄 Actualizaciones Futuras

### Funcionalidades Planeadas
- [ ] Editor drag & drop para reordenar elementos
- [ ] Temas de color predefinidos
- [ ] Importar/exportar configuraciones
- [ ] Vista previa de diferentes dispositivos
- [ ] Historial de cambios con rollback

### API Extensions
```javascript
// Framework para plugins futuros:
window.EditorPlugins = {
  register: (name, plugin) => { /* ... */ },
  execute: (name, ...args) => { /* ... */ }
};
```

---

**Versión:** 1.0.0  
**Fecha:** Octubre 2025  
**Autor:** Sistema AI LA TARIMA