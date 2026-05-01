import { store, formatDate } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, showAlert, showConfirm } from '../components/notifications.js';
import { openEditUsernameModal } from '../components/modal.js';
import { initCustomSelect } from '../components/customSelect.js';

export function renderAkun() {
  const container = document.getElementById('page-content');
  const user = store.user;
  
  // Format join date dari data riil
  const joinDate = user.createdAt ? formatDate(user.createdAt) : '12 Maret 2024';

  container.innerHTML = `
    <div class="account-settings">
      <div class="section-header">
        <div>
          <h3>Pengaturan Profil & Keamanan</h3>
          <p class="text-muted">Kelola identitas dan keamanan akun kamu di sini bre.</p>
        </div>
      </div>

      <div class="account-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; align-items: start;">
        
        <!-- Section 1: Profile Preview & Identity -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="stat-card profile-card" style="padding: 2.5rem 1.5rem; text-align: center;">
            <div class="avatar-wrapper" style="position: relative; width: 120px; height: 120px; margin: 0 auto 1.5rem; cursor: pointer;" id="btn-preview-pp">
              <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.name}" id="profile-preview" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; box-shadow: var(--shadow-lg); border: 4px solid var(--white);">
              <label for="avatar-upload" class="edit-avatar-btn" style="position: absolute; bottom: 0; right: 0; background: var(--primary); color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid var(--white);" onclick="event.stopPropagation()">
                <i class="ph ph-camera"></i>
              </label>
              <input type="file" id="avatar-upload" style="display: none;" accept="image/*">
            </div>
            <h3 style="margin-bottom: 0.25rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
              @${user.name || 'user'}
              <button class="icon-btn" id="btn-edit-username" style="width: 28px; height: 28px; font-size: 0.8rem; background: var(--bg-color); border-radius: 50%;" title="Ubah Username">
                <i class="ph ph-pencil-simple"></i>
              </button>
            </h3>
            <p class="text-muted text-sm" style="margin-bottom: 1.5rem;">${user.email}</p>
            <div class="account-badge" style="background: var(--primary-light); color: var(--primary); padding: 6px 16px; border-radius: 100px; font-size: 0.7rem; font-weight: 700;">
              VERIFIED USER
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem;">
            <h4 style="margin-bottom: 1.25rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
              <i class="ph-fill ph-gear" style="color: var(--primary);"></i>
              Preferensi Keuangan
            </h4>
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="text-xs text-muted mb-xs block" style="display: block; margin-bottom: 4px;">Tanggal Mulai Periode (Gajian)</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <input type="number" id="financial-start-day" class="form-control" min="1" max="31" value="${user.financialStartDay || 1}" style="width: 80px; height: 38px;">
                  <span class="text-xs text-muted">Tiap bulan</span>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="text-xs text-muted mb-xs block" style="display: block; margin-bottom: 4px;">Mata Uang Default</label>
                <select id="user-currency" class="form-control" style="height: 38px; font-size: 0.85rem; padding: 0 10px;">
                  <option value="IDR" ${user.currency === 'IDR' || !user.currency ? 'selected' : ''}>IDR - Rupiah</option>
                  <option value="USD" ${user.currency === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
                  <option value="EUR" ${user.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                  <option value="SGD" ${user.currency === 'SGD' ? 'selected' : ''}>SGD - Singapore Dollar</option>
                  <option value="MYR" ${user.currency === 'MYR' ? 'selected' : ''}>MYR - Malaysian Ringgit</option>
                  <option value="JPY" ${user.currency === 'JPY' ? 'selected' : ''}>JPY - Japanese Yen</option>
                </select>
              </div>

              <div style="border-top: 1px dashed var(--border); pt-md: 1rem; margin-top: 0.5rem; padding-top: 1rem;">
                <p class="text-xs text-muted mb-md">Laporan & Anggaran bakal ngikutin siklus dan mata uang ini.</p>
                <button class="btn btn-primary btn-full" id="btn-save-financial-start" style="height: 38px; font-size: 0.8rem; border-radius: 8px;">Simpan Perubahan</button>
              </div>
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem;">
            <h4 style="margin-bottom: 1.25rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
              <i class="ph-fill ph-info" style="color: var(--primary);"></i>
              Informasi Akun
            </h4>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted text-sm">Join Date</span>
                <span class="font-bold text-sm">${joinDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted text-sm">Status Akun</span>
                <span class="text-green text-sm font-bold">Aktif</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Security & Identity Form -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="stat-card" style="padding: 2rem;">
            <h4 style="margin-bottom: 1.5rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
              <i class="ph-fill ph-shield-check" style="color: var(--primary);"></i>
              Pusat Keamanan
            </h4>
            
            ${user.provider === 'password' ? `
            <!-- Change Password Dropdown -->
            <details class="password-details" style="margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
              <summary style="list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 0.875rem; color: var(--text-main); padding: 0.5rem 0;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <i class="ph-fill ph-key" style="color: var(--primary); font-size: 1.1rem;"></i>
                  Ubah Password
                </div>
                <i class="ph ph-caret-down caret-icon" style="transition: transform 0.3s; font-size: 1rem;"></i>
              </summary>
              
              <form id="form-change-password" style="margin-top: 1.5rem;">
                <div class="form-group" style="margin-bottom: 1rem;">
                  <input type="password" id="old-password" placeholder="Password Lama" class="form-control" style="height: 48px; border-radius: 12px; margin-bottom: 0.75rem;" required>
                  <input type="password" id="new-password" placeholder="Password Baru" class="form-control" style="height: 48px; border-radius: 12px; margin-bottom: 0.75rem;" required>
                  <input type="password" id="confirm-password" placeholder="Konfirmasi Password Baru" class="form-control" style="height: 48px; border-radius: 12px; margin-bottom: 1rem;" required>
                  <button type="submit" class="btn btn-primary btn-full" style="height: 48px; font-size: 0.9rem; border-radius: 12px;">
                    Update Password
                  </button>
                </div>
              </form>
            </details>
            ` : `
            <div style="margin-bottom: 2rem; padding: 1rem; border-radius: 12px; background: var(--bg-color); color: var(--text-muted); font-size: 0.8rem; display: flex; gap: 10px; align-items: center; border: 1px solid var(--border);">
              <i class="ph ph-google-logo" style="font-size: 1.2rem; color: var(--primary);"></i>
              <span>Kamu masuk via Google Auth. Pengaturan password dikelola langsung oleh Google bre.</span>
            </div>
            `}

            <!-- 2FA Toggle -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p class="font-bold text-sm" style="margin: 0;">Autentikasi 2 Faktor (2FA)</p>
                <p class="text-muted text-xs">Amankan akun dengan kode OTP.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="toggle-2fa" ${user.is2FAEnabled ? 'checked' : ''}>
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="stat-card" style="padding: 2rem; border: 1.5px solid rgba(239, 68, 68, 0.15); background: rgba(239, 68, 68, 0.02);">
            <h4 style="margin-bottom: 0.5rem; font-size: 1rem; color: var(--red); display: flex; align-items: center; gap: 10px;">
              <i class="ph-fill ph-warning-octagon"></i>
              Zona Bahaya
            </h4>
            <p class="text-muted text-xs" style="margin-bottom: 1.5rem;">Aksi ini tidak bisa dibatalkan bre. Semua data finansial kamu bakal dihapus permanen.</p>
            <button class="btn" style="background: var(--red); color: white; width: 100%; border-radius: 12px; height: 48px; font-weight: 600; gap: 10px;" id="btn-delete-account">
              <i class="ph-bold ph-trash"></i>
              Hapus Akun & Data
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Lightbox Modal -->
    <div id="pp-preview-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);" id="pp-modal-close"></div>
      <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.name}" id="full-pp-preview" style="position: relative; width: min(400px, 85vw); height: min(400px, 85vw); border-radius: 50%; object-fit: cover; border: 4px solid var(--white); box-shadow: var(--shadow-xl);">
    </div>

    <style>
      .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border); transition: .4s; border-radius: 34px; }
      .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
      input:checked + .slider { background-color: var(--primary); }
      input:checked + .slider:before { transform: translateX(20px); }

      .password-details summary::-webkit-details-marker { display: none; }
      .password-details[open] .caret-icon { transform: rotate(180deg); }
    </style>
  `;

  // --- Initialize Custom UI Elements ---
  const currencySelect = document.getElementById('user-currency');
  if (currencySelect) {
    initCustomSelect(currencySelect);
  }

  // --- Handlers ---
  
  document.getElementById('btn-preview-pp').onclick = () => {
    document.getElementById('pp-preview-modal').style.display = 'flex';
  };
  document.getElementById('pp-modal-close').onclick = () => {
    document.getElementById('pp-preview-modal').style.display = 'none';
  };
  
  document.getElementById('btn-save-financial-start').onclick = async () => {
    const newDay = document.getElementById('financial-start-day').value;
    const newCurrency = document.getElementById('user-currency').value;
    
    showLoading();
    try {
      await store.updateProfile({ 
        financialStartDay: parseInt(newDay),
        currency: newCurrency
      });
      showToast('Berhasil diperbaharui!', 'success');
      
      // Refresh UI to update currency symbols
      renderAkun();
    } catch (err) {
      showAlert('Gagal', err.message, 'error');
    } finally {
      hideLoading();
    }
  };

  document.getElementById('btn-edit-username').onclick = () => {
    openEditUsernameModal(user.name, async (newName) => {
      showLoading();
      try {
        await store.updateProfile({ name: newName });
        renderAkun(); // Re-render to reflect changes
        showToast('Username diupdate bre!', 'success');
      } catch (err) {
        showAlert('Gagal', err.message, 'error');
      } finally {
        hideLoading();
      }
    });
  };

  document.getElementById('btn-delete-account').onclick = async () => {
    const confirmed = await showConfirm('Hapus Akun Permanen?', 'Yakin mau hapus akun bre? Semua data transaksi, wishlist, dan budget kamu bakal ILANG SELAMANYA loh. Gak bisa dibalikin!');
    if (confirmed) {
      showLoading();
      try {
        await store.deleteAccountRemote();
        hideLoading();
        showToast('Akun dan data berhasil dihapus bre. Sampai jumpa!', 'success');
        
        setTimeout(() => {
          window.location.hash = '#login';
          window.location.reload();
        }, 2000);
      } catch (err) {
        hideLoading();
        showAlert('Gagal Hapus Akun', err.message, 'error');
      }
    }
  };

  const toggle2FA = document.getElementById('toggle-2fa');
  toggle2FA.onchange = async (e) => {
    const isChecked = e.target.checked;
    
    if (isChecked) {
      // Logic Setup 2FA
      const code = prompt('Keamanan Berlapis: Masukkan kode OTP yang dikirim ke email kamu (Mock: 123456)');
      
      if (code === '123456') {
        showLoading();
        const success = await store.update2FAStatus(true);
        hideLoading();
        if (success) {
          showToast('2FA Aktif! Akun kamu sekarang super aman bre.', 'success');
        } else {
          e.target.checked = false;
          showToast('Gagal update status 2FA.', 'error');
        }
      } else {
        e.target.checked = false;
        if (code !== null) showToast('Kode OTP salah bre!', 'error');
      }
    } else {
      // Deactivate 2FA
      showLoading();
      await store.update2FAStatus(false);
      hideLoading();
      showToast('2FA dinonaktifkan.', 'info');
    }
  };

  // Avatar handling logic with compression & optimistic UI
  const avatarUpload = document.getElementById('avatar-upload');
  avatarUpload.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      return showAlert('Error', 'File harus berupa gambar bre!', 'error');
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          // Kompresi Gambar (Cepat)
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

          // 1. OPTIMISTIC UI: Ganti gambar & tutup modal SEKARANG JUGA
          store.user.avatar = compressedBase64;
          store.updateUI();
          
          const modal = document.getElementById('pp-preview-modal');
          if (modal) modal.style.display = 'none';

          // 2. BACKGROUND SYNC: Kirim ke server diem-diem
          try {
            await store.updateProfile({ avatar: compressedBase64 });
            showToast('Foto profil disinkron!', 'success');
          } catch (err) {
            showToast('Gagal sinkron, tapi profil lokal aman.', 'warning');
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showAlert('Gagal', 'Ada masalah pas baca file gambar.', 'error');
    }
  };

  // Change Password Handler
  const changePassForm = document.getElementById('form-change-password');
  if (changePassForm) {
    changePassForm.onsubmit = async (e) => {
      e.preventDefault();
      const oldPass = document.getElementById('old-password').value;
      const newPass = document.getElementById('new-password').value;
      const confirmPass = document.getElementById('confirm-password').value;

      // 1. Frontend Validation
      if (newPass.length < 6) {
        return showAlert('Validasi Gagal', 'Password baru minimal 6 karakter bre!', 'warning');
      }
      if (newPass !== confirmPass) {
        return showAlert('Validasi Gagal', 'Konfirmasi password baru tidak cocok bre!', 'warning');
      }

      const confirmed = await showConfirm('Konfirmasi Ubah Password', 'Password kamu bakal diganti dan kamu bakal otomatis logout bre. Lanjut?');
      if (!confirmed) return;

      showLoading();
      try {
        // 2. Call Store (Backend verification happens here)
        await store.changePassword(oldPass, newPass);
        
        hideLoading();
        showToast('Password berhasil diubah, silakan login ulang', 'success');
        
        // 3. Auto Logout & Redirect
        setTimeout(() => {
          store.logout();
          window.location.hash = '#login';
          window.location.reload(); 
        }, 2000);
        
      } catch (err) {
        hideLoading();
        showAlert('Gagal Ubah Password', err.message, 'error');
      }
    };
  }
}
