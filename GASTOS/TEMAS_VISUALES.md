# 🎨 Guía de Temas Visuales

La aplicación de Control de Gastos incluye múltiples temas visuales con **cambio dinámico** mediante botones.

## 🎯 Cambio Rápido de Estilo

### 🎨 **Botón de Estilo Visual** (Nuevo)

En la esquina superior derecha del header encontrarás **dos botones**:

- **🎨** → Cambia entre **Minimalista** y **Clásico**
- **🌙/☀️** → Cambia entre **Claro** y **Oscuro**

**Ventajas:**
- ✅ Cambio instantáneo
- ✅ Sin editar código
- ✅ Se guarda tu preferencia automáticamente
- ✅ Funciona en todos los dispositivos

---

## 🎯 Temas Principales

### 1. **✨ Minimalista** (ACTIVO - Moderno)
**Archivo:** `styles.minimalist.css`

**Características:**
- 🎨 Paleta de grises modernos y elegantes
- 🔲 Diseño plano sin gradientes
- 💼 Perfecto para uso profesional/corporativo
- 🌙 Modo oscuro con grises profundos
- 🧘 Ambiente tranquilo y enfocado

**Colores principales:**
```
Fondo:     #FAFAFA (gris muy claro)
Superficie: #FFFFFF (blanco)
Texto:     #18181B (negro suave)
Acento:    #3F3F46 (gris oscuro)
Bordes:    #E4E4E7 (gris claro)
```

**Vista previa:**
- Header: Negro sólido (#18181B)
- Segmentos: Fondos grises con bordes sutiles
- Módulos: Tarjetas blancas con borde izquierdo gris
- Botones: Grises con hover sutil

---

### 2. **🌈 Clásico** (Original - Vibrante)
**Archivo:** `styles.classic.css`

**Características:**
- 🎨 Colores vivos y gradientes alegres
- ✨ Estilo original de la app
- 🌟 Interfaz llamativa y energética
- 🎪 Ideal para uso personal/familiar
- 🌈 Ambiente colorido y alegre

**Colores principales:**
```
Primary:   #4F46E5 (indigo vibrante)
Secondary: #10B981 (verde esmeralda)
Danger:    #EF4444 (rojo brillante)
Warning:   #F59E0B (naranja/amarillo)
```

**Vista previa:**
- Header: Gradiente indigo (#4F46E5 → #4338CA)
- Quick Add: Fondo verde suave con gradiente
- Segmentos: Gradientes coloridos (naranja, azul, rosa, cyan)
- Módulos: Gradientes suaves por tipo
- Barra info: Gris vibrante (#9ca3af)

---

## 🔄 Cómo Cambiar de Tema

### Método Simple:
1. Abre `index.html` en tu editor
2. Ve a la línea **16-17** (sección de hojas de estilo)
3. **Comenta** el tema actual y **descomenta** el que quieres usar

### Ejemplo - Cambiar a Clásico:

```html
<!-- ✨ MINIMALISTA (Moderno - Grises elegantes) -->
<!-- <link rel="stylesheet" href="styles.minimalist.css?v=1"> -->

<!-- 🌈 CLÁSICO (Original - Colores vibrantes) - ACTIVO -->
<link rel="stylesheet" href="styles.classic.css?v=1">
```

### Ejemplo - Volver a Minimalista:

```html
<!-- ✨ MINIMALISTA (Moderno - Grises elegantes) - ACTIVO -->
<link rel="stylesheet" href="styles.minimalist.css?v=1">

<!-- 🌈 CLÁSICO (Original - Colores vibrantes) -->
<!-- <link rel="stylesheet" href="styles.classic.css?v=1"> -->
```

---

## 📚 Otros Temas Disponibles
**Archivo:** `styles.modern.css`

**Características:**
- Azul brillante (#2563EB) y cyan (#06B6D4)
- Colores vivos y energéticos
- Ideal para pantallas brillantes
- Contraste alto

**Para activar:**
```html
<!-- En index.html, línea 16, cambia: -->
<link rel="stylesheet" href="styles.modern.css?v=1">
```

---

## 📚 Otros Temas Disponibles

### 3. **Moderno** (Azul Vibrante)
**Archivo:** `styles.corporate.css`

**Características:**
- Azul corporativo (#1f3b8a)
- Diseño sobrio y profesional
- Optimizado para móviles (420px)
- Espaciado compacto

**Para activar:**
```html
<!-- En index.html, línea 16, cambia: -->
<link rel="stylesheet" href="styles.corporate.css?v=1">
```

---

### 4. **Corporativo** (Compacto)
**Archivo:** `styles.css`

**Características:**
- Indigo/púrpura (#4F46E5)
- Gradientes suaves
- Diseño balanceado

---

## Cómo Cambiar de Tema

1. Abre `index.html`
2. Busca la línea 16 (aproximadamente)
3. Comenta/descomenta la hoja de estilo que quieras usar:

```html
<!-- OPCIÓN 1: Minimalista (actual) -->
<link rel="stylesheet" href="styles.minimalist.css?v=1">

<!-- OPCIÓN 2: Moderno -->
<!-- <link rel="stylesheet" href="styles.modern.css?v=1"> -->

<!-- OPCIÓN 3: Corporativo -->
<!-- <link rel="stylesheet" href="styles.corporate.css?v=1"> -->
```

---

## 🌙 Modo Oscuro

Todos los temas incluyen modo oscuro. **Activa/desactiva** con el botón 🌙 en el header.

### Comparación de modos oscuros:

**Minimalista Oscuro:**
```
Fondo:     #09090B (negro profundo)
Superficie: #18181B (gris muy oscuro)
Texto:     #FAFAFA (blanco suave)
Bordes:    #27272A (gris oscuro)
```

**Clásico Oscuro:**
```
Fondo:     #071026 (azul noche profundo)
Superficie: #0b1220 (azul noche)
Texto:     #e6eef8 (blanco azulado)
Bordes:    #132235 (azul oscuro)
```

---

## 🎨 Comparación Rápida

| Elemento | Minimalista | Clásico |
|----------|-------------|---------|
| **Header** | Negro sólido | Gradiente indigo |
| **Quick Add** | Gris elevado | Verde suave |
| **Segmentos** | Gris + bordes | Gradientes coloridos |
| **Módulos** | Blanco + borde gris | Gradientes por tipo |
| **Estilo** | Plano, limpio | Gradientes, vibrante |
| **Uso ideal** | Profesional/Work | Personal/Familia |

---

## ⚡ Recomendaciones

- **Para trabajo/oficina:** Usa **Minimalista**
- **Para uso personal:** Usa **Clásico**
- **Para pantallas brillantes:** Usa **Minimalista** (menos fatiga visual)
- **Para alegría/motivación:** Usa **Clásico** (colores estimulantes)

---

## 🛠️ Personalización Avanzada

Para crear tu propio tema:

1. Copia `styles.minimalist.css`
2. Renómbralo (ej: `styles.custom.css`)
3. Modifica las variables CSS en `:root`
4. Vincula el archivo en `index.html`

**Variables principales a modificar:**
```css
:root {
    --primary: #TU_COLOR;
    --bg: #TU_FONDO;
    --surface: #TU_TARJETAS;
    --text: #TU_TEXTO;
    --accent: #TU_ACENTO;
}
```

---

**Fecha:** 25 de octubre de 2025  
**Tema actual:** Minimalista Moderno (Grises)
