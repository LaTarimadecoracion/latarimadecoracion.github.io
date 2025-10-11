# Editor Principal - LA TARIMA

## 📝 Descripción

Editor visual para gestionar la configuración de la página principal del sitio web LA TARIMA. Permite editar de forma intuitiva todos los elementos principales de la página sin necesidad de tocar código.

## 🎯 Funcionalidades

### 🏠 **Información Básica del Sitio**
- Nombre del sitio
- Subtítulo

### 🔍 **SEO (Meta Tags)**
- Título SEO para motores de búsqueda
- Descripción meta
- Palabras clave

### 📱 **Enlaces de Redes Sociales**
- WhatsApp
- TikTok
- Instagram 
- Facebook
- YouTube

### 🎯 **Iconos Flotantes**
- Múltiples iconos apilados verticalmente
- Texto del tooltip personalizable
- URL de destino (interna o externa)
- Imagen del icono personalizable
- Posición/orden configurable
- ID único para cada icono

### 🧭 **Botones de Navegación**
- Agregar/eliminar botones
- Configurar título, URL, ID e icono
- Reordenar elementos

### 📋 **Dropdown de Barandas**
- Título del dropdown
- Items del menú desplegable
- Enlaces y IDs personalizables

### 🌐 **Sección de Redes Sociales**
- Título de la sección
- Enlaces con colores personalizables
- Texto de visualización personalizable

## 🚀 **Cómo usar el Editor**

### 1. **Acceder al Editor**
```
https://tu-dominio.com/edit/
```

### 2. **Editar Contenido**
- Los campos se actualizan automáticamente
- Los cambios se reflejan en la vista previa JSON
- Usa los botones para agregar/eliminar elementos

### 3. **Guardar Cambios**
1. Haz clic en "💾 Guardar Cambios"
2. Se descargará el archivo `main-data.json`
3. Reemplaza el archivo en la carpeta `edit/` de tu servidor

### 4. **Vista Previa**
- El JSON se actualiza en tiempo real
- Puedes ver la estructura completa de datos
- Verifica que todo esté correcto antes de guardar

## 📁 **Estructura de Archivos**

```
edit/
├── index.html          # Editor principal
├── main-data.json      # Archivo de configuración
└── README.md          # Esta documentación
```

## 🔧 **Configuración de Elementos**

### **Botones de Navegación**
- **Título**: Texto que aparece en el botón
- **URL**: Página de destino
- **ID**: Identificador único para CSS/JS
- **Icono**: URL de la imagen del icono

### **Items de Barandas**
- **Título**: Nombre del tipo de baranda
- **URL**: Página específica del producto  
- **ID**: Identificador único

### **Enlaces Sociales**
- **Nombre**: Nombre de la red social
- **URL**: Enlace completo
- **Texto**: Texto a mostrar (ej: handle, teléfono)
- **Color**: Color hex para el icono

## 🎨 **Personalización**

### **Colores**
Los enlaces sociales tienen colores personalizables usando selector de color.

### **Iconos**
- Usar URLs de CDN para iconos externos
- Rutas relativas para iconos locales
- Formatos soportados: PNG, JPG, SVG

### **URLs**
- URLs externas: `https://ejemplo.com`
- URLs internas: `pagina.html`
- Rutas de carpetas: `carpeta/pagina.html`

## ⚠️ **Consideraciones Importantes**

1. **Respaldo**: Siempre haz una copia de seguridad del archivo `main-data.json` antes de hacer cambios
2. **Validación**: Verifica que las URLs sean correctas
3. **Imágenes**: Asegúrate de que las rutas de imágenes existan
4. **IDs**: Los IDs deben ser únicos y sin espacios

## 🔄 **Flujo de Trabajo Recomendado**

1. **Editar** → Hacer cambios en el editor
2. **Previsualizar** → Revisar el JSON generado
3. **Guardar** → Descargar el archivo actualizado
4. **Subir** → Reemplazar el archivo en el servidor
5. **Probar** → Verificar que los cambios se vean correctamente

## 🆘 **Solución de Problemas**

### **El editor no carga los datos**
- Verifica que el archivo `main-data.json` exista
- Revisa la consola del navegador para errores

### **Los cambios no se guardan**
- Asegúrate de hacer clic en "Guardar Cambios"
- Verifica que el archivo descargado se suba al servidor

### **La página principal no refleja los cambios**
- Confirma que el archivo `main-data.json` se actualizó en el servidor
- Limpia la caché del navegador

## 📞 **Soporte**

Para problemas técnicos o preguntas sobre el editor, contacta al desarrollador del sitio web.

---

*Última actualización: Octubre 2025*