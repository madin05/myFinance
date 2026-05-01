import { store, formatRupiah, formatDate } from '../store.js';
import { initCustomSelects } from '../ui/select.js';

let filterState = {
  type: 'all',
  month: 'all',
  year: 'all',
  priceOperator: 'gt',
  priceValue: '',
  kategori: 'all',
  metode: 'all',
  searchQuery: ''
};

export function renderTransaksi() {
  const container = document.getElementById('page-content');
  
  const uniqueYears = [...new Set(store.transactions.map(tx => new Date(tx.tanggal).getFullYear()))].sort((a,b) => b-a);
  const uniqueKategori = [...new Set(store.transactions.map(tx => tx.kategori))].sort();
  const uniqueMetode = [...new Set(store.transactions.map(tx => tx.metode))].sort();
  
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  container.innerHTML = `
    <div class="transactions-section">
      <div class="section-header" style="flex-wrap: wrap; gap: 1rem;">
        <h3>Daftar Transaksi</h3>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <div style="position: relative;" id="filter-container">
            <button class="btn btn-outline filter-btn" id="btn-filter-popover" title="Filter Transaksi">
              <i class="ph ph-funnel"></i>
            </button>
            
            <div class="filter-popover" id="filter-popover" style="display: none;">
              <!-- Tipe Section -->
              <div class="popover-header">Tipe Transaksi</div>
              <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
                <button class="popover-item ${filterState.type === 'all' ? 'active' : ''}" data-type="all" style="flex: 1; padding: 10px; font-size: 0.85rem;">Semua</button>
                <button class="popover-item ${filterState.type === 'income' ? 'active' : ''}" data-type="income" style="flex: 1; padding: 10px; font-size: 0.85rem;">Masuk</button>
                <button class="popover-item ${filterState.type === 'expense' ? 'active' : ''}" data-type="expense" style="flex: 1; padding: 10px; font-size: 0.85rem;">Keluar</button>
              </div>

              <!-- Waktu Section -->
              <div class="popover-header">Waktu</div>
              <div class="form-row" style="gap: 0.75rem; margin-bottom: 1.25rem;">
                <div class="form-group" style="margin-bottom: 0; flex: 1.2;">
                  <select class="form-control" id="filter-month" style="padding: 10px; font-size: 0.85rem; height: 42px;">
                    <option value="all" ${filterState.month === 'all' ? 'selected' : ''}>Bulan</option>
                    ${monthNames.map((m, i) => `<option value="${i}" ${filterState.month == i ? 'selected' : ''}>${m}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin-bottom: 0; flex: 1;">
                  <select class="form-control" id="filter-year" style="padding: 10px; font-size: 0.85rem; height: 42px;">
                    <option value="all" ${filterState.year === 'all' ? 'selected' : ''}>Tahun</option>
                    ${uniqueYears.map(y => `<option value="${y}" ${filterState.year == y ? 'selected' : ''}>${y}</option>`).join('')}
                  </select>
                </div>
              </div>

              <!-- Kategori & Metode Section -->
              <div class="popover-header">Kategori & Metode</div>
              <div class="form-row" style="gap: 0.75rem; margin-bottom: 1.25rem;">
                <div class="form-group" style="margin-bottom: 0; flex: 1;">
                  <select class="form-control" id="filter-kategori" style="padding: 10px; font-size: 0.85rem; height: 42px;">
                    <option value="all" ${filterState.kategori === 'all' ? 'selected' : ''}>Semua Kategori</option>
                    ${uniqueKategori.map(k => `<option value="${k}" ${filterState.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin-bottom: 0; flex: 1;">
                  <select class="form-control" id="filter-metode" style="padding: 10px; font-size: 0.85rem; height: 42px;">
                    <option value="all" ${filterState.metode === 'all' ? 'selected' : ''}>Semua Metode</option>
                    ${uniqueMetode.map(m => `<option value="${m}" ${filterState.metode === m ? 'selected' : ''}>${m}</option>`).join('')}
                  </select>
                </div>
              </div>

              <!-- Harga Section -->
              <div class="popover-header">Nominal</div>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <select class="form-control" id="filter-price-operator" style="width: 80px; padding: 10px; font-size: 0.85rem; height: 42px; flex-shrink: 0;">
                  <option value="gt" ${filterState.priceOperator === 'gt' ? 'selected' : ''}>&ge;</option>
                  <option value="lt" ${filterState.priceOperator === 'lt' ? 'selected' : ''}>&le;</option>
                </select>
                <input type="text" class="form-control" id="filter-price-value" placeholder="Nominal..." style="padding: 10px; font-size: 0.85rem; height: 42px;" value="${filterState.priceValue ? new Intl.NumberFormat('id-ID').format(filterState.priceValue) : ''}">
              </div>
            </div>
          </div>
          <button class="btn btn-primary" id="btn-tambah-page"><i class="ph ph-plus"></i> Tambah</button>
        </div>
      </div>
      
      <div class="table-container">
        <table class="transactions-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Kategori</th>
              <th>Metode</th>
              <th>Keterangan</th>
              <th class="text-right">Harga</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody id="tx-table-body">
            <!-- Table rows will be rendered here -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  const popoverBtn = container.querySelector('#btn-filter-popover');
  const popover = container.querySelector('#filter-popover');
  
  popoverBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = popover.style.display === 'block';
    popover.style.display = isVisible ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (popover && !popover.contains(e.target) && e.target !== popoverBtn) {
      popover.style.display = 'none';
    }
  });

  const updateFilter = () => {
    filterState.month = document.getElementById('filter-month').value;
    filterState.year = document.getElementById('filter-year').value;
    filterState.kategori = document.getElementById('filter-kategori').value;
    filterState.metode = document.getElementById('filter-metode').value;
    filterState.priceOperator = document.getElementById('filter-price-operator').value;
    const rawPrice = document.getElementById('filter-price-value').value.replace(/\D/g, '');
    filterState.priceValue = rawPrice ? Number(rawPrice) : '';
    renderTableBody(container);
  };

  const typeBtns = container.querySelectorAll('.popover-item[data-type]');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      typeBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      filterState.type = e.currentTarget.getAttribute('data-type');
      updateFilter();
    });
  });

  container.querySelector('#filter-month').addEventListener('change', updateFilter);
  container.querySelector('#filter-year').addEventListener('change', updateFilter);
  container.querySelector('#filter-kategori').addEventListener('change', updateFilter);
  container.querySelector('#filter-metode').addEventListener('change', updateFilter);
  container.querySelector('#filter-price-operator').addEventListener('change', updateFilter);
  
  const priceInput = container.querySelector('#filter-price-value');
  priceInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val) {
      e.target.value = new Intl.NumberFormat('id-ID').format(val);
    }
    updateFilter();
  });

  // Global Search Sync
  const globalSearch = document.getElementById('global-search');
  if (globalSearch) {
    globalSearch.addEventListener('input', (e) => {
      filterState.searchQuery = e.target.value.toLowerCase();
      renderTableBody(container);
    });
    // Set initial value if any
    filterState.searchQuery = globalSearch.value.toLowerCase();
  }

  renderTableBody(container);

  document.getElementById('btn-tambah-page').addEventListener('click', () => {
    import('../components/modal.js').then(module => {
      module.openAddTransactionModal(() => renderTransaksi());
    });
  });

  initCustomSelects(container.querySelector('#filter-popover'));
}

function renderTableBody(container) {
  const tbody = container.querySelector('#tx-table-body');
  let filteredTxs = [...store.transactions];
  
  // Sortir: Terbaru di atas (Berdasarkan tanggal, lalu ID sebagai penentu jika tanggal sama)
  filteredTxs.sort((a, b) => {
    const dateDiff = new Date(b.tanggal) - new Date(a.tanggal);
    if (dateDiff !== 0) return dateDiff;
    return (b.id || 0) - (a.id || 0);
  });

  filteredTxs = filteredTxs.filter(tx => {
    const txDate = new Date(tx.tanggal);
    const absHarga = Math.abs(tx.harga);
    
    const matchType = filterState.type === 'all' || tx.type === filterState.type;
    const matchMonth = filterState.month === 'all' || txDate.getMonth() == filterState.month;
    const matchYear = filterState.year === 'all' || txDate.getFullYear() == filterState.year;
    const matchKategori = filterState.kategori === 'all' || (tx.kategori || '').includes(filterState.kategori);
    const matchMetode = filterState.metode === 'all' || tx.metode === filterState.metode;
    const matchSearch = !filterState.searchQuery || (tx.keterangan || '').toLowerCase().includes(filterState.searchQuery);
    
    let matchPrice = true;
    if (filterState.priceValue !== '') {
      if (filterState.priceOperator === 'gt') {
        matchPrice = absHarga >= filterState.priceValue;
      } else {
        matchPrice = absHarga <= filterState.priceValue;
      }
    }
    
    return matchType && matchMonth && matchYear && matchKategori && matchMetode && matchPrice && matchSearch;
  });

  const txHtml = filteredTxs.map(tx => {
    const isIncome = tx.type === 'income';
    const colorClass = isIncome ? 'text-green' : 'text-red';
    const sign = isIncome ? '+ ' : '- ';
    
    let badgeClass = 'badge-blue';
    const lowerKategori = (tx.kategori || '').toLowerCase();
    if(lowerKategori.includes('gaji')) badgeClass = 'badge-green';
    else if(lowerKategori.includes('makan')) badgeClass = 'badge-orange';
    else if(lowerKategori.includes('belanja')) badgeClass = 'badge-purple';

    return `
      <tr>
        <td>${formatDate(tx.tanggal)}</td>
        <td><span class="badge-soft ${badgeClass}">${tx.kategori}</span></td>
        <td>${tx.metode}</td>
        <td>${tx.keterangan}</td>
        <td class="text-right ${colorClass} font-bold">${sign}${formatRupiah(Math.abs(tx.harga))}</td>
        <td class="text-right" style="white-space: nowrap;">
          <button class="icon-btn text-blue btn-edit" data-id="${tx.id}" style="margin-right: 8px;" data-tooltip="Edit Transaksi"><i class="ph ph-pencil-simple"></i></button>
          <button class="icon-btn text-red btn-delete" data-id="${tx.id}" data-tooltip="Hapus Transaksi"><i class="ph ph-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = txHtml || '<tr><td colspan="6" class="text-center text-muted">Belum ada transaksi</td></tr>';

  const editBtns = tbody.querySelectorAll('.btn-edit');
  editBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const txToEdit = store.getTransactionById(Number(id));
      if (txToEdit) {
        import('../components/modal.js').then(module => {
          module.openAddTransactionModal(() => renderTransaksi(), txToEdit);
        });
      }
    });
  });

  const deleteBtns = tbody.querySelectorAll('.btn-delete');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      import('../components/modal.js').then(module => {
        module.openConfirmModal(
          'Hapus Transaksi?',
          'Data yang dihapus tidak bisa dikembalikan lagi bre.',
          () => {
            store.deleteTransactionRemote(Number(id)).then(renderTransaksi).catch((err) => {
              alert('Gagal hapus transaksi: ' + (err?.message || err));
              renderTransaksi();
            });
          }
        );
      });
    });
  });
}
