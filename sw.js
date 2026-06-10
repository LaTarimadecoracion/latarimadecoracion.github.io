self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    // Check if there is payload data
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
        icon: 'img/icon-192.png', // Replace with an actual 192x192 icon URL
        badge: 'img/icon-192.png', // Replace with a monochrome icon (like a bell)
        vibrate: [100, 50, 100],
        data: {
            url: payloadData.url || '/' // Default URL to open when clicked
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const targetUrl = event.notification.data.url;

    // This looks to see if the current is already open and focuses if it is
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
