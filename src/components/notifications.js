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
