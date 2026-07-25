import { store, formatCurrency } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, checkVerification } from '../components/notifications.js';
import { initCustomSelects } from '../ui/select.js';
import { initKebabs, cleanupKebabs } from '../ui/kebab.js';

export function renderSaldo() {
  const container = document.getElementById('page-content');
  
  const saldos = store.saldos || [];
  const totalSaldo = saldos.reduce((sum, s) => sum + Number(s.balance), 0);

  const getTypeIcon = (type) => {
    switch(type) {
      case 'E-Wallet': return 'ph-device-mobile';
      case 'Bank': return 'ph-bank';
      case 'Cash': return 'ph-money';
      default: return 'ph-wallet';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'E-Wallet': return 'var(--primary)';
      case 'Bank': return 'var(--blue)';
      case 'Cash': return 'var(--green)';
      default: return 'var(--text)';
    }
  };

  const logoMap = {
    'Gopay': '/assets/banks/gopay.svg',
    'OVO': '/assets/banks/ovo.png',
    'DANA': '/assets/banks/dana.png',
    'ShopeePay': '/assets/banks/shopeepay.png',
    'LinkAja': '/assets/banks/linkaja.svg',
    'BCA': '/assets/banks/bca.png',
    'Bank Mandiri': '/assets/banks/mandiri.png',
    'BNI': '/assets/banks/bni.png',
    'BRI': '/assets/banks/bri.png',
    'BSI': '/assets/banks/bsi.png',
    'Bank Jago': '/assets/banks/jago.png',
    'SeaBank': '/assets/banks/seabank.svg',
    'Bank Blu': '/assets/banks/blubca.svg',
    'BluBCA': '/assets/banks/blubca.svg', // keep for backwards compatibility if user had it
  };

  const brandColorMap = {
    'shopeepay': '#EE4D2D',
    'gopay': '#00AED6',
    'dana': '#118EEA',
    'ovo': '#7C3AED',
    'linkaja': '#E31E25',
    'bank blu': '#00A3E0',
    'blubca': '#00A3E0',
    'bca': '#0060AF',
    'bank mandiri': '#003D79',
    'mandiri': '#003D79',
    'bni': '#F15A24',
    'bri': '#00529C',
    'bsi': '#00A39D',
    'bank jago': '#FF8A00',
    'jago': '#FF8A00',
    'seabank': '#FF5722',
    'dompet': '#10B981',
    'brankas': '#10B981',
    'uang tunai': '#10B981',
    'cash': '#10B981',
  };

  const getBrandColor = (s) => {
    if (!s) return 'var(--primary)';
    const searchName = (s.name || '').trim().toLowerCase();
    if (brandColorMap[searchName]) return brandColorMap[searchName];
    
    // Fuzzy match
    for (const [key, color] of Object.entries(brandColorMap)) {
      if (searchName.includes(key)) return color;
    }

    if (s.type === 'Bank') return '#3B82F6';
    if (s.type === 'Cash') return '#10B981';
    return '#0EA5E9';
  };

  const getLogo = (s) => s.logo || logoMap[s.name] || '';

  const viewMode = localStorage.getItem('saldo-view-mode') || 'grid';

  container.innerHTML = `
    <div class="saldo-section">
      <div class="section-header" style="flex-wrap: wrap; gap: 1rem;">
        <div>
          <h3>Saldo Akun</h3>
          <p class="text-muted" style="margin-top: 4px; font-size: 0.9rem;">Total: <strong style="color: var(--text);">${formatCurrency(totalSaldo)}</strong></p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <div class="view-toggle" style="display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 2px;">
            <button class="btn-icon ${viewMode === 'grid' ? 'active' : ''}" id="btn-view-grid" style="padding: 6px; border-radius: 6px; border: none; background: ${viewMode === 'grid' ? 'var(--primary-light)' : 'transparent'}; color: ${viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)'}; cursor: pointer; transition: all 0.2s;"><i class="ph-fill ph-squares-four" style="font-size: 1.2rem;"></i></button>
            <button class="btn-icon ${viewMode === 'list' ? 'active' : ''}" id="btn-view-list" style="padding: 6px; border-radius: 6px; border: none; background: ${viewMode === 'list' ? 'var(--primary-light)' : 'transparent'}; color: ${viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)'}; cursor: pointer; transition: all 0.2s;"><i class="ph-bold ph-list" style="font-size: 1.2rem;"></i></button>
          </div>
          <button class="btn btn-primary" id="btn-add-saldo">
            <i class="ph ph-plus"></i> Tambah Saldo
          </button>
        </div>
      </div>

      <div class="saldo-grid ${viewMode === 'list' ? 'list-mode' : ''}" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
        ${saldos.length > 0 ? saldos.map((s, index) => {
          const brandColor = getBrandColor(s);
          return `
          <div class="stat-card" style="padding: 1.5rem; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: visible;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 48px; height: 48px; border-radius: 14px; background: color-mix(in srgb, ${brandColor} 18%, transparent); box-shadow: 0 4px 16px color-mix(in srgb, ${brandColor} 25%, transparent); display: flex; align-items: center; justify-content: center; color: ${brandColor}; font-size: 1.5rem; transition: all 0.3s ease;">
                  ${getLogo(s) ? `<img src="${getLogo(s)}" style="width: 28px; height: 28px; border-radius: 6px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"><i class="ph-fill ${getTypeIcon(s.type)}" style="display:none"></i>` : `<i class="ph-fill ${getTypeIcon(s.type)}"></i>`}
                </div>
                <div>
                  <h4 style="margin: 0; font-size: 1.1rem; color: var(--text);">${s.name}</h4>
                  <span class="badge-soft" style="font-size: 0.7rem; margin-top: 4px; display: inline-block;">${s.type}</span>
                </div>
              </div>
              <div class="kebab-wrapper" style="display:inline-block;">
                <button class="kebab-trigger" data-id="${s.id}" title="Opsi lainnya" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.2rem;">
                  <i class="ph-bold ph-dots-three"></i>
                </button>
                <div class="kebab-dropdown" data-kebab-for="${s.id}">
                  <button class="kebab-item kebab-edit" data-id="${s.id}">
                    <i class="ph ph-pencil-simple"></i> Edit Nominal
                  </button>
                  <div class="kebab-divider"></div>
                  <button class="kebab-item danger kebab-delete" data-id="${s.id}">
                    <i class="ph ph-trash"></i> Hapus
                  </button>
                </div>
              </div>
            </div>
            <div>
              <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 4px;">Saldo Saat Ini</p>
              <h3 style="margin: 0; font-size: 1.4rem; color: var(--text);">${formatCurrency(s.balance)}</h3>
            </div>
          </div>
        `;
        }).join('') : `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
            <i class="ph ph-wallet" style="font-size: 3rem; display: block; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>Belum ada saldo akun yang ditambahkan.<br>Klik "Tambah Saldo" untuk mencatat saldo E-Wallet, Bank, atau Cash Anda.</p>
          </div>
        `}
      </div>
    </div>
    <style>
      .saldo-grid.list-mode {
        grid-template-columns: 1fr !important;
        gap: 1rem !important;
      }
      .saldo-grid.list-mode .stat-card {
        flex-direction: row !important;
        align-items: center;
        padding: 1rem 1.5rem !important;
        border-radius: 16px !important;
      }
      .saldo-grid.list-mode .stat-card > div:first-child {
        flex: 1;
        margin-bottom: 0 !important;
        align-items: center !important;
        justify-content: flex-start !important;
      }
      .saldo-grid.list-mode .kebab-wrapper {
        position: absolute;
        right: 1.25rem;
        top: 50%;
        transform: translateY(-50%);
      }
      .saldo-grid.list-mode .stat-card > div:last-child {
        text-align: right;
        margin-right: 3rem;
      }
      .saldo-grid.list-mode .stat-card > div:last-child p {
        display: none;
      }
      .saldo-grid.list-mode .stat-card > div:last-child h3 {
        font-size: 1.1rem !important;
      }
      @media (max-width: 500px) {
        .saldo-grid.list-mode .stat-card > div:last-child h3 {
          font-size: 1rem !important;
        }
        .saldo-grid.list-mode .stat-card {
          padding: 1rem !important;
        }
        .saldo-grid.list-mode .kebab-wrapper {
          right: 0.75rem;
        }
      }
    </style>
  `;

  const openSaldoModal = (existingId = null) => {
    checkVerification(() => {
      const modalContainer = document.getElementById('modal-container');
      const isEdit = !!existingId;
      let existingData = { name: '', type: 'E-Wallet', balance: '' };

      if (isEdit) {
        existingData = saldos.find(s => s.id === Number(existingId)) || existingData;
      }

      const types = ['E-Wallet', 'Bank', 'Cash'];
      const presetNames = {
        'E-Wallet': [
          { name: 'Gopay', logo: '/assets/banks/gopay.svg' },
          { name: 'OVO', logo: '/assets/banks/ovo.png' },
          { name: 'DANA', logo: '/assets/banks/dana.png' },
          { name: 'ShopeePay', logo: '/assets/banks/shopeepay.png' },
          { name: 'LinkAja', logo: '/assets/banks/linkaja.svg' },
          { name: 'Lainnya (Ketik Manual)', logo: '' }
        ],
        'Bank': [
          { name: 'BCA', logo: '/assets/banks/bca.png' },
          { name: 'Bank Mandiri', logo: '/assets/banks/mandiri.png' },
          { name: 'BNI', logo: '/assets/banks/bni.png' },
          { name: 'BRI', logo: '/assets/banks/bri.png' },
          { name: 'BSI', logo: '/assets/banks/bsi.png' },
          { name: 'Bank Jago', logo: '/assets/banks/jago.png' },
          { name: 'SeaBank', logo: '/assets/banks/seabank.svg' },
          { name: 'Bank Blu', logo: '/assets/banks/blubca.svg' },
          { name: 'Lainnya (Ketik Manual)', logo: '' }
        ],
        'Cash': [
          { name: 'Dompet', logo: '' },
          { name: 'Brankas', logo: '' },
          { name: 'Uang Tunai', logo: '' },
          { name: 'Lainnya (Ketik Manual)', logo: '' }
        ]
      };

      modalContainer.innerHTML = `
        <div class="modal-overlay" id="saldo-modal-overlay">
          <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
              <h3>${isEdit ? 'Ubah Saldo Akun' : 'Tambah Saldo Akun'}</h3>
              <button class="modal-close" id="close-saldo-modal"><i class="ph ph-x"></i></button>
            </div>
            <form id="form-saldo" style="padding-top: 1rem;">
              <div class="form-group" style="margin-bottom: 1.5rem;" id="type-group">
                <label>Jenis Akun</label>
                <select class="form-control" id="saldo-type" required>
                  ${types.map(t => `<option value="${t}" ${t === existingData.type ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 1.5rem;" id="name-group">
                <label>Nama Akun</label>
                <select class="form-control" id="saldo-name-select" required></select>
                <input type="text" class="form-control" id="saldo-name-manual" placeholder="Ketik nama manual..." style="display: none; margin-top: 0.75rem;">
              </div>
              <div class="form-group" style="margin-bottom: 1.5rem;">
                <label>Nominal Saldo (Rp)</label>
                <input type="text" class="form-control" id="saldo-amount" placeholder="Contoh: 100.000,00" inputmode="decimal" value="${existingData.balance ? new Intl.NumberFormat('id-ID').format(existingData.balance) : ''}" required>
              </div>
              <button type="submit" class="btn btn-primary btn-full mt-lg">${isEdit ? 'Simpan Perubahan' : 'Tambahkan Akun'}</button>
            </form>
          </div>
        </div>
      `;

      const typeSelect = document.getElementById('saldo-type');
      const nameSelect = document.getElementById('saldo-name-select');
      const manualInput = document.getElementById('saldo-name-manual');

      const updateNameOptions = () => {
        const type = typeSelect.value;
        const options = presetNames[type] || [];
        nameSelect.innerHTML = options.map(o => `<option value="${o.name}" ${o.logo ? `data-logo="${o.logo}"` : ''}>${o.name}</option>`).join('');
        
        if (isEdit && existingData.type === type) {
          if (!options.find(o => o.name === existingData.name)) {
            nameSelect.value = 'Lainnya (Ketik Manual)';
            manualInput.value = existingData.name;
            manualInput.style.display = 'block';
            manualInput.required = true;
          } else {
            nameSelect.value = existingData.name;
            manualInput.style.display = 'none';
            manualInput.required = false;
          }
        } else {
          manualInput.style.display = 'none';
          manualInput.required = false;
          manualInput.value = '';
        }
        
        const wrapper = nameSelect.nextElementSibling;
        if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
          wrapper.remove();
          nameSelect.classList.remove('custom-select-hidden');
        }
        initCustomSelects(document.getElementById('name-group'));
      };

      updateNameOptions();

      typeSelect.addEventListener('change', updateNameOptions);
      
      nameSelect.addEventListener('change', () => {
        if (nameSelect.value === 'Lainnya (Ketik Manual)') {
          manualInput.style.display = 'block';
          manualInput.required = true;
          manualInput.focus();
        } else {
          manualInput.style.display = 'none';
          manualInput.required = false;
        }
      });

      initCustomSelects(document.getElementById('type-group'));

      const amountInput = document.getElementById('saldo-amount');
      
      const formatIDRInput = (str) => {
        const parts = str.split(',');
        const intPart = parts[0].replace(/\D/g, '');
        const intFormatted = intPart ? new Intl.NumberFormat('id-ID').format(parseInt(intPart)) : '';
        return parts.length > 1 ? intFormatted + ',' + parts[1].replace(/\D/g, '').slice(0, 2) : intFormatted;
      };

      const parseIDRInput = (str) => {
        if (!str) return 0;
        const normalized = str.replace(/\./g, '').replace(',', '.');
        return parseFloat(normalized) || 0;
      };

      amountInput.oninput = (e) => {
        const rawValue = e.target.value;
        if (!rawValue.endsWith(',')) {
          e.target.value = formatIDRInput(rawValue);
        }
      };

      document.getElementById('close-saldo-modal').onclick = () => modalContainer.innerHTML = '';
      
      document.getElementById('saldo-modal-overlay').onclick = (e) => {
        if (e.target.id === 'saldo-modal-overlay') {
          modalContainer.innerHTML = '';
        }
      };
      
      document.getElementById('form-saldo').onsubmit = (e) => {
        e.preventDefault();
        const amount = parseIDRInput(amountInput.value);
        let name = nameSelect.value;
        let logo = '';
        if (name === 'Lainnya (Ketik Manual)') {
          name = manualInput.value;
        } else {
          const selectedOption = nameSelect.options[nameSelect.selectedIndex];
          logo = selectedOption?.getAttribute('data-logo') || '';
        }
        const type = typeSelect.value;
        
        showLoading();
        if (isEdit) {
          store.updateSaldo(Number(existingId), { balance: amount, name, type, logo });
          showToast('Saldo berhasil diperbarui!', 'success');
        } else {
          store.addSaldo({ name, type, balance: amount, logo });
          showToast('Akun berhasil ditambahkan!', 'success');
        }
        hideLoading();
        modalContainer.innerHTML = '';
        renderSaldo();
      };
    });
  };

  document.getElementById('btn-add-saldo').onclick = () => openSaldoModal();

  const gridBtn = document.getElementById('btn-view-grid');
  const listBtn = document.getElementById('btn-view-list');
  const gridContainer = document.querySelector('.saldo-grid');

  gridBtn.onclick = () => {
    localStorage.setItem('saldo-view-mode', 'grid');
    gridContainer.classList.remove('list-mode');
    gridBtn.style.background = 'var(--primary-light)';
    gridBtn.style.color = 'var(--primary)';
    listBtn.style.background = 'transparent';
    listBtn.style.color = 'var(--text-muted)';
  };

  listBtn.onclick = () => {
    localStorage.setItem('saldo-view-mode', 'list');
    gridContainer.classList.add('list-mode');
    listBtn.style.background = 'var(--primary-light)';
    listBtn.style.color = 'var(--primary)';
    gridBtn.style.background = 'transparent';
    gridBtn.style.color = 'var(--text-muted)';
  };

  cleanupKebabs();
  initKebabs(
    container,
    (id) => {
      openSaldoModal(id);
    },
    (id) => {
      checkVerification(async () => {
        const saldo = saldos.find(s => String(s.id) === id);
        const { showConfirm } = await import('../components/notifications.js');
        const confirmed = await showConfirm('Hapus Akun?', `Apakah Anda yakin ingin menghapus akun "${saldo?.name}"?`);
        if (confirmed) {
          showLoading();
          store.deleteSaldo(Number(id));
          hideLoading();
          showToast('Akun berhasil dihapus!', 'info');
          renderSaldo();
        }
      });
    }
  );
}
