import { store, formatRupiah } from '../store.js';

let viewMode = localStorage.getItem('wishlist-view') || 'grid';

export function renderTabungan() {
  const container = document.getElementById('page-content');
  const goals = store.savings;

  const goalsHtml = goals.map(g => {
    const percent = Math.min((g.current / g.target) * 100, 100);
    return `
      <div class="stat-card wishlist-item" style="padding: 2rem; position: relative;" draggable="true" data-id="${g.id}">
        <div class="drag-handle"><i class="ph-bold ph-dots-six-vertical"></i></div>
        
        <div style="display: flex; gap: 1.5rem; align-items: center; ${viewMode === 'grid' ? 'margin-bottom: 2rem;' : ''}">
          <div class="icon-box ${g.color} text-white" style="width: 60px; height: 60px; font-size: 1.8rem; border-radius: 16px;">
            <i class="ph ${g.icon}"></i>
          </div>
          <div style="flex-grow: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <h3 style="margin: 0;">${g.name}</h3>
              <span class="font-bold">${percent.toFixed(0)}%</span>
            </div>
            <p class="text-muted text-sm">Target: ${formatRupiah(g.target)}</p>
          </div>
        </div>

        <div class="progress-bar-container" style="height: 12px; ${viewMode === 'grid' ? 'margin-bottom: 1.5rem;' : 'margin: 0 2rem;'} background-color: var(--border);">
          <div class="progress-bar ${g.color}" style="width: ${percent}%;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; ${viewMode === 'list' ? 'width: 280px;' : ''}">
          <div class="${viewMode === 'list' ? 'mr-lg' : ''}">
            <p class="text-muted text-xs mb-xs">Terkumpul</p>
            <h3 style="margin: 0; font-size: 1.25rem;">${formatRupiah(g.current)}</h3>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-outline btn-tabung" data-id="${g.id}" data-name="${g.name}" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
              <i class="ph ph-plus"></i> Tabung
            </button>
            <button class="icon-btn text-red btn-delete-goal" data-id="${g.id}">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3>My Wishlist & Savings</h3>
        <p class="text-muted">Kumpulin pundi-pundi buat barang impian kamu bre.</p>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <div class="badge-soft badge-blue" style="display: flex; padding: 4px; gap: 4px; border-radius: 10px;">
          <button class="icon-btn ${viewMode === 'grid' ? 'bg-primary text-white' : ''}" id="btn-view-grid" style="width: 32px; height: 32px; font-size: 1rem;"><i class="ph-bold ph-squares-four"></i></button>
          <button class="icon-btn ${viewMode === 'list' ? 'bg-primary text-white' : ''}" id="btn-view-list" style="width: 32px; height: 32px; font-size: 1rem;"><i class="ph-bold ph-list"></i></button>
        </div>
        <button class="btn btn-primary" id="btn-create-goal"><i class="ph ph-plus"></i> Buat Target Baru</button>
      </div>
    </div>

    <div class="wishlist-${viewMode}" id="wishlist-container">
      ${goalsHtml || '<div style="grid-column: 1/-1; text-align: center; padding: 4rem;"><p class="text-muted">Belum ada wishlist bre. Yuk buat target baru!</p></div>'}
    </div>
  `;

  // --- Listeners ---
  
  // View Toggles
  document.getElementById('btn-view-grid').addEventListener('click', () => {
    viewMode = 'grid';
    localStorage.setItem('wishlist-view', 'grid');
    renderTabungan();
  });
  document.getElementById('btn-view-list').addEventListener('click', () => {
    viewMode = 'list';
    localStorage.setItem('wishlist-view', 'list');
    renderTabungan();
  });

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
          store.deleteSaving(id);
          renderTabungan();
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
        store.reorderSavings(newOrder);
      }
    });
  }
}
