# Fitur Scan Struk (Receipt Scanner) — MyFinance

Dokumentasi teknis lengkap fitur scan struk belanja yang menggunakan Google Gemini AI untuk OCR + ekstraksi data terstruktur dari foto struk.

---

## Daftar Isi

1. [Konsep Dasar](#konsep-dasar)
2. [Tech Stack](#tech-stack)
3. [Setup & Instalasi](#setup--instalasi)
4. [Flow End-to-End](#flow-end-to-end)
5. [Arsitektur](#arsitektur)
6. [File Reference](#file-reference)
7. [Security & Error Handling](#security--error-handling)
8. [Optimisasi Memory & Performance](#optimisasi-memory--performance)
9. [Pertimbangan Desain](#pertimbangan-desain)
10. [Limitations](#limitations)
11. [Pengembangan Lanjutan](#pengembangan-lanjutan)

---

## Konsep Dasar

User foto struk belanja → AI baca struk → form Tambah Transaksi otomatis terisi → user review → simpan.

**Tujuan utama:** mempercepat input transaksi pengeluaran tanpa harus ketik manual tanggal, kategori, nominal, dan keterangan.

**Output yang diekstrak per struk:**
- Tanggal transaksi
- Nama merchant / toko
- Total nominal
- Kategori (saran otomatis)
- Ringkasan item

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Vanilla JS + Canvas API (kompresi gambar) |
| Backend | Express.js + Fetch API native (no SDK) |
| AI Provider | Google Gemini 2.0 Flash (REST API) |
| Auth | Firebase Admin (token verification) |

Tidak menggunakan SDK Google Generative AI agar:
- Tidak menambah ukuran dependency
- Lebih kontrol terhadap error handling
- Lebih mudah di-maintain (perubahan API cukup edit 1 file)

---

## Setup & Instalasi

### 1. Dapatkan Gemini API Key

1. Buka [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Login dengan akun Google
3. Klik **Create API Key** → pilih project (boleh buat baru)
4. Copy API key yang muncul (format: `AIzaSy...`)

### 2. Set Environment Variable

Buka `backend/.env`, tambahkan:

```env
GEMINI_API_KEY="AIzaSy...isi-key-disini"
```

Restart backend setelah set env var:

```bash
cd backend
npm run dev
```

### 3. Free Tier Quota

| Limit | Value |
|-------|-------|
| Request per menit | 15 |
| Request per hari | 1.500 |
| Token limit | 1M input / 8K output per request |

Cukup untuk personal use (asumsi 50 scan/hari = 1.500/bulan).

---

## Flow End-to-End

```
┌─────────────────────────────────────────────────────────────┐
│                       USER (BROWSER)                        │
└─────────────────────────────────────────────────────────────┘
                              │
            (1) Klik tombol FAM scan (icon ⊡)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  scanReceipt.js → openScanReceiptModal()                    │
│  Modal kebuka dengan 2 opsi: Foto Kamera / Upload Galeri    │
└─────────────────────────────────────────────────────────────┘
                              │
            (2) User pilih foto / upload gambar
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  compressImage(file) — Canvas API di browser                │
│  • Resize max 1280px (jaga aspect ratio)                    │
│  • Convert ke JPEG quality 0.7                              │
│  • Output: base64 string ~100-300KB                         │
│  Tampil preview → user "Ulangi" atau "Scan dgn AI"          │
└─────────────────────────────────────────────────────────────┘
                              │
            (3) User klik "Scan dengan AI"
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  store.scanReceipt(base64, mimeType)                        │
│  POST /api/receipts/scan                                    │
│  Headers: Authorization: Bearer {firebase_token}            │
│  Body: { image: "base64...", mimeType: "image/jpeg" }       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ (HTTP)
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (NODE.JS)                        │
│                                                             │
│  authMiddleware → verify Firebase token                     │
│        ↓                                                    │
│  receiptController.scanReceipt()                            │
│  • Validate body (image string, MIME type, size)            │
│  • Strip "data:image/...;base64," prefix kalau ada          │
│        ↓                                                    │
│  geminiService.extractReceiptData()                         │
│  • Construct prompt + inline image                          │
│  • POST ke Gemini API REST endpoint                         │
│  • Timeout 20 detik                                         │
│  • Parse JSON response                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ (HTTPS)
┌─────────────────────────────────────────────────────────────┐
│                      GEMINI API                             │
│  Model: gemini-2.0-flash                                    │
│  Vision + Reasoning dalam 1 request                         │
│  Output: structured JSON (forced via responseMimeType)      │
└─────────────────────────────────────────────────────────────┘
                              │
                  Return JSON ke backend
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Backend validasi: is_receipt = true?                       │
│  • Bukan struk → return 422 + pesan error                   │
│  • Struk valid → return 200 + data                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ (HTTP)
┌─────────────────────────────────────────────────────────────┐
│  Frontend terima data:                                      │
│  { tanggal, merchant, total, kategori_saran, ... }          │
│        ↓                                                    │
│  Modal scan ditutup                                         │
│  openAddTransactionModal(onSuccess, null, prefillData)      │
│        ↓                                                    │
│  Form Tambah Transaksi auto-fill:                           │
│  • Tanggal       ← data.tanggal                             │
│  • Kategori      ← data.kategori_saran                      │
│  • Keterangan    ← data.merchant + ringkasan_item           │
│  • Nominal       ← data.total                               │
│  • Tipe          ← "expense" (default)                      │
└─────────────────────────────────────────────────────────────┘
                              │
            (4) User review, edit kalau perlu, klik Simpan
                              ↓
                     [Transaksi tersimpan]
```

---

## Arsitektur

### Endpoint API

| Method | Path | Auth | Body Limit |
|--------|------|------|-----------|
| POST | `/api/receipts/scan` | Bearer token (Firebase) | 6 MB |

**Request body:**
```json
{
  "image": "base64-encoded-string",
  "mimeType": "image/jpeg"
}
```

**Response sukses (200):**
```json
{
  "success": true,
  "data": {
    "is_receipt": true,
    "tanggal": "2025-05-24",
    "merchant": "Indomaret Jl. Sudirman",
    "total": 47500,
    "kategori_saran": "Belanja",
    "ringkasan_item": "Susu, roti, kopi sachet (3 item)"
  }
}
```

**Response error (4xx/5xx):**
```json
{ "error": "Pesan error yang user-friendly" }
```

---

## File Reference

### Backend

#### `backend/src/services/geminiService.js`

**Tugas:** komunikasi dengan Gemini API.

**Function utama:**
```js
async function extractReceiptData(imageBase64, mimeType)
```

**Flow internal:**
1. Cek `process.env.GEMINI_API_KEY` ada atau tidak
2. Construct request body: prompt teks + inline image base64
3. POST ke endpoint `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}`
4. Set `AbortController` dengan timeout 20 detik
5. Parse `candidates[0].content.parts[0].text` jadi JSON
6. Fallback: kalau output bukan JSON valid, coba ekstrak dengan regex `/\{[\s\S]*\}/`
7. Return objek terstruktur dengan field-field yang sudah dinormalisasi

**Prompt engineering kunci:**
- Eksplisit minta `is_receipt: true | false` agar AI bisa decline gambar bukan struk
- Eksplisit batasi kategori ke 5 opsi (sesuai kategori yang ada di form)
- Format tanggal `YYYY-MM-DD` (cocok dengan `<input type="date">`)
- Total dalam Rupiah tanpa pemisah ribuan (langsung jadi number)
- `temperature: 0.1` agar output deterministik
- `responseMimeType: 'application/json'` memaksa output JSON valid (tanpa wrapper markdown)

#### `backend/src/controllers/receiptController.js`

**Tugas:** validator + orchestrator antara request HTTP dan service.

**Validasi yang dilakukan:**
1. `image` harus ada dan tipe string
2. Ukuran base64 max ~5.5 MB (sebelum kirim ke Gemini)
3. MIME type harus salah satu dari: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
4. Strip prefix `data:image/...;base64,` kalau ada (hasil `canvas.toDataURL()` punya prefix)

**Special case:**
Kalau Gemini return `is_receipt: false`, controller return HTTP 422 dengan pesan friendly. Ini handle case user upload foto orang/pemandangan/dll.

#### `backend/src/routes/receiptRoutes.js`

Mount auth middleware + 1 route.

```js
router.use(authMiddleware);
router.post('/scan', receiptController.scanReceipt);
```

#### `backend/src/app.js` (modifikasi)

Body parser khusus untuk path `/api/receipts` dengan limit 6 MB:

```js
// HARUS dipasang SEBELUM global JSON parser supaya gak ke-reject
// duluan oleh limit kecil (2 MB)
app.use('/api/receipts', express.json({ limit: '6mb' }));
app.use(express.json({ limit: '2mb' })); // global parser tetap kecil
```

Endpoint lain tetap limit 2 MB untuk DoS protection. Hanya `/api/receipts` yang allow body besar (karena base64 image bisa 1-2 MB).

---

### Frontend

#### `src/components/scanReceipt.js` (NEW)

Komponen modal interaktif dengan 3 step:

**Step 1 — Pick (pilih sumber gambar):**
```html
<label>
  <i class="ph ph-camera"></i> Foto Struk (Kamera)
  <input type="file" accept="image/*" capture="environment" hidden>
</label>
<label>
  <i class="ph ph-upload-simple"></i> Upload dari Galeri
  <input type="file" accept="image/*" hidden>
</label>
```

Atribut `capture="environment"` di mobile langsung trigger kamera belakang. Di desktop, atribut ini di-ignore dan jadi file picker biasa.

**Step 2 — Preview:**
Setelah file dipilih, langsung di-compress lewat `compressImage()`. Tampilkan preview dengan info ukuran (`~150 KB siap dikirim`). Tombol `Ulangi` / `Scan dengan AI`.

**Step 3 — Loading:**
Spinner Phosphor `ph-circle-notch` dengan animasi `@keyframes scan-spin` (CSS inline dalam komponen). Pesan "Lagi baca strukmu... (5-10 detik)".

**Compress logic (Canvas API):**

```js
function compressImage(file) {
  // 1. FileReader baca file → DataURL
  // 2. Buat <img>, set src ke DataURL
  // 3. Hitung dimensi target (max 1280px, jaga aspect ratio)
  // 4. Buat <canvas> sesuai dimensi target
  // 5. ctx.drawImage(img, 0, 0, w, h)
  // 6. canvas.toDataURL('image/jpeg', 0.7)
  // 7. Strip prefix → base64 string
  // 8. Cleanup canvas (set w/h ke 0 untuk free memory)
  // Return: { base64, mimeType, sizeKb, previewDataUrl }
}
```

**Contoh kompresi nyata:**

| Input | Output |
|-------|--------|
| Foto kamera HP 12MP, ~4 MB JPEG | ~250 KB JPEG (1280×960, q70) |
| Screenshot 1080×1920 PNG, ~2 MB | ~180 KB JPEG |
| Foto digital camera, ~8 MB | ~300 KB JPEG |

#### `src/store.js` (modifikasi)

Method baru:
```js
async scanReceipt(base64, mimeType) { ... }
```

Tugas: panggil endpoint backend, handle error, return data terstruktur. Throw error dengan pesan user-friendly:
- Network error → "Gagal terhubung ke server"
- Server tidak return JSON valid → "Server merespons tidak valid"
- Backend return non-200 → forward `error` field dari backend
- Hasil tidak ada `success` atau `data` → "Hasil scan tidak lengkap"

#### `src/components/modal.js` (modifikasi)

Signature `openAddTransactionModal()` ditambah parameter ke-3:

```js
export function openAddTransactionModal(onSuccess, txToEdit = null, prefillData = null)
```

Logic:
- Jika **edit mode** (`txToEdit` ada) → pakai data transaksi lama (perilaku lama)
- Jika **add mode + ada prefillData** → apply data ke field
- Jika **add mode + tidak ada prefill** → form kosong (perilaku lama)

Field yang di-prefill:
- `<input id="tx-date">` ← `prefill.tanggal`
- `<select id="tx-kategori">` → option yang match `prefill.kategori` di-select
- `<input id="tx-keterangan">` ← `prefill.keterangan` (gabungan merchant + ringkasan)
- `<input id="tx-harga">` ← `prefill.harga` di-format dengan `Intl.NumberFormat('id-ID')`
- `<select id="tx-type">` ← default `expense` (struk = pengeluaran)

#### `src/main.js` (modifikasi)

Wire handler tombol FAM:
```js
import { openScanReceiptModal } from './components/scanReceipt.js';

document.getElementById('btn-fam-scan-receipt')?.addEventListener('click', () => {
  document.getElementById('fam-toggle').checked = false;
  openScanReceiptModal();
});
```

#### `index.html` (modifikasi)

Tombol FAM slot `--i: 3`:
```html
<div class="fam-item" style="--i: 3">
  <button class="fam-anchor bg-primary" id="btn-fam-scan-receipt"
          data-tooltip-left="Scan Struk">
    <i class="ph-fill ph-scan"></i>
  </button>
</div>
```

#### `src/css/components/buttons.css` (modifikasi)

- 4 slot FAM redistributed: 30° spacing, radius 95px desktop / 85px mobile
- Tooltip-left dan tooltip-top dapat `z-index: 100003`
- `.fam-item:hover` dapat `z-index: 100002 !important` agar tooltip tidak ke-cover button siblings

---

## Security & Error Handling

### Authentication

Semua request ke `/api/receipts/scan` wajib bawa Firebase token. Tanpa auth, request ditolak dengan 401. Ini mencegah penyalahgunaan API key Gemini oleh request anonymous.

### Validasi Berlapis

1. **Frontend** — file size max 10 MB, type harus image, compress sebelum kirim
2. **Backend body parser** — max 6 MB JSON
3. **Controller** — validate base64 size, MIME type whitelist
4. **Gemini** — punya safety filter sendiri (NSFW, dll.)

### Error Path Lengkap

| Error | HTTP | Pesan ke User |
|-------|------|---------------|
| Token expired/invalid | 401 | "Sesi habis, login ulang" |
| Body kosong / format salah | 400 | "Body harus berisi field image" |
| Image > 5.5 MB | 413 | "Gambar terlalu besar, compress dulu" |
| MIME tidak didukung | 400 | "Format gambar tidak didukung" |
| API key kosong | 500 | "GEMINI_API_KEY belum di-set" |
| Gemini timeout (>20s) | 504 | "Timeout: Gemini tidak respons" |
| Gemini API error | 502 | "Gemini API error (status code)" |
| Gambar bukan struk | 422 | "Gambar bukan struk belanja" |
| Gemini tidak return JSON | 422 | "Format hasil tidak valid" |

### Tidak Menyimpan Gambar

Backend **tidak pernah save image ke disk atau database**. Image hanya di RAM sebentar saat forward ke Gemini, kemudian di-buang. Manfaat:
- Hemat storage
- Hemat compliance (tidak menyimpan data sensitif user)
- Tidak ada residu file kalau request crash

---

## Optimisasi Memory & Performance

| Layer | Optimisasi | Impact |
|-------|-----------|--------|
| Browser | Canvas resize 1280px + JPEG q70 | 4 MB → ~250 KB (16× lebih kecil) |
| Browser | Canvas cleanup (`canvas.width = 0`) | Free memory setelah selesai |
| Browser | Tidak pakai `URL.createObjectURL` | Tidak perlu manual revoke |
| Network | Compression middleware (gzip) | Response size −60-70% |
| Backend | Tidak buffer ke disk | Lebih cepat, tidak ada I/O |
| Backend | Body limit per-route | Cuma `/api/receipts` allow 6 MB, lain 2 MB |
| Gemini | Model `gemini-2.0-flash` | Lebih cepat & murah dari Pro |
| Gemini | `temperature: 0.1` | Deterministik, hemat token re-roll |
| Gemini | `responseMimeType: application/json` | Output langsung valid JSON, tidak buang token markdown |

**Estimasi cost (Gemini free tier):**
- Per scan struk: ~1500 input tokens (image) + ~100 output tokens
- Free tier: 1.500 request/hari (cukup untuk personal app)
- Total cost: 0 IDR untuk usage normal

---

## Pertimbangan Desain

### Kenapa Gemini, bukan alternatif lain?

**❌ Tesseract.js (OCR open-source di browser)**
- Pros: gratis, no backend
- Cons:
  - Akurasi struk Indonesia jelek (font kasir thermal sering blur)
  - Cuma OCR → masih perlu parse manual (regex untuk total/tanggal/dll.)
  - Tidak paham context (`TOTAL` vs `SUBTOTAL` vs `DISKON`)
  - Bundle size 5+ MB
  - Lambat di HP (CPU intensive)

**❌ Google Cloud Vision API**
- Pros: akurasi tinggi
- Cons:
  - Cuma OCR (extract teks mentah)
  - Masih perlu parse manual
  - Setup lebih ribet (service account JSON, billing project, enable API)
  - 2-step process (OCR → parse) = lebih lambat

**❌ OpenAI GPT-4 Vision**
- Pros: akurasi bagus
- Cons:
  - Lebih mahal
  - Tidak ada free tier yang serius
  - Project sudah di ekosistem Google/Firebase

**✅ Google Gemini 2.0 Flash**
- Vision + reasoning dalam 1 call (OCR + structured extraction sekaligus)
- Free tier generous (1.500 request/hari)
- `responseMimeType: 'application/json'` → output langsung valid JSON
- Cepat (~3-5 detik per scan)
- Bagus baca struk Indonesia (training data include Asia)
- Sudah satu ekosistem dengan Firebase Auth

### Kenapa REST API langsung, bukan SDK?

- **Tidak nambah dependency** — `@google/generative-ai` SDK ~5 MB install
- Node 18+ punya `fetch` native (tidak perlu node-fetch)
- Lebih kontrol terhadap error handling (timeout, retry, abort)
- Lebih mudah maintain (kalau API berubah, edit 1 file saja)
- Code lebih eksplisit dan readable

### Kenapa auto-fill (bukan auto-save)?

User selalu butuh kesempatan review sebelum save karena:
1. AI bisa salah baca (terutama nominal)
2. User mungkin mau tambah/edit keterangan
3. Akun/dompet (Cash, OVO, dll.) tidak bisa dideteksi dari struk
4. Aman secara UX — user merasa kontrol

---

## Limitations

| # | Limitation | Workaround |
|---|-----------|------------|
| 1 | Foto blur/miring → AI bisa salah baca total | User retake foto |
| 2 | Struk tulisan tangan tidak terbaca dengan baik | Gemini akan return `is_receipt: false` atau data kosong, user input manual |
| 3 | Multi-currency tidak di-handle | Saat ini assume IDR. Kalau struk USD/EUR akan parse jadi angka tanpa konversi |
| 4 | Kategori dibatasi 5 opsi (sesuai form) | Custom kategori akan ter-map ke "Lainnya" |
| 5 | Item-by-item breakdown tidak di-extract | Hanya `ringkasan_item` (~60 char). 1 struk = 1 transaksi |
| 6 | Akun/dompet tidak di-prefill | User pilih manual karena tidak bisa dideteksi dari struk |
| 7 | Batas free tier Gemini (1.500/hari) | Personal use cukup. Production scale perlu upgrade ke paid |

---

## Pengembangan Lanjutan

Ide yang bisa di-explore di iterasi berikutnya:

### 1. Multi-item Transaction
1 struk → N transaksi (per line item). Cocok untuk user yang mau granular tracking ("kopi" vs "makanan utama" vs "dessert").

### 2. Auto-detect Metode Pembayaran
Kalau di struk ada keyword `QRIS GOPAY`, `OVO`, `DANA`, dll. → auto-pilih metode E-Wallet + akun yang sesuai. Update prompt Gemini untuk extract field `metode_pembayaran` dan `akun`.

### 3. History Scan
Simpan log scan struk di database (tanggal, gambar URL/hash, hasil ekstraksi, transaksi yang dibuat). Untuk audit trail dan re-train AI suatu saat.

### 4. Confidence Score
Minta Gemini kasih confidence score (0-1). Kalau low (< 0.7), tampilkan warning di modal untuk double-check.

### 5. Batch Scan
Upload beberapa struk sekaligus, proses parallel, tampilkan list hasil yang bisa di-confirm satu per satu.

### 6. Caching Hasil Scan
Hash gambar (SHA-256) → kalau gambar sama pernah di-scan, return cached result. Hemat quota Gemini.

### 7. OCR Fallback
Kalau Gemini error/quota habis, fallback ke Tesseract.js di browser. Akurasi lebih rendah tapi tetap berfungsi.

### 8. Vendor-specific Parsers
Detect merchant umum (Indomaret, Alfamart, KFC, dll.) dan pakai parser khusus dengan akurasi tinggi tanpa AI.

---

## Catatan Maintenance

- **Update model Gemini:** kalau ada model baru (misal `gemini-3.0-flash`), tinggal ubah konstanta `GEMINI_MODEL` di `geminiService.js`.
- **Tambah kategori:** update prompt di `geminiService.js` (bagian "kategori_saran") + form `<select id="tx-kategori">` di `modal.js`.
- **Update prompt:** semua di `geminiService.js` konstanta `PROMPT`. Setelah edit, test pakai struk variatif (Indomaret, restoran, e-commerce, transportasi) untuk memastikan output stabil.
- **Monitor cost:** cek dashboard Google AI Studio untuk usage harian. Set alert kalau mendekati limit.

---

**Last updated:** 2025-05-24
