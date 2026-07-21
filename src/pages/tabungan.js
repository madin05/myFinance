import { store, formatRupiah } from '../store.js';
import { initKebabs, cleanupKebabs, closeAllKebabs } from '../ui/kebab.js';
import { showToast } from '../components/notifications.js';

export function renderTabungan() {
  const container = document.getElementById('page-content');
  const goals = store.savings;

  const goalsHtml = goals.map(g => {
    const percent = Math.min((g.current / g.target) * 100, 100);
    return `
      <div class="stat-card wishlist-item" style="padding: 1.5rem; position: relative; ${g.isDone ? 'opacity: 0.6; filter: grayscale(0.5);' : ''}" data-id="${g.id}">
        ${g.isDone ? '<div style="position: absolute; top: 0; right: 0; padding: 6px 12px; background: var(--green); color: white; font-size: 0.75rem; font-weight: bold; border-radius: 0 var(--radius-xl) 0 var(--radius-xl);"><i class="ph-bold ph-check"></i> Selesai</div>' : '<div class="drag-handle"><i class="ph-bold ph-dots-six-vertical"></i></div>'}
        
        <div style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.5rem;">
          <div class="icon-box ${g.color} text-white" style="width: 54px; height: 54px; font-size: 1.5rem; border-radius: 14px;">
            <i class="ph ${g.icon}"></i>
          </div>
          <div style="flex-grow: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <h3 style="margin: 0; font-size: 1.1rem; ${g.isDone ? 'text-decoration: line-through;' : ''}">${g.name}</h3>
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
            <button class="kebab-trigger" data-id="${g.id}" title="Opsi lainnya" style="background: transparent; border: 1px solid var(--border); border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">
              <i class="ph-bold ph-dots-three"></i>
            </button>
            <div class="kebab-dropdown" data-kebab-for="${g.id}">
              <button class="kebab-item kebab-topup" data-id="${g.id}" data-name="${g.name}">
                <i class="ph ph-plus"></i> Tabung
              </button>
              <button class="kebab-item kebab-edit" data-id="${g.id}">
                <i class="ph ph-pencil-simple"></i> Edit
              <button class="kebab-item kebab-done" data-id="${g.id}">
                <i class="ph ${g.isDone ? 'ph-x' : 'ph-check'}"></i> ${g.isDone ? 'Batal Selesai' : 'Tandai Selesai'}
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

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3>My Wishlist & Savings</h3>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        ${goals.length > 0 ? '<button class="btn btn-primary" id="btn-create-goal"><i class="ph ph-plus"></i> Buat Target Baru</button>' : ''}
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
  `;

  // --- Listeners ---

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
