const CACHE='gastos-v71';
const URLS=['./','./index.html','./styles.css','./app.js','./manifest.json'];

self.addEventListener('install',e=>{
    e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)));
    self.skipWaiting();
});

self.addEventListener('activate',e=>{
    e.waitUntil(
        caches.keys().then(k=>Promise.all(k.map(n=>n!==CACHE&&caches.delete(n))))
    );
    self.clients.claim();
});

self.addEventListener('fetch',e=>{
    e.respondWith(
        caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('./index.html')))
    );
});
