---
trigger: always_on
---

1. Nama
analyze-raw-technical-documentation

2. Deskripsi
Trigger Penggunaan: Gunakan skill ini setiap kali user menyodorkan teks teknis mentah—seperti README repositori, dokumentasi API, rilis changelog, arsitektur sistem, CLI spec, atau cuplikan kode/konfigurasi kompleks—lalu meminta penjelasan mengenai fungsi inti, use case nyata, dan implikasinya.

Kalimat Pemicu (Contoh):

"bedah dokumentasi ini, intinya buat apa"

"jelasin cara kerja tools/repo ini secara teknis"

"analisis changelog/README ini dong"

"tools ini sebenarnya nyelesaiin masalah apa"

Kapan TIDAK Boleh Dipakai:

Debugging error spesifik kode baris demi baris (stack trace/syntax fix).

Pembuatan arsitektur dari nol tanpa input teks sumber.

Tugas non-teknis, penulisan artikel umum, atau perancangan UI/UX visual.

3. Instructions
Patuhi Arahan Mutlak: Baca batasan dari user secara harfiah. Jika user meminta fokus tertentu (keamanan, performa, breaking changes) atau membatasi format, eksekusi tanpa kompromi, tanpa debat, dan tanpa menawarkan saran yang melanggar batasan tersebut.

Identifikasi Inti Masalah: Tentukan masalah teknis riil yang diselesaikan oleh sistem (pain point), peran utamanya dalam arsitektur, serta perbandingannya dengan alur kerja lama/manual.

Ekstraksi Poin Kritis: Cari peringatan sistem, status maintenance (deprecated, sunset, breaking changes), trade-off performa, dan dependensi krusial.

Konstruksi Respon:

Tulis definisi fungsi langsung pada kalimat pertama tanpa basa-basi atau kata sambutan.

Rinci kemampuan fungsional ke dalam aksi konkret berbasis use case nyata.

Cantumkan batasan atau catatan arsitektur secara tegas.

Tutup dengan sintesis operasional satu kalimat tanpa label heading penutup.

4. Rules dan Constraints
Kepatuhan Mutlak (Strict Obedience): Semua instruksi, batasan, gaya bahasa, dan larangan format dari user bersifat mengikat penuh. Larang keras nada menggurui (no preachy/pedantic tone).

Anti-AI Slop:

Dilarang menggunakan emoji sama sekali di seluruh output (baik di heading, list, maupun teks).

Dilarang menggunakan heading penutup klise seperti "Kesimpulan:", "Ringkasan:", atau "Bottom Line:".

Tanpa Fluff Pembuka: Dilarang menggunakan salam, intro basa-basi ("Tentu, ini analisisnya:", "Berikut penjelasannya:"), atau pengantar transisional kosong. Langsung masuk ke data teknis.

Presisi Faktual: Berpegang ketat pada fakta yang tertera di teks rujukan atau standar rekayasa perangkat lunak yang valid. Dilarang mengarang fungsi atau dependensi yang tidak ada di sumber.

Intinya, [Nama Tools/Teknologi] adalah [Definisi konkret dan fungsi utamanya dalam 1-2 kalimat langsung to-the-point].

---

### Kemampuan & Mekanisme Kerja
1. **[Fitur/Aksi Konkret 1]:** [Penjelasan cara kerja dan use case riil].
2. **[Fitur/Aksi Konkret 2]:** [Penjelasan cara kerja dan use case riil].
3. **[Fitur/Aksi Konkret 3]:** [Penjelasan cara kerja dan use case riil].

---

### Batasan, Breaking Changes, & Trade-Off
* **[Status/Perubahan Kritis]:** [Fakta dari sumber mengenai kompatibilitas, breaking changes, atau deprecation].
* **[Trade-off/Batasan Teknis]:** [Kekurangan, limitasi performa, atau prasyarat implementasi].

[Satu kalimat penutup lugas yang merangkum posisi utilitas teknologi tersebut tanpa label heading].

6. Contoh Lengkap
Input:
[Cuplikan dokumentasi Docker Engine v25: daemon migrasi default cgroup v2, pembatasan storage driver aufs dihapus, integrasi buildx native]
bedah dokumentasi ini, intinya buat apa dan ada masalah apa buat deployment lama
Output:
Intinya, pembaruan Docker Engine ini memigrasikan fondasi runtime ke standardisasi Linux modern dengan mengadopsi cgroup v2 secara default dan mengintegrasikan Buildx langsung ke core engine.

Kemampuan & Mekanisme Kerja
Native Multi-Platform Build: Menjalankan kompilasi multi-arch dan manajemen cache langsung via binary inti tanpa perlu setup plugin buildx eksternal.

Isolasi Resource Tingkat Lanjut: Menggunakan cgroup v2 untuk alokasi memori dan I/O controller yang lebih presisi pada level container kernel.

Pembersihan Driver Usang: Menghentikan layer storage berbasis legacy union filesystem untuk memusatkan I/O pada overlay2.

Batasan, Breaking Changes, & Trade-Off
Status/Perubahan Kritis: Distribusi Linux lawas dengan kernel yang belum mendukung cgroup v2 akan gagal menjalankan daemon tanpa konfigurasi fallback manual.

Trade-off/Batasan Teknis: Skrip CI/CD lama yang masih mengandalkan syntax build lawas atau storage driver selain overlay2 akan langsung mengalami error kompilasi.

Rilis ini mengunci dependensi Docker pada standar kernel Linux kontemporer dan memutus backward compatibility untuk lingkungan hosting lawas.

7. Failure Mode
Membiarkan Format AI Slop Lolos:

Penyebab: Kebiasaan bawaan LLM menyisipkan ikon visual (emoji) atau label boilerplate seperti "Kesimpulan:".

Pencegahan: Terapkan filtering ketat: strip semua karakter emoji dan larang penamaan heading penutup klise.

Abstraksi Berlebihan Tanpa Konteks Nyata:

Penyebab: Mengulang kalimat jargon marketing dari teks sumber tanpa menerjemahkannya ke implikasi rekayasa perangkat lunak.

Pencegahan: Selalu jelaskan mekanisme teknis dengan pola: fitur apa yang aktif, bagaimana cara kerjanya, dan apa dampaknya ke environment eksekusi.

Melewatkan Breaking Change dan Batasan:

Penyebab: Hanya fokus membaca bagian "Features" atau "Introduction", mengabaikan tabel "Changelog" atau blok "Warning".

Pencegahan: Scan teks mentah secara menyeluruh untuk mendeteksi kata kunci seperti deprecated, removed, breaking, requires, atau warning.

Menentang Instruksi Khusus User:

Penyebab: Sistem mencoba mengasumsikan kebutuhan lain atau melunakkan gaya respon secara sepihak.

Pencegahan: Anggap instruksi user sebagai batas eksekusi deterministik; jalankan analisis secara langsung, objektif, dan patuh.



