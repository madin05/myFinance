/**
 * @module transactionModal
 * Add / Edit Transaction modal — the primary data-entry modal.
 */
import { store } from '../../store.js';
import { showLoading, hideLoading } from '../../utils.js';
import { initCustomSelects } from '../../ui/select.js';
import { showToast, checkVerification } from '../notifications.js';
import { getContainer, bindModalEvents, parseIDRInput, formatIDRInput } from './modalCore.js';

// --- PRESET DATA ---

const PAYMENT_ACCOUNT_PRESETS = {
  'E-Wallet': [
    { name: 'Gopay', logo: '/assets/banks/gopay.svg' },
    { name: 'OVO', logo: '/assets/banks/ovo.png' },
    { name: 'DANA', logo: '/assets/banks/dana.png' },
    { name: 'ShopeePay', logo: '/assets/banks/shopeepay.png' },
    { name: 'LinkAja', logo: '/assets/banks/linkaja.svg' },
    { name: 'Lainnya (Ketik Manual)', logo: '' }
  ],
  'Bank': [
    { name: 'BCA', logo: '/assets/banks/bca.png' },
    { name: 'Bank Mandiri', logo: '/assets/banks/mandiri.png' },
    { name: 'BNI', logo: '/assets/banks/bni.png' },
    { name: 'BRI', logo: '/assets/banks/bri.png' },
    { name: 'BSI', logo: '/assets/banks/bsi.png' },
    { name: 'Bank Jago', logo: '/assets/banks/jago.png' },
    { name: 'SeaBank', logo: '/assets/banks/seabank.svg' },
    { name: 'Bank Blu', logo: '/assets/banks/blubca.svg' },
    { name: 'Lainnya (Ketik Manual)', logo: '' }
  ],
  'Cash': [
    { name: 'Dompet', logo: '' },
    { name: 'Brankas', logo: '' },
    { name: 'Uang Tunai', logo: '' },
    { name: 'Lainnya (Ketik Manual)', logo: '' }
  ]
};

const KATEGORI_LIST = [
  'Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan',
  'Hiburan', 'Kesehatan', 'Pendidikan', 'Investasi & Tabungan',
  'Gaji & Pendapatan', 'Lain-lain'
];

// --- HELPERS ---

function buildSelectOptions(items, selectedVal = '') {
  return items.map(item => {
    const val = typeof item === 'string' ? item : item.name || item;
    return `<option value="${val}" ${selectedVal === val ? 'selected' : ''}>${val}</option>`;
  }).join('');
}

function resolvePresetKey(metode) {
  if (metode === 'E-Wallet') return 'E-Wallet';
  if (metode === 'Bank Transfer' || metode === 'Kartu Kredit') return 'Bank';
  return 'Cash';
}

// --- MODAL ---

export function openAddTransactionModal(onSuccess, txToEdit = null, prefillData = null) {
  let allowed = false;
  checkVerification(() => { allowed = true; });
  if (!allowed) return;

  const container = getContainer();
  if (!container) return;

  const isEdit = !!txToEdit;
  const prefill = !isEdit && prefillData ? prefillData : null;
  const initialType = isEdit ? txToEdit.type : (prefill?.type || 'expense');

  const getAccountOptions = (selectedVal = '') => {
    const list = (store.saldos && store.saldos.length > 0)
      ? store.saldos.map(s => s.name)
      : ['Cash', 'BCA', 'Bank Mandiri', 'GoPay', 'OVO', 'DANA', 'ShopeePay'];
    return buildSelectOptions(list, selectedVal);
  };

  const getMetodeOptions = () => {
    const currentVal = isEdit ? txToEdit.metode : (prefill?.metode || '');
    return buildSelectOptions(['Cash', 'E-Wallet', 'Bank Transfer', 'Kartu Kredit'], currentVal);
  };

  const getKategoriOptions = () => {
    const currentVal = isEdit ? txToEdit.kategori : (prefill?.kategori || '');
    return buildSelectOptions(KATEGORI_LIST, currentVal);
  };

  container.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}</h3>
        </div>
        <form id="form-tambah">
          <div class="form-group">
            <label>Tipe Transaksi</label>
            <select class="form-control" id="tx-type" required>
              <option value="expense" ${initialType === 'expense' ? 'selected' : ''}>Pengeluaran</option>
              <option value="income" ${initialType === 'income' ? 'selected' : ''}>Pemasukan</option>
              <option value="transfer" ${initialType === 'transfer' ? 'selected' : ''}>Transfer</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Tanggal</label>
            <input type="date" class="form-control" id="tx-date" required value="${isEdit ? txToEdit.tanggal : (prefill?.tanggal || '')}">
          </div>

          <div id="group-standard-fields" style="display: ${initialType === 'transfer' ? 'none' : 'flex'}; gap: 1rem;">
            <div class="form-group" style="flex: 1;">
              <label>Kategori</label>
              <select class="form-control" id="tx-kategori" required>
                <option value="" disabled ${!isEdit && !prefill?.kategori ? 'selected' : ''}>Pilih Kategori</option>
                ${getKategoriOptions()}
              </select>
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label>Metode</label>
              <select class="form-control" id="tx-metode" required>
                <option value="" disabled ${!isEdit ? 'selected' : ''}>Pilih Metode</option>
                ${getMetodeOptions()}
              </select>
            </div>
          </div>

          <div id="group-transfer-fields" style="display: ${initialType === 'transfer' ? 'flex' : 'none'}; gap: 1rem;">
            <div class="form-group" style="flex: 1;">
              <label>Dari Akun / Saldo</label>
              <select class="form-control" id="tx-transfer-from">
                <option value="" disabled ${!isEdit ? 'selected' : ''}>Pilih Akun Asal</option>
                ${getAccountOptions(isEdit ? (txToEdit.dariAkun || txToEdit.akun) : '')}
              </select>
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label>Ke Akun / Saldo</label>
              <select class="form-control" id="tx-transfer-to">
                <option value="" disabled ${!isEdit ? 'selected' : ''}>Pilih Akun Tujuan</option>
                ${getAccountOptions(isEdit ? txToEdit.keAkun : '')}
              </select>
            </div>
          </div>

          <div class="form-group" id="group-tx-akun" style="display: none;">
            <label id="label-tx-akun">Pilih Akun / Dompet</label>
            <select class="form-control" id="tx-akun">
              <option value="" disabled selected>Pilih Akun</option>
            </select>
          </div>

          <div class="form-group">
            <label>Keterangan</label>
            <input type="text" class="form-control" id="tx-keterangan" placeholder="Keterangan transaksi..." required value="${isEdit ? (txToEdit.keterangan || '') : (prefill?.keterangan || '')}">
          </div>

          <div class="form-group">
            <label>Nominal (Rp)</label>
            <input type="text" class="form-control" id="tx-harga" placeholder="Contoh: 100.000,00" inputmode="decimal" required>
          </div>

          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-outline" style="flex: 1; justify-content: center;" id="btn-cancel-modal">Batal</button>
            <button type="submit" class="btn btn-primary" style="flex: 1; justify-content: center;">${isEdit ? 'Simpan Perubahan' : 'Tambah Transaksi'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Ghost fix: removed non-existent 'btn-close-modal' from closeBtnIds
  const closeModal = bindModalEvents(container, 'modal-overlay', ['btn-cancel-modal']);

  setTimeout(() => {
    const hargaInput = document.getElementById('tx-harga');

    hargaInput.addEventListener('input', (e) => {
      if (!e.target.value.endsWith(',')) {
        e.target.value = formatIDRInput(e.target.value);
      }
    });

    if (isEdit) {
      hargaInput.value = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(txToEdit.harga));
    } else if (prefill?.harga) {
      const absHarga = Math.abs(Number(prefill.harga) || 0);
      if (absHarga > 0) hargaInput.value = new Intl.NumberFormat('id-ID').format(absHarga);
    }

    if (!isEdit && !prefill?.tanggal) {
      document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    }

    const metodeEl = document.getElementById('tx-metode');
    const akunGroup = document.getElementById('group-tx-akun');
    const akunEl = document.getElementById('tx-akun');

    const updateAkunOptions = () => {
      const type = metodeEl.value;
      const oldWrapper = akunEl.nextElementSibling;
      if (oldWrapper?.classList.contains('custom-select-wrapper')) {
        oldWrapper.remove();
        akunEl.classList.remove('custom-select-hidden');
      }

      if (!type) {
        akunGroup.style.display = 'none';
        akunEl.required = false;
        return;
      }
      
      const targetType = resolvePresetKey(type);
      const presetList = PAYMENT_ACCOUNT_PRESETS[targetType] || [];

      if (presetList.length > 0) {
        akunEl.innerHTML = '<option value="" disabled selected>Pilih Akun</option>' + 
          presetList.map(s => `<option value="${s.name}" data-logo="${s.logo}" ${isEdit && txToEdit.akun === s.name ? 'selected' : ''}>${s.name}</option>`).join('');
        akunGroup.style.display = 'block';
        akunEl.required = true;
      } else {
        akunGroup.style.display = 'none';
        akunEl.required = false;
        akunEl.innerHTML = '<option value="" disabled selected>Pilih Akun</option>';
      }
      initCustomSelects(akunGroup);
    };

    metodeEl.addEventListener('change', updateAkunOptions);
    if (isEdit || prefill?.metode) updateAkunOptions();

    const typeEl = document.getElementById('tx-type');
    const stdGroup = document.getElementById('group-standard-fields');
    const transferGroup = document.getElementById('group-transfer-fields');
    const transferFromEl = document.getElementById('tx-transfer-from');
    const transferToEl = document.getElementById('tx-transfer-to');
    const kategoriEl = document.getElementById('tx-kategori');
    const keteranganEl = document.getElementById('tx-keterangan');

    const handleTypeChange = () => {
      const currentType = typeEl.value;
      if (currentType === 'transfer') {
        stdGroup.style.display = 'none';
        akunGroup.style.display = 'none';
        transferGroup.style.display = 'flex';
        kategoriEl.required = false;
        metodeEl.required = false;
        akunEl.required = false;
        transferFromEl.required = true;
        transferToEl.required = true;
        
        [transferFromEl, transferToEl].forEach(el => {
          const oldW = el.nextElementSibling;
          if (oldW?.classList.contains('custom-select-wrapper')) {
            oldW.remove();
            el.classList.remove('custom-select-hidden');
          }
        });
        initCustomSelects(transferGroup);
      } else {
        stdGroup.style.display = 'flex';
        transferGroup.style.display = 'none';
        kategoriEl.required = true;
        metodeEl.required = true;
        transferFromEl.required = false;
        transferToEl.required = false;
        updateAkunOptions();
      }
    };

    typeEl.addEventListener('change', handleTypeChange);
    if (isEdit && txToEdit.type === 'transfer') handleTypeChange();

    document.getElementById('form-tambah').addEventListener('submit', (e) => {
      e.preventDefault();
      document.querySelectorAll('.form-control, .custom-select-trigger').forEach(el => el.classList.remove('is-invalid'));

      let isValid = true;
      const type = typeEl.value;
      const dateEl = document.getElementById('tx-date');

      if (!dateEl.value) {
        dateEl.classList.add('is-invalid');
        isValid = false;
      }

      let payload = {};

      if (type === 'transfer') {
        const fromAkun = transferFromEl.value;
        const toAkun = transferToEl.value;

        if (!fromAkun) {
          transferFromEl.nextElementSibling?.querySelector('.custom-select-trigger')?.classList.add('is-invalid');
          isValid = false;
        }
        if (!toAkun) {
          transferToEl.nextElementSibling?.querySelector('.custom-select-trigger')?.classList.add('is-invalid');
          isValid = false;
        }

        if (!isValid) {
          showToast('Input Tidak Lengkap', 'Harap pilih akun asal dan akun tujuan transfer!', 'error');
          return;
        }

        if (fromAkun === toAkun) {
          transferFromEl.nextElementSibling?.querySelector('.custom-select-trigger')?.classList.add('is-invalid');
          transferToEl.nextElementSibling?.querySelector('.custom-select-trigger')?.classList.add('is-invalid');
          showToast('Akun Sama', 'Akun asal dan akun tujuan transfer tidak boleh sama!', 'error');
          return;
        }

        const hargaVal = parseIDRInput(hargaInput.value);
        if (!hargaInput.value || hargaVal <= 0) {
          hargaInput.classList.add('is-invalid');
          showToast('Input Tidak Lengkap', 'Harap masukkan nominal transfer yang valid!', 'error');
          return;
        }

        payload = {
          tanggal: dateEl.value,
          kategori: 'Transfer',
          metode: `Transfer (${fromAkun} → ${toAkun})`,
          akun: fromAkun,
          dariAkun: fromAkun,
          keAkun: toAkun,
          keterangan: keteranganEl.value.trim() || `Transfer dari ${fromAkun} ke ${toAkun}`,
          harga: Math.abs(hargaVal),
          type: 'transfer'
        };
      } else {
        if (!kategoriEl.value) {
          kategoriEl.nextElementSibling?.querySelector('.custom-select-trigger')?.classList.add('is-invalid');
          isValid = false;
        }
        if (!metodeEl.value) {
          metodeEl.nextElementSibling?.querySelector('.custom-select-trigger')?.classList.add('is-invalid');
          isValid = false;
        }
        if (akunEl.required && !akunEl.value) {
          akunEl.nextElementSibling?.querySelector('.custom-select-trigger')?.classList.add('is-invalid');
          isValid = false;
        }
        if (!keteranganEl.value.trim()) {
          keteranganEl.classList.add('is-invalid');
          isValid = false;
        }

        const hargaVal = parseIDRInput(hargaInput.value);
        if (!hargaInput.value || hargaVal <= 0) {
          hargaInput.classList.add('is-invalid');
          isValid = false;
        }

        if (!isValid) {
          showToast('Input Tidak Lengkap', 'Harap lengkapi semua kolom form dengan benar!', 'error');
          return;
        }

        payload = {
          tanggal: dateEl.value,
          kategori: kategoriEl.value,
          metode: metodeEl.value,
          akun: akunEl.value || '',
          keterangan: keteranganEl.value.trim(),
          harga: (type === 'expense') ? -Math.abs(hargaVal) : Math.abs(hargaVal),
          type
        };
      }

      showLoading();
      setTimeout(() => {
        if (isEdit) {
          store.updateTransaction(txToEdit.id, payload);
          showToast('Transaksi berhasil diperbarui!', 'success');
        } else {
          store.addTransaction(payload);
          showToast('Transaksi baru berhasil disimpan!', 'success');
        }

        hideLoading();
        closeModal();
        if (onSuccess) onSuccess();
      }, 800);
    });

    initCustomSelects(document.getElementById('form-tambah'));
  }, 0);
}
