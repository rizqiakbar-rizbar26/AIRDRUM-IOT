# Dokumentasi AirDrum

Kerangka laporan sesuai ketentuan tugas (masalah & ide, arsitektur, sensor, processing & algoritma, cloud, pengujian). Bagian bertanda **[ISI]** diisi dengan hasil ukurmu sendiri. Salin tiap bagian ke slide PPT.

Repo GitHub: **[ISI link repo]** · Demo: **[ISI link Pages]** · Anggota: **[ISI]**

---

## 1. Masalah dan Ide
**Masalah.** Drum asli mahal, besar, dan berisik, sehingga pemula sulit berlatih ritme dan koordinasi dua tangan. Latihan sendirian juga tanpa umpan balik apakah ketukan tepat.

**Ide.** AirDrum mengubah dua iPhone menjadi stik drum udara. Setiap ayunan dideteksi, dikenali sebagai snare, hi-hat, atau tom, dibunyikan seketika, lalu dinilai ketepatannya terhadap metronom. Tempo latihan naik atau turun otomatis sesuai kemampuan pemain.

## 2. Arsitektur
| Kotak | Implementasi |
|---|---|
| Sensor + Edge | 2 iPhone (stik kiri, kanan) menjalankan `edge.html` |
| Jaringan | WiFi / hotspot yang sama |
| Cloud | MQTT broker HiveMQ publik, WSS port 8884 |
| Dashboard | `dashboard.html`, kontrol dua arah |

Komunikasi dua arah:
- **Edge → cloud:** `hit` (qos 0, latensi rendah), `status` (qos 1, retained, LWT `offline`), `rtt/pong`.
- **Cloud → edge:** `control` (qos 1, retained), `feedback`, `rtt/ping`.

Suara dimainkan **lokal di edge** agar tidak terasa lag, sedangkan penilaian dilakukan di dashboard.

Gambar arsitektur: **[ISI diagram 4 kotak]**

## 3. Sensor
| Sensor | Sumber | Satuan | Kegunaan |
|---|---|---|---|
| Accelerometer | `devicemotion.acceleration` (cadangan: `accelerationIncludingGravity`) | m/s² | Deteksi pukulan dan kekuatan |
| Gyroscope | `devicemotion.rotationRate` | °/s | Arah ayunan, klasifikasi drum |

Hasil Sensor Playground (`iot.myudak.com`):

| Perangkat | Laju data accelerometer | Laju data gyroscope | Satuan |
|---|---|---|---|
| iPhone kiri | **[ISI] Hz** | **[ISI] Hz** | **[ISI]** |
| iPhone kanan | **[ISI] Hz** | **[ISI] Hz** | **[ISI]** |

## 4. Data Processing dan Algoritma
Tiga jenis pengolahan (minimal 2 diminta):

**A. Deteksi pukulan** (`createHitDetector`). `magnitude = √(x²+y²+z²)`. Pukulan = puncak lokal dengan `magnitude ≥ HIT_ACC` (bawaan 12 m/s²), dengan cooldown 150 ms agar satu ayunan tidak dihitung dua kali. Velocity MIDI: peta linear `HIT_ACC…40 → 1…127`.

**B. Klasifikasi drum** dari jendela 200 ms `rotationRate` sebelum puncak. Fitur: `[peak_acc, rata-rata |alpha|, |beta|, |gamma|]`.
- *Aturan sumbu:* beta dominan = snare (ayun ke bawah), gamma dominan = hi-hat (ke samping), alpha dominan = tom (memutar).
- *k-NN (k=3):* jarak Euclid dengan fitur distandarkan (simpangan baku data latih), data dikalibrasi pengguna (5 ayunan per kelas). Seri suara diselesaikan dengan jarak terdekat.

**C. Timing.** `delta_ms = t − ketukan terdekat` (negatif = cepat). `BPM estimasi` = median jarak 4 pukulan terakhir.

**Penilaian (dashboard).** Hasil: TEPAT, TERLALU CEPAT, TERLAMBAT, TANGAN SALAH. Skor tepat = `100·(1 − |delta|/toleransi)`. Tangan diperiksa terhadap pola, misalnya `RLRL`.

**Loop adaptif.** Akurasi bar = pukulan benar tangan dan |delta| ≤ toleransi dibagi seluruh pukulan bar. ≥ 80% selama 4 bar berturut-turut: BPM +5. < 50%: BPM −5. Batas 60–140. Perubahan dikirim lewat `control`.

## 5. Cloud (MQTT)
Broker `wss://broker.hivemq.com:8884/mqtt`, tanpa akun, TLS. Awalan topic `airdrum/<PROJECT_ID>`. Tabel topic ada di README. QoS 1 dipakai untuk pesan yang tidak boleh hilang (control, status, feedback), QoS 0 untuk pukulan agar tidak menumpuk.

RTT diukur dashboard tiap 5 detik lewat `rtt/ping` dan `rtt/pong`. Hasil: stik kiri **[ISI] ms**, stik kanan **[ISI] ms**.

Screenshot MQTTX / web client (subscribe `airdrum/airdrum_iot/#`): **[ISI]**

## 6. Pengujian
**6.1 Unit test.** `node --test`: 13 test lulus. **[ISI screenshot]**

**6.2 Kalibrasi ambang pukulan.**

| Stik | Magnitude diam | Magnitude pukulan lemah | Pukulan keras | HIT_ACC akhir | False hit |
|---|---|---|---|---|---|
| Kiri | **[ISI]** | **[ISI]** | **[ISI]** | **[ISI]** | **[ISI]** |
| Kanan | **[ISI]** | **[ISI]** | **[ISI]** | **[ISI]** | **[ISI]** |

**6.3 Akurasi klasifikasi** (20 ayunan per kelas, benar / 20):

| Metode | Snare | Hi-hat | Tom |
|---|---|---|---|
| Aturan sumbu | **[ISI]** | **[ISI]** | **[ISI]** |
| k-NN | **[ISI]** | **[ISI]** | **[ISI]** |

**6.4 Latihan dan loop adaptif.** BPM awal **[ISI]**, perubahan BPM tiap bar **[ISI]**, skor rata-rata **[ISI]**. Simulator dapat dipakai untuk mereproduksi skenario (jitter kecil → BPM naik, jitter besar → BPM turun).

**6.5 Keterbatasan.** iOS Safari tidak mendukung getar (diganti warna layar dan bunyi); laju sensor bergantung perangkat; tab harus tetap terbuka (Wake Lock); jam dua iPhone tidak identik sehingga ketukan 0 ditetapkan saat control diterima, selisihnya sebesar latensi jaringan; broker publik dipakai bersama.

## 7. Pemetaan ke Penilaian
| Komponen | Bukti |
|---|---|
| Ide & orisinalitas (20%) | Bagian 1 |
| Arsitektur 2 edge, 2 sensor, satu jaringan (15%) | Bagian 2–3 |
| Processing ≥ 2 jenis & AI (20%) | Bagian 4 (A, B, C, k-NN, loop adaptif) |
| Komunikasi ke cloud (15%) | Bagian 5 |
| Pengujian & demo (15%) | Bagian 6 + video |
| Dokumentasi (15%) | Dokumen ini + README + PANDUAN |

Yang dikumpulkan: kode di GitHub (tautan dicantumkan di PPT), PPT dokumentasi, video demo.
