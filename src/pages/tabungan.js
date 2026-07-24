import { store, formatRupiah } from '../store.js';
import { initKebabs, cleanupKebabs, closeAllKebabs } from '../ui/kebab.js';
import { showToast, checkVerification } from '../components/notifications.js';

/**
 * Helper to open Wishlist Modal dynamically
 */
async function openWishlistModal(goal = null, onSuccess = null) {
  checkVerification(async () => {
    try {
      const module = await import('../components/wishlist-modal.js');
      module.openAddWishlistModal(onSuccess, goal);
    } catch (err) {
      console.error('Failed to load wishlist modal:', err);
      showToast('Gagal membuka modal wishlist.', 'error');
    }
  });
}

/**
 * Renders an active goal card HTML string
 */
function renderGoalCard(g) {
  const percent = Math.min((g.current / g.target) * 100, 100);
  return `
    <div class="stat-card wishlist-item" style="padding: 1.5rem; position: relative;" data-id="${g.id}">
      <div class="drag-handle"><i class="ph-bold ph-dots-six-vertical"></i></div>
      
      <div style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.5rem;">
        <div class="icon-box ${g.color} text-white" style="width: 54px; height: 54px; font-size: 1.5rem; border-radius: 50%;">
          <i class="ph ${g.icon}"></i>
        </div>
        <div style="flex-grow: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <h3 style="margin: 0; font-size: 1.1rem;">${g.name}</h3>
          </div>
          <p class="text-muted text-xs">Target: ${formatRupiah(g.target)}</p>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 0.35rem; margin-top: -0.5rem;">
        <span class="font-bold text-primary" style="font-size: 0.85rem; line-height: 1;">${percent.toFixed(0)}%</span>
      </div>
      <div class="progress-bar-container" style="height: 10px; margin-bottom: 1.25rem; background-color: var(--border-light);">
        <div class="progress-bar ${g.color}" style="width: ${percent}%;"></div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <p class="text-muted text-xs mb-xs">Terkumpul</p>
          <h3 style="margin: 0; font-size: 1.15rem;">${formatRupiah(g.current)}</h3>
        </div>
        <div class="kebab-wrapper" style="margin-top: -8px;">
          <button class="kebab-trigger" data-id="${g.id}" title="Opsi lainnya" style="background: transparent; border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">
            <i class="ph-bold ph-dots-three"></i>
          </button>
          <div class="kebab-dropdown" data-kebab-for="${g.id}">
            <button class="kebab-item kebab-topup" data-id="${g.id}" data-name="${g.name}">
              <i class="ph ph-plus"></i> Tabung
            </button>
            <button class="kebab-item kebab-edit" data-id="${g.id}">
              <i class="ph ph-pencil-simple"></i> Edit
            </button>
            <button class="kebab-item kebab-done" data-id="${g.id}">
              <i class="ph ph-check"></i> Tandai Selesai
            </button>
            <div class="kebab-divider"></div>
            <button class="kebab-item danger kebab-delete" data-id="${g.id}">
              <i class="ph ph-trash"></i> Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders a historical/completed goal item HTML string
 */
function renderHistoryGoalItem(g) {
  const percent = Math.min((g.current / g.target) * 100, 100);
  return `
    <div class="history-item" data-id="${g.id}">
      <div class="history-item-info">
        <div class="icon-box ${g.color} text-white" style="width: 36px; height: 36px; font-size: 1rem; border-radius: 10px; flex-shrink: 0;">
          <i class="ph ${g.icon}"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <p class="history-item-name">${g.name}</p>
          <p class="history-item-meta">${formatRupiah(g.current)} / ${formatRupiah(g.target)} · ${percent.toFixed(0)}%</p>
        </div>
      </div>
      <div class="history-item-actions">
        <button class="btn-history-restore" data-id="${g.id}" title="Pulihkan">
          <i class="ph ph-arrow-counter-clockwise"></i> <span>Pulihkan</span>
        </button>
        <button class="btn-history-delete" data-id="${g.id}" title="Hapus Permanen">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    </div>
  `;
}

export function renderTabungan() {
  const existingPanel = document.getElementById('history-panel');
  const isHistoryOpen = existingPanel ? existingPanel.classList.contains('open') : false;

  const container = document.getElementById('page-content');
  if (!container) return;

  const allGoals = store.savings || [];
  const activeGoals = allGoals.filter(g => !g.isDone);
  const historyGoals = allGoals.filter(g => g.isDone);

  const goalsHtml = activeGoals.map(renderGoalCard).join('');
  const historyHtml = historyGoals.length > 0 
    ? historyGoals.map(renderHistoryGoalItem).join('')
    : '<p class="text-muted" style="text-align:center; padding: 2rem 0; font-size: 0.85rem;">Belum ada wishlist yang diselesaikan.</p>';

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3>My Wishlist & Savings</h3>
      </div>
      <div style="display: flex; gap: 0.75rem; align-items: center;">
        ${historyGoals.length > 0 ? `<button class="btn btn-outline" id="btn-toggle-history" style="font-size: 0.8rem; padding: 8px 14px;"><i class="ph ph-clock-counter-clockwise"></i> Histori</button>` : ''}
        ${allGoals.length > 0 ? '<button class="btn btn-primary" id="btn-create-goal"><i class="ph ph-plus"></i> Buat Target Baru</button>' : ''}
      </div>
    </div>

    <div class="wishlist-container" id="wishlist-container">
      ${goalsHtml || `
        <div class="wishlist-empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;">
          <style>
            @keyframes floatAnim {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            [data-theme="light"] .illustration-dark { display: none !important; }
            [data-theme="dark"] .illustration-light { display: none !important; }
          </style>
          <img class="illustration-light" src="/assets/wishlist-light.svg" alt="Wishlist Empty" style="width: 220px; height: 220px; animation: floatAnim 4s ease-in-out infinite;" />
          <img class="illustration-dark" src="/assets/wishlist-dark.svg" alt="Wishlist Empty" style="width: 220px; height: 220px; animation: floatAnim 4s ease-in-out infinite;" />
          <div style="max-width: 320px; margin-top: -0.5rem;">
            <h4 style="margin: 0 0 0.5rem; font-size: 1.25rem; color: var(--text-main); font-weight: 600;">Belum Ada Wishlist</h4>
            <p class="text-muted text-xs" style="line-height: 1.5; font-size: 0.85rem;">Yuk, mulai buat target baru untuk tabungan impianmu hari ini!</p>
          </div>
          <button class="btn btn-primary" id="btn-create-goal-empty" style="margin-top: 0.5rem;"><i class="ph ph-plus"></i> Buat Target</button>
        </div>
      `}
    </div>

    <!-- History Right Drawer Overlay & Sidebar -->
    <div class="history-backdrop" id="history-backdrop"></div>
    <div class="history-drawer" id="history-drawer">
      <div class="history-drawer-header">
        <h4 style="margin: 0; font-size: 1.05rem; color: var(--text-main); font-weight: 600;">
          History Wishlist
        </h4>
        <button class="history-drawer-close" id="btn-close-history" title="Tutup">
          <i class="ph ph-x"></i>
        </button>
      </div>
      <div class="history-drawer-body">
        ${historyHtml}
      </div>
    </div>

    <style>
      .history-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 1200;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s;
      }
      .history-backdrop.open {
        opacity: 1;
        visibility: visible;
      }

      .history-drawer {
        position: fixed;
        top: 0;
        right: -420px;
        width: 400px;
        max-width: 90vw;
        height: 100vh;
        background: var(--card-bg);
        border-left: 1px solid var(--border);
        box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
        z-index: 1250;
        display: flex;
        flex-direction: column;
        transition: right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .history-drawer.open {
        right: 0;
      }

      .history-drawer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
      }
      .history-drawer-close {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 1.2rem;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .history-drawer-close:hover {
        color: var(--red);
        transform: rotate(90deg);
      }

      .history-drawer-body {
        padding: 0.75rem 0;
        overflow-y: auto;
        flex: 1;
      }

      .history-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.85rem 1.25rem;
        gap: 1rem;
        transition: background 0.15s;
      }
      .history-item:hover {
        background: var(--bg-color);
      }
      .history-item + .history-item {
        border-top: 1px solid var(--border-light, var(--border));
      }
      .history-item-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
        min-width: 0;
      }
      .history-item-name {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .history-item-meta {
        margin: 2px 0 0;
        font-size: 0.75rem;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .history-item-actions {
        display: flex;
        gap: 0.35rem;
        flex-shrink: 0;
      }
      .btn-history-restore {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .btn-history-restore:hover {
        background: transparent;
        color: var(--primary);
      }
      .btn-history-restore:hover i {
        transform: rotate(-45deg);
      }
      .btn-history-delete {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-size: 1.1rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-history-delete:hover {
        background: transparent;
        color: var(--red);
        transform: scale(1.15);
      }


      @media (max-width: 480px) {
        .history-drawer {
          width: 100vw;
          max-width: 100vw;
        }
      }
    </style>
  `;

  // --- Attach Event Listeners ---

  const btnToggleHistory = document.getElementById('btn-toggle-history');
  const historyDrawer = document.getElementById('history-drawer');
  const historyBackdrop = document.getElementById('history-backdrop');
  const btnCloseHistory = document.getElementById('btn-close-history');

  const openDrawer = () => {
    if (historyDrawer && historyBackdrop) {
      historyBackdrop.classList.add('open');
      historyDrawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };

  const closeDrawer = () => {
    if (historyDrawer && historyBackdrop) {
      historyBackdrop.classList.remove('open');
      historyDrawer.classList.remove('open');
      document.body.style.overflow = '';
    }
  };
  
  if (isHistoryOpen && historyGoals.length > 0) {
    openDrawer();
  }

  if (btnToggleHistory) btnToggleHistory.addEventListener('click', openDrawer);
  if (btnCloseHistory) btnCloseHistory.addEventListener('click', closeDrawer);
  if (historyBackdrop) historyBackdrop.addEventListener('click', closeDrawer);

  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
      document.removeEventListener('keydown', handleEscKey);
    }
  };
  document.addEventListener('keydown', handleEscKey);


  // History: Restore
  container.querySelectorAll('.btn-history-restore').forEach(btn => {
    btn.addEventListener('click', async () => {
      checkVerification(async () => {
        const id = Number(btn.dataset.id);
        try {
          await store.editSaving(id, { isDone: false });
          showToast('Wishlist berhasil dipulihkan!', 'success');
          renderTabungan();
        } catch (err) {
          showToast('Gagal memulihkan: ' + (err?.message || err), 'error');
        }
      });
    });
  });

  // History: Delete Permanently
  container.querySelectorAll('.btn-history-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      checkVerification(async () => {
        const id = Number(btn.dataset.id);
        const goal = store.savings.find(s => s.id === id);
        try {
          const { showConfirm } = await import('../components/notifications.js');
          const confirmed = await showConfirm('Hapus Permanen?', `Wishlist "${goal?.name || ''}" akan dihapus selamanya dan tidak bisa dikembalikan.`);
          if (confirmed) {
            await store.removeSaving(id);
            showToast('Wishlist dihapus permanen!', 'info');
            renderTabungan();
          }
        } catch (err) {
          showToast('Gagal menghapus: ' + (err?.message || err), 'error');
        }
      });
    });
  });

  // Create Goal Buttons
  const handleCreateClick = () => openWishlistModal(null, () => renderTabungan());
  const btnCreate = document.getElementById('btn-create-goal');
  if (btnCreate) btnCreate.addEventListener('click', handleCreateClick);

  const btnCreateEmpty = document.getElementById('btn-create-goal-empty');
  if (btnCreateEmpty) btnCreateEmpty.addEventListener('click', handleCreateClick);

  // Kebab actions initialization
  cleanupKebabs();
  initKebabs(
    container,
    // onEdit
    (id) => {
      const goalToEdit = store.savings.find(s => s.id === Number(id));
      if (goalToEdit) {
        openWishlistModal(goalToEdit, () => renderTabungan());
      }
    },
    // onDelete
    (id) => {
      checkVerification(() => {
        import('../components/modal.js').then(module => {
          module.openConfirmModal('Hapus Wishlist?', 'Yakin mau hapus target ini?', () => {
            store.removeSaving(Number(id))
              .then(() => {
                showToast('Target wishlist berhasil dihapus!', 'info');
                renderTabungan();
              })
              .catch((err) => {
                showToast('Gagal hapus wishlist: ' + (err?.message || err), 'error');
                renderTabungan();
              });
          });
        }).catch(err => {
          console.error('Failed to load modal component:', err);
        });
      });
    }
  );

  // Top-up Action (Kebab Item)
  container.querySelectorAll('.kebab-topup').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAllKebabs();
      checkVerification(async () => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        const name = e.currentTarget.getAttribute('data-name');
        try {
          const module = await import('../components/wishlist-modal.js');
          module.openAddFundsModal(id, name, () => renderTabungan());
        } catch (err) {
          console.error('Failed to load add funds modal:', err);
          showToast('Gagal membuka modal tabung.', 'error');
        }
      });
    });
  });

  // Toggle Done/Undone Action
  container.querySelectorAll('.kebab-done').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAllKebabs();
      checkVerification(async () => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        const goal = store.savings.find(s => s.id === id);
        if (goal) {
          try {
            await store.editSaving(id, { isDone: !goal.isDone });
            showToast(!goal.isDone ? 'Target ditandai belum selesai' : 'Target berhasil diselesaikan!', 'success');
            renderTabungan();
          } catch (err) {
            showToast('Gagal update status target: ' + (err?.message || err), 'error');
          }
        }
      });
    });
  });

  // --- SortableJS Logic ---
  const listContainer = document.getElementById('wishlist-container');
  if (window.Sortable && listContainer) {
    new Sortable(listContainer, {
      animation: 250,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      handle: '.drag-handle',
      ghostClass: 'dragging',
      dragClass: 'sortable-drag',
      forceFallback: true,
      fallbackTolerance: 3,
      fallbackOnBody: true,
      delay: 0,
      delayOnTouchOnly: false,
      swapThreshold: 1,
      onStart: function() {
        listContainer.classList.add('is-dragging');
        document.body.style.userSelect = 'none';
      },
      onEnd: function() {
        listContainer.classList.remove('is-dragging');
        document.body.style.userSelect = '';
        const newOrderIds = [...listContainer.querySelectorAll('.wishlist-item')].map(el => Number(el.dataset.id));
        const newOrder = newOrderIds.map(id => store.savings.find(s => s.id === id)).filter(Boolean);
        
        store.reorderSavingsRemote(newOrder).catch((err) => {
          showToast('Gagal simpan urutan wishlist: ' + (err?.message || err), 'error');
          store.reorderSavings(store.savings);
        });
      }
    });
  }
}

