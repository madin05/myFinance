// src/pages/faq.js
import { store } from '../store.js';

export function renderFaq() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const faqs = [
    {
      category: 'umum',
      question: 'Bagaimana cara kerja sinkronisasi data MyFinance?',
      answer: 'MyFinance dirancang agar Anda bisa mencatat keuangan kapan saja dan di mana saja tanpa khawatir kehilangan data. Semua perubahan transaksi atau rencana tabungan Anda langsung diselaraskan secara aman ke penyimpanan cloud pribadi kami yang aktif 24 jam. Hebatnya, jika koneksi internet terputus (offline), Anda tetap bisa melakukan pencatatan dengan normal; aplikasi akan menyimpan data tersebut sementara dengan aman di perangkat Anda dan otomatis mengunggahnya begitu Anda terhubung kembali.'
    },
    {
      category: 'umum',
      question: 'Apakah data keuangan saya aman di platform ini?',
      answer: 'Tentu saja, privasi dan keamanan finansial Anda adalah komitmen mutlak kami. MyFinance menjamin bahwa seluruh catatan pengeluaran, pemasukan, dan tabungan Anda bersifat <strong>sangat rahasia dan sepenuhnya milik Anda pribadi</strong>. Kami menerapkan sistem autentikasi aman untuk memvalidasi akses akun Anda, serta memastikan data Anda terlindungi dari pihak luar. Kami tidak akan pernah membagikan atau menjual data finansial Anda kepada pihak ketiga manapun.'
    },
    {
      category: 'fitur',
      question: 'Bagaimana cara mengatur anggaran pengeluaran bulanan?',
      answer: 'Masuk ke menu <strong>Anggaran</strong>, lalu klik tombol <strong>"Atur Anggaran"</strong> di pojok kanan atas. Pilih kategori pengeluaran (misal: Makanan, Transportasi, Hiburan) dan tentukan batas limit bulanan Anda. Aplikasi akan memperingatkan Anda jika pengeluaran kategori tersebut mendekati batas limit.'
    },
    {
      category: 'fitur',
      question: 'Bagaimana cara menggunakan fitur Wishlist (Target Tabungan)?',
      answer: 'Masuk ke menu <strong>Wishlist</strong>, klik tombol <strong>"Tambah Wishlist"</strong> untuk memasukkan target barang impian Anda, dana yang dibutuhkan, warna representasi, dan ikon yang menarik. Setiap kali Anda menyisihkan uang, klik tombol <strong>"Isi"</strong> pada kartu wishlist tersebut.'
    },
    {
      category: 'fitur',
      question: 'Dapatkah saya mengunduh atau mengekspor laporan keuangan?',
      answer: 'Ya! Masuk ke menu <strong>Laporan</strong>, pilih periode laporan yang Anda inginkan (misal: bulan ini atau kustom), lalu pilih tombol <strong>"Ekspor ke PDF"</strong> untuk mengunduh dokumen laporan resmi yang sangat rapi atau <strong>"Ekspor ke Excel"</strong> untuk pengolahan data spreadsheet eksternal.'
    },
    {
      category: 'teknis',
      question: 'Mengapa saya mendapatkan error saat melakukan login?',
      answer: 'Pastikan email dan password yang Anda masukkan sudah benar. Jika Anda mendaftar menggunakan email & password, pastikan Anda telah mengklik link verifikasi yang dikirimkan ke email Anda sebelum melakukan login. Jika menggunakan Google Login, pastikan koneksi internet Anda stabil.'
    },
    {
      category: 'fitur',
      question: 'Apakah ada kalkulator cepat untuk menghitung transaksi?',
      answer: 'Ada! Kami menyediakan kalkulator interaktif yang bisa diakses kapan saja. Klik tombol oranye berlogo kalkulator pada <strong>Floating Action Menu (FAM)</strong> di pojok kanan bawah layar untuk langsung menggunakannya tanpa perlu berpindah dari halaman aktif Anda.'
    },
    {
      category: 'teknis',
      question: 'Bagaimana cara menghapus akun dan data saya secara permanen?',
      answer: 'Jika Anda ingin menghapus akun, silakan masuk ke menu <strong>Akun</strong>, lalu klik tombol <strong>"Hapus Akun"</strong> di bagian bawah. Seluruh data transaksi, profil, anggaran, dan wishlist Anda akan langsung dihapus secara permanen dari server database PostgreSQL kami secara instan.'
    }
  ];

  container.innerHTML = `
    <div class="faq-container animate-fade-in">
      <div class="section-header">
        <div>
          <h1 class="page-title">Tanya Jawab (FAQ)</h1>
          <p class="text-muted">Temukan jawaban atas pertanyaan umum mengenai pengelolaan keuangan di MyFinance</p>
        </div>
      </div>

      <!-- Search & Filter Controls -->
      <div class="faq-controls">
        <div class="faq-search-wrapper">
          <i class="ph ph-magnifying-glass faq-search-icon"></i>
          <input type="text" id="faq-search-input" placeholder="Cari pertanyaan atau kata kunci..." />
        </div>
        <div class="faq-filter-pills">
          <button class="filter-pill active" data-category="all">Semua</button>
          <button class="filter-pill" data-category="umum">Umum & Keamanan</button>
          <button class="filter-pill" data-category="fitur">Fitur Utama</button>
          <button class="filter-pill" data-category="teknis">Teknis & Akun</button>
        </div>
      </div>

      <!-- FAQ Accordion List -->
      <div class="faq-list" id="faq-accordion-list">
        ${renderFaqItems(faqs)}
      </div>

      <!-- Empty State -->
      <div class="faq-empty-state" id="faq-empty" style="display: none;">
        <i class="ph ph-mask-sad"></i>
        <h3>Pertanyaan tidak ditemukan</h3>
        <p>Coba gunakan kata kunci lain yang lebih umum.</p>
      </div>
    </div>
  `;

  // --- Add Interactive Event Listeners ---
  const searchInput = document.getElementById('faq-search-input');
  const filterPills = document.querySelectorAll('.filter-pill');
  const accordionItems = document.querySelectorAll('.faq-item');

  // Search filter function
  const filterFaqs = () => {
    const query = searchInput.value.toLowerCase().trim();
    const activeCategory = document.querySelector('.filter-pill.active').dataset.category;
    let visibleCount = 0;

    accordionItems.forEach(item => {
      const question = item.querySelector('.faq-question-text').textContent.toLowerCase();
      const answer = item.querySelector('.faq-answer-inner').textContent.toLowerCase();
      const category = item.dataset.category;

      const matchesSearch = question.includes(query) || answer.includes(query);
      const matchesCategory = activeCategory === 'all' || category === activeCategory;

      if (matchesSearch && matchesCategory) {
        item.style.display = 'block';
        visibleCount++;
      } else {
        item.style.display = 'none';
        // Close if hidden
        item.classList.remove('open');
      }
    });

    const emptyState = document.getElementById('faq-empty');
    if (visibleCount === 0) {
      emptyState.style.display = 'flex';
    } else {
      emptyState.style.display = 'none';
    }
  };

  searchInput.addEventListener('input', filterFaqs);

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      filterFaqs();
    });
  });

  // Accordion Expand/Collapse Functionality with Micro-animations
  const headers = document.querySelectorAll('.faq-item-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains('open');

      // Close all other items for clean accordion effect
      accordionItems.forEach(i => {
        if (i !== item) i.classList.remove('open');
      });

      // Toggle current item
      if (isOpen) {
        item.classList.remove('open');
      } else {
        item.classList.add('open');
      }
    });
  });
}

function renderFaqItems(faqs) {
  return faqs.map((faq, index) => `
    <div class="faq-item" data-category="${faq.category}" style="--i: ${index}">
      <div class="faq-item-header">
        <span class="faq-question-text">${faq.question}</span>
        <div class="faq-chevron-icon">
          <i class="ph ph-caret-down"></i>
        </div>
      </div>
      <div class="faq-item-answer">
        <div class="faq-answer-inner">
          <p>${faq.answer}</p>
        </div>
      </div>
    </div>
  `).join('');
}
