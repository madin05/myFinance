const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

// 1. SETTING EMAIL KAMU DI SINI
const USER_EMAIL = "arifsyah1018@gmail.com"; 

// 2. NAMA FILE EXCEL KAMU
const EXCEL_FILE_NAME = "data.xlsx"; 

// Fungsi untuk membersihkan format Rupiah (Rp 50.000,00 -> 50000)
function parseRupiah(value) {
  if (typeof value === 'number') return value;
  if (!value || String(value).trim() === '') return 0;
  
  const cleanStr = String(value)
    .replace(/Rp/gi, '')
    .replace(/\./g, '')
    .replace(/\s/g, '')
    .replace(/,00/g, '') 
    .replace(/,/g, '.');
    
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

async function importExcel() {
  try {
    console.log(`Mencari user dengan email: ${USER_EMAIL}...`);
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
    });

    if (!user) {
      console.error("❌ User tidak ditemukan! Pastikan email sudah benar.");
      return;
    }
    console.log(`✅ User ditemukan: ${user.name} (ID: ${user.id})`);

    // Hapus transaksi lama agar tidak terjadi duplikasi data saat script di-run ulang
    console.log("🧹 Membersihkan transaksi lama di database agar tidak duplikat...");
    await prisma.transaction.deleteMany({
      where: { userId: user.id }
    });
    console.log("✅ Database bersih! Siap mengimpor data baru.");

    const filePath = path.join(__dirname, EXCEL_FILE_NAME);
    console.log(`Membaca file Excel dari: ${filePath}...`);
    
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; 
    const worksheet = workbook.Sheets[sheetName];
    
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
    console.log(`📊 Membaca ${data.length} baris dari Excel...`);

    let successCount = 0;
    let failCount = 0;
    let currentDate = null;

    // Lewati baris pertama jika itu adalah header buatan ("Tanggal", "Jumlah Pemasukan", dll.)
    const startIndex = data[0] && data[0]['Laporan Keuangan'] === 'Tanggal' ? 1 : 0;

    for (let i = startIndex; i < data.length; i++) {
      const row = data[i];
      
      const tanggalValue = row['Laporan Keuangan']; // Ini kolom Tanggal
      const pemasukanValue = row['__EMPTY_5'];       // Ini kolom Jumlah Pemasukan
      const kategoriValue = row['__EMPTY_6'];        // Ini kolom Kategori
      const metodeValue = row['__EMPTY_7'];          // Ini kolom Metode
      const hargaValue = row['__EMPTY_8'];           // Ini kolom Harga (Pengeluaran)
      const keteranganValue = row['__EMPTY_9'];      // Ini kolom Keterangan

      // Deteksi tanggal
      const hasTanggal = tanggalValue !== undefined && tanggalValue !== null && String(tanggalValue).trim() !== "";
      if (hasTanggal) {
        let parsedDate;
        if (typeof tanggalValue === 'number') {
          // Konversi angka serial tanggal Excel ke Javascript Date
          // (25569 adalah selisih hari antara 1 Jan 1900 dan 1 Jan 1970)
          parsedDate = new Date(Math.round((tanggalValue - 25569) * 86400 * 1000));
        } else {
          parsedDate = new Date(tanggalValue);
        }

        if (!isNaN(parsedDate.getTime())) {
          currentDate = parsedDate;
        }
      }

      // Skip kalau belum ada tanggal valid yang terdeteksi
      if (!currentDate) continue;

      const pemasukan = parseRupiah(pemasukanValue);
      const pengeluaran = parseRupiah(hargaValue);

      try {
        // 1. JIKA ADA PEMASUKAN
        // Kita hanya catat pemasukan jika kolom tanggal di baris tersebut terisi (menghindari duplikasi merge cell)
        if (hasTanggal && pemasukan > 0) {
          await prisma.transaction.create({
            data: {
              userId: user.id,
              date: currentDate,
              category: "Pendapatan",
              method: metodeValue || "Cash",
              description: "Pemasukan / Saldo Harian",
              amount: pemasukan,
              type: "income",
            }
          });
          successCount++;
          console.log(`[INCOME] Berhasil memasukkan: Rp ${pemasukan} pada ${currentDate.toLocaleDateString()}`);
        }

        // 2. JIKA ADA PENGELUARAN
        if (pengeluaran > 0) {
          const kategori = kategoriValue || "Lainnya";
          const metode = metodeValue || "Cash";
          const keterangan = keteranganValue || "Pengeluaran Excel";

          await prisma.transaction.create({
            data: {
              userId: user.id,
              date: currentDate,
              category: kategori,
              method: metode,
              description: keterangan,
              amount: pengeluaran,
              type: "expense",
            }
          });
          successCount++;
          console.log(`[EXPENSE] Berhasil memasukkan: ${keterangan} (Rp ${pengeluaran}) pada ${currentDate.toLocaleDateString()}`);
        }

      } catch (err) {
        console.error(`❌ Gagal import baris ke-${i + 2}:`, err.message);
        failCount++;
      }
    }

    console.log("\n=============================");
    console.log(`🎉 IMPORT SELESAI!`);
    console.log(`✅ Berhasil masuk: ${successCount} transaksi`);
    console.log(`❌ Gagal: ${failCount} transaksi`);
    console.log("=============================\n");

  } catch (error) {
    console.error("❌ Terjadi kesalahan:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

importExcel();
