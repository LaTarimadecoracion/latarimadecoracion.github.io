# 🔧 INSTRUCCIONES PARA ACTUALIZAR GOOGLE SHEETS

## ⚠️ IMPORTANTE: Debes actualizar el script en Google Sheets

He mejorado el sistema de respaldo automático. Ahora necesitas actualizar el código en Google Apps Script.

---

## 📋 PASOS A SEGUIR:

### 1️⃣ Abre tu Google Sheets de Gastos

Ve a la hoja de cálculo que tienes conectada con la app.

### 2️⃣ Abre el Editor de Apps Script

- Menú: **Extensiones** → **Apps Script**

### 3️⃣ Reemplaza TODO el código

- Selecciona TODO el código que aparece (Ctrl+A)
- Bórralo
- Copia y pega el código del archivo: `GOOGLE_APPS_SCRIPT.js`

### 4️⃣ Guarda y Despliega

1. Click en el icono de **💾 Guardar** (o Ctrl+S)
2. Click en **Implementar** → **Administrar implementaciones**
3. Click en el **lápiz ✏️** de la implementación actual
4. En "Versión" selecciona **"Nueva versión"**
5. Click en **Implementar**
6. Copia la **URL web** (debe ser la misma que ya tienes)

---

## ✅ ¿QUÉ MEJORAS TIENE?

### 🆕 Hoja "RESPALDO_COMPLETO"

Se creará automáticamente una hoja con **TODAS las transacciones** de todos los meses en orden cronológico.

**Columnas:**
- Fecha
- Día
- Tipo (Gasto/Ingreso/Venta)
- Categoría
- Descripción
- Monto
- Mes
- ID

### 🗂️ Hojas por mes (como antes)

Se siguen creando hojas individuales por mes: `2025-10 Octubre`, `2025-11 Noviembre`, etc.

### 🔄 Sincronización perfecta

- ✅ Si agregas una transacción → Se agrega en ambas hojas
- ✅ Si borras una transacción → Se borra en ambas hojas
- ✅ Todo se actualiza automáticamente

---

## 🧪 CÓMO PROBAR QUE FUNCIONA:

1. Agrega una transacción en la web
2. Ve a tu Google Sheets
3. Deberías ver:
   - Una hoja con el nombre del mes (ej: "2025-10 Octubre")
   - Una hoja llamada "RESPALDO_COMPLETO" con todas las transacciones

4. Borra la transacción desde la web
5. Ve a Google Sheets
6. La transacción debe desaparecer de ambas hojas

---

## ❓ SI ALGO NO FUNCIONA:

1. Verifica que la URL del script en `app.js` sea la correcta
2. Abre la consola del navegador (F12) y busca mensajes de error
3. En Google Apps Script, ve a **Ejecuciones** para ver si hay errores

---

## 📊 RESULTADO FINAL:

Tu Google Sheets tendrá:

```
📁 RESPALDO_COMPLETO  ← TODAS las transacciones (respaldo principal)
📁 2025-10 Octubre    ← Transacciones y resumen de octubre
📁 2025-11 Noviembre  ← Transacciones y resumen de noviembre
📁 2025-12 Diciembre  ← Transacciones y resumen de diciembre
...y así sucesivamente
```

¡Listo! Ahora tienes un respaldo completo y automático. 🎉
