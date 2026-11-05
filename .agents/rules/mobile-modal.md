---
trigger: always_on
---

# Aturan Tampilan Form & Dialog Modal di Perangkat Mobile

Semua komponen form modal, dialog detail, dan pop-up interaktif pada aplikasi wajib menerapkan pola **Bottom Sheet** di perangkat mobile (< sm breakpoint):

1. **Mobile Bottom Sheet (< sm)**:
   - Dialog menempel dari bawah layar (`items-end`, `w-full max-h-[92vh] rounded-t-3xl border-t border-slate-100`).
   - Tinggi modal bersifat dinamis mengikuti panjang konten sebenarnya (`h-auto` hingga batas maksimal 92vh), sehingga tidak menyisakan ruang kosong (space kosong) di bawah tombol aksi pada konten pendek.
   - Menyertakan visual pull bar indicator halus di bagian atas (`w-10 h-1 bg-slate-200 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden`).
   - Outer backdrop container tanpa padding samping di mobile (`p-0 sm:p-4`).
   - Layout menggunakan struktur flexbox vertikal (`flex flex-col`):
     - Header berada di posisi atas dengan ukuran tetap dan padding 24px (`shrink-0 px-6 py-4 sm:px-6 sm:py-4.5`).
     - Konten utama dapat di-scroll secara independen jika konten melebihi layar (`flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-6 sm:py-6 pb-8 sm:pb-6`).
     - Footer tombol aksi berada di posisi bawah dengan `shrink-0`.

2. **Desktop View (>= sm)**:
   - Tampilan berupa centered card dialog terpusat (`sm:items-center sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border sm:my-8`).
   - Batas lebar modal diatur secara responsif via utility breakpoint `sm:max-w-*` (misal: `sm:max-w-md`, `sm:max-w-lg`, `sm:max-w-2xl`).

3. **Standarisasi Komponen**:
   - Selalu gunakan atau perluas komponen dasar `@/components/ui/Modal` untuk semua kebutuhan dialog/modal form baru agar konsistensi tampilan mobile bottom sheet terjaga di seluruh halaman web.
