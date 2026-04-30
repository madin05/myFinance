import { store } from '../store.js';
import { auth, googleProvider, signInWithPopup } from '../firebase-config.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast } from '../components/notifications.js';

export function renderLogin() {
  const container = document.getElementById('login-view');
  container.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="logo-icon bg-primary text-white" style="margin: 0 auto 1.5rem; width: 60px; height: 60px; border-radius: 15px;">
          <i class="ph-fill ph-wallet" style="font-size: 2rem;"></i>
        </div>
        <h2 style="text-align: center; margin-bottom: 0.5rem;">My Finance</h2>
        <p style="text-align: center; color: var(--text-muted); margin-bottom: 2.5rem;">Kelola keuanganmu lebih cerdas & aman.</p>
        
        <button id="btn-google-login" class="btn btn-outline btn-full" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px;">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
          <span>Masuk dengan Google</span>
        </button>

        <div style="margin: 2rem 0; display: flex; align-items: center; gap: 1rem;">
          <div style="flex: 1; height: 1px; background: var(--border);"></div>
          <span style="color: var(--text-muted); font-size: 0.8rem;">Atau gunakan demo</span>
          <div style="flex: 1; height: 1px; background: var(--border);"></div>
        </div>
        
        <form id="login-form">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="username" class="form-control" placeholder="admin" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" class="form-control" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full mt-md">Login Demo</button>
        </form>
      </div>
    </div>
  `;

  // Google Login Logic
  document.getElementById('btn-google-login').addEventListener('click', async () => {
    showLoading();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();
      
      // Simpan ke store
      store.setUser({
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL,
        token: token,
        uid: user.uid
      });

      window.location.hash = '#dashboard';
    } catch (error) {
      console.error('Login Error:', error);
      showToast('Login Google gagal bre! ' + error.message, 'error');
    } finally {
      hideLoading();
    }
  });

  // Demo Login Logic
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    if (user === 'admin' && pass === 'admin') {
      store.setUser({ name: 'Admin Demo', role: 'admin' });
      window.location.hash = '#dashboard';
    } else {
      showToast('Gunakan admin / admin buat demo bre!', 'error');
    }
  });
}
