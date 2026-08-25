import { store } from '../store.js';
import { auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken } from '../firebase-config.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, showAlert } from '../components/notifications.js';
import { navigateTo } from '../router.js';
import { getLoginLayoutHtml } from '../auth/loginTemplates.js';
import { initLoginAnimations } from '../auth/loginAnimations.js';

export { renderEmailVerificationBanner } from '../auth/emailVerificationBanner.js';

export function renderLogin(mode = 'login', pendingEmail = '', extraData = {}) {
  const container = document.getElementById('login-view');
  if (!container) return;

  const isReg = mode === 'register';
  const isForgot = mode === 'forgot-password';
  const isVerified = mode === 'email-verified';
  const isVerifiedError = mode === 'email-verified-error';
  const isResetConfirm = mode === 'reset-password-confirm';
  const isVerifyOtp = mode === 'verify-otp';
  const isVerify2FAOtp = mode === 'verify-2fa-otp';

  container.innerHTML = getLoginLayoutHtml(mode, pendingEmail, extraData);

  if (isVerifyOtp || isVerify2FAOtp) {
    const cancelBtn = document.getElementById('btn-cancel-2fa');
    if (cancelBtn) {
      cancelBtn.onclick = () => renderLogin('login');
    }

    // ─── OTP Input Auto-Focus & Navigation ───
    const otpInputs = document.querySelectorAll('.otp-input');
    if (otpInputs.length) {
      setTimeout(() => otpInputs[0]?.focus(), 100);

      otpInputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
          const val = e.target.value.replace(/\D/g, '');
          e.target.value = val.slice(0, 1);
          if (val && idx < otpInputs.length - 1) {
            otpInputs[idx + 1].focus();
          }
          const errEl = document.getElementById('otp-error-msg');
          if (errEl) errEl.textContent = '';
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !e.target.value && idx > 0) {
            otpInputs[idx - 1].focus();
            otpInputs[idx - 1].value = '';
          }
        });

        input.addEventListener('paste', (e) => {
          e.preventDefault();
          const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
          pasted.split('').forEach((ch, i) => {
            if (otpInputs[i]) otpInputs[i].value = ch;
          });
          const nextIdx = Math.min(pasted.length, otpInputs.length - 1);
          otpInputs[nextIdx].focus();
        });
      });
    }

    // ─── OTP Form Submit ───
    const otpForm = document.getElementById('otp-form');
    if (otpForm) {
      otpForm.onsubmit = async (e) => {
        e.preventDefault();
        const otp = Array.from(otpInputs).map(i => i.value).join('');
        const errEl = document.getElementById('otp-error-msg');

        if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
          if (errEl) errEl.textContent = 'Masukkan 6 digit kode OTP.';
          return;
        }

        const btn = document.getElementById('btn-verify-otp');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Memverifikasi...'; }

        try {
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

          if (isVerify2FAOtp) {
            const preAuthToken = extraData?.preAuthToken;
            if (!preAuthToken) throw new Error('Sesi 2FA tidak ditemukan. Silakan login kembali.');

            const res = await fetch(`${API_URL}/auth/login-2fa/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${preAuthToken}`
              },
              body: JSON.stringify({ otp })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verifikasi 2FA gagal.');

            const userCred = await signInWithCustomToken(auth, data.customToken);
            const user = userCred.user;
            const token = await user.getIdToken(true);

            await store.setUser({
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User MyFinance',
              email: user.email,
              avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
              token: token,
              emailVerified: user.emailVerified,
              provider: 'password'
            });

            window.isVerificationModalActive = false;
            const loginView = document.getElementById('login-view');
            const appLayout = document.getElementById('app-layout');
            if (loginView) loginView.style.display = 'none';
            if (appLayout) appLayout.style.display = 'flex';
            navigateTo('/dashboard');

            showToast('Verifikasi 2FA berhasil! Selamat datang kembali.', 'success');
          } else {
            const token = store.user?.token || extraData?.token;
            if (!token) throw new Error('Sesi habis, silakan login ulang.');

            const res = await fetch(`${API_URL}/auth/otp/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ otp })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verifikasi OTP gagal.');

            if (store.user) {
              store.user.emailVerified = true;
              store.save();
            }

            const currentUser = auth.currentUser;
            if (currentUser) {
              try { await currentUser.reload(); } catch (e) {}
            }

            window.isVerificationModalActive = false;
            const loginView = document.getElementById('login-view');
            const appLayout = document.getElementById('app-layout');
            if (loginView) loginView.style.display = 'none';
            if (appLayout) appLayout.style.display = 'flex';
            navigateTo('/dashboard');

            showToast('Email berhasil diverifikasi! Selamat datang di MyFinance.', 'success');

            setTimeout(() => {
              import('../components/tutorial.js').then(m => m.startProductTutorial()).catch(() => {});
            }, 600);
          }
        } catch (err) {
          if (errEl) errEl.textContent = err.message;
          if (btn) { btn.disabled = false; btn.innerHTML = isVerify2FAOtp ? 'Verifikasi 2FA' : 'Verifikasi Kode'; }
          otpInputs.forEach(i => { i.value = ''; });
          otpInputs[0]?.focus();
        }
      };
    }

    // ─── Countdown Timer & Resend OTP ───
    let countdown = 60;
    const timerEl = document.getElementById('otp-countdown-timer');
    const countdownTextEl = document.getElementById('otp-countdown-text');
    const resendBtn = document.getElementById('btn-resend-otp');

    const countdownInterval = setInterval(() => {
      countdown--;
      if (timerEl) timerEl.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        if (resendBtn) resendBtn.disabled = false;
        if (countdownTextEl) countdownTextEl.style.display = 'none';
      }
    }, 1000);

    if (resendBtn) {
      resendBtn.onclick = async () => {
        resendBtn.disabled = true;
        resendBtn.textContent = 'Mengirim...';

        try {
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

          if (isVerify2FAOtp) {
            const preAuthToken = extraData?.preAuthToken;
            if (!preAuthToken) throw new Error('Sesi 2FA tidak ditemukan.');

            const res = await fetch(`${API_URL}/auth/login-2fa/resend`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${preAuthToken}`
              }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal kirim ulang OTP 2FA.');

            showToast('Kode OTP 2FA baru telah dikirim ke email Anda!', 'success');
          } else {
            const token = store.user?.token || extraData?.token;
            if (!token) throw new Error('Sesi habis.');

            const res = await fetch(`${API_URL}/auth/otp/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal kirim OTP.');

            showToast('Kode OTP baru telah dikirim ke emailmu!', 'success');
          }

          resendBtn.textContent = 'Kode Terkirim! ✓';

          countdown = 60;
          if (countdownTextEl) countdownTextEl.style.display = '';
          if (timerEl) timerEl.textContent = countdown;

          const newInterval = setInterval(() => {
            countdown--;
            if (timerEl) timerEl.textContent = countdown;
            if (countdown <= 0) {
              clearInterval(newInterval);
              if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = 'Kirim Ulang Kode'; }
              if (countdownTextEl) countdownTextEl.style.display = 'none';
            }
          }, 1000);
        } catch (err) {
          resendBtn.disabled = false;
          resendBtn.textContent = 'Coba Lagi';
          showToast(err.message || 'Gagal mengirim ulang kode OTP.', 'error');
        }
      };
    }
  } else if (isVerified) {
    const goToLoginBtn = document.getElementById('btn-go-to-login');
    if (goToLoginBtn) {
      goToLoginBtn.onclick = async () => {
        window.history.replaceState(null, '', '/dashboard');
        
        const currentUser = auth.currentUser;
        if (currentUser) {
          showLoading();
          try {
            await currentUser.reload();
            if (store.user) {
              store.user.emailVerified = currentUser.emailVerified;
              store.save();
            }
          } catch (e) {
            console.warn('Reload auth user error:', e);
          } finally {
            hideLoading();
          }

          const loginView = document.getElementById('login-view');
          const appLayout = document.getElementById('app-layout');
          if (loginView) loginView.style.display = 'none';
          if (appLayout) appLayout.style.display = 'flex';
          navigateTo('/dashboard');
        } else {
          renderLogin('login');
        }
      };
    }
  } else if (isVerifiedError) {
    const requestNewBtn = document.getElementById('btn-request-new-link');
    if (requestNewBtn) {
      requestNewBtn.onclick = async () => {
        window.history.replaceState(null, '', '/');
        const { checkAuth } = await import('../main.js');
        checkAuth();
      };
    }
    const backBtn = document.getElementById('btn-back-to-login-from-error');
    if (backBtn) {
      backBtn.onclick = async () => {
        window.history.replaceState(null, '', '/');
        const { checkAuth } = await import('../main.js');
        checkAuth();
      };
    }
  } else if (isForgot) {
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
      forgotForm.onsubmit = async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('forgot-email').value.trim();
        if (!emailInput) {
          showToast('Masukkan email atau username terlebih dahulu.', 'warning');
          return;
        }

        showLoading();
        try {
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

          const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal mengirim email reset password.');

          hideLoading();
          showAlert('Tautan Terkirim!', data.message || `Link reset password dikirim ke ${emailInput}. Periksa Inbox/Spam!`, 'success');
          renderLogin('login');
        } catch (err) {
          hideLoading();
          showAlert('Gagal Reset Password', err.message || 'Terjadi kesalahan saat mengirim link reset.', 'error');
        }
      };
    }

    const backToLoginBtn = document.getElementById('btn-back-to-login');
    if (backToLoginBtn) {
      backToLoginBtn.onclick = () => {
        renderLogin('login');
      };
    }
  } else if (isResetConfirm) {
    const confirmResetForm = document.getElementById('confirm-reset-form');
    if (confirmResetForm) {
      confirmResetForm.onsubmit = async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('reset-new-password').value;
        if (!newPassword || newPassword.length < 6) {
          showToast('Kata sandi minimal 6 karakter.', 'warning');
          return;
        }
        if (!extraData || !extraData.oobCode) {
          showToast('Kode reset tidak ditemukan atau tidak valid.', 'error');
          return;
        }

        showLoading();
        try {
          const { confirmPasswordReset, signOut } = await import('../firebase-config.js');
          await confirmPasswordReset(auth, extraData.oobCode, newPassword);
          try { await signOut(auth); } catch (err) {}
          store.setUser(null);
          hideLoading();
          showAlert('Kata Sandi Berhasil Diubah!', 'Kata sandi kamu telah berhasil diperbarui. Silakan masuk kembali menggunakan kata sandi baru.', 'success');
          renderLogin('login');
        } catch (err) {
          hideLoading();
          console.error('Confirm password reset error:', err);
          showAlert('Gagal Ubah Kata Sandi', 'Tautan ini sudah kedaluwarsa atau tidak valid. Silakan minta tautan baru.', 'error');
        }
      };
    }

    const toggleResetPass = document.getElementById('toggle-reset-password');
    if (toggleResetPass) {
      toggleResetPass.onclick = () => {
        const input = document.getElementById('reset-new-password');
        if (input.type === 'password') {
          input.type = 'text';
          toggleResetPass.classList.replace('ph-eye', 'ph-eye-slash');
        } else {
          input.type = 'password';
          toggleResetPass.classList.replace('ph-eye-slash', 'ph-eye');
        }
      };
    }

    const backToLoginFromReset = document.getElementById('btn-back-to-login-from-reset');
    if (backToLoginFromReset) {
      backToLoginFromReset.onclick = () => {
        renderLogin('login');
      };
    }
  } else {
    // Switch Auth Mode
    document.getElementById('btn-switch-auth').onclick = () => {
      renderLogin(isReg ? 'login' : 'register');
    };

    // Toggle Password Visibility
    const toggleBtn = document.getElementById('btn-toggle-password');
    const passwordInput = document.getElementById('password');
    if (toggleBtn && passwordInput) {
      toggleBtn.onclick = () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        
        const icon = toggleBtn.querySelector('i');
        if (icon) {
          icon.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
        }
      };
    }

    // Toggle Confirm Password Visibility (Register Only)
    const toggleConfirmBtn = document.getElementById('btn-toggle-confirm-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    if (toggleConfirmBtn && confirmPasswordInput) {
      toggleConfirmBtn.onclick = () => {
        const isPassword = confirmPasswordInput.getAttribute('type') === 'password';
        confirmPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
        
        const icon = toggleConfirmBtn.querySelector('i');
        if (icon) {
          icon.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
        }
      };
    }

    // Forgot Password Logic
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    if (btnForgotPassword) {
      btnForgotPassword.onclick = (e) => {
        e.preventDefault();
        renderLogin('forgot-password');
      };
    }
  }

  // Google Login Logic
  if (document.getElementById('btn-google-login')) {
    document.getElementById('btn-google-login').onclick = async () => {
      showLoading();

      let handleFocusFallback;

      const setupFocusTracker = setTimeout(() => {
        handleFocusFallback = () => {
          const overlay = document.getElementById('loading-overlay');
          if (overlay && overlay.style.display === 'flex') {
            hideLoading();
            window.removeEventListener('focus', handleFocusFallback);
          }
        };
        window.addEventListener('focus', handleFocusFallback);
      }, 1200);

      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const token = await user.getIdToken();

        store.setUser({
          name: user.displayName,
          email: user.email,
          avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          token: token,
          uid: user.uid,
          provider: 'google'
        });

        navigateTo('/dashboard');
      } catch (error) {
        clearTimeout(setupFocusTracker);
        if (handleFocusFallback) {
          window.removeEventListener('focus', handleFocusFallback);
        }

        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          showToast('Login Google gagal! ' + (error.message || error), 'error');
        }
      } finally {
        clearTimeout(setupFocusTracker);
        if (handleFocusFallback) {
          window.removeEventListener('focus', handleFocusFallback);
        }
        hideLoading();
      }
    };
  }

  // Auth Form Submit
  if (document.getElementById('auth-form')) {
    document.getElementById('auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const pass = document.getElementById('password').value;

      showLoading();
      try {
        if (isReg) {
          const name = document.getElementById('reg-name').value;
          const confirmPass = document.getElementById('confirm-password').value;

          if (pass !== confirmPass) {
            showToast('Password dan Konfirmasi Password tidak cocok!', 'warning');
            hideLoading();
            return;
          }

          window.isVerificationModalActive = true;
          const result = await createUserWithEmailAndPassword(auth, email, pass);
          const user = result.user;

          const { updateProfile } = await import('../firebase-config.js');
          await updateProfile(user, { displayName: name });

          const token = await user.getIdToken(true);
          await store.setUser({
            uid: user.uid,
            name: name,
            email: user.email,
            avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
            token: token,
            emailVerified: false,
            provider: 'password'
          }, { name });

          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';
          
          fetch(`${API_URL}/auth/otp/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }).catch(err => {
            console.warn('Gagal trigger kirim OTP backend:', err);
          });

          hideLoading();
          renderLogin('verify-otp', user.email, { email: user.email, token });
        } else {
          if (email === 'guest' && pass === 'guest123') {
            store.setUser({ 
              name: 'Guest User', 
              email: 'guest@myfinance.com',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
              role: 'guest',
              provider: 'password'
            });
            navigateTo('/dashboard');
          } else {
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';
            const check2FARes = await fetch(`${API_URL}/auth/2fa/check`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password: pass })
            }).then(r => r.json()).catch(() => null);

            if (check2FARes && check2FARes.require2FA) {
              hideLoading();
              renderLogin('verify-2fa-otp', check2FARes.emailMasked, { preAuthToken: check2FARes.preAuthToken, emailMasked: check2FARes.emailMasked });
              return;
            }

            const userCred = await signInWithEmailAndPassword(auth, email, pass);
            const user = userCred.user;
            await user.reload();
            const token = await user.getIdToken(true);
            
            await store.setUser({
              uid: user.uid,
              name: user.displayName || (store.user && store.user.uid === user.uid ? store.user.name : null) || 'User MyFinance',
              email: user.email,
              avatar: user.photoURL || (store.user && store.user.uid === user.uid ? store.user.avatar : null) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
              token: token,
              emailVerified: user.emailVerified,
              provider: user.providerData[0]?.providerId || 'password'
            });

            hideLoading();
            navigateTo('/dashboard');
          }
        }
      } catch (error) {
        window.isVerificationModalActive = false;
        console.error("Auth Error:", error);
        let msg = error.message;
        if (error.code === 'auth/operation-not-allowed') {
          msg = 'Metode masuk dengan Email & Password belum diaktifkan di Firebase Console Anda.';
        } else if (error.code === 'auth/email-already-in-use') {
          msg = 'Alamat email ini sudah terdaftar. Silakan gunakan email lain atau langsung masuk ke akun Anda.';
        } else if (error.code === 'auth/invalid-email') {
          msg = 'Format alamat email tidak valid. Silakan periksa kembali.';
        } else if (error.code === 'auth/weak-password') {
          msg = 'Kata sandi terlalu lemah. Minimal harus terdiri dari 6 karakter.';
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          msg = 'Email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.';
        } else if (error.code === 'auth/too-many-requests') {
          msg = 'Terlalu banyak percobaan masuk yang gagal. Akses diblokir sementara.';
        } else if (error.code === 'auth/network-request-failed') {
          msg = 'Koneksi jaringan gagal. Harap periksa koneksi internet Anda.';
        }
        showAlert('Gagal', msg, 'error');
      } finally {
        hideLoading();
      }
    };
  }

  // Initialize mascot & cloud animations
  initLoginAnimations();
}
