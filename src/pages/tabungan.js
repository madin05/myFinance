import { store, formatRupiah } from '../store.js';
import { initKebabs, cleanupKebabs, closeAllKebabs } from '../ui/kebab.js';
import { showToast, checkVerification } from '../components/notifications.js';
import { escapeHtml } from '../utils.js';

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
  const safeName = escapeHtml(g.name);
  const safeIcon = escapeHtml(g.icon);
  const safeColor = escapeHtml(g.color);

  return `
    <div class="stat-card wishlist-item" data-id="${g.id}">
      <div class="drag-handle"><i class="ph-bold ph-dots-six-vertical"></i></div>
      
      <div class="wishlist-item-header">
        <div class="icon-box ${safeColor} text-white wishlist-item-icon">
          <i class="ph ${safeIcon}"></i>
        </div>
        <div class="wishlist-item-body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <h3 class="wishlist-item-title">${safeName}</h3>
          </div>
          <p class="text-muted text-xs">Target: ${formatRupiah(g.target)}</p>
        </div>
      </div>

      <div class="wishlist-percent-wrapper">
        <span class="font-bold text-primary wishlist-percent-text">${percent.toFixed(0)}%</span>
      </div>
      <div class="progress-bar-container wishlist-progress-container">
        <div class="progress-bar ${safeColor}" style="width: ${percent}%;"></div>
      </div>

      <div class="wishlist-card-footer">
        <div>
          <p class="text-muted text-xs mb-xs">Terkumpul</p>
          <h3 class="wishlist-amount-value">${formatRupiah(g.current)}</h3>
        </div>
        <div class="kebab-wrapper wishlist-kebab-wrapper">
          <button class="kebab-trigger wishlist-kebab-trigger" data-id="${g.id}" title="Opsi lainnya">
            <i class="ph-bold ph-dots-three"></i>
          </button>
          <div class="kebab-dropdown" data-kebab-for="${g.id}">
            <button class="kebab-item kebab-topup" data-id="${g.id}" data-name="${safeName}">
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
  const safeName = escapeHtml(g.name);
  const safeIcon = escapeHtml(g.icon);
  const safeColor = escapeHtml(g.color);

  return `
    <div class="history-item" data-id="${g.id}">
      <div class="history-item-info">
        <div class="icon-box ${safeColor} text-white history-item-icon">
          <i class="ph ${safeIcon}"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <p class="history-item-name">${safeName}</p>
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

// Reference to current Esc listener for proper teardown
let currentEscHandler = null;

export function renderTabungan() {
  const existingPanel = document.getElementById('history-drawer');
  const isHistoryOpen = existingPanel ? existingPanel.classList.contains('open') : false;

  const container = document.getElementById('page-content');
  if (!container) return;

  // Teardown previous Escape key handler if existing
  if (currentEscHandler) {
    document.removeEventListener('keydown', currentEscHandler);
    currentEscHandler = null;
  }

  const allGoals = store.savings || [];
  const activeGoals = allGoals.filter(g => !g.isDone);
  const historyGoals = allGoals.filter(g => g.isDone);

  const goalsHtml = activeGoals.map(renderGoalCard).join('');
  const historyHtml = historyGoals.length > 0 
    ? historyGoals.map(renderHistoryGoalItem).join('')
    : '<p class="text-muted" style="text-align:center; padding: 2rem 0; font-size: 0.85rem;">Belum ada wishlist yang diselesaikan.</p>';

  container.innerHTML = `
    <div class="section-header">
      <div class="section-header-top">
        <h3>My Wishlist &amp; Savings</h3>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          ${historyGoals.length > 0 ? `<button class="btn btn-outline btn-history-header" id="btn-toggle-history"><i class="ph ph-clock-counter-clockwise"></i> Histori</button>` : ''}
          ${allGoals.length > 0 ? '<button class="btn btn-primary" id="btn-create-goal"><i class="ph ph-plus"></i> Buat Target Baru</button>' : ''}
        </div>
      </div>
    </div>

    <div class="wishlist-container" id="wishlist-container">
      ${goalsHtml || `
        <div class="wishlist-empty-state">
          <img class="illustration-light wishlist-empty-illustration" src="/assets/wishlist_blank_illustration_light.svg" alt="Wishlist Empty" />
          <img class="illustration-dark wishlist-empty-illustration" src="/assets/wishlist_blank_illustration_dark.svg" alt="Wishlist Empty" />
          <div class="wishlist-empty-text-group">
            <h4 class="wishlist-empty-title">Belum Ada Wishlist</h4>
            <p class="text-muted text-xs wishlist-empty-desc">Yuk, mulai buat target baru untuk tabungan impianmu hari ini!</p>
          </div>
        </div>
      `}
    </div>

    <!-- History Right Drawer Overlay & Sidebar -->
    <div class="history-backdrop" id="history-backdrop"></div>
    <div class="history-drawer" id="history-drawer">
      <div class="history-drawer-header">
        <h4 class="history-drawer-title">
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
  `;

  // --- Drawer State Management ---
  const btnToggleHistory = document.getElementById('btn-toggle-history');
  const historyDrawer = document.getElementById('history-drawer');
  const historyBackdrop = document.getElementById('history-backdrop');
  const btnCloseHistory = document.getElementById('btn-close-history');

  const closeDrawer = () => {
    if (historyDrawer && historyBackdrop) {
      historyBackdrop.classList.remove('open');
      historyDrawer.classList.remove('open');
      document.body.style.overflow = '';
    }
    if (currentEscHandler) {
      document.removeEventListener('keydown', currentEscHandler);
      currentEscHandler = null;
    }
  };

  const openDrawer = () => {
    if (historyDrawer && historyBackdrop) {
      historyBackdrop.classList.add('open');
      historyDrawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    if (!currentEscHandler) {
      currentEscHandler = (e) => {
        if (e.key === 'Escape') {
          closeDrawer();
        }
      };
      document.addEventListener('keydown', currentEscHandler);
    }
  };

  if (isHistoryOpen && historyGoals.length > 0) {
    openDrawer();
  }

  if (btnToggleHistory) btnToggleHistory.addEventListener('click', openDrawer);
  if (btnCloseHistory) btnCloseHistory.addEventListener('click', closeDrawer);
  if (historyBackdrop) historyBackdrop.addEventListener('click', closeDrawer);

  // --- History Actions ---
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

  container.querySelectorAll('.btn-history-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      checkVerification(async () => {
        const id = Number(btn.dataset.id);
        const goal = store.savings.find(s => s.id === id);
        try {
          const { showConfirm } = await import('../components/notifications.js');
          const confirmed = await showConfirm(
            'Hapus Permanen?',
            `Wishlist "${goal?.name || ''}" akan dihapus selamanya dan tidak bisa dikembalikan.`
          );
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

  // --- Create Goal Handlers ---
  const handleCreateClick = () => openWishlistModal(null, () => renderTabungan());
  const btnCreate = document.getElementById('btn-create-goal');
  if (btnCreate) btnCreate.addEventListener('click', handleCreateClick);

  const btnCreateEmpty = document.getElementById('btn-create-goal-empty');
  if (btnCreateEmpty) btnCreateEmpty.addEventListener('click', handleCreateClick);

  // --- Kebab Dropdowns Initialization ---
  cleanupKebabs();
  initKebabs(
    container,
    (id) => {
      const goalToEdit = store.savings.find(s => s.id === Number(id));
      if (goalToEdit) {
        openWishlistModal(goalToEdit, () => renderTabungan());
      }
    },
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

  // --- Kebab Top-up & Toggle Done Items ---
  container.querySelectorAll('.kebab-topup').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAllKebabs();
      const id = Number(btn.getAttribute('data-id'));
      const name = btn.getAttribute('data-name');
      checkVerification(async () => {
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

  container.querySelectorAll('.kebab-done').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAllKebabs();
      const id = Number(btn.getAttribute('data-id'));
      checkVerification(async () => {
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
