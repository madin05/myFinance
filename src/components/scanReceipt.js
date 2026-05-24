// src/components/scanReceipt.js
// Modal scan struk: pilih file / capture kamera → compress → kirim ke /api/receipts/scan
// → setelah dapat data, buka modal Add Transaction dengan prefill.

import { store } from '../store.js';
import { showToast } from './notifications.js';
import { openAddTransactionModal } from './modal.js';

const MAX_DIMENSION = 1280;     // Resize max sisi panjang (px)
const JPEG_QUALITY = 0.7;        // Kualitas JPEG (0-1)
const MAX_FILE_SIZE_MB = 10;     // Reject langsung kalau > 10MB raw

/**
 * Compress + resize gambar pakai Canvas API.
 * Return Promise<{ base64: string, mimeType: string, sizeKb: number }>
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File yang dipilih bukan gambar.'));
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return reject(new Error(`Gambar terlalu besar. Maksimal ${MAX_FILE_SIZE_MB}MB.`));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Hitung dimensi target (jaga aspect ratio)
        let { width, height } = img;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Selalu output JPEG biar konsisten & ukuran kecil
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        const base64 = dataUrl.split(',')[1];
        const sizeKb = Math.round((base64.length * 3) / 4 / 1024);

        // Cleanup
        canvas.width = 0;
        canvas.height = 0;

        resolve({ base64, mimeType: 'image/jpeg', sizeKb, previewDataUrl: dataUrl });
      };
      img.onerror = () => reject(new Error('Gagal load gambar. File mungkin korup.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal baca file.'));
    reader.readAsDataURL(file);
  });
}

export function openScanReceiptModal() {
  const container = document.getElementById('modal-container');

  container.innerHTML = `
    <div class="modal-overlay" id="scan-modal-overlay">
      <div class="modal-content" style="max-width: 480px;">
        <div class="modal-header">
          <h3><i class="ph ph-receipt" style="margin-right: 6px;"></i> Scan Struk Belanja</h3>
          <button class="modal-close" id="btn-close-scan-modal"><i class="ph ph-x"></i></button>
        </div>

        <div id="scan-step-pick">
          <p class="text-muted text-xs" style="margin-bottom: 1rem;">
            Foto atau upload struk belanja. AI akan otomatis isi form transaksi untuk kamu.
          </p>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <label class="btn btn-primary btn-full" style="cursor: pointer; margin: 0;">
              <i class="ph ph-camera"></i> Foto Struk (Kamera)
              <input type="file" id="scan-input-camera" accept="image/*" capture="environment" style="display: none;">
            </label>
            <label class="btn btn-outline btn-full" style="cursor: pointer; margin: 0;">
              <i class="ph ph-upload-simple"></i> Upload dari Galeri
              <input type="file" id="scan-input-gallery" accept="image/*" style="display: none;">
            </label>
          </div>

          <p class="text-muted" style="font-size: 0.7rem; text-align: center; margin-top: 1rem;">
            Maks ${MAX_FILE_SIZE_MB}MB &middot; JPG / PNG / WebP
          </p>
        </div>

        <div id="scan-step-preview" style="display: none;">
          <div style="text-align: center; margin-bottom: 1rem;">
            <img id="scan-preview-img" src="" alt="Preview struk"
              style="max-width: 100%; max-height: 280px; border-radius: 12px; border: 1px solid var(--border);">
            <p class="text-muted" id="scan-preview-info" style="font-size: 0.7rem; margin-top: 0.5rem;"></p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-outline" id="btn-scan-retake" style="flex: 1;">
              <i class="ph ph-arrow-counter-clockwise"></i> Ulangi
            </button>
            <button class="btn btn-primary" id="btn-scan-submit" style="flex: 2;">
              <i class="ph ph-sparkle"></i> Scan dengan AI
            </button>
          </div>
        </div>

        <div id="scan-step-loading" style="display: none; text-align: center; padding: 1.5rem 0.5rem;">
          <video
            src="/assets/coin.webm"
            autoplay
            loop
            muted
            playsinline
            style="width: 100px; height: 100px; object-fit: contain; display: block; margin: 0 auto;"
          ></video>
          <p style="font-weight: 600; margin: 1rem 0 0.25rem;">Lagi baca strukmu...</p>
          <p class="text-muted text-xs">Biasanya selesai dalam 5-10 detik.</p>
        </div>
      </div>
    </div>
  `;

  let compressed = null;

  const stepPick = container.querySelector('#scan-step-pick');
  const stepPreview = container.querySelector('#scan-step-preview');
  const stepLoading = container.querySelector('#scan-step-loading');
  const previewImg = container.querySelector('#scan-preview-img');
  const previewInfo = container.querySelector('#scan-preview-info');

  const showStep = (step) => {
    stepPick.style.display = step === 'pick' ? 'block' : 'none';
    stepPreview.style.display = step === 'preview' ? 'block' : 'none';
    stepLoading.style.display = step === 'loading' ? 'block' : 'none';
  };

  const closeModal = () => {
    container.innerHTML = '';
  };

  const handleFile = async (file) => {
    if (!file) return;
    try {
      showStep('preview');
      previewInfo.textContent = 'Memproses...';
      const result = await compressImage(file);
      compressed = result;
      previewImg.src = result.previewDataUrl;
      previewInfo.textContent = `~${result.sizeKb} KB siap dikirim`;
    } catch (err) {
      showToast('Error', err.message, 'error');
      showStep('pick');
    }
  };

  container.querySelector('#scan-input-camera').addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
  });
  container.querySelector('#scan-input-gallery').addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
  });

  container.querySelector('#btn-scan-retake').addEventListener('click', () => {
    compressed = null;
    showStep('pick');
  });

  container.querySelector('#btn-scan-submit').addEventListener('click', async () => {
    if (!compressed) return;
    showStep('loading');
    try {
      const data = await store.scanReceipt(compressed.base64, compressed.mimeType);
      // Sukses → close modal scan, buka modal Add Tx dengan prefill
      closeModal();
      showToast('Berhasil!', 'Data struk berhasil diekstrak. Tinggal review & simpan.', 'success');
      openAddTransactionModal(
        () => {
          // Refresh halaman aktif kalau di transaksi/dashboard
          const path = window.location.pathname || '/dashboard';
          if (path === '/dashboard' || path === '/transaksi') {
            window.dispatchEvent(new CustomEvent('routechange'));
          }
        },
        null,
        {
          tanggal: data.tanggal,
          kategori: data.kategori_saran,
          keterangan: data.merchant
            ? `${data.merchant}${data.ringkasan_item ? ' - ' + data.ringkasan_item : ''}`
            : data.ringkasan_item,
          harga: data.total,
          type: 'expense'
        }
      );
    } catch (err) {
      const msg = err?.message || 'Gagal scan struk.';
      showToast('Gagal Scan', msg, 'error');
      showStep('preview');
    }
  });

  container.querySelector('#btn-close-scan-modal').addEventListener('click', closeModal);
  container.querySelector('#scan-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'scan-modal-overlay') closeModal();
  });

  showStep('pick');
}
