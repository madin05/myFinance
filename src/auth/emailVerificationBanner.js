import { store } from '../store.js';

/**
 * Menampilkan banner verifikasi email di dalam app.
 * Dipanggil dari main.js saat user login/register dengan email yang belum diverifikasi.
 * @param {import('firebase/auth').User} firebaseUser - Firebase Auth user object
 */
export function renderEmailVerificationBanner(firebaseUser) {
  const banner = document.getElementById('email-verify-banner');
  if (!banner) return;

  // Jangan tampilkan banner jika pop-up modal verifikasi sedang/akan aktif
  if (window.isVerificationModalActive || document.getElementById('optional-verif-modal-overlay')) {
    banner.style.display = 'none';
    return;
  }

  // Tampilkan banner dengan animasi slide-down
  banner.style.display = 'flex';
  banner.innerHTML = `
    <div class="evb-icon"><i class="ph ph-envelope-simple-warning"></i></div>
    <div class="evb-text">
      <strong>Verifikasi emailmu dengan OTP</strong>
      <span>Masukkan kode OTP yang dikirimkan ke <em>${firebaseUser?.email || ''}</em></span>
    </div>
    <div class="evb-actions">
      <button id="evb-btn-resend" class="evb-btn-resend">Input OTP / Kirim Ulang</button>
      <button id="evb-btn-close" class="evb-btn-close" aria-label="Tutup"><i class="ph ph-x"></i></button>
    </div>
  `;

  // Handler kirim ulang — pakai OTP endpoint & arahkan ke form OTP
  document.getElementById('evb-btn-resend').onclick = async () => {
    const btn = document.getElementById('evb-btn-resend');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Mengirim...';

    try {
      const token = store.user?.token;
      if (!token) throw new Error('Token tidak ditemukan, silakan login ulang.');

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

      const res = await fetch(`${API_URL}/auth/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal kirim OTP.');

      btn.textContent = 'OTP Terkirim! ✓';
      
      // Sembunyikan layout utama dan tampilkan view OTP
      const loginView = document.getElementById('login-view');
      const appLayout = document.getElementById('app-layout');
      if (loginView) loginView.style.display = 'block';
      if (appLayout) appLayout.style.display = 'none';

      const { renderLogin } = await import('../pages/login.js');
      renderLogin('verify-otp', firebaseUser?.email || store.user?.email || '', { email: firebaseUser?.email || store.user?.email, token });
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Coba Lagi';
      console.warn('Resend OTP error:', err.message);
    }
  };

  // Handler dismiss banner
  document.getElementById('evb-btn-close').onclick = () => {
    banner.style.animation = 'evb-slide-up 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards';
    setTimeout(() => { banner.style.display = 'none'; banner.style.animation = ''; }, 380);
  };
}
