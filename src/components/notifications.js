// src/components/notifications.js
import { auth } from '../firebase-config.js';
import { store } from '../store.js';

/**
 * Formatter pesan error ramah pengguna (UI/UX).
 * Mengubah string error teknikal/Prisma/DB/network menjadi pesan santai & actionable.
 */
export function formatErrorMessage(rawMessage) {
  if (!rawMessage) return 'Ada sedikit kendala sistem nih, bre. Coba lagi beberapa saat ya!';

  const msg = typeof rawMessage === 'string' ? rawMessage : (rawMessage.message || String(rawMessage));

  // Log error teknikal asli di console agar tetap bisa dipantau pengembang
  console.error('[App Error Detail]:', rawMessage);

  // 1. Prisma / Database / Connection Timeout errors
  if (
    msg.includes('prisma') ||
    msg.includes('Prisma') ||
    msg.includes('connection pool') ||
    msg.includes('Timed out') ||
    msg.includes('invocation in') ||
    msg.includes('database') ||
    msg.includes('Postgres') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  ) {
    return 'Server sedang memproses koneksi. Coba muat ulang halaman atau klik sekali lagi ya, bre!';
  }

  // 2. Network / Offline errors
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Network request failed') ||
    msg.includes('ERR_CONNECTION_REFUSED')
  ) {
    return 'Koneksi internet terputus atau server sedang offline. Cek jaringan kamu dulu ya, bre!';
  }

  // 3. Auth / Firebase errors
  if (msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
    return 'Email atau kata sandi kurang tepat. Coba periksa lagi ya!';
  }
  if (msg.includes('auth/user-not-found')) {
    return 'Akun belum terdaftar. Yuk buat akun baru dulu!';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'Email ini sudah terdaftar. Silakan login atau pakai email lain ya!';
  }

  // 4. Client Runtime Errors (TypeError, ReferenceError, dsb.)
  if (
    msg.includes('TypeError') ||
    msg.includes('ReferenceError') ||
    msg.includes('SyntaxError') ||
    msg.includes('Cannot read property') ||
    msg.includes('is not a function')
  ) {
    return 'Ada kendala sistem ringan. Coba muat ulang halaman ya, bre!';
  }

  // 5. Raw JSON/Stack traces panjang
  if (msg.length > 140 && (msg.includes('{') || msg.includes('at ') || msg.includes('\n'))) {
    return 'Gagal memproses data. Coba ulangi tindakan kamu atau muat ulang halaman ya, bre!';
  }

  return msg;
}

export const showToast = (arg1, arg2 = 'success', arg3 = 4500, arg4 = null) => {
  let title = 'Pemberitahuan !';
  let displayMessage = '';
  let type = 'success';
  let duration = 4500;

  // Determine signature: showToast(title, message, type, duration) vs showToast(message, type, duration)
  if (typeof arg3 === 'string' || arg4 !== null) {
    title = arg1 || 'Pemberitahuan !';
    displayMessage = arg2 || '';
    type = arg3 || 'success';
    duration = typeof arg4 === 'number' ? arg4 : 4500;
  } else {
    displayMessage = arg1 || '';
    type = typeof arg2 === 'string' ? arg2 : 'success';
    duration = typeof arg3 === 'number' ? arg3 : 4500;
    title = type === 'success' ? 'Berhasil !' :
            (type === 'error' || type === 'danger') ? 'Oops, Gagal !' : 'Pemberitahuan !';
  }

  if (type === 'error' || type === 'danger') {
    displayMessage = formatErrorMessage(displayMessage);
  }

  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Anti-Spam: Remove duplicate toast or limit count
  const existingToasts = container.querySelectorAll('.toast');
  existingToasts.forEach(t => {
    if (t.innerText.includes(displayMessage)) t.remove();
  });
  
  if (container.querySelectorAll('.toast').length >= 3) {
    container.querySelector('.toast').remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'ph-check-circle' : 
               (type === 'error' || type === 'danger') ? 'ph-warning-circle' : 'ph-info';

  toast.innerHTML = `
    <div class="toast-icon-wrapper ${type}">
      <i class="ph ${icon}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${displayMessage}</div>
    </div>
    <button class="toast-close" title="Tutup">
      <i class="ph ph-x"></i>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toast.style.animation = 'none';
      toast.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';
      toast.style.transform = 'translateX(120vw)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    });
  }

  container.appendChild(toast);

  // --- Swipe Right / Up to Dismiss Logic ---
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  const onStart = (e) => {
    if (e.target.closest('.toast-close')) return;
    isDragging = true;
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    toast.style.animation = 'none';
    toast.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const y = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    currentX = x - startX;
    currentY = y - startY;
    
    const absX = Math.abs(currentX);
    const absY = Math.abs(currentY);

    // Support swiping RIGHT (currentX > 0) or UP (currentY < 0)
    if (currentX > 0 || currentY < 0) {
      if (absX >= absY && currentX > 0) {
        toast.style.transform = `translateX(${currentX}px)`;
        toast.style.opacity = `${Math.max(0.2, 1 - (currentX / 350))}`;
      } else if (currentY < 0) {
        toast.style.transform = `translateY(${currentY}px)`;
        toast.style.opacity = `${Math.max(0.2, 1 - (absY / 150))}`;
      }
    }
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    toast.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease';
    
    const absX = Math.abs(currentX);
    const absY = Math.abs(currentY);

    if (currentX > 40 || currentY < -40) {
      // Dismiss Right or Up
      if (absX >= absY && currentX > 40) {
        toast.style.transform = 'translateX(120vw)';
      } else {
        toast.style.transform = 'translateY(-150%)';
      }
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    } else {
      // Snap back
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }
    currentX = 0;
    currentY = 0;
  };

  toast.addEventListener('mousedown', onStart);
  toast.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  // Auto-remove timer
  const dismissToast = () => {
    if (toast.parentElement && !isDragging) {
      toast.style.animation = 'none';
      toast.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease';
      toast.style.transform = 'translateX(120vw)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 350);
    }
  };

  let autoRemove = setTimeout(dismissToast, duration);

  // Pause timer on hover
  toast.onmouseenter = () => clearTimeout(autoRemove);
  toast.onmouseleave = () => {
    autoRemove = setTimeout(dismissToast, duration);
  };
};

const animateCloseAlert = (overlay, resolveValue, resolve) => {
  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.classList.add('closing');
  const card = overlay.querySelector('.custom-alert-card');
  if (card && window.innerWidth <= 768) {
    card.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
    card.style.transform = 'translateY(100%)';
  }
  setTimeout(() => {
    overlay.remove();
    if (resolve) resolve(resolveValue);
  }, 250);
};

export const showAlert = (title, message, type = 'info') => {
  const displayMessage = type === 'error' ? formatErrorMessage(message) : message;

  return new Promise((resolve) => {
    document.querySelectorAll('.custom-alert-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    
    const icon = type === 'error' ? 'ph-warning-circle text-red' : 
                 type === 'success' ? 'ph-check-circle text-green' : 'ph-info text-primary';

    overlay.innerHTML = `
      <div class="custom-alert-card">
        <div style="font-size: 3rem; margin-bottom: 1rem;">
          <i class="ph-fill ${icon}"></i>
        </div>
        <h3 style="margin-bottom: 0.75rem;">${title}</h3>
        <p class="text-muted" style="margin-bottom: 2rem;">${displayMessage}</p>
        <button class="btn btn-primary btn-full" class="btn-alert-ok">Oke</button>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    let isResolved = false;
    const close = () => {
      if (isResolved) return;
      isResolved = true;
      window.removeEventListener('keydown', handleKey);
      animateCloseAlert(overlay, undefined, resolve);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') close();
    };

    window.addEventListener('keydown', handleKey);

    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    const okBtn = overlay.querySelector('button');
    if (okBtn) okBtn.onclick = close;

    const card = overlay.querySelector('.custom-alert-card');
    if (card) {
      let startY = 0;
      let currentY = 0;
      let isDragging = false;

      const onTouchStart = (e) => {
        if (window.innerWidth > 768) return;
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        card.style.transition = 'none';
      };

      const onTouchMove = (e) => {
        if (!isDragging) return;
        const deltaY = e.touches[0].clientY - startY;
        if (deltaY > 0) {
          currentY = e.touches[0].clientY;
          card.style.transform = `translateY(${deltaY}px)`;
          if (e.cancelable) e.preventDefault();
        } else {
          isDragging = false;
          card.style.transform = '';
        }
      };

      const onTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        const deltaY = currentY - startY;
        if (deltaY > 70) {
          close();
        } else {
          card.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
          card.style.transform = '';
        }
      };

      card.addEventListener('touchstart', onTouchStart, { passive: true });
      card.addEventListener('touchmove', onTouchMove, { passive: false });
      card.addEventListener('touchend', onTouchEnd);
    }
  });
};

export const showConfirm = (title, message) => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    
    overlay.innerHTML = `
      <div class="custom-alert-card" style="text-align: left;">
        <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 10px;">
          <i class="ph-fill ph-question" style="font-size: 1.5rem;"></i>
          ${title}
        </h3>
        <p class="text-muted" style="margin-bottom: 2.5rem;">${message}</p>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-outline" style="flex: 1; justify-content: center;" id="btn-confirm-cancel">Batal</button>
          <button class="btn btn-primary" style="flex: 1; justify-content: center;" id="btn-confirm-yes">Ya, Lanjut</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    let isResolved = false;
    const close = (result) => {
      if (isResolved) return;
      isResolved = true;
      window.removeEventListener('keydown', handleKey);
      animateCloseAlert(overlay, result, resolve);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') close(false);
    };

    window.addEventListener('keydown', handleKey);

    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };

    const cancelBtn = overlay.querySelector('#btn-confirm-cancel');
    if (cancelBtn) cancelBtn.onclick = () => close(false);

    const yesBtn = overlay.querySelector('#btn-confirm-yes');
    if (yesBtn) yesBtn.onclick = () => close(true);

    const card = overlay.querySelector('.custom-alert-card');
    if (card) {
      let startY = 0;
      let currentY = 0;
      let isDragging = false;

      const onTouchStart = (e) => {
        if (window.innerWidth > 768) return;
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        card.style.transition = 'none';
      };

      const onTouchMove = (e) => {
        if (!isDragging) return;
        const deltaY = e.touches[0].clientY - startY;
        if (deltaY > 0) {
          currentY = e.touches[0].clientY;
          card.style.transform = `translateY(${deltaY}px)`;
          if (e.cancelable) e.preventDefault();
        } else {
          isDragging = false;
          card.style.transform = '';
        }
      };

      const onTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        const deltaY = currentY - startY;
        if (deltaY > 70) {
          close(false);
        } else {
          card.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
          card.style.transform = '';
        }
      };

      card.addEventListener('touchstart', onTouchStart, { passive: true });
      card.addEventListener('touchmove', onTouchMove, { passive: false });
      card.addEventListener('touchend', onTouchEnd);
    }
  });
};

export const showVerificationModal = () => {
  // Tutup overlay verifikasi jika sudah ada
  const existing = document.getElementById('verification-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'custom-alert-overlay';
  overlay.id = 'verification-modal-overlay';

  overlay.innerHTML = `
    <div class="custom-alert-card" style="text-align: center;">
      <div style="margin: 0 auto 1rem; display: flex; justify-content: center; align-items: center;">
        <img src="/assets/asset_notif_light.svg" class="verif-notif-img-light" alt="Verifikasi Email" style="width: 160px; height: auto; max-height: 160px; object-fit: contain;" />
        <img src="/assets/asset_notif_dark.svg" class="verif-notif-img-dark" alt="Verifikasi Email" style="width: 160px; height: auto; max-height: 160px; object-fit: contain;" />
      </div>
      <h3 style="margin-bottom: 0.75rem; font-size: 1.25rem; color: var(--text-main);">Verifikasi Email Diperlukan</h3>
      <p class="text-muted" style="font-size: 0.88rem; line-height: 1.6; margin-bottom: 1.75rem;">
        Silakan verifikasi email kamu untuk dapat menambah, mengubah, atau menghapus data.
      </p>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <button class="btn btn-primary btn-full" id="btn-modal-resend-verif" style="height: 44px; border-radius: 12px; font-weight: 600;">Kirim Ulang Email Verifikasi</button>
        <button class="btn btn-outline btn-full" id="btn-modal-close-verif" style="height: 44px; border-radius: 12px;">Tutup</button>
      </div>
    </div>
    <style>
      [data-theme="light"] .verif-notif-img-dark { display: none !important; }
      [data-theme="light"] .verif-notif-img-light { display: block !important; }
      [data-theme="dark"] .verif-notif-img-light { display: none !important; }
      [data-theme="dark"] .verif-notif-img-dark { display: block !important; }
    </style>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  const close = () => overlay.remove();
  document.getElementById('btn-modal-close-verif').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  document.getElementById('btn-modal-resend-verif').onclick = async () => {
    const btn = document.getElementById('btn-modal-resend-verif');
    btn.disabled = true;
    btn.textContent = 'Mengirim...';

    try {
      const { store } = await import('../store.js');
      const token = store.user?.token;
      if (!token) throw new Error('Token tidak ditemukan, silakan login ulang.');

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

      const res = await fetch(`${API_URL}/users/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim email.');

      btn.textContent = 'Email Terkirim! ✓';
      showToast('Tautan verifikasi telah dikirim ke email kamu.', 'success');
      setTimeout(() => close(), 1500);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Coba Lagi';
      showToast(err.message || 'Gagal mengirim email verifikasi.', 'error');
    }
  };
};

export const showOptionalVerificationModal = () => {
  window.isVerificationModalActive = true;
  const existing = document.getElementById('optional-verif-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'custom-alert-overlay';
  overlay.id = 'optional-verif-modal-overlay';

  overlay.innerHTML = `
    <div class="custom-alert-card" style="text-align: center; position: relative;">
      <button id="btn-modal-opt-x" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 1.2rem; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
        <i class="ph ph-x"></i>
      </button>

      <div style="margin: 0 auto 1rem; display: flex; justify-content: center; align-items: center;">
        <img src="/assets/asset_notif_light.svg" class="verif-notif-img-light" alt="Verifikasi Email" style="width: 150px; height: auto; max-height: 150px; object-fit: contain;" />
        <img src="/assets/asset_notif_dark.svg" class="verif-notif-img-dark" alt="Verifikasi Email" style="width: 150px; height: auto; max-height: 150px; object-fit: contain;" />
      </div>

      <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem; color: var(--text-main);">Verifikasi Akunmu</h3>
      <p class="text-muted" style="font-size: 0.88rem; line-height: 1.6; margin-bottom: 1.75rem;">
        Link verifikasi telah dikirim ke email kamu. Yuk verifikasi akunmu dulu agar fitur dapat diakses lebih baik.
      </p>

      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <button class="btn btn-primary btn-full" id="btn-modal-opt-resend" style="height: 46px; border-radius: 12px; font-weight: 600;">Kirim Ulang Email Verifikasi</button>
        <button class="btn btn-outline btn-full" id="btn-modal-opt-close" style="height: 44px; border-radius: 12px;">Nanti Saja</button>
      </div>
    </div>
    <style>
      [data-theme="light"] .verif-notif-img-dark { display: none !important; }
      [data-theme="light"] .verif-notif-img-light { display: block !important; }
      [data-theme="dark"] .verif-notif-img-light { display: none !important; }
      [data-theme="dark"] .verif-notif-img-dark { display: block !important; }
    </style>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  // Sembunyikan banner atas dulu saat pop-up modal ini aktif
  const existingBanner = document.getElementById('email-verify-banner');
  if (existingBanner) existingBanner.style.display = 'none';

  const close = () => {
    window.isVerificationModalActive = false;
    overlay.remove();
    // Tampilkan banner verifikasi di atas HANYA setelah pop-up modal ditutup/diclose
    const banner = document.getElementById('email-verify-banner');
    if (banner) {
      import('../firebase-config.js').then(({ auth }) => {
        import('../pages/login.js').then(({ renderEmailVerificationBanner }) => {
          if (auth.currentUser && !auth.currentUser.emailVerified) {
            renderEmailVerificationBanner(auth.currentUser);
          }
        });
      });
    }
  };

  document.getElementById('btn-modal-opt-close').onclick = close;
  document.getElementById('btn-modal-opt-x').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  document.getElementById('btn-modal-opt-resend').onclick = async () => {
    const btn = document.getElementById('btn-modal-opt-resend');
    btn.disabled = true;
    btn.textContent = 'Mengirim...';

    try {
      const { store } = await import('../store.js');
      const token = store.user?.token;
      if (!token) throw new Error('Token tidak ditemukan, silakan login ulang.');

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

      const res = await fetch(`${API_URL}/users/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim email.');

      btn.textContent = 'Email Terkirim! ✓';
      showToast('Tautan verifikasi telah dikirim ke email kamu.', 'success');
      setTimeout(() => close(), 1500);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Coba Lagi';
      showToast(err.message || 'Gagal mengirim email verifikasi.', 'error');
    }
  };
};

export function isUserVerified() {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    const isGoogle = firebaseUser.providerData?.some(p => p.providerId === 'google.com');
    if (isGoogle) return true;
    return firebaseUser.emailVerified;
  }
  if (store.user?.provider === 'google') return true;
  return store.user?.emailVerified ?? false;
}

export const checkVerification = (actionCallback) => {
  if (isUserVerified()) {
    if (typeof actionCallback === 'function') actionCallback();
  } else {
    showVerificationModal();
  }
};

