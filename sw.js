const CACHE_NAME = 'tarima-cache-v68-1794537000000';
// Solo pre-cacheamos el esqueleto mínimo en la instalación para NO competir
// con el ancho de banda del usuario cuando entra por primera vez a la web.
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.ico',
    './img/logo_provisional.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const asset of STATIC_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {}
            }
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 0. Ignorar peticiones que no sean GET, extensiones o dominios externos (Google Fonts, etc.)
    // Dejar que el navegador resuelva los dominios externos con su caché nativo de alta velocidad.
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http') || url.origin !== self.location.origin) {
        return;
    }

    // 1. No interceptar llamadas a la API local (/api/...)
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // 2. Imágenes del propio sitio (Cache First: instantáneas desde la segunda vista)
    if (event.request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(async () => {
                    const logoFallback = await caches.match('./img/logo_provisional.png');
                    return logoFallback || new Response('', { status: 404, statusText: 'Image Not Found' });
                });
            })
        );
        return;
    }

    // 3. Archivos dinámicos de datos/configuración e HTML principal -> Network First rápido (2s) con respaldo en caché
    const isDynamicDataOrHtml =
        event.request.mode === 'navigate' ||
        url.pathname.endsWith('/') ||
        url.pathname.endsWith('.html') ||
        url.pathname.includes('/data/') ||
        url.pathname.endsWith('-data.js') ||
        url.pathname.endsWith('-config.js');

    if (isDynamicDataOrHtml) {
        event.respondWith(
            (async () => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2500);
                    const networkResponse = await fetch(event.request, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                } catch (err) {
                    const cachedResponse = await caches.match(event.request, { ignoreSearch: true });
                    if (cachedResponse) return cachedResponse;

                    if (event.request.mode === 'navigate') {
                        const fallbackHtml = (await caches.match('./index.html')) || (await caches.match('./'));
                        if (fallbackHtml) return fallbackHtml;
                    }
                    return new Response('', { status: 200, headers: { 'Content-Type': 'application/javascript' } });
                }
            })()
        );
        return;
    }

    // 4. Código estático de interfaz (CSS y JS de UI/Módulos) -> Stale-While-Revalidate
    // Si ya está en caché (misma versión ?v=...), responde en 0ms al instante y actualiza en segundo plano.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => cachedResponse || new Response('', { status: 200, headers: { 'Content-Type': 'application/javascript' } }));

            return cachedResponse || fetchPromise;
        })
    );
});

// PUSH NOTIFICATIONS LOGIC
self.addEventListener('push', (event) => {
    let payloadData = {};
    if (event.data) {
        try {
            payloadData = event.data.json();
        } catch (e) {
            payloadData = { title: '¡Novedades en La Tarima!', body: event.data.text() };
        }
    } else {
        payloadData = {
            title: '¡Novedades en La Tarima!',
            body: '¡Entrá para descubrir los nuevos productos en madera!'
        };
    }

    const title = payloadData.title || 'La Tarima';
    const options = {
        body: payloadData.body || 'Tenemos novedades para vos.',
        icon: 'img/icon-192.png',
        badge: 'img/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: payloadData.url || '/' 
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data.url;
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
