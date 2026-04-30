import { store } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { initCustomSelects } from '../ui/select.js';

export function openAddWishlistModal(onSuccess) {
  const container = document.getElementById('modal-container');
  
  container.innerHTML = `
    <div class="modal-overlay" id="wishlist-overlay">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3>Buat Target Wishlist</h3>
          <button class="icon-btn" id="btn-close-wishlist"><i class="ph ph-x"></i></button>
        </div>
        <form id="form-wishlist">
          <div class="form-group">
            <label>Nama Barang / Target</label>
            <input type="text" id="wishlist-name" class="form-control" placeholder="Misal: Macbook M3 Pro" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Target Nominal</label>
              <input type="text" id="wishlist-target" class="form-control" placeholder="Rp 0" required>
            </div>
            <div class="form-group">
              <label>Ikon</label>
              <select id="wishlist-icon" class="form-control">
                <option value="ph-laptop">Laptop</option>
                <option value="ph-airplane-tilt">Liburan</option>
                <option value="ph-shield-check">Dana Darurat</option>
                <option value="ph-house">Rumah</option>
                <option value="ph-car">Mobil</option>
                <option value="ph-heart">Lainnya</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Warna Aksen</label>
            <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-primary" checked><span style="background-color: #6366F1;"></span></label>
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-green"><span style="background-color: #10B981;"></span></label>
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-orange"><span style="background-color: #F59E0B;"></span></label>
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-red"><span style="background-color: #EF4444;"></span></label>
              <label class="color-radio"><input type="radio" name="wishlist-color" value="bg-purple"><span style="background-color: #8B5CF6;"></span></label>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full mt-lg">Buat Target</button>
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
      await store.createSaving({ name, target, current: 0, icon, color });
      close();
      if (onSuccess) onSuccess();
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
        <p class="text-muted mb-lg">Masukkan nominal yang mau kamu tabung bre.</p>
        
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
    if (!amount) return alert('Masukkan nominal dulu bre!');

    showLoading();
    try {
      await store.addSavingFunds(id, amount);
      close();
      if (onSuccess) onSuccess();
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
