/* =========================================================
 * PERBAIKAN FITUR PWA (Berdasarkan Rekomendasi Action Items)
 * ========================================================= */

// PERBAIKAN 4: Background Sync (Tahan pengiriman saat offline, kirim saat online)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-tamu') {
        console.log('Internet kembali aktif! Menjalankan sinkronisasi tertunda...');

        // Catatan: Di masa depan, kamu bisa menambahkan logika di sini untuk
        // mengambil data dari IndexedDB lokal dan mengirimnya ke Google Sheets.
        event.waitUntil(
            Promise.resolve('Sinkronisasi selesai') // Simulasi sukses
        );
    }
});

// PERBAIKAN 3: Periodic Background Sync (Ambil data diam-diam secara berkala)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-data-tamu') {
        console.log('Memperbarui data tamu secara berkala di latar belakang...');

        // Simulasi proses pengambilan data dari Google Sheets
        event.waitUntil(
            fetch('https://script.google.com/macros/s/AKfycbyX7zLzAwPvdmy1V6DuQmk4N4l5R-jNj77F5M61Qo4EEFL8LTTBoQfLoMX9l971uU3w/exec')
        );
    }
});

// PERBAIKAN 5: Push Notifications (Menampilkan notifikasi ke layar HP)
self.addEventListener('push', event => {
    // Ambil pesan dari server jika ada, jika tidak gunakan teks standar
    const pesan = event.data ? event.data.text() : 'Ada data tamu baru atau pembaruan sistem!';

    const opsiNotifikasi = {
        body: pesan,
        // Pastikan path gambar ikon ini sesuai dengan folder gambarmu
        icon: 'icons/launchericon-192x192.png',
        badge: 'icons/launchericon-128x128.png',
        vibrate: [200, 100, 200] // Membuat HP bergetar
    };

    event.waitUntil(
        self.registration.showNotification('BukuTamu PRO', opsiNotifikasi)
    );
});
