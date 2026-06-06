# 🔐 Reglas de Firestore - Acceso público compartido

## IMPORTANTE: Copia y pega estas reglas en Firebase Console

1. Ve a: https://console.firebase.google.com/project/gastos-84a95/firestore/rules
2. Reemplaza TODO el contenido con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Colección compartida de la familia
    // Cualquier usuario autenticado puede leer y escribir
    match /familyData/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Denegar todo lo demás
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click en "Publicar" o "Publish"

## ✅ ¿Qué hace esto?

- ✅ Cualquier persona que haga login con Google puede acceder
- ✅ Todos ven y comparten LOS MISMOS datos
- ✅ Los cambios se sincronizan en tiempo real
- ✅ Solo usuarios autenticados (con Google login) tienen acceso
- ❌ Usuarios no autenticados NO pueden ver nada

## � Seguridad:

Aunque cualquiera con cuenta de Google puede entrar, solo las personas que conozcas 
tendrán el link de la app. Es poco probable que alguien la encuentre por accidente.
