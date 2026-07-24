// Naikkan versi cache karena kita menambahkan file baru
const CACHE_NAME = 'buku-tamu-pro-v2';

const ASSETS_TO_CACHE = [
    './',
'./index.html',
'./style.css', // Kita tambahkan file CSS baru di sini
'./manifest.json',
'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
'https://fonts.googleapis.com/icon?family=Material+Icons',
'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install Service Worker dan simpan assets ke Cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Hapus cache lama jika ada pembaruan versi (activate)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Mengambil data dari cache saat offline (Fetch)
self.addEventListener('fetch', event => {
    // Abaikan caching untuk request API ke Google Apps Script
    if (event.request.url.includes('script.google.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Kembalikan response dari cache jika ada, jika tidak fetch dari internet
            return response || fetch(event.request).then(fetchResponse => {
                // Opsional: Simpan font/icon yang baru di-fetch ke dalam cache
                return caches.open(CACHE_NAME).then(cache => {
                    if (!event.request.url.startsWith('chrome-extension') && event.request.method === 'GET') {
                        cache.put(event.request, fetchResponse.clone());
                    }
                    return fetchResponse;
                });
            });
        }).catch(() => {
            console.log('Offline mode and resource not found in cache.');
        })
    );
});
