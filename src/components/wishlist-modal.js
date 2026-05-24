import { store } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { initCustomSelects } from '../ui/select.js';
import { showToast } from './notifications.js';

export function openAddWishlistModal(onSuccess, editData = null) {
  const container = document.getElementById('modal-container');
  const isEdit = !!editData;
  
  container.innerHTML = `
    <div class="modal-overlay" id="wishlist-overlay">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Target Wishlist' : 'Buat Target Wishlist'}</h3>
          <button class="icon-btn" id="btn-close-wishlist"><i class="ph ph-x"></i></button>
        </div>
        <form id="form-wishlist">
          <div class="form-group">
            <label>Nama Barang / Target</label>
            <input type="text" id="wishlist-name" class="form-control" placeholder="Misal: Macbook M3 Pro" required value="${isEdit ? editData.name : ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Target Nominal</label>
              <input type="text" id="wishlist-target" class="form-control" placeholder="Rp 0" required value="${isEdit ? new Intl.NumberFormat('id-ID').format(editData.target) : ''}">
            </div>
            <div class="form-group">
              <label>Ikon</label>
              <select id="wishlist-icon" class="form-control">
                <option value="ph-laptop" ${isEdit && editData.icon === 'ph-laptop' ? 'selected' : ''}>Laptop</option>
                <option value="ph-airplane-tilt" ${isEdit && editData.icon === 'ph-airplane-tilt' ? 'selected' : ''}>Liburan</option>
                <option value="ph-shield-check" ${isEdit && editData.icon === 'ph-shield-check' ? 'selected' : ''}>Dana Darurat</option>
                <option value="ph-house" ${isEdit && editData.icon === 'ph-house' ? 'selected' : ''}>Rumah</option>
                <option value="ph-car" ${isEdit && editData.icon === 'ph-car' ? 'selected' : ''}>Mobil</option>
                <option value="ph-heart" ${isEdit && editData.icon === 'ph-heart' ? 'selected' : ''}>Lainnya</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Warna Aksen</label>
            <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-primary" ${!isEdit || editData.color === 'bg-primary' ? 'checked' : ''}><span style="background-color: #6366F1;"></span></label>
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-green" ${isEdit && editData.color === 'bg-green' ? 'checked' : ''}><span style="background-color: #10B981;"></span></label>
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-orange" ${isEdit && editData.color === 'bg-orange' ? 'checked' : ''}><span style="background-color: #F59E0B;"></span></label>
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-red" ${isEdit && editData.color === 'bg-red' ? 'checked' : ''}><span style="background-color: #EF4444;"></span></label>
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-purple" ${isEdit && editData.color === 'bg-purple' ? 'checked' : ''}><span style="background-color: #8B5CF6;"></span></label>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full mt-lg">${isEdit ? 'Simpan Perubahan' : 'Buat Target'}</button>
        </form>
      </div>
    </div>
  `;

  initCustomSelects(container);

  // Format currency input
  const targetInput = document.getElementById('wishlist-target');
  targetInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val) e.target.value = new Intl.NumberFormat('id-ID').format(val);
  });

  const close = () => container.innerHTML = '';
  document.getElementById('btn-close-wishlist').addEventListener('click', close);
  document.getElementById('wishlist-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'wishlist-overlay') close();
  });
  
  document.getElementById('form-wishlist').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('wishlist-name').value;
    const target = Number(document.getElementById('wishlist-target').value.replace(/\./g, ''));
    const icon = document.getElementById('wishlist-icon').value;
    const color = document.querySelector('input[name="wishlist-color"]:checked').value;

    showLoading();
    try {
      if (isEdit) {
        await store.editSaving(editData.id, { name, target, icon, color });
        close();
        showToast(`Target "${name}" berhasil diperbarui!`, 'success');
      } else {
        await store.createSaving({ name, target, current: 0, icon, color });
        close();
        showToast(`Target "${name}" berhasil dibuat!`, 'success');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast('Gagal menyimpan: ' + (err?.message || err), 'error');
    } finally {
      hideLoading();
    }
  });
}

export function openAddFundsModal(id, currentName, onSuccess) {
  const container = document.getElementById('modal-container');
  
  container.innerHTML = `
    <div class="modal-overlay" id="funds-overlay">
      <div class="modal-content" style="max-width: 400px; text-align: center; padding: 2.5rem;">
        <h3 class="mb-xs">Tabung Buat ${currentName}</h3>
        <p class="text-muted mb-lg">Masukkan nominal yang ingin ditabung.</p>
        
        <input type="text" id="fund-amount" class="form-control mb-lg" placeholder="Rp 0" style="text-align: center; font-size: 1.5rem; height: 60px; font-weight: 700;">
        
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-outline" id="btn-cancel-fund" style="flex: 1;">Batal</button>
          <button class="btn btn-primary" id="btn-save-fund" style="flex: 1;">Simpan</button>
        </div>
      </div>
    </div>
  `;

  const amountInput = document.getElementById('fund-amount');
  amountInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val) e.target.value = new Intl.NumberFormat('id-ID').format(val);
  });

  const close = () => container.innerHTML = '';
  document.getElementById('btn-cancel-fund').addEventListener('click', close);
  
  document.getElementById('btn-save-fund').addEventListener('click', async () => {
    const amount = Number(amountInput.value.replace(/\./g, ''));
    if (!amount) {
      showToast('Harap masukkan nominal terlebih dahulu.', 'error');
      return;
    }

    showLoading();
    try {
      await store.addSavingFunds(id, amount);
      close();
      showToast(`Berhasil menabung untuk ${currentName}!`, 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast('Gagal menambah tabungan: ' + (err?.message || err), 'error');
    } finally {
      hideLoading();
    }
  });

  document.getElementById('funds-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'funds-overlay') close();
  });

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-save-fund').click();
    } else if (e.key === 'Escape') {
      close();
    }
  };
  amountInput.addEventListener('keydown', handleKey);
}
