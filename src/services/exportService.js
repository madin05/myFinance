import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatRupiah } from "../store.js";

export const exportService = {
  /**
   * Export data ke PDF dengan template MyFinance
   */
  exportToPDF(transactions, metadata) {
    console.log('📄 Exporting to PDF...', metadata);
    const doc = new jsPDF();
    const { periode, username, totalIncome, totalExpense, categories, chartImages } = metadata;

    // 1. Header
    doc.setFontSize(22);
    doc.setTextColor(63, 54, 229); // Primary Color
    doc.text("MyFinance", 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text("Laporan Keuangan Personal", 14, 30);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 35, 196, 35);

    // 2. Info Laporan
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Periode  : ${periode}`, 14, 45);
    doc.text(`User     : ${username}`, 14, 50);
    doc.text(`Dicetak  : ${new Date().toLocaleString('id-ID')}`, 14, 55);

    // 3. Ringkasan (Boxed)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 65, 182, 35, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RINGKASAN KEUANGAN", 20, 75);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Total Pemasukan", 20, 83);
    doc.setTextColor(34, 197, 94); // Green
    doc.text(`: ${formatRupiah(totalIncome)}`, 60, 83);
    
    doc.setTextColor(30, 41, 59);
    doc.text("Total Pengeluaran", 20, 88);
    doc.setTextColor(239, 68, 68); // Red
    doc.text(`: ${formatRupiah(totalExpense)}`, 60, 88);
    
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Selisih / Saldo", 20, 93);
    doc.setTextColor(63, 54, 229);
    doc.text(`: ${formatRupiah(totalIncome - totalExpense)}`, 60, 93);

    let nextY = 110;

    // 4. Visual Analysis (Charts)
    if (chartImages) {
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("ANALISIS VISUAL", 14, nextY);
      
      try {
        if (chartImages.category) {
          doc.addImage(chartImages.category, 'PNG', 14, nextY + 5, 85, 60);
        }
        if (chartImages.cashflow) {
          doc.addImage(chartImages.cashflow, 'PNG', 110, nextY + 5, 85, 60);
        }
        nextY += 75;
      } catch (e) {
        console.warn('Gagal add chart ke PDF:', e);
        nextY += 10;
      }
    }

    // 5. Pengeluaran Per Kategori
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("RINCIAN KATEGORI", 14, nextY);
    
    const catData = categories.map(c => [c.name, formatRupiah(c.total)]);
    autoTable(doc, {
      startY: nextY + 5,
      head: [['Kategori', 'Total']],
      body: catData,
      theme: 'striped',
      headStyles: { fillColor: [63, 54, 229] },
      margin: { left: 14, right: 14 }
    });

    // 6. Detail Transaksi
    const finalY = doc.lastAutoTable.finalY || nextY + 50;
    
    // Add new page if space is limited
    if (finalY > 240) doc.addPage();
    const tableStartY = finalY > 240 ? 20 : finalY + 15;

    doc.setFont("helvetica", "bold");
    doc.text("DETAIL TRANSAKSI", 14, tableStartY);

    const txData = transactions.map(tx => [
      new Date(tx.tanggal).toLocaleDateString('id-ID'),
      tx.kategori,
      tx.metode,
      tx.type === 'income' ? 'Masuk' : 'Keluar',
      formatRupiah(tx.harga)
    ]);

    autoTable(doc, {
      startY: tableStartY + 5,
      head: [['Tanggal', 'Kategori', 'Metode', 'Tipe', 'Nominal']],
      body: txData,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8 },
      columnStyles: {
        4: { halign: 'right' }
      }
    });

    doc.save(`Laporan_MyFinance_${periode.replace(/ /g, '_')}.pdf`);
  },

  /**
   * Export data ke XLSX dengan 3 Sheet
   */
  exportToExcel(transactions, metadata) {
    console.log('📊 Exporting to Excel...', metadata);
    const { periode, username, totalIncome, totalExpense, categories } = metadata;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ["MYFINANCE - LAPORAN KEUANGAN"],
      ["Periode", periode],
      ["Username", username],
      [],
      ["RINGKASAN"],
      ["Total Pemasukan", totalIncome],
      ["Total Pengeluaran", totalExpense],
      ["Selisih / Saldo", totalIncome - totalExpense],
      [],
      ["KATEGORI", "TOTAL"],
      ...categories.map(c => [c.name, c.total])
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Sheet 2: Transaksi
    const txData = [
      ["Tanggal", "Keterangan", "Kategori", "Metode", "Tipe", "Nominal"],
      ...transactions.map(tx => [
        new Date(tx.tanggal).toLocaleDateString('id-ID'),
        tx.keterangan,
        tx.kategori,
        tx.metode,
        tx.type === 'income' ? 'Masuk' : 'Keluar',
        tx.harga
      ])
    ];
    const wsTx = XLSX.utils.aoa_to_sheet(txData);
    XLSX.utils.book_append_sheet(wb, wsTx, "Transaksi");

    // Sheet 3: Per Kategori (More Detailed)
    const catDetailData = [
      ["Breakdown Per Kategori"],
      ["Kategori", "Total Nominal", "Jumlah Transaksi"],
      ...categories.map(c => {
        const count = transactions.filter(tx => tx.kategori === c.name).length;
        return [c.name, c.total, count];
      })
    ];
    const wsCat = XLSX.utils.aoa_to_sheet(catDetailData);
    XLSX.utils.book_append_sheet(wb, wsCat, "Per Kategori");

    XLSX.writeFile(wb, `Laporan_MyFinance_${periode.replace(/ /g, '_')}.xlsx`);
  }
};
