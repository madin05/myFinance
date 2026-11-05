# Product Requirement Document (PRD) & Test Plan: Web Performance and Stress Testing

## 1. Ringkasan & Tujuan

Dokumen ini mendefinisikan ruang lingkup, arsitektur metrik, dan prosedur pengujian beban kerja (_load & stress testing_) pada sistem web internal. Tujuannya adalah mengidentifikasi batas kapasitas infrastruktur, mengevaluasi mekanisme _auto-scaling_, serta memastikan ketersediaan layanan (_high availability_) sebelum aplikasi melayani trafik publik.

---

## 2. Ruang Lingkup Pengujian (Scope)

- **In-Scope:**
  - Pengujian konkurensi koneksi HTTP/HTTPS (GET, POST).
  - Pengukuran latensi respons (TTFB, p95, p99).
  - Pemantauan utilisasi sumber daya server (CPU, RAM, Network I/O, Database Connection Pool).
  - Pengujian batas _failover_ dan _rate limiting_.
- **Out-of-Scope:**
  - Pengujian terhadap pihak ketiga (_third-party APIs_ atau _payment gateway_ eksternal tanpa mock).
  - Pengujian penetrasi keamanan (XSS, SQL Injection, eksploitasi kernel).

---

## 3. Metrik Keberhasilan (Success Metrics / SLA)

Pengujian dinilai berhasil jika sistem memenuhi ambang batas berikut:

- **Error Rate:** Kurang dari 1% dari total _requests_ pada beban puncak (_peak load_).
- **Latency:** Rata-rata response time < 800 ms; p95 < 1.5 detik.
- **Throughput:** Mampu menangani target Requests Per Second (RPS) tanpa terjadi _service crash_.
- **Resource Recovery:** Utilisasi CPU dan memori kembali normal (< 20%) dalam 3 menit setelah beban pengujian dihentikan (_cooldown_).

---

## 4. Tahapan dan Skenario Pengujian

| Fase       | Jenis Uji             | Durasi    | Target Beban                           | Tujuan                                            |
| :--------- | :-------------------- | :-------- | :------------------------------------- | :------------------------------------------------ |
| **Fase 1** | Baseline / Smoke Test | 5 menit   | 10 VUs (Virtual Users)                 | Verifikasi fungsionalitas dasar dan skrip uji     |
| **Fase 2** | Load Test             | 20 menit  | 50 – 200 VUs bertahap                  | Mengukur performa pada estimasi trafik normal     |
| **Fase 3** | Stress Test           | 15 menit  | 500 – 1.000+ VUs                       | Menguji titik puncak kegagalan (_breaking point_) |
| **Fase 4** | Soak / Endurance Test | 2 – 4 jam | Beban sedang (50% dari breaking point) | Mendeteksi _memory leak_ dan degradasi performa   |

---

## 5. Prosedur Eksekusi Standar

1. **Persiapan Lingkungan (Pre-Test):**
   - Pastikan pengujian dilakukan pada lingkungan _Staging_ atau lingkungan yang telah diisolasi.
   - Aktifkan _agent_ pemantauan metrik (Prometheus/Grafana, Datadog, atau monitoring native VM).
   - Siapkan mekanisme cadangan database jika terjadi _data pollution_.

2. **Eksekusi Pengujian (Execution):**
   - Jalankan skrip pengujian menggunakan _load testing tool_ terstandar (misalnya k6, Locust, atau Apache JMeter).
   - Naikkan trafik secara bertahap (_ramp-up_) untuk mencegah _cold-start false negative_.

3. **Verifikasi dan Analisis (Post-Test):**
   - Catat titik di mana _error rate_ mulai meningkat melebihi 1%.
   - Evaluasi apakah mekanisme _rate limiter_ (misalnya Nginx `limit_req` atau Cloudflare rules) bekerja menolak kelebihan trafik dengan HTTP status `429 Too Many Requests` alih-alih `502 Bad Gateway` atau `504 Gateway Timeout`.
   - Simpan log aplikasi dan log server untuk analisis _bottleneck_.

---

## 6. Protokol Keamanan & Kepatuhan

- Pengujian hanya boleh diarahkan ke domain/IP milik sendiri yang dikonfirmasi dalam kontrol internal.
- Notifikasi tim infrastruktur atau penyedia _cloud/hosting_ terlebih dahulu jika pengujian melibatkan volume bandwidth besar guna mencegah isolasi akun otomatis oleh penyedia.
