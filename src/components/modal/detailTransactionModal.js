/**
 * @module detailTransactionModal
 * Read-only transaction detail bottom sheet.
 */
import { formatRupiah, formatDate } from '../../store.js';
import { getCategoryIconUrl } from '../../utils.js';
import { getContainer, bindModalEvents } from './modalCore.js';

export function openDetailTransactionModal(tx) {
  const container = getContainer();
  if (!tx || !container) return;

  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  const typeText = isTransfer ? 'Transfer' : isIncome ? 'Pemasukan' : 'Pengeluaran';
  const sign = isTransfer ? '' : isIncome ? '+' : '-';
  const formattedAmount = `${sign} ${formatRupiah(Math.abs(tx.harga))}`.trim();

  container.innerHTML = `
    <div class="detail-tx-overlay" id="detail-tx-overlay">
      <div class="detail-tx-content" id="detail-tx-content">
        <div class="detail-tx-handle"></div>

        <div class="modal-header" style="margin-bottom: 0; justify-content: center; text-align: center;">
          <h3 style="font-size: 1.2rem; font-weight: 700;">Detail Transaksi</h3>
        </div>

        <div class="detail-tx-body">
          <div style="text-align: center; padding: 1rem 0 1.25rem; border-bottom: 1px dashed var(--border); margin-bottom: 1.25rem;">
            <div class="detail-tx-icon-wrapper">
              <img src="${getCategoryIconUrl(tx.kategori, tx.type)}" alt="${tx.kategori || ''}" class="detail-tx-icon" />
            </div>
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; display: inline-block;">
              ${typeText}
            </span>
            <h2 style="font-size: 1.85rem; font-weight: 800; color: var(--text-main); margin: 0.25rem 0 0; letter-spacing: -0.02em; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums;">
              ${formattedAmount}
            </h2>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1.1rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Judul / Keterangan</span>
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-main); text-align: right; max-width: 60%; word-break: break-word;">${tx.keterangan || '-'}</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Tanggal</span>
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-main);">${formatDate(tx.tanggal)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Kategori</span>
              <span class="badge-soft" style="font-size: 0.78rem;"><img src="${getCategoryIconUrl(tx.kategori, tx.type)}" class="tx-cat-icon" alt="" /><span>${tx.kategori || 'Umum'}</span></span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Metode Pembayaran</span>
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-main);">${tx.metode || '-'}</span>
            </div>

            ${tx.akun ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Akun / Dompet</span>
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-main);">${tx.akun}</span>
            </div>
            ` : ''}
          </div>

          <div style="margin-top: 1.75rem; display: flex; gap: 0.75rem;">
            <button class="btn btn-outline btn-full" id="btn-close-detail-tx-footer" style="height: 46px; border-radius: 14px; font-weight: 600;">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const closeModal = bindModalEvents(container, 'detail-tx-overlay', ['btn-close-detail-tx-footer']);
  requestAnimationFrame(() => {
    document.getElementById('detail-tx-overlay')?.classList.add('active');
  });
}
