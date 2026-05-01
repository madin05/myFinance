import { store } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { initCustomSelects } from '../ui/select.js';

export function openAddTransactionModal(onSuccess, txToEdit = null) {
  const container = document.getElementById('modal-container');
  const isEdit = !!txToEdit;
  
  container.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}</h3>
          <button class="modal-close" id="btn-close-modal"><i class="ph ph-x"></i></button>
        </div>
        <form id="form-tambah">
          <div class="form-group">
            <label>Tipe Transaksi</label>
            <select class="form-control" id="tx-type" required>
              <option value="expense" ${isEdit && txToEdit.type === 'expense' ? 'selected' : ''}>Pengeluaran</option>
              <option value="income" ${isEdit && txToEdit.type === 'income' ? 'selected' : ''}>Pemasukan</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Tanggal</label>
            <input type="date" class="form-control" id="tx-date" required value="${isEdit ? txToEdit.tanggal : ''}">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Kategori</label>
              <select class="form-control" id="tx-kategori" required>
                <option value="" disabled ${!isEdit ? 'selected' : ''}>Pilih Kategori</option>
                <option value="Makanan & Minuman" ${isEdit && txToEdit.kategori === 'Makanan & Minuman' ? 'selected' : ''}>Makanan & Minuman</option>
                <option value="Transportasi" ${isEdit && txToEdit.kategori === 'Transportasi' ? 'selected' : ''}>Transportasi</option>
                <option value="Belanja" ${isEdit && txToEdit.kategori === 'Belanja' ? 'selected' : ''}>Belanja</option>
                <option value="Gaji" ${isEdit && txToEdit.kategori === 'Gaji' ? 'selected' : ''}>Gaji</option>
                <option value="Investasi" ${isEdit && txToEdit.kategori === 'Investasi' ? 'selected' : ''}>Investasi</option>
                <option value="Tagihan" ${isEdit && txToEdit.kategori === 'Tagihan' ? 'selected' : ''}>Tagihan</option>
                <option value="Lainnya" ${isEdit && txToEdit.kategori === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
              </select>
            </div>
            <div class="form-group">
              <label>Metode</label>
              <select class="form-control" id="tx-metode" required>
                <option value="" disabled ${!isEdit ? 'selected' : ''}>Pilih Metode</option>
                <option value="Cash" ${isEdit && txToEdit.metode === 'Cash' ? 'selected' : ''}>Cash</option>
                <option value="E-Wallet" ${isEdit && txToEdit.metode === 'E-Wallet' ? 'selected' : ''}>E-Wallet</option>
                <option value="Bank Transfer" ${isEdit && txToEdit.metode === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                <option value="Kartu Kredit" ${isEdit && txToEdit.metode === 'Kartu Kredit' ? 'selected' : ''}>Kartu Kredit</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Keterangan</label>
            <input type="text" class="form-control" id="tx-keterangan" placeholder="Keterangan transaksi..." required value="${isEdit ? txToEdit.keterangan : ''}">
          </div>

          <div class="form-group">
            <label>Nominal (Rp)</label>
            <input type="text" class="form-control" id="tx-harga" placeholder="0" required>
          </div>

          <button type="submit" class="btn btn-primary btn-full mt-md">${isEdit ? 'Simpan Perubahan' : 'Simpan Transaksi'}</button>
        </form>
      </div>
    </div>
  `;

  // Attach event listeners after content is in DOM
  setTimeout(() => {
    const hargaInput = document.getElementById('tx-harga');
    
    // Real-time formatting
    hargaInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value) {
        value = new Intl.NumberFormat('id-ID').format(value);
        e.target.value = value;
      }
    });

    // Handle initial value formatting for edit mode
    if (isEdit) {
      hargaInput.value = new Intl.NumberFormat('id-ID').format(Math.abs(txToEdit.harga));
    }

    // Set default date to today if not editing
    if (!isEdit) {
      document.getElementById('tx-date').valueAsDate = new Date();
    }

    // Close handlers
    const closeModal = () => {
      container.innerHTML = '';
    };
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });

    // Submit handler
    document.getElementById('form-tambah').addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('tx-type').value;
      const date = document.getElementById('tx-date').value;
      const kategori = document.getElementById('tx-kategori').value;
      const metode = document.getElementById('tx-metode').value;
      const keterangan = document.getElementById('tx-keterangan').value;
      // Strip dots before converting to number
      let harga = Number(document.getElementById('tx-harga').value.replace(/\./g, ''));
      
      if (type === 'expense') {
        harga = -Math.abs(harga);
      } else {
        harga = Math.abs(harga);
      }

      const payload = {
        tanggal: date,
        kategori,
        metode,
        keterangan,
        harga,
        type
      };

      showLoading();
      
      setTimeout(() => {
        if (isEdit) {
          store.updateTransaction(txToEdit.id, payload);
        } else {
          store.addTransaction(payload);
        }

        hideLoading();
        closeModal();
        if (onSuccess) onSuccess();
      }, 1000);
    });

    initCustomSelects(document.getElementById('form-tambah'));
  }, 0);
}

export function openConfirmModal(title, message, onConfirm) {
  const container = document.getElementById('modal-container');
  
  container.innerHTML = `
    <div class="modal-overlay" id="confirm-overlay">
      <div class="modal-content" style="max-width: 400px; text-align: center; padding: 2.5rem;">
        <div class="icon-box bg-red-light text-red" style="margin: 0 auto 1.5rem; width: 64px; height: 64px; font-size: 2rem; border-radius: 20px;">
          <i class="ph ph-trash"></i>
        </div>
        <h3 class="mb-md" style="font-size: 1.25rem;">${title}</h3>
        <p class="text-muted mb-lg" style="font-size: 0.95rem;">${message}</p>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-outline" style="flex: 1; justify-content: center;" id="btn-cancel-confirm">Batal</button>
          <button class="btn btn-primary" style="flex: 1; justify-content: center; background-color: var(--red); border-color: var(--red);" id="btn-do-confirm">Ya, Hapus</button>
        </div>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };

  document.getElementById('btn-cancel-confirm').addEventListener('click', close);
  document.getElementById('btn-do-confirm').addEventListener('click', () => {
    close();
    showLoading();
    setTimeout(() => {
      onConfirm();
      hideLoading();
    }, 1000);
  });
  document.getElementById('confirm-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'confirm-overlay') close();
  });

  // Handle Enter to confirm
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-do-confirm').click();
      window.removeEventListener('keydown', handleKeyDown);
    } else if (e.key === 'Escape') {
      close();
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
}

export function openEditUsernameModal(currentName, onUpdate) {
  const container = document.getElementById('modal-container');
  
  container.innerHTML = `
    <div class="modal-overlay" id="edit-name-overlay">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>Ubah Username</h3>
          <button class="modal-close" id="btn-close-edit-name"><i class="ph ph-x"></i></button>
        </div>
        <form id="form-edit-name">
          <div class="form-group">
            <label>Username Baru</label>
            <input type="text" class="form-control" id="new-username" value="${currentName}" placeholder="Masukkan username..." required autocomplete="off">
          </div>
          <div style="display: flex; gap: 1rem;">
            <button type="button" class="btn btn-outline" style="flex: 1; justify-content: center;" id="btn-cancel-edit-name">Batal</button>
            <button type="submit" class="btn btn-primary" style="flex: 1; justify-content: center;">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };

  document.getElementById('btn-close-edit-name').addEventListener('click', close);
  document.getElementById('btn-cancel-edit-name').addEventListener('click', close);
  document.getElementById('edit-name-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'edit-name-overlay') close();
  });

  document.getElementById('form-edit-name').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('new-username').value.trim();
    if (newName && newName !== currentName) {
      close();
      onUpdate(newName);
    } else {
      close();
    }
  });

  // Focus input
  setTimeout(() => {
    document.getElementById('new-username').focus();
    document.getElementById('new-username').select();
  }, 0);
}

