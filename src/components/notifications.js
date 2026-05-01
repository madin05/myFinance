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

  toast.innerHTML = `
    <i class="ph-fill ${icon}"></i>
    <div class="toast-content">
      <div style="font-weight: 700; font-size: 0.9rem;">${type.toUpperCase()}</div>
      <div style="font-size: 0.85rem; opacity: 0.8;">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  // --- Swipe to Dismiss Logic ---
  let isDragging = false;
  let startX = 0;
  let currentX = 0;

  const onStart = (e) => {
    isDragging = true;
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    toast.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    currentX = x - startX;
    
    // Only allow swiping to the right
    if (currentX > 0) {
      toast.style.transform = `translateX(${currentX}px)`;
      toast.style.opacity = 1 - (currentX / 400);
    }
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    
    if (currentX > 100) {
      // Dismiss
      toast.style.transform = 'translateX(150%)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    } else {
      // Snap back
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }
    currentX = 0;
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
        <button class="btn btn-primary btn-full" id="btn-alert-ok">Oke Bre</button>
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
