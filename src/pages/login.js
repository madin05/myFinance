import { store } from '../store.js';
import { auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '../firebase-config.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, showAlert } from '../components/notifications.js';

export function renderLogin(mode = 'login') {
  const container = document.getElementById('login-view');
  const isReg = mode === 'register';

  container.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="logo-icon" style="margin: 0 auto 1.5rem; text-align: center; width: 140px;">
          <img src="/assets/logo-navbar-light.svg" class="logo-light" alt="MyFinance" style="width: 100%;">
          <img src="/assets/logo-navbar-dark.svg" class="logo-dark" alt="MyFinance" style="width: 100%;">
        </div>
        <h2 style="text-align: center; margin-bottom: 0.5rem;">${isReg ? 'Buat Akun Baru' : 'Selamat Datang'}</h2>
        <p style="text-align: center; color: var(--text-muted); margin-bottom: 2.5rem;">
          ${isReg ? 'Bergabunglah untuk kelola keuangan lebih baik.' : 'Kelola keuanganmu lebih cerdas & aman.'}
        </p>
        
        <form id="auth-form">
          ${isReg ? `
            <div class="form-group">
              <label>Nama Lengkap</label>
              <input type="text" id="reg-name" class="form-control" placeholder="Arif Madani" required>
            </div>
          ` : ''}
          <div class="form-group">
            <label>Username / Email</label>
            <input type="text" id="email" class="form-control" placeholder="Masukkan username/email" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" class="form-control" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full mt-md">
            ${isReg ? 'Daftar Sekarang' : 'Masuk Sekarang'}
          </button>
        </form>

        <p style="text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-muted);">
          ${isReg ? 'Sudah punya akun?' : 'Belum punya akun?'} 
          <a href="javascript:void(0)" id="btn-switch-auth" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-left: 5px;">
            ${isReg ? 'Masuk di sini' : 'Daftar di sini'}
          </a>
        </p>

        <div style="margin: 2rem 0; display: flex; align-items: center; gap: 1rem;">
          <div style="flex: 1; height: 1px; background: var(--border);"></div>
          <span style="color: var(--text-muted); font-size: 0.8rem;">Atau masuk dengan</span>
          <div style="flex: 1; height: 1px; background: var(--border);"></div>
        </div>

        <button id="btn-google-login" class="btn btn-outline btn-full" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px; border-radius: 12px;">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
          <span>Masuk dengan Google</span>
        </button>
      </div>
    </div>
  `;

  // Switch Auth Mode
  document.getElementById('btn-switch-auth').onclick = () => {
    renderLogin(isReg ? 'login' : 'register');
  };

  // Google Login Logic
  document.getElementById('btn-google-login').onclick = async () => {
    showLoading();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();
      
      store.setUser({
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL,
        token: token,
        uid: user.uid,
        provider: 'google'
      });

      window.location.hash = '#dashboard';
    } catch (error) {
      showToast('Login Google gagal bre! ' + error.message, 'error');
    } finally {
      hideLoading();
    }
  };

  // Auth Form Submit
  document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;

    showLoading();
    try {
      if (isReg) {
        // Handle Register
        const name = document.getElementById('reg-name').value;
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        const user = result.user;
        
        store.setUser({
          name: name,
          email: user.email,
          uid: user.uid,
          provider: 'password'
        }, { password: pass });
        showToast('Akun berhasil dibuat bre!', 'success');
      } else {
        // Handle Login (with Demo Fallback)
        if (email === 'guest' && pass === 'guest123') {
          store.setUser({ 
            name: 'Guest User', 
            email: 'guest@myfinance.com',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
            role: 'guest',
            provider: 'password'
          });
        } else {
          const result = await signInWithEmailAndPassword(auth, email, pass);
          const user = result.user;
          store.setUser({
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            uid: user.uid,
            provider: 'password'
          });
        }
      }
      window.location.hash = '#dashboard';
    } catch (error) {
      showAlert('Gagal', error.message, 'error');
    } finally {
      hideLoading();
    }
  };
}
