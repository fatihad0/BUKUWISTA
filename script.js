const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbyX7zLzAwPvdmy1V6DuQmk4N4l5R-jNj77F5M61Qo4EEFL8LTTBoQfLoMX9l971uU3w/exec";

let dataTamu = JSON.parse(localStorage.getItem('tamu') || '[]');
let dataKamar = JSON.parse(localStorage.getItem('kamarData') || '[]');
let dataPenerima = JSON.parse(localStorage.getItem('penerimaData') || '[]');

let editIndex = -1;
let editPenerimaIndex = -1;
let chartInstance = null;
let timerWaktu = null;

// Meminta izin pop-up notifikasi saat aplikasi pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// Fungsi pembantu untuk memunculkan notifikasi ke sistem HP
function tampilkanNotifikasiOS(judul, pesan) {
    if (Notification.permission === 'granted') {
        new Notification(judul, {
            body: pesan,
            icon: 'icons/launchericon-192x192.png', // Pastikan jalur ikon ini benar
            badge: 'icons/launchericon-128x128.png'
        });
    }
}
// kode selesai -- Meminta izin pop-up notifikasi saat aplikasi pertama kali dibuka

function showNotification(pesan) {
    let toast = document.getElementById("toast");
    toast.innerText = pesan;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

function setSyncStatus(status, icon) {
    document.getElementById('sync-status').innerHTML = `<i class="material-icons" style="font-size:16px;">${icon}</i> ${status}`;
}

async function fetchDataFromSheet() {
    setSyncStatus("Menyinkronkan...", "cloud_sync");
    if (window.AppInventor) {
        window.AppInventor.setWebViewString("GET_DATA");
    } else {
        try {
            let response = await fetch(URL_SCRIPT);
            let json = await response.json();
            prosesDataDariCloud(json);
        } catch (err) {
            setSyncStatus("Offline Mode", "cloud_off");
            refreshSemuaLayar();
        }
    }
}

//fungsi prosesDataDariCloud
function prosesDataDariCloud(json) {
    // Simpan jumlah data lama sebelum diperbarui
    let jumlahTamuLama = dataTamu.length;

    if(json.tamu) dataTamu = json.tamu;
    if(json.kamar) dataKamar = json.kamar;
    if(json.penerima) dataPenerima = json.penerima;

    // Logika Notifikasi: Jika jumlah tamu dari Cloud LEBIH BANYAK dari lokal
    if (jumlahTamuLama > 0 && dataTamu.length > jumlahTamuLama) {
        let tamuBaru = dataTamu[dataTamu.length - 1]; // Ambil data tamu terakhir
        tampilkanNotifikasiOS("Data Tamu Baru!", `${tamuBaru.nama} baru saja ditambahkan ke sistem.`);
    }

    localStorage.setItem('tamu', JSON.stringify(dataTamu));
    localStorage.setItem('kamarData', JSON.stringify(dataKamar));
    localStorage.setItem('penerimaData', JSON.stringify(dataPenerima));

    setSyncStatus("Online", "cloud_done");
    refreshSemuaLayar();
}
//akhir dari - fungsi prosesDataDariCloud

setInterval(() => {
    if (window.AppInventor) {
        let dataFromApp = window.AppInventor.getWebViewString();
        if (dataFromApp && dataFromApp.startsWith("{") && dataFromApp.includes("tamu")) {
            try {
                let json = JSON.parse(dataFromApp);
                prosesDataDariCloud(json);
                window.AppInventor.setWebViewString("");
            } catch(e) {}
        }
    }
}, 1000);

async function sendToCloud(payload) {
    setSyncStatus("Menyimpan...", "cloud_upload");
    if (window.AppInventor) {
        window.AppInventor.setWebViewString("POST|" + JSON.stringify(payload));
        showNotification("Aksi berhasil! Data sedang disimpan.");
    } else {
        try {
            await fetch(URL_SCRIPT, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            setSyncStatus("Tersimpan", "cloud_done");
            showNotification("Aksi berhasil tersimpan di Cloud!");
            setTimeout(fetchDataFromSheet, 1500);
        } catch (err) {
            setSyncStatus("Offline (Tersimpan Lokal)", "cloud_off");
            showNotification("Tersimpan Offline. Akan dikirim saat Online.");
        }
    }
}

function refreshSemuaLayar() {
    updateDropdowns();
    renderList();
    renderKamarList();
    renderPenerimaList();
}

function now() { return new Date().toLocaleString('id-ID'); }
function startWaktuOtomatis() {
    if(timerWaktu) clearInterval(timerWaktu);
    timerWaktu = setInterval(() => {
        if (editIndex === -1 && document.getElementById('screen-form').classList.contains('active')) {
            document.getElementById('waktu').value = now();
        }
    }, 1000);
}
startWaktuOtomatis();

function updateDropdowns() {
    let selectPenerima = document.getElementById('penerima');
    let selectKamar = document.getElementById('kamar');

    selectPenerima.innerHTML = '';
    dataPenerima.forEach(p => selectPenerima.innerHTML += `<option value="${p.nama}">${p.nama}</option>`);

    selectKamar.innerHTML = '<option value="">-- Pilih Kamar --</option>';
    dataKamar.forEach(k => selectKamar.innerHTML += `<option value="${k.nama}">${k.nama}</option>`);
}

function updateHints() {
    let n = new Set(), a = new Set(), k = new Set();
    dataTamu.forEach(t => { if(t.nama) n.add(t.nama); if(t.asal) a.add(t.asal); if(t.keperluan) k.add(t.keperluan); });
    document.getElementById('hint-nama').innerHTML = Array.from(n).map(x => `<option value="${x}">`).join('');
    document.getElementById('hint-asal').innerHTML = Array.from(a).map(x => `<option value="${x}">`).join('');
    document.getElementById('hint-keperluan').innerHTML = Array.from(k).map(x => `<option value="${x}">`).join('');
}

function renderList(filteredData = null) {
    let container = document.getElementById('data-container');
    container.innerHTML = '';

    let dataToRender = filteredData ? filteredData : dataTamu;

    if (dataToRender.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #888;">Data tamu tidak ditemukan</div>';
        return;
    }

    let reversedData = [...dataToRender].reverse();

    reversedData.forEach((g) => {
        let i = dataTamu.indexOf(g);
        let isAda = (!g.status || g.status.toUpperCase() === 'ADA');
        let badgeHTML = isAda ? `<span class="badge-status badge-ada">ADA</span>` : `<span class="badge-status badge-keluar">KELUAR</span>`;
        let infoKeluarHTML = (!isAda && g.waktuKeluar) ? `<div style="margin-top:8px; padding:8px; background:var(--input-bg); border-radius:6px; font-size:13px;"><b>Waktu Keluar:</b> ${g.waktuKeluar}</div>` : '';
        let btnTeks = isAda ? "Check-Out" : "Batal Keluar";
        let btnClass = isAda ? "btn-checkout" : "btn-cancel-out";

        container.innerHTML += `
        <div class="card">
        <div class="card-header">
        <div class="card-title" style="display:flex; align-items:center;">${g.nama} ${badgeHTML}</div>
        <div style="font-size:12px; color:#888;">Masuk:<br>${g.waktu}</div>
        </div>
        <div style="font-size:14px; line-height: 1.6; margin-top: 8px;">
        <div>Penerima: <b>${g.penerima}</b> | Kamar: <b>${g.kamar || '-'}</b></div>
        <div>Pengikut: <b>${g.pengikut || '0'}</b></div>
        <div>Asal / Instansi: <b>${g.asal || '-'}</b></div>
        <div>Keperluan: <b>${g.keperluan || '-'}</b></div>
        <div>Catatan: <b>${g.catatan || '-'}</b></div>
        </div>
        ${infoKeluarHTML}
        <div class="card-actions">
        <button class="btn-action btn-edit" onclick="editData(${i})">Edit</button>
        <button class="btn-action ${btnClass}" onclick="toggleCheckout(${i})">${btnTeks}</button>
        <button class="btn-action btn-del" onclick="hapusTamu(${i})">Hapus</button>
        </div>
        </div>`;
    });

    if (!filteredData) {
        localStorage.setItem('tamu', JSON.stringify(dataTamu));
        updateHints();
        renderDashboard();
    }
}

/* ==========================================
   FITUR RENDER, FILTER, DAN URUTKAN TAMU
   ========================================== */
// Fungsi mengubah teks "29/8/2026, 21.47.23" menjadi angka waktu digital untuk diurutkan
function parseWaktuLengkap(waktuStr) {
    if (!waktuStr) return 0;
    try {
        // Mengambil angka tanggal, bulan, tahun, jam, menit, detik
        let match = waktuStr.match(/(\d+)\/(\d+)\/(\d+)[,\s]+(\d+)[\.:](\d+)[\.:](\d+)/);
        if (match) {
            let tgl = match[1], bln = match[2], thn = match[3];
            let jam = match[4], mnt = match[5], dtk = match[6];
            return new Date(thn, bln - 1, tgl, jam, mnt, dtk).getTime();
        }
        return 0;
    } catch(e) {
        return 0;
    }
}

function terapkanFilterTamu() {
    let keyword = document.getElementById('search-tamu').value.toLowerCase();
    let urutan = document.getElementById('filter-sort').value;

    // 1. Filter Pencarian Teks
    let hasilCari = dataTamu.filter(t =>
        (t.nama && t.nama.toLowerCase().includes(keyword)) ||
        (t.asal && t.asal.toLowerCase().includes(keyword)) ||
        (t.keperluan && t.keperluan.toLowerCase().includes(keyword))
    );

    // 2. Filter Dropdown (Hanya ADA)
    if (urutan === 'ada') {
        hasilCari = hasilCari.filter(t => (!t.status || t.status.toUpperCase() === 'ADA'));
    }

    // 3. Pengurutan Data (Sorting)
        hasilCari.sort((a, b) => {
            if (urutan === 'az') {
                return (a.nama || '').localeCompare(b.nama || '');
            } else if (urutan === 'za') {
                return (b.nama || '').localeCompare(a.nama || '');
            } else {
                // Pengaturan Default: Status ADA di atas, lalu urutkan Tanggal Kedatangan Terbaru
                let statusA = (!a.status || a.status.toUpperCase() === 'ADA') ? 1 : 0;
                let statusB = (!b.status || b.status.toUpperCase() === 'ADA') ? 1 : 0;

                if (statusA !== statusB) {
                    return statusB - statusA; // Prioritaskan status ADA di atas KELUAR
                } else {
                    // Jika status sama, urutkan berdasarkan waktu kedatangan paling baru
                    let waktuA = parseWaktuLengkap(a.waktu);
                    let waktuB = parseWaktuLengkap(b.waktu);
                    return waktuB - waktuA; // Yang terbaru (angka lebih besar) ditaruh di atas
                }
            }
        });

        renderListDinamis(hasilCari);
    }

function renderListDinamis(dataToRender) {
    let container = document.getElementById('data-container');
    container.innerHTML = '';

    if (dataToRender.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #888;">Data tamu tidak ditemukan</div>';
        return;
    }

    dataToRender.forEach((g) => {
        // Penting: Mencari index asli agar tombol Edit/Hapus/Check-Out tidak salah sasaran
        let i = dataTamu.indexOf(g);
        let isAda = (!g.status || g.status.toUpperCase() === 'ADA');
        let badgeHTML = isAda ? `<span class="badge-status badge-ada">ADA</span>` : `<span class="badge-status badge-keluar">KELUAR</span>`;
        let infoKeluarHTML = (!isAda && g.waktuKeluar) ? `<div style="margin-top:8px; padding:8px; background:var(--input-bg); border-radius:6px; font-size:13px;"><b>Waktu Keluar:</b> ${g.waktuKeluar}</div>` : '';
        let btnTeks = isAda ? "Check-Out" : "Batal Keluar";
        let btnClass = isAda ? "btn-checkout" : "btn-cancel-out";

        container.innerHTML += `
        <div class="card">
            <div class="card-header">
                <div class="card-title" style="display:flex; align-items:center;">${g.nama} ${badgeHTML}</div>
                <div style="font-size:12px; color:#888;">Masuk:<br>${g.waktu}</div>
            </div>
            <div style="font-size:14px; line-height: 1.6; margin-top: 8px;">
                <div>Penerima: <b>${g.penerima}</b> | Kamar: <b>${g.kamar || '-'}</b></div>
                <div>Pengikut: <b>${g.pengikut || '0'}</b></div>
                <div>Asal / Instansi: <b>${g.asal || '-'}</b></div>
                <div>Keperluan: <b>${g.keperluan || '-'}</b></div>
                <div>Catatan: <b>${g.catatan || '-'}</b></div>
            </div>
            ${infoKeluarHTML}
            <div class="card-actions">
                <button class="btn-action btn-edit" onclick="editData(${i})">Edit</button>
                <button class="btn-action ${btnClass}" onclick="toggleCheckout(${i})">${btnTeks}</button>
                <button class="btn-action btn-del" onclick="hapusTamu(${i})">Hapus</button>
            </div>
        </div>`;
    });
}

function toggleCheckout(i) {
    let t = dataTamu[i];
    if (!t.status || t.status.toUpperCase() === 'ADA') {
        t.status = 'KELUAR';
        t.waktuKeluar = now();
    } else {
        t.status = 'ADA';
        t.waktuKeluar = '';
    }
    renderList();

    if(t.rowIndex) {
        sendToCloud({
            action: "updateGuest", rowIndex: t.rowIndex,
            waktu: t.waktu, nama: t.nama, asal: t.asal, pengikut: t.pengikut,
            kamar: t.kamar, keperluan: t.keperluan, penerima: t.penerima,
            catatan: t.catatan,
            status: t.status, waktuKeluar: t.waktuKeluar
        });
    } else {
        alert("Mohon tunggu sinkronisasi data awal selesai sebelum melakukan Check-out.");
    }
}

/* ==========================================
   FITUR RENDER DASHBOARD & STATUS KAMAR DINAMIS
   ========================================== */
function renderDashboard() {
    let totalOrang = 0;
    let totalDaerahan = 0;
    let totalLk = 0;
    let totalPr = 0;
    let totalAnak = 0;

    let statusKamar = {};
    dataKamar.forEach(k => { statusKamar[k.nama] = []; });
    let kamarTerisiCount = 0;

    // 1. Hitung Data Tamu yang Berstatus 'ADA'
    dataTamu.forEach(t => {
        let isAda = (!t.status || t.status.toUpperCase() === 'ADA');
        if (isAda) {
            let jumlahPengikut = parseInt(t.pengikut) || 0;
            let totalDiTamu = 1 + jumlahPengikut;
            totalOrang += totalDiTamu;

            // Hitung Kategori Daerahan (Mengecek kata 'daerah' di kolom Keperluan)
            let keperluan = (t.keperluan || "").toLowerCase();
            if (keperluan.includes("daerah")) {
                totalDaerahan += totalDiTamu;
            }

            // Merekam Penghuni Kamar
            if (t.kamar && statusKamar[t.kamar] !== undefined) {
                statusKamar[t.kamar].push(t.nama);
            }

            // Deteksi Rincian Lk, Pr, dan Anak dari Catatan
            let catatan = t.catatan || "";
            let matchLk = catatan.match(/>\s*Lk\s*(\d+)/i);
            let matchPr = catatan.match(/>\s*Pr\s*(\d+)/i);
            let matchAnak = catatan.match(/>\s*(Anak|Bayi|Balita)\s*(\d+)/i);

            let lkCount = matchLk ? parseInt(matchLk[1]) : 0;
            let prCount = matchPr ? parseInt(matchPr[1]) : 0;
            let anakCount = matchAnak ? parseInt(matchAnak[2]) : 0;

            if (matchLk || matchPr || matchAnak) {
                totalLk += lkCount;
                totalPr += prCount;
                totalAnak += anakCount;
            } else {
                // Jika tidak ada keterangan di catatan, default dianggap Lk
                totalLk += totalDiTamu;
            }
        }
    });

    // 2. Render Kotak Ringkasan Atas (Hanya tampilkan yang nilainya > 0)
    let summaryHTML = '';

    // Kotak Total Tamu Saat Ini
    let subDetailDemografi = [];
    if (totalLk > 0) subDetailDemografi.push(`Lk: ${totalLk}`);
    if (totalPr > 0) subDetailDemografi.push(`Pr: ${totalPr}`);
    if (totalAnak > 0) subDetailDemografi.push(`Anak: ${totalAnak}`);

    summaryHTML += `
        <div class="dash-box">
            <div>Total Tamu Saat Ini</div>
            <h2>${totalOrang}</h2>
            ${subDetailDemografi.length > 0 ? `<div class="dash-sub-info">(${subDetailDemografi.join(' | ')})</div>` : ''}
        </div>
    `;

    // Hitung Kamar Terisi
    for (let k in statusKamar) {
        if (statusKamar[k].length > 0) {
            kamarTerisiCount++;
        }
    }

    // Kotak Kamar Terisi (Tampil jika > 0)
    if (kamarTerisiCount > 0) {
        summaryHTML += `
            <div class="dash-box">
                <div>Kamar Terisi</div>
                <h2>${kamarTerisiCount}</h2>
            </div>
        `;
    }

    // Kotak Tamu Daerahan (Hanya tampil jika ada/lebih dari 0)
    if (totalDaerahan > 0) {
        summaryHTML += `
            <div class="dash-box" style="background: #8CC152;">
                <div>Tamu Daerahan</div>
                <h2>${totalDaerahan}</h2>
            </div>
        `;
    }

    document.getElementById('dash-summary-container').innerHTML = summaryHTML;

    // 3. Render Status Kamar (HANYA TAMPILKAN KAMAR TERISI / SEMBUNYIKAN KOSONG)
    let htmlKamar = '';
    let adaKamarTerisi = false;

    for (let k in statusKamar) {
        let isFilled = statusKamar[k].length > 0;
        // Aturan Sembunyi: Hanya tampilkan jika kamar ada penghuninya
        if (isFilled) {
            adaKamarTerisi = true;
            htmlKamar += `<div style="margin-bottom: 8px;">
                <span class="room-badge room-filled">${k}</span>
                <span style="font-size: 13px;">(${statusKamar[k].join(', ')})</span>
            </div>`;
        }
    }

    // Jika seluruh kamar kosong, tampilkan pesan ramah
    if (!adaKamarTerisi) {
        htmlKamar = '<div style="font-size: 13px; color: #888; padding: 4px 0;">Semua kamar saat ini kosong.</div>';
    }

    document.getElementById('room-status-container').innerHTML = htmlKamar;

    // Segarkan Grafik Kedatangan
    updateChart();
}

/* ==========================================
   FITUR DASHBOARD & RINGKASAN BERANDA
   ========================================== */
function renderDashboard() {
    let totalOrang = 0;
    let totalDaerahan = 0;
    let totalLk = 0;
    let totalPr = 0;
    let totalAnak = 0;

    let statusKamar = {};
    dataKamar.forEach(k => { statusKamar[k.nama] = []; });
    let kamarTerisiCount = 0;

    // 1. Olah Data Tamu
    dataTamu.forEach(t => {
        let isAda = (!t.status || t.status.toUpperCase() === 'ADA');
        if (isAda) {
            let jumlahPengikut = parseInt(t.pengikut) || 0;
            let totalTamuIni = 1 + jumlahPengikut;
            totalOrang += totalTamuIni;

            // Hitung Kategori Daerahan dari Keperluan
            let keperluan = (t.keperluan || "").toLowerCase();
            if (keperluan.includes("daerah")) {
                totalDaerahan += totalTamuIni;
            }

            // Hitung Lk, Pr, dan Anak/Bayi dari Catatan
            let catatan = (t.catatan || "").toLowerCase();
            let matchLk = catatan.match(/>\s*lk\s*(\d+)/i);
            let matchPr = catatan.match(/>\s*pr\s*(\d+)/i);
            let matchAnak = catatan.match(/>\s*(anak|bayi|balita)\s*(\d+)/i);

            let lkDiTamu = matchLk ? parseInt(matchLk[1]) : 0;
            let prDiTamu = matchPr ? parseInt(matchPr[1]) : 0;
            let anakDiTamu = matchAnak ? parseInt(matchAnak[2]) : 0;

            if (matchLk || matchPr || matchAnak) {
                totalLk += lkDiTamu;
                totalPr += prDiTamu;
                totalAnak += anakDiTamu;
            } else if (catatan.includes("pasutri") && totalTamuIni === 2) {
                totalLk += 1;
                totalPr += 1;
            } else {
                // Default jika tidak ada catatan khusus
                totalLk += totalTamuIni;
            }

            // Masukkan ke Pemetaan Kamar
            if (t.kamar && statusKamar[t.kamar] !== undefined) {
                statusKamar[t.kamar].push(t.nama);
            }
        }
    });

    // 2. Render Kartu Ringkasan (Hanya Tampilkan jika > 0)
    let containerSummary = document.getElementById('summary-cards-container');
    let htmlSummary = '';

    // Array Kategori yang Akan Diperiksa
    let kategoriList = [
        { label: 'Total Tamu', nilai: totalOrang },
        { label: 'Kamar Terisi', nilai: 0 }, // Ditentukan di bawah
        { label: 'Daerahan', nilai: totalDaerahan },
        { label: 'Laki-Laki', nilai: totalLk },
        { label: 'Perempuan', nilai: totalPr },
        { label: 'Anak/Bayi', nilai: totalAnak }
    ];

    // 3. Render Status Kamar (Sembunyikan Kamar Kosong)
    let htmlKamar = '';
    for (let k in statusKamar) {
        let isFilled = statusKamar[k].length > 0;
        if (isFilled) {
            kamarTerisiCount++;
            htmlKamar += `<div style="margin-bottom: 8px;">
                <span class="room-badge room-filled">${k}</span>
                <span style="font-size: 13px;">(${statusKamar[k].join(', ')})</span>
            </div>`;
        }
    }

    // Buat HTML Kartu Ringkasan (Sembunyikan jika bernilai 0)
    kategoriList.forEach(item => {
        if (item.nilai > 0) {
            htmlSummary += `<div class="dash-box">
                <div>${item.label}</div>
                <h2>${item.nilai}</h2>
            </div>`;
        }
    });

    if (htmlKamar === '') {
        htmlKamar = '<div style="font-size: 13px; color: #888;">Semua kamar saat ini kosong.</div>';
    }

    containerSummary.innerHTML = htmlSummary;
    document.getElementById('room-status-container').innerHTML = htmlKamar;

    updateChart();
}

function parseTanggalIndonesia(dateString) {
    if (!dateString) return null;
    let tanggalSaja = dateString.split(',')[0].split(' ')[0];
    let parts = tanggalSaja.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateString);
}

function resetFilterGrafik() {
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    updateChart();
}

/* ==========================================
   FITUR GRAFIK KEDATANGAN (3 KATEGORI)
   ========================================== */
function updateChart() {
    let startInput = document.getElementById('filter-start').value;
    let endInput = document.getElementById('filter-end').value;

    let startDate = startInput ? new Date(startInput) : null;
    let endDate = endInput ? new Date(endInput) : null;

    // Jika tidak ada filter, tampilkan 7 hari terakhir secara default
    if (!startDate && !endDate) {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
    }

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    // Variabel Penampung Data
    let countPerDay = {};
    let totalMenginap = 0;
    let totalTidakMenginap = 0;
    let totalDaerahan = 0;

    // Proses dan Kategorisasi Data
    dataTamu.forEach(t => {
        if(t.waktu) {
            let tglObj = parseTanggalIndonesia(t.waktu);

            if (tglObj) {
                let isInRange = true;
                if (startDate && tglObj < startDate) isInRange = false;
                if (endDate && tglObj > endDate) isInRange = false;

                if (isInRange) {
                    // Buat label tanggal jadi cantik (contoh: "25 Agustus")
                    let opsiTgl = { day: 'numeric', month: 'long' , year: 'numeric' };
                    let tanggalLabel = tglObj.toLocaleDateString('id-ID', opsiTgl);

                    let jumlahPengikut = parseInt(t.pengikut) || 0;
                    let totalOrang = 1 + jumlahPengikut;

                    // LOGIKA KATEGORI CERDAS
                    let keperluan = (t.keperluan || "").toLowerCase();
                    let kamar = (t.kamar || "").toLowerCase();
                    let kategori = "";

                    if (keperluan.includes("daerah")) {
                        kategori = "Daerahan";
                        totalDaerahan += totalOrang;
                    } else if (kamar === "" || kamar.includes("tidak menginap")) {
                        kategori = "Tidak Menginap";
                        totalTidakMenginap += totalOrang;
                    } else {
                        kategori = "Menginap";
                        totalMenginap += totalOrang;
                    }

                    // Menyiapkan keranjang harian jika belum ada
                    if (!countPerDay[tanggalLabel]) {
                        countPerDay[tanggalLabel] = {
                            tglAsli: tglObj, // Digunakan agar urutan hari tidak acak
                            menginap: 0,
                            tidakMenginap: 0,
                            daerahan: 0
                        };
                    }

                    // Masukkan ke keranjang yang tepat
                    if (kategori === "Daerahan") countPerDay[tanggalLabel].daerahan += totalOrang;
                    else if (kategori === "Tidak Menginap") countPerDay[tanggalLabel].tidakMenginap += totalOrang;
                    else countPerDay[tanggalLabel].menginap += totalOrang;
                }
            }
        }
    });

    // Mengurutkan tanggal dari yang terlama ke terbaru
    let sortedDates = Object.keys(countPerDay).sort((a, b) => {
        return countPerDay[a].tglAsli - countPerDay[b].tglAsli;
    });

    // Memecah data untuk disuapkan ke Chart.js
    let labelGrafik = [];
    let dataMenginap = [];
    let dataTidakMenginap = [];
    let dataDaerahan = [];

    sortedDates.forEach(tgl => {
        labelGrafik.push(tgl);
        dataMenginap.push(countPerDay[tgl].menginap);
        dataTidakMenginap.push(countPerDay[tgl].tidakMenginap);
        dataDaerahan.push(countPerDay[tgl].daerahan);
    });

    let ctx = document.getElementById('tamuChart').getContext('2d');
    if(chartInstance) chartInstance.destroy(); // Bersihkan grafik lama

    // Membuat Grafik Kelompok Baru
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelGrafik.length ? labelGrafik : ['Belum ada data'],
            datasets: [
                {
                    label: `MENGINAP: ${totalMenginap}`,
                    data: labelGrafik.length ? dataMenginap : [0],
                    backgroundColor: '#5D9CEC', // Warna Biru/Teal
                    borderRadius: 4
                },
                {
                    label: `TIDAK MENGINAP: ${totalTidakMenginap}`,
                    data: labelGrafik.length ? dataTidakMenginap : [0],
                    backgroundColor: '#FF9F00', // Warna Oranye
                    borderRadius: 4
                },
                {
                    label: `DAERAHAN: ${totalDaerahan}`,
                    data: labelGrafik.length ? dataDaerahan : [0],
                    backgroundColor: '#8CC152', // Warna Hijau
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Memastikan grafik elastis sesuai ukuran wadah
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1, // Memaksa sumbu Y menampilkan angka bulat saja
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom', // Memindahkan keterangan ke bawah seperti Gambar 2
                    labels: {
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

function openForm() {
    editIndex = -1;
    document.getElementById('f').reset();
    document.getElementById('pengikut').value = 0;
    document.getElementById('waktu').value = now();
    document.getElementById('btn-submit').innerText = "SIMPAN DATA";
    switchTab('form');
}

function editData(i) {
    editIndex = i; let t = dataTamu[i];
    document.getElementById('waktu').value = t.waktu;
    document.getElementById('penerima').value = t.penerima;
    document.getElementById('nama').value = t.nama;
    document.getElementById('pengikut').value = t.pengikut;
    document.getElementById('asal').value = t.asal;
    document.getElementById('keperluan').value = t.keperluan;
    document.getElementById('kamar').value = t.kamar || "";
    document.getElementById('catatan').value = t.catatan || "";

    document.getElementById('btn-submit').innerText = "UPDATE DATA";
    switchTab('form');
}

function hapusTamu(i) {
    if(confirm('Hapus tamu ini secara permanen?')) {
        let target = dataTamu[i];
        dataTamu.splice(i, 1);
        renderList();
        if(target.rowIndex) sendToCloud({ action: "deleteGuest", rowIndex: target.rowIndex });
    }
}

document.getElementById('f').onsubmit = e => {
    e.preventDefault();
    let dataLama = (editIndex !== -1) ? dataTamu[editIndex] : {};

    let d = {
        waktu: document.getElementById('waktu').value,
        penerima: document.getElementById('penerima').value,
        nama: document.getElementById('nama').value,
        pengikut: document.getElementById('pengikut').value,
        asal: document.getElementById('asal').value,
        keperluan: document.getElementById('keperluan').value,
        kamar: document.getElementById('kamar').value,
        catatan: document.getElementById('catatan').value,

        status: (editIndex === -1) ? 'ADA' : (dataLama.status || 'ADA'),
        waktuKeluar: (editIndex === -1) ? '' : (dataLama.waktuKeluar || ''),
        rowIndex: dataLama.rowIndex || null
    };

    if(editIndex === -1) {
        dataTamu.push(d);
        sendToCloud({ action: "addGuest", ...d });
    } else {
        dataTamu[editIndex] = d;
        if(d.rowIndex) sendToCloud({ action: "updateGuest", ...d });
    }

    renderList();
    switchTab('list');
};

function renderKamarList() {
    let container = document.getElementById('kamar-container'); container.innerHTML = '';
    dataKamar.forEach((k, i) => {
        container.innerHTML += `<div class="card" style="display:flex; justify-content:space-between; align-items:center;">
        <b>Kamar ${k.nama}</b>
        <button class="btn-action btn-del" onclick="hapusKamar(${i})">Hapus</button>
        </div>`;
    });
}

function tambahKamarPrompt() {
    let k = prompt("Masukkan Nama / Nomor Kamar Baru:");
    if(k) {
        dataKamar.push({ nama: k });
        localStorage.setItem('kamarData', JSON.stringify(dataKamar));
        updateDropdowns(); renderKamarList();
        sendToCloud({ action: "addKamar", namaKamar: k });
    }
}

function hapusKamar(i) {
    if(confirm("Hapus kamar ini?")) {
        let target = dataKamar[i];
        dataKamar.splice(i, 1);
        localStorage.setItem('kamarData', JSON.stringify(dataKamar));
        updateDropdowns(); renderKamarList();
        if(target.rowIndex) sendToCloud({ action: "deleteKamar", rowIndex: target.rowIndex });
    }
}

function renderPenerimaList() {
    let container = document.getElementById('penerima-container'); container.innerHTML = '';
    dataPenerima.forEach((p, i) => {
        container.innerHTML += `<div class="card">
        <div class="card-title">${p.nama}</div>
        <div style="font-size:14px; margin-top:4px;">No HP: <b>${p.noHP || '-'}</b></div>
        <div style="font-size:14px;">Alamat: ${p.alamat || '-'}</div>
        <div class="card-actions">
        <button class="btn-action btn-edit" onclick="bukaFormPenerima(${i})">Edit</button>
        <button class="btn-action btn-del" onclick="hapusPenerima(${i})">Hapus</button>
        </div>
        </div>`;
    });
}

function bukaFormPenerima(i) {
    editPenerimaIndex = i;
    if(i === -1) { document.getElementById('form-penerima').reset(); }
    else {
        let p = dataPenerima[i];
        document.getElementById('p-nama').value = p.nama;
        document.getElementById('p-nohp').value = p.noHP || '';
        document.getElementById('p-alamat').value = p.alamat || '';
    }
    switchTab('penerima-form');
}

document.getElementById('form-penerima').onsubmit = e => {
    e.preventDefault();
    let nama = document.getElementById('p-nama').value;
    let noHP = document.getElementById('p-nohp').value;
    let alamat = document.getElementById('p-alamat').value;

    if(editPenerimaIndex === -1) {
        dataPenerima.push({ nama, noHP, alamat });
        sendToCloud({ action: "addPenerima", nama, noHP, alamat });
    } else {
        let target = dataPenerima[editPenerimaIndex];
        target.nama = nama; target.noHP = noHP; target.alamat = alamat;
        if(target.rowIndex) sendToCloud({ action: "updatePenerima", rowIndex: target.rowIndex, nama, noHP, alamat });
    }

    localStorage.setItem('penerimaData', JSON.stringify(dataPenerima));
    updateDropdowns(); renderPenerimaList(); switchTab('penerima-list');
};

function hapusPenerima(i) {
    if(confirm("Hapus penerima ini?")) {
        let target = dataPenerima[i];
        dataPenerima.splice(i, 1);
        localStorage.setItem('penerimaData', JSON.stringify(dataPenerima));
        updateDropdowns(); renderPenerimaList();
        if(target.rowIndex) sendToCloud({ action: "deletePenerima", rowIndex: target.rowIndex });
    }
}

function toggleTheme() { let isDark = document.body.classList.toggle('dark-mode'); document.getElementById('theme-icon').innerText = isDark ? "light_mode" : "dark_mode"; localStorage.setItem('theme', isDark ? 'dark' : 'light'); }
if(localStorage.getItem('theme') === 'dark') toggleTheme();

function switchTab(tab) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    let fab = document.getElementById('fab-add');

    if(tab === 'beranda') {
        document.getElementById('screen-beranda').classList.add('active');
        document.querySelectorAll('.nav-item')[0].classList.add('active');
        document.getElementById('app-title').innerText = "Beranda";
        fab.classList.remove('hidden'); renderDashboard();
    }
    else if(tab === 'list') {
        document.getElementById('screen-list').classList.add('active');
        document.querySelectorAll('.nav-item')[1].classList.add('active');
        document.getElementById('app-title').innerText = "Daftar Tamu";
        fab.classList.remove('hidden'); terapkanFilterTamu();
    }
    else if(tab === 'settings') {
        document.getElementById('screen-settings').classList.add('active');
        document.querySelectorAll('.nav-item')[2].classList.add('active');
        document.getElementById('app-title').innerText = "Pengaturan";
        fab.classList.add('hidden');
    }
    else if(tab === 'kamar-list') {
        document.getElementById('screen-kamar-list').classList.add('active');
        document.getElementById('app-title').innerText = "Kelola Kamar";
        fab.classList.add('hidden'); renderKamarList();
    }
    else if(tab === 'penerima-list') {
        document.getElementById('screen-penerima-list').classList.add('active');
        document.getElementById('app-title').innerText = "Kelola Penerima";
        fab.classList.add('hidden'); renderPenerimaList();
    }
    else if(tab === 'penerima-form') {
        document.getElementById('screen-penerima-form').classList.add('active');
        document.getElementById('app-title').innerText = editPenerimaIndex === -1 ? "Tambah Penerima" : "Edit Penerima";
        fab.classList.add('hidden');
    }
    else if(tab === 'form') {
        document.getElementById('screen-form').classList.add('active');
        document.getElementById('app-title').innerText = editIndex === -1 ? "Tambah Tamu" : "Edit Tamu";
        fab.classList.add('hidden');
    }
    else if(tab === 'informasi') {
        document.getElementById('screen-informasi').classList.add('active');
        document.getElementById('app-title').innerText = "Informasi";
        fab.classList.add('hidden'); // Menyembunyikan tombol + agar layar rapi
    }
}

fetchDataFromSheet();

if (typeof navigator.serviceWorker !== 'undefined') {
    navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker berhasil didaftarkan!'))
    .catch((error) => console.log('Gagal mendaftar Service Worker:', error));
}

/* ==========================================
 *  FUNGSI MENU PENGATURAN TAMBAHAN
 *  ========================================== */

// 1. Fitur Bagikan (Memanggil fitur Share bawaan HP)
function bagikanAplikasi() {
    if (navigator.share) {
        navigator.share({
            title: 'Buku Tamu WISTA',
            text: 'Gunakan aplikasi pencatatan Buku Tamu digital ini!',
            url: window.location.href
        }).catch((error) => console.log('Gagal membagikan', error));
    } else {
        alert("Maaf, fitur bagikan tidak didukung di perangkat/browser ini.");
    }
}

// 2. Kontrol Situs (Mengecek dan meminta ulang izin Notifikasi)
function kontrolSitus() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            alert("Izin Notifikasi: DIIZINKAN.\nAplikasi dapat mengirim pemberitahuan.");
        } else {
            alert("Izin Notifikasi: DITOLAK.\nBuka pengaturan browser/HP Anda untuk mengizinkan.");
        }
    });
}

// 3. Fitur Zoom
let currentZoom = 100; // Dimulai dari 100%

function updateZoomDisplay() {
    // Memperbarui angka di layar
    document.getElementById('zoom-level-text').innerText = currentZoom + '%';
    // Menerapkan efek zoom ke seluruh halaman (dibagi 100 karena CSS zoom butuh format desimal, contoh: 1.1)
    document.body.style.zoom = (currentZoom / 100);
}

function zoomIn() {
    if (currentZoom < 200) { // Batas maksimal zoom diperbesar (200%)
        currentZoom += 10;
        updateZoomDisplay();
    }
}

function zoomOut() {
    if (currentZoom > 50) { // Batas maksimal zoom diperkecil (50%)
        currentZoom -= 10;
        updateZoomDisplay();
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        // Jika belum layar penuh, maka masuk ke mode layar penuh
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Terjadi kesalahan saat mengaktifkan mode layar penuh: ${err.message}`);
        });
    } else {
        // Jika sudah layar penuh, maka keluar
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/* ==========================================
   FITUR UNDUH DATA (DOWNLOAD CSV)
   ========================================== */

   // Memunculkan atau menyembunyikan menu unduhan
   function toggleMenuUnduh() {
       let menu = document.getElementById('dropdown-unduh');
       menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
   }

   // Menjalankan unduhan sesuai format yang dipilih
   function pilihFormatUnduh(format) {
       document.getElementById('dropdown-unduh').style.display = 'none'; // Sembunyikan menu kembali
       if (format === 'csv') downloadCSV();
       else if (format === 'xml') downloadXML();
   }

   // Fitur Pintar: Menutup dropdown jika pengguna mengklik area kosong di layar
   window.addEventListener('click', function(e) {
       let menu = document.getElementById('dropdown-unduh');
       if (menu && menu.style.display === 'block') {
           let btn = menu.previousElementSibling; // Mengambil elemen tombol di atasnya
           if (!menu.contains(e.target) && !btn.contains(e.target)) {
               menu.style.display = 'none';
           }
       }
   });

function downloadCSV() {
    if (dataTamu.length === 0) {
        showNotification("Tidak ada data untuk diunduh.");
        return;
    }

    // Membuat Header (Judul Kolom) untuk file CSV
    let csvContent = "Waktu Masuk,Penerima,Nama Tamu,Pengikut,Asal/Instansi,Keperluan,Kamar/Ruangan,Catatan,Status,Waktu Keluar\n";

    // Memasukkan setiap baris data
    dataTamu.forEach(t => {
        // Tanda kutip ganda ("") digunakan agar jika ada koma di dalam teks catatan, format CSV tidak rusak
        let row = [
            `"${t.waktu || ''}"`,
            `"${t.penerima || ''}"`,
            `"${t.nama || ''}"`,
            `"${t.pengikut || '0'}"`,
            `"${t.asal || ''}"`,
            `"${t.keperluan || ''}"`,
            `"${t.kamar || ''}"`,
            `"${t.catatan || ''}"`,
            `"${t.status || 'ADA'}"`,
            `"${t.waktuKeluar || ''}"`
        ];
        csvContent += row.join(",") + "\n"; // Gabungkan dengan koma, akhiri dengan garis baru
    });

    // Mengonversi teks menjadi file Blob (Binary Large Object)
    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);

    // Membuat tautan tak terlihat untuk memicu unduhan di browser
    let link = document.createElement("a");
    link.setAttribute("href", url);

    // Nama file dinamis dengan tanggal hari ini
    let namaFile = `Data_Tamu_WISTA_${new Date().toISOString().slice(0,10)}.csv`;
    link.setAttribute("download", namaFile);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("File CSV berhasil diunduh!");
}

/* ==========================================
   FITUR UNDUH DATA (DOWNLOAD XML)
   ========================================== */
function downloadXML() {
    if (dataTamu.length === 0) {
        showNotification("Tidak ada data untuk diunduh.");
        return;
    }

    // Fungsi pembersih karakter khusus di dalam (agar tidak hilang)
    const bersihkanXML = (str) => {
        if (!str) return "";
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    };

    // Buka struktur XML
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<DaftarTamu>\n';

    // Masukkan data
    dataTamu.forEach(t => {
        xmlContent += "  <Tamu>\n";
        xmlContent += `    <WaktuMasuk>${bersihkanXML(t.waktu)}</WaktuMasuk>\n`;
        xmlContent += `    <Penerima>${bersihkanXML(t.penerima)}</Penerima>\n`;
        xmlContent += `    <NamaTamu>${bersihkanXML(t.nama)}</NamaTamu>\n`;
        xmlContent += `    <Pengikut>${bersihkanXML(t.pengikut)}</Pengikut>\n`;
        xmlContent += `    <AsalInstansi>${bersihkanXML(t.asal)}</AsalInstansi>\n`;
        xmlContent += `    <Keperluan>${bersihkanXML(t.keperluan)}</Keperluan>\n`;
        xmlContent += `    <Kamar>${bersihkanXML(t.kamar)}</Kamar>\n`;
        xmlContent += `    <Catatan>${bersihkanXML(t.catatan)}</Catatan>\n`;
        xmlContent += `    <Status>${bersihkanXML(t.status || 'ADA')}</Status>\n`;
        xmlContent += `    <WaktuKeluar>${bersihkanXML(t.waktuKeluar)}</WaktuKeluar>\n`;
        xmlContent += "  </Tamu>\n";
    });

    xmlContent += "</DaftarTamu>";

    // Buat file dan otomatis terunduh
    let blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.href = url;
    link.download = `Data_Tamu_WISTA_${new Date().toISOString().slice(0,10)}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("File XML berhasil diunduh!");
}

/* ==========================================
   FITUR KIRIM REKAP STATUS KE WHATSAPP (VERSI CERDAS)
   ========================================== */
function kirimRekapWhatsApp() {
    // 1. Ambil tanggal hari ini dalam format bahasa Indonesia
    let options = { day: 'numeric', month: 'long', year: 'numeric' };
    let tanggalHariIni = new Date().toLocaleDateString('id-ID', options);

    let teksLaporan = `NEWS \n" DAFTAR TAMU, ${tanggalHariIni} "\n\n📌 *STATUS KAMAR*\n\n`;

    let totalOrangSemua = 0;
    let totalLkGlobal = 0;
    let totalPrGlobal = 0;

    // 2. Looping data kamar yang terdaftar
    dataKamar.forEach(k => {
        let namaKamar = k.nama;
        let penghuniKamar = [];
        let catatanKamar = "";
        let jumlahOrangDiKamar = 0;

        let lkKamar = 0;
        let prKamar = 0;
        let adaRincianManual = false;

        // Cari tamu yang statusnya ADA di kamar ini
        dataTamu.forEach(t => {
            let isAda = (!t.status || t.status.toUpperCase() === 'ADA');
            if (isAda && t.kamar === namaKamar) {
                let jumlahPengikut = parseInt(t.pengikut) || 0;
                let totalDiTamuIni = 1 + jumlahPengikut; // Tamu utama + pengikut

                jumlahOrangDiKamar += totalDiTamuIni;
                totalOrangSemua += totalDiTamuIni;

                penghuniKamar.push(t.nama);

                if (t.catatan && t.catatan.trim() !== "") {
                    catatanKamar = t.catatan;

                    // Deteksi otomatis pola seperti ">Lk 1" atau ">Pr 1" di dalam Catatan
                    let matchLk = t.catatan.match(/>\s*Lk\s*(\d+)/i);
                    let matchPr = t.catatan.match(/>\s*Pr\s*(\d+)/i);

                    if (matchLk || matchPr) {
                        adaRincianManual = true;
                        if (matchLk) lkKamar += parseInt(matchLk[1]);
                        if (matchPr) prKamar += parseInt(matchPr[1]);
                    }
                }
            }
        });

        // Jika di catatan tidak ada rincian >Lk/>Pr tapi ada kata "pasutri", asumsikan 1 Lk dan 1 Pr (jika total 2 orang)
        if (!adaRincianManual && jumlahOrangDiKamar > 0) {
            if (catatanKamar.toLowerCase().includes("pasutri") && jumlahOrangDiKamar === 2) {
                lkKamar = 1;
                prKamar = 1;
            } else {
                // Default: Jika tidak ada keterangan, anggap semuanya Laki-laki (atau sesuaikan kebutuhan)
                lkKamar = jumlahOrangDiKamar;
                prKamar = 0;
            }
        }

        // Tambahkan ke total global
        totalLkGlobal += lkKamar;
        totalPrGlobal += prKamar;

        // Format baris per kamar: 101 : 2 ((pasutri) (Rinciannya) >Lk 1 >Pr 1)
        if (jumlahOrangDiKamar > 0) {
            let infoCatatan = catatanKamar ? ` (${catatanKamar})` : "";
            teksLaporan += `${namaKamar} : ${jumlahOrangDiKamar}${infoCatatan}\n`;
        } else {
            teksLaporan += `${namaKamar} :\n`;
        }
    });

    // 3. Tambahkan Bagian Total dan Rincian Global yang akurat
    teksLaporan += `\nTOTAL TAMU : ${totalOrangSemua}\n(Rinciannya)\n  >Lk ${totalLkGlobal}\n  >Pr ${totalPrGlobal}`;

    // 4. Buka WhatsApp
    let urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(teksLaporan)}`;
    window.open(urlWhatsApp, '_blank');
}