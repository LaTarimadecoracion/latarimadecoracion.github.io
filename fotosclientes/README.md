# Sistema SÚPER SIMPLE de Galerías de Clientes

## 🎉 ¡Solo 2 pasos para agregar una galería!

1. **Crear carpeta** con formato: `producto-cliente-nombre`
2. **Subir fotos** con nombres: `foto1.jpg`, `foto2.jpg`, etc.

¡Y ya está! No necesitas archivos JSON ni configuración adicional.

## 📸 Cómo funciona

El sistema detecta automáticamente:
- **Carpetas** dentro de `fotosclientes/`
- **Imágenes** dentro de cada carpeta
- **Información** del nombre de la carpeta
- **Convierte todo** en galerías profesionales

## 🗂️ Estructura Súper Simple

```
fotosclientes/
├── barandas-cliente-juan/
│   ├── foto (1).jpg
│   ├── foto (2).jpg
│   └── foto (3).jpg
├── estantes-cliente-maria/
│   ├── foto (1).jpg
│   └── foto (2).jpg
├── percheros-cliente-ana/
│   ├── foto (1).jpg
│   └── foto (2).jpg
└── organizadores-cliente-luis/
    ├── foto (1).jpg
    ├── foto (2).jpg
    └── foto (3).jpg
```

### Ejemplos existentes:
- `barandas-cliente-juan/` → **Juan** - Barandas para Cama
- `estantes-cliente-maria/` → **Maria** - Estantes de Madera  
- `deck-cliente-carlos/` → **Carlos** - Deck de Madera
- `percheros-cliente-ana/` → **Ana** - Percheros de Pared

## 📋 Nombres de Imágenes Válidos

### 🎯 **FORMATO PRINCIPAL (Recomendado):**
- `foto (1).jpg`, `foto (2).jpg`, `foto (3).jpg`, ...
- `foto (1).png`, `foto (2).png`, `foto (3).png`, ...
- `foto (1).jpeg`, `foto (2).jpeg`, `foto (3).jpeg`, ...

### 📷 **Formatos Alternativos:**
- `foto1.jpg`, `foto2.jpg`, `foto3.jpg`, ...
- `1.jpg`, `2.jpg`, `3.jpg`, `4.jpg`, `5.jpg`
- `imagen1.jpg`, `imagen2.jpg`, `imagen3.jpg`
- `photo1.jpg`, `photo2.jpg`, `photo3.jpg`

### ✨ Parseo Automático del Nombre:
- `barandas-cliente-juan` → **Juan**, Barandas para Cama
- `estantes-cliente-maria-gonzalez` → **Maria Gonzalez**, Estantes de Madera
- `deck-cliente-carlos` → **Carlos**, Deck de Madera

## 🎨 Características de la Galería

### ✨ Funcionalidades automáticas:
- **Slideshow interactivo** con navegación anterior/siguiente
- **Indicadores de posición** (dots) clicables
- **Contador de fotos** (1/3, 2/3, etc.)
- **Diseño responsive** que se adapta a móviles
- **Carga lazy** de imágenes
- **Overlays con información** del cliente

### 🎯 Navegación:
- **Botones**: Anterior ← → Siguiente
- **Dots**: Click directo a cualquier foto
- **Keyboard**: ← → para navegar (próximamente)
- **Swipe**: Navegación táctil en móviles (próximamente)

## 🚀 Para Agregar Nueva Galería (SÚPER FÁCIL)

### Ejemplo paso a paso:

```bash
# 1. Crear carpeta
mkdir "fotosclientes/organizadores-cliente-luis"

# 2. Subir fotos con el formato correcto
# - organizadores-cliente-luis/foto (1).jpg  ← ¡Nuevo formato!
# - organizadores-cliente-luis/foto (2).jpg
# - organizadores-cliente-luis/foto (3).jpg

# 3. Agregar a knownFolders en index.html (línea ~21)
const knownFolders = [
    'barandas-cliente-juan',
    'estantes-cliente-maria',
    'deck-cliente-carlos', 
    'percheros-cliente-ana',
    'organizadores-cliente-luis'  // ← Nuevo
];
```

### 🆕 **Ejemplo Real Creado:**
- **Carpeta**: `organizadores-cliente-luis/`
- **Fotos**: `foto (1).jpg`, `foto (2).jpg`, `foto (3).jpg`
- **Resultado**: Luis - Organizadores (3 fotos navegables)

### ¡Eso es TODO! 🎉

La galería aparecerá automáticamente con:
- **Nombre**: Luis (extraído del folder)
- **Producto**: Organizadores (detectado automáticamente)
- **Fecha**: Mes actual
- **Descripción**: Generada automáticamente
- **Fotos**: Todas las imágenes encontradas

## 🤖 Detección Automática de Productos

El sistema reconoce automáticamente:
- `barandas` → **Barandas para Cama**
- `estantes` → **Estantes de Madera**  
- `deck` → **Deck de Madera**
- `percheros` → **Percheros de Pared**
- `organizadores` → **Organizadores**
- Cualquier otro → Se capitaliza automáticamente

## 🔄 Sistema Automático

- **Detección automática** de carpetas
- **Carga dinámica** de datos JSON
- **Renderizado automático** de galerías
- **Fallback elegante** si no hay galerías
- **Error handling** para carpetas/archivos faltantes

## 📱 Responsive Design

- **Desktop**: Galerías en cards amplias
- **Tablet**: Adaptación de tamaños
- **Mobile**: Stack vertical optimizado
- **Touch**: Navegación táctil ready

¡El sistema está listo para escalar! Solo agrega carpetas y automáticamente aparecerán como galerías profesionales. 🎉