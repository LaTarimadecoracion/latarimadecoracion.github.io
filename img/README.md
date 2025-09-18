# Convención de Imágenes

Esta carpeta contiene los assets locales de cada página. La estructura es:

```
img/
  barandas_desmontables/
  barandas_fijas/
  barandas_sommier/
  barandas_ortopedicas/
  estantes/
  deck/
  fanales/
  organizadores/
  percheros/
  steps_cajones/
  infantiles/
```

## Tamaño recomendado
- Exportar cada imagen a **1120 × 630 px** (relación 16:9) para asegurar buena nitidez en pantallas retina (2x) donde se muestra aproximadamente a 560 × 315 px.
- Formato inicial: **JPG** calidad ~80%. (Futuro: añadir WebP/AVIF opcional con `picture` o `srcset`).

## Nombres de archivos
- Todo en minúsculas, sin espacios, sin guiones, sin tildes.
- Estructura: `[categoria][subcategoriaOpcional][modelo].jpg`
- Ejemplos:
  - `barandadesmontableclasica.jpg`
  - `estantesmontessori.jpg`
  - `deckcuadrado.jpg`
  - `organizador1.jpg`
  - `perchero3.jpg`
  - `stepscajones.jpg`
  - `podiopremiacion.jpg`

## Reglas por carpeta
- `barandas_desmontables/`: `barandadesmontableclasica.jpg`, `barandadesmontablemontessori.jpg`, `barandadesmontabletriple.jpg`
- `barandas_fijas/`: `barandafijaclasica.jpg`, `barandafijamontessori.jpg`, `barandafijatriple.jpg`
- `barandas_sommier/`: `barandasommierclasica.jpg`, `barandasommiertriple.jpg`
- `barandas_ortopedicas/`: `barandaortopedicaclasica.jpg`, `barandaortopedicamontessori.jpg`, `barandaortopedicamontessoriextra.jpg`, `barandaortopedicatriple.jpg`
- `estantes/`: `estantesmontessori.jpg`, `estanteslibrero.jpg`, `estanteshexagonales.jpg`, `estantestriangulares.jpg`, `estantescuadrados.jpg`, `mensulas.jpg`, `estantescortes.jpg`
- `deck/`: `deckcuadrado.jpg`, `deckrectangular.jpg`
- `fanales/`: `fanales.jpg`
- `organizadores/`: `organizador1.jpg` ... `organizador10.jpg`
- `percheros/`: `perchero1.jpg` ... `perchero10.jpg`
- `steps_cajones/`: `stepscajones.jpg`, `podiopremiacion.jpg`, `podiosindividuales.jpg`
- `infantiles/`: `infantil1.jpg` ... `infantil10.jpg`

## Atributos HTML estandarizados
Cada `<img>` debe incluir:
```html
<img src="img/estantes/estantesmontessori.jpg" alt="Estantes Montessori de madera" width="560" height="315" loading="lazy">
```
- `width` y `height`: ayudan a evitar CLS (saltos de layout).
- `loading="lazy"`: mejora rendimiento en móviles.

## Texto alternativo (alt)
- Describir brevemente el producto y material. Máx ~8 palabras útiles.
- Evitar repetir palabras irrelevantes ("foto", "imagen").
- Ejemplos:
  - `Deck cuadrado modular de madera`
  - `Ménsulas de madera para estantes`
  - `Podio de premiación de 3 módulos`

## Futuras mejoras sugeridas
1. Añadir variante WebP:
```html
<picture>
  <source srcset="img/estantes/estantesmontessori.webp" type="image/webp">
  <img src="img/estantes/estantesmontessori.jpg" alt="Estantes Montessori de madera" width="560" height="315" loading="lazy">
</picture>
```
2. Implementar `srcset` para dispositivos con mayor densidad de píxeles.
3. Automatizar compresión (ej: script Node o task externa).

## Checklist al agregar una nueva imagen
- [ ] Archivo en carpeta correcta
- [ ] Nombre sigue convención
- [ ] 1120×630 px (o misma relación 16:9)
- [ ] Peso razonable (< 180 KB ideal)
- [ ] `alt` descriptivo
- [ ] `width` y `height` presentes
- [ ] `loading="lazy"` aplicado

---
Cualquier duda futura: actualizar este README para mantener la convención viva.
