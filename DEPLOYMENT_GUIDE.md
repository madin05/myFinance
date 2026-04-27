# Panduan Deployment MyFinance

Aplikasi ini menggunakan **Vite**, jadi proses deployment-nya sangat mudah. Berikut adalah langkah-langkah untuk mempublikasikan aplikasi kamu ke internet secara gratis.

## Opsi 1: Netlify (Paling Direkomendasikan)

1.  Daftar atau login ke [Netlify](https://www.netlify.com/).
2.  Install Netlify CLI secara global (opsional tapi disarankan):
    ```bash
    npm install netlify-cli -g
    ```
3.  Jalankan perintah build di folder project kamu:
    ```bash
    npm run build
    ```
4.  Jalankan perintah deploy:
    ```bash
    netlify deploy --prod --dir=dist
    ```
5.  Atau, kamu bisa hubungkan repository GitHub kamu ke Netlify untuk deployment otomatis setiap kali kamu push code.

## Opsi 2: Vercel

1.  Daftar atau login ke [Vercel](https://vercel.com/).
2.  Install Vercel CLI:
    ```bash
    npm install -g vercel
    ```
3.  Jalankan perintah build:
    ```bash
    npm run build
    ```
4.  Deploy dengan satu perintah:
    ```bash
    vercel --prod
    ```
5.  Pilih folder `dist` sebagai directory publik jika ditanya.

## Opsi 3: GitHub Pages

1.  Buat repository di GitHub dan push code kamu.
2.  Buka folder project, buka `vite.config.js` (buat jika belum ada).
3.  Tambahkan property `base` dengan nama repository kamu:
    ```javascript
    export default {
      base: '/nama-repository-kamu/'
    }
    ```
4.  Gunakan action `JamesIves/github-pages-deploy-action` di GitHub Actions untuk deploy folder `dist` secara otomatis.

## Hal Penting yang Harus Diperhatikan:
*   **Aset Video**: Pastikan file `assets/coin.webm` ada di folder yang benar saat di-deploy.
*   **PWA**: Jika kamu ingin aplikasi ini bisa di-install di HP, pastikan file `manifest.json` sudah terkonfigurasi (opsional).
*   **SSL/HTTPS**: Pastikan domain tempat kamu hosting mendukung HTTPS agar semua fitur ikon dan video berjalan lancar.

Selamat melakukan deployment bre!
