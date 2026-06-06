# 🔥 Configuración de Firebase - Pasos Finales

## ✅ Paso 1: Activar Firestore Database

1. Ve a Firebase Console: https://console.firebase.google.com/project/gastos-84a95
2. En el menú lateral → **Build** → **Firestore Database**
3. Click en **"Create database"**
4. Selecciona modo: **"Start in test mode"** (por ahora)
5. Ubicación: **us-central1** o la más cercana
6. Click **"Enable"**

## ✅ Paso 2: Activar Authentication con Google

1. En el menú lateral → **Build** → **Authentication**
2. Click en **"Get started"**
3. En la pestaña **"Sign-in method"**
4. Click en **"Google"**
5. Activa el switch **"Enable"**
6. Selecciona tu email de soporte
7. Click **"Save"**

## ✅ Paso 3: Configurar reglas de seguridad de Firestore

1. Ve a **Firestore Database** → pestaña **"Rules"**
2. Reemplaza las reglas con esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden leer/escribir sus propios datos
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **"Publish"**

## 🎉 ¡Listo para probar!

Una vez completados estos pasos:
1. Abre la app en tu navegador local
2. Click en "Iniciar con Google"
3. Selecciona tu cuenta
4. ¡La app cargará con sincronización en tiempo real!

## 📱 Para compartir con tu esposa:

1. Ella también hará login con su cuenta de Google
2. Ambos verán los MISMOS datos en tiempo real
3. Los cambios de uno se reflejan instantáneamente en el otro

**NOTA:** Ambos deben usar cuentas de Google autorizadas.
