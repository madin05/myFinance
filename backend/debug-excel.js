const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'data.xlsx');
const workbook = xlsx.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

const data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

console.log("\n=== TIPE DATA & SAMPEL TANGGAL DI EXCEL ===");
data.forEach((row, i) => {
  const val = row['Laporan Keuangan'];
  if (val !== undefined && val !== null && String(val).trim() !== "") {
    console.log(`Baris ${i + 2}: Nilai = "${val}" | Tipe = ${typeof val}`);
  }
});
