import { store } from '../store.js';
import { navigateTo } from '../router.js';

let selectedIds = []; 

const formatTime = (isoString) => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch (e) {
    return isoString;
  }
};

export function renderNotifikasi() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const renderList = () => {
    const notifications = store.notifications || [];
    const selectionActive = selectedIds.length > 0;
    
    let html = `
      <div class="page-header" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 class="page-title" style="font-size: 1.5rem; margin: 0;">Pusat Notifikasi</h1>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          ${selectionActive ? `
            <button class="icon-btn" id="btn-delete-selected" data-tooltip-left="Hapus Terpilih" title="Hapus yang terpilih" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; width: 36px; height: 36px; position: relative;">
              <i class="ph ph-trash" style="font-size: 1.2rem;"></i>
            </button>
          ` : ''}
          
          <button class="icon-btn" id="btn-mark-all-read" data-tooltip-left="Tandai Semua Dibaca" title="Tandai Semua Dibaca" style="background: var(--card-bg); border: 1px solid var(--border); width: 36px; height: 36px; position: relative;">
            <i class="ph ph-check-circle" style="font-size: 1.2rem; color: var(--primary);"></i>
          </button>
        </div>
      </div>

      <div class="inbox-container" style="background-color: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <!-- Top Combined Bar (Checkbox + Text Label + Counter) -->
        <div style="background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border); padding: 0.75rem 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
          <input type="checkbox" id="select-all-notif" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary);" ${notifications.length > 0 && selectedIds.length === notifications.length ? 'checked' : ''}>
          <label for="select-all-notif" style="font-size: 0.85rem; font-weight: 600; cursor: pointer; color: var(--text-muted); user-select: none;">
            Pilih Semua
          </label>
          
          ${selectionActive ? `
            <div style="height: 12px; width: 1px; background: var(--border); margin: 0 4px;"></div>
            <span style="background: var(--primary); color: #fff; font-size: 0.7rem; padding: 1px 8px; border-radius: 10px; font-weight: 700;">${selectedIds.length} Terpilih</span>
          ` : ''}
        </div>
    `;

    if (notifications.length === 0) {
      html += `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <i class="ph ph-tray" style="font-size: 2.5rem; opacity: 0.3; margin-bottom: 1rem;"></i>
          <p style="font-size: 0.9rem;">Kotak masuk notifikasi kosong.</p>
        </div>
      `;
    } else {
      notifications.forEach((notif, index) => {
        const isLast = index === notifications.length - 1;
        const isSelected = selectedIds.includes(notif.id);
        const bgRead = isSelected ? 'rgba(79, 70, 229, 0.08)' : (notif.read ? 'transparent' : 'rgba(79, 70, 229, 0.03)');
        const fontWeight = notif.read ? '500' : '700';
        
        html += `
          <div class="inbox-row" data-id="${notif.id}" 
               style="display: flex; align-items: center; padding: 0.65rem 1.25rem; cursor: pointer; transition: background 0.2s; 
                      border-bottom: ${isLast ? 'none' : '1px solid var(--border)'}; 
                      background-color: ${bgRead};
                      position: relative;">
            
            <div style="padding-right: 1.25rem; display: flex; align-items: center;" onclick="event.stopPropagation();">
              <input type="checkbox" class="notif-checkbox" data-id="${notif.id}" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary);" ${isSelected ? 'checked' : ''}>
            </div>

            <div style="width: 120px; font-size: 0.85rem; font-weight: ${fontWeight}; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; padding-right: 1rem;">
              ${notif.source}
            </div>

            <div style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 1.5rem; font-size: 0.9rem;">
              <span style="font-weight: ${fontWeight}; color: var(--text-main);">${notif.title}</span>
              <span style="color: var(--text-muted); opacity: 0.8;"> - ${notif.desc}</span>
            </div>

            <div style="display: flex; align-items: center; justify-content: flex-end; width: 90px; flex-shrink: 0; position: relative;">
              <div class="row-date" style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); transition: opacity 0.2s;">
                ${formatTime(notif.time)}
              </div>
              <div class="row-actions" style="position: absolute; top: 50%; right: 0; transform: translateY(-50%); display: flex; gap: 0.25rem; opacity: 0; visibility: hidden; transition: all 0.2s;">
                <button class="icon-btn delete-single-btn" data-id="${notif.id}" title="Hapus" 
                        style="width: 28px; height: 28px; background: var(--bg-color); border-radius: 6px; color: var(--text-muted);">
                  <i class="ph ph-trash" style="font-size: 0.9rem;"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;
    attachListeners();
  };

  const attachListeners = () => {
    if (!document.getElementById('inbox-row-styles')) {
      const style = document.createElement('style');
      style.id = 'inbox-row-styles';
      style.innerHTML = `
        .inbox-row:hover { background-color: var(--bg-color) !important; }
        .inbox-row:hover .row-date { opacity: 0; visibility: hidden; }
        .inbox-row:hover .row-actions { opacity: 1 !important; visibility: visible !important; }
        [data-tooltip-left]:hover::after {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateY(-50%) translateX(0) !important;
        }
        
        .inbox-container input[type="checkbox"] {
          -webkit-appearance: none;
          appearance: none;
          background-color: transparent;
          margin: 0;
          width: 16px;
          height: 16px;
          border: 2px solid #cbd5e1;
          border-radius: 3px;
          display: grid;
          place-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        [data-theme="dark"] .inbox-container input[type="checkbox"] {
          border-color: #4b5563;
        }

        .inbox-container input[type="checkbox"]::before {
          content: "";
          width: 8px;
          height: 8px;
          transform: scale(0);
          transition: 120ms transform ease-in-out;
          box-shadow: inset 1em 1em var(--white);
          background-color: CanvasText;
          clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
        }

        .inbox-container input[type="checkbox"]:checked {
          background-color: var(--primary);
          border-color: var(--primary);
        }

        .inbox-container input[type="checkbox"]:checked::before {
          transform: scale(1);
        }
      `;
      document.head.appendChild(style);
    }

    const mainCb = document.getElementById('select-all-notif');
    if (mainCb) {
      mainCb.onchange = (e) => {
        if (e.target.checked) {
          selectedIds = store.notifications.map(n => n.id);
        } else {
          selectedIds = [];
        }
        renderList();
      };
    }

    document.querySelectorAll('.notif-checkbox').forEach(cb => {
      cb.onchange = (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) {
          if (!selectedIds.includes(id)) selectedIds.push(id);
        } else {
          selectedIds = selectedIds.filter(cid => cid !== id);
        }
        renderList();
      };
    });

    document.querySelectorAll('.delete-single-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        store.notifications = store.notifications.filter(n => n.id !== id);
        store.save();
        selectedIds = selectedIds.filter(sid => sid !== id);
        renderList();
      };
    });

    const delSelectedBtn = document.getElementById('btn-delete-selected');
    if (delSelectedBtn) {
      delSelectedBtn.onclick = () => {
        store.notifications = store.notifications.filter(n => !selectedIds.includes(n.id));
        store.save();
        selectedIds = [];
        renderList();
        import('../components/notifications.js').then(m => m.showToast('Notifikasi terpilih berhasil dihapus.', 'success'));
      };
    }

    document.querySelectorAll('.inbox-row').forEach(row => {
      row.onclick = () => {
        const id = parseInt(row.dataset.id);
        const target = store.notifications.find(n => n.id === id);
        if (target) {
          // Mark as read
          if (!target.read) {
            target.read = true;
            store.save(); // This handles header badge sync
            renderList();
          }
          // DEEPLINK REDIRECT: If the notification has an explicit context route, redirect there immediately.
          if (target.route && typeof navigateTo === 'function') {
            navigateTo(target.route);
          }
        }
      };
    });

    const btnAll = document.getElementById('btn-mark-all-read');
    if (btnAll) {
      btnAll.onclick = () => {
        store.notifications = store.notifications.map(n => ({ ...n, read: true }));
        store.save();
        selectedIds = []; 
        renderList();
        import('../components/notifications.js').then(m => m.showToast('Semua notifikasi ditandai sebagai dibaca.', 'success'));
      };
    }
  };

  renderList();
}
