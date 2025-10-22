# 💰 Control de Gastos Familiar

Aplicación web moderna para controlar gastos, ingresos y ventas familiares.

## ✨ Características

- 📱 **Responsive**: Funciona perfectamente en celular y computadora
- 💾 **Sin Internet**: Los datos se guardan localmente en tu dispositivo
- 🔒 **Privado**: Tus datos nunca salen de tu dispositivo
- 🎨 **Diseño Moderno**: Interfaz limpia y fácil de usar
- 📊 **Estadísticas**: Gráficos y resúmenes mensuales automáticos

##  Tipos de Transacciones

- **Gastos**: Registra todos tus gastos por categoría
- **Ingresos**: Anota tus ingresos (salarios, extras, etc.)
- **Ventas**: Lleva control de tus ventas

## 🗂️ Categorías Disponibles

- 🍔 Comida
- 🚗 Transporte
- 💡 Servicios
- 🏥 Salud
- 🎮 Entretenimiento
- 🛒 Compras
- 📚 Educación
- 📦 Otros

## 🚀 Cómo usar

### 1️⃣ Configurar Saldos Iniciales
Ve a la pestaña **Módulos** y carga el saldo inicial de cada módulo al comenzar el mes.

### 2️⃣ Agregar Transacciones Rápido ⚡
**¡La forma más simple!** En el **Dashboard** encontrarás un formulario rápido al inicio:
- Escribe el monto
- Selecciona tipo (Gasto/Ingreso/Venta)
- Elige la categoría
- Opcionalmente agrega una descripción
- ¡Dale a Agregar y listo! El formulario se limpia automáticamente para que agregues otra

### 3️⃣ Ver Dashboard
En la pestaña **Dashboard** verás:
- Formulario de agregar rápido
- Saldo total y por módulo
- Últimas transacciones
- Resumen mensual (ingresos, gastos, ventas)
- Gráfico de gastos por categoría

### 4️⃣ Historial Completo
En la pestaña **Transacciones** puedes:
- Ver todas las transacciones del mes
- Filtrar por tipo (Gastos/Ingresos/Ventas)
- Eliminar transacciones
- Agregar transacciones con fecha personalizada (botón "Detallada")

## 📱 Instalar como App

### En Android:
1. Abre el sitio en Chrome
2. Toca el menú (3 puntos)
3. Selecciona "Agregar a pantalla de inicio"

### En iPhone/iPad:
1. Abre el sitio en Safari
2. Toca el botón compartir
3. Selecciona "Agregar a pantalla de inicio"

### En Computadora:
1. Abre el sitio en Chrome/Edge
2. Busca el ícono de instalación en la barra de direcciones
3. Haz clic en "Instalar"

## 🔄 Reiniciar Mes

Al comenzar un mes nuevo:
1. Ve a **Módulos**
2. Actualiza los saldos iniciales
3. Si quieres, puedes usar el botón "Reiniciar Mes Actual" para limpiar las transacciones del mes

## 💾 Respaldo de Datos

Los datos se guardan automáticamente en tu navegador. Para hacer un respaldo:

1. Abre las herramientas de desarrollador (F12)
2. Ve a "Application" > "Local Storage"
3. Busca "gastosApp"
4. Copia el contenido

Para restaurar, pega el contenido de vuelta en Local Storage.

## 🛠️ Tecnologías

- HTML5
- CSS3 (diseño moderno con variables CSS)
- JavaScript (Vanilla JS, sin dependencias)
- LocalStorage para persistencia
- PWA (Progressive Web App)
- Service Worker para funcionamiento offline

## 📄 Archivos

- `index.html` - Estructura de la aplicación
- `styles.css` - Estilos y diseño responsive
- `app.js` - Lógica de la aplicación
- `manifest.json` - Configuración PWA
- `sw.js` - Service Worker

## 🎯 Tips de Uso

1. **Sé consistente**: Registra tus gastos diariamente
2. **Usa descripciones**: Te ayudará a recordar en qué gastaste
3. **Revisa el dashboard**: Mira tus estadísticas semanalmente
4. **Configura bien los módulos**: Al inicio del mes carga los saldos correctos
5. **Haz respaldos**: Una vez al mes, exporta tus datos

## 🐛 Solución de Problemas

**Los datos no se guardan:**
- Verifica que no estés en modo incógnito
- Asegúrate de tener espacio en el dispositivo

**La app no funciona offline:**
- Abre la app al menos una vez con internet
- Verifica que el Service Worker esté registrado

**Quiero borrar todo:**
- Ve a Configuración del navegador > Borrar datos de sitio
- O usa la función "Reiniciar Mes Actual" en Módulos

## 📞 Soporte

Si tienes problemas o sugerencias, revisa el código fuente o contacta al desarrollador.

---

**Hecho con ❤️ para llevar mejor control de las finanzas familiares**
