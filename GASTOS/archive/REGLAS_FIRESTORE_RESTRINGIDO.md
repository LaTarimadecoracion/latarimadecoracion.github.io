# 🔐 Reglas de Firestore - Acceso RESTRINGIDO por emails autorizados

## IMPORTANTE: Copia y pega estas reglas en Firebase Console

1. Ve a: https://console.firebase.google.com/project/gastos-84a95/firestore/rules
2. Reemplaza TODO el contenido con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Lista de emails autorizados
    function isAuthorized() {
      return request.auth != null && request.auth.token.email in [
        'tu-email@gmail.com',           // Reemplaza con tu email
        'email-esposa@gmail.com',       // Reemplaza con el email de tu esposa
        'otro-email@gmail.com'          // Agrega más emails según necesites
      ];
    }
    
    // Colección compartida de la familia
    // Solo usuarios autorizados pueden leer y escribir
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

3. **IMPORTANTE**: Reemplaza los emails de ejemplo con tus emails reales
4. Click en "Publicar" o "Publish"

## ✅ ¿Qué hace esto?

- ✅ Solo los emails en la lista pueden acceder
- ✅ Todos los autorizados ven y comparten LOS MISMOS datos
- ✅ Los cambios se sincronizan en tiempo real
- ❌ Cualquier otro email será RECHAZADO (aunque tenga el link)

## 🔒 Seguridad Mejorada:

- Solo las personas que agregues a la lista tendrán acceso
- Puedes agregar o quitar emails editando las reglas
- Los usuarios no autorizados verán un mensaje de error al intentar guardar

## 📝 Para agregar más emails:

Simplemente agrega más líneas en el array:
```javascript
'nuevo-email@gmail.com',
'otro-email@hotmail.com',
'familiar@yahoo.com'
```

**Recuerda poner coma (,) después de cada email EXCEPTO el último**

## 🎯 Ejemplo con emails reales:

```javascript
function isAuthorized() {
  return request.auth != null && request.auth.token.email in [
    'juan.perez@gmail.com',
    'maria.gomez@gmail.com'
  ];
}
```
