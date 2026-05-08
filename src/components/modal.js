import { store } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { initCustomSelects } from '../ui/select.js';
import { showToast } from './notifications.js';

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
        <form id="form-tambah" novalidate>
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
            <input type="text" class="form-control" id="tx-harga" placeholder="Contoh: 100.000,00" inputmode="decimal" required>
          </div>

          <button type="submit" class="btn btn-primary btn-full mt-md">${isEdit ? 'Simpan Perubahan' : 'Simpan Transaksi'}</button>
        </form>
      </div>
    </div>
  `;

  // Attach event listeners after content is in DOM
  setTimeout(() => {
    const hargaInput = document.getElementById('tx-harga');

    // Helper: format input ke gaya Indonesia (100.000,50)
    const formatIDRInput = (str) => {
      const parts = str.split(',');
      const intPart = parts[0].replace(/\D/g, '');
      const intFormatted = intPart ? new Intl.NumberFormat('id-ID').format(parseInt(intPart)) : '';
      return parts.length > 1 ? intFormatted + ',' + parts[1].replace(/\D/g, '').slice(0, 2) : intFormatted;
    };

    // Helper: parse format Indonesia ke float (100.000,50 -> 100000.50)
    const parseIDRInput = (str) => {
      if (!str) return 0;
      const normalized = str.replace(/\./g, '').replace(',', '.');
      return parseFloat(normalized) || 0;
    };
    
    // Real-time formatting
    hargaInput.addEventListener('input', (e) => {
      const rawValue = e.target.value;
      if (!rawValue.endsWith(',')) {
        e.target.value = formatIDRInput(rawValue);
      }
    });

    // Handle initial value formatting for edit mode
    if (isEdit) {
      const absHarga = Math.abs(txToEdit.harga);
      hargaInput.value = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absHarga);
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

      // Reset previous error states
      document.querySelectorAll('.form-control, .custom-select-trigger').forEach(el => el.classList.remove('is-invalid'));

      let isValid = true;

      const dateEl = document.getElementById('tx-date');
      if (!dateEl.value) {
        dateEl.classList.add('is-invalid');
        isValid = false;
      }

      const kategoriEl = document.getElementById('tx-kategori');
      const kategoriTrigger = kategoriEl.nextElementSibling?.querySelector('.custom-select-trigger');
      if (!kategoriEl.value) {
        kategoriTrigger?.classList.add('is-invalid');
        isValid = false;
      }

      const metodeEl = document.getElementById('tx-metode');
      const metodeTrigger = metodeEl.nextElementSibling?.querySelector('.custom-select-trigger');
      if (!metodeEl.value) {
        metodeTrigger?.classList.add('is-invalid');
        isValid = false;
      }

      const keteranganEl = document.getElementById('tx-keterangan');
      if (!keteranganEl.value.trim()) {
        keteranganEl.classList.add('is-invalid');
        isValid = false;
      }

      const hargaEl = document.getElementById('tx-harga');
      const hargaVal = parseIDRInput(hargaEl.value);
      if (!hargaEl.value || hargaVal <= 0) {
        hargaEl.classList.add('is-invalid');
        isValid = false;
      }

      if (!isValid) {
        showToast('Input Tidak Lengkap', 'Harap lengkapi semua kolom form dengan benar!', 'error');
        return;
      }

      const type = document.getElementById('tx-type').value;
      const date = dateEl.value;
      const kategori = kategoriEl.value;
      const metode = metodeEl.value;
      const keterangan = keteranganEl.value;
      let harga = hargaVal;
      
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
    <div class="modal-overlay" id="confirm-overlay" style="align-items: center;">
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

export function openAdjustBalanceModal(currentBalance, onSuccess) {
  const container = document.getElementById('modal-container');

  // Ambil offset yang sudah tersimpan sebelumnya (jika ada)
  const existingOffset = Number(store.user?.balanceOffset || 0);
  const displayedBalance = currentBalance; // sudah include offset dari getStats()

  const formattedBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 2
  }).format(displayedBalance);

  container.innerHTML = `
    <div class="modal-overlay" id="adjust-balance-overlay">
      <div class="modal-content" style="max-width: 420px;">
        <div class="modal-header">
          <h3 style="display:flex;align-items:center;gap:10px;">
            <i class="ph-fill ph-scales" style="color:var(--primary);"></i>
            Sesuaikan Tampilan Saldo
          </h3>
          <button class="modal-close" id="btn-close-adjust"><i class="ph ph-x"></i></button>
        </div>

        <div style="background:var(--bg-color);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.5rem;">
          <p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.35rem;">Saldo Tampil Sekarang</p>
          <p style="font-size:1.4rem;font-weight:800;color:var(--text-main);">${formattedBalance}</p>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">
            Ini hanya mengubah <strong>tampilan saldo</strong>. Tidak ada transaksi yang dibuat.
          </p>
        </div>

        <form id="form-adjust-balance">
          <div class="form-group">
            <label style="font-weight:700;">Saldo Riilmu Sekarang (Rp)</label>
            <div style="position: relative; width: 100%;">
              <input 
                type="text" 
                class="form-control" 
                id="input-real-balance" 
                placeholder="Contoh: 598.334,82" 
                inputmode="decimal"
                autocomplete="off"
                required
                style="padding-right: 40px;"
              >
              <button 
                type="button" 
                id="btn-clear-balance" 
                style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; display: none; align-items: center; justify-content: center; font-size: 1.25rem; padding: 0; transition: color 0.2s;"
                onmouseenter="this.style.color='var(--red)'"
                onmouseleave="this.style.color='var(--text-muted)'"
              >
                <i class="ph ph-x-circle"></i>
              </button>
            </div>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.4rem;">Gunakan <strong>koma</strong> untuk desimal. Contoh: <code style="background:var(--bg-color);padding:1px 5px;border-radius:4px;">598.334,82</code></p>
          </div>

          <div id="adjust-preview" style="display:none;border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;"></div>

          <div style="display:flex;gap:1rem;">
            <button type="button" class="btn btn-outline" style="flex:1;justify-content:center;" id="btn-cancel-adjust">Batal</button>
            <button type="submit" class="btn btn-primary" style="flex:1;justify-content:center;" id="btn-submit-adjust" disabled>
              <i class="ph ph-check-circle"></i> Terapkan
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };

  document.getElementById('btn-close-adjust').addEventListener('click', close);
  document.getElementById('btn-cancel-adjust').addEventListener('click', close);
  document.getElementById('adjust-balance-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'adjust-balance-overlay') close();
  });

  const input = document.getElementById('input-real-balance');
  const preview = document.getElementById('adjust-preview');
  const submitBtn = document.getElementById('btn-submit-adjust');
  const clearBtn = document.getElementById('btn-clear-balance');

  if (clearBtn) {
    clearBtn.onclick = () => {
      input.value = '';
      clearBtn.style.display = 'none';
      preview.style.display = 'none';
      submitBtn.disabled = true;
      input.focus();
    };
  }

  // Helper: parse "598.334,82" → 598334.82
  const parseIDR = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  };

  // Helper: format input real-time
  const formatIDRInput = (str) => {
    const parts = str.split(',');
    const intPart = parts[0].replace(/\D/g, '');
    const intFormatted = intPart ? new Intl.NumberFormat('id-ID').format(parseInt(intPart)) : '';
    return parts.length > 1 ? intFormatted + ',' + parts[1].replace(/\D/g, '').slice(0, 2) : intFormatted;
  };

  // Real-time preview
  input.addEventListener('input', (e) => {
    const rawValue = e.target.value;
    if (clearBtn) {
      clearBtn.style.display = rawValue ? 'flex' : 'none';
    }
    if (!rawValue.endsWith(',')) {
      e.target.value = formatIDRInput(rawValue);
    }

    const realBalance = parseIDR(e.target.value);
    const diff = realBalance - displayedBalance;

    if (e.target.value && diff !== 0) {
      const isDeficit = diff < 0;
      const absDiff = Math.abs(diff);
      const formattedDiff = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 2
      }).format(absDiff);

      preview.style.display = 'block';
      preview.style.background = isDeficit ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)';
      preview.style.border = isDeficit ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)';
      preview.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="ph-fill ${isDeficit ? 'ph-arrow-circle-down' : 'ph-arrow-circle-up'}" style="font-size:1.4rem;color:${isDeficit ? 'var(--red)' : 'var(--green)'}"></i>
          <div>
            <p style="font-size:0.78rem;font-weight:700;color:${isDeficit ? 'var(--red)' : 'var(--green)'}">
              Saldo akan disesuaikan ${isDeficit ? 'turun' : 'naik'} sebesar
            </p>
            <p style="font-size:1.1rem;font-weight:800;color:var(--text-main);">${formattedDiff}</p>
            <p style="font-size:0.72rem;color:var(--text-muted);">Hanya mengubah tampilan — tidak ada transaksi yang dibuat.</p>
          </div>
        </div>
      `;
      submitBtn.disabled = false;
    } else if (e.target.value && diff === 0) {
      preview.style.display = 'none';
      submitBtn.disabled = true;
    } else {
      preview.style.display = 'none';
      submitBtn.disabled = true;
    }
  });

  document.getElementById('form-adjust-balance').addEventListener('submit', async (e) => {
    e.preventDefault();
    const realBalance = parseIDR(input.value);
    // Hitung offset baru: selisih dari raw balance (tanpa offset sebelumnya) ke saldo riil
    const rawBalance = currentBalance - existingOffset;
    const newOffset = realBalance - rawBalance;

    close();
    showLoading();
    try {
      // Simpan ke profile user (lokal + backend), tidak bikin transaksi
      store.user.balanceOffset = newOffset;
      store.save();
      await store.updateProfile({ balanceOffset: newOffset });
    } finally {
      hideLoading();
      if (onSuccess) onSuccess();
    }
  });

  setTimeout(() => { input.focus(); }, 100);
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

export function openDeleteAccountModal(authProvider, onConfirm) {
  const container = document.getElementById('modal-container');
  const isGoogle = authProvider === 'google.com';

  container.innerHTML = `
    <div class="custom-alert-overlay" id="delete-acc-overlay">
      <div class="custom-alert-card" style="text-align: left; max-width: 450px;">
        <h3 style="color: var(--red); font-size: 1.25rem;">Hapus Akun & Data Permanen?</h3>
        <p style="margin-bottom: 1.5rem; font-size: 0.9rem;">Tindakan ini tidak dapat dibatalkan. Semua transaksi, anggaran, dan wishlist akan terhapus selamanya.</p>
        
        <form id="form-delete-acc">
          <div class="form-group">
            <label>${isGoogle ? 'Ketik "HAPUS" untuk konfirmasi' : 'Masukkan Password Anda'}</label>
            <input type="${isGoogle ? 'text' : 'password'}" class="form-control" id="delete-verify-input" required autocomplete="off" placeholder="${isGoogle ? 'HAPUS' : 'Password...'}">
          </div>
          
          <div style="display: flex; gap: 1rem; margin-top: 2rem;">
            <button type="button" class="btn btn-outline" style="flex: 1;" id="btn-cancel-delete">Batal</button>
            <button type="submit" class="btn btn-primary" style="flex: 1; background: var(--red); border-color: var(--red); color: white;">Hapus Permanen</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => { container.innerHTML = ''; };
  document.getElementById('btn-cancel-delete').addEventListener('click', close);
  
  document.getElementById('form-delete-acc').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('delete-verify-input').value;
    
    if (isGoogle && val !== 'HAPUS') {
      import('./notifications.js').then(m => m.showToast('Ketik kata HAPUS dengan huruf kapital', 'error'));
      return;
    }
    
    close();
    onConfirm(isGoogle ? null : val); // if local, return password
  });
  
  setTimeout(() => document.getElementById('delete-verify-input').focus(), 50);
}

