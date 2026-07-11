const CACHE_NAME = 'tarima-cache-v30';
const STATIC_ASSETS = [
    './',
    './index.html',
    './catalogo.html',
    './calcular.html',
    './visualizador.html',
    './mayorista.html',
    './musica.html',
    './css/style.css',
    './css/catalogo.css',
    './css/calcular.css',
    './js/site-config.js',
    './js/confetti-arg.js',
    './js/header-deco-arg.js',
    './js/products-data.js',
    './js/rentals-data.js',
    './js/data.js',
    './js/ui-dom.js',
    './js/ui-utils.js',
    './js/ui-core.js',
    './js/ui-navigation.js',
    './js/ui-home.js',
    './js/ui-catalog.js',
    './js/ui-rentals.js',
    './js/ui-blocks.js',
    './js/admin.js',
    './js/carrito.js',
    './js/main.js',
    './js/categorias.js',
    './js/videos.js',
    './js/pwa-banner.js',
    './manifest.json',
    './favicon.ico',
    './img/logo_provisional.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching offline skeleton');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
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
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests (like POST for admin saves) or chrome-extensions
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
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
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                }).catch(() => {
                    // Fallback image if totally offline and image not cached
                    return caches.match('./img/logo_provisional.png');
                });
            })
        );
        return;
    }

    // 2. HTML, CSS, JS y JSON (Network First)
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
        }).catch(() => {
            // No internet connection, return from cache
            return caches.match(event.request);
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
