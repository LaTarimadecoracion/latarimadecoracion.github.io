# Imágenes para Secciones de Envíos

Esta carpeta contiene las imágenes que se muestran en cada sección de la página de envíos.

## Estructura recomendada:

- `metodos.jpg/png/webp` - Imagen para la sección "Métodos de Envío"
- `tiempos.jpg/png/webp` - Imagen para la sección "Tiempos de Entrega"  
- `costos.jpg/png/webp` - Imagen para la sección "Costos de Envío"
- `condiciones.jpg/png/webp` - Imagen para la sección "Condiciones"
- `viacargo.jpg/png/webp` - Imagen para la sección "Via Cargo - Sucursales"

## Especificaciones:

- **Formatos soportados:** JPG, JPEG, PNG, WebP, GIF, SVG
- **Tamaño recomendado:** 600x400px (máximo)
- **Peso:** Menor a 500KB por imagen
- **Estilo:** Horizontal preferentemente

## Cómo agregar imágenes:

1. Sube las imágenes a esta carpeta (`envios/img/`)
2. En el editor de envíos (`envios/editor.html`), agrega la ruta en el campo "Imagen"

### Opciones de configuración:

**Opción 1 - Con extensión específica:**
- `img/metodos.jpg` 
- `img/metodos.png`
- `img/metodos.webp`

**Opción 2 - Sin extensión (detección automática):**
- `img/metodos` → El sistema probará automáticamente: .jpg, .jpeg, .png, .webp, .gif, .svg

## Nota:

Si una imagen no existe o no se puede cargar, simplemente no se mostrará (no causará errores).