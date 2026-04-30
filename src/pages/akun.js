import { store } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, showAlert } from '../components/notifications.js';

export function renderAkun() {
  const container = document.getElementById('page-content');
  const user = store.user;
  
  // Format join date (simulasi jika tidak ada di DB)
  const joinDate = user.joinDate || '12 Maret 2024';

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
            <h3 style="margin-bottom: 0.25rem;">@${user.name || 'user'}</h3>
            <p class="text-muted text-sm" style="margin-bottom: 1.5rem;">${user.email}</p>
            <div class="account-badge" style="background: var(--primary-light); color: var(--primary); padding: 6px 16px; border-radius: 100px; font-size: 0.7rem; font-weight: 700;">
              VERIFIED USER
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
            
            <!-- Change Password Form -->
            <form id="form-change-password" style="margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border);">
              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="text-sm font-bold mb-xs d-block">Ubah Password</label>
                <input type="password" placeholder="Password Baru" class="form-control" style="height: 48px; border-radius: 12px; margin-bottom: 0.75rem;">
                <button type="submit" class="btn btn-outline" style="width: 100%; height: 44px; font-size: 0.85rem; border-radius: 10px;">
                  Update Password
                </button>
              </div>
            </form>

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
      <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.name}" id="full-pp-preview" style="position: relative; max-width: 400px; width: 85vw; height: 85vw; border-radius: 50%; object-fit: cover; border: 4px solid var(--white);">
    </div>

    <style>
      .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border); transition: .4s; border-radius: 34px; }
      .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
      input:checked + .slider { background-color: var(--primary); }
      input:checked + .slider:before { transform: translateX(20px); }
    </style>
  `;

  // --- Handlers ---
  
  document.getElementById('btn-preview-pp').onclick = () => {
    document.getElementById('pp-preview-modal').style.display = 'flex';
  };
  document.getElementById('pp-modal-close').onclick = () => {
    document.getElementById('pp-preview-modal').style.display = 'none';
  };

  document.getElementById('btn-delete-account').onclick = () => {
    showAlert('Hapus Akun?', 'Yakin mau hapus akun bre? Semua data transaksi dan tabungan bakal ilang selamanya loh.', 'warning', () => {
      showToast('Permintaan hapus akun sedang diproses...', 'info');
    });
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

  // Avatar handling logic reuse
  const avatarUpload = document.getElementById('avatar-upload');
  avatarUpload.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showLoading();
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target.result;
        document.getElementById('profile-preview').src = result;
        await store.updateProfile({ avatar: result });
        showToast('Foto profil diupdate!', 'success');
        hideLoading();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      hideLoading();
      showAlert('Gagal', 'Gagal update foto profil.', 'error');
    }
  };
}
