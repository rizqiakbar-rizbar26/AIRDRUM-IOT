# AirDrum

Drum udara berbasis IoT: dua iPhone menjadi **stik kiri dan kanan**. Ayunan stik dideteksi dari accelerometer dan gyroscope, dimainkan sebagai suara drum, dikirim lewat MQTT ke cloud, lalu dinilai oleh dashboard yang juga mengatur tempo latihan secara adaptif.

Tugas mata kuliah Internet of Things: *Praktek Multicommunication 2 Arah dan Multisensor*.

## Arsitektur

```
 iPhone kiri  ─┐  hit, status                  ┌─ dashboard.html (nilai, kontrol, grafik)
               ├──► MQTT broker HiveMQ (WSS) ◄─┤
 iPhone kanan ─┘  ◄── control, feedback, ping  └─ simulator.html (stik virtual, opsional)
```

| Kotak | Isi proyek ini |
|---|---|
| Sensor + Edge | 2 iPhone, `edge.html` (accelerometer + gyroscope lewat DeviceMotion) |
| Jaringan | WiFi / hotspot |
| Cloud | MQTT broker publik HiveMQ, `wss://broker.hivemq.com:8884/mqtt` |
| Dashboard | `dashboard.html` (kontrol dua arah, skor, grafik) |

Dua arah: edge → cloud (`hit`, `status`) dan cloud → edge (`control`, `feedback`).

## Pemenuhan ketentuan tugas

| Ketentuan | Di AirDrum |
|---|---|
| ≥ 2 edge device, ≥ 2 sensor | 2 iPhone, accelerometer + gyroscope |
| ≥ 2 jenis data processing | (A) deteksi pukulan dari puncak magnitude, (B) fitur rotasi 200 ms untuk klasifikasi drum, (C) delta ke ketukan dan estimasi BPM |
| Algoritma | Deteksi puncak + cooldown, klasifikasi aturan sumbu, **k-NN**, loop adaptif BPM |
| Protokol ke cloud | MQTT over WebSocket TLS |
| Dashboard | `dashboard.html` |

## Struktur repo

```
docs/                 ← dipublikasikan lewat GitHub Pages (main, /docs)
  edge.html           aplikasi stik (dibuka di iPhone)
  dashboard.html      dashboard + kontrol
  simulator.html      simulator dua stik tanpa iPhone
  js/config.js        PROJECT_ID, broker, pembentuk topic
  js/processing.js    semua logika pengolahan (tanpa DOM, bisa diuji)
  js/audio.js         suara drum hasil sintesis Web Audio
tests/processing_test.js   13 unit test (node --test)
README.md  PANDUAN.md  DOKUMENTASI.md
```

## Topic MQTT

Awalan: `airdrum/<PROJECT_ID>` (PROJECT_ID dibersihkan menjadi huruf, angka, `-`, `_`).

| Topic | Arah | QoS | Isi |
|---|---|---|---|
| `edge/<left\|right>/hit` | edge → cloud | 0 | `device_id, sequence, drum, velocity, peak_acc, delta_ms, beat_index, bpm_est, sent_at_ms` |
| `edge/<role>/status` | edge → cloud | 1, retained | `device_id, state, sensors_ok, mode, bpm` (LWT: `offline`) |
| `control` | dashboard → edge | 1, retained | `seq, mode (free/train), running, bpm, pattern, tolerance_ms` |
| `feedback/<role>` | dashboard → edge | 1 | `result, delta_ms, score, tip` |
| `rtt/ping` | dashboard → edge | 0 | `id, t` |
| `rtt/pong/<role>` | edge → dashboard | 0 | `ping_id, t_ping, device_id` |

## Menjalankan

1. Aktifkan GitHub Pages: Settings → Pages → `main` / `/docs`.
2. iPhone: buka `https://<user>.github.io/<repo>/edge.html`, pilih peran, tekan **Mulai**.
3. Laptop: buka `…/dashboard.html`, isi PROJECT_ID yang sama, **Sambung**, lalu **Mulai**.
4. Tanpa iPhone: buka `…/simulator.html` dengan PROJECT_ID yang sama.

Langkah lengkap dan pemecahan masalah ada di [PANDUAN.md](PANDUAN.md).

## Pengujian

```
node --test
```

13 test mencakup deteksi pukulan, cooldown, velocity, klasifikasi, k-NN, timing, estimasi BPM, penilaian, akurasi bar, dan loop adaptif.

## Catatan keamanan

Broker publik dipakai bersama banyak orang. Gunakan PROJECT_ID yang unik dan jangan kirim data sensitif. Dashboard menampilkan data pesan sebagai teks biasa (bukan HTML) karena siapa pun bisa mengirim pesan ke topic publik.

## Lisensi

Untuk keperluan tugas kuliah.
