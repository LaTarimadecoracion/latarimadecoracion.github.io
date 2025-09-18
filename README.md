# La Tarima - Sitio estático

Este proyecto es un sitio estático (HTML/CSS/JS) listo para publicar. Abajo tienes 3 formas fáciles de subirlo a un servidor.

## Opción A: GitHub Pages (gratis y simple)

Requisitos:
- Cuenta de GitHub
- Git instalado en tu PC

Pasos (solo una vez):
1. Crea un repositorio nuevo en GitHub, por ejemplo `la-tarima-web`.
2. En tu PC, abre una terminal en la carpeta del proyecto y ejecuta:
   ```powershell
   git init
   git add .
   git commit -m "Inicial"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/la-tarima-web.git
   git push -u origin main
   ```
3. En GitHub, ve a `Settings > Pages`, en **Build and deployment** elige **GitHub Actions**. El workflow ya está agregado en `.github/workflows/pages.yml`.
4. En la pestaña **Actions**, espera a que termine el job "Deploy to GitHub Pages". Al finalizar, verás la URL pública (algo como `https://tu_usuario.github.io/la-tarima-web/`).

Notas:
- El archivo `.nojekyll` evita conflictos con rutas/recursos.
- Cualquier push a `main` vuelve a desplegar automáticamente.

## Opción B: Netlify (muy fácil, con arrastrar y soltar)

1. Crea una cuenta en https://www.netlify.com/.
2. En el dashboard, elige **Add new site > Deploy manually** y arrastra la carpeta completa del proyecto (donde está `index.html`).
3. Netlify te dará una URL (puedes personalizarla) y cada vez que subas otra carpeta/zip, se actualiza.

También puedes conectar tu repositorio GitHub y tener deploy automático en cada push.

## Opción C: Servidor propio (FTP/cPanel)

1. En tu hosting, entra a cPanel o a tu cliente FTP (FileZilla, WinSCP).
2. Sube todos los archivos y carpetas al directorio público (por ejemplo, `public_html/` o una subcarpeta de tu dominio).
3. Asegúrate de subir también archivos ocultos como `.nojekyll` si tu hosting usa Jekyll, y mantener la estructura de carpetas.

## Consideraciones de la app
- Es un sitio 100% estático. No necesitas Node/servidor para funcionar.
- La página `links.html` tiene un overlay con contraseña (hash SHA-256 en `localStorage`). Esto no es seguridad real de servidor, solo evita accesos casuales. Para proteger de verdad, usa autenticación del lado del servidor o bloquea el acceso con HTTP Auth en tu hosting.
- Si alguna página depende de rutas relativas, respeta la estructura al subir.

## Actualizar el sitio
- Cambia archivos localmente y luego:
  - Si usas GitHub Pages: `git add .; git commit -m "Update"; git push` (en PowerShell puedes separar comandos con `;`).
  - Si usas Netlify: vuelve a arrastrar la carpeta o haz push si lo conectaste a GitHub.
  - Si usas FTP: vuelve a subir los archivos modificados.
