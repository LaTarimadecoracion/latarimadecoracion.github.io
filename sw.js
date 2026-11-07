const CACHE_NAME = 'tarima-cache-v67';
// Solo pre-cacheamos el esqueleto mínimo (< 60 KB) en la instalación para NO competir
// con el ancho de banda del usuario cuando entra por primera vez a la web.
// El resto de JS, CSS e imágenes se guarda automáticamente en caché a medida que se usan.
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
            console.log('[SW] Pre-caching offline skeleton');
            for (const asset of STATIC_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    console.warn('[SW] No se pudo precachear:', asset, err);
                }
            }
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Solo limpiamos cachés viejos. NO llamamos clients.claim() para evitar
    // que el SW tome control forzoso de pestañas ya abiertas, lo que causaba
    // la doble carga al entrar a la web. La recarga controlada se maneja
    // desde el cliente en index.html con el listener 'controllerchange'.
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests (like POST for admin saves) or chrome-extensions
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    // Bypass Service Worker caching for dynamic config files to ensure changes load fresh immediately
    if (
        url.pathname.endsWith('/js/site-config.js') || url.pathname.endsWith('/site-config.js') ||
        url.pathname.endsWith('/cajones-config.js') || url.pathname.includes('cajones-config.js') ||
        url.pathname.endsWith('/cortes-config.js') || url.pathname.includes('cortes-config.js')
    ) {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const match = await caches.match(event.request);
                return match || new Response('', { status: 408, statusText: 'Offline Config' });
            })
        );
        return;
    }

    // 1. Imágenes (Cache First)
    if (event.request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse; // Return from cache immediately
                }
                // If not in cache, fetch from network and add to cache
                return fetch(event.request).then((networkResponse) => {
                    if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                        return networkResponse;
                    }
                    // Caching same-origin and valid CORS/opaque images
                    try {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    } catch (e) {}
                    return networkResponse;
                }).catch(async () => {
                    // Solo retornar logo de fallback si es una imagen del propio dominio
                    if (url.origin === location.origin) {
                        const logoFallback = await caches.match('./img/logo_provisional.png');
                        return logoFallback || new Response('', { status: 404, statusText: 'Image Not Found' });
                    }
                    return new Response('', { status: 404, statusText: 'Image Not Found' });
                });
            })
        );
        return;
    }

    // 2. HTML, CSS, JS y JSON (Network First con Fallback suave a Caché)
    event.respondWith(
        (async () => {
            try {
                // Timeout preventivo de red para conexiones móviles lentas (5 segundos)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

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
                // Sin conexión a internet o red muy lenta: recuperar de caché sin romper la página
                const cachedResponse = await caches.match(event.request, { ignoreSearch: true });
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Si es navegación HTML, entregar siempre la SPA principal index.html
                if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
                    const fallbackHtml = (await caches.match('./index.html')) || (await caches.match('./'));
                    if (fallbackHtml) return fallbackHtml;
                }

                // Si falló un JS o CSS secundario y no está en caché, responder vacío 200 para que la app no crashee
                const isCodeAsset = event.request.destination === 'script' || event.request.destination === 'style' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
                if (isCodeAsset) {
                    return new Response('', { status: 200, headers: { 'Content-Type': 'text/javascript' } });
                }

                return new Response('Sin conexión temporal', { status: 503, statusText: 'Offline' });
            }
        })()
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
