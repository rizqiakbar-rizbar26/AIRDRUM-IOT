# PANDUAN AirDrum

## Yang dibutuhkan
- 2 iPhone (Safari), satu WiFi/hotspot yang sama, internet (broker publik)
- Laptop untuk dashboard
- Repo di GitHub Pages (HTTPS wajib, sensor iOS tidak jalan di HTTP)

## A. Persiapan
1. Unggah isi proyek ke GitHub, aktifkan Pages (`main`, `/docs`).
2. Tentukan  `airdrum`. Pakai yang sama di semua perangkat.

## B. Kalibrasi sensor (sekali, tiap iPhone)
1. Buka `edge.html`, pilih peran, tekan **Mulai**, izinkan sensor.
2. Buka **Mode debug**. Catat `magnitude` saat HP diam (harusnya mendekati 0 karena gravitasi dibuang) dan saat memukul.
3. Atur slider **HIT_ACC** di atas magnitude diam dan getar tangan, tetapi di bawah pukulan lemah. Bawaan 12 m/s². Naikkan bila ada *false hit*, turunkan bila pukulan tidak terdeteksi.
4. Uji snare (ayun ke bawah), hi-hat (ke samping), tom (memutar). 
5. Pengaturan (PROJECT_ID, broker, peran, HIT_ACC) tersimpan otomatis. Data k-NN **tidak** tersimpan, rekam ulang tiap membuka halaman.

## C. Sesi latihan
1. Laptop: buka `dashboard.html`, **Sambung**. Kartu stik kiri dan kanan harus berstatus *online*.
2. **Mode Bebas**: ayunkan stik, suara keluar, dashboard mencatat drum dan velocity.
3. **Mode Latihan**: pilih BPM, pola (misal `RLRL` = kanan, kiri, kanan, kiri per ketukan), toleransi, lalu **Mulai**. iPhone berbunyi metronom dan layar berkedip.
4. Pukul tepat ketukan dengan tangan sesuai pola. Layar iPhone: hijau = tepat, merah = meleset atau tangan salah.
5. **Loop adaptif**: tiap bar (4 ketukan) dinilai. Akurasi ≥ 80% selama 4 bar berturut-turut: BPM +5. Akurasi < 50%: BPM −5. Batas 60–140.

Nilai `delta_ms`: negatif = terlalu cepat, positif = terlambat. Ketukan 0 adalah saat iPhone menerima control, jadi tekan **Mulai**, tunggu satu dua ketukan, baru mulai memukul.

## D. Tanpa iPhone (simulator)
Buka `simulator.html` dengan PROJECT_ID yang sama, **Sambung & mulai simulasi**. Atur jitter dan peluang tangan salah untuk menguji penilaian dan loop adaptif di dashboard.

## Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| Izin sensor ditolak | iOS: tutup tab, buka lagi, tekan Mulai, pilih Izinkan. Atau Pengaturan → Safari → Gerakan & Orientasi. |
| Sensor tidak ada data | Harus lewat HTTPS (GitHub Pages), bukan file lokal atau HTTP. |
| Tidak tersambung MQTT | Cek URL `wss://broker.hivemq.com:8884/mqtt`.  |
| Dashboard tidak melihat stik | PROJECT_ID beda (huruf besar/kecil dan spasi dianggap). Bandingkan topic di MQTTX. |
| Layar iPhone mati | Wake Lock hanya aktif setelah Mulai. Biarkan Safari di depan. |
| Tidak ada suara | Pastikan tidak silent mode dan volume naik. Audio baru aktif setelah tap Mulai. |
| False hit saat diam | Naikkan HIT_ACC. |
| Pukulan tak terdeteksi | Turunkan HIT_ACC atau ayun lebih tegas. |
| Selalu TANGAN SALAH | Peran iPhone tertukar atau pola belum sesuai urutan. Cek pola di dashboard. |
| Tidak ada bar selesai | Mode harus Latihan dan tombol Mulai ditekan. Bar tertutup saat pukulan pertama bar berikutnya masuk. |
| Getar tidak ada | iOS Safari tidak mendukung getar, diganti warna layar dan bunyi. |

