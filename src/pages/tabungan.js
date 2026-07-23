import { store, formatRupiah } from '../store.js';
import { initKebabs, cleanupKebabs, closeAllKebabs } from '../ui/kebab.js';
import { showToast } from '../components/notifications.js';

export function renderTabungan() {
  const existingPanel = document.getElementById('history-panel');
  const isHistoryOpen = existingPanel ? existingPanel.classList.contains('open') : false;

  const container = document.getElementById('page-content');
  const allGoals = store.savings;
  const activeGoals = allGoals.filter(g => !g.isDone);
  const historyGoals = allGoals.filter(g => g.isDone);

  const goalsHtml = activeGoals.map(g => {
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
  }).join('');

  const historyHtml = historyGoals.length > 0 ? historyGoals.map(g => {
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
  }).join('') : '<p class="text-muted" style="text-align:center; padding: 2rem 0; font-size: 0.85rem;">Belum ada wishlist yang diselesaikan.</p>';

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

    <!-- History Panel -->
    <div class="history-panel" id="history-panel">
      <div class="history-panel-header">
        <h4><i class="ph ph-clock-counter-clockwise"></i> Wishlist Selesai</h4>
        <button class="history-panel-close" id="btn-close-history"><i class="ph ph-x"></i></button>
      </div>
      <div class="history-panel-list">
        ${historyHtml}
      </div>
    </div>

    <style>
      .history-panel { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, opacity 0.3s ease, margin 0.3s ease; opacity: 0; margin-top: 0; background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius-xl); }
      .history-panel.open { max-height: 600px; opacity: 1; margin-top: 1.5rem; overflow-y: auto; }
      .history-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card-bg); z-index: 1; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
      .history-panel-header h4 { margin: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; color: var(--text-main); }
      .history-panel-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 6px; transition: all 0.2s; }
      .history-panel-close:hover { background: var(--bg-color); color: var(--red); }
      .history-panel-list { padding: 0.5rem 0; }
      .history-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; gap: 1rem; transition: background 0.15s; }
      .history-item:hover { background: var(--bg-color); }
      .history-item + .history-item { border-top: 1px solid var(--border-light, var(--border)); }
      .history-item-info { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
      .history-item-name { margin: 0; font-size: 0.88rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .history-item-meta { margin: 2px 0 0; font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .history-item-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
      .btn-history-restore { display: flex; align-items: center; gap: 4px; padding: 5px 10px; border: none; background: transparent; color: var(--primary); font-size: 0.72rem; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
      .btn-history-restore:hover { color: var(--primary); opacity: 0.8; }
      .btn-history-delete { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: none; background: transparent; color: var(--text-muted); font-size: 1.1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
      .btn-history-delete:hover { color: var(--red); }
      @media (max-width: 500px) {
        .history-item { flex-wrap: wrap; gap: 0.5rem; }
        .history-item-actions { width: 100%; justify-content: flex-end; }
        .btn-history-restore span { display: none; }
      }
    </style>
  `;

  // --- Listeners ---

  // History panel toggle
  const btnToggleHistory = document.getElementById('btn-toggle-history');
  const historyPanel = document.getElementById('history-panel');
  const btnCloseHistory = document.getElementById('btn-close-history');
  
  // Preserve open state if it was open before re-render
  if (isHistoryOpen && historyPanel && historyGoals.length > 0) {
    historyPanel.classList.add('open');
  }

  if (btnToggleHistory && historyPanel) {
    btnToggleHistory.addEventListener('click', () => {
      historyPanel.classList.toggle('open');
    });
  }
  if (btnCloseHistory && historyPanel) {
    btnCloseHistory.addEventListener('click', () => {
      historyPanel.classList.remove('open');
    });
  }

  // History: Pulihkan (restore isDone → false)
  container.querySelectorAll('.btn-history-restore').forEach(btn => {
    btn.addEventListener('click', async () => {
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

  // History: Hapus Permanen
  container.querySelectorAll('.btn-history-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const goal = store.savings.find(s => s.id === id);
      const { showConfirm } = await import('../components/notifications.js');
      const confirmed = await showConfirm('Hapus Permanen?', `Wishlist "${goal?.name}" akan dihapus selamanya dan tidak bisa dikembalikan.`);
      if (confirmed) {
        try {
          await store.removeSaving(id);
          showToast('Wishlist dihapus permanen!', 'info');
          renderTabungan();
        } catch (err) {
          showToast('Gagal menghapus: ' + (err?.message || err), 'error');
        }
      }
    });
  });

  // Create Goal
  const btnCreate = document.getElementById('btn-create-goal');
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      import('../components/wishlist-modal.js').then(module => {
        module.openAddWishlistModal(() => renderTabungan());
      });
    });
  }

  const btnCreateEmpty = document.getElementById('btn-create-goal-empty');
  if (btnCreateEmpty) {
    btnCreateEmpty.addEventListener('click', () => {
      import('../components/wishlist-modal.js').then(module => {
        module.openAddWishlistModal(() => renderTabungan());
      });
    });
  }

  // Bersihkan state kebab sebelumnya
  cleanupKebabs();

  // Kebab init for Edit & Delete
  initKebabs(
    container,
    // onEdit
    (id) => {
      const goalToEdit = store.savings.find(s => s.id === Number(id));
      if (goalToEdit) {
        import('../components/wishlist-modal.js').then(module => {
          module.openAddWishlistModal(() => renderTabungan(), goalToEdit);
        });
      }
    },
    // onDelete
    (id) => {
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
      });
    }
  );

  // Tabung (Top-up) action (custom kebab item)
  container.querySelectorAll('.kebab-topup').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllKebabs();
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const name = e.currentTarget.getAttribute('data-name');
      import('../components/wishlist-modal.js').then(module => {
        module.openAddFundsModal(id, name, () => renderTabungan());
      });
    });
  });

  // Done/Undone action
  container.querySelectorAll('.kebab-done').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAllKebabs();
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

  // --- SortableJS Logic ---
  const listContainer = document.getElementById('wishlist-container');
  if (window.Sortable && listContainer) {
    new Sortable(listContainer, {
      // FLIP animation duration. SortableJS uses translate3d under the hood
      // for hardware-accelerated reordering — keep it snappy but smooth.
      animation: 250,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)", // ease-out-quint for buttery deceleration
      handle: '.drag-handle',
      ghostClass: 'dragging', // The original-slot ghost (dimmed source card)
      dragClass: 'sortable-drag',
      forceFallback: true, // REQUIRED for CSS Grid to prevent native HTML5 dragging bugs (cannot drag first item)
      fallbackTolerance: 3, // Allow a 3px grace distance for clicks
      fallbackOnBody: true, // Ensure the cloned element doesn't get trapped by overflow rules
      delay: 0,
      delayOnTouchOnly: false,
      // Swap sensitivity — `swapThreshold: 1` = swap zone covers the WHOLE
      // target card, so reordering triggers as soon as the dragged card
      // touches any part of another card (not just the center).
      swapThreshold: 1,
      // invertSwap kept off — simpler intent: "enter target → swap".
      onStart: function() {
        listContainer.classList.add('is-dragging');
        document.body.style.userSelect = 'none';
      },
      onEnd: function() {
        listContainer.classList.remove('is-dragging');
        document.body.style.userSelect = '';
        const newOrderIds = [...listContainer.querySelectorAll('.wishlist-item')].map(el => Number(el.dataset.id));
        const newOrder = newOrderIds.map(id => store.savings.find(s => s.id === id));
        store.reorderSavingsRemote(newOrder).catch((err) => {
          showToast('Gagal simpan urutan wishlist: ' + (err?.message || err), 'error');
          store.reorderSavings(store.savings);
        });
      }
    });
  }
}
