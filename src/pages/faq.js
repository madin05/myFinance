// src/pages/faq.js
import { store } from '../store.js';

export function renderFaq() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const faqs = [
    {
      category: 'umum',
      question: 'Bagaimana cara kerja sinkronisasi data MyFinance?',
      answer: 'MyFinance dirancang agar Anda bisa mencatat keuangan kapan saja dan di mana saja tanpa khawatir kehilangan data. Semua perubahan transaksi, anggaran, atau target wishlist diselaraskan secara otomatis dan aman ke database cloud pribadi Anda. Jika koneksi terputus (offline), data akan disimpan sementara di perangkat lokal dan otomatis diunggah kembali saat online.'
    },
    {
      category: 'umum',
      question: 'Apakah data keuangan saya aman di platform ini?',
      answer: 'Tentu saja, privasi dan keamanan finansial Anda adalah prioritas utama kami. MyFinance menjamin seluruh catatan pengeluaran, pemasukan, dan saldo akun bersifat <strong>sangat rahasia dan sepenuhnya milik Anda pribadi</strong>. Menerapkan autentikasi aman dengan Firebase & PostgreSQL backend, data Anda terlindungi dengan enkripsi standar industri.'
    },
    {
      category: 'fitur',
      question: 'Bagaimana cara mengulang atau memutar kembali Panduan Tutorial?',
      answer: 'Anda bisa mengulang panduan interaktif kapan saja! Cukup buka menu <strong>Bantuan</strong> di sidebar lalu pilih <strong>Tutorial</strong>, atau klik tombol <strong>"Putar Panduan Aplikasi"</strong> di bagian atas halaman Pusat Bantuan ini.'
    },
    {
      category: 'fitur',
      question: 'Bagaimana cara menggunakan Kalkulator Cepat & Quick Actions?',
      answer: 'Klik ikon tambah <strong>(+) pada Floating Action Menu (FAM)</strong> yang melayang di pojok kanan bawah layar. Dari situ Anda bisa langsung mencatat transaksi baru, menghitung angka menggunakan kalkulator pop-up, atau memasukkan item wishlist tanpa perlu meninggalkan halaman aktif Anda.'
    },
    {
      category: 'fitur',
      question: 'Bagaimana cara mengatur batas anggaran pengeluaran bulanan?',
      answer: 'Masuk ke menu <strong>Anggaran</strong>, lalu klik tombol <strong>"Atur Anggaran"</strong>. Tentukan kategori (misal: Makanan, Transportasi, Hiburan) dan alokasi batas nominalnya. Sistem akan otomatis melacak persentase penggunaan dan memberi notifikasi jika anggaran mendekati batas limit.'
    },
    {
      category: 'fitur',
      question: 'Bagaimana cara memanfaatkan fitur Target Tabungan (Wishlist)?',
      answer: 'Buka menu <strong>Wishlist</strong> dan klik <strong>"Tambah Wishlist"</strong> untuk mencatat target barang atau impian finansial Anda. Setiap kali menyisihkan uang, klik tombol <strong>"Isi"</strong> pada kartu wishlist. Wishlist yang sudah tercapai 100% dapat dimasukkan ke Riwayat Tabungan.'
    },
    {
      category: 'fitur',
      question: 'Dapatkah saya mengekspor laporan keuangan ke PDF atau Excel?',
      answer: 'Bisa! Masuk ke menu <strong>Laporan</strong>, pilih filter rentang waktu yang diinginkan (Minggu, Bulan, 3 Bulan, Tahun, atau Kustom), lalu klik tombol <strong>"Export PDF"</strong> untuk mengunduh berkas rekapitulasi resmi atau gunakan opsi ekspor spreadsheet.'
    },
    {
      category: 'teknis',
      question: 'Mengapa saya perlu melakukan verifikasi email saat pendaftaran?',
      answer: 'Verifikasi email diperlukan untuk menjamin keamanan akun dan pemulihan kata kunci. Saat mendaftar, link verifikasi otomatis dikirim ke email Anda. Setelah mengklik link tersebut, status akun Anda akan langsung aktif tanpa batasan fitur.'
    },
    {
      category: 'teknis',
      question: 'Bagaimana cara mengubah tema aplikasi (Dark / Light Mode)?',
      answer: 'MyFinance menyediakan 3 mode tema: <strong>Terang (Light)</strong>, <strong>Gelap (Dark)</strong>, dan <strong>Otomatis (Ikut Perangkat)</strong>. Anda bisa mengubahnya kapan saja melalui tombol tema di kanan atas header navigasi.'
    },
    {
      category: 'teknis',
      question: 'Bagaimana cara menghapus akun dan data saya secara permanen?',
      answer: 'Jika Anda ingin menghapus akun, silakan masuk ke menu <strong>Akun</strong>, scroll ke bagian bawah dan klik tombol merah <strong>"Hapus Akun"</strong>. Seluruh data transaksi, profil, anggaran, dan wishlist Anda akan dihapus secara permanen dari server database kami.'
    }
  ];

  container.innerHTML = `
    <div class="faq-container animate-fade-in">
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 class="page-title">Tanya Jawab (FAQ)</h1>
          <p class="text-muted">Temukan jawaban atas pertanyaan umum mengenai pengelolaan keuangan di MyFinance</p>
        </div>
        <button class="btn btn-primary" id="btn-replay-tutorial" style="border-radius: 12px; height: 42px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
          <i class="ph ph-play-circle" style="font-size: 1.15rem;"></i> Putar Panduan Aplikasi
        </button>
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

  // Replay Product Tour Button Listener
  document.getElementById('btn-replay-tutorial')?.addEventListener('click', async () => {
    const { startProductTutorial } = await import('../components/tutorial.js');
    startProductTutorial(true);
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
