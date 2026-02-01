const CACHE_NAME = 'apocalypse-bunker-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './src/main.js',
    './manifest.json',
    './app_icon.png',
    './node_modules/phaser/dist/phaser.esm.js'
    // Add other assets here as needed, but be careful with large assets.
    // Ideally, we'd cache specific game assets, but for a simple PWA start, this covers the shell.
];

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Basic cache-first strategy
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
