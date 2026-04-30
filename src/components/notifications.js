// src/components/notifications.js

export const showToast = (message, type = 'success', duration = 3000) => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
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

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.4s forwards';
    setTimeout(() => toast.remove(), 400);
  }, duration);
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
