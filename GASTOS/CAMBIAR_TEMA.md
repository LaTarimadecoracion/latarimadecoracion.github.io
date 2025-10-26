# 🎨 Guía Rápida de Cambio de Tema

## 🆕 ¡NUEVO! Cambio Dinámico con Botón

Ahora puedes cambiar entre **Minimalista** y **Clásico** directamente desde la interfaz:

### 🎨 **Botón de Estilo** (en el header)

1. Busca el botón **🎨** en la esquina superior derecha (junto al 🌙)
2. Haz clic para alternar entre:
   - ✨ **Minimalista** → Grises modernos y limpios
   - 🌈 **Clásico** → Colores vibrantes con gradientes

**El cambio es instantáneo** y se guarda automáticamente en tu navegador.

---

## 📍 Método Manual (Opcional)

Si prefieres editar el código directamente:

### Ubicación: `index.html` - Línea 16

---

## ✨ Para usar **MINIMALISTA** (Moderno/Grises):

```html
<!-- ✨ MINIMALISTA (Moderno - Grises elegantes) - ACTIVO -->
<link rel="stylesheet" href="styles.minimalist.css?v=1">

<!-- 🌈 CLÁSICO (Original - Colores vibrantes) -->
<!-- <link rel="stylesheet" href="styles.classic.css?v=1"> -->
```

**Resultado:**
- ⚫ Header negro sólido
- ⬜ Fondos grises suaves
- 🔲 Sin gradientes
- 💼 Apariencia profesional
- 🧘 Minimalista y tranquilo

---

## 🌈 Para usar **CLÁSICO** (Original/Colorido):

```html
<!-- ✨ MINIMALISTA (Moderno - Grises elegantes) -->
<!-- <link rel="stylesheet" href="styles.minimalist.css?v=1"> -->

<!-- 🌈 CLÁSICO (Original - Colores vibrantes) - ACTIVO -->
<link rel="stylesheet" href="styles.classic.css?v=1">
```

**Resultado:**
- 🌅 Header con gradiente indigo
- 🌈 Gradientes coloridos
- ✨ Quick-add verde suave
- 🎨 Segmentos con colores
- 🎪 Apariencia alegre y vibrante

---

## 🔄 Pasos:

1. Abre `index.html`
2. Busca la línea 16 (sección de temas)
3. Comenta (`<!--  -->`) el tema que NO quieres
4. Descomenta (quita `<!--  -->`) el tema que SÍ quieres
5. Guarda el archivo
6. Recarga la página (F5 o Ctrl+R)

---

## 💡 Tip:
Puedes cambiar de tema **en cualquier momento** sin perder tus datos. Los datos se guardan en `localStorage` y son independientes del estilo visual.

---

## 📊 Comparación Visual Rápida:

```
MINIMALISTA                    CLÁSICO
═══════════════════           ═══════════════════
Header:                        Header:
  ⬛ Negro sólido                🟦 Gradiente indigo

Quick Add:                     Quick Add:
  ⬜ Gris claro                  🟩 Verde degradado

Segmentos Balance:             Segmentos Balance:
  ◻️ Grises c/bordes             🎨 Naranja/Azul/Rosa/Cyan

Módulos:                       Módulos:
  ⬜ Blancos + borde gris        🌈 Gradientes coloridos

Estética:                      Estética:
  💼 Profesional/Sobrio          🎪 Alegre/Vibrante
```

---

**Tema actual:** ✨ Minimalista (Moderno)  
**Fecha:** 25 de octubre de 2025
