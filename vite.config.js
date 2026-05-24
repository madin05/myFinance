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

    // Aktifkan minifikasi CSS — pakai esbuild (bukan lightningcss default)
    // agar vendor prefix seperti -webkit-backdrop-filter TIDAK di-strip
    cssMinify: 'esbuild',

    // Aktifkan source map hanya di dev (default sudah false di production)
    sourcemap: false,
  },

  css: {
    // Target browser untuk CSS transform, pastikan include mobile Safari & iOS
    // agar -webkit-backdrop-filter tetap di-generate
    transformer: 'postcss',
  },

  // Optimasi gambar: transformasi aset gambar
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
});
