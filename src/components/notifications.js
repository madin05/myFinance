// src/components/notifications.js

export const showToast = (message, type = 'success', duration = 3000) => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Anti-Spam: Remove duplicate toast or limit count
  const existingToasts = container.querySelectorAll('.toast');
  existingToasts.forEach(t => {
    if (t.innerText.includes(message)) t.remove();
  });
  
  if (container.querySelectorAll('.toast').length >= 3) {
    container.querySelector('.toast').remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'ph-check-circle' : 
               type === 'error' ? 'ph-warning-circle' : 'ph-info';
               
  const title = type === 'success' ? 'Berhasil !' :
                type === 'error' ? 'Oops, Gagal !' : 'Pemberitahuan !';

  toast.innerHTML = `
    <div class="toast-icon-wrapper ${type}">
      <i class="ph ${icon}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="ph ph-x"></i>
    </button>
  `;

  container.appendChild(toast);

  // --- Swipe to Dismiss Logic ---
  let isDragging = false;
  let startY = 0;
  let currentY = 0;

  const onStart = (e) => {
    // Jangan drag kalau klik tombol close
    if (e.target.closest('.toast-close')) return;
    isDragging = true;
    startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    toast.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const y = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    currentY = y - startY;
    
    // Only allow swiping UP
    if (currentY < 0) {
      toast.style.transform = `translateY(${currentY}px)`;
      toast.style.opacity = 1 - (Math.abs(currentY) / 100);
    }
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    
    if (currentY < -50) {
      // Dismiss
      toast.style.transform = 'translateY(-150%)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    } else {
      // Snap back
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    }
    currentY = 0;
  };

  toast.addEventListener('mousedown', onStart);
  toast.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  // Auto-remove timer
  let autoRemove = setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'toastOut 0.4s forwards';
      setTimeout(() => toast.remove(), 400);
    }
  }, duration);

  // Pause timer on hover
  toast.onmouseenter = () => clearTimeout(autoRemove);
  toast.onmouseleave = () => {
    autoRemove = setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'toastOut 0.4s forwards';
        setTimeout(() => toast.remove(), 400);
      }
    }, duration);
  };
};

export const showAlert = (title, message, type = 'info') => {
  return new Promise((resolve) => {
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
        <p class="text-muted" style="margin-bottom: 2rem;">${message}</p>
        <button class="btn btn-primary btn-full" id="btn-alert-ok">Oke</button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-alert-ok').onclick = () => {
      overlay.remove();
      resolve();
    };
  });
};

export const showConfirm = (title, message) => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    
    overlay.innerHTML = `
      <div class="custom-alert-card" style="text-align: left;">
        <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 10px;">
          <i class="ph-fill ph-question text-orange" style="font-size: 1.5rem;"></i>
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

    document.getElementById('btn-confirm-cancel').onclick = () => {
      overlay.remove();
      resolve(false);
    };

    document.getElementById('btn-confirm-yes').onclick = () => {
      overlay.remove();
      resolve(true);
    };
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
    <div class="custom-alert-card" style="text-align: center; max-width: 400px; padding: 2.25rem 1.75rem;">
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
    <div class="custom-alert-card" style="text-align: center; max-width: 420px; padding: 2.25rem 1.75rem; position: relative;">
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

export const checkVerification = (actionCallback) => {
  import('../router.js').then(({ isUserVerified }) => {
    if (isUserVerified()) {
      if (typeof actionCallback === 'function') actionCallback();
    } else {
      showVerificationModal();
    }
  });
};

