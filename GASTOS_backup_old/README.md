# 💰 Control de Gastos Familiar

Aplicación web moderna para controlar gastos, ingresos y ventas familiares con sincronización en tiempo real vía Firebase.

## ✨ Características

- 📱 **Responsive**: Funciona perfectamente en celular y computadora
- ☁️ **Sincronización en tiempo real**: Los datos se comparten entre todos los dispositivos familiares vía Firebase
- � **Autenticación segura**: Login con Google para proteger tus datos
- 🎨 **Diseño Moderno**: Interfaz limpia y fácil de usar
- 📊 **Estadísticas**: Gráficos y resúmenes mensuales automáticos
- 💾 **Backup simple**: Exporta tus datos a Excel, CSV o JSON con un clic

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
- Sistema de backup a Excel, CSV y JSON

## 📄 Archivos

- `index.html` - Estructura de la aplicación
- `styles.css` - Estilos y diseño responsive
- `app.js` - Lógica de la aplicación
- `firebase-config.js` - Configuración de Firebase
- `manifest.json` - Configuración PWA
- `sw.js` - Service Worker

## 💾 Sistema de Backup

La app incluye un sistema de backup simple y confiable:

1. **📊 Excel (.xls)**: Descarga todas tus transacciones organizadas por mes con resúmenes automáticos
2. **📄 CSV**: Exporta el mes actual en formato compatible con cualquier hoja de cálculo
3. **💾 JSON**: Backup completo incluyendo módulos (para restauración futura)

**Recomendación**: Descarga el backup de Excel al final de cada mes para tener un respaldo local.

## 🎯 Tips de Uso

1. **Sé consistente**: Registra tus gastos diariamente
2. **Usa descripciones**: Te ayudará a recordar en qué gastaste
3. **Revisa el dashboard**: Mira tus estadísticas semanalmente
4. **Configura bien los módulos**: Al inicio del mes carga los saldos correctos
5. **Haz respaldos mensuales**: Ve a la pestaña Backup y descarga el Excel

## 🐛 Solución de Problemas

**Los datos no se sincronizan:**
- Verifica que hayas iniciado sesión con Google
- Asegúrate de tener conexión a internet
- Revisa que tu email esté autorizado en las reglas de Firebase

**La app no funciona offline:**
- Abre la app al menos una vez con internet
- Verifica que el Service Worker esté registrado

**Quiero borrar todo:**
- Usa la función "Reiniciar Mes Actual" en la pestaña Módulos
- O elimina las transacciones desde Firebase Console

## 📞 Soporte

Si tienes problemas o sugerencias, revisa el código fuente o contacta al desarrollador.

---

**Hecho con ❤️ para llevar mejor control de las finanzas familiares**

