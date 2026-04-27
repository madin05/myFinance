import { store } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';

export function renderAkun() {
  const container = document.getElementById('page-content');
  const user = store.user;
  
  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3>Pengaturan Akun</h3>
        <p class="text-muted">Kelola informasi profil dan keamanan kamu bre.</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 2.5fr; gap: 2.5rem; margin-top: 2rem;">
      <!-- Profile Sidebar -->
      <div>
        <div class="stat-card" style="text-align: center; padding: 3rem 2rem;">
          <div style="position: relative; width: 140px; height: 140px; margin: 0 auto 1.5rem;">
            <img src="${user.avatar || 'https://i.pravatar.cc/150?img=11'}" id="profile-preview" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary-light);">
            <label for="avatar-upload" class="icon-btn bg-primary text-white" style="position: absolute; bottom: 5px; right: 5px; width: 40px; height: 40px; cursor: pointer; border: 4px solid var(--white); box-shadow: var(--shadow-lg);">
              <i class="ph ph-camera"></i>
            </label>
            <input type="file" id="avatar-upload" style="display: none;" accept="image/*">
          </div>
          <h2 style="margin-bottom: 0.25rem;">${user.name}</h2>
          <p class="text-muted text-sm mb-lg">${user.email || 'admin@myfinance.com'}</p>
          <div class="badge-soft badge-blue" style="display: inline-block;">Premium Member</div>
          
          <div style="margin-top: 2.5rem; border-top: 1px solid var(--border); padding-top: 2rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
              <span class="text-muted text-sm">Member Sejak</span>
              <span class="font-bold text-sm">Okt 2023</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span class="text-muted text-sm">Status Akun</span>
              <span class="text-green font-bold text-sm">Aktif</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Form -->
      <div class="stat-card" style="padding: 2.5rem;">
        <h4 class="mb-lg">Informasi Pribadi</h4>
        <form id="form-profile">
          <div class="form-row">
            <div class="form-group">
              <label>Nama Lengkap</label>
              <input type="text" id="profile-name" class="form-control" value="${user.name}" required>
            </div>
            <div class="form-group">
              <label>Username</label>
              <input type="text" id="profile-username" class="form-control" value="admin" readonly style="opacity: 0.6; cursor: not-allowed; background-color: var(--bg-color);">
            </div>
          </div>
          
          <div class="form-group">
            <label>Alamat Email</label>
            <input type="email" id="profile-email" class="form-control" value="${user.email || 'admin@myfinance.com'}" required>
          </div>

          <div style="margin: 2.5rem 0; border-top: 1px solid var(--border);"></div>
          
          <h4 class="mb-lg">Keamanan</h4>
          <div class="form-group">
            <label>Password Baru (Kosongkan jika tidak ganti)</label>
            <input type="password" id="profile-password" class="form-control" placeholder="••••••••">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 3rem;">
            <button type="button" class="btn btn-outline" style="padding: 0 2rem;">Batal</button>
            <button type="submit" class="btn btn-primary" style="padding: 0 2.5rem;">Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Handle Avatar Preview
  const avatarUpload = document.getElementById('avatar-upload');
  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById('profile-preview').src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle Submit
  document.getElementById('form-profile').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const avatar = document.getElementById('profile-preview').src;

    showLoading();
    setTimeout(() => {
      store.user = { ...store.user, name, email, avatar };
      store.save();
      
      // Update global header elements
      const headerAvatar = document.getElementById('user-avatar');
      if (headerAvatar) headerAvatar.src = avatar;
      
      const dropdownName = document.querySelector('.dropdown-header .user-name');
      if (dropdownName) dropdownName.textContent = name;
      
      const dropdownEmail = document.querySelector('.dropdown-header .user-email');
      if (dropdownEmail) dropdownEmail.textContent = email;

      hideLoading();
      // Notice: we don't re-render full page to avoid losing state, 
      // but here it's fine for the profile page
      renderAkun(); 
    }, 1000);
  });
}
