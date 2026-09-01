import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Target browser modern biar output lebih kecil
    target: 'es2020',

    // Batas warning chunk size (default 500kb, naikan biar gak spam warning)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Manual chunk splitting: pisahin library besar ke chunk terpisah
        // agar browser bisa cache vendor lebih lama
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Firebase ke chunk sendiri
            if (id.includes('firebase')) return 'firebase';
            // jsPDF ke chunk sendiri (library besar)
            if (id.includes('jspdf') || id.includes('jspdf-autotable')) return 'pdf';
            // xlsx ke chunk sendiri
            if (id.includes('xlsx')) return 'xlsx';
            // Sisanya (floating-ui, dsb) ke vendor
            return 'vendor';
          }
        },
        // Pakai content hash di nama file agar browser cache benar-benar tepat
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    },

    // Aktifkan minifikasi CSS — pakai lightningcss (default Vite 8)
    cssMinify: true,

    // Aktifkan source map hanya di dev (default sudah false di production)
    sourcemap: false,
  },

  css: {
    // Pastikan PostCSS (autoprefixer) jalan untuk tambah vendor prefix
    transformer: 'postcss',
    // Config lightningcss: target browser yang butuh -webkit- prefix
    // agar -webkit-backdrop-filter tidak di-strip saat minify
    lightningcss: {
      targets: {
        safari: (13 << 16),      // Safari 13+
        ios_saf: (13 << 16),     // iOS Safari 13+
        chrome: (80 << 16),      // Chrome 80+
        edge: (80 << 16),        // Edge 80+
        firefox: (72 << 16),     // Firefox 72+
      }
    }
  },

  // Optimasi gambar: transformasi aset gambar
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
});
