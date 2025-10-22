# 🔐 Reglas de Firestore para acceso compartido

## IMPORTANTE: Copia y pega estas reglas en Firebase Console

1. Ve a: https://console.firebase.google.com/project/gastos-84a95/firestore/rules
2. Reemplaza TODO el contenido con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función para verificar emails autorizados
    function isAuthorized() {
      return request.auth != null && request.auth.token.email in [
        'TU_EMAIL_AQUI@gmail.com',           // REEMPLAZA con tu email
        'EMAIL_DE_TU_ESPOSA@gmail.com'       // REEMPLAZA con el email de tu esposa
      ];
    }
    
    // Colección compartida de la familia
    // Ambos usuarios autorizados pueden leer y escribir
    match /familyData/{document=**} {
      allow read, write: if isAuthorized();
    }
    
    // Denegar todo lo demás
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. **IMPORTANTE:** Reemplaza los emails en las líneas 9 y 10 con los emails reales
4. Click en "Publicar" o "Publish"

## ✅ Después de publicar las reglas:

Los datos se sincronizarán en tiempo real entre ambos dispositivos.
Cualquier cambio que haga uno, el otro lo verá instantáneamente.

## 📧 ¿Cuáles son los emails?

Dime los 2 emails para darte las reglas completas listas para copiar y pegar.
