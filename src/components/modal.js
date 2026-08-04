import { store, formatRupiah, formatDate } from '../store.js';
import { showLoading, hideLoading, getCategoryIconUrl } from '../utils.js';
import { initCustomSelects } from '../ui/select.js';
import { showToast, checkVerification } from './notifications.js';

// --- SHARED MODAL HELPERS & UTILITIES ---
function getContainer() {
  return document.getElementById('modal-container');
}

export function animateCloseModal(container, callback) {
  const target = container || getContainer();
  if (!target) return;

  const card = target.querySelector('.modal-content, .custom-alert-card, #calc-card, .detail-tx-content, .quick-action-card');
  const overlay = target.querySelector('.modal-overlay, .custom-alert-overlay, .detail-tx-overlay');

  if (window.innerWidth <= 768) {
    if (card) {
      card.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      card.style.transform = 'translateY(100%)';
    }
    if (overlay) {
      overlay.style.transition = 'opacity 0.28s ease';
      overlay.style.opacity = '0';
    }
  } else {
    if (card) {
      card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      card.style.transform = 'scale(0.95)';
      card.style.opacity = '0';
    }
    if (overlay) {
      overlay.style.transition = 'opacity 0.2s ease';
      overlay.style.opacity = '0';
    }
  }

  setTimeout(() => {
    target.innerHTML = '';
    if (callback) callback();
  }, 280);
}

function bindModalEvents(container, overlayId, closeBtnIds = [], onDismiss = null) {
  const overlay = document.getElementById(overlayId);

  let cleanupTouch = () => {};

  const close = () => {
    window.removeEventListener('keydown', handleKey);
    cleanupTouch();
    animateCloseModal(container, onDismiss);
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') close();
  };

  window.addEventListener('keydown', handleKey);

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  closeBtnIds.forEach(id => {
    document.getElementById(id)?.addEventListener('click', close);
  });

  // Touch Swipe-Down to Dismiss gesture for mobile bottom sheet
  const sheet = container?.querySelector('.modal-content, .detail-tx-content, .custom-alert-card, .quick-action-card, #calc-card');
  if (sheet) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const getScrollEl = () => {
      const el = sheet.querySelector('.modal-body, form');
      return (el && el.scrollHeight > el.clientHeight + 5) ? el : sheet;
    };

    const onTouchStart = (e) => {
      if (window.innerWidth > 768) return;
      const scrollEl = getScrollEl();
      if (scrollEl && scrollEl.scrollTop > 5) return;

      startY = e.touches[0].clientY;
      currentY = startY;
      isDragging = true;
      sheet.style.transition = 'none';
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;
      const deltaY = e.touches[0].clientY - startY;
      if (deltaY > 0) {
        currentY = e.touches[0].clientY;
        sheet.style.transform = `translateY(${deltaY}px)`;
        if (e.cancelable) e.preventDefault();
      } else {
        isDragging = false;
        sheet.style.transform = '';
      }
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;

      if (deltaY > 70) {
        close();
      } else {
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
        sheet.style.transform = '';
      }
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd);

    cleanupTouch = () => {
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onTouchEnd);
    };
  }

  return close;
}

export function parseIDRInput(str) {
  if (!str) return 0;
  const normalized = String(str).replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

export function formatIDRInput(str) {
  if (!str) return '';
  const parts = String(str).split(',');
  const intPart = parts[0].replace(/\D/g, '');
  const intFormatted = intPart ? new Intl.NumberFormat('id-ID').format(parseInt(intPart)) : '';
  return parts.length > 1 ? intFormatted + ',' + parts[1].replace(/\D/g, '').slice(0, 2) : intFormatted;
}


// --- MODAL IMPLEMENTATIONS ---

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
    return list.map(acc => `<option value="${acc}" ${selectedVal === acc ? 'selected' : ''}>${acc}</option>`).join('');
  };

  const getMetodeOptions = () => {
    const currentVal = isEdit ? txToEdit.metode : (prefill?.metode || '');
    return ['Cash', 'E-Wallet', 'Bank Transfer', 'Kartu Kredit'].map(m =>
      `<option value="${m}" ${currentVal === m ? 'selected' : ''}>${m}</option>`
    ).join('');
  };

  const getKategoriOptions = () => {
    const categories = [
      'Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan & Utilitas',
      'Hiburan', 'Kesehatan', 'Pendidikan', 'Investasi & Tabungan',
      'Gaji & Pendapatan', 'Lain-lain'
    ];
    const currentVal = isEdit ? txToEdit.kategori : (prefill?.kategori || '');
    return categories.map(k => `<option value="${k}" ${currentVal === k ? 'selected' : ''}>${k}</option>`).join('');
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

  const closeModal = bindModalEvents(container, 'modal-overlay', ['btn-close-modal', 'btn-cancel-modal']);

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

    const presetNames = {
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
      
      const targetType = (type === 'E-Wallet') ? 'E-Wallet' : (type === 'Bank Transfer' || type === 'Kartu Kredit') ? 'Bank' : 'Cash';
      const presetList = presetNames[targetType] || [];

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

export function openConfirmModal(title, message, onConfirm) {
  let allowed = false;
  checkVerification(() => { allowed = true; });
  if (!allowed) return;

  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="confirm-overlay" style="align-items: center;">
      <div class="modal-content" style="max-width: 420px; text-align: left; padding: 2.25rem;">
        <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 10px; font-size: 1.25rem; color: var(--text-main);">
          <i class="ph-fill ph-question" style="font-size: 1.5rem;"></i>
          ${title}
        </h3>
        <p class="text-muted" style="margin-bottom: 2.5rem; font-size: 0.95rem; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-outline" style="flex: 1; justify-content: center;" id="btn-cancel-confirm">Batal</button>
          <button class="btn btn-primary" style="flex: 1; justify-content: center;" id="btn-do-confirm">Ya, Hapus</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = bindModalEvents(container, 'confirm-overlay', ['btn-cancel-confirm']);

  document.getElementById('btn-do-confirm').addEventListener('click', () => {
    closeModal();
    showLoading();
    setTimeout(() => {
      onConfirm();
      hideLoading();
    }, 800);
  });
}

export function openAdjustBalanceModal(currentBalance, onSuccess) {
  let allowed = false;
  checkVerification(() => { allowed = true; });
  if (!allowed) return;

  const container = getContainer();
  if (!container) return;

  const existingOffset = Number(store.user?.balanceOffset || 0);
  const displayedBalance = currentBalance;
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
              <input type="text" class="form-control" id="input-real-balance" placeholder="Contoh: 598.334,82" inputmode="decimal" autocomplete="off" required style="padding-right: 40px;">
              <button type="button" id="btn-clear-balance" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; display: none; align-items: center; justify-content: center; font-size: 1.25rem; padding: 0;">
                <i class="ph ph-x-circle"></i>
              </button>
            </div>
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

  const closeModal = bindModalEvents(container, 'adjust-balance-overlay', ['btn-close-adjust', 'btn-cancel-adjust']);

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

  input.addEventListener('input', (e) => {
    const rawValue = e.target.value;
    if (clearBtn) clearBtn.style.display = rawValue ? 'flex' : 'none';
    if (!rawValue.endsWith(',')) e.target.value = formatIDRInput(rawValue);

    const realBalance = parseIDRInput(e.target.value);
    const diff = realBalance - displayedBalance;

    if (e.target.value && diff !== 0) {
      const isDeficit = diff < 0;
      const formattedDiff = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 2
      }).format(Math.abs(diff));

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
    } else {
      preview.style.display = 'none';
      submitBtn.disabled = true;
    }
  });

  document.getElementById('form-adjust-balance').addEventListener('submit', async (e) => {
    e.preventDefault();
    const realBalance = parseIDRInput(input.value);
    const rawBalance = currentBalance - existingOffset;
    const newOffset = realBalance - rawBalance;

    closeModal();
    showLoading();
    try {
      store.user.balanceOffset = newOffset;
      store.save();
      await store.updateProfile({ balanceOffset: newOffset });
      showToast('Saldo berhasil disesuaikan!', 'success');
    } finally {
      hideLoading();
      if (onSuccess) onSuccess();
    }
  });

  setTimeout(() => { input.focus(); }, 100);
}

export function openEditUsernameModal(currentName, onUpdate) {
  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="edit-name-overlay">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>Ubah Username</h3>
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

  const closeModal = bindModalEvents(container, 'edit-name-overlay', ['btn-close-edit-name', 'btn-cancel-edit-name']);

  document.getElementById('form-edit-name').addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = document.getElementById('new-username').value.trim();
    closeModal();
    if (newName && newName !== currentName && onUpdate) {
      onUpdate(newName);
    }
  });

  setTimeout(() => {
    const input = document.getElementById('new-username');
    input?.focus();
    input?.select();
  }, 50);
}

export function openDeleteAccountModal(authProvider, onConfirm) {
  const container = getContainer();
  if (!container) return;

  const isGoogle = authProvider === 'google.com';

  container.innerHTML = `
    <div class="custom-alert-overlay" id="delete-acc-overlay">
      <div class="custom-alert-card" style="text-align: center; position: relative;">
        <div style="margin: 0 auto 1.25rem; display: flex; justify-content: center; align-items: center;">
          <img src="/assets/warning_delete_light.svg" class="delete-warning-img-light" alt="Peringatan Hapus Akun" style="width: 180px; height: auto; max-height: 180px; object-fit: contain;" />
          <img src="/assets/warning_delete_dark.svg" class="delete-warning-img-dark" alt="Peringatan Hapus Akun" style="width: 180px; height: auto; max-height: 180px; object-fit: contain;" />
        </div>

        <h3 style="color: var(--red); font-size: 1.25rem; margin-bottom: 0.5rem;">Hapus Akun &amp; Data Permanen?</h3>
        <p style="margin-bottom: 1.5rem; font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">Tindakan ini tidak dapat dibatalkan. Semua transaksi, anggaran, dan wishlist Anda akan terhapus selamanya.</p>
        
        <form id="form-delete-acc" style="text-align: left;">
          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label style="font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; display: block;">${isGoogle ? 'Ketik "HAPUS" untuk konfirmasi' : 'Masukkan Password Anda'}</label>
            <input type="${isGoogle ? 'text' : 'password'}" class="form-control" id="delete-verify-input" required autocomplete="off" placeholder="${isGoogle ? 'HAPUS' : 'Password...'}" style="height: 44px; border-radius: 10px;">
          </div>
          
          <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-outline" style="flex: 1; height: 46px; border-radius: 12px; font-weight: 600;" id="btn-cancel-delete">Batal</button>
            <button type="submit" class="btn btn-primary" style="flex: 1; height: 46px; border-radius: 12px; font-weight: 600; background: var(--red); border-color: var(--red); color: white;">Hapus Permanen</button>
          </div>
        </form>
      </div>
    </div>
    <style>
      .delete-warning-img-dark { display: none; }
      .delete-warning-img-light { display: block; }
      [data-theme="light"] .delete-warning-img-dark { display: none !important; }
      [data-theme="light"] .delete-warning-img-light { display: block !important; }
      [data-theme="dark"] .delete-warning-img-light { display: none !important; }
      [data-theme="dark"] .delete-warning-img-dark { display: block !important; }
    </style>
  `;

  const closeModal = bindModalEvents(container, 'delete-acc-overlay', ['btn-cancel-delete']);

  document.getElementById('form-delete-acc').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('delete-verify-input').value;
    
    if (isGoogle && val !== 'HAPUS') {
      import('./notifications.js').then(m => m.showToast('Ketik kata HAPUS dengan huruf kapital', 'error'));
      return;
    }
    
    closeModal();
    if (onConfirm) onConfirm(isGoogle ? null : val);
  });
  
  setTimeout(() => document.getElementById('delete-verify-input')?.focus(), 50);
}

export function openDetailTransactionModal(tx) {
  const container = getContainer();
  if (!tx || !container) return;

  const isIncome = tx.type === 'income';
  const colorClass = isIncome ? 'var(--green)' : 'var(--red)';
  const typeText = isIncome ? 'Pemasukan' : 'Pengeluaran';
  const formattedAmount = `${isIncome ? '+' : '-'} ${formatRupiah(Math.abs(tx.harga))}`;

  let badgeClass = 'badge-blue';
  const lowerKategori = (tx.kategori || '').toLowerCase();
  if (lowerKategori.includes('gaji')) badgeClass = 'badge-green';
  else if (lowerKategori.includes('makan')) badgeClass = 'badge-orange';
  else if (lowerKategori.includes('belanja')) badgeClass = 'badge-purple';

  container.innerHTML = `
    <div class="detail-tx-overlay" id="detail-tx-overlay">
      <div class="detail-tx-content" id="detail-tx-content">
        <div class="detail-tx-handle"></div>

        <div class="modal-header" style="margin-bottom: 1.25rem; justify-content: center; text-align: center;">
          <h3 style="font-size: 1.2rem; font-weight: 700;">Detail Transaksi</h3>
        </div>

        <div style="text-align: center; padding: 1.25rem 0; border-bottom: 1px dashed var(--border); margin-bottom: 1.25rem;">
          <span style="font-size: 0.75rem; font-weight: 700; color: ${colorClass}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; display: inline-block;">
            ${typeText}
          </span>
          <h2 style="font-size: 1.85rem; font-weight: 800; color: ${colorClass}; margin: 0.25rem 0 0; letter-spacing: -0.02em;">
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
            <span class="badge-soft ${badgeClass}" style="font-size: 0.78rem;"><img src="${getCategoryIconUrl(tx.kategori, tx.type)}" class="tx-cat-icon" alt="" /><span>${tx.kategori || 'Umum'}</span></span>
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
  `;

  const closeModal = bindModalEvents(container, 'detail-tx-overlay', ['btn-close-detail-tx-footer']);
  requestAnimationFrame(() => {
    document.getElementById('detail-tx-overlay')?.classList.add('active');
  });
}

export function openConfirmPasswordModal(onConfirm, onCancel) {
  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="pwd-confirm-overlay" style="z-index: 9999;">
      <div class="modal-content" style="max-width: 400px; padding: 2rem; border-radius: 20px;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="width: 56px; height: 56px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #ef4444; font-size: 1.75rem;">
            <i class="ph ph-shield-warning"></i>
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">Konfirmasi Menonaktifkan 2FA</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">Masukkan kata sandi akun Anda untuk memverifikasi tindakan ini.</p>
        </div>

        <form id="form-confirm-pwd" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.4rem; display: block;">Kata Sandi Saat Ini</label>
            <input type="password" id="input-confirm-pwd" class="form-control" placeholder="••••••••" required style="height: 48px; border-radius: 12px;">
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 0.5rem;">
            <button type="button" id="btn-cancel-pwd" class="btn btn-outline" style="flex: 1; height: 48px; border-radius: 12px; font-weight: 600;">Batal</button>
            <button type="submit" class="btn" style="flex: 1; height: 48px; border-radius: 12px; font-weight: 600; background: var(--red); color: white; border: none;">Nonaktifkan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = bindModalEvents(container, 'pwd-confirm-overlay', ['btn-cancel-pwd'], onCancel);

  document.getElementById('form-confirm-pwd').onsubmit = (e) => {
    e.preventDefault();
    const pwd = document.getElementById('input-confirm-pwd').value.trim();
    if (!pwd) return;
    closeModal();
    if (onConfirm) onConfirm(pwd);
  };
}

export function openQuickActionSheet() {
  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="quick-action-overlay">
      <div class="modal-content quick-action-card" id="quick-action-card">
        <div class="quick-action-header">
          <h3>Pilih Aksi Cepat</h3>
          <button type="button" class="modal-close" id="close-quick-action"><i class="ph ph-x"></i></button>
        </div>
        <div class="quick-action-grid">
          <div class="quick-action-item" role="button" tabindex="0" id="qa-add-tx">
            <div class="qa-icon"><i class="ph-fill ph-receipt"></i></div>
            <div class="qa-info"><h4>Tambah Transaksi</h4></div>
            <i class="ph ph-caret-right qa-arrow"></i>
          </div>

          <div class="quick-action-item" role="button" tabindex="0" id="qa-scan-receipt">
            <div class="qa-icon"><i class="ph-fill ph-scan"></i></div>
            <div class="qa-info"><h4>Scan Struk (OCR)</h4></div>
            <i class="ph ph-caret-right qa-arrow"></i>
          </div>

          <div class="quick-action-item" role="button" tabindex="0" id="qa-wishlist">
            <div class="qa-icon"><i class="ph-fill ph-heart"></i></div>
            <div class="qa-info"><h4>Wishlist &amp; Tabungan</h4></div>
            <i class="ph ph-caret-right qa-arrow"></i>
          </div>

          <div class="quick-action-item" role="button" tabindex="0" id="qa-calculator">
            <div class="qa-icon"><i class="ph-fill ph-calculator"></i></div>
            <div class="qa-info"><h4>Kalkulator Finansial</h4></div>
            <i class="ph ph-caret-right qa-arrow"></i>
          </div>
        </div>
      </div>
    </div>
  `;

  const closeModal = bindModalEvents(container, 'quick-action-overlay', ['close-quick-action']);

  document.getElementById('qa-add-tx')?.addEventListener('click', () => {
    animateCloseModal(container, () => {
      checkVerification(() => {
        openAddTransactionModal(() => {
          const path = window.location.pathname || '/dashboard';
          if (path === '/dashboard' || path === '/transaksi') {
            import('../router.js').then(m => m.handleRoute());
          }
        });
      });
    });
  });

  document.getElementById('qa-scan-receipt')?.addEventListener('click', () => {
    animateCloseModal(container, () => {
      checkVerification(() => {
        import('./scanReceipt.js').then(m => m.openScanReceiptModal());
      });
    });
  });

  document.getElementById('qa-wishlist')?.addEventListener('click', () => {
    animateCloseModal(container, () => {
      import('../router.js').then(m => m.navigateTo('/tabungan'));
    });
  });

  document.getElementById('qa-calculator')?.addEventListener('click', () => {
    animateCloseModal(container, () => {
      import('./calculator.js').then(m => m.openCalculator());
    });
  });
}
