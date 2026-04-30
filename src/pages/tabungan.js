import { store, formatRupiah } from '../store.js';

export function renderTabungan() {
  const container = document.getElementById('page-content');
  const goals = store.savings;

    const goalsHtml = goals.map(g => {
    const percent = Math.min((g.current / g.target) * 100, 100);
    return `
      <div class="stat-card wishlist-item" style="padding: 1.5rem; position: relative;" draggable="true" data-id="${g.id}">
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
        <p class="text-muted">Kumpulin pundi-pundi buat barang impian kamu.</p>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <button class="btn btn-primary" id="btn-create-goal"><i class="ph ph-plus"></i> Buat Target Baru</button>
      </div>
    </div>

    <div class="wishlist-container" id="wishlist-container">
      ${goalsHtml || '<div style="grid-column: 1/-1; text-align: center; padding: 4rem;"><p class="text-muted">Belum ada wishlist bre. Yuk buat target baru!</p></div>'}
    </div>
  `;

  // --- Listeners ---
  
  // --- Listeners ---

  // Create Goal
  document.getElementById('btn-create-goal').addEventListener('click', () => {
    import('../components/wishlist-modal.js').then(module => {
      module.openAddWishlistModal(() => renderTabungan());
    });
  });

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
      animation: 250,
      handle: '.drag-handle',
      ghostClass: 'dragging',
      forceFallback: false,
      onEnd: function() {
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
