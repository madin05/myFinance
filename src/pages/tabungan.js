import { store, formatRupiah } from '../store.js';

export function renderTabungan() {
  const container = document.getElementById('page-content');
  const goals = store.savings;

  const goalsHtml = goals.map(g => {
    const percent = Math.min((g.current / g.target) * 100, 100);
    return `
      <div class="stat-card wishlist-item" style="padding: 1.5rem; position: relative;" data-id="${g.id}">
        <div class="drag-handle"><i class="ph-bold ph-dots-six-vertical"></i></div>
        
        <div style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.5rem;">
          <div class="icon-box ${g.color} text-white" style="width: 54px; height: 54px; font-size: 1.5rem; border-radius: 14px;">
            <i class="ph ${g.icon}"></i>
          </div>
          <div style="flex-grow: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <h3 style="margin: 0; font-size: 1.1rem;">${g.name}</h3>
              <span class="font-bold text-primary">${percent.toFixed(0)}%</span>
            </div>
            <p class="text-muted text-xs">Target: ${formatRupiah(g.target)}</p>
          </div>
        </div>

        <div class="progress-bar-container" style="height: 10px; margin-bottom: 1.25rem; background-color: var(--border-light);">
          <div class="progress-bar ${g.color}" style="width: ${percent}%;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p class="text-muted text-xs mb-xs">Terkumpul</p>
            <h3 style="margin: 0; font-size: 1.15rem;">${formatRupiah(g.current)}</h3>
          </div>
          <div class="wishlist-actions">
            <div role="button" class="btn-action-sm primary btn-tabung" data-id="${g.id}" data-name="${g.name}">
              <i class="ph ph-plus"></i>
            </div>
            <div role="button" class="btn-action-sm danger btn-delete-goal" data-id="${g.id}">
              <i class="ph ph-trash"></i>
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

  // Tabung & Delete
  container.querySelectorAll('.btn-tabung').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const name = e.currentTarget.getAttribute('data-name');
      import('../components/wishlist-modal.js').then(module => {
        module.openAddFundsModal(id, name, () => renderTabungan());
      });
    });
  });

  container.querySelectorAll('.btn-delete-goal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.getAttribute('data-id'));
      import('../components/modal.js').then(module => {
        module.openConfirmModal('Hapus Wishlist?', 'Yakin mau hapus target ini?', () => {
          store.removeSaving(id).then(renderTabungan).catch((err) => {
            alert('Gagal hapus wishlist: ' + (err?.message || err));
            renderTabungan();
          });
        });
      });
    });
  });

  // --- SortableJS Logic ---
  const listContainer = document.getElementById('wishlist-container');
  if (window.Sortable && listContainer) {
    new Sortable(listContainer, {
      animation: 350,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      handle: '.drag-handle',
      ghostClass: 'dragging',
      dragClass: 'sortable-drag',
      forceFallback: true,
      fallbackClass: 'sortable-fallback',
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
          alert('Gagal simpan urutan wishlist: ' + (err?.message || err));
          store.reorderSavings(store.savings);
        });
      }
    });
  }
}
